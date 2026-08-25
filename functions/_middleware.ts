/**
 * Bilinmeyen adreslere gerçek 404, uygulama adreslerine kabuk döndürür.
 *
 * SORUN
 * -----
 * `_redirects` içindeki `/*  /index.html  200` kuralı sitedeki HER hatalı
 * adresi 200 ile ana sayfaya düşürüyordu. Google buna yumuşak 404 diyor:
 * hatalı bağlantılar dizine giriyor ve aynı içerik onlarca adreste
 * görünüyor. Ölçüldü — var olmayan /kullanim-sartlari adresi 200 ve ana
 * sayfa içeriğiyle cevap veriyordu.
 *
 * NEDEN _redirects İLE ÇÖZÜLMEDİ
 * ------------------------------
 * İki deneme de ölçülerek elendi:
 *
 *   1. `/ilan/*  /index.html  200` — Pages hedeften `/index` kısmını
 *      atıyor, kural kendi kendine dönüyor ve "sonsuz döngü" diyerek
 *      kuralı yok sayıyor.
 *   2. `/ilan/*  /  200` — kural çalışıyor ama ÖN RENDER EDİLMİŞ dosyaları
 *      da eziyor. Ölçüldü: /ilan/hukuk-stajyeri-68db1e18 ve /bolum/mimarlik
 *      kendi sayfaları yerine ana sayfa başlığıyla dönüyordu. Yumuşak
 *      404'ten daha kötü: gerçek içerik kayboluyor.
 *
 * Ara katman bu sıralamayı tersine çeviriyor. `next()` önce statik varlığı
 * deniyor; dosya varsa (215 ön render sayfası) olduğu gibi dönüyor. Yalnızca
 * hiçbir dosya eşleşmediğinde buraya düşülüyor ve karar veriliyor:
 *
 *   - Adres uygulamaya ait bir önekteyse kabuk 200 ile dönüyor.
 *   - Değilse Pages'in ürettiği 404 cevabı olduğu gibi geçiyor.
 */

/*
  UYGULAMA ADRESLERİ

  İkiye ayrılıyorlar:

    1. Veriden gelen listeler. İlan, şirket, fırsat ve bölüm adresleri
       değişiyor; ön render bunların o anki halini yazıyor. Yeni eklenen
       bir ilan, ön render yeniden çalışana kadar dosya olarak yok — ama
       adres geçerli. Bu yüzden önek olarak geçiliyor.
    2. Yalnızca uygulamada yaşayan ekranlar. Ön render edilecek içerikleri
       yok: kişiye özel ya da form.

  YENİ ROTA EKLERKEN: App.tsx'e ön render edilmeyen bir adres eklediysen
  buraya da ekle. Eklemezsen adres 404 döner.
*/
const VERI_ONEKLERI = ['/ilan/', '/sirket/', '/firsatlar/', '/bolum/'];

const UYGULAMA_ADRESLERI = new Set([
  '/cv',
  '/basvuru-sablonu',
  '/sifre-yenile',
  '/stajyer-nasil-alinir',
  '/bana-uygun',
  '/kaydedilen-firsatlar',
  '/yonetim',
]);

function uygulamaninMi(yol: string): boolean {
  const temiz = yol.replace(/\/+$/, '') || '/';
  if (UYGULAMA_ADRESLERI.has(temiz)) return true;
  if (temiz === '/yonetim' || temiz.startsWith('/yonetim/')) return true;
  return VERI_ONEKLERI.some((onek) => yol.startsWith(onek) && yol.length > onek.length);
}

interface Ortam {
  ASSETS: { fetch: (istek: Request) => Promise<Response> };
}

export const onRequest: PagesFunction<Ortam> = async ({ request, next, env }) => {
  const cevap = await next();

  /* Dosya bulunduysa işimiz yok — ön render sayfaları buradan geçiyor. */
  if (cevap.status !== 404) return cevap;

  const yol = new URL(request.url).pathname;
  if (!uygulamaninMi(yol)) return cevap;

  /*
    Kabuk ana sayfadan alınıyor. Uygulama açılınca adresi kendisi okuyup
    doğru ekranı çiziyor; bulamazsa kendi "bulunamadı" ekranını gösteriyor.

    Önbelleğe yazılmıyor: bugün dosyası olmayan bir ilan adresi, yarınki
    dağıtımda kendi ön render sayfasına kavuşabiliyor.
  */
  const kabuk = await env.ASSETS.fetch(new Request(new URL('/', request.url).toString()));
  const govde = await kabuk.text();
  return new Response(govde, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};
