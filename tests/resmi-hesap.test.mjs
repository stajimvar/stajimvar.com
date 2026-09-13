import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ACIKLAMA_SINIRI,
  EN_FAZLA_FOTOGRAF,
  aktarilacak,
  etkilesimAlaniVarMi,
  setleriOku,
} from '../scripts/resmi-paylasim-aktar.mjs';

/*
  RESMÎ HESAP

  Yeni kullanıcının akışı bomboş açılıyordu: paylaşımlar bağlantılardan
  ve alan topluluğundan geliyor, ikisi de ilk gün yok.

  Çözüm SAHTE BAĞLANTI DEĞİL, üçüncü bir kitle. Bu testler o kararın üç
  sonucunu koruyor: bağlantı sayacının kirlenmemesi, resmî kitlenin
  taklit edilememesi ve Instagram etkileşim verisinin taşınmaması.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const goc = oku('supabase/migrations/20260928010000_resmi_hesap.sql');

/* ------------------------------------------------------------ sunucu */

test('resmî işareti yalnız yönetici yazabiliyor', () => {
  /*
    `kendi sosyal profilini gunceller` politikası satırın TAMAMINI
    yazdırıyor ve Postgres'te RLS kolon bazlı değil: bayrak eklenince
    kullanıcı kendi satırında `resmi_mi = true` yazabilir, akışta
    "StajımVar'dan" etiketiyle görünebilirdi. Kapı bu yüzden
    tetikleyicide.
  */
  assert.match(goc, /create or replace function sosyal_gizli\.resmi_bayragi_kilidi\(\)/);
  assert.match(goc, /not public\.is_admin\(\)/);
  assert.match(goc, /errcode = '42501', detail = 'resmi-bayragi-kilitli'/);
  /*
    INSERT'te de: `old` null olduğu için `coalesce(old.resmi_mi,false)`
    false veriyor ve resmî olarak AÇILAN satır da kapıdan geçiyor.
    Aksi hâlde kullanıcı satırını silip resmî olarak yeniden açardı.
  */
  assert.match(goc, /before insert or update on public\.social_profiles/);
  assert.match(goc, /coalesce\(new\.resmi_mi, false\) is distinct from coalesce\(old\.resmi_mi, false\)/);
});

test('resmî kitleyle yalnız resmî hesap paylaşabiliyor', () => {
  /*
    Kitle istemciden geliyor. Kapı olmasaydı herhangi bir kullanıcı
    `kitle = 'resmi'` ile paylaşıp BÜTÜN kullanıcıların akışına
    düşerdi — yetkisiz yayın.
  */
  assert.match(goc, /check \(kitle in \('baglantilarim', 'alan-toplulugum', 'resmi'\)\)/);
  assert.match(goc, /if new\.kitle = 'resmi'[\s\S]{0,220}sp\.resmi_mi/);
  assert.match(goc, /errcode = '42501', detail = 'resmi-hesap-degil'/);
  /*
    Kural mevcut tetikleyiciye eklendi; ikinci bir tetikleyici, iki
    kuralın hangi sırayla koştuğunu belirsiz bırakırdı.
  */
  assert.match(goc, /create or replace function sosyal_gizli\.paylasim_kitlesi_kilidi\(\)/);
  assert.match(goc, /topluluk-uyeligi-yok/, 'eski kural korunmalı');
});

test('resmî içerik giriş yapan herkese açık, yayın şartına bağlı değil', () => {
  /*
    Yeni hesabın kendi profili varsayılan olarak yayında DEĞİL
    (`yayinda_mi default false`). Okuma şartı olarak `sosyal_gorunur`
    yazılsaydı akış yine boş açılırdı — çözülmek istenen şeyin ta
    kendisi.
  */
  const dal = goc.slice(goc.indexOf("p.kitle = 'resmi'"), goc.indexOf("or (\n              sosyal_gizli.sosyal_gorunur"));
  assert.match(dal, /auth\.uid\(\) is not null/);
  assert.match(dal, /sp\.resmi_mi/);
  assert.doesNotMatch(dal, /sosyal_gorunur/);
  /* Öteki iki kitle eskisi gibi: yazar görünür olmalı. */
  assert.match(goc, /sosyal_gizli\.sosyal_gorunur\(p\.author_id\)\s*\n\s*and \(/);
});

test('sessizlik bir YETKİ kuralı değil: RLS’te değil sorguda', () => {
  /*
    Sessize alınmış içerik yetkisiz değil, istenmeyen içerik.
    `paylasim_gorunur`a konsaydı, ileride paylaşımın kalıcı adresi
    açıldığında sessize almış kullanıcı paylaşılan bir bağlantıyı
    açamazdı — tercih bir duvara dönüşürdü.
  */
  const gorunur = goc.slice(goc.indexOf('create or replace function sosyal_gizli.paylasim_gorunur'));
  assert.doesNotMatch(gorunur, /sosyal_resmi_sessiz/);

  const sorgu = oku('src/lib/queries/sosyal.ts');
  assert.match(sorgu, /tumSatirlar\.filter\(\(s: any\) => s\.kitle !== 'resmi'\)/);
});

test('sessizlik kullanıcının KENDİ satırı; başkasınınki okunmuyor', () => {
  assert.match(goc, /create table if not exists public\.sosyal_resmi_sessiz/);
  assert.match(goc, /alter table public\.sosyal_resmi_sessiz enable row level security/);
  /* Üç politikanın üçü de aynı sınırı çiziyor. */
  for (const kalip of [
    /for select to authenticated using \(profile_id = auth\.uid\(\)\)/,
    /for insert to authenticated with check \(profile_id = auth\.uid\(\)\)/,
    /for delete to authenticated using \(profile_id = auth\.uid\(\)\)/,
  ]) {
    assert.match(goc, kalip);
  }
});

test('BAĞLANTI SAYACI KİRLENMİYOR: connections tablosuna satır açılmıyor', () => {
  /*
    İlk akla gelen çözüm her yeni hesaba resmî hesapla bir
    `connections` satırı açmaktı. Sayaç o tabloyu sayıyor
    (`sosyal_sayaclar`): kullanıcı hiç kimseyle bağlantı kurmamışken
    profilinde "1 bağlantı" yazardı.
  */
  assert.doesNotMatch(goc, /insert into public\.connections/i);
  assert.doesNotMatch(goc, /create or replace function public\.sosyal_sayaclar/);
  /* Karar yazılı olsun ki ileride "resmî hesabı da sayalım mı" sorusu cevaplı gelsin. */
  assert.match(goc, /BAĞLANTI SAYACI DOKUNULMADI/);
});

/* ------------------------------------------------------------ aktarım */

test('Instagram setinden YALNIZ metin ve kartlar taşınıyor', () => {
  const set = {
    kod: 'deneme',
    surum: 'v3',
    ad: 'Deneme',
    guncellendi: '2026-09-13',
    metin: 'merhaba',
    kartlar: ['/paylasim/a/01.jpg', '/paylasim/a/02.jpg'],
    hikayeler: ['/paylasim/hikaye/a/01.jpg'],
  };
  const c = aktarilacak(set);

  assert.deepEqual(Object.keys(c).sort(), ['aciklama', 'istemciAnahtari', 'kartlar', 'kitle']);
  assert.equal(c.aciklama, 'merhaba');
  assert.deepEqual(c.kartlar, ['/paylasim/a/01.jpg', '/paylasim/a/02.jpg']);
  /* Hikâyeler, ad ve tarih sosyal ağa geçmiyor. */
  assert.equal(JSON.stringify(c).includes('hikaye'), false);
  /* Kitle seçilebilir bir alan değil. */
  assert.equal(c.kitle, 'resmi');
  /* Sürüm anahtarın içinde: düzeltilen içerik yeni paylaşım oluyor. */
  assert.equal(c.istemciAnahtari, 'instagram:deneme:v3');
});

test('etkileşim verisi taşınmıyor; varsa betik DURUYOR', () => {
  /*
    Instagram'daki bir sayıyı buraya taşımak, bu ağda hiç olmamış bir
    etkileşimi olmuş gibi göstermek olurdu: "1.200 beğeni" yazan bir
    kart, o beğenilerin buradaki kullanıcılardan geldiğini ima eder.

    Sessizce atmak yerine DURMAK bilinçli: alan varsa setin biçimi
    değişmiş demektir ve neyin taşındığına yeniden bakılmalı.
  */
  assert.deepEqual(etkilesimAlaniVarMi({ kod: 'a', metin: 'x' }), []);
  assert.deepEqual(etkilesimAlaniVarMi({ kod: 'a', begeni: 1200 }), ['begeni']);
  assert.deepEqual(etkilesimAlaniVarMi({ comments: [], likes: 3 }).sort(), ['comments', 'likes']);

  const betik = oku('scripts/resmi-paylasim-aktar.mjs');
  assert.match(betik, /process\.exitCode = 1;/);
  assert.match(betik, /Bu veriler sosyal ağa taşınmıyor/);
});

test('sunucudaki sınırlar aktarımda da geçerli', () => {
  const c = aktarilacak({
    kod: 'a',
    surum: 'v1',
    metin: 'x'.repeat(ACIKLAMA_SINIRI + 500),
    kartlar: Array.from({ length: EN_FAZLA_FOTOGRAF + 5 }, (_, i) => `/p/${i}.jpg`),
  });
  assert.equal(c.aciklama.length, ACIKLAMA_SINIRI);
  assert.equal(c.kartlar.length, EN_FAZLA_FOTOGRAF);
});

test('gerçek setler bu borudan geçebiliyor', () => {
  /*
    Kaynak dosya gerçekten okunuyor: alan adları değişirse (metin →
    aciklama gibi) aktarım sessizce boş paylaşım üretirdi.
  */
  const setler = setleriOku();
  assert.ok(setler.length > 0);
  const dolu = setler.filter((s) => aktarilacak(s).kartlar.length > 0);
  assert.ok(dolu.length > 0, 'hiçbir sette kart yok — biçim değişmiş olabilir');
  for (const s of setler) assert.deepEqual(etkilesimAlaniVarMi(s), []);
});

/* ------------------------------------------------------------ arayüz */

test('etiket paylaşımdan okunuyor, yazardan değil', () => {
  const sorgu = oku('src/lib/queries/sosyal.ts');
  const kart = oku('src/components/sosyal/AkisKarti.tsx');

  /*
    "Bu paylaşım resmî kitleyle yayımlandı" demek. Yazarın bayrağına
    bakılsaydı, resmî hesabın ileride sıradan bir paylaşımı da resmî
    içerik gibi etiketlenirdi.
  */
  assert.match(sorgu, /resmiMi: satir\.kitle === 'resmi',/);
  assert.match(kart, /paylasim\.resmiMi \? \(/);
  assert.match(kart, /StajımVar'dan · Resmî içerik/);

  /*
    `resmi` kullanıcının SEÇEBİLECEĞİ bir kitle değil: besteciye
    seçenek olarak düşmesin diye `PaylasimKitlesi` dışında.
  */
  assert.match(sorgu, /export type PaylasimKitlesi = 'baglantilarim' \| 'alan-toplulugum';/);
  assert.match(sorgu, /export type OkunanKitle = PaylasimKitlesi \| 'resmi';/);
});

test('kaldırma yok, sessize alma var', () => {
  const kart = oku('src/components/sosyal/AkisKarti.tsx');
  const agim = oku('src/components/sosyal/AgimSayfasi.tsx');

  /* Düğme yalnız resmî kartta: olmayan bir eylem vaat edilmiyor. */
  assert.match(kart, /\{paylasim\.resmiMi && onSessizeAl && \(/);
  assert.match(kart, />\s*Sessize al\s*</);
  assert.match(agim, /onSessizeAl=\{p\.resmiMi \? \(\) => sessizligiDegistir\(true\) : undefined\}/);

  /*
    GERİ DÖNÜŞ YOLU ŞART: susturduğu şeyi nasıl geri açacağını bilmeyen
    kullanıcı, sessizliği kalıcı bir kayıp sanır. Satır boş akışta da
    çiziliyor — sessize almış kullanıcının akışı bomboş kalabiliyor.
    */
  assert.match(agim, /Sesi aç/);
  assert.match(agim, /\{sessizlikSatiri\}\s*\n\s*\{bosDurum\}/);

  /* Yazma başarısız olursa ekran ESKİ hâline dönüyor. */
  assert.match(agim, /setResmiSessiz\(!sessiz\);\s*\n\s*setAkis\(oncekiAkis\);/);
});

test('keşif yalnız kullanıcı içeriği yokken, deneme kayıtları dışarıda', () => {
  const agim = oku('src/components/sosyal/AgimSayfasi.tsx');
  const sorgu = oku('src/lib/queries/sosyal.ts');

  /* Sayıya değil TÜRE bakılıyor: yirmi resmî paylaşım da "içerik yok" demek. */
  assert.match(agim, /const kullaniciIcerigiVar = akis\.some\(\(p\) => !p\.resmiMi\);/);
  assert.match(agim, /if \(durum !== 'hazir' \|\| kullaniciIcerigiVar/);

  /*
    "Önerilen kişiler" bir kez kaldırılmıştı: hesapların bir kısmı
    deneme kaydıydı ve onları "alanındaki kişiler" diye önermek
    gerçek olmayan bir topluluk göstermek olurdu. Ürün kararı
    değişti ama ESKİ GEREKÇE KURALA ÇEVRİLDİ.
  */
  assert.match(sorgu, /\.not\('username', 'is', null\)/);
  assert.match(sorgu, /\.not\('gorunen_ad', 'is', null\)/);
  assert.match(sorgu, /\.eq\('yayinda_mi', true\)/);
  assert.match(sorgu, /\.eq\('resmi_mi', false\)/);
  assert.match(sorgu, /\.neq\('profile_id', kullaniciId\)/);

  /* Satırlar aramayla AYNI bileşenden: iki ekranda iki biçim olmasın. */
  assert.match(agim, /<KisiListesi kisiler=\{kesif\} onNavigate=\{onNavigate\} \/>/);
  assert.match(oku('src/components/sosyal/KullaniciArama.tsx'), /export const KisiListesi/);
});
