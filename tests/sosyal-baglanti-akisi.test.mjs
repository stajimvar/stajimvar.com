import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  BAĞLANTI DURUMU — ARAYÜZÜN TEK SORGUSU

  Arayüz bir profilde hangi düğmeyi çizeceğini bilmek zorunda: "Bağlantı
  kur" mu, "İstek gönderildi" mi, "Sana istek gönderdi" mi, yoksa
  "Bağlantınız var" mı. Bu bilgi `connections` tablosundan okunabiliyor
  ama iki şey ek: yön (ben mi gönderdim) ve reddedilmiş bir istekte
  yeniden deneme anı.

  TAKİPÇİ/TAKİP EDİLEN YOK. Tek ilişki karşılıklı bağlantı; RPC de tek
  satır dönüyor ve yön yalnız "kim gönderdi" sorusunu cevaplıyor.

  GÖRÜNMEYEN HEDEF İÇİN SIFIR SATIR. "Bağlantı yok" ile "bu profili
  göremiyorsun" farklı şeyler; ikincisi sayı ya da durum döndürmüyor,
  hiç satır döndürmüyor. Arayüz de düğmeyi DOM'a hiç koymuyor.
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
].map((yol) => new URL(yol, import.meta.url));

const AYSE = '11111111-1111-4111-8111-111111111111';
const BURAK = '22222222-2222-4222-8222-222222222222';
const FARKLI = '33333333-3333-4333-8333-333333333333';
const KATILMAMIS = '44444444-4444-4444-8444-444444444444';

let db;

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

const durum = (kim, hedef) => olarak(kim, `select * from baglanti_durumu($1)`, [hedef]);
const temizle = () => db.exec('delete from connections; delete from blocks;');

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
    insert into auth.users values ('${AYSE}'),('${BURAK}'),('${FARKLI}'),('${KATILMAMIS}');
    insert into public.profiles(id) values ('${AYSE}'),('${BURAK}'),('${FARKLI}'),('${KATILMAMIS}');
  `);

  for (const [kim, ad, bolum, yayimla] of [
    [AYSE, 'ayse', 'giyim-uretim-teknolojisi', true],
    [BURAK, 'burak', 'moda-tasarimi', true],
    [FARKLI, 'farkli', 'hukuk', true],
    [KATILMAMIS, 'katilmamis', 'moda-tasarimi', false],
  ]) {
    await olarak(kim, `select sosyal_profil_kur($1,$2,$3)`, [ad, bolum, yayimla]);
  }
});

after(async () => {
  await db?.close();
});

/* ================================================== YEDİ DURUMUN HEPSİ */

test('1 · bağlantı YOK', async () => {
  await temizle();
  const d = await durum(AYSE, BURAK);
  assert.equal(d.length, 1);
  assert.equal(d[0].durum, 'yok');
  assert.equal(d[0].ben_mi_gonderdim, null);
  assert.equal(d[0].yeniden_deneme_ani, null);
});

test('2 · GİDEN istek bekliyor', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);

  const d = await durum(AYSE, BURAK);
  assert.equal(d[0].durum, 'bekliyor');
  assert.equal(d[0].ben_mi_gonderdim, true);
});

test('3 · GELEN istek bekliyor', async () => {
  const d = await durum(BURAK, AYSE);
  assert.equal(d[0].durum, 'bekliyor');
  assert.equal(d[0].ben_mi_gonderdim, false);
});

test('4 · BAĞLI', async () => {
  await olarak(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);

  for (const [kim, hedef] of [[AYSE, BURAK], [BURAK, AYSE]]) {
    const d = await durum(kim, hedef);
    assert.equal(d[0].durum, 'kabul', 'iki taraf da bağlı görmeli');
  }
});

test('5 · REDDETTİM (ben alıcıyım)', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(BURAK, `update connections set durum='red' where addressee_id=$1`, [BURAK]);

  const d = await durum(BURAK, AYSE);
  assert.equal(d[0].durum, 'red');
  assert.equal(d[0].ben_mi_gonderdim, false);
  assert.equal(d[0].yeniden_deneme_ani, null, 'reddeden için bekleme süresi yok');
});

test('6 · REDDEDİLDİM, yeniden deneme anı 30 gün sonrası', async () => {
  const d = await durum(AYSE, BURAK);
  assert.equal(d[0].durum, 'red');
  assert.equal(d[0].ben_mi_gonderdim, true);
  assert.ok(d[0].yeniden_deneme_ani, 'yeniden deneme anı verilmedi');

  const fark = await olarak(
    AYSE,
    `select extract(epoch from (b.yeniden_deneme_ani - c.responded_at))::int saniye
       from baglanti_durumu($1) b, connections c limit 1`,
    [BURAK],
  );
  assert.equal(fark[0].saniye, 30 * 24 * 3600, 'bekleme süresi 30 gün değil');
});

test('6b · süre dolunca yeniden deneme anı geçmişte kalıyor', async () => {
  await db.query(`update connections set responded_at = now() - interval '31 days'`);
  const d = await durum(AYSE, BURAK);
  assert.ok(new Date(d[0].yeniden_deneme_ani) < new Date(), 'süre dolmuş görünmüyor');
});

test('7 · ENGEL varken profil zaten görünmüyor: SIFIR SATIR', async () => {
  await temizle();
  await olarak(AYSE, `insert into blocks(blocker_id, blocked_id) values ($1,$2)`, [AYSE, BURAK]);

  assert.equal((await durum(AYSE, BURAK)).length, 0, 'engelli hedef için satır döndü');
  assert.equal((await durum(BURAK, AYSE)).length, 0, 'engellenen için satır döndü');

  await db.exec('delete from blocks');
});

/* ============================================== SIZINTI VE YETKİ */

test('FARKLI ALAN için SIFIR SATIR — 0 uydurulmuyor', async () => {
  const d = await durum(AYSE, FARKLI);
  assert.equal(d.length, 0, 'farklı alandaki hedef için durum döndü');
});

test('TOPLULUĞA KATILMAMIŞ kullanıcı hiçbir hedefin durumunu alamıyor', async () => {
  const d = await durum(KATILMAMIS, AYSE);
  assert.equal(d.length, 0);
});

test('kendi kimliğim için de satır dönüyor (kendi profilim)', async () => {
  const d = await durum(AYSE, AYSE);
  assert.equal(d.length, 1);
  assert.equal(d[0].durum, 'yok');
});

test('olmayan kimlik için SIFIR SATIR', async () => {
  const d = await durum(AYSE, '00000000-0000-4000-8000-000000000000');
  assert.equal(d.length, 0);
});

/* ============================================== AKIŞIN KENDİSİ */

test('yayımlanmamış kullanıcı istek GÖNDEREMİYOR', async () => {
  await temizle();
  const hata = await yazmayiDene(
    KATILMAMIS, `insert into connections(requester_id, addressee_id) values ($1,$2)`,
    [KATILMAMIS, AYSE]);
  assert.ok(hata, 'topluluğa katılmamış kullanıcı istek gönderdi');
});

test('farklı alandan istek GÖNDERİLEMİYOR', async () => {
  const hata = await yazmayiDene(
    FARKLI, `insert into connections(requester_id, addressee_id) values ($1,$2)`,
    [FARKLI, AYSE]);
  assert.ok(hata, 'farklı alandan istek gönderildi');
});

test('kabul edilen bağlantı iki tarafın da sayacında 1', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(BURAK, `update connections set durum='kabul' where addressee_id=$1`, [BURAK]);

  for (const kim of [AYSE, BURAK]) {
    const s = await olarak(kim, `select * from sosyal_sayaclar($1)`, [kim]);
    assert.equal(s[0].baglanti, 1, 'bağlantı sayacı 1 değil');
  }
});

test('red bağlantı sayacını artırmıyor', async () => {
  await temizle();
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(BURAK, `update connections set durum='red' where addressee_id=$1`, [BURAK]);

  const s = await olarak(AYSE, `select * from sosyal_sayaclar($1)`, [AYSE]);
  assert.equal(s[0].baglanti, 0);
});

test('RPC gizli değil ama yalnız authenticated çağırabiliyor', async () => {
  const yetki = await db.query(
    `select has_function_privilege('anon','public.baglanti_durumu(uuid)','execute') anon,
            has_function_privilege('authenticated','public.baglanti_durumu(uuid)','execute') auth`);
  assert.equal(yetki.rows[0].anon, false);
  assert.equal(yetki.rows[0].auth, true);
});

test('takip kavramı hiçbir yerde yok', async () => {
  const kaynak = await readFile(
    new URL('../supabase/migrations/20260923080000_baglanti_durumu_rpc.sql', import.meta.url), 'utf8');
  const yorumsuz = kaynak.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*--.*$/gm, ' ');
  assert.doesNotMatch(yorumsuz, /takip|follow/i, 'takip kavramı sızmış');
});
