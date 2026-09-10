import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  PAYLAŞIM OLUŞTURMA AKIŞI (D aşaması)

  YARIM YÜKLEME GÖRÜNÜR PAYLAŞIM BIRAKMAMALI
  ------------------------------------------
  Fotoğraflar Storage'a tek tek yükleniyor; üçüncüsünde ağ koparsa
  ortada iki dosyalı bir "paylaşım" kalır. Bunu önlemek için satır
  `taslak` doğuyor ve yalnız bütün dosyalar yazıldıktan sonra
  `tamamla` RPC'si onu `hazir` yapıyor. Yazar dışında kimse taslağı
  göremiyor.

  ÇİFT TIKLAMA TEK PAYLAŞIM
  -------------------------
  İstemci her oluşturma denemesi için bir anahtar üretiyor; aynı
  anahtar ikinci kez geldiğinde yeni satır AÇILMIYOR, mevcut taslak
  dönüyor. Kilit arayüzde de var ama tek savunma olamaz: ağ tekrarı
  ve yeniden deneme arayüzden geçmiyor.

  SIRA VERİTABANINDA
  ------------------
  Kapak = ilk fotoğraf. Sıra istemcinin diziyi nasıl gönderdiğine
  değil `post_media.sira` kolonuna bağlı.
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
  /* --- D --- */
  '../supabase/migrations/20260924010000_paylasim_taslak_durumu.sql',
  '../supabase/migrations/20260924030000_paylasim_rpc.sql',
].map((yol) => new URL(yol, import.meta.url));

const AYSE = '11111111-1111-4111-8111-111111111111';
const BAGLI = '22222222-2222-4222-8222-222222222222';
const KATILMAMIS = '55555555-5555-4555-8555-555555555555';

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

/** Belirli sayıda geçerli medya girdisi üretir. */
const medya = (postId, sahip, adet) =>
  JSON.stringify(
    Array.from({ length: adet }, (_, i) => ({
      sira: i + 1,
      storage_path: `${sahip}/${postId}/foto-${i + 1}.jpg`,
    })),
  );

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
    insert into auth.users values ('${AYSE}'),('${BAGLI}'),('${KATILMAMIS}');
    insert into public.profiles(id) values ('${AYSE}'),('${BAGLI}'),('${KATILMAMIS}');
  `);

  /* AYSE ve BAGLI aynı bölümden topluluğa katıldı; KATILMAMIS katılmadı. */
  for (const kim of [AYSE, BAGLI]) {
    await olarak(kim, `select sosyal_profil_kur($1,$2,true)`, [
      `k${kim.slice(0, 6)}`,
      'bilgisayar-muhendisligi',
    ]);
  }
  await olarak(KATILMAMIS, `select sosyal_profil_kur($1,$2,false)`, [
    'katilmamis1',
    'bilgisayar-muhendisligi',
  ]);

  /* Karşılıklı bağlantı: AYSE ↔ BAGLI */
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BAGLI]);
  await olarak(BAGLI, `update connections set durum='kabul' where requester_id=$1 and addressee_id=$2`, [AYSE, BAGLI]);
});

test('taslak doğuyor: yeni paylaşım hazır değil', async () => {
  const [satir] = await olarak(AYSE, `select * from sosyal_paylasim_baslat($1,$2,$3)`, [
    '00000000-0000-4000-8000-000000000001',
    'ilk deneme',
    'baglantilarim',
  ]);
  assert.equal(satir.durum, 'taslak');
  assert.equal(satir.kitle, 'baglantilarim');
});

test('taslağı yalnız yazarı görüyor; bağlantısı bile göremiyor', async () => {
  const [p] = await olarak(AYSE, `select * from sosyal_paylasim_baslat($1,$2,$3)`, [
    '00000000-0000-4000-8000-000000000002', 'gizli taslak', 'baglantilarim',
  ]);
  const yazar = await olarak(AYSE, `select id from posts where id=$1`, [p.id]);
  const baskasi = await olarak(BAGLI, `select id from posts where id=$1`, [p.id]);
  assert.equal(yazar.length, 1, 'yazar kendi taslağını görmeli');
  assert.equal(baskasi.length, 0, 'YARIM YÜKLEME BAŞKASINA GÖRÜNMEMELİ');
});

test('aynı istemci anahtarı ikinci kez tek paylaşım üretiyor', async () => {
  const anahtar = '00000000-0000-4000-8000-000000000003';
  const [ilk] = await olarak(AYSE, `select * from sosyal_paylasim_baslat($1,$2,$3)`, [anahtar, 'a', 'baglantilarim']);
  const [ikinci] = await olarak(AYSE, `select * from sosyal_paylasim_baslat($1,$2,$3)`, [anahtar, 'a', 'baglantilarim']);
  assert.equal(ilk.id, ikinci.id, 'ÇİFT TIKLAMA İKİNCİ PAYLAŞIM AÇMAMALI');
  const [{ adet }] = await olarak(AYSE, `select count(*)::int as adet from posts where istemci_anahtari=$1`, [anahtar]);
  assert.equal(adet, 1);
});

test('tamamla: sıra korunuyor ve paylaşım hazır oluyor', async () => {
  const [p] = await olarak(AYSE, `select * from sosyal_paylasim_baslat($1,$2,$3)`, [
    '00000000-0000-4000-8000-000000000004', 'üç fotoğraf', 'baglantilarim',
  ]);
  await olarak(AYSE, `select sosyal_paylasim_tamamla($1,$2::jsonb)`, [p.id, medya(p.id, AYSE, 3)]);

  const [son] = await olarak(AYSE, `select durum from posts where id=$1`, [p.id]);
  assert.equal(son.durum, 'hazir');

  const sira = await olarak(AYSE, `select sira from post_media where post_id=$1 order by sira`, [p.id]);
  assert.deepEqual(sira.map((r) => r.sira), [1, 2, 3], 'KAPAK = 1. FOTOĞRAF; sıra veritabanında');

  const gorunur = await olarak(BAGLI, `select id from posts where id=$1`, [p.id]);
  assert.equal(gorunur.length, 1, 'hazır paylaşımı bağlantısı görmeli');
});

test('0 ve 11 fotoğraf reddediliyor', async () => {
  const [bos] = await olarak(AYSE, `select * from sosyal_paylasim_baslat($1,$2,$3)`, [
    '00000000-0000-4000-8000-000000000005', 'x', 'baglantilarim',
  ]);
  assert.match(
    await hata(AYSE, `select sosyal_paylasim_tamamla($1,$2::jsonb)`, [bos.id, '[]']) ?? '',
    /foto/i,
    '0 fotoğraf reddedilmeli',
  );

  const [fazla] = await olarak(AYSE, `select * from sosyal_paylasim_baslat($1,$2,$3)`, [
    '00000000-0000-4000-8000-000000000006', 'y', 'baglantilarim',
  ]);
  assert.ok(
    await hata(AYSE, `select sosyal_paylasim_tamamla($1,$2::jsonb)`, [fazla.id, medya(fazla.id, AYSE, 11)]),
    '11 fotoğraf reddedilmeli',
  );
});

test('başkasının klasörüne işaret eden yol reddediliyor', async () => {
  const [p] = await olarak(AYSE, `select * from sosyal_paylasim_baslat($1,$2,$3)`, [
    '00000000-0000-4000-8000-000000000007', 'z', 'baglantilarim',
  ]);
  const yabanci = JSON.stringify([{ sira: 1, storage_path: `${BAGLI}/${p.id}/calinti.jpg` }]);
  assert.ok(
    await hata(AYSE, `select sosyal_paylasim_tamamla($1,$2::jsonb)`, [p.id, yabanci]),
    'yol sunucuda doğrulanmalı — başkasının klasörü kabul edilmemeli',
  );
});

test('başkasının taslağı tamamlanamıyor', async () => {
  const [p] = await olarak(AYSE, `select * from sosyal_paylasim_baslat($1,$2,$3)`, [
    '00000000-0000-4000-8000-000000000008', 'w', 'baglantilarim',
  ]);
  assert.ok(
    await hata(BAGLI, `select sosyal_paylasim_tamamla($1,$2::jsonb)`, [p.id, medya(p.id, BAGLI, 1)]),
    'yalnız sahibi tamamlayabilmeli',
  );
});

test('iptal taslağı siliyor; hazır paylaşım iptal edilemiyor', async () => {
  const [t] = await olarak(AYSE, `select * from sosyal_paylasim_baslat($1,$2,$3)`, [
    '00000000-0000-4000-8000-000000000009', 'iptal', 'baglantilarim',
  ]);
  await olarak(AYSE, `select sosyal_paylasim_iptal($1)`, [t.id]);
  const kalan = await olarak(AYSE, `select id from posts where id=$1`, [t.id]);
  assert.equal(kalan.length, 0, 'iptal edilen işlem paylaşım bırakmamalı');

  const [h] = await olarak(AYSE, `select * from sosyal_paylasim_baslat($1,$2,$3)`, [
    '00000000-0000-4000-8000-00000000000a', 'hazir', 'baglantilarim',
  ]);
  await olarak(AYSE, `select sosyal_paylasim_tamamla($1,$2::jsonb)`, [h.id, medya(h.id, AYSE, 1)]);
  assert.ok(
    await hata(AYSE, `select sosyal_paylasim_iptal($1)`, [h.id]),
    'yayımlanmış paylaşım iptalle SİLİNEMEMELİ (kalıcı silme yok)',
  );
});

test('topluluğa katılmamış kullanıcı paylaşım açamıyor', async () => {
  assert.ok(
    await hata(KATILMAMIS, `select sosyal_paylasim_baslat($1,$2,$3)`, [
      '00000000-0000-4000-8000-00000000000b', 'olmaz', 'baglantilarim',
    ]),
    'katılmayan öğrenci paylaşım oluşturamamalı',
  );
});

test('geçersiz kitle değeri reddediliyor', async () => {
  assert.ok(
    await hata(AYSE, `select sosyal_paylasim_baslat($1,$2,$3)`, [
      '00000000-0000-4000-8000-00000000000c', 'q', 'herkes',
    ]),
    'kitle yalnız baglantilarim / alan-toplulugum olabilir',
  );
});
