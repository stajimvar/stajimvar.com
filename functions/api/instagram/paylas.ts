/**
 * POST /api/instagram/paylas — gönderiyi Instagram'da yayınlar.
 *
 * ÜÇ ADIM
 * -------
 * Meta tek istekte karusel yayınlamıyor: önce her görsel için bir kapsayıcı,
 * sonra onları toplayan karusel kapsayıcısı, en sonda yayınlama. Her adım
 * bir öncekinin kimliğine bağlı, bu yüzden sırayla çağrılıyor.
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

  let istek: { gorseller?: string[]; aciklama?: string; onay?: boolean };
  try {
    istek = await request.json();
  } catch {
    return yanit({ hata: 'Geçersiz istek gövdesi.' }, 400);
  }

  if (istek?.onay !== true) {
    return yanit({ hata: 'Yayın onayı verilmedi (onay: true bekleniyor).' }, 400);
  }

  const sorunlar = paylasimSorunlari(
    { gorseller: istek.gorseller, aciklama: istek.aciklama },
    'stajimvar.com'
  );
  if (sorunlar.length) return yanit({ hata: 'Gönderi doğrulamayı geçmedi.', sorunlar }, 422);

  const gorseller = istek.gorseller as string[];
  const aciklama = String(istek.aciklama);
  const karusel = gorseller.length >= KARUSEL_ARALIGI.en_az;

  /* 1) Görsel kapsayıcıları. Sıra korunuyor: karuselde gösterim sırası bu. */
  const cocuklar: string[] = [];
  for (const gorsel of gorseller) {
    const sonuc = await metaya(
      gorselKapsayiciAdresi(env as unknown as Record<string, string>, gorsel, {
        karuselParcasi: karusel,
        aciklama: karusel ? undefined : aciklama,
      })
    );
    if (sonuc.hata) return yanit({ hata: `Görsel kapsayıcısı oluşturulamadı: ${sonuc.hata}` }, 502);
    cocuklar.push(sonuc.kimlik!);
  }

  /* 2) Karusel kapsayıcısı (tek görselde bu adım yok). */
  let yayinlanacak = cocuklar[0];
  if (karusel) {
    const sonuc = await metaya(
      karuselKapsayiciAdresi(env as unknown as Record<string, string>, cocuklar, aciklama)
    );
    if (sonuc.hata) return yanit({ hata: `Karusel kapsayıcısı oluşturulamadı: ${sonuc.hata}` }, 502);
    yayinlanacak = sonuc.kimlik!;
  }

  /* 3) Yayınla. Bu adımdan sonra geri dönüş yok. */
  const yayin = await metaya(yayinlaAdresi(env as unknown as Record<string, string>, yayinlanacak));
  if (yayin.hata) return yanit({ hata: `Yayınlanamadı: ${yayin.hata}` }, 502);

  return yanit({
    yayinlandi: true,
    gonderiKimligi: yayin.kimlik,
    gorselSayisi: gorseller.length,
    yayinZamani: new Date().toISOString(),
  });
};
