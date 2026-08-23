/**
 * Instagram gönderi kartlarını PNG olarak üretir (1080x1080).
 *
 * NEDEN BETİKLE
 * -------------
 * Instagram bir gönderiyi yayınlarken görseli kendi indiriyor: elimizde
 * herkese açık, kalıcı bir adres olmak zorunda. Kartları tasarım
 * tuvalinden elle dışa aktarıp yüklemek yerine burada üretiyoruz —
 * çıktı public/paylasim/ altına yazılıyor ve siteyle birlikte dağıtılıyor,
 * yani adres stajimvar.com üzerinden sabit.
 *
 * KARTLAR ZAMANSIZ
 * ----------------
 * Kartlarda ilan/şirket sayısı gibi eskiyen veri yok. Sayı yazan bir kart,
 * sayı her değiştiğinde yeniden üretilip yeniden paylaşılmayı gerektiriyor;
 * gönderi bir hafta sonra kendi kendine yanlış hale geliyor. Zamana bağlı
 * içerik (burs son başvuru tarihi, yeni ilan duyurusu) ayrı bir gönderi
 * türü — orada tarih zaten konunun kendisi.
 *
 * NEDEN SVG
 * ---------
 * og-gorsel.mjs ile aynı yol: sharp, SVG'yi tarayıcı olmadan PNG'ye
 * çeviriyor. Tasarım tuvalindeki üç kartın aynısı burada SVG olarak
 * duruyor; metin değişince kart yeniden üretiliyor.
 *
 * Kullanım: npm run instagram-kartlari
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import sharp from 'sharp';

const KOK = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const HEDEF = path.join(KOK, 'public', 'paylasim');

/*
  4:5 DİKEY, KARE DEĞİL

  Kare kartlar profil ızgarasında kenarlarından kırpılıyordu: Instagram
  ızgarası artık 3:4 dikey, kareyi doldurmak için sağdan ve soldan %12,5
  kesiyor — ilk gönderide başlığın ilk harfleri bu yüzden gitti.

  1080x1350'de (4:5) aynı kırpma kenar başına ~%3'e iniyor ve akışta da
  daha çok yer kaplıyor. İçerik dikeyde ortalanıyor: eski düzen olduğu
  gibi duruyor, üstüne ve altına eşit bant ekleniyor.
*/
const EN = 1080;
const BOY = 1350;
const KAYMA = (BOY - EN) / 2;

const MAVI = '#2563EB';
const KOYU_MAVI = '#1D4ED8';
const ACIK_MAVI = '#EFF6FF';
const KENAR_MAVI = '#DBEAFE';
const SIYAH = '#030712';
const GRI = '#4B5563';
const KENAR_GRI = '#E5E7EB';
const YAZI = 'Segoe UI, Arial, Helvetica, sans-serif';

/** Logo, SVG'ye gömülmek üzere base64'e çevriliyor (dış dosya çözülmüyor). */
const logo64 = fs.readFileSync(path.join(KOK, 'public', 'logo.png')).toString('base64');
const logo = (x, y, boyut) =>
  `<image href="data:image/png;base64,${logo64}" x="${x}" y="${y}" width="${boyut}" height="${boyut}"/>`;

const kacir = (metin) =>
  String(metin).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Tek satır metin. Ölçüler tasarım tuvalindeki kartlarla aynı. */
const satir = (x, y, metin, { boyut = 32, renk = GRI, kalin = 400, aralik = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-family="${YAZI}" font-size="${boyut}" font-weight="${kalin}" fill="${renk}" letter-spacing="${aralik}">${kacir(metin)}</text>`;

const sarmal = (zemin, svg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${EN}" height="${BOY}" viewBox="0 0 ${EN} ${BOY}">` +
  `<rect width="${EN}" height="${BOY}" fill="${zemin}"/>` +
  `<g transform="translate(0 ${KAYMA})">${svg}</g></svg>`;

/* ------------------------------------------------------------- 1. kapak */

const kapak = () => sarmal('#FFFFFF', `
  <circle cx="1000" cy="80" r="310" fill="${ACIK_MAVI}"/>

  ${logo(76, 76, 72)}
  ${satir(166, 128, 'StajımVar', { boyut: 34, renk: SIYAH, kalin: 800 })}

  <rect x="76" y="352" width="196" height="52" rx="26" fill="${ACIK_MAVI}" stroke="${KENAR_MAVI}"/>
  ${satir(100, 387, 'ARACI YOK', { boyut: 22, renk: MAVI, kalin: 800, aralik: 2.4 })}

  ${satir(76, 500, 'İlanları aracı sitelerden', { boyut: 74, renk: SIYAH, kalin: 800 })}
  ${satir(76, 584, 'değil, şirketlerin kendi', { boyut: 74, renk: SIYAH, kalin: 800 })}
  ${satir(76, 668, 'kariyer sayfalarından', { boyut: 74, renk: MAVI, kalin: 800 })}
  ${satir(76, 752, 'derliyoruz.', { boyut: 74, renk: SIYAH, kalin: 800 })}

  ${satir(76, 818, 'Her ilanda şirketin kendi başvuru bağlantısı var.', { boyut: 30, renk: GRI })}

  <rect x="76" y="890" width="356" height="76" rx="38" fill="#FFFFFF" stroke="${KENAR_MAVI}"/>
  ${satir(108, 938, 'Şirketin kendi sayfası', { boyut: 26, renk: SIYAH, kalin: 700 })}

  <rect x="452" y="890" width="250" height="76" rx="38" fill="#FFFFFF" stroke="${KENAR_MAVI}"/>
  ${satir(484, 938, 'Resmî kaynak', { boyut: 26, renk: SIYAH, kalin: 700 })}

  <rect x="722" y="890" width="282" height="76" rx="38" fill="#FFFFFF" stroke="${KENAR_MAVI}"/>
  ${satir(754, 938, 'Süresi geçen düşer', { boyut: 26, renk: SIYAH, kalin: 700 })}
`);

/* ------------------------------------------------- 2. nasıl derliyoruz */

const adim = (y, sira, baslik, aciklama) => `
  <rect x="76" y="${y}" width="928" height="150" rx="24" fill="#FFFFFF" stroke="${KENAR_GRI}"/>
  <circle cx="139" cy="${y + 75}" r="31" fill="${ACIK_MAVI}"/>
  ${satir(129, y + 87, sira, { boyut: 30, renk: MAVI, kalin: 800 })}
  ${satir(196, y + 62, baslik, { boyut: 31, renk: SIYAH, kalin: 800 })}
  ${satir(196, y + 105, aciklama, { boyut: 24, renk: GRI })}
`;

const nasil = () => sarmal('#FFFFFF', `

  ${logo(76, 70, 56)}
  ${satir(148, 108, 'StajımVar', { boyut: 26, renk: SIYAH, kalin: 800 })}

  ${satir(76, 240, 'Bir ilan listeye', { boyut: 64, renk: SIYAH, kalin: 800 })}
  ${satir(76, 316, 'nasıl giriyor?', { boyut: 64, renk: SIYAH, kalin: 800 })}

  ${adim(400, '1', 'Şirketin kendi kariyer sayfası taranır', 'İlan buradan alınır; aracı ilan sitesi kullanılmaz.')}
  ${adim(570, '2', 'Başvuru bağlantısı şirkete gider', 'Başvurunu şirketin resmî sayfasında yaparsın.')}
  ${adim(740, '3', 'Takvim bilinmiyorsa öyle yazar', 'Tarihi doğrulanmayan bursta "Takvim bekleniyor" görürsün.')}

  <line x1="76" y1="944" x2="1004" y2="944" stroke="${KENAR_GRI}"/>
  ${satir(76, 996, 'Kaynağı doğrulanmayan kayıt listeye girmiyor.', { boyut: 24, renk: GRI })}
`);

/* ------------------------------------------------------ 3. takip çağrısı */

const cagri = () => sarmal(MAVI, `
  <circle cx="150" cy="1000" r="330" fill="${KOYU_MAVI}"/>

  <circle cx="112" cy="112" r="36" fill="#FFFFFF"/>
  ${logo(76, 76, 72)}
  ${satir(166, 128, 'StajımVar', { boyut: 34, renk: '#FFFFFF', kalin: 800 })}

  ${satir(76, 470, 'Yeni ilan ve burslar', { boyut: 76, renk: '#FFFFFF', kalin: 800 })}
  ${satir(76, 556, 'burada duyurulacak.', { boyut: 76, renk: '#FFFFFF', kalin: 800 })}

  ${satir(76, 632, 'Staj ilanları, burslar, KYK ve yurt dışı programları', { boyut: 30, renk: KENAR_MAVI })}
  ${satir(76, 676, '— hepsi resmî kaynağıyla.', { boyut: 30, renk: KENAR_MAVI })}

  <rect x="76" y="880" width="420" height="96" rx="48" fill="#FFFFFF"/>
  ${satir(120, 942, 'stajimvar.com', { boyut: 32, renk: MAVI, kalin: 800 })}
  <path d="M400 928 h34 M424 916 l14 12 -14 12" stroke="${MAVI}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

  ${satir(700, 942, 'Bağlantı profilde', { boyut: 26, renk: KENAR_MAVI, kalin: 600 })}
`);

/* ----------------------------------------------------------------- yaz */

const KARTLAR = [
  ['01-kapak.jpg', kapak()],
  ['02-nasil-derliyoruz.jpg', nasil()],
  ['03-takip.jpg', cagri()],
];

fs.mkdirSync(HEDEF, { recursive: true });

for (const [ad, svg] of KARTLAR) {
  /*
    JPEG: Instagram gönderi görselini JPEG olarak istiyor; PNG yüklenen
    kapsayıcılar "media type" hatası veriyor.
  */
  const veri = await sharp(Buffer.from(svg)).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  fs.writeFileSync(path.join(HEDEF, ad), veri);
  const olcu = await sharp(veri).metadata();
  console.log(`${ad.padEnd(26)} ${olcu.width}x${olcu.height}  ${(veri.length / 1024).toFixed(0)} KB`);
}

console.log(`\n${KARTLAR.length} kart yazıldı -> public/paylasim/`);
