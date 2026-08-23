/**
 * Instagram gönderi kartlarını JPEG olarak üretir (1080x1440, 3:4).
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
 * Kartlarda ilan/burs sayısı gibi eskiyen veri yok. Sayı yazan bir kart,
 * sayı her değiştiğinde yeniden üretilip yeniden paylaşılmayı gerektiriyor;
 * gönderi bir hafta sonra kendi kendine yanlış hale geliyor. Zamana bağlı
 * içerik (burs son başvuru tarihi, yeni ilan duyurusu) ayrı bir gönderi
 * türü — orada tarih zaten konunun kendisi.
 *
 * NEDEN SVG
 * ---------
 * og-gorsel.mjs ile aynı yol: sharp, SVG'yi tarayıcı olmadan JPEG'e
 * çeviriyor. Tasarım burada kodla duruyor; metin değişince kart yeniden
 * üretiliyor.
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

  Kart artık ızgaranın oranında üretiliyor: 1080x1440. Yayınlanan gönderide
  ölçüldü: akış görünümü de 3:4'ü tam gösteriyor, kırpmıyor.
*/
const EN = 1080;
const BOY = 1440;

/*
  TASARIM 1080'DE KURULU, DOSYA 1440'TA ÇIKIYOR

  Yukarıdaki ölçüler tasarımın koordinat sistemi; SVG çözünürlükten bağımsız
  olduğu için dosya daha büyük basılabiliyor. Instagram yüksek yoğunluklu
  ekranlara 1440 piksel genişliğe kadar servis ediyor — 1080 yüklenince o
  ekranlarda görsel büyütülüyor ve yumuşuyor. Oran aynı: 3:4.
*/
const CIKTI_EN = 1440;
const CIKTI_BOY = 1920;

/*
  KART BİR ŞABLON, TEK TEK ÇİZİM DEĞİL

  Üç kart da aynı iskeleti kullanıyor: üstte marka bandı ve sayfa numarası,
  altında dev başlık, başlığı ayıran kısa çizgi, ortada listelenmiş gövde,
  en altta renkli çıkarım kutusu. Aynı sistem sonraki gönderilerde de
  çalışsın diye parçalar ayrı fonksiyonlar; yeni bir kart yazmak, yeni bir
  tasarım yapmak değil, aynı parçaları farklı metinle dizmek oluyor.

  Ölçüler dikey biçime göre: göz yukarıdan aşağı iniyor, her şey alt alta.
  Yazılar kasten büyük — gönderi çoğunlukla ızgarada, yani gerçek boyutunun
  dörtte birinde görülüyor ve orada okunmayan yazı yok sayılıyor.
*/
const KENAR = 64;
const IC_EN = EN - KENAR * 2;

const MAVI = '#2563EB';
const KOYU_MAVI = '#1D4ED8';
const ACIK_MAVI = '#E8EFFF';
const KENAR_MAVI = '#DBEAFE';
const ZEMIN = '#FFFFFF';
const SIYAH = '#0B1220';
const GRI = '#4B5563';
const CIZGI = '#E5E7EB';
const YAZI = 'Segoe UI, Arial, Helvetica, sans-serif';

/*
  Logo SVG'ye gömülüyor (dış dosya çözülmüyor). Kaynak olarak public/logo.png
  değil assets/logo-kaynak.png alınıyor: kart üç katı çözünürlükte basıldığı
  için 512 piksellik dosya büyütülüp bulanıklaşıyordu.
*/
const logo64 = fs.readFileSync(path.join(KOK, 'assets', 'logo-kaynak.png')).toString('base64');
const logo = (x, y, boyut) =>
  `<image href="data:image/png;base64,${logo64}" x="${x}" y="${y}" width="${boyut}" height="${boyut}"/>`;

const kacir = (metin) =>
  String(metin).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Tek satır metin. */
const satir = (x, y, metin, { boyut = 32, renk = GRI, kalin = 400, aralik = 0, hiza = 'start' } = {}) =>
  `<text x="${x}" y="${y}" font-family="${YAZI}" font-size="${boyut}" font-weight="${kalin}" fill="${renk}" letter-spacing="${aralik}" text-anchor="${hiza}">${kacir(metin)}</text>`;

const sarmal = (svg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${EN}" height="${BOY}" viewBox="0 0 ${EN} ${BOY}">` +
  `<rect width="${EN}" height="${BOY}" fill="${ZEMIN}"/>${svg}</svg>`;

/*
  ÜST BANT

  Marka, serinin adı ve kaçıncı kartta olduğun. Sayfa numarası süs değil:
  karusel gönderide insan kaç kart olduğunu ancak kaydırınca anlıyor,
  numara baştan söylüyor.
*/
const ustBant = (seri, sayfa) => `
  ${logo(KENAR, 62, 58)}
  ${satir(KENAR + 76, 106, 'StajımVar', { boyut: 32, renk: SIYAH, kalin: 800 })}
  ${satir(KENAR + 240, 106, '|', { boyut: 32, renk: CIZGI, kalin: 400 })}
  ${satir(KENAR + 268, 106, seri, { boyut: 32, renk: MAVI, kalin: 600 })}

  <rect x="${EN - KENAR - 132}" y="66" width="132" height="56" rx="28" fill="${ACIK_MAVI}"/>
  ${satir(EN - KENAR - 66, 105, sayfa, { boyut: 26, renk: MAVI, kalin: 700, hiza: 'middle' })}
`;

/** Başlığı gövdeden ayıran kısa çizgi. */
const ayrac = (y) => `<rect x="${KENAR}" y="${y}" width="96" height="10" rx="5" fill="${MAVI}"/>`;

/**
 * Dev başlık. Satırlar dışarıdan geliyor çünkü Türkçe cümleyi nereden
 * böleceğine ölçü değil anlam karar veriyor.
 */
const baslik = (y, satirlar, { boyut = 88, vurguSatiri = -1 } = {}) =>
  satirlar
    .map((s, i) =>
      satir(KENAR, y + i * Math.round(boyut * 1.18), s, {
        boyut,
        renk: i === vurguSatiri ? MAVI : SIYAH,
        kalin: 800,
      }),
    )
    .join('');

/**
 * Numaralı satır: solda kare rozet, sağında başlık ve tek cümlelik açıklama.
 * İlk sıra dolu mavi, diğerleri açık zeminli — göz nereden başlayacağını
 * bilsin diye.
 */
const siraliSatir = (y, no, ust, alt, { ilk = false } = {}) => `
  <rect x="${KENAR}" y="${y}" width="84" height="84" rx="24" fill="${ilk ? MAVI : ACIK_MAVI}"/>
  ${satir(KENAR + 42, y + 56, no, { boyut: 38, renk: ilk ? '#FFFFFF' : MAVI, kalin: 800, hiza: 'middle' })}
  ${satir(KENAR + 120, y + 40, ust, { boyut: 36, renk: SIYAH, kalin: 800 })}
  ${satir(KENAR + 120, y + 84, alt, { boyut: 27, renk: GRI })}
  <line x1="${KENAR}" y1="${y + 124}" x2="${EN - KENAR}" y2="${y + 124}" stroke="${CIZGI}" stroke-width="2"/>
`;

/** Çıkarım kutusu: kartın söylediğini tek cümlede toparlar. */
const altKutu = (y, satirlar, { zemin = ACIK_MAVI, renk = SIYAH } = {}) => `
  <rect x="${KENAR}" y="${y}" width="${IC_EN}" height="${76 + satirlar.length * 46}" rx="30" fill="${zemin}"/>
  <rect x="${KENAR + 40}" y="${y + 40}" width="56" height="8" rx="4" fill="${MAVI}"/>
  ${satirlar
    .map((s, i) => satir(KENAR + 40, y + 104 + i * 46, s, { boyut: 29, renk, kalin: i === 0 ? 700 : 400 }))
    .join('')}
`;

/*
  KAPAKTAKİ ÇİZİM

  Hazır görsel indirilmiyor: hem hakkı belirsiz görsellerle uğraşmamak hem
  de kartların aynı dilde durması için. Biçim düz — kalın dış çizgi, tek
  renk mavi daire, beyaz yüzey — küçültülünce dağılmıyor. Anlattığı şey
  kartın cümlesiyle aynı: ilan şirketin kendi sayfasında duruyor ve
  başvuru bağlantısı oraya gidiyor.
*/
const ilanCizimi = (y) => `
  <circle cx="806" cy="${y + 186}" r="196" fill="${MAVI}"/>

  <rect x="${KENAR}" y="${y}" width="700" height="372" rx="32" fill="#FFFFFF" stroke="${SIYAH}" stroke-width="7"/>
  <path d="M${KENAR} ${y + 86} h700" stroke="${SIYAH}" stroke-width="7"/>
  <circle cx="${KENAR + 48}" cy="${y + 44}" r="11" fill="${SIYAH}"/>
  <circle cx="${KENAR + 86}" cy="${y + 44}" r="11" fill="${SIYAH}"/>
  <circle cx="${KENAR + 124}" cy="${y + 44}" r="11" fill="${SIYAH}"/>

  <circle cx="${KENAR + 106}" cy="${y + 168}" r="38" fill="${MAVI}"/>
  <rect x="${KENAR + 168}" y="${y + 146}" width="318" height="22" rx="11" fill="${SIYAH}"/>
  <rect x="${KENAR + 168}" y="${y + 182}" width="204" height="16" rx="8" fill="${CIZGI}"/>

  <circle cx="${KENAR + 106}" cy="${y + 280}" r="38" fill="${KENAR_MAVI}"/>
  <rect x="${KENAR + 168}" y="${y + 258}" width="252" height="22" rx="11" fill="${SIYAH}"/>
  <rect x="${KENAR + 168}" y="${y + 294}" width="168" height="16" rx="8" fill="${CIZGI}"/>

  <rect x="${KENAR + 520}" y="${y + 236}" width="170" height="64" rx="32" fill="${MAVI}"/>
  ${satir(KENAR + 605, y + 278, 'Başvur', { boyut: 26, renk: '#FFFFFF', kalin: 800, hiza: 'middle' })}

  <circle cx="878" cy="${y + 24}" r="70" fill="${SIYAH}"/>
  <path d="M846 ${y + 24} l22 24 42 -46" stroke="#FFFFFF" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
`;

const SERI = 'Nasıl çalışır';

/* ------------------------------------------------------------- 1. kapak */

const kapak = () => sarmal(`
  ${ustBant(SERI, '01/03')}

  ${baslik(320, ['İlanları aracı', 'sitelerden değil,', 'şirketin kendi', 'sayfasından.'], { boyut: 88, vurguSatiri: 3 })}

  ${ayrac(690)}

  ${satir(KENAR, 766, 'Her ilanda şirketin kendi başvuru', { boyut: 34, renk: GRI })}
  ${satir(KENAR, 812, 'bağlantısı var; arada kimse yok.', { boyut: 34, renk: GRI })}

  ${ilanCizimi(860)}

  ${altKutu(1254, ['Kaynağı doğrulanmayan kayıt listeye girmiyor.'])}
`);

/* ------------------------------------------------- 2. nasıl derliyoruz */

const nasil = () => sarmal(`
  ${ustBant(SERI, '02/03')}

  ${baslik(316, ['Bir ilan listeye', 'nasıl giriyor?'], { boyut: 88, vurguSatiri: 1 })}

  ${ayrac(482)}

  ${siraliSatir(570, '1', 'Şirketin kariyer sayfası taranır', 'Aracı ilan sitesi kullanılmıyor.', { ilk: true })}
  ${siraliSatir(724, '2', 'Başvuru bağlantısı şirkete gider', 'Başvurunu şirketin kendi sayfasında yaparsın.')}
  ${siraliSatir(878, '3', 'Takvim bilinmiyorsa öyle yazar', '"Takvim bekleniyor" görürsün, uydurma tarih görmezsin.')}
  ${siraliSatir(1032, '4', 'Süresi geçen ilan düşer', 'Eski ilan listede kalmaz.')}

  ${altKutu(1254, ['Her kaydın yanında resmî kaynağı yazılı.'])}
`);

/* --------------------------------------------------- 3. ne bulacaksın */

const neVar = () => sarmal(`
  ${ustBant(SERI, '03/03')}

  ${baslik(316, ['Staj, burs ve', 'yurt dışı — hepsi', 'tek listede.'], { boyut: 84, vurguSatiri: 2 })}

  ${ayrac(600)}

  ${siraliSatir(688, '1', 'Staj ve iş ilanları', 'Şirketin kendi kariyer sayfasından.', { ilk: true })}
  ${siraliSatir(842, '2', 'Burslar ve öğrenci destekleri', 'Vakıf, dernek, belediye ve kurum bursları.')}
  ${siraliSatir(996, '3', 'Yurt dışı programları', 'Erasmus, staj ve araştırma programları.')}

  <rect x="${KENAR}" y="1178" width="${IC_EN}" height="196" rx="30" fill="${MAVI}"/>
  ${satir(KENAR + 44, 1256, 'Yeni ilan ve burslar', { boyut: 34, renk: '#FFFFFF', kalin: 800 })}
  ${satir(KENAR + 44, 1302, 'burada duyurulacak.', { boyut: 34, renk: KENAR_MAVI })}

  <rect x="${EN - KENAR - 344}" y="1240" width="300" height="80" rx="40" fill="#FFFFFF"/>
  ${satir(EN - KENAR - 210, 1292, 'stajimvar.com', { boyut: 28, renk: MAVI, kalin: 800, hiza: 'middle' })}
  <path d="M${EN - KENAR - 106} 1280 h30 M${EN - KENAR - 84} 1268 l14 12 -14 12" stroke="${MAVI}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
`);

/* ----------------------------------------------------------------- yaz */

/*
  DOSYA ADINDA TASARIM SÜRÜMÜ

  Instagram gönderiyi yayınlarken görseli KENDİ indiriyor ve indirdiğini
  adrese göre saklıyor. Kart yeniden tasarlanıp aynı ada yazıldığında
  Instagram yeni dosyayı almıyor: gönderide eski kart çıkıyor. 3:4'e
  geçilen gönderide ilk kart tam bu yüzden eski kaldı.

  Bu yüzden tasarım her değiştiğinde SURUM artıyor, adres yeni oluyor ve
  eski dosyalar siliniyor. Yayınlanmış gönderiler Instagram'ın kendi
  kopyasını gösterdiği için onlar etkilenmiyor.

  Aynı kural dosyanın içeriği başka bir sebeple değişince de geçerli:
  görselin basım kalitesi yükseltildiğinde sürüm artırıldı, çünkü hem
  Instagram hem de bizim kenar önbelleğimiz o adresin eski baytlarını
  tutuyor olabilir.

  SURUM değişince src/components/AdminInstagramView.tsx içindeki adresler
  de güncellenmeli.
*/
const SURUM = 'v4';

const KARTLAR = [
  [`01-kapak-${SURUM}.jpg`, kapak()],
  [`02-nasil-giriyor-${SURUM}.jpg`, nasil()],
  [`03-ne-var-${SURUM}.jpg`, neVar()],
];

fs.mkdirSync(HEDEF, { recursive: true });

// Eski sürümler siliniyor: dağıtılan klasörde ölü dosya bırakmamak için.
for (const eski of fs.readdirSync(HEDEF)) {
  if (eski.endsWith('.jpg') && !KARTLAR.some(([ad]) => ad === eski)) {
    fs.rmSync(path.join(HEDEF, eski));
    console.log(`${eski.padEnd(26)} silindi (eski sürüm)`);
  }
}

/*
  KALİTE: ÖNCE BÜYÜK BAS, SONRA KÜÇÜLT

  Kart doğrudan hedef ölçüde basılınca yazı kenarları tek geçişte
  yumuşatılıyor ve harfler pütürlü çıkıyor. Bunun yerine SVG üç katı
  çözünürlükte (3240x4320) basılıyor, sonra lanczos ile 1440'a indiriliyor:
  her son piksel birden çok pikselin ortalaması oluyor ve kenarlar temiz
  kalıyor.

  JPEG tarafında iki ayar önemli:
    * chromaSubsampling 4:4:4 — varsayılan 4:2:0 renk bilgisini yarıya
      düşürüyor ve beyaz zemindeki MAVİ yazının kenarını bulandırıyor.
      Kartların yarısı mavi yazı olduğu için en çok fark ettiren ayar bu.
    * kalite 96 + mozjpeg — düz zeminlerde halka izi bırakmıyor.

  Instagram görseli kendi tarafında yeniden sıkıştırıyor; elimizden çıkanın
  temiz olması o sıkıştırmanın neyi bozacağını da belirliyor.
*/
const OLCEK = 3;

for (const [ad, svg] of KARTLAR) {
  const buyuk = await sharp(Buffer.from(svg), { density: 72 * OLCEK }).png().toBuffer();

  /*
    JPEG: Instagram gönderi görselini JPEG olarak istiyor; PNG yüklenen
    kapsayıcılar "media type" hatası veriyor.
  */
  const veri = await sharp(buyuk)
    .resize(CIKTI_EN, CIKTI_BOY, { kernel: 'lanczos3' })
    .jpeg({ quality: 96, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();

  fs.writeFileSync(path.join(HEDEF, ad), veri);
  const olcu = await sharp(veri).metadata();
  console.log(`${ad.padEnd(26)} ${olcu.width}x${olcu.height}  ${(veri.length / 1024).toFixed(0)} KB`);
}

console.log(`\n${KARTLAR.length} kart yazıldı -> public/paylasim/`);
