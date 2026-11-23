import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const g = readFileSync(new URL('../supabase/migrations/20270120010000_panel_ogrenci_sayisi.sql', import.meta.url), 'utf8');

test('paneldeki öğrenci sayıları yalnız öğrenci rolünü sayıyor', () => {
  const ozet = g.slice(g.indexOf('function public.yonetim_ozet()'), g.indexOf('function public.yonetim_ogrenciler('));
  for (const alan of ['ogrenci', 'profilDolu', 'teklifeAcik', 'rozet']) {
    const parca = ozet.slice(ozet.indexOf(`'${alan}',`), ozet.indexOf(`'${alan}',`) + 260);
    assert.match(parca, /join profiles p on p\.id = sp\.id and p\.role = 'student'/, alan);
  }
  assert.doesNotMatch(ozet, /'ogrenci',\s+\(select count\(\*\) from student_profiles\)/);
  /* Başvurudaki ekip ayrımı korunuyor. */
  assert.match(ozet, /'basvuruEkip'/);
  const liste = g.slice(g.indexOf('function public.yonetim_ogrenciler('));
  assert.match(liste, /join profiles p on p\.id = sp\.id and p\.role = 'student'/);
  assert.doesNotMatch(liste, /left join profiles p on p\.id = sp\.id/);
  assert.match(g, /revoke all on function public\.yonetim_ozet\(\) from public, anon;/);
  assert.match(g, /revoke all on function public\.yonetim_ogrenciler\(text, int, int\) from public, anon;/);
});
