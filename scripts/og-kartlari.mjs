/**
 * Sayfaya özel paylaşım görselleri (og:image) üretir.
 *
 * NEDEN GEREKLİ
 * -------------
 * Sitenin tamamı tek bir genel görseli paylaşıyordu: bir rehber, bir ilan
 * ya da bir burs paylaşıldığında WhatsApp ve Twitter'da hep aynı
 * "Şirketlerin staj ilanları, tek listede" kartı çıkıyordu. Paylaşılan şeyin
 * ne olduğu karttan hiç anlaşılmıyordu — oysa tıklanma kararını o kart
 * veriyor.
 *
 * NE ÜRETİYOR
 * -----------
 * Her rehber, her fırsat ve her ilan için 1200x630 bir kart:
 *   - üstte kategori etiketi (REHBER / BURS / STAJ İLANI)
 *   - ortada sayfanın kendi başlığı
 *   - altta kurum ya da kısa bilgi
 *   - marka şeridi ve amblem
 *
 * Metin uydurulmuyor: başlık ve kurum adı sayfanın kendi verisinden geliyor.
 *
 * NEDEN AYRI BETİK
 * ----------------
 * og-gorsel.mjs tek bir genel kart üretiyor ve depoya yazıyor. Bu betik
 * yüzlerce kart üretiyor ve çıktıyı `dist` içine yazıyor: depoyu binlerce
 * PNG ile şişirmenin anlamı yok, her derlemede yeniden üretiliyorlar.
 *
 * Kullanım: node scripts/og-kartlari.mjs   (npm run build içinden çağrılıyor)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const KOK = path.resolve(import.meta.dirname, '..');
const DIST = path.join(KOK, 'dist');
const HEDEF = path.join(DIST, 'og');

const G = 1200;
const Y = 630;

/* Kategori rengi: kart hangi bölüme ait, bir bakışta belli olsun. */
const RENKLER = {
  rehber: { ana: '#2563EB', koyu: '#1D4ED8' },
  firsat: { ana: '#059669', koyu: '#047857' },
  ilan: { ana: '#4338CA', koyu: '#3730A3' },
};

function kacir(metin) {
  return String(metin ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/*
  Başlık satırlara bölünüyor.

  SVG'de otomatik satır kaydırma yok; uzun bir başlık tek satırda kartın
  dışına taşıyor. Karakter genişliği yaklaşık olarak font boyunun yarısı
  kabul ediliyor — kesin değil ama kartın kenarına çarpmayı önlüyor.
*/
function satirlaraBol(metin, enFazlaKarakter, enFazlaSatir) {
  const kelimeler = String(metin).split(/\s+/).filter(Boolean);
  const satirlar = [];
  let simdiki = '';
  for (const kelime of kelimeler) {
    const aday = simdiki ? `${simdiki} ${kelime}` : kelime;
    if (aday.length > enFazlaKarakter && simdiki) {
      satirlar.push(simdiki);
      simdiki = kelime;
    } else {
      simdiki = aday;
    }
  }
  if (simdiki) satirlar.push(simdiki);
  if (satirlar.length <= enFazlaSatir) return satirlar;
  const kirpilmis = satirlar.slice(0, enFazlaSatir);
  kirpilmis[enFazlaSatir - 1] = kirpilmis[enFazlaSatir - 1].replace(/\s*\S*$/, '') + '…';
  return kirpilmis;
}

function kartSvg({ etiket, baslik, altMetin, tur }) {
  const renk = RENKLER[tur] || RENKLER.rehber;
  /* Uzun başlıkta punto düşüyor: üç satır sığmadığında kart okunmaz oluyor. */
  const uzun = baslik.length > 58;
  const punto = uzun ? 54 : 64;
  const satirlar = satirlaraBol(baslik, uzun ? 32 : 28, 3);
  const ilkY = 300 - (satirlar.length - 1) * (punto * 0.62);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${G}" height="${Y}" viewBox="0 0 ${G} ${Y}">
  <rect width="${G}" height="${Y}" fill="#FFFFFF"/>
  <circle cx="${G - 80}" cy="-60" r="270" fill="${renk.ana}" opacity="0.07"/>
  <circle cx="${G - 30}" cy="270" r="130" fill="${renk.ana}" opacity="0.06"/>

  <rect x="88" y="84" rx="22" ry="22" width="${28 + etiket.length * 17}" height="44" fill="${renk.ana}" opacity="0.10"/>
  <text x="${102}" y="115" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="23" font-weight="800" letter-spacing="2" fill="${renk.koyu}">${kacir(etiket)}</text>

  ${satirlar
    .map(
      (s, i) =>
        `<text x="88" y="${ilkY + i * (punto * 1.24)}" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="${punto}" font-weight="800" fill="#111827" letter-spacing="-1">${kacir(s)}</text>`
    )
    .join('\n  ')}

  ${
    altMetin
      ? `<text x="88" y="${Y - 128}" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="31" font-weight="500" fill="#6B7280">${kacir(
          satirlaraBol(altMetin, 58, 1)[0]
        )}</text>`
      : ''
  }

  <text x="${88 + 66}" y="${Y - 56}" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="34" font-weight="900" letter-spacing="-1">
    <tspan fill="#111827">Stajım</tspan><tspan fill="${renk.ana}">Var</tspan><tspan fill="${renk.ana}" dx="4">.</tspan>
  </text>

  <rect x="0" y="${Y - 10}" width="${G}" height="10" fill="${renk.ana}"/>
</svg>`;
}

const amblem = await sharp(path.join(KOK, 'public', 'logo.png')).resize(48, 48).toBuffer();

export async function kartYaz(dosyaAdi, veri) {
  const svg = Buffer.from(kartSvg(veri));
  const png = await sharp(svg)
    .composite([{ input: amblem, left: 88, top: Y - 88 }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.mkdirSync(HEDEF, { recursive: true });
  fs.writeFileSync(path.join(HEDEF, `${dosyaAdi}.png`), png);
  return png.length;
}

export const OG_DIZIN = HEDEF;
