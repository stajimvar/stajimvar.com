import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  SOSYAL DEPOLAMA (D aşaması)

  OKUMA YETKİSİ PAYLAŞIMIN KİTLESİYLE AYNI KAPIDAN GEÇİYOR
  --------------------------------------------------------
  Paylaşım satırını gizleyip görselini açık bırakmak, paylaşımı hiç
  gizlememektir: dosya adresi bir kez sızınca içerik sızmış olur. Bu
  yüzden Storage okuma politikası kendi kuralını YAZMIYOR,
  `sosyal_gizli.paylasim_gorunur()` çağırıyor — posts, post_media,
  post_likes, post_saves ile aynı fonksiyon.

  Sonucu: kitle kuralı, arşiv ve taslak durumu değiştiğinde dosya
  erişimi kendiliğinden değişiyor; iki yerde ayrışamıyor.

  YOL TAHMİN EDİLEMEZ AMA SAHİPLİK TAŞIR
  --------------------------------------
    sosyal-paylasim/<yazar>/<post>/<rastgele>.jpg
  Birinci klasör sahipliği politikada zorlanabilir kılıyor, ikinci
  klasör dosyadan paylaşıma tek adımda ulaştırıyor, rastgele ad ise
  hem yolu tahmin edilemez yapıyor hem kullanıcının dosya adındaki
  bilgiyi (ad, tarih, konum) yola taşımıyor.
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
  '../supabase/migrations/20260924020000_sosyal_depolama.sql',
  '../supabase/migrations/20260924030000_paylasim_rpc.sql',
  '../supabase/migrations/20260924040000_avatar_yolu_yetkisi.sql',
].map((yol) => new URL(yol, import.meta.url));

const AYSE = '11111111-1111-4111-8111-111111111111';       // yazar
const BAGLI = '22222222-2222-4222-8222-222222222222';      // aynı alan, bağlantılı
const UZAK = '33333333-3333-4333-8333-333333333333';       // aynı alan, bağlantısız
const FARKLI = '44444444-4444-4444-8444-444444444444';     // başka alan

let db;
let baglantiPost;   // kitle = baglantilarim, hazır
let alanPost;       // kitle = alan-toplulugum, hazır
let taslakPost;     // hâlâ yükleniyor

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

/** Bakanın o dosyayı Storage üzerinden okuyup okuyamadığı. */
const okuyabilir = async (bakan, yol) =>
  (await olarak(bakan, `select name from storage.objects where name = $1`, [yol])).length === 1;

const yol = (yazar, post, ad) => `${yazar}/${post}/${ad}`;

before(async () => {
  db = new PGlite();

  /*
    STORAGE ŞEMASI TAKLİDİ

    PGlite'ta Supabase'in storage şeması yok. Politikaların MANTIĞINI
    ölçmek için tablo ve yardımcı burada asgari biçimde kuruluyor;
    `foldername` gerçeğiyle aynı davranıyor (yolu '/' ile bölüp son
    parçayı — dosya adını — atıyor).
  */
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

    create schema storage;
    create table storage.buckets(
      id text primary key, name text not null, public boolean not null default false,
      file_size_limit bigint, allowed_mime_types text[]
    );
    create table storage.objects(
      id uuid primary key default gen_random_uuid(),
      bucket_id text not null references storage.buckets(id),
      name text not null,
      owner uuid,
      unique (bucket_id, name)
    );
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[]
      language sql immutable as $$
        select (string_to_array(name, '/'))[1:array_length(string_to_array(name,'/'),1)-1]
      $$;

    grant usage on schema auth, public, storage to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant execute on function public.is_admin() to anon, authenticated;
    grant execute on function storage.foldername(text) to anon, authenticated;
    grant select on public.profiles to authenticated;
    grant select, insert, update, delete on storage.objects to authenticated;
    grant select on storage.buckets to authenticated;
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

  const kur = async (anahtar, kitle, tamamla = true) => {
    const [p] = await olarak(AYSE, `select * from sosyal_paylasim_baslat($1,$2,$3)`, [anahtar, 'not', kitle]);
    await olarak(AYSE, `insert into storage.objects(bucket_id, name, owner) values ('sosyal-paylasim',$1,$2)`,
      [yol(AYSE, p.id, 'a.jpg'), AYSE]);
    if (tamamla) {
      await olarak(AYSE, `select sosyal_paylasim_tamamla($1,$2::jsonb)`,
        [p.id, JSON.stringify([{ sira: 1, storage_path: yol(AYSE, p.id, 'a.jpg') }])]);
    }
    return p.id;
  };

  baglantiPost = await kur('00000000-0000-4000-8000-0000000000b1', 'baglantilarim');
  alanPost = await kur('00000000-0000-4000-8000-0000000000a1', 'alan-toplulugum');
  taslakPost = await kur('00000000-0000-4000-8000-0000000000d1', 'alan-toplulugum', false);
});

test('kovalar private ve yalnız üç görsel türünü kabul ediyor', async () => {
  const kovalar = (await db.query(
    `select id, public, file_size_limit, allowed_mime_types from storage.buckets
      where id in ('sosyal-paylasim','sosyal-avatar') order by id`,
  )).rows;
  assert.equal(kovalar.length, 2, 'iki kova da olmalı');
  for (const k of kovalar) {
    assert.equal(k.public, false, `${k.id} PRIVATE olmalı — kalıcı herkese açık URL yok`);
    assert.ok(Number(k.file_size_limit) > 0, `${k.id} boyut sınırı taşımalı`);
    assert.deepEqual(
      [...k.allowed_mime_types].sort(),
      ['image/jpeg', 'image/png', 'image/webp'],
      `${k.id}: GIF, SVG ve video kovaya hiç girememeli`,
    );
  }
});

test('kullanıcı yalnız kendi klasörüne yükleyebiliyor', async () => {
  assert.equal(
    await hata(BAGLI, `insert into storage.objects(bucket_id,name,owner) values ('sosyal-paylasim',$1,$2)`,
      [yol(BAGLI, baglantiPost, 'kendi.jpg'), BAGLI]),
    null,
    'kendi klasörüne yükleyebilmeli',
  );
  assert.ok(
    await hata(BAGLI, `insert into storage.objects(bucket_id,name,owner) values ('sosyal-paylasim',$1,$2)`,
      [yol(AYSE, baglantiPost, 'sahte.jpg'), BAGLI]),
    'BAŞKASININ KLASÖRÜNE YÜKLEME REDDEDİLMELİ',
  );
});

test('başkasının dosyası değiştirilemiyor ve silinemiyor', async () => {
  const hedef = yol(AYSE, baglantiPost, 'a.jpg');
  const guncelle = await hata(BAGLI, `update storage.objects set name = name where name = $1`, [hedef]);
  const silinen = await olarak(BAGLI, `delete from storage.objects where name = $1 returning name`, [hedef]);
  assert.equal(silinen.length, 0, 'BAŞKASININ DOSYASI SİLİNEMEMELİ');
  assert.ok(guncelle === null || guncelle.length > 0);
  const duruyor = await olarak(AYSE, `select name from storage.objects where name=$1`, [hedef]);
  assert.equal(duruyor.length, 1, 'dosya yerinde durmalı');
});

test('baglantilarim: dosyayı yalnız kabul edilmiş bağlantı okuyabiliyor', async () => {
  const dosya = yol(AYSE, baglantiPost, 'a.jpg');
  assert.equal(await okuyabilir(AYSE, dosya), true, 'sahibi kendi dosyasını görmeli');
  assert.equal(await okuyabilir(BAGLI, dosya), true, 'bağlantı görmeli');
  assert.equal(await okuyabilir(UZAK, dosya), false, 'AYNI ALAN AMA BAĞLANTISIZ DOSYAYI GÖRMEMELİ');
  assert.equal(await okuyabilir(FARKLI, dosya), false, 'farklı alan görmemeli');
});

test('alan-toplulugum: aynı alan okuyor, farklı alan okuyamıyor', async () => {
  const dosya = yol(AYSE, alanPost, 'a.jpg');
  assert.equal(await okuyabilir(UZAK, dosya), true, 'aynı alandan katılmış öğrenci görmeli');
  assert.equal(await okuyabilir(FARKLI, dosya), false, 'FARKLI ALAN İKİ KİTLEDE DE GÖREMEMELİ');
});

test('taslağın dosyası başkasına görünmüyor', async () => {
  const dosya = yol(AYSE, taslakPost, 'a.jpg');
  assert.equal(await okuyabilir(AYSE, dosya), true, 'yazar kendi taslağının dosyasını görmeli');
  assert.equal(await okuyabilir(UZAK, dosya), false, 'YARIM YÜKLEMENİN DOSYASI SIZMAMALI');
});

test('arşivlenince ziyaretçi dosyayı okuyamıyor', async () => {
  const dosya = yol(AYSE, alanPost, 'a.jpg');
  assert.equal(await okuyabilir(UZAK, dosya), true, 'arşivden önce görünüyordu');
  await olarak(AYSE, `update posts set archived_at = now() where id = $1`, [alanPost]);
  assert.equal(await okuyabilir(UZAK, dosya), false, 'ARŞİV SONRASI DOSYA DA KAPANMALI');
  assert.equal(await okuyabilir(AYSE, dosya), true, 'sahibinin verisi korunmalı');
});

test('profil fotoğrafını yalnız sahibi yazabiliyor', async () => {
  assert.equal(
    await hata(AYSE, `insert into storage.objects(bucket_id,name,owner) values ('sosyal-avatar',$1,$2)`,
      [`${AYSE}/avatar.jpg`, AYSE]),
    null,
    'sahibi kendi avatarını yükleyebilmeli',
  );
  assert.ok(
    await hata(BAGLI, `insert into storage.objects(bucket_id,name,owner) values ('sosyal-avatar',$1,$2)`,
      [`${AYSE}/sahte.jpg`, BAGLI]),
    'BAŞKASI PROFİL FOTOĞRAFI YAZAMAMALI',
  );
  const silinen = await olarak(BAGLI, `delete from storage.objects where name=$1 returning name`, [`${AYSE}/avatar.jpg`]);
  assert.equal(silinen.length, 0, 'başkası avatarı silememeli');
});

test('avatar yolu kendi klasörünü göstermek zorunda', async () => {
  /*
    Kolon yetkisi tek başına yetmiyordu: serbest metne BAŞKASININ yolu
    yazılabilirdi. Sızıntı değil ama kimlik taklidi olurdu — başkasının
    fotoğrafı kendi profilinde görünürdü.
  */
  assert.equal(
    await hata(AYSE, `update social_profiles set avatar_path=$1 where profile_id=$2`,
      [`${AYSE}/kendi.jpg`, AYSE]),
    null,
    'sahibi kendi klasöründeki yolu yazabilmeli',
  );
  assert.ok(
    await hata(AYSE, `update social_profiles set avatar_path=$1 where profile_id=$2`,
      [`${BAGLI}/baskasi.jpg`, AYSE]),
    'BAŞKASININ KLASÖRÜNDEKİ YOL KABUL EDİLMEMELİ',
  );
  const yazilan = await olarak(BAGLI, `update social_profiles set avatar_path=$1 where profile_id=$2 returning profile_id`,
    [`${BAGLI}/x.jpg`, AYSE]);
  assert.equal(yazilan.length, 0, 'başkasının satırı güncellenememeli');
});
