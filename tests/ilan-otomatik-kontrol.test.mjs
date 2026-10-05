import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';

/*
  ŞİRKET İLANLARI İÇİN OTOMATİK KONTROL VE YAYIN (20261120010000)

  İzole PGlite; üretime ve gerçek kullanıcıya dokunulmuyor. Göç OLDUĞU
  GİBİ uygulanıyor. Sorgular gerçek `authenticated` / `anon` /
  `service_role` rolleriyle, JWT iddiaları `request.jwt.claims` ile
  veriliyor; yayın kapısı (`guard_listing_publish`) göçün kendi
  tanımıyla tetikleyici olarak bağlı. RLS ve kolon yetkileri canlıdaki
  biçimiyle kuruluyor.
*/

const GOC = new URL('../supabase/migrations/20261120010000_ilan_otomatik_kontrol.sql', import.meta.url);

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

/* ---------------------------------------------------------------- 1 */

test('sorunsuz ilan: yönetici beklemeden yayında; karar, zaman ve kural sürümü kayıtlı', async () => {
  const id = await taslak(SAHIP, { application_deadline: gunEkle(30) });
  const s = await gonder(SAHIP, id);
  assert.equal(s.durum, 'yayinda');
  const l = await ilan(id);
  assert.equal(l.status, 'published');
  assert.equal(l.kontrol_durumu, 'gecti');
  assert.ok(l.posted_at, 'yayın tarihi');
  assert.match(l.kontrol_kural_surumu, /^ilan-kontrol-2/);
  const d = await defter(id);
  assert.equal(d.length, 1);
  assert.equal(d[0].karar, 'yayinla');
  assert.ok(d[0].icerik_ozeti && d[0].kural_surumu);
});

test('taslak kaydetmek kontrol çalıştırmıyor ve yönetici kuyruğuna düşürmüyor', async () => {
  const id = await taslak(SAHIP, { description: 'kısa' });
  assert.equal((await ilan(id)).kontrol_durumu, null);
  assert.equal((await defter(id)).length, 0);
  const k = (await olarak(YONETICI, `select public.yonetim_onay_kuyrugu() as k`))[0].k;
  assert.ok(!k.ilanlar.some((x) => x.id === id), 'GÖNDERİLMEMİŞ TASLAK KUYRUKTA OLMAMALI');
});

/* ---------------------------------------------------------------- 2 */

test('doğrulanmamış şirket: yayın yok, inceleme; şirkete doğrulama söyleniyor, kuyrukta gerekçe var', async () => {
  const id = await taslak(YENI_SAHIP, {}, YENI_SIRKET);
  const s = await gonder(YENI_SAHIP, id);
  assert.equal(s.durum, 'inceleme_gerekiyor');
  assert.equal((await ilan(id)).status, 'draft');
  assert.equal(s.gerekceler[0].kural, 'sirket.dogrulanmamis');
  assert.match(s.gerekceler[0].mesaj, /doğrulan/);
  const k = (await olarak(YONETICI, `select public.yonetim_onay_kuyrugu() as k`))[0].k;
  const satir = k.ilanlar.find((x) => x.id === id);
  assert.ok(satir, 'kuyrukta');
  assert.deepEqual(kurallar(satir.kontrolGerekceleri), ['sirket.dogrulanmamis']);
  assert.ok(satir.kontrolZamani && satir.kuralSurumu);
});

/* ---------------------------------------------------------------- 3 */

test('yetkisiz kullanıcı: üye olmayan, Viewer ve anonim gönderemiyor', async () => {
  const id = await taslak(SAHIP);
  await assert.rejects(gonder(YABANCI, id), /yetkin yok/);
  await assert.rejects(gonder(IZLEYICI, id), /yetkin yok/);
  await assert.rejects(olarak('anon', `select public.ilan_yayina_gonder($1)`, [id]), /permission denied/);
  assert.equal((await ilan(id)).status, 'draft');
  assert.equal((await defter(id)).length, 0);
});

test('tarayıcı yayın kapısını aşamıyor: doğrudan yayın, iç fonksiyonlar, defter', async () => {
  const id = await taslak(SAHIP);
  await assert.rejects(
    olarak(SAHIP, `update public.listings set status = 'published' where id = $1`, [id]),
    /otomatik kontrol ya da yonetici/);
  await assert.rejects(
    olarak(SAHIP, `insert into public.listings (company_id, title, origin, status) values ($1, 'X', 'employer_posted', 'published')`, [SIRKET]),
    /otomatik kontrol ya da yonetici/);
  for (const sql of [
    `select public.ilan_kontrolu_uygula('${id}', '${SAHIP}')`,
    `select public.ilan_kontrollerini_yeniden_dene(5)`,
    `select count(*) from public.ilan_kontrolleri`,
    `insert into public.ilan_kontrolleri (listing_id, kaynak, karar) values ('${id}', 'otomatik', 'yayinla')`,
    `update public.listings set kontrol_durumu = 'gecti' where id = '${id}'`,
  ]) {
    await assert.rejects(olarak(SAHIP, sql), /permission denied/, sql);
  }
  assert.equal((await ilan(id)).status, 'draft');
});

/* ---------------------------------------------------------------- 4 */

test('eksik bilgi: düzeltme; alan alan ne yapılacağı', async () => {
  const id = await taslak(SAHIP, { city: ' ', duration: '', description: 'Kısa metin.', stipend_text: '' });
  const s = await gonder(SAHIP, id);
  assert.equal(s.durum, 'duzeltme_gerekiyor');
  assert.equal((await ilan(id)).status, 'draft');
  const alanlar = s.gerekceler.map((g) => g.alan).sort();
  assert.deepEqual(alanlar, ['city', 'description', 'duration', 'stipend_text']);
  assert.ok(s.gerekceler.every((g) => g.mesaj.length > 5));
  assert.match(s.gerekceler.find((g) => g.alan === 'description').mesaj, /en az 200 karakter/);
});

/* ---------------------------------------------------------------- 5 */

test('tarih: geçmiş son başvuru düzeltmeye döner; bugün, ileri tarih ve süresiz geçerli', async () => {
  const gecmis = await taslak(SAHIP, { application_deadline: gunEkle(-1) });
  const s1 = await gonder(SAHIP, gecmis);
  assert.equal(s1.durum, 'duzeltme_gerekiyor');
  assert.equal(s1.gerekceler[0].kural, 'tarih.gecmis');
  assert.equal(s1.gerekceler[0].alan, 'application_deadline');

  for (const tarih of [bugun(), gunEkle(400), null]) {
    const id = await taslak(SAHIP, { application_deadline: tarih });
    assert.equal((await gonder(SAHIP, id)).durum, 'yayinda', String(tarih));
  }
});

test('ücret açıklaması sayı şartı yok; uzaktan çalışmada şehir zorunlu değil; uzun iş tanımı geçerli', async () => {
  const asgari = await taslak(SAHIP, { stipend_text: 'Asgari staj ücreti' });
  assert.equal((await gonder(SAHIP, asgari)).durum, 'yayinda');

  const aciklamasiz = await taslak(SAHIP, { is_paid: true, stipend_text: '' });
  assert.equal((await gonder(SAHIP, aciklamasiz)).gerekceler[0].kural, 'zorunlu.ucret');

  const uzaktan = await taslak(SAHIP, { work_type: 'Remote', city: '' });
  assert.equal((await gonder(SAHIP, uzaktan)).durum, 'yayinda');
  const ofisSehirsiz = await taslak(SAHIP, { work_type: 'On-site', city: '' });
  assert.equal((await gonder(SAHIP, ofisSehirsiz)).gerekceler[0].alan, 'city');

  const uzunMetin = (IYI_METIN + ' ').repeat(9);
  assert.ok(uzunMetin.length > 2000);
  const uzun = await taslak(SAHIP, { description: uzunMetin });
  assert.equal((await gonder(SAHIP, uzun)).durum, 'yayinda', '2000 üstü geçerli metin reddedilmemeli');
  const asiri = await taslak(SAHIP, { description: 'a'.repeat(5001) });
  assert.match((await gonder(SAHIP, asiri)).gerekceler[0].mesaj, /en fazla 5000/);
});

test('tekrar gönderim: aynı ilan iki kez gönderilince yeni kontrol yazılmıyor', async () => {
  const id = await taslak(SAHIP, { description: 'eksik' });
  const [a, b] = [await gonder(SAHIP, id), await gonder(SAHIP, id)];
  assert.deepEqual(a, b);
  assert.equal((await defter(id)).length, 1, 'DEFTERDE TEK SATIR');

  const yayinda = await taslak(SAHIP);
  await gonder(SAHIP, yayinda);
  await gonder(SAHIP, yayinda);
  assert.equal((await defter(yayinda)).length, 1, 'yayındaki ilan yeniden kontrol edilmiyor');
});

test('tekrar ilan: başlık + şehir tek başına tekrar sayılmıyor; birebir aynı ilan düzeltmeye döner', async () => {
  const ilk = await taslak(SAHIP, { title: 'Pazarlama Stajyeri', city: 'Ankara' });
  assert.equal((await gonder(SAHIP, ilk)).durum, 'yayinda');

  const baskaDonem = await taslak(SAHIP, { title: 'Pazarlama Stajyeri', city: 'Ankara', term: 'Summer 2026' });
  assert.equal((await gonder(SAHIP, baskaDonem)).durum, 'yayinda', 'farklı dönem geçerli');
  const baskaDepartman = await taslak(SAHIP, { title: 'Pazarlama Stajyeri', city: 'Ankara', department: 'Dijital' });
  assert.equal((await gonder(SAHIP, baskaDepartman)).durum, 'yayinda', 'farklı departman geçerli');
  const baskaMetin = await taslak(SAHIP, { title: 'Pazarlama Stajyeri', city: 'Ankara',
    description: IYI_METIN + ' İkinci kontenjan, ekim başlangıçlı.' });
  assert.equal((await gonder(SAHIP, baskaMetin)).durum, 'yayinda', 'farklı içerik geçerli');

  const birebir = await taslak(SAHIP, { title: 'pazarlama  stajyeri', city: 'ANKARA' });
  const s = await gonder(SAHIP, birebir);
  assert.equal(s.durum, 'duzeltme_gerekiyor');
  assert.equal(s.gerekceler[0].kural, 'tekrar');
  assert.match(s.gerekceler[0].mesaj, /zaten yayında/);
});

test('çift tıklama: aynı gönderim anahtarıyla ikinci ilan oluşmuyor', async () => {
  const anahtar = 'c0000000-0000-4000-8000-000000000001';
  await taslak(SAHIP, { gonderim_anahtari: anahtar });
  await assert.rejects(taslak(SAHIP, { gonderim_anahtari: anahtar }), /duplicate|unique|benzersiz/i);
});

/* ---------------------------------------------------------------- 7 */

test('şüpheli içerik: incelemeye düşüyor; şirkete kural ayrıntısı yok, yöneticiye kanıtıyla', async () => {
  const id = await taslak(SAHIP, {
    description: IYI_METIN + ' Programa kabul için katılım ücreti olarak 1500 TL yatırmanız gerekmektedir.',
  });
  const s = await gonder(SAHIP, id);
  assert.equal(s.durum, 'inceleme_gerekiyor');
  assert.equal((await ilan(id)).status, 'draft');
  assert.equal(s.gerekceler.length, 1);
  assert.equal(s.gerekceler[0].kural, 'inceleme');
  assert.ok(!JSON.stringify(s.gerekceler).includes('ucret'), 'ŞİRKETE KURAL AYRINTISI GİTMEMELİ');

  const k = (await olarak(YONETICI, `select public.yonetim_onay_kuyrugu() as k`))[0].k;
  const satir = k.ilanlar.find((x) => x.id === id);
  const g = satir.kontrolGerekceleri.find((x) => x.kural === 'icerik.odeme_talebi');
  assert.ok(g, 'kuyrukta gerekçe');
  assert.match(g.kanit, /katilim ucreti/);
});

test('bağlam: olumsuz cümle ve tek zayıf ifade şüpheli sayılmıyor', async () => {
  const id = await taslak(SAHIP, {
    description: IYI_METIN + ' Eğitim ücreti alınmaz, teminat istenmez. Staj ücreti IBAN hesabınıza yatırılır. ' +
      'Pasif gelir değil, gerçek iş deneyimi.',
  });
  const s = await gonder(SAHIP, id);
  assert.equal(s.durum, 'yayinda', JSON.stringify(await defter(id)));
});

test('başka şüpheli kalıplar: WhatsApp başvurusu, zincir satış, kısaltılmış bağlantı, kimlik isteme', async () => {
  const ornekler = [
    [' Başvurular için CV’nizi WhatsApp üzerinden iletin.', 'icerik.mesajlasma'],
    [' Network marketing ile kendi işinin patronu ol.', 'icerik.zincir_satis'],
    [' Ayrıntılar: https://bit.ly/abc123', 'baglanti.kisaltici'],
    [' Başvuruda TC kimlik fotokopisi göndermeniz gerekir.', 'icerik.hassas_veri'],
    [' Yerimizi ayırmak için kapora alınacaktır.', 'icerik.teminat'],
  ];
  for (const [ek, kural] of ornekler) {
    const id = await taslak(SAHIP, { description: IYI_METIN + ek });
    const s = await gonder(SAHIP, id);
    assert.equal(s.durum, 'inceleme_gerekiyor', ek);
    const d = await defter(id);
    assert.ok(kurallar(d.at(-1).gerekceler).includes(kural), `${ek} → ${kural}: ${JSON.stringify(d.at(-1).gerekceler)}`);
  }
});

test('bağlantı ve iletişim düzeltmeleri: http, dış form, e-postayla CV', async () => {
  const ornekler = [
    [' Ayrıntılar http://ornek-sirket.com/staj adresinde.', 'baglanti.https'],
    [' Başvuru formu: https://forms.gle/abcdef', 'baglanti.dis_form'],
    [' CV’nizi ik@ornek-sirket.com adresine gönderin.', 'iletisim.eposta'],
  ];
  for (const [ek, kural] of ornekler) {
    const id = await taslak(SAHIP, { description: IYI_METIN + ek });
    const s = await gonder(SAHIP, id);
    assert.equal(s.durum, 'duzeltme_gerekiyor', ek);
    assert.ok(kurallar(s.gerekceler).includes(kural), ek);
  }
  const iyi = await taslak(SAHIP, { description: IYI_METIN + ' Şirketimizi tanı: https://ornek-sirket.com/hakkimizda' });
  assert.equal((await gonder(SAHIP, iyi)).durum, 'yayinda', 'https şirket bağlantısı serbest');
});

/* ---------------------------------------------------------------- 8 */

test('kontrol hatası: ilan yayına çıkmıyor, "kontrol ediliyor"; yeniden deneme yayınlıyor', async () => {
  const asil = (await db.query(
    `select pg_get_functiondef('public.ilan_kontrol_kurallari(public.listings)'::regprocedure) d`)).rows[0].d;
  await db.exec(`create or replace function public.ilan_kontrol_kurallari(l public.listings) returns jsonb
    language plpgsql stable security definer set search_path = public, pg_temp
    as $$ begin raise exception 'gecici ariza'; end $$;`);

  const id = await taslak(SAHIP);
  const s = await gonder(SAHIP, id);
  assert.equal(s.durum, 'kontrol_ediliyor');
  const l = await ilan(id);
  assert.equal(l.status, 'draft', 'KONTROL EDİLMEDEN YAYIN YOK');
  assert.equal(l.kontrol_durumu, 'bekliyor');
  assert.equal((await defter(id))[0].karar, 'hata');
  assert.match((await defter(id))[0].hata, /gecici ariza/);

  /* Zaman gelmeden yeniden deneme bu ilana dokunmuyor. */
  assert.equal((await olarak('service_role', `select public.ilan_kontrollerini_yeniden_dene(10) n`))[0].n, 0);

  await db.exec(asil);
  await db.query(`update public.listings set kontrol_sonraki_at = now() - interval '1 minute' where id = $1`, [id]);
  const n = (await olarak('service_role', `select public.ilan_kontrollerini_yeniden_dene(10) n`))[0].n;
  assert.equal(n, 1);
  assert.equal((await ilan(id)).status, 'published');
  assert.deepEqual((await defter(id)).map((x) => x.karar), ['hata', 'yayinla']);
});

test('kontrol üç kez tamamlanamazsa ilan yönetici kuyruğuna düşüyor', async () => {
  const asil = (await db.query(
    `select pg_get_functiondef('public.ilan_kontrol_kurallari(public.listings)'::regprocedure) d`)).rows[0].d;
  await db.exec(`create or replace function public.ilan_kontrol_kurallari(l public.listings) returns jsonb
    language plpgsql stable security definer set search_path = public, pg_temp
    as $$ begin raise exception 'kalici ariza'; end $$;`);
  try {
    const id = await taslak(SAHIP);
    await gonder(SAHIP, id);
    for (let i = 0; i < 2; i += 1) {
      await db.query(`update public.listings set kontrol_sonraki_at = now() - interval '1 minute' where id = $1`, [id]);
      await olarak('service_role', `select public.ilan_kontrollerini_yeniden_dene(10)`);
    }
    const l = await ilan(id);
    assert.equal(l.status, 'draft');
    assert.equal(l.kontrol_durumu, 'inceleme');
    assert.deepEqual((await defter(id)).map((x) => x.karar), ['hata', 'hata', 'hata', 'inceleme']);
    const k = (await olarak(YONETICI, `select public.yonetim_onay_kuyrugu() as k`))[0].k;
    const satir = k.ilanlar.find((x) => x.id === id);
    assert.equal(satir.kontrolGerekceleri[0].kural, 'kontrol.tamamlanamadi');
  } finally {
    await db.exec(asil);
  }
});

test('şirket yeniden denemeyi çağıramıyor', async () => {
  await assert.rejects(olarak(SAHIP, `select public.ilan_kontrollerini_yeniden_dene(1)`), /permission denied/);
});

/* ---------------------------------------------------------------- 9 */

test('yayındaki ilan düzenleme: temiz değişiklik yeni sürüm olarak yayına giriyor', async () => {
  const id = await taslak(SAHIP);
  await gonder(SAHIP, id);
  await olarak(SAHIP, `update public.listings set duration = '30 iş günü' where id = $1`, [id]);
  const l = await ilan(id);
  assert.equal(l.status, 'published');
  assert.equal(l.duration, '30 iş günü');
  assert.equal(await bekleyen(id), null);
  assert.deepEqual((await defter(id)).map((x) => `${x.kapsam}:${x.karar}`), ['ilan:yayinla', 'degisiklik:yayinla']);
});

test('yayındaki ilan düzenleme: şüpheli değişiklik açılmıyor; son onaylı sürüm yayında kalıyor', async () => {
  const id = await taslak(SAHIP);
  await gonder(SAHIP, id);
  await olarak(SAHIP, `update public.listings set description = description || ' Kayıt için depozito yatırmanız gerekir.' where id = $1`, [id]);
  const l = await ilan(id);
  assert.equal(l.status, 'published', 'SON ONAYLI SÜRÜM YAYINDA KALMALI');
  assert.equal(l.description, IYI_METIN, 'KONTROL EDİLMEMİŞ METİN CANLI SATIRA GİRMEMELİ');
  const herkese = await olarak('anon', `select description from public.listings where id = $1`, [id]);
  assert.equal(herkese[0].description, IYI_METIN);
  const d = await bekleyen(id);
  assert.equal(d.durum, 'inceleme');
  assert.match(d.icerik.description, /depozito/);
  await assert.rejects(olarak('anon', `select * from public.ilan_bekleyen_degisiklikleri`), /permission denied/);
  const yabanci = await olarak(YABANCI, `select listing_id from public.ilan_bekleyen_degisiklikleri where listing_id = $1`, [id]);
  assert.equal(yabanci.length, 0, 'başka şirket bekleyen değişikliği göremez');
  const sahip = await olarak(SAHIP, `select durum from public.ilan_bekleyen_degisiklikleri where listing_id = $1`, [id]);
  assert.equal(sahip[0].durum, 'inceleme');
  assert.ok((await kuyruk()).degisiklikler.some((x) => x.id === id && /depozito/.test(x.bekleyen.description)));
});

test('yayındaki ilan düzenleme: eksik bilgi düzeltmeye döner, ilan yayında kalır; düzeltince yeni sürüm yayında', async () => {
  const id = await taslak(SAHIP);
  await gonder(SAHIP, id);
  await olarak(SAHIP, `update public.listings set description = 'Kısa.' where id = $1`, [id]);
  assert.equal((await ilan(id)).status, 'published');
  assert.equal((await ilan(id)).description, IYI_METIN);
  const d = await bekleyen(id);
  assert.equal(d.durum, 'duzeltme');
  assert.equal(d.gerekceler[0].alan, 'description');
  const s = await gonder(SAHIP, id);
  assert.equal(s.degisiklik.durum, 'duzeltme_gerekiyor', 'aynı değişiklik yeniden kontrol edilmiyor');

  const yeni = IYI_METIN + ' Güncellendi.';
  await olarak(SAHIP, `update public.listings set description = $2 where id = $1`, [id, yeni]);
  assert.equal((await ilan(id)).description, yeni);
  assert.equal(await bekleyen(id), null);

  const id2 = await taslak(SAHIP);
  await gonder(SAHIP, id2);
  await olarak(SAHIP, `update public.listings set status = 'closed' where id = $1`, [id2]);
  assert.equal((await defter(id2)).length, 1, 'kapatma içerik değişikliği değil');
});

test('bekleyen değişiklik kontrol hatasında: canlı sürüm yayında, yeniden deneme yeni sürümü yayınlıyor', async () => {
  const asil = (await db.query(
    `select pg_get_functiondef('public.ilan_kontrol_kurallari(public.listings)'::regprocedure) d`)).rows[0].d;
  const id = await taslak(SAHIP);
  await gonder(SAHIP, id);
  await db.exec(`create or replace function public.ilan_kontrol_kurallari(l public.listings) returns jsonb
    language plpgsql stable security definer set search_path = public, pg_temp
    as $$ begin raise exception 'gecici ariza'; end $$;`);
  try {
    await olarak(SAHIP, `update public.listings set duration = '40 iş günü' where id = $1`, [id]);
  } finally {
    await db.exec(asil);
  }
  assert.equal((await ilan(id)).status, 'published');
  assert.equal((await ilan(id)).duration, '20 iş günü');
  assert.equal((await bekleyen(id)).durum, 'bekliyor');
  await db.query(`update public.ilan_bekleyen_degisiklikleri set sonraki_at = now() - interval '1 minute' where listing_id = $1`, [id]);
  await olarak('service_role', `select public.ilan_kontrollerini_yeniden_dene(10)`);
  assert.equal((await ilan(id)).duration, '40 iş günü');
  assert.equal(await bekleyen(id), null);
});

test('düzeltme sonrası içerik değişince eski karar düşüyor; yeniden gönderince yayında', async () => {
  const id = await taslak(SAHIP, { description: 'eksik' });
  await gonder(SAHIP, id);
  await olarak(SAHIP, `update public.listings set description = $2 where id = $1`, [id, IYI_METIN]);
  assert.equal((await ilan(id)).kontrol_durumu, null, 'yeniden gönderilmeli');
  assert.equal((await gonder(SAHIP, id)).durum, 'yayinda');
});

/* --------------------------------------------------------------- 10 */

test('yönetici müdahalesi: incelemedeki ilanı onaylar; eski arşivleme yolu da deftere yazılıyor', async () => {
  const a = await taslak(YENI_SAHIP, { title: 'Onaylanacak' }, YENI_SIRKET);
  const b = await taslak(YENI_SAHIP, { title: 'Arşivlenecek' }, YENI_SIRKET);
  await gonder(YENI_SAHIP, a);
  await gonder(YENI_SAHIP, b);
  await olarak(YONETICI, `update public.listings set status = 'published', posted_at = now() where id = $1`, [a]);
  await olarak(YONETICI, `update public.listings set status = 'archived' where id = $1`, [b]);
  assert.equal((await ilan(a)).status, 'published');
  assert.equal((await ilan(a)).kontrol_durumu, 'gecti');
  assert.deepEqual((await defter(a)).map((x) => `${x.kaynak}:${x.karar}`), ['otomatik:inceleme', 'yonetici:yonetici_onay']);
  assert.deepEqual((await defter(b)).map((x) => x.karar), ['inceleme', 'yonetici_ret']);
  const k = await kuyruk();
  assert.ok(k.sonKararlar.some((x) => x.ilanId === a && x.karar === 'yonetici_onay'));
  assert.ok(k.sonKararlar.some((x) => x.karar === 'yayinla'), 'otomatik yayınlar da yöneticide görünüyor');
});

test('yönetici gerekçeyle reddeder: şirket gerekçeyi görür, yeniden gönderim yöneticiye düşer', async () => {
  const id = await taslak(YENI_SAHIP, { title: 'Reddedilecek' }, YENI_SIRKET);
  await gonder(YENI_SAHIP, id);
  await assert.rejects(olarak(YONETICI, `select public.yonetim_ilan_reddet($1, 'kısa')`, [id]), /gerekce/);
  await assert.rejects(olarak(YENI_SAHIP, `select public.yonetim_ilan_reddet($1, 'Gerekçe yazıldı burada')`, [id]), /yalnizca yoneticiye/);
  await olarak(YONETICI, `select public.yonetim_ilan_reddet($1, 'İş tanımı staj dışı satış hedefleri içeriyor.')`, [id]);
  const l = await ilan(id);
  assert.equal(l.status, 'draft');
  assert.equal(l.kontrol_durumu, 'duzeltme');
  assert.match(l.kontrol_gerekceleri[0].mesaj, /satış hedefleri/);
  assert.equal(l.yonetici_incelemesi_gerekli, true);
  assert.equal((await defter(id)).at(-1).karar, 'yonetici_ret');
});

test('yönetici gerekçeyle yayından kaldırır; otomatik kontrol geçse de yeniden yayın yönetici onayına bağlı', async () => {
  const id = await taslak(SAHIP);
  await gonder(SAHIP, id);
  await olarak(YONETICI, `select public.yonetim_ilan_yayindan_kaldir($1, 'Şikâyet incelemesi sürüyor, geçici olarak kaldırıldı.')`, [id]);
  let l = await ilan(id);
  assert.equal(l.status, 'draft');
  assert.equal(l.kontrol_durumu, 'duzeltme');
  assert.match(l.kontrol_gerekceleri[0].mesaj, /Şikâyet incelemesi/);
  const herkese = await olarak('anon', `select id from public.listings where id = $1`, [id]);
  assert.equal(herkese.length, 0, 'kaldırılan ilan ziyaretçiye görünmez');

  const s = await gonder(SAHIP, id);
  assert.equal(s.durum, 'inceleme_gerekiyor', 'ONAYSIZ YENİDEN YAYIN OLMAMALI');
  assert.ok(s.gerekceler.some((g) => g.kural === 'yonetici.onceki_karar'));

  await olarak(YONETICI, `update public.listings set status = 'published', posted_at = now() where id = $1`, [id]);
  l = await ilan(id);
  assert.equal(l.status, 'published');
  assert.equal(l.yonetici_incelemesi_gerekli, false);
  assert.deepEqual((await defter(id)).map((x) => x.karar), ['yayinla', 'yonetici_kaldirdi', 'inceleme', 'yonetici_onay']);
});

test('yönetici incelemedeki değişikliği onaylar ya da gerekçeyle reddeder', async () => {
  const a = await taslak(SAHIP);
  const b = await taslak(SAHIP);
  await gonder(SAHIP, a);
  await gonder(SAHIP, b);
  for (const id of [a, b]) {
    await olarak(SAHIP, `update public.listings set description = description || ' Ayrıntılar: https://bit.ly/x1' where id = $1`, [id]);
    assert.equal((await bekleyen(id)).durum, 'inceleme');
  }
  await olarak(YONETICI, `select public.yonetim_degisiklik_karari($1, 'onayla', null)`, [a]);
  assert.match((await ilan(a)).description, /bit\.ly/);
  assert.equal(await bekleyen(a), null);

  await olarak(YONETICI, `select public.yonetim_degisiklik_karari($1, 'reddet', 'Kısaltılmış bağlantı kullanmayın.')`, [b]);
  assert.equal((await ilan(b)).description, IYI_METIN, 'reddedilen değişiklik canlıya girmez');
  const d = await bekleyen(b);
  assert.equal(d.durum, 'duzeltme');
  assert.match(d.gerekceler[0].mesaj, /Kısaltılmış/);
  assert.deepEqual((await defter(b)).slice(-1).map((x) => `${x.kapsam}:${x.karar}`), ['degisiklik:degisiklik_ret']);
});

test('eski arayüz (gönderim anahtarı yok) ile eklenen ilan kontrolsüz taslakta kalmıyor', async () => {
  const id = await taslak(SAHIP, { eski: true });
  assert.equal((await ilan(id)).status, 'published');
  const kotu = await taslak(SAHIP, { eski: true, description: 'kısa' });
  assert.equal((await ilan(kotu)).kontrol_durumu, 'duzeltme');
  const izleyici = await taslak(IZLEYICI, { eski: true });
  assert.equal((await ilan(izleyici)).kontrol_durumu, null, 'yetkisiz üye için kontrol çalışmaz');
});

test('yeniden deneme işi iz bırakıyor; yönetici son çalışmayı ve gecikmeyi görüyor', async () => {
  await olarak('service_role', `select public.ilan_kontrollerini_yeniden_dene(10)`);
  const k = await kuyruk();
  assert.ok(k.yenidenDenemeIsi.sonCalisma, 'son çalışma zamanı');
  assert.equal(typeof k.yenidenDenemeIsi.gecikmisKontroller, 'number');

  const id = await taslak(SAHIP);
  await db.query(`update public.listings set kontrol_durumu = 'bekliyor', kontrol_sonraki_at = now() - interval '3 hours' where id = $1`, [id]);
  assert.ok((await kuyruk()).yenidenDenemeIsi.gecikmisKontroller >= 1);
  await db.query(`update public.listings set kontrol_durumu = null, kontrol_sonraki_at = null where id = $1`, [id]);
});

test('kaynaktan derlenen ilan: otomasyon yayınlıyor, kontrol akışına girmiyor', async () => {
  const [r] = await olarak('service_role',
    `insert into public.listings (company_id, title, origin, status, description)
     values ($1, 'Derlenen', 'scraped', 'published', 'kısa') returning id`, [SIRKET]);
  await olarak('service_role', `update public.listings set description = 'yine kısa' where id = $1`, [r.id]);
  assert.equal((await ilan(r.id)).status, 'published');
  assert.equal((await defter(r.id)).length, 0);
  await assert.rejects(gonder(SAHIP, r.id), /sirket panelinden/);
});

/*
  ESKİ AÇIK SEKMEDEN GÜNCELLEME

  Göçten sonra açık kalmış eski sekme, `main`deki eski istemcinin
  gönderdiği yükleri gönderir (git show origin/main: src/lib/sirket-veri.ts):
    · ilanGuncelle:     ilanSatiri() − {company_id, origin, status, posted_at}
                        → title, city, work_type, mandatory_staj_accepted,
                          voluntary_staj_accepted, term, duration, is_paid,
                          stipend_text, description, application_deadline
    · ilanDurumuDegistir('published'): { status: 'published', posted_at: now }
  Bu yükler otomatik kontrolü ve bekleyen değişiklik akışını aşamamalı.
*/
const eskiGuncelle = (kim, id, alanlar) => olarak(kim,
  `update public.listings
      set title = $2, city = $3, work_type = 'On-site', mandatory_staj_accepted = null,
          voluntary_staj_accepted = null, term = 'All Year', duration = $4, is_paid = true,
          stipend_text = 'Asgari staj ücreti', description = $5, application_deadline = null
    where id = $1`,
  [id, alanlar.title, alanlar.city ?? 'İstanbul', alanlar.duration ?? '20 iş günü', alanlar.description]);

test('eski sekme güncellemesi: yayındaki ilanın içeriği kontrolsüz değişemiyor', async () => {
  const id = await taslak(SAHIP, { title: 'Eski Sekme Stajyeri' });
  await gonder(SAHIP, id);

  await eskiGuncelle(SAHIP, id, { title: 'Eski Sekme Stajyeri',
    description: IYI_METIN + ' Başvuru için CV’nizi WhatsApp üzerinden iletin.' });
  let l = await ilan(id);
  assert.equal(l.status, 'published');
  assert.equal(l.description, IYI_METIN, 'ŞÜPHELİ METİN CANLIYA GİRMEMELİ');
  assert.equal((await bekleyen(id)).durum, 'inceleme');

  await eskiGuncelle(SAHIP, id, { title: 'Eski Sekme Stajyeri', description: 'Kısa.' });
  l = await ilan(id);
  assert.equal(l.description, IYI_METIN, 'EKSİK METİN CANLIYA GİRMEMELİ');
  assert.equal((await bekleyen(id)).durum, 'duzeltme');

  await eskiGuncelle(SAHIP, id, { title: 'Eski Sekme Stajyeri', description: IYI_METIN + ' Güncel.' });
  l = await ilan(id);
  assert.equal(l.description, IYI_METIN + ' Güncel.', 'kontrolden geçen değişiklik yayına girer');
  assert.equal(await bekleyen(id), null);
});

test('eski sekme "Yayınla" (status + posted_at) yayın kapısını aşamıyor', async () => {
  const taslakId = await taslak(SAHIP, { title: 'Eski Yayınla Taslak', description: 'kısa' });
  await assert.rejects(
    olarak(SAHIP, `update public.listings set status = 'published', posted_at = now() where id = $1`, [taslakId]),
    /otomatik kontrol ya da yonetici/);
  assert.equal((await ilan(taslakId)).status, 'draft');

  const kapali = await taslak(SAHIP, { title: 'Eski Yayınla Kapalı' });
  await gonder(SAHIP, kapali);
  await olarak(SAHIP, `update public.listings set status = 'closed' where id = $1`, [kapali]);
  await assert.rejects(
    olarak(SAHIP, `update public.listings set status = 'published', posted_at = now() where id = $1`, [kapali]),
    /otomatik kontrol ya da yonetici/);
  assert.equal((await ilan(kapali)).status, 'closed');

  /* İçerik ve durum aynı istekte de olsa kapı açılmıyor. */
  await assert.rejects(
    olarak(SAHIP, `update public.listings set status = 'published', description = $2 where id = $1`,
      [taslakId, IYI_METIN]),
    /otomatik kontrol ya da yonetici/);
});

test('eski sekme güncellemesi: incelemedeki taslağın içeriği değişince kuyruktan düşüyor', async () => {
  const id = await taslak(YENI_SAHIP, { title: 'İncelemedeki Eski Sekme' }, YENI_SIRKET);
  await gonder(YENI_SAHIP, id);
  assert.ok((await kuyruk()).ilanlar.some((x) => x.id === id));
  await eskiGuncelle(YENI_SAHIP, id, { title: 'İncelemedeki Eski Sekme', description: IYI_METIN + ' Değişti.' });
  assert.equal((await ilan(id)).kontrol_durumu, null, 'eski karar yeni içeriği temsil etmiyor');
  assert.ok(!(await kuyruk()).ilanlar.some((x) => x.id === id),
    'YÖNETİCİ İNCELEMEDİĞİ İÇERİĞİ ONAYLAYAMAMALI: ilan kuyruktan düşer');
});
