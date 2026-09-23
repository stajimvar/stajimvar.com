/**
 * ÖN RENDER — tarayıcılar için gerçek HTML üretir.
 *
 * SORUN
 * -----
 * Site tek sayfa uygulaması. `curl https://stajimvar.com` ile alınan HTML'in
 * gövdesinde ÖLÇÜLDÜ: sıfır karakter görünür metin. İçeriğin tamamını
 * tarayıcıda JavaScript çiziyor.
 *
 * Googlebot JavaScript çalıştırabiliyor ama bunu ikinci bir turda, günler
 * sonra ve garantisiz yapıyor. Bir ilan sitesi için bu kabul edilemez:
 * ilan iki hafta sonra dizine girerse ilan çoktan kapanmış oluyor.
 *
 * ÇÖZÜM
 * -----
 * `vite build` bittikten sonra bu betik çalışıyor ve her adres için
 * dist/<yol>/index.html yazıyor. Dosyanın içinde:
 *   - sayfaya özgü <title>, açıklama, canonical, Open Graph
 *   - yapısal veri (ilanlarda JobPosting → Google for Jobs)
 *   - #root içinde GÖRÜNÜR metin: başlık, özet, ana bilgiler
 *
 * Cloudflare Pages önce gerçek dosyaya bakıyor; `_redirects` içindeki SPA
 * yedeği yalnızca dosya yoksa devreye giriyor. Yani bu dosyalar kazanıyor.
 *
 * GİZLEME (CLOAKING) YAPMIYORUZ
 * -----------------------------
 * Buraya basılan metin, React'in aynı sayfada çizdiği metnin aynısı.
 * Tarayıcıya bir şey, kullanıcıya başka bir şey göstermek Google'ın
 * yasakladığı bir davranış; o yüzden içerik uydurulmuyor, veritabanındaki
 * ve kayıtlardaki gerçek metin kullanılıyor.
 *
 * React `createRoot().render()` ile bağlanıyor (hydrate değil): açılışta
 * kabı temizleyip kendi ağacını kuruyor. Yani bu metin kullanıcı için
 * geçici bir ilk kare, tarayıcı için kalıcı içerik.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { kartYaz } from './og-kartlari.mjs';
import { guvenliDisAdres } from '../src/lib/guvenli-url.mjs';
import { kunye, YAZAR } from '../src/lib/rehber-kunye.mjs';

const kok = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const dist = path.join(kok, 'dist');
const SITE = 'https://stajimvar.com';

/* ------------------------------------------------------------------ yardımcı */

function envOku(anahtar) {
  if (process.env[anahtar]) return process.env[anahtar];
  for (const dosya of ['.env', path.join('automation', '.env')]) {
    const yol = path.join(kok, dosya);
    if (!fs.existsSync(yol)) continue;
    for (const satir of fs.readFileSync(yol, 'utf8').split(/\r?\n/)) {
      const e = satir.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (e && e[1] === anahtar) return e[2].replace(/^["']|["']$/g, '');
    }
  }
  return undefined;
}

const kacir = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/*
  MARKDOWN BAĞLANTISI STATİK HTML'DE DE GERÇEK BAĞLANTI

  Rehber metinlerinde bağlantılar `[yazı](/adres)` yazılıyor ve ekranda
  `metniCiz` (src/data/rehber-govde.tsx) onları <a> yapıyor. Hızlı cevap
  ve SSS cevapları burada ham string olarak kaçırılıyordu: statik HTML'de
  köşeli parantezler görünüyordu (12 rehberde ölçüldü). Bu dosyanın kendi
  kuralı "sayfada görünen metin ile statik HTML aynı şeyi söylemeli"
  diyor — söylemiyordu.

  SIRA ÖNEMLİ: önce kaçır, sonra bağlantıyı kur. Tersi olsaydı ürettiğimiz
  <a> etiketi de kaçırılır ve ekranda etiketin kendisi görünürdü. Kaçırma
  sonrası desen hâlâ tutuyor, çünkü köşeli parantez ve parantez
  kaçırılmıyor.

  Desen `rehber-govde.tsx`'teki BAGLANTI ile aynı; ikisi ayrışırsa ekran
  ve HTML yine ayrışır.
*/
const MD_BAGLANTI = /\[([^\]]+)\]\(([^)]+)\)/g;

/*
  YAPISAL VERİDE İŞARETLEME KALMAZ

  FAQPage'in cevabı DÜZ METİN alanı: `[yazı](/adres)` oraya olduğu gibi
  girerse Google'ın gördüğü metin ekranda görünenden farklı olur —
  yapısal veri ile görünen içeriğin ayrışması ceza sebebi. Bağlantı
  söz dizimi sadeleşiyor, yazı kalıyor.
*/
const baglantiyiSadelestir = (metin) =>
  String(metin ?? '').replace(MD_BAGLANTI, (_, yazi) => yazi);

const kacirBagla = (metin) =>
  kacir(metin).replace(MD_BAGLANTI, (_, yazi, adres) => {
    const dis = adres.startsWith('http');
    const ek = dis ? ' target="_blank" rel="noreferrer noopener"' : '';
    return `<a href="${adres}"${ek}>${yazi}</a>`;
  });

/** Etiketleri ve fazla boşluğu atar; kısaltmaz. */
function duzMetin(metin) {
  return String(metin ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Uzun metni arama sonucunda görünecek uzunluğa indirir. */
function ozetle(metin, uzunluk = 155) {
  const duz = String(metin ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (duz.length <= uzunluk) return duz;
  return duz.slice(0, uzunluk).replace(/\s+\S*$/, '') + '…';
}

/** src/lib/slug.ts ve automation/sitemap.py ile aynı kural. */
function slugla(metin) {
  const tablo = { İ: 'i', I: 'i', ı: 'i', Ğ: 'g', ğ: 'g', Ü: 'u', ü: 'u', Ş: 's', ş: 's', Ö: 'o', ö: 'o', Ç: 'c', ç: 'c' };
  return String(metin)
    .replace(/[İIıĞğÜüŞşÖöÇç]/g, (c) => tablo[c])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .replace(/-{2,}/g, '-');
}

/* ------------------------------------------------- kayıtlardan veri çıkarma */

/**
 * TypeScript kayıtlarından alan okur.
 *
 * Kayıtlar TS; Node onları doğrudan içe aktaramıyor (tip söz dizimi var).
 * sitemap.py'da da aynı yol izleniyor: girdiler düz bir dizi ve her alan
 * tek satırda, o yüzden düzenli ifade yeterli ve kırılgan değil.
 */
function kayittanOku(dosya, alanlar) {
  const yol = path.join(kok, 'src', 'data', dosya);
  if (!fs.existsSync(yol)) return [];
  const metin = fs.readFileSync(yol, 'utf8');
  const kayitlar = [];
  const slugKalibi = /^\s{4}slug: '([a-z0-9-]+)',$/gm;

  /*
    Girdinin sınırı bir SONRAKİ slug; sabit karakter penceresi değil.

    Önce `e.index + 2400` kullanılıyordu. Rehberler uzayınca son alanlar
    (guncelleme gibi) pencerenin dışında kalıp okunamadı — ölçüldü:
    dateModified boş çıkıyordu. Sabit pencere, içerik büyüdükçe sessizce
    veri kaybettiren bir varsayım.
  */
  const yerler = [];
  let ee;
  while ((ee = slugKalibi.exec(metin))) yerler.push({ slug: ee[1], i: ee.index });

  for (let n = 0; n < yerler.length; n++) {
    const e = [null, yerler[n].slug];
    e.index = yerler[n].i;
    const parca = metin.slice(
      yerler[n].i,
      n + 1 < yerler.length ? yerler[n + 1].i : metin.length
    );
    const kayit = { slug: e[1] };
    for (const alan of alanlar) {
      // Tek satırlık ya da ' + ' ile bölünmüş çok satırlı dizeler
      const m = parca.match(new RegExp(`${alan}:\\s*((?:'(?:[^'\\\\]|\\\\.)*'\\s*\\+?\\s*)+)`, 's'));
      if (m) {
        kayit[alan] = m[1]
          .split(/'\s*\+\s*'/)
          .join('')
          .replace(/^'|'\s*$/g, '')
          .replace(/\\'/g, "'")
          .trim();
      }
    }
    kayitlar.push(kayit);
  }
  return kayitlar;
}

/**
 * Rehber kayitindaki `sss` dizilerini slug -> [{soru, cevap}] olarak okur.
 *
 * kayittanOku tek satirlik alanlar icin yazilmisti; sss ic ice nesne dizisi
 * oldugu icin ayri bir gecis gerekiyor. Yine duzenli ifade kullaniliyor
 * (Node TS dosyasini import edemiyor) ama yapi sabit: her girdi
 * `soru: '...'` ve `cevap:` + dize satirlarindan olusuyor.
 */
function sssOku() {
  const yol = path.join(kok, 'src', 'data', 'rehberler.tsx');
  if (!fs.existsSync(yol)) return {};
  const metin = fs.readFileSync(yol, 'utf8');
  const sonuc = {};

  const slugKalibi = /^\s{4}slug: '([a-z0-9-]+)',$/gm;
  const yerler = [];
  let e;
  while ((e = slugKalibi.exec(metin))) yerler.push({ slug: e[1], i: e.index });

  yerler.forEach((y, n) => {
    const parca = metin.slice(y.i, n + 1 < yerler.length ? yerler[n + 1].i : metin.length);
    const sssBas = parca.indexOf('sss: [');
    if (sssBas === -1) return;
    const sssSon = parca.indexOf('\n    ],', sssBas);
    const alan = parca.slice(sssBas, sssSon === -1 ? parca.length : sssSon);
    const sorular = [];
    const ciftKalibi = /soru: '((?:[^'\\]|\\.)*)',\s*cevap:\s*'((?:[^'\\]|\\.)*)'/g;
    let c;
    while ((c = ciftKalibi.exec(alan))) {
      sorular.push({
        soru: c[1].replace(/\\'/g, "'"),
        cevap: c[2].replace(/\\'/g, "'"),
      });
    }
    if (sorular.length) sonuc[y.slug] = sorular;
  });
  return sonuc;
}

/* --------------------------------------------- rehber gövdesini gerçekten çiz */

/**
 * Rehberlerin JSX içeriğini statik HTML'e çevirir.
 *
 * NEDEN GEREKLİ
 * -------------
 * Ön render bu adımdan önce her rehbere yalnızca başlık, özet ve sık
 * sorulanları basıyordu. Rehberin ASIL metni — tablolar, akışlar,
 * karşılaştırmalar — yalnızca tarayıcıda React çizince ortaya çıkıyordu.
 *
 * Ölçüldü: staj-nasil-bulunur sayfasında "Hangi kanal ne zaman işe yarıyor"
 * bölümünün tamamı ön render çıktısında YOKTU. Yani içeriği derinleştirmek
 * Googlebot'un ilk turunda hiçbir şey değiştirmiyordu; her şey JavaScript
 * çalıştıran ikinci tura kalıyordu. Bir ilan sitesi için bu, bütün ön render
 * işini yarım bırakmak demek.
 *
 * NASIL
 * -----
 * İçerik TSX; Node onu doğrudan içe aktaramıyor. esbuild (zaten Vite'ın
 * bağımlılığı) dosyayı geçici bir ESM paketine derliyor, sonra React'in
 * kendi sunucu çizicisi aynı ağacı HTML'e çeviriyor.
 *
 * Böylece basılan metin, kullanıcının gördüğü metnin BİREBİR aynısı oluyor —
 * elle yazılmış bir özet değil. Gizleme riski tanım gereği ortadan kalkıyor.
 *
 * Düzenli ifadeyle metin ayıklamak da denenebilirdi ama o yol bugün iki kez
 * sessiz veri kaybı üretti; asıl bileşenleri çalıştırmak tek doğru kaynak.
 */
/*
  REHBER → ÜRÜN EŞLEMESİ TEK KEZ DERLENİYOR

  Rehber sayfaları ve kurum sayfaları aynı eşlemeyi kullanıyor.
  Uygulamadan farklı bir liste basmak, tarayıcıya sayfada olmayan bir
  bağlantı göstermek olurdu.
*/
let rehberEylemleri = () => [];

async function eslemeyiYukle() {
  ({ rehberEylemleri } = await icerikDerle(
    path.join(kok, 'src', 'lib', 'rehber-eylemleri.mjs'),
    'rehber-eylemleri'
  ));
}

async function icerikDerle(girisDosyasi, ad) {
  const gecici = path.join(kok, 'node_modules', '.cache', `onrender-${ad}.mjs`);
  const esbuild = await import('esbuild');
  fs.mkdirSync(path.dirname(gecici), { recursive: true });
  await (esbuild.build || esbuild.default.build)({
    entryPoints: [girisDosyasi],
    outfile: gecici,
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    logLevel: 'silent',
    /*
      Bağımlılıklar paketlenmiyor, Node'a bırakılıyor.

      Önce yalnızca react dışarıda bırakılmıştı; o zaman lucide-react'in
      CommonJS sürümü pakete giriyor ve esbuild'in require köprüsü
      "Dynamic require of react is not supported" hatasıyla düşüyordu
      (ölçüldü). Node bu paketleri zaten çözebiliyor; ayrıca React'in tek
      kopya kalmasını da bu garanti ediyor.
    */
    packages: 'external',
  });
  return import(url.pathToFileURL(gecici).href + `?t=${Date.now()}`);
}

/**
 * Bölüm sayfalarının içeriğini statik HTML'e çevirir.
 *
 * Rehberlerle aynı gerekçe: bölüm sayfaları da tarayıcıya yalnızca başlık ve
 * tek cümlelik özet gösteriyordu. Otuz dört sayfayla bunlar sitenin en
 * kalabalık grubu; hepsinin ince içerik görünmesi tek tek sayfalardan daha
 * ağır bir sorun.
 *
 * Kabuk/içerik ayrımı burada kritik: çizilen şey BolumIcerik, sayfanın
 * kabuğu değil. Kabuk çizilseydi her sayfa aynı başlık çubuğunu ve aynı
 * menüyü içerir, otuz dört sayfa birbirinin kopyası gibi görünürdü.
 */
async function bolumleriCiz() {
  try {
    const { BOLUMLER } = await icerikDerle(path.join(kok, 'src', 'data', 'bolumler.ts'), 'bolumler');
    const { BolumIcerik } = await icerikDerle(
      path.join(kok, 'src', 'components', 'BolumIcerik.tsx'),
      'bolum-icerik'
    );
    const { renderToStaticMarkup } = await import('react-dom/server');
    const React = (await import('react')).default;

    const sonuc = {};
    for (const b of BOLUMLER) {
      sonuc[b.slug] = {
        ...b,
        cizim: renderToStaticMarkup(React.createElement(BolumIcerik, { bolum: b })),
      };
    }
    return sonuc;
  } catch (hata) {
    console.error('ön render DURDU: bölüm içeriği çizilemedi.');
    console.error(hata?.message || hata);
    process.exit(1);
  }
}

/**
 * Kurumsal ve yasal sayfaların içeriğini statik HTML'e çevirir.
 *
 * NEDEN ÖNEMLİ
 * ------------
 * Hakkımızda, İletişim, Gizlilik ve Kullanım Koşulları sayfaları AdSense
 * incelemesinde ve arama motorunun güven değerlendirmesinde ilk bakılan
 * yerler. Sayfaların hepsi vardı ve doluydu — ama ön render edilmiyordu:
 * dist içinde hakkimizda.html hiç yoktu, adres SPA yedeğine düşüyordu.
 *
 * Yani inceleyen taraf o adreslere gidince boş bir gövde görüyordu.
 * İçeriğin var olması yetmiyor; JavaScript çalıştırmayan bir denetçi için
 * yok sayılıyor.
 *
 * LegalPage tek kaynak: tarayıcıda da bu bileşen çiziliyor.
 */
async function yasalSayfalariCiz() {
  try {
    const modul = await icerikDerle(
      path.join(kok, 'src', 'components', 'LegalPage.tsx'),
      'yasal'
    );
    const { renderToStaticMarkup } = await import('react-dom/server');
    const React = (await import('react')).default;

    const sonuc = {};
    for (const [yol, slug] of Object.entries(modul.LEGAL_ROUTES)) {
      const cizim = renderToStaticMarkup(
        React.createElement(modul.LegalPage, { slug, onBack: () => {} })
      );

      /*
        CLOUDFLARE E-POSTA GİZLEMESİNİ KAPAT.

        Cloudflare, yanıttaki mailto bağlantılarını otomatik olarak
        `/cdn-cgi/l/email-protection#...` adresine çeviriyor ve görünen metni
        JavaScript ile çözülen bir yer tutucuyla değiştiriyor.

        Ölçüldü: canlı /iletisim ve /hakkimizda sayfalarında düz adres HİÇ
        yoktu; yerine "[email protected]" yazıyordu. Spam botlarına karşı
        yararlı ama bizim için ters çalışıyor — iletişim adresi, AdSense
        incelemesinde ve arama motorunun güven değerlendirmesinde bakılan
        şeylerden biri ve JavaScript çalıştırmayan bir denetçi onu göremiyor.

        `email_off` yorumu Cloudflare'in bu bölümü atlamasını sağlıyor;
        belgelenmiş bir kaçış yolu. Yalnızca iletişim adresinin geçtiği
        kurumsal ve yasal sayfalarda kullanılıyor.
      */
      sonuc[yol] = `<!--email_off-->${cizim}<!--/email_off-->`;
    }
    return sonuc;
  } catch (hata) {
    console.error('ön render DURDU: yasal sayfalar çizilemedi.');
    console.error(hata?.message || hata);
    process.exit(1);
  }
}

/**
 * Merkez sayfaların listelerini çizer.
 *
 * /rehber ve /bolumler bu sitenin taranma kapıları: tarayıcı oradan tek
 * tek sayfalara geçiyor. Ama ölçüldü — statik HTML'lerinde HİÇ bağlantı
 * yoktu; liste yalnızca tarayıcıda React çizince ortaya çıkıyordu. Yani
 * otuz dört bölüm ve on rehber sayfasına yalnızca site haritasından
 * ulaşılabiliyordu ve aralarında sinyal taşınmıyordu.
 *
 * Çizilen şey listenin kendisi; sayfanın kabuğu değil.
 */
async function merkezListeleriniCiz() {
  try {
    const bolumModul = await icerikDerle(
      path.join(kok, 'src', 'components', 'BolumPages.tsx'),
      'bolum-listesi'
    );
    const rehberModul = await icerikDerle(
      path.join(kok, 'src', 'components', 'GuidePages.tsx'),
      'rehber-listesi'
    );
    const { renderToStaticMarkup } = await import('react-dom/server');
    const React = (await import('react')).default;
    /*
      Rehber sayfalarinin sonundaki baglanti blogu da burada ciziliyor.
      Olculdu: on rehberin dokuzunda statik HTML'de SIFIR baglanti vardi,
      yani her rehber cikmaz sokakti ve rehberden bolume giden hicbir yol
      yoktu - baglanti agi tek yonlu isliyordu.
    */
    const rehberBaglantilari = (slug, kategori) =>
      renderToStaticMarkup(
        React.createElement(rehberModul.RehberBaglantilari, { slug, kategori })
      );

    /*
      Buyuk isverenler dizini de burada ciziliyor. Bu sayfanin TEK icerigi
      kirk dort dis baglanti; on render'a girmezse tarayici basliktan baska
      hicbir sey gormuyor ve sayfa bos sayiliyor.
    */
    const programModul = await icerikDerle(
      path.join(kok, 'src', 'components', 'StajProgramlari.tsx'),
      'staj-programlari'
    );
    /*
      Isveren giris sayfasinin METNI. Arama kutusu ciziLMIYOR: o etkilesimli
      bir arac, icerik degil. Sayfanin anlattigi her sey (uc adim, bes soru,
      "sirketiniz yoksa" yolu) statik HTML'de duruyor.
    */
    const isverenModul = await icerikDerle(
      path.join(kok, 'src', 'components', 'IsverenGirisiIcerik.tsx'),
      'isveren-girisi'
    );
    const merkezModul = await icerikDerle(
      path.join(kok, 'src', 'components', 'KariyerMerkezleri.tsx'),
      'kariyer-merkezleri'
    );
    /*
      /staj-ilanlari gövdesi CANLI ROTAYLA AYNI BİLEŞENDEN çiziliyor.
      İkinci bir işaretleme yazılsaydı arama motorunun gördüğü sayfa ile
      kullanıcının gördüğü sayfa zamanla ayrışırdı.
    */
    const stajIlanlariModul = await icerikDerle(
      path.join(kok, 'src', 'components', 'StajIlanlariIcerik.tsx'),
      'staj-ilanlari'
    );

    return {
      bolumler: renderToStaticMarkup(React.createElement(bolumModul.BolumListesi, {})),
      rehberler: renderToStaticMarkup(React.createElement(rehberModul.RehberListesi, {})),
      programlar: renderToStaticMarkup(React.createElement(programModul.ProgramListesi, {})),
      isverenGirisi: renderToStaticMarkup(
        React.createElement(isverenModul.IsverenGirisiIcerik, {})
      ),
      kariyerMerkezleri: renderToStaticMarkup(
        React.createElement(merkezModul.KariyerMerkezleriIcerik, {})
      ),
      /*
        Veri ÇAĞIRANDAN geliyor: bileşen hiçbir sayı hesaplamıyor.
        `onNavigate` verilmiyor — statik HTML'de bağlantılar düz
        `<a href>` kalıyor ve tarayıcı onları izleyebiliyor.
      */
      stajIlanlari: (veri) =>
        renderToStaticMarkup(React.createElement(stajIlanlariModul.StajIlanlariIcerik, veri)),
      rehberBaglantilari,
    };
  } catch (hata) {
    console.error('ön render DURDU: merkez listeleri çizilemedi.');
    console.error(hata?.message || hata);
    process.exit(1);
  }
}

/** Yasal ve kurumsal sayfaların başlık ve açıklamaları. */
const YASAL_BILGI = {
  '/hakkimizda': [
    'Hakkımızda | StajımVar',
    'StajımVar kimdir, neden kuruldu ve ilanları nasıl derliyor? Çalışma biçimimiz ve iletişim bilgilerimiz.',
  ],
  '/iletisim': [
    'İletişim | StajımVar',
    'StajımVar ile iletişime geç: soru, öneri, ilan bildirimi ve şirket başvuruları için e-posta adresimiz.',
  ],
  '/kullanim-kosullari': [
    'Kullanım Koşulları | StajımVar',
    'StajımVar kullanım koşulları: hizmetin kapsamı, kullanıcı yükümlülükleri ve sorumluluk sınırları.',
  ],
  '/ilan-kurallari': [
    'İlan Yayınlama Kuralları | StajımVar',
    'StajımVar’da hangi ilanlar yayımlanır, hangileri yayımlanmaz? Şirketler için ilan kuralları.',
  ],
  '/ilan-bildir': [
    'İçerik ve İlan Bildirimi | StajımVar',
    'Hatalı, süresi geçmiş ya da kurallara aykırı bir ilan gördüysen nasıl bildireceğini anlatıyoruz.',
  ],
  '/gizlilik': [
    'Gizlilik Politikası | StajımVar',
    'Hangi kişisel verileri topluyoruz, neden topluyoruz, ne kadar saklıyoruz ve kimlerle paylaşıyoruz.',
  ],
  '/cerez-politikasi': [
    'Çerez Politikası | StajımVar',
    'StajımVar’da hangi çerezler kullanılıyor, ne işe yarıyorlar ve tarayıcıdan nasıl kapatılır.',
  ],
  '/kvkk-aydinlatma-metni': [
    'KVKK Aydınlatma Metni | StajımVar',
    '6698 sayılı kanun kapsamında veri sorumlusu, işleme amaçları, hukuki sebepler ve ilgili kişinin hakları.',
  ],
};

async function rehberleriCiz() {
  const gecici = path.join(kok, 'node_modules', '.cache', 'onrender-rehberler.mjs');
  try {
    const esbuild = await import('esbuild');
    fs.mkdirSync(path.dirname(gecici), { recursive: true });
    await (esbuild.build || esbuild.default.build)({
      entryPoints: [path.join(kok, 'src', 'data', 'rehberler.tsx')],
      outfile: gecici,
      bundle: true,
      format: 'esm',
      platform: 'node',
      jsx: 'automatic',
      logLevel: 'silent',
      /*
        Bağımlılıklar paketlenmiyor, Node'a bırakılıyor.

        Önce yalnızca react dışarıda bırakılmıştı; o zaman lucide-react'in
        CommonJS sürümü pakete giriyor ve esbuild'in require köprüsü
        "Dynamic require of react is not supported" hatasıyla düşüyordu
        (ölçüldü). Node bu paketleri zaten çözebiliyor; ayrıca React'in tek
        kopya kalmasını da bu garanti ediyor.
      */
      packages: 'external',
    });

    const { REHBERLER } = await import(url.pathToFileURL(gecici).href + `?t=${Date.now()}`);
    const { renderToStaticMarkup } = await import('react-dom/server');

    const sonuc = {};
    for (const r of REHBERLER) {
      sonuc[r.slug] = {
        baslik: r.baslik,
        seoBaslik: r.seoBaslik,
        ozet: r.ozet,
        aciklama: r.aciklama,
        kategori: r.kategori,
        guncelleme: r.guncelleme,
        sss: r.sss || [],
        konu: r.konu,
        hizliCevap: r.hizliCevap,
        kaynaklar: r.kaynaklar || [],
        /*
          `dayanak` BURADAN DÜŞÜYORDU.

          Ölçüldü (canlı rehber/ats-uyumlu-cv): sayfanın "Bu rehber neye
          dayanıyor" bölümü ön render edilmiş HTML'de YOKTU. Sebebi bu
          satırın eksik olmasıydı — alan hiç çıkarılmadığı için aşağıdaki
          gövde onu yazamıyordu. Resmî kaynağı olmayan 19 rehber,
          JavaScript çalışmadan "neye dayandığını" hiç söylemiyordu.
        */
        dayanak: r.dayanak,
        sonrakiAdim: r.sonrakiAdim,
        govde: renderToStaticMarkup(r.icerik),
      };
    }
    return sonuc;
  } catch (hata) {
    /*
      Çizim tutmazsa sessizce devam ETME.

      Sessiz geri düşüş, sayfaların içeriksiz yayımlanması demek olurdu ve
      bunu ancak haftalar sonra arama sonuçlarından fark ederdik.
    */
    console.error('ön render DURDU: rehber içeriği çizilemedi.');
    console.error(hata?.message || hata);
    process.exit(1);
  }
}

/* ------------------------------------------------------- Supabase'ten ilanlar */

/**
 * YALNIZCA ANONİM ANAHTAR — bkz. `firsatlariGetir` ve `katalogTohumuGetir`.
 *
 * Servis anahtarı RLS'i atlıyor; herkese açık HTML üreten bir yol onu
 * kullanırsa ziyaretçinin göremeyeceği bir satır sayfaya girebilir ya da
 * statik HTML ile hidrasyon ayrışır. `envOku` `automation/.env`'i de
 * okuyor ve orada servis anahtarı bulunabiliyor — yani bu, yerelde
 * sessizce devreye giren bir fark.
 *
 * Kayıp yok, ölçüldü: `listings` okuma politikası
 * `status='published' OR is_company_member(...)`; bu sorgu zaten
 * `status=eq.published` süzüyor, yani anon aynı satırları görüyor.
 */
async function ilanlariGetir() {
  const urlAdres = envOku('SUPABASE_URL') || envOku('VITE_SUPABASE_URL');
  const anahtar = envOku('VITE_SUPABASE_ANON_KEY');
  if (!urlAdres || !anahtar) {
    console.log('  ilanlar atlandı (anonim anahtar yok)');
    return [];
  }
  /*
    `responsibilities`, `required_skills`, `duration` ve `min_grade_level`
    BU LİSTEYE 19 EYLÜL 2026'DA GİRDİ. Ölçülen durum: ön render edilen
    ilan sayfasının görünür metni 52 kelimeydi ve açıklama 155 karakterde
    üç noktayla kesiliyordu — oysa yayındaki 194 ilanın %70'inde
    sorumluluk, %61'inde aranan nitelik YAZILI olarak duruyordu. React
    ekranda gösteriyor, statik HTML göstermiyordu; yani arama motorunun
    ve JavaScript'siz ziyaretçinin gördüğü sayfa, kullanıcının gördüğünden
    çok daha yoksuldu. Veri zaten vardı, sorgu istemiyordu.
  */
  const secim =
    'id,title,description,responsibilities,required_skills,duration,min_grade_level,city,country_code,work_type,apply_url,application_method,posted_at,created_at,application_deadline,is_paid,stipend_text,companies(name,slug,website_url,logo_url,industry,location,description)';
  const istek = `${urlAdres}/rest/v1/listings?status=eq.published&select=${encodeURIComponent(secim)}`;
  const yanit = await fetch(istek, {
    headers: { apikey: anahtar, Authorization: `Bearer ${anahtar}` },
  });
  if (!yanit.ok) {
    console.log(`  ilanlar alınamadı: HTTP ${yanit.status}`);
    return [];
  }
  return yanit.json();
}

/**
 * AÇILIŞ TOHUMU — katalogun ilk sayfası.
 *
 * NEDEN AYRI ÇAĞRI
 * ----------------
 * `ilanlariGetir` düz bir REST seçimi yapıyor ve arama motoru metni için
 * yeterli. Ama istemcinin beklediği şey o değil: `useGlobalListingPreferences`
 * `get_published_listings_catalog_v3` yanıtını bekliyor — sayfalama
 * imleci, anlık görüntü kimliği ve sayaçlarıyla birlikte. Tohumun
 * istemcide doğrulamadan geçmesi için AYNI çağrıdan gelmesi gerekiyor.
 *
 * NEDEN ANONİM ANAHTAR
 * --------------------
 * Bu betiğin elinde `SUPABASE_SERVICE_ROLE_KEY` olabiliyor ve o anahtar
 * RLS'i atlıyor. Tohum herkese açık HTML'in içine giriyor; servis
 * anahtarıyla üretilmiş bir yanıt, yayımlanmaması gereken bir satırı
 * sessizce dışarı taşıyabilirdi. Bu yüzden burada YALNIZCA anonim
 * anahtar kullanılıyor: gömülen şey, siteye giren herhangi birinin
 * zaten görebileceği yanıtın aynısı.
 *
 * Başarısız olursa tohum yazılmıyor ve istemci eski yolundan — ağdan —
 * yüklüyor. Ön render durmuyor: tohum bir hızlandırma, bir gereklilik
 * değil.
 */
async function katalogTohumuGetir(ulke) {
  const urlAdres = envOku('SUPABASE_URL') || envOku('VITE_SUPABASE_URL');
  const anahtar = envOku('VITE_SUPABASE_ANON_KEY');
  if (!urlAdres || !anahtar) {
    console.log('  açılış tohumu atlandı (anonim anahtar yok)');
    return null;
  }
  try {
    /*
      TOHUM DA v3'TEN GELİYOR.

      v2 son başvuru tarihine bakmıyor ve şehir sayısını ham `city`
      metninden hesaplıyordu. Tohum v2'den, canlı çağrı v3'ten gelseydi
      ilk çizim ile saniyeler sonraki ekran FARKLI sayı gösterirdi —
      tam olarak bu paketin kapatmaya çalıştığı ayrışma.
    */
    const yanit = await fetch(`${urlAdres}/rest/v1/rpc/get_published_listings_catalog_v3`, {
      method: 'POST',
      headers: {
        apikey: anahtar,
        Authorization: `Bearer ${anahtar}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_country: ulke,
        p_cursor_posted_at: null,
        p_cursor_id: null,
        p_snapshot: null,
      }),
    });
    if (!yanit.ok) {
      console.log(`  açılış tohumu alınamadı: HTTP ${yanit.status}`);
      return null;
    }
    const veri = await yanit.json();
    if (!veri || !Array.isArray(veri.listings) || !veri.listings.length) {
      console.log('  açılış tohumu boş geldi, yazılmadı');
      return null;
    }
    return veri;
  } catch (hata) {
    console.log(`  açılış tohumu alınamadı: ${hata?.message || hata}`);
    return null;
  }
}

/**
 * Bütün şirket slug'ları.
 *
 * NEDEN AYRI SORGU
 * ----------------
 * Şirket SAYFALARI yalnızca yayında ilanı olanlar için yazılıyor (ince
 * içerik üretmemek için) ama bu, ilanı olmayan şirketin VAR OLMADIĞI
 * anlamına gelmiyor. Ara katman "ön render dosyası yoksa 404" kuralına
 * geçince /sirket/stajimvar 404 dönmeye başladı — gerçek, sahiplenilmiş ve
 * kendisine 301 verdiğimiz bir profil (ölçüldü, canlıda kırıldı).
 *
 * Bu liste "hangi adres GERÇEKTEN var" sorusunun cevabı; sayfa yazılıp
 * yazılmadığından bağımsız. Ara katman bunu okuyup karar veriyor.
 */
/*
  YALNIZCA ANONİM ANAHTAR — yukarıdaki `ilanlariGetir` ile aynı gerekçe.
  Kayıp yok, ölçüldü: `companies` okuma politikasının koşulu `true`,
  yani anon bütün şirketleri zaten görüyor.
*/
async function sirketSluglariniGetir() {
  const urlAdres = envOku('SUPABASE_URL') || envOku('VITE_SUPABASE_URL');
  const anahtar = envOku('VITE_SUPABASE_ANON_KEY');
  if (!urlAdres || !anahtar) return [];
  const istek = `${urlAdres}/rest/v1/companies?select=slug`;
  const yanit = await fetch(istek, {
    headers: { apikey: anahtar, Authorization: `Bearer ${anahtar}` },
  });
  if (!yanit.ok) {
    console.log(`  şirket slugları alınamadı: HTTP ${yanit.status}`);
    return [];
  }
  const veri = await yanit.json();
  return veri.map((x) => x.slug).filter(Boolean);
}

/**
 * YALNIZCA ANONİM ANAHTAR — AYRIŞMA TANIM GEREĞİ İMKÂNSIZ OLSUN
 *
 * Burada `SUPABASE_SERVICE_ROLE_KEY || VITE_SUPABASE_ANON_KEY` yazıyordu
 * ve servis anahtarı RLS'i ATLIYOR. Sonuç: ön render, ziyaretçinin
 * çekemeyeceği bir kaydın sayfasını yazabiliyordu — statik HTML dolu,
 * hidrasyondan sonra "bulunamadı".
 *
 * Bu teorik bir risk değildi; ÖLÇÜLDÜ (15 Eylül 2026): `envOku`
 * `automation/.env` dosyasını da okuyor ve orada servis anahtarı VAR.
 * Yani yerel derleme RLS'i atlayıp üretimde çizilmeyecek sayfalar
 * üretiyordu — yerel çıktı üretimi temsil etmiyordu.
 *
 * Üretimde dağıtımı yapan iş (`cloudflare_production`) zaten yalnız
 * `VITE_SUPABASE_ANON_KEY` taşıyor; servis anahtarı orada iş düzeyinde
 * tanımlı değil. Bu değişiklik yereli üretime EŞİTLİYOR.
 *
 * Aynı gerekçe katalog tohumu için zaten yazılmıştı
 * (`katalogTohumuGetir`): herkese açık HTML'e giren şey, siteye giren
 * herhangi birinin görebileceği yanıtın aynısı olmalı.
 */
async function firsatlariGetir() {
  const urlAdres = envOku('SUPABASE_URL') || envOku('VITE_SUPABASE_URL');
  const anahtar = envOku('VITE_SUPABASE_ANON_KEY');
  if (!urlAdres || !anahtar) {
    console.log('  fırsatlar atlandı (anonim anahtar yok)');
    return [];
  }
  /*
    KATEGORİ VE TUTAR ALANLARI DA GEREKİYOR

    Seçim `opportunity_type` taşımıyordu ve kategori kapıları
    (/burslar, /yarismalar) bu yüzden BOŞ çiziliyordu:
    `firsatKategorisi(undefined)` bilinmeyen türü 'programlar'a
    düşürüyor, yani hiçbir kayıt 'burslar' süzgecine uymuyordu.
    Ölçüldü — /firsatlar 113 bağlantı alırken /burslar sıfır aldı.

    `amount_status` + `amount_text`: tutar YALNIZ kesin olduğunda
    yazılıyor (113 kaydın 1'i), o yüzden ikisi de gerekli.
  */
  const secim =
    'slug,title,organization_name,short_description,application_deadline,updated_at,status,' +
    /*
      `countries`: /yurtdisi-firsatlari kapısının bölge süzgeci bu alanı
      okuyor (`yurtDisiFirsatMi`). Taşınmadığında süzgeç hiçbir kaydı
      geçirmiyor ve sayfa boş çiziliyor — `opportunity_type` ile birebir
      aynı hata, iki kez yaşandı.
    */
    /*
      `description` ve `eligibility` 19 EYLÜL 2026'DA EKLENDİ. Ölçüldü:
      fırsat sayfalarının görünür metni ortanca 30 kelimeydi — site
      genelindeki en ince yüzey. Sebebin bir kısmı buydu: kayıtların
      %9'unda ayrıntılı açıklama ve uygunluk koşulu YAZILI olduğu hâlde
      ön render yalnız `short_description`i çekiyordu. Geri kalan %91'de
      gösterilecek fazladan bir şey yok; onların çözümü aşağıda,
      site haritası kuralında.
    */
    'description,eligibility,' +
    'opportunity_type,amount_status,amount_text,countries';
  /*
    `expired` DE ÇEKİLİYOR — SAYFASI DURUYOR

    Süresi dolan fırsatın sayfası silinmiyor (bkz. detay döngüsündeki
    açıklama): adres 200 dönmeye devam ediyor, görünür metninde
    kapandığı yazıyor, yalnız site haritasından düşüyor. Bu, `/ilan/`
    ailesinde zaten uygulanan kural.

    Satır güvenliği de aynı kümeyi okutuyor: politika
    `status='published' ... OR status='expired'`. Yani burada çekilen
    küme, tarayıcının da okuyabildiği kümeyle örtüşüyor; statik HTML'de
    olup hidrasyonda kaybolan sayfa üretmiyoruz.
  */
  const istek = `${urlAdres}/rest/v1/opportunities?status=in.(published,expired)&select=${encodeURIComponent(secim)}`;
  const yanit = await fetch(istek, { headers: { apikey: anahtar, Authorization: `Bearer ${anahtar}` } });
  if (!yanit.ok) { console.log(`  fırsatlar alınamadı: HTTP ${yanit.status}`); return []; }
  return yanit.json();
}

/* --------------------------------------------------------------- HTML üretimi */

/*
  KABUK HER ZAMAN BOŞ KÖKLE BAŞLAR.

  Kabuk dist/index.html'den okunuyor ama bu betik ana sayfayı da AYNI
  dosyaya yazıyor. Yani ikinci kez `vite build` olmadan çalıştırıldığında
  kökün içi doluydu, `<div id="root"></div>` kalıbı eşleşmiyordu ve her
  sayfa sessizce ANA SAYFANIN gövdesini alıyordu.

  Ölçüldü: on rehberin onunda da görünür metin 217 karakter ve birebir
  aynıydı; SSS bölümü hiçbirine basılmamıştı. Yapısal veride soru vardı,
  sayfada yoktu — tam da kaçındığımız durum.

  Çözüm: kabuğu okur okumaz kökü boşalt. Böylece betik kaç kez çalışırsa
  çalışsın aynı çıktıyı üretiyor.
*/
const hamKabuk = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

/*
  AÇILIŞ İSKELETİNİ SAKLA

  #root boşaltılırken index.html'deki açılış iskeleti de siliniyordu ve ön
  render edilen sayfalar iskeletsiz kalıyordu — yani FOUC düzeltmesi
  yalnızca ön render EDİLMEYEN adreslerde çalışıyordu, ki asıl sorun tam da
  ön render edilenlerdeydi.

  İskelet burada bir kez yakalanıp her sayfaya geri konuyor. Kaynağı hâlâ
  index.html: iki yerde ayrı ayrı yazılsaydı biri değiştiğinde öteki
  sessizce eskiyecekti.
*/
const iskeletEsles = hamKabuk.match(
  /<div id="acilis-iskeleti"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/
);
const ACILIS_ISKELETI = iskeletEsles ? iskeletEsles[0] : '';
if (!ACILIS_ISKELETI) {
  console.error('ön render DURDU: index.html içinde açılış iskeleti bulunamadı.');
  process.exit(1);
}

/*
  STİL ETİKETİNİ SCRIPT'İN ÖNÜNE AL

  Vite `<script type="module">` etiketini `<link rel="stylesheet">`
  etiketinden ÖNCE yazıyor. Tarayıcı etiketleri sırayla görüyor; script
  önce geldiğinde stil dosyasının indirilmesi de o kadar geç başlıyor.
  Aradaki boşlukta HTML çıplak çiziliyor — açılışta görülen yazı bundandı.

  Etiketleri yer değiştirmek davranışı değiştirmiyor, yalnızca stil
  isteğini öne alıyor. Vite'ın çıktısına elle dokunmak yerine burada
  yapılıyor: derleyicinin sırası sürüm sürüm değişebilir, bu düzeltme
  değişse de çalışır.
*/
function stiliOneAl(html) {
  const stiller = html.match(/[ \t]*<link rel="stylesheet"[^>]*>\n?/g);
  if (!stiller) return html;
  let sonuc = html;
  for (const stil of stiller) sonuc = sonuc.replace(stil, '');
  return sonuc.replace(
    /([ \t]*)<script type="module"/,
    (_, girinti) => stiller.map((s) => s.trimStart()).map((s) => girinti + s).join('') + girinti + '<script type="module"'
  );
}

const kabuk = stiliOneAl(
  hamKabuk.replace(/<div id="root">[\s\S]*?<\/div>(?=\s*<\/body>)/, '<div id="root"></div>')
);

// Boşaltma tutmadıysa devam etmek, yanlış gövdeli 200'den fazla sayfa yazmak demek.
if (!/<div id="root">\s*<\/div>/.test(kabuk)) {
  console.error('ön render DURDU: dist/index.html içindeki #root boşaltılamadı.');
  process.exit(1);
}

/**
 * Tek bir sayfanın HTML'ini yazar.
 *
 * @param {string} yol       "/bolum/mimarlik" gibi
 * @param {object} s         { baslik, aciklama, govde, jsonLd }
 */
/*
  KIRINTI YOLU (BreadcrumbList)

  Adresten üretiliyor: /rehber/kyk-burs-ve-kredi -> Ana sayfa > Öğrenci
  rehberi > sayfanın başlığı. Google arama sonucunda çıplak adres yerine bu
  yolu gösteriyor ve sayfanın sitedeki yeri makineye anlaşılır oluyor.

  Elle yazılmıyor: 215 sayfa var ve elle yazılan bir kırıntı, adres
  değiştiğinde sessizce yanlış kalır.
*/
const KIRINTI_ADLARI = {
  rehber: 'Öğrenci rehberi',
  bolum: 'Bölümler',
  bolumler: 'Bölümler',
  ilan: 'Staj ilanları',
  firsatlar: 'Öğrenci fırsatları',
  sirket: 'Şirketler',
  araclar: 'Staj hesaplama araçları',
  isveren: 'İşverenler',
};

function kirintiYolu(yol, baslik) {
  const parcalar = yol.split('/').filter(Boolean);
  if (!parcalar.length) return null;

  const ogeler = [{ '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: SITE }];
  let birikim = '';
  parcalar.forEach((parca, i) => {
    birikim += '/' + parca;
    const sonuncu = i === parcalar.length - 1;
    ogeler.push({
      '@type': 'ListItem',
      position: i + 2,
      /* Son öğe sayfanın kendi başlığı; aradakiler bölüm adı. */
      name: sonuncu ? baslik.split('|')[0].trim() : KIRINTI_ADLARI[parca] || parca,
      item: SITE + birikim,
    });
  });
  return { '@type': 'BreadcrumbList', itemListElement: ogeler };
}

/*
  Var olan @graph'a kırıntı ekleniyor. Ayrı bir script bloğu açmak yerine
  tek grafikte durması, Google'ın ikisini aynı sayfanın verisi olarak
  okumasını kolaylaştırıyor.
*/
function yapisalVeri(yol, s) {
  const kirinti = kirintiYolu(yol, s.baslik);
  if (!kirinti) return s.jsonLd || null;
  const mevcut = s.jsonLd;
  if (mevcut && Array.isArray(mevcut['@graph'])) {
    return { ...mevcut, '@graph': [...mevcut['@graph'], kirinti] };
  }
  if (mevcut) return { '@context': 'https://schema.org', '@graph': [mevcut, kirinti] };
  return { '@context': 'https://schema.org', '@graph': [kirinti] };
}

/**
 * YAZILAN HER ADRES — site haritası uzlaştırması için.
 *
 * Bu betik hangi sayfaların GERÇEKTEN var olduğunu bilen tek yer; her
 * dağıtımda çalışıyor. Site haritası ayrı bir saatlik işten (automation/
 * sitemap.py) üretiliyor ve ölçüldü (12 Eylül 2026): canlı sitemap.xml
 * 5 Eylül'de donmuştu — 159 ilan sayfası varken haritada 62, 160 şirket
 * sayfası varken 93 adres yazıyordu.
 *
 * Liste aşağıda `siteHaritasiniUzlastir` tarafından kullanılıyor.
 */
const YAZILAN_ADRESLER = new Set();

function sayfaYaz(yol, s) {
  let html = kabuk;
  const tamAdres = SITE + yol;
  if (!s.dizinDisi) YAZILAN_ADRESLER.add(yol);

  /*
    Dizine girmemesi gereken sayfalar (404 gibi) için robots etiketi.
    Sunucu doğru kodu döndürse bile bir tarayıcı sayfayı içeriğiyle
    değerlendirebiliyor; ikisi birden söylenince tereddüt kalmıyor.
  */
  if (s.dizinDisi) {
    html = html.replace(
      '</head>',
      '  <meta name="robots" content="noindex, follow" />\n  </head>'
    );
  }

  // <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${kacir(s.baslik)}</title>`);

  // description + Open Graph
  html = html.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${kacir(s.aciklama)}" />`
  );
  html = html.replace(
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${kacir(s.baslik)}" />`
  );
  html = html.replace(
    /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${kacir(s.aciklama)}" />`
  );

  /*
    SAYFAYA ÖZEL PAYLAŞIM GÖRSELİ

    Bütün site tek bir genel kartı paylaşıyordu: bir rehber, bir ilan ya da
    bir burs paylaşıldığında WhatsApp ve Twitter'da hep aynı görsel
    çıkıyordu ve paylaşılan şeyin ne olduğu karttan anlaşılmıyordu.

    Görsel yoksa index.html'deki genel kart yerinde kalıyor — yani bu blok
    yalnızca ekliyor, hiçbir şeyi bozmuyor.
  */
  if (s.gorsel) {
    const tamGorsel = SITE + s.gorsel;
    html = html
      .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${tamGorsel}" />`)
      .replace(
        /<meta property="og:image:alt"[^>]*>/,
        `<meta property="og:image:alt" content="${kacir(s.baslik)}" />`
      );
  }

  /*
    CANONICAL VARSA DEĞİŞTİRİLİYOR, EKLENMİYOR.

    Bu blok "canonical hiç yoktu" varsayımıyla yazılmıştı ve yalnızca
    ekliyordu. Kabuğa (index.html) sonradan bir canonical girince her ön
    render edilmiş sayfada İKİ canonical oluştu: biri kök adresi, biri
    sayfanın kendisi. Ölçüldü — ilan, burs ve içerik sayfalarının hepsinde
    ikisi birden vardı. Çelişen iki canonical arama motoruna hangi adresin
    asıl olduğunu söylemiyor; bu bir SEO kazancı değil, kayıp.
  */
  const canonicalEtiketi = `<link rel="canonical" href="${tamAdres}" />`;
  const ogUrlEtiketi = `<meta property="og:url" content="${tamAdres}" />`;
  html = /<link[^>]+rel="canonical"[^>]*>/.test(html)
    ? html.replace(/<link[^>]+rel="canonical"[^>]*>/, canonicalEtiketi)
    : html.replace('</head>', `  ${canonicalEtiketi}\n  </head>`);
  html = /<meta[^>]+property="og:url"[^>]*>/.test(html)
    ? html.replace(/<meta[^>]+property="og:url"[^>]*>/, ogUrlEtiketi)
    : html.replace('</head>', `  ${ogUrlEtiketi}\n  </head>`);

  html = html.replace(
    '</head>',
    (() => {
        const veri = yapisalVeri(yol, s);
        return veri
          ? `    <script type="application/ld+json">${JSON.stringify(veri)}</script>\n`
          : '';
      })() +
      '  </head>'
  );

  /*
    #root İÇİNE: AÇILIŞ İSKELETİ + ÖN RENDER METNİ

    Sıra önemli. İskelet ÖNCE geliyor ve görünür olan o: tarayıcı CSS
    beklemeden onu çiziyor, beyaz ekran oluşmuyor.

    Ön render metni SONRA ve `data-seo-prerender` ile işaretli;
    index.html'deki satır içi stil onu JS açıkken gizliyor. Sebebi FOUC:
    tarayıcı bu metni dış CSS gelmeden çiziyordu ve soğuk yenilemede çıplak
    yazı bir an ekranda kalıyordu.

    Arama motoru için hiçbir şey değişmiyor: metin HTML'de duruyor,
    `display:none` içeriği kaldırmıyor ve JS kapalıyken noscript onu geri
    açıyor.

    İkisi de #root'un içinde; React ilk çizimde ikisini birden değiştiriyor.
  */
  /*
    İSKELET YALNIZ VERİ YOKKEN.

    `gorunurGovde` verilmişse ekranda gösterilecek gerçek içerik zaten
    var; üstüne bir de nabız atan gri kutular koymak, kullanıcıya önce
    "yükleniyor" deyip sonra aynı yere içeriği basmak olurdu.
  */
  const gorunur = s.gorunurGovde
    ? `<div data-onrender-govde>${s.gorunurGovde}</div>`
    : ACILIS_ISKELETI;

  /*
    Gizli blok BOŞSA hiç yazılmıyor. Anasayfada artık gizli ilan listesi
    yok (hepsi görünür kartlarda ve site haritasında); boş bir
    `display:none` kabı bırakmak, okuyan birine hâlâ saklanan bir şey
    olduğunu düşündürürdü.
  */
  const gizli = s.govde ? `<div data-seo-prerender>${s.govde}</div>` : '';

  html = html.replace('<div id="root"></div>', `<div id="root">${gorunur}${gizli}</div>`);

  /*
    AÇILIŞ TOHUMU.

    İlk ilan sayfası HTML'in içinde geliyor; istemci aynı veriyi bir
    daha beklemeden ekrana basıyor (bkz. src/lib/ilk-katalog.ts).
    `</script>` dizisi kaçırılıyor: veri içinde geçerse etiketi erken
    kapatıp sayfayı kırardı.
  */
  if (s.tohum) {
    const govde = JSON.stringify(s.tohum).replace(/<\/(script)/gi, '<\\/$1');
    html = html.replace(
      '</body>',
      `  <script type="application/json" id="ilk-katalog">${govde}</script>
  </body>`
    );
  }

  /*
    DOSYA ADI: <yol>.html — <yol>/index.html DEĞİL.

    Önce dizin + index.html olarak yazılıyordu. Cloudflare Pages bu durumda
    "/bolum/mimarlik" isteğini "/bolum/mimarlik/" adresine 308 ile
    yönlendiriyor (ölçüldü). Ama site haritamız ve canonical etiketimiz
    eğik çizgisiz sürümü gösteriyor; yani tarayıcıya "asıl adres bu" deyip
    o adreste yönlendirme veriyorduk. Bu çelişki taramayı zayıflatıyor.

    Uzantılı dosya yazılınca Pages "/bolum/mimarlik" isteğine doğrudan 200
    dönüyor, yönlendirme olmuyor. Kök sayfa istisna: o index.html kalmalı.
  */
  if (s.dosya) {
    fs.writeFileSync(path.join(dist, s.dosya), html, 'utf8');
  } else if (yol === '/') {
    fs.writeFileSync(path.join(dist, 'index.html'), html, 'utf8');
  } else {
    const hedef = path.join(dist, yol.replace(/^\//, '') + '.html');
    fs.mkdirSync(path.dirname(hedef), { recursive: true });
    fs.writeFileSync(hedef, html, 'utf8');
  }
}

/** Ön render gövdesi: başlık + özet + isteğe bağlı ek satırlar. */
/*
  `bolumler` DÖRDÜNCÜ PARAMETRE OLARAK EKLENDİ (19 Eylül 2026).

  Gövde bugüne kadar tek paragraf + tek liste çiziyordu. İlan sayfasının
  elinde bundan fazlası var — sorumluluklar ve aranan nitelikler ayrı
  ayrı yazılmış listeler — ve bunları tek bir `<ul>`e katmak iki farklı
  şeyi aynı şeymiş gibi gösterirdi. Her bölüm kendi `<h2>`si ile
  çiziliyor; boş bölüm hiç çizilmiyor, yani "Aranan nitelikler" başlığı
  altında boş liste kalmıyor.
*/
function govde(baslik, ozet, satirlar = [], bolumler = []) {
  return (
    `<main><h1>${kacir(baslik)}</h1><p>${kacir(ozet)}</p>` +
    (satirlar.length ? `<ul>${satirlar.map((x) => `<li>${kacir(x)}</li>`).join('')}</ul>` : '') +
    bolumler
      .filter((b) => b && Array.isArray(b.maddeler) && b.maddeler.length)
      .map(
        (b) =>
          `<h2>${kacir(b.baslik)}</h2><ul>${b.maddeler
            .map((m) => `<li>${kacir(m)}</li>`)
            .join('')}</ul>`
      )
      .join('') +
    '</main>'
  );
}

/* --------------------------------------------------------------------- akış */

/*
  ÜRETİLEN PAKETİ SINA

  vite.config.ts derleme başlarken anahtarların varlığını kontrol ediyor.
  Bu ikinci kontrol çıktının KENDİSİNE bakıyor: paketin içinde Supabase
  adresi gerçekten var mı?

  İki kontrol farklı şeyleri yakalıyor. Birincisi "derlerken anahtar var
  mıydı", ikincisi "pakete gerçekten girdi mi". Ölçülen olay ikinci
  soruydu: paket üretildi, dağıtıldı ve uygulama açılışta çöktü — sunucu
  200 döndüğü için hiçbir şey uyarmadı.
*/
function paketiDogrula() {
  const varliklar = path.join(dist, 'assets');
  if (!fs.existsSync(varliklar)) return;

  const dosyalar = fs.readdirSync(varliklar).filter((d) => d.endsWith('.js'));
  const bulundu = dosyalar.some((d) =>
    /https:\/\/[a-z0-9]+\.supabase\.co/.test(fs.readFileSync(path.join(varliklar, d), 'utf8'))
  );
  if (bulundu) return;

  console.error(
    [
      'ön render DURDU: derlenen pakette Supabase adresi yok.',
      'Bu paket dağıtılırsa uygulama açılışta çöker ve site açılmaz.',
      'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY olmadan derlenmiş olabilir;',
      'bir git worktree içindeysen .env orada yoktur.',
    ].join('\n')
  );
  process.exit(1);
}

async function main() {
  await eslemeyiYukle();
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.error('dist/index.html yok — önce `vite build` çalışmalı');
    process.exit(1);
  }

  paketiDogrula();

  let sayac = 0;

  /* ---- bölümler ---- */
  const bolumHaritasi = await bolumleriCiz();
  const bolumler = Object.values(bolumHaritasi);
  for (const b of bolumler) {
    const sorular = b.sss || [];

    const bolumGrafik = [
      {
        '@type': 'Article',
        headline: `${b.ad} stajı`,
        description: ozetle(b.aciklama || b.ozet),
        inLanguage: 'tr-TR',
        ...(b.guncelleme ? { dateModified: b.guncelleme } : {}),
        author: { '@type': 'Organization', name: 'StajımVar', url: SITE },
        publisher: {
          '@type': 'Organization',
          name: 'StajımVar',
          logo: { '@type': 'ImageObject', url: `${SITE}/icon-512.png` },
        },
        mainEntityOfPage: `${SITE}/bolum/${b.slug}`,
      },
    ];
    if (sorular.length > 0) {
      bolumGrafik.push({
        '@type': 'FAQPage',
        mainEntity: sorular.map((s) => ({
          '@type': 'Question',
          name: s.soru,
          acceptedAnswer: { '@type': 'Answer', text: baglantiyiSadelestir(s.cevap) },
        })),
      });
    }

    sayfaYaz(`/bolum/${b.slug}`, {
      baslik: `${b.ad} stajı | StajımVar`,
      aciklama: ozetle(b.aciklama || b.ozet),
      // Gövde = başlık + BolumIcerik'in çizilmiş hâli (kullanıcının gördüğünün aynısı).
      govde: `<main><h1>${kacir(b.ad)} stajı</h1>${b.cizim}</main>`,
      jsonLd: { '@context': 'https://schema.org', '@graph': bolumGrafik },
    });
    sayac++;
  }

  /*
    ---- rehberler ----

    Alanlar artık düzenli ifadeyle değil, kaydın kendisinden okunuyor:
    rehberleriCiz() dosyayı derleyip gerçek nesneyi döndürüyor. Böylece
    "bu alan kaç karakter içeride kaldı" sınıfından hatalar tanım gereği
    ortadan kalkıyor.
  */
  const merkezListeleri = await merkezListeleriniCiz();
  const cizilen = await rehberleriCiz();
  const rehberler = Object.entries(cizilen).map(([slug, r]) => ({ slug, ...r }));
  for (const r of rehberler) {
    const sorular = r.sss;

    /*
      Article + FAQPage.

      FAQPage yalnizca sayfada GERCEKTEN gorunen sorular icin uretiliyor
      (GuidePages.tsx ayni listeyi ciziyor). Yapisal veride olup sayfada
      olmayan icerik Google'in kurallarina aykiri ve elle ceza sebebi.
    */
    const grafik = [
      {
        '@type': 'Article',
        headline: r.baslik,
        description: ozetle(r.aciklama || r.ozet),
        inLanguage: 'tr-TR',
        ...(r.guncelleme ? { dateModified: r.guncelleme } : {}),
        /*
          YAZAR ADI EKRANDAKİYLE BİREBİR AYNI.

          Burada 'StajımVar' yazıyordu ama görünür künye 'StajımVar
          Editör Ekibi' diyor. Yapısal veride olup ekranda olmayan (ya
          da ekranda başka türlü görünen) bilgi Google'ın kurallarına
          aykırı. Değer artık künyeyi üreten modülden geliyor, yani
          ikisi ayrışamaz.

          Tür yine `Organization`: rehberleri tek bir gerçek kişi
          yazmıyor ve olmayan bir yazar adı uydurmak yanlış beyan olur.
        */
        author: { '@type': 'Organization', name: YAZAR, url: SITE },
        publisher: {
          '@type': 'Organization',
          name: 'StajımVar',
          logo: { '@type': 'ImageObject', url: `${SITE}/icon-512.png` },
        },
        mainEntityOfPage: `${SITE}/rehber/${r.slug}`,
      },
    ];
    if (sorular.length > 0) {
      grafik.push({
        '@type': 'FAQPage',
        mainEntity: sorular.map((s) => ({
          '@type': 'Question',
          name: s.soru,
          acceptedAnswer: { '@type': 'Answer', text: baglantiyiSadelestir(s.cevap) },
        })),
      });
    }

    await kartYaz(`rehber-${r.slug}`, {
      tur: 'rehber',
      etiket: 'ÖĞRENCİ REHBERİ',
      baslik: r.baslik,
      altMetin: r.ozet || '',
    });

    sayfaYaz(`/rehber/${r.slug}`, {
      gorsel: `/og/rehber-${r.slug}.png`,
      /*
        <title> H1'DEN AYRILABİLİYOR

        Arama sonucunda görünen başlıkta kurum adlarının geçmesi işe
        yarıyor; sayfadaki H1'i aynı listeyle uzatmak ise sayfayı
        bozuyor. `seoBaslik` yazılmamışsa hiçbir şey değişmiyor.
      */
      baslik: `${r.seoBaslik || r.baslik} | StajımVar`,
      aciklama: ozetle(r.aciklama || r.ozet),
      /*
        Gövde = başlık + rehberin ÇİZİLMİŞ tam içeriği + sık sorulanlar.

        r.govde, React'in aynı bileşenlerden ürettiği HTML — yani kullanıcının
        gördüğü metnin birebir aynısı. Elle özetlenmiş bir sürüm olsaydı iki
        metin zamanla birbirinden ayrılır ve fark gizlemeye dönerdi.
      */
      govde:
        `<main><h1>${kacir(r.baslik)}</h1><p>${kacir(r.ozet || '')}</p>` +
        /*
          HIZLI CEVAP ÖN RENDER'A DA GİRİYOR

          Sayfanın en doğrudan cevabı bu iki cümle; yalnızca tarayıcıda
          çizilseydi arama motoru onu hiç görmezdi. Sayfada görünen metin
          ile statik HTML'in aynı şeyi söylemesi ayrıca bir kural: yapısal
          veride ya da HTML'de olup ekranda olmayan içerik ceza sebebi.
        */
        (r.hizliCevap ? `<p><strong>${kacirBagla(r.hizliCevap)}</strong></p>` : '') +
        r.govde +
        (sorular.length
          ? `<section><h2>Sık sorulanlar</h2>${sorular
              .map((s) => `<h3>${kacir(s.soru)}</h3><p>${kacirBagla(s.cevap)}</p>`)
              .join('')}</section>`
          : '') +
        /* Resmî kaynaklar dış bağlantı: nofollow değil, gerçekten kaynak. */
        /*
          Kaynak satırı artık kurumu ve hangi cümleyi desteklediğini de
          taşıyor: statik HTML ile ekranda görünen metin aynı olmalı.
        */
        /*
          BURADAN DEVAM ET — ÖN RENDER'A DA GİRİYOR

          Bu bağlantılar yalnız tarayıcıda çiziliyordu; sunucudan gelen
          HTML'de yoktular, yani arama motoru rehberden ürüne giden yolu
          hiç görmüyordu. Kaynak uygulamayla aynı eşleme, dolayısıyla
          ekrandaki metin ile statik HTML aynı şeyi söylüyor.
        */
        ((() => {
          const eylemler = rehberEylemleri(r.slug);
          return eylemler.length
            ? `<section><h2>Buradan devam et</h2><ul>${eylemler
                .map((e) => `<li><a href="${e.yol}">${kacir(e.baslik)}</a> — ${kacir(e.aciklama)}</li>`)
                .join('')}</ul></section>`
            : '';
        })()) +
        (Array.isArray(r.kaynaklar) && r.kaynaklar.length
          ? `<section><h2>Resmî kaynaklar</h2><ul>${r.kaynaklar
              .map(
                (k) =>
                  `<li><a href="${kacir(k.adres)}" target="_blank" rel="noopener noreferrer">${kacir(k.etiket)}</a>` +
                  (k.kurum ? ` — ${kacir(k.kurum)}` : '') +
                  (k.destekledigi ? `<br/>Neyi doğruluyor: ${kacir(k.destekledigi)}` : '') +
                  '</li>'
              )
              .join('')}</ul></section>`
          : '') +
        /*
          KÜNYE ÖN RENDER'A GİRİYOR — EKRANDAKİYLE AYNI KAYNAKTAN

          Buradaki alanlar `src/lib/rehber-kunye.mjs` tarafından
          hesaplanıyor ve `GuidePages.tsx` aynı işlevi çağırıyor. İki
          yerde ayrı ayrı yazılsaydı zamanla ayrışırlardı — "dayanak"
          bölümünün ön render'da hiç olmaması tam olarak böyle oluştu.

          Yazar KURUM: rehberleri tek bir gerçek kişi yazmıyor ve
          olmayan bir yazar adı uydurmak yanlış beyan olurdu. JSON-LD
          de aynı kurumu gösteriyor.
        */
        ((() => {
          const k = kunye(r);
          const parcalar = [];
          if (k.dayanak) {
            parcalar.push(
              `<section><h2>Bu rehber neye dayanıyor</h2><p>${kacir(k.dayanak)}</p></section>`
            );
          }
          parcalar.push(
            '<section><h2>Künye</h2><ul>' +
              `<li>Hazırlayan: ${kacir(k.yazar)}</li>` +
              (k.tarih ? `<li>Son güncelleme: ${kacir(k.tarih)}</li>` : '') +
              `<li><a href="${k.bildirimYolu}">Hatalı bilgi bildir</a></li>` +
              '</ul></section>'
          );
          return parcalar.join('');
        })()) +
        /* Sıradaki adım bir İÇ bağlantı: rehberden ürüne sinyal taşıyor. */
        (r.sonrakiAdim
          ? `<p><a href="${kacir(r.sonrakiAdim.yol)}">${kacir(r.sonrakiAdim.etiket)}</a></p>`
          : '') +
        merkezListeleri.rehberBaglantilari(r.slug, r.kategori) +
        '</main>',
      jsonLd: { '@context': 'https://schema.org', '@graph': grafik },
    });
    sayac++;
  }

  /* ---- kurumsal ve yasal sayfalar ---- */
  const yasalCizimler = await yasalSayfalariCiz();
  for (const [yol, cizim] of Object.entries(yasalCizimler)) {
    const bilgi = YASAL_BILGI[yol];
    if (!bilgi) {
      /*
        Yeni bir yasal sayfa eklenip başlığı yazılmazsa sessizce genel
        başlıkla yayımlanmasın: aynı <title> taşıyan iki sayfa, tarayıcı
        için ikisini de zayıflatıyor.
      */
      console.error(`ön render DURDU: ${yol} için başlık ve açıklama tanımlı değil.`);
      process.exit(1);
    }
    sayfaYaz(yol, { baslik: bilgi[0], aciklama: bilgi[1], govde: cizim });
    sayac++;
  }

  /* ---- sabit sayfalar ---- */
  /*
    DÖRDÜNCÜ ALAN: ÖN RENDER KABUĞUNUN <h1>'İ

    Bu, tarayıcının ve ilk boyamanın gördüğü başlık; React yüklenince
    uygulamanın kendi h1'i onun yerine geçiyor. İkisi farklı şey
    söylediğinde aynı sayfanın iki başlığı oluyor ve indekslenen, kullanıcının
    gördüğü değil.

    Dört ana sekme aynı cümleyi kuruyor ("<ne var>, tek listede."); burada da
    birebir aynısı yazılı. Ana sayfada zaten öyleydi, diğer üçü ayrı
    düşmüştü: "Öğrenci Fırsatları", "Öğrenci Rotası", "Öğrencilik, işini
    bilene kolay."

    <title> alanları KASITLI olarak farklı: onlar arama sonucunda görünüyor
    ve anahtar kelimeyle başlıyor. Başlık cümlesi sayfanın kendini tanıtma
    biçimi, title ise arama sonucundaki adı — ikisinin aynı olması gerekmiyor.
  */
  /*
    FIRSATLAR SABİTLERDEN ÖNCE ÇEKİLİYOR

    /firsatlar, /burslar, /kyk, /yurtdisi-firsatlari ve /yarismalar
    sayfalarının gövdesi bu veriyle yazılıyor ve o sayfalar aşağıdaki
    `sabitler` döngüsünde basılıyor. Ölçüldü (canlı, 14 Eylül 2026):
    /burslar'ın ilk HTML'inde 69 karakter metin ve SIFIR bağlantı vardı;
    /firsatlar'da 88 karakter, sıfır bağlantı. Yani 113 fırsat sayfasının
    tarama kapısı bomboştu — tarayıcı oradan tek bir fırsata bile
    geçemiyordu.
  */
  const firsatlar = await firsatlariGetir();
  const { firsatKategorisi, yurtDisiFirsatMi, firsatDurumu } = await icerikDerle(
    path.join(kok, 'src', 'lib', 'firsat-kategori.mjs'),
    'firsat-kategori'
  );

  /**
   * SÜRESİ GEÇTİ Mİ? — ARAYÜZLE AYNI FONKSİYONDAN
   *
   * Burada kendi eşiği olan bir predicate vardı:
   *
   *   !(deadline && new Date(deadline).getTime() < Date.now())
   *
   * Bu bir DAMGA karşılaştırmasıydı; arayüz ise `firsatDurumu` ile
   * TÜRKİYE TAKVİM GÜNÜ karşılaştırıyor (`calendarDay`,
   * Europe/Istanbul). İkisi son başvuru gününde ayrışıyordu:
   *
   *   Tarihler 00:00 UTC olarak saklanıyor. "Son başvuru 15 Eylül"
   *   Türkçede 15 Eylül DAHİL demek; damga karşılaştırması ise kaydı
   *   15 Eylül saat 03:00 TRT'de kapanmış sayıyordu — kendi son
   *   gününün sabahında, bir gün erken.
   *
   * ÖLÇÜLDÜ (canlı, 15 Eylül 2026): son başvurusu "geçmiş" görünen 10
   * kaydın 8'inin tarihi O GÜNDÜ ve Türkiye gününe göre HÂLÂ AÇIKTI.
   * Sekizinin de sayfası üretilmiyordu; biri (btso-yuksekogrenim-bursu)
   * arama sonuçlarında gösterim alırken canlıda HTTP 404 dönüyordu.
   *
   * Bu, deponun iki kez düzelttiği hatanın aynısı: kural arayüzde bir,
   * ön render'da bir daha yazılmıştı (`firsatKategorisi` ve
   * `yurtDisiFirsatMi` de böyle ayrışmıştı). Kural artık TEK YERDE.
   */
  const firsatSuresiGectiMi = (f) =>
    firsatDurumu(f.status, f.application_deadline) === 'expired';

  /**
   * DETAY SAYFASININ <title> METNİ — KURUM ADINI İKİ KEZ YAZMIYOR
   *
   * Şablon `${title} — ${organization_name} | StajımVar` idi ve kayıtların
   * çoğunda başlık kurumun adını ZATEN taşıyor. Ölçüldü (canlı,
   * 15 Eylül 2026): yayındaki 112 kaydın **47'sinde** kurum adı başlığın
   * içinde geçiyor, yani ek tamamen tekrar:
   *
   *   "Erciyes Organ Nakli Vakfı Bursu — Erciyes Organ Nakli Vakfı | StajımVar"
   *
   * Aynı ölçümde 112 başlığın **71'i 60 karakteri aşıyor** (ortalama 65),
   * yani arama sonucunda kırpılıyor. Tekrarı atmak, kırpılan yerde
   * ayırt edici bilgiye yer açıyor.
   *
   * Kurum adı başlıkta GEÇMİYORSA ek korunuyor: orada gerçekten yeni
   * bilgi taşıyor (65 kayıt bu durumda).
   *
   * Karşılaştırma Türkçe küçük harfle: "İ" ile "i" ayrımı yapılmazsa
   * "İhsan Arslan Vakfı" gibi kayıtlarda tekrar yakalanamazdı.
   */
  const firsatBasligi = (f) => {
    const kurum = (f.organization_name || '').trim();
    if (!kurum) return f.title;
    const kucuk = (s) => s.toLocaleLowerCase('tr-TR');
    return kucuk(f.title).includes(kucuk(kurum)) ? f.title : `${f.title} — ${kurum}`;
  };

  /**
   * Bir kategorinin fırsat listesi — GERÇEK KAYITLAR, UYDURMA YOK.
   *
   * Satırda yalnız veritabanında DOLU olan alanlar yazılıyor:
   *
   *   son başvuru tarihi   113 kaydın 30'unda dolu; boş olanda
   *                        "Takvim açıklanmadı" yazıyor. Tarih
   *                        uydurmak, öğrenciyi olmayan bir son güne
   *                        göre plan yaptırmak olurdu.
   *   tutar                yalnız `amount_status = 'kesin'` ve
   *                        `amount_text` dolu olduğunda. 113 kaydın
   *                        yalnız 1'i bu durumda.
   *
   * "KARŞILIKSIZ" DİYE BİR ETİKET YOK: `repayable` alanı 113 kaydın
   * 104'ünde NULL. Doğrulanmamış bir sınıflandırmayı yazmak, öğrenciye
   * geri ödemesiz sandığı bir krediyi önermek olabilirdi.
   */
  const firsatListesi = (kategori, tur = null, bolge = null) => {
    const kayitlar = firsatlar
      /*
        KAPI LİSTELERİ YALNIZ AÇIK KAYITLARI TAŞIYOR

        Süresi geçmiş kaydın sayfası artık DURUYOR (aşağıdaki detay
        döngüsü onu da yazıyor), ama kategori kapısı "şu an
        başvurabileceğin fırsatlar" vaadi taşıyor. Kapanmış kaydı o
        listeye koymak, okuyucuyu kapanmış bir başvuruya yönlendirmek
        olurdu. Süzgeç arayüzle aynı fonksiyondan.
      */
      .filter((f) => !firsatSuresiGectiMi(f))
      /*
        BÖLGE SÜZGECİ /yurtdisi-firsatlari İÇİN

        Ölçüt arayüzle AYNI fonksiyondan (`yurtDisiFirsatMi`): ülke
        alanında Türkiye dışı bir ülke var mı. "Ülke alanı boş =
        Türkiye" bir varsayım olurdu; boş alanlı kayıt yurt dışı
        tarafına KOYULMUYOR, hakkında bir iddia da taşınmıyor.
      */
      .filter((f) => (bolge === 'yurtdisi' ? yurtDisiFirsatMi(f) : true))
      .filter((f) => (kategori ? firsatKategorisi(f.opportunity_type) === kategori : true))
      /*
        TÜR SÜZGECİ /kyk İÇİN: o sayfa "burslar" kategorisinin içinde
        yalnız KYK kaynağını gösteriyor ve arayüz de aynı şeyi yapıyor
        (`burslar.filter((item) => item.opportunityType === 'kyk')`).
        Aynı kural, iki yerde ayrı yazılmasın diye burada da tür
        karşılaştırması.
      */
      .filter((f) => (tur ? f.opportunity_type === tur : true))
      .filter((f) => (f.short_description || '').trim())
      .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'tr'));
    if (!kayitlar.length) return '';

    const satirlar = kayitlar
      .map((f) => {
        const notlar = [];
        if (f.organization_name) notlar.push(kacir(f.organization_name));
        /*
          BOŞ TARİH, "KURUM AÇIKLAMADI" DEMEK DEĞİL

          Önce boş `application_deadline` için "Takvim açıklanmadı"
          yazıyordu. O bir ÇIKARIM: alan boşsa kurumun takvimi
          açıklamadığı sonucu çıkmaz — kayıt henüz derlenmemiş,
          kaynak okunamamış ya da tarih başka bir alanda olabilir.
          Doğrulanmamış bir olumsuzlamayı kuruma atfetmek, öğrenciye
          "beklemeye gerek yok" demek olurdu.

          Tarih doluysa tarih yazılıyor; boşsa okuyucu resmî kaynağa
          gönderiliyor. Bu ikinci cümle bir iddia değil, bir yönlendirme.
        */
        /*
          TARİH HAM DİZEDEN OKUNUYOR, Date ARİTMETİĞİNDEN DEĞİL

          `application_deadline` saatsiz gelebiliyor ("2026-09-14") ve
          `new Date()` onu UTC gece yarısı sayıyor. Derleme UTC'nin
          BATISINDA koşsaydı `toLocaleDateString` bir gün ERKEN tarih
          yazardı — öğrenciye son günü yanlış söylemek. Aynı tuzak bu
          depoda daha önce ölçülmüş ve `firsat-kategori.mjs` içinde
          `calendarDay` ile çözülmüş.

          Ölçüldü (bu derleme): 27 tarihin 27'si ham değerle birebir
          aynı. Yine de biçimlendirme artık yıl-ay-gün parçalarından
          yapılıyor; ortam değişse de kaymıyor.
        */
        const AYLAR = [
          'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
          'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
        ];
        const gunAyYil = String(f.application_deadline || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        notlar.push(
          gunAyYil
            ? `Son başvuru: ${Number(gunAyYil[3])} ${AYLAR[Number(gunAyYil[2]) - 1]} ${gunAyYil[1]}`
            : 'Başvuru takvimi için resmî kaynağı kontrol edin'
        );
        if (f.amount_status === 'kesin' && (f.amount_text || '').trim()) {
          notlar.push(kacir(f.amount_text.trim()));
        }
        return (
          `<li><a href="/firsatlar/${kacir(f.slug)}">${kacir(f.title)}</a>` +
          ` — ${notlar.join(' · ')}<p>${kacir(ozetle(f.short_description, 160))}</p></li>`
        );
      })
      .join('');

    return `<section><h2>${kayitlar.length} kayıt</h2><ul>${satirlar}</ul></section>`;
  };

  const sabitler = [
    ['/rehber', 'Öğrenci rehberi | StajımVar', "Stajdan bursa, KYK'dan yurda; öğrencilikte ihtiyaç duyacağın bilgiler resmî kaynağıyla, adım adım.", 'Öğrenci rehberleri, tek listede.'],
    ['/bolumler', 'Bölüme göre staj rehberi | StajımVar', `${bolumler.length} bölüm için: staj nerede yapılır, stajyer ne iş yapar, ne öğrenmeli.`, 'Bölüme göre staj'],
    /*
      BAŞLIK STAJ ARAÇLARINI ÖNE ALIYOR

      Eski açıklama "Net hesaplama, YKS sıralama tahmini" ile başlıyordu:
      staj sitesinin araç sayfasını sınav sorgularına eşliyordu. Sıra
      düzeltildi; sınav araçları hâlâ sayfada ve açıklamada, ama sonda.
    */
    ['/araclar', 'Staj hesaplama araçları | StajımVar', 'Staj ücreti ve staj günü hesaplama; ayrıca net hesaplama ve YKS sıralama tahmini.', 'Staj hesaplama araçları'],
    ['/araclar/net-hesaplama', 'Net hesaplama (TYT, AYT, KPSS) | StajımVar', 'Doğru ve yanlış sayını gir, netini gör. TYT, AYT ve KPSS için.', 'Net hesaplama'],
    ['/araclar/siralama-tahmini', 'YKS sıralama tahmini | StajımVar', 'Puanın 2025 ÖSYM verilerine göre kaçıncı sıraya denk geliyor?', 'Sıralama tahmini'],
    ['/araclar/staj-ucreti-hesaplama', 'Staj ücreti hesaplama | StajımVar', '3308 sayılı kanuna göre stajyere en az ne kadar ödenmesi gerektiğini hesapla.', 'Staj ücreti hesaplama'],
    ['/araclar/staj-gunu-hesaplama', 'Staj günü hesaplama | StajımVar', '20 veya 30 iş günü staj hangi tarihte biter? Resmî tatiller düşülerek.', 'Staj günü hesaplama'],
    ['/isveren', 'Stajyer İlanı Ver | Ücretsiz Şirket Hesabı | StajımVar', 'Staj ilanınızı ücretsiz yayınlayın. Başvurular şirket panelinize düşer; adayın özgeçmişini görür, görüşmeye davet eder ve teklif gönderirsiniz.', 'Doğru stajyeri daha kolay bulun.'],
    /* Rehber kendi adresine taşındı; /isveren artık ürünün kapısı. */
    ['/stajyer-nasil-alinir', 'Stajyer nasıl alınır? İşveren rehberi | StajımVar', 'Sigorta kimde, ücret zorunlu mu, okulla hangi evrak imzalanır — sırayla.', 'Stajyer almak sandığınızdan kolay.'],
    ['/staj-programlari', 'Büyük işverenlerde staj başvurusu | StajımVar', 'Aselsan, TUSAŞ, Turkcell, Tüpraş ve diğerleri stajı kendi kariyer sayfasından alıyor. Doğrulanmış başvuru adresleri.', 'Büyük işverenlerde staj'],
    ['/isveren/ilan-ver', 'Stajyer ilanı ver | StajımVar', 'Staj ilanı yayınlamak ücretsiz. Şirket sayfanızı sahiplenin, ilanlarınızı kendiniz girin.', 'Stajyer ilanı ver'],
    ['/universite-kariyer-merkezleri', 'Üniversite kariyer merkezleri | StajımVar', 'Staj formu, sigorta yazısı ve onay imzası kendi okulundan çıkıyor. Kariyer merkezlerinin doğrulanmış adresleri.', 'Üniversite kariyer merkezleri'],
    ['/firsatlar', 'Fırsatlar | StajımVar', 'Bursları, öğrenci programlarını, yarışmaları ve kariyer etkinliklerini keşfet.', 'Fırsatlar'],
    /* /kesfet KALDIRILDI (11 Eylül 2026): bölüm kapandı, adres _redirects ile /firsatlar'a 301 alıyor. Statik sayfa yazılsaydı yönlendirmeyi gölgeleyebilirdi. */
    ['/burslar', 'Burs Fırsatları | StajımVar', 'Resmî kaynağı doğrulanmış burs fırsatlarını takip et.', 'Burs Fırsatları'],
    ['/kyk', 'KYK Duyuruları | StajımVar', 'KYK burs, kredi ve resmî duyurularını takip et.', 'KYK Duyuruları'],
    ['/yurtdisi-firsatlari', 'Yurtdışı Fırsatları | StajımVar', 'Yurtdışı eğitim, değişim ve hareketlilik fırsatlarını takip et.', 'Yurtdışı Fırsatları'],
    ['/yarismalar', 'Yarışmalar ve Hackathonlar | StajımVar', 'Resmî kaynaklı öğrenci yarışmalarını ve hackathonları takip et.', 'Yarışmalar ve Hackathonlar'],
    ['/firsat-takvimi', 'Fırsat Takvimi | StajımVar', 'Yaklaşan fırsat son başvuru tarihlerini takip et.', 'Fırsat Takvimi'],
  ];
  /*
    /rehber ve /bolumler'e listeleri de basılıyor: bu iki sayfa tarayıcının
    tek tek içerik sayfalarına geçtiği kapı. Listesiz hâlleri yalnızca
    başlık ve tek cümleden ibaretti ve hiçbir bağlantı taşımıyorlardı.
  */
  /*
    /isveren'in SSS'i hem GÖRÜNÜR metin hem FAQPage yapısal verisi olarak
    basılıyor. Kaynak tek: src/data/isveren-sss.ts. İkisini ayrı yazmak,
    arama motoruna sayfada olmayan bir cevap göstermek olurdu.
  */
  const { ISVEREN_SSS } = await icerikDerle(
    path.join(kok, 'src', 'data', 'isveren-sss.ts'),
    'isveren-sss'
  );
  const isverenSssHtml =
    '<section><h2>Sıkça sorulanlar</h2>' +
    ISVEREN_SSS.map(
      (m) => `<h3>${kacir(m.soru)}</h3><p>${kacir(m.cevap)}</p>`
    ).join('') +
    '</section>';
  const isverenSssJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ISVEREN_SSS.map((m) => ({
      '@type': 'Question',
      name: m.soru,
      acceptedAnswer: { '@type': 'Answer', text: m.cevap },
    })),
  };

  const EK_LISTE = {
    /*
      FIRSAT KAPILARI ARTIK LİSTE TAŞIYOR

      Bu beş sayfa tarayıcının tek tek fırsat sayfalarına geçtiği kapı.
      Listesiz hâllerinde yalnız başlık ve tek cümleden ibaretlerdi ve
      hiçbir bağlantı taşımıyorlardı (ölçüldü: 69 ve 88 karakter, sıfır
      bağlantı). Aynı kalıp /rehber ve /bolumler için de uygulanmıştı.

      Kategori kuralı PAYLAŞILAN modülden (`firsatKategorisi`): arayüzün
      süzgeci de aynı tablodan besleniyor, yani ön render ile ekranda
      görünen liste aynı mantığı kullanıyor. İkinci bir tablo tutmak,
      arama motoruna sayfada olmayan bir kayıt göstermek olurdu.
    */
    '/firsatlar': firsatListesi(null),
    '/burslar': firsatListesi('burslar'),
    '/yarismalar': firsatListesi('yarismalar'),
    '/kyk': firsatListesi('burslar', 'kyk'),
    '/yurtdisi-firsatlari': firsatListesi('programlar', null, 'yurtdisi'),
    '/isveren': isverenSssHtml,
    '/rehber': merkezListeleri.rehberler,
    '/bolumler': merkezListeleri.bolumler,
    '/staj-programlari': merkezListeleri.programlar,
    '/isveren/ilan-ver': merkezListeleri.isverenGirisi,
    '/universite-kariyer-merkezleri': merkezListeleri.kariyerMerkezleri,
  };

  const EK_JSONLD = { '/isveren': isverenSssJsonLd };

  for (const [yol, baslik, aciklama, h1] of sabitler) {
    const ek = EK_LISTE[yol] || '';
    sayfaYaz(yol, {
      baslik,
      aciklama,
      govde: `<main><h1>${kacir(h1)}</h1><p>${kacir(aciklama)}</p>${ek}</main>`,
      ...(EK_JSONLD[yol] ? { jsonLd: EK_JSONLD[yol] } : {}),
    });
    sayac++;
  }

  /* ---- ilanlar: JobPosting ---- */
  const ilanlar = await ilanlariGetir();
  /* `firsatlar` yukarıda, sabitlerden önce çekildi: kategori kapıları onu kullanıyor. */
  /*
    Şehir adı arayüzde konumEtiketi ile düzeltiliyor ("Turkey - Istanbul" →
    "İstanbul", "Zincirlikuyu, Istanbul" → "Zincirlikuyu, İstanbul") ama ön
    render edilen HTML ham hâlde kalıyordu — yani arama motorunun okuduğu
    metin yanlış yazımdaydı. Aynı modül burada da derlenip kullanılıyor;
    ikinci bir şehir sözlüğü tutmak ikisinin ayrışmasına davetiye olurdu.
  */
  const { konumEtiketi } = await icerikDerle(path.join(kok, 'src', 'lib', 'sehir.ts'), 'sehir');

  /* ---------------------------------------------- /staj-ilanlari ---- */
  /*
    "STAJ İLANLARI" ARAMA NİYETİNİN BİRİNCİL SAYFASI

    Ana sayfa markayı ve ürünün tamamını anlatıyor; ölçüldü (Search
    Console): "staj" içeren sorgularda 137 gösterim, ana sayfadan tek
    tıklama yok ve tam "staj ilanları" sorgusunda ana sayfa hiç gösterim
    almıyor. Bu sayfanın tek konusu ilan aramak.

    SABİTLER LİSTESİNDE DEĞİL, BURADA: gövdesi gerçek ilan verisi
    istiyor ve o veri (`ilanlar`) ancak bu satırdan sonra elde. Sayılar
    hesaplanmıyor, SAYILIYOR — uydurulan tek bir rakam yok.
  */
  /*
    /staj-ilanlari TÜRKİYE KAPISI (17 Eylül 2026)

    Ön render'daki sayfa Türkiye görünümünün metnini taşıyor ("Türkiye
    genelindeki..."). Sayılar, şehir dökümü ve son ilanlar da yalnız Türkiye
    sınıfındaki ilanlardan (lib/ilan-cografyasi.mjs): Paris/Berlin Türkiye
    şehri gibi sunulmuyor. İlan sayfaları ve site haritası bundan
    etkilenmiyor — her yayındaki ilan kendi sayfasında kalıyor.
  */
  const { ilanCografyasi: cografya } = await import('../src/lib/ilan-cografyasi.mjs');
  const turkiyeIlanlari = ilanlar.filter((i) => cografya({ countryCode: i.country_code ?? null, city: i.city ?? null }) === 'turkiye');
  /*
    Ön render sayaçları canlı katalogla AYNI kaynaktan gelsin diye
    TR katalogu burada bir kez çağrılıyor. Anonim anahtarla: gömülen
    sayı, siteye giren herkesin zaten göreceği sayı.
  */
  const katalogSayaclari = await katalogTohumuGetir('TR');
  if (!katalogSayaclari) {
    console.log('  UYARI: katalog sayaçları alınamadı, yerel sayım kullanılıyor (ayrışabilir)');
  }
  const stajIlanlariVerisi = (() => {
    const sehirSayaci = new Map();
    const sirketler = new Set();
    for (const ilan of turkiyeIlanlari) {
      const sirket = ilan.companies?.name;
      if (sirket) sirketler.add(sirket);
      const ham = (ilan.city || '').trim();
      if (!ham) continue;
      const ad = konumEtiketi(ham);
      sehirSayaci.set(ad, (sehirSayaci.get(ad) || 0) + 1);
    }

    /* En yeni ilanlar: `posted_at` yoksa `created_at`. İkisi de yoksa sona. */
    const zaman = (i) => new Date(i.posted_at || i.created_at || 0).getTime() || 0;
    const enYeniler = turkiyeIlanlari
      .slice()
      .sort((a, b) => zaman(b) - zaman(a))
      .slice(0, 12)
      .map((ilan) => ({
        yol: `/ilan/${slugla(ilan.title)}-${String(ilan.id).replace(/-/g, '').slice(0, 8)}`,
        baslik: ilan.title,
        sirket: ilan.companies?.name || '',
        sehir: ilan.city ? konumEtiketi(ilan.city) : null,
        calismaSekli: ilan.work_type || null,
      }));

    return {
      gorunum: 'turkiye',
      /*
        SAYAÇLAR KATALOG SÖZLEŞMESİNDEN, BURADAN DEĞİL.

        Bu blok sayıları kendi eliyle hesaplıyordu ve katalogun
        DÖRDÜNCÜ uygulaması oluyordu. Ölçüldü (22 Eylül 2026): ön
        render "105 ilan, 76 şirket, 8 şehir" yazıyordu, canlı katalog
        ise 104 / 7 diyordu. İki fark:

          · son başvurusu geçmiş ilan burada eleniyordu (105 vs 104)
          · şehir, HAM `city` metninden türetilen etiketle sayılıyordu;
            "İstanbul" ile "Istanbul" ayrı sayılıyordu (8 vs 7)

        Artık `katalogSayaclari` v3 RPC'sinden geliyor — ekranın
        saniyeler sonra göstereceği sayının aynısı. Çağrı başarısız
        olursa buradaki yerel sayım yedek kalıyor: sayfa sayısız
        kalmaktansa yaklaşık bir sayı göstersin, ama bu durumda
        ayrışma yeniden mümkün olduğu için konsola yazılıyor.
      */
      toplam: katalogSayaclari?.total ?? turkiyeIlanlari.length,
      sirketToplam: katalogSayaclari?.companyTotal ?? sirketler.size,
      sehirToplam: katalogSayaclari?.cityTotal ?? sehirSayaci.size,
      ilanlar: enYeniler,
      sehirler: [...sehirSayaci.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([ad, adet]) => ({ ad, adet })),
    };
  })();

  sayfaYaz('/staj-ilanlari', {
    baslik: 'Güncel Staj İlanları 2026 | StajımVar',
    aciklama:
      'Türkiye genelindeki güncel staj ilanlarını şehir, bölüm ve staj türüne göre filtrele. Şirketlerin resmî başvuru sayfalarına doğrudan ulaş.',
    govde: merkezListeleri.stajIlanlari(stajIlanlariVerisi),
  });
  sayac++;

  /*
    ESKİ ADRESLER İÇİN KALICI YÖNLENDİRME

    İlan adresleri bir zamanlar ham kimlikti (/ilan/<uuid>) ve o adresler
    hâlâ arama sonuçlarında duruyor. SPA yedeği yüzünden 200 dönüyorlardı:
    ziyaretçi doğru ilanı görmüyordu ve arama motoru aynı içeriği iki
    adreste indeksliyordu.

    Yönlendirme haritası burada üretiliyor çünkü doğru hedefi ancak burada
    biliyoruz: ilanın kimliği ile başlığından türeyen slug. Elle yazılan bir
    liste, başlık değiştiğinde sessizce yanlış hedefe giderdi.
  */
  const eskiAdresler = [];

  for (const i of ilanlar) {
    const sirket = i.companies || {};
    const onek = String(i.id).split('-')[0];
    const yol = `/ilan/${slugla(i.title)}-${onek}`;
    /* Tam kimlik ve yalnızca önek: ikisi de kanonik adrese gidiyor. */
    eskiAdresler.push(`/ilan/${i.id}   ${yol}   301`);
    eskiAdresler.push(`/ilan/${onek}   ${yol}   301`);
    /*
      AYNI PROGRAMIN FARKLI ŞEHİRLERİ AYRIŞSIN

      Alumil'in üç ilanı aynı başlığı ve aynı açıklamayı taşıyordu:
      "Alumil NextGen Staj Programı…" × Çorlu, İstanbul, İzmir. Arama
      motoru için üç sayfa da birbirinin kopyasıydı.

      Ayrım BAŞLIK METNİNDE değil META BAŞLIKTA yapılıyor. Veritabanındaki
      `title` adresin bir parçası (/ilan/<slug>-<önek>); onu değiştirmek
      üç adresi birden kırardı — bu turda düzelttiğimiz 404'lerin sebebi
      tam olarak buydu.

      Şehir hem <title>'a hem açıklamanın başına giriyor: ikisi de arama
      sonucunda görünen alanlar.
    */
    const sehirEki = i.city ? konumEtiketi(i.city) : '';
    const ozetGovde = ozetle(i.description, sehirEki ? 140 : 155);
    const ozet = sehirEki ? `${sehirEki}. ${ozetGovde}` : ozetGovde;

    /*
      META AÇIKLAMA KISA, GÖVDE TAM (19 Eylül 2026)

      `ozet` 155 karaktere kısaltılmış hâl; yeri <meta name="description">
      ve arama sonucu. Ta ki bugüne kadar GÖVDEYE de o giriyordu, yani
      sayfanın tek paragrafı üç noktayla bitiyordu. Ölçüldü: KPMG ilanının
      açıklaması 49 kelime, sayfada görünen 30 kelime + "…". Kısaltma
      arama sonucunun sınırı; sayfanın değil.
    */
    const tamAciklama = String(i.description ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const govdeAciklamasi = sehirEki
      ? `${sehirEki}. ${tamAciklama}`
      : tamAciklama || ozet;
    const dizi = (d) => (Array.isArray(d) ? d.map((x) => String(x ?? '').trim()).filter(Boolean) : []);

    /*
      SÜRESİ GEÇMİŞ İLAN GÖRÜNÜR SAYFADA DA KAPANMIŞ

      Ölçüldü (14 Eylül 2026): "KEY+ Uzun Dönem Staj Programı" son
      başvurusu 2026-09-06, sekiz gün geçmiş, hâlâ `status = published`.
      Yapısal veri `validThrough` ile Google'a "kapandı" diyordu ama
      GÖRÜNÜR sayfada kapanışa dair tek kelime yoktu ve adres site
      haritasında bildiriliyordu. İşaretleme "kapandı", sayfa ve harita
      "açık" diyordu.

      Sayfa 404 YAPILMIYOR: kapanmış bir ilanın sayfasının kalması hem
      Google'ın istediği hem de kullanıcıya yararlı (programın varlığı,
      şirket, tarih). Eksik olan şey, kapandığının SÖYLENMESİYDİ.

      Tarih ham dizeden biçimlendiriliyor; gerekçesi fırsat
      listelerindeki aynı kararla bir (saatsiz tarih + UTC batısı).
    */
    const sonBasvuruHam = String(i.application_deadline || '').slice(0, 10);
    const sonBasvuruParca = sonBasvuruHam.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const suresiGecti = Boolean(
      sonBasvuruParca && new Date(`${sonBasvuruHam}T23:59:59Z`).getTime() < Date.now()
    );
    const AYLAR_ILAN = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
    ];
    const kapanisNotu =
      suresiGecti && sonBasvuruParca
        ? `Başvuru dönemi kapandı. Son başvuru: ${Number(sonBasvuruParca[3])} ` +
          `${AYLAR_ILAN[Number(sonBasvuruParca[2]) - 1]} ${sonBasvuruParca[1]}.`
        : '';

    /*
      JobPosting — Google for Jobs uygunluğu.

      DİKKAT: uydurma alan yazılmıyor. `validThrough` ancak veritabanında
      gerçek bir son başvuru tarihi varsa ekleniyor; Google süresi geçmiş
      veya yanlış tarihli ilanları cezalandırıyor.

      `directApply` İLANA GÖRE DEĞİŞİYOR.

      Sabit `false` yazılıyordu ve bu, ürünün eski hâlinden kalmıştı:
      o sırada bütün başvurular şirketin kendi sayfasında tamamlanıyordu.
      Artık iki model var. Şirketin StajımVar'da açtığı ilanda başvuru
      siteden çıkmadan tamamlanıyor — orada `false` yazmak, arama
      sonucundan gelen öğrenciye yanlış bilgi vermek olur. Dış kaynaktan
      derlenen ilanlarda ise `false` doğru: başvuru resmî sayfada.

      Alanı hiç yazmamak "bilmiyoruz" demek; ikisi de yanlış olurdu.

      Şirket adresi veritabanına şemasız giriliyor ("alumil.com"); yapısal
      veri mutlak adres istiyor, göreli değer geçersiz sayılıyor.
    */
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: i.title,
      description: `<p>${kacir(ozetle(i.description, 1200))}</p>`,
      datePosted: (i.posted_at || i.created_at || '').slice(0, 10),
      employmentType: 'INTERN',
      url: SITE + yol,
      directApply: i.application_method !== 'external',
      hiringOrganization: {
        '@type': 'Organization',
        name: sirket.name || 'Bilinmiyor',
        ...(guvenliDisAdres(sirket.website_url) ? { sameAs: guvenliDisAdres(sirket.website_url) } : {}),
        ...(guvenliDisAdres(sirket.logo_url) ? { logo: guvenliDisAdres(sirket.logo_url) } : {}),
      },
      /*
        İÇİ BOŞ `jobLocation` BASILMIYOR

        Şehri olmayan ilanlarda şöyle bir blok çıkıyordu (ölçüldü,
        159 sayfanın 7'si):

          {"@type":"Place","address":{"@type":"PostalAddress","addressCountry":"TR"}}

        Yani "bir yer var" diyor ama yerin kendisini söylemiyor: yerel
        bilgi yok, uzaktan işareti de yok. Şehir uydurmak yerine alan
        hiç yazılmıyor.

        Üç hâl, üçü ayrı:
          şehir var                  Place + addressLocality
          şehir yok, çalışma uzaktan TELECOMMUTE (aşağıda) — yer
                                     gerekmiyor, Google bunu kabul ediyor
          şehir yok, yerinde/hibrit  alan HİÇ YAZILMIYOR

        TAKAS AÇIK: üçüncü hâldeki ilanlar iş zengin sonucuna
        giremeyebilir. Eksik alanla da giremiyorlardı; fark, artık
        söylemediğimiz bir şeyi söylüyormuş gibi yapmıyoruz.
      */
      ...(i.city
        ? {
            jobLocation: {
              '@type': 'Place',
              address: {
                '@type': 'PostalAddress',
                addressLocality: i.city,
                /*
                  Ülke GERÇEK VERİDEN: sabit 'TR' Paris ve Berlin ilanlarını
                  da Türkiye'de gösteriyordu. Kod yoksa alan yazılmıyor.
                */
                ...(i.country_code ? { addressCountry: i.country_code } : {}),
              },
            },
          }
        : {}),
      ...(i.application_deadline ? { validThrough: i.application_deadline } : {}),
      ...(i.work_type === 'Remote' ? { jobLocationType: 'TELECOMMUTE' } : {}),
    };

    await kartYaz(`ilan-${onek}`, {
      tur: 'ilan',
      etiket: 'STAJ İLANI',
      baslik: i.title,
      altMetin: [sirket.name, i.city ? konumEtiketi(i.city) : ''].filter(Boolean).join(' · '),
    });

    /*
      Süresi geçmiş ilan haritaya girmiyor; sayfası duruyor ve görünür
      metninde kapandığı yazıyor. `sitemap.py` de aynı kuralı uyguluyor,
      burası dağıtılan kopyayı tutarlı tutuyor.
    */
    if (suresiGecti) HARITADAN_DISLANAN.add(yol);

    sayfaYaz(yol, {
      gorsel: `/og/ilan-${onek}.png`,
      baslik: `${i.title}${sehirEki ? ` (${sehirEki})` : ''}${sirket.name ? ' — ' + sirket.name : ''} | StajımVar`,
      aciklama: ozet,
      govde: govde(
        i.title,
        /*
          Kapanış notu açıklamanın BAŞINA giriyor: arama sonucundan
          gelen kişi ilk cümlede durumu görüyor, sayfayı okuyup en
          sonda öğrenmiyor.
        */
        kapanisNotu ? `${kapanisNotu} ${govdeAciklamasi}` : govdeAciklamasi,
        [
          sirket.name && `Şirket: ${sirket.name}`,
          i.city && `Şehir: ${konumEtiketi(i.city)}`,
          i.work_type && `Çalışma şekli: ${i.work_type}`,
          i.duration && `Süre: ${i.duration}`,
          i.min_grade_level && `En az sınıf: ${i.min_grade_level}`,
          kapanisNotu && 'Durum: başvuru dönemi kapandı',
        ].filter(Boolean),
        [
          { baslik: 'Sorumluluklar', maddeler: dizi(i.responsibilities) },
          { baslik: 'Aranan nitelikler', maddeler: dizi(i.required_skills) },
        ]
      ),
      jsonLd,
    });
    sayac++;
  }

  /*
    Yönlendirmeler `_redirects` dosyasının BAŞINA yazılıyor: dosyadaki
    son kural `/* -> /index.html 200` her şeyi yakalıyor ve Cloudflare
    Pages ilk eşleşen kuralı uyguluyor. Sonda kalan bir kural hiç
    çalışmazdı.
  */
  if (eskiAdresler.length) {
    const dosya = path.join(dist, '_redirects');
    const mevcut = fs.existsSync(dosya) ? fs.readFileSync(dosya, 'utf8') : '';
    const baslik = [
      '# ESKİ İLAN ADRESLERİ — ön render tarafından üretiliyor',
      '# scripts/onrender.mjs; elle düzenlenmez',
    ].join('\n');
    const govdeMetni = eskiAdresler.join('\n');
    fs.writeFileSync(dosya, baslik + '\n' + govdeMetni + '\n\n' + mevcut, 'utf8');
    console.log(`  ${eskiAdresler.length} eski ilan adresi 301'e bağlandı`);
  }

  for (const f of firsatlar) {
    /*
      SÜRESİ GEÇEN KAYDIN SAYFASI SİLİNMİYOR

      Eskiden `continue` ile atlanıyordu ve adres canlıda HTTP 404
      dönüyordu — arama sonuçlarında sıralanan bir sayfa bir günde yok
      oluyordu. Artık `/ilan/` ailesindeki kuralın aynısı geçerli:

        sayfa DURUYOR (200) · görünür metninde KAPANDIĞI yazıyor ·
        site haritasından DÜŞÜYOR

      Arayüz bu durumu zaten çiziyor (OpportunityDetailPage: başvuru
      düğmesi gizleniyor, "Bu fırsatın süresi doldu" uyarısı çıkıyor);
      statik HTML de aynı şeyi söylemek zorunda, yoksa ilk HTML ile
      hidrasyon sonrası ekran ayrışırdı.
    */
    const suresiGecti = firsatSuresiGectiMi(f);
    await kartYaz(`firsat-${f.slug}`, {
      tur: 'firsat',
      etiket: 'ÖĞRENCİ FIRSATI',
      baslik: f.title,
      altMetin: f.organization_name || '',
    });

    const firsatYolu = `/firsatlar/${f.slug}`;
    /*
      Süresi geçmiş fırsat haritaya girmiyor; sayfası duruyor ve görünür
      metninde kapandığı yazıyor. `/ilan/` ailesinde uygulanan kuralın
      aynısı — iki aile ayrı davranırsa hangi adresin haritada olduğu
      tahmin edilemez hale gelirdi.
    */
    if (suresiGecti) HARITADAN_DISLANAN.add(firsatYolu);

    /*
      İÇERİĞİ OLMAYAN FIRSAT HARİTAYA GİRMİYOR (19 Eylül 2026)

      Ölçüldü: 121 fırsat sayfasının görünür metni ortanca 30 kelime —
      sitedeki en ince yüzey. Kayıtların yalnız %9'unda `description`
      ya da `eligibility` var; geri kalanında sayfa "başlık + kurum +
      son başvuru + koşullar resmî kaynakta"dan ibaret ve her kayıtta
      aynı kalıp. Yüzlerce böyle sayfayı dizine sokmak, arama motoruna
      birbirinin kopyası ince sayfalar sunmak demek.

      Sayfa DURUYOR: adres 200 dönüyor, fırsatı arayan kullanıcı
      buradan resmî kaynağa gidiyor. Kaydın ayrıntısı yazıldığı anda
      sayfa kendiliğinden haritaya giriyor — kural içeriğe bakıyor,
      kaydın kendisine değil.
    */
    const firsatInce = !duzMetin(f.description) && !duzMetin(f.eligibility);
    if (firsatInce) HARITADAN_DISLANAN.add(firsatYolu);

    sayfaYaz(firsatYolu, {
      dizinDisi: firsatInce,
      gorsel: `/og/firsat-${f.slug}.png`,
      baslik: `${firsatBasligi(f)} | StajımVar`,
      aciklama: ozetle(f.short_description || ''),
      govde: govde(
        f.title,
        /*
          AYRINTILI AÇIKLAMA VARSA O DA YAZILIYOR (19 Eylül 2026).
          `short_description` arama sonucu için yazılmış tek cümle;
          `description` ise kaydın kendi ayrıntısı. İkisi de varken
          yalnız birincisini basmak, elimizdeki metni saklamaktı.
        */
        [f.short_description || '', duzMetin(f.description)].filter(Boolean).join(' '),
        [
          f.organization_name,
          /*
            KAPANDIĞI GÖRÜNÜR METİNDE YAZIYOR

            "Başvuru dönemi kapandı" ifadesi doğrulanmış tek şeye
            dayanıyor: kaydın kendi son başvuru tarihi. Tarihin kendisi
            yoksa bu satır da yazılmıyor — çünkü o durumda kaydın
            kapandığını bilmiyoruz (`firsatDurumu` tarihsiz kaydı zaten
            'active' sayıyor).

            "Başvurusu açık" DENMİYOR: açık olduğunu kaynağın kendi
            sayfasında görmeden iddia edemeyiz.
          */
          f.application_deadline &&
            `${suresiGecti ? 'Başvuru dönemi kapandı — son başvuru' : 'Son başvuru'}: ` +
              `${f.application_deadline.slice(0, 10)}`,
        ].filter(Boolean),
        [{ baslik: 'Kimler başvurabilir', maddeler: [duzMetin(f.eligibility)].filter(Boolean) }]
      ),
    });
    sayac++;
  }

  /*
    ---- keşfet etkinlikleri: KALDIRILDI ----

    Keşfet bölümü 11 Eylül 2026'da kapandı: 163 kayıt arşivlendi,
    /kesfet ve /kesfet/* adresleri 301 ile /firsatlar'a iniyor
    (public/_redirects). Burada üretilen `Event` yapısal verisi ve
    /kesfet/<slug> sayfaları artık üretilmiyordu — sorgu
    `status=eq.published` süzdüğü için sıfır satır dönüyordu — ama
    kod duruyordu.

    NEDEN TAMAMEN SİLİNDİ
    Search Console 12 Eylül 2026'da 7 adet Event yapısal veri
    uyarısı bildirdi (image/performer/offers/organizer eksik). Uyarılar
    kapanmadan ÖNCE taranmış sayfalara aitti; canlıda tek Event
    işaretlemesi kalmamıştı. Ama kod yerinde durdukça tek bir kaydın
    arşivden çıkması eksik alanlı Event sayfalarını geri getirirdi.
    Ölü kod her derlemede discover_events'e gereksiz bir istek de
    atıyordu.
  */

  /*
    ---- şirket sayfaları ----

    NEDEN ÖN RENDER GEREKİYOR
    -------------------------
    /sirket/<slug> adresleri uygulama içinde çiziliyordu; ön render
    edilmedikleri için sunucudan gelen HTML ana sayfanın kabuğuydu. Sonuç
    ölçüldü: şirket sayfasının canonical'ı, paylaşım etiketleri ve yapısal
    verisi ANA SAYFAYI gösteriyordu. Yani arama motoru için kırk şirket
    sayfası da ana sayfanın kopyasıydı ve paylaşıldığında ana sayfa kartı
    çıkıyordu.

    Yalnızca yayında ilanı OLAN şirketler yazılıyor: ilanı olmayan şirket
    sayfası boş bir kart demek ve ince içerik arama motorunda sitenin
    tamamına zarar veriyor.
  */
  const sirketler = new Map();
  for (const i of ilanlar) {
    const s = i.companies || {};
    if (!s.slug) continue;
    if (!sirketler.has(s.slug)) sirketler.set(s.slug, { ...s, ilanlar: [] });
    sirketler.get(s.slug).ilanlar.push(i);
  }

  for (const [slug, s] of sirketler) {
    const adet = s.ilanlar.length;
    const sehirler = [...new Set(s.ilanlar.map((i) => i.city).filter(Boolean))].map((c) => konumEtiketi(c));
    const baslik = `${s.name} staj ilanları | StajımVar`;
    const aciklama = ozetle(
      s.description ||
        `${s.name} şirketinin yayındaki ${adet} staj ilanı${
          sehirler.length ? ` (${sehirler.slice(0, 3).join(', ')})` : ''
        }. İlanlar şirketin kendi kariyer sayfasından derleniyor; başvuru doğrudan şirkete yapılıyor.`,
      155,
    );

    /* Boş alan satır üretmiyor: "Sektör: —" yazmak bilgi vermiyor. */
    const kunye = [
      s.industry && `Sektör: ${kacir(s.industry)}`,
      s.location && `Merkez: ${kacir(s.location)}`,
      sehirler.length && `İlan verilen şehirler: ${kacir(sehirler.join(', '))}`,
      `Yayındaki staj ilanı: ${adet}`,
      guvenliDisAdres(s.website_url) &&
        `Kariyer sayfası: <a href="${guvenliDisAdres(s.website_url)}" rel="nofollow noopener" target="_blank">${kacir(
          String(s.website_url).replace(/^https?:\/\//i, '')
        )}</a>`,
    ].filter(Boolean);

    const liste =
      '<ul>' +
      s.ilanlar
        .map((i) => {
          const yol = `/ilan/${slugla(i.title)}-${String(i.id).split('-')[0]}`;
          const yer = i.city ? konumEtiketi(i.city) : '';
          return `<li><a href="${yol}">${kacir(i.title)}</a>${yer ? ` — ${kacir(yer)}` : ''}</li>`;
        })
        .join('') +
      '</ul>';

    /*
      TEK İLANLI ŞİRKET SAYFASI HARİTAYA GİRMİYOR (19 Eylül 2026)

      AdSense sitemizi "Düşük değere sahip içerik" gerekçesiyle geri
      çevirdi (panel, 19 Eylül 2026). Ölçüldü: ilanı olan 143 şirket
      sayfasının 112'sinde TEK ilan var, 22'sinde iki. Tek ilanlı sayfa
      bir merkez değil, bağlantı verdiği ilanın sarmalayıcısı: görünür
      metni ortanca 78 kelime ve o metnin neredeyse tamamı her şirkette
      aynı kalıp cümleler. Şirket kaydının kendi anlatısı da yok —
      ölçüldü, 203 şirketin 2'sinde `description` dolu.

      Üç ve üzeri ilanı olan sayfa GERÇEK bir merkez (örneğin Baykar'ın
      altı ilanı); o haritada kalıyor. Eşik ilan sayısına bakıyor,
      şirkete değil: bir şirket üçüncü ilanını açtığında sayfası
      kendiliğinden haritaya giriyor.

      Sayfa SİLİNMİYOR: adres 200 dönüyor, ilan sayfalarından ve iç
      bağlantılardan erişiliyor. Yalnız "bunu da dizine al" demiyoruz.
    */
    const sirketInce = s.ilanlar.length < 3;
    if (sirketInce) HARITADAN_DISLANAN.add(`/sirket/${slug}`);

    sayfaYaz(`/sirket/${slug}`, {
      dizinDisi: sirketInce,
      baslik,
      aciklama,
      /*
        KÜNYE GÖVDEYE DE BASILIYOR

        Sektör, konum ve kariyer sayfası veritabanında VARDI ama yalnızca
        yapısal veriye giriyordu; sayfanın kendisi isim + ilan listesinden
        ibaretti. Ölçüldü: 97 şirket sayfasının 97'si 900 karakterin
        altındaydı, yani tarayıcı için hepsi ince içerikti.

        Bu satırlar uydurulmuyor: hangisi boşsa o satır hiç çizilmiyor.
        Sonraki adım bağlantıları da burada, çünkü ilanı biten bir şirket
        sayfası aksi hâlde çıkmaz sokak oluyor.
      */
      govde:
        `<main><h1>${kacir(s.name)} staj ilanları</h1>` +
        `<p>${kacir(aciklama)}</p>` +
        (kunye.length ? `<ul>${kunye.map((x) => `<li>${x}</li>`).join('')}</ul>` : '') +
        `<h2>Yayındaki ilanlar (${adet})</h2>${liste}` +
        '<h2>Bu şirkette açık ilan yoksa</h2>' +
        '<p>Şirketin kendi kariyer sayfasını takip edebilir ya da doğrudan yazabilirsin. ' +
        '<a href="/rehber/staj-basvuru-epostasi">Staj başvuru e-postası nasıl yazılır</a> ve ' +
        '<a href="/rehber/staj-nasil-bulunur">staj nasıl bulunur</a> sayfalarında anlattık.</p>' +
        `<p><a href="/">Tüm staj ilanları</a></p></main>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: s.name,
        ...(s.website_url
          ? { url: /^https?:\/\//i.test(s.website_url) ? s.website_url : `https://${s.website_url}` }
          : {}),
        ...(s.logo_url ? { logo: s.logo_url } : {}),
        ...(s.industry ? { industry: s.industry } : {}),
      },
    });
    sayac++;
  }

  /*
    ---- büyük işveren sayfaları (dizin kaynaklı) ----

    NEDEN AYRI BİR KAYNAK
    ---------------------
    `/staj-programlari` dizinindeki 44 kurum ile `companies` tablosundaki
    şirketler AYRIK iki küme: kariyer adresinin alan adı ile şirket
    kaydının site adresi karşılaştırıldı ve 44'ün HİÇBİRİ mevcut bir
    kayıtla eşleşmedi (0/44). Slug ve ad çakışması da yok. Yani bu
    sayfalar var olanları ezmiyor, yanlarına ekleniyor.

    Ad benzerliğiyle birleştirme YAPILMIYOR: "Turkcell" ile "Turkcell
    İletişim Hizmetleri A.Ş." aynı şirket olabilir ama bunu addan çıkarmak
    iki farklı şirketi birleştirme riskini de getiriyor.

    KALİTE KAPISI
    -------------
    Dizinde olmak sayfa açmaya yetmiyor. Ad, doğrulanmış resmî adres,
    gerçek bir açıklama ve en az bir yararlı içerik bloğu (ilgili bölümler
    ya da kariyer yolu) gerekiyor. Kapıdan geçmeyen kayıt için sayfa
    üretilmiyor — 44 sayfa üretmek için eşik düşürmek, ince içerik üretmek
    demek.
  */
  const { STAJ_PROGRAMLARI } = await icerikDerle(
    path.join(kok, 'src', 'data', 'stajProgramlari.ts'),
    'staj-programlari'
  );
  const kimlikModulu = await icerikDerle(
    path.join(kok, 'src', 'lib', 'sirket-kimligi.mjs'),
    'sirket-kimligi'
  );
  const hazirlikEylemleri = rehberEylemleri('ilan-acmayan-sirkete-nasil-yazilir');
  const dbSirketListesi = [...sirketler.values()].map((s) => ({
    id: s.id || s.slug,
    name: s.name,
    slug: s.slug,
    website_url: s.website_url,
  }));
  /* Bölüm slug'ı → görünen ad: bağlantı metni uydurulmasın. */
  const { BOLUMLER: BOLUM_LISTESI } = await icerikDerle(
    path.join(kok, 'src', 'data', 'bolumler.ts'),
    'bolumler-isveren'
  );
  const bolumAdlari = new Map(BOLUM_LISTESI.map((b) => [b.slug, b.ad]));

  const kimlikler = kimlikModulu.kanonikSirketler(STAJ_PROGRAMLARI, dbSirketListesi);
  const kimlikSayimi = {};
  for (const k of kimlikler) kimlikSayimi[k.sinif] = (kimlikSayimi[k.sinif] || 0) + 1;

  const isverenSayfalari = [];
  for (const k of kimlikler) {
    if (k.sinif !== 'PROGRAM_ONLY_VERIFIED' && k.sinif !== 'MATCHED_EXISTING_COMPANY') continue;
    /* Aynı slug iki kez yazılmasın: tabloda karşılığı varsa o sayfa kazanır. */
    if (sirketler.has(k.slug)) continue;

    const bolumBaglari = k.departments
      .map((b) => {
        const bilgi = bolumAdlari.get(b);
        return bilgi ? `<li><a href="/bolum/${b}">${kacir(bilgi)}</a></li>` : '';
      })
      .filter(Boolean)
      .join('');

    const aciklama = ozetle(k.summary || '', 155);
    const govdeParcalari = [
      `<main><h1>${kacir(k.displayName)} staj ve kariyer</h1>`,
      `<p>${kacir(k.summary || '')}</p>`,
      /*
        DİZİNDE OLMAK "DOĞRULANMIŞ İŞVEREN HESABI" DEMEK DEĞİL.
        Rozet dili burada bilerek kullanılmıyor; söylenen şey yalnızca
        kariyer kaynağının bizim tarafımızdan takip edildiği.
      */
      "<p>Bu kurumun StajımVar'da bir işveren hesabı yok; staj başvurularını kendi " +
        "kariyer sayfasından alıyor. Kaynağı biz takip ediyoruz.</p>",
      '<h2>Açık staj ilanları</h2>',
      "<p>Şu anda StajımVar'da doğruladığımız açık staj ilanı bulunmuyor. " +
        "Resmî kariyer sayfasını kontrol edebilirsin.</p>",
      k.careerUrl ? `<p><a href="${kacir(k.careerUrl)}" rel="nofollow noopener">Resmî kariyer sayfası</a></p>` : '',
      k.lastChecked ? `<p>Kaynak son kontrol: ${kacir(k.lastChecked)}</p>` : '',
      bolumBaglari ? `<h2>İlgili bölümler</h2><ul>${bolumBaglari}</ul>` : '',
      '<h2>Başvuruya hazırlan</h2><ul>' +
        hazirlikEylemleri
          .map((e) => `<li><a href="${e.yol}">${kacir(e.baslik)}</a></li>`)
          .join('') +
        '</ul>',
      '<p><a href="/staj-programlari">Büyük işverenlerde staj</a></p></main>',
    ];

    /*
      SİTE HARİTASINA GİRMİYOR (19 Eylül 2026)

      Bu daldaki 42 sayfa TANIM GEREĞİ ilansız: gövdesinde "Şu anda
      StajımVar'da doğruladığımız açık staj ilanı bulunmuyor" yazıyor.
      Ölçüldü: görünür metin ortanca 82 kelime ve o metnin büyük kısmı
      her sayfada aynı kalıp cümleler.

      Sayfa SİLİNMİYOR — adresi olan bir kurumu arayan kullanıcı buraya
      düşüp resmî kariyer sayfasına gidebiliyor, bu gerçek bir iş.
      Ama arama motoruna "şunu da dizine al" demek için bir sebep yok:
      dizine giren yüzeyin dörtte birini "burada bir şey yok" diyen
      sayfalar oluşturuyordu. İlan girdiğinde sayfa zaten öteki dalda
      üretiliyor ve haritaya giriyor.

      Süresi geçmiş ilanla aynı kural, aynı mekanizma.
    */
    HARITADAN_DISLANAN.add(`/sirket/${k.slug}`);

    sayfaYaz(`/sirket/${k.slug}`, {
      dizinDisi: true,
      baslik: `${k.displayName} Staj ve Kariyer | StajımVar`,
      aciklama,
      govde: govdeParcalari.filter(Boolean).join(''),
      /*
        İŞ İLANI ŞEMASI YOK: bu kurumların StajımVar'da açık ilanı yok.
        Açık ilanı olmayan bir sayfada iş ilanı yapısal verisi üretmek,
        arama motoruna var olmayan bir ilanı bildirmek olurdu.

        Organization yalnız ELİMİZDE OLAN alanlarla: ad ve resmî adres.
        Hukuki unvan, adres, çalışan sayısı, puan uydurulmuyor.
      */
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: k.displayName,
        ...(k.officialDomain ? { url: `https://${k.officialDomain}` } : {}),
        ...(k.sector ? { industry: k.sector } : {}),
      },
    });
    isverenSayfalari.push(k.slug);
    sayac++;
  }
  console.log(
    `  büyük işveren kimliği: ${JSON.stringify(kimlikSayimi)} → ${isverenSayfalari.length} sayfa`
  );

  /*
    ---- ana sayfa ----

    En sona bırakıldı: gövdesine gerçek ilan listesi giriyor ve ilanlar
    Supabase'ten bu noktada alınmış oluyor.

    Ana sayfa ön render'da yalnızca başlık ve bir cümleden ibaretti: 28
    kelime, sıfır bağlantı (ölçüldü). Oysa kullanıcının gördüğü şey ilan
    listesi. Tarayıcıya da aynı listeyi veriyoruz — uydurma değil, sayfada
    gerçekten duran ilanlar; her biri kendi sayfasına bağlanıyor.
  */
  const anaSayfaBaglantilari = [
    ['/rehber', 'Öğrenci rehberi'],
    ['/bolumler', 'Bölüme göre staj'],
    ['/araclar', 'Staj hesaplama araçları'],
    ['/firsatlar', 'Öğrenci fırsatları'],
    ['/isveren', 'İşverenler için'],
    ['/stajyer-nasil-alinir', 'İşveren rehberi'],
    ['/hakkimizda', 'Hakkımızda'],
    ['/iletisim', 'İletişim'],
  ];

  /*
    İLK KARTLAR GÖRÜNÜR, GERİSİ ARAMA MOTORU İÇİN.

    Eskiden ilanların TAMAMI `data-seo-prerender` içindeydi ve
    `display:none` ile gizliydi: arama motoru okuyordu, insan görmüyordu.
    İnsanın gördüğü tek şey nabız atan gri kutulardı — 436 KB JavaScript
    inip çalışana, sonra bir de Supabase çağrısı dönene kadar.

    Artık ilk kartlar GÖRÜNÜR bloğa, kalanlar gizli bloğa yazılıyor.
    Aynı ilan iki yerde birden yok: gizli listede yalnızca görünür
    kartlara girmeyenler var, yani JavaScript kapalıyken de sayfa
    kendini tekrar etmiyor ve arama motoru yine hepsini görüyor.
  */
  /*
    TOHUM HANGİ ÜLKE İÇİN

    `resolveListingCountry` (src/lib/global-preferences.mjs) sırayla
    adresteki ülkeye, kayıtlı tercihe, hesaptaki ülkelere, tarayıcı
    diline ve Cloudflare ülkesine bakıyor; hiçbiri yoksa 'TR' dönüyor.
    İlk kez gelen bir tr-TR ziyaretçi de 'TR' oluyor — yani tek bir
    tohum yazılacaksa en çok isabet eden bu.

    Başka bir ülkeyi seçmiş ziyaretçide tohum KULLANILMIYOR: okuyucu
    ülke eşleşmesini kontrol ediyor (src/lib/ilk-katalog.ts) ve
    eşleşmezse eski yoldan, ağdan yükleniyor.
  */
  const TOHUM_ULKESI = 'TR';
  const katalogTohumu = await katalogTohumuGetir(TOHUM_ULKESI);
  const tohumIlanlari = Array.isArray(katalogTohumu?.listings) ? katalogTohumu.listings : [];

  const GORUNUR_KART = 12;
  const ilanYolu = (i) => `/ilan/${slugla(i.title)}-${String(i.id).split('-')[0]}`;
  /*
    Şehir adı ham geliyor ve kaynaklar "Istanbul" yazıyor. Arayüzde
    konumEtiketi ile düzeltiliyor; ön render edilen metin de aynı
    sözlükten geçiyor ki ikisi ayrışmasın.
  */
  const ilanYeri = (i) => (i.city ? konumEtiketi(i.city) : '');

  /*
    GÖRÜNÜR KARTLAR TOHUMDAN GELİYOR — `ilanlar` listesinden değil.

    İkisi aynı veritabanını okuyor ama aynı sorguyu değil: `ilanlar`
    yayındaki her ilanı ülke ayırmadan getiriyor, tohum ise katalogun
    ülkeye göre sıralanmış ilk sayfası. İstemci ilk çizimde TOHUMU
    kullanıyor; kartları başka bir listeden yazsaydık React devreye
    girdiğinde ekrandaki ilanlar değişirdi — istediğimizin tam tersi,
    görünür bir içerik sıçraması.

    Tohum alınamadıysa kartlar yine de çiziliyor (boş ekrandan iyi),
    ama o durumda istemci zaten ağdan yükleyecek.
  */
  const gorunurIlanlar = (tohumIlanlari.length ? tohumIlanlari : ilanlar).slice(0, GORUNUR_KART);
  const gorunurKimlikler = new Set(gorunurIlanlar.map((i) => String(i.id)));
  const gizliIlanlar = ilanlar.filter((i) => !gorunurKimlikler.has(String(i.id)));

  const ilanKartlari = gorunurIlanlar.length
    ? '<ul class="sv-kartlar">' +
      gorunurIlanlar
        .map((i) => {
          const sirket = (i.companies || {}).name || '';
          const yer = ilanYeri(i);
          const alt = [sirket, yer].filter(Boolean).join(' · ');
          return (
            '<li class="sv-kart">' +
            `<a class="sv-kart-baslik" href="${ilanYolu(i)}">${kacir(i.title)}</a>` +
            (alt ? `<span class="sv-kart-alt">${kacir(alt)}</span>` : '') +
            `<span class="sv-kart-ozet">${kacir(ozetle(i.description, 150))}</span>` +
            '</li>'
          );
        })
        .join('') +
      '</ul>'
    : '';

  /*
    GİZLİ İLAN LİSTESİ KALDIRILDI.

    Anasayfa kalan 147 ilanı `display:none` bir blokta taşıyordu:
    "arama motoru okusun, insan görmesin". Bu sağlam bir yaklaşım değil —
    gizlenmiş bağlantı, Google'ın ana içerikten saydığı bir sinyal değil
    ve "kullanıcıya gösterilmeyen içerik" tarafında bir risk taşıyor.
    Üstelik anasayfanın HTML'ini 22 KB şişiriyordu.

    Doğru kanal site haritası. Ama önce onun gerçekten kapsadığından emin
    olmak gerekiyordu: ölçüldü, canlı sitemap.xml'de 159 ilanın yalnız
    62'si vardı ve dosya yedi gündür donmuştu. `siteHaritasiniUzlastir`
    bu açığı her dağıtımda kapatıyor; bu liste ancak ondan sonra
    kaldırılabilirdi.
  */

  const anaSayfaNav =
    '<nav class="sv-nav"><ul>' +
    anaSayfaBaglantilari
      .map(([y, e]) => `<li><a href="${y}">${kacir(e)}</a></li>`)
      .join('') +
    '</ul></nav>';

  sayfaYaz('/', {
    baslik: 'StajımVar — Şirketlerin staj ilanları, tek listede',
    aciklama:
      "Türkiye'deki staj ilanlarını şirketlerin kendi kariyer sayfalarından derliyoruz. " +
      'Her ilanda şirketin kendi başvuru bağlantısı var.',
    /*
      GÖRÜNÜR GÖVDE: JavaScript inmeden ekranda duran içerik.

      Üstteki çubuk gerçek başlığın yerini tutuyor (aynı 64px), altında
      ilk ilan kartları ve sayfanın ana bağlantıları var. Yan sütunlar
      hâlâ yer tutucu: süzgeçler ve kenar çubuğu etkileşim gerektiriyor,
      onları burada çizmek çalışmayan bir arayüz göstermek olurdu.
    */
    gorunurGovde:
      '<div class="sv-cubuk"></div>' +
      '<div class="sv-govde">' +
      '<div class="sv-kutu sv-yan"></div>' +
      '<main class="sv-liste">' +
      /*
        ÖN RENDER İLE UYGULAMA AYNI BAŞLIĞI SÖYLÜYOR

        Ekran başlığı onaylanan tasarımla "İlk adımın burada." oldu
        (MatchedInternshipsView). Buradaki h1 eski cümlede kalsaydı
        arama motorunun gördüğü sayfa ile kullanıcının gördüğü sayfa
        ayrışırdı. Arama niyetinin kelimesi üst etikette duruyor.
      */
      '<h1>İlk adımın burada.</h1>' +
      '<p class="sv-giris">Farklı kariyer sayfalarını tek tek gezme. İlanları aracı ' +
      'sitelerden değil, şirketlerin kendi kariyer sayfalarından derliyoruz; her ' +
      'ilanda şirketin kendi başvuru bağlantısı var.</p>' +
      ilanKartlari +
      anaSayfaNav +
      '</main>' +
      '<div class="sv-kutu sv-yan"></div>' +
      '</div>',
    /*
      Gizli SEO gövdesi anasayfada artık BOŞ. Görünür kartlar hem
      kullanıcının hem tarayıcının gördüğü tek içerik; kalan ilanlar
      site haritasından taranıyor.
    */
    govde: '',
    /*
      Ülke SARMALIN İÇİNDE yazılıyor. Okuyucu (src/lib/ilk-katalog.ts)
      tohumu ancak ziyaretçinin ülkesiyle eşleştiğinde kullanıyor;
      hangi ülkenin kataloğu olduğu yazmasaydı, Almanya'yı seçmiş bir
      ziyaretçiye Türkiye listesi gösterilirdi.
    */
    tohum: katalogTohumu ? { country: TOHUM_ULKESI, page: katalogTohumu } : null,
    /*
      MARKA KİMLİĞİ (23 Eylül 2026)

      Arama sonucunda marka zayıf duruyordu: Google "stajımvar" sorgusunu
      "stajım var" diye düzeltiyor, başlık olarak da sayfanın kendi
      başlığı yerine "Staj İlanları"nı yazıyordu.

      `alternateName` markanın bitişik ve ayrık yazımlarını aynı varlığa
      bağlıyor; `description` Organization'a bir tanım veriyor; `logo`
      ölçüsüyle birlikte veriliyor (Google logo için en az 112 piksel
      istiyor, 512'lik asıl ikon zaten var).

      `SearchAction` UYDURMA DEĞİL: arama terimi gerçekten `?q=` ile
      taşınıyor ve bağlantı açıldığında uygulanmış aramayı gösteriyor
      (App.tsx → aramaTeriminiOku). Çalışmayan bir kutuyu yapısal veride
      ilan etmek, Google'a tutulmayacak bir söz vermek olurdu.

      `sameAs` markanın resmi hesaplarını aynı varlığa bağlıyor. Adresler
      hesapların sahibinden alındı ve dördü de 200 dönüyor; uydurma
      adres markayı BAŞKA birinin hesabına bağlardı.

      Bağ tek yönlü çalışmıyor: hesapların kendi bio'sunda da
      stajimvar.com durmalı. Google iki tarafı da görünce bağa daha
      çabuk güveniyor.
    */
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${SITE}/#kurum`,
          name: 'StajımVar',
          alternateName: ['Stajım Var', 'stajimvar', 'StajimVar'],
          url: SITE,
          description:
            "Türkiye'deki staj ilanlarını şirketlerin kendi kariyer sayfalarından derleyen "
            + 'öğrenci platformu. Her ilanda şirketin kendi başvuru bağlantısı var.',
          logo: {
            '@type': 'ImageObject',
            url: `${SITE}/icon-512.png`,
            width: 512,
            height: 512,
          },
          sameAs: [
            'https://www.linkedin.com/company/stajimvar/',
            'https://www.instagram.com/stajimvar/',
            'https://www.tiktok.com/@stajimvar',
            'https://www.youtube.com/@stajimvar',
          ],
        },
        {
          '@type': 'WebSite',
          '@id': `${SITE}/#site`,
          name: 'StajımVar',
          alternateName: ['Stajım Var', 'stajimvar'],
          url: SITE,
          inLanguage: 'tr-TR',
          publisher: { '@id': `${SITE}/#kurum` },
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${SITE}/?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
          },
        },
      ],
    },
  });
  sayac++;


  /*
    GERÇEK 404

    Bilinmeyen adresler HTTP 200 ile ana sayfayı döndürüyordu — Google'ın
    "yumuşak 404" dediği durum. Hatalı bağlantılar dizine giriyor, aynı
    içerik onlarca adreste görünüyor ve ziyaretçi de nereye düştüğünü
    anlamıyor.

    Cloudflare Pages, eşleşmeyen adreslerde çıktının kökündeki 404.html'i
    GERÇEK 404 koduyla sunuyor. Bunun çalışması için _redirects'teki
    her şeyi yakalayan `/*` kuralının kalkması gerekiyordu; yerine ön
    render EDİLMEYEN uygulama adresleri tek tek yazıldı. Ön render edilen
    215 sayfa zaten gerçek dosya, onlara kural gerekmiyor.

    Sayfanın kendisi uygulama kabuğu: React açılınca bulunamadı ekranını
    çiziyor, JS kapalıyken de aşağıdaki metin görünüyor.
  */
  sayfaYaz('/404', {
    dosya: '404.html',
    dizinDisi: true,
    baslik: 'Sayfa bulunamadı | StajımVar',
    aciklama:
      'Aradığın sayfa taşınmış ya da hiç var olmamış olabilir. Staj ilanlarına, '
      + 'öğrenci fırsatlarına ve rehbere ana sayfadan ulaşabilirsin.',
    govde:
      '<main><h1>Sayfa bulunamadı</h1>'
      + '<p>Aradığın adres taşınmış ya da hiç var olmamış olabilir.</p>'
      + '<ul>'
      + `<li><a href="${SITE}/">Staj ilanları</a></li>`
      + `<li><a href="${SITE}/firsatlar">Öğrenci fırsatları</a></li>`
      + `<li><a href="${SITE}/rehber">Öğrenci rehberi</a></li>`
      + `<li><a href="${SITE}/bolumler">Bölümler</a></li>`
      + '</ul></main>',
  });

  /*
    GEÇERLİ ADRES LİSTESİ — ARA KATMAN İÇİN
    Bkz. functions/_middleware.ts. Sayfası yazılmamış ama gerçekten var olan
    kayıtlar (yayında ilanı olmayan şirket profilleri gibi) burada.
  */
  const gecerliSirketler = await sirketSluglariniGetir();
  fs.writeFileSync(
    path.join(dist, 'gecerli-adresler.json'),
    JSON.stringify({ sirket: gecerliSirketler }),
  );
  console.log(`  geçerli adres listesi: ${gecerliSirketler.length} şirket`);

  siteHaritasiniUzlastir();

  console.log(
    `ön render: ${sayac} sayfa yazıldı (+404) ` +
      `(${bolumler.length} bölüm, ${rehberler.length} rehber, ${ilanlar.length} ilan)`
  );
}

/**
 * SİTE HARİTASINI GERÇEKLE UZLAŞTIR.
 *
 * SORUN
 * -----
 * `sitemap.xml` ayrı bir saatlik işten (automation/sitemap.py) üretiliyor
 * ve depoya `public/sitemap.xml` olarak işleniyor. Ölçüldü
 * (12 Eylül 2026, canlı):
 *
 *   /ilan/    haritada  62   üretilen sayfa 159   → 97 sayfa haritada yok
 *   /sirket/  haritada  93   üretilen sayfa 160   → 67 sayfa haritada yok
 *   en yeni lastmod: 5 Eylül 2026 (yani harita yedi gündür donmuş)
 *
 * Bu, anasayfadaki gizli bağlantı listesi kaldırılınca gerçek bir kayba
 * dönüşürdü: o 97 ilan sayfasına giden hiçbir taranabilir yol kalmazdı.
 *
 * ÇÖZÜM
 * -----
 * Bu betik hangi sayfaların GERÇEKTEN yazıldığını bilen tek yer ve her
 * dağıtımda çalışıyor. Burada `dist/sitemap.xml` düzeltiliyor: yazılan
 * ama haritada olmayan adresler ekleniyor, sayfası olmadığı hâlde
 * haritada duran adresler çıkarılıyor.
 *
 * KAPSAM DAR: yalnızca bu betiğin ÜRETTİĞİ adres aileleri. `/firsatlar/`,
 * `/kesfet/` ve durağan sayfalar sitemap.py'ın bileceği işler; onlara
 * dokunulmuyor, yoksa iki üretici birbirinin işini silerdi.
 *
 * `public/sitemap.xml` DEĞİŞTİRİLMİYOR — o dosya saatlik işin çıktısı.
 * Düzeltme yalnızca dağıtılan kopyada.
 */
/*
  SAYFASI VAR AMA HARİTADA OLMAMASI GEREKEN ADRESLER

  Süresi geçmiş ilanın sayfası KALIYOR (Google kapanmış ilanın sayfasının
  durmasını istiyor ve kullanıcıya da yararlı) ama arama motoruna "bunu
  tara" demenin anlamı yok. Uzlaştırma yazılan her `/ilan/` adresini
  haritaya eklediği için, `sitemap.py` onu çıkarsa bile geri koyardı —
  iki üretici birbirinin işini bozardı.
*/
/*
  HARİTADAN ÇIKARMAK YETMİYOR, `noindex` GEREKİYOR (20 Eylül 2026)

  19 Eylül'de ince sayfalar site haritasından çıkarıldı. Search Console
  ertesi gün şunu gösterdi: "Keşfedildi — şu anda dizine eklenmiş değil"
  214 sayfa, "Tarandı — dizine eklenmemiş" 25 sayfa. Yani haritadan
  çıkmak Google'ın o sayfaları BİLMESİNİ engellemiyor; sayfa hâlâ 200
  dönüyor ve iç bağlantılardan erişiliyor, dolayısıyla sitenin içerik
  kalitesi değerlendirmesine giriyor. AdSense de siteyi "düşük değere
  sahip içerik" gerekçesiyle geri çevirmişti.

  `dizinDisi` ikisini birden yapıyor: adres haritaya girmiyor VE sayfaya
  `noindex, follow` basılıyor. `follow` kasıtlı: şirket sayfası dizine
  girmesin ama üzerindeki ilan bağlantıları taranmaya devam etsin.

  SÜRESİ GEÇMİŞ İLAN BU KURALIN DIŞINDA: onun sayfası kasıtlı olarak
  dizinde kalıyor (14 Eylül kararı), çünkü arama sonucunda hâlâ gösterim
  alıyor ve metninde kapandığı yazıyor.
*/
const HARITADAN_DISLANAN = new Set();

function siteHaritasiniUzlastir() {
  const harita = path.join(dist, 'sitemap.xml');
  if (!fs.existsSync(harita)) {
    console.log('  site haritası uzlaştırma atlandı (dist/sitemap.xml yok)');
    return;
  }

  /*
    Yalnız bu betiğin ürettiği aileler.

    `/firsatlar/` ve `/kesfet/` EKLENDİ. Önce dışarıda bırakılmışlardı
    ("sitemap.py'ın bileceği işler") ama ölçüm başka şey gösterdi
    (canlı, 14 Eylül 2026):

      /kesfet/     haritada 99 adres, hepsi 301 alıyor — bölüm 11
                   Eylül'de kapandı
      /firsatlar/  haritada 116 adres, üretilen sayfa 110; aradaki
                   kayıtların bir kısmı HTTP 404 veriyor

    Bu iki aileyi de bu betik üretiyor (`YAZILAN_ADRESLER` içinde), yani
    hangisinin sayfası olduğunu burada KESİN biliyoruz. Kaynaktaki
    üretici de düzeltildi (automation/sitemap.py); buradaki uzlaştırma,
    saatlik iş koşana kadar dağıtılan kopyayı doğru tutuyor.
  */
  const AILELER = ['/ilan/', '/sirket/', '/bolum/', '/rehber/', '/firsatlar/', '/kesfet/'];
  const aileninMi = (yol) => AILELER.some((a) => yol.startsWith(a));

  const bizim = new Set(
    [...YAZILAN_ADRESLER].filter((y) => aileninMi(y) && !HARITADAN_DISLANAN.has(y))
  );

  let xml = fs.readFileSync(harita, 'utf8');

  /* Haritada duran, bize ait adresler. */
  const mevcut = new Map();
  const blokDeseni = /<url>[\s\S]*?<\/url>/g;
  const bloklar = xml.match(blokDeseni) || [];
  for (const blok of bloklar) {
    const loc = (blok.match(/<loc>([^<]*)<\/loc>/) || [])[1];
    if (!loc || !loc.startsWith(SITE)) continue;
    const yol = loc.slice(SITE.length);
    if (aileninMi(yol)) mevcut.set(yol, blok);
  }

  /*
    Sayfası olmayan adresler çıkıyor. Ölçüldü: haritada duran ama
    üretilmeyen adres, ara katmanın "dosya yoksa 404" kuralına takılıyor —
    yani arama motoruna 404 veren bir adres bildiriyorduk.
  */
  const fazla = [...mevcut.keys()].filter((y) => !bizim.has(y));
  for (const y of fazla) xml = xml.replace(mevcut.get(y), '');

  /*
    Yazılmış ama haritada olmayan adresler giriyor.

    LASTMOD YAZILMIYOR — BİLEREK

    Önce `bugun` damgalanıyordu. Ama bu tarih sayfanın İÇERİĞİNİN
    değiştiği gün değil, DERLEMENİN koştuğu gün: her dağıtımda aynı
    adresler yeniden eklenip yeniden damgalanıyordu (ölçüldü: her
    derlemede "+169 eklendi" ve canlı haritada 169 adres o günün
    tarihiyle). Arama motoruna "bu sayfa bugün değişti" demek, değişmediği
    hâlde tekrar taranmasını istemek ve sinyali değersizleştirmek.

    Eksik alan, YANLIŞ alandan iyidir: `lastmod` yoksa arama motoru
    kendi ölçümünü kullanıyor. Gerçek tarih ancak içeriğin kaynağından
    (`updated_at`) gelebilir ve onu üretici biliyor — bu uzlaştırma
    değil.
  */
  const eksik = [...bizim].filter((y) => !mevcut.has(y));
  if (eksik.length) {
    const oncelik = (yol) => (yol.startsWith('/ilan/') ? '0.8' : '0.6');
    const yeni = eksik
      .map(
        (yol) =>
          `<url><loc>${SITE}${yol}</loc>` +
          `<changefreq>weekly</changefreq><priority>${oncelik(yol)}</priority></url>`
      )
      .join('');
    xml = xml.replace('</urlset>', `${yeni}</urlset>`);
  }

  fs.writeFileSync(harita, xml, 'utf8');
  const toplam = (xml.match(/<url>/g) || []).length;
  console.log(
    `  site haritası uzlaştırıldı: +${eksik.length} eklendi, ` +
      `-${fazla.length} çıkarıldı, toplam ${toplam} adres`
  );
}

main().catch((e) => {
  console.error('ön render başarısız:', e);
  process.exit(1);
});
