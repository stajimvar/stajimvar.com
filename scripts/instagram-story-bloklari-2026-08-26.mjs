/**
 * 26 Ağustos 2026 Story bloklarını üretir.
 *
 * Bu betik yalnızca yerel dosya ve mevcut statik paylaşım dizinine yazar.
 * Instagram/Meta API'sine istek atmaz; hiçbir erişim jetonu veya sır okumaz.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PACKAGE = path.join(ROOT, 'content', 'instagram', 'stories', '2026-08-25_2026-08-26');
const SCHEDULE_DIR = path.join(PACKAGE, 'schedule');
const DATA_PATH = path.join(SCHEDULE_DIR, 'story-schedule.json');
const PUBLIC_DIR = path.join(ROOT, 'public', 'paylasim', 'hikaye-takvim-2026-08-26');
const PUBLIC_MANIFEST = path.join(ROOT, 'public', 'paylasim', 'hikaye-takvim-2026-08-26.json');
const HANDOFF_DIR = path.join(PACKAGE, 'handoff');
const SOURCES_DIR = path.join(PACKAGE, 'sources');
const WIDTH = 1080;
const HEIGHT = 1920;
const FONT = 'Segoe UI, Arial, Helvetica, sans-serif';
const LOGO_PATH = path.join(ROOT, 'assets', 'logo-kaynak.png');
const COLORS = {
  white: '#FFFFFF',
  ink: '#111827',
  navy: '#0B1220',
  blue: '#2563EB',
  bluePale: '#E8EFFF',
  green: '#059669',
  greenPale: '#DCFCE7',
  violet: '#6D5DFB',
  violetPale: '#EEEAFE',
};
if (!fs.existsSync(LOGO_PATH)) throw new Error('StajımVar logo kaynağı bulunamadı: assets/logo-kaynak.png');
const logo64 = fs.readFileSync(LOGO_PATH).toString('base64');

const ensure = (dir) => fs.mkdirSync(dir, { recursive: true });
const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function wrap(value, maxLength) {
  const rows = [];
  for (const paragraph of String(value ?? '').split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) { rows.push(''); continue; }
    let row = '';
    for (const word of words) {
      const candidate = row ? `${row} ${word}` : word;
      if (candidate.length > maxLength && row) {
        rows.push(row);
        row = word;
      } else row = candidate;
    }
    if (row) rows.push(row);
  }
  return rows;
}

function textLines(x, y, value, options = {}) {
  const size = options.size ?? 44;
  const leading = options.leading ?? Math.round(size * 1.2);
  const fill = options.fill ?? COLORS.ink;
  const weight = options.weight ?? 600;
  const anchor = options.anchor ?? 'start';
  const max = options.max ?? 30;
  return wrap(value, max).map((row, index) =>
    `<text x="${x}" y="${y + index * leading}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(row)}</text>`
  ).join('');
}

function rect(x, y, w, h, fill, radius = 24, extra = '') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" ${extra}/>`;
}

function dots(color, opacity) {
  const parts = [];
  for (let x = 82; x < WIDTH; x += 112) {
    for (let y = 180; y < HEIGHT; y += 112) parts.push(`<circle cx="${x}" cy="${y}" r="5" fill="${color}" opacity="${opacity}"/>`);
  }
  return parts.join('');
}

function palette(blockId) {
  if (blockId.includes('dau')) return { background: '#064E3B', accent: '#6EE7B7', pale: COLORS.greenPale };
  if (blockId.includes('cv')) return { background: '#312E81', accent: '#C4B5FD', pale: COLORS.violetPale };
  if (blockId.includes('ozet')) return { background: '#0B1220', accent: '#93C5FD', pale: COLORS.bluePale };
  return { background: '#1E3A8A', accent: '#BFDBFE', pale: COLORS.bluePale };
}

function storySvg(block, frame) {
  const p = palette(block.id);
  const stickerName = frame.sticker?.displayLabel ?? 'ETİKET YOK';
  const hasSticker = frame.sticker?.type && frame.sticker.type !== 'none';
  const sticker = hasSticker
    ? `${rect(72, 1180, 936, 184, COLORS.white, 34, 'opacity="0.15" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="14 12"')}
       ${textLines(540, 1262, stickerName, { size: 28, fill: COLORS.white, weight: 900, anchor: 'middle', max: 30 })}`
    : `${rect(72, 1180, 936, 120, p.pale, 28)}
       ${textLines(540, 1252, stickerName, { size: 25, fill: p.background, weight: 900, anchor: 'middle', max: 36 })}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs><clipPath id="story-logo-clip"><circle cx="91" cy="91" r="27"/></clipPath></defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${p.background}"/>
    <circle cx="960" cy="250" r="340" fill="${p.accent}" opacity="0.18"/>
    <circle cx="96" cy="1660" r="280" fill="${p.accent}" opacity="0.14"/>
    ${dots(COLORS.white, '0.055')}
    <image href="data:image/png;base64,${logo64}" x="64" y="64" width="54" height="54" preserveAspectRatio="xMidYMid slice" clip-path="url(#story-logo-clip)"/>
    ${textLines(134, 101, 'StajımVar', { size: 29, fill: COLORS.white, weight: 900, max: 25 })}
    ${textLines(134, 134, block.series, { size: 20, fill: p.accent, weight: 800, max: 31 })}
    ${rect(874, 62, 142, 54, 'rgba(255,255,255,0.16)', 27)}
    ${textLines(945, 98, `${String(frame.sequence).padStart(2, '0')}/${String(block.frames.length).padStart(2, '0')}`, { size: 21, fill: COLORS.white, weight: 900, anchor: 'middle', max: 16 })}
    ${rect(64, 286, 318, 58, p.accent, 29)}
    ${textLines(223, 325, frame.text.eyebrow, { size: 20, fill: p.background, weight: 900, anchor: 'middle', max: 28 })}
    ${textLines(64, 554, frame.text.headline, { size: 72, fill: COLORS.white, weight: 900, leading: 86, max: 21 })}
    ${rect(64, 780, 104, 11, p.accent, 6)}
    ${textLines(64, 894, frame.text.body, { size: 40, fill: '#E5E7EB', weight: 600, leading: 54, max: 34 })}
    ${sticker}
    ${rect(64, 1652, 952, 158, COLORS.white, 32)}
    ${textLines(108, 1714, frame.text.footer, { size: 30, fill: p.background, weight: 800, leading: 40, max: 52 })}
    ${textLines(540, 1858, 'STAJIMVAR.COM', { size: 22, fill: '#D1D5DB', weight: 800, anchor: 'middle', max: 38 })}
  </svg>`;
}

async function writePng(file, svg) {
  ensure(path.dirname(file));
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(file);
}

function humanDate(iso) {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul', dateStyle: 'long', timeStyle: 'short',
  }).format(new Date(iso));
}

function makeScheduleMarkdown(data) {
  const rows = data.blocks.map((block) =>
    `| ${block.sequence} | ${humanDate(block.startsAt)} | ${block.series} | ${block.frames.length} | ${block.recommendedWindow} | ${block.goal} |`
  ).join('\n');
  const frames = data.blocks.flatMap((block) => block.frames.map((frame) =>
    `| ${frame.id} | ${humanDate(frame.plannedAt)} | ${frame.sticker.type} — ${frame.sticker.displayLabel} | ${frame.cta} | ${frame.localPath} |`
  )).join('\n');
  return `# StajımVar Story takvimi — 26 Ağustos 2026\n\n` +
    `- Zaman dilimi: Europe/Istanbul (TRT)\n` +
    `- Kapsam: ${data.coverage.from} → ${data.coverage.to}\n` +
    `- Durum: Taslak; **yalnızca manuel Instagram Story paylaşımı**. Bu dosya veya paket Meta API çağrısı yapmaz.\n` +
    `- 25 Ağustos notu: ${data.coverage.note}\n\n` +
    `## Bloklar\n\n| Sıra | Planlanan başlangıç | Seri | Kare | Test penceresi | Hedef |\n| --- | --- | --- | --- | --- | --- |\n${rows}\n\n` +
    `## Kareler\n\n| Story ID | Planlanan zaman | Instagram etiketi | CTA | Yerel dosya |\n| --- | --- | --- | --- | --- |\n${frames}\n\n` +
    `## Manuel yayın kuralı\n\nInstagram uygulamasında her bloğun üç PNG'sini sırasıyla yükle; burada yazan etiketi ve bağlantıyı elle ekle. Yayınlandı işareti yalnızca paneli kullanan tarayıcıda tutulur; Instagram'da hiçbir işlem başlatmaz.\n`;
}

function uniqueSources(data) {
  const seen = new Map();
  for (const block of data.blocks) {
    for (const frame of block.frames) {
      const key = `${frame.source.name}|${frame.source.url}`;
      if (!seen.has(key)) seen.set(key, frame.source);
    }
  }
  return [...seen.values()];
}

function makeSourcesMarkdown(data) {
  const rows = uniqueSources(data).map((source) =>
    `| ${source.name} | ${source.url} | ${source.verifiedFacts} | ${source.checkedAt} |`
  ).join('\n');
  return `# Story kaynak manifestosu\n\n` +
    `Tutar veya doğrulanmamış koşul kullanılmadı. DAÜ yönlendirmesi doğrudan resmî başvuru adresinedir; bu üçüncü taraf URL'sine UTM eklenmedi.\n\n` +
    `| Kaynak | URL | Doğrulanan bilgi | Son kontrol |\n| --- | --- | --- | --- |\n${rows}\n`;
}

function makeHandoff(data) {
  const sections = data.blocks.map((block) => `## ${block.sequence}. blok — ${block.series}\n\n` +
    `- Başlangıç: ${humanDate(block.startsAt)}\n` +
    `- Bitiş: ${humanDate(block.endsAt)}\n` +
    `- Amaç: ${block.goal}\n` +
    `- Manuel kontrol listesi:\n${block.manualChecklist.map((item) => `  - ${item}`).join('\n')}\n` +
    `- Dosyalar:\n${block.frames.map((frame) => `  - ${frame.localPath}`).join('\n')}\n`).join('\n');
  return `# Story teslim notu\n\n` +
    `Bu teslim, 26 Ağustos 2026 için dört ayrı Story bloğu ve on iki PNG içerir. ` +
    `Instagram'a otomatik paylaşım yoktur: Graph API, erişim jetonu ve yayın ucu bu pakette kullanılmaz.\n\n${sections}`;
}

async function createContactSheet(data) {
  const tiles = [];
  const tileW = 270;
  const tileH = 480;
  for (const [index, frame] of data.blocks.flatMap((block) => block.frames).entries()) {
    const file = path.join(PACKAGE, frame.localPath);
    tiles.push({ input: await sharp(file).resize(tileW, tileH).png().toBuffer(), left: (index % 4) * tileW, top: Math.floor(index / 4) * tileH });
  }
  ensure(HANDOFF_DIR);
  await sharp({ create: { width: tileW * 4, height: tileH * 3, channels: 4, background: COLORS.navy } })
    .composite(tiles)
    .png()
    .toFile(path.join(HANDOFF_DIR, 'qa-story-contact-sheet.png'));
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  ensure(SCHEDULE_DIR);
  ensure(SOURCES_DIR);
  ensure(HANDOFF_DIR);
  ensure(PUBLIC_DIR);

  for (const block of data.blocks) {
    for (const frame of block.frames) {
      const localFile = path.join(PACKAGE, frame.localPath);
      await writePng(localFile, storySvg(block, frame));
      fs.copyFileSync(localFile, path.join(ROOT, 'public', frame.publicPath.replace(/^\//, '')));
    }
  }

  fs.writeFileSync(path.join(SCHEDULE_DIR, 'story-schedule.md'), makeScheduleMarkdown(data));
  fs.writeFileSync(path.join(SOURCES_DIR, 'story-source-manifest.md'), makeSourcesMarkdown(data));
  fs.writeFileSync(path.join(HANDOFF_DIR, 'story-handoff.md'), makeHandoff(data));
  fs.writeFileSync(PUBLIC_MANIFEST, `${JSON.stringify(data, null, 2)}\n`);
  await createContactSheet(data);

  console.log(`Story paketi üretildi: ${data.blocks.length} blok, ${data.blocks.reduce((sum, block) => sum + block.frames.length, 0)} PNG.`);
}

await main();
