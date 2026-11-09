import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/* İLAN SAYFASI DÜZELTMELERİ (9 Kasım 2026, kullanıcı: "hepsini yap"). */
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

test('çeviri etiketi yalnız çevrilen metinde: şirket ilanında ve Türkçe ilanda yok', () => {
  const s = oku('src/components/ListingPage.tsx');
  assert.match(s, /const ceviriMi = Boolean\(listing\) && listing\?\.applicationMethod !== 'internal' && listing\?\.originalLanguage !== 'tr';/);
  assert.match(s, /\{ceviriMi && \(\s*<span[^>]*>\s*Otomatik çeviri/);
  assert.match(s, /\{ceviriMi && \(\s*<p[^>]*>\s*Bu metin kaynak ilanın otomatik Türkçe çevirisi/);
});

test('başvurduktan sonra "StajımVar ile Başvur" yerine "Bu ilana başvurdun"', () => {
  const s = oku('src/components/ListingPage.tsx');
  assert.match(s, /const basvurdu = Boolean\(listing && yol\.anaEylem === 'platform-ici' && basvurduMu\?\.\(listing\.id\)\);/);
  assert.match(s, /Bu ilana başvurdun/);
  assert.match(oku('src/App.tsx'), /basvurduMu=\{\(ilanId\) => applications\.some\(\(b\) => b\.listingId === ilanId\)\}/);
});

test('yayında olmayan ilan adresi 410; önbelleğe girmiyor', () => {
  const m = oku('functions/_middleware.ts');
  assert.match(m, /if \(sonuc\.tur === 404\) return bulunamadi\(env, request\.url, 410\);/);
  assert.match(m, /ilanCevabi\.status === 410/);
  assert.match(m, /durum: 404 \| 410 = 404/);
});
