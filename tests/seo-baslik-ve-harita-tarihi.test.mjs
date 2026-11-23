import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stajIlanlariBasligi, stajIlanlariYili, ANA_SAYFA_BASLIGI } from '../src/lib/seo/staj-ilanlari-basligi.mjs';
import { SABLON_DEGISIKLIKLERI, enYeniTarih } from '../src/lib/seo/sablon-tarihleri.mjs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('/staj-ilanlari yılı: Eylülden itibaren gelecek yıl', () => {
  assert.equal(stajIlanlariYili(new Date(2026, 7, 31)), 2026);
  assert.equal(stajIlanlariYili(new Date(2026, 8, 1)), 2027);
  assert.equal(stajIlanlariYili(new Date(2027, 0, 15)), 2027);
  assert.equal(stajIlanlariBasligi(new Date(2026, 10, 23)), 'Staj İlanları 2027 — Güncel Stajyer İş İlanları | StajımVar');
});

test('ana sayfa "staj ilanları" aramasını /staj-ilanlari ile bölmüyor', () => {
  assert.doesNotMatch(ANA_SAYFA_BASLIGI, /staj ilanlar/i);
  const o = oku('scripts/onrender.mjs');
  assert.match(o, /baslik: stajIlanlariBasligi\(\),/);
  assert.match(o, /baslik: ANA_SAYFA_BASLIGI,/);
  /* Ana sayfa asıl sayfaya bağlanıyor. */
  assert.match(o, /\['\/staj-ilanlari', 'Tüm staj ilanları'\]/);
});

test('harita tarihi: veri ve şablon tarihinin yenisi; derleme günü değil', () => {
  assert.equal(enYeniTarih('2026-09-14T10:00:00Z', SABLON_DEGISIKLIKLERI.sirket), '2026-11-17');
  assert.equal(enYeniTarih('2026-12-01T10:00:00Z', SABLON_DEGISIKLIKLERI.sirket), '2026-12-01');
  assert.equal(enYeniTarih(null, undefined), null);
  const o = oku('scripts/onrender.mjs');
  assert.match(o, /lastmod: enYeniTarih\(b\.guncelleme, SABLON_DEGISIKLIKLERI\.bolum\),/);
  assert.match(o, /lastmod: enYeniTarih\(\.\.\.s\.ilanlar\.map\(\(x\) => x\.updated_at\), SABLON_DEGISIKLIKLERI\.sirket\),/);
  assert.doesNotMatch(oku('src/lib/seo/sablon-tarihleri.mjs'), /new Date\(/);
});
