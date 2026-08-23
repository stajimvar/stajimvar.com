/**
 * POST /api/instagram/paylas — gönderiyi Instagram'da yayınlar.
 *
 * İKİ İSTEK, ÜÇ ADIM
 * ------------------
 * Meta tek çağrıda karusel yayınlamıyor: önce her görsel için bir kapsayıcı,
 * sonra onları toplayan karusel kapsayıcısı, en sonda yayınlama.
 *
 * Beşi de tek HTTP isteğinde yapılınca istek uzuyor — Instagram her kartı
 * KENDİ indiriyor ve bu saniyeler sürüyor — ve Cloudflare süre aşımında
 * kendi HTML hata sayfasını döndürüyor; tarayıcıda "Unexpected token '<'"
 * olarak görünen buydu. Bu yüzden iş iki kısa isteğe bölündü:
 *
 *   adim: "hazirla" → kapsayıcılar kurulur, kapsayıcı kimliği döner
 *   adim: "yayinla" → o kimlik yayına alınır
 *
 * Arayüz ikisini sırayla çağırıyor ve arada durumu gösteriyor.
 *
 * TEK YÖNLÜ
 * ---------
 * Yayınlanan gönderi API'den silinemiyor. Bu yüzden iki koruma var:
 *   1. Yalnızca yönetici çağırabiliyor (durum ucuyla aynı Supabase kapısı).
 *   2. İstek gövdesinde `onay: true` bekleniyor — kazara atılan bir POST,
 *      arayüzdeki yayın düğmesine basmakla aynı şey olmasın diye.
 *
 * Girdi doğrulaması src/lib/instagram-paylasim.mjs'te; oradaki kural gereği
 * yalnızca kendi alan adımızdaki HTTPS .jpg adresleri yayınlanabiliyor.
 */
import {
  gorselKapsayiciAdresi,
  karuselKapsayiciAdresi,
  paylasimSorunlari,
  yayinlaAdresi,
  KARUSEL_ARALIGI,
} from '../../../src/lib/instagram-paylasim.mjs';
import { eksikAyarlar, grafHatasi } from '../../../src/lib/instagram-durum.mjs';

interface Ortam {
  INSTAGRAM_APP_ID?: string;
  INSTAGRAM_APP_SECRET?: string;
  INSTAGRAM_ACCESS_TOKEN?: string;
  INSTAGRAM_USER_ID?: string;
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

const yanit = (govde: unknown, durum = 200) =>
  new Response(JSON.stringify(govde, null, 2), {
    status: durum,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

async function yoneticiMi(env: Ortam, jeton: string): Promise<boolean> {
  const adres = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anahtar = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!adres || !anahtar) return false;

  const cevap = await fetch(`${adres.replace(/\/+$/, '')}/rest/v1/rpc/is_admin`, {
    method: 'POST',
    headers: { apikey: anahtar, authorization: `Bearer ${jeton}`, 'content-type': 'application/json' },
    body: '{}',
  });
  if (!cevap.ok) return false;
  return (await cevap.json()) === true;
}

/** Meta'ya POST atar; hata gövdesini okunur tek satıra çevirir. */
async function metaya(adres: string): Promise<{ kimlik?: string; hata?: string }> {
  try {
    const cevap = await fetch(adres, { method: 'POST', headers: { accept: 'application/json' } });
    const govde = (await cevap.json()) as { id?: string; error?: unknown };
    const hata = grafHatasi(govde);
    if (hata) return { hata };
    if (!govde?.id) return { hata: `Beklenen kimlik gelmedi (HTTP ${cevap.status})` };
    return { kimlik: String(govde.id) };
  } catch (hata) {
    return { hata: String((hata as Error).message).slice(0, 160) };
  }
}

/*
  BEKLENMEYEN HATA DA JSON DÖNMELİ

  İşleyici bir yerde patlarsa Cloudflare kendi HTML hata sayfasını
  döndürüyor; tarayıcı tarafında bu "Unexpected token '<'" diye
  görünüyor ve asıl sebep kayboluyor. Sarmalayıcı, hatayı okunur bir
  JSON'a çeviriyor — jeton ya da sır taşımadan.
*/
export const onRequestPost: PagesFunction<Ortam> = async (baglam) => {
  try {
    return await paylasimiIsle(baglam);
  } catch (hata) {
    return yanit(
      {
        hata: 'Sunucu tarafında beklenmeyen hata.',
        ayrinti: String((hata as Error)?.message ?? hata).slice(0, 300),
      },
      500
    );
  }
};

const paylasimiIsle: PagesFunction<Ortam> = async ({ request, env }) => {
  const yetki = request.headers.get('authorization') || '';
  const jeton = yetki.toLowerCase().startsWith('bearer ') ? yetki.slice(7).trim() : '';
  if (!jeton) return yanit({ hata: 'Yönetici oturumu gerekiyor.' }, 401);
  if (!(await yoneticiMi(env, jeton))) return yanit({ hata: 'Bu uç yalnızca yöneticilere açık.' }, 403);

  const eksikler = eksikAyarlar(env as unknown as Record<string, unknown>);
  if (eksikler.length) return yanit({ hata: 'Ortam değişkenleri eksik.', eksikAyarlar: eksikler }, 503);

  let istek: {
    adim?: 'hazirla' | 'yayinla';
    gorseller?: string[];
    aciklama?: string;
    kapsayici?: string;
    onay?: boolean;
  };
  try {
    istek = await request.json();
  } catch {
    return yanit({ hata: 'Geçersiz istek gövdesi.' }, 400);
  }

  if (istek?.onay !== true) {
    return yanit({ hata: 'Yayın onayı verilmedi (onay: true bekleniyor).' }, 400);
  }

  /* ---------------------------------------------------- adım: yayinla */
  if (istek.adim === 'yayinla') {
    const kapsayici = String(istek.kapsayici ?? '').trim();
    if (!/^[0-9]+$/.test(kapsayici)) {
      return yanit({ hata: 'Geçerli bir kapsayıcı kimliği gerekiyor.' }, 400);
    }

    /* Bu adımdan sonra geri dönüş yok: gönderi API'den silinemiyor. */
    const yayin = await metaya(yayinlaAdresi(env as unknown as Record<string, string>, kapsayici));
    if (yayin.hata) return yanit({ hata: `Yayınlanamadı: ${yayin.hata}` }, 502);

    return yanit({
      yayinlandi: true,
      gonderiKimligi: yayin.kimlik,
      yayinZamani: new Date().toISOString(),
    });
  }

  /* ---------------------------------------------------- adım: hazirla */
  const sorunlar = paylasimSorunlari(
    { gorseller: istek.gorseller, aciklama: istek.aciklama },
    'stajimvar.com'
  );
  if (sorunlar.length) return yanit({ hata: 'Gönderi doğrulamayı geçmedi.', sorunlar }, 422);

  const gorseller = istek.gorseller as string[];
  const aciklama = String(istek.aciklama);
  const karusel = gorseller.length >= KARUSEL_ARALIGI.en_az;

  /*
    Görsel kapsayıcıları aynı anda kuruluyor: her biri bağımsız ve
    Instagram görseli kendi indirdiği için sıralı beklemek isteği
    gereksiz yere uzatıyordu. Sıra `Promise.all` çıktısında korunuyor —
    karuseldeki gösterim sırası bu.
  */
  const sonuclar = await Promise.all(
    gorseller.map((gorsel) =>
      metaya(
        gorselKapsayiciAdresi(env as unknown as Record<string, string>, gorsel, {
          karuselParcasi: karusel,
          aciklama: karusel ? undefined : aciklama,
        })
      )
    )
  );

  const basarisiz = sonuclar.find((sonuc) => sonuc.hata);
  if (basarisiz) {
    return yanit({ hata: `Görsel kapsayıcısı oluşturulamadı: ${basarisiz.hata}` }, 502);
  }

  const cocuklar = sonuclar.map((sonuc) => sonuc.kimlik!);
  let kapsayici = cocuklar[0];

  if (karusel) {
    const sonuc = await metaya(
      karuselKapsayiciAdresi(env as unknown as Record<string, string>, cocuklar, aciklama)
    );
    if (sonuc.hata) return yanit({ hata: `Karusel kapsayıcısı oluşturulamadı: ${sonuc.hata}` }, 502);
    kapsayici = sonuc.kimlik!;
  }

  return yanit({ hazir: true, kapsayici, gorselSayisi: gorseller.length });
};
