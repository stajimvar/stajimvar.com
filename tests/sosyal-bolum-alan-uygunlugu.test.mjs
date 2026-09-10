import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  ZORUNLU BÖLÜM–ALAN UYGUNLUĞU

  Ürünün temel kuralı: kullanıcı alanını SEÇMİYOR. Kontrollü listeden
  bölümünü seçiyor, alan sunucuda onaylı eşlemeden türetiliyor.
  "Elektrik Mühendisliği öğrencisi Tekstil alanına katılamaz" cümlesi bu
  dosyada bir cümle değil, çalıştırılan bir ölçüm.

  B aşamasında alan İSTEMCİDEN geliyordu ve ilk yazımda hangi sektörün
  geldiğine bakan hiçbir kural yoktu; `sektor_kilidi` yalnız sonradan
  değiştirmeyi engelliyordu. Buradaki testler o boşluğun kapandığını ve
  kapanmış kalmasını bekliyor.

  PGlite bellekte; kullanıcılar bu testin kendi kayıtları.
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
  '../supabase/migrations/20260923040000_yonetici_duzeltme_denetim.sql',
].map((yol) => new URL(yol, import.meta.url));

const AYSE = '11111111-1111-4111-8111-111111111111';
const BURAK = '22222222-2222-4222-8222-222222222222';
const ADMIN = '99999999-9999-4999-8999-999999999999';

let db;

async function olarak(kimlik, sql, params = []) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${kimlik}'`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec('reset role; reset request.jwt.claim.sub');
  }
}

/*
  Hata metnine `detail` de ekleniyor: kurulum RPC'si makine kodunu
  (`bolum-bulunamadi` gibi) orada taşıyor, mesajı kullanıcı cümlesi
  olarak temiz bırakıyor.
*/
async function yazmayiDene(kimlik, sql, params = []) {
  try {
    await olarak(kimlik, sql, params);
    return null;
  } catch (e) {
    return [e?.message, e?.detail].filter(Boolean).join(' | ') || String(e);
  }
}

const tekil = async (sql, params = []) => (await db.query(sql, params)).rows;

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
    grant usage on schema auth to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant execute on function public.is_admin() to anon, authenticated;
    grant select on public.profiles to authenticated;
  `);

  for (const dosya of DOSYALAR) await db.exec(await readFile(dosya, 'utf8'));

  await db.exec(`
    insert into auth.users values ('${AYSE}'),('${BURAK}'),('${ADMIN}');
    insert into public.profiles(id) values ('${AYSE}'),('${BURAK}');
    insert into public.profiles(id, role) values ('${ADMIN}','admin');
  `);
});

after(async () => {
  await db?.close();
});

/* ================================================== KATALOG VE EŞLEME */

test('bölüm kataloğu 42 satır ve slug kimlikleri kalıcı', async () => {
  const sayim = await tekil(`select count(*)::int n from departments`);
  assert.equal(sayim[0].n, 42);

  const elektrik = await tekil(
    `select ad, grup from departments where slug='elektrik-elektronik-muhendisligi'`,
  );
  assert.equal(elektrik.length, 1);
  assert.equal(elektrik[0].grup, 'muhendislik');
});

test('alan listesi 8 yeni alanla 23 satıra çıktı, eski sıralar bozulmadı', async () => {
  const sayim = await tekil(`select count(*)::int n from sectors`);
  assert.equal(sayim[0].n, 23, 'alan sayısı 23 olmalı');

  const yeniler = await tekil(
    `select slug, sira from sectors where slug = any($1) order by sira`,
    [[
      'endustri-operasyon-yonetimi', 'mekatronik-otomasyon', 'ekonomi-isletme-yonetim',
      'is-sagligi-guvenligi-kalite', 'kamu-siyaset-uluslararasi-iliskiler',
      'hukuk-adalet', 'psikoloji-sosyal-bilimler', 'egitim-cocuk-gelisimi',
    ]],
  );
  assert.equal(yeniler.length, 8, 'sekiz yeni alan eksik');
  assert.deepEqual(yeniler.map((r) => r.sira), [16, 17, 18, 19, 20, 21, 22, 23]);

  /* Var olan alanların sırası DEĞİŞMEMELİ: adresler ve seçimler ona bağlı. */
  const eski = await tekil(
    `select sira from sectors where slug='tekstil-moda-hazir-giyim'`,
  );
  assert.equal(eski[0].sira, 1);
});

test('42 bölümün tamamının eşlemesi var', async () => {
  const sayim = await tekil(`select count(*)::int n from department_sectors`);
  assert.equal(sayim[0].n, 42);

  const eksik = await tekil(
    `select d.slug from departments d
       left join department_sectors ds on ds.department_id = d.id
      where ds.department_id is null`,
  );
  assert.deepEqual(eksik.map((r) => r.slug), [], 'eşlemesiz bölüm kalmış');
});

test('TEMEL KURAL: Elektrik-Elektronik öğrencisi Tekstil alanına giremiyor', async () => {
  const satir = await tekil(
    `select s.slug from departments d
       join department_sectors ds on ds.department_id = d.id
       join sectors s on s.id = ds.sector_id
      where d.slug = 'elektrik-elektronik-muhendisligi'`,
  );
  assert.equal(satir[0].slug, 'elektrik-elektronik-enerji');

  /* Tekstil alanına yalnız iki bölüm bağlı; elektrik onların arasında değil. */
  const tekstil = await tekil(
    `select d.slug from departments d
       join department_sectors ds on ds.department_id = d.id
       join sectors s on s.id = ds.sector_id
      where s.slug = 'tekstil-moda-hazir-giyim' order by d.slug`,
  );
  assert.deepEqual(tekstil.map((r) => r.slug), ['giyim-uretim-teknolojisi', 'moda-tasarimi']);
});

test('onaylanan özel eşlemeler birebir uygulanmış', async () => {
  const beklenen = {
    'endustri-muhendisligi': 'endustri-operasyon-yonetimi',
    'mekatronik-muhendisligi': 'mekatronik-otomasyon',
    'mekatronik': 'mekatronik-otomasyon',
    'isletme': 'ekonomi-isletme-yonetim',
    'iktisat': 'ekonomi-isletme-yonetim',
    'halkla-iliskiler-ve-pazarlama': 'ticaret-pazarlama-eticaret',
    'is-sagligi-ve-guvenligi': 'is-sagligi-guvenligi-kalite',
    'uluslararasi-iliskiler': 'kamu-siyaset-uluslararasi-iliskiler',
    'siyaset-bilimi': 'kamu-siyaset-uluslararasi-iliskiler',
    'hukuk': 'hukuk-adalet',
    'psikoloji': 'psikoloji-sosyal-bilimler',
    'sosyoloji': 'psikoloji-sosyal-bilimler',
    'cocuk-gelisimi': 'egitim-cocuk-gelisimi',
  };
  const satirlar = await tekil(
    `select d.slug bolum, s.slug alan from departments d
       join department_sectors ds on ds.department_id = d.id
       join sectors s on s.id = ds.sector_id
      where d.slug = any($1)`,
    [Object.keys(beklenen)],
  );
  assert.equal(satirlar.length, 13, 'onaylanan özel eşlemelerden eksik var');
  for (const satir of satirlar) {
    assert.equal(satir.alan, beklenen[satir.bolum], `${satir.bolum} yanlış alana bağlı`);
  }
});

test('otomotiv-mobilite alanı var ama eşlemesi YOK — bilinçli boşluk', async () => {
  const alan = await tekil(`select id from sectors where slug='otomotiv-mobilite'`);
  assert.equal(alan.length, 1, 'alan silinmiş');

  const bagli = await tekil(
    `select d.slug from departments d
       join department_sectors ds on ds.department_id = d.id
      where ds.sector_id = $1`,
    [alan[0].id],
  );
  assert.deepEqual(bagli.map((r) => r.slug), []);
});

test('bir bölüm TAM OLARAK BİR alana bağlı — çoklu eşleme şemaca imkânsız', async () => {
  const pk = await tekil(
    `select a.attname from pg_index i
       join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
      where i.indrelid = 'public.department_sectors'::regclass and i.indisprimary`,
  );
  assert.deepEqual(pk.map((r) => r.attname), ['department_id']);

  const ikinci = await yazmayiDene(
    ADMIN,
    `insert into department_sectors(department_id, sector_id)
       select d.id, s.id from departments d, sectors s
        where d.slug='hukuk' and s.slug='bilisim-yazilim'`,
  );
  assert.ok(ikinci, 'aynı bölüme ikinci alan eklenebildi');
});

/* ===================================================== YETKİ SINIRLARI */

test('normal kullanıcı katalogu ve eşlemeyi OKUYOR ama YAZAMIYOR', async () => {
  const okuma = await olarak(AYSE, `select count(*)::int n from departments`);
  assert.equal(okuma[0].n, 42);

  const eslemeOkuma = await olarak(AYSE, `select count(*)::int n from department_sectors`);
  assert.equal(eslemeOkuma[0].n, 42);

  const yazma = await yazmayiDene(
    AYSE,
    `insert into departments(slug, ad, grup) values ('uydurma-bolum','Uydurma','sosyal')`,
  );
  assert.ok(yazma, 'normal kullanıcı bölüm ekleyebildi');

  /*
    UPDATE'te RLS HATA VERMEZ, SATIRI SÜZER.

    `using (is_admin())` normal kullanıcı için hiçbir satırı eşleştirmiyor;
    Postgres bunu "0 satır güncellendi" diye bitiriyor, hata olarak değil.
    Ölçülmesi gereken şey de zaten hata değil: eşleme DEĞİŞMEMİŞ olmalı.
  */
  const oncesi = await tekil(
    `select s.slug from departments d
       join department_sectors ds on ds.department_id = d.id
       join sectors s on s.id = ds.sector_id
      where d.slug = 'elektrik-elektronik-muhendisligi'`,
  );
  const etkilenen = await olarak(
    AYSE,
    `update department_sectors
        set sector_id = (select id from sectors where slug='tekstil-moda-hazir-giyim')
      returning department_id`,
  );
  assert.equal(etkilenen.length, 0, 'normal kullanıcı eşleme satırı güncelledi');

  const sonrasi = await tekil(
    `select s.slug from departments d
       join department_sectors ds on ds.department_id = d.id
       join sectors s on s.id = ds.sector_id
      where d.slug = 'elektrik-elektronik-muhendisligi'`,
  );
  assert.deepEqual(sonrasi, oncesi, 'eşleme değişmiş');
  assert.equal(sonrasi[0].slug, 'elektrik-elektronik-enerji');

  const eslemeSilme = await olarak(
    AYSE, `delete from department_sectors returning department_id`,
  );
  assert.equal(eslemeSilme.length, 0, 'normal kullanıcı eşleme sildi');
});

test('anon ne katalogu ne eşlemeyi görebiliyor', async () => {
  for (const tablo of ['departments', 'department_sectors']) {
    const yetki = await tekil(`select has_table_privilege('anon', $1, 'select') v`, [
      `public.${tablo}`,
    ]);
    assert.equal(yetki[0].v, false, `anon ${tablo} üzerinde yetkili`);
  }
});

test('kapatılan bölüm listede çıkmıyor ama satırı duruyor', async () => {
  await db.query(`update departments set aktif=false where slug='sosyoloji'`);
  const liste = await olarak(AYSE, `select slug from departments where slug='sosyoloji'`);
  assert.equal(liste.length, 0, 'kapalı bölüm kullanıcıya görünüyor');

  const satir = await tekil(`select aktif from departments where slug='sosyoloji'`);
  assert.equal(satir[0].aktif, false, 'satır silinmiş olmamalı');

  await db.query(`update departments set aktif=true where slug='sosyoloji'`);
});

/* ============================ İSTEMCİ ALANI YAZAMIYOR (kolon yetkisi) */

test('authenticated social_profiles üzerinde INSERT yetkisi TAŞIMIYOR', async () => {
  const yetki = await tekil(
    `select has_table_privilege('authenticated','public.social_profiles','insert') v`,
  );
  assert.equal(yetki[0].v, false, 'istemci doğrudan satır açabiliyor');
});

test('UPDATE yetkisi yalnız kullanıcının kendi yazabileceği kolonlarda', async () => {
  const yazilabilir = await tekil(
    `select column_name from information_schema.column_privileges
      where table_schema='public' and table_name='social_profiles'
        and grantee='authenticated' and privilege_type='UPDATE'
      order by column_name`,
  );
  assert.deepEqual(
    yazilabilir.map((r) => r.column_name),
    ['biyografi', 'bolum_etiketi', 'gorunen_ad', 'sehir', 'sinif_etiketi', 'yayinda_mi'],
    'yazılabilir kolon kümesi beklenenden farklı',
  );
});

test('sector_id, department_id ve username istemciden YAZILAMIYOR', async () => {
  for (const kolon of ['sector_id', 'department_id', 'username']) {
    const yetki = await tekil(
      `select has_column_privilege('authenticated','public.social_profiles',$1,'update') v`,
      [kolon],
    );
    assert.equal(yetki[0].v, false, `${kolon} istemciden güncellenebiliyor`);
  }
});

/* ==================================================== KURULUM RPC-Sİ */

const kur = (kimlik, ad, bolum, yayimla = false) =>
  olarak(kimlik, `select * from sosyal_profil_kur($1,$2,$3)`, [ad, bolum, yayimla]);

test('kurulum alanı EŞLEMEDEN türetiyor, istemciden almıyor', async () => {
  const satir = await kur(AYSE, 'ayse.elektrik', 'elektrik-elektronik-muhendisligi');
  assert.equal(satir.length, 1);

  const alan = await tekil(
    `select s.slug from social_profiles sp join sectors s on s.id = sp.sector_id
      where sp.profile_id = $1`,
    [AYSE],
  );
  assert.equal(alan[0].slug, 'elektrik-elektronik-enerji');

  const bolum = await tekil(
    `select d.slug from social_profiles sp join departments d on d.id = sp.department_id
      where sp.profile_id = $1`,
    [AYSE],
  );
  assert.equal(bolum[0].slug, 'elektrik-elektronik-muhendisligi');
});

test('RPC imzasında alan parametresi YOK — gönderilecek yer bile yok', async () => {
  const parametreler = await tekil(
    `select unnest(p.proargnames) ad from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname='public' and p.proname='sosyal_profil_kur'`,
  );
  const adlar = parametreler.map((r) => r.ad);
  assert.ok(!adlar.some((a) => /sector|alan/i.test(a)), `alan parametresi var: ${adlar}`);
  assert.ok(adlar.includes('p_bolum_slug'), 'bölüm parametresi yok');
});

test('varsayılan topluluğa katılmamış: yayinda_mi false', async () => {
  const satir = await tekil(`select yayinda_mi from social_profiles where profile_id=$1`, [AYSE]);
  assert.equal(satir[0].yayinda_mi, false);
});

test('katalogda olmayan bölüm: satır AÇILMIYOR', async () => {
  const hata = await yazmayiDene(
    BURAK, `select sosyal_profil_kur($1,$2,$3)`, ['burak.test', 'olmayan-bolum', false],
  );
  assert.match(String(hata), /bolum-bulunamadi/);

  const satir = await tekil(`select 1 from social_profiles where profile_id=$1`, [BURAK]);
  assert.equal(satir.length, 0, 'hatalı çağrı yarım satır bıraktı');
});

test('eşlemesi olmayan bölüm: satır AÇILMIYOR, ayrı hata kodu', async () => {
  await db.query(`delete from department_sectors where department_id =
                    (select id from departments where slug='sosyoloji')`);

  const hata = await yazmayiDene(
    BURAK, `select sosyal_profil_kur($1,$2,$3)`, ['burak.test', 'sosyoloji', false],
  );
  assert.match(String(hata), /bolum-alani-tanimsiz/);

  const satir = await tekil(`select 1 from social_profiles where profile_id=$1`, [BURAK]);
  assert.equal(satir.length, 0, 'eşlemesiz bölümle satır açıldı');

  /* Eşlemeyi geri koy: sonraki testler 42/42 bekliyor. */
  await db.query(
    `insert into department_sectors(department_id, sector_id)
       select d.id, s.id from departments d, sectors s
        where d.slug='sosyoloji' and s.slug='psikoloji-sosyal-bilimler'`,
  );
});

test('kullanıcı adı kuralı SUNUCUDA da uygulanıyor', async () => {
  const hata = await yazmayiDene(
    BURAK, `select sosyal_profil_kur($1,$2,$3)`, ['AB', 'hukuk', false],
  );
  assert.match(String(hata), /gecersiz-kullanici-adi/);
});

test('oturumsuz çağrı reddediliyor', async () => {
  let hata = null;
  try {
    await db.exec('set role authenticated');
    await db.query(`select sosyal_profil_kur('bir.ad','hukuk',false)`);
  } catch (e) {
    hata = String(e.message || e);
  } finally {
    await db.exec('reset role');
  }
  assert.ok(hata, 'oturumsuz kurulum geçti');
});

test('İKİNCİ ÇAĞRI bölümü ve alanı DEĞİŞTİREMİYOR', async () => {
  await kur(AYSE, 'baska.ad', 'giyim-uretim-teknolojisi', true);

  const satir = await tekil(
    `select d.slug bolum, s.slug alan, sp.username
       from social_profiles sp
       join departments d on d.id = sp.department_id
       join sectors s on s.id = sp.sector_id
      where sp.profile_id = $1`,
    [AYSE],
  );
  assert.equal(satir[0].bolum, 'elektrik-elektronik-muhendisligi', 'bölüm değişti');
  assert.equal(satir[0].alan, 'elektrik-elektronik-enerji', 'ALAN DEĞİŞTİ — temel kural kırıldı');
  assert.equal(satir[0].username, 'ayse.elektrik', 'kullanıcı adı değişti');
});

test('silip yeniden kurma yolu da kapalı', async () => {
  /*
    Silme yetki katmanında duruyor (20260922010000 `revoke delete`), yani
    RLS'e bile gelmiyor: hata "permission denied", "0 satır" değil.
  */
  const silme = await yazmayiDene(
    AYSE, `delete from social_profiles where profile_id=$1`, [AYSE],
  );
  assert.match(String(silme), /permission denied/i, 'kendi satırını silebildi');

  const satir = await tekil(
    `select s.slug from social_profiles sp join sectors s on s.id=sp.sector_id
      where sp.profile_id=$1`, [AYSE],
  );
  assert.equal(satir[0].slug, 'elektrik-elektronik-enerji');
});

test('tetikleyici ikinci kapı: bölüm ve alan bir kez yazılır', async () => {
  const tetik = await tekil(
    `select tgname from pg_trigger where tgrelid='public.social_profiles'::regclass
       and not tgisinternal`,
  );
  assert.ok(
    tetik.some((t) => /kimlik_kilidi/.test(t.tgname)),
    `kimlik kilidi tetikleyicisi yok: ${tetik.map((t) => t.tgname)}`,
  );

  /* service_role/bakım yolu (RLS ve kolon yetkisi atlanır) yine de kilitli. */
  let hata = null;
  try {
    await db.exec(`set request.jwt.claim.sub='${AYSE}'`);
    await db.query(
      `update social_profiles set sector_id=(select id from sectors where slug='tekstil-moda-hazir-giyim')
        where profile_id=$1`, [AYSE],
    );
  } catch (e) {
    hata = String(e.message || e);
  } finally {
    await db.exec(`reset request.jwt.claim.sub`);
  }
  assert.ok(hata, 'tetikleyici alan değişimine izin verdi');
});

test('yayımlanmış profilde bölüm de şart', async () => {
  const kisit = await tekil(
    `select pg_get_constraintdef(oid) def from pg_constraint
      where conname='yayin_icin_kimlik_sart'`,
  );
  assert.match(kisit[0].def, /department_id IS NOT NULL/i);
});
