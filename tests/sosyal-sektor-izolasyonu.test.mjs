import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  SEKTÖR İZOLASYONU — SUNUCU TARAFINDA

  Bu üründe sektör bir öneri süzgeci değil, görünürlük sınırı. Arayüzde
  gizlemek yetmez; testler tam da bu yüzden ARAYÜZE HİÇ BAKMIYOR.
  Gerçek `authenticated` rolü altında, gerçek RLS politikalarıyla, göç
  dosyalarının kendisi çalıştırılarak sorgu atılıyor.

  Göçler dosyadan okunuyor: politika değişirse test onunla değişiyor,
  kopyalanmış bir SQL'i doğrulamıyor.
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

/* Kullanıcılar. AYSE ve BURAK aynı sektörde, CEM başka, DENIZ sektörsüz. */
const AYSE = '11111111-1111-4111-8111-111111111111';
const BURAK = '22222222-2222-4222-8222-222222222222';
const CEM = '33333333-3333-4333-8333-333333333333';
const DENIZ = '44444444-4444-4444-8444-444444444444';

let db;

/** Belirli kullanıcı kimliğiyle, authenticated rolü altında sorgu. */
async function olarak(kimlik, sql, params = []) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${kimlik}'`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec('reset role; reset request.jwt.claim.sub');
  }
}

/** Yazma denemesi: hata fırlatırsa mesajı döner, geçerse null. */
async function yazmayiDene(kimlik, sql, params = []) {
  try {
    await olarak(kimlik, sql, params);
    return null;
  } catch (e) {
    return String(e.message || e);
  }
}

before(async () => {
  db = new PGlite();

  /*
    Supabase'in sosyal katman için gereken en küçük iskeleti. `profiles`
    burada YALNIZ yabancı anahtar hedefi olarak var — bu göçler o tabloya
    dokunmuyor ve testin konusu da o değil.
  */
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.profiles(
      id uuid primary key references auth.users(id),
      role text not null default 'student',
      email text not null default 'gizli@ornek.com',
      phone text
    );
    alter table public.profiles enable row level security;
    create policy "kendi profilini okur" on public.profiles
      for select to authenticated using (id = auth.uid());
    create function public.is_admin() returns boolean
      language sql stable security definer set search_path = public
      as $$ select false $$;
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

  /*
    Gerçek kullanıcı verisi kullanılmıyor: bunlar testin kendi kayıtları
    ve yalnız bellekteki PGlite örneğinde yaşıyorlar.
  */
  await db.exec(`
    insert into auth.users values ('${AYSE}'),('${BURAK}'),('${CEM}'),('${DENIZ}');
    insert into public.profiles(id) values ('${AYSE}'),('${BURAK}'),('${CEM}'),('${DENIZ}');
  `);

  const tekstil = (await db.query(`select id from sectors where slug='tekstil-moda-hazir-giyim'`)).rows[0].id;
  const makine = (await db.query(`select id from sectors where slug='makine-imalat'`)).rows[0].id;

  await db.query(
    /* Yayımlanmış profilde bölüm de şart; bkz. yayin_icin_kimlik_sart. */
    `insert into social_profiles(profile_id, username, sector_id, department_id, gorunen_ad, yayinda_mi) values
      ($1,'ayse',$5,(select ds.department_id from department_sectors ds where ds.sector_id=$5 order by ds.department_id limit 1),'Ayşe',true),
      ($2,'burak',$5,(select ds.department_id from department_sectors ds where ds.sector_id=$5 order by ds.department_id limit 1),'Burak',true),
      ($3,'cem',$6,(select ds.department_id from department_sectors ds where ds.sector_id=$6 order by ds.department_id limit 1),'Cem',true),
      ($4,null,null,null,'Deniz',false)`,
    [AYSE, BURAK, CEM, DENIZ, tekstil, makine]
  );

  await db.query(
    `insert into posts(id, author_id, aciklama) values
      ('aaaaaaaa-0000-4000-8000-000000000001',$1,'Ayşe paylaşımı'),
      ('bbbbbbbb-0000-4000-8000-000000000002',$2,'Burak paylaşımı'),
      ('cccccccc-0000-4000-8000-000000000003',$3,'Cem paylaşımı'),
      ('aaaaaaaa-0000-4000-8000-000000000004',$1,'Ayşe arşivi')`,
    [AYSE, BURAK, CEM]
  );
  await db.exec(`update posts set archived_at = now() where id='aaaaaaaa-0000-4000-8000-000000000004'`);
});

after(async () => {
  await db?.close();
});

/* ------------------------------------------------------ sektör sınırı */

test('AYNI SEKTÖR: profil ve paylaşım görünüyor', async () => {
  const profiller = await olarak(AYSE, `select username from social_profiles order by username`);
  assert.deepEqual(
    profiller.map((r) => r.username),
    ['ayse', 'burak'],
    'aynı sektördeki iki profil görünmeli'
  );

  const paylasimlar = await olarak(AYSE, `select aciklama from posts order by aciklama`);
  assert.deepEqual(
    paylasimlar.map((r) => r.aciklama),
    ['Ayşe arşivi', 'Ayşe paylaşımı', 'Burak paylaşımı'],
    'kendi arşivi + kendi + aynı sektördeki paylaşım'
  );
});

test('FARKLI SEKTÖR: karşı taraf HİÇ görünmüyor', async () => {
  /* Cem makine sektöründe; Ayşe onu ne profil ne paylaşım olarak görüyor. */
  const profiller = await olarak(AYSE, `select username from social_profiles`);
  assert.ok(!profiller.some((r) => r.username === 'cem'), 'farklı sektördeki profil sızdı');

  const paylasimlar = await olarak(AYSE, `select aciklama from posts`);
  assert.ok(!paylasimlar.some((r) => r.aciklama === 'Cem paylaşımı'), 'farklı sektördeki paylaşım sızdı');

  /* Ters yön de aynı: Cem de Ayşe'yi görmüyor. */
  const cemGoruyor = await olarak(CEM, `select username from social_profiles order by username`);
  assert.deepEqual(cemGoruyor.map((r) => r.username), ['cem']);
});

test('SEKTÖRSÜZ KULLANICI: kendisi dışında hiçbir şey', async () => {
  /*
    Zorunluluk burada. Deniz'in sektörü yok; sosyal katmandan yalnız
    kendi satırı dönüyor, yani arama, akış, keşif ve bağlantı özellikleri
    veri bulamıyor ve zorunlu seçim ekranına düşüyor.
  */
  const profiller = await olarak(DENIZ, `select profile_id from social_profiles`);
  assert.equal(profiller.length, 1);
  assert.equal(profiller[0].profile_id, DENIZ);

  const paylasimlar = await olarak(DENIZ, `select id from posts`);
  assert.equal(paylasimlar.length, 0, 'sektörsüz kullanıcı paylaşım görmemeli');

  /* Sektörsüz iki kullanıcı da birbirini görmüyor: NULL = NULL eşleşmesi yok. */
  await db.exec(`insert into auth.users values ('55555555-5555-4555-8555-555555555555');
                 insert into public.profiles(id) values ('55555555-5555-4555-8555-555555555555');
                 insert into social_profiles(profile_id, gorunen_ad) values ('55555555-5555-4555-8555-555555555555','Sektörsüz iki')`);
  const yine = await olarak(DENIZ, `select profile_id from social_profiles`);
  assert.equal(yine.length, 1, 'sektörsüzler birbirini görmemeli');
});

test('YAYIMLANMAMIŞ PROFİL yalnız sahibine', async () => {
  await db.query(`update social_profiles set yayinda_mi=false where profile_id=$1`, [BURAK]);

  const ayseGoruyor = await olarak(AYSE, `select username from social_profiles order by username`);
  assert.deepEqual(ayseGoruyor.map((r) => r.username), ['ayse'], 'yayımlanmamış profil sızdı');

  const kendisi = await olarak(BURAK, `select username from social_profiles where profile_id=$1`, [BURAK]);
  assert.equal(kendisi.length, 1, 'sahibi kendi taslağını görmeli');

  /* Yayımlanmamış sahibin paylaşımı da görünmüyor. */
  const paylasim = await olarak(AYSE, `select aciklama from posts where author_id=$1`, [BURAK]);
  assert.equal(paylasim.length, 0);

  await db.query(`update social_profiles set yayinda_mi=true where profile_id=$1`, [BURAK]);
});

test('ARŞİV yalnız sahibine', async () => {
  const burakGoruyor = await olarak(BURAK, `select aciklama from posts where author_id=$1 order by aciklama`, [AYSE]);
  assert.deepEqual(burakGoruyor.map((r) => r.aciklama), ['Ayşe paylaşımı'], 'arşiv başkasına görünmemeli');

  const ayseGoruyor = await olarak(AYSE, `select count(*)::int n from posts where author_id=$1`, [AYSE]);
  assert.equal(ayseGoruyor[0].n, 2, 'sahibi arşivini görmeli');
});

/* ------------------------------------------------------------ engel */

test('ENGEL İKİ YÖNLÜ ÇALIŞIYOR', async () => {
  await db.query(`insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [AYSE, BURAK]);

  const ayse = await olarak(AYSE, `select username from social_profiles order by username`);
  assert.deepEqual(ayse.map((r) => r.username), ['ayse'], 'engelleyen karşıyı görmemeli');

  const burak = await olarak(BURAK, `select username from social_profiles order by username`);
  assert.deepEqual(burak.map((r) => r.username), ['burak'], 'engellenen de karşıyı görmemeli');

  /* Engel varken istek gönderilemiyor. */
  const hata = await yazmayiDene(
    BURAK,
    `insert into connections(requester_id, addressee_id) values ($1,$2)`,
    [BURAK, AYSE]
  );
  assert.ok(hata, 'engelliyken istek gönderilebildi');

  await db.query(`delete from blocks where blocker_id=$1`, [AYSE]);
});

/* ------------------------------------------------------- bağlantılar */

test('BAĞLANTI SİMETRİK: tek satır, iki taraf da görüyor', async () => {
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);

  const gonderen = await olarak(AYSE, `select durum from connections`);
  const alan = await olarak(BURAK, `select durum from connections`);
  assert.equal(gonderen.length, 1);
  assert.equal(alan.length, 1, 'karşı taraf aynı satırı görmeli');
  assert.equal(alan[0].durum, 'bekliyor');

  /* Üçüncü kişi bekleyen isteği görmüyor. */
  const cem = await olarak(CEM, `select count(*)::int n from connections`);
  assert.equal(cem[0].n, 0, 'bekleyen istek üçüncü kişiye sızdı');
});

test('TERS YÖNDE İKİNCİ KAYIT AÇILAMIYOR', async () => {
  const hata = await yazmayiDene(
    BURAK,
    `insert into connections(requester_id, addressee_id) values ($1,$2)`,
    [BURAK, AYSE]
  );
  assert.match(String(hata), /duplicate key|unique/i, 'aynı çift ters yönde ikinci kez açıldı');
});

test('KENDİNE İSTEK GÖNDERİLEMİYOR', async () => {
  const hata = await yazmayiDene(
    AYSE,
    `insert into connections(requester_id, addressee_id) values ($1,$1)`,
    [AYSE]
  );
  assert.match(String(hata), /kendine_istek_yok|check/i);
});

test('FARKLI SEKTÖRE İSTEK GÖNDERİLEMİYOR', async () => {
  const hata = await yazmayiDene(
    AYSE,
    `insert into connections(requester_id, addressee_id) values ($1,$2)`,
    [AYSE, CEM]
  );
  assert.ok(hata, 'farklı sektöre istek gitti');
});

test('BAŞKASI ADINA İSTEK GÖNDERİLEMİYOR', async () => {
  const hata = await yazmayiDene(
    CEM,
    `insert into connections(requester_id, addressee_id) values ($1,$2)`,
    [AYSE, BURAK]
  );
  assert.ok(hata, 'kimlik sahteciliği geçti');
});

test('KABUL EDİLEN BAĞLANTI İKİ TARAFTA DA TEK SAYILIYOR', async () => {
  await olarak(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);

  const a = await olarak(AYSE, `select paylasim, baglanti from sosyal_sayaclar($1)`, [AYSE]);
  const b = await olarak(BURAK, `select paylasim, baglanti from sosyal_sayaclar($1)`, [BURAK]);
  assert.equal(a[0].baglanti, 1, 'gönderende 1 olmalı');
  assert.equal(b[0].baglanti, 1, 'alanda da 1 olmalı');
  /* Ayşe'nin iki paylaşımı var ama biri arşivde; sayaç arşivi saymıyor. */
  assert.equal(a[0].paylasim, 1);
});

test('GÖRÜNMEYEN PROFİLİN SAYAÇLARI DA GELMİYOR', async () => {
  /* Sayaç, farklı sektördeki bir kullanıcının varlığını sızdıran yan kanal olmamalı. */
  const bos = await olarak(AYSE, `select * from sosyal_sayaclar($1)`, [CEM]);
  assert.equal(bos.length, 0);
});

/* ------------------------------------------------ beğeni ve kaydetme */

test('GÖRÜNMEYEN PAYLAŞIM BEĞENİLEMİYOR', async () => {
  const hata = await yazmayiDene(
    AYSE,
    `insert into post_likes(post_id, user_id) values ('cccccccc-0000-4000-8000-000000000003',$1)`,
    [AYSE]
  );
  assert.ok(hata, 'farklı sektördeki paylaşım beğenildi');
});

test('AYNI PAYLAŞIM İKİ KEZ BEĞENİLEMİYOR', async () => {
  await olarak(AYSE, `insert into post_likes(post_id, user_id) values ('bbbbbbbb-0000-4000-8000-000000000002',$1)`, [AYSE]);
  const hata = await yazmayiDene(
    AYSE,
    `insert into post_likes(post_id, user_id) values ('bbbbbbbb-0000-4000-8000-000000000002',$1)`,
    [AYSE]
  );
  assert.match(String(hata), /duplicate key|unique/i);

  /* Geri alma: satır siliniyor, sonra yeniden beğenilebiliyor. */
  await olarak(AYSE, `delete from post_likes where post_id='bbbbbbbb-0000-4000-8000-000000000002' and user_id=$1`, [AYSE]);
  await olarak(AYSE, `insert into post_likes(post_id, user_id) values ('bbbbbbbb-0000-4000-8000-000000000002',$1)`, [AYSE]);
});

test('BEĞENENLERİ PAYLAŞIM SAHİBİ GÖRÜYOR, ÜÇÜNCÜ KİŞİ GÖRMÜYOR', async () => {
  const sahibi = await olarak(BURAK, `select user_id from post_likes where post_id='bbbbbbbb-0000-4000-8000-000000000002'`);
  assert.equal(sahibi.length, 1, 'sahibi beğeneni görmeli');
  assert.equal(sahibi[0].user_id, AYSE);

  const ucuncu = await olarak(CEM, `select count(*)::int n from post_likes`);
  assert.equal(ucuncu[0].n, 0);
});

test('KAYDEDİLENLER SAHİBİNDEN BAŞKASINA GÖRÜNMÜYOR', async () => {
  await olarak(AYSE, `insert into post_saves(post_id, user_id) values ('bbbbbbbb-0000-4000-8000-000000000002',$1)`, [AYSE]);

  const kendi = await olarak(AYSE, `select count(*)::int n from post_saves`);
  assert.equal(kendi[0].n, 1);

  /* Paylaşımın SAHİBİ bile kimin kaydettiğini göremiyor. */
  const paylasimSahibi = await olarak(BURAK, `select count(*)::int n from post_saves`);
  assert.equal(paylasimSahibi[0].n, 0, 'kaydetme paylaşım sahibine sızdı');
});

/* --------------------------------------------------- kullanıcı adı */

test('KULLANICI ADI BİÇİMİ: yalnız küçük ASCII', async () => {
  /*
    Türkçe 'İ' tuzağı burada kapanıyor: `lower('İ')` yerele bağlı
    davrandığı için büyük harf ve Türkçe karakter hiç yazılamıyor.
    Böylece "büyük-küçük harf duyarsız benzersizlik" saklama düzeyinde
    garanti altında.
  */
  /*
    ÖLÇÜM ARTIK ŞEMA ÜZERİNDE, İSTEMCİ ÜZERİNDEN DEĞİL.

    C aşamasında `username` istemciden yazılamıyor (kolon yetkisi yok) ve
    tetikleyici de "bir kez yazılır" diyor. Yani bu testi kullanıcı
    rolüyle yazmak, CHECK kısıtını değil yetki katmanını ölçerdi.
    Buradaki konu kısıtın kendisi olduğu için satırlar sahibi haklarıyla
    (superuser) açılıp siliniyor. İstemcinin yazamadığı ayrıca
    `sosyal-bolum-alan-uygunlugu.test.mjs` içinde ölçülüyor.
  */
  const DENEME = '77777777-7777-4777-8777-777777777777';
  await db.exec(`insert into auth.users values ('${DENEME}') on conflict do nothing;
                 insert into public.profiles(id) values ('${DENEME}') on conflict do nothing`);

  const dene = async (ad) => {
    try {
      await db.query(`insert into social_profiles(profile_id, username) values ($1,$2)`, [DENEME, ad]);
      await db.query(`delete from social_profiles where profile_id=$1`, [DENEME]);
      return null;
    } catch (e) {
      return String(e.message || e);
    }
  };

  const gecersiz = ['Ayse', 'AYSE', 'ayşe', 'İrem', 'ırmak', 'ab', '.ayse', 'ayse.', 'ay se', 'ayse!'];
  for (const ad of gecersiz) {
    assert.ok(await dene(ad), `geçersiz kullanıcı adı kabul edildi: ${ad}`);
  }

  /* Ayşe'nin adı zaten alınmış; çakışma ayrı testin konusu. */
  const gecerli = ['deniz', 'deniz.kaya', 'deniz_98', 'a1b'];
  for (const ad of gecerli) {
    assert.equal(await dene(ad), null, `geçerli kullanıcı adı reddedildi: ${ad}`);
  }
});

test('KULLANICI ADI BENZERSİZ', async () => {
  const DENEME = '77777777-7777-4777-8777-777777777777';
  await db.exec(`insert into auth.users values ('${DENEME}') on conflict do nothing;
                 insert into public.profiles(id) values ('${DENEME}') on conflict do nothing`);

  let hata = null;
  try {
    await db.query(`insert into social_profiles(profile_id, username) values ($1,'ayse')`, [DENEME]);
  } catch (e) {
    hata = String(e.message || e);
  }
  await db.query(`delete from social_profiles where profile_id=$1`, [DENEME]);
  assert.match(String(hata), /duplicate key|unique/i);
});

test('YAYIMLAMAK İÇİN KULLANICI ADI VE SEKTÖR ŞART', async () => {
  const hata = await yazmayiDene(
    DENIZ,
    `update social_profiles set yayinda_mi=true where profile_id=$1`,
    [DENIZ]
  );
  assert.match(String(hata), /yayin_icin_kimlik_sart|check/i, 'sektörsüz profil yayımlanabildi');
});

/* ------------------------------------------------------ özel veriler */

test('SOSYAL RLS ÖZEL BİLGİYE HİÇ DOKUNMUYOR', async () => {
  /*
    Bu testin konusu göçlerin NE YAPMADIĞI: `profiles` politikası
    değişmediği için aynı sektördeki Burak, Ayşe'nin e-postasını
    okuyamıyor.
  */
  const satir = await olarak(BURAK, `select count(*)::int n from profiles where id=$1`, [AYSE]);
  assert.equal(satir[0].n, 0, 'sosyal katman profiles tablosunu açmış');

  /*
    Tarama BÜTÜN sosyal göçleri kapsıyor. İlk iki dosyaya bakmak yeterli
    görünüyordu ama sonradan gelen bir göç `profiles` tablosuna dokunsa
    test bunu görmezdi.
  */
  const hepsi = (await Promise.all(DOSYALAR.map((d) => readFile(d, 'utf8')))).join('\n');
  const sql = hepsi.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(sql, /alter\s+table\s+public\.profiles/i, 'profiles tablosu değiştirilmiş');
  assert.doesNotMatch(sql, /alter\s+table\s+public\.student_profiles/i, 'student_profiles değiştirilmiş');
  assert.doesNotMatch(sql, /on\s+public\.profiles/i, 'profiles üzerinde politika yazılmış');
  assert.doesNotMatch(sql, /cv_path|gpa|\bphone\b/i, 'özel kolon sosyal kapsama girmiş');
});

test('ANONİM KULLANICIYA SOSYAL KATMAN KAPALI', async () => {
  const hepsi = (await Promise.all(DOSYALAR.map((d) => readFile(d, 'utf8')))).join('\n');
  assert.match(hepsi, /revoke all on public\.social_profiles[\s\S]*from anon/i);
  /* Politikaların tamamı `to authenticated`; anon için hiç politika yok. */
  const anonPolitika = (hepsi.match(/for\s+\w+\s+to\s+anon/gi) || []).length;
  assert.equal(anonPolitika, 0, 'anon için politika yazılmış');
});

test('ÖNE ÇIKANLAR VE MESAJ TABLOSU YOK', async () => {
  /* Altyapısı kurulmadan arayüzde gösterilmeyecek; tablo da açılmadı. */
  const tablolar = (await db.query(
    `select table_name from information_schema.tables where table_schema='public'`
  )).rows.map((r) => r.table_name);
  for (const yok of ['highlights', 'highlight_items', 'messages', 'post_comments']) {
    assert.ok(!tablolar.includes(yok), `${yok} tablosu erken açılmış`);
  }
});
