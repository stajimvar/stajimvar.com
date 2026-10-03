import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  ŞİRKETE BAŞVURU BİLDİRİMİ (20261117010000) — gerçek Postgres'te davranış

  İzole bir PGlite veritabanı; üretime ve gerçek kullanıcıya dokunulmuyor.
  Tablolar, göçün kullandığı kolonlarla asgari biçimde kuruluyor; ölçülen
  şey göçün iki fonksiyonu ve tetikleyicinin bağlandığı davranış:

    · internal başvuru → şirketin her üyesine TEK bildirim, aynı anda
    · external başvuru → şirkete bildirim YOK
    · doğrulanmamış şirket → bildirim var, aday adı YOK
    · başvuran kendisi şirket üyesiyse kendine bildirim YOK (aktör)
    · başka şirketin üyesi bildirim almıyor
    · aynı öğrenci aynı ilana ikinci kez başvuramıyor → ikinci bildirim yok
*/

const GOC = new URL('../supabase/migrations/20261117010000_basvuru_bildirimi_canli.sql', import.meta.url);

const OGRENCI = '11111111-1111-4111-8111-111111111111';
const UYE_A1 = '22222222-2222-4222-8222-222222222222';
const UYE_A2 = '33333333-3333-4333-8333-333333333333';
const UYE_B = '44444444-4444-4444-8444-444444444444';
const UYE_C = '55555555-5555-4555-8555-555555555555';
const SIRKET_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; // doğrulanmış
const SIRKET_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; // başka şirket
const SIRKET_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'; // doğrulanmamış
const ILAN_A_IC = 'a0000000-0000-4000-8000-000000000001';
const ILAN_A_DIS = 'a0000000-0000-4000-8000-000000000002';
const ILAN_C_IC = 'c0000000-0000-4000-8000-000000000001';

let db;

async function olarak(kimlik, sql, params = []) {
  await db.exec(`set request.jwt.claim.sub='${kimlik}'`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec('reset request.jwt.claim.sub');
  }
}

const basvur = (ilan, kopya = { ad: 'Ayşe Yılmaz' }, yontem = 'internal') =>
  olarak(OGRENCI,
    `insert into applications(listing_id, student_id, application_method, profile_snapshot)
     values ($1, $2, $3, $4::jsonb) returning id`,
    [ilan, OGRENCI, yontem, JSON.stringify(kopya)]);

const bildirimler = async (basvuruId) =>
  (await db.query(
    `select recipient_id, type, body, target_url from notifications where application_id = $1 order by recipient_id`,
    [basvuruId],
  )).rows;

before(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table companies(id uuid primary key, name text, verified boolean not null default false);
    create table company_members(company_id uuid references companies(id), user_id uuid, primary key (company_id, user_id));
    create table listings(id uuid primary key, company_id uuid references companies(id), title text,
      application_method text not null default 'internal');
    create table applications(
      id uuid primary key default gen_random_uuid(),
      listing_id uuid not null references listings(id), student_id uuid not null,
      application_method text not null, profile_snapshot jsonb, status text not null default 'submitted',
      interview_response text, interview_date date, interview_time text, interview_type text,
      interview_location text, interview_note text,
      unique (listing_id, student_id));
    create table notifications(
      id uuid primary key default gen_random_uuid(), recipient_id uuid not null, type text, title text,
      body text, target_url text, application_id uuid, read_at timestamptz, created_at timestamptz default now(),
      dedupe_key text);
    /* Öğrenciye giden bildirimler bu testin konusu değil; imza aynı, gövde boş. */
    create function bildir_ogrenciye(p_basvuru uuid, p_tur text, p_baslik text, p_govde text, p_aktor uuid)
      returns void language sql as $$ select $$;
  `);
  await db.exec(await readFile(GOC, 'utf8'));
  await db.exec(`
    create trigger applications_bildirimler after insert or update on applications
      for each row execute function basvuru_bildirimleri();
    insert into companies values
      ('${SIRKET_A}', 'Şirket A', true), ('${SIRKET_B}', 'Şirket B', true), ('${SIRKET_C}', 'Şirket C', false);
    insert into company_members values
      ('${SIRKET_A}', '${UYE_A1}'), ('${SIRKET_A}', '${UYE_A2}'), ('${SIRKET_B}', '${UYE_B}'), ('${SIRKET_C}', '${UYE_C}');
    insert into listings values
      ('${ILAN_A_IC}', '${SIRKET_A}', 'Yazılım Stajyeri', 'internal'),
      ('${ILAN_A_DIS}', '${SIRKET_A}', 'Dış İlan', 'external'),
      ('${ILAN_C_IC}', '${SIRKET_C}', 'Pazarlama Stajyeri', 'internal');
  `);
});

test('internal başvuru: ilgili şirketin her üyesine tek bildirim, INSERT anında', async () => {
  const [{ id }] = await basvur(ILAN_A_IC);
  const b = await bildirimler(id);
  assert.deepEqual(b.map((x) => x.recipient_id).sort(), [UYE_A1, UYE_A2].sort());
  assert.ok(b.every((x) => x.type === 'yeni_basvuru'));
  assert.ok(b.every((x) => x.body === 'Ayşe Yılmaz · Yazılım Stajyeri'), 'doğrulanmış şirkette ad görünür');
  assert.ok(b.every((x) => x.target_url === `/sirket/basvuranlar?aday=${id}`));
  assert.ok(!b.some((x) => x.recipient_id === UYE_B), 'BAŞKA ŞİRKETİN ÜYESİ BİLDİRİM ALMAMALI');
});

test('aynı ilana ikinci başvuru reddediliyor ve ikinci bildirim doğmuyor', async () => {
  await assert.rejects(basvur(ILAN_A_IC), /unique|duplicate|benzersiz/i);
  const n = (await db.query(`select count(*)::int n from notifications where type = 'yeni_basvuru'`)).rows[0].n;
  assert.equal(n, 2, 'yalnız ilk başvurunun iki bildirimi olmalı');
});

test('external başvuru şirkete bildirim üretmiyor', async () => {
  const [{ id }] = await basvur(ILAN_A_DIS, {}, 'external');
  assert.deepEqual(await bildirimler(id), [], 'DIŞ BAŞVURU ŞİRKETE İLETİLMİŞ SAYILMAMALI');
});

test('doğrulanmamış şirket: bildirim gidiyor ama aday adı gitmiyor', async () => {
  const [{ id }] = await basvur(ILAN_C_IC, { ad: 'Gizli Kişi' });
  const b = await bildirimler(id);
  assert.equal(b.length, 1);
  assert.equal(b[0].recipient_id, UYE_C);
  assert.equal(b[0].body, 'Bir aday · Pazarlama Stajyeri');
  assert.ok(!b[0].body.includes('Gizli'), 'KİMLİK BİLDİRİMDEN SIZMAMALI');
});

test('geri çekme bildirimi de yalnız internal başvuruda ve yalnız şirket üyelerine', async () => {
  const ic = (await db.query(`select id from applications where listing_id = $1`, [ILAN_A_IC])).rows[0].id;
  const dis = (await db.query(`select id from applications where listing_id = $1`, [ILAN_A_DIS])).rows[0].id;
  await olarak(OGRENCI, `update applications set status = 'withdrawn' where id in ($1, $2)`, [ic, dis]);
  const geri = (await db.query(`select application_id from notifications where type = 'geri_cekildi'`)).rows;
  assert.equal(geri.length, 2, 'internal başvurunun iki üyesine');
  assert.ok(geri.every((x) => x.application_id === ic));
});

test('başvuran kendisi şirket üyesiyse kendine bildirim yazılmıyor', async () => {
  await db.exec(`insert into company_members values ('${SIRKET_A}', '${OGRENCI}')`);
  await db.exec(`insert into listings values ('a0000000-0000-4000-8000-000000000003', '${SIRKET_A}', 'Üçüncü', 'internal')`);
  const [{ id }] = await basvur('a0000000-0000-4000-8000-000000000003');
  const b = await bildirimler(id);
  assert.ok(!b.some((x) => x.recipient_id === OGRENCI));
  assert.equal(b.length, 2);
});
