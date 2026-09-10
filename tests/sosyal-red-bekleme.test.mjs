import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  RED BEKLEME SÜRESİ VE SEKTÖR TALEBİ

  Reddetmek ile engellemek ayrı davranışlar. Red "şimdi değil" demek:
  30 gün sonra aynı istek yeniden gönderilebiliyor. Engel ise kalıcı
  sınır olmaya devam ediyor.

  Süre VERİTABANI saatiyle ölçülüyor. Test bunu deterministik yapmak
  için `responded_at` alanını doğrudan `now() - interval ...` ile
  kuruyor: sabit bir tarih yazmak testi takvime bağımlı yapardı.
*/

const DOSYALAR = [
  '../supabase/migrations/20260921010000_sosyal_katman_semasi.sql',
  '../supabase/migrations/20260921020000_sosyal_katman_rls.sql',
  '../supabase/migrations/20260921030000_sosyal_gecis_kurallari.sql',
  '../supabase/migrations/20260921040000_red_bekleme_ve_sektor_talebi.sql',
  '../supabase/migrations/20260922010000_sosyal_guvenlik_duzeltmeleri.sql',
  '../supabase/migrations/20260923010000_bolum_katalogu.sql',
  '../supabase/migrations/20260923020000_bolum_alan_eslemesi.sql',
  '../supabase/migrations/20260923025000_bolum_alan_seed.sql',
  '../supabase/migrations/20260923030000_sosyal_kurulum_rpc.sql',
  '../supabase/migrations/20260923040000_yonetici_duzeltme_denetim.sql',
].map((yol) => new URL(yol, import.meta.url));

const AYSE = '11111111-1111-4111-8111-111111111111';   // isteği gönderen
const BURAK = '22222222-2222-4222-8222-222222222222';  // reddeden
const CEM = '33333333-3333-4333-8333-333333333333';    // farklı sektör
const DENIZ = '44444444-4444-4444-8444-444444444444';  // aynı sektör, üçüncü kişi
const ADMIN = '99999999-9999-4999-8999-999999999999';

let db;
let tekstil;
let makine;

async function olarak(kimlik, sql, params = []) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${kimlik}'`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec('reset role; reset request.jwt.claim.sub');
  }
}

async function yazmayiDene(kimlik, sql, params = []) {
  try {
    await olarak(kimlik, sql, params);
    return null;
  } catch (e) {
    return String(e.message || e);
  }
}

async function temizle() {
  await db.exec('delete from connections; delete from blocks; delete from sector_requests;');
}

/** Ayşe → Burak isteği açar, Burak reddeder. */
async function reddedilmisIstek() {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(BURAK, `update connections set durum='red' where addressee_id=$1`, [BURAK]);
}

/** Yanıt zamanını geriye alır; süre sınırını deterministik test etmek için. */
async function yanitZamaniniGeriAl(ifade) {
  await db.query(`update connections set responded_at = now() - ${ifade}`);
}

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
    create policy "kendi profilini okur" on public.profiles
      for select to authenticated using (id = auth.uid());
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
    insert into auth.users values ('${AYSE}'),('${BURAK}'),('${CEM}'),('${DENIZ}'),('${ADMIN}');
    insert into public.profiles(id) values ('${AYSE}'),('${BURAK}'),('${CEM}'),('${DENIZ}');
    insert into public.profiles(id, role) values ('${ADMIN}','admin');
  `);

  tekstil = (await db.query(`select id from sectors where slug='tekstil-moda-hazir-giyim'`)).rows[0].id;
  makine = (await db.query(`select id from sectors where slug='makine-imalat'`)).rows[0].id;

  await db.query(
    /* Yayımlanmış profilde bölüm de şart; bkz. yayin_icin_kimlik_sart. */
    `insert into social_profiles(profile_id, username, sector_id, department_id, yayinda_mi) values
      ($1,'ayse',$5,(select ds.department_id from department_sectors ds where ds.sector_id=$5 order by ds.department_id limit 1),true),
      ($2,'burak',$5,(select ds.department_id from department_sectors ds where ds.sector_id=$5 order by ds.department_id limit 1),true),
      ($3,'cem',$6,(select ds.department_id from department_sectors ds where ds.sector_id=$6 order by ds.department_id limit 1),true),
      ($4,'deniz',$5,(select ds.department_id from department_sectors ds where ds.sector_id=$5 order by ds.department_id limit 1),true)`,
    [AYSE, BURAK, CEM, DENIZ, tekstil, makine]
  );
});

after(async () => {
  await db?.close();
});

/* ================================================ 30 GÜNLÜK BEKLEME */

test('REDDEDİLEN İSTEK SÜRE DOLMADAN YENİDEN GÖNDERİLEMİYOR', async () => {
  await reddedilmisIstek();

  const hemen = await yazmayiDene(
    AYSE,
    `update connections set durum='bekliyor' where requester_id=$1`,
    [AYSE]
  );
  assert.match(String(hemen), /bekleme süresi dolmadı/i, 'red hemen yeniden gönderilebildi');

  await yanitZamaniniGeriAl(`interval '29 days'`);
  const yirmiDokuz = await yazmayiDene(
    AYSE,
    `update connections set durum='bekliyor' where requester_id=$1`,
    [AYSE]
  );
  assert.match(String(yirmiDokuz), /bekleme süresi dolmadı/i, '29. günde geçti');
});

test('TAM 30 GÜN SINIRI: bir saniye eksik kapalı, tam 30 gün açık', async () => {
  /*
    Sınır deterministik ölçülüyor: `responded_at` veritabanı saatine göre
    kuruluyor, istemci saati hiç girmiyor.
  */
  await reddedilmisIstek();

  await yanitZamaniniGeriAl(`(interval '30 days' - interval '1 second')`);
  const birSaniyeEksik = await yazmayiDene(
    AYSE,
    `update connections set durum='bekliyor' where requester_id=$1`,
    [AYSE]
  );
  assert.match(String(birSaniyeEksik), /bekleme süresi dolmadı/i, 'sınırın bir saniye altı geçti');

  await yanitZamaniniGeriAl(`interval '30 days'`);
  await olarak(AYSE, `update connections set durum='bekliyor' where requester_id=$1`, [AYSE]);

  const satir = await olarak(AYSE, `select durum, responded_at from connections`);
  assert.equal(satir[0].durum, 'bekliyor', 'tam 30 günde yeniden gönderilemedi');
  assert.equal(satir[0].responded_at, null, 'yeniden denemede yanıt zamanı sıfırlanmalı');
});

test('SÜRE DOLSA BİLE YALNIZ GÖNDEREN YENİDEN BAŞLATABİLİR', async () => {
  await reddedilmisIstek();
  await yanitZamaniniGeriAl(`interval '40 days'`);

  /* Reddeden taraf kendi reddini "bekliyor"a çeviremiyor. */
  const reddeden = await yazmayiDene(
    BURAK,
    `update connections set durum='bekliyor' where addressee_id=$1`,
    [BURAK]
  );
  assert.match(String(reddeden), /yalnız gönderen/i, 'reddeden kendi reddini dirilltti');

  /* Üçüncü kişi satırı zaten göremiyor: hata yok ama sonuç da yok. */
  await olarak(DENIZ, `update connections set durum='bekliyor' where requester_id=$1`, [AYSE]);
  assert.equal((await db.query(`select durum from connections`)).rows[0].durum, 'red');

  /* Gönderen yapabiliyor. */
  await olarak(AYSE, `update connections set durum='bekliyor' where requester_id=$1`, [AYSE]);
  assert.equal((await db.query(`select durum from connections`)).rows[0].durum, 'bekliyor');
});

test('YENİ SATIR VE TERS YÖN DENEMELERİ SÜREYİ AŞAMIYOR', async () => {
  await reddedilmisIstek();

  /* Aynı yönde ikinci satır. */
  const ayniYon = await yazmayiDene(
    AYSE,
    `insert into connections(requester_id, addressee_id) values ($1,$2)`,
    [AYSE, BURAK]
  );
  assert.match(String(ayniYon), /duplicate key|unique/i, 'aynı yönde ikinci satır açıldı');

  /* Ters yönde yeni satır. */
  const tersYon = await yazmayiDene(
    BURAK,
    `insert into connections(requester_id, addressee_id) values ($1,$2)`,
    [BURAK, AYSE]
  );
  assert.match(String(tersYon), /duplicate key|unique/i, 'ters yönde satır açılarak süre aşıldı');

  /* Eski satırı silip yeniden açmak da yok: silme yetkisi tarafta ama
     sildiğinde red kaydı da gitmiş oluyor — bu kasıtlı bir kaçış değil,
     kullanıcının kendi isteğini geri çekmesiyle aynı işlem. Kaçış
     sayılmaması için yeniden açılan istek yeni bir istektir ve karşı
     taraf yine reddedebilir. Burada kanıtlanan şey: SİLMEDEN süre
     aşılamıyor. */
  const durum = await db.query(`select durum, responded_at is not null as yanitli from connections`);
  assert.equal(durum.rows[0].durum, 'red');
  assert.equal(durum.rows[0].yanitli, true);
});

test('İSTEMCİ responded_at YAZARAK SÜREYİ ATLAYAMIYOR', async () => {
  await reddedilmisIstek();

  /*
    Kural ESKİ satırın `responded_at` değerine bakıyor; istemcinin aynı
    UPDATE içinde gönderdiği yeni değer hesaba girmiyor.
  */
  const hata = await yazmayiDene(
    AYSE,
    `update connections set durum='bekliyor', responded_at = now() - interval '99 days' where requester_id=$1`,
    [AYSE]
  );
  assert.match(String(hata), /bekleme süresi dolmadı/i, 'istemci yazdığı tarihle süreyi atladı');
});

test('ENGEL VARSA SÜRE DOLSA BİLE YENİDEN GÖNDERİLEMİYOR', async () => {
  await reddedilmisIstek();
  await yanitZamaniniGeriAl(`interval '60 days'`);

  /* Engeli tetikleyici silmesin diye doğrudan yazıyoruz: kural silmeye bağlı olmamalı. */
  await db.exec('alter table blocks disable trigger blocks_baglantiyi_kaldir');
  await olarak(BURAK, `insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [BURAK, AYSE]);
  await db.exec('alter table blocks enable trigger blocks_baglantiyi_kaldir');

  const hata = await yazmayiDene(
    AYSE,
    `update connections set durum='bekliyor' where requester_id=$1`,
    [AYSE]
  );
  assert.match(String(hata), /farklı sektör ya da engel/i, 'engelliyken yeniden gönderildi');
  await temizle();
});

test('SEKTÖR AYRIŞMIŞSA SÜRE DOLSA BİLE YENİDEN GÖNDERİLEMİYOR', async () => {
  await reddedilmisIstek();
  await yanitZamaniniGeriAl(`interval '60 days'`);
  /* Yönetici düzeltmesi artık yalnız RPC ile; doğrudan yazma kapalı. */
  await olarak(ADMIN, `select sosyal_bolum_duzelt($1,$2,$3)`,
    [BURAK, 'makine-muhendisligi', 'Test kurgusu: alan ayrışması.']);

  const hata = await yazmayiDene(
    AYSE,
    `update connections set durum='bekliyor' where requester_id=$1`,
    [AYSE]
  );
  assert.match(String(hata), /farklı sektör ya da engel/i, 'sektör ayrıkken yeniden gönderildi');

  await olarak(ADMIN, `select sosyal_bolum_duzelt($1,$2,$3)`,
    [BURAK, 'giyim-uretim-teknolojisi', 'Test kurgusu geri alınıyor.']);
});

/* ====================================== REDDEDENİN KENDİ BAŞLATMASI */

test('REDDEDEN TARAF SONRADAN KENDİ İSTEĞİNİ BAŞLATABİLİYOR', async () => {
  await reddedilmisIstek();

  await olarak(BURAK, `select baglanti_yeniden_baslat($1)`, [AYSE]);

  const satirlar = await db.query(`select requester_id, addressee_id, durum from connections`);
  assert.equal(satirlar.rows.length, 1, 'tek satırlı ilişki kuralı bozuldu');
  assert.equal(satirlar.rows[0].requester_id, BURAK, 'yön ters çevrilmedi');
  assert.equal(satirlar.rows[0].addressee_id, AYSE);
  assert.equal(satirlar.rows[0].durum, 'bekliyor');

  /* Ve artık Ayşe kabul edebiliyor: rol değişti. */
  await olarak(AYSE, `update connections set durum='kabul' where addressee_id=$1`, [AYSE]);
  assert.equal((await db.query(`select durum from connections`)).rows[0].durum, 'kabul');
});

test('RED KAYDINI KABULE ÇEVİRMEK HÂLÂ YASAK', async () => {
  await reddedilmisIstek();
  const hata = await yazmayiDene(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);
  assert.match(String(hata), /yalnız bekleyen/i, 'red doğrudan kabule çevrildi');
});

test('BAŞKASININ REDDİ YENİDEN BAŞLATILAMIYOR', async () => {
  await reddedilmisIstek();

  /* Gönderen kendi isteğini bu RPC ile "yeniden başlatamıyor": onun yolu
     30 günlük bekleme. Aksi hâlde RPC süreyi atlatan bir kapı olurdu. */
  const gonderen = await yazmayiDene(AYSE, `select baglanti_yeniden_baslat($1)`, [BURAK]);
  assert.match(String(gonderen), /kendi reddettiğin/i, 'gönderen RPC ile süreyi atladı');

  /* Üçüncü kişi de kullanamıyor. */
  const ucuncu = await yazmayiDene(DENIZ, `select baglanti_yeniden_baslat($1)`, [AYSE]);
  assert.ok(ucuncu === null || /kendi reddettiğin/i.test(String(ucuncu)));
});

test('RPC BEKLEYEN VEYA KABUL EDİLMİŞ İLİŞKİYİ BOZAMIYOR', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);

  const bekleyen = await yazmayiDene(BURAK, `select baglanti_yeniden_baslat($1)`, [AYSE]);
  assert.match(String(bekleyen), /kendi reddettiğin/i, 'bekleyen istek RPC ile ezildi');

  await olarak(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);
  const kabul = await yazmayiDene(BURAK, `select baglanti_yeniden_baslat($1)`, [AYSE]);
  assert.match(String(kabul), /kendi reddettiğin/i, 'kabul edilmiş bağlantı RPC ile ezildi');
});

test('RPC FARKLI SEKTÖR VE ENGELDE ÇALIŞMIYOR', async () => {
  await temizle();
  const farkliSektor = await yazmayiDene(AYSE, `select baglanti_yeniden_baslat($1)`, [CEM]);
  assert.match(String(farkliSektor), /istek gönderilemez/i);

  await olarak(BURAK, `insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [BURAK, AYSE]);
  const engelli = await yazmayiDene(BURAK, `select baglanti_yeniden_baslat($1)`, [AYSE]);
  assert.match(String(engelli), /istek gönderilemez/i);
  await temizle();
});

/* ================================================= SAYAÇ DAVRANIŞI */

test('REDDETME BAĞLANTI SAYACINI ARTIRMIYOR', async () => {
  await reddedilmisIstek();
  const a = await olarak(AYSE, `select baglanti from sosyal_sayaclar($1)`, [AYSE]);
  const b = await olarak(BURAK, `select baglanti from sosyal_sayaclar($1)`, [BURAK]);
  assert.equal(a[0].baglanti, 0, 'red sayaca girdi');
  assert.equal(b[0].baglanti, 0, 'red sayaca girdi');
});

test('YENİDEN GÖNDERİLİP KABUL EDİLEN İLİŞKİ İKİ TARAFTA DA BİR SAYILIYOR', async () => {
  await reddedilmisIstek();
  await yanitZamaniniGeriAl(`interval '30 days'`);
  await olarak(AYSE, `update connections set durum='bekliyor' where requester_id=$1`, [AYSE]);
  await olarak(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);

  const a = await olarak(AYSE, `select baglanti from sosyal_sayaclar($1)`, [AYSE]);
  const b = await olarak(BURAK, `select baglanti from sosyal_sayaclar($1)`, [BURAK]);
  assert.equal(a[0].baglanti, 1);
  assert.equal(b[0].baglanti, 1);
  assert.equal((await db.query(`select count(*)::int n from connections`)).rows[0].n, 1, 'tek satır kalmalı');
});

test('ENGEL KALDIRILINCA ESKİ BAĞLANTI GERİ GELMİYOR, YENİ KURALLAR İŞLİYOR', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);

  await olarak(AYSE, `insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(AYSE, `delete from blocks where blocker_id=$1 and blocked_id=$2`, [AYSE, BURAK]);

  assert.equal((await db.query(`select count(*)::int n from connections`)).rows[0].n, 0, 'engel kalkınca geri geldi');

  /* Yeni istek gönderilebiliyor: engel kalıcı sınır ama kalkınca sıfırdan başlanıyor. */
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  assert.equal((await olarak(BURAK, `select durum from connections`))[0].durum, 'bekliyor');
  await temizle();
});

/* ==================================================== SEKTÖR TALEBİ */

test('KULLANICI KENDİ SEKTÖR TALEBİNİ AÇIP OKUYABİLİYOR', async () => {
  await olarak(
    DENIZ,
    `insert into sector_requests(user_id, requested_sector, aciklama) values ($1,$2,$3)`,
    [DENIZ, 'Denizcilik Elektroniği', 'Bölümüm listede yok.']
  );
  const kendi = await olarak(DENIZ, `select requested_sector, status from sector_requests`);
  assert.equal(kendi.length, 1);
  assert.equal(kendi[0].status, 'bekliyor');
});

test('BAŞKASININ TALEBİ GÖRÜNMÜYOR', async () => {
  const baskasi = await olarak(AYSE, `select count(*)::int n from sector_requests`);
  assert.equal(baskasi[0].n, 0, 'başkasının sektör talebi sızdı');
});

test('BAŞKASI ADINA TALEP AÇILAMIYOR', async () => {
  const hata = await yazmayiDene(
    AYSE,
    `insert into sector_requests(user_id, requested_sector) values ($1,$2)`,
    [DENIZ, 'Uydurma']
  );
  assert.ok(hata, 'başkası adına talep açıldı');
});

test('AYNI ANDA TEK AÇIK TALEP', async () => {
  const hata = await yazmayiDene(
    DENIZ,
    `insert into sector_requests(user_id, requested_sector) values ($1,$2)`,
    [DENIZ, 'İkinci talep']
  );
  assert.match(String(hata), /duplicate key|unique/i, 'ikinci açık talep açıldı');
});

test('DURUMU YALNIZ YÖNETİCİ DEĞİŞTİREBİLİYOR', async () => {
  /* Kullanıcının UPDATE politikası yok: hata almıyor ama satır da değişmiyor. */
  await olarak(DENIZ, `update sector_requests set status='eklendi' where user_id=$1`, [DENIZ]);
  assert.equal(
    (await db.query(`select status from sector_requests where user_id=$1`, [DENIZ])).rows[0].status,
    'bekliyor',
    'kullanıcı kendi talebini onayladı'
  );

  await olarak(ADMIN, `update sector_requests set status='incelendi' where user_id=$1`, [DENIZ]);
  assert.equal(
    (await db.query(`select status from sector_requests where user_id=$1`, [DENIZ])).rows[0].status,
    'incelendi'
  );
});

test('TALEP KAPANINCA YENİ TALEP AÇILABİLİYOR', async () => {
  /* Kısmi indeks yalnız açık talebi kilitliyor; kapanmışlar birikebiliyor. */
  await olarak(DENIZ, `insert into sector_requests(user_id, requested_sector) values ($1,$2)`, [DENIZ, 'Yeni deneme']);
  assert.equal((await db.query(`select count(*)::int n from sector_requests`)).rows[0].n, 2);
});

test('TALEP AÇMAK SOSYAL ALANA ERİŞİM VERMİYOR', async () => {
  /*
    Talep `social_profiles.sector_id` alanına dokunmuyor. Sektörsüz bir
    kullanıcı talep açsa bile sosyal katmandan kendi satırı dışında bir
    şey göremiyor.
  */
  const SEKTORSUZ = '77777777-7777-4777-8777-777777777777';
  await db.exec(`insert into auth.users values ('${SEKTORSUZ}');
                 insert into public.profiles(id) values ('${SEKTORSUZ}');
                 insert into social_profiles(profile_id) values ('${SEKTORSUZ}')`);

  await olarak(SEKTORSUZ, `insert into sector_requests(user_id, requested_sector) values ($1,$2)`,
    [SEKTORSUZ, 'Gemi İnşa']);

  const profiller = await olarak(SEKTORSUZ, `select profile_id from social_profiles`);
  assert.equal(profiller.length, 1, 'talep açmak topluluğu açtı');
  assert.equal(profiller[0].profile_id, SEKTORSUZ);

  const sektor = await olarak(SEKTORSUZ, `select sector_id from social_profiles where profile_id=$1`, [SEKTORSUZ]);
  assert.equal(sektor[0].sector_id, null, 'talep sektör atadı');
});

test('METİN SINIRLARI UYGULANIYOR', async () => {
  const kisa = await yazmayiDene(
    AYSE,
    `insert into sector_requests(user_id, requested_sector) values ($1,'a')`,
    [AYSE]
  );
  assert.match(String(kisa), /check/i, 'tek harflik alan adı kabul edildi');

  const uzun = await yazmayiDene(
    AYSE,
    `insert into sector_requests(user_id, requested_sector, aciklama) values ($1,$2,$3)`,
    [AYSE, 'Geçerli alan', 'x'.repeat(501)]
  );
  assert.match(String(uzun), /check/i, '500 karakterden uzun açıklama kabul edildi');
});
