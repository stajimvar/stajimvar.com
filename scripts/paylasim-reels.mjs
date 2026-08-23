/**
 * Bir gönderi setinden Reels videosu üretir (1080x1920, ~12 sn).
 *
 * NEDEN VİDEO
 * -----------
 * Aynı içerik karusel olarak da duruyor, ama Instagram şu an videoyu
 * karuselden çok daha geniş kitleye gösteriyor. Kartlar zaten hazır;
 * onları hareketlendirmek yeni içerik üretmekten ucuz.
 *
 * YAPAY ZEKÂ VİDEOSU DEĞİL
 * ------------------------
 * Burada görüntü sentezlenmiyor. Elimizdeki hikâye kartları kare kare
 * ölçeklenip birbirine geçiriliyor — yani bizim tasarımımızın hareketlisi.
 * Sinematik klip isteniyorsa o ayrı bir iş ve ayrı bir araç.
 *
 * KARELER SHARP İLE, KODLAMA FFMPEG İLE
 * -------------------------------------
 * Hareketi ffmpeg süzgeçleriyle (zoompan/xfade) kurmak da mümkündü ama
 * kontrolü zor ve duran görüntüde titriyor. Kareler burada tek tek
 * çiziliyor: yavaş yakınlaşma, kartlar arası çapraz geçiş ve üstte ilerleme
 * çubuğu. ffmpeg yalnızca kareleri videoya çeviriyor.
 *
 * SESSİZ AMA SES İZLİ
 * -------------------
 * Videoya sessiz bir ses izi ekleniyor. Ses izi olmayan dosyalar bazı
 * yükleme akışlarında reddediliyor; müziği Instagram'da üstüne eklemek
 * zaten daha iyi çünkü uygulama içinden seçilen ses erişime yardım ediyor.
 *
 * Kullanım: node scripts/paylasim-reels.mjs <set-kodu>
 *   örn: node scripts/paylasim-reels.mjs staj-cv
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';
import { KOK, MAVI, PAYLASIM } from './paylasim-sablonu.mjs';

const EN = 1080;
const BOY = 1920;
const FPS = 30;
const KART_SANIYE = 3.2;
const GECIS_SANIYE = 0.45;
const YAKINLASMA = 0.06; // kart boyunca toplam büyüme oranı

const kod = process.argv[2];
if (!kod) {
  console.error('Kullanım: node scripts/paylasim-reels.mjs <set-kodu>');
  process.exit(1);
}

const kaynak = path.join(PAYLASIM, 'hikaye', kod);
if (!fs.existsSync(kaynak)) {
  console.error(`Hikâye kartları bulunamadı: public/paylasim/hikaye/${kod}/`);
  process.exit(1);
}

const kartlar = fs.readdirSync(kaynak).filter((d) => d.endsWith('.jpg')).sort().map((d) => path.join(kaynak, d));
if (kartlar.length < 2) {
  console.error('En az iki kart gerekiyor.');
  process.exit(1);
}

const kartKare = Math.round(KART_SANIYE * FPS);
const gecisKare = Math.round(GECIS_SANIYE * FPS);
const toplamKare = kartlar.length * kartKare - (kartlar.length - 1) * gecisKare;

/**
 * Kartın belirli bir andaki hâli: yavaşça yakınlaşmış ve ortalanmış.
 * Yakınlaşma videoyu "duran resim" olmaktan çıkarıyor; oran küçük tutuldu,
 * yazı bulanıklaşmasın diye kaynak zaten hedeften büyük ölçekleniyor.
 */
async function kare(dosya, ilerleme) {
  const olcek = 1 + YAKINLASMA * ilerleme;
  const genis = Math.round(EN * olcek);
  const yuksek = Math.round(BOY * olcek);
  return sharp(dosya)
    .resize(genis, yuksek)
    .extract({
      left: Math.round((genis - EN) / 2),
      top: Math.round((yuksek - BOY) / 2),
      width: EN,
      height: BOY,
    })
    .toBuffer();
}

/** Üstte ince ilerleme çubuğu: videonun ne kadarının kaldığını gösteriyor. */
const cubuk = (oran) =>
  Buffer.from(
    `<svg width="${EN}" height="12"><rect width="${EN}" height="12" fill="#FFFFFF" opacity="0.35"/>` +
      `<rect width="${Math.round(EN * oran)}" height="12" fill="${MAVI}"/></svg>`,
  );

const gecici = fs.mkdtempSync(path.join(os.tmpdir(), 'reels-'));
console.log(`${kartlar.length} kart, ${(toplamKare / FPS).toFixed(1)} sn, ${toplamKare} kare çiziliyor…`);

for (let k = 0; k < toplamKare; k++) {
  // Bu karede hangi kart(lar) görünüyor?
  const adim = kartKare - gecisKare;
  const sira = Math.min(kartlar.length - 1, Math.floor(k / adim));
  const kartIci = k - sira * adim;
  const ilerleme = Math.min(1, kartIci / kartKare);

  let govde = await kare(kartlar[sira], ilerleme);

  /*
    Geçiş: kartın son karelerinde bir sonraki kart artan saydamsızlıkla
    üstüne biniyor. Sert kesme, okunan bir kartı bıçak gibi kesiyordu.
  */
  const gecisBaslangici = kartKare - gecisKare;
  if (sira < kartlar.length - 1 && kartIci >= gecisBaslangici) {
    const oran = (kartIci - gecisBaslangici) / gecisKare;
    const sonraki = await kare(kartlar[sira + 1], 0);
    const saydam = await sharp(sonraki).ensureAlpha(oran).png().toBuffer();
    govde = await sharp(govde).composite([{ input: saydam }]).toBuffer();
  }

  const tam = await sharp(govde)
    .composite([{ input: await sharp(cubuk(k / (toplamKare - 1))).png().toBuffer(), top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toBuffer();

  fs.writeFileSync(path.join(gecici, `${String(k).padStart(5, '0')}.jpg`), tam);
  if (k % 60 === 0) process.stdout.write(`  ${k}/${toplamKare}\r`);
}

const hedefKlasor = path.join(PAYLASIM, 'reels');
fs.mkdirSync(hedefKlasor, { recursive: true });
const hedef = path.join(hedefKlasor, `${kod}.mp4`);

execFileSync(
  ffmpeg,
  [
    '-y',
    '-framerate', String(FPS),
    '-i', path.join(gecici, '%05d.jpg'),
    // Sessiz ses izi: bazı yükleme akışları ses izi olmayan dosyayı reddediyor.
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-shortest',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '96k',
    '-movflags', '+faststart',
    hedef,
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);

fs.rmSync(gecici, { recursive: true, force: true });

const boyut = fs.statSync(hedef).size;
console.log(`\n${path.relative(KOK, hedef)}  ${EN}x${BOY}  ${(toplamKare / FPS).toFixed(1)} sn  ${(boyut / 1024 / 1024).toFixed(1)} MB`);
