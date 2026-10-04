import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  ŞİRKET KENDİ İLANINI DÜZENLEYEBİLİYOR (20261119010000) — gerçek Postgres

  İzole PGlite; üretime dokunulmuyor. Zaman damgası fonksiyonları
  20261025010000'dan OLDUĞU GİBİ okunuyor (yardımcıların yetkisi geri
  alınmış hâliyle), `listings` asgari kolonlarla ve canlıdaki kolon
  yetkisi + "sirket kendi ilanlarini yonetir" politikasıyla kuruluyor.

    · düzeltmeden ÖNCE: şirket üyesinin UPDATE'i "permission denied for
      function listings_normalize_alanlari" ile düşüyor (canlıdaki hata)
    · düzeltmeden SONRA: aynı UPDATE geçiyor, zaman damgaları doğru
    · başka şirketin ilanı yine güncellenemiyor
    · `content_updated_at` / `updated_at` kullanıcı tarafından yazılamıyor
    · yardımcılar hâlâ kullanıcıya kapalı
*/

const ESKI = new URL('../supabase/migrations/20261025010000_ilan_anlamli_degisiklik_zamani.sql', import.meta.url);
const GOC = new URL('../supabase/migrations/20261119010000_ilan_zaman_damgasi_yetkisi.sql', import.meta.url);

const UYE = '11111111-1111-4111-8111-111111111111';
const SIRKET = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BASKA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ILAN = 'a0000000-0000-4000-8000-000000000001';
const BASKA_ILAN = 'b0000000-0000-4000-8000-000000000001';

let db;

async function uyeOlarak(sql, params = []) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${UYE}'`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role; reset request.jwt.claim.sub');
  }
}

const duzenle = (id = ILAN, baslik = 'Modelist Stajyeri') =>
  uyeOlarak(`update public.listings set title = $2, duration = '20 iş günü' where id = $1 returning id`, [id, baslik]);

before(async () => {
  db = new PGlite();
  const eski = await readFile(ESKI, 'utf8');
  const bas = eski.indexOf('create or replace function public.listings_normalize_alanlari');
  const son = eski.indexOf('/* ------------------------------------------------------------------ */', eski.indexOf('revoke all on function public.listings_anlamli_alanlar()'));
  assert.ok(bas > 0 && son > bas, 'eski göçten fonksiyon bölümü okunamadı');

  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    grant usage on schema auth to anon, authenticated;
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public to anon, authenticated;

    create table public.company_members(company_id uuid, user_id uuid);
    create function public.is_company_member(p uuid) returns boolean language sql stable security definer
      set search_path = public as $$ select exists (select 1 from company_members where company_id = p and user_id = auth.uid()) $$;
    grant execute on function public.is_company_member(uuid) to authenticated;

    create table public.listings(
      id uuid primary key, company_id uuid not null, title text, duration text, status text default 'published',
      il text, created_at timestamptz default now() - interval '10 days',
      updated_at timestamptz default now() - interval '10 days',
      content_updated_at timestamptz default now() - interval '10 days');
    alter table public.listings enable row level security;
    create policy "sirket kendi ilanlarini yonetir" on public.listings
      for all using (is_company_member(company_id)) with check (is_company_member(company_id));
    grant select on public.listings to authenticated;
    grant update (title, duration, status) on public.listings to authenticated;
  `);
  await db.exec(eski.slice(bas, son));
  await db.exec(`
    insert into public.company_members values ('${SIRKET}', '${UYE}');
    insert into public.listings (id, company_id, title) values
      ('${ILAN}', '${SIRKET}', 'Stajyer'), ('${BASKA_ILAN}', '${BASKA}', 'Başka');
  `);
});

test('düzeltmeden önce: canlıdaki hata yeniden üretiliyor', async () => {
  await assert.rejects(duzenle(), /permission denied for function listings_normalize_alanlari/);
});

test('düzeltmeden sonra: şirket üyesi kendi ilanını düzenleyebiliyor', async () => {
  await db.exec(await readFile(GOC, 'utf8'));
  const once = (await db.query(`select updated_at, content_updated_at from public.listings where id = $1`, [ILAN])).rows[0];
  const r = await duzenle();
  assert.deepEqual(r.rows.map((x) => x.id), [ILAN]);
  const sonra = (await db.query(`select title, updated_at, content_updated_at from public.listings where id = $1`, [ILAN])).rows[0];
  assert.equal(sonra.title, 'Modelist Stajyeri');
  assert.ok(sonra.updated_at > once.updated_at, 'updated_at ilerlemeli');
  assert.ok(sonra.content_updated_at > once.content_updated_at, 'başlık anlamlı alan: content_updated_at ilerlemeli');
});

test('yalnız normalize alan değişirse içerik zamanı ilerlemiyor (davranış aynı)', async () => {
  const once = (await db.query(`select content_updated_at from public.listings where id = $1`, [ILAN])).rows[0];
  await db.exec(`update public.listings set il = 'İstanbul' where id = '${ILAN}'`);
  const sonra = (await db.query(`select content_updated_at from public.listings where id = $1`, [ILAN])).rows[0];
  assert.equal(String(sonra.content_updated_at), String(once.content_updated_at));
});

test('başka şirketin ilanı yine güncellenemiyor', async () => {
  const r = await duzenle(BASKA_ILAN, 'Ele geçirildi');
  assert.equal(r.rows.length, 0);
  const s = (await db.query(`select title from public.listings where id = $1`, [BASKA_ILAN])).rows[0];
  assert.equal(s.title, 'Başka');
});

test('zaman damgaları kullanıcı tarafından yazılamıyor, yardımcılar kapalı', async () => {
  await assert.rejects(
    uyeOlarak(`update public.listings set content_updated_at = now() where id = $1`, [ILAN]), /permission denied/);
  await assert.rejects(uyeOlarak(`select public.listings_normalize_alanlari()`), /permission denied/);
  await assert.rejects(uyeOlarak(`select public.listings_anlamli_alanlar()`), /permission denied/);
});
