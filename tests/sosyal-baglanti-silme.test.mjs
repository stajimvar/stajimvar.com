import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  BAĞLANTI SİLME YETKİSİ

  30 günlük bekleme süresi ancak red kaydı YERİNDE kaldığı sürece bir
  sınır. Önceki DELETE politikası "taraf olmak yeterli" dediği için
  reddedilen kullanıcı kendi red satırını silip hemen yeni istek
  açabiliyordu — süre gerçekte hiç çalışmıyordu.

  Bu dosya silme yetkisinin duruma göre daraltıldığını ve süreyi aşan
  hiçbir yol kalmadığını kanıtlıyor. Testler gerçek `authenticated` ve
  `anon` rolleri altında, göç dosyalarının kendisi çalıştırılarak.
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

const AYSE = '11111111-1111-4111-8111-111111111111';   // gönderen
const BURAK = '22222222-2222-4222-8222-222222222222';  // alan
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

/** Oturumsuz anon rolü. */
async function anonOlarak(sql, params = []) {
  await db.exec('set role anon');
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

async function yazmayiDene(fn) {
  try {
    await fn();
    return null;
  } catch (e) {
    return String(e.message || e);
  }
}

async function temizle() {
  await db.exec('delete from connections; delete from blocks;');
}

const satirSayisi = async () =>
  (await db.query('select count(*)::int n from connections')).rows[0].n;

async function bekleyenIstek() {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
}

async function kabulEdilmisBaglanti() {
  await bekleyenIstek();
  await olarak(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);
}

async function reddedilmisIstek() {
  await bekleyenIstek();
  await olarak(BURAK, `update connections set durum='red' where addressee_id=$1`, [BURAK]);
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

/* ============================================== bekleyen istek: silme */

test('1 · BEKLEYEN İSTEĞİ GÖNDEREN GERİ ÇEKEBİLİYOR', async () => {
  await bekleyenIstek();
  await olarak(AYSE, `delete from connections where requester_id=$1`, [AYSE]);
  assert.equal(await satirSayisi(), 0, 'gönderen kendi isteğini geri çekemedi');
});

test('2 · BEKLEYEN İSTEĞİ ALAN SİLEMİYOR', async () => {
  /*
    Alanın yanıtı `red` (ya da `kabul`), silme değil. Silebilseydi red
    kaydı hiç oluşmaz ve 30 günlük bekleme süresi boşa çıkardı.
  */
  await bekleyenIstek();
  await olarak(BURAK, `delete from connections where addressee_id=$1`, [BURAK]);
  assert.equal(await satirSayisi(), 1, 'alan bekleyen isteği sildi');
});

test('3 · ÜÇÜNCÜ KİŞİ BEKLEYEN İSTEĞİ SİLEMİYOR', async () => {
  await bekleyenIstek();
  await olarak(DENIZ, `delete from connections`);
  await olarak(CEM, `delete from connections`);
  assert.equal(await satirSayisi(), 1, 'üçüncü kişi sildi');
});

/* ============================================ kabul edilmiş: silme */

test('4 · KABUL EDİLMİŞ BAĞLANTIYI GÖNDEREN KALDIRABİLİYOR', async () => {
  await kabulEdilmisBaglanti();
  await olarak(AYSE, `delete from connections where requester_id=$1`, [AYSE]);
  assert.equal(await satirSayisi(), 0);
});

test('5 · KABUL EDİLMİŞ BAĞLANTIYI ALAN KALDIRABİLİYOR', async () => {
  await kabulEdilmisBaglanti();
  await olarak(BURAK, `delete from connections where addressee_id=$1`, [BURAK]);
  assert.equal(await satirSayisi(), 0);
});

test('6 · ÜÇÜNCÜ KİŞİ KABUL EDİLMİŞ BAĞLANTIYI SİLEMİYOR', async () => {
  await kabulEdilmisBaglanti();
  await olarak(DENIZ, `delete from connections`);
  assert.equal(await satirSayisi(), 1, 'üçüncü kişi kabul edilmiş bağlantıyı sildi');
});

/* ==================================================== red: silinemez */

test('7 · İLK GÖNDEREN REDDEDİLMİŞ SATIRI SİLEMİYOR', async () => {
  await reddedilmisIstek();
  await olarak(AYSE, `delete from connections where requester_id=$1`, [AYSE]);
  assert.equal(await satirSayisi(), 1, 'gönderen red kaydını sildi — süre sıfırlanabilir');
});

test('8 · REDDEDEN TARAF REDDEDİLMİŞ SATIRI SİLEMİYOR', async () => {
  await reddedilmisIstek();
  await olarak(BURAK, `delete from connections where addressee_id=$1`, [BURAK]);
  assert.equal(await satirSayisi(), 1, 'reddeden red kaydını sildi');
});

test('9 · RED SATIRINI SİLİP YENİ KAYIT AÇARAK SÜRE AŞILAMIYOR', async () => {
  /*
    Açığın tam kendisi: sil → yeniden aç → süre sıfırlanır. İki adım da
    kapalı olmalı, yalnız biri değil.
  */
  await reddedilmisIstek();

  await olarak(AYSE, `delete from connections`);
  assert.equal(await satirSayisi(), 1, 'red satırı silinebildi');

  const yeni = await yazmayiDene(() =>
    olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK])
  );
  assert.match(String(yeni), /duplicate key|unique/i, 'yeni satır açılarak süre aşıldı');

  const ters = await yazmayiDene(() =>
    olarak(BURAK, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [BURAK, AYSE])
  );
  assert.match(String(ters), /duplicate key|unique/i, 'ters yönde satır açılarak süre aşıldı');

  const hemen = await yazmayiDene(() =>
    olarak(AYSE, `update connections set durum='bekliyor' where requester_id=$1`, [AYSE])
  );
  assert.match(String(hemen), /bekleme süresi dolmadı/i);
});

test('10 · TAM 30 GÜN DOLUNCA KONTROLLÜ GEÇİŞ ÇALIŞIYOR', async () => {
  await reddedilmisIstek();

  await db.query(`update connections set responded_at = now() - (interval '30 days' - interval '1 second')`);
  const eksik = await yazmayiDene(() =>
    olarak(AYSE, `update connections set durum='bekliyor' where requester_id=$1`, [AYSE])
  );
  assert.match(String(eksik), /bekleme süresi dolmadı/i, 'sınırın bir saniye altı geçti');

  await db.query(`update connections set responded_at = now() - interval '30 days'`);
  await olarak(AYSE, `update connections set durum='bekliyor' where requester_id=$1`, [AYSE]);

  const satir = await olarak(AYSE, `select durum, responded_at from connections`);
  assert.equal(satir[0].durum, 'bekliyor');
  assert.equal(satir[0].responded_at, null, 'yanıt zamanı sıfırlanmadı');
  assert.equal(await satirSayisi(), 1, 'tek satır kuralı bozuldu');
});

/* ================================ reddedenin kendi isteğini başlatması */

test('11 · RPC TEK SATIRLI SİMETRİK İLİŞKİYİ BOZMUYOR', async () => {
  await reddedilmisIstek();

  await olarak(BURAK, `select baglanti_yeniden_baslat($1)`, [AYSE]);

  const satirlar = await db.query(`select requester_id, addressee_id, durum, responded_at from connections`);
  assert.equal(satirlar.rows.length, 1, 'iki satır oluştu');
  assert.equal(satirlar.rows[0].requester_id, BURAK, 'yön ters çevrilmedi');
  assert.equal(satirlar.rows[0].addressee_id, AYSE);
  assert.equal(satirlar.rows[0].durum, 'bekliyor');
  assert.equal(satirlar.rows[0].responded_at, null);

  /* Roller değişti: artık Ayşe kabul ediyor. */
  await olarak(AYSE, `update connections set durum='kabul' where addressee_id=$1`, [AYSE]);
  assert.equal((await db.query(`select durum from connections`)).rows[0].durum, 'kabul');
  assert.equal(await satirSayisi(), 1);
});

test('12 · ENGEL VE SEKTÖR FARKI HER İKİ YOLU DA KAPATIYOR', async () => {
  /* --- yol 1: gönderenin 30 gün sonra red → bekliyor geçişi --- */
  await reddedilmisIstek();
  await db.query(`update connections set responded_at = now() - interval '60 days'`);

  await db.exec('alter table blocks disable trigger blocks_baglantiyi_kaldir');
  await olarak(BURAK, `insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [BURAK, AYSE]);
  await db.exec('alter table blocks enable trigger blocks_baglantiyi_kaldir');

  const engelliGecis = await yazmayiDene(() =>
    olarak(AYSE, `update connections set durum='bekliyor' where requester_id=$1`, [AYSE])
  );
  assert.match(String(engelliGecis), /farklı sektör ya da engel/i, 'engelliyken geçiş oldu');

  /* --- yol 2: reddedenin RPC ile yeniden başlatması --- */
  const engelliRpc = await yazmayiDene(() => olarak(BURAK, `select baglanti_yeniden_baslat($1)`, [AYSE]));
  assert.match(String(engelliRpc), /istek gönderilemez/i, 'engelliyken RPC çalıştı');

  await db.exec('delete from blocks');

  /* Sektör ayrışması: iki yol da kapalı. */
  /* Yönetici düzeltmesi artık yalnız RPC ile; doğrudan yazma kapalı. */
  await olarak(ADMIN, `select sosyal_bolum_duzelt($1,$2,$3)`,
    [BURAK, 'makine-muhendisligi', 'Test kurgusu: alan ayrışması.']);

  const sektorGecis = await yazmayiDene(() =>
    olarak(AYSE, `update connections set durum='bekliyor' where requester_id=$1`, [AYSE])
  );
  assert.match(String(sektorGecis), /farklı sektör ya da engel/i, 'sektör ayrıkken geçiş oldu');

  const sektorRpc = await yazmayiDene(() => olarak(BURAK, `select baglanti_yeniden_baslat($1)`, [AYSE]));
  assert.match(String(sektorRpc), /istek gönderilemez/i, 'sektör ayrıkken RPC çalıştı');

  await olarak(ADMIN, `select sosyal_bolum_duzelt($1,$2,$3)`,
    [BURAK, 'giyim-uretim-teknolojisi', 'Test kurgusu geri alınıyor.']);
  await temizle();
});

/* ===================================================== anon ve cascade */

test('13 · ANON HİÇBİR ŞEY YAPAMIYOR', async () => {
  await kabulEdilmisBaglanti();

  const okuma = await yazmayiDene(() => anonOlarak(`select * from connections`));
  assert.ok(okuma, 'anon bağlantı okuyabildi');

  const ekleme = await yazmayiDene(() =>
    anonOlarak(`insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, DENIZ])
  );
  assert.ok(ekleme, 'anon bağlantı ekleyebildi');

  const guncelleme = await yazmayiDene(() => anonOlarak(`update connections set durum='red'`));
  assert.ok(guncelleme, 'anon bağlantı güncelleyebildi');

  const silme = await yazmayiDene(() => anonOlarak(`delete from connections`));
  assert.ok(silme, 'anon bağlantı silebildi');

  assert.equal(await satirSayisi(), 1, 'anon satırı değiştirdi');
});

test('14 · HESAP SİLME CASCADE ÇALIŞIYOR', async () => {
  /*
    Silme politikası daraltıldı ama gerçek hesap temizliğini engellememeli.
    `connections` iki yabancı anahtarında da `on delete cascade` taşıyor;
    cascade sistem tarafından yapılıyor ve RLS'e tabi değil.

    Reddedilmiş bir satırla deneniyor: normal kullanıcının HİÇBİR şekilde
    silemediği durum bu, yani cascade'in politikadan bağımsız çalıştığını
    en net gösteren senaryo.
  */
  const GECICI = '88888888-8888-4888-8888-888888888888';
  await temizle();
  await db.exec(`insert into auth.users values ('${GECICI}');
                 insert into public.profiles(id) values ('${GECICI}')`);
  await db.query(
    /* Yayımlanmış profilde bölüm de şart; bkz. yayin_icin_kimlik_sart. */
    `insert into social_profiles(profile_id, username, sector_id, department_id, yayinda_mi)
       values ($1,'gecici',$2,
               (select ds.department_id from department_sectors ds
                 where ds.sector_id=$2 order by ds.department_id limit 1), true)`,
    [GECICI, tekstil]
  );

  await olarak(GECICI, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [GECICI, AYSE]);
  await olarak(AYSE, `update connections set durum='red' where addressee_id=$1`, [AYSE]);
  assert.equal(await satirSayisi(), 1);

  /* Normal kullanıcı bu satırı silemiyor (7 ve 8 numaralı testler). */
  await db.exec(`delete from public.profiles where id='${GECICI}'`);

  assert.equal(await satirSayisi(), 0, 'cascade red satırını temizleyemedi');
  assert.equal(
    (await db.query(`select count(*)::int n from social_profiles where profile_id=$1`, [GECICI])).rows[0].n,
    0,
    'cascade sosyal profili temizleyemedi'
  );
});

/* ======================================================== politika şekli */

test('DELETE POLİTİKASI DURUMA BAĞLI, TARAFA DEĞİL', async () => {
  /*
    Politikanın metni de kuralın parçası: "taraf olmak yeterli" hâline
    dönmesi sessiz bir gerileme olurdu.
  */
  const politika = (await db.query(
    `select qual from pg_policies where schemaname='public' and tablename='connections' and cmd='DELETE'`
  )).rows;
  assert.equal(politika.length, 1, 'tek bir DELETE politikası olmalı');

  const metin = politika[0].qual.replace(/\s+/g, ' ');
  assert.match(metin, /bekliyor/, 'bekliyor durumu politikada yok');
  assert.match(metin, /kabul/, 'kabul durumu politikada yok');
  assert.doesNotMatch(metin, /'red'/, 'red durumu silme koşuluna girmiş');
});
