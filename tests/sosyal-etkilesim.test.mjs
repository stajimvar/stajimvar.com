import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  E AŞAMASI — BEĞENME, KAYDETME, KİŞİSEL LİSTELER, ARŞİV

  A–D'de kurulan garantiler burada YENİDEN KURULMUYOR; yalnız E'nin
  dayandığı davranışlar ölçülüyor.

  TEK SUNUCU DEĞİŞİKLİĞİ: `posts` SELECT politikası
  ---------------------------------------------------
  Politika `archived_at is null` şartını YAZARA DA uyguluyordu; yani
  kimse — sahibi dahil — arşivlenmiş paylaşımını okuyamıyordu ve arşiv
  ekranı sunucu tarafında imkânsızdı. Kalıp zaten depoda vardı:
  `post_media` politikası sahibine arşiv dahil izin veriyor. Aynı kural
  `posts` için de yazıldı.

  Genişleme YALNIZ yazar için. Başkası için hiçbir şey değişmiyor ve
  mevcut iki arşiv testi (kitle ve güvenlik dosyaları) bunu ölçmeye
  devam ediyor.
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
  '../supabase/migrations/20260923080000_baglanti_durumu_rpc.sql',
  '../supabase/migrations/20260923090000_talep_karar_aciklamasi.sql',
  '../supabase/migrations/20260924010000_paylasim_taslak_durumu.sql',
  '../supabase/migrations/20260924030000_paylasim_rpc.sql',
  '../supabase/migrations/20260924040000_avatar_yolu_yetkisi.sql',
  /* --- E --- */
  '../supabase/migrations/20260925010000_arsiv_sahibine_acik.sql',
  '../supabase/migrations/20260925020000_begeni_kimligi_gizli.sql',
].map((yol) => new URL(yol, import.meta.url));

const AYSE = '11111111-1111-4111-8111-111111111111';   // yazar
const BAGLI = '22222222-2222-4222-8222-222222222222';  // aynı alan, bağlantılı
const UZAK = '33333333-3333-4333-8333-333333333333';   // aynı alan, bağlantısız
const FARKLI = '44444444-4444-4444-8444-444444444444'; // başka alan

let db;
let bagPost;   // kitle = baglantilarim
let alanPost;  // kitle = alan-toplulugum

async function olarak(kimlik, sql, params = []) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${kimlik}'`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec('reset role; reset request.jwt.claim.sub');
  }
}

async function hata(kimlik, sql, params = []) {
  try {
    await olarak(kimlik, sql, params);
    return null;
  } catch (e) {
    return String(e.message || e);
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
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant execute on function public.is_admin() to anon, authenticated;
    grant select on public.profiles to authenticated;
  `);

  for (const dosya of DOSYALAR) await db.exec(await readFile(dosya, 'utf8'));

  await db.exec(`
    insert into auth.users values ('${AYSE}'),('${BAGLI}'),('${UZAK}'),('${FARKLI}');
    insert into public.profiles(id) values ('${AYSE}'),('${BAGLI}'),('${UZAK}'),('${FARKLI}');
  `);
  for (const kim of [AYSE, BAGLI, UZAK]) {
    await olarak(kim, `select sosyal_profil_kur($1,$2,true)`, [`k${kim.slice(0, 6)}`, 'bilgisayar-muhendisligi']);
  }
  await olarak(FARKLI, `select sosyal_profil_kur($1,$2,true)`, ['farkli1', 'moda-tasarimi']);

  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BAGLI]);
  await olarak(BAGLI, `update connections set durum='kabul' where requester_id=$1 and addressee_id=$2`, [AYSE, BAGLI]);

  const kur = async (anahtar, kitle) => {
    const [p] = await olarak(AYSE, `select * from sosyal_paylasim_baslat($1,$2,$3)`, [anahtar, 'not', kitle]);
    await olarak(AYSE, `select sosyal_paylasim_tamamla($1,$2::jsonb)`, [
      p.id,
      JSON.stringify([
        { sira: 1, storage_path: `${AYSE}/${p.id}/bir.jpg` },
        { sira: 2, storage_path: `${AYSE}/${p.id}/iki.jpg` },
      ]),
    ]);
    return p.id;
  };
  bagPost = await kur('00000000-0000-4000-8000-0000000000e1', 'baglantilarim');
  alanPost = await kur('00000000-0000-4000-8000-0000000000e2', 'alan-toplulugum');
});

/* ------------------------------------------------------------ BEĞENME */

test('beğeni tekil: aynı kullanıcı aynı paylaşımı iki kez beğenemiyor', async () => {
  await olarak(BAGLI, `insert into post_likes(post_id,user_id) values ($1,$2)`, [bagPost, BAGLI]);
  assert.ok(
    await hata(BAGLI, `insert into post_likes(post_id,user_id) values ($1,$2)`, [bagPost, BAGLI]),
    'ikinci beğeni birincil anahtarla reddedilmeli',
  );
  const [{ adet }] = await olarak(BAGLI, `select count(*)::int as adet from post_likes where post_id=$1`, [bagPost]);
  assert.equal(adet, 1);
});

test('beğeni geri alınabiliyor ve yeniden verilebiliyor', async () => {
  await olarak(BAGLI, `delete from post_likes where post_id=$1 and user_id=$2`, [bagPost, BAGLI]);
  let [{ adet }] = await olarak(BAGLI, `select count(*)::int as adet from post_likes where post_id=$1`, [bagPost]);
  assert.equal(adet, 0, 'beğeni kaldırılmalı');
  await olarak(BAGLI, `insert into post_likes(post_id,user_id) values ($1,$2)`, [bagPost, BAGLI]);
  [{ adet }] = await olarak(BAGLI, `select count(*)::int as adet from post_likes where post_id=$1`, [bagPost]);
  assert.equal(adet, 1, 'yeniden beğenilebilmeli');
});

test('görülemeyen paylaşım beğenilemiyor (bağlantısız ve farklı alan)', async () => {
  for (const kim of [UZAK, FARKLI]) {
    assert.ok(
      await hata(kim, `insert into post_likes(post_id,user_id) values ($1,$2)`, [bagPost, kim]),
      'erişimi olmayan beğenemez',
    );
  }
  assert.ok(
    await hata(FARKLI, `insert into post_likes(post_id,user_id) values ($1,$2)`, [alanPost, FARKLI]),
    'FARKLI ALAN alan-toplulugum paylaşımını da beğenemez',
  );
});

test('başkasının beğenisi silinemiyor', async () => {
  const silinen = await olarak(UZAK, `delete from post_likes where post_id=$1 and user_id=$2 returning post_id`, [bagPost, BAGLI]);
  assert.equal(silinen.length, 0, 'yalnız kendi beğenisini kaldırabilmeli');
});

/* ----------------------------------------------------------- KAYDETME */

test('kaydetme tamamen özel: sahibi bile başkasının kaydını göremiyor', async () => {
  await olarak(BAGLI, `insert into post_saves(post_id,user_id) values ($1,$2)`, [bagPost, BAGLI]);

  const sahibi = await olarak(AYSE, `select user_id from post_saves where post_id=$1`, [bagPost]);
  assert.equal(sahibi.length, 0, 'PAYLAŞIM SAHİBİ KAYDEDENLERİ GÖREMEMELİ');

  const baskasi = await olarak(UZAK, `select user_id from post_saves where post_id=$1`, [bagPost]);
  assert.equal(baskasi.length, 0, 'başkası kaydı göremez');

  const kendi = await olarak(BAGLI, `select user_id from post_saves where post_id=$1`, [bagPost]);
  assert.equal(kendi.length, 1, 'kendi kaydını görmeli');
});

test('görülemeyen paylaşım kaydedilemiyor', async () => {
  assert.ok(
    await hata(FARKLI, `insert into post_saves(post_id,user_id) values ($1,$2)`, [alanPost, FARKLI]),
    'farklı alan kaydedemez',
  );
});

/* -------------------------------------------------------------- ARŞİV */

test('arşiv YALNIZ sahibine açık', async () => {
  await olarak(AYSE, `update posts set archived_at=now() where id=$1`, [alanPost]);

  const sahibi = await olarak(AYSE, `select id, kitle from posts where id=$1`, [alanPost]);
  assert.equal(sahibi.length, 1, 'SAHİBİ ARŞİVİNİ GÖRMELİ — arşiv ekranı buna bağlı');

  for (const kim of [BAGLI, UZAK, FARKLI]) {
    const gorur = await olarak(kim, `select id from posts where id=$1`, [alanPost]);
    assert.equal(gorur.length, 0, 'arşiv başkasına görünmemeli');
  }
});

test('arşivlenmiş paylaşım normal ızgarada yok, arşiv sorgusunda var', async () => {
  const normal = await olarak(AYSE, `select id from posts where author_id=$1 and durum='hazir' and archived_at is null`, [AYSE]);
  const arsiv = await olarak(AYSE, `select id from posts where author_id=$1 and durum='hazir' and archived_at is not null`, [AYSE]);
  assert.ok(!normal.some((r) => r.id === alanPost), 'arşiv normal ızgarada görünmemeli');
  assert.ok(arsiv.some((r) => r.id === alanPost), 'arşiv sorgusunda görünmeli');
});

test('geri yükleme kitleyi ve fotoğraf sırasını koruyor', async () => {
  const [oncesi] = await olarak(AYSE, `select kitle from posts where id=$1`, [alanPost]);
  const siraOnce = (await olarak(AYSE, `select sira, storage_path from post_media where post_id=$1 order by sira`, [alanPost]));

  await olarak(AYSE, `update posts set archived_at=null where id=$1`, [alanPost]);

  const [sonrasi] = await olarak(AYSE, `select kitle, archived_at from posts where id=$1`, [alanPost]);
  const siraSonra = (await olarak(AYSE, `select sira, storage_path from post_media where post_id=$1 order by sira`, [alanPost]));

  assert.equal(sonrasi.archived_at, null, 'geri yüklenmeli');
  assert.equal(sonrasi.kitle, oncesi.kitle, 'KİTLE KORUNMALI');
  assert.deepEqual(siraSonra, siraOnce, 'FOTOĞRAF SIRASI KORUNMALI');

  const gorur = await olarak(UZAK, `select id from posts where id=$1`, [alanPost]);
  assert.equal(gorur.length, 1, 'geri yüklenince aynı alandaki yine görmeli');
});

/* ------------------------------------------------- BEĞENEN KİMLİĞİ GİZLİ */

/*
  ÖLÇÜLEN SIZINTI (gerçek yerel PostgREST ile kanıtlandı)

  `begeniler okunur` politikası üç dallıydı:
    user_id = auth.uid()
    or paylasim_sahibi(post_id) = auth.uid()
    or paylasim_gorunur(post_id)

  İkinci ve üçüncü dal BAŞKA KULLANICILARIN user_id değerini açıyordu:
    · paylaşım sahibi, beğenenin kimliğini okudu
    · ne sahibi ne beğenen olan bir izleyici de okudu

  Arayüzde "kimler beğendi" listesi hiç çizilmemişti ama veri katmanı
  soruyu cevaplıyordu. Politika artık yalnız KENDİ satırına açık; toplam
  sayı ayrı ve dar kapsamlı bir RPC'den geliyor.
*/

test('kullanıcı yalnız kendi beğeni satırını görüyor', async () => {
  await olarak(BAGLI, `insert into post_likes(post_id,user_id) values ($1,$2)`, [alanPost, BAGLI])
    .catch(() => {});
  const kendi = await olarak(BAGLI, `select user_id from post_likes where post_id=$1`, [alanPost]);
  assert.ok(kendi.every((r) => r.user_id === BAGLI), 'yalnız kendi satırı dönmeli');
  assert.equal(kendi.length, 1);
});

test('başkasının ve SAHİBİN beğenen kimliğini görmesi kapandı', async () => {
  /* UZAK aynı alandan, paylaşımı görüyor ama beğenenin kimliğini görmemeli. */
  const izleyici = await olarak(UZAK, `select user_id from post_likes where post_id=$1`, [alanPost]);
  assert.equal(izleyici.length, 0, 'İZLEYİCİ BEĞENEN KİMLİĞİNİ GÖREMEMELİ');

  /* AYSE paylaşımın SAHİBİ; sahiplik artık ayrıcalık değil. */
  const sahibi = await olarak(AYSE, `select user_id from post_likes where post_id=$1 and user_id<>$2`, [alanPost, AYSE]);
  assert.equal(sahibi.length, 0, 'PAYLAŞIM SAHİBİ DE BEĞENENLERİ GÖREMEMELİ');
});

test('yetkili kullanıcı gerçek toplam sayıyı RPC ile alıyor', async () => {
  const [satir] = await olarak(UZAK, `select * from paylasim_begeni_sayisi($1)`, [alanPost]);
  assert.equal(satir.adet, 1, 'sayı gerçek veriden gelmeli');
  /* RPC kimlik döndürmüyor: yalnız tek kolon. */
  assert.deepEqual(Object.keys(satir), ['adet']);
});

test('yetkisiz kullanıcı sayıyı hiç alamıyor (sıfır satır, sahte 0 değil)', async () => {
  const farkli = await olarak(FARKLI, `select * from paylasim_begeni_sayisi($1)`, [alanPost]);
  assert.equal(farkli.length, 0, 'FARKLI ALAN SATIR ALMAMALI');

  await olarak(AYSE, `update posts set archived_at=now() where id=$1`, [alanPost]);
  const arsivde = await olarak(UZAK, `select * from paylasim_begeni_sayisi($1)`, [alanPost]);
  assert.equal(arsivde.length, 0, 'ARŞİVLENİNCE SAYI DA ALINAMAMALI');
  await olarak(AYSE, `update posts set archived_at=null where id=$1`, [alanPost]);
});

test('istemci durum ve yazar kimliğini değiştiremiyor (arşiv yolu genişlemedi)', async () => {
  assert.ok(
    await hata(AYSE, `update posts set durum='taslak' where id=$1`, [alanPost]),
    'durum kolonu istemciye kapalı kalmalı',
  );
  const baskasininArsivi = await olarak(BAGLI, `update posts set archived_at=now() where id=$1 returning id`, [alanPost]);
  assert.equal(baskasininArsivi.length, 0, 'başkası paylaşımı arşivleyemez');
});
