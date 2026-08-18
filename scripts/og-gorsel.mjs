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
 * Burada logo Logo.tsx'teki vektörün birebir aynısı ve metinler tek yerde;
 * değişince `npm run og` yeniden üretiyor.
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

/* Logo amblemi: Logo.tsx'teki 24×24 vektörün birebir aynısı. */
const AB = 130;
const AX = 96;
const AY = 138;
const o = AB / 24 * 0.6;
const kx = AX + AB / 2 - 12 * o;
const ky = AY + AB / 2 - 12 * o;
const p = (x, y) => `${(kx + x * o).toFixed(2)},${(ky + y * o).toFixed(2)}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${G}" height="${Y}" viewBox="0 0 ${G} ${Y}">
  <rect width="${G}" height="${Y}" fill="#F9FAFB"/>

  <!-- Rehber merkezindeki yumuşak daireyle aynı dil -->
  <circle cx="${G - 90}" cy="-40" r="260" fill="#2563EB" opacity="0.06"/>
  <circle cx="${G - 40}" cy="250" r="120" fill="#10B981" opacity="0.07"/>

  <rect x="${AX}" y="${AY}" width="${AB}" height="${AB}" rx="36" fill="#2563EB"/>
  <g stroke="#fff" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M${p(12,3.5)} L${p(3,8)} L${p(12,12.5)} L${p(21,8)} Z" fill="#fff" stroke="none"/>
    <path d="M${p(6,10.5)} L${p(6,14.5)} C${p(6,16.5)} ${p(8.5,18)} ${p(12,18)} C${p(15.5,18)} ${p(18,16.5)} ${p(18,14.5)} L${p(18,10.5)}" stroke-width="${(1.8*o).toFixed(2)}"/>
    <path d="M${p(4.5,9.5)} L${p(4.5,15)}" stroke-width="${(1.5*o).toFixed(2)}"/>
    <path d="M${p(10,12.5)} L${p(13.5,16)} L${p(21,5.5)}" stroke-width="${(2.5*o).toFixed(2)}"/>
  </g>

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

const veri = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
fs.writeFileSync(hedef, veri);

const bilgi = await sharp(veri).metadata();
console.log(
  `og görseli yazıldı: public/og-gorsel.png — ${bilgi.width}×${bilgi.height}, ` +
  `${Math.round(veri.length / 1024)} KB`
);
