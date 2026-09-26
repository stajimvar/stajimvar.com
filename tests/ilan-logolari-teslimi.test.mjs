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
