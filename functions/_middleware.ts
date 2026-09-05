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
const VERI_ONEKLERI = ['/ilan/', '/sirket/', '/firsatlar/', '/kesfet/', '/bolum/'];

const UYGULAMA_ADRESLERI = new Set([
  '/cv',
  /*
    Çıplak /sirket BURADAN ÇIKARILDI: artık _redirects ile
    /isveren/ilan-ver'e 301 veriyor. İkisi aynı bileşeni çiziyordu, yani
    aynı içeriğin iki public adresi vardı.
  */
  /*
    /profil: uygulama içi bağlantı tıklamayla çalışıyordu (App yolu profil
    sekmesine çeviriyor) ama DOĞRUDAN açılınca 404 dönüyordu. CV rehberinde
    "profil sayfandan takip edebilirsin" bağlantısı buraya gidiyor; yeni
    sekmede açan okuyucu boş ekranla karşılaşıyordu.
  */
  '/profil',
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

  /*
    VERİYE DAYALI ADRESLER: DOSYA YOKSA GERÇEKTEN YOK

    Burada bütün uygulama adresleri için ana sayfanın gövdesi 200 ile
    dönüyordu. Sonuç yumuşak 404'tü: /ilan/olmayan-bir-ilan, /sirket/xxx,
    /kesfet/yyy ve /firsatlar/zzz "200 OK + ana sayfa HTML'i" veriyordu
    (ölçüldü). Arama motoru bunları geçerli sayfa sanıp indeksliyor, sonra
    hepsinde aynı içeriği görüyor.

    Bu önekler bir VERİ KAYDINA karşılık geliyor ve yayındaki her kaydın
    ön render edilmiş dosyası var (scripts/onrender.mjs). Dosya yoksa kayıt
    da yok demektir: 404.html gerçek 404 koduyla dönüyor. O sayfada
    "Sayfa bulunamadı" gövdesi ve `noindex` zaten var.

    KABUL EDİLEN ÖDÜNÇ: son dağıtımdan SONRA yayına alınmış bir ilan, bir
    sonraki dağıtıma kadar doğrudan açıldığında 404 alır. Uygulama içinden
    tıklayan etkilenmiyor (istemci tarafı gezinme, sunucuya uğramıyor) ve
    otomasyon saat başı yeniden dağıtıyor. Var olmayan yüzlerce adresi
    indekslenebilir kılmaktansa bu pencere kabul edildi.
  */
  const veriyeDayali = VERI_ONEKLERI.some(
    (onek) => yol.startsWith(onek) && yol.length > onek.length,
  );

  /*
    SAYFASI YAZILMAMIŞ AMA VAR OLAN KAYITLAR

    Şirket sayfaları yalnızca yayında ilanı olanlar için ön render ediliyor
    (ince içerik üretmemek için). Bu, ilanı olmayan şirketin var olmadığı
    anlamına gelmiyor: /sirket/stajimvar gerçek, sahiplenilmiş ve kendisine
    301 verdiğimiz bir profil — "dosya yoksa 404" kuralına geçince kırıldı
    (canlıda ölçüldü). Build, var olan slug'ları gecerli-adresler.json'a
    yazıyor; burada ona bakılıyor.
  */
  if (veriyeDayali && yol.startsWith('/sirket/')) {
    const slug = yol.slice('/sirket/'.length).replace(/\/+$/, '');
    try {
      const liste = await env.ASSETS.fetch(
        new Request(new URL('/gecerli-adresler.json', request.url).toString()),
      );
      if (liste.ok) {
        const veri = (await liste.json()) as { sirket?: string[] };
        if (veri.sirket?.includes(slug)) {
          const kabuk = await env.ASSETS.fetch(
            new Request(new URL('/', request.url).toString()),
          );
          return new Response(await kabuk.text(), {
            status: 200,
            headers: {
              'content-type': 'text/html; charset=utf-8',
              'cache-control': 'no-store',
            },
          });
        }
      }
    } catch {
      /* Liste okunamazsa 404'e düşülüyor: var olmayanı 200 vermektense. */
    }
  }

  if (veriyeDayali) {
    const bulunamadi = await env.ASSETS.fetch(
      new Request(new URL('/404.html', request.url).toString()),
    );
    return new Response(await bulunamadi.text(), {
      status: 404,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex',
      },
    });
  }

  if (!uygulamaninMi(yol)) return cevap;

  /*
    Veriye dayanmayan uygulama adresleri (/cv, /bana-uygun, /sifre-yenile…)
    kabuğu 200 ile alıyor: bunların arkasında bir kayıt yok, rota var.
    Uygulama açılınca doğru ekranı kendisi çiziyor.
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
