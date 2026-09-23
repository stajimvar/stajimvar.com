import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  İLAN YAPISAL VERİSİNDE SON BAŞVURU TARİHİ

  Search Console 22 Eylül 2026'da uyardı: "validThrough alanı eksik"
  (kritik olmayan). Alan veritabanında zaten vardı —
  `application_deadline` ilan sorgusunda çekiliyordu — ama yapısal
  veriye hiç yazılmıyordu.

  TARİHİ OLANA YAZILIYOR, OLMAYANA YAZILMIYOR

  Ölçüldü: 188 ilan sayfasının 9'unda gerçek son başvuru tarihi var.
  Kalan 179'u için tarih uydurmak ("ilan + 30 gün" gibi) kapanmış bir
  ilanı açık ya da açık bir ilanı kapalı göstermek olurdu. Google'ın
  kendi kılavuzu da aynı şeyi söylüyor: bitiş tarihi bilinmiyorsa alan
  KONULMAZ, ilan bir süre sonra kendiliğinden düşürülür.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const ONRENDER = fs.readFileSync(path.join(KOK, 'scripts', 'onrender.mjs'), 'utf8');

/* JobPosting bloğu: başından employmentType satırına kadar. */
const BLOK = (() => {
  const bas = ONRENDER.indexOf("'@type': 'JobPosting'");
  assert.ok(bas > 0, 'JobPosting bloğu bulunamadı');
  return ONRENDER.slice(bas, ONRENDER.indexOf('hiringOrganization', bas));
})();

test('son basvuru tarihi yapisal veriye yaziliyor', () => {
  assert.match(BLOK, /validThrough: String\(i\.application_deadline\)\.slice\(0, 10\)/);
});

test('tarih yoksa alan hic yazilmiyor', () => {
  /* Koşullu yayma: eşleşme yoksa boş nesne, yani alan çıktıya girmiyor. */
  assert.match(BLOK, /\?\s*\{ validThrough:[\s\S]{0,80}\}\s*:\s*\{\}\)/);
});

test('tarih uydurulmuyor', () => {
  /*
    Bir gün "eksik tarihleri doldur" diye bir varsayılan eklenirse bu
    test düşer. Kapanmış ilanı açık göstermek, eksik alandan kötü.
  */
  assert.ok(!/validThrough[^\n]*Date\.now/.test(BLOK), 'bugünden türetilmiş tarih yazılmamalı');
  assert.ok(!/validThrough[^\n]*posted_at/.test(BLOK), 'ilan tarihinden türetilmiş tarih yazılmamalı');
  assert.ok(!/validThrough[^\n]*\+\s*\d+/.test(BLOK), 'gün eklenerek tarih üretilmemeli');
});

test('bicim tek: saat kismi atiliyor', () => {
  /*
    Kaynak bazen "2026-09-14", bazen tam zaman damgası veriyor. İkisi de
    geçerli ama tek biçim çıktıdaki farkı okunur tutuyor.
  */
  assert.ok(BLOK.includes(".slice(0, 10).match("), 'tarih 10 karaktere kırpılmalı');
  assert.ok(BLOK.includes('d{4}') && BLOK.includes('d{2}'), 'biçim düzenli ifadeyle doğrulanmalı');
});
