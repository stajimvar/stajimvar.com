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

  assert.deepEqual(Object.keys(c).sort(), [
    'aciklama',
    'anahtarKaynagi',
    'istemciAnahtari',
    'kartlar',
    'kitle',
  ]);
  assert.equal(c.aciklama, 'merhaba');
  assert.deepEqual(c.kartlar, ['/paylasim/a/01.jpg', '/paylasim/a/02.jpg']);
  /* Hikâyeler, ad ve tarih sosyal ağa geçmiyor. */
  assert.equal(JSON.stringify(c).includes('hikaye'), false);
  /* Kitle seçilebilir bir alan değil. */
  assert.equal(c.kitle, 'resmi');
  /*
    ANAHTAR TÜRETİLMİŞ UUID — RASTGELE DEĞİL

    `posts.istemci_anahtari` UUID tipinde (20260924010000) ve okunur bir
    dize yazılamıyor: ölçüldü, `invalid input syntax for type uuid`.
    Rastgele UUID de olmaz — ikinci çalıştırma yeni anahtar üretir ve
    AYNI SET İKİNCİ KEZ paylaşılırdı.

    Sürüm kaynağın içinde: v6 → v7 anahtarı değiştiriyor, yani
    düzeltilmiş içerik yeni paylaşım olarak çıkıyor.
  */
  assert.equal(c.anahtarKaynagi, 'instagram:deneme:v3');
  assert.match(c.istemciAnahtari, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  /* Aynı girdi her zaman aynı anahtar: idempotanlığın temeli. */
  assert.equal(c.istemciAnahtari, aktarilacak(set).istemciAnahtari);
  assert.notEqual(c.istemciAnahtari, aktarilacak({ ...set, surum: 'v4' }).istemciAnahtari);
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

test('veri okuyan kancalar YETKİ KAPISININ ÜSTÜNDE', () => {
  /*
    REACT #310 — CANLIDA ÖLÇÜLDÜ (13 Eylül 2026)

    Keşif etkisi `if (!oturumHazir) return` satırlarının ALTINDAYDI.
    Kancalar dallara giremez: oturum okunurken çalışan render daha az
    kanca çağırıyor, React "önceki render'dan fazla kanca" diyor ve
    AĞIM EKRANI BOMBOŞ açılıyordu.

    Kural: veri okuyan her kanca kapıların üstünde; kapılar yalnız
    ÇİZİMİ kesiyor.
  */
  const agim = oku('src/components/sosyal/AgimSayfasi.tsx');
  const kapi = agim.indexOf('yetki kapısı');
  assert.ok(kapi > 0, 'yetki kapısı bulunamadı');

  const altKisim = agim.slice(kapi);
  assert.doesNotMatch(altKisim, /React\.useEffect\(/, 'kapının altında kanca var');
  assert.doesNotMatch(altKisim, /React\.useState</, 'kapının altında kanca var');
  assert.doesNotMatch(altKisim, /React\.useRef</, 'kapının altında kanca var');

  /* Keşif etkisi gerçekten üstte. */
  assert.ok(agim.indexOf('alanindakiKisiler(kullaniciId, sektor)') < kapi);
});

test('resmî işareti YÖNETİCİ RPC ile veriliyor, elle UPDATE ile değil', () => {
  /*
    ÖLÇÜLDÜ (üretim, 13 Eylül 2026): bayrağı verecek desteklenen bir yol
    YOKTU.

      servis anahtarıyla UPDATE   42501 / resmi-bayragi-kilitli
        (servis anahtarı RLS'i atlıyor ama TETİKLEYİCİYİ atlamıyor)
      yönetici oturumuyla UPDATE  42501 / permission denied for table
        (UPDATE izni yalnız `avatar_path` sütununda, 20260924040000)

    Elle SQL de bir yol değil: tekrarlanabilir ve denetlenebilir değil.
    Çözüm depodaki kalıp — `security definer` + `is_admin()` kapısı.
  */
  const rpc = oku('supabase/migrations/20260928020000_resmi_hesap_isaretle.sql');
  assert.match(rpc, /create or replace function public\.resmi_hesap_isaretle\(/);
  assert.match(rpc, /language plpgsql\s*\n\s*security definer/);
  assert.match(rpc, /if not public\.is_admin\(\) then/);
  assert.match(rpc, /detail = 'yonetici-degil'/);

  /* Süzgeç birincil anahtar: başka satıra dokunması mümkün değil. */
  assert.match(rpc, /where profile_id = p_profil/);

  /*
    YORUMLAR ÇIKARILIYOR: gerekçe metni `connections` sözcüğünü
    geçiriyor (neden dokunulmadığını anlatıyor). Aranan şey KOD.
  */
  const kod = rpc.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*--.*$/gm, ' ');
  assert.doesNotMatch(kod, /connections/i, 'bağlantı tablosuna dokunmamalı');
  assert.doesNotMatch(kod, /insert into/i);
  /* Tek UPDATE, tek tablo. */
  assert.equal((kod.match(/update public\./g) || []).length, 1);

  /* anon çağıramıyor. */
  assert.match(rpc, /revoke all on function public\.resmi_hesap_isaretle\(uuid, boolean\) from public;/);
  assert.match(rpc, /grant execute on function public\.resmi_hesap_isaretle\(uuid, boolean\) to authenticated;/);
  assert.doesNotMatch(rpc, /to anon/);
});

test('görsel yolu ÜÇ PARÇALI: {yazar}/{post}/{dosya}', () => {
  /*
    CANLIDA ÖLÇÜLDÜ (13 Eylül 2026) — pilot aktarımda yakalandı.

    Betik dosyaları `{yazar}/{dosya}` diye İKİ parçalı yazıyordu.
    Yükleme başarılı oldu, `post_media` satırları açıldı, kart akışta
    göründü — ama şeritte tek bir `<img>` yoktu: depolama okuma
    politikası `sosyal_gizli.paylasim_dosyasi_gorunur` yolu bölüp
    ORTADAKİ parçayı paylaşım kimliği sayıyor ve üç parçadan azını
    doğrudan reddediyor. Yani paylaşımı gören herkes fotoğrafsız bir
    kart görüyordu; yalnız hesabın kendisi açabiliyordu (klasör adı
    kendi kimliğine eşit olduğu için).

    İstemcideki üç adımlı akış da aynı öneki kuruyor; tek biçim.
  */
  const betik = oku('scripts/resmi-paylasim-aktar.mjs');
  assert.match(betik, /const depoYolu = `\$\{resmiKimlik\}\/\$\{post\.id\}\/\$\{crypto\.randomUUID\(\)\}\.\$\{uzanti\}`;/);

  const istemci = oku('src/lib/queries/sosyal.ts');
  assert.match(istemci, /const onek = `\$\{satir\.author_id\}\/\$\{postId\}\/`;/);

  const depolama = oku('supabase/migrations/20260924020000_sosyal_depolama.sql');
  assert.match(depolama, /if array_length\(parcalar, 1\) is distinct from 3 then/);
});

