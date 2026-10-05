import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  BAŞVURU İLİŞKİSİYLE SINIRLI ADAY İNCELEMESİ (20261121010000)

  İzole PGlite; üretime dokunulmuyor. Göç olduğu gibi uygulanıyor; sorgular
  gerçek `authenticated` rolüyle ve JWT iddialarıyla çalışıyor. Depolama
  izni `storage.objects` üzerinde RLS ile sınanıyor.

    · güncel profil yalnız ilanın sahibi DOĞRULANMIŞ şirkete, rıza varsa
    · paylaşımlar yalnız öğrenci O başvuruda izin verdiyse; gizli profil,
      arşivlenmiş ya da hazır olmayan paylaşım açılmıyor
    · aynı öğrencinin başka şirkete başvurusu izni taşımıyor
    · izni yalnız öğrenci verip geri alabiliyor; eski başvuru izinsiz
*/

const GOC = new URL('../supabase/migrations/20261121010000_basvuru_aday_incelemesi.sql', import.meta.url);

const OGRENCI = '11111111-1111-4111-8111-111111111111';
const BASKA_OGRENCI = '12121212-1212-4121-8121-121212121212';
const UYE_A = '22222222-2222-4222-8222-222222222222';
const UYE_B = '33333333-3333-4333-8333-333333333333';
const UYE_C = '44444444-4444-4444-8444-444444444444'; // doğrulanmamış şirket
const SIRKET_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SIRKET_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SIRKET_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ILAN_A1 = 'a0000000-0000-4000-8000-000000000001';
const ILAN_A2 = 'a0000000-0000-4000-8000-000000000002';
const ILAN_B = 'b0000000-0000-4000-8000-000000000001';
const ILAN_C = 'c0000000-0000-4000-8000-000000000001';
const BASVURU_A1 = 'f0000000-0000-4000-8000-0000000000a1';
const BASVURU_A2 = 'f0000000-0000-4000-8000-0000000000a2';
const BASVURU_B = 'f0000000-0000-4000-8000-0000000000b1';
const BASVURU_C = 'f0000000-0000-4000-8000-0000000000c1';
const BASVURU_RIZASIZ = 'f0000000-0000-4000-8000-0000000000d1';
const POST_HAZIR = 'd0000000-0000-4000-8000-000000000001';
const POST_ARSIV = 'd0000000-0000-4000-8000-000000000002';
const POST_TASLAK = 'd0000000-0000-4000-8000-000000000003';
const POST_BASKA = 'd0000000-0000-4000-8000-000000000004';

let db;

async function olarak(kim, sql, params = []) {
  await db.query(`select set_config('request.jwt.claims', $1, false)`,
    [JSON.stringify({ role: 'authenticated', sub: kim })]);
  await db.exec('set role authenticated');
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claims', '', false)`);
  }
}

const guncel = (kim, b) => olarak(kim, `select public.basvuru_aday_guncel_profili($1) s`, [b]).then((r) => r[0].s);
const paylasimlar = (kim, b) => olarak(kim, `select public.basvuru_aday_paylasimlari($1) s`, [b]).then((r) => r[0].s);
const izin = (kim, b, acik) => olarak(kim, `select public.basvuru_paylasim_izni($1, $2) t`, [b, acik]).then((r) => r[0].t);
const dosyalar = (kim) =>
  olarak(kim, `select name from storage.objects where bucket_id = 'sosyal-paylasim' order by name`).then((r) => r.map((x) => x.name));

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    grant usage on schema auth to anon, authenticated;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub', '')::uuid $$;
    grant usage on schema public to anon, authenticated;
    create schema sosyal_gizli;
    grant usage on schema sosyal_gizli to authenticated;

    create table public.companies(id uuid primary key, verified boolean not null default false);
    create table public.company_members(company_id uuid, user_id uuid);
    create table public.listings(id uuid primary key, company_id uuid, title text);
    grant select on public.listings to authenticated;
    create function public.is_company_member(p uuid) returns boolean language sql stable security definer
      set search_path = public as $$ select exists (select 1 from company_members where company_id = p and user_id = auth.uid()) $$;
    create function public.sirket_dogrulandi(p uuid) returns boolean language sql stable security definer
      set search_path = public as $$ select exists (select 1 from companies where id = p and verified) $$;
    grant execute on function public.is_company_member(uuid), public.sirket_dogrulandi(uuid) to authenticated;

    create table public.applications(
      id uuid primary key, listing_id uuid, student_id uuid, status text default 'submitted',
      application_method text not null default 'internal', contact_share_consent_at timestamptz,
      profile_snapshot jsonb);
    alter table public.applications enable row level security;
    create policy "ogrenci kendi basvurulari" on public.applications for all
      using (student_id = auth.uid()) with check (student_id = auth.uid());
    create policy "dogrulanmis sirket basvurulari gorur" on public.applications for all
      using (exists (select 1 from listings l where l.id = listing_id and is_company_member(l.company_id) and sirket_dogrulandi(l.company_id)));
    grant select, insert, update on public.applications to authenticated;

    create table public.profiles(id uuid primary key, full_name text, avatar_url text, phone text, email text);
    create table public.student_profiles(id uuid primary key, university text, department text, grade_level text,
      pref_cities text[], github_username text, portfolio_url text, linkedin_url text, earned_badges text[],
      gpa numeric, updated_at timestamptz default now());
    create table public.student_skills(student_id uuid, name text);
    create table public.student_languages(student_id uuid, language text, level text);
    create table public.student_projects(student_id uuid, title text, description text, live_url text,
      github_url text, sort_order int, created_at timestamptz default now());
    /* Canlıdaki geniş okuma politikaları (göç bunları kaldırmalı) + öğrencinin kendi politikası. */
    alter table public.student_profiles enable row level security;
    alter table public.student_projects enable row level security;
    alter table public.student_skills enable row level security;
    grant select on public.student_profiles, public.student_projects, public.student_skills to authenticated;
    create policy "ogrenci kendi profili" on public.student_profiles for all using (id = auth.uid());
    create policy "kendi projeleri" on public.student_projects for all using (student_id = auth.uid());
    create policy "kendi becerileri" on public.student_skills for all using (student_id = auth.uid());
    create policy "dogrulanmis sirket basvuranin profilini gorur" on public.student_profiles for select
      using (exists (select 1 from applications a join listings l on l.id = a.listing_id
                      where a.student_id = student_profiles.id and is_company_member(l.company_id) and sirket_dogrulandi(l.company_id)));
    create policy "dogrulanmis sirket arayan ogrencileri gorur" on public.student_profiles for select using (true);
    create policy "dogrulanmis sirket basvuranin projelerini gorur" on public.student_projects for select
      using (exists (select 1 from applications a join listings l on l.id = a.listing_id
                      where a.student_id = student_projects.student_id and is_company_member(l.company_id) and sirket_dogrulandi(l.company_id)));
    create policy "dogrulanmis sirket basvuranin becerilerini gorur" on public.student_skills for select
      using (exists (select 1 from applications a join listings l on l.id = a.listing_id
                      where a.student_id = student_skills.student_id and is_company_member(l.company_id) and sirket_dogrulandi(l.company_id)));
    create table public.social_profiles(profile_id uuid primary key, username text, yayinda_mi boolean);
    create table public.blocks(blocker_id uuid, blocked_id uuid);
    create table public.posts(id uuid primary key, author_id uuid, aciklama text, created_at timestamptz default now(),
      archived_at timestamptz, kitle text, durum text);
    create table public.post_media(post_id uuid, sira int, storage_path text, genislik int, yukseklik int, alt text);
    create function sosyal_gizli.engelli_mi(hedef uuid) returns boolean language sql stable security definer
      set search_path = public as $$
      select exists (select 1 from blocks where (blocker_id = auth.uid() and blocked_id = hedef)
                                            or (blocker_id = hedef and blocked_id = auth.uid())) $$;
    grant execute on function sosyal_gizli.engelli_mi(uuid) to authenticated;

    create schema storage;
    grant usage on schema storage to authenticated;
    create table storage.objects(bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant select on storage.objects to authenticated;
  `);
  await db.exec(await readFile(GOC, 'utf8'));
  await db.exec(`
    insert into companies values ('${SIRKET_A}', true), ('${SIRKET_B}', true), ('${SIRKET_C}', false);
    insert into company_members values ('${SIRKET_A}', '${UYE_A}'), ('${SIRKET_B}', '${UYE_B}'), ('${SIRKET_C}', '${UYE_C}');
    insert into listings values ('${ILAN_A1}', '${SIRKET_A}', 'Yazılım Stajyeri'), ('${ILAN_A2}', '${SIRKET_A}', 'Veri Stajyeri'),
      ('${ILAN_B}', '${SIRKET_B}', 'Pazarlama Stajyeri'), ('${ILAN_C}', '${SIRKET_C}', 'Tasarım Stajyeri');
    insert into applications (id, listing_id, student_id, contact_share_consent_at, profile_snapshot) values
      ('${BASVURU_A1}', '${ILAN_A1}', '${OGRENCI}', now(), '{"ad":"Örnek Aday","universite":"Eski Üniversite","yetenekler":["SQL"]}'),
      ('${BASVURU_A2}', '${ILAN_A2}', '${OGRENCI}', now(), '{"ad":"Örnek Aday"}'),
      ('${BASVURU_B}', '${ILAN_B}', '${OGRENCI}', now(), '{"ad":"Örnek Aday"}'),
      ('${BASVURU_C}', '${ILAN_C}', '${OGRENCI}', now(), '{"ad":"Örnek Aday"}'),
      ('${BASVURU_RIZASIZ}', '${ILAN_A1}', '${BASKA_OGRENCI}', null, null);
    insert into profiles values ('${OGRENCI}', 'Örnek Aday', 'data:image/png;base64,AAAA', '05550000000', 'a@b.c');
    insert into student_profiles (id, university, department, grade_level, pref_cities, gpa, earned_badges)
      values ('${OGRENCI}', 'Yeni Üniversite', 'Bilgisayar Mühendisliği', '3. Sınıf', '{İstanbul}', 3.9, '{}');
    insert into student_skills values ('${OGRENCI}', 'SQL'), ('${OGRENCI}', 'Python');
    insert into student_languages values ('${OGRENCI}', 'İngilizce', 'B2');
    insert into student_projects (student_id, title, live_url) values ('${OGRENCI}', 'Proje', 'https://ornek.dev');
    insert into social_profiles values ('${OGRENCI}', 'ornekaday', true);
    insert into posts values
      ('${POST_HAZIR}', '${OGRENCI}', 'Hazır paylaşım', now(), null, 'baglantilarim', 'hazir'),
      ('${POST_ARSIV}', '${OGRENCI}', 'Arşiv', now(), now(), 'baglantilarim', 'hazir'),
      ('${POST_TASLAK}', '${OGRENCI}', 'İşleniyor', now(), null, 'alan-toplulugum', 'isleniyor'),
      ('${POST_BASKA}', '${BASKA_OGRENCI}', 'Başkası', now(), null, 'baglantilarim', 'hazir');
    insert into post_media values
      ('${POST_HAZIR}', 0, '${OGRENCI}/${POST_HAZIR}/1.jpg', 1080, 1350, null),
      ('${POST_ARSIV}', 0, '${OGRENCI}/${POST_ARSIV}/1.jpg', 1080, 1350, null);
    insert into storage.objects values
      ('sosyal-paylasim', '${OGRENCI}/${POST_HAZIR}/1.jpg'),
      ('sosyal-paylasim', '${OGRENCI}/${POST_ARSIV}/1.jpg'),
      ('sosyal-paylasim', '${BASKA_OGRENCI}/${POST_BASKA}/1.jpg');
  `);
});

test('güncel profil: ilanın sahibi doğrulanmış şirkete, yalnız rıza kapsamındaki alanlar', async () => {
  const s = await guncel(UYE_A, BASVURU_A1);
  assert.equal(s.riza, true);
  assert.equal(s.guncel.universite, 'Yeni Üniversite');
  assert.deepEqual(s.guncel.yetenekler, ['Python', 'SQL']);
  assert.deepEqual(s.guncel.diller, ['İngilizce (B2)']);
  assert.equal(s.guncel.projeler[0].adres, 'https://ornek.dev');
  assert.equal(s.guncel.fotoUrl, null, 'gömülü veri adresi dönmüyor');
  for (const yasak of ['phone', 'telefon', 'email', 'eposta', 'gpa', 'ortalama']) {
    assert.ok(!(yasak in s.guncel), `RIZA DIŞI ALAN: ${yasak}`);
  }
});

test('güncel profil: başka şirket, doğrulanmamış şirket ve rızasız başvuru', async () => {
  await assert.rejects(guncel(UYE_B, BASVURU_A1), /goremezsin/);
  await assert.rejects(guncel(UYE_C, BASVURU_C), /goremezsin/, 'doğrulanmamış şirket');
  await assert.rejects(guncel(OGRENCI, BASVURU_A1), /goremezsin/);
  assert.deepEqual(await guncel(UYE_A, BASVURU_RIZASIZ), { riza: false });
});

test('eski başvuru izinsiz: paylaşım ve görsel kapalı', async () => {
  assert.equal((await paylasimlar(UYE_A, BASVURU_A1)).izin, false);
  assert.deepEqual(await dosyalar(UYE_A), []);
});

test('izni yalnız öğrenci verir: şirket yazamaz, INSERT ile geriye tarihli izin olmaz', async () => {
  await assert.rejects(
    olarak(UYE_A, `update public.applications set paylasim_izni_at = now() where id = $1`, [BASVURU_A1]),
    /yalnizca ogrenci/);
  await assert.rejects(izin(UYE_A, BASVURU_A1, true), /bulunamadi/);
  await assert.rejects(izin(BASKA_OGRENCI, BASVURU_A1, true), /bulunamadi/);
  await olarak(OGRENCI,
    `insert into public.applications (id, listing_id, student_id, paylasim_izni_at)
     values ('f0000000-0000-4000-8000-0000000000e1', $1, $2, '2020-01-01')`, [ILAN_A2, OGRENCI]);
  const r = (await db.query(`select paylasim_izni_at from applications where id = 'f0000000-0000-4000-8000-0000000000e1'`)).rows[0];
  assert.equal(r.paylasim_izni_at, null);
});

test('öğrenci izin verince: yalnız hazır ve arşivlenmemiş paylaşım ve dosyası', async () => {
  assert.ok(await izin(OGRENCI, BASVURU_A1, true));
  const s = await paylasimlar(UYE_A, BASVURU_A1);
  assert.equal(s.izin, true);
  assert.equal(s.profilGorunur, true);
  assert.deepEqual(s.paylasimlar.map((p) => p.id), [POST_HAZIR], 'ARŞİV VE HAZIR OLMAYAN AÇILMAMALI');
  assert.equal(s.paylasimlar[0].medya[0].yol, `${OGRENCI}/${POST_HAZIR}/1.jpg`);
  assert.deepEqual(await dosyalar(UYE_A), [`${OGRENCI}/${POST_HAZIR}/1.jpg`]);
});

test('aynı öğrencinin başka şirkete başvurusu izni taşımıyor', async () => {
  assert.equal((await paylasimlar(UYE_B, BASVURU_B)).izin, false);
  assert.deepEqual(await dosyalar(UYE_B), [], 'B ŞİRKETİ GÖRSEL GÖREMEMELİ');
  await assert.rejects(paylasimlar(UYE_B, BASVURU_A1), /goremezsin/);
});

test('aynı şirkette izinsiz ikinci başvuru: o başvurunun ekranında paylaşım yok', async () => {
  assert.equal((await paylasimlar(UYE_A, BASVURU_A2)).izin, false);
});

test('gizli sosyal profil açılmıyor', async () => {
  await db.exec(`update social_profiles set yayinda_mi = false where profile_id = '${OGRENCI}'`);
  try {
    const s = await paylasimlar(UYE_A, BASVURU_A1);
    assert.equal(s.profilGorunur, false);
    assert.deepEqual(s.paylasimlar, []);
    assert.deepEqual(await dosyalar(UYE_A), []);
  } finally {
    await db.exec(`update social_profiles set yayinda_mi = true where profile_id = '${OGRENCI}'`);
  }
});

test('engel varsa paylaşım açılmıyor', async () => {
  await db.exec(`insert into blocks values ('${OGRENCI}', '${UYE_A}')`);
  try {
    assert.deepEqual((await paylasimlar(UYE_A, BASVURU_A1)).paylasimlar, []);
    assert.deepEqual(await dosyalar(UYE_A), []);
  } finally {
    await db.exec(`delete from blocks`);
  }
});

test('öğrenci izni geri alınca erişim kapanıyor', async () => {
  assert.equal(await izin(OGRENCI, BASVURU_A1, false), null);
  assert.equal((await paylasimlar(UYE_A, BASVURU_A1)).izin, false);
  assert.deepEqual(await dosyalar(UYE_A), []);
});

test('geniş profil erişimi kapandı: şirket öğrenci tablolarını doğrudan okuyamıyor', async () => {
  for (const [tablo, kosul] of [
    ['student_profiles', `id = '${OGRENCI}'`],
    ['student_projects', `student_id = '${OGRENCI}'`],
    ['student_skills', `student_id = '${OGRENCI}'`],
  ]) {
    const r = await olarak(UYE_A, `select count(*)::int n from public.${tablo} where ${kosul}`);
    assert.equal(r[0].n, 0, `${tablo}: başvuran öğrencinin satırı şirkete açık olmamalı`);
  }
  const gpa = await olarak(UYE_A, `select gpa from public.student_profiles where id = $1`, [OGRENCI]);
  assert.equal(gpa.length, 0, 'NOT ORTALAMASI OKUNAMAMALI');
  const kendi = await olarak(OGRENCI, `select count(*)::int n from public.student_profiles where id = $1`, [OGRENCI]);
  assert.equal(kendi[0].n, 1, 'öğrenci kendi profilini okumaya devam ediyor');
});

test('kart yetenekleri: yalnız rıza varsa, yalnız ilanın sahibi doğrulanmış şirkete', async () => {
  const y = (kim, b) => olarak(kim, `select public.basvuru_aday_yetenekleri($1) y`, [b]).then((r) => r[0].y);
  assert.deepEqual(await y(UYE_A, BASVURU_A1), ['Python', 'SQL']);
  assert.deepEqual(await y(UYE_A, BASVURU_RIZASIZ), []);
  await assert.rejects(y(UYE_B, BASVURU_A1), /goremezsin/);
  await assert.rejects(y(UYE_C, BASVURU_C), /goremezsin/);
});
