import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/*
  YAZDIRILABİLİR CV — LİLA ŞABLON (7 Ekim 2026)

  Kullanıcının verdiği referans tasarıma uyarlandı. Görsel ölçüler
  tarayıcıda denendi (dev fikstürü: cv-belgesi-test.html); burada
  korunan, şablonun uydurma bilgi basmaması ve boş bölüm çizmemesi.
*/
const CV = fs.readFileSync(new URL('../src/components/CvPage.tsx', import.meta.url), 'utf8');
const kod = CV.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

test('referanstaki Sertifikalar ve Referanslar bölümleri uydurulmuyor', () => {
  assert.doesNotMatch(kod, /baslik="Sertifikalar"|baslik="Referanslar"/);
  assert.doesNotMatch(kod, /Lorem|ipsum/i);
});

test('mezuniyet yılı basılmıyor: boşsa okuyucu onu tahminle dolduruyor', () => {
  assert.doesNotMatch(kod, /graduationYear/);
});

test('her bölüm yalnız verisi varsa çiziliyor', () => {
  for (const [kosul, baslik] of [
    ['deneyimler.length > 0', 'Deneyim'],
    ['egitimVar', 'Eğitim'],
    ['projeler.length > 0', 'Projeler'],
    ['hedefler.length > 0', 'Aradığım pozisyonlar'],
  ]) {
    assert.match(kod, new RegExp(`\\{${kosul.replace(/[.]/g, '\\.')} && \\(\\s*<AnaBolum baslik="${baslik}"`));
  }
  for (const [kosul, baslik] of [
    ['iletisim.length > 0', 'İletişim'],
    ['student.bio', 'Hakkımda'],
    ['yetenekler.length > 0', 'Beceriler'],
    ['sosyal.length > 0', 'Kişisel beceriler'],
    ['diller.length > 0', 'Diller'],
  ]) {
    assert.match(kod, new RegExp(`\\{${kosul.replace(/[.]/g, '\\.')} && \\(\\s*<YanBolum baslik="${baslik}"`));
  }
});

test('lila şablonun iskeleti: sol geniş sütun, sağda fotoğraflı beyaz kart', () => {
  assert.match(CV, /const LILA = '#E6E0F8';/);
  assert.match(kod, /grid-cols-\[61%_39%\]/);
  assert.match(kod, /rounded-t-\[30px\] bg-white/);
  assert.match(kod, /rounded-full px-6 py-2/, 'sol bölüm başlıkları lila hap');
  /* Web fontu yok (CSP font-src 'self'): sistem sans. */
  assert.match(CV, /fontFamily: '"Segoe UI", ui-sans-serif/);
  /* A4 ve yazdırma kuralları duruyor. */
  assert.match(kod, /min-h-\[297mm\] w-\[794px\]/);
  assert.match(kod, /@page \{ size: A4; margin: 0; \}/);
  assert.match(kod, /print-color-adjust: exact/);
});
