import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  KAMPÜSÜM VERİSİ (20261108010000)

  Ölçülenler: okul eşleşmesi birebir (benzerlik yok), menü yalnız kendi
  TARİHİNDE gösteriliyor, kaynak adresi resmî alan adında olmak zorunda,
  tablolar istemciye kapalı ve okuma yalnız bakan öğrencinin okulu için.
*/

const GOC = new URL('../supabase/migrations/20261108010000_kampus_verisi.sql', import.meta.url);

const MSGSU_OGRENCI = '11111111-1111-4111-8111-111111111111';
const KISA_ADLI = '22222222-2222-4222-8222-222222222222';
const BENZER_ADLI = '33333333-3333-4333-8333-333333333333';
const OKULSUZ = '44444444-4444-4444-8444-444444444444';
const BASKA_OKUL = '55555555-5555-4555-8555-555555555555';
const MSGSU = 'mimar-sinan-guzel-sanatlar-universitesi';

let db;

async function olarak(kimlik, sql, params = []) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${kimlik}'`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec('reset role; reset request.jwt.claim.sub');
  }
}

async function hata(sql, params = [], kimlik = null) {
  try {
    if (kimlik) await olarak(kimlik, sql, params);
    else await db.query(sql, params);
    return null;
  } catch (e) {
    return String(e.message || e);
  }
}

const kampus = async (kim) => (await olarak(kim, `select kampusum() k`))[0].k;

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.student_profiles(id uuid primary key, university text, gpa numeric);
    alter table public.student_profiles enable row level security;
    create policy "kendi" on public.student_profiles for all using (id = auth.uid());
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant select on public.student_profiles to authenticated;
  `);
  await db.exec(await readFile(GOC, 'utf8'));
  await db.exec(`
    insert into public.student_profiles(id, university) values
      ('${MSGSU_OGRENCI}', 'Mimar Sinan Güzel Sanatlar Üniversitesi'),
      ('${KISA_ADLI}', '  msgsü '),
      ('${BENZER_ADLI}', 'Mimar Sinan Üniversitesi'),
      ('${OKULSUZ}', null),
      ('${BASKA_OKUL}', 'İstanbul Teknik Üniversitesi');
  `);
  const bugun = (await db.query(`select (now() at time zone 'Europe/Istanbul')::date::text g`)).rows[0].g;
  await db.query(
    `insert into kampus_menuleri(universite_id, tarih, ogun, yemekler, kalori, kaynak_url) values
       ($1, $2::date, 'gunluk', array['MERCİMEK ÇORBA','KARNIYARIK'], 950, 'https://msgsu.edu.tr/a.pdf'),
       ($1, $2::date - 1, 'gunluk', array['DÜNÜN YEMEĞİ'], 900, 'https://msgsu.edu.tr/a.pdf')`,
    [MSGSU, bugun],
  );
  await db.query(
    `insert into universite_duyurulari(universite_id, baslik, yayin_tarihi, url, kaynak_url) values
       ($1, 'Yeni duyuru', $2::date, 'https://msgsu.edu.tr/d1', 'https://msgsu.edu.tr/wp-json/wp/v2/posts'),
       ($1, 'Eski duyuru', $2::date - 60, 'https://msgsu.edu.tr/d0', 'https://msgsu.edu.tr/wp-json/wp/v2/posts')`,
    [MSGSU, bugun],
  );
});

test('resmî ad ve doğrulanmış kısa ad birebir eşleşiyor', async () => {
  assert.equal((await kampus(MSGSU_OGRENCI)).universite.id, MSGSU);
  assert.equal((await kampus(KISA_ADLI)).universite.id, MSGSU, 'büyük/küçük harf ve boşluk farkı eşleşmeli');
});

test('benzer ad ve başka okul eşleşmiyor; okulsuz öğrenci ayrı durum', async () => {
  const benzer = await kampus(BENZER_ADLI);
  assert.equal(benzer.universite, null, 'BENZERLİKLE EŞLEŞME YAPILMAMALI');
  assert.equal(benzer.ogrenci_okulu, 'Mimar Sinan Üniversitesi');
  assert.equal((await kampus(BASKA_OKUL)).universite, null);
  const okulsuz = await kampus(OKULSUZ);
  assert.equal(okulsuz.ogrenci_okulu, null, 'okul girilmemişse "Üniversiteni ekle" durumu');
  assert.equal(okulsuz.menu, null);
  assert.deepEqual(okulsuz.duyurular, []);
});

test('menü yalnız bugünün satırı; dünkü menü bugün gibi verilmiyor', async () => {
  const k = await kampus(MSGSU_OGRENCI);
  assert.equal(k.menu.tarih, k.bugun);
  assert.deepEqual(k.menu.ogunler.map((o) => o.yemekler), [['MERCİMEK ÇORBA', 'KARNIYARIK']]);
  assert.equal(k.menu.ogunler[0].ogun, 'gunluk');
  assert.ok(!JSON.stringify(k).includes('DÜNÜN YEMEĞİ'), 'DÜNÜN MENÜSÜ SIZMAMALI');
  assert.ok(k.menu_kaynagi, 'yemek kaynağı tanımlı olmalı');
});

test('duyurular son 30 günle sınırlı', async () => {
  const k = await kampus(MSGSU_OGRENCI);
  assert.deepEqual(k.duyurular.map((d) => d.baslik), ['Yeni duyuru']);
});

test('kaynak adresi resmî alan adında ve https olmak zorunda', async () => {
  assert.match(
    await hata(`insert into universite_kaynaklari(universite_id, tur, ayristirici, url) values ($1,'yemek','x','https://msgsu.edu.tr.kotu.com/m')`, [MSGSU]),
    /kaynak-resmi-alanda-degil/,
  );
  assert.match(
    await hata(`insert into universite_kaynaklari(universite_id, tur, ayristirici, url) values ($1,'yemek','x','https://baskasite.com/m')`, [MSGSU]),
    /kaynak-resmi-alanda-degil/,
  );
  assert.match(
    await hata(`insert into universite_kaynaklari(universite_id, tur, ayristirici, url) values ($1,'yemek','x','http://msgsu.edu.tr/m')`, [MSGSU]),
    /kaynak-https-olmali/,
  );
  assert.equal(
    await hata(`insert into universite_kaynaklari(universite_id, tur, ayristirici, url) values ($1,'yemek','x','https://sks.msgsu.edu.tr/m')`, [MSGSU]),
    null,
    'alt alan adı kabul edilmeli',
  );
});

test('tablolar istemciye kapalı; oturumsuz çağrı yetkisiz', async () => {
  for (const t of ['universiteler', 'universite_kaynaklari', 'kampus_menuleri', 'universite_duyurulari']) {
    assert.ok(await hata(`select * from ${t}`, [], MSGSU_OGRENCI), `${t} doğrudan okunmamalı`);
  }
  const anon = (await db.query(`select has_function_privilege('anon','public.kampusum()','execute') v`)).rows[0].v;
  assert.equal(anon, false);
});
