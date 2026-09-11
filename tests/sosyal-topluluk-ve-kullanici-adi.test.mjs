import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  G AŞAMASI — OTOMATİK PROFİL, KULLANICI ADI, ARAMA, ALAN TOPLULUKLARI

  Yalnız RİSKLİ ve YENİ davranışlar ölçülüyor. A–F'de kurulmuş
  garantiler (bağlantı akışı, engel, beğeni, arşiv, depolama) burada
  yeniden kurulmuyor; onların kendi dosyaları var.

  ÜÇ AYRI KAVRAM
  --------------
  Bu turun bütün riski tek cümlede: profil görünürlüğü, bağlantı ve
  topluluk üyeliği artık ayrı şeyler. Ayrıştırma yanlış yapılırsa iki
  yönde de kırılır — ya topluluk paylaşımları herkese açılır, ya profil
  topluluk olmadan hiç çalışmaz. Aşağıdaki testler iki yönü de ölçüyor.
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
  '../supabase/migrations/20260925010000_arsiv_sahibine_acik.sql',
  '../supabase/migrations/20260925020000_begeni_kimligi_gizli.sql',
  /* --- G --- */
  '../supabase/migrations/20260926010000_kullanici_adi_harfleri.sql',
  '../supabase/migrations/20260926020000_kullanici_adi_gecmisi.sql',
  '../supabase/migrations/20260926030000_alan_topluluklari.sql',
  '../supabase/migrations/20260926040000_uc_ayri_kavram.sql',
  '../supabase/migrations/20260926050000_otomatik_sosyal_profil.sql',
  '../supabase/migrations/20260926060000_kullanici_arama.sql',
  '../supabase/migrations/20260926070000_paylasim_topluluktan_bagimsiz.sql',
  '../supabase/migrations/20260926080000_bolum_takma_adlari.sql',
  '../supabase/migrations/20260926090000_profilimi_tamamla.sql',
].map((yol) => new URL(yol, import.meta.url));

const AYSE = '11111111-1111-4111-8111-111111111111';   // bilgisayar müh.
const BURAK = '22222222-2222-4222-8222-222222222222';  // bilgisayar müh.
const CEM = '33333333-3333-4333-8333-333333333333';    // moda tasarımı
const DENIZ = '44444444-4444-4444-8444-444444444444';  // bölümü eşleşmiyor

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

const yonetici = (sql, params = []) => db.query(sql, params).then((r) => r.rows);

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
      full_name text not null default ''
    );
    /*
      Gerçek şemadaki student_profiles çok daha geniş; burada yalnız
      otomatik profil akışının OKUDUĞU kolonlar var. Fazlasını taklit
      etmek, testi şemanın kopyasına çevirirdi.
    */
    create table public.student_profiles(
      id uuid primary key references public.profiles(id),
      department text
    );
    alter table public.profiles enable row level security;
    alter table public.student_profiles enable row level security;
    create function public.is_admin() returns boolean
      language sql stable security definer set search_path = public
      as $$ select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false) $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant execute on function public.is_admin() to anon, authenticated;
    grant select on public.profiles to authenticated;
  `);

  for (const dosya of DOSYALAR) await db.exec(await readFile(dosya, 'utf8'));

  /*
    Kullanıcılar TETİKLEYİCİ ÜZERİNDEN açılıyor: sosyal profil elle
    yazılmıyor. Testin ölçtüğü şeylerden biri tam olarak bu — kayıt
    tamamlanınca profil kendiliğinden var oluyor mu.
  */
  await db.exec(`insert into auth.users values ('${AYSE}'),('${BURAK}'),('${CEM}'),('${DENIZ}')`);
  await db.exec(`
    insert into public.profiles(id, full_name) values
      ('${AYSE}', 'Ayşe Gül Öztürk'),
      ('${BURAK}', 'Ayşe Gül Öztürk'),
      ('${CEM}', 'Cem Şahin'),
      ('${DENIZ}', 'Deniz Çınar');
  `);
});

/* --------------------------------------------------- KULLANICI ADI */

test('kullanıcı adı ad-soyaddan üretiliyor ve yalnız a-z içeriyor', async () => {
  const [a] = await yonetici(`select username from social_profiles where profile_id=$1`, [AYSE]);
  assert.match(a.username, /^[a-z]{3,30}$/, 'yalnız küçük İngilizce harf');
  assert.ok(a.username.startsWith('aysegulozturk'), `Türkçe harfler çevrilmeli: ${a.username}`);
});

test('aynı ad iki kişide çakışmıyor: ikincisi harften ek alıyor', async () => {
  const [a] = await yonetici(`select username from social_profiles where profile_id=$1`, [AYSE]);
  const [b] = await yonetici(`select username from social_profiles where profile_id=$1`, [BURAK]);
  assert.notEqual(a.username, b.username, 'İKİ KULLANICI AYNI ADI ALAMAZ');
  assert.match(b.username, /^[a-z]{3,30}$/, 'ekte rakam ya da işaret yok');
  const uzun = [a.username, b.username].find((u) => u !== 'aysegulozturk');
  assert.ok(uzun.startsWith('aysegulozturk'), 'ek tabanın sonuna geliyor');
});

test('istemci username kolonunu doğrudan yazamıyor', async () => {
  /*
    İki kapı var ve BİRİNCİSİ yetiyor: kolon yetkisi. `grant update
    (...)` listesinde `username` yok, bu yüzden istek daha politikaya
    varmadan reddediliyor. İkinci kapı `kimlik_kilidi` tetikleyicisi;
    o da yalnız RPC'nin açtığı oturum ayarıyla geçit veriyor.
  */
  const mesaj = await hata(AYSE, `update social_profiles set username='kacakad' where profile_id=$1`, [AYSE]);
  assert.match(String(mesaj), /permission denied|değişir/i, 'DOĞRUDAN YAZMA REDDEDİLMELİ');
});

test('kullanıcı adı RPC ile değişiyor; eski ad başkasına kapanıyor', async () => {
  const [{ username: eski }] = await yonetici(`select username from social_profiles where profile_id=$1`, [AYSE]);

  await olarak(AYSE, `select sosyal_kullanici_adi_degistir('yenikullaniciadi')`);
  const [{ username: yeni }] = await yonetici(`select username from social_profiles where profile_id=$1`, [AYSE]);
  assert.equal(yeni, 'yenikullaniciadi');

  const kapali = await hata(BURAK, `select sosyal_kullanici_adi_degistir($1)`, [eski]);
  assert.match(String(kapali), /alınmış/i, 'BIRAKILAN AD BAŞKASINA AÇILMAMALI');

  /* Geçersiz ad ham veritabanı hatası değil, kurallı bir cevap veriyor. */
  const gecersiz = await hata(AYSE, `select sosyal_kullanici_adi_degistir('Ayşe.123')`);
  assert.match(String(gecersiz), /kurala uymuyor/i);
});

test('eski adres güncel adrese çözülüyor', async () => {
  const [{ username: eski }] = await yonetici(
    `select eski_username as username from username_history where profile_id=$1`, [AYSE]);
  const coz = await olarak(BURAK, `select * from sosyal_kullanici_adi_coz($1)`, [eski]);
  assert.equal(coz.length, 1, 'eski ad çözülmeli');
  assert.equal(coz[0].guncel_username, 'yenikullaniciadi');

  /* Hiç var olmamış ad: "yok" cevabı değil, SIFIR SATIR. */
  const yok = await olarak(BURAK, `select * from sosyal_kullanici_adi_coz('hicolmayanad')`);
  assert.equal(yok.length, 0);
});

/* ---------------------------------------------------------- ARAMA */

test('arama Türkçe ve büyük harf girişinden etkilenmiyor, özel veri sızdırmıyor', async () => {
  const sonuc = await olarak(BURAK, `select * from sosyal_kullanici_ara('Yeni Kullanıcı')`);
  assert.equal(sonuc.length, 1, '"Yeni Kullanıcı" → "yenikullaniciadi" bulunmalı');

  /* Dönen kolonlar SABİT: kimlik, e-posta ve üyelik yok. */
  assert.deepEqual(
    Object.keys(sonuc[0]).sort(),
    ['avatar_path', 'bolum_etiketi', 'gorunen_ad', 'sehir', 'username'],
  );

  const kisa = await olarak(BURAK, `select * from sosyal_kullanici_ara('ye')`);
  assert.equal(kisa.length, 0, 'ÜÇ HARF ALTINDA DİZİN TARANAMAZ');
});

test('kapalı profil aramada çıkmıyor', async () => {
  await olarak(CEM, `update social_profiles set yayinda_mi=false where profile_id=$1`, [CEM]);
  const sonuc = await olarak(BURAK, `select * from sosyal_kullanici_ara('cemsahin')`);
  assert.equal(sonuc.length, 0, 'PROFİLİNİ KAPATAN KİŞİ BULUNAMAMALI');
  await olarak(CEM, `update social_profiles set yayinda_mi=true where profile_id=$1`, [CEM]);
});

/* ------------------------------------------------ TOPLULUK ÜYELİĞİ */

test('profil topluluk üyeliği OLMADAN çalışıyor', async () => {
  const uye = await yonetici(`select count(*)::int as adet from community_members`);
  assert.equal(uye[0].adet, 0, 'otomatik profil topluluğa KATMIYOR');

  /* Başka alandaki kullanıcı profili yine de görebiliyor. */
  const gorur = await olarak(CEM, `select username from social_profiles where profile_id=$1`, [BURAK]);
  assert.equal(gorur.length, 1, 'profil, topluluktan bağımsız görünür');
});

test('bölümüne uygun topluluğa katılabiliyor, başka topluluğa katılamıyor', async () => {
  await yonetici(`update social_profiles set department_id=(select id from departments where slug='bilgisayar-muhendisligi'), sector_id=(select ds.sector_id from department_sectors ds join departments d on d.id=ds.department_id where d.slug='bilgisayar-muhendisligi') where profile_id in ($1,$2)`, [AYSE, BURAK]);
  await yonetici(`update social_profiles set department_id=(select id from departments where slug='moda-tasarimi'), sector_id=(select ds.sector_id from department_sectors ds join departments d on d.id=ds.department_id where d.slug='moda-tasarimi') where profile_id=$1`, [CEM]);

  const [bilgisayar] = await yonetici(`select ds.sector_id from department_sectors ds join departments d on d.id=ds.department_id where d.slug='bilgisayar-muhendisligi'`);
  const [moda] = await yonetici(`select ds.sector_id from department_sectors ds join departments d on d.id=ds.department_id where d.slug='moda-tasarimi'`);

  await olarak(AYSE, `select sosyal_topluluga_katil($1)`, [bilgisayar.sector_id]);
  assert.equal(
    (await yonetici(`select count(*)::int as adet from community_members where profile_id=$1`, [AYSE]))[0].adet,
    1,
    'uygun topluluğa katılabilmeli',
  );

  /* AYSE mühendislik öğrencisi; moda topluluğuna KATILAMAZ. */
  const red = await hata(AYSE, `select sosyal_topluluga_katil($1)`, [moda.sector_id]);
  assert.match(String(red), /yetkin yok/i, 'BAŞKA ALANIN TOPLULUĞUNA KATILINAMAZ');

  /* Bölümü eşleşmeyen kullanıcı hiçbir topluluğa katılamıyor. */
  const tanimsiz = await hata(DENIZ, `select sosyal_topluluga_katil($1)`, [bilgisayar.sector_id]);
  assert.match(String(tanimsiz), /tanımlı değil|yetkin yok/i);
});

test('topluluk paylaşımı yalnız üyelere görünüyor ve üye olmayan o kitleyle paylaşamıyor', async () => {
  const [p] = await olarak(AYSE, `select * from sosyal_paylasim_baslat($1,$2,$3)`,
    ['00000000-0000-4000-8000-0000000000f1', 'topluluk notu', 'alan-toplulugum']);
  await olarak(AYSE, `select sosyal_paylasim_tamamla($1,$2::jsonb)`, [
    p.id, JSON.stringify([{ sira: 1, storage_path: `${AYSE}/${p.id}/bir.jpg` }]),
  ]);

  /* BURAK aynı bölümde ama topluluğa KATILMADI. */
  const uyeDegil = await olarak(BURAK, `select id from posts where id=$1`, [p.id]);
  assert.equal(uyeDegil.length, 0, 'ÜYE OLMAYAN TOPLULUK PAYLAŞIMINI GÖREMEZ');

  await olarak(BURAK, `select sosyal_topluluga_katil((select sector_id from social_profiles where profile_id=$1))`, [BURAK]);
  const uye = await olarak(BURAK, `select id from posts where id=$1`, [p.id]);
  assert.equal(uye.length, 1, 'üye olunca görünmeli');

  /* CEM başka topluluğun üyesi bile olsa göremiyor. */
  const baskaAlan = await olarak(CEM, `select id from posts where id=$1`, [p.id]);
  assert.equal(baskaAlan.length, 0);

  /* Üye olmayan bu kitleyle paylaşamıyor — sunucu reddediyor. */
  const yazamaz = await hata(CEM, `insert into posts(author_id, kitle, durum) values ($1,'alan-toplulugum','hazir')`, [CEM]);
  assert.ok(yazamaz, 'üyeliği olmayan alan-toplulugum kitlesiyle yazamamalı');
});

test('topluluktan ayrılmak profili, kullanıcı adını ve bağlantıyı bozmuyor', async () => {
  await olarak(AYSE, `insert into connections(requester_id, addressee_id) values ($1,$2)`, [AYSE, BURAK]);
  await olarak(BURAK, `update connections set durum='kabul' where requester_id=$1 and addressee_id=$2`, [AYSE, BURAK]);

  const [oncesi] = await yonetici(`select username, yayinda_mi, department_id from social_profiles where profile_id=$1`, [BURAK]);

  await olarak(BURAK, `select sosyal_topluluktan_ayril((select sector_id from social_profiles where profile_id=$1))`, [BURAK]);

  const [sonrasi] = await yonetici(`select username, yayinda_mi, department_id from social_profiles where profile_id=$1`, [BURAK]);
  assert.deepEqual(sonrasi, oncesi, 'AYRILMAK PROFİLE DOKUNMAMALI');

  const baglanti = await olarak(BURAK, `select durum from connections where requester_id=$1 and addressee_id=$2`, [AYSE, BURAK]);
  assert.equal(baglanti[0].durum, 'kabul', 'bağlantı korunmalı');

  /* Ama topluluk içeriğine erişim kapanıyor. */
  const gorur = await olarak(BURAK, `select id from posts where kitle='alan-toplulugum' and author_id=$1`, [AYSE]);
  assert.equal(gorur.length, 0, 'AYRILAN TOPLULUK İÇERİĞİNİ GÖREMEZ');
});

test('geçiş fonksiyonları tekrar çalıştırılabilir', async () => {
  const [{ sosyal_profilleri_tamamla: ikinci }] = await yonetici(`select sosyal_gizli.sosyal_profilleri_tamamla()`);
  assert.equal(ikinci, 0, 'ikinci çağrı hiçbir şeyi değiştirmemeli');

  /*
    İdempotanlık AYNI VERİ ÜZERİNDE ölçülüyor: arka arkaya iki çağrı.
    Araya test verisi girdiğinde birinci çağrının satır eklemesi doğru
    davranış — geçiş, o ana kadar üye sayılan herkesi kapsamak zorunda.
  */
  await yonetici(`select sosyal_gizli.topluluk_uyeligini_tasi()`);
  const oncekiUye = (await yonetici(`select count(*)::int as adet from community_members`))[0].adet;
  const [{ topluluk_uyeligini_tasi: ikinciTasima }] =
    await yonetici(`select sosyal_gizli.topluluk_uyeligini_tasi()`);
  const sonrakiUye = (await yonetici(`select count(*)::int as adet from community_members`))[0].adet;
  assert.equal(ikinciTasima, 0, 'ikinci taşıma satır eklememeli');
  assert.equal(sonrakiUye, oncekiUye, 'üye sayısı değişmemeli');
});

test('bölümü eşleşmeyen kullanıcı bağlantılarına paylaşım açabiliyor', async () => {
  /*
    ÖLÇÜLEN KUSUR: `sosyal_paylasim_baslat` "yayinda_mi ve sector_id dolu"
    arıyordu. `sector_id`, üyelik `community_members`e taşındıktan sonra
    artık üyelik demek DEĞİL; şart yerinde kalınca bölümü katalogla
    eşleşmeyen kullanıcı BAĞLANTILARINA bile paylaşım açamıyordu.
    DENIZ tam bu kişi: profili var, kullanıcı adı var, bölümü yok.
  */
  const [{ department_id: bolum, sector_id: alan }] =
    await yonetici(`select department_id, sector_id from social_profiles where profile_id=$1`, [DENIZ]);
  assert.equal(bolum, null, 'DENIZ bölümü eşleşmemiş olmalı');
  assert.equal(alan, null);

  const [p] = await olarak(DENIZ, `select * from sosyal_paylasim_baslat($1,$2,$3)`,
    ['00000000-0000-4000-8000-0000000000f2', 'bağlantı notu', 'baglantilarim']);
  assert.ok(p.id, 'TOPLULUKSUZ KULLANICI PAYLAŞIM AÇABİLMELİ');
  assert.equal(p.kitle, 'baglantilarim');

  /* Ama topluluk kitlesi hâlâ üyelik istiyor: kapı taşındı, açılmadı. */
  const red = await hata(DENIZ, `select * from sosyal_paylasim_baslat($1,$2,$3)`,
    ['00000000-0000-4000-8000-0000000000f3', 'olmaz', 'alan-toplulugum']);
  assert.ok(red, 'üyeliği olmayan alan-toplulugum kitlesiyle açamamalı');
});

/* ------------------------------------------------- KAPANIŞ DÜZELTMELERİ */

test('iki onaylı takma ad eşleşiyor, onaysız ad TAHMİN EDİLMİYOR', async () => {
  /*
    Canlıda ölçülen üç eşleşmeyen değerin ikisi katalogun "A / B" adına
    takılan yazım farkıydı, biri gerçek katalog eksiği. İlk ikisi açık
    listeye girdi; üçüncüsü BİLEREK dışarıda — yakın bir bölüme
    bağlamak öğrenciyi yanlış alan topluluğuna sokardı.
  */
  const [giyim] = await yonetici(`select sosyal_gizli.bolumu_esle('Giyim Üretim Teknolojisi') as id`);
  const [iktisat] = await yonetici(`select sosyal_gizli.bolumu_esle('İktisat') as id`);
  const [spor] = await yonetici(`select sosyal_gizli.bolumu_esle('Spor Yöneticiliği') as id`);

  const [{ id: giyimKatalog }] = await yonetici(`select id from departments where slug='giyim-uretim-teknolojisi'`);
  const [{ id: iktisatKatalog }] = await yonetici(`select id from departments where slug='iktisat'`);

  assert.equal(giyim.id, giyimKatalog, 'takma ad katalog satırına bağlanmalı');
  assert.equal(iktisat.id, iktisatKatalog);
  assert.equal(spor.id, null, 'ONAYSIZ AD EŞLEŞMEMELİ');

  /* Büyük harf ve boşluk farkı da aynı satıra düşüyor. */
  const [bosluklu] = await yonetici(`select sosyal_gizli.bolumu_esle('  GİYİM ÜRETİM TEKNOLOJİSİ  ') as id`);
  assert.equal(bosluklu.id, giyimKatalog);
});

test('profilimi tamamla: dar, idempotent, topluluğa katmıyor', async () => {
  /* DENIZ bölümsüz açılmıştı; bölümünü girince RPC tamamlamalı. */
  await db.exec(`insert into public.student_profiles(id, department) values ('${DENIZ}','İktisat')`);

  const [ilk] = await olarak(DENIZ, `select * from sosyal_profilimi_tamamla()`);
  assert.ok(ilk.department_id, 'bölüm sunucuda çözülmeli');
  assert.ok(ilk.sector_id, 'alan da bağlanmalı');

  /* İkinci çağrı hiçbir şeyi değiştirmiyor. */
  const [ikinci] = await olarak(DENIZ, `select * from sosyal_profilimi_tamamla()`);
  assert.deepEqual(ikinci, ilk, 'İDEMPOTENT OLMALI');

  /* Topluluğa KATMIYOR. */
  const uye = await yonetici(`select count(*)::int as adet from community_members where profile_id=$1`, [DENIZ]);
  assert.equal(uye[0].adet, 0, 'RPC TOPLULUĞA KATMAMALI');

  /* Kullanıcı adı yalnız harf ve eşsiz kalmaya devam ediyor. */
  const adlar = await yonetici(`select username from social_profiles where username is not null`);
  for (const { username } of adlar) assert.match(username, /^[a-z]{3,30}$/);
  assert.equal(new Set(adlar.map((r) => r.username)).size, adlar.length, 'adlar eşsiz olmalı');
});
