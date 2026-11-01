import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const KOK = path.resolve(import.meta.dirname, '..');
const GOC = readFileSync(path.join(KOK, 'supabase/migrations/20261222010000_ogulsize_ulke_kodu.sql'), 'utf8');
const kod = GOC.replace(/\/\*[\s\S]*?\*\//g, '');

test('Ogulsize: yalnız iki ilan, kimlik + başlık + şehir + boş ülke koşuluyla TR', () => {
  const satirlar = kod.split(/;\s*/).map((s) => s.trim()).filter(Boolean);
  assert.equal(satirlar.length, 2);
  for (const [id, baslik] of [
    ['ffc10235-ce73-4ffa-9dda-96a3f4354017', 'Modelist Stajyeri'],
    ['2096468c-96cf-45ea-a6bd-6a2682ddbf15', 'Stilist Stajyeri'],
  ]) {
    const s = satirlar.find((x) => x.includes(id));
    assert.ok(s, id);
    assert.match(s, /^update public\.listings set country_code = 'TR'\n/);
    assert.match(s, new RegExp(`title = '${baslik}'`));
    assert.match(s, /city = 'İstanbul' and origin = 'employer_posted' and country_code is null$/);
  }
  /* Başka alan yazılmıyor. */
  assert.doesNotMatch(kod, /set (?!country_code = 'TR')/);
});
