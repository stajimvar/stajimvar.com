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
import { guvenliDisAdres } from '../src/lib/guvenli-url.mjs';

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
        ozet: r.ozet,
        aciklama: r.aciklama,
        kategori: r.kategori,
        guncelleme: r.guncelleme,
        sss: r.sss || [],
        konu: r.konu,
        hizliCevap: r.hizliCevap,
        kaynaklar: r.kaynaklar || [],
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

async function ilanlariGetir() {
  const urlAdres = envOku('SUPABASE_URL') || envOku('VITE_SUPABASE_URL');
  const anahtar = envOku('SUPABASE_SERVICE_ROLE_KEY') || envOku('VITE_SUPABASE_ANON_KEY');
  if (!urlAdres || !anahtar) {
    console.log('  ilanlar atlandı (Supabase bilgisi yok)');
    return [];
  }
  const secim =
    'id,title,description,city,work_type,apply_url,posted_at,created_at,application_deadline,is_paid,stipend_text,companies(name,slug,website_url,logo_url,industry,location,description)';
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

async function firsatlariGetir() {
  const urlAdres = envOku('SUPABASE_URL') || envOku('VITE_SUPABASE_URL');
  const anahtar = envOku('SUPABASE_SERVICE_ROLE_KEY') || envOku('VITE_SUPABASE_ANON_KEY');
  if (!urlAdres || !anahtar) return [];
  const secim = 'slug,title,organization_name,short_description,application_deadline,updated_at,status';
  const istek = `${urlAdres}/rest/v1/opportunities?status=eq.published&select=${encodeURIComponent(secim)}`;
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
const kabuk = fs
  .readFileSync(path.join(dist, 'index.html'), 'utf8')
  .replace(/<div id="root">[\s\S]*?<\/div>(?=\s*<\/body>)/, '<div id="root"></div>');

// Boşaltma tutmadıysa devam etmek, yanlış gövdeli 66 sayfa yazmak demek.
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
function sayfaYaz(yol, s) {
  let html = kabuk;
  const tamAdres = SITE + yol;

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

  // canonical + og:url — hiç yoktu
  html = html.replace(
    '</head>',
    `  <link rel="canonical" href="${tamAdres}" />\n` +
      `    <meta property="og:url" content="${tamAdres}" />\n` +
      (s.jsonLd
        ? `    <script type="application/ld+json">${JSON.stringify(s.jsonLd)}</script>\n`
        : '') +
      '  </head>'
  );

  // #root içine görünür metin
  html = html.replace(
    /<div id="root">\s*<\/div>/,
    `<div id="root">${s.govde}</div>`
  );

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
  if (yol === '/') {
    fs.writeFileSync(path.join(dist, 'index.html'), html, 'utf8');
  } else {
    const hedef = path.join(dist, yol.replace(/^\//, '') + '.html');
    fs.mkdirSync(path.dirname(hedef), { recursive: true });
    fs.writeFileSync(hedef, html, 'utf8');
  }
}

/** Ön render gövdesi: başlık + özet + isteğe bağlı ek satırlar. */
function govde(baslik, ozet, satirlar = []) {
  return (
    `<main><h1>${kacir(baslik)}</h1><p>${kacir(ozet)}</p>` +
    (satirlar.length ? `<ul>${satirlar.map((x) => `<li>${kacir(x)}</li>`).join('')}</ul>` : '') +
    '</main>'
  );
}

/* --------------------------------------------------------------------- akış */

async function main() {
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.error('dist/index.html yok — önce `vite build` çalışmalı');
    process.exit(1);
  }

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
          acceptedAnswer: { '@type': 'Answer', text: s.cevap },
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
        author: { '@type': 'Organization', name: 'StajımVar', url: SITE },
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
          acceptedAnswer: { '@type': 'Answer', text: s.cevap },
        })),
      });
    }

    sayfaYaz(`/rehber/${r.slug}`, {
      baslik: `${r.baslik} | StajımVar`,
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
        (r.hizliCevap ? `<p><strong>${kacir(r.hizliCevap)}</strong></p>` : '') +
        r.govde +
        (sorular.length
          ? `<section><h2>Sık sorulanlar</h2>${sorular
              .map((s) => `<h3>${kacir(s.soru)}</h3><p>${kacir(s.cevap)}</p>`)
              .join('')}</section>`
          : '') +
        /* Resmî kaynaklar dış bağlantı: nofollow değil, gerçekten kaynak. */
        (Array.isArray(r.kaynaklar) && r.kaynaklar.length
          ? `<section><h2>Resmî kaynaklar</h2><ul>${r.kaynaklar
              .map(
                (k) =>
                  `<li><a href="${kacir(k.adres)}" target="_blank" rel="noopener noreferrer">${kacir(k.etiket)}</a></li>`
              )
              .join('')}</ul></section>`
          : '') +
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
  const sabitler = [
    ['/rehber', 'Staj rehberi | StajımVar', 'Belgeler, sigorta, CV, mülakat — staj sürecinin bilinmeyen kısımları sırayla.', 'Staj, işini bilene kolay.'],
    ['/bolumler', 'Bölüme göre staj rehberi | StajımVar', `${bolumler.length} bölüm için: staj nerede yapılır, stajyer ne iş yapar, ne öğrenmeli.`, 'Bölüme göre staj'],
    ['/araclar', 'Hesaplama araçları | StajımVar', 'Net hesaplama, YKS sıralama tahmini, staj ücreti ve staj günü hesaplama.', 'Hesaplama araçları'],
    ['/araclar/net-hesaplama', 'Net hesaplama (TYT, AYT, KPSS) | StajımVar', 'Doğru ve yanlış sayını gir, netini gör. TYT, AYT ve KPSS için.', 'Net hesaplama'],
    ['/araclar/siralama-tahmini', 'YKS sıralama tahmini | StajımVar', 'Puanın 2025 ÖSYM verilerine göre kaçıncı sıraya denk geliyor?', 'Sıralama tahmini'],
    ['/araclar/staj-ucreti-hesaplama', 'Staj ücreti hesaplama | StajımVar', '3308 sayılı kanuna göre stajyere en az ne kadar ödenmesi gerektiğini hesapla.', 'Staj ücreti hesaplama'],
    ['/araclar/staj-gunu-hesaplama', 'Staj günü hesaplama | StajımVar', '20 veya 30 iş günü staj hangi tarihte biter? Resmî tatiller düşülerek.', 'Staj günü hesaplama'],
    ['/isveren', 'Stajyer nasıl alınır? İşveren rehberi | StajımVar', 'Sigorta kimde, ücret zorunlu mu, okulla hangi evrak imzalanır — sırayla.', 'Stajyer almak sandığınızdan kolay.'],
    ['/staj-programlari', 'Büyük işverenlerde staj başvurusu | StajımVar', 'Aselsan, TUSAŞ, Turkcell, Tüpraş ve diğerleri stajı kendi kariyer sayfasından alıyor. Doğrulanmış başvuru adresleri.', 'Büyük işverenlerde staj'],
    ['/isveren/ilan-ver', 'Stajyer ilanı ver | StajımVar', 'Staj ilanı yayınlamak ücretsiz. Şirket sayfanızı sahiplenin, ilanlarınızı kendiniz girin.', 'Stajyer ilanı ver'],
    ['/universite-kariyer-merkezleri', 'Üniversite kariyer merkezleri | StajımVar', 'Staj formu, sigorta yazısı ve onay imzası kendi okulundan çıkıyor. Kariyer merkezlerinin doğrulanmış adresleri.', 'Üniversite kariyer merkezleri'],
    ['/firsatlar', 'Öğrenci Fırsatları | StajımVar', 'Burs, eğitim, yurtdışı ve yarışma fırsatlarını tek yerden takip et.', 'Öğrenci Fırsatları'],
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
  const EK_LISTE = {
    '/rehber': merkezListeleri.rehberler,
    '/bolumler': merkezListeleri.bolumler,
    '/staj-programlari': merkezListeleri.programlar,
    '/isveren/ilan-ver': merkezListeleri.isverenGirisi,
    '/universite-kariyer-merkezleri': merkezListeleri.kariyerMerkezleri,
  };

  for (const [yol, baslik, aciklama, h1] of sabitler) {
    const ek = EK_LISTE[yol] || '';
    sayfaYaz(yol, {
      baslik,
      aciklama,
      govde: `<main><h1>${kacir(h1)}</h1><p>${kacir(aciklama)}</p>${ek}</main>`,
    });
    sayac++;
  }

  /* ---- ilanlar: JobPosting ---- */
  const ilanlar = await ilanlariGetir();
  const firsatlar = await firsatlariGetir();
  /*
    Şehir adı arayüzde konumEtiketi ile düzeltiliyor ("Turkey - Istanbul" →
    "İstanbul", "Zincirlikuyu, Istanbul" → "Zincirlikuyu, İstanbul") ama ön
    render edilen HTML ham hâlde kalıyordu — yani arama motorunun okuduğu
    metin yanlış yazımdaydı. Aynı modül burada da derlenip kullanılıyor;
    ikinci bir şehir sözlüğü tutmak ikisinin ayrışmasına davetiye olurdu.
  */
  const { konumEtiketi } = await icerikDerle(path.join(kok, 'src', 'lib', 'sehir.ts'), 'sehir');

  for (const i of ilanlar) {
    const sirket = i.companies || {};
    const onek = String(i.id).split('-')[0];
    const yol = `/ilan/${slugla(i.title)}-${onek}`;
    const ozet = ozetle(i.description, 155);

    /*
      JobPosting — Google for Jobs uygunluğu.

      DİKKAT: uydurma alan yazılmıyor. `validThrough` ancak veritabanında
      gerçek bir son başvuru tarihi varsa ekleniyor; Google süresi geçmiş
      veya yanlış tarihli ilanları cezalandırıyor.

      `directApply: false` bilinçli: başvuru şirketin kendi sayfasında
      tamamlanıyor, bizde değil. Alanı hiç yazmamak "bilmiyoruz" demek;
      yanlışlıkla true yazmak ise arama sonucundan gelen kişiyi başvuru
      yapamayacağı bir sayfaya göndermek olurdu.

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
      directApply: false,
      hiringOrganization: {
        '@type': 'Organization',
        name: sirket.name || 'Bilinmiyor',
        ...(guvenliDisAdres(sirket.website_url) ? { sameAs: guvenliDisAdres(sirket.website_url) } : {}),
        ...(guvenliDisAdres(sirket.logo_url) ? { logo: guvenliDisAdres(sirket.logo_url) } : {}),
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          ...(i.city ? { addressLocality: i.city } : {}),
          addressCountry: 'TR',
        },
      },
      ...(i.application_deadline ? { validThrough: i.application_deadline } : {}),
      ...(i.work_type === 'Remote' ? { jobLocationType: 'TELECOMMUTE' } : {}),
    };

    sayfaYaz(yol, {
      baslik: `${i.title}${sirket.name ? ' — ' + sirket.name : ''} | StajımVar`,
      aciklama: ozet,
      govde: govde(
        i.title,
        ozet,
        [
          sirket.name && `Şirket: ${sirket.name}`,
          i.city && `Şehir: ${konumEtiketi(i.city)}`,
          i.work_type && `Çalışma şekli: ${i.work_type}`,
        ].filter(Boolean)
      ),
      jsonLd,
    });
    sayac++;
  }

  for (const f of firsatlar) {
    if (f.application_deadline && new Date(f.application_deadline).getTime() < Date.now()) continue;
    sayfaYaz(`/firsatlar/${f.slug}`, {
      baslik: `${f.title} — ${f.organization_name} | StajımVar`,
      aciklama: ozetle(f.short_description || ''),
      govde: govde(f.title, f.short_description || '', [f.organization_name, f.application_deadline && `Son başvuru: ${f.application_deadline.slice(0, 10)}`].filter(Boolean)),
    });
    sayac++;
  }

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

    sayfaYaz(`/sirket/${slug}`, {
      baslik,
      aciklama,
      govde:
        `<main><h1>${kacir(s.name)} staj ilanları</h1>` +
        `<p>${kacir(aciklama)}</p>` +
        `<h2>Yayındaki ilanlar</h2>${liste}` +
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
    ---- ana sayfa ----

    En sona bırakıldı: gövdesine gerçek ilan listesi giriyor ve ilanlar
    Supabase'ten bu noktada alınmış oluyor.

    Ana sayfa ön render'da yalnızca başlık ve bir cümleden ibaretti: 28
    kelime, sıfır bağlantı (ölçüldü). Oysa kullanıcının gördüğü şey ilan
    listesi. Tarayıcıya da aynı listeyi veriyoruz — uydurma değil, sayfada
    gerçekten duran ilanlar; her biri kendi sayfasına bağlanıyor.
  */
  const anaSayfaBaglantilari = [
    ['/rehber', 'Staj rehberi'],
    ['/bolumler', 'Bölüme göre staj'],
    ['/araclar', 'Hesaplama araçları'],
    ['/firsatlar', 'Öğrenci fırsatları'],
    ['/isveren', 'İşveren rehberi'],
    ['/hakkimizda', 'Hakkımızda'],
    ['/iletisim', 'İletişim'],
  ];

  const ilanListesi = ilanlar.length
    ? '<h2>Yayındaki staj ilanları</h2><ul>' +
      ilanlar
        .map((i) => {
          const yol = `/ilan/${slugla(i.title)}-${String(i.id).split('-')[0]}`;
          const sirket = (i.companies || {}).name || '';
          /*
            Şehir adı ham geliyor ve kaynaklar "Istanbul" yazıyor. Arayüzde
            konumEtiketi ile düzeltiliyordu ama ön render edilen HTML —
            yani arama motorunun okuduğu metin — ham hâlde kalıyordu.
            Basit düzeltme yeterli: liste yalnızca şehir adı basıyor.
          */
          const yer = i.city ? konumEtiketi(i.city) : '';
          return (
            `<li><a href="${yol}">${kacir(i.title)}</a>` +
            (sirket ? ` — ${kacir(sirket)}` : '') +
            (yer ? `, ${kacir(yer)}` : '') +
            '</li>'
          );
        })
        .join('') +
      '</ul>'
    : '';

  sayfaYaz('/', {
    baslik: 'StajımVar — Şirketlerin staj ilanları, tek listede',
    aciklama:
      "Türkiye'deki staj ilanlarını şirketlerin kendi kariyer sayfalarından derliyoruz. " +
      'Her ilanda şirketin kendi başvuru bağlantısı var.',
    govde:
      '<main><h1>Şirketlerin staj ilanları, tek listede</h1>' +
      '<p>Farklı kariyer sayfalarını tek tek gezme. İlanları aracı sitelerden değil, ' +
      'şirketlerin kendi kariyer sayfalarından derliyoruz; her ilanda şirketin kendi ' +
      'başvuru bağlantısı var.</p>' +
      ilanListesi +
      '<nav><ul>' +
      anaSayfaBaglantilari
        .map(([y, e]) => `<li><a href="${y}">${kacir(e)}</a></li>`)
        .join('') +
      '</ul></nav></main>',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          name: 'StajımVar',
          url: SITE,
          logo: `${SITE}/icon-512.png`,
        },
        {
          '@type': 'WebSite',
          name: 'StajımVar',
          url: SITE,
          inLanguage: 'tr-TR',
        },
      ],
    },
  });
  sayac++;


  console.log(
    `ön render: ${sayac} sayfa yazıldı ` +
      `(${bolumler.length} bölüm, ${rehberler.length} rehber, ${ilanlar.length} ilan)`
  );
}

main().catch((e) => {
  console.error('ön render başarısız:', e);
  process.exit(1);
});
