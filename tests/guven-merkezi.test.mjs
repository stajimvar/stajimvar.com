import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  GÜVEN MERKEZİ (26 Kasım 2026)

  /guvenlik yasal kabukta; alt bilgide, kurumsal gezintide ve ön render
  başlık listesinde var, reklam kapalı. Metin yalnız doğrulanmış iddia
  taşıyor: kendi sertifikamız olmadığı ve yönetici erişimi açıkça yazıyor.
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

test('/guvenlik her yere bağlı ve reklamsız', () => {
  assert.match(oku('src/lib/yasal-rotalar.ts'), /'\/guvenlik': 'guvenlik'/);
  assert.match(oku('src/components/Footer.tsx'), /\{ label: "Güven Merkezi", href: "\/guvenlik" \}/);
  assert.match(oku('src/components/kurumsal/KurumsalKabuk.tsx'), /slug: 'guvenlik', ad: 'Güven Merkezi', yol: '\/guvenlik'/);
  assert.match(oku('scripts/onrender.mjs'), /'\/guvenlik': \[\s*'Güven Merkezi \| StajımVar'/);
  assert.match(oku('src/lib/reklam-kapisi.mjs'), /'\/guvenlik',/);
});

test('metin dürüst: satış yok, sertifikalar sağlayıcının, yönetici erişimi yazıyor, CV bağlantısı ömrüyle aynı', async () => {
  const s = oku('src/components/LegalPage.tsx');
  const metin = s.slice(s.indexOf("{slug === 'guvenlik' && ("), s.indexOf("{slug === 'kvkk-aydinlatma-metni' && ("));
  assert.match(metin, /Öğrenci verisi satmıyoruz/);
  assert.match(metin, /StajımVar&apos;ın kendi adına aldığı bir\s+sertifika ya da bağımsız denetim raporu henüz yok/);
  assert.match(metin, /verilere\s+teknik erişimimiz var/);
  assert.match(metin, /Frankfurt/);
  const { CV_IMZA_OMRU } = await import('../src/lib/cv-kurallari.mjs');
  assert.equal(CV_IMZA_OMRU, 600);
  assert.match(metin, /yalnızca 10 dakika geçerli/);
});
