import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  PROFİL KAPAĞI VE KATILMA TARİHİ (20261105010000)

  Kapak avatarın kalıbını birebir izliyor: private kova, yalnız kendi
  klasörüne yazma, yol kilidi ve avatarla AYNI okuma kapısı. Katılma
  tarihi ise `social_profiles.created_at` — göç onu hesabın tarihine
  çekiyor, çünkü toplu doldurulan satırlarda değer satırın açıldığı
  andı, hesabın değil.

  Storage şeması `sosyal-depolama.test.mjs`deki asgari taklitle aynı.
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

const GOC = new URL(
  '../supabase/migrations/20261105010000_profil_kapagi_ve_katilma_tarihi.sql',
  import.meta.url,
);

const AYSE = '11111111-1111-4111-8111-111111111111';   // kapağın sahibi
const UZAK = '33333333-3333-4333-8333-333333333333';   // aynı alan, profil görünür
const FARKLI = '44444444-4444-4444-8444-444444444444'; // başka alan, profil kapalı
const YENI = '55555555-5555-4555-8555-555555555555';   // göçten SONRA satırı açılan

let db;

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

const okuyabilir = async (bakan, yol) =>
  (await olarak(bakan, `select name from storage.objects where bucket_id='sosyal-kapak' and name = $1`, [yol]))
    .length === 1;

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
      role text not null default 'student',
      created_at timestamptz not null default now()
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

  /* Hesaplar Ağustos'ta açıldı; sosyal satırlar göçten ÖNCE, bugün (toplu doldurma). */
  await db.exec(`
    insert into auth.users values ('${AYSE}'),('${UZAK}'),('${FARKLI}'),('${YENI}');
    insert into public.profiles(id, created_at) values
      ('${AYSE}',   '2026-08-18T16:32:56Z'),
      ('${UZAK}',   '2026-08-24T13:57:48Z'),
      ('${FARKLI}', '2026-08-25T20:18:15Z'),
      ('${YENI}',   '2026-08-27T14:06:20Z');
  `);
  await olarak(AYSE, `select sosyal_profil_kur($1,$2,true)`, ['ayse01', 'bilgisayar-muhendisligi']);
  await olarak(UZAK, `select sosyal_profil_kur($1,$2,true)`, ['uzak01', 'bilgisayar-muhendisligi']);
  await olarak(FARKLI, `select sosyal_profil_kur($1,$2,true)`, ['farkli1', 'moda-tasarimi']);
  /* Bu satırın güncelleme anı sabitleniyor: göç onu değiştirmemeli. */
  await db.exec(`
    alter table public.social_profiles disable trigger social_profiles_updated_at;
    update public.social_profiles set updated_at = '2026-09-12T00:00:00Z';
    alter table public.social_profiles enable trigger social_profiles_updated_at;
  `);

  await db.exec(await readFile(GOC, 'utf8'));

  /* Göçten SONRA açılan satır: eklemedeki tetikleyici ölçülüyor. */
  await olarak(YENI, `select sosyal_profil_kur($1,$2,true)`, ['yeni01', 'bilgisayar-muhendisligi']);
});

test('kapak kovası private ve avatarla aynı üç türü kabul ediyor', async () => {
  const [k] = (await db.query(
    `select public, file_size_limit, allowed_mime_types from storage.buckets where id='sosyal-kapak'`,
  )).rows;
  assert.ok(k, 'sosyal-kapak kovası olmalı');
  assert.equal(k.public, false, 'kova PRIVATE olmalı — kalıcı herkese açık adres yok');
  assert.equal(Number(k.file_size_limit), 2097152);
  assert.deepEqual([...k.allowed_mime_types].sort(), ['image/jpeg', 'image/png', 'image/webp']);
});

test('kapağı yalnız sahibi yükleyip silebiliyor', async () => {
  assert.equal(
    await hata(AYSE, `insert into storage.objects(bucket_id,name,owner) values ('sosyal-kapak',$1,$2)`,
      [`${AYSE}/kapak.jpg`, AYSE]),
    null,
    'sahibi kendi klasörüne yükleyebilmeli',
  );
  assert.ok(
    await hata(UZAK, `insert into storage.objects(bucket_id,name,owner) values ('sosyal-kapak',$1,$2)`,
      [`${AYSE}/sahte.jpg`, UZAK]),
    'BAŞKASININ KLASÖRÜNE KAPAK YÜKLENEMEMELİ',
  );
  const silinen = await olarak(UZAK, `delete from storage.objects where name=$1 returning name`, [`${AYSE}/kapak.jpg`]);
  assert.equal(silinen.length, 0, 'başkası kapağı silememeli');
});

test('kapak dosyası profille aynı kapıdan okunuyor', async () => {
  assert.equal(await okuyabilir(AYSE, `${AYSE}/kapak.jpg`), true, 'sahibi görmeli');
  assert.equal(await okuyabilir(UZAK, `${AYSE}/kapak.jpg`), true, 'profili görebilen kapağı da görmeli');
  assert.equal(await okuyabilir(FARKLI, `${AYSE}/kapak.jpg`), false, 'PROFİLİ GÖREMEYEN KAPAĞI DA GÖRMEMELİ');
});

test('kapak yolu kendi klasörünü göstermek zorunda', async () => {
  assert.equal(
    await hata(AYSE, `update social_profiles set kapak_path=$1 where profile_id=$2`, [`${AYSE}/kapak.jpg`, AYSE]),
    null,
    'sahibi kendi yolunu yazabilmeli',
  );
  const red = await hata(AYSE, `update social_profiles set kapak_path=$1 where profile_id=$2`,
    [`${UZAK}/baskasi.jpg`, AYSE]);
  assert.match(red ?? '', /kapak-yolu-kendi-klasorunde-olmali/, 'BAŞKASININ YOLU KABUL EDİLMEMELİ');
  assert.equal(
    await hata(AYSE, `update social_profiles set kapak_path=null where profile_id=$1`, [AYSE]),
    null,
    'kaldırmak (null) meşru',
  );
  const yazilan = await olarak(UZAK, `update social_profiles set kapak_path=$1 where profile_id=$2 returning profile_id`,
    [`${UZAK}/x.jpg`, AYSE]);
  assert.equal(yazilan.length, 0, 'başkasının satırı güncellenememeli');
});

test('katılma tarihi hesabın tarihi; kullanıcı yazamıyor', async () => {
  const satirlar = (await db.query(
    `select sp.profile_id, sp.created_at = p.created_at esit, sp.updated_at
       from social_profiles sp join profiles p on p.id = sp.profile_id order by sp.profile_id`,
  )).rows;
  for (const s of satirlar) {
    assert.equal(s.esit, true, `${s.profile_id}: created_at hesabın tarihine çekilmeli`);
  }
  /* AYSE'nin satırına yukarıdaki testler kapak yazdı; onun `updated_at`i meşru olarak değişti. */
  const eski = satirlar.filter((s) => s.profile_id === UZAK || s.profile_id === FARKLI);
  assert.equal(eski.length, 2);
  for (const s of eski) {
    assert.equal(new Date(s.updated_at).toISOString(), '2026-09-12T00:00:00.000Z', 'düzeltme updated_at izini bırakmamalı');
  }
  assert.ok(
    await hata(AYSE, `update social_profiles set created_at='2020-01-01' where profile_id=$1`, [AYSE]),
    'KATILMA TARİHİ İSTEMCİDEN GERİYE ÇEKİLEMEMELİ',
  );
});
