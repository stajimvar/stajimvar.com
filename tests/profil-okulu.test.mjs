import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  PROFİLDEKİ OKUL (20261106010000)

  Kullanıcı kararı (24 Eylül 2026): bağlantı şartı yok, profili görebilen
  okulu da görür. `student_profiles` açılmıyor (not ortalaması, CV yolu,
  tercihler aynı satırda); tek kolon döndüren `sosyal_okullari()` profilin
  kendi kapısından (`sosyal_gorunur`) geçiyor. Bu dosya o kapının okulda
  da aynen işlediğini ölçüyor.
*/

const DOSYALAR = [
  '../supabase/migrations/20260921010000_sosyal_katman_semasi.sql',
  '../supabase/migrations/20260921020000_sosyal_katman_rls.sql',
  '../supabase/migrations/20260921030000_sosyal_gecis_kurallari.sql',
  '../supabase/migrations/20260921040000_red_bekleme_ve_sektor_talebi.sql',
  '../supabase/migrations/20260921050000_baglanti_silme_kurali.sql',
  '../supabase/migrations/20260922010000_sosyal_guvenlik_duzeltmeleri.sql',
  '../supabase/migrations/20260923010000_bolum_katalogu.sql',
  '../supabase/migrations/20260923020000_bolum_alan_eslemesi.sql',
  '../supabase/migrations/20260923025000_bolum_alan_seed.sql',
  '../supabase/migrations/20260923030000_sosyal_kurulum_rpc.sql',
].map((yol) => new URL(yol, import.meta.url));

/*
  Görünürlük kapısının GÜNCEL hâli 20260926040000'de ("alan şartı
  kalktı"). O göçün bütün zincirini kurmak yerine fonksiyonun kendisi
  dosyadan kesilip uygulanıyor: kopya elle yazılsaydı canlıdan ayrışabilirdi.
*/
const KAPI_GOCU = new URL('../supabase/migrations/20260926040000_uc_ayri_kavram.sql', import.meta.url);
const GOC = new URL('../supabase/migrations/20261106010000_profil_okulu.sql', import.meta.url);

const BEN = '11111111-1111-4111-8111-111111111111';
const YABANCI = '22222222-2222-4222-8222-222222222222'; // bağlantı yok, başka alan, yayında
const GIZLI = '33333333-3333-4333-8333-333333333333';   // profili yayında değil
const RESMI = '44444444-4444-4444-8444-444444444444';   // resmî hesap
const ENGEL = '55555555-5555-4555-8555-555555555555';   // BEN'i engelleyecek
const OKULSUZ = '66666666-6666-4666-8666-666666666666'; // okul girilmemiş

let db;

async function olarak(kimlik, sql, params = []) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${kimlik}'`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec('reset role; reset request.jwt.claim.sub');
  }
}

const HERKES = [BEN, YABANCI, GIZLI, RESMI, ENGEL, OKULSUZ];

const okullar = async (kim, hedefler = HERKES) =>
  Object.fromEntries(
    (await olarak(kim, `select profil_id, okul from sosyal_okullari($1::uuid[])`, [hedefler])).map((r) => [
      r.profil_id,
      r.okul,
    ]),
  );

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.profiles(
      id uuid primary key references auth.users(id),
      role text not null default 'student'
    );
    alter table public.profiles enable row level security;
    create function public.is_admin() returns boolean
      language sql stable security definer set search_path = public
      as $$ select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false) $$;

    /* Gerçek tablonun ilgili politikası: yalnız kendi satırı. */
    create table public.student_profiles(
      id uuid primary key references public.profiles(id),
      university text,
      gpa numeric
    );
    alter table public.student_profiles enable row level security;
    create policy "ogrenci kendi profili" on public.student_profiles for all using (id = auth.uid());

    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant execute on function public.is_admin() to anon, authenticated;
    grant select on public.profiles to authenticated;
    grant select on public.student_profiles to anon, authenticated;
  `);

  for (const dosya of DOSYALAR) await db.exec(await readFile(dosya, 'utf8'));

  const kapi = (await readFile(KAPI_GOCU, 'utf8')).match(
    /create or replace function sosyal_gizli\.sosyal_gorunur\(hedef uuid\)[\s\S]*?\n\$\$;/,
  );
  assert.ok(kapi, 'sosyal_gorunur tanımı 20260926040000 içinde bulunamadı');
  await db.exec(kapi[0]);

  /* `resmi_mi` (20260928010000) ve `sirket_id` (20261014010000) zincirin dışında; kolonlar burada. */
  await db.exec(`
    alter table public.social_profiles add column if not exists resmi_mi boolean not null default false;
    alter table public.social_profiles add column if not exists sirket_id uuid;
  `);
  await db.exec(await readFile(GOC, 'utf8'));

  await db.exec(`
    insert into auth.users values ${HERKES.map((k) => `('${k}')`).join(',')};
    insert into public.profiles(id) values ${HERKES.map((k) => `('${k}')`).join(',')};
    insert into public.student_profiles(id, university, gpa) values
      ('${BEN}', 'Benim Üniversitem', 3.1),
      ('${YABANCI}', '  Mimar Sinan Güzel Sanatlar Üniversitesi  ', 2.4),
      ('${GIZLI}', 'Gizli Üniversite', 3.0),
      ('${RESMI}', 'Resmî Hesap Üniversitesi', null),
      ('${ENGEL}', 'Engel Üniversitesi', 2.0),
      ('${OKULSUZ}', '   ', 2.0);
  `);
  const bolumler = {
    [BEN]: 'bilgisayar-muhendisligi',
    [YABANCI]: 'moda-tasarimi',
    [GIZLI]: 'bilgisayar-muhendisligi',
    [RESMI]: 'bilgisayar-muhendisligi',
    [ENGEL]: 'bilgisayar-muhendisligi',
    [OKULSUZ]: 'bilgisayar-muhendisligi',
  };
  for (const kim of HERKES) {
    await olarak(kim, `select sosyal_profil_kur($1,$2,$3)`, [`k${kim.slice(0, 6)}`, bolumler[kim], kim !== GIZLI]);
  }
  await db.exec(`update public.social_profiles set resmi_mi = true where profile_id = '${RESMI}'`);
});

test('bağlantı olmadan, başka alandan okul görünüyor; boşluklar kırpılmış', async () => {
  const o = await okullar(BEN);
  assert.equal(o[YABANCI], 'Mimar Sinan Güzel Sanatlar Üniversitesi', 'profili görebilen okulu da görmeli');
  assert.equal(o[BEN], 'Benim Üniversitem', 'kendi okulunu görmeli');
});

test('yayında olmayan profilin okulu yalnız sahibine dönüyor', async () => {
  assert.equal((await okullar(BEN))[GIZLI], undefined, 'GÖRÜNMEYEN PROFİLİN OKULU SIZMAMALI');
  assert.equal((await okullar(GIZLI))[GIZLI], 'Gizli Üniversite');
});

test('resmî hesabın ve okul girilmemiş profilin satırı yok', async () => {
  const o = await okullar(BEN);
  assert.equal(o[RESMI], undefined);
  assert.equal(o[OKULSUZ], undefined, 'boş okul satır olarak dönmemeli');
});

test('engel iki yönlü okulu kapatıyor', async () => {
  assert.equal((await okullar(BEN))[ENGEL], 'Engel Üniversitesi', 'engelden önce görünüyordu');
  await olarak(ENGEL, `insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [ENGEL, BEN]);
  assert.equal((await okullar(BEN))[ENGEL], undefined, 'ENGELLENEN OKULU GÖRMEMELİ');
  assert.equal((await okullar(ENGEL))[BEN], undefined, 'engelleyen de görmemeli');
});

test('yalnız okul adı dönüyor; tablo açılmadı', async () => {
  const kolonlar = (await db.query(
    `select string_agg(p.name, ',' order by p.ordinality) k
       from pg_proc f, unnest(f.proargnames) with ordinality p(name, ordinality)
      where f.proname = 'sosyal_okullari'`,
  )).rows[0].k;
  assert.equal(kolonlar, 'hedefler,profil_id,okul', 'not ortalaması gibi kolonlar DÖNMEMELİ');
  const satir = await olarak(BEN, `select id from student_profiles where id = $1`, [YABANCI]);
  assert.equal(satir.length, 0, 'student_profiles başkasına satır olarak açılmamalı');
});

test('oturumsuz çağrı yetkisiz; 200 kimlikten uzun liste boş dönüyor', async () => {
  const anon = (await db.query(
    `select has_function_privilege('anon','public.sosyal_okullari(uuid[])','execute') v`,
  )).rows[0].v;
  assert.equal(anon, false);
  const uzun = [...Array(200).fill('00000000-0000-4000-8000-000000000000'), YABANCI];
  assert.deepEqual(await okullar(BEN, uzun), {});
});
