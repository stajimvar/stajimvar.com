import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  CV VE PROFİL ALANLARI (20261206010000)

  Öğrenci profilini bir kez doldurup kurumsal bir CV indirebilmeli.
  Denetimde eksik çıkanlar: birden fazla eğitim, sertifikalar, ilgi
  alanları, eğitim düzeyi/başlangıcı, deneyimde çalışma türü, projede
  tarih ve CV'de neyin görüneceği tercihi.

  Bu testler GÖÇÜN ve VERİ KATMANININ sözleşmesini tutuyor: göç yalnız
  ekliyor, yeni tablolar yalnız sahibine açık, arayüzdeki değer
  listeleri sunucudaki CHECK listeleriyle birebir.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');
const GOC = oku('supabase/migrations/20261206010000_cv_profil_alanlari.sql');
const TIPLER = oku('src/types.ts');
const ESLEYICI = oku('src/lib/queries/mappers.ts');
const SORGU = oku('src/lib/queries/index.ts');

/* Kısıt adından sonraki İLK `in (…)` ya da `array[…]` listesi. */
const sqlListe = (kisit) => {
  const bas = GOC.indexOf(kisit);
  assert.ok(bas > 0, `${kisit} bulunamadı`);
  const sonrasi = GOC.slice(bas);
  const m = sonrasi.match(/(?:\bin\s*\(|array\[)([^)\]]+)[)\]]/);
  assert.ok(m, `${kisit}: liste bulunamadı`);
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
};
const tsBirlesim = (ad) => {
  const m = TIPLER.match(new RegExp(`export type ${ad} =([^;]+);`));
  assert.ok(m, `${ad} tipi yok`);
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
};

test('göç yalnız ekliyor: sütun ya da tablo silinmiyor', () => {
  const yorumsuz = GOC.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(yorumsuz, /drop\s+column/i);
  assert.doesNotMatch(yorumsuz, /drop\s+table/i);
  assert.doesNotMatch(yorumsuz, /\bupdate\s+public\./i, 'mevcut değerler değiştirilmemeli');
  assert.doesNotMatch(yorumsuz, /\bdelete\s+from/i);
});

test('eğitimin sürdüğü bilinmiyorsa uydurulmuyor', () => {
  /*
    `true` varsayılanı, zaten mezun olmuş kullanıcıları CV'de "Devam
    ediyor" gösterirdi. Sütun boş başlıyor.
  */
  assert.match(GOC, /add column if not exists education_ongoing\s+boolean,/);
});

test('CV gizleme anahtarları sunucuyla aynı', () => {
  assert.deepEqual(tsBirlesim('CvGizliAlan'), sqlListe('student_profiles_cv_gizli_check\n'));
});

test('eğitim düzeyleri sunucuyla aynı', () => {
  assert.deepEqual(tsBirlesim('EgitimDuzeyi'), sqlListe('student_profiles_education_level_check\n'));
  assert.deepEqual(tsBirlesim('EgitimDuzeyi'), sqlListe('student_educations_level_check\n'));
});

test('çalışma türleri sunucuyla aynı', () => {
  assert.deepEqual(tsBirlesim('CalismaTuru'), sqlListe('student_experiences_employment_type_check\n'));
});

test('yeni tablolar yalnız sahibine ve yöneticiye açık', () => {
  for (const tablo of ['student_educations', 'student_certificates']) {
    assert.match(GOC, new RegExp(`alter table public\\.${tablo}\\s+enable row level security`));
    assert.match(GOC, new RegExp(`revoke all on public\\.${tablo}\\s+from public, anon, authenticated`));
    const bas = GOC.indexOf(`on public.${tablo}\n  for all to authenticated`);
    assert.ok(bas > 0, `${tablo}: sahip politikası yok`);
    assert.match(
      GOC.slice(bas, bas + 200),
      /using \(student_id = auth\.uid\(\)\)\s+with check \(student_id = auth\.uid\(\)\)/,
    );
  }
  /* anon'a hiçbir yetki verilmiyor. */
  assert.doesNotMatch(GOC, /grant [^;]* to anon/);
});

test('sertifika bağlantısı yalnız http(s)', () => {
  /* `javascript:` gibi bir adres CV'de tıklanabilir olurdu. */
  assert.ok(GOC.includes("url ~* '^https?://'"));
});

test('kişi başına üst sınır var', () => {
  assert.match(GOC, /create trigger student_educations_siniri/);
  assert.match(GOC, /create trigger student_certificates_siniri/);
  assert.match(GOC, /if adet >= 30 then/);
});

test('profil okuması yeni tabloları da getiriyor', () => {
  assert.match(SORGU, /student_educations \( \* \),\s+student_certificates \( \* \)/);
  assert.match(ESLEYICI, /educations: sirala\(row\.student_educations\)\.map\(toStudentEducation\)/);
  assert.match(ESLEYICI, /certificates: sirala\(row\.student_certificates\)\.map\(toStudentCertificate\)/);
});

test('kaydetme her yeni alanı ilgili tabloya dağıtıyor', () => {
  assert.match(SORGU, /if \(patch\.educations\) await replaceStudentEducations\(userId, patch\.educations\);/);
  assert.match(SORGU, /if \(patch\.certificates\) await replaceStudentCertificates\(userId, patch\.certificates\);/);
  assert.match(SORGU, /employment_type: d\.employmentType \|\| null/);
  assert.match(SORGU, /start_year: project\.startYear \|\| null/);
  for (const alan of ['education_level', 'education_start_year', 'education_ongoing', 'interests', 'cv_gizli']) {
    assert.ok(ESLEYICI.includes(`ekYama.${alan} =`), `${alan} yazılmıyor`);
  }
});

test('ilgi alanlarında tekrar ve boşluk sunucuya gitmiyor', () => {
  assert.match(ESLEYICI, /const anahtar = i\.toLocaleLowerCase\('tr-TR'\);/);
  assert.match(ESLEYICI, /\.slice\(0, 20\);/);
});
