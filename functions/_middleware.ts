/*
  Politika `functions/` DIŞINDA duruyor. Cloudflare Pages, `functions/`
  altındaki her modülü bir rota olarak ele alıyor; paylaşılan bir yardımcı
  dosyayı oraya koymak `/onbellek-politikasi` diye bir adres açardı.
*/
import {
  kenardaTutulabilirMi,
  kopyaKarari,
  onbellekAnahtariAdresi,
  onbellekBasligi,
} from '../src/lib/onbellek-politikasi.mjs';
/*
  KENARDA İLAN ÇİZİMİ (12 Ekim 2026) — ayrıntı src/lib/seo/kenar-ilan.mjs.
  Sayfa derlemeyle aynı modüllerden çiziliyor; şehir sözlüğü TypeScript'te,
  Pages paketleyicisi onu doğrudan derliyor.
*/
import { ilanIsteginiCoz, ilanHaritasiUret } from '../src/lib/seo/kenar-ilan.mjs';
import { konumEtiketi } from '../src/lib/sehir';

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
/*
  /kesfet/ bu listeden ÇIKTI: bölüm kapandı, adresler `_redirects` ile
  /firsatlar'a 301 alıyor ve o dosya bu ara katmandan ÖNCE işleniyor.
*/
const VERI_ONEKLERI = ['/ilan/', '/sirket/', '/firsatlar/', '/bolum/'];

/*
  ŞİRKET PANELİNİN YOLLARI VERİ DEĞİL, UYGULAMA

  `/sirket/` bir veri öneki: `/sirket/<slug>` bir şirket sayfası ve dosyası
  yoksa gerçekten yok. Ama `/sirket/ilanlar`, `/sirket/basvuranlar`,
  `/sirket/profil` ve `/sirket/ilan` şirket sayfası değil, giriş yapmış
  işverenin paneli (App.tsx: SIRKET_PANEL_YOLLARI). Aynı önek altında
  oldukları için veri dalına düşüyor ve HTTP 404 dönüyorlardı — sayfa
  yine açılıyordu (404.html uygulamayı başlatıyor) ama durum kodu
  yanlıştı (17 Eylül 2026'da canlıda ölçüldü).

  Bu liste App.tsx'teki SIRKET_PANEL_YOLLARI ile aynı olmalı; veri
  dalından ÖNCE bakılıyor. Panel `noindex` ve giriş arkasında; 200 kabuk
  burada var-yok sızdırmıyor, çünkü içerik oturuma bağlı.
*/
const SIRKET_PANEL_YOLLARI = ['/sirket/ilanlar', '/sirket/basvuranlar', '/sirket/adaylar', '/sirket/aday', '/sirket/profil', '/sirket/ilan'];

function sirketPaneliMi(yol: string): boolean {
  const temiz = yol.replace(/\/+$/, '');
  return SIRKET_PANEL_YOLLARI.some((p) => temiz === p || temiz.startsWith(`${p}/`));
}

const UYGULAMA_ADRESLERI = new Set([
  /*
    /cv artık YAZDIRILABİLİR CV DEĞİL: profil kartı ile sosyal fotoğraf
    portfolyosunun birlikte durduğu ekran. Rehber yazılarındaki sekiz
    bağlantı ("Profilini tamamla ve CV'ni indir") buraya geliyor ve
    yazdırılabilir CV bir tık uzakta, kartın kendi düğmesinde.
  */
  '/cv',
  /* Yazdırılabilir CV kendi adresine taşındı; kabuk 200 ile gelmeli. */
  '/cv/yazdir',
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
  /*
    /baglantilar: /profil ile aynı sebep. Profildeki "Bağlantı" sayısı
    gerçek bir <a href> ve yeni sekmede açılabiliyor; ön render
    edilmediği için ara katman olmadan doğrudan açılışta 404 dönerdi.
  */
  '/baglantilar',
  /*
    /takip: /baglantilar ile aynı sebep ve aynı gün eklendi. Profildeki
    "takip" sayacı da artık gerçek bir <a href> ve yeni sekmede
    açılabiliyor; liste burada olmasaydı orta tuşla açılan sekme 404
    görürdü. Adres kimlik taşımıyor — RPC `auth.uid()`i içeride okuyor.
  */
  '/takip',
  /*
    /kampusum: telefonda başlığın sol üstündeki Kampüsüm düğmesi gerçek
    bir <a href> (25 Eylül 2026). /takip ile aynı sebep: ön render
    edilmiyor, orta tuşla açılan sekme burada olmasaydı 404 görürdü.
    Adres kimlik taşımıyor — okul `kampusum()` içinde `auth.uid()`den.
  */
  '/kampusum',
  /*
    /agim ve /agim/baglantilar: sosyal akış ve bağlantı yönetimi. Ön
    render edilmiyorlar (içerik kişiye göre değişiyor), bu yüzden
    doğrudan açıldıklarında kabuğu buradan alıyorlar — liste bu ikisini
    tanımasaydı adres 404 dönerdi.
  */
  '/agim',
  '/agim/baglantilar',
  /*
    /topluluklar: alan toplulukları listesi ve tek topluluk sayfası.
    /profil ile aynı gerekçe — kişiye ve üyeliğe bağlı içerik, ön render
    edilmiyor. Önek eşleşmesi aşağıda `uygulamaninMi` içinde; buradaki
    satır çıplak adres için.
  */
  '/topluluklar',
  '/basvuru-sablonu',
  /*
    BİLDİRİM AYARLARI

    Günlük özet e-postasındaki "Bildirim ayarları" bağlantısı buraya
    geliyor; adres 404 dönerse kullanıcı tercihini kapatmak için
    gidecek bir yer bulamaz. İçerik oturum istiyor, ADRES istemiyor:
    kabuk 200 ile geliyor ve giriş kapısı sayfanın içinde.

    ÖN RENDER EDİLMİYOR: sayfa tamamen kişiye özel, statik bir hâli
    yok. Arama motoru için de değeri yok (`noindex` gerektirmiyor
    çünkü içerik boş bir kabuk).
  */
  '/ayarlar/bildirimler',
  '/sifre-yenile',
  '/stajyer-nasil-alinir',
  '/bana-uygun',
  '/kaydedilen-firsatlar',
  '/yonetim',
]);

function uygulamaninMi(yol: string): boolean {
  const temiz = yol.replace(/\/+$/, '') || '/';
  if (UYGULAMA_ADRESLERI.has(temiz)) return true;
  if (sirketPaneliMi(temiz)) return true;
  if (temiz === '/yonetim' || temiz.startsWith('/yonetim/')) return true;
  /*
    /profil/<kullaniciadi> — UYGULAMA ÖNEKİ, VERİ ÖNEKİ DEĞİL

    Profiller ön render EDİLMİYOR ve edilmeyecek: kişiye özel ve kitleye
    bağlılar, yayında bir dosyaları yok. Bu yüzden `/profil/`
    VERI_ONEKLERI'ne KONMADI — oraya konsaydı "dosya yoksa 404" kuralına
    düşer ve gerçek, var olan bir profil de 404 alırdı.

    ÖLÇÜLEN SORUN: bb74d60 yayınında `/profil/<ad>` adreslerinin tamamı
    HTTP 404 dönüyordu. Sayfa yine de açılıyordu (404.html uygulamayı
    başlatıyor) ama durum kodu yanlıştı: paylaşılan profil bağlantısı
    arama motoruna ve bağlantı önizlemesine "böyle bir sayfa yok"
    diyordu.

    VAR-YOK SIZDIRMIYOR: bütün kullanıcı adları — var olan, olmayan,
    engellenmiş, farklı alandaki — AYNI 200 kabuğunu alıyor. Ayrım
    sunucudaki satır politikasında ve istemcideki tek güvenli ekranda
    kalıyor; durum kodunun kendisi bir varlık kanıtı olmuyor.
  */
  if (temiz === '/profil' || temiz.startsWith('/profil/')) return true;
  /*
    /topluluklar/<slug> — aynı sebep, aynı çözüm. Topluluk sayfası
    üyeliğe göre farklı içerik çiziyor ve ön render edilmiyor; VERİ
    ÖNEKİ değil, uygulama öneki. Var-yok sızdırmıyor: geçerli ya da
    uydurma her slug aynı 200 kabuğunu alıyor, ayrımı sunucudaki üyelik
    politikası ve tek güvenli ekran yapıyor.
  */
  if (temiz === '/topluluklar' || temiz.startsWith('/topluluklar/')) return true;
  /*
    /mesajlar ve /mesajlar/<kullaniciadi> — oturuma bağlı, ön render yok.
    Aynı gerekçe: var olan ya da olmayan her ad aynı 200 kabuğunu alıyor;
    sohbetin kendisi sunucudaki satır politikasından geçiyor.
  */
  if (temiz === '/mesajlar' || temiz.startsWith('/mesajlar/')) return true;
  /*
    /kampusum/<kullaniciadi> — başkasının kampüsü (25 Eylül 2026). Aynı
    gerekçe: her ad aynı 200 kabuğunu alıyor; okul bilgisi sunucuda
    `kampus_profil`in kapısından geçiyor.
  */
  if (temiz.startsWith('/kampusum/')) return true;
  /*
    /paylasim/<id> — paylaşımın kalıcı adresi (28 Eylül 2026). Aynı
    gerekçe: gönderiler ön render EDİLMİYOR (kişiye ve kitleye bağlı,
    yayında dosyaları yok), bu yüzden VERI_ONEKLERI'ne konmadı — oraya
    konsaydı "dosya yoksa 404" kuralına düşer ve gerçek, var olan bir
    paylaşım da 404 alırdı.

    VAR-YOK SIZDIRMIYOR: geçerli, uydurma ya da görme yetkisi olmayan
    her kimlik AYNI 200 kabuğunu alıyor. Ayrım `posts` satır
    politikasında ve istemcideki tek ekranda kalıyor; durum kodunun
    kendisi bir varlık kanıtı olmuyor.
  */
  if (temiz.startsWith('/paylasim/')) return true;
  return VERI_ONEKLERI.some((onek) => yol.startsWith(onek) && yol.length > onek.length);
}

/*
  PROFİL VE TOPLULUK ADRESLERİ ANA SAYFA GİBİ GÖRÜNMÜYOR (14 Ekim 2026)

  Uygulama adresleri kabuk olarak ANA SAYFANIN dolu HTML'ini alıyor:
  `/profil/<herhangi-bir-ad>` ve `/topluluklar/<herhangi-bir-slug>`
  200 ile ana sayfanın başlığını, canonical'ını (`/`) ve ilan kartlarını
  döndürüyordu. Sonsuz sayıda uydurma adres arama motoruna ana sayfanın
  kopyası gibi görünüyordu.

  Sunucu burada "var / gizli / geçersiz" ayrımını YAPAMAZ ve yapmamalı:
  profil ve topluluk okumaları yalnız `authenticated` rolüne açık
  (`sosyal_topluluklar`, profil RPC'leri), oturumsuz ziyaretçi — arama
  motoru dahil — her adreste giriş kapısını görüyor. Ayrım oturum
  açıldıktan sonra istemcide, satır politikasıyla yapılıyor: görülebilen
  profil çiziliyor; gizli, engellenmiş ve olmayan aynı güvenli ekranı
  alıyor.

  Bu yüzden durum kodu 200 kalıyor ve HER AD AYNI CEVABI alıyor (var-yok
  sızmıyor), ama gövde ana sayfa değil, içeriği boş uygulama kabuğu
  (`/_onrender/kabuk`: canonical yok, ilan kartı yok) ve cevap
  `noindex`. Uygulama aynı paketle açılıyor; oturum ve erişim kararları
  değişmiyor.
*/
const GIRISLI_ONEKLER = ['/profil', '/topluluklar'];

function girisliKisiAdresiMi(yol: string): boolean {
  const temiz = yol.replace(/\/+$/, '') || '/';
  return GIRISLI_ONEKLER.some((onek) => temiz === onek || temiz.startsWith(`${onek}/`));
}

interface Ortam {
  ASSETS: { fetch: (istek: Request) => Promise<Response> };
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

/*
  HERKESE AÇIK SUPABASE AYARI

  Kenar çizimi YALNIZ anonim anahtarla okuyor (servis anahtarı satır
  politikasını atlar; herkese açık HTML'e asla girmemeli). Önce Pages
  ortam değişkenlerine bakılıyor; tanımlı değillerse derlemenin yazdığı
  `/_onrender/supabase-genel.json` okunuyor. O dosyadaki iki değer zaten
  her ziyaretçiye giden JavaScript paketinde duruyor — gizli değil — ve
  dosya `noindex`. Böylece kenar çizimi bir panel ayarına bağımlı kalmıyor.
*/
let genelAyar: { taban?: string; anahtar?: string } | null = null;
let kabukOnbellegi: string | null = null;

async function supabaseAyari(env: Ortam, istekAdresi: string): Promise<{ taban?: string; anahtar?: string }> {
  const taban = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anahtar = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (taban && anahtar) return { taban, anahtar };
  if (genelAyar) return genelAyar;
  try {
    const cevap = await env.ASSETS.fetch(new Request(new URL('/_onrender/supabase-genel.json', istekAdresi).toString()));
    if (cevap.ok) {
      const veri = (await cevap.json()) as { url?: string; anonKey?: string };
      genelAyar = { taban: veri.url, anahtar: veri.anonKey };
      return genelAyar;
    }
  } catch {
    /* Ayar okunamadı: ilan isteği yedek dosyaya düşecek. */
  }
  return {};
}

let gecerliSirketler: Set<string> | null = null;

/** Derlemenin yazdığı şirket adresleri (gecerli-adresler.json); okunamazsa null. */
async function sirketAdresleri(env: Ortam, istekAdresi: string): Promise<Set<string> | null> {
  if (gecerliSirketler) return gecerliSirketler;
  try {
    const cevap = await env.ASSETS.fetch(new Request(new URL('/gecerli-adresler.json', istekAdresi).toString()));
    if (!cevap.ok) return null;
    const veri = (await cevap.json()) as { sirket?: string[] };
    gecerliSirketler = new Set(veri.sirket || []);
    return gecerliSirketler;
  } catch {
    return null;
  }
}

async function kabukGetir(env: Ortam, istekAdresi: string): Promise<string | null> {
  if (kabukOnbellegi) return kabukOnbellegi;
  try {
    const cevap = await env.ASSETS.fetch(new Request(new URL('/_onrender/kabuk', istekAdresi).toString()));
    if (!cevap.ok) return null;
    kabukOnbellegi = await cevap.text();
    return kabukOnbellegi;
  } catch {
    return null;
  }
}

/** Derlemenin yazdığı 404 sayfası — gerçek 404 kodu ve noindex ile. */
async function bulunamadi(env: Ortam, istekAdresi: string): Promise<Response> {
  const sayfa = await env.ASSETS.fetch(new Request(new URL('/404.html', istekAdresi).toString()));
  return new Response(await sayfa.text(), {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex',
    },
  });
}

/**
 * Bulunan bir dosyaya önbellek kararını yazar.
 *
 * Karar `src/lib/onbellek-politikasi.mjs` içinde; burada yalnızca
 * uygulanıyor. Cevap gövdesi kopyalanmıyor, yalnız başlıklar
 * değiştiriliyor.
 */
function onbellegiIsaretle(cevap: Response, request: Request): Response {
  const karar = onbellekBasligi({
    yol: new URL(request.url).pathname,
    contentType: cevap.headers.get('content-type'),
    cerez: request.headers.get('cookie'),
  });
  if (!karar) return cevap;

  const yeni = new Response(cevap.body, cevap);
  yeni.headers.set('cache-control', karar);
  return yeni;
}

/**
 * KENAR ÖNBELLEĞİ — BAŞLIKLA DEĞİL, AÇIKÇA.
 *
 * Önce yalnızca `s-maxage` başlığı yazılıyordu. Ölçüldü (canlı,
 * 12 Eylül 2026): Cloudflare HTML'e `cf-cache-status: DYNAMIC` diyor,
 * yani başlığa rağmen önbelleğe hiç almıyor — varsayılan davranışta
 * HTML önbelleklenmiyor. Aynı alan adındaki `/assets/*.js` isteklerinde
 * ise `MISS` görünüyordu, yani mekanizma çalışıyor, kapsam HTML'i
 * dışarıda bırakıyor.
 *
 * Panelden bir Cache Rule açmak da bir yol ama o ayar depoda durmuyor,
 * gözden kaçabiliyor ve "her şeyi önbelleğe al" kuralı kolayca oturumlu
 * cevapları da kapsar. Burada Cache API ile açıkça yapılıyor:
 * anahtarı, kapsamı ve süresi kodda yazıyor ve testi mümkün.
 *
 * `x-onbellek` başlığı ölçüm için: HIT / MISS / ATLANDI. `age` kopyanın
 * kaç saniyedir durduğunu söylüyor — `cf-cache-status` ve `age` ile aynı
 * işi görüyor, farkı bizim yazıyor olmamız.
 */
/** Kopyanın yazılma anını taşıyan iç defter başlığı; istemciye gitmiyor. */
const YAZILMA_BASLIGI = 'x-onbellek-yazilma';

/** Bayat bir kopyanın arkada yenilenmesi. Hata olursa eski kopya yerinde kalıyor. */
async function tazele(
  anahtar: Request,
  next: () => Promise<Response>,
  onbellek: Cache,
  request: Request,
): Promise<void> {
  try {
    const taze = onbellegiIsaretle(await next(), request);
    /*
      KAYIT ARTIK YOKSA KOPYA DA SİLİNİYOR (12 Ekim 2026)

      Eskiden 200 dışı tazelemede yalnız `return` vardı: kapatılan bir
      ilanın bayat 200 kopyası bayatlık penceresi bitene kadar sunulmaya
      devam ediyordu. 404/410 gelince kopya hemen siliniyor.
    */
    if (taze.status === 404 || taze.status === 410) {
      await onbellek.delete(anahtar);
      return;
    }
    if (taze.status !== 200) return;
    if (taze.headers.get('x-ilan-kaynagi') === 'statik-yedek') return;
    if (!(taze.headers.get('content-type') || '').includes('text/html')) return;
    if (taze.headers.has('set-cookie')) return;
    const saklanacak = new Response(taze.body, taze);
    saklanacak.headers.set(YAZILMA_BASLIGI, String(Date.now()));
    saklanacak.headers.delete('x-onbellek');
    await onbellek.put(anahtar, saklanacak);
  } catch {
    /* Tazeleme başarısızsa bayat kopya duruyor; sunulan cevap etkilenmiyor. */
  }
}

async function kenardanSun(
  request: Request,
  next: () => Promise<Response>,
  bekle: (is: Promise<unknown>) => void,
): Promise<Response> {
  const url = new URL(request.url);
  const uygun = kenardaTutulabilirMi({
    yontem: request.method,
    yol: url.pathname,
    cerez: request.headers.get('cookie'),
  });

  if (!uygun) {
    const cevap = onbellegiIsaretle(await next(), request);
    const yeni = new Response(cevap.body, cevap);
    yeni.headers.set('x-onbellek', 'ATLANDI');
    return yeni;
  }

  const anahtar = new Request(onbellekAnahtariAdresi(request.url), { method: 'GET' });
  const onbellek = (caches as unknown as { default: Cache }).default;

  const bulunan = await onbellek.match(anahtar);
  if (bulunan) {
    /*
      Yaş, kopyanın yazıldığı anla şimdiki an arasındaki fark. Cache API
      kendiliğinden `age` yazmıyor ve — ölçüldü — süreyi de uygulamıyor:
      `s-maxage=60` yazılı bir kopya 75 saniye sonra hâlâ dönüyordu.
      Bu yüzden tazelik kararı burada, yazılma damgasından veriliyor.
    */
    const yazilma = Number(bulunan.headers.get(YAZILMA_BASLIGI) || 0);
    const yas = yazilma ? Math.max(0, Math.round((Date.now() - yazilma) / 1000)) : Number.NaN;
    const karar = kopyaKarari(yas);

    if (karar !== 'yok') {
      const yeni = new Response(bulunan.body, bulunan);
      /* Defter başlığı dışarı sızmıyor: yalnız içeride kullandığımız bir alan. */
      yeni.headers.delete(YAZILMA_BASLIGI);
      yeni.headers.set('x-onbellek', karar === 'taze' ? 'HIT' : 'HIT-BAYAT');
      yeni.headers.set('age', String(yas));

      /*
        Bayat kopya ANINDA veriliyor, tazeleme arkada yapılıyor —
        `stale-while-revalidate`in söylediği şey tam olarak bu.
        Ziyaretçi beklemiyor, bir sonraki ziyaretçi taze kopyayı alıyor.
      */
      if (karar === 'bayat') bekle(tazele(anahtar, next, onbellek, request));
      return yeni;
    }
    /* Bayatlık penceresi de dolmuş: kopya yok sayılıyor ve yenisi alınıyor. */
  }

  const cevap = await next();
  const isaretli = onbellegiIsaretle(cevap, request);

  /*
    STATİK YEDEK ÖNBELLEĞE GİRMİYOR: veritabanı okunamadığında sunulan
    derleme dosyası (bkz. ilan dalı) bayat olabilir. Önbelleğe girseydi
    veritabanı düzeldikten sonra da dakikalarca o kopya sunulurdu.
  */
  const saklanabilir =
    isaretli.status === 200 &&
    (isaretli.headers.get('content-type') || '').includes('text/html') &&
    !isaretli.headers.has('set-cookie') &&
    isaretli.headers.get('x-ilan-kaynagi') !== 'statik-yedek';

  const yeni = new Response(isaretli.body, isaretli);
  yeni.headers.set('x-onbellek', saklanabilir ? 'MISS' : 'ATLANDI');
  if (!saklanabilir) return yeni;

  /*
    Kenarda tutulma süresini `cache.put` cevabın kendi `Cache-Control`
    başlığından okuyor (`s-maxage=60`). Süreyi ayrıca yazmak ikisinin
    ayrışmasına davetiye olurdu.

    Saklanan kopyaya yazılma anı ekleniyor; `age` bundan hesaplanıyor ve
    okurken siliniyor.
  */
  const saklanacak = yeni.clone();
  saklanacak.headers.set(YAZILMA_BASLIGI, String(Date.now()));
  saklanacak.headers.delete('x-onbellek');
  bekle(onbellek.put(anahtar, saklanacak));
  return yeni;
}

export const onRequest: PagesFunction<Ortam> = async (baglam) => {
  const { request, next, env } = baglam;
  const istekAdresi = new URL(request.url);
  const istekYolu = istekAdresi.pathname;

  /*
    www → ÇIPLAK ALAN ADI, YOL VE SORGU KORUNARAK (12 Ekim 2026)

    Canlıda www yönlendirmesi Cloudflare panelindeki bir kuraldan geliyor
    ve hedefi sabit "https://stajimvar.com": /rehber/x?utm=… isteği ana
    sayfaya düşüyor (ölçüldü). Asıl düzeltme panelde (docs/seo/www-yonlendirmesi.md).
    Bu dal, www isteği bir gün Pages'e ulaşırsa (kural kaldırılır ve www
    Pages'e özel alan adı olarak bağlanırsa) doğru davranışı garanti ediyor.
  */
  if (istekAdresi.hostname === 'www.stajimvar.com') {
    return new Response(null, {
      status: 301,
      headers: {
        location: `https://stajimvar.com${istekYolu}${istekAdresi.search}`,
        'cache-control': 'public, max-age=86400',
      },
    });
  }
  const okuma = request.method === 'GET' || request.method === 'HEAD';

  /*
    İLAN SİTE HARİTASI — CANLI (12 Ekim 2026)

    Yayındaki ilan listesi her birleştirmede değil, her yayımlamada
    değişiyor. Harita canlı veriden üretiliyor ve 10 dakika kenarda
    tutuluyor. Okuma başarısızsa derlemenin yazdığı dosya sunuluyor:
    boş bir harita asla dönmüyor.
  */
  if (okuma && istekYolu === '/sitemap-ilanlar.xml') {
    const onbellek = (caches as unknown as { default: Cache }).default;
    const anahtar = new Request(new URL('/sitemap-ilanlar.xml', request.url).toString(), { method: 'GET' });
    const bulunan = await onbellek.match(anahtar);
    if (bulunan) return bulunan;
    const xml = await ilanHaritasiUret({ ayar: await supabaseAyari(env, request.url), getir: fetch });
    if (!xml) {
      const yedek = await next();
      const yeni = new Response(yedek.body, yedek);
      yeni.headers.set('x-harita-kaynagi', 'statik-yedek');
      return yeni;
    }
    const cevap = new Response(xml, {
      status: 200,
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': 'public, max-age=600',
        'x-harita-kaynagi': 'canli',
      },
    });
    baglam.waitUntil(onbellek.put(anahtar, cevap.clone()));
    return cevap;
  }

  /*
    İLAN SAYFASI — KENARDA CANLI VERİDEN (12 Ekim 2026)

    Ayrıntı ve karar tablosu src/lib/seo/kenar-ilan.mjs. Kısaca: yayındaki
    ilan 200, adresi eski/kısaltılmış olan 301, yayında olmayan 404 +
    noindex; veri okunamazsa derlemedeki dosya, o da yoksa 503.
    Kenar önbelleği (`kenardanSun`) yalnız 200 HTML'i tutuyor.
  */
  if (okuma && istekYolu.startsWith('/ilan/') && istekYolu.length > '/ilan/'.length) {
    const uret = async (): Promise<Response> => {
      const sonuc = await ilanIsteginiCoz({
        yol: istekYolu,
        ayar: await supabaseAyari(env, request.url),
        getir: fetch,
        kabukGetir: () => kabukGetir(env, request.url),
        gorselVarMi: async (gorsel: string) => {
          try {
            const c = await env.ASSETS.fetch(new Request(new URL(gorsel, request.url).toString(), { method: 'HEAD' }));
            return c.ok;
          } catch {
            return false;
          }
        },
        konumEtiketi,
        /*
          Şirket bağlantısı yalnız sayfası olan şirkete: dağıtımdan sonra
          eklenen bir şirketin adresi bir sonraki derlemeye kadar 404 döner,
          ilan sayfası kırık bağlantı vermesin.
        */
        sirketSayfasiVarMi: async (slug: string) => (await sirketAdresleri(env, request.url))?.has(slug) ?? false,
      });
      if (sonuc.tur === 200) {
        return new Response(sonuc.html, {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8', 'x-ilan-kaynagi': 'kenar' },
        });
      }
      if (sonuc.tur === 301) {
        return new Response(null, {
          status: 301,
          headers: { location: new URL(sonuc.konum, request.url).toString(), 'cache-control': 'public, max-age=3600' },
        });
      }
      if (sonuc.tur === 404) return bulunamadi(env, request.url);
      /* Yedek: derlemede yazılan dosya (ve _redirects'teki eski kimlik kuralları). */
      const statik = await next();
      if (statik.status !== 404) {
        const yeni = new Response(statik.body, statik);
        yeni.headers.set('x-ilan-kaynagi', 'statik-yedek');
        return yeni;
      }
      return new Response('İlan şu anda yüklenemiyor. Birkaç dakika sonra yeniden dene.', {
        status: 503,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'retry-after': '120',
          'cache-control': 'no-store',
          'x-robots-tag': 'noindex',
        },
      });
    };
    const ilanCevabi = await kenardanSun(request, uret, (is) => baglam.waitUntil(is));
    /* Yalnız 200 kenarda tutuluyor; 404 ve 503 paylaşılan önbelleğe girmesin. */
    if (ilanCevabi.status === 404 || ilanCevabi.status === 503) {
      const yeni = new Response(ilanCevabi.body, ilanCevabi);
      yeni.headers.set('cache-control', 'no-store');
      return yeni;
    }
    return ilanCevabi;
  }

  /*
    Önbellek kapısı EN ÖNDE: isabet varsa `next()` hiç çağrılmıyor, yani
    varlık araması da yapılmıyor.
  */
  const kenar = await kenardanSun(request, next, (is) => baglam.waitUntil(is));
  const cevap = kenar;

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

    /ilan/ ARTIK BURAYA DÜŞMÜYOR (12 Ekim 2026): yukarıda kenarda canlı
    veriden çiziliyor. Eskiden burada "son dağıtımdan sonra yayımlanan ilan
    bir sonraki dağıtıma kadar 404 alır; otomasyon saat başı yeniden
    dağıtıyor" yazıyordu — ikinci yarısı doğru değildi: saatlik
    otomasyonun dağıtım adımı `if: false`, yayın yalnız `main`e
    birleştirmede oluyor. Pencere günlerce sürebiliyordu.
  */
  const veriyeDayali =
    !sirketPaneliMi(yol) &&
    VERI_ONEKLERI.some((onek) => yol.startsWith(onek) && yol.length > onek.length);

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

  /* Profil ve topluluk: boş kabuk + noindex (gerekçe `girisliKisiAdresiMi` üstünde). */
  if (girisliKisiAdresiMi(yol)) {
    const bosKabuk = await kabukGetir(env, request.url);
    const govde =
      bosKabuk ?? (await (await env.ASSETS.fetch(new Request(new URL('/', request.url).toString()))).text());
    return new Response(govde, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex',
      },
    });
  }

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
