/**
 * Paylaşım önizleme görselini (og:image) üretir.
 *
 * NEDEN GEREKLİ
 * -------------
 * Sayfada `twitter:card=summary_large_image` vardı ama `og:image` YOKTU.
 * Gösterecek görsel bulamayan istemciler baş harflere düşüyor: Safari'nin
 * "Öneriler" kutusunda site, mavi bir karenin içinde "SV" yazısı olarak
 * görünüyordu — yanındaki siteler kendi görselleriyle dururken.
 *
 * NEDEN BETİKLE
 * -------------
 * Elle hazırlanmış bir görsel, marka değişince güncellenmeyi unutuluyor.
 * Burada logo sitedekiyle aynı dosya ve metinler tek yerde; değişince
 * `npm run og` yeniden üretiyor.
 *
 * Çıktı depoya yazılıyor (public/og-gorsel.png) çünkü her derlemede
 * yeniden üretmeye gerek yok ve derlemeyi sharp'a bağımlı kılmak
 * istemiyoruz.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import sharp from 'sharp';

const kok = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const hedef = path.join(kok, 'public', 'og-gorsel.png');

const G = 1200;
const Y = 630;

/* Logo amblemi: public/logo.png — kaynağı assets/logo-kaynak.png (npm run ikonlar). */
const AB = 130;
const AX = 96;
const AY = 138;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${G}" height="${Y}" viewBox="0 0 ${G} ${Y}">
  <rect width="${G}" height="${Y}" fill="#F9FAFB"/>

  <!-- Rehber merkezindeki yumuşak daireyle aynı dil -->
  <circle cx="${G - 90}" cy="-40" r="260" fill="#2563EB" opacity="0.06"/>
  <circle cx="${G - 40}" cy="250" r="120" fill="#10B981" opacity="0.07"/>


  <text x="${AX + AB + 34}" y="${AY + 96}" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="96" font-weight="900" letter-spacing="-3">
    <tspan fill="#111827">Stajım</tspan><tspan fill="#2563EB">Var</tspan><tspan fill="#2563EB" dx="10">.</tspan>
  </text>

  <text x="96" y="382" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="62" font-weight="800" fill="#111827" letter-spacing="-1">Şirketlerin staj ilanları,</text>
  <text x="96" y="458" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="62" font-weight="800" letter-spacing="-1">
    <tspan fill="#111827">tek listede</tspan><tspan fill="#2563EB">.</tspan>
  </text>

  <text x="96" y="530" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="33" font-weight="500" fill="#6B7280">İlanları şirketlerin kendi kariyer sayfalarından derliyoruz.</text>

  <rect x="0" y="${Y - 10}" width="${G}" height="10" fill="#2563EB"/>
</svg>`;

/* Amblem SVG'ye gömülmüyor, rasterden sonra bindiriliyor: PNG'yi veri
   URI'siyle SVG'ye koymak dosyayı gereksiz yere şişiriyor. */
const amblem = await sharp(path.join(kok, 'public', 'logo.png'))
  .resize(AB, AB)
  .toBuffer();

const veri = await sharp(Buffer.from(svg))
  .composite([{ input: amblem, left: AX, top: AY }])
  .png({ compressionLevel: 9 })
  .toBuffer();
fs.writeFileSync(hedef, veri);

const bilgi = await sharp(veri).metadata();
console.log(
  `og görseli yazıldı: public/og-gorsel.png — ${bilgi.width}×${bilgi.height}, ` +
  `${Math.round(veri.length / 1024)} KB`
);
