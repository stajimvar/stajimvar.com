/**
 * Instagram gönderi kartlarının ortak şablonu.
 *
 * NEDEN AYRI MODÜL
 * ----------------
 * Bir ay boyunca düzenli paylaşım yapmak, her gönderide yeniden tasarım
 * yapmakla mümkün değil. Tasarım burada bir kez duruyor; gönderi üreten
 * betikler (instagram-kartlari.mjs, paylasim-burs-takvimi.mjs) yalnızca
 * metni ve satırları veriyor. Böylece yeni gönderi türü açmak tasarım işi
 * değil, veri dizme işi oluyor.
 *
 * KARTIN İSKELETİ
 * ---------------
 *   üst bant   — marka, serinin adı, kaçıncı kart (01/03)
 *   başlık     — dev punto, son satırı mavi
 *   ayraç      — başlığı gövdeden ayıran kısa çizgi
 *   gövde      — numaralı satırlar ya da çizim
 *   alt kutu   — kartın söylediğini toparlayan çıkarım / çağrı
 *
 * ÖLÇÜ VE KALİTE KARARLARI
 * ------------------------
 * Kart 3:4 (1080x1440 koordinat sisteminde kurulu). Instagram'ın profil
 * ızgarası artık kare değil, 3:4 dikey: kare kart orada kenarlarından
 * kesiliyordu. Dosya 1440x1920 basılıyor çünkü Instagram yüksek yoğunluklu
 * ekranlara 1440 piksele kadar servis ediyor.
 *
 * Basım önce üç katı çözünürlükte yapılıp lanczos ile indiriliyor: tek
 * geçişte basılan yazının kenarları pütürlü çıkıyor. JPEG'de renk alt
 * örneklemesi 4:4:4 — varsayılan 4:2:0, beyaz zemindeki mavi yazıyı
 * bulandırıyor ve kartların yarısı mavi yazı.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import sharp from 'sharp';

export const KOK = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
export const PAYLASIM = path.join(KOK, 'public', 'paylasim');

export const EN = 1080;
export const BOY = 1440;
const CIKTI_EN = 1440;
const CIKTI_BOY = 1920;
const OLCEK = 3;

export const KENAR = 64;
export const IC_EN = EN - KENAR * 2;

export const MAVI = '#2563EB';
export const KOYU_MAVI = '#1D4ED8';
export const ACIK_MAVI = '#E8EFFF';
export const KENAR_MAVI = '#DBEAFE';
/*
  Mavi zeminde vurgu için ayrı ton: KENAR_MAVI (#DBEAFE) mavinin üstünde
  beyazdan ayrışmıyor, üç satırlık başlığın son satırı beyaz görünüyordu.
*/
export const VURGU_MAVI = '#93C5FD';
export const ZEMIN = '#FFFFFF';
export const SIYAH = '#0B1220';
export const GRI = '#4B5563';
export const CIZGI = '#E5E7EB';
const YAZI = 'Segoe UI, Arial, Helvetica, sans-serif';

/*
  Logo SVG'ye gömülüyor (dış dosya çözülmüyor). Kaynak public/logo.png değil
  assets/logo-kaynak.png: kart üç katı çözünürlükte basıldığı için 512
  piksellik dosya büyütülüp bulanıklaşıyordu.
*/
const logo64 = fs.readFileSync(path.join(KOK, 'assets', 'logo-kaynak.png')).toString('base64');
export const logo = (x, y, boyut) =>
  `<image href="data:image/png;base64,${logo64}" x="${x}" y="${y}" width="${boyut}" height="${boyut}"/>`;

export const kacir = (metin) =>
  String(metin).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Tek satır metin. */
export const satir = (x, y, metin, { boyut = 32, renk = GRI, kalin = 400, aralik = 0, hiza = 'start' } = {}) =>
  `<text x="${x}" y="${y}" font-family="${YAZI}" font-size="${boyut}" font-weight="${kalin}" fill="${renk}" letter-spacing="${aralik}" text-anchor="${hiza}">${kacir(metin)}</text>`;

export const sarmal = (svg, zemin = ZEMIN) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${EN}" height="${BOY}" viewBox="0 0 ${EN} ${BOY}">` +
  `<rect width="${EN}" height="${BOY}" fill="${zemin}"/>${svg}</svg>`;

/*
  ÜST BANT

  Marka, serinin adı ve kaçıncı kartta olduğun. Sayfa numarası süs değil:
  karusel gönderide insan kaç kart olduğunu ancak kaydırınca anlıyor,
  numara baştan söylüyor.
*/
export const ustBant = (seri, sayfa, { koyu = false } = {}) => `
  ${logo(KENAR, 62, 58)}
  ${satir(KENAR + 76, 106, 'StajımVar', { boyut: 32, renk: koyu ? '#FFFFFF' : SIYAH, kalin: 800 })}
  ${satir(KENAR + 240, 106, '|', { boyut: 32, renk: koyu ? KOYU_MAVI : CIZGI })}
  ${satir(KENAR + 268, 106, seri, { boyut: 32, renk: koyu ? KENAR_MAVI : MAVI, kalin: 600 })}

  <rect x="${EN - KENAR - 132}" y="66" width="132" height="56" rx="28" fill="${koyu ? KOYU_MAVI : ACIK_MAVI}"/>
  ${satir(EN - KENAR - 66, 105, sayfa, { boyut: 26, renk: koyu ? '#FFFFFF' : MAVI, kalin: 700, hiza: 'middle' })}
`;

/** Başlığı gövdeden ayıran kısa çizgi. */
export const ayrac = (y, renk = MAVI) => `<rect x="${KENAR}" y="${y}" width="96" height="10" rx="5" fill="${renk}"/>`;

/**
 * Dev başlık. Satırlar dışarıdan geliyor çünkü Türkçe cümleyi nereden
 * böleceğine ölçü değil anlam karar veriyor.
 */
export const baslik = (y, satirlar, { boyut = 88, vurguSatiri = -1, renk = SIYAH, vurguRengi = MAVI } = {}) =>
  satirlar
    .map((s, i) =>
      satir(KENAR, y + i * Math.round(boyut * 1.18), s, {
        boyut,
        renk: i === vurguSatiri ? vurguRengi : renk,
        kalin: 800,
      }),
    )
    .join('');

/**
 * Numaralı satır: solda kare rozet, sağında başlık ve tek cümlelik açıklama.
 * İlk sıra dolu mavi, diğerleri açık zeminli — göz nereden başlayacağını
 * bilsin diye.
 */
export const siraliSatir = (y, no, ust, alt, { ilk = false } = {}) => `
  <rect x="${KENAR}" y="${y}" width="84" height="84" rx="24" fill="${ilk ? MAVI : ACIK_MAVI}"/>
  ${satir(KENAR + 42, y + 56, no, { boyut: 38, renk: ilk ? '#FFFFFF' : MAVI, kalin: 800, hiza: 'middle' })}
  ${satir(KENAR + 120, y + 40, ust, { boyut: 36, renk: SIYAH, kalin: 800 })}
  ${satir(KENAR + 120, y + 84, alt, { boyut: 27, renk: GRI })}
  <line x1="${KENAR}" y1="${y + 124}" x2="${EN - KENAR}" y2="${y + 124}" stroke="${CIZGI}" stroke-width="2"/>
`;

/**
 * Tarihli satır: solda kurum ve program, sağda son başvuru rozeti.
 * Burs takvimi gönderilerinin gövdesi bu.
 */
export const tarihliSatir = (y, kurum, program, tarih, { yakin = false } = {}) => `
  ${satir(KENAR, y + 40, kurum, { boyut: 34, renk: SIYAH, kalin: 800 })}
  ${satir(KENAR, y + 84, program, { boyut: 26, renk: GRI })}

  <rect x="${EN - KENAR - 232}" y="${y + 12}" width="232" height="64" rx="32" fill="${yakin ? MAVI : ACIK_MAVI}"/>
  ${satir(EN - KENAR - 116, y + 54, tarih, { boyut: 28, renk: yakin ? '#FFFFFF' : MAVI, kalin: 800, hiza: 'middle' })}

  <line x1="${KENAR}" y1="${y + 124}" x2="${EN - KENAR}" y2="${y + 124}" stroke="${CIZGI}" stroke-width="2"/>
`;

/** Çıkarım kutusu: kartın söylediğini tek cümlede toparlar. */
export const altKutu = (y, satirlar, { zemin = ACIK_MAVI, renk = SIYAH, cizgi = MAVI } = {}) => `
  <rect x="${KENAR}" y="${y}" width="${IC_EN}" height="${76 + satirlar.length * 46}" rx="30" fill="${zemin}"/>
  <rect x="${KENAR + 40}" y="${y + 40}" width="56" height="8" rx="4" fill="${cizgi}"/>
  ${satirlar
    .map((s, i) => satir(KENAR + 40, y + 104 + i * 46, s, { boyut: 29, renk, kalin: i === 0 ? 700 : 400 }))
    .join('')}
`;

/** Son kartın mavi çağrı kutusu. */
export const cagriKutusu = (y, ustSatir, altSatir) => `
  <rect x="${KENAR}" y="${y}" width="${IC_EN}" height="196" rx="30" fill="${MAVI}"/>
  ${satir(KENAR + 44, y + 78, ustSatir, { boyut: 34, renk: '#FFFFFF', kalin: 800 })}
  ${satir(KENAR + 44, y + 124, altSatir, { boyut: 34, renk: KENAR_MAVI })}

  <rect x="${EN - KENAR - 344}" y="${y + 62}" width="300" height="80" rx="40" fill="#FFFFFF"/>
  ${satir(EN - KENAR - 210, y + 114, 'stajimvar.com', { boyut: 28, renk: MAVI, kalin: 800, hiza: 'middle' })}
  <path d="M${EN - KENAR - 106} ${y + 102} h30 M${EN - KENAR - 84} ${y + 90} l14 12 -14 12" stroke="${MAVI}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
`;

/**
 * Kapanış kartı — diğer kartlarla aynı beyaz zemin.
 *
 * Önce tam mavi bir kart vardı. İki sorunu çıktı: karuselin sonunda düzeni
 * bölüyordu ve mavi kart hikâye setine giremediği için (mavi kart mavi
 * zeminde kayboluyor) her set için ayrı bir kapanış çizmek gerekiyordu.
 * Tek beyaz kapanış ikisini de çözüyor: gönderi bütün duruyor, aynı kart
 * hikâyeye de giriyor.
 *
 * Çağrı yine mavi — ama kartın tamamı değil, altındaki kutu.
 */
export const kapanisKarti = ({ seri, sayfa, satirlar, vurguSatiri = satirlar.length - 1, altSatirlar = [], kutu = [] }) =>
  sarmal(`
  ${ustBant(seri, sayfa)}

  ${baslik(330, satirlar, { boyut: satirlar.some((x) => x.length > 16) ? 84 : 92, vurguSatiri })}

  ${ayrac(700)}

  ${altSatirlar.map((x, i) => satir(KENAR, 782 + i * 46, x, { boyut: 34, renk: GRI })).join('')}

  ${kutu.length ? altKutu(920, kutu) : ''}

  ${cagriKutusu(1178, 'Tüm liste ve', 'başvuru bağlantıları:')}
`);

/*
  HİKÂYE SÜRÜMÜ — ÇERÇEVELİ TEMA

  Gönderi kartı (3:4) mavi hikâye zeminine oturtuluyor ve altına yumuşak
  gölge konuyor. Tema canlı hesapta denendi ve onaylandı; başka bir düzen
  aranmıyor.

  Kart genişliği hikâyenin %92'sine oturuyor: üstte ilerleme çubuğu, altta
  yanıt kutusu var ve kalan bant kartın yazısını onlardan uzak tutuyor.

  TAM MAVİ KARTLAR HİKÂYEYE GİRMİYOR: mavi kart mavi zeminde kayboluyor,
  açık zemine alındığında da temanın dışına düşüyor. Karuselin mavi kapanış
  kartı gönderide duruyor, hikâyede yok.
*/
const HIKAYE_EN = 1080;
const HIKAYE_BOY = 1920;

async function acikZeminliMi(veri) {
  const { data } = await sharp(veri).extract({ left: 0, top: 0, width: 64, height: 64 }).raw().toBuffer({ resolveWithObject: true });
  let toplam = 0;
  for (let i = 0; i < data.length; i += 3) {
    toplam += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  return toplam / (data.length / 3) / 255 >= 0.6;
}

async function hikayeleriYaz(kod, kartVerileri) {
  const klasor = path.join(PAYLASIM, 'hikaye', kod);
  fs.mkdirSync(klasor, { recursive: true });

  const en = Math.round(HIKAYE_EN * 0.92);
  const boy = Math.round((en * 4) / 3);
  const sol = Math.round((HIKAYE_EN - en) / 2);
  const ust = Math.round((HIKAYE_BOY - boy) / 2);

  const golge = await sharp(
    Buffer.from(
      `<svg width="${HIKAYE_EN}" height="${HIKAYE_BOY}">` +
        `<defs><filter id="g" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="26"/></filter></defs>` +
        `<rect x="${sol}" y="${ust + 14}" width="${en}" height="${boy}" rx="36" fill="#0B1220" opacity="0.28" filter="url(#g)"/></svg>`,
    ),
  )
    .png()
    .toBuffer();

  const yazilan = [];
  for (const kartVeri of kartVerileri) {
    if (!(await acikZeminliMi(kartVeri))) continue;

    const kart = await sharp(kartVeri).resize(en, boy).toBuffer();
    const yuvarlak = await sharp(kart)
      .composite([
        {
          input: Buffer.from(`<svg width="${en}" height="${boy}"><rect width="${en}" height="${boy}" rx="36" fill="#fff"/></svg>`),
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer();

    const veri = await sharp({ create: { width: HIKAYE_EN, height: HIKAYE_BOY, channels: 3, background: MAVI } })
      .composite([
        { input: golge, left: 0, top: 0 },
        { input: yuvarlak, left: sol, top: ust },
      ])
      .jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer();

    const ad = `${String(yazilan.length + 1).padStart(2, '0')}.jpg`;
    fs.writeFileSync(path.join(klasor, ad), veri);
    yazilan.push(ad);
    console.log(`  hikaye/${kod}/${ad}  ${HIKAYE_EN}x${HIKAYE_BOY}  ${(veri.length / 1024).toFixed(0)} KB`);
  }

  for (const eski of fs.readdirSync(klasor)) {
    if (eski.endsWith('.jpg') && !yazilan.includes(eski)) fs.rmSync(path.join(klasor, eski));
  }
  return yazilan.map((a) => `/paylasim/hikaye/${kod}/${a}`);
}

/**
 * Kart setini JPEG olarak yazar ve setler.json'a işler.
 *
 * Yönetim ekranı yayınlanacak kartları bu dosyadan okuyor: yeni bir gönderi
 * türü eklemek için arayüzde kod değiştirmek gerekmiyor.
 *
 * Dosya adında sürüm var. Instagram gönderiyi yayınlarken görseli KENDİ
 * indiriyor ve indirdiğini adrese göre saklıyor; aynı ada yazılan yeni
 * tasarımı almıyor, gönderide eski kart çıkıyor. Sürüm artınca adres de
 * değişiyor.
 */
export async function setiYaz({ kod, ad, surum, metin, kartlar, hikayeEk = [] }) {
  const klasor = path.join(PAYLASIM, kod);
  fs.mkdirSync(klasor, { recursive: true });

  const adlar = kartlar.map((_, i) => `${String(i + 1).padStart(2, '0')}-${surum}.jpg`);

  // Eski sürümler siliniyor: dağıtılan klasörde ölü dosya bırakmamak için.
  for (const eski of fs.readdirSync(klasor)) {
    if (eski.endsWith('.jpg') && !adlar.includes(eski)) {
      fs.rmSync(path.join(klasor, eski));
      console.log(`  ${eski} silindi (eski sürüm)`);
    }
  }

  const tamponlar = [];
  for (let i = 0; i < kartlar.length; i++) {
    const buyuk = await sharp(Buffer.from(kartlar[i]), { density: 72 * OLCEK }).png().toBuffer();
    /*
      JPEG: Instagram gönderi görselini JPEG olarak istiyor; PNG yüklenen
      kapsayıcılar "media type" hatası veriyor.
    */
    const veri = await sharp(buyuk)
      .resize(CIKTI_EN, CIKTI_BOY, { kernel: 'lanczos3' })
      .jpeg({ quality: 96, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer();
    fs.writeFileSync(path.join(klasor, adlar[i]), veri);
    tamponlar.push(veri);
    console.log(`  ${adlar[i]}  ${CIKTI_EN}x${CIKTI_BOY}  ${(veri.length / 1024).toFixed(0)} KB`);
  }

  /*
    Hikâyeye özel kartlar gönderi klasörüne YAZILMIYOR. Karuselin kapanışı
    mavi kart; hikâye setine mavi kart girmediği için hikâyenin kendi
    kapanışı ayrı çiziliyor ve yalnız hikâye klasörüne düşüyor.
  */
  for (const ekKart of hikayeEk) {
    const buyuk = await sharp(Buffer.from(ekKart), { density: 72 * OLCEK }).png().toBuffer();
    tamponlar.push(
      await sharp(buyuk)
        .resize(CIKTI_EN, CIKTI_BOY, { kernel: 'lanczos3' })
        .jpeg({ quality: 96, mozjpeg: true, chromaSubsampling: '4:4:4' })
        .toBuffer(),
    );
  }

  const hikayeler = await hikayeleriYaz(kod, tamponlar);

  const kunye = path.join(PAYLASIM, 'setler.json');
  const setler = fs.existsSync(kunye) ? JSON.parse(fs.readFileSync(kunye, 'utf8')) : [];
  const kayit = {
    kod,
    ad,
    surum,
    guncellendi: new Date().toISOString().slice(0, 10),
    metin,
    kartlar: adlar.map((a) => `/paylasim/${kod}/${a}`),
    hikayeler,
  };
  const sira = setler.findIndex((s) => s.kod === kod);
  if (sira >= 0) setler[sira] = kayit;
  else setler.push(kayit);
  fs.writeFileSync(kunye, JSON.stringify(setler, null, 2) + '\n');

  console.log(`\n${kartlar.length} kart yazıldı -> public/paylasim/${kod}/ (setler.json güncellendi)`);
  return kayit;
}
