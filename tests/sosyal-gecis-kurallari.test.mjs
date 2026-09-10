import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  GEÇİŞ KURALLARI — VERİTABANI SEVİYESİNDE

  Sektör izolasyonu "kim neyi görür" sorusuydu ve ayrı dosyada test
  ediliyor (sosyal-sektor-izolasyonu.test.mjs). Burada ikinci soru var:
  GÖRDÜĞÜN bir satırda hangi değişikliği yapabiliyorsun.

  RLS bu soruyu tek başına cevaplayamıyor: UPDATE politikasında `USING`
  eski satırı, `WITH CHECK` yeni satırı görüyor ama ikisini
  karşılaştıramıyor. Kurallar bu yüzden tetikleyicide ve testler de
  gerçek `authenticated` rolü altında, göç dosyalarının kendisi
  çalıştırılarak yazıldı.
*/

/*
  Göçlerin TAMAMI uygulanıyor: üretimde hepsi birlikte yaşıyor ve bir
  alt kümeye karşı test etmek, sonradan gelen bir göçün bu davranışları
  bozduğunu görmemek demek olurdu.
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
const CEM = '33333333-3333-4333-8333-333333333333';   // farklı sektör
const DENIZ = '44444444-4444-4444-8444-444444444444'; // aynı sektör, üçüncü kişi
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

/** Testler arasında bağlantı tablosunu ve engelleri sıfırlar. */
async function temizle() {
  await db.exec('delete from connections; delete from blocks;');
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
    /* Yönetici kontrolü gerçek kalıptaki gibi profiles.role üzerinden. */
    create function public.is_admin() returns boolean
      language sql stable security definer set search_path = public
      as $$ select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false) $$;
    /*
      auth şemasına USAGE: tetikleyiciler security invoker çalışıyor ve
      içeriden auth.uid() çağırıyorlar. Gerçek Supabase'de authenticated
      rolünde bu yetki var; test iskeleti onu taklit ediyor.
    */
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
    /*
      C aşamasından beri yayımlanmış profilde BÖLÜM de şart
      (`yayin_icin_kimlik_sart`). Bölüm alandan değil, alan bölümden
      türüyor; fixture o yönü tersten kurduğu için bölümü eşlemeden
      okuyor. Bu yalnız testin kendi kurgusu — üründe kurulum
      `sosyal_profil_kur()` RPC'sinden geçiyor.
    */
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

/* ============================================ 1) BAĞLANTI GEÇİŞLERİ */

test('İSTEK YALNIZ "bekliyor" DURUMUNDA AÇILIYOR', async () => {
  await temizle();
  const hata = await yazmayiDene(
    AYSE,
    `insert into connections(requester_id, addressee_id, durum) values ($1,$2,'kabul')`,
    [AYSE, BURAK]
  );
  assert.match(String(hata), /bekliyor/i, 'doğrudan kabul edilmiş bağlantı açılabildi');
});

test('GÖNDEREN KENDİ İSTEĞİNİ KABUL EDEMEZ', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);

  const hata = await yazmayiDene(
    AYSE,
    `update connections set durum='kabul' where requester_id=$1 and addressee_id=$2`,
    [AYSE, BURAK]
  );
  assert.match(String(hata), /yalnız isteği alan/i, 'gönderen kendi isteğini kabul etti');

  const durum = await olarak(AYSE, `select durum from connections`);
  assert.equal(durum[0].durum, 'bekliyor', 'durum değişmiş olmamalı');
});

test('İSTEĞİ ALAN KABUL VE RED EDEBİLİR', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);
  assert.equal((await olarak(AYSE, `select durum from connections`))[0].durum, 'kabul');

  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(BURAK, `update connections set durum='red' where addressee_id=$1`, [BURAK]);
  assert.equal((await olarak(AYSE, `select durum from connections`))[0].durum, 'red');
});

test('ÜÇÜNCÜ KİŞİ DURUMU DEĞİŞTİREMEZ', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);

  /*
    Deniz aynı sektörde ama bu isteğin tarafı değil. RLS onu zaten satırı
    göremez hâlde tutuyor; UPDATE bu yüzden HİÇBİR satıra dokunmuyor.
    Hata almıyor ama değiştiremiyor da — kanıtı durumun aynı kalması.
    Sessiz "0 satır" davranışı burada doğru: var olduğunu bilmediğin bir
    satır için yetki hatası almak, satırın varlığını sızdırırdı.
  */
  await olarak(DENIZ, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);
  const durum = await olarak(AYSE, `select durum from connections`);
  assert.equal(durum[0].durum, 'bekliyor', 'üçüncü kişi durumu değiştirdi');
});

test('KABUL EDİLEN İSTEK TEKRAR "bekliyor" YAPILAMAZ', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);

  for (const [kim, hedefDurum] of [[BURAK, 'bekliyor'], [AYSE, 'bekliyor'], [BURAK, 'red']]) {
    const hata = await yazmayiDene(
      kim,
      `update connections set durum=$2 where requester_id=$1`,
      [AYSE, hedefDurum]
    );
    assert.match(String(hata), /yalnız bekleyen/i, `kabul → ${hedefDurum} geçti`);
  }
});

test('RED EDİLEN İSTEK KABULE ÇEVRİLEMEZ', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(BURAK, `update connections set durum='red' where addressee_id=$1`, [BURAK]);

  const hata = await yazmayiDene(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);
  assert.match(String(hata), /yalnız bekleyen/i, 'red → kabul geçti');
});

test('KİMLİK ALANLARI UPDATE İLE DEĞİŞTİRİLEMEZ', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);

  /*
    Bu açık kapatılmasaydı Ayşe kendi satırındaki addressee_id'yi Deniz'e
    çevirip Deniz'le "bağlantı" uydurabilirdi: ne ters yön indeksi ne de
    kendine-istek kısıtı bunu yakalardı.
  */
  const hata = await yazmayiDene(
    AYSE,
    `update connections set addressee_id=$2 where requester_id=$1`,
    [AYSE, DENIZ]
  );
  assert.match(String(hata), /tarafları değiştirilemez/i);

  const hata2 = await yazmayiDene(
    AYSE,
    `update connections set requester_id=$2 where addressee_id=$1`,
    [BURAK, DENIZ]
  );
  assert.match(String(hata2), /tarafları değiştirilemez/i);
});

test('GÖNDEREN BEKLEYEN İSTEĞİNİ GERİ ÇEKEBİLİR', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(AYSE, `delete from connections where requester_id=$1`, [AYSE]);
  assert.equal((await olarak(BURAK, `select count(*)::int n from connections`))[0].n, 0);
});

test('KABUL EDİLEN BAĞLANTIYI İKİ TARAFTAN BİRİ KALDIRABİLİR', async () => {
  /* Gönderen kaldırıyor. */
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);
  await olarak(AYSE, `delete from connections where requester_id=$1`, [AYSE]);
  assert.equal((await olarak(BURAK, `select count(*)::int n from connections`))[0].n, 0, 'gönderen kaldıramadı');

  /* Alan kaldırıyor. */
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);
  await olarak(BURAK, `delete from connections where addressee_id=$1`, [BURAK]);
  assert.equal((await olarak(AYSE, `select count(*)::int n from connections`))[0].n, 0, 'alan kaldıramadı');
});

test('TERS YÖN VE KENDİNE BAĞLANTI HÂLÂ ENGELLİ', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);

  const ters = await yazmayiDene(
    BURAK,
    `insert into connections(requester_id, addressee_id) values ($1,$2)`,
    [BURAK, AYSE]
  );
  assert.match(String(ters), /duplicate key|unique/i);

  const kendine = await yazmayiDene(
    AYSE,
    `insert into connections(requester_id, addressee_id) values ($1,$1)`,
    [AYSE]
  );
  assert.match(String(kendine), /kendine_istek_yok|check/i);
});

test('SEKTÖR SONRADAN AYRIŞIRSA KABUL GERÇEKLEŞMİYOR', async () => {
  /*
    İstek gönderilirken RLS sektörü kontrol ediyor, ama araya bir sektör
    değişikliği girebilir (bugün yalnız yönetici eliyle). Kabul anında
    yeniden bakılmasaydı farklı sektörden bir çift "kabul edilmiş" duruma
    geçerdi ve iki topluluk arasında bir köprü açılırdı.
  */
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, DENIZ]);

  /*
    Yönetici Deniz'i başka alana alıyor. C aşamasından beri bunun tek
    yolu düzeltme RPC-si: doğrudan yazma yöneticiye de kapalı.
  */
  await olarak(ADMIN, `select sosyal_bolum_duzelt($1,$2,$3)`,
    [DENIZ, 'makine-muhendisligi', 'Bölüm düzeltmesi: test kurgusu.']);

  const hata = await yazmayiDene(DENIZ, `update connections set durum='kabul' where addressee_id=$1`, [DENIZ]);
  assert.match(String(hata), /farklı sektör ya da engel/i, 'sektör ayrışmışken kabul geçti');

  /* Geri al: sonraki testler Deniz-i aynı alanda bekliyor. */
  await olarak(ADMIN, `select sosyal_bolum_duzelt($1,$2,$3)`,
    [DENIZ, 'giyim-uretim-teknolojisi', 'Test kurgusu geri alınıyor.']);
  await temizle();
});

test('ENGEL VARKEN KABUL GERÇEKLEŞMİYOR', async () => {
  /*
    Engel zaten bağlantıyı siliyor (aşağıdaki testler), ama kural silmeye
    BAĞLI olmamalı: silme bir gün değişse bile kabul yolu kapalı kalmalı.
    Bu yüzden burada engel doğrudan tabloya yazılıyor, tetikleyici
    devreye girmeden.
  */
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);

  await db.exec('alter table blocks disable trigger blocks_baglantiyi_kaldir');
  await olarak(BURAK, `insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [BURAK, AYSE]);
  await db.exec('alter table blocks enable trigger blocks_baglantiyi_kaldir');

  const hata = await yazmayiDene(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);
  assert.match(String(hata), /farklı sektör ya da engel/i, 'engelliyken kabul geçti');

  const durum = await db.query(`select durum from connections`);
  assert.equal(durum.rows[0].durum, 'bekliyor');
  await temizle();
});

/* ========================================= 2) BÖLÜM VE ALAN KİLİDİ */

/*
  C AŞAMASINDA BU BÖLÜM YENİDEN YAZILDI.

  B aşamasında alan istemciden geliyordu ve testler de "kullanıcı
  `sector_id` yazmayı deniyor, tetikleyici reddediyor" biçimindeydi.
  Artık kural daha erken devreye giriyor: istemcinin `sector_id`,
  `department_id` ve `username` kolonlarında YAZMA YETKİSİ YOK. İstek
  RLS'e ve tetikleyiciye bile gelmiyor, yetki katmanında duruyor.

  Bu yüzden beklenen hata artık tetikleyicinin cümlesi değil,
  "permission denied". Tetikleyici (`kimlik_kilidi`) ikinci kapı olarak
  duruyor ve `service_role`/bakım yollarında ölçülüyor.
*/

test('İLK KURULUM RPC İLE YAPILIYOR, ALAN EŞLEMEDEN TÜRÜYOR', async () => {
  const YENI = '66666666-6666-4666-8666-666666666666';
  await db.exec(`insert into auth.users values ('${YENI}');
                 insert into public.profiles(id) values ('${YENI}')`);

  await olarak(YENI, `select sosyal_profil_kur($1,$2,$3)`,
    ['yeni.ogrenci', 'giyim-uretim-teknolojisi', false]);

  const satir = await db.query(
    `select sp.sector_id, d.slug bolum from social_profiles sp
       join departments d on d.id = sp.department_id
      where sp.profile_id=$1`, [YENI]);
  assert.equal(satir.rows[0].sector_id, tekstil, 'alan eşlemeden gelmedi');
  assert.equal(satir.rows[0].bolum, 'giyim-uretim-teknolojisi');
});

test('NORMAL KULLANICI ALANI DOĞRUDAN YAZAMIYOR', async () => {
  const hata = await yazmayiDene(
    AYSE,
    `update social_profiles set sector_id=$1 where profile_id=$2`,
    [makine, AYSE]
  );
  assert.match(String(hata), /permission denied/i, 'alan doğrudan yazılabildi');
});

test('ALANI NULL YAPIP YENİDEN SEÇME AÇIĞI KAPALI', async () => {
  const hata = await yazmayiDene(
    AYSE,
    `update social_profiles set sector_id=null where profile_id=$1`,
    [AYSE]
  );
  assert.match(String(hata), /permission denied/i, 'alan boşaltılabildi');
});

test('BÖLÜM DE DOĞRUDAN YAZILAMIYOR', async () => {
  const hata = await yazmayiDene(
    AYSE,
    `update social_profiles set department_id=(select id from departments where slug='hukuk')
      where profile_id=$1`,
    [AYSE]
  );
  assert.match(String(hata), /permission denied/i, 'bölüm doğrudan yazılabildi');
});

test('İKİNCİ KURULUM ÇAĞRISI ALANI DEĞİŞTİREMİYOR', async () => {
  /* Kurulum RPC-si `coalesce` ile kimlik alanlarını koruyor. */
  await olarak(AYSE, `select sosyal_profil_kur($1,$2,$3)`,
    ['ayse.yeni', 'makine-muhendisligi', false]);

  const satir = await db.query(
    `select sector_id, username from social_profiles where profile_id=$1`, [AYSE]);
  assert.equal(satir.rows[0].sector_id, tekstil, 'ALAN DEĞİŞTİ — temel kural kırıldı');
  assert.equal(satir.rows[0].username, 'ayse', 'kullanıcı adı değişti');
});

test('ALAN DEĞİŞTİREREK BAŞKA TOPLULUĞUN VERİSİNE ERİŞİLEMİYOR', async () => {
  /* Cem makine alanında ve Ayşe onu göremiyor. */
  const once = await olarak(AYSE, `select count(*)::int n from social_profiles where profile_id=$1`, [CEM]);
  assert.equal(once[0].n, 0);

  await yazmayiDene(AYSE, `update social_profiles set sector_id=$1 where profile_id=$2`, [makine, AYSE]);
  const sonra = await olarak(AYSE, `select count(*)::int n from social_profiles where profile_id=$1`, [CEM]);
  assert.equal(sonra[0].n, 0, 'alan değiştirerek karşı topluluk görüldü');

  const kendi = await olarak(AYSE, `select sector_id from social_profiles where profile_id=$1`, [AYSE]);
  assert.equal(kendi[0].sector_id, tekstil);
});

test('DİĞER PROFİL ALANLARI SERBESTÇE DÜZENLENEBİLİYOR', async () => {
  /* Kilit yalnız kimlik alanlarına ait; profil düzenleme engellenmemeli. */
  await olarak(
    AYSE,
    `update social_profiles set biyografi=$1, sehir=$2, gorunen_ad=$3 where profile_id=$4`,
    ['Atölyede öğrendiklerimi paylaşıyorum.', 'İstanbul', 'Ayşe D.', AYSE]
  );
  const satir = await olarak(AYSE, `select sehir, gorunen_ad from social_profiles where profile_id=$1`, [AYSE]);
  assert.equal(satir[0].sehir, 'İstanbul');
  assert.equal(satir[0].gorunen_ad, 'Ayşe D.');
});

test('YÖNETİCİ DÜZELTMESİ YALNIZ RPC İLE VE GEREKÇELİ', async () => {
  /*
    Yöneticinin doğrudan geniş UPDATE politikası C aşamasında kaldırıldı;
    düzeltme `sosyal_bolum_duzelt()` üzerinden geçiyor ve denetim kaydı
    yazıyor. Doğrudan yazma yolu yöneticiye de kapalı.
  */
  const dogrudan = await yazmayiDene(
    ADMIN, `update social_profiles set sector_id=$1 where profile_id=$2`, [makine, DENIZ]);
  assert.match(String(dogrudan), /permission denied/i, 'yönetici doğrudan yazabildi');

  await olarak(ADMIN, `select sosyal_bolum_duzelt($1,$2,$3)`,
    [DENIZ, 'makine-muhendisligi', 'Öğrenci bölümünü yanlış seçmiş, e-posta ile doğrulandı.']);

  const satir = await db.query(`select sector_id from social_profiles where profile_id=$1`, [DENIZ]);
  assert.equal(satir.rows[0].sector_id, makine, 'yönetici düzeltmesi işlemedi');

  /*
    Denetim kaydı birikiyor (bu dosyada daha önce de düzeltme yapıldı),
    bu yüzden ölçüm SON düzeltmenin iki satırına bakıyor.
  */
  const denetim = await db.query(
    `select alan, gerekce from social_profile_denetim
      where profile_id=$1 and gerekce like '%yanlış seçmiş%' order by alan`, [DENIZ]);
  assert.deepEqual(denetim.rows.map((r) => r.alan), ['department_id', 'sector_id']);
  assert.match(denetim.rows[0].gerekce, /yanlış seçmiş/);

  /* Geri al: sonraki testler Deniz-i aynı alanda bekliyor. */
  await olarak(ADMIN, `select sosyal_bolum_duzelt($1,$2,$3)`,
    [DENIZ, 'giyim-uretim-teknolojisi', 'Test kurgusu geri alınıyor.']);
});

test('YÖNETİCİ GEREKÇESİZ DÜZELTEMİYOR', async () => {
  const hata = await yazmayiDene(
    ADMIN, `select sosyal_bolum_duzelt($1,$2,$3)`, [DENIZ, 'hukuk', '   ']);
  assert.match(String(hata), /gerekçe/i, 'gerekçesiz düzeltme geçti');
});

test('NORMAL KULLANICI DÜZELTME RPC-SİNİ ÇAĞIRAMIYOR', async () => {
  const hata = await yazmayiDene(
    AYSE, `select sosyal_bolum_duzelt($1,$2,$3)`,
    [AYSE, 'hukuk', 'Kendi bölümümü değiştirmek istiyorum.']);
  assert.ok(hata, 'normal kullanıcı düzeltme yapabildi');

  const satir = await db.query(`select sector_id from social_profiles where profile_id=$1`, [AYSE]);
  assert.equal(satir.rows[0].sector_id, tekstil);
});

test('DENETİM KAYDI APPEND-ONLY', async () => {
  const guncelleme = await yazmayiDene(
    ADMIN, `update social_profile_denetim set gerekce='degistirildi'`);
  assert.ok(guncelleme, 'denetim kaydı güncellenebildi');

  const silme = await yazmayiDene(ADMIN, `delete from social_profile_denetim`);
  assert.ok(silme, 'denetim kaydı silinebildi');
});


/* ================================================== 3) ENGEL DAVRANIŞI */

test('ENGEL EKLENİNCE BEKLEYEN İSTEK KALDIRILIYOR', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  assert.equal((await olarak(AYSE, `select count(*)::int n from connections`))[0].n, 1);

  await olarak(AYSE, `insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [AYSE, BURAK]);

  const ayse = await db.query(`select count(*)::int n from connections`);
  assert.equal(ayse.rows[0].n, 0, 'bekleyen istek engelden sonra durdu');
  await temizle();
});

test('ENGEL EKLENİNCE KABUL EDİLMİŞ BAĞLANTI KALDIRILIYOR', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);

  await olarak(AYSE, `insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [AYSE, BURAK]);
  assert.equal((await db.query(`select count(*)::int n from connections`)).rows[0].n, 0);
  await temizle();
});

test('ENGEL TERS YÖNDEN DE BAĞLANTIYI KALDIRIYOR', async () => {
  /*
    Bağlantıyı Ayşe başlatmış olsun ama engeli BURAK koysun: satır
    requester/addressee yönünden bağımsız silinmeli.
  */
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);

  await olarak(BURAK, `insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [BURAK, AYSE]);
  assert.equal((await db.query(`select count(*)::int n from connections`)).rows[0].n, 0, 'ters yönde silinmedi');
  await temizle();
});

test('ENGEL KALDIRILINCA BAĞLANTI GERİ GELMİYOR', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);
  await olarak(AYSE, `insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(AYSE, `delete from blocks where blocker_id=$1 and blocked_id=$2`, [AYSE, BURAK]);

  assert.equal(
    (await db.query(`select count(*)::int n from connections`)).rows[0].n,
    0,
    'engel kalkınca eski bağlantı geri geldi'
  );

  /* Yeniden bağlanmak için yeni istek gerekiyor — ve bu çalışıyor. */
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  const yeni = await olarak(BURAK, `select durum from connections`);
  assert.equal(yeni[0].durum, 'bekliyor');
  await temizle();
});

test('SİLME ENGEL İŞLEMİYLE AYNI İŞLEMDE — ATOMİK', async () => {
  /*
    Tetikleyici `after insert` ve aynı işlemin içinde. İşlem geri
    alınırsa hem engel hem silme geri alınıyor: yarım durum kalmıyor.
  */
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);

  await db.exec(`set role authenticated; set request.jwt.claim.sub='${AYSE}'`);
  await db.exec('begin');
  await db.query(`insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [AYSE, BURAK]);
  await db.exec('rollback');
  await db.exec('reset role; reset request.jwt.claim.sub');

  const baglanti = await db.query(`select count(*)::int n from connections`);
  const engel = await db.query(`select count(*)::int n from blocks`);
  assert.equal(engel.rows[0].n, 0, 'engel geri alınmadı');
  assert.equal(baglanti.rows[0].n, 1, 'işlem geri alındığında bağlantı da geri gelmeliydi');
  await temizle();
});
