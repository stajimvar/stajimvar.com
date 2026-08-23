/**
 * Hikâye kartlarının şablonu (1080x1920, 9:16).
 *
 * NEDEN AYRI ŞABLON
 * -----------------
 * Önce gönderi kartı (3:4) hikâye zeminine oturtuluyordu. İki sorunu vardı:
 * kart mavi olduğunda kenarı zeminde kayboluyordu, kenar belli olduğunda da
 * ortada duran bir karta ve iki boş banda benziyordu — hikâyeye yapıştırılmış
 * ekran görüntüsü gibi. Hikâye artık kendi ölçüsünde çiziliyor: yazı büyük,
 * zemin baştan sona kartın kendisi.
 *
 * INSTAGRAM ARAYÜZÜ ALAN YİYOR
 * ----------------------------
 * Üstte ilerleme çubuğu ve hesap satırı, altta yanıt kutusu var. Bunlar
 * hikâyenin yaklaşık ilk 280 ve son 280 pikselini kapatıyor. İçerik bu
 * yüzden 300–1640 arasına yerleşiyor; kenarlarda kalan boşluk süs değil,
 * arayüzün oturduğu yer.
 *
 * DÜZEN AKIŞLA KURULUYOR
 * ----------------------
 * Her kart blok listesi olarak tanımlanıyor (başlık, ayraç, metin, sıralı
 * satırlar, kutu, çağrı) ve imleç aşağı iniyor. Elle koordinat vermek,
 * içerik uzunluğu değiştiğinde (burs listesi her hafta değişiyor) kartı
 * bozuyordu.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  ACIK_MAVI,
  CIZGI,
  GRI,
  KENAR_MAVI,
  KOYU_MAVI,
  MAVI,
  PAYLASIM,
  SIYAH,
  VURGU_MAVI,
  logo,
  satir,
} from './paylasim-sablonu.mjs';

const EN = 1080;
const BOY = 1920;
const KENAR = 72;
const IC_EN = EN - KENAR * 2;

/* Arayüzün kapattığı bantlar: içerik bu iki sınırın arasında kalıyor. */
const UST_SINIR = 300;
const ALT_SINIR = 1640;

/** Kart içindeki blokların çizimi. Her biri yeni imleç konumunu döndürüyor. */
const bloklar = {
  baslik: (y, blok, koyu) => {
    const boyut = blok.boyut ?? 100;
    const cizim = blok.satirlar
      .map((s, i) =>
        satir(KENAR, y + boyut + i * Math.round(boyut * 1.2), s, {
          boyut,
          renk: i === blok.vurgu ? (koyu ? VURGU_MAVI : MAVI) : koyu ? '#FFFFFF' : SIYAH,
          kalin: 800,
        }),
      )
      .join('');
    return [cizim, y + boyut + (blok.satirlar.length - 1) * Math.round(boyut * 1.2) + 40];
  },

  ayrac: (y, _blok, koyu) => [
    `<rect x="${KENAR}" y="${y + 20}" width="104" height="12" rx="6" fill="${koyu ? VURGU_MAVI : MAVI}"/>`,
    y + 64,
  ],

  metin: (y, blok, koyu) => {
    const cizim = blok.satirlar
      .map((s, i) => satir(KENAR, y + 44 + i * 54, s, { boyut: 38, renk: koyu ? KENAR_MAVI : GRI }))
      .join('');
    return [cizim, y + 44 + (blok.satirlar.length - 1) * 54 + 40];
  },

  sirali: (y, blok, koyu) => {
    const cizim = blok.ogeler
      .map((o, i) => {
        const ust = y + i * 168;
        return `
          <rect x="${KENAR}" y="${ust}" width="92" height="92" rx="26" fill="${i === 0 ? MAVI : koyu ? KOYU_MAVI : ACIK_MAVI}"/>
          ${satir(KENAR + 46, ust + 62, String(i + 1), { boyut: 42, renk: i === 0 || koyu ? '#FFFFFF' : MAVI, kalin: 800, hiza: 'middle' })}
          ${satir(KENAR + 132, ust + 44, o.ust, { boyut: 40, renk: koyu ? '#FFFFFF' : SIYAH, kalin: 800 })}
          ${satir(KENAR + 132, ust + 92, o.alt, { boyut: 30, renk: koyu ? KENAR_MAVI : GRI })}
          <line x1="${KENAR}" y1="${ust + 136}" x2="${EN - KENAR}" y2="${ust + 136}" stroke="${koyu ? KOYU_MAVI : CIZGI}" stroke-width="2"/>
        `;
      })
      .join('');
    return [cizim, y + blok.ogeler.length * 168 + 20];
  },

  tarihli: (y, blok, koyu) => {
    const cizim = blok.ogeler
      .map((o, i) => {
        const ust = y + i * 168;
        return `
          ${satir(KENAR, ust + 46, o.kurum, { boyut: 40, renk: koyu ? '#FFFFFF' : SIYAH, kalin: 800 })}
          ${satir(KENAR, ust + 94, o.program, { boyut: 29, renk: koyu ? KENAR_MAVI : GRI })}
          <rect x="${EN - KENAR - 252}" y="${ust + 14}" width="252" height="70" rx="35" fill="${o.yakin ? MAVI : koyu ? KOYU_MAVI : ACIK_MAVI}"/>
          ${satir(EN - KENAR - 126, ust + 61, o.tarih, { boyut: 31, renk: o.yakin || koyu ? '#FFFFFF' : MAVI, kalin: 800, hiza: 'middle' })}
          <line x1="${KENAR}" y1="${ust + 136}" x2="${EN - KENAR}" y2="${ust + 136}" stroke="${koyu ? KOYU_MAVI : CIZGI}" stroke-width="2"/>
        `;
      })
      .join('');
    return [cizim, y + blok.ogeler.length * 168 + 20];
  },

  kutu: (y, blok, koyu) => {
    const yukseklik = 84 + blok.satirlar.length * 52;
    const cizim = `
      <rect x="${KENAR}" y="${y}" width="${IC_EN}" height="${yukseklik}" rx="34" fill="${koyu ? KOYU_MAVI : ACIK_MAVI}"/>
      <rect x="${KENAR + 44}" y="${y + 44}" width="62" height="9" rx="5" fill="${koyu ? VURGU_MAVI : MAVI}"/>
      ${blok.satirlar
        .map((s, i) =>
          satir(KENAR + 44, y + 116 + i * 52, s, {
            boyut: 33,
            renk: koyu ? '#FFFFFF' : SIYAH,
            kalin: i === 0 ? 700 : 400,
          }),
        )
        .join('')}
    `;
    return [cizim, y + yukseklik + 32];
  },
};

/**
 * Çağrı her zaman en altta, arayüzün yanıt kutusunun hemen üstünde:
 * insan hikâyeyi baştan sona okuyunca son gördüğü şey adres olsun.
 */
const cagri = (koyu) => {
  /*
    Düğme zemini kartın tersi: mavi kartta beyaz, beyaz kartta mavi.
    İlk denemede ikisi de beyazdı ve beyaz kartta düğme görünmüyordu —
    ortada boşlukta duran bir yazıya dönüşüyordu.
  */
  const dugmeZemin = koyu ? '#FFFFFF' : MAVI;
  const dugmeYazi = koyu ? MAVI : '#FFFFFF';
  return `
  <rect x="${KENAR}" y="${ALT_SINIR - 128}" width="486" height="124" rx="62" fill="${dugmeZemin}"/>
  ${satir(KENAR + 56, ALT_SINIR - 46, 'stajimvar.com', { boyut: 38, renk: dugmeYazi, kalin: 800 })}
  <path d="M462 ${ALT_SINIR - 62} h40 M492 ${ALT_SINIR - 78} l18 16 -18 16" stroke="${dugmeYazi}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  ${satir(620, ALT_SINIR - 46, 'Bağlantı profilde', { boyut: 32, renk: koyu ? KENAR_MAVI : GRI, kalin: 600 })}
`;
};

/** Hikâye kartını SVG olarak kurar. */
export function hikayeKarti({ seri, sayfa, koyu = false, bloklar: liste, cagriVar = true }) {
  const zemin = koyu ? MAVI : '#FFFFFF';

  let y = UST_SINIR + 120;
  const parcalar = [];
  for (const blok of liste) {
    const [cizim, yeniY] = bloklar[blok.tip](y, blok, koyu);
    parcalar.push(cizim);
    y = yeniY;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${EN}" height="${BOY}" viewBox="0 0 ${EN} ${BOY}">
    <rect width="${EN}" height="${BOY}" fill="${zemin}"/>
    ${koyu ? `<circle cx="1010" cy="${UST_SINIR - 40}" r="360" fill="${KOYU_MAVI}" opacity="0.55"/>` : ''}
    ${koyu ? `<circle cx="60" cy="${ALT_SINIR + 260}" r="420" fill="${KOYU_MAVI}" opacity="0.55"/>` : ''}

    ${logo(KENAR, UST_SINIR - 34, 66)}
    ${satir(KENAR + 86, UST_SINIR + 14, 'StajımVar', { boyut: 36, renk: koyu ? '#FFFFFF' : SIYAH, kalin: 800 })}
    ${satir(KENAR + 268, UST_SINIR + 14, '|', { boyut: 36, renk: koyu ? KOYU_MAVI : CIZGI })}
    ${satir(KENAR + 300, UST_SINIR + 14, seri, { boyut: 36, renk: koyu ? KENAR_MAVI : MAVI, kalin: 600 })}
    <rect x="${EN - KENAR - 144}" y="${UST_SINIR - 30}" width="144" height="62" rx="31" fill="${koyu ? KOYU_MAVI : ACIK_MAVI}"/>
    ${satir(EN - KENAR - 72, UST_SINIR + 12, sayfa, { boyut: 29, renk: koyu ? '#FFFFFF' : MAVI, kalin: 700, hiza: 'middle' })}

    ${parcalar.join('')}
    ${cagriVar ? cagri(koyu) : ''}
  </svg>`;
}

/** Hikâye kartlarını public/paylasim/hikaye/<kod>/ altına yazar. */
export async function hikayeleriYaz(kod, kartlar) {
  const klasor = path.join(PAYLASIM, 'hikaye', kod);
  fs.mkdirSync(klasor, { recursive: true });

  const adlar = kartlar.map((_, i) => `${String(i + 1).padStart(2, '0')}.jpg`);
  for (const eski of fs.readdirSync(klasor)) {
    if (eski.endsWith('.jpg') && !adlar.includes(eski)) fs.rmSync(path.join(klasor, eski));
  }

  for (let i = 0; i < kartlar.length; i++) {
    const buyuk = await sharp(Buffer.from(kartlar[i]), { density: 216 }).png().toBuffer();
    const veri = await sharp(buyuk)
      .resize(EN, BOY, { kernel: 'lanczos3' })
      .jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer();
    fs.writeFileSync(path.join(klasor, adlar[i]), veri);
    console.log(`  hikaye/${kod}/${adlar[i]}  ${EN}x${BOY}  ${(veri.length / 1024).toFixed(0)} KB`);
  }
}
