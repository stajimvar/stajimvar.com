import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  EKSİK BÖLÜM / EŞLEME TALEBİ VE YÖNETİM KUYRUĞU

  Bölüm kataloğu kasten eksik: 42 bölüm Türkiye'deki bütün bölümleri
  kapsamıyor. Karşılığı uydurma bir "Diğer" satırı değil, bu talep akışı.

  İKİ KURAL BU DOSYANIN OMURGASI

  1. TALEP AÇMAK ERİŞİM VERMEZ. Kullanıcı talebini açtıktan sonra da
     topluluğa giremiyor; yönetici kararı olmadan hiçbir şey değişmiyor.
  2. KULLANICININ SERBEST METNİ KAYDA DÖNÜŞMEZ. Yönetici kabul ederken
     bölümü ve alanı KAPALI listelerden seçiyor; karar RPC'si serbest
     metin parametresi bile almıyor.
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
  '../supabase/migrations/20260923090000_talep_karar_aciklamasi.sql',
].map((yol) => new URL(yol, import.meta.url));

const AYSE = '11111111-1111-4111-8111-111111111111';
const BURAK = '22222222-2222-4222-8222-222222222222';
const ADMIN = '99999999-9999-4999-8999-999999999999';

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
    return [e?.message, e?.detail].filter(Boolean).join(' | ') || String(e);
  }
}

const tekil = async (sql, params = []) => (await db.query(sql, params)).rows;

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
    insert into auth.users values ('${AYSE}'),('${BURAK}'),('${ADMIN}');
    insert into public.profiles(id) values ('${AYSE}'),('${BURAK}');
    insert into public.profiles(id, role) values ('${ADMIN}','admin');
  `);
});

after(async () => {
  await db?.close();
});

const temizle = () => db.exec('delete from department_requests; delete from bolum_talep_denetim;');

/* =========================================================== TALEP */

test('kullanıcı kendi talebini açıp okuyor', async () => {
  await temizle();
  await olarak(
    AYSE,
    `insert into department_requests(user_id, requested_department, universite, aciklama)
       values ($1,$2,$3,$4)`,
    [AYSE, 'Uzay Mühendisliği', 'Örnek Üniversite', 'Bölümüm listede yok.'],
  );
  const kendi = await olarak(AYSE, `select requested_department, status from department_requests`);
  assert.equal(kendi.length, 1);
  assert.equal(kendi[0].status, 'bekliyor');
});

test('başkasının talebi GÖRÜNMÜYOR', async () => {
  const baskasi = await olarak(BURAK, `select id from department_requests`);
  assert.equal(baskasi.length, 0);
});

test('başkası adına talep açılamıyor', async () => {
  const hata = await yazmayiDene(
    BURAK,
    `insert into department_requests(user_id, requested_department) values ($1,$2)`,
    [AYSE, 'Sahte talep'],
  );
  assert.ok(hata, 'başkası adına talep açıldı');
});

test('aynı anda tek açık talep', async () => {
  const hata = await yazmayiDene(
    AYSE,
    `insert into department_requests(user_id, requested_department) values ($1,$2)`,
    [AYSE, 'İkinci talep'],
  );
  assert.match(String(hata), /duplicate key|unique/i, 'ikinci açık talep açıldı');
});

test('hedefsiz talep açılamıyor: bölüm de serbest metin de boşsa ret', async () => {
  await temizle();
  const hata = await yazmayiDene(
    AYSE, `insert into department_requests(user_id) values ($1)`, [AYSE],
  );
  assert.match(String(hata), /talep_hedefi_var|check/i);
});

test('katalogdaki bölüm için EŞLEME talebi de açılabiliyor', async () => {
  await temizle();
  await olarak(
    AYSE,
    `insert into department_requests(user_id, department_id, aciklama)
       select $1, id, 'Bölümüm var ama alanı tanımlı değil.' from departments where slug='hukuk'`,
    [AYSE],
  );
  const satir = await olarak(AYSE, `select department_id, requested_department from department_requests`);
  assert.ok(satir[0].department_id, 'bölüm kimliği yazılmadı');
  assert.equal(satir[0].requested_department, null);
});

test('durumu yalnız yönetici değiştirebiliyor', async () => {
  const kullanici = await olarak(
    AYSE, `update department_requests set status='eklendi' returning id`,
  );
  assert.equal(kullanici.length, 0, 'kullanıcı kendi talebinin durumunu değiştirdi');

  const yonetici = await olarak(
    ADMIN, `update department_requests set status='incelendi' returning status`,
  );
  assert.equal(yonetici[0].status, 'incelendi');
});

test('TALEP AÇMAK SOSYAL KATMANA ERİŞİM VERMİYOR', async () => {
  await temizle();
  await olarak(
    AYSE,
    `insert into department_requests(user_id, requested_department) values ($1,$2)`,
    [AYSE, 'Uzay Mühendisliği'],
  );
  /* Ayşe-nin sosyal profili yok; talep onu topluluğa sokmuyor. */
  const profiller = await olarak(AYSE, `select profile_id from social_profiles`);
  assert.equal(profiller.length, 0, 'talep açmak topluluğa erişim verdi');
});

test('anon talep tablosunda yetkisiz', async () => {
  const yetki = await tekil(
    `select has_table_privilege('anon','public.department_requests','select') v`,
  );
  assert.equal(yetki[0].v, false);
});

test('sector_requests tablosuna dokunulmadı', async () => {
  const kolonlar = await tekil(
    `select column_name from information_schema.columns
      where table_schema='public' and table_name='sector_requests' order by column_name`,
  );
  assert.ok(kolonlar.some((k) => k.column_name === 'requested_sector'));
  assert.ok(!kolonlar.some((k) => k.column_name === 'department_id'),
    'sector_requests genişletilmiş — ayrı tablo kararı bozulmuş');
});

/* ================================================ YÖNETİM KUYRUĞU */

const talepAc = async (metin) => {
  await temizle();
  const satir = await olarak(
    AYSE,
    `insert into department_requests(user_id, requested_department) values ($1,$2) returning id`,
    [AYSE, metin],
  );
  return satir[0].id;
};

test('normal kullanıcı karar RPC-sini çağıramıyor', async () => {
  const id = await talepAc('Uzay Mühendisliği');
  const hata = await yazmayiDene(
    AYSE, `select bolum_talebini_karara_bagla($1,$2,$3,$4,$5,$6)`,
    [id, 'reddedildi', null, null, 'Kendi talebimi reddediyorum.', 'Kullanıcıya açıklama.'],
  );
  assert.match(String(hata), /yonetici-degil|yönetici/i);
});

test('KARAR RPC-Sİ SERBEST METİN PARAMETRESİ ALMIYOR', async () => {
  const parametreler = await tekil(
    `select unnest(p.proargnames) ad from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname='public' and p.proname='bolum_talebini_karara_bagla'`,
  );
  const adlar = parametreler.map((r) => r.ad);
  assert.deepEqual(
    adlar,
    ['p_talep_id', 'p_karar', 'p_department_id', 'p_sector_id', 'p_gerekce', 'p_karar_aciklamasi'],
    'imza değişmiş; serbest metin sızmış olabilir',
  );
  /*
    İki metin parametresi var ama İKİSİ DE YÖNETİCİNİN yazdığı:
    `p_gerekce` iç not, `p_karar_aciklamasi` kullanıcıya gösterilen cümle.
    Kullanıcının yazdığı `requested_department` hiçbirine karşılık
    gelmiyor — o yalnız okunuyor.
  */
  const kaynak = await readFile(
    new URL('../supabase/migrations/20260923090000_talep_karar_aciklamasi.sql', import.meta.url),
    'utf8',
  );
  const govde = kaynak.slice(kaynak.indexOf('create or replace function public.bolum_talebini_karara_bagla'));
  assert.doesNotMatch(govde, /requested_department/,
    'kullanıcının serbest metni karar gövdesine sızmış');
});

test('kabulde bölüm ve alan zorunlu', async () => {
  const id = await talepAc('Uzay Mühendisliği');
  const hata = await yazmayiDene(
    ADMIN, `select bolum_talebini_karara_bagla($1,$2,$3,$4,$5,$6)`,
    [id, 'eklendi', null, null, 'Kabul ediyorum ama seçim yapmadım.', 'Kullanıcıya açıklama.'],
  );
  assert.match(String(hata), /secim-zorunlu|zorunlu/i);
});

test('gerekçesiz karar verilemiyor', async () => {
  const id = await talepAc('Uzay Mühendisliği');
  const hata = await yazmayiDene(
    ADMIN, `select bolum_talebini_karara_bagla($1,$2,$3,$4,$5,$6)`,
    [id, 'reddedildi', null, null, '  ', 'Kullanıcıya açıklama.'],
  );
  assert.match(String(hata), /gerekce|gerekçe/i);
});

test('kabul: eşlemesi olmayan bölüme alan bağlanıyor ve kullanıcı topluluğa girebiliyor', async () => {
  /* Hukuk-un eşlemesini kaldırıp talep üzerinden geri bağlıyoruz. */
  await db.query(`delete from department_sectors where department_id =
                    (select id from departments where slug='hukuk')`);

  const id = await talepAc('Hukuk');
  const bolum = (await tekil(`select id from departments where slug='hukuk'`))[0].id;
  const alan = (await tekil(`select id from sectors where slug='hukuk-adalet'`))[0].id;

  await olarak(ADMIN, `select bolum_talebini_karara_bagla($1,$2,$3,$4,$5,$6)`,
    [id, 'eklendi', bolum, alan, 'Bölüm katalogda vardı, eşlemesi eksikti.',
     'Bölümün eklendi; alan topluluğuna katılabilirsin.']);

  const durum = await tekil(`select status from department_requests where id=$1`, [id]);
  assert.equal(durum[0].status, 'eklendi');

  const esleme = await tekil(
    `select s.slug from department_sectors ds join sectors s on s.id=ds.sector_id
      where ds.department_id=$1`, [bolum]);
  assert.equal(esleme[0].slug, 'hukuk-adalet');

  /* Uçtan uca: artık kurulum yapılabiliyor. */
  await olarak(AYSE, `select sosyal_profil_kur($1,$2,$3)`, ['ayse.hukuk', 'hukuk', true]);
  const profil = await tekil(
    `select s.slug from social_profiles sp join sectors s on s.id=sp.sector_id
      where sp.profile_id=$1`, [AYSE]);
  assert.equal(profil[0].slug, 'hukuk-adalet');
});

test('her karar APPEND-ONLY denetim kaydı yazıyor', async () => {
  const kayit = await olarak(
    ADMIN, `select karar, gerekce from bolum_talep_denetim order by created_at desc limit 1`,
  );
  assert.equal(kayit[0].karar, 'eklendi');
  assert.match(kayit[0].gerekce, /eşlemesi eksikti/);

  const guncelleme = await yazmayiDene(ADMIN, `update bolum_talep_denetim set gerekce='x'`);
  assert.ok(guncelleme, 'denetim kaydı güncellenebildi');
  const silme = await yazmayiDene(ADMIN, `delete from bolum_talep_denetim`);
  assert.ok(silme, 'denetim kaydı silinebildi');
});

test('var olan eşlemeyi FARKLI alana çevirme talebi reddediliyor', async () => {
  const id = await talepAc('Hukuk tekrar');
  const bolum = (await tekil(`select id from departments where slug='hukuk'`))[0].id;
  const baskaAlan = (await tekil(`select id from sectors where slug='bilisim-yazilim'`))[0].id;

  const hata = await yazmayiDene(
    ADMIN, `select bolum_talebini_karara_bagla($1,$2,$3,$4,$5,$6)`,
    [id, 'eklendi', bolum, baskaAlan, 'Alanı değiştirmek istiyorum.', 'Kullanıcıya açıklama.'],
  );
  assert.match(String(hata), /esleme-catismasi|çakış/i, 'kuyruktan alan değiştirilebildi');
});

test('ret gerekçeyle işliyor ve erişim vermiyor', async () => {
  const id = await talepAc('Olmayan Bölüm');
  await olarak(ADMIN, `select bolum_talebini_karara_bagla($1,$2,$3,$4,$5,$6)`,
    [id, 'reddedildi', null, null, 'Bu ad bir bölüm değil, program adı.',
     'Bu ad bir bölüm değil. Bölümünü listeden seçebilirsin.']);

  const durum = await tekil(`select status from department_requests where id=$1`, [id]);
  assert.equal(durum[0].status, 'reddedildi');

  const kayit = await olarak(ADMIN,
    `select karar from bolum_talep_denetim order by created_at desc limit 1`);
  assert.equal(kayit[0].karar, 'reddedildi');
});

/* ============================== KULLANICIYA GÖRÜNEN KARAR AÇIKLAMASI */

/*
  İKİ AYRI KANAL

  `gerekce`            yönetimin iç notu → yalnız `bolum_talep_denetim`
  `karar_aciklamasi`   kullanıcıya gösterilen cümle → `department_requests`

  Ayrı olmalarının sebebi: iç not başka talepleri, yöneticinin kimliğini
  ya da değerlendirme ayrıntısını içerebilir. Kullanıcıya gösterilecek
  cümle bilinçli olarak ayrı yazılıyor ve kullanıcı YALNIZ kendi satırını
  okuyabiliyor.
*/

test('karar açıklaması kolonu talep satırında, iç gerekçe DEĞİL', async () => {
  const kolonlar = await tekil(
    `select column_name from information_schema.columns
      where table_schema='public' and table_name='department_requests'
      order by column_name`,
  );
  const adlar = kolonlar.map((k) => k.column_name);
  assert.ok(adlar.includes('karar_aciklamasi'), 'karar açıklaması kolonu yok');
  assert.ok(!adlar.includes('gerekce'), 'iç gerekçe talep satırına sızmış');
  assert.ok(!adlar.some((a) => /yapan|karar_veren|admin/.test(a)),
    'yönetici kimliği talep satırına sızmış');
});

test('kullanıcı karar açıklamasını KENDİSİ yazamıyor', async () => {
  const yetki = await tekil(
    `select has_column_privilege('authenticated','public.department_requests',
                                 'karar_aciklamasi','insert') v`,
  );
  assert.equal(yetki[0].v, false, 'kullanıcı kendi karar açıklamasını yazabiliyor');
});

test('kabul ve ret için karar açıklaması ZORUNLU', async () => {
  const id = await talepAc('Uzay Mühendisliği');

  const retsiz = await yazmayiDene(
    ADMIN, `select bolum_talebini_karara_bagla($1,$2,$3,$4,$5,$6)`,
    [id, 'reddedildi', null, null, 'İç not: ad bir program.', '  '],
  );
  assert.match(String(retsiz), /aciklama-zorunlu/, 'açıklamasız ret geçti');

  const bolum = (await tekil(`select id from departments where slug='tip'`))[0].id;
  const alan = (await tekil(`select id from sectors where slug='saglik-ilac'`))[0].id;
  const kabulsuz = await yazmayiDene(
    ADMIN, `select bolum_talebini_karara_bagla($1,$2,$3,$4,$5,$6)`,
    [id, 'eklendi', bolum, alan, 'İç not.', null],
  );
  assert.match(String(kabulsuz), /aciklama-zorunlu/, 'açıklamasız kabul geçti');
});

test('kullanıcı KENDİ kararının açıklamasını okuyor', async () => {
  const id = await talepAc('Olmayan Bölüm');
  await olarak(ADMIN, `select bolum_talebini_karara_bagla($1,$2,$3,$4,$5,$6)`,
    [id, 'reddedildi', null, null,
     'İç not: kuyrukta üçüncü kez geldi, aynı kişi.',
     'Bu ad bir bölüm değil, program adı. Bölümünü listeden seçebilirsin.']);

  const satir = await olarak(AYSE,
    `select status, karar_aciklamasi from department_requests where id=$1`, [id]);
  assert.equal(satir.length, 1);
  assert.equal(satir[0].status, 'reddedildi');
  assert.match(satir[0].karar_aciklamasi, /program adı/);
  /* İç not kullanıcıya GEÇMİYOR. */
  assert.doesNotMatch(satir[0].karar_aciklamasi, /üçüncü kez|aynı kişi/);
});

test('kabul kararı da aynı güvenli kanaldan okunuyor', async () => {
  await db.query(`delete from department_sectors where department_id =
                    (select id from departments where slug='tip')`);
  const id = await talepAc('Tıp');
  const bolum = (await tekil(`select id from departments where slug='tip'`))[0].id;
  const alan = (await tekil(`select id from sectors where slug='saglik-ilac'`))[0].id;

  await olarak(ADMIN, `select bolum_talebini_karara_bagla($1,$2,$3,$4,$5,$6)`,
    [id, 'eklendi', bolum, alan, 'İç not: eşleme eksikti.',
     'Bölümün eklendi. Artık alan topluluğuna katılabilirsin.']);

  const satir = await olarak(AYSE,
    `select status, karar_aciklamasi from department_requests where id=$1`, [id]);
  assert.equal(satir[0].status, 'eklendi');
  assert.match(satir[0].karar_aciklamasi, /Bölümün eklendi/);
});

test('KULLANICI BAŞKASININ TALEBİNİ VE AÇIKLAMASINI OKUYAMIYOR', async () => {
  /* Burak kendi talebini açıyor ve reddediliyor. */
  await db.query(`delete from department_requests where user_id=$1`, [BURAK]);
  const burakTalep = await olarak(
    BURAK,
    `insert into department_requests(user_id, requested_department) values ($1,$2) returning id`,
    [BURAK, 'Burak-a özel bölüm'],
  );
  await olarak(ADMIN, `select bolum_talebini_karara_bagla($1,$2,$3,$4,$5,$6)`,
    [burakTalep[0].id, 'reddedildi', null, null, 'İç not.',
     'Burak-a özel karar açıklaması.']);

  /* Ayşe hiçbir yoldan göremiyor. */
  const kimlikle = await olarak(AYSE,
    `select karar_aciklamasi from department_requests where id=$1`, [burakTalep[0].id]);
  assert.equal(kimlikle.length, 0, 'başkasının talebi kimlikle okundu');

  const hepsi = await olarak(AYSE, `select user_id from department_requests`);
  assert.ok(hepsi.every((r) => r.user_id === AYSE), 'başkasının satırı listeye sızdı');

  const metinle = await olarak(AYSE,
    `select karar_aciklamasi from department_requests
      where karar_aciklamasi like '%Burak%'`);
  assert.equal(metinle.length, 0, 'başkasının açıklaması metin aramasıyla okundu');
});

test('kullanıcı denetim tablosuna hiç erişemiyor', async () => {
  const okuma = await olarak(AYSE, `select id from bolum_talep_denetim`);
  assert.equal(okuma.length, 0, 'append-only denetim kullanıcıya açık');

  const yazma = await yazmayiDene(
    AYSE, `insert into bolum_talep_denetim(talep_id, karar, yapan, gerekce)
             values ($1,'eklendi',$2,'sahte')`, [null, AYSE]);
  assert.ok(yazma, 'kullanıcı denetim kaydı yazabildi');
});

test('eski satırlarda açıklama NULL — sahte gerekçe üretilmiyor', async () => {
  /*
    Karar açıklaması kolonu C aşamasının sonunda eklendi. Ondan önce
    kararlanmış bir satırda değer NULL kalıyor ve göç uydurma bir cümle
    YAZMIYOR: arayüz o durumda dürüst genel durumu gösteriyor.
  */
  const eski = await talepAc('Eski karar');
  await db.query(
    `update department_requests set status='reddedildi', karar_aciklamasi=null where id=$1`,
    [eski]);

  const satir = await olarak(AYSE,
    `select status, karar_aciklamasi from department_requests where id=$1`, [eski]);
  assert.equal(satir[0].status, 'reddedildi');
  assert.equal(satir[0].karar_aciklamasi, null, 'boş açıklama doldurulmuş');
});

test('karar RPC imzası: iç not ve kullanıcı açıklaması AYRI parametreler', async () => {
  const parametreler = await tekil(
    `select unnest(p.proargnames) ad from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname='public' and p.proname='bolum_talebini_karara_bagla'`,
  );
  assert.deepEqual(
    parametreler.map((r) => r.ad),
    ['p_talep_id', 'p_karar', 'p_department_id', 'p_sector_id', 'p_gerekce', 'p_karar_aciklamasi'],
  );

  /* Eski beş parametreli sürüm KALMAMALI: iki imza yan yana durursa
     açıklamasız karar yolu açık kalırdı. */
  const sayim = await tekil(
    `select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='bolum_talebini_karara_bagla'`);
  assert.equal(sayim[0].n, 1, 'eski imza düşürülmemiş');
});
