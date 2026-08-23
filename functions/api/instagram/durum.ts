/**
 * GET /api/instagram/durum — Instagram bağlantısının sunucu tarafı kontrolü.
 *
 * NEDEN SUNUCUDA
 * --------------
 * Jeton ve uygulama sırrı istemciye hiç inmemeli. Bu uç, Cloudflare Pages
 * ortamındaki INSTAGRAM_* değişkenlerini kullanarak Meta'ya kendi sorar ve
 * yalnızca SONUCU döndürür: jeton geçerli mi, hangi hesap bağlı, paylaşım
 * izni var mı, kota ne durumda. Yanıtta jeton, sır veya tam adres yok.
 *
 * KİM ÇAĞIRABİLİR
 * ---------------
 * Yalnızca yönetici. Yeni bir parola icat etmiyoruz: çağıran, Supabase
 * oturum jetonunu gönderiyor, biz de Supabase'in kendi `is_admin()`
 * fonksiyonuna soruyoruz — yönetici yetkisinin zaten tek doğruluk kaynağı o.
 * İstemcideki bir bayrağa güvenmek burada işe yaramaz.
 *
 * BU UÇ PAYLAŞIM YAPMAZ. Yalnızca bağlantıyı doğruluyor; içerik yayınlama
 * ayrı bir iş olarak sonra eklenecek.
 */
import {
  durumOzeti,
  eksikAyarlar,
  grafAdresleri,
} from '../../../src/lib/instagram-durum.mjs';

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
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Yönetici verisi; ara katmanlarda saklanmasın.
      'cache-control': 'no-store',
    },
  });

/** Supabase'e "bu jetonun sahibi yönetici mi" diye sorar. */
async function yoneticiMi(env: Ortam, jeton: string): Promise<boolean> {
  const adres = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anahtar = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!adres || !anahtar) return false;

  const cevap = await fetch(`${adres.replace(/\/+$/, '')}/rest/v1/rpc/is_admin`, {
    method: 'POST',
    headers: {
      apikey: anahtar,
      authorization: `Bearer ${jeton}`,
      'content-type': 'application/json',
    },
    body: '{}',
  });

  if (!cevap.ok) return false;
  return (await cevap.json()) === true;
}

async function jsonGetir(adres: string) {
  const cevap = await fetch(adres, { headers: { accept: 'application/json' } });
  try {
    return await cevap.json();
  } catch {
    return { error: { message: `Yanıt okunamadı (HTTP ${cevap.status})`, type: 'agGecidi' } };
  }
}

export const onRequestGet: PagesFunction<Ortam> = async ({ request, env }) => {
  const yetki = request.headers.get('authorization') || '';
  const jeton = yetki.toLowerCase().startsWith('bearer ') ? yetki.slice(7).trim() : '';
  if (!jeton) {
    return yanit({ hata: 'Yönetici oturumu gerekiyor.' }, 401);
  }
  if (!(await yoneticiMi(env, jeton))) {
    return yanit({ hata: 'Bu uç yalnızca yöneticilere açık.' }, 403);
  }

  const eksikler = eksikAyarlar(env as unknown as Record<string, unknown>);
  if (eksikler.length) {
    // Yalnızca ADLAR dönüyor; değerler hiçbir koşulda yanıta girmiyor.
    return yanit({ bagli: false, eksikAyarlar: eksikler, sorunlar: ['Ortam değişkenleri eksik.'] }, 503);
  }

  const adresler = grafAdresleri(env as unknown as Record<string, string>);
  const [dogrulama, hesap, kota] = await Promise.all([
    jsonGetir(adresler.dogrulama),
    jsonGetir(adresler.hesap),
    jsonGetir(adresler.kota),
  ]);

  const ozet = durumOzeti({
    dogrulama,
    hesap,
    kota,
    beklenenKullaniciId: String(env.INSTAGRAM_USER_ID),
  });

  return yanit({ ...ozet, kontrolZamani: new Date().toISOString() }, ozet.bagli ? 200 : 502);
};
