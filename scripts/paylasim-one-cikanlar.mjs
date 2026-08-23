/**
 * Öne çıkan hikâye kapaklarını ve gönderi kartlarının hikâye sürümlerini üretir.
 *
 * NEDEN
 * -----
 * Profildeki öne çıkanlar boş gri halka olarak duruyordu: tıklayan kişi
 * boşluk görüyor, bu güven kaybı. Öne çıkan kurmak iki parça istiyor —
 * kapak görseli ve içine konacak en az bir hikâye.
 *
 * KAPAK NASIL KIRPILIYOR
 * ----------------------
 * Instagram kapağı 1080x1920 hikâye görselinin ORTASINDAN dairesel kırpıyor
 * ve profilde ~90 piksel çapında gösteriyor. Bu yüzden kapaklarda yazı yok,
 * yalnız ortalanmış tek bir simge var: o boyutta okunacak yazı yok.
 *
 * HİKÂYE SÜRÜMÜ
 * -------------
 * Gönderi kartları 3:4; hikâye 9:16. Kart yeniden çizilmiyor, mavi zeminin
 * ortasına oturtuluyor — hem kırpılmıyor hem gönderiyle aynı görünüyor.
 *
 * Kullanım:
 *   node scripts/paylasim-one-cikanlar.mjs            (kapaklar)
 *   node scripts/paylasim-one-cikanlar.mjs nasil-calisir   (o setin hikâyeleri)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { KOYU_MAVI, MAVI, PAYLASIM } from './paylasim-sablonu.mjs';

/*
  ÇERÇEVE KARTIN RENGİNE GÖRE SEÇİLİYOR

  Hikâye çerçevesi sabit maviydi. Beyaz kartlarda iyi çalışıyordu — kontrast
  var, kart çerçevenin üstünde duruyor. Ama karuselin son kartı tam mavi:
  mavi zemine oturunca kenarı kayboluyor ve geriye ortada asılı bir yazı
  bloğuyla iki boş bant kalıyor.

  Çözüm kartın köşe rengini ölçmek: koyu kartlar açık çerçeveye, açık
  kartlar mavi çerçeveye oturuyor. Kartın altına yumuşak bir gölge de
  konuyor; kenar her iki durumda da belli oluyor.
*/
const ACIK_CERCEVE = '#EEF2F8';

async function cerceveRengi(dosya) {
  const { data } = await sharp(dosya).extract({ left: 0, top: 0, width: 64, height: 64 }).raw().toBuffer({ resolveWithObject: true });
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < data.length; i += 3) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const adet = data.length / 3;
  const parlaklik = (0.2126 * (r / adet) + 0.7152 * (g / adet) + 0.0722 * (b / adet)) / 255;
  return parlaklik < 0.6 ? ACIK_CERCEVE : MAVI;
}

const HIKAYE_EN = 1080;
const HIKAYE_BOY = 1920;

const basim = async (svg, hedef) => {
  const buyuk = await sharp(Buffer.from(svg), { density: 216 }).png().toBuffer();
  const veri = await sharp(buyuk)
    .resize(HIKAYE_EN, HIKAYE_BOY, { kernel: 'lanczos3' })
    .jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();
  fs.writeFileSync(hedef, veri);
  console.log(`  ${path.basename(hedef)}  ${HIKAYE_EN}x${HIKAYE_BOY}  ${(veri.length / 1024).toFixed(0)} KB`);
};

/* --------------------------------------------------------------- simgeler */

/* Simgeler tek renk beyaz ve kalın: 90 piksellik dairede ince çizgi kayboluyor. */
const mezuniyet = `
  <path d="M0 -46 L96 -6 L0 34 L-96 -6 Z" fill="#FFFFFF"/>
  <path d="M-56 6 v46 c0 26 112 26 112 0 v-46" fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round"/>
  <path d="M84 -1 v58" fill="none" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round"/>
`;

const canta = `
  <rect x="-96" y="-34" width="192" height="128" rx="24" fill="#FFFFFF"/>
  <path d="M-40 -34 v-24 a18 18 0 0 1 18 -18 h44 a18 18 0 0 1 18 18 v24" fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round"/>
  <rect x="-18" y="12" width="36" height="26" rx="8" fill="${MAVI}"/>
`;

const onay = `
  <circle cx="0" cy="0" r="88" fill="none" stroke="#FFFFFF" stroke-width="18"/>
  <path d="M-40 2 l28 30 54 -62" fill="none" stroke="#FFFFFF" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
`;

const soru = `
  <path d="M-40 -30 a40 40 0 1 1 40 46 v16" fill="none" stroke="#FFFFFF" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="0" cy="74" r="13" fill="#FFFFFF"/>
`;

const kapak = (simge) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${HIKAYE_EN}" height="${HIKAYE_BOY}" viewBox="0 0 ${HIKAYE_EN} ${HIKAYE_BOY}">
    <rect width="${HIKAYE_EN}" height="${HIKAYE_BOY}" fill="${MAVI}"/>
    <circle cx="900" cy="360" r="420" fill="${KOYU_MAVI}" opacity="0.5"/>
    <circle cx="120" cy="1620" r="460" fill="${KOYU_MAVI}" opacity="0.5"/>
    <!-- Simge ölçeği: kapak profilde ~90 piksellik daire olarak görünüyor,
         1080'lik tuvalde küçük duran simge orada nokta kalıyor. -->
    <g transform="translate(540 960) scale(1.7)">${simge}</g>
  </svg>
`;

const KAPAKLAR = [
  ['burslar', mezuniyet],
  ['staj', canta],
  ['nasil-calisir', onay],
  ['sss', soru],
];

/* ------------------------------------------------- setin hikâye sürümleri */

async function hikayeleriYap(kod) {
  const kaynak = path.join(PAYLASIM, kod);
  if (!fs.existsSync(kaynak)) {
    console.error(`Set bulunamadı: ${kod}`);
    process.exit(1);
  }
  const hedefKlasor = path.join(PAYLASIM, 'hikaye', kod);
  fs.mkdirSync(hedefKlasor, { recursive: true });

  const kartlar = fs.readdirSync(kaynak).filter((d) => d.endsWith('.jpg')).sort();
  console.log(`${kod} — ${kartlar.length} kart hikâyeye çevriliyor`);

  for (const ad of kartlar) {
    /*
      Kart 3:4, hikâye 9:16. Kart genişliği hikâyenin %92'sine oturuyor:
      kenarlarda mavi bant kalıyor ve Instagram'ın üstteki/alttaki arayüz
      öğeleri kartın yazısını kapatmıyor.
    */
    const en = Math.round(HIKAYE_EN * 0.92);
    const boy = Math.round((en * 4) / 3);
    const sol = Math.round((HIKAYE_EN - en) / 2);
    const ust = Math.round((HIKAYE_BOY - boy) / 2);

    const zemin = await cerceveRengi(path.join(kaynak, ad));
    const kart = await sharp(path.join(kaynak, ad)).resize(en, boy).toBuffer();
    const yuvarlak = await sharp(kart)
      .composite([
        {
          input: Buffer.from(`<svg width="${en}" height="${boy}"><rect width="${en}" height="${boy}" rx="36" fill="#fff"/></svg>`),
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer();

    // Gölge: kartın kenarını çerçeveden ayırıyor, ikisi aynı aileden renk olsa bile.
    const golge = Buffer.from(
      `<svg width="${HIKAYE_EN}" height="${HIKAYE_BOY}">` +
        `<defs><filter id="g" x="-20%" y="-20%" width="140%" height="140%">` +
        `<feGaussianBlur stdDeviation="26"/></filter></defs>` +
        `<rect x="${sol}" y="${ust + 14}" width="${en}" height="${boy}" rx="36" fill="#0B1220" opacity="0.28" filter="url(#g)"/></svg>`,
    );

    const veri = await sharp({
      create: { width: HIKAYE_EN, height: HIKAYE_BOY, channels: 3, background: zemin },
    })
      .composite([
        { input: await sharp(golge).png().toBuffer(), left: 0, top: 0 },
        { input: yuvarlak, left: sol, top: ust },
      ])
      .jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer();

    const hedef = path.join(hedefKlasor, ad);
    fs.writeFileSync(hedef, veri);
    console.log(`  ${ad}  ${HIKAYE_EN}x${HIKAYE_BOY}  ${(veri.length / 1024).toFixed(0)} KB`);
  }
  console.log(`\nHikâyeler -> public/paylasim/hikaye/${kod}/`);
}

const istenen = process.argv[2];

if (istenen) {
  await hikayeleriYap(istenen);
} else {
  const klasor = path.join(PAYLASIM, 'one-cikanlar');
  fs.mkdirSync(klasor, { recursive: true });
  console.log('Öne çıkan kapakları');
  for (const [ad, simge] of KAPAKLAR) {
    await basim(kapak(simge), path.join(klasor, `${ad}.jpg`));
  }
  console.log('\nKapaklar -> public/paylasim/one-cikanlar/');
}
