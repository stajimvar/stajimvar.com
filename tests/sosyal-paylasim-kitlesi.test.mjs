import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  PAYLAŞIM KİTLESİ

  İki kitle var ve varsayılan DAR olan:

    baglantilarim    yalnız karşılıklı bağlantı kurduğum kişiler
    alan-toplulugum  aynı alandaki yayımlanmış herkes

  ALAN SINIRI İKİSİNİN DE ÜSTÜNDE. "Alan topluluğum" kitleyi
  genişletmiyor, alan içinde daraltmayı kaldırıyor; farklı alandaki
  kullanıcı iki durumda da göremiyor.

  Kural TEK yardımcıdan (`paylasim_gorunur`) geçiyor ve DÖRT tabloda
  birden uygulanıyor: `posts`, `post_media`, `post_likes`, `post_saves`.
  Biri unutulsaydı sızıntı sessiz olurdu — bir paylaşımın kendisi
  görünmezken görseli ya da beğenileri görünürdü.

  SAYAÇ DA AYNI KAPIDAN GEÇİYOR: gösterilen sayı, bakan kişinin
  gerçekten görebildiği paylaşım sayısı.
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
  '../supabase/migrations/20260923050000_bolum_talebi.sql',
  '../supabase/migrations/20260923060000_talep_kuyrugu_karari.sql',
  '../supabase/migrations/20260923070000_paylasim_kitlesi_ve_sayac.sql',
].map((yol) => new URL(yol, import.meta.url));

/* AYSE yazar. BAGLI aynı alanda ve bağlantılı. UZAK aynı alanda ama
   bağlantısız. FARKLI başka alanda. KATILMAMIS topluluğa katılmamış. */
const AYSE = '11111111-1111-4111-8111-111111111111';
const BAGLI = '22222222-2222-4222-8222-222222222222';
const UZAK = '33333333-3333-4333-8333-333333333333';
const FARKLI = '44444444-4444-4444-8444-444444444444';
const KATILMAMIS = '55555555-5555-4555-8555-555555555555';

let db;
let baglantiPost;
let alanPost;

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

const tekil = async (sql, params = []) => (await db.query(sql, params)).rows;

/** Bakanın gördüğü paylaşım sayısı ile sayacın söylediği sayı. */
async function gorunenVeSayac(bakan, hedef) {
  const gorunen = await olarak(bakan, `select id from posts where author_id=$1`, [hedef]);
  const sayac = await olarak(bakan, `select * from sosyal_sayaclar($1)`, [hedef]);
  return { gorunen: gorunen.length, sayac: sayac.length ? sayac[0].paylasim : null, satir: sayac.length };
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
    insert into auth.users values ('${AYSE}'),('${BAGLI}'),('${UZAK}'),('${FARKLI}'),('${KATILMAMIS}');
    insert into public.profiles(id) values
      ('${AYSE}'),('${BAGLI}'),('${UZAK}'),('${FARKLI}'),('${KATILMAMIS}');
  `);

  /* Kurulum RPC-si ile: alan bölümden türüyor. */
  for (const [kim, ad, bolum, yayimla] of [
    [AYSE, 'ayse', 'giyim-uretim-teknolojisi', true],
    [BAGLI, 'bagli', 'moda-tasarimi', true],
    [UZAK, 'uzak', 'giyim-uretim-teknolojisi', true],
    [FARKLI, 'farkli', 'hukuk', true],
    [KATILMAMIS, 'katilmamis', 'moda-tasarimi', false],
  ]) {
    await olarak(kim, `select sosyal_profil_kur($1,$2,$3)`, [ad, bolum, yayimla]);
  }

  /* Karşılıklı bağlantı: AYSE ↔ BAGLI */
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BAGLI]);
  await olarak(BAGLI, `update connections set durum='kabul' where addressee_id=$1`, [BAGLI]);

  const b = await db.query(
    `insert into posts(author_id, aciklama, kitle) values ($1,'bağlantı paylaşımı','baglantilarim') returning id`,
    [AYSE]);
  baglantiPost = b.rows[0].id;

  const a = await db.query(
    `insert into posts(author_id, aciklama, kitle) values ($1,'alan paylaşımı','alan-toplulugum') returning id`,
    [AYSE]);
  alanPost = a.rows[0].id;

  /* `sira` 1..10 arası (şema kısıtı). */
  await db.query(`insert into post_media(post_id, storage_path, sira) values ($1,'a.jpg',1),($2,'b.jpg',1)`,
    [baglantiPost, alanPost]);
});

after(async () => {
  await db?.close();
});

/* ================================================== KOLON VE VARSAYILAN */

test('kitle kolonu var, varsayılanı DAR olan', async () => {
  const kolon = await tekil(
    `select column_default, is_nullable from information_schema.columns
      where table_schema='public' and table_name='posts' and column_name='kitle'`);
  assert.equal(kolon.length, 1, 'kitle kolonu yok');
  assert.match(kolon[0].column_default, /baglantilarim/);
  assert.equal(kolon[0].is_nullable, 'NO');
});

test('kolon eklenirken var olan satırlar dar kitleye düştü', async () => {
  /* Göç öncesi açılmış satır yok; kural yine de göçün güvencesi. */
  const kacak = await tekil(`select count(*)::int n from posts where kitle <> 'baglantilarim' and kitle <> 'alan-toplulugum'`);
  assert.equal(kacak[0].n, 0);
});

test('geçersiz kitle değeri reddediliyor', async () => {
  let hata = null;
  try {
    await db.query(`insert into posts(author_id, aciklama, kitle) values ($1,'x','herkes')`, [AYSE]);
  } catch (e) { hata = String(e.message || e); }
  assert.match(String(hata), /check|kitle/i);
});

/* ============================================== BAGLANTILARIM KİTLESİ */

test('BAGLI paylaşımı, görselini ve beğenilerini görüyor', async () => {
  const post = await olarak(BAGLI, `select id from posts where id=$1`, [baglantiPost]);
  assert.equal(post.length, 1, 'bağlantı paylaşımı görünmüyor');

  const gorsel = await olarak(BAGLI, `select post_id from post_media where post_id=$1`, [baglantiPost]);
  assert.equal(gorsel.length, 1, 'görsel görünmüyor');

  await olarak(BAGLI, `insert into post_likes(post_id, user_id) values ($1,$2)`, [baglantiPost, BAGLI]);
  const begeni = await olarak(BAGLI, `select post_id from post_likes where post_id=$1`, [baglantiPost]);
  assert.equal(begeni.length, 1);
});

test('UZAK (aynı alan, bağlantı YOK) dar kitleli paylaşımı GÖREMİYOR', async () => {
  const post = await olarak(UZAK, `select id from posts where id=$1`, [baglantiPost]);
  assert.equal(post.length, 0, 'dar kitleli paylaşım bağlantısıza sızdı');
});

test('UZAK paylaşımın GÖRSELİNİ de göremiyor', async () => {
  const gorsel = await olarak(UZAK, `select post_id from post_media where post_id=$1`, [baglantiPost]);
  assert.equal(gorsel.length, 0, 'görsel sızdı — kural dört tabloda uygulanmamış');
});

test('UZAK dar kitleli paylaşımı BEĞENEMİYOR ve KAYDEDEMİYOR', async () => {
  const begeni = await yazmayiDene(
    UZAK, `insert into post_likes(post_id, user_id) values ($1,$2)`, [baglantiPost, UZAK]);
  assert.ok(begeni, 'görmediği paylaşımı beğendi');

  const kayit = await yazmayiDene(
    UZAK, `insert into post_saves(post_id, user_id) values ($1,$2)`, [baglantiPost, UZAK]);
  assert.ok(kayit, 'görmediği paylaşımı kaydetti');
});

/* ============================================ ALAN TOPLULUĞU KİTLESİ */

test('UZAK geniş kitleli paylaşımı GÖRÜYOR', async () => {
  const post = await olarak(UZAK, `select id from posts where id=$1`, [alanPost]);
  assert.equal(post.length, 1, 'alan topluluğu paylaşımı aynı alandan görünmüyor');

  const gorsel = await olarak(UZAK, `select post_id from post_media where post_id=$1`, [alanPost]);
  assert.equal(gorsel.length, 1);
});

test('FARKLI ALAN İKİ KİTLEDE DE GÖREMİYOR', async () => {
  for (const [ad, post] of [['bağlantılarım', baglantiPost], ['alan topluluğum', alanPost]]) {
    const satir = await olarak(FARKLI, `select id from posts where id=$1`, [post]);
    assert.equal(satir.length, 0, `farklı alan ${ad} kitlesini gördü`);

    const gorsel = await olarak(FARKLI, `select post_id from post_media where post_id=$1`, [post]);
    assert.equal(gorsel.length, 0, `farklı alan ${ad} görselini gördü`);
  }
});

test('TOPLULUĞA KATILMAMIŞ kullanıcı iki kitlede de göremiyor', async () => {
  for (const post of [baglantiPost, alanPost]) {
    const satir = await olarak(KATILMAMIS, `select id from posts where id=$1`, [post]);
    assert.equal(satir.length, 0, 'katılmamış kullanıcı içerik gördü');
  }
});

test('sahibi kendi paylaşımlarının hepsini görüyor', async () => {
  const hepsi = await olarak(AYSE, `select id from posts where author_id=$1`, [AYSE]);
  assert.equal(hepsi.length, 2);
});

/* ======================================================== ARŞİV */

test('arşivlenmiş paylaşım iki kitlede de görünmüyor ve beğenilemiyor', async () => {
  await olarak(AYSE, `update posts set archived_at=now() where id=$1`, [alanPost]);

  for (const kim of [BAGLI, UZAK]) {
    const satir = await olarak(kim, `select id from posts where id=$1`, [alanPost]);
    assert.equal(satir.length, 0, 'arşiv görünüyor');
  }
  const begeni = await yazmayiDene(
    UZAK, `insert into post_likes(post_id, user_id) values ($1,$2)`, [alanPost, UZAK]);
  assert.ok(begeni, 'arşivlenmiş paylaşım beğenildi');

  await olarak(AYSE, `update posts set archived_at=null where id=$1`, [alanPost]);
});

/* ======================================================== SAYAÇ */

test('SAYAÇ: sahibi kendi arşivlenmemiş paylaşımlarının tamamını sayıyor', async () => {
  const { gorunen, sayac } = await gorunenVeSayac(AYSE, AYSE);
  assert.equal(sayac, 2);
  assert.equal(sayac, gorunen, 'sayaç gösterilen içerikle tutmuyor');
});

test('SAYAÇ: bağlantısı olan iki kitleyi de sayıyor', async () => {
  const { gorunen, sayac } = await gorunenVeSayac(BAGLI, AYSE);
  assert.equal(sayac, 2);
  assert.equal(sayac, gorunen);
});

test('SAYAÇ: bağlantısı olmayan yalnız alan topluluğunu sayıyor', async () => {
  const { gorunen, sayac } = await gorunenVeSayac(UZAK, AYSE);
  assert.equal(sayac, 1, 'bağlantısız kullanıcı dar kitleyi de saydı');
  assert.equal(sayac, gorunen);
});

test('SAYAÇ: farklı alan ve katılmamış SIFIR SATIR alıyor, 0 uydurulmuyor', async () => {
  for (const kim of [FARKLI, KATILMAMIS]) {
    const { satir, sayac } = await gorunenVeSayac(kim, AYSE);
    assert.equal(satir, 0, 'sıfır satır yerine sayı döndü');
    assert.equal(sayac, null);
  }
});

test('SAYAÇ: arşivlenen paylaşım sayıdan düşüyor', async () => {
  await olarak(AYSE, `update posts set archived_at=now() where id=$1`, [alanPost]);
  const { gorunen, sayac } = await gorunenVeSayac(BAGLI, AYSE);
  assert.equal(sayac, 1);
  assert.equal(sayac, gorunen);
  await olarak(AYSE, `update posts set archived_at=null where id=$1`, [alanPost]);
});

test('bağlantı sayısı kitleden etkilenmiyor', async () => {
  const sayac = await olarak(BAGLI, `select * from sosyal_sayaclar($1)`, [AYSE]);
  assert.equal(sayac[0].baglanti, 1);
});

/* ================================================ YARDIMCILAR GİZLİ */

test('kitle yardımcıları PostgREST-e kapalı gizli şemada', async () => {
  const acikta = await tekil(
    `select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname in ('baglanti_var','paylasim_gorunur')`);
  assert.deepEqual(acikta.map((r) => r.proname), [], 'yardımcı public şemada — /rpc olarak açılır');

  const gizli = await tekil(
    `select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='sosyal_gizli' and p.proname in ('baglanti_var','paylasim_gorunur')
      order by p.proname`);
  assert.deepEqual(gizli.map((r) => r.proname), ['baglanti_var', 'paylasim_gorunur']);
});
