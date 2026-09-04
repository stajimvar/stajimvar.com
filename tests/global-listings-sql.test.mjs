import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db;
before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create type work_type as enum ('Remote','Hybrid','On-site');
    create type listing_status as enum ('draft','published','closed');
    create table public.profiles(id uuid primary key references auth.users(id),role text not null default 'student');
    create table public.student_profiles(id uuid primary key references public.profiles(id));
    create table public.companies(id uuid primary key,name text,slug text,logo_url text,industry text,size text,location text,description text,rating numeric);
    create table public.listings(
      id uuid primary key,title text not null,company_id uuid references companies(id),source_title text,department text,
      city text,work_type work_type not null default 'On-site',mandatory_staj_accepted boolean,voluntary_staj_accepted boolean,
      is_paid boolean,stipend_text text,duration text,term text,application_deadline date,min_grade_level text,
      required_skills text[],preferred_skills text[],description text,responsibilities text[],perks text[],category text,
      featured boolean,status listing_status not null default 'draft',applicants_count int,posted_at timestamptz,last_seen_at timestamptz,
      source_verified_at timestamptz,source_status text,created_at timestamptz not null default now(),updated_at timestamptz,
      origin text,source_id uuid,source_url text,canonical_url text,apply_url text,application_method text,
      application_channel_id uuid,insurance_note text,raw jsonb
    );
    alter table profiles enable row level security; alter table student_profiles enable row level security; alter table listings enable row level security;
    create policy read_own_profile on profiles for select to authenticated using(id=auth.uid());
    create policy read_own_student on student_profiles for select to authenticated using(id=auth.uid());
    create policy own_profile on profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid() and role='student');
    create policy own_student on student_profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
    create policy published_listings on listings for select using(status='published');
    grant select(id,role) on profiles to authenticated;
    grant select(id) on student_profiles to authenticated;
    grant select on listings to anon,authenticated;
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20260919010000_global_listing_preferences.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20260919020000_global_listing_catalog_total.sql', import.meta.url), 'utf8'));
});
after(async () => db?.close());

async function catalog(args = {}) {
  const keys = Object.keys(args);
  const sql = `select public.get_published_listings_catalog_v2(${keys.map((key, i) => `p_${key}=>$${i + 1}`).join(',')}) result`;
  return (await db.query(sql, Object.values(args))).rows[0].result;
}

test('global kolonlar NULL bilinmeyen semantigi ve mevcut city/work_type alanlarini korur', async () => {
  const columns = (await db.query(`select column_name,is_nullable from information_schema.columns where table_schema='public' and table_name='listings'`)).rows;
  const names = columns.map((row) => row.column_name);
  assert.equal(names.filter((name) => name === 'city').length, 1);
  assert.equal(names.filter((name) => name === 'work_type').length, 1);
  for (const name of ['country_code','original_language','international_applicants','visa_sponsorship']) {
    assert.equal(columns.find((row) => row.column_name === name).is_nullable, 'YES');
  }
});

test('remote yalniz work_type Remote getirir ve NULL ulkeyi remote saymaz', async () => {
  await db.exec(`insert into listings(id,title,city,work_type,status,country_code) values
    (md5('remote')::uuid,'Remote','Global','Remote','published',null),
    (md5('unknown')::uuid,'Unknown','Remote','On-site','published',null),
    (md5('fr')::uuid,'Paris','Paris','On-site','published','FR'),
    (md5('draft')::uuid,'Draft','Paris','Remote','draft','FR')`);
  const remote = await catalog({ country: 'remote' });
  assert.deepEqual(remote.listings.map((row) => row.title), ['Remote']);
  assert.equal(remote.total, 1);
  assert.deepEqual((await catalog({ country: 'FR' })).listings.map((row) => row.title), ['Paris']);
  const all = await catalog({ country: 'all' });
  assert.equal(all.listings.length, 3);
  assert.equal(all.total, 3);
  assert.deepEqual(remote.facets.countries, [{ code: 'FR', count: 1 }]);
});

test('public katalog ham kaynak verisini disari sizdirmaz', async () => {
  await db.exec(`insert into listings(id,title,status,raw) values(md5('private-raw')::uuid,'Güvenli kart','published','{"private":"secret"}')`);
  const result = await catalog({ country: 'all' });
  const listing = result.listings.find((row) => row.title === 'Güvenli kart');
  assert.ok(listing);
  assert.equal(Object.hasOwn(listing, 'raw'), false);
});

test('catalog 1237 esit tarihli kaydi tekrarsiz ve sabit ust sinirsiz sayfalar', async () => {
  await db.exec(`insert into listings(id,title,city,work_type,status,posted_at,country_code)
    select md5('bulk-'||n)::uuid,'Bulk '||n,'İstanbul','On-site','published','2026-09-01 10:00+03','TR' from generate_series(1,1237)n`);
  const ids = new Set(); let page = await catalog({ country: 'TR' }); const snapshot = page.snapshot;
  for (;;) {
    for (const row of page.listings) { assert.equal(ids.has(row.id), false); ids.add(row.id); }
    if (!page.hasMore) break;
    page = await catalog({ country: 'TR', cursor_posted_at: page.nextCursor.value, cursor_id: page.nextCursor.id, snapshot });
  }
  assert.equal(ids.size, 1237);
  assert.equal(page.nextCursor, null);
});

test('profil tercihleri bicim ve sahiplik sinirlarini korur', async () => {
  const a='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', b='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  await db.exec(`insert into auth.users values('${a}'),('${b}'); insert into profiles(id) values('${a}'),('${b}'); insert into student_profiles(id) values('${a}'),('${b}'); set role authenticated; set request.jwt.claim.sub='${a}'`);
  try {
    await db.exec(`update profiles set interface_language='tr',home_country='TR' where id='${a}'; update student_profiles set preferred_job_countries=array['FR','TR'] where id='${a}'`);
    assert.equal((await db.query(`select interface_language from profiles where id='${a}'`)).rows[0].interface_language, 'tr');
    await db.exec(`update profiles set interface_language='en' where id='${b}'`);
    assert.equal((await db.query(`select interface_language from profiles where id='${a}'`)).rows[0].interface_language, 'tr');
    await assert.rejects(db.exec(`update profiles set interface_language='turkish' where id='${a}'`));
    await assert.rejects(db.exec(`update student_profiles set preferred_job_countries=array['FR','FR'] where id='${a}'`));
  } finally { await db.exec('reset role; reset request.jwt.claim.sub'); }
  assert.equal((await db.query(`select interface_language from profiles where id='${b}'`)).rows[0].interface_language, null);
});
