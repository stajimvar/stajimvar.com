/**
 * SAYFA HTML'İ — KABUK + ÜST BİLGİ + GÖRÜNÜR GÖVDE (12 Ekim 2026)
 *
 * Eskiden `scripts/onrender.mjs` içindeki `sayfaYaz` fonksiyonunun gövdesiydi.
 * Kenar çizimi (functions/_middleware.ts) aynı dönüşümü yaptığı için buraya
 * taşındı: bir ilan sayfası derlemede de kenarda da AYNI başlığı, canonical'ı,
 * yapısal veriyi ve görünür metni taşıyor.
 */
import { kacir } from './metin.mjs';
import { SITE } from './ilan-sayfasi.mjs';

/*
  KIRINTI YOLU (BreadcrumbList) — adresten üretiliyor.

  ÜST ADRES GERÇEK BİR SAYFA OLMALI. Kırıntı bir ara parçanın adresini
  `item` olarak veriyor; o adres 404 ya da yönlendirme ise kırıntı kırık
  bir bağlantıyı Google'a bildiriyor. Ölçüldü (12 Ekim 2026): `/ilan` 404,
  `/sirket` 301 dönüyordu. Bu iki ara parça gerçek merkezlerine bağlanıyor.
*/
const KIRINTI_ADLARI = {
  rehber: 'Öğrenci rehberi',
  bolum: 'Bölümler',
  bolumler: 'Bölümler',
  ilan: 'Staj ilanları',
  firsatlar: 'Öğrenci fırsatları',
  sirket: 'Staj ilanları',
  araclar: 'Staj hesaplama araçları',
  isveren: 'İşverenler',
  'staj-ilanlari': 'Staj ilanları',
  sayfa: 'Tüm açık ilanlar',
};

/** Ara parçanın gerçek merkez adresi; yazılı değilse parçanın kendi adresi. */
const KIRINTI_MERKEZI = {
  '/ilan': '/staj-ilanlari',
  '/sirket': '/staj-ilanlari',
  '/bolum': '/bolumler',
  /* Sayfalı tam listenin ara parçası; kendi sayfası yok, ilk sayfaya bağlanıyor. */
  '/staj-ilanlari/sayfa': '/staj-ilanlari/sayfa/1',
};

export function kirintiYolu(yol, baslik) {
  const parcalar = yol.split('/').filter(Boolean);
  if (!parcalar.length) return null;
  const ogeler = [{ '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: SITE + '/' }];
  let birikim = '';
  parcalar.forEach((parca, i) => {
    birikim += '/' + parca;
    const sonuncu = i === parcalar.length - 1;
    ogeler.push({
      '@type': 'ListItem',
      position: i + 2,
      name: sonuncu ? String(baslik).split('|')[0].trim() : KIRINTI_ADLARI[parca] || parca,
      item: SITE + (sonuncu ? birikim : KIRINTI_MERKEZI[birikim] || birikim),
    });
  });
  return { '@type': 'BreadcrumbList', itemListElement: ogeler };
}

function yapisalVeri(yol, s) {
  if (s.kirintiYok) return s.jsonLd || null;
  const kirinti = kirintiYolu(yol, s.baslik);
  if (!kirinti) return s.jsonLd || null;
  const mevcut = s.jsonLd;
  if (mevcut && Array.isArray(mevcut['@graph'])) return { ...mevcut, '@graph': [...mevcut['@graph'], kirinti] };
  if (mevcut) {
    const { '@context': _baglam, ...govde } = mevcut;
    return { '@context': 'https://schema.org', '@graph': [govde, kirinti] };
  }
  return { '@context': 'https://schema.org', '@graph': [kirinti] };
}

/**
 * JSON'u <script> içine güvenle gömer.
 *
 * Bütün `<`, `>` ve `&` karakterleri JSON kaçışına (`\u003c` …) çevriliyor:
 * `</script`, `<!--` ya da büyük/küçük harf ve boşluk oyunlarıyla
 * (`</SCRIPT >`) etiketi erken kapatmak mümkün olmuyor. JSON ayrıştırıcısı
 * bu kaçışları aynı karakter olarak okuyor; veri değişmiyor. U+2028/2029 da
 * kaçırılıyor.
 */
export function jsonGom(veri) {
  return JSON.stringify(veri)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(String.fromCharCode(0x2028)).join('\\u2028')
    .split(String.fromCharCode(0x2029)).join('\\u2029');
}

/*
  DEĞİŞTİRME DİZESİ DEĞİL, DEĞİŞTİRME İŞLEVİ (12 Ekim 2026, güvenlik incelemesi)

  `String.prototype.replace` ikinci argüman DİZE olduğunda `$&`, `$'`, `` $` ``
  ve `$1` kalıplarını yorumluyor. Başlık, açıklama ve JSON-LD veritabanından
  geliyor; "Başlık $' sonu" gibi bir değer kabuğun geri kalanını (betikler
  dahil) yanlış yere kopyalıyordu (ölçüldü: 2 yerine 9 <script> etiketi).
  Her ekleme `koy(değer)` ile yapılıyor: değer olduğu gibi giriyor.
*/
const koy = (deger) => () => deger;

/**
 * @param {string} kabuk   kökü boş uygulama kabuğu (dist/_onrender/kabuk.html)
 * @param {string} yol     "/ilan/x" gibi
 * @param {object} s       { baslik, aciklama, govde?, gorunurGovde?, jsonLd?, gorsel?, dizinDisi?, tohum? }
 * @param {object} o       { iskelet } — gövde yoksa çizilecek açılış iskeleti
 */
export function sayfaHtml(kabuk, yol, s, o = {}) {
  let html = kabuk;
  const tamAdres = SITE + yol;

  /*
    Dizine girmemesi gereken sayfalar için robots etiketi. Sunucu doğru kodu
    döndürse bile bir tarayıcı sayfayı içeriğiyle değerlendirebiliyor.
  */
  if (s.dizinDisi) {
    html = html.replace('</head>', koy('  <meta name="robots" content="noindex, follow" />\n  </head>'));
  }

  html = html.replace(/<title>[\s\S]*?<\/title>/, koy(`<title>${kacir(s.baslik)}</title>`));
  html = html.replace(/<meta name="description"[^>]*>/, koy(`<meta name="description" content="${kacir(s.aciklama)}" />`));
  html = html.replace(/<meta property="og:title"[^>]*>/, koy(`<meta property="og:title" content="${kacir(s.baslik)}" />`));
  html = html.replace(
    /<meta property="og:description"[^>]*>/,
    koy(`<meta property="og:description" content="${kacir(s.aciklama)}" />`),
  );

  if (s.gorsel) {
    html = html
      .replace(/<meta property="og:image"[^>]*>/, koy(`<meta property="og:image" content="${kacir(SITE + s.gorsel)}" />`))
      .replace(/<meta property="og:image:alt"[^>]*>/, koy(`<meta property="og:image:alt" content="${kacir(s.baslik)}" />`));
  }

  /*
    Canonical VARSA değiştiriliyor, eklenmiyor: iki çelişen canonical olmasın.
    Adres de kaçırılıyor: yol veritabanındaki slug'tan geliyor; tırnak taşıyan
    bir değer özniteliği kıramasın.
  */
  const canonicalEtiketi = `<link rel="canonical" href="${kacir(tamAdres)}" />`;
  const ogUrlEtiketi = `<meta property="og:url" content="${kacir(tamAdres)}" />`;
  html = /<link[^>]+rel="canonical"[^>]*>/.test(html)
    ? html.replace(/<link[^>]+rel="canonical"[^>]*>/, koy(canonicalEtiketi))
    : html.replace('</head>', koy(`  ${canonicalEtiketi}\n  </head>`));
  html = /<meta[^>]+property="og:url"[^>]*>/.test(html)
    ? html.replace(/<meta[^>]+property="og:url"[^>]*>/, koy(ogUrlEtiketi))
    : html.replace('</head>', koy(`  ${ogUrlEtiketi}\n  </head>`));

  const veri = yapisalVeri(yol, s);
  html = html.replace(
    '</head>',
    koy((veri ? `    <script type="application/ld+json">${jsonGom(veri)}</script>\n` : '') + '  </head>'),
  );

  /*
    #root İÇİNE GÖRÜNÜR İÇERİK (12 Ekim 2026)

    Eskiden yalnız anasayfa görünür bir ön render gövdesi taşıyordu; ilan,
    rehber, bölüm, fırsat ve şirket sayfalarının metni `data-seo-prerender`
    içinde `display:none` duruyordu ve JavaScript inene kadar ekranda nabız
    atan gri kutular vardı. Arama motoru metni okuyordu ama ilk yanıtta
    kullanıcıya görünmüyordu.

    Artık her sayfanın gövdesi GÖRÜNÜR: `gorunurGovde` verilmişse o (kendi
    düzeniyle), verilmemişse `govde` sade bir okuma düzeninde
    (index.html'deki satır içi `.sv-metin` stili). Gizli blok yazılmıyor;
    aynı metin iki kez durmuyor. React açılınca kökü kendi ağacıyla
    değiştiriyor — tek H1 kalıyor.
  */
  const icerik = s.gorunurGovde
    ? `<div data-onrender-govde>${s.gorunurGovde}</div>`
    : s.govde
      ? `<div data-onrender-govde><div class="sv-cubuk"></div><div class="sv-metin">${s.govde}</div></div>`
      : o.iskelet || '';
  html = html.replace('<div id="root"></div>', koy(`<div id="root">${icerik}</div>`));

  /* AÇILIŞ TOHUMU — `<`, `>` ve `&` JSON kaçışıyla gömülüyor. */
  if (s.tohum) {
    html = html.replace(
      '</body>',
      koy(`  <script type="application/json" id="ilk-katalog">${jsonGom(s.tohum)}</script>\n  </body>`),
    );
  }
  return html;
}
