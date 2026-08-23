/**
 * GEÇİCİ TANI UCU — kullanıldıktan sonra SİLİNECEK.
 *
 * NEDEN VAR
 * ---------
 * /api/instagram/durum yönetici oturumu istiyor; oturum açmadan bağlantının
 * neden kurulmadığı görülemiyordu. Bu uç yalnızca tek bir soruyu yanıtlıyor:
 * INSTAGRAM_* değişkenleri Pages'in ÇALIŞMA ANI ortamında görünüyor mu?
 *
 * NE DÖNDÜRMÜYOR
 * --------------
 * Değer döndürmüyor. Ne jeton, ne uygulama sırrı, ne de bunların bir parçası;
 * yalnızca "var / yok" ve uzunluk bilgisi. Uzunluk, yanlış yapıştırılmış bir
 * değeri (örneğin boş dize ya da tırnak içinde kalmış değer) ayırt etmeye
 * yarıyor.
 *
 * KORUMA
 * ------
 * Rastgele üretilmiş tek kullanımlık bir anahtar isteniyor. Anahtar bu
 * dosyada duruyor; Pages Function kaynağı istemciye sunulmuyor, tarayıcıdan
 * indirilemiyor. Yine de uç kalıcı değil: ölçüm alınır alınmaz kaldırılıyor.
 */
const ANAHTAR = 'BlYjVoJcP76gN1E2gYa5o9PYOLILJSvue25nqa5bUoI';

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

export const onRequestGet: PagesFunction<Ortam> = async ({ request, env }) => {
  if (request.headers.get('x-tani-anahtari') !== ANAHTAR) {
    return new Response(JSON.stringify({ hata: 'Yetkisiz.' }), {
      status: 401,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const olcum = (deger?: string) => ({
    var: Boolean(deger && String(deger).trim() !== ''),
    uzunluk: deger ? String(deger).trim().length : 0,
  });

  return new Response(
    JSON.stringify(
      {
        instagram: {
          INSTAGRAM_APP_ID: olcum(env.INSTAGRAM_APP_ID),
          INSTAGRAM_APP_SECRET: olcum(env.INSTAGRAM_APP_SECRET),
          INSTAGRAM_ACCESS_TOKEN: olcum(env.INSTAGRAM_ACCESS_TOKEN),
          INSTAGRAM_USER_ID: olcum(env.INSTAGRAM_USER_ID),
        },
        supabase: {
          SUPABASE_URL: olcum(env.SUPABASE_URL),
          VITE_SUPABASE_URL: olcum(env.VITE_SUPABASE_URL),
          SUPABASE_ANON_KEY: olcum(env.SUPABASE_ANON_KEY),
          VITE_SUPABASE_ANON_KEY: olcum(env.VITE_SUPABASE_ANON_KEY),
        },
      },
      null,
      2
    ),
    { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }
  );
};
