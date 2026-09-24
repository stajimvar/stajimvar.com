import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  MESAJLAŞMA (20261107010000)

  Kullanıcı kararları (24 Eylül 2026): herkes yazabilir ama bağlantı
  olmayanın mesajı "Mesaj istekleri"ne düşer; yalnız öğrenciler; yalnız
  metin. Bu dosya sunucudaki kuralları ölçüyor: istek akışı, sınırlar,
  okundu gizliliği, engel, şirket sayfası, doğrudan yazma yasağı ve
  yöneticinin yalnız şikâyet edilen mesajı görmesi.
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
].map((yol) => new URL(yol, import.meta.url));

/* Görünürlük kapısının güncel hâli dosyadan kesiliyor (bkz. profil-okulu.test.mjs). */
const KAPI_GOCU = new URL('../supabase/migrations/20260926040000_uc_ayri_kavram.sql', import.meta.url);
const GOC = new URL('../supabase/migrations/20261107010000_mesajlasma.sql', import.meta.url);

const AYSE = '11111111-1111-4111-8111-111111111111';
const BAGLI = '22222222-2222-4222-8222-222222222222';   // Ayşe ile bağlantılı
const YABANCI = '33333333-3333-4333-8333-333333333333'; // bağlantı yok
const GIZLI = '44444444-4444-4444-8444-444444444444';   // profili yayında değil
const SIRKET = '55555555-5555-4555-8555-555555555555';  // şirket sayfası
const ENGEL = '66666666-6666-4666-8666-666666666666';   // bağlantılı, sonra engel
const ISRARCI = '77777777-7777-4777-8777-777777777777'; // isteği silinecek
const YONETICI = '88888888-8888-4888-8888-888888888888';

const HERKES = [AYSE, BAGLI, YABANCI, GIZLI, SIRKET, ENGEL, ISRARCI, YONETICI];

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

const gonder = (kim, alici, metin = 'merhaba') =>
  olarak(kim, `select * from mesaj_gonder($1, $2)`, [alici, metin]);
const gonderHata = (kim, alici, metin = 'merhaba') =>
  hata(kim, `select * from mesaj_gonder($1, $2)`, [alici, metin]);
const kutu = (kim, ad) => olarak(kim, `select * from sohbetlerim($1)`, [ad]);
const sohbetIdsi = async (a, b) =>
  (await db.query(`select id from sohbetler where kisi_a = least($1::uuid,$2::uuid) and kisi_b = greatest($1::uuid,$2::uuid)`, [a, b]))
    .rows[0]?.id ?? null;

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
  const kapi = (await readFile(KAPI_GOCU, 'utf8')).match(
    /create or replace function sosyal_gizli\.sosyal_gorunur\(hedef uuid\)[\s\S]*?\n\$\$;/,
  );
  assert.ok(kapi, 'sosyal_gorunur tanımı bulunamadı');
  await db.exec(kapi[0]);
  await db.exec(`
    alter table public.social_profiles add column if not exists resmi_mi boolean not null default false;
    alter table public.social_profiles add column if not exists sirket_id uuid;
  `);
  await db.exec(await readFile(GOC, 'utf8'));

  await db.exec(`
    insert into auth.users values ${HERKES.map((k) => `('${k}')`).join(',')};
    insert into public.profiles(id, role) values ${HERKES.map((k) => `('${k}', '${k === YONETICI ? 'admin' : 'student'}')`).join(',')};
  `);
  for (const kim of HERKES) {
    await olarak(kim, `select sosyal_profil_kur($1,$2,$3)`, [`k${kim.slice(0, 6)}`, 'bilgisayar-muhendisligi', kim !== GIZLI]);
  }
  await db.exec(`update public.social_profiles set sirket_id = gen_random_uuid() where profile_id = '${SIRKET}'`);

  for (const kim of [BAGLI, ENGEL]) {
    await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, kim]);
    await olarak(kim, `update connections set durum='kabul' where requester_id=$1 and addressee_id=$2`, [AYSE, kim]);
  }
});

test('bağlantılı iki öğrenci arasında sohbet doğrudan açık', async () => {
  const [m] = await gonder(AYSE, BAGLI, '  selam  ');
  assert.equal(m.metin, 'selam', 'kenar boşlukları kırpılmalı');
  const [s] = await kutu(BAGLI, 'gelen');
  assert.equal(s.durum, 'acik');
  assert.equal(s.okunmamis, 1);
  assert.equal((await kutu(BAGLI, 'istekler')).length, 0, 'bağlantının mesajı istek kutusuna düşmemeli');
});

test('bağlantı yoksa mesaj istek kutusuna düşüyor, başlatan en çok 3 mesaj yazabiliyor', async () => {
  await gonder(YABANCI, AYSE, 'bir');
  await gonder(YABANCI, AYSE, 'iki');
  await gonder(YABANCI, AYSE, 'üç');
  assert.match(await gonderHata(YABANCI, AYSE, 'dört'), /istek-bekliyor/, 'KABULDEN ÖNCE 4. MESAJ REDDEDİLMELİ');

  const istekler = await kutu(AYSE, 'istekler');
  assert.equal(istekler.length, 1);
  assert.equal(istekler[0].karsi_id, YABANCI);
  assert.equal(istekler[0].son_mesaj, 'üç');
  assert.ok(!(await kutu(AYSE, 'gelen')).some((x) => x.karsi_id === YABANCI), 'istek ana kutuda görünmemeli');
  assert.equal((await kutu(YABANCI, 'gelen'))[0].durum, 'istek', 'gönderen kendi isteğini ana kutusunda görmeli');
});

test('istek aşamasında gönderen, alıcının okuduğunu göremiyor; kabulden sonra görüyor', async () => {
  const sohbet = await sohbetIdsi(YABANCI, AYSE);
  await olarak(AYSE, `select sohbet_okundu($1)`, [sohbet]);
  const gorulen = await olarak(YABANCI, `select * from sohbet_okumalari where profil_id = $1`, [AYSE]);
  assert.equal(gorulen.length, 0, '"GÖRÜLDÜ" BİLGİSİ İSTEK AŞAMASINDA SIZMAMALI');
  assert.equal((await kutu(YABANCI, 'gelen'))[0].karsi_okundu_at, null);

  /* Alıcı yanıtlıyor: yanıt kabul sayılıyor. */
  await gonder(AYSE, YABANCI, 'merhaba, buyur');
  const [s] = await kutu(YABANCI, 'gelen');
  assert.equal(s.durum, 'acik', 'yanıt vermek isteği kabul etmeli');
  assert.ok(s.karsi_okundu_at, 'kabulden sonra okundu bilgisi görünmeli');
  assert.equal((await gonder(YABANCI, AYSE, 'dört')).length, 1, 'kabulden sonra sınır kalkmalı');
});

test('istek silinince sohbet gidiyor ve 30 gün yeni istek açılamıyor', async () => {
  await gonder(ISRARCI, BAGLI, 'tanışalım');
  const sohbet = await sohbetIdsi(ISRARCI, BAGLI);
  assert.match(await hata(ISRARCI, `select sohbet_istegini_sil($1)`, [sohbet]), /istek-yok/, 'başlatan kendi isteğini "silemez"');
  await olarak(BAGLI, `select sohbet_istegini_sil($1)`, [sohbet]);
  assert.equal(await sohbetIdsi(ISRARCI, BAGLI), null);
  assert.equal((await db.query(`select count(*)::int n from mesajlar where sohbet_id = $1`, [sohbet])).rows[0].n, 0);
  assert.match(await gonderHata(ISRARCI, BAGLI), /istek-reddedildi/, 'SİLİNEN İSTEK HEMEN YENİLENEMEMELİ');
});

test('kabul düğmesi yalnız alıcıda çalışıyor', async () => {
  await gonder(ISRARCI, YABANCI, 'selam');
  const sohbet = await sohbetIdsi(ISRARCI, YABANCI);
  assert.match(await hata(ISRARCI, `select sohbet_istegini_kabul_et($1)`, [sohbet]), /istek-yok/);
  assert.equal(await hata(YABANCI, `select sohbet_istegini_kabul_et($1)`, [sohbet]), null);
  assert.equal((await kutu(ISRARCI, 'gelen')).find((x) => x.karsi_id === YABANCI).durum, 'acik');
});

test('üçüncü kişi mesajları ve sohbeti göremiyor; doğrudan yazma yok', async () => {
  const sohbet = await sohbetIdsi(AYSE, BAGLI);
  assert.equal((await olarak(YABANCI, `select * from mesajlar where sohbet_id = $1`, [sohbet])).length, 0);
  assert.equal((await olarak(YABANCI, `select * from sohbetler where id = $1`, [sohbet])).length, 0);
  assert.ok(
    await hata(AYSE, `insert into mesajlar(sohbet_id, gonderen, metin) values ($1,$2,'x')`, [sohbet, AYSE]),
    'TABLOYA DOĞRUDAN YAZILAMAMALI',
  );
  assert.ok(await hata(AYSE, `update sohbetler set durum='acik' where id=$1`, [sohbet]));
  assert.ok(await hata(AYSE, `delete from mesajlar where sohbet_id=$1`, [sohbet]));
});

test('engel sohbeti iki tarafa da kapatıyor ve gönderimi durduruyor', async () => {
  await gonder(AYSE, ENGEL, 'selam');
  const sohbet = await sohbetIdsi(AYSE, ENGEL);
  await olarak(ENGEL, `insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [ENGEL, AYSE]);
  assert.equal((await olarak(AYSE, `select * from mesajlar where sohbet_id = $1`, [sohbet])).length, 0, 'engellenen okuyamamalı');
  assert.equal((await olarak(ENGEL, `select * from mesajlar where sohbet_id = $1`, [sohbet])).length, 0, 'engelleyen de');
  assert.ok(!(await kutu(AYSE, 'gelen')).some((x) => x.karsi_id === ENGEL));
  assert.match(await gonderHata(AYSE, ENGEL), /engel/);
  assert.match(await gonderHata(ENGEL, AYSE), /engel/);
});

test('şirket sayfası, gizli profil, kendine mesaj ve boş/uzun mesaj reddediliyor', async () => {
  assert.match(await gonderHata(AYSE, SIRKET), /yalniz-ogrenciler/);
  assert.match(await gonderHata(SIRKET, AYSE), /yalniz-ogrenciler/);
  assert.match(await gonderHata(AYSE, GIZLI), /profil-gorunmuyor/, 'GÖRÜNMEYEN PROFİLE YENİ SOHBET AÇILAMAMALI');
  assert.match(await gonderHata(AYSE, AYSE), /kendine-mesaj-yok/);
  assert.match(await gonderHata(AYSE, BAGLI, '   '), /mesaj-bos/);
  assert.match(await gonderHata(AYSE, BAGLI, 'a'.repeat(2001)), /mesaj-cok-uzun/);
});

test('sayaçlar: okunmamış sohbet ve bekleyen istek ayrı', async () => {
  await gonder(GIZLI, YABANCI, 'ben gizliyim ama yazabilirim');
  const [s] = await olarak(YABANCI, `select * from mesaj_sayaclari()`);
  assert.equal(s.bekleyen_istek, 1);
  assert.ok(s.okunmamis_sohbet >= 1);
  const sohbet = await olarak(YABANCI, `select sohbet_kimligi($1) id`, [GIZLI]);
  assert.ok(sohbet[0].id);
  assert.equal((await olarak(BAGLI, `select sohbet_kimligi($1) id`, [GIZLI]))[0].id, null, 'üye olmadığın sohbet bulunmamalı');
});

test('yönetici yalnız şikâyet edilen mesajı okuyabiliyor', async () => {
  const sohbet = await sohbetIdsi(AYSE, BAGLI);
  const [ilk] = (await db.query(`select id from mesajlar where sohbet_id = $1 order by created_at`, [sohbet])).rows;
  await gonder(BAGLI, AYSE, 'ikinci');
  assert.equal((await olarak(YONETICI, `select * from mesajlar where sohbet_id = $1`, [sohbet])).length, 0);
  await olarak(BAGLI, `insert into reports(reporter_id, hedef_tur, hedef_id, sebep) values ($1,'mesaj',$2,'taciz')`, [BAGLI, ilk.id]);
  const gorulen = await olarak(YONETICI, `select id from mesajlar where sohbet_id = $1`, [sohbet]);
  assert.deepEqual(gorulen.map((r) => r.id), [ilk.id], 'YALNIZ ŞİKÂYET EDİLEN MESAJ GÖRÜNMELİ');
});

test('oturumsuz çağrı yetkisiz; tablolar anon için kapalı', async () => {
  for (const imza of ['public.mesaj_gonder(uuid,text)', 'public.sohbetlerim(text)', 'public.mesaj_sayaclari()']) {
    const v = (await db.query(`select has_function_privilege('anon', $1, 'execute') v`, [imza])).rows[0].v;
    assert.equal(v, false, `${imza} anon'a açık olmamalı`);
  }
  for (const tablo of ['public.mesajlar', 'public.sohbetler', 'public.sohbet_okumalari']) {
    const v = (await db.query(`select has_table_privilege('anon', $1, 'select') v`, [tablo])).rows[0].v;
    assert.equal(v, false, `${tablo} anon'a açık olmamalı`);
  }
});
