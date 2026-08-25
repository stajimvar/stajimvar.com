/**
 * 26 Ağustos - 1 Eylül 2026 Instagram içerik haftası üreticisi.
 * Instagram API'sine istek atmaz. Yalnızca iki JPEG carousel setini
 * mevcut statik yönetim manifestine ekler; yayın ayrıca elle onaylanır.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegStatic from 'ffmpeg-static';
import sharp from 'sharp';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PACKAGE = path.join(ROOT, 'content', 'instagram', '2026-08-26');
const DIR = {
  calendar: path.join(PACKAGE, '01-calendar'),
  carousels: path.join(PACKAGE, '02-carousels'),
  reels: path.join(PACKAGE, '03-reels'),
  stories: path.join(PACKAGE, '04-stories'),
  captions: path.join(PACKAGE, '05-captions'),
  sources: path.join(PACKAGE, '06-sources'),
  handoff: path.join(PACKAGE, '07-handoff'),
  public: path.join(ROOT, 'public', 'paylasim'),
};
const DATA_PATH = path.join(DIR.calendar, 'week-content-data.json');
const LOGO_PATH = path.join(ROOT, 'assets', 'logo-kaynak.png');
const W = 1080;
const FEED_H = 1350;
const STORY_H = 1920;
const FONT = 'Segoe UI, Arial, Helvetica, sans-serif';
const C = {
  blue: '#2563EB', navy: '#0B1220', ink: '#111827', gray: '#4B5563',
  white: '#FFFFFF', pale: '#E8EFFF', green: '#059669', greenPale: '#DCFCE7',
  violet: '#6D5DFB', violetPale: '#EEEAFE',
};
const logo64 = fs.existsSync(LOGO_PATH) ? fs.readFileSync(LOGO_PATH).toString('base64') : '';

function ensure(dir) { fs.mkdirSync(dir, { recursive: true }); }
function esc(value) {
  return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
function wrap(value, max) {
  const out = [];
  for (const raw of String(value || '').split('\n')) {
    const words = raw.split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(''); continue; }
    let line = '';
    for (const word of words) {
      const next = line ? line + ' ' + word : word;
      if (next.length > max && line) { out.push(line); line = word; } else line = next;
    }
    if (line) out.push(line);
  }
  return out;
}
function lines(x, y, value, opt = {}) {
  const size = opt.size || 42;
  const color = opt.color || C.ink;
  const weight = opt.weight || 600;
  const leading = opt.leading || Math.round(size * 1.22);
  const max = opt.max || 26;
  const anchor = opt.anchor || 'start';
  return wrap(value, max).map((line, i) =>
    '<text x="' + x + '" y="' + (y + i * leading) + '" font-family="' + FONT + '" font-size="' + size +
    '" font-weight="' + weight + '" fill="' + color + '" text-anchor="' + anchor + '">' + esc(line) + '</text>'
  ).join('');
}
function rect(x, y, w, h, fill, radius, extra) {
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (radius || 24) + '" fill="' + fill + '" ' + (extra || '') + '/>';
}
function doc(height, content, background) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + height + '" viewBox="0 0 ' + W + ' ' + height + '">' +
    '<rect width="' + W + '" height="' + height + '" fill="' + (background || C.white) + '"/>' + content + '</svg>';
}
function dots(height, color, opacity) {
  const out = [];
  for (let x = 82; x < W; x += 112) for (let y = 176; y < height; y += 112) {
    out.push('<circle cx="' + x + '" cy="' + y + '" r="5" fill="' + color + '" opacity="' + opacity + '"/>');
  }
  return out.join('');
}
function brand(series, index, total, dark) {
  const ink = dark ? C.white : C.ink;
  const sub = dark ? '#BFDBFE' : C.blue;
  const logo = logo64
    ? '<image href="data:image/png;base64,' + logo64 + '" x="64" y="56" width="54" height="54"/>'
    : rect(64, 56, 54, 54, C.blue, 16);
  return logo +
    lines(134, 94, 'StajımVar', { size: 28, color: ink, weight: 800, max: 24 }) +
    lines(134, 128, series, { size: 22, color: sub, weight: 700, max: 28 }) +
    rect(884, 58, 132, 50, dark ? '#1E3A8A' : C.pale, 25) +
    lines(950, 91, String(index).padStart(2, '0') + '/' + String(total).padStart(2, '0'), { size: 20, color: dark ? C.white : C.blue, weight: 800, anchor: 'middle', max: 20 });
}
async function writeJpeg(file, svg, width, height, quality) {
  ensure(path.dirname(file));
  await sharp(Buffer.from(svg)).resize(width, height).jpeg({ quality: quality || 94, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(file);
}
function palette(item) {
  return item.contentId.includes('firsat')
    ? { accent: C.green, pale: C.greenPale, label: 'FIRSAT ALARMI' }
    : { accent: C.violet, pale: C.violetPale, label: 'CV NOTU' };
}
function carouselSvg(item, slide) {
  const p = palette(item);
  const total = item.slides.length;
  if (slide.kind === 'cover') {
    return doc(FEED_H,
      '<circle cx="1010" cy="320" r="330" fill="' + (item.contentId.includes('firsat') ? '#064E3B' : '#312E81') + '" opacity="0.58"/>' +
      '<circle cx="902" cy="1160" r="264" fill="' + C.blue + '" opacity="0.72"/>' + dots(FEED_H, '#FFFFFF', '0.12') +
      brand(item.series, slide.number, total, true) +
      rect(64, 244, 250, 54, p.accent, 27) +
      lines(189, 281, p.label, { size: 19, color: C.white, weight: 800, anchor: 'middle', max: 26 }) +
      lines(64, 514, slide.headline, { size: 86, color: C.white, weight: 900, leading: 102, max: 18 }) +
      rect(64, 806, 96, 10, p.accent, 5) +
      lines(64, 892, slide.body, { size: 36, color: '#E5E7EB', weight: 500, leading: 52, max: 34 }) +
      rect(64, 1112, 952, 142, C.white, 30) +
      lines(108, 1172, item.contentId.includes('firsat') ? 'Tarih, koşul ve tutarı kurumun sayfasından kontrol et.' : 'Yaptığın işi doğru adlandır; CV boşluk değil kanıt ister.', { size: 29, color: C.navy, weight: 700, leading: 39, max: 54 }),
      C.navy);
  }
  if (slide.kind === 'cta') {
    return doc(FEED_H,
      '<path d="M0 1040 C220 940 360 1160 564 1040 S900 930 1080 1040 V1350 H0Z" fill="' + C.pale + '"/>' +
      '<circle cx="920" cy="276" r="192" fill="' + p.pale + '"/><circle cx="154" cy="1056" r="148" fill="' + p.pale + '"/>' +
      brand(item.series, slide.number, total, false) + rect(64, 244, 238, 54, p.accent, 27) +
      lines(183, 281, 'SON ADIM', { size: 19, color: C.white, weight: 800, anchor: 'middle', max: 24 }) +
      lines(64, 488, slide.headline, { size: 86, color: C.ink, weight: 900, leading: 102, max: 18 }) +
      rect(64, 756, 96, 10, p.accent, 5) +
      lines(64, 840, slide.body, { size: 36, color: C.gray, weight: 500, leading: 52, max: 36 }) +
      rect(64, 1068, 952, 170, C.blue, 32) +
      lines(112, 1138, slide.ctaText || item.cta, { size: 35, color: C.white, weight: 800, leading: 46, max: 42 }) +
      '<path d="M906 1158 h46 M926 1138 l26 20 -26 20" stroke="#FFFFFF" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>');
  }
  if (slide.kind === 'formula') {
    const labels = [['GÖREV', 'Ne yaptın?'], ['ARAÇ', 'Neyi kullandın?'], ['ÇIKTI', 'Ne ortaya çıktı?']];
    const boxes = labels.map((entry, i) => {
      const y = 600 + i * 142;
      return rect(64, y, 952, 116, i === 0 ? p.accent : C.pale, 26) +
        lines(106, y + 50, entry[0], { size: 28, color: i === 0 ? C.white : C.blue, weight: 900, max: 18 }) +
        lines(390, y + 50, entry[1], { size: 30, color: i === 0 ? C.white : C.ink, weight: 700, max: 24 });
    }).join('');
    return doc(FEED_H,
      '<rect x="0" y="0" width="1080" height="210" fill="' + C.navy + '"/>' + brand(item.series, slide.number, total, true) +
      lines(64, 390, slide.headline, { size: 78, color: C.ink, weight: 900, leading: 94, max: 22 }) + boxes +
      rect(64, 1056, 952, 158, p.pale, 28) +
      lines(108, 1117, slide.body, { size: 28, color: C.navy, weight: 700, leading: 38, max: 61 }));
  }
  const tint = slide.number % 2 === 0 ? '#F8FAFC' : C.white;
  return doc(FEED_H,
    '<rect x="0" y="0" width="1080" height="210" fill="' + C.navy + '"/><rect x="0" y="210" width="20" height="1140" fill="' + p.accent + '"/>' +
    brand(item.series, slide.number, total, true) + rect(64, 276, 230, 56, p.pale, 28) +
    lines(179, 314, slide.badge, { size: 20, color: p.accent, weight: 900, anchor: 'middle', max: 23 }) +
    lines(64, 518, slide.headline, { size: 78, color: C.ink, weight: 900, leading: 94, max: 19 }) +
    rect(64, 746, 96, 10, p.accent, 5) +
    lines(64, 834, slide.body, { size: 34, color: C.gray, weight: 500, leading: 48, max: 43 }) +
    rect(64, 1010, 952, 172, tint, 30, 'stroke="' + p.pale + '" stroke-width="3"') +
    lines(108, 1076, slide.note || item.cta, { size: 29, color: C.ink, weight: 700, leading: 40, max: 55 }));
}
function storyPalette(format) {
  if (['poll', 'quiz', 'question-box', 'community'].includes(format)) return { bg: '#312E81', accent: '#A5B4FC' };
  if (['new-opportunity', 'countdown'].includes(format)) return { bg: '#064E3B', accent: '#6EE7B7' };
  if (format === 'kyk-guide') return { bg: '#0C4A6E', accent: '#7DD3FC' };
  if (['brand-trust', 'product-feature'].includes(format)) return { bg: C.navy, accent: '#93C5FD' };
  return { bg: '#1E3A8A', accent: '#BFDBFE' };
}
function stickerName(sticker) {
  const type = sticker && sticker.type || 'none';
  return ({ link: 'BAĞLANTI ETİKETİ ALANI', countdown: 'GERİ SAYIM ETİKETİ ALANI', question: 'SORU KUTUSU ALANI', poll: 'ANKET ETİKETİ ALANI', quiz: 'TEST ETİKETİ ALANI' })[type] || '';
}
function storySvg(day, story, index) {
  const p = storyPalette(story.format);
  const sticker = stickerName(story.sticker);
  const extra = sticker
    ? rect(96, 1110, 888, 174, C.white, 34, 'opacity="0.15" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="14 12"') +
      lines(540, 1198, sticker, { size: 23, color: C.white, weight: 800, anchor: 'middle', max: 32 })
    : '';
  return doc(STORY_H,
    '<circle cx="960" cy="250" r="320" fill="' + p.accent + '" opacity="0.16"/><circle cx="64" cy="1640" r="260" fill="' + p.accent + '" opacity="0.14"/>' +
    dots(STORY_H, '#FFFFFF', '0.055') + brand('Günlük hikâye', index + 1, day.stories.length, true) +
    rect(64, 290, 250, 56, p.accent, 28) + lines(189, 328, day.weekday.toUpperCase(), { size: 19, color: p.bg, weight: 900, anchor: 'middle', max: 24 }) +
    lines(64, 578, story.headline, { size: 80, color: C.white, weight: 900, leading: 96, max: 19 }) +
    rect(64, 674, 96, 10, p.accent, 5) + lines(64, 790, story.body, { size: 44, color: '#E5E7EB', weight: 600, leading: 58, max: 31 }) +
    extra + rect(64, 1678, 952, 126, C.white, 30) +
    lines(108, 1731, story.cta, { size: 31, color: p.bg, weight: 800, leading: 40, max: 51 }),
    p.bg);
}
function reelPalette(reel) {
  return reel.contentId.includes('firsat') ? { bg: C.navy, accent: '#60A5FA', pale: '#DBEAFE' } : { bg: '#312E81', accent: '#A5B4FC', pale: '#EDE9FE' };
}
function reelSvg(reel, scene, index) {
  const p = reelPalette(reel);
  const total = reel.storyboard.length;
  const isLast = index === total - 1;
  const main = index === 0 ? reel.hook : isLast ? reel.cta : scene.screenText;
  return doc(STORY_H,
    '<circle cx="940" cy="290" r="360" fill="' + p.accent + '" opacity="0.19"/><circle cx="120" cy="1610" r="290" fill="' + p.accent + '" opacity="0.13"/>' +
    dots(STORY_H, '#FFFFFF', '0.055') + brand(reel.series, index + 1, total, true) +
    rect(80, 310, 300, 58, p.accent, 29) + lines(230, 349, scene.start + '-' + scene.end, { size: 20, color: p.bg, weight: 900, anchor: 'middle', max: 22 }) +
    lines(80, 570, main, { size: 64, color: C.white, weight: 900, leading: 76, max: 26 }) +
    rect(80, 1010, 920, 340, C.white, 42) +
    lines(540, 1140, scene.screenText, { size: index === 4 ? 42 : 58, color: p.bg, weight: 900, anchor: 'middle', leading: 68, max: index === 4 ? 34 : 22 }) +
    rect(80, 1580, 920, 142, p.pale, 34) + lines(540, 1640, 'STAJIMVAR.COM', { size: 35, color: p.bg, weight: 900, anchor: 'middle', max: 30 }) +
    lines(540, 1685, isLast ? 'Profildeki bağlantı → ilgili sayfa' : 'Sessiz izleme için altyazı hazır.', { size: 24, color: p.bg, weight: 700, anchor: 'middle', max: 50 }),
    p.bg);
}
const SRT = {
  'ig-2026w35-reel-cv-bos-birakma': [
    ['00:00:00,000', '00:00:03,000', 'CV’de deneyim yok diye o bölümü boş bırakma.'],
    ['00:00:03,000', '00:00:06,000', 'Ders projesi, kulüp görevi veya gönüllülükte yaptığın işi yaz.'],
    ['00:00:06,000', '00:00:10,000', 'Cümleyi üç parçaya böl: görev, kullandığın araç ve ortaya çıkan çıktı.'],
    ['00:00:10,000', '00:00:14,000', 'Yalnız kanıtlayabileceğin şeyi ekle.'],
    ['00:00:14,000', '00:00:18,000', 'Devamı profil bağlantısındaki CV rehberinde.'],
  ],
  'ig-2026w35-reel-firsat-takibi': [
    ['00:00:00,000', '00:00:03,000', 'Bir fırsatı gördün. Peki son tarih gelmeden ne yapacaksın?'],
    ['00:00:03,000', '00:00:07,000', 'Önce kurumun kendi duyurusunu aç ve son tarihi kontrol et.'],
    ['00:00:07,000', '00:00:11,000', 'Sonra ilgilendiğin fırsatı takip listene ekle.'],
    ['00:00:11,000', '00:00:15,000', 'Başvuru zamanı geldiğinde kurumun kendi bağlantısına git.'],
    ['00:00:15,000', '00:00:20,000', 'Profildeki bağlantıdan açık fırsatlara bak.'],
  ],
};
function writeSrt(reel) {
  const rows = (SRT[reel.contentId] || []).map((item, index) => String(index + 1) + '\n' + item[0] + ' --> ' + item[1] + '\n' + item[2] + '\n').join('\n');
  fs.writeFileSync(path.join(PACKAGE, reel.srtPath), rows);
}
async function createReel(reel) {
  const frameDir = path.join(PACKAGE, reel.frameFolder);
  ensure(frameDir);
  const frames = [];
  for (const [index, scene] of reel.storyboard.entries()) {
    const name = 'scene-' + String(index + 1).padStart(2, '0') + '.jpg';
    const file = path.join(frameDir, name);
    await writeJpeg(file, reelSvg(reel, scene, index), W, STORY_H, 93);
    frames.push(file);
  }
  await writeJpeg(path.join(PACKAGE, reel.coverPath), reelSvg(reel, reel.storyboard[0], 0), W, STORY_H, 94);
  writeSrt(reel);
  if (!ffmpegStatic) throw new Error('ffmpeg-static bulunamadı; Reel MP4 üretilemedi.');
  const concatPath = path.join(frameDir, 'concat.txt');
  const duration = Math.ceil(reel.durationSeconds / frames.length);
  const all = [];
  for (const file of frames) {
    all.push("file '" + file.replaceAll('\\', '/').replaceAll("'", "'\\''") + "'");
    all.push('duration ' + duration);
  }
  all.push("file '" + frames[frames.length - 1].replaceAll('\\', '/').replaceAll("'", "'\\''") + "'");
  fs.writeFileSync(concatPath, all.join('\n'));
  const video = path.join(PACKAGE, reel.videoPath);
  ensure(path.dirname(video));
  execFileSync(ffmpegStatic, ['-y', '-f', 'concat', '-safe', '0', '-i', concatPath, '-vf', 'fps=30,format=yuv420p', '-r', '30', '-c:v', 'libx264', '-crf', '20', '-movflags', '+faststart', '-an', video], { stdio: 'pipe' });
  fs.rmSync(concatPath, { force: true });
}
function md(data) {
  const calendar = [
    '# StajımVar Instagram — ' + data.weekStart + ' / ' + data.weekEnd,
    '',
    'Türkiye saati. Insights verisi yok; Pencere A ' + data.timeTests.windowA + ', Pencere B ' + data.timeTests.windowB + ' karşılaştırmalı testtir.',
    '',
    '| Tarih | Saat | Alan | Konu | CTA | Hedef | Manuel işlem |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const day of data.days) {
    const feed = data.feed.find((item) => item.contentId === day.feedContentId);
    calendar.push('| ' + day.date + ' | ' + (feed ? feed.suggestedTime : '09:30 / 18:30') + ' | ' + (feed ? 'Feed — ' + feed.format : 'Story') + ' | ' + (feed ? feed.title : 'Günlük etkileşim paketi') + ' | ' + (feed ? feed.cta : day.stories[day.stories.length - 1].cta) + ' | ' + (feed ? feed.targetUrl : (day.stories[day.stories.length - 1].sticker.url || '—')) + ' | ' + (feed ? 'Yayın öncesi kaynak kontrolü; yayın elle.' : 'Instagram etiketi manuel.') + ' |');
  }
  calendar.push('', 'Hiçbir içerik otomatik yayınlanmaz. Mevcut panel yalnız JPEG carousel setlerini manuel yayınlamak için destekler.');
  fs.writeFileSync(path.join(DIR.calendar, 'week-content-calendar.md'), calendar.join('\n') + '\n');

  const captions = ['# Caption, CTA, hashtag ve erişilebilirlik paketi', ''];
  for (const item of data.feed) {
    captions.push('## ' + item.date + ' — ' + item.title, '', '- Format: ' + item.format, '- Önerilen saat: ' + item.suggestedTime + ' (' + item.timeTest + ')', '- Hedef URL: ' + item.targetUrl, '- UTM URL: ' + item.utmUrl, '- CTA: ' + item.cta, '- Hashtag: ' + item.hashtags.join(' '), '', '### Caption', '', item.caption, '');
    if (item.altTexts) captions.push('### Alt metinler', '', ...item.altTexts.map((alt, i) => String(i + 1) + '. ' + alt), '');
    if (item.accessibility) captions.push('### Reel erişilebilirlik açıklaması', '', item.accessibility, '');
    if (item.voiceover) captions.push('### Seslendirme', '', item.voiceover, '');
  }
  fs.writeFileSync(path.join(DIR.captions, 'captions-cta-alt-metinler.md'), captions.join('\n'));

  const stories = ['# Günlük Story paketi', '', 'Her kare 1080 × 1920 JPEG olarak üretildi. Etkileşim, bağlantı veya geri sayım etiketi Instagram uygulamasında belirtilen boş alana manuel eklenmelidir.', ''];
  for (const day of data.days) {
    stories.push('## ' + day.date + ' — ' + day.weekday, '');
    for (const [i, story] of day.stories.entries()) {
      stories.push('### ' + String(i + 1) + '. ' + story.headline.replaceAll('\n', ' '), '', '- Metin: ' + story.body.replaceAll('\n', ' '), '- Etiket: ' + story.sticker.type + (story.sticker.label ? ' — ' + story.sticker.label : ''), ...(story.sticker.url ? ['- Link etiketi metni: ' + story.sticker.label, '- Hedef: ' + story.sticker.url] : []), '- Ekrandaki CTA: ' + story.cta, '- Alt metin: ' + story.accessibility, '- Görsel: ' + story.assetPath, '');
    }
  }
  fs.writeFileSync(path.join(DIR.stories, 'story-plan.md'), stories.join('\n'));

  const sources = ['# Kaynak manifestosu', '', 'Kontrol tarihi: ' + data.researchSnapshot.checkedAt + '. Fırsat carousel’i yayınlanmadan hemen önce her kurumun resmî sayfası yeniden açılmalıdır.', '', '| İçerik | Kaynak türü | Başlık | URL | İçerikte kullanılan doğrulanmış özet | Son kontrol |', '| --- | --- | --- | --- | --- | --- |'];
  for (const item of data.feed) for (const source of item.sources) {
    sources.push('| ' + item.contentId + ' | ' + (source.official ? 'Resmî kurum' : 'StajımVar rehberi/ürün akışı') + ' | ' + source.name + ' | ' + source.url + ' | ' + source.verifiedFacts + ' | ' + (item.checkedAt || data.createdAt) + ' |');
  }
  sources.push('', '## Ortak içerik için doğrulanmış kamuya açık hesaplar', '', 'Bu hesaplara mesaj gönderilmedi. Kullanıcı adı, ilgili üniversitenin kendi sayfasında açıkça verilen Instagram bağlantısından doğrulandı.', '', '| Hesap | Resmî doğrulama sayfası | Uygun ortak içerik | Son kontrol |', '| --- | --- | --- | --- |');
  for (const account of data.publicCollaborationAccounts) sources.push('| ' + account.instagramHandle + ' | ' + account.officialVerificationUrl + ' | ' + account.suitableFor + ' | ' + account.verifiedOn + ' |');
  sources.push('', '## Tespit edilen farklar ve yayın kararı', '');
  for (const entry of data.researchSnapshot.dataDiscrepancies) sources.push('### ' + entry.item, '', '- Site gözlemi: ' + entry.siteObservation, '- Resmî bulgu: ' + entry.officialFinding, '- Önerilen işlem: ' + entry.action, '');
  sources.push('YÜNDER kaydı isim uyuşmazlığı nedeniyle bu içerik haftasına alınmadı.');
  fs.writeFileSync(path.join(DIR.sources, 'source-manifest.md'), sources.join('\n'));
}
function createPanelDrafts(data, drafts) {
  const payload = {
    schema: 'stajimvar-instagram-draft-package/v1',
    generatedAt: data.createdAt,
    panelCapabilities: {
      supports: ['public JPEG carousel preview', 'caption editing', 'manual Instagram publish confirmation'],
      doesNotSupport: ['private draft persistence', 'schedule/status metadata', 'Reel MP4 publishing', 'Story publishing', 'alt text persistence', 'source/UTM metadata display'],
    },
    drafts,
    nonPanelAssets: data.feed.filter((item) => item.format === 'reel').map((item) => ({ contentId: item.contentId, status: 'draft', format: 'reel', videoPath: item.videoPath, srtPath: item.srtPath, coverPath: item.coverPath, note: 'Mevcut panel Reel kaydedemez veya yayınlayamaz; dosyayı CapCut veya Meta Business Suite akışına manuel aktar.' })),
    storyPackage: { status: 'draft', folder: '04-stories', frameCount: data.days.reduce((count, day) => count + day.stories.length, 0), note: 'Mevcut panel Story taslağı tutmaz; uygulamada etiketler manuel eklenir.' },
  };
  fs.writeFileSync(path.join(DIR.handoff, 'panel-draft-import.json'), JSON.stringify(payload, null, 2) + '\n');
  const manifestPath = path.join(DIR.public, 'setler.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const draft of drafts) {
    const entry = { kod: draft.panelDraftCode, ad: draft.title + ' — taslak', surum: 'w35-v1', guncellendi: data.createdAt, metin: draft.caption, etiketler: draft.hashtags, kartlar: draft.cards };
    const existing = manifest.findIndex((item) => item.kod === draft.panelDraftCode);
    if (existing >= 0) manifest[existing] = entry; else manifest.push(entry);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}
function writeHandoff(data, drafts) {
  const text = [
    '# Yayın teslimi ve manuel işlemler', '',
    '## Üretilen paket', '',
    '- 2 adet 1080 × 1350 JPEG carousel (' + drafts.map((d) => d.cards.length).join(' ve ') + ' kart)',
    '- 2 adet 1080 × 1920 sessiz MP4 Reel görsel parçası + SRT + kapak + sahne görselleri',
    '- 28 adet 1080 × 1920 Story karesi',
    '- Caption, CTA, hashtag, alt metin, UTM, kaynak ve ölçüm paketi',
    '- 1 adet dinamik Son 48 saat acil şablonu', '',
    '## Mevcut panelde bırakılanlar', '',
    ...drafts.map((draft) => '- ' + draft.panelDraftCode + ': ' + draft.title + ' — JPEG carousel olarak panelde seçilebilir hazır içerik setidir; Instagram’a gönderilmez.'),
    '', 'Panelde yayın düğmesine basmak Meta’ya gerçek yayın isteği gönderir. Bu görev hiçbir yayın isteği göndermedi.', '',
    '## Yayın öncesi kontrol', '',
    '1. Yönetim → Instagram’da doğru carousel setini seç.',
    '2. Açıklamayı, hashtagleri ve kaynak tarihlerini yeniden kontrol et.',
    '3. Fırsat carousel’inde her kurumun resmî sayfasını aynı gün aç; kapandıysa ya da koşul değiştiyse paylaşma.',
    '4. Instagram’ın yerleşik alt metin alanı varsa 05-captions/captions-cta-alt-metinler.md içinden kart metnini ekle.',
    '5. Reel için 03-reels içindeki MP4, SRT ve kapak dosyasını Meta Business Suite veya CapCut’a aktar. Sessiz videoya yalnız Meta’nın lisanslı müziğini ekle.',
    '6. Story için 04-stories/story-plan.md içindeki etiketleri uygulamada manuel ekle.', '',
    '## Panel sınırı', '',
    'Mevcut sistem statik JPEG carousel listesi kullanır. Reel, Story, yayın saati, alt metin, resmî kaynak, UTM ve taslak durumu için veritabanı/panel desteği yoktur. Bu nedenle bu alanların eksiksiz kaydı 01-calendar/week-content-data.json ve teslim klasöründedir. Bunları panele eklemek için ayrı veri modeli ve yönetim ekranı geliştirmesi gerekir.', '',
    '## Yayın kanalı', '', data.broadcastChannelSuggestion.channelName + ' kanalı oluşturulmadı. Önerilen kullanım: ' + data.broadcastChannelSuggestion.use, '',
    '## Ortak içerik için kamuya açık hesaplar', '',
    ...data.publicCollaborationAccounts.map((account) => '- ' + account.instagramHandle + ' — ' + account.name + '; ' + account.suitableFor + '.'),
    '', 'Üç hesabın da doğrulama sayfası 06-sources/source-manifest.md içindedir. Mesaj gönderilmedi.',
  ].join('\n');
  fs.writeFileSync(path.join(DIR.handoff, 'handoff.md'), text + '\n');
}
function writeMetrics(data) {
  const header = data.metricsTemplate.fields;
  const rows = [header.join(',')];
  for (const item of data.feed) rows.push([item.contentId, item.date + ' ' + item.suggestedTime, ...Array(header.length - 3).fill(''), '"' + item.title + '"'].join(','));
  fs.writeFileSync(path.join(DIR.handoff, 'weekly-metrics-template.csv'), rows.join('\n') + '\n');
  fs.writeFileSync(path.join(DIR.handoff, 'weekly-metrics-method.md'), '# Haftalık değerlendirme yöntemi\n\n' + data.metricsTemplate.evaluationRule + '\n\nSonuç değeri yoksa veri yok yaz; tahmin üretme.\n');
}
async function createCarousel(item) {
  const localDir = path.join(DIR.carousels, path.basename(item.assetFolder));
  const publicDir = path.join(DIR.public, item.panelDraftCode);
  ensure(localDir); ensure(publicDir);
  const cards = [];
  for (const slide of item.slides) {
    const name = String(slide.number).padStart(2, '0') + '-w35-v1.jpg';
    const local = path.join(localDir, name);
    const publicFile = path.join(publicDir, name);
    await writeJpeg(local, carouselSvg(item, slide), W, FEED_H, 95);
    fs.copyFileSync(local, publicFile);
    cards.push('/paylasim/' + item.panelDraftCode + '/' + name);
  }
  return {
    contentId: item.contentId, panelDraftCode: item.panelDraftCode, status: 'draft',
    format: item.format, title: item.title, scheduledDate: item.date, suggestedTime: item.suggestedTime,
    series: item.series, objective: item.objective, targetAudience: item.targetAudience,
    caption: item.caption, cta: item.cta, hashtags: item.hashtags, targetUrl: item.targetUrl,
    utmUrl: item.utmUrl, officialSources: item.sources, checkedAt: item.checkedAt,
    cards, localFolder: item.assetFolder, altTexts: item.altTexts, manualSteps: item.manualSteps,
  };
}
async function createStories(data) {
  for (const day of data.days) for (const [index, story] of day.stories.entries()) {
    await writeJpeg(path.join(PACKAGE, story.assetPath), storySvg(day, story, index), W, STORY_H, 93);
  }
}
async function contactSheet(files, destination, columns, thumbWidth, thumbHeight) {
  const gap = 18;
  const rows = Math.ceil(files.length / columns);
  const width = columns * thumbWidth + (columns + 1) * gap;
  const height = rows * thumbHeight + (rows + 1) * gap;
  const composites = [];
  for (const [index, file] of files.entries()) {
    const input = await sharp(file).resize(thumbWidth, thumbHeight, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer();
    composites.push({
      input,
      left: gap + (index % columns) * (thumbWidth + gap),
      top: gap + Math.floor(index / columns) * (thumbHeight + gap),
    });
  }
  await sharp({ create: { width, height, channels: 3, background: '#F3F4F6' } })
    .composite(composites)
    .jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(destination);
}
async function main() {
  for (const folder of Object.values(DIR).filter((dir) => dir !== DIR.public)) ensure(folder);
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const drafts = [];
  for (const carousel of data.feed.filter((item) => item.format === 'carousel')) drafts.push(await createCarousel(carousel));
  await createStories(data);
  for (const reel of data.feed.filter((item) => item.format === 'reel')) await createReel(reel);
  const carouselFiles = drafts.flatMap((draft) => draft.cards.map((card) => path.join(ROOT, 'public', card.replace(/^\//, ''))));
  const storyFiles = data.days.flatMap((day) => day.stories.map((story) => path.join(PACKAGE, story.assetPath)));
  const reelFiles = data.feed
    .filter((item) => item.format === 'reel')
    .flatMap((item) => [
      path.join(PACKAGE, item.coverPath),
      ...item.storyboard.map((_, index) => path.join(PACKAGE, item.frameFolder, 'scene-' + String(index + 1).padStart(2, '0') + '.jpg')),
    ]);
  await contactSheet(carouselFiles, path.join(DIR.handoff, 'qa-carousel-sheet.jpg'), 7, 220, 300);
  await contactSheet(storyFiles, path.join(DIR.handoff, 'qa-story-sheet.jpg'), 7, 140, 249);
  await contactSheet(reelFiles, path.join(DIR.handoff, 'qa-reel-sheet.jpg'), 4, 220, 391);
  md(data);
  createPanelDrafts(data, drafts);
  writeMetrics(data);
  writeHandoff(data, drafts);
  console.log('Instagram haftalık paket üretildi: ' + PACKAGE);
  console.log('Panel için ' + drafts.length + ' JPEG carousel taslağı hazırlandı. Reel ve Story üretim paketinde kaldı.');
}
await main();
