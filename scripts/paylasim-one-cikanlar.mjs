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

    const veri = await sharp({
      create: { width: HIKAYE_EN, height: HIKAYE_BOY, channels: 3, background: MAVI },
    })
      .composite([{ input: yuvarlak, left: Math.round((HIKAYE_EN - en) / 2), top: Math.round((HIKAYE_BOY - boy) / 2) }])
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
