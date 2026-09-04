import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Real PostgreSQL, entirely in memory. Never reads a URL, credential or live DB.
let db;
before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create function public.is_admin() returns boolean language sql as $$ select false $$;
    create function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid,bucket_id text);
  `);
  for (const name of ['20260827010000_kesfet_events','20260827020000_kesfet_curation','20260827030000_kesfet_import_pipeline','20260828020000_discover_event_occurrences']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), 'utf8'));
  }
  await db.exec('grant usage on schema public to anon,authenticated; grant select on all tables in schema public to anon,authenticated;');
  try {
    await db.exec(await readFile(new URL('../supabase/migrations/20260917010000_discover_catalog.sql', import.meta.url), 'utf8'));
  } catch (e) { if (e.code !== 'ENOENT') throw e; }
  await db.exec(`
    insert into public.discover_events(id,slug,title,description,category,city,venue_name,starts_at,ends_at,source_url,status,created_at,is_free)
    select md5('catalog-test-'||n)::uuid,'catalog-test-'||n,'Etkinlik '||n,'Only a disposable test fixture',
      case when n%2=0 then 'concert' else 'city_route' end,
      case when n%2=0 then 'İstanbul' else 'Ankara' end,'Test alanı',
      now()+interval '10 days',now()+interval '11 days','https://example.org/test','published',
      now()-interval '1 day',n%2=0 from generate_series(1,1237) n;
  `);
});
after(async () => { await db?.close(); });
async function catalog(args={}) {
  const keys=Object.keys(args);
  const sql=`select public.get_discover_catalog(${keys.map((k,i)=>`p_${k} => $${i+1}`).join(',')}) as result`;
  return (await db.query(sql,Object.values(args))).rows[0].result;
}

test('server catalog reaches every event beyond 1000 with stable tied-date keyset pages', async () => {
  const ids=new Set(); let page=await catalog(); const snapshot=page.snapshot;
  assert.equal(page.total,1237);
  assert.equal(page.events.length,24);
  assert.equal(page.facets.categories.city_route,619);
  assert.equal(page.facets.categories.concert,618);
  for (;;) {
    for (const event of page.events) { assert.ok(!ids.has(event.id),'duplicate across pages'); ids.add(event.id); }
    if(!page.hasMore) break;
    assert.ok(page.nextCursor);
    page=await catalog({snapshot,cursor_value:page.nextCursor.value,cursor_id:page.nextCursor.id});
  }
  assert.equal(ids.size,1237);
  assert.equal(page.nextCursor,null);
});

test('server filters and facet totals operate before pagination, including Turkish search', async () => {
  const p=await catalog({query:'istanbul',free:true,category:'concert'});
  assert.equal(p.total,618);
  assert.equal(p.events.length,24);
  assert.ok(p.events.every(e=>e.city==='İstanbul'&&e.is_free));
  assert.equal(p.facets.free,618);
  assert.equal((await catalog({query:'%'})).total,0,'search wildcard is a literal');
  assert.equal((await catalog({query:'şehir rotası'})).total,619);
});

test('insertion during pagination does not shift the existing snapshot; refreshing sees newest', async () => {
  const first=await catalog();
  await db.exec(`insert into public.discover_events(slug,title,description,category,city,venue_name,starts_at,ends_at,source_url,status)
    values('new-catalog-test','Yeni eklenen test','Only a disposable test fixture','workshop','Bursa','Test alanı',now()+interval '1 day',now()+interval '2 days','https://example.org/new','published');`);
  const next=await catalog({snapshot:first.snapshot,cursor_value:first.nextCursor.value,cursor_id:first.nextCursor.id});
  assert.equal(next.total,1237);
  assert.ok(!next.events.some(e=>e.slug==='new-catalog-test'));
  const fresh=await catalog();
  assert.equal(fresh.total,1238);
  assert.equal(fresh.events[0].slug,'new-catalog-test');
});

test('date filters select a matching later session and never count a multi-session event twice', async () => {
  await db.exec(`insert into public.discover_event_occurrences(event_id,source_occurrence_id,starts_at,ends_at)
    select id,'test-today',now()-interval '1 minute',now()+interval '2 minutes' from public.discover_events where slug='catalog-test-1';`);
  const today=await catalog({period:'today',query:'Etkinlik 1'});
  assert.equal(today.total,1);
  assert.equal(today.events[0].source_occurrence_id,'test-today');
  assert.equal((await catalog({sort:'upcoming'})).events[0].slug,'catalog-test-1');
  assert.equal((await catalog({query:'Etkinlik 1',category:'city_route'})).total,175);
});

test('anonymous callers see no draft, cancelled or expired event or facet', async () => {
  await db.exec(`insert into public.discover_events(slug,title,description,category,city,venue_name,starts_at,ends_at,source_url,status)
    values ('hidden-draft','Hidden draft','test','festival','Hidden city','Test',now()+interval '1 day',now()+interval '2 days','https://example.org/test','draft'),
      ('hidden-expired','Hidden expired','test','festival','Hidden city','Test',now()-interval '2 days',now()-interval '1 day','https://example.org/test','published'),
      ('hidden-cancelled','Hidden cancelled','test','festival','Hidden city','Test',now()+interval '1 day',now()+interval '2 days','https://example.org/test','cancelled');
    set role anon;`);
  try {
    const p=await catalog();
    assert.equal(p.total,1238);
    assert.ok(!p.facets.cities.includes('Hidden city'));
    assert.equal((await catalog({query:'Hidden'})).total,0);
  } finally { await db.exec('reset role'); }
});

test('invalid sort and incomplete cursor fail explicitly instead of silently changing pagination', async () => {
  await assert.rejects(catalog({sort:'invalid'}), {code:'22023'});
  await assert.rejects(catalog({cursor_value:new Date().toISOString()}), {code:'22023'});
});

test('upcoming keyset handles tied starts without repeating page boundaries',async()=>{
  const first=await catalog({sort:'upcoming'});
  const second=await catalog({sort:'upcoming',snapshot:first.snapshot,cursor_value:first.nextCursor.value,cursor_id:first.nextCursor.id});
  assert.equal(second.events.length,24);
  assert.equal(new Set([...first.events,...second.events].map(e=>e.id)).size,48);
  const a=first.events.at(-1), b=second.events[0];
  assert.ok(new Date(b.occurrence_starts_at)>new Date(a.occurrence_starts_at)
    || (b.occurrence_starts_at===a.occurrence_starts_at && b.id>a.id));
});

test('an authenticated admin still receives only the public lifecycle catalog',async()=>{
  await db.exec(`create or replace function public.is_admin() returns boolean language sql as $$ select true $$; set role authenticated;`);
  try {
    const p=await catalog();
    assert.equal(p.total,1238);
    assert.ok(!p.facets.cities.includes('Hidden city'));
    assert.equal((await catalog({query:'Hidden'})).total,0);
  } finally { await db.exec('reset role'); }
});
