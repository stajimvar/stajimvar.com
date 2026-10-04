import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  BİLDİRİMİ TEK TEK SİLME (20261118010000) — gerçek Postgres + RLS

  İzole bir PGlite veritabanı; üretime ve gerçek kullanıcıya dokunulmuyor.
  `notifications` tablosu, ilk göçün (20260913010000) erişim bölümüyle
  kuruluyor; üstüne yeni göç OLDUĞU GİBİ uygulanıyor. Sorgular gerçek
  `authenticated` / `anon` rolleriyle çalışıyor, yani politika ve tablo
  yetkisi birlikte sınanıyor:

    · kullanıcı kendi bildirimini siliyor, satır gerçekten gidiyor
    · başkasının bildirimine yönelen silme SIFIR satır siliyor
    · anonim kullanıcı ne okuyor ne siliyor
    · okunmamış sayısı silinen okunmamış bildirim kadar düşüyor
    · bildirim uydurma (insert) ve başlık değiştirme hâlâ kapalı
    · "tümü okundu" yalnız read_at'e dokunuyor, silinen geri gelmiyor
*/

const GOC = new URL('../supabase/migrations/20261118010000_bildirim_silme.sql', import.meta.url);

const AYSE = '11111111-1111-4111-8111-111111111111';
const MEHMET = '22222222-2222-4222-8222-222222222222';

let db;

async function olarak(rol, kimlik, sql, params = []) {
  await db.exec(`set role ${rol}`);
  if (kimlik) await db.exec(`set request.jwt.claim.sub='${kimlik}'`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role; reset request.jwt.claim.sub');
  }
}

const sil = (kimlik, id) =>
  olarak('authenticated', kimlik, `delete from public.notifications where id = $1 returning id`, [id]);

const sayi = async (kimlik, kosul = 'true') =>
  (await olarak('authenticated', kimlik, `select count(*)::int n from public.notifications where ${kosul}`)).rows[0].n;

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    grant usage on schema auth to anon, authenticated;
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public to anon, authenticated;

    create table public.notifications(
      id uuid primary key default gen_random_uuid(), recipient_id uuid not null, type text not null,
      title text not null, body text, target_url text, application_id uuid, read_at timestamptz,
      created_at timestamptz not null default now(), dedupe_key text);

    /* Supabase'in yeni tablolara verdiği varsayılan yetki (canlıda ölçülen hâl). */
    grant select, insert, update, delete on public.notifications to anon, authenticated;

    /* 20260913010000 erişim bölümü */
    alter table public.notifications enable row level security;
    create policy "kendi bildirimlerini okur" on public.notifications
      for select using (recipient_id = auth.uid());
    create policy "kendi bildirimini okundu yapar" on public.notifications
      for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
    revoke update on public.notifications from authenticated;
    grant update (read_at) on public.notifications to authenticated;
    grant select on public.notifications to authenticated;

    create function public.bildirimleri_okundu_isaretle() returns integer
      language sql security definer set search_path = public as $$
        with g as (update public.notifications set read_at = now()
                    where recipient_id = auth.uid() and read_at is null returning 1)
        select count(*)::int from g $$;
    grant execute on function public.bildirimleri_okundu_isaretle() to authenticated;
  `);
  await db.exec(await readFile(GOC, 'utf8'));
  await db.exec(`
    insert into public.notifications (id, recipient_id, type, title, read_at) values
      ('a0000000-0000-4000-8000-000000000001', '${AYSE}', 'yeni_basvuru', 'Okunmamış 1', null),
      ('a0000000-0000-4000-8000-000000000002', '${AYSE}', 'yeni_basvuru', 'Okunmamış 2', null),
      ('a0000000-0000-4000-8000-000000000003', '${AYSE}', 'yeni_basvuru', 'Okunmuş', now()),
      ('b0000000-0000-4000-8000-000000000001', '${MEHMET}', 'yeni_basvuru', 'Mehmet', null);
  `);
});

test('başkasının bildirimine yönelen silme sıfır satır siliyor', async () => {
  const r = await sil(MEHMET, 'a0000000-0000-4000-8000-000000000001');
  assert.equal(r.rows.length, 0, 'MEHMET AYŞENİN BİLDİRİMİNİ SİLEMEMELİ');
  const hepsi = await olarak('authenticated', MEHMET, `delete from public.notifications returning id`);
  assert.deepEqual(hepsi.rows.map((x) => x.id), ['b0000000-0000-4000-8000-000000000001'],
    'koşulsuz silme bile yalnız kendi satırına dokunmalı');
  assert.equal(await sayi(AYSE), 3, 'Ayşe’nin bildirimleri yerinde');
});

test('kullanıcı kendi bildirimini siliyor; okunmamış sayısı düşüyor, satır geri gelmiyor', async () => {
  assert.equal(await sayi(AYSE, 'read_at is null'), 2);
  const r = await sil(AYSE, 'a0000000-0000-4000-8000-000000000001');
  assert.deepEqual(r.rows.map((x) => x.id), ['a0000000-0000-4000-8000-000000000001']);
  assert.equal(await sayi(AYSE, 'read_at is null'), 1, 'okunmamış sayısı bir düşmeli');
  assert.equal(await sayi(AYSE), 2);
  /* "Sayfa yenilendi": aynı sorgu yeniden. */
  assert.equal(await sayi(AYSE, `id = 'a0000000-0000-4000-8000-000000000001'`), 0, 'SİLİNEN GERİ GELMEMELİ');
});

test('okunmuş bildirimi silmek okunmamış sayısını değiştirmiyor', async () => {
  await sil(AYSE, 'a0000000-0000-4000-8000-000000000003');
  assert.equal(await sayi(AYSE, 'read_at is null'), 1);
});

test('aynı bildirimi ikinci kez silmek hata değil, sıfır satır', async () => {
  const r = await sil(AYSE, 'a0000000-0000-4000-8000-000000000003');
  assert.equal(r.rows.length, 0);
});

test('anonim kullanıcı ne okuyor ne siliyor', async () => {
  await assert.rejects(
    olarak('anon', null, `select count(*) from public.notifications`), /permission denied/i);
  await assert.rejects(
    olarak('anon', null, `delete from public.notifications`), /permission denied/i);
});

test('bildirim uydurma ve başlık değiştirme hâlâ kapalı', async () => {
  await assert.rejects(
    olarak('authenticated', AYSE,
      `insert into public.notifications (recipient_id, type, title) values ($1, 'sahte', 'Sahte')`, [AYSE]),
    /permission denied/i);
  await assert.rejects(
    olarak('authenticated', AYSE, `update public.notifications set title = 'x'`), /permission denied/i);
});

test('"tümü okundu" değişmedi: yalnız read_at, silinen geri gelmiyor', async () => {
  const r = await olarak('authenticated', AYSE, `select public.bildirimleri_okundu_isaretle() n`);
  assert.equal(r.rows[0].n, 1);
  assert.equal(await sayi(AYSE, 'read_at is null'), 0);
  assert.equal(await sayi(AYSE), 1, 'yalnız silinmemiş bildirim kaldı');
});

test('göç tablo yetkisini daraltıyor ve politikayı yalnız authenticated’a veriyor', async () => {
  const goc = await readFile(GOC, 'utf8');
  assert.match(goc, /for delete to authenticated\s+using \(recipient_id = auth\.uid\(\)\)/);
  assert.match(goc, /revoke all on public\.notifications from anon;/);
  assert.ok(!/for insert/.test(goc), 'insert politikası verilmemeli');
  assert.ok(!/bildirimleri_okundu_isaretle/.test(goc.replace(/^--.*$/gm, '')), 'tümü okundu işlevine dokunulmamalı');
});
