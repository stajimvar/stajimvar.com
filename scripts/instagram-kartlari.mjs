/**
 * Instagram gönderi kartlarını PNG olarak üretir (1080x1440, 3:4).
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
  3:4 DİKEY — IZGARA NE GÖSTERİYORSA O

  Instagram'ın profil ızgarası artık kare değil, 3:4 dikey. Kare kartlar
  orada sağdan ve soldan %12,5 kesiliyordu; ilk gönderide başlığın ilk
  harfleri bu yüzden gitti. 4:5 (1080x1350) kırpmayı azalttı ama bitirmedi.

  Kart artık ızgaranın oranında üretiliyor: 1080x1440. Ölçü oradan alınıyor
  çünkü insanlar gönderiyi önce ızgarada görüyor. Yayınlanan gönderide
  ölçüldü: akış görünümü de 3:4'ü tam gösteriyor, kırpmıyor.

  DÜZEN 3:4 İÇİN KURULDU, KAREDEN GERİLMEDİ
  İlk denemede kare tasarım olduğu gibi bırakılıp üstüne ve altına eşit bant
  eklenmişti. Izgarada sorun yoktu ama gönderiye girince kart "kenarlarına
  kaldırım döşenmiş" gibi duruyordu: logoyla başlık arasında bomboş bir
  alan. Şimdi boşluk banda değil, kartın kendi ritmine dağılıyor — başlık
  büyüdü, bloklar arası aralık açıldı, alt öğeler kartın altına oturdu.
*/
const EN = 1080;
const BOY = 1440;

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
  `<rect width="${EN}" height="${BOY}" fill="${zemin}"/>${svg}</svg>`;

/*
  DÜZEN DİKEY KURULUYOR

  Üç kartın da omurgası aynı: üstte marka satırı, ortada tek bir cümlelik
  ana mesaj, altta o mesajı taşıyan blok. Dikey biçimde göz yukarıdan
  aşağıya iniyor; yan yana dizmek yerine alt alta dizmek hem daha okunur
  hem de kartın boyunu kendiliğinden dolduruyor.

  Yazı boyutları kasten büyük: gönderi çoğunlukla ızgarada, yani gerçek
  boyutunun dörtte birinde görülüyor. Izgarada okunmayan yazı yok sayılır.
*/

/** Marka satırı: üç kartın da başında aynı yerde duruyor. */
const marka = (renk, halka = null) => `
  ${halka ? `<circle cx="114" cy="130" r="38" fill="${halka}"/>` : ''}
  ${logo(76, 92, 76)}
  ${satir(180, 148, 'StajımVar', { boyut: 38, renk, kalin: 800 })}
`;

/** Onay işareti: kapak kartındaki maddelerin başında. */
const tik = (x, y) => `
  <circle cx="${x}" cy="${y}" r="26" fill="${MAVI}"/>
  <path d="M${x - 11} ${y} l8 9 15 -17" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
`;

/* ------------------------------------------------------------- 1. kapak */

const kapak = () => sarmal('#FFFFFF', `
  <circle cx="1010" cy="40" r="330" fill="${ACIK_MAVI}"/>

  ${marka(SIYAH)}

  <rect x="76" y="360" width="214" height="58" rx="29" fill="${ACIK_MAVI}" stroke="${KENAR_MAVI}"/>
  ${satir(104, 399, 'ARACI YOK', { boyut: 24, renk: MAVI, kalin: 800, aralik: 2.4 })}

  ${satir(76, 546, 'İlanları aracı', { boyut: 96, renk: SIYAH, kalin: 800 })}
  ${satir(76, 656, 'sitelerden değil,', { boyut: 96, renk: SIYAH, kalin: 800 })}
  ${satir(76, 766, 'şirketin kendi', { boyut: 96, renk: SIYAH, kalin: 800 })}
  ${satir(76, 876, 'sayfasından.', { boyut: 96, renk: MAVI, kalin: 800 })}

  <rect x="48" y="1000" width="984" height="392" rx="48" fill="#F8FAFC" stroke="${KENAR_GRI}"/>

  ${tik(122, 1102)}
  ${satir(180, 1116, 'Başvuru bağlantısı şirkete gider', { boyut: 34, renk: SIYAH, kalin: 700 })}

  ${tik(122, 1222)}
  ${satir(180, 1236, 'Her ilanın resmî kaynağı yazılı', { boyut: 34, renk: SIYAH, kalin: 700 })}

  ${tik(122, 1342)}
  ${satir(180, 1356, 'Süresi geçen ilan listeden düşer', { boyut: 34, renk: SIYAH, kalin: 700 })}
`);

/* ------------------------------------------------- 2. nasıl derliyoruz */

const adim = (y, sira, baslik, aciklama) => `
  <rect x="48" y="${y}" width="984" height="200" rx="32" fill="#FFFFFF" stroke="${KENAR_GRI}"/>
  <circle cx="128" cy="${y + 100}" r="40" fill="${MAVI}"/>
  ${satir(115, y + 114, sira, { boyut: 38, renk: '#FFFFFF', kalin: 800 })}
  ${satir(200, y + 88, baslik, { boyut: 38, renk: SIYAH, kalin: 800 })}
  ${satir(200, y + 140, aciklama, { boyut: 27, renk: GRI })}
`;

const nasil = () => sarmal('#FFFFFF', `
  <circle cx="1010" cy="40" r="330" fill="${ACIK_MAVI}"/>

  ${marka(SIYAH)}

  ${satir(76, 400, 'Bir ilan listeye', { boyut: 84, renk: SIYAH, kalin: 800 })}
  ${satir(76, 496, 'nasıl giriyor?', { boyut: 84, renk: MAVI, kalin: 800 })}

  ${adim(620, '1', 'Şirketin kariyer sayfası taranır', 'Aracı ilan sitesi kullanılmıyor.')}
  ${adim(848, '2', 'Başvuru bağlantısı şirkete gider', 'Başvurunu şirketin kendi sayfasında yaparsın.')}
  ${adim(1076, '3', 'Takvim bilinmiyorsa öyle yazar', 'Tarihi doğrulanmayan bursta "Takvim bekleniyor" görürsün.')}

  ${satir(76, 1370, 'Kaynağı doğrulanmayan kayıt listeye girmiyor.', { boyut: 28, renk: GRI })}
`);

/* ------------------------------------------------------ 3. takip çağrısı */

const kucukEtiket = (x, y, en, metin) => `
  <rect x="${x}" y="${y}" width="${en}" height="76" rx="38" fill="none" stroke="#FFFFFF" stroke-opacity="0.45"/>
  ${satir(x + 30, y + 50, metin, { boyut: 28, renk: '#FFFFFF', kalin: 600 })}
`;

const cagri = () => sarmal(MAVI, `
  <circle cx="100" cy="1400" r="420" fill="${KOYU_MAVI}"/>

  ${marka('#FFFFFF', '#FFFFFF')}

  ${satir(76, 560, 'Yeni ilanlar', { boyut: 104, renk: '#FFFFFF', kalin: 800 })}
  ${satir(76, 680, 've burslar', { boyut: 104, renk: '#FFFFFF', kalin: 800 })}
  ${satir(76, 800, 'burada.', { boyut: 104, renk: '#FFFFFF', kalin: 800 })}

  ${satir(76, 890, 'Hepsi resmî kaynağıyla, tek listede.', { boyut: 34, renk: KENAR_MAVI })}

  ${kucukEtiket(76, 980, 268, 'Staj ilanları')}
  ${kucukEtiket(360, 980, 208, 'Burslar')}
  ${kucukEtiket(584, 980, 216, 'Yurt dışı')}

  <rect x="76" y="1200" width="464" height="112" rx="56" fill="#FFFFFF"/>
  ${satir(126, 1272, 'stajimvar.com', { boyut: 36, renk: MAVI, kalin: 800 })}
  <path d="M438 1256 h38 M466 1242 l16 14 -16 14" stroke="${MAVI}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

  ${satir(600, 1272, 'Bağlantı profilde', { boyut: 28, renk: KENAR_MAVI, kalin: 600 })}
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
