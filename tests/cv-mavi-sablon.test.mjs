import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/*
  YAZDIRILABİLİR CV — MAVİ ŞABLON (10 Ekim 2026; lila şablonun yerini aldı)

  Kullanıcının verdiği referans tasarıma uyarlandı. Görsel ölçüler ve PDF
  çıktısı tarayıcıda denendi (dev fikstürü: cv-belgesi-test.html — tam
  CV tek A4 sayfa, boş ikinci sayfa yok; uzun CV iki sayfa, ikinci
  sayfada sol sütun zemini sürüyor; başlıklar PDF metninde bölünmüyor).
  Burada korunan: uydurma bilgi basılmaması, boş bölüm çizilmemesi,
  gizlenen bilginin basılmaması ve yazdırma kuralları.
*/
const CV = fs.readFileSync(new URL('../src/components/CvPage.tsx', import.meta.url), 'utf8');
const kod = CV.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

test('örnek metin yok', () => {
  assert.doesNotMatch(kod, /Lorem|ipsum|baslik="Referanslar"/i);
});

test('adın altına bölüm yazılmıyor', () => {
  const baslik = kod.slice(kod.indexOf('<header'), kod.indexOf('</header>'));
  assert.ok(baslik.includes('{ad}'));
  assert.doesNotMatch(baslik, /department|unvan/);
});

test('mezuniyet yılı yalnız "devam etmiyor" denmişse basılıyor', () => {
  /* Boş mezuniyet yılını okuyucu tahminle dolduruyor (queries/mappers); gerçek bilgi değil. */
  const kullanimlar = kod.match(/graduationYear/g) ?? [];
  assert.equal(kullanimlar.length, 1);
  assert.match(kod, /son: student\.educationOngoing === false \? student\.graduationYear : null/);
});

test('her bölüm yalnız verisi varsa çiziliyor', () => {
  for (const [kosul, baslik] of [
    ['student.bio', 'Hakkımda'],
    ['deneyimler.length > 0', 'Deneyim'],
    ['egitimler.length > 0', 'Eğitim'],
    ['projeler.length > 0', 'Projeler'],
    ['sertifikalar.length > 0', 'Sertifikalar'],
  ]) {
    assert.match(kod, new RegExp(`\\{${kosul.replace(/[.]/g, '\\.')} && \\(\\s*<AnaBolum baslik="${baslik}"`));
  }
  for (const [kosul, baslik] of [
    ['yetenekler.length > 0', 'Yetenekler'],
    ['diller.length > 0', 'Diller'],
    ['ilgiler.length > 0', 'İlgi alanları'],
  ]) {
    assert.match(kod, new RegExp(`\\{${kosul.replace(/[.]/g, '\\.')} && \\(\\s*<YanBolum baslik="${baslik}"`));
  }
  assert.match(kod, /\{iletisim\.length > 0 && \(/);
});

test('sağ sütunun sırası referanstaki gibi', () => {
  const sira = ['Hakkımda', 'Deneyim', 'Eğitim', 'Projeler', 'Sertifikalar'].map((b) => kod.indexOf(`baslik="${b}"`));
  assert.deepEqual([...sira].sort((a, b) => a - b), sira);
  const sol = ['Yetenekler', 'Diller', 'İlgi alanları'].map((b) => kod.indexOf(`baslik="${b}"`));
  assert.deepEqual([...sol].sort((a, b) => a - b), sol);
  /* Sol sütun DOM'da önce: ATS adı ve iletişimi ilk satırlarda buluyor. */
  assert.ok(kod.indexOf('<aside') < kod.indexOf('baslik="Hakkımda"'));
});

test('"CV\'de neler görünsün" ayarı uygulanıyor', () => {
  for (const alan of ['konum', 'telefon', 'eposta', 'linkedin', 'portfoy']) {
    assert.match(kod, new RegExp(`goster\\('${alan}'\\)`), alan);
  }
  assert.match(kod, /const fotografVar = goster\('foto'\) && /);
  assert.match(kod, /const ilgiler = goster\('ilgi'\)/);
  assert.match(kod, /const notGoster = goster\('not'\);/);
  /* Instagram CV'ye hiç basılmıyor. */
  assert.doesNotMatch(kod, /instagram/i);
});

test('dil seviyesi okunamıyorsa çubuk çizilmiyor', () => {
  assert.match(kod, /return kod \? DIL_OLCEGI\[kod\] : ham \? \{ oran: null, etiket: ham \} : null;/);
  assert.match(kod, /\{seviye\?\.oran != null && \(/);
});

test('kayıtlar en yenisi üstte', () => {
  assert.match(kod, /const projeler = \[\.\.\.\(student\.projects \?\? \[\]\)\]\.sort\(projeSirasi\);/);
  assert.match(kod, /if \(a\.suruyor !== b\.suruyor\) return a\.suruyor \? -1 : 1;/);
});

test('mavi şablonun iskeleti ve A4 yazdırma kuralları', () => {
  assert.match(CV, /const YAN_ZEMIN = '#E8EEF5';/);
  assert.match(kod, /grid-cols-\[262px_minmax\(0,1fr\)\]/);
  assert.match(CV, /const SOL_SUTUN = 262;/, 'ikinci sayfa zemini sütunla aynı genişlikte');
  /* Web fontu yok (CSP font-src 'self'): sistem sans. */
  assert.match(CV, /fontFamily: '"Segoe UI", ui-sans-serif/);
  assert.match(kod, /min-h-\[297mm\] w-\[794px\]/);
  assert.match(kod, /@page \{ size: A4; margin: 0; \}/);
  assert.match(kod, /print-color-adjust: exact/);
  assert.match(kod, /\.cv-bolum, \.cv-oge \{ break-inside: avoid; \}/);
  /* Başlıkların harf aralığı dar ve kerning kapalı: geniş aralık PDF metninde "SERTİFİKAL AR" diye bölünüyordu. */
  assert.doesNotMatch(kod, /tracking-\[0\.12em\]/);
});
