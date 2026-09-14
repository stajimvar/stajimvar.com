/**
 * POST /api/ilan-bildir — ilan bildirimini kaydeder.
 *
 * NEDEN UÇ NOKTA, NEDEN DOĞRUDAN SUPABASE DEĞİL
 * ---------------------------------------------
 * Hız sınırı IP'ye bağlı ("saatte beş") ve IP'yi yalnız sunucu
 * görüyor: `CF-Connecting-IP`. İstemciden gönderilen bir IP'ye
 * güvenilemez, RLS politikası da IP'yi bilemez. Bu yüzden sayaç için
 * gereken özet burada üretiliyor.
 *
 * IP SAKLANMIYOR, ÖZETİ SAKLANIYOR
 * --------------------------------
 * IP bir tuzla karıştırılıp SHA-256'dan geçiyor; veritabanına yalnız
 * özet gidiyor. Özetten IP'ye dönülemiyor. Tuz ortam değişkeninden
 * geliyor; yoksa günün tarihi tuz oluyor — o hâlde sayaç yine
 * çalışıyor ama özet günden güne değiştiği için geriye dönük
 * eşleştirme mümkün olmuyor.
 *
 * KAYIT ÖNCE, E-POSTA SONRA
 * -------------------------
 * Bildirim veritabanına yazılıyor; e-posta ayrı bir iş. Posta
 * sağlayıcısı yapılandırılmamışsa kayıt YİNE alınıyor — bildirimi
 * kaybetmek, bildirimi haber verememekten kötü. Kayıt kuyruğun
 * kendisi: yönetici `listing_reports` tablosundan okuyor.
 */

interface Ortam {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  /*
    SERVİS ANAHTARI, ANON DEĞİL

    Kayıt fonksiyonu anon/authenticated tarafından çağrılamıyor: IP
    özetini parametre aldığı için istemciye açık olsaydı hız sınırı
    atlatılabilirdi. Bu yüzden yazma yalnız buradan, servis anahtarıyla
    yapılıyor. Anahtar Pages ortam değişkeninde; istemciye hiçbir
    şekilde gitmiyor.
  */
  SUPABASE_SERVICE_ROLE_KEY?: string;
  /** IP özetini üretirken kullanılan tuz. Yoksa günün tarihi kullanılıyor. */
  ILAN_BILDIRIM_TUZU?: string;
}

const JSON_BASLIK = { 'content-type': 'application/json; charset=utf-8' };

const yanit = (govde: unknown, durum = 200) =>
  new Response(JSON.stringify(govde), { status: durum, headers: JSON_BASLIK });

/** Alan sınırları: uzun metin veritabanını değil, kötüye kullanımı engelliyor. */
const SINIR = {
  listing_url: 600,
  company_name: 200,
  position_title: 300,
  details: 4000,
  reporter_email: 254,
};

const kis = (deger: unknown, uzunluk: number): string | null => {
  if (typeof deger !== 'string') return null;
  const temiz = deger.trim();
  return temiz ? temiz.slice(0, uzunluk) : null;
};

async function ipOzeti(ip: string | null, tuz: string): Promise<string | null> {
  if (!ip) return null;
  const veri = new TextEncoder().encode(`${tuz}:${ip}`);
  const ozet = await crypto.subtle.digest('SHA-256', veri);
  return [...new Uint8Array(ozet)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestPost: PagesFunction<Ortam> = async ({ request, env }) => {
  const adres = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anahtar = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adres || !anahtar) {
    return yanit({ hata: 'Sunucu yapılandırması eksik.' }, 500);
  }

  let govde: Record<string, unknown>;
  try {
    govde = (await request.json()) as Record<string, unknown>;
  } catch {
    return yanit({ hata: 'Geçersiz istek.' }, 400);
  }

  const listingUrl = kis(govde.listing_url, SINIR.listing_url);
  if (!listingUrl) {
    return yanit({ hata: 'İlanın sitedeki adresi gerekiyor.' }, 400);
  }

  /*
    E-posta ZORUNLU DEĞİL ama verildiyse biçimi bakılıyor: yanlış
    yazılmış bir adres, cevap yazılamayan bir bildirim demek. Geçersizse
    kayıt REDDEDİLMİYOR, alan boş bırakılıyor — bildirim içeriği
    e-postadan değerli.
  */
  const hamEposta = kis(govde.reporter_email, SINIR.reporter_email);
  const eposta = hamEposta && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hamEposta) ? hamEposta : null;

  const tuz = env.ILAN_BILDIRIM_TUZU || new Date().toISOString().slice(0, 10);
  const ozet = await ipOzeti(request.headers.get('CF-Connecting-IP'), tuz);

  const cagri = await fetch(`${adres}/rest/v1/rpc/ilan_bildirimi_gonder`, {
    method: 'POST',
    headers: { apikey: anahtar, Authorization: `Bearer ${anahtar}`, ...JSON_BASLIK },
    body: JSON.stringify({
      p_listing_url: listingUrl,
      p_reason: kis(govde.reason, 40) || 'diger',
      p_company_name: kis(govde.company_name, SINIR.company_name),
      p_position_title: kis(govde.position_title, SINIR.position_title),
      p_details: kis(govde.details, SINIR.details),
      p_reporter_email: eposta,
      p_ip_ozeti: ozet,
    }),
  });

  if (!cagri.ok) {
    const metin = await cagri.text();
    /*
      HIZ SINIRI AYRI CEVAP: kullanıcıya "bir şey ters gitti" demek
      yanlış olurdu — sorun onun gönderiminde değil, sıklığında.
    */
    if (metin.includes('hiz-siniri')) {
      return yanit(
        { hata: 'Bu saat içinde çok fazla bildirim gönderildi. Biraz sonra tekrar dene.' },
        429,
      );
    }
    return yanit({ hata: 'Bildirim kaydedilemedi. Biraz sonra tekrar dene.' }, 502);
  }

  /*
    BAŞARI YALNIZ KAYIT KALICI OLDUĞUNDA

    Buraya ulaşmak, satırın veritabanına yazıldığı anlamına geliyor.
    E-posta bu isteğin işi DEĞİL: bildirim kuyruğa kayıtlı hâlde
    duruyor (`notified_at` boş) ve yeniden deneyen işçi gönderiyor.
    Önce e-posta denenip sonra kayıt yazılsaydı, posta sağlayıcısının
    hatası bildirimi kaybettirirdi.
  */
  return yanit({ tamam: true, kuyrukta: true });
};
