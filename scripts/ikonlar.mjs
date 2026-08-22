/**
 * Logo türevlerini tek kaynaktan üretir.
 *
 * KAYNAK
 * ------
 * `assets/logo-kaynak.png` — markanın kendi çizimi. Vektörle yeniden
 * çizmek yerine bu dosya ölçekleniyor: elle çizilen taklit, orijinalden
 * gözle görülür biçimde sapıyordu.
 *
 * ÜRETİLENLER
 * -----------
 * public/logo.png            arayüzdeki amblem (daire dışı saydam)
 * public/favicon.png         sekme simgesi
 * public/apple-touch-icon.png iOS ana ekran
 * public/icon-192/512.png    PWA (purpose: any)
 * public/icon-512-maskable   PWA (purpose: maskable)
 *
 * Kaynağın daire dışında kalan kırık beyaz zemini saydama çevriliyor;
 * aksi hâlde açık gri sayfa zemininde amblemin çevresinde beyaz bir kare
 * görünüyordu. iOS ve maskable ikonlar saydamlığı siyaha boyadığı için
 * onlarda amblem, markanın mavisiyle dolu bir karenin içine oturtuluyor.
 *
 * Çıktılar paletli PNG: amblem iki renkten ibaret, tam renkli kayıt
 * gereksiz yere on kat büyüktü. Depoya yazılıyorlar — derlemeyi sharp'a
 * bağımlı kılmamak için.
 * Logo değişirse: kaynağı değiştir, `npm run ikonlar` çalıştır.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import sharp from 'sharp';

const kok = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const kaynak = path.join(kok, 'assets', 'logo-kaynak.png');
const cikti = (ad) => path.join(kok, 'public', ad);

/** Amblemin daire zemininden okunan marka mavisi. */
const MARKA_MAVI = { r: 2, g: 92, b: 251 };

/**
 * Kaynağı iki renge indirger: her piksel maviye mi beyaza mı yakınsa o olur.
 *
 * Kaynak PNG sıkıştırma artıkları taşıyor — düz mavi alanda pikselden piksele
 * oynayan onlarca ton var. Bu artıklar hem dosyayı on kat büyütüyor hem de
 * küçültülünce kenarları kirletiyor. Yumuşatma, ölçeklerken yeniden oluşuyor.
 */
async function ikiRenk() {
  const { data, info } = await sharp(kaynak)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const maviUzaklik =
      (data[i] - MARKA_MAVI.r) ** 2 +
      (data[i + 1] - MARKA_MAVI.g) ** 2 +
      (data[i + 2] - MARKA_MAVI.b) ** 2;
    const beyazUzaklik =
      (255 - data[i]) ** 2 + (255 - data[i + 1]) ** 2 + (255 - data[i + 2]) ** 2;
    const mavi = maviUzaklik < beyazUzaklik;

    data[i] = mavi ? MARKA_MAVI.r : 255;
    data[i + 1] = mavi ? MARKA_MAVI.g : 255;
    data[i + 2] = mavi ? MARKA_MAVI.b : 255;
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

/** Kaynağı kare daireye kırpar: zemini at, kareye tamamla, daireyle maskele. */
async function daireAmblem(boyut) {
  const kirpilmis = await sharp(await ikiRenk()).trim({ threshold: 10 }).toBuffer();
  const { width, height } = await sharp(kirpilmis).metadata();
  const kenar = Math.max(width, height);

  // Kareye tamamlama ile ölçekleme ayrı geçişler: sharp tek zincirde
  // önce resize edip sonra extend ettiği için çıktı kare kalmıyordu.
  const kare = await sharp(kirpilmis)
    .extend({
      top: Math.round((kenar - height) / 2),
      bottom: kenar - height - Math.round((kenar - height) / 2),
      left: Math.round((kenar - width) / 2),
      right: kenar - width - Math.round((kenar - width) / 2),
      background: MARKA_MAVI,
    })
    .toBuffer();

  const olcekli = await sharp(kare).resize(boyut, boyut).toBuffer();

  // Daire dışı saydam. Yarıçap yarım piksel içeriden: kaynağın kenarındaki
  // yumuşatma payı kalırsa amblemin çevresinde açık bir halka kalıyor.
  const maske = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${boyut}" height="${boyut}">` +
      `<circle cx="${boyut / 2}" cy="${boyut / 2}" r="${boyut / 2 - 0.5}" fill="#fff"/></svg>`
  );

  return sharp(olcekli)
    .composite([{ input: maske, blend: 'dest-in' }])
    .png({ palette: true, compressionLevel: 9 })
    .toBuffer();
}

/** Saydamlığı boyayan platformlar için: mavi kare zemine oturtulmuş amblem. */
async function kareAmblem(boyut, doluluk) {
  const ic = Math.round(boyut * doluluk);
  const pay = Math.round((boyut - ic) / 2);

  return sharp({
    create: {
      width: boyut,
      height: boyut,
      channels: 4,
      background: { ...MARKA_MAVI, alpha: 1 },
    },
  })
    .composite([{ input: await daireAmblem(ic), top: pay, left: pay }])
    .png({ palette: true, compressionLevel: 9 })
    .toBuffer();
}

const uretilecek = [
  ['logo.png', () => daireAmblem(512)],
  ['favicon.png', () => daireAmblem(32)],
  ['icon-192.png', () => daireAmblem(192)],
  ['icon-512.png', () => daireAmblem(512)],
  // iOS köşeleri kendi maskesiyle yuvarlıyor, daire tam kenara dayanabilir.
  ['apple-touch-icon.png', () => kareAmblem(180, 1)],
  // Maskable'da güvenli alan ikonun %80'i; amblem %72'ye çekildi.
  ['icon-512-maskable.png', () => kareAmblem(512, 0.72)],
];

for (const [ad, uret] of uretilecek) {
  const veri = await uret();
  fs.writeFileSync(cikti(ad), veri);
  const { width, height } = await sharp(veri).metadata();
  console.log(`${ad} — ${width}×${height}, ${Math.max(1, Math.round(veri.length / 1024))} KB`);
}
