import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  SOSYAL PORTFOLYO — GÜVENLİK DÜZELTMELERİ (20260922010000)

  Buradaki her kural, beş sosyal göç yerel bir Supabase yığınına
  uygulandıktan sonra GERÇEK PostgREST istekleriyle ölçülmüş bir açığın
  karşılığı. Yani bu dosya "olabilir" diye yazılmış savunmaları değil,
  bir kez gerçekten açık olduğu görülmüş kapıları bekliyor:

    · kendi social_profiles satırını silip farklı alanla yeniden kurmak
      (silme HTTP 200, yeniden kurulum HTTP 201 döndü)
    · dahili yardımcıları /rpc/... üzerinden çağırıp engel ve yazar
      bilgisi öğrenmek (engelli_mi → true, paylasim_sahibi → yazar)
    · yayımlamadan topluluğu okumak (görünmeden gözlemleme)
    · arşivlenmiş paylaşımı beğenmek (HTTP 201)

  PGlite bellekte çalışıyor; kullanıcılar bu testin kendi kayıtları.
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

/* AYSE ve BURAK aynı alanda; CEM başka alanda. */
const AYSE = '11111111-1111-4111-8111-111111111111';
const BURAK = '22222222-2222-4222-8222-222222222222';
const CEM = '33333333-3333-4333-8333-333333333333';

let db;
let tekstil;
let makine;
let aysePost;

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

async function anonOlarak(sql) {
  await db.exec('set role anon');
  try {
    return (await db.query(sql)).rows;
  } catch (e) {
    return { hata: String(e.message || e) };
  } finally {
    await db.exec('reset role');
  }
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
    insert into auth.users values ('${AYSE}'),('${BURAK}'),('${CEM}');
    insert into public.profiles(id) values ('${AYSE}'),('${BURAK}'),('${CEM}');
  `);
  tekstil = (await db.query(`select id from sectors where slug='tekstil-moda-hazir-giyim'`)).rows[0].id;
  makine = (await db.query(`select id from sectors where slug='makine-imalat'`)).rows[0].id;

  /* AYSE yayında, BURAK yayımlanmamış, CEM başka alanda ve yayında. */
  await db.query(
    /* Yayımlanmış profilde bölüm de şart; bkz. yayin_icin_kimlik_sart. */
    `insert into social_profiles(profile_id, username, sector_id, department_id, yayinda_mi) values
      ($1,'ayse',$4,(select ds.department_id from department_sectors ds where ds.sector_id=$4 order by ds.department_id limit 1),true),
      ($2,'burak',$4,(select ds.department_id from department_sectors ds where ds.sector_id=$4 order by ds.department_id limit 1),false),
      ($3,'cem',$5,(select ds.department_id from department_sectors ds where ds.sector_id=$5 order by ds.department_id limit 1),true)`,
    [AYSE, BURAK, CEM, tekstil, makine]
  );

  const r = await db.query(
    `insert into posts(author_id, aciklama) values ($1,'Ayşe paylaşımı') returning id`,
    [AYSE]
  );
  aysePost = r.rows[0].id;
});

after(async () => {
  await db?.close();
});

/* ============================================================ 1) SİLME */

test('KENDİ SOSYAL PROFİLİNİ SİLEMİYOR', async () => {
  const hata = await yazmayiDene(AYSE, `delete from social_profiles where profile_id=$1`, [AYSE]);
  assert.ok(hata, 'silme reddedilmeliydi');

  const kalan = await olarak(AYSE, `select username from social_profiles where profile_id=$1`, [AYSE]);
  assert.equal(kalan.length, 1, 'satır silinmiş');
});

test('SİLME İKİ KAPIDAN DA KAPALI: politika da yok, tablo yetkisi de', async () => {
  const politika = await db.query(
    `select count(*)::int n from pg_policies
      where schemaname='public' and tablename='social_profiles' and cmd='DELETE'`
  );
  assert.equal(politika.rows[0].n, 0, 'DELETE politikası kalmış');

  const yetki = await db.query(
    `select count(*)::int n from information_schema.role_table_grants
      where table_schema='public' and table_name='social_profiles'
        and grantee='authenticated' and privilege_type='DELETE'`
  );
  assert.equal(yetki.rows[0].n, 0, 'authenticated hâlâ DELETE yetkisi taşıyor');
});

test('SİLİP FARKLI ALANLA YENİDEN KURULAMIYOR', async () => {
  /* Silme zaten reddediliyor; ikinci kapı birincil anahtar. */
  const hata = await yazmayiDene(
    AYSE,
    `insert into social_profiles(profile_id, username, sector_id) values ($1,'ayse.yeni',$2)`,
    [AYSE, makine]
  );
  assert.ok(hata, 'ikinci satır açılabildi');

  const alan = await olarak(AYSE, `select sector_id from social_profiles where profile_id=$1`, [AYSE]);
  assert.equal(alan[0].sector_id, tekstil, 'alan değişmiş');
});

test('HESAP SİLME CASCADE\'İ ÇALIŞMAYA DEVAM EDİYOR', async () => {
  /*
    ÖLÇÜLEN BAĞ: social_profiles.profile_id → profiles(id) on delete cascade.
    `revoke delete on social_profiles from authenticated` bunu bozabilirdi;
    bozmuyor, çünkü referans bütünlüğü eylemleri sistem tarafından, tablo
    sahibinin haklarıyla ve RLS'e tabi olmadan çalıştırılıyor.

    Zincirin bir üst halkası (profiles → auth.users) burada sınanmıyor:
    bu harness'taki `profiles` taslağı `on delete cascade` taşımıyor, o
    kısım gerçek şemanın işi. Uçtan uca hesap silme, yerel Supabase
    yığınında Auth yönetici API'siyle ayrıca ölçüldü.
  */
  const gecici = '44444444-4444-4444-8444-444444444444';
  await db.exec(`insert into auth.users values ('${gecici}');
                 insert into public.profiles(id) values ('${gecici}')`);
  await db.query(
    `insert into social_profiles(profile_id, username, sector_id) values ($1,'gecici',$2)`,
    [gecici, tekstil]
  );
  await db.query(`insert into posts(author_id, aciklama) values ($1,'gecici paylasim')`, [gecici]);

  await db.query(`delete from public.profiles where id=$1`, [gecici]);

  const profil = await db.query(`select 1 from social_profiles where profile_id=$1`, [gecici]);
  assert.equal(profil.rows.length, 0, 'hesap silinince sosyal profil kalmış');

  const paylasim = await db.query(`select 1 from posts where author_id=$1`, [gecici]);
  assert.equal(paylasim.rows.length, 0, 'hesap silinince paylaşım kalmış');
});

/* ================================================= 2) YARDIMCI SIZINTISI */

test('DAHİLİ YARDIMCILAR ARTIK public ŞEMASINDA DEĞİL', async () => {
  const kalanlar = await db.query(
    `select p.proname from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('engelli_mi','paylasim_sahibi','ayni_sektorde','aktif_sektor','sosyal_gorunur')
      order by p.proname`
  );
  assert.deepEqual(kalanlar.rows.map((r) => r.proname), [],
    'yardımcı hâlâ public şemasında — PostgREST onu /rpc olarak sunar');
});

test('YARDIMCILAR GİZLİ ŞEMADA VE authenticated ONLARI ÇALIŞTIRABİLİYOR', async () => {
  const gizli = await db.query(
    `select p.proname from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'sosyal_gizli' order by p.proname`
  );
  const adlar = gizli.rows.map((r) => r.proname);
  for (const ad of ['aktif_sektor', 'ayni_sektorde', 'engelli_mi', 'paylasim_sahibi', 'sosyal_gorunur']) {
    assert.ok(adlar.includes(ad), `${ad} gizli şemada yok`);
  }

  /* RLS bunları çağırıyor; çağıramasaydı sosyal katmanın tamamı kapanırdı. */
  const gorur = await olarak(AYSE, `select sosyal_gizli.sosyal_gorunur($1) g`, [AYSE]);
  assert.equal(gorur[0].g, true);
});

test('anon GİZLİ ŞEMAYA GİREMİYOR', async () => {
  const yetki = await db.query(
    `select has_schema_privilege('anon','sosyal_gizli','usage') v`
  );
  assert.equal(yetki.rows[0].v, false, 'anon gizli şemaya erişebiliyor');
});

/* ============================================== 3) GÖRÜNÜRLÜK SİMETRİSİ */

test('YAYIMLANMAMIŞ KULLANICI BAŞKASINI GÖREMİYOR', async () => {
  const profiller = await olarak(BURAK, `select username from social_profiles order by username`);
  assert.deepEqual(profiller.map((r) => r.username), ['burak'],
    'yayımlamayan kullanıcı topluluğu görüyor');

  const paylasimlar = await olarak(BURAK, `select aciklama from posts where author_id=$1`, [AYSE]);
  assert.equal(paylasimlar.length, 0, 'başkasının paylaşımı sızdı');

  const sayac = await olarak(BURAK, `select * from sosyal_sayaclar($1)`, [AYSE]);
  assert.equal(sayac.length, 0, 'başkasının sayaçları sızdı');
});

test('YAYIMLANMAMIŞ KULLANICI KENDİ İÇERİĞİNİ GÖRÜYOR', async () => {
  await olarak(BURAK, `insert into posts(author_id, aciklama) values ($1,'Burak taslağı')`, [BURAK]);

  const kendi = await olarak(BURAK, `select aciklama from posts where author_id=$1`, [BURAK]);
  assert.equal(kendi.length, 1, 'sahibi kendi paylaşımını görmüyor');

  const sayac = await olarak(BURAK, `select * from sosyal_sayaclar($1)`, [BURAK]);
  assert.equal(sayac.length, 1, 'sahibi kendi sayacını görmüyor');
});

test('YENİDEN YAYIMLAYINCA AYNI ALANDAKİ İÇERİK GERİ GELİYOR', async () => {
  await olarak(BURAK, `update social_profiles set yayinda_mi=true where profile_id=$1`, [BURAK]);

  const profiller = await olarak(BURAK, `select username from social_profiles order by username`);
  assert.deepEqual(profiller.map((r) => r.username), ['ayse', 'burak'],
    'yayımlayınca aynı alandaki profil gelmedi');

  const paylasimlar = await olarak(BURAK, `select aciklama from posts where author_id=$1`, [AYSE]);
  assert.equal(paylasimlar.length, 1, 'yayımlayınca paylaşım gelmedi');

  /* Farklı alan yine kapalı: kural gevşemedi, simetrikleşti. */
  const cem = await olarak(BURAK, `select username from social_profiles where profile_id=$1`, [CEM]);
  assert.equal(cem.length, 0, 'farklı alandaki profil sızdı');
});

/* ==================================== 4) ARŞİV VE GÖRÜNMEYEN BEĞENİSİ */

test('GÖRÜNEN PAYLAŞIM BEĞENİLEBİLİYOR (kural gereğinden fazla sıkılmadı)', async () => {
  await olarak(BURAK, `insert into post_likes(post_id, user_id) values ($1,$2)`, [aysePost, BURAK]);
  const satir = await olarak(BURAK, `select post_id from post_likes where user_id=$1`, [BURAK]);
  assert.equal(satir.length, 1);
});

test('ARŞİVLENMİŞ PAYLAŞIM BEĞENİLEMİYOR VE KAYDEDİLEMİYOR', async () => {
  await olarak(AYSE, `update posts set archived_at = now() where id=$1`, [aysePost]);

  const gorur = await olarak(BURAK, `select id from posts where id=$1`, [aysePost]);
  assert.equal(gorur.length, 0, 'arşiv başkasına görünüyor');

  await olarak(BURAK, `delete from post_likes where user_id=$1`, [BURAK]);
  const begeni = await yazmayiDene(
    BURAK, `insert into post_likes(post_id, user_id) values ($1,$2)`, [aysePost, BURAK]
  );
  assert.ok(begeni, 'arşivlenmiş paylaşım beğenildi');

  const kayit = await yazmayiDene(
    BURAK, `insert into post_saves(post_id, user_id) values ($1,$2)`, [aysePost, BURAK]
  );
  assert.ok(kayit, 'arşivlenmiş paylaşım kaydedildi');

  await olarak(AYSE, `update posts set archived_at = null where id=$1`, [aysePost]);
});

test('GÖRÜNMEYEN PAYLAŞIM BEĞENİLEMİYOR', async () => {
  const hata = await yazmayiDene(
    CEM, `insert into post_likes(post_id, user_id) values ($1,$2)`, [aysePost, CEM]
  );
  assert.ok(hata, 'farklı alandaki paylaşım beğenildi');
});

/* ================================================ 5) SAVUNMA DERİNLİĞİ */

test('anon SOSYAL KATMAN TABLOLARINDA YETKİSİZ', async () => {
  for (const tablo of ['sectors', 'category_pool', 'social_profiles', 'posts']) {
    const yetki = await db.query(
      `select has_table_privilege('anon', $1, 'select') v`, [`public.${tablo}`]
    );
    assert.equal(yetki.rows[0].v, false, `anon ${tablo} üzerinde hâlâ yetkili`);
  }

  const sonuc = await anonOlarak('select id from sectors limit 1');
  assert.ok(sonuc.hata, 'anon alan listesini sorgulayabildi');
});

test('ALAN LİSTESİ GİRİŞ YAPMIŞ KULLANICIYA GELİYOR', async () => {
  const liste = await olarak(AYSE, `select ad from sectors where aktif order by sira`);
  assert.equal(liste.length, 23, 'C aşamasında sekiz alan eklendi: 23 satır');
  assert.equal(liste[0].ad, 'Tekstil, Moda ve Hazır Giyim');
});
