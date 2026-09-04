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
    create table public.listings(id uuid primary key,title text not null,company_id uuid references companies(id),city text,work_type work_type not null default 'On-site',status listing_status not null default 'draft',posted_at timestamptz,created_at timestamptz not null default now());
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
});
after(async () => db?.close());

async function catalog(args = {}) {
  const keys = Object.keys(args);
  const sql = `select public.get_published_listings_catalog(${keys.map((key, i) => `p_${key}=>$${i + 1}`).join(',')}) result`;
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
  assert.deepEqual((await catalog({ country: 'FR' })).listings.map((row) => row.title), ['Paris']);
  assert.equal((await catalog({ country: 'all' })).listings.length, 3);
  assert.deepEqual(remote.facets.countries, [{ code: 'FR', count: 1 }]);
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
