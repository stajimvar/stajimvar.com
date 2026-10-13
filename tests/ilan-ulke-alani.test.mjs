import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';

/*
  İŞVEREN İLANINDA ÜLKE VE BAŞVURULABİLEN ÜLKELER (20261213010000)

  Kurulum tests/ilan-otomatik-kontrol.test.mjs ile aynı (oradan alındı):
  20261120010000 olduğu gibi, ardından bu PR'ın göçü uygulanıyor.

  Önceki başlık: ŞİRKET İLANLARI İÇİN OTOMATİK KONTROL VE YAYIN (20261120010000)

  İzole PGlite; üretime ve gerçek kullanıcıya dokunulmuyor. Göç OLDUĞU
  GİBİ uygulanıyor. Sorgular gerçek `authenticated` / `anon` /
  `service_role` rolleriyle, JWT iddiaları `request.jwt.claims` ile
  veriliyor; yayın kapısı (`guard_listing_publish`) göçün kendi
  tanımıyla tetikleyici olarak bağlı. RLS ve kolon yetkileri canlıdaki
  biçimiyle kuruluyor.
*/

const GOC = new URL('../supabase/migrations/20261120010000_ilan_otomatik_kontrol.sql', import.meta.url);
const ULKE_GOCU = new URL('../supabase/migrations/20261213010000_ilan_ulke_alani.sql', import.meta.url);
const KANIT_GOCU = new URL('../supabase/migrations/20261214010000_ilan_konum_kanitli_duzeltmeler.sql', import.meta.url);
const GUESS_GOCU = new URL('../supabase/migrations/20261215010000_guess_europe_ofis.sql', import.meta.url);

const SAHIP = '11111111-1111-4111-8111-111111111111'; // doğrulanmış şirket, Owner
const IZLEYICI = '22222222-2222-4222-8222-222222222222'; // aynı şirkette Viewer
const YABANCI = '33333333-3333-4333-8333-333333333333'; // üye değil
const YENI_SAHIP = '44444444-4444-4444-8444-444444444444'; // doğrulanmamış şirket, Owner
const YONETICI = '55555555-5555-4555-8555-555555555555';
const SIRKET = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const YENI_SIRKET = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const IYI_METIN =
  'Ekibimizde ürün geliştirme süreçlerine destek olacak bir stajyer arıyoruz. Staj süresince ' +
  'tasarım ve test aşamalarında deneyimli mühendislerle birlikte çalışacak, haftalık ekip ' +
  'toplantılarına katılacak ve gerçek projelerde sorumluluk alacaksın. Üniversitelerin ilgili ' +
  'bölümlerinde okuyan öğrencilerin başvurularını bekliyoruz.';

let db;
let ESKI_IZ;

function iddia(kim) {
  if (kim === 'anon') return { role: 'anon' };
  if (kim === 'service_role') return { role: 'service_role' };
  return { role: 'authenticated', sub: kim };
}

async function olarak(kim, sql, params = []) {
  const rol = kim === 'anon' ? 'anon' : kim === 'service_role' ? 'service_role' : 'authenticated';
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify(iddia(kim))]);
  await db.query(`select set_config('test.yonetici', $1, false)`, [kim === YONETICI ? 'evet' : '']);
  await db.exec(`set role ${rol}`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec(`reset role`);
    await db.query(`select set_config('request.jwt.claims', '', false), set_config('test.yonetici', '', false)`);
  }
}

let sira = 0;
async function taslak(kim, alanlar = {}, sirket = SIRKET) {
  sira += 1;
  const v = {
    title: `Ürün Geliştirme Stajyeri ${sira}`,
    city: 'İstanbul',
    work_type: 'On-site',
    term: 'All Year',
    department: null,
    duration: '20 iş günü',
    description: IYI_METIN,
    is_paid: true,
    stipend_text: 'Asgari staj ücreti',
    application_deadline: null,
    ...alanlar,
  };
  /* Yeni form her eklemede gönderim anahtarı yolluyor; `eski: true` eski formu taklit eder. */
  const anahtar = v.eski ? null : (v.gonderim_anahtari ?? randomUUID());
  const [r] = await olarak(kim,
    `insert into public.listings (company_id, title, city, work_type, term, department, duration, is_paid,
                                  stipend_text, description, application_deadline, origin, status, gonderim_anahtari)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'employer_posted', 'draft', $12)
     returning id`,
    [sirket, v.title, v.city, v.work_type, v.term, v.department, v.duration, v.is_paid, v.stipend_text,
     v.description, v.application_deadline, anahtar]);
  return r.id;
}

const gonder = async (kim, id) =>
  (await olarak(kim, `select public.ilan_yayina_gonder($1) as s`, [id]))[0].s;

const ilan = async (id) =>
  (await db.query(`select status, kontrol_durumu, kontrol_gerekceleri, kontrol_kural_surumu, posted_at,
                          description, duration, yonetici_incelemesi_gerekli
                     from public.listings where id = $1`, [id])).rows[0];

const defter = async (id) =>
  (await db.query(`select kaynak, kapsam, karar, gerekceler, kural_surumu, icerik_ozeti, hata
                     from public.ilan_kontrolleri where listing_id = $1 order by id`, [id])).rows;

const bekleyen = async (id) =>
  (await db.query(`select durum, gerekceler, icerik, denemeler from public.ilan_bekleyen_degisiklikleri
                     where listing_id = $1`, [id])).rows[0] ?? null;

const kuyruk = async () => (await olarak(YONETICI, `select public.yonetim_onay_kuyrugu() as k`))[0].k;

const kurallar = (g) => g.map((x) => x.kural);
const bugun = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const gunEkle = (n) => new Date(Date.now() + 3 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create schema auth;
    grant usage on schema auth to anon, authenticated, service_role;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub', '')::uuid $$;
    grant usage on schema public to anon, authenticated, service_role;

    create function public.is_admin() returns boolean language sql stable security definer
      set search_path = public as $$ select coalesce(current_setting('test.yonetici', true), '') = 'evet' $$;
    grant execute on function public.is_admin() to anon, authenticated, service_role;

    create type public.listing_status as enum ('draft', 'published', 'closed', 'archived');
    create type public.listing_origin as enum ('scraped', 'internal', 'manual', 'employer_posted');
    create type public.work_type as enum ('On-site', 'Hybrid', 'Remote');
    create type public.listing_term as enum ('Summer 2026', 'Long-term 2026', 'All Year');
    create type public.listing_category as enum ('Diger');
    create type public.application_method as enum ('internal', 'external', 'email_application');

    create table public.companies(
      id uuid primary key, name text, slug text, verified boolean not null default false,
      website_url text, hr_email text, vkn text, mersis text, claimed_at timestamptz,
      dogrulama_notu text, dogrulama_reddi_at timestamptz, updated_at timestamptz default now());
    create table public.company_members(
      company_id uuid, user_id uuid, recruiter_role text not null default 'Recruiter',
      is_owner boolean not null default false);
    create table public.company_claims(id uuid, company_id uuid, contact_name text, contact_title text,
      work_email text, note text, status text, created_at timestamptz);
    create table public.department_requests(id uuid, requested_department text, universite text,
      aciklama text, status text, created_at timestamptz);

    create function public.is_company_member(p uuid) returns boolean language sql stable security definer
      set search_path = public as $$
      select exists (select 1 from company_members where company_id = p and user_id = auth.uid()) $$;
    grant execute on function public.is_company_member(uuid) to authenticated;

    create table public.listings(
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null references public.companies(id),
      title text not null, department text, work_type public.work_type not null default 'On-site',
      city text, mandatory_staj_accepted boolean, voluntary_staj_accepted boolean,
      is_paid boolean, stipend_text text, duration text,
      term public.listing_term not null default 'All Year', application_deadline date,
      min_grade_level text, required_skills text[] not null default '{}',
      preferred_skills text[] not null default '{}', description text,
      responsibilities text[] not null default '{}', perks text[] not null default '{}',
      category public.listing_category not null default 'Diger',
      status public.listing_status not null default 'draft', posted_at timestamptz,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      origin public.listing_origin not null default 'employer_posted',
      apply_url text, application_method public.application_method not null default 'internal',
      insurance_note text, source_status text, country_code text,
      review_note text, reviewed_at timestamptz, reviewed_by uuid);
    alter table public.listings enable row level security;
    create policy "sirket kendi ilanlarini yonetir" on public.listings for all
      using (is_company_member(company_id)) with check (is_company_member(company_id));
    create policy "yayindaki ilanlar herkese acik" on public.listings for select
      using (status = 'published' or is_company_member(company_id));
    create policy "yonetici ilanlari yonetir" on public.listings for all
      using (is_admin()) with check (is_admin());
    create policy "otomasyon" on public.listings for all to service_role using (true) with check (true);

    grant select (id, company_id, title, city, description, status, origin, posted_at, created_at,
                  application_deadline, duration, is_paid, stipend_text, work_type, term)
      on public.listings to anon, authenticated;
    grant insert (company_id, title, city, work_type, term, department, duration, is_paid, stipend_text,
                  description, application_deadline, origin, status, posted_at)
      on public.listings to authenticated;
    grant update (title, city, work_type, term, department, duration, is_paid, stipend_text, description,
                  application_deadline, status, posted_at, mandatory_staj_accepted, voluntary_staj_accepted)
      on public.listings to authenticated;
    grant all on public.listings to service_role;

    create function public.guard_listing_publish() returns trigger language plpgsql as $$ begin return new; end $$;
    create trigger listings_publish_guard before insert or update on public.listings
      for each row execute function public.guard_listing_publish();
  `);

  await db.exec(await readFile(GOC, 'utf8'));
  /* Göçten ÖNCEKİ parmak izi: mevcut ilanların izi değişmemeli. */
  await db.exec(`insert into public.companies (id, name, verified) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Eski', true);
    insert into public.listings (id, company_id, title, city, description, duration, origin, status)
    values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Eski ilan', 'Ankara',
            'metin', '1 ay', 'employer_posted', 'draft');`);
  ESKI_IZ = (await db.query(`select public.ilan_icerik_ozeti(l) as o from public.listings l
                              where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'`)).rows[0].o;
  await db.exec(await readFile(ULKE_GOCU, 'utf8'));
  /* Kanıtlı düzeltme göçünün hedefleriyle aynı kimlik öneki ve değerler; Luron önceden değişmiş (ezilmemeli). */
  await db.exec(`select set_config('request.jwt.claims', '{"role":"service_role"}', false);
    insert into public.listings (id, company_id, title, city, country_code, work_type, origin, status) values
      ('2a1ca32c-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Hiroba', 'Çankaya', null, 'On-site', 'scraped', 'published'),
      ('b39b1b88-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Luron', null, 'GB', 'On-site', 'manual', 'published'),
      ('cc55e6ec-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Atrya', 'Berlin', 'DE', 'Remote', 'scraped', 'published'),
      ('a67768ee-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'FixFirst', null, 'DE', 'Remote', 'scraped', 'published'),
      ('a0de0769-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Guess', 'İstanbul', 'TR', 'Remote', 'scraped', 'published');
    select set_config('request.jwt.claims', '', false);`);
  await db.exec(await readFile(KANIT_GOCU, 'utf8'));
  await db.exec(await readFile(GUESS_GOCU, 'utf8'));
  await db.exec(`grant select on public.listings to service_role;`);

  await db.exec(`
    insert into public.companies (id, name, verified) values
      ('${SIRKET}', 'Örnek Teknoloji', true), ('${YENI_SIRKET}', 'Yeni Kurum', false);
    insert into public.company_members (company_id, user_id, recruiter_role, is_owner) values
      ('${SIRKET}', '${SAHIP}', 'Owner', true),
      ('${SIRKET}', '${IZLEYICI}', 'Viewer', false),
      ('${YENI_SIRKET}', '${YENI_SAHIP}', 'Owner', true);
  `);
});

/* ---------------------------------------------------------- yardımcı */

let ulkeSira = 0;
async function ulkeliTaslak(kim, { work_type = 'On-site', city = 'İstanbul', country_code = null, basvuru_ulkeleri = null, description = IYI_METIN } = {}) {
  ulkeSira += 1;
  const [r] = await olarak(kim,
    `insert into public.listings (company_id, title, city, work_type, term, duration, is_paid, stipend_text,
                                  description, origin, status, gonderim_anahtari, country_code, basvuru_ulkeleri)
     values ($1, $2, $3, $4, 'All Year', '20 iş günü', true, 'Asgari staj ücreti', $5, 'employer_posted', 'draft',
             $6, $7, $8)
     returning id`,
    [SIRKET, `Ülke Sınaması Stajyeri ${ulkeSira}`, city, work_type, description, randomUUID(), country_code, basvuru_ulkeleri]);
  return r.id;
}
const ulkeAlanlari = async (id) =>
  (await db.query(`select status, country_code, basvuru_ulkeleri, kontrol_kural_surumu from public.listings where id = $1`, [id])).rows[0];

/* ---------------------------------------------------------------- 1 */

test('mevcut ilanların parmak izi değişmiyor; mevcut ülke değerlerine dokunulmuyor', async () => {
  const [r] = (await db.query(`select public.ilan_icerik_ozeti(l) as o, l.country_code, l.basvuru_ulkeleri
                                 from public.listings l where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'`)).rows;
  assert.equal(r.o, ESKI_IZ, 'iki yeni alan boşken iz eskisiyle aynı olmalı');
  assert.equal(r.country_code, null, 'göç ülke tahmin etmemeli');
  assert.equal(r.basvuru_ulkeleri, null);
});

test('işveren ülkeyi kendisi yazabiliyor; ofis ilanında ülke yoksa düzeltme, varsa yayında', async () => {
  const eksik = await ulkeliTaslak(SAHIP);
  const s1 = await gonder(SAHIP, eksik);
  assert.equal(s1.durum, 'duzeltme_gerekiyor');
  const g = (await ilan(eksik)).kontrol_gerekceleri;
  assert.ok(kurallar(g).includes('zorunlu.ulke'), JSON.stringify(g));
  assert.equal(g.find((x) => x.kural === 'zorunlu.ulke').alan, 'country_code');

  const tam = await ulkeliTaslak(SAHIP, { country_code: 'TR' });
  const s2 = await gonder(SAHIP, tam);
  assert.equal(s2.durum, 'yayinda');
  const l = await ulkeAlanlari(tam);
  assert.equal(l.country_code, 'TR');
  assert.match(l.kontrol_kural_surumu, /^ilan-kontrol-3/);
  /* Anonim okuma: yeni alan ilan sayfası için okunabiliyor (country_code
     okuma yetkisi canlıda zaten var; bu düzenekte verilmedi). */
  const herkese = await olarak('anon', `select id, basvuru_ulkeleri from public.listings where id = $1`, [tam]);
  assert.equal(herkese.length, 1);
});

test('uzaktan ilan: ülke şart değil, başvurulabilen ülke şart', async () => {
  const eksik = await ulkeliTaslak(SAHIP, { work_type: 'Remote', city: '' });
  assert.equal((await gonder(SAHIP, eksik)).durum, 'duzeltme_gerekiyor');
  const g = kurallar((await ilan(eksik)).kontrol_gerekceleri);
  assert.ok(g.includes('zorunlu.basvuru_ulkeleri'));
  assert.ok(!g.includes('zorunlu.ulke'), 'uzaktan ilanda iş yeri ülkesi istenmemeli');

  const tam = await ulkeliTaslak(SAHIP, { work_type: 'Remote', city: '', basvuru_ulkeleri: ['TR', 'DE'] });
  assert.equal((await gonder(SAHIP, tam)).durum, 'yayinda');
  assert.deepEqual((await ulkeAlanlari(tam)).basvuru_ulkeleri, ['TR', 'DE']);
});

test('geçersiz değerler veritabanında reddediliyor', async () => {
  await assert.rejects(ulkeliTaslak(SAHIP, { country_code: 'tr' }), /listings_country_code_iso/);
  await assert.rejects(ulkeliTaslak(SAHIP, { country_code: 'TUR' }), /listings_country_code_iso/);
  await assert.rejects(
    ulkeliTaslak(SAHIP, { work_type: 'Remote', city: '', basvuru_ulkeleri: ['Türkiye'] }),
    /listings_basvuru_ulkeleri_iso/,
  );
  await assert.rejects(
    ulkeliTaslak(SAHIP, { work_type: 'Remote', city: '', basvuru_ulkeleri: [] }),
    /listings_basvuru_ulkeleri_iso/,
  );
  await assert.rejects(
    ulkeliTaslak(SAHIP, { country_code: 'TR', basvuru_ulkeleri: ['TR'] }),
    /listings_basvuru_ulkeleri_uzaktan/,
    'başvurulabilen ülkeler yalnız uzaktan ilanda',
  );
});

test('yetkisiz kullanıcı başka şirketin ilanında ülkeyi değiştiremiyor', async () => {
  const id = await ulkeliTaslak(SAHIP, { country_code: 'TR' });
  await gonder(SAHIP, id);
  await olarak(YABANCI, `update public.listings set country_code = 'DE' where id = $1`, [id]);
  assert.equal((await ulkeAlanlari(id)).country_code, 'TR');
});

test('yayındaki ilan: temiz ülke değişikliği uygulanıyor; incelemedeki değişiklik onayla canlıya giriyor', async () => {
  const id = await ulkeliTaslak(SAHIP, { country_code: 'TR' });
  await gonder(SAHIP, id);
  await olarak(SAHIP, `update public.listings set country_code = 'DE' where id = $1`, [id]);
  assert.equal((await ulkeAlanlari(id)).country_code, 'DE');
  assert.equal(await bekleyen(id), null);

  /* Şüpheli metinle birlikte ülke değişikliği: canlı sürüm aynı kalır, onayda ikisi birlikte girer. */
  await olarak(SAHIP,
    `update public.listings set country_code = 'NL', description = description || ' Ayrıntılar: https://bit.ly/x9' where id = $1`, [id]);
  assert.equal((await ulkeAlanlari(id)).country_code, 'DE', 'kontrol edilmemiş değişiklik canlıya girmemeli');
  const d = await bekleyen(id);
  assert.equal(d.durum, 'inceleme');
  assert.equal(d.icerik.country_code, 'NL');
  await olarak(YONETICI, `select public.yonetim_degisiklik_karari($1, 'onayla', null)`, [id]);
  assert.equal((await ulkeAlanlari(id)).country_code, 'NL');
  assert.equal(await bekleyen(id), null);
});

test('göçten önce kaydedilmiş bekleyen içerik (ülke anahtarı yok) ilanın ülkesini silmiyor', async () => {
  const id = await ulkeliTaslak(SAHIP, { country_code: 'TR' });
  await gonder(SAHIP, id);
  const eski = (await db.query(`select public.ilan_icerik_alanlari(l) - 'country_code' - 'basvuru_ulkeleri' as i
                                  from public.listings l where id = $1`, [id])).rows[0].i;
  await db.query(`select public.ilan_bekleyen_icerigi_yaz($1, $2)`, [id, eski]);
  assert.equal((await ulkeAlanlari(id)).country_code, 'TR');
});

/* ------------------------------------------- 20261214010000: doğrulama damgası */

test('doğrulama damgası: kanıtsız damga reddediliyor; ülkeler damgasız değişince damga düşüyor', async () => {
  const id = await ulkeliTaslak(SAHIP, { work_type: 'Remote', city: '', basvuru_ulkeleri: ['DE'] });
  /* Kanıtsız damga kısıta takılıyor. */
  await assert.rejects(
    db.query(`update public.listings set basvuru_ulkeleri_dogrulandi_at = now() where id = $1`, [id]),
    /listings_basvuru_ulkeleri_damgasi/,
  );
  /* Göçün yaptığı gibi: değer, kanıt ve damga aynı güncellemede. */
  await db.query(`update public.listings set basvuru_ulkeleri = array['DE','AT'], basvuru_ulkeleri_kanit = 'kaynak: x',
                  basvuru_ulkeleri_dogrulandi_at = now() where id = $1`, [id]);
  let r = (await db.query(`select basvuru_ulkeleri, basvuru_ulkeleri_kanit, basvuru_ulkeleri_dogrulandi_at from public.listings where id = $1`, [id])).rows[0];
  assert.deepEqual(r.basvuru_ulkeleri, ['DE', 'AT']);
  assert.ok(r.basvuru_ulkeleri_dogrulandi_at, 'aynı güncellemede atılan damga kalmalı');
  /* Ülkeler damga yenilenmeden değişirse eski kanıt geçersiz. */
  await db.query(`update public.listings set basvuru_ulkeleri = array['DE'] where id = $1`, [id]);
  r = (await db.query(`select basvuru_ulkeleri_kanit, basvuru_ulkeleri_dogrulandi_at from public.listings where id = $1`, [id])).rows[0];
  assert.equal(r.basvuru_ulkeleri_dogrulandi_at, null);
  assert.equal(r.basvuru_ulkeleri_kanit, null);
});

test('doğrulama damgasını işveren ve ziyaretçi yazamıyor, okuyabiliyor', async () => {
  const id = await ulkeliTaslak(SAHIP, { work_type: 'Remote', city: '', basvuru_ulkeleri: ['TR'] });
  await assert.rejects(
    olarak(SAHIP, `update public.listings set basvuru_ulkeleri_kanit = 'beyan', basvuru_ulkeleri_dogrulandi_at = now() where id = $1`, [id]),
    /permission denied/,
  );
  const okunan = await olarak(SAHIP, `select basvuru_ulkeleri_dogrulandi_at from public.listings where id = $1`, [id]);
  assert.equal(okunan.length, 1);
  await assert.rejects(
    olarak('anon', `update public.listings set basvuru_ulkeleri_dogrulandi_at = now() where id = $1`, [id]),
    /permission denied/,
  );
});

test('kanıtlı düzeltme göçü: yalnız kaynağın söylediği değer, yalnız beklenen mevcut değerin üstüne', async () => {
  const satir = async (onek) =>
    (await db.query(`select city, country_code, work_type, basvuru_ulkeleri, basvuru_ulkeleri_kanit, basvuru_ulkeleri_dogrulandi_at
                       from public.listings where id::text like $1`, [`${onek}-%`])).rows[0];
  const hiroba = await satir('2a1ca32c');
  assert.equal(hiroba.country_code, 'TR');
  assert.equal(hiroba.city, 'Çankaya', 'şehir değişmemeli');
  const luron = await satir('b39b1b88');
  assert.equal(luron.country_code, 'GB', 'değer önceden değişmişse göç ÜZERİNE YAZMAMALI');
  assert.equal(luron.city, null);
  const atrya = await satir('cc55e6ec');
  assert.equal(atrya.work_type, 'Hybrid');
  assert.equal(atrya.basvuru_ulkeleri, null);
  const fix = await satir('a67768ee');
  assert.deepEqual(fix.basvuru_ulkeleri, ['DE']);
  assert.match(fix.basvuru_ulkeleri_kanit, /join\.com.*TELECOMMUTE.*Germany/);
  assert.ok(fix.basvuru_ulkeleri_dogrulandi_at, 'kanıtlı değer damgalı');
  const [e] = (await db.query(`select country_code from public.listings where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'`)).rows;
  assert.equal(e.country_code, null, 'ilgisiz ilan değişmemeli');
});

test('Guess Europe göçü: kaynak ofis diyor, Uzaktan → Ofis; şehir ve ülke aynı', async () => {
  const [g] = (await db.query(`select work_type, city, country_code, basvuru_ulkeleri, status from public.listings where id::text like 'a0de0769-%'`)).rows;
  assert.equal(g.work_type, 'On-site');
  assert.equal(g.city, 'İstanbul');
  assert.equal(g.country_code, 'TR');
  assert.equal(g.status, 'published', 'düzeltme ilanı kapatmamalı');
  /* Göç ikinci kez koşsa da (koşul artık tutmuyor) hiçbir şey değişmiyor. */
  await db.exec(await readFile(GUESS_GOCU, 'utf8'));
  const [g2] = (await db.query(`select work_type from public.listings where id::text like 'a0de0769-%'`)).rows;
  assert.equal(g2.work_type, 'On-site');
});
