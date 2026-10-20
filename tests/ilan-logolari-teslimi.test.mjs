import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/*
  İLAN LOGOLARI — 26 EYLÜL 2026 TESLİMİ

  Göç teslimdeki SQL'in aynısı (begin/commit hariç): yedi şirket, kimlik
  ve adla eşleşme, yalnız boş logo alanı. NREL teslimin dışında.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const GOC = oku('supabase/migrations/20261113010000_ilan_logolari_esleme.sql');
const TESLIM = oku('scripts/sql/ilan-logolari-2026-09-26.sql');
const kod = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^--.*$/gm, '').trim();

test('göç gövdesi teslimdeki SQL ile aynı (begin/commit hariç)', () => {
  const teslimGovde = kod(TESLIM).replace(/^begin;\s*/, '').replace(/\s*commit;$/, '').trim();
  assert.equal(kod(GOC), teslimGovde);
});

test('yedi şirket, her biri kimlik + ad + boş logo koşuluyla; dosyalar public altında', () => {
  const satirlar = kod(GOC).split(/;\s*/).filter(Boolean);
  assert.equal(satirlar.length, 7);
  for (const s of satirlar) {
    assert.match(s, /^update public\.companies set logo_url = 'https:\/\/stajimvar\.com\/isveren-logolari\/[a-z0-9-]+\.(svg|png|jpg)'/);
    assert.match(s, /where id = '[0-9a-f-]{36}' and name = '[^']+' and nullif\(btrim\(logo_url\), ''\) is null$/);
    const dosya = s.match(/isveren-logolari\/([a-z0-9-]+\.(?:svg|png|jpg))/)[1];
    assert.ok(existsSync(path.join(KOK, 'public', 'isveren-logolari', dosya)), dosya);
  }
});

test('NREL teslimin dışında', () => {
  assert.doesNotMatch(GOC.replace(/\/\*[\s\S]*?\*\//g, ''), /nrel/i);
  assert.ok(!existsSync(path.join(KOK, 'public', 'isveren-logolari', 'nrel-legacy.png')));
});

/*
  İLAN LOGOLARI — 19 EKİM 2026 TESLİMİ

  Beş şirket (P&G, Hilti, GSK, Lilly, TSKB); kullanıcının verdiği dosyalar
  128 × 128 PNG. Aynı güvenceler: kimlik + ad eşleşmesi, yalnız boş alan.
*/
const GOC_EKIM = oku('supabase/migrations/20261216010000_ilan_logolari_pg_hilti_gsk_lilly_tskb.sql');

test('19 Ekim: beş şirket, kimlik + ad + boş logo koşulu; dosyalar 128 × 128 PNG', () => {
  const satirlar = kod(GOC_EKIM).split(/;\s*/).filter(Boolean);
  assert.equal(satirlar.length, 5);
  const beklenen = ['procter-gamble', 'hilti', 'gsk', 'lilly', 'tskb'];
  satirlar.forEach((s, i) => {
    assert.match(s, new RegExp(`^update public\.companies set logo_url = 'https://stajimvar\.com/isveren-logolari/${beklenen[i]}\.png'`));
    assert.match(s, /where id = '[0-9a-f-]{36}' and name = '[^']+' and nullif\(btrim\(logo_url\), ''\) is null$/);
    const dosya = readFileSync(path.join(KOK, 'public', 'isveren-logolari', `${beklenen[i]}.png`));
    /* PNG imzası ve IHDR genişlik/yükseklik: 128 × 128. */
    assert.equal(dosya.subarray(1, 4).toString('latin1'), 'PNG');
    assert.equal(dosya.readUInt32BE(16), 128);
    assert.equal(dosya.readUInt32BE(20), 128);
  });
});

/*
  İLAN LOGOLARI — 20 EKİM 2026 TESLİMİ

  Üç şirket (BCG, ALPLA, Porsche); kullanıcının verdiği dosyalar 128 × 128 PNG.
*/
const GOC_EKIM_20 = oku('supabase/migrations/20261217010000_ilan_logolari_bcg_alpla_porsche.sql');

test('20 Ekim: üç şirket, kimlik + ad + boş logo koşulu; dosyalar 128 × 128 PNG', () => {
  const satirlar = kod(GOC_EKIM_20).split(/;\s*/).filter(Boolean);
  assert.equal(satirlar.length, 3);
  const beklenen = ['boston-consulting-group', 'alpla', 'porsche'];
  satirlar.forEach((s, i) => {
    assert.match(s, new RegExp(`^update public\.companies set logo_url = 'https://stajimvar\.com/isveren-logolari/${beklenen[i]}\.png'`));
    assert.match(s, /where id = '[0-9a-f-]{36}' and name = '[^']+' and nullif\(btrim\(logo_url\), ''\) is null$/);
    const dosya = readFileSync(path.join(KOK, 'public', 'isveren-logolari', `${beklenen[i]}.png`));
    assert.equal(dosya.subarray(1, 4).toString('latin1'), 'PNG');
    assert.equal(dosya.readUInt32BE(16), 128);
    assert.equal(dosya.readUInt32BE(20), 128);
  });
});
