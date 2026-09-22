/**
 * POST /api/olay — ziyaretçi olayını kaydeder.
 *
 * NEDEN UÇ NOKTA, NEDEN DOĞRUDAN SUPABASE DEĞİL
 * ---------------------------------------------
 * Şehir, ülke ve cihaz bilgisini yalnız kenar görüyor: Cloudflare bunları
 * isteğin üstüne koyuyor (`request.cf`). İstemciden gönderilen bir şehre
 * güvenilemez. Ayrıca olay tablosu hiçbir istemci rolüne açık değil;
 * yazma yalnız buradan, servis anahtarıyla yapılıyor. Açık olsaydı
 * sayaçlar dışarıdan şişirilebilirdi.
 *
 * IP SAKLANMIYOR
 * --------------
 * İlan bildiriminde IP'nin tuzlanmış özeti saklanıyor, çünkü orada bir
 * hız sınırı var. Burada öyle bir ihtiyaç yok: ziyaret sayısı için IP
 * gerekmiyor. Bu yüzden IP ne saklanıyor ne de özetleniyor — istekle
 * birlikte gelip gidiyor.
 *
 * CEVAP HER ZAMAN 204
 * -------------------
 * Ölçüm, ölçülen şeyi bozmamalı. Yazma başarısız olsa bile ziyaretçiye
 * hata dönmüyor; `sendBeacon` zaten cevabı okumuyor. Sunucu tarafındaki
 * sorun panelde eksik veri olarak görünür, ziyaretçinin sayfasında değil.
 */

interface Ortam {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

const BOS = new Response(null, { status: 204 });

const TURLER = new Set(['girdi', 'sayfa', 'basvuru', 'cikti']);

const kis = (deger: unknown, uzunluk: number): string | null => {
  if (typeof deger !== 'string') return null;
  const temiz = deger.trim();
  return temiz ? temiz.slice(0, uzunluk) : null;
};

/**
 * Kaynak: yönlendiren adresin ALAN ADI, tam adresi değil.
 *
 * Tam adres tutmak, ziyaretçinin hangi arama sorgusuyla geldiğine kadar
 * inen bir iz bırakırdı. Panelde "nereden geldi" sorusuna cevap vermek
 * için alan adı yetiyor. Kendi sitemizden gelen geçişler "doğrudan"
 * sayılıyor: site içi gezinme bir kaynak değil.
 */
function kaynakBul(referrer: string | null, kendiHost: string): string {
  if (!referrer) return 'doğrudan';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (!host || host === kendiHost.replace(/^www\./, '')) return 'doğrudan';
    return host.slice(0, 120);
  } catch {
    return 'doğrudan';
  }
}

/**
 * Cihaz sınıfı, tarayıcının söylediği dizgeden.
 *
 * Kesin değil ve olmak zorunda da değil: "telefonda mı bakıyorlar"
 * sorusuna cevap veriyor. Tabletin telefondan ayrılması önemli, çünkü
 * mobil düzen kararları ikisi için farklı.
 */
function cihazBul(ua: string | null): string | null {
  if (!ua) return null;
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'tablet';
  if (/Android(?!.*Mobile)/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) return 'telefon';
  return 'masaüstü';
}

export const onRequestPost: PagesFunction<Ortam> = async ({ request, env }) => {
  const adres = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anahtar = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adres || !anahtar) return BOS;

  let govde: Record<string, unknown>;
  try {
    govde = (await request.json()) as Record<string, unknown>;
  } catch {
    return BOS;
  }

  const oturum = kis(govde.oturum, 64);
  const tur = kis(govde.tur, 16);
  const yol = kis(govde.yol, 300);
  if (!oturum || !tur || !yol || !TURLER.has(tur)) return BOS;

  const cf = (request as unknown as { cf?: Record<string, unknown> }).cf ?? {};
  const kendiHost = new URL(request.url).hostname;

  await fetch(`${adres}/rest/v1/rpc/site_olayi_yaz`, {
    method: 'POST',
    headers: {
      apikey: anahtar,
      Authorization: `Bearer ${anahtar}`,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      p_oturum: oturum,
      p_tur: tur,
      p_yol: yol,
      p_baslik: kis(govde.baslik, 300),
      p_kaynak: kaynakBul(kis(govde.referrer, 500), kendiHost),
      p_sehir: kis(cf.city, 120),
      p_ulke: kis(cf.country, 2),
      p_cihaz: cihazBul(request.headers.get('user-agent')),
      p_kullanici: kis(govde.kullanici, 64),
    }),
  }).catch(() => undefined);

  return BOS;
};
