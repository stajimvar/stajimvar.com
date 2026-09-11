import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  BIYOGRAFI_SINIRI,
  KULLANICI_ADI_DESENI,
  biyografiHatasi,
  kullaniciAdiGecerliMi,
  kullaniciAdiHatasi,
  kullaniciAdiNormalize,
  profilYolu,
} from '../src/lib/sosyal-kullanici-adi.mjs';

/*
  SOSYAL PORTFOLYO — B AŞAMASI ARAYÜZÜ

  Bu dosyanın konusu üç şey:

  1. Kullanıcı adı kuralının veritabanındaki CHECK kısıtından AYRILMAMASI.
     Arayüz gevşek davransaydı, kullanıcı sunucunun reddedeceği bir adı
     "geçerli" görüp kaydet düğmesine basardı.

  2. Görünürlüğün bir güvenlik sınırı olduğu: sahibe özel menüler
     ziyaretçide gizlenmiyor, DOM'a HİÇ girmiyor; profilin var/yok ayrımı
     tek bir güvenli ekranın arkasında kalıyor.

  3. Arka ucu olmayan hiçbir satırın çizilmemesi. Göç dosyaları
     `highlights` tablosunu açıkça ertelemiş, mesaj ve yorum tablosu hiç
     yok; bunların arayüzde karşılığı da olmamalı — "yakında" etiketi
     dahil.

  Veritabanı hiçbir yere uygulanmadı, dolayısıyla burada gerçek sorgu
  çalıştırılmıyor. Ölçülen şey kaynak metnin kendisi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

const sorgular = oku('src/lib/queries/sosyal.ts');
/*
  `SosyalProfilKurulum.tsx` BU LİSTEDEN ÇIKTI — dosya silindi.

  Ekran kullanıcıdan ad, bölüm ve görünürlük alıp `sosyal_profil_kur`
  RPC'sini çağırıyordu. 20260926050000 satırı kayıt anında SUNUCUDA
  açıyor, 20260926090000 da eksik kalanı tamamlamak için argümansız bir
  kapı veriyor: kullanıcının gireceği bir bilgi kalmadı, dolayısıyla
  soracak bir form da. Dosya ağaçta dursaydı hiçbir yerden çizilmeyen
  bir ekranın iddiaları burada ölçülmeye devam eder ve o iddialar
  üründe karşılığı olmayan bir akışı canlı gibi gösterirdi.

  Kurulum ekranına bağlı iddialar (kurulum RPC'si, kurulum hata kodları,
  kurulumdaki bölüm listesi) bu dosyadan kalktı. Kalanlar duruyor.
*/
const gorunum = oku('src/components/sosyal/SosyalProfilGorunumu.tsx');
const menu = oku('src/components/sosyal/ProfilAyarMenusu.tsx');
const izgara = oku('src/components/sosyal/PaylasimIzgarasi.tsx');
/*
  `TopluluktaDegilUyarisi.tsx` BU LİSTEDEN ÇIKTI — dosya silindi.

  Kutu "Alan topluluğuna henüz katılmadın" diyordu ve koşulu
  `!yayinda_mi` idi. 20260926040000 o kolonun anlamını yalnız profil
  görünürlüğüne indirdi, üyeliği de `community_members`e taşıdı: cümle
  artık olmayan bir durumu anlatıyordu. Kutuyu "profilin kapalı" diye
  yeniden yazmak, kullanıcının kendi açtığı bir ayarı her açılışta
  uyarıya çevirirdi. Üyeliğin kendi ekranı var (`/topluluklar`).
*/
const topluluklar = oku('src/components/sosyal/TopluluklarSayfasi.tsx');
const arama = oku('src/components/sosyal/KullaniciArama.tsx');
/* Tek profil fotoğrafı: çizen bileşen ve kaynağı seçen yardımcı. */
const fotograf = oku('src/components/sosyal/ProfilFotografi.tsx');
const fotografKaynagi = oku('src/lib/profil-fotografi.ts');
const ustSatir = oku('src/components/sosyal/PortfolyoUstSatiri.tsx');
const olustur = oku('src/components/sosyal/PaylasimOlustur.tsx');
const ogrenciProfili = oku('src/components/StudentProfileView.tsx');
const profilBasligi = oku('src/components/ProfilBasligi.tsx');
const sayfa = oku('src/components/sosyal/SosyalProfilSayfasi.tsx');
const duzenleme = oku('src/components/sosyal/SosyalProfilDuzenleme.tsx');
const alanlar = oku('src/components/sosyal/SosyalFormAlanlari.tsx');
/* C aşaması arayüzü. */
const bolumSecimi = oku('src/components/sosyal/BolumSecimi.tsx');
const bolumTalebi = oku('src/components/sosyal/BolumTalebi.tsx');
const baglantiDugmesi = oku('src/components/sosyal/BaglantiDugmesi.tsx');
const baglantilar = oku('src/components/sosyal/BaglantilarSayfasi.tsx');
const talepKuyrugu = oku('src/components/yonetim/BolumTalepleri.tsx');
/* Kuyruğa girişin çizildiği yer: mevcut yönetim paneli. */
const panel = oku('src/components/AdminDashboard.tsx');
const app = oku('src/App.tsx');
/* Alt gezinme çubuğu: birleşik ekranın tek girişi. */
const ustCubuk = oku('src/components/Header.tsx');
const orta = oku('functions/_middleware.ts');
const hesapSayfasi = oku('src/components/AccountSheet.tsx');
const sema = oku('supabase/migrations/20260921010000_sosyal_katman_semasi.sql');
const rls = oku('supabase/migrations/20260921020000_sosyal_katman_rls.sql');
/*
  Kurulum RPC'sinin göç dosyası artık BU DOSYADA okunmuyor: imzasını ve
  hata kodlarını ölçen iki iddia kurulum ekranıyla birlikte kalktı.
  Göç dosyası duruyor ve veritabanı tarafındaki testleri de duruyor —
  ölçümü orada yapılıyor.
*/
const tamamlamaRpc = oku('supabase/migrations/20260926090000_profilimi_tamamla.sql');
const durumRpc = oku('supabase/migrations/20260923080000_baglanti_durumu_rpc.sql');
const kararRpc = oku('supabase/migrations/20260923060000_talep_kuyrugu_karari.sql');
const kararAciklamasiRpc = oku('supabase/migrations/20260923090000_talep_karar_aciklamasi.sql');

/*
  YORUMLAR ÖLÇÜMÜN DIŞINDA

  Bu depoda yorumlar NEDEN'i anlatıyor ve bir şeyin neden ÇİZİLMEDİĞİNİ
  yazmak için o şeyin adını anmak zorundalar ("öne çıkanlar yok",
  "Bağlantıda sayacı yok"). "Şu metin ekranda geçmiyor" ölçümü yorumlara
  bakarsa, doğru yazılmış bir gerekçe testi düşürür. Bu yüzden yokluk
  ölçümleri yorumsuz kaynak üzerinde yapılıyor.
*/
function yorumsuz(kaynak) {
  return kaynak
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    /* `[^:]` öneki adres içindeki `https://` gibi dizileri korumak için. */
    .replace(/(^|[^:])\/\/.*/gm, '$1');
}

/** Bir fonksiyon gövdesini işaretten işarete kesiyor. */
function govdeAl(kaynak, baslangicIsareti, bitisIsareti) {
  const bas = kaynak.indexOf(baslangicIsareti);
  if (bas < 0) return '';
  const son = kaynak.indexOf(bitisIsareti, bas + baslangicIsareti.length);
  return son < 0 ? kaynak.slice(bas) : kaynak.slice(bas, son);
}

const SOSYAL_BILESENLER = [
  gorunum,
  menu,
  izgara,
  sayfa,
  duzenleme,
  alanlar,
  bolumSecimi,
  bolumTalebi,
  baglantiDugmesi,
  baglantilar,
];
const SOSYAL_BILESENLER_YORUMSUZ = SOSYAL_BILESENLER.map(yorumsuz);

/* ------------------------------------------------------------------ */
/*  KULLANICI ADI                                                      */
/* ------------------------------------------------------------------ */

test('arayüz deseni veritabanındaki CHECK kısıtının aynısı', () => {
  /* Kısıt şemada tek satır: username ~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$' */
  assert.match(sema, /\^\[a-z0-9\]\[a-z0-9\._\]\{1,28\}\[a-z0-9\]\$/);
  assert.equal(KULLANICI_ADI_DESENI.source, '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$');
});

test('büyük harf reddedilmiyor, küçültülüyor', () => {
  assert.equal(kullaniciAdiNormalize('  Ayse.Yilmaz '), 'ayse.yilmaz');
  assert.equal(kullaniciAdiHatasi('Ayse.Yilmaz'), null);
});

test('Türkçe karakter sebebiyle birlikte reddediliyor', () => {
  const hata = kullaniciAdiHatasi('ayşe');
  assert.ok(hata, 'Türkçe karakterli ad geçerli sayılmamalı');
  assert.match(hata, /Türkçe karakter/);

  /*
    'İ'.toLowerCase() 'i' + birleşen nokta üretiyor; küçültme tek başına
    kurtarmıyor ve bu tam olarak şemanın kapattığı tuzak.
  */
  const buyukI = kullaniciAdiHatasi('İstanbul');
  assert.ok(buyukI, 'İ ile başlayan ad geçerli sayılmamalı');
});

test('uzunluk sınırları kullanıcıya ayrı ayrı söyleniyor', () => {
  assert.match(kullaniciAdiHatasi('ab'), /en az 3/);
  assert.match(kullaniciAdiHatasi('a'.repeat(31)), /en fazla 30/);
  assert.equal(kullaniciAdiHatasi('abc'), null);
  assert.equal(kullaniciAdiHatasi('a'.repeat(30)), null);
});

test('nokta ve alt çizgi başta ya da sonda olamıyor', () => {
  assert.match(kullaniciAdiHatasi('.ayse'), /başında ya da sonunda/);
  assert.match(kullaniciAdiHatasi('ayse_'), /başında ya da sonunda/);
  assert.equal(kullaniciAdiHatasi('a.y_s.e'), null);
});

test('boşluk ve izinsiz karakter ayrı cümlelerle reddediliyor', () => {
  assert.match(kullaniciAdiHatasi('ayse yilmaz'), /boşluk/);
  assert.match(kullaniciAdiHatasi('ayse-yilmaz'), /nokta ve alt çizgi/);
  assert.match(kullaniciAdiHatasi(''), /gerekiyor/);
  assert.match(kullaniciAdiHatasi('   '), /gerekiyor/);
});

test('geçerlilik yardımcısı desenle aynı sonucu veriyor', () => {
  for (const ad of ['ayse', 'a1.b2_c3', 'x'.repeat(30), 'ab', '.a', 'a_', 'ayşe', '']) {
    assert.equal(
      kullaniciAdiGecerliMi(ad),
      KULLANICI_ADI_DESENI.test(kullaniciAdiNormalize(ad)),
      `desenle ayrışan girdi: ${JSON.stringify(ad)}`,
    );
  }
});

test('biyografi sınırı şemadaki uzunlukla aynı', () => {
  assert.match(sema, /length\(biyografi\) <= 300/);
  assert.equal(BIYOGRAFI_SINIRI, 300);
  assert.equal(biyografiHatasi('a'.repeat(300)), null);
  assert.match(biyografiHatasi('a'.repeat(301)), /en fazla 300/);
});

test('profil adresi tek yerden üretiliyor', () => {
  assert.equal(profilYolu('ayse'), '/profil/ayse');
});

/* ------------------------------------------------------------------ */
/*  SORGULAR                                                           */
/* ------------------------------------------------------------------ */

test('sahiplik kullanıcı adından değil oturum kimliğinden okunuyor', () => {
  /*
    Kendi profilini okuyan sorgu kimliği OTURUMDAN alıyor. Kullanıcı
    adıyla sorgulasaydı, adres çubuğuna başkasının adını yazan kişi
    "böyle bir profil var mı" cevabını sorgunun boş dönüp dönmemesinden
    okurdu.
  */
  const govde = govdeAl(
    yorumsuz(sorgular),
    'export async function kendiSosyalProfiliGetir',
    'export async function sosyalProfilimiTamamla',
  );
  assert.ok(govde.length > 0, 'kendi profil fonksiyonu bulunamadı');
  assert.match(govde, /\.eq\('profile_id', kullaniciId\)/);
  assert.doesNotMatch(govde, /username/);
});

test('ziyaretçi profili de profile_id ile okunuyor; ad yalnız kimliğe çevriliyor', () => {
  /*
    Rotadaki ad tek başına bir profil getirmiyor: önce RLS'e tabi bir
    sorguyla kimliğe çevriliyor (görünmeyen profil için sıfır satır),
    sonra profil o kimlikle okunuyor. Böylece ziyaretçi yolu ile sahip
    yolu aynı kapıdan geçiyor.
  */
  const cevrim = govdeAl(
    yorumsuz(sorgular),
    'export async function sosyalProfilKimligiGetir',
    'export async function sosyalProfiliGetir',
  );
  assert.ok(cevrim.length > 0, 'kullanıcı adı → kimlik çevrimi bulunamadı');
  /* Çevrim YALNIZ kimliği okuyor: profilin geri kalanı bu sorgudan gelmiyor. */
  assert.match(cevrim, /\.select\('profile_id'\)/);
  assert.match(cevrim, /\.eq\('username', kullaniciAdiNormalize\(kullaniciAdi\)\)/);
  assert.match(cevrim, /return data\?\.profile_id \?\? null;/);

  const okuma = govdeAl(
    yorumsuz(sorgular),
    'export async function sosyalProfiliGetir',
    'export async function kendiSosyalProfiliGetir',
  );
  assert.ok(okuma.length > 0, 'ziyaretçi profil okuması bulunamadı');
  assert.match(okuma, /\.eq\('profile_id', profilId\)/);
});

test('sektör listesi kapalı: aktif olanlar sıraya göre', () => {
  assert.match(sorgular, /\.from\('sectors'\)/);
  assert.match(sorgular, /\.eq\('aktif', true\)/);
  assert.match(sorgular, /\.order\('sira', \{ ascending: true \}\)/);
});

test('social_profiles üzerinden sectors gömmesi FK ipucusuz geçmiyor', () => {
  /*
    KÖK NEDEN, canlıda ölçüldü: 20260926030000 ile gelen
    `community_members(profile_id, sector_id)` PostgREST için
    social_profiles ↔ sectors arasında ikinci bir yol açtı. İpucusuz
    `sectors ( ad )` HTTP 300 / PGRST201 döndürdü ve /cv "Portfolyon
    alınamadı" ekranına düştü; `sectors!social_profiles_sector_id_fkey ( ad )`
    200. Bu iddia ipucunun "gereksiz" diye silinmesini kaynak düzeyinde
    yakalıyor. `departments ( ad )` tek yollu (ölçüldü: 200), kapsam dışı.
  */
  assert.doesNotMatch(yorumsuz(sorgular), /sectors\s*\(/);
  assert.ok(
    (yorumsuz(sorgular).match(/sectors!social_profiles_sector_id_fkey\s*\(\s*ad\s*\)/g) ?? []).length >= 2,
    'PROFIL_KOLONLARI ve bağlantı listesi: iki gömme de ipuçlu olmalı',
  );
});

/*
  KURULUM RPC'SİNİN ÜÇ İDDİASI BURADAN KALKTI

  Üçü de `SosyalProfilKurulum` ekranını ve `sosyalProfilKur` sarmalayıcısını
  ölçüyordu: topluluğa katılma onay kutusunun kapalı başladığını, RPC
  gövdesinde alan kimliği olmadığını ve kurulum hata kodlarının ayrı
  cümlelere çevrildiğini. Ekran silindi, sarmalayıcı da silindi (hiçbir
  yerden çağrılmıyordu). Ölçülecek kod kalmadığı için iddialar da
  kalktı — duran bir iddia, olmayan bir akışın hâlâ ölçüldüğünü
  söylerdi. `sosyal_profil_kur` fonksiyonu VERİTABANINDA duruyor ve
  ölçümü veritabanı testlerinde.
*/

test('bölüm kataloğu kapalı liste: aktif olanlar sıraya göre', () => {
  const govde = govdeAl(
    yorumsuz(sorgular),
    'export async function bolumleriGetir',
    'export interface SosyalProfil',
  );
  assert.ok(govde.length > 0, 'bölüm listesi fonksiyonu bulunamadı');
  assert.match(govde, /\.from\('departments'\)/);
  assert.match(govde, /\.eq\('aktif', true\)/);
  assert.match(govde, /\.order\('sira', \{ ascending: true \}\)/);
});

test('görünürlük yalnız yayinda_mi yazıyor ve kendi satırıyla sınırlı', () => {
  /*
    Kimlik OTURUMDAN geliyor. Gövdeye `username` ya da `sector_id`
    girseydi, görünürlük düğmesi kalıcı adresi ve görünürlük sınırını
    değiştirebilen ikinci bir yol olurdu.
  */
  const govde = govdeAl(
    yorumsuz(sorgular),
    'export async function sosyalProfilGorunurluguAyarla',
    'export interface SosyalDuzenlemeGirdisi',
  );
  assert.ok(govde.length > 0, 'görünürlük fonksiyonu bulunamadı');
  assert.match(govde, /update\(\{ yayinda_mi: yayindaMi \}\)/);
  assert.match(govde, /\.eq\('profile_id', kullaniciId\)/);
  assert.doesNotMatch(govde, /username/);
  assert.doesNotMatch(govde, /sector_id/);
  /* Hata yutulmuyor: kısıt adı okunuyorsa ayrı cümle, gerisi genel yola. */
  assert.match(govde, /'23514'/);
  assert.match(govde, /hata\('Profil görünürlüğü değiştirilemedi', error\)/);
});

test('görünürlük çift yönlü: sabit true yazan ikinci bir yol yok', () => {
  /*
    Yayımla ve yayından kaldır aynı tek kolonu yazıyor. İki ayrı fonksiyon
    olsaydı biri değiştiğinde öteki sessizce geride kalırdı; sabit `true`
    ise yayından kaldırmayı imkânsız kılardı.
  */
  const temiz = yorumsuz(sorgular);
  assert.match(temiz, /sosyalProfilGorunurluguAyarla\(\n?\s*kullaniciId: string,\n?\s*yayindaMi: boolean,/);
  assert.doesNotMatch(temiz, /yayinda_mi: true/);
  assert.doesNotMatch(temiz, /sosyalProfilYayimla|sosyalProfilYayindanKaldir/);
});

test('23514 tek başına özel cümleye ayrılmıyor: kısıt adı okunuyor', () => {
  /*
    23514 yalnızca "bir CHECK ihlal edildi" demek; hangi kısıt olduğunu
    söylemez. Koda bakıp kesin cümle kurmak, kullanıcıya yanlış alanı
    düzelttirmek olurdu.
  */
  const temiz = yorumsuz(sorgular);
  const dallar = temiz.match(/error\.code === '23514'\)[\s\S]{0,120}?;/g) ?? [];
  assert.equal(
    dallar.length,
    3,
    'düzenleme, görünürlük ve talep açma: üç doğrudan yazma yolu da 23514 görüyor',
  );
  for (const dal of dallar) {
    assert.match(dal, /kisitHatasi\(error\)/);
    /* Kod tek başına cümle kurmuyor: cümle kısıt adına bakan yardımcıdan. */
    assert.doesNotMatch(dal, /new SosyalHata\(/);
  }
  assert.match(temiz, /kisitAdiVarMi\(error, 'yayin_icin_kimlik_sart'\)/);
  assert.match(temiz, /'Kullanıcı adı ve alan tamamlanmadan profil yayımlanamıyor\.'/);
  assert.match(temiz, /'Bilgilerini kontrol edip tekrar dene\.'/);
});

test('adı bilinmeyen CHECK kısıtları tahmin edilmiyor', () => {
  /*
    `username` ve `biyografi` kısıtları göçte İSİMSİZ; adlarını Postgres
    üretiyor. Tahmin edilmiş bir adla eşleşme kurmak, doğrulanmamış bir
    varsayıma göre kesin cümle kurmak olurdu.
  */
  assert.doesNotMatch(sorgular, /social_profiles_username_check|social_profiles_biyografi_check/);
  /* Kaldırılan iki tahmin cümlesi geri gelmiyor. */
  assert.doesNotMatch(yorumsuz(sorgular), /Kullanıcı adını ve biyografiyi kontrol et/);
  assert.doesNotMatch(yorumsuz(sorgular), /300 karakteri aşmamalı/);
});

test('düzenleme kullanıcı adına ve sektöre dokunmuyor', () => {
  const govde = sorgular.slice(
    sorgular.indexOf('export async function sosyalProfilGuncelle'),
    sorgular.indexOf('// ------------------------------------------------------------------ Sayaçlar'),
  );
  assert.ok(govde.length > 0, 'güncelleme fonksiyonu bulunamadı');
  assert.doesNotMatch(govde, /username/);
  assert.doesNotMatch(govde, /sector_id/);
});

test('sayaçlar RPC üzerinden ve sıfır satır sıfır sayı sayılmıyor', () => {
  assert.match(sorgular, /rpc\('sosyal_sayaclar', \{ hedef: profilId \}\)/);
  assert.match(sorgular, /if \(!satir\) return null;/);
  /* Fonksiyon RLS göçünde ve iki sütun döndürüyor: paylasim, baglanti. */
  assert.match(rls, /returns table \(paylasim integer, baglanti integer\)/);
});

test('hata yutulmuyor: boş liste ile hata ayrı', () => {
  assert.match(sorgular, /if \(error\) hata\(/);
  /* Hata durumunda boş dizi döndüren bir dal olmamalı. */
  assert.doesNotMatch(sorgular, /catch[\s\S]{0,80}return \[\];/);
});

test('arşiv ile yayındaki paylaşımlar aynı listede karışmıyor', () => {
  assert.match(sorgular, /secenek\.arsiv[\s\S]{0,80}not\('archived_at', 'is', null\)/);
  assert.match(sorgular, /is\('archived_at', null\)/);
});

/* ------------------------------------------------------------------ */
/*  DİŞLİ MENÜSÜ                                                       */
/* ------------------------------------------------------------------ */

test('menüde yalnız gerçekten çalışan satırlar var', () => {
  /*
    Paylaşma istemci tarafı, altyapı gerektirmiyor. Görünürlük tek kolonu
    yazan gerçek bir sorguya bağlı. Fotoğraf satırları da gerçek: biri
    yükleme ekranını açıyor, öteki `avatar_path`i null'a çekiyor —
    ikisinin de arka ucu 20260924040000 ile geldi.

    Düzenleme satırı KOŞULLU ve yalnız birleşik ekranda (`/cv`)
    veriliyor: orada profil sunumunun üst bloğu hiç çizilmiyor (kimlik
    alanları sol sütunda), yani ana düğmenin evi kalmıyor. Üst bloğu
    çizen çağıran eylemi VERMİYOR ve satır orada diziye hiç girmiyor —
    aynı işin iki girişi hâlâ yok.

    BEĞENDİKLERİM / KAYDEDİLENLER / ARŞİV ARTIK GERÇEK: beğen ve kaydet
    düğmeleri paylaşımın ayrıntı katmanında çalışıyor, arşivden geri
    yükleme de `archived_at = null` yazan gerçek bir sorgu
    (20260925010000 sahibin kendi arşivini okumasını açtı). Üçü de
    KOŞULLU: eylem verilmediğinde diziye hiç girmiyorlar ve eylem yalnız
    sahip dalında veriliyor.

    Sayı SEKİZ: düzenleme, iki fotoğraf satırı ve üç liste satırı
    koşullu; fotoğrafı olmayan bir ziyaretçide bu menü zaten hiç
    çizilmiyor.
  */
  assert.match(menu, /etiket: 'Profil bağlantısını paylaş'/);
  assert.match(menu, /etiket: gorunurlukEtiketi/);
  assert.match(menu, /'Profil fotoğrafını değiştir'/);
  assert.match(menu, /'Profil fotoğrafını kaldır'/);
  /* Satır KOŞULLU: eylem verilmediğinde diziye hiç girmiyor. */
  assert.match(menu, /\.\.\.\(onDuzenle\s*\n?\s*\? \[/);
  assert.match(menu, /etiket: 'Sosyal profili düzenle'/);
  /* Üst bloğu çizen sunum eylemi VERMİYOR: aynı işin iki girişi yok. */
  assert.doesNotMatch(gorunum, /onDuzenle=\{onDuzenle\}/);
  /* `Oge` arayüzündeki `etiket: string;` sayılmıyor: o bir satır değil, bir tür. */
  assert.equal((menu.match(/\n\s*etiket: (?!string)/g) ?? []).length, 8);
});

test('görünürlük öğesinin etiketi duruma göre değişiyor', () => {
  /*
    Açık profilde "Profili herkese aç" yazsaydı, satır kullanıcıya
    olmayan bir durum anlatırdı. Dört etiketin dördü de kaynakta ve
    dördü de GÖRÜNÜRLÜĞÜ anlatıyor; üyelik başka bir ekranın işi. Kod
    adı (`yayindaMi`) şemadaki `yayinda_mi` ile aynı kalıyor.
  */
  assert.match(menu, /'Profili gizle'/);
  assert.match(menu, /'Profili herkese aç'/);
  assert.match(menu, /'Gizleniyor…'/);
  assert.match(menu, /'Açılıyor…'/);
  assert.match(menu, /yayindaMi\s*\n?\s*\?/);
});

test('gönderim sırasında görünürlük öğesi gerçekten kilitli', () => {
  /*
    Kilit yalnız metin olsaydı çift tıklama ikinci bir istek atardı.
    `disabled` iki sunumda da uygulanıyor: açılır menü ve alttan panel
    aynı öğeyi farklı davranışla çizmemeli.
  */
  assert.match(menu, /pasif\?: boolean;/);
  assert.match(menu, /pasif: gorunurlukGonderiliyor/);
  assert.equal((menu.match(/disabled=\{oge\.pasif\}/g) ?? []).length, 2);
  /* Kilitli öğe odak sırasından kendiliğinden çıkıyor. */
  assert.match(menu, /button:not\(\[disabled\]\)/);
});

test('öne çıkanlar arayüzde hiç yok — tablosu da yok', () => {
  /* Şema bu tabloyu açıkça ertelemiş; boş bir alan da bir vaat olurdu. */
  assert.match(sema, /ÖNE ÇIKANLAR — BU AŞAMADA YOK/);
  for (const kaynak of SOSYAL_BILESENLER_YORUMSUZ) {
    assert.doesNotMatch(kaynak, /Öne çıkan/);
    assert.doesNotMatch(kaynak, /highlight/i);
  }
});

test('beğeni, kaydetme ve arşiv satırları KOŞULLU; gizlilik hâlâ yok', () => {
  /*
    Üç satırın da arka ucu artık tam: `post_likes` ve `post_saves`
    düğmeleri ayrıntı katmanında, arşiv geri yüklemesi de `archived_at`
    kolonunu yazıyor. Üçü de eylem VERİLDİĞİNDE diziye giriyor ve eylem
    yalnız sahip dalında veriliyor — `disabled` bırakılmış bir satır,
    hiçbir zaman çalışmayacak bir eylemin adını ekranda tutardı.

    "Gizlilik" hâlâ yok: ne ekranı ne kolonu var.
  */
  assert.match(menu, /\.\.\.\(onBegendiklerim\s*\n?\s*\?/);
  assert.match(menu, /\.\.\.\(onKaydedilenler\s*\n?\s*\?/);
  assert.match(menu, /\.\.\.\(onArsiv\s*\n?\s*\?/);
  assert.doesNotMatch(menu, /etiket: 'Gizlilik/);
});

test('mesaj, yorum, engelleme ve şikâyet hiçbir yerde yok', () => {
  /*
    Bağlantı akışı C'de AÇILDI, o yüzden "Bağlantı kur" artık meşru bir
    satır. Mesaj, engelleme ve şikâyet ekranları hâlâ yok: tabloları var
    ama arayüzü yok, düğmesi de çizilmiyor.
  */
  for (const kaynak of SOSYAL_BILESENLER_YORUMSUZ) {
    assert.doesNotMatch(kaynak, /Mesaj gönder|"Mesaj"|Engelle|Şikâyet|Şikayet et/);
  }
});

test('takip modeli hiçbir yerde geçmiyor — ürün kuralı', () => {
  /*
    Tek ilişki karşılıklı bağlantı. "Takipçi" ya da "takip et" ekranda
    geçseydi, kullanıcı tek yönlü bir ilişki kurabileceğini sanardı;
    veritabanında öyle bir şey yok.
  */
  for (const kaynak of [...SOSYAL_BILESENLER_YORUMSUZ, yorumsuz(talepKuyrugu)]) {
    assert.doesNotMatch(kaynak, /[Tt]akip|[Tt]akipçi/);
  }
  assert.match(durumRpc, /TAKİPÇİ \/ TAKİP EDİLEN YOK/);
});

test('menü klavyeyle kapanıyor ve odak tetikleyiciye dönüyor', () => {
  assert.match(menu, /olay\.key === 'Escape'/);
  assert.match(menu, /tetikRef\.current\?\.focus\(\)/);
  assert.match(menu, /aria-modal="true"/);
  assert.match(menu, /aria-haspopup="menu"/);
});

test('öğeye basınca da odak tetikleyiciye dönüyor, sayfanın başına değil', () => {
  /*
    `ogeyeBas` odağı hiçbir yere bağlamayan `setAcik(false)` çağırıyordu:
    yerel ölçümde menü öğesine tıklandıktan sonra document.activeElement
    BODY oluyordu. Klavye ve okuyucu kullanıcısı sayfanın başına düşüp
    eylemin role="status" bildirimini bulamıyordu. Escape yolu aynı hataya
    düşmüyordu çünkü o `kapat()` çağırıyor — fark tam olarak bu satırdı.
  */
  const govde = govdeAl(yorumsuz(menu), 'const ogeyeBas', 'const acilirMenu');
  assert.ok(govde.length > 0, 'ogeyeBas bulunamadı');
  assert.match(govde, /kapat\(\);/);
  assert.doesNotMatch(govde, /setAcik\(false\)/);
  /* Odak, eylemin tetiklediği yeniden çizimden sonra uygulanmalı. */
  assert.ok(govde.indexOf('kapat();') < govde.indexOf('oge.calistir();'));

  /* Odağı bir sonraki kareye bırakan kalıp yerinde duruyor. */
  assert.match(
    yorumsuz(menu),
    /const kapat = React\.useCallback\(\(\) => \{\s*setAcik\(false\);\s*window\.requestAnimationFrame\(\(\) => tetikRef\.current\?\.focus\(\)\);/,
  );

  /* Masaüstü menüsü ile alttan panel aynı yolu paylaşıyor: ikinci kod yolu yok. */
  assert.equal((menu.match(/onClick=\{\(\) => ogeyeBas\(oge\)\}/g) ?? []).length, 2);
});

test('masaüstü menüsü ile alttan panel aynı anda çizilmiyor', () => {
  /*
    İki kopya bırakmak, alttan açılan panelin odak tuzağını masaüstünde de
    kurmak ve odağı görünmeyen bir panele göndermek olurdu.
  */
  assert.match(menu, /matchMedia\('\(min-width: 1024px\)'\)/);
  assert.match(menu, /genisEkran \? acilirMenu : altPanel/);
});

test('dokunma hedefi ve odak halkası menüde kalıbı izliyor', () => {
  assert.match(menu, /min-h-11/);
  assert.match(menu, /h-11 w-11/);
  assert.match(menu, /ODAK_HALKASI/);
});

/* ------------------------------------------------------------------ */
/*  PROFİL GÖRÜNÜMÜ                                                    */
/* ------------------------------------------------------------------ */

test('sahibe özel her şey sahibiMi koşulunun içinde', () => {
  assert.match(gorunum, /\{sahibiMi && onPaylas && onGorunurluk && \(/);
  assert.match(gorunum, /\{sahibiMi && onDuzenle && \(/);
  /*
    ÜÇÜNCÜ KOŞUL DEĞİŞTİ: "yayında değilse uyarı" yerine "önkoşullar
    tamsa Paylaş". Sunucudaki `sosyal_paylasim_baslat` taslağı yalnız
    `yayinda_mi` VE `sector_id is not null` iken açıyor; düğmeyi bundan
    daha geniş bir koşulla çizmek, her basışta reddedilen bir eylem
    sunmak olurdu.
  */
  assert.match(
    gorunum,
    /\{sahibiMi && profil\.yayindaMi && profil\.sektorId && onPaylasimOlustur && \(/,
  );
  /* CSS ile gizleme yok: gizlenmiş düğme klavyeyle bulunur. */
  assert.doesNotMatch(gorunum, /hidden.*ProfilAyarMenusu/);
});

test('dişli menüsünde topluluğa katılma/ayrılma eylemi YOK', () => {
  /*
    ÜYELİK DİŞLİDEN ÇIKTI

    Menüdeki tek görünürlük satırı bir zamanlar "Topluluğa katıl /
    Topluluktan ayrıl" yazıyordu ve `yayinda_mi` kolonunu yazıyordu.
    20260926030000 üyeliği `community_members`e taşıdı, 20260926040000 da
    kolonun anlamını yalnız profil görünürlüğüne indirdi. Etiket
    kalsaydı, profilini gizleyen kullanıcı topluluğundan çıktığını
    sanırdı — oysa üyeliğine hiç dokunulmuyor.

    Ölçüm YORUMSUZ kaynakta: bu dosyadaki gerekçe yorumları eski etiketi
    anmak zorunda ve doğru yazılmış bir gerekçe testi düşürmemeli.
  */
  const menuYorumsuz = yorumsuz(menu);
  assert.doesNotMatch(menuYorumsuz, /Topluluğa katıl|Topluluktan ayrıl/);
  /* Üyeliğin tek girişi kendi ekranı; menüde ona giden bir satır da yok. */
  assert.doesNotMatch(menuYorumsuz, /\/topluluklar/);
  /* Katıl/ayrıl çağrıları yalnız o ekranda. */
  assert.doesNotMatch(menu, /sosyalToplulugaKatil|sosyalTopluluktanAyril/);
  assert.match(topluluklar, /sosyalToplulugaKatil/);
  assert.match(topluluklar, /sosyalTopluluktanAyril/);
});

test('kullanıcıya basılan metinde "yayımla" ve "yayından" kalmadı', () => {
  /*
    Şema ve kod adları (`yayinda_mi`, `yayimlamaDurumu`, `setYayimla`)
    ASCII yazılıyor ve DEĞİŞMİYOR; bu ölçüm yalnız Türkçe harfli ekran
    metnini arıyor. Yorumlar dışarıda: bir metnin neden değiştiğini
    anlatmak için eski metni anmak zorundalar.
  */
  for (const kaynak of SOSYAL_BILESENLER_YORUMSUZ) {
    assert.doesNotMatch(kaynak, /yayımla|Yayımla|yayından|Yayından|yayımlan/);
  }
  /* Kod adları duruyor: şema adı ile ekran metni ayrı tutuluyor. */
  assert.match(gorunum, /yayimlamaDurumu/);
  assert.match(gorunum, /profil\.yayindaMi/);
  assert.match(sorgular, /sosyalProfilGorunurluguAyarla/);
  assert.match(sorgular, /yayinda_mi: yayindaMi/);
});

test('resmî bölüm adı katalogdan, eğitim notu ikincil satır', () => {
  /*
    Kullanıcı `bolum_etiketi` alanına başka bir bölüm yazarak sistem
    bölümünü taklit edememeli. Bu yüzden resmî satır HER ZAMAN
    `departments` ilişkisinden geliyor; kullanıcının yazdığı metin ayrı
    bir etiketle ("Eğitim notu") ve daha zayıf ağırlıkta çiziliyor.
  */
  assert.match(sorgular, /departments \( ad \)/);
  assert.match(sorgular, /bolumAdi: satir\.departments\?\.ad \?\? null/);
  assert.match(gorunum, /\{profil\.bolumAdi && /);
  assert.match(gorunum, /Eğitim notu/);
  /* Etiket yalnız DOLUYKEN çiziliyor: boş satır bir bilgi taşımaz. */
  assert.match(gorunum, /\{profil\.bolumEtiketi && \(/);
  /* Bu alanın etiketinde "Bölüm" kelimesi geçmiyor — düzenleme ekranında da. */
  assert.match(duzenleme, /etiket="Eğitim notu"/);
  assert.doesNotMatch(duzenleme, /etiket="Bölüm"/);
});

test('görünürlük değişimi başarısızsa yerel profil durumu değişmiyor', () => {
  const govde = govdeAl(sayfa, 'const gorunurlukDegistir = async', 'const paylas =');
  assert.ok(govde.length > 0, 'görünürlük eylemi bulunamadı');
  assert.match(govde, /await sosyalProfilGorunurluguAyarla\(kullaniciId, yeniDeger\)/);
  assert.match(govde, /setGorunurlukDurumu\('hata'\)/);
  /* setProfil yalnız try içinde: catch dalı profile dokunmuyor. */
  assert.equal((govde.match(/setProfil\(/g) ?? []).length, 1);
  assert.ok(govde.indexOf('setProfil(') < govde.indexOf('} catch'));
  /* İyimser güncelleme yok: yazma await'ten SONRA. */
  assert.ok(govde.indexOf('await sosyalProfilGorunurluguAyarla') < govde.indexOf('setProfil('));
  assert.match(govde, /yayindaMi: yeniDeger/);
  /* Çift tıklama ikinci istek atmıyor. */
  assert.match(govde, /gorunurlukDurumu === 'gonderiliyor'\) return;/);
});

test('görünürlük bildirimleri yalnız başarıdan sonra yazılıyor', () => {
  /*
    Bildirim await'ten önce yazılsaydı, sunucu reddettiğinde ekranda
    "Profilin yayımlandı." kalırdı — yalan bir başarı. Kanal da yeni
    değil: bağlantı kopyalamanın kullandığı `bildirim` durumu.
  */
  const govde = govdeAl(sayfa, 'const gorunurlukDegistir = async', 'const paylas =');
  /*
    CÜMLELER ÜYELİĞİ DEĞİL GÖRÜNÜRLÜĞÜ ANLATIYOR

    "Alan topluluğuna katıldın." yazıyordu ve o cümle bugün yanlış:
    `yayinda_mi` 20260926040000'den beri yalnız profilin herkese açık
    olup olmadığını tutuyor, üyelik `community_members` tablosunda.
    Kullanıcı profilini gizlerken topluluğundan çıktığını sanmamalı.
  */
  assert.match(govde, /'Profilin artık giriş yapmış herkese açık\.'/);
  assert.match(govde, /'Profilin artık yalnızca sana görünüyor\.'/);
  assert.equal((govde.match(/setBildirim\(/g) ?? []).length, 2);
  assert.ok(govde.indexOf('await sosyalProfilGorunurluguAyarla') < govde.indexOf('setBildirim('));
  assert.ok(govde.indexOf('setBildirim(') < govde.indexOf('} catch'));
  /* Kopyalamadaki kalıpla aynı: kısa süre sonra temizleniyor. */
  assert.match(govde, /window\.setTimeout\(\(\) => setBildirim\(null\), 2500\)/);
  /*
    İkinci bir bildirim mekanizması kurulmadı.

    Ölçüm `useState<string | null>(null)` sayısından BİLDİRİM DURUMUNUN
    KENDİSİNE daraldı: dosyada artık aynı tipte ikinci bir durum var
    ("Sosyal profilin hazırlanamadı" kutusunun kendi hata cümlesi) ve o
    bir bildirim kanalı değil — kutunun içinde, kendi denemesinin
    sonucunu yazıyor. Tip sayısına bakan eski ölçüm, alakasız bir durumu
    ikinci bir bildirim sanardı. İddia gevşemedi: bildirim durumu hâlâ
    tek yerde tanımlı ve `setBildirim` hâlâ tek kanal.
  */
  assert.equal(
    (sayfa.match(/const \[bildirim, setBildirim\] = React\.useState<string \| null>\(null\);/g) ?? [])
      .length,
    1,
  );
});

test('bildirim kibar canlı bölgeden okunuyor', () => {
  /*
    `role="status"` zaten kibar bir canlı bölge; ikinci bir aria-live yok.
    Aynı kalıp gömülü portfolyo dalında da geçerli: orada `SosyalProfilGorunumu`
    çizilmediği için bildirimi sayfanın kendisi basıyor.
  */
  assert.match(gorunum, /\{bildirim && \(\n\s*<p role="status"/);
  assert.match(sayfa, /\{bildirim && \(\n\s*<p role="status"/);
  assert.doesNotMatch(gorunum, /aria-live/);
  assert.doesNotMatch(sayfa, /aria-live/);
});

test('görünürlük hatası sessiz kalmıyor ve tek cümleye indi', () => {
  /*
    Eskiden iki dal vardı: katılma hatasını uyarı kutusu, ayrılma
    hatasını bu satır anlatıyordu. Kutu kalkınca (üyelik artık burada
    değil) iki yön de tek yerden bildiriliyor. Cümle olmasaydı
    başarısız bir görünürlük değişimi hiçbir iz bırakmaz, kullanıcı
    olmamış bir işi olmuş sanırdı.

    Metin de dürüst: eski ayarın DURDUĞUNU söylüyor.
  */
  assert.match(gorunum, /\{sahibiMi && yayimlamaDurumu === 'hata' && \(/);
  assert.match(gorunum, /Profilinin görünürlüğü değiştirilemedi; eski ayarın duruyor/);
  assert.match(sayfa, /Profilinin görünürlüğü değiştirilemedi; eski ayarın duruyor/);
});

test('iki sayaç var, üçüncüsü yok', () => {
  assert.match(gorunum, /etiket="Paylaşım"/);
  assert.match(gorunum, /etiket="Bağlantı"/);
  assert.doesNotMatch(yorumsuz(gorunum), /Bağlantıda/);
  /* Şema da aynı gerekçeyi yazıyor. */
  assert.match(sema, /"Bağlantıda" sayacı kaldırıldı/);
});

test('sayaç gelmediğinde sıfır uydurulmuyor', () => {
  assert.match(gorunum, /Sayaçlar şu anda alınamadı/);
  assert.match(gorunum, /sayacDurumu === 'hazir' && sayaclar &&/);
});

test('üst blokta tek ana eylem: Profili düzenle', () => {
  assert.match(gorunum, /Profili düzenle/);
  /* Arşiv görünümü üründen kalktı; "Arşivi gör" düğmesi de kalktı. */
  assert.doesNotMatch(yorumsuz(gorunum), /Arşivi gör/);
  assert.doesNotMatch(yorumsuz(sayfa), /Arşivi gör/);
});

test('arşiv arayüze geri geldi; yayındaki liste hâlâ süzülüyor', () => {
  /*
    Arşiv ekranı D'de KALDIRILMIŞTI çünkü geri çıkarma yolu yoktu:
    sunucu sahibine bile kendi arşiv satırını vermiyordu, yani o ekranda
    yapılabilecek tek şey bakmaktı. 20260925010000 SELECT'i sahibine
    açtı, `archived_at` kolonu zaten yazılabilirdi; "Profilde yeniden
    göster" artık gerçek bir eylem.

    Yayındaki listenin süzgeci OLDUĞU GİBİ duruyor: iki liste tek
    ızgarada karışmıyor.
  */
  assert.match(sorgular, /secenek\.arsiv/);
  assert.match(sorgular, /is\('archived_at', null\)/);
  assert.match(sorgular, /export async function paylasimiGeriYukle/);
  /* Kalıcı silme hâlâ yok: ne RPC'si ne düğmesi. */
  for (const kaynak of SOSYAL_BILESENLER_YORUMSUZ) {
    assert.doesNotMatch(kaynak, /Kalıcı olarak sil|Paylaşımı sil/);
  }
});

test('kullanıcıya görünen metinde "Sektör" geçmiyor', () => {
  /*
    Şema adları (sector_id, sectors) ve kod içindeki değişken adları
    duruyor; değişen yalnız ekrana basılan sözcük. Ölçüm yorumsuz kaynak
    üzerinde: yorumlar şema kavramının adını anmakta serbest.
  */
  for (const kaynak of [gorunum, sorgular, duzenleme]) {
    assert.doesNotMatch(yorumsuz(kaynak), /Sektör/);
  }
  assert.match(sorgular, /Alan listesi alınamadı/);
  /* Düzenlemedeki kilitli kart da "alan" diyor, "sektör" değil. */
  assert.match(duzenleme, /Bölüm ve alan değiştirilemiyor/);
  /* Rozet "Tekstil ve Moda alanı" diye okunuyor; boşsa hiç çizilmiyor. */
  assert.match(gorunum, /profil\.sektorAdi && \(/);
  assert.match(gorunum, /\{profil\.sektorAdi\} alanı/);
});

test('sekme, bölüm başlığı ve öne çıkanlar şeridi yok', () => {
  const temiz = yorumsuz(gorunum);
  for (const yasak of ['Projeler', 'Üretim Süreçleri', 'CV ve Yetenekler', 'Gönderiler']) {
    assert.doesNotMatch(temiz, new RegExp(yasak));
  }
});

test('ikon tek başına bilgi taşımıyor', () => {
  /*
    İkon adları sabit listeye yazılmıyor: liste, kaldırılan bir ikondan
    sonra sessizce boşalıp testi anlamsızlaştırırdı. İçe aktarılan her
    lucide ikonu gerçekten kullanılıyor mu ve aria-hidden mı, oradan
    ölçülüyor.
  */
  const ithal = gorunum.match(/import \{([^}]+)\} from 'lucide-react';/);
  assert.ok(ithal, 'görünümde lucide içe aktarması bulunamadı');
  const adlar = ithal[1].split(',').map((ad) => ad.trim()).filter(Boolean);
  assert.ok(adlar.length >= 1, 'en az bir ikon bekleniyordu');
  for (const ad of adlar) {
    const kullanim = gorunum.match(new RegExp(`<${ad}\\b[^>]*>`, 'g')) ?? [];
    assert.ok(kullanim.length > 0, `${ad} içe aktarılmış ama çizilmiyor`);
    for (const ikon of kullanim) assert.match(ikon, /aria-hidden/);
  }
});

test('kullanıcının yazdığı uzun metin kırpılmadan sarıyor', () => {
  /*
    Biyografiye boşluksuz uzun bir dize girildiğinde paragraf 390px
    yerleşiminde ölçüldü: clientWidth 336px, scrollWidth 722px. Sayfa
    kaymıyordu (body overflow-x: clip) ama metnin yarısından fazlası
    GÖRÜNMEZ şekilde kesiliyordu; kullanıcı kendi biyografisine
    ulaşamıyordu. Aynı koruma bölüm/sınıf ve şehir satırlarında da var:
    üçünün de içeriğini kullanıcı yazıyor.
  */
  assert.match(gorunum, /\{profil\.sinifEtiketi && <p className="break-words">\{profil\.sinifEtiketi\}<\/p>\}/);
  assert.match(gorunum, /\{profil\.sehir && <p className="break-words">\{profil\.sehir\}<\/p>\}/);
  assert.match(gorunum, /whitespace-pre-line break-words/);

  /*
    Kart açıklamasında `line-clamp-3` satır SAYISINI sınırlıyor, satır
    İÇİ bölmeyi sağlamıyor. Kart ızgara çocuğu olduğu için varsayılan
    `min-width: auto` kendi sütununu aşmasına izin veriyordu; sarma
    sınıfının yanında `min-w-0` da gerekiyor.
  */
  assert.match(izgara, /break-words line-clamp-3/);
  assert.ok(
    izgara.includes('flex h-full min-w-0 flex-col gap-1.5'),
    'kart kabı min-w-0 taşımıyor',
  );

  /*
    `break-all` normal Türkçe metni de rastgele böler: sınıf hiçbirinde
    yok. Ölçüm yorumsuz kaynakta, çünkü gerekçe yorumları bu sınıfın
    NEDEN seçilmediğini yazmak için adını anmak zorunda.
  */
  assert.doesNotMatch(yorumsuz(gorunum), /break-all/);
  assert.doesNotMatch(yorumsuz(izgara), /break-all/);
});

test('kısa ve tek satırlık alanlar hâlâ truncate ile kesiliyor', () => {
  /*
    Regresyon koruması: sarma düzeltmesi tek satırda kalması gereken
    alanlara yayılmamalı. Kullanıcı adı, başlık ve alan rozeti ölçümde
    zaten doğruydu — üç nokta ile kesiliyorlar, taşırmıyorlar.
  */
  assert.match(gorunum, /<h1 className="truncate text-lg/);
  assert.match(
    gorunum,
    /<p className="min-w-0 truncate text-sm text-gray-600">@\{profil\.kullaniciAdi\}<\/p>/,
  );
  assert.match(gorunum, /inline-flex max-w-full items-center rounded-full/);
  assert.match(gorunum, /<span className="truncate">\{profil\.sektorAdi\} alanı<\/span>/);
});

/* ------------------------------------------------------------------ */
/*  IZGARA                                                             */
/* ------------------------------------------------------------------ */

test('ızgara ölçüsü depodaki kalıpla aynı', () => {
  const rehber = oku('src/components/RehberKartlari.tsx');
  const kalip = 'grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3';
  assert.ok(rehber.includes(kalip), 'kalıp rehber kartlarında değişmiş');
  assert.ok(izgara.includes(kalip), 'paylaşım ızgarası kalıptan ayrışmış');
});

test('kart kabı depodaki ölçüde', () => {
  assert.match(izgara, /rounded-2xl border border-gray-200 bg-white p-2\.5 sm:p-3\.5/);
});

test('ızgarada dört durumun dördü de çiziliyor', () => {
  assert.match(izgara, /durum === 'yukleniyor'/);
  assert.match(izgara, /durum === 'hata'/);
  assert.match(izgara, /paylasimlar\.length === 0/);
  /* Hata ile boş ayrı cümle. */
  assert.match(izgara, /Paylaşımlar alınamadı/);
  assert.match(izgara, /Henüz hiç gönderi yok/);
});

test('boş ızgarada olmayan bir özelliğin düğmesi yok', () => {
  assert.doesNotMatch(yorumsuz(izgara), /Paylaşım ekle|Fotoğraf yükle|İlk paylaşımını/);
});

test('boş ızgara tek tarafsız cümle; hata dalı ayrı duruyor', () => {
  /*
    Eski hâlinde ziyaretçi "Görebileceğin bir paylaşım yok." okuyordu;
    "görebileceğin" sözcüğü RLS'in kestiği satırların VARLIĞINI ima
    ediyordu. Görünürlük bir güvenlik sınırı: boş ızgara kitlesi dar bir
    paylaşım olup olmadığını hiçbir sözcükle haber vermemeli. Sahip ve
    ziyaretçi aynı cümleyi alıyor; ayrım sahibe özel EYLEMLERDE kalıyor.
  */
  const temiz = yorumsuz(izgara);
  assert.match(temiz, /bosMetni \?\? 'Henüz hiç gönderi yok'/);
  assert.doesNotMatch(temiz, /Görebileceğin bir paylaşım yok|sahibiMi \? '/);
  assert.doesNotMatch(temiz, /kapalı olabilir|sana kapalı|gizlenmiş/);
  /* Simge tek başına bilgi taşımıyor: aria-hidden ve yanında metin. */
  assert.match(temiz, /<Camera/);
  assert.match(temiz, /aria-hidden="true"[\s\S]{0,200}<Camera/);
  /*
    `[]` başarı, `throw` hata: boş cümle yalnız length === 0 dalında,
    hata dalı ("Paylaşımlar alınamadı") ve sayfanın profil hatası
    ("Portfolyon alınamadı") ayrı ve ham Supabase metni basmıyor.
  */
  assert.match(temiz, /durum === 'hata'[\s\S]*Paylaşımlar alınamadı[\s\S]*paylasimlar\.length === 0[\s\S]*Henüz hiç gönderi yok/);
  assert.match(yorumsuz(sayfa), /profilDurumu === 'hata'[\s\S]{0,1500}Portfolyon alınamadı/);
  assert.doesNotMatch(yorumsuz(sayfa), /error\.message|\.code\}/);
  /* Çağıran taraf yetki durumunu hâlâ geçiriyor (ayrıntı katmanı için). */
  assert.match(gorunum, /sahibiMi=\{sahibiMi\}/);
});

/* ------------------------------------------------------------------ */
/*  ROTA VE YETKİ                                                      */
/* ------------------------------------------------------------------ */

test('rotalar App içinde tek dala bağlanmış', () => {
  assert.match(app, /temizYol === '\/profil' \|\| temizYol\.startsWith\('\/profil\/'\)/);
  assert.match(app, /<SosyalProfilSayfasi/);
  assert.match(app, /oturumHazir=\{sessionReady\}/);
  assert.match(app, /kullaniciId=\{session\?\.userId \?\? null\}/);
});

test('bozuk adres uygulamayı düşürmüyor', () => {
  /* decodeURIComponent('%zz') fırlatıyor; tek hatalı adres beyaz ekran yapardı. */
  assert.match(app, /decodeURIComponent\(hamAd\)/);
  assert.match(app, /rotaKullaniciAdi = hamAd;/);
});

test('var/yok ayrımı tek güvenli ekranın arkasında', () => {
  assert.match(sayfa, /Bu profil şu anda görüntülenemiyor/);
  /* "Böyle bir kullanıcı yok" adres çubuğunu sözlüğe çevirirdi. */
  assert.doesNotMatch(yorumsuz(sayfa), /kullanıcı bulunamadı|böyle bir kullanıcı|profil bulunamadı/i);
});

test('sahiplik oturum kimliği ile satırın sahibinden doğrulanıyor', () => {
  assert.match(sayfa, /profil\.profilId === kullaniciId/);
  assert.match(sayfa, /rotaAdi === profil\.kullaniciAdi/);
});

test('oturum okunmadan yetkisiz kararı verilmiyor', () => {
  assert.match(sayfa, /if \(!oturumHazir\)/);
  assert.match(sayfa, /if \(!kullaniciId\)/);
  assert.match(sayfa, /Sosyal profil için giriş gerekiyor/);
});

test('sosyal profil satırı yoksa kurulum değil, dürüst hata çiziliyor', () => {
  /*
    KURULUM EKRANI ARTIK ÇİZİLMİYOR.

    20260926050000 sosyal profili ve kullanıcı adını kayıt sırasında
    SUNUCUDA açıyor; kurulum formunun sorduğu sorunun bir karşılığı
    kalmadı. Satırın gelmemesi bir kullanıcı kararı değil, bir ARIZA —
    arızaya form göstermek, kullanıcıyı sistemin kendi işini elle
    yapmaya çağırmak olurdu.

    Dosya da SİLİNDİ: hiçbir yerden çizilmeyen bir ekranı ağaçta
    bırakmak, olmayan bir akışın hâlâ varmış gibi durması olurdu.
    Ölçülen şey iki yoldaki KULLANIMI ve kullanımın hiç olmaması.
  */
  assert.match(sayfa, /if \(!profilTamMi\)/);
  assert.doesNotMatch(sayfa, /<SosyalProfilKurulum/);
  /* Yorumsuz gövde: gerekçe yorumunda adı ANMAK bir çağrı değil. */
  assert.doesNotMatch(
    yorumsuz(sayfa),
    /SosyalProfilKurulum|sosyal_profil_kur|sosyalProfilKur/,
  );
  assert.match(sayfa, /Sosyal profilin hazırlanamadı/);
  assert.match(sayfa, /<SosyalProfilHazirDegil[\s\S]{0,200}?setProfilDeneme/);
});

test('"Yeniden dene" sunucudan tamamlamayı istiyor, yalnız okumayı tekrarlamıyor', () => {
  /*
    DÜĞME BİR ZAMANLAR HİÇBİR ZAMAN ÇALIŞMIYORDU

    `profilDeneme` yalnız `kendiSosyalProfiliGetir`i tekrarlıyordu; satır
    gerçekten hiç açılmadıysa aynı okumayı yüz kez yapmak da satır
    üretmiyordu. 20260926090000 argümansız, idempotent ve topluluğa
    katmayan bir kapı verdi.

    ÖLÇÜLEN ÜÇ ŞEY:
      1. RPC sarmalayıcısı çağrılıyor ve okuma ONDAN SONRA tazeleniyor.
      2. Çift tıklama kilitli: gönderim sırasında düğme devre dışı.
      3. Hata dalında sebep UYDURULMUYOR — cümle `SosyalHata`dan geliyor,
         ham veritabanı metni ekrana çıkmıyor.
  */
  const govde = govdeAl(yorumsuz(sayfa), 'const dene = async', 'return (');
  assert.ok(govde.length > 0, 'tamamlama gövdesi bulunamadı');
  assert.match(govde, /await sosyalProfilimiTamamla\(\);/);
  assert.ok(
    govde.indexOf('await sosyalProfilimiTamamla()') < govde.indexOf('onTamamlandi()'),
    'okuma tazelemesi RPC çağrısından önce olmamalı',
  );
  /* Tazeleme YALNIZ try içinde: başarısız denemede ekran yeniden okumuyor. */
  assert.ok(govde.indexOf('onTamamlandi()') < govde.indexOf('} catch'));
  assert.match(govde, /if \(durum === 'gonderiliyor'\) return;/);
  assert.match(sayfa, /disabled=\{durum === 'gonderiliyor'\}/);
  assert.match(govde, /sorun instanceof SosyalHata/);

  /* Sarmalayıcı RPC'nin gerçek adını ve argümansız imzasını kullanıyor. */
  const sarmalayici = govdeAl(
    yorumsuz(sorgular),
    'export async function sosyalProfilimiTamamla',
    'function tamamlamaHatasi',
  );
  assert.match(sarmalayici, /db\.rpc\('sosyal_profilimi_tamamla', \{\}\)/);
  assert.match(tamamlamaRpc, /create or replace function public\.sosyal_profilimi_tamamla\(\)/);
  /* Üç `detail` kodunun üçü de şemada var ve üçünün Türkçe karşılığı yazılı. */
  for (const kod of ['oturum-yok', 'ogrenci-degil', 'profil-hazirlanamadi']) {
    assert.ok(tamamlamaRpc.includes(`'${kod}'`), `${kod} şemada yok`);
    assert.ok(yorumsuz(sorgular).includes(`'${kod}'`), `${kod} eşlemesi yok`);
  }
  /* Genel dalda ham hata metni taşınmıyor: `error.message` hiç okunmuyor. */
  const cevirici = govdeAl(
    yorumsuz(sorgular),
    'function tamamlamaHatasi',
    'export async function sosyalProfilGorunurluguAyarla',
  );
  assert.ok(cevirici.length > 0, 'çevirici bulunamadı');
  assert.doesNotMatch(cevirici, /error\?\.message|error\.message/);
});

test('profil tamsa /profil sahibin tek ekranına yönlendiriyor', () => {
  /*
    Sahibin kanonik adresi artık `/profil/<ad>` DEĞİL, birleşik ekran:
    solda profil/CV kartı, sağda sosyal portfolyo. İki ayrı sahip ekranı
    olsaydı hangisinde ne yapılabileceği adres çubuğundan tahmin edilirdi.

    `/profil/<başkasının adı>` yönlendirilmiyor: koşul `sahibiMi`ye
    bakıyor, yalnız `profilTamMi`ye değil.
  */
  assert.match(sayfa, /const BIRLESIK_EKRAN = '\/cv';/);
  assert.match(sayfa, /if \(rotaAdi !== null && !sahibiMi\) return;/);
  assert.match(sayfa, /onNavigate\(BIRLESIK_EKRAN, \{ degistir: true \}\)/);
  /* Hedef adres gerçekten çiziliyor: `/cv` birleşik ekranı döndürüyor. */
  assert.match(app, /temizYol === '\/cv' \|\| temizYol === '\/cv\/yazdir'/);
  assert.match(app, /ogrenciProfilEkrani\(\)/);
});

test('kanonik yönlendirme geri tuşunu kilitlemiyor', () => {
  /*
    `/profil` geçmişe PUSH edilseydi, `/profil/<ad>` sayfasından geri
    tuşuna basan kullanıcı `/profil`e döner ve oradan anında yeniden
    ileri yönlendirilirdi — yani geri tuşu hiç çalışmazdı. Aynı şey
    kurulum ekranı için de geçerli: kurulum bittikten sonra ona geri
    dönmenin bir karşılığı yok.
  */
  assert.match(app, /const navigate = \(to: string, secenek\?: \{ degistir\?: boolean \}\) =>/);
  assert.match(app, /if \(secenek\?\.degistir\) window\.history\.replaceState\(\{\}, '', to\);/);
  /* Kurulum sonrası ve kanonik yönlendirme: ikisi de `degistir` ile. */
  /*
    Sayı İKİDEN BİRE indi: ikincisi kurulum ekranının "bitti" dalıydı ve
    o ekran artık çizilmiyor. Kalan tek çağrı kanonik yönlendirme.
  */
  assert.equal(
    (sayfa.match(/onNavigate\(BIRLESIK_EKRAN, \{ degistir: true \}\)/g) ?? []).length,
    1,
  );
});

test('yükleme, boş, hata ve yetkisiz durumları sayfada ayrı ayrı var', () => {
  assert.match(sayfa, /profilDurumu === 'yukleniyor'/);
  assert.match(sayfa, /profilDurumu === 'hata'/);
  assert.match(sayfa, /Profil bilgileri alınamadı/);
  assert.match(sayfa, /<GuvenliEkran/);
});

/* ------------------------------------------------------------------ */
/*  BÖLÜM SEÇİMİ VE TALEP                                              */
/* ------------------------------------------------------------------ */

/*
  "Kurulumda alan seçici yok" İDDİASI KALKTI: ölçtüğü ekran silindi.
  Alanın kullanıcı tarafından seçilemediğini artık düzenleme ekranının
  kilitli bölüm/alan kartı gösteriyor ve onun kendi iddiası var.
*/

test('bölüm seçimi kapalı liste, gruplu ve aranabilir', () => {
  assert.match(bolumSecimi, /type="radio"/);
  assert.match(bolumSecimi, /name="sosyal-bolum"/);
  /* Grup başlıkları depodaki tek kaynaktan; ikinci bir sözlük yok. */
  assert.match(bolumSecimi, /BOLUM_GRUPLARI/);
  assert.match(bolumSecimi, /from '\.\.\/\.\.\/data\/bolumler'/);
  /* Basit metin süzgeci; yeni bağımlılık yok. */
  assert.match(bolumSecimi, /type="search"/);
  assert.match(bolumSecimi, /Bölüm ara/);
  /* Serbest metin ya da "Diğer" seçeneği yok: liste bir görünürlük sınırı. */
  assert.doesNotMatch(yorumsuz(bolumSecimi), /Diğer<|value="diger"/);
  /* Aramayla eşleşme yoksa uydurma satır yok, dürüst cümle var. */
  assert.match(bolumSecimi, /Aramanla eşleşen bölüm yok/);
});

test('bölüm seçimi dokunma hedefi ve odak halkası kalıbı izliyor', () => {
  assert.match(bolumSecimi, /min-h-11/);
  assert.match(bolumSecimi, /focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600/);
  assert.match(bolumSecimi, /ODAK_HALKASI/);
});

test('bölüm/alan talebinin girişi yalnız eksik durumda ve yalnız sahip dalında', () => {
  /*
    TALEP GİRİŞİ BİR SÜRE HİÇ YOKTU

    `BolumTalebi` yalnız kurulum formundan açılıyordu; form silinince
    ekran ulaşılamaz kaldı. Yeni giriş eksikliğin YAZILI OLDUĞU yerde:
    düzenlemedeki kilitli bölüm/alan kartı.

    ÖLÇÜLEN ÜÇ ŞEY:
      1. Satır KOŞULLU: `talepKipi` null iken hiçbir şey çizilmiyor,
         yani bölümü ve alanı bağlanmış kullanıcı bu satırı görmüyor.
      2. İki durum iki ayrı kip: katalogda bölüm yok / bölüm var ama
         alan eşlemesi yok. Tek cümle ikisini de yanlış anlatırdı.
      3. Ekran SAHİP DALININ İÇİNDE: `if (!sahibiMi) return
         <GuvenliEkran/>` satırından sonra çiziliyor, ziyaretçide DOM'a
         hiç girmiyor.
  */
  assert.match(duzenleme, /talepKipi: TalepKipi \| null;/);
  assert.match(duzenleme, /\{talepKipi && \(/);
  assert.match(duzenleme, /talepKipi === 'bolum-yok'/);
  /* Kip sayfada tek yerde türetiliyor; ikinci bir koşul kopyası yok. */
  assert.match(sayfa, /const talepKipi: TalepKipi \| null = !profil/);
  assert.match(sayfa, /\? 'alan-tanimsiz'\n\s*: 'bolum-yok';/);
  assert.equal((sayfa.match(/<BolumTalebi\b/g) ?? []).length, 1);

  /*
    SAHİPLİK SIRASI: talep dalı güvenli ekrandan SONRA geliyor.
    Yorumsuz kaynakta ölçülüyor ki gerekçe yorumları sonucu değiştirmesin.
  */
  const temiz = yorumsuz(sayfa);
  assert.ok(
    temiz.indexOf('if (!sahibiMi) return') < temiz.indexOf("gorunum === 'talep'"),
    'talep ekranı sahiplik kontrolünden önce çiziliyor',
  );

  /* YAKIN BİR BÖLÜM ÖNERİLMİYOR: katalogda olmayan bölüme öneri yok. */
  assert.doesNotMatch(yorumsuz(duzenleme), /benzer bölüm|en yakın bölüm|şunu mu demek/i);
  assert.doesNotMatch(yorumsuz(bolumTalebi), /benzer bölüm|en yakın bölüm|şunu mu demek/i);
});

test('tek profil fotoğrafı: kamera düğmesi ve ikinci yükleme yolu yok', () => {
  /*
    İKİ FOTOĞRAF VARDI, BİRİ KALDI

    Sol sütundaki kamera düğmesi `student_profiles.avatar_url`e,
    düzenlemedeki sosyal blok `social_profiles.avatar_path`e yazıyordu.
    İkisi birbirinden habersizdi: aynı kullanıcı iki ekranda iki farklı
    fotoğrafla görünebiliyordu.

    ÖLÇÜLEN DÖRT ŞEY:
      1. `uploadAvatar` bu ekrandan hiç çağrılmıyor ve dosya seçici yok.
      2. `ProfilBasligi`de kamera rozeti ve fotoğraf seçme eylemi yok.
      3. Karar tek yerde: `profilFotografi` yardımcısı.
      4. VERİ SİLİNMEDİ: eski adres yedek olarak okunmaya devam ediyor.
  */
  const temizOgrenci = yorumsuz(ogrenciProfili);
  assert.doesNotMatch(temizOgrenci, /uploadAvatar/);
  assert.doesNotMatch(temizOgrenci, /type="file"/);

  const temizBaslik = yorumsuz(profilBasligi);
  assert.doesNotMatch(temizBaslik, /Camera|onFotografSec|avatarYukleniyor/);
  /* Fotoğrafı artık tek bileşen çiziyor ve kaynağı tek yardımcı seçiyor. */
  assert.match(profilBasligi, /<ProfilFotografi/);
  assert.match(profilBasligi, /yedekAdres=\{avatarUrl\}/);
  assert.match(fotograf, /from '\.\.\/\.\.\/lib\/profil-fotografi'/);
  assert.match(fotograf, /profilFotografi\(yol, yedekAdres\)/);

  /*
    Yedek dalı GERÇEKTEN VAR: `avatar_path`i olmayan eski kullanıcı
    fotoğrafsız kalmıyor. Yardımcı önce yolu, sonra adresi deniyor.
  */
  assert.match(fotografKaynagi, /if \(dolu\(avatarYolu\)\) return \{ tur: 'yol', yol: avatarYolu \};/);
  assert.match(
    fotografKaynagi,
    /if \(dolu\(ogrenciAvatarUrl\)\) return \{ tur: 'adres', adres: ogrenciAvatarUrl \};/,
  );
  /* Bilinmeyen ile boş ayrı: yüklenmemiş satır "fotoğraf yok" sayılmıyor. */
  assert.match(fotografKaynagi, /avatarYolu === undefined \? \{ tur: 'bilinmiyor' \}/);
});

/*
  ÜÇ İDDİA DAHA KALKTI — HEPSİ KURULUM EKRANINI ÖLÇÜYORDU

  "Bölümün geri alınamadığı kaydetmeden önce söyleniyor", "kurulumda
  liste için yükleme/boş/hata ayrı" ve "kaydetme başarısızsa profile
  geçilmiyor". Üçü de `SosyalProfilKurulum` formunun cümlelerini ve
  gönderim dalını ölçüyordu; form silindi. Gevşetilmediler, konuları
  kalmadı.
*/

test('düzenlemede bölüm ve alan düzenlenebilir kutu değil', () => {
  /*
    KULLANICI ADI ARTIK BU CÜMLENİN DIŞINDA

    "Kullanıcı adı, bölüm ve alan değiştirilemiyor" yazıyordu. 20260926020000
    adı değiştirilebilir yaptı (eski ad kalıcı olarak rezerve ediliyor) ve
    işin kendi bileşeni var. Cümle olduğu gibi kalsaydı, çalışan bir
    eylemi yokmuş gibi gösterirdi.

    Bölüm ve alan hâlâ kilitli: istemcinin o kolonlarda update yetkisi
    yok (20260923030000) ve düzeltme yönetim tarafında.
  */
  assert.match(duzenleme, /Bölüm ve alan değiştirilemiyor/);
  assert.match(duzenleme, /<KullaniciAdiDegistirme/);
  assert.doesNotMatch(duzenleme, /disabled\s*\n?\s*value=\{profil\.bolumAdi/);
});

/* ------------------------------------------------------------------ */
/*  SAHTE ÖZELLİK VE SAHTE VERİ                                        */
/* ------------------------------------------------------------------ */

test('hiçbir yerde "yakında" vaadi yok', () => {
  for (const kaynak of SOSYAL_BILESENLER_YORUMSUZ) {
    assert.doesNotMatch(kaynak, /Yakında|yakında|Çok yakında|Hazırlanıyor/);
  }
});

test('örnek kullanıcı ya da uydurma sayı yok', () => {
  for (const kaynak of SOSYAL_BILESENLER_YORUMSUZ) {
    assert.doesNotMatch(kaynak, /lorem|Lorem|örnek kullanıcı|demoProfil|MOCK|mockData/);
  }
  /* Sayaçlar yalnız RPC'den geliyor; bileşende sabit sayı yok. */
  assert.doesNotMatch(gorunum, /paylasim: \d+|baglanti: \d+/);
});

test('tarih tek kaynaktan biçimleniyor', () => {
  assert.match(izgara, /from '\.\.\/\.\.\/lib\/tarih\.mjs'/);
  for (const kaynak of SOSYAL_BILESENLER_YORUMSUZ) {
    assert.doesNotMatch(kaynak, /toLocaleDateString/);
  }
});

test('renk ve odak kalıbı depodaki tek kaynaktan', () => {
  for (const kaynak of [
    gorunum,
    menu,
    sayfa,
    duzenleme,
    alanlar,
    bolumSecimi,
    bolumTalebi,
    baglantiDugmesi,
    baglantilar,
  ]) {
    assert.match(kaynak, /renk-token/);
  }
  /* Yeni bir palet getirilmiyor: mevcut mavi/gri/kehribar ölçeği. */
  for (const kaynak of SOSYAL_BILESENLER_YORUMSUZ) {
    assert.doesNotMatch(kaynak, /bg-(purple|fuchsia|lime|cyan|indigo|teal)-/);
  }
});

/* ------------------------------------------------------------------ */
/*  BÖLÜM TALEBİ — İKİ AYRI DÜRÜST EKRAN                               */
/* ------------------------------------------------------------------ */

test('iki durumun cümleleri ayrı: bölüm yok / alan tanımlı değil', () => {
  /*
    İkisi farklı sorun ve farklı çözüm istiyor: birincisinde katalogda
    bölüm açılması, ikincisinde var olan bölüme alan eşlenmesi gerekiyor.
    Tek cümleye indirmek, yöneticiye de kullanıcıya da yanlış işi
    anlattırırdı.
  */
  assert.match(bolumTalebi, /kip === 'bolum-yok'/);
  assert.match(bolumTalebi, /Bölümün listede yok/);
  assert.match(bolumTalebi, /Bölümün için alan topluluğu henüz tanımlı değil/);
  /* Serbest metin YALNIZ "bölümüm listede yok" durumunda soruluyor. */
  assert.match(bolumTalebi, /kimlik="bolum-talebi-ad"/);
  assert.match(bolumTalebi, /kimlik="bolum-talebi-universite"/);
});

test('talep gönderildikten sonra sahte onay yok', () => {
  const temiz = yorumsuz(bolumTalebi);
  assert.match(temiz, /Talebin sırada/);
  /* Talep açmak erişim VERMİYOR; metin de erişim iddia etmiyor. */
  assert.doesNotMatch(temiz, /erişimin açıldı|topluluğa alındın|katıldın/);
  assert.doesNotMatch(temiz, /Yakında|yakında|kısa süre içinde|en kısa sürede/);
});

test('hiçbir yerde "doğrulanmış öğrenci" iması yok', () => {
  /*
    Bölüm bilgisi bu sürümde BEYAN. Doğrulama altyapısı (okul e-postası,
    öğrenci belgesi) hiç yok; ima eden tek kelime bile karşılığı olmayan
    bir güven satardı.
  */
  for (const kaynak of [...SOSYAL_BILESENLER_YORUMSUZ, yorumsuz(talepKuyrugu)]) {
    assert.doesNotMatch(kaynak, /doğrulan|Doğrulan|onaylı öğrenci/);
  }
});

test('talep yazma yolu kendi satırıyla sınırlı', () => {
  const govde = govdeAl(
    yorumsuz(sorgular),
    'export async function bolumTalebiAc',
    'export async function bolumTalebimiGetir',
  );
  assert.ok(govde.length > 0, 'talep açma fonksiyonu bulunamadı');
  assert.match(govde, /\.from\('department_requests'\)/);
  assert.match(govde, /user_id: kullaniciId/);
  /* Aynı anda tek açık talep: tekil indeks 23505 ile dönüyor. */
  assert.match(govde, /'23505'/);
  assert.match(govde, /Zaten bekleyen bir talebin var\./);
});

/* ------------------------------------------------------------------ */
/*  ZİYARETÇİ GÖRÜNÜMÜ                                                 */
/* ------------------------------------------------------------------ */

test('sahibe özel her şey sahibiMi koşulunun içinde, bağlantı düğmesi dışında', () => {
  /*
    Sahibe özel eylemlerin HEPSİ `sahibiMi` koşulunun içinde açılıyor.
    CSS ile gizleme yok — gizlenmiş bir düğme klavyeyle bulunur.
  */
  assert.match(gorunum, /\{sahibiMi && onPaylas && onGorunurluk && \(/);
  assert.match(gorunum, /\{sahibiMi && onDuzenle && \(/);
  /*
    "Yayında değilse uyarı kutusu" dalı KALKTI (üyelik artık bu kolonda
    değil); yerinde paylaşımın iki sunucu önkoşulu duruyor. Görünürlük
    hatası da tek dala indi.
  */
  assert.match(
    gorunum,
    /\{sahibiMi && profil\.yayindaMi && profil\.sektorId && onPaylasimOlustur && \(/,
  );
  assert.match(gorunum, /\{sahibiMi && yayimlamaDurumu === 'hata' && \(/);
  /* Bağlantı düğmesi bunun TERSİ dalda: kendi profilinde çizilmiyor. */
  assert.match(gorunum, /\{!sahibiMi && bakanId && \(/);
});

test('görünmeyen, olmayan ve farklı alandaki profil aynı güvenli ekranı veriyor', () => {
  /*
    Üç durumun ayrı cümleleri olsaydı adres çubuğu bir kullanıcı adı
    sözlüğüne dönerdi: "bu ad var ama kapalı" ile "böyle bir ad yok"
    farkı tek başına bir sızıntı.
  */
  assert.match(sayfa, /Bu profil şu anda görüntülenemiyor/);
  assert.equal((sayfa.match(/Bu profil şu anda görüntülenemiyor/g) ?? []).length, 1);
  assert.doesNotMatch(yorumsuz(sayfa), /kullanıcı bulunamadı|böyle bir kullanıcı|profil bulunamadı/i);
  /* Kimlik çevrimi sıfır satır dönerse aynı ekran çiziliyor. */
  assert.match(sayfa, /ziyaretciDurumu === 'yok'/);
});

test('ziyaretçi yolu dört durumu da çiziyor', () => {
  assert.match(sayfa, /ziyaretciDurumu === 'yukleniyor'/);
  assert.match(sayfa, /ziyaretciDurumu === 'hata'/);
  assert.match(sayfa, /ziyaretciDurumu === 'hazir'/);
  assert.match(sayfa, /ziyaretciDurumu === 'yok'/);
});

/* ------------------------------------------------------------------ */
/*  BAĞLANTI DÜĞMESİ                                                   */
/* ------------------------------------------------------------------ */

test('sıfır satırda bağlantı düğmesi DOM içine hiç girmiyor', () => {
  /*
    `baglanti_durumu` görünmeyen hedef için SIFIR SATIR dönüyor. Gizlenmiş
    bir düğme "bu profil var" sinyali olurdu; bu yüzden bileşen hiçbir şey
    çizmiyor.
  */
  assert.match(durumRpc, /GÖRÜNMEYEN HEDEF İÇİN SIFIR SATIR/);
  assert.match(sorgular, /rpc\('baglanti_durumu', \{ hedef: hedefId \}\)/);
  assert.match(baglantiDugmesi, /if \(!bilgi\) return null;/);
  /* Sıfır satır 0 SAYILMIYOR: veri katmanı null dönüyor. */
  const govde = govdeAl(
    yorumsuz(sorgular),
    'export async function baglantiDurumu',
    'export async function baglantiKur',
  );
  assert.match(govde, /if \(!satir\) return null;/);
});

test('yedi durumun her birinin kendi metni var', () => {
  const metinler = [
    'Bağlantı kur',
    'İstek gönderildi',
    'İsteği geri çek',
    'Sana istek gönderdi',
    'Kabul et',
    'Reddet',
    'Bağlantınız var',
    'Bağlantıyı kaldır',
    'Bu isteği reddettin',
    'Yeniden gönderilebilir',
  ];
  for (const metin of metinler) {
    assert.ok(baglantiDugmesi.includes(metin), `bağlantı durumu metni eksik: ${metin}`);
  }
  /* Yedinci durum (engel) bir metin değil: satırın hiç çizilmemesi. */
  assert.match(baglantiDugmesi, /if \(!bilgi\) return null;/);
});

test('yeniden deneme anı tarih olarak yazılıyor', () => {
  assert.match(baglantiDugmesi, /from '\.\.\/\.\.\/lib\/tarih\.mjs'/);
  assert.match(baglantiDugmesi, /tarihMetni\(bilgi\.yenidenDenemeAni\)/);
});

test('bağlantı eylemleri kilitli ve iyimser güncelleme yok', () => {
  /*
    Kilit yalnız metin olsaydı çift tıklama ikinci bir istek atardı.
    Yerel durum ancak sunucu kabul ettikten SONRA yazılıyor: tersi,
    başarısız bir istekte "istek gönderildi" yalanı olurdu.
  */
  assert.match(baglantiDugmesi, /if \(islemde\) return;/);
  assert.match(baglantiDugmesi, /disabled=\{islemde\}/);
  const govde = govdeAl(yorumsuz(baglantiDugmesi), 'const eylemiCalistir', 'const govde =');
  assert.ok(govde.length > 0, 'eylem gövdesi bulunamadı');
  assert.ok(govde.indexOf('await eylem();') < govde.indexOf('setBilgi('));
  assert.match(govde, /setHataMesaji\(/);
});

/* ------------------------------------------------------------------ */
/*  /baglantilar SAYFASI                                               */
/* ------------------------------------------------------------------ */

test('tek sayfa, üç bölüm', () => {
  assert.match(baglantilar, /Bağlantılar\s*<\/h1>/);
  assert.match(baglantilar, /baslik="Gelen istekler"/);
  assert.match(baglantilar, /baslik="Gönderilen istekler"/);
  /* Ayrı rota ya da sekme adresi yok: tek adres. */
  assert.doesNotMatch(yorumsuz(baglantilar), /\/baglantilar\//);
});

test('her bölümde dört durum ayrı çiziliyor', () => {
  assert.match(baglantilar, /durum === 'yukleniyor'/);
  assert.match(baglantilar, /durum === 'hata'/);
  assert.match(baglantilar, /satirlar\.length === 0/);
  assert.match(baglantilar, /Bağlantılar alınamadı/);
  assert.match(baglantilar, /bosMetin/);
});

test('karşı tarafın profili gelmiyorsa ad uydurulmuyor', () => {
  assert.match(baglantilar, /profil şu anda görüntülenemiyor/);
  assert.match(sorgular, /profil: profiller\.get\(kisiId\) \?\? null/);
});

test('yorum, mesaj ve bildirim merkezi bu sayfaya eklenmedi', () => {
  const temiz = yorumsuz(baglantilar);
  assert.doesNotMatch(temiz, /Yorum|Mesaj|Bildirim merkezi/);
});

test('bağlantı sayacı sayfaya götürüyor, bilinmiyorsa hiç çizilmiyor', () => {
  /*
    Sayı `sosyal_sayaclar`dan geliyor ve sıfır satır "sana verilmiyor"
    demek. Bilinmeyen sayı için ne rakam ne bağlantı çiziliyor.
    Bağlantı gerçek `<a href>`: orta tuş ve "yeni sekmede aç" çalışıyor.
  */
  assert.match(gorunum, /sayacDurumu === 'hazir' && sayaclar &&/);
  assert.match(gorunum, /href="\/baglantilar"/);
  assert.match(app, /temizYol === '\/baglantilar'/);
  assert.match(app, /<BaglantilarSayfasi/);
});

test('bağlantı sayısı yalnız sahibinde bağlantı, ziyaretçide düz metin', () => {
  /*
    `/baglantilar` BAKAN KİŞİNİN kendi bağlantı yönetim ekranı. Ziyaretçi
    sayacına bağlantı verilseydi kullanıcı karşısındakinin listesini
    göreceğini sanırdı; başkasının listesini gösteren hiçbir şey de yok.
  */
  const sayac = govdeAl(gorunum, 'const BaglantiSayaci', 'export const SosyalProfilGorunumu');
  assert.ok(sayac.length > 0, 'bağlantı sayacı bulunamadı');
  assert.match(sayac, /if \(!sahibiMi\) return <Sayac etiket="Bağlantı" deger=\{deger\} \/>;/);

  /* Ziyaretçi dalı ERKEN DÖNÜYOR: `<a>` yalnız o dönüşten sonra kuruluyor. */
  const erkenDonusOncesi = sayac.slice(0, sayac.indexOf('if (!sahibiMi)'));
  assert.doesNotMatch(erkenDonusOncesi, /<a\b/);
  /* Tek bir `/baglantilar` bağlantısı var; ikinci bir yol açılmadı. */
  assert.equal(gorunum.split('href="/baglantilar"').length - 1, 1);
});

/* ------------------------------------------------------------------ */
/*  YÖNETİM — TALEP KUYRUĞU                                            */
/* ------------------------------------------------------------------ */

test('kabul iki KAPALI listeden seçim istiyor', () => {
  assert.match(talepKuyrugu, /bolumleriGetir/);
  assert.match(talepKuyrugu, /sektorleriGetir/);
  assert.match(talepKuyrugu, /<select/);
  /* Seçim yapılmadan kabul gönderilemiyor. */
  assert.match(talepKuyrugu, /Bölüm ve alan seçilmeden kabul edilemiyor\./);
});

test('yönetim notu her iki kararda da zorunlu', () => {
  /*
    Kutunun etiketi "Gerekçe" iken kimin okuyacağını söylemiyordu ve
    yönetici oraya kullanıcıya seslenen bir cümle yazabilirdi; o cümle
    denetim tablosunda kalır, kimseye ulaşmazdı. Etiket de hata cümlesi
    de artık notun nereye gittiğini söylüyor.
  */
  assert.match(talepKuyrugu, /Yönetim notu zorunlu/);
  assert.match(kararRpc, /gerekce-zorunlu/);
  assert.match(sorgular, /p_gerekce: girdi\.gerekce/);
});

test('kullanıcının serbest metni bir girdi kutusuna kopyalanmıyor', () => {
  /*
    Serbest metin forma önceden doldurulsaydı yönetici "zaten yazılmış"
    diye onaylardı; oysa `departments.ad` her zaman yöneticinin açık
    girdisi olmalı. Metin yalnız okunur gösteriliyor.
  */
  assert.doesNotMatch(talepKuyrugu, /value=\{talep\./);
  assert.doesNotMatch(talepKuyrugu, /defaultValue=\{talep\./);
  assert.match(talepKuyrugu, /\{talep\.yazilanBolum\}/);
  /* Karar RPC'si serbest metin parametresi almıyor. */
  const govde = govdeAl(
    yorumsuz(sorgular),
    'export async function bolumTalebiniKararaBagla',
    'function kararHatasi',
  );
  assert.ok(govde.length > 0, 'karar fonksiyonu bulunamadı');
  assert.doesNotMatch(govde, /requested_department|yazilanBolum/);
});

test('kuyrukta dört durum çizilir, boş kuyruk dürüst', () => {
  assert.match(talepKuyrugu, /durum === 'yukleniyor'/);
  assert.match(talepKuyrugu, /durum === 'hata'/);
  assert.match(talepKuyrugu, /talepler\.length === 0/);
  assert.match(talepKuyrugu, /Bekleyen bölüm talebi yok\./);
  assert.match(talepKuyrugu, /Talepler alınamadı/);
});

test('yönetim rotası mevcut kapıyı kullanıyor, yeni panel kurulmuyor', () => {
  assert.match(app, /temizYol === '\/yonetim\/bolum-talepleri'/);
  assert.match(app, /<BolumTalepleri/);
  /* Yetki kapısı depodaki mevcut bileşen. */
  assert.match(app, /temizYol === '\/yonetim\/bolum-talepleri'[\s\S]{0,400}?<AdminRouteGate/);
});

test('tarih kuyrukta da tek kaynaktan biçimleniyor', () => {
  assert.match(talepKuyrugu, /from '\.\.\/\.\.\/lib\/tarih\.mjs'/);
  assert.doesNotMatch(yorumsuz(talepKuyrugu), /toLocaleDateString/);
});

/* ------------------------------------------------------------------ */
/*  KARAR AÇIKLAMASI — İKİ AYRI KANAL                                  */
/* ------------------------------------------------------------------ */

test('karar iki ayrı metin istiyor: iç not ve kullanıcı açıklaması', () => {
  /*
    Tek alan olsaydı yönetici iç notu yazarken onu kullanıcının
    okuyacağını unutabilirdi. İki alan, iki ayrı yazma anı demek.
  */
  assert.match(sorgular, /p_gerekce: girdi\.gerekce/);
  assert.match(sorgular, /p_karar_aciklamasi: girdi\.kararAciklamasi/);
  assert.match(kararAciklamasiRpc, /aciklama-zorunlu/);
  /* Sunucunun iki kodu arayüzde iki AYRI cümleye eşleniyor. */
  const cumleler = govdeAl(yorumsuz(sorgular), 'const cumleler', '};');
  assert.match(cumleler, /'gerekce-zorunlu':/);
  assert.match(cumleler, /'aciklama-zorunlu':/);
});

test('karar formunda iki alan var ve etiketler kimin okuyacağını söylüyor', () => {
  assert.match(talepKuyrugu, /Yönetim notu \(kullanıcıya gösterilmez\)/);
  assert.match(talepKuyrugu, /Kullanıcıya gösterilecek açıklama/);
  /* İkisi de boşken karar gönderilemiyor. */
  assert.match(talepKuyrugu, /gerekceHatasi/);
  assert.match(talepKuyrugu, /kullaniciAciklamasiHatasi/);
  assert.match(talepKuyrugu, /kararAciklamasi: /);
  /* Kullanıcının serbest metni hâlâ hiçbir girdiye kopyalanmıyor. */
  assert.doesNotMatch(talepKuyrugu, /value=\{talep\./);
});

test('kullanıcı kendi satırındaki açıklamayı okuyor, yönetimin iç notunu değil', () => {
  assert.match(sorgular, /kararAciklamasi: data\.karar_aciklamasi \?\? null/);
  /* Denetim tablosu kullanıcıya kapalı; hiçbir sorgu ona bakmıyor. */
  assert.doesNotMatch(yorumsuz(sorgular), /bolum_talep_denetim/);
  /* İç notun adı kullanıcı ekranında hiç geçmiyor. */
  assert.doesNotMatch(yorumsuz(bolumTalebi), /gerekçe|gerekce|denetim/i);
});

test('karar açıklaması yoksa sebep hiç anılmıyor', () => {
  /*
    Eski satırlarda `karar_aciklamasi` NULL ve göç uydurma cümle yazmıyor.
    "Sebep belirtilmedi" demek de uydurma sayılır: yokluğu anlatan bir
    cümle, sebebin bir yerde durduğunu ima eder. Yalnız durum yazılıyor.
  */
  assert.match(bolumTalebi, /mevcut\.kararAciklamasi &&/);
  assert.doesNotMatch(
    yorumsuz(bolumTalebi),
    /sebep belirtilmedi|açıklama girilmedi|sebebi bilinmiyor/i,
  );
});

/* ------------------------------------------------------------------ */
/*  YÖNETİM PANELİ — KUYRUĞA GİRİŞ                                     */
/* ------------------------------------------------------------------ */

test('panelde "Bölüm talepleri" girişi var ve mevcut navigasyon kalıbını izliyor', () => {
  assert.match(panel, /Bölüm talepleri/);
  assert.match(panel, /onNavigate\('\/yonetim\/bolum-talepleri'\)/);
  /* Yeni bir navigasyon sistemi kurulmadı: öteki girişlerle aynı kalıp. */
  assert.match(panel, /onNavigate\('\/yonetim\/talepler'\)/);
  /*
    Kuyrukta kaç talep beklediği panelin özetinde YOK; olmayan bir sayıyı
    rozet diye basmak uydurma veri olurdu.
  */
  assert.doesNotMatch(yorumsuz(panel), /Bölüm talepleri[\s\S]{0,120}bekleyen/);
});

test('kuyruk girişi yönetici olmayan dalda DOM’a hiç girmiyor', () => {
  /*
    Görünürlük burada bir güvenlik sınırı: bağlantıyı CSS ile gizlemek
    yetmezdi. Panelin kendisi App içinde `isAdmin` koşulunun İÇİNDE
    çiziliyor; öteki dalda tek bir paragraf var, bağlantı hiç kurulmuyor.
  */
  const yoneticiDali = govdeAl(app, '{isAdmin ? (', 'Bu sayfa yalniz');
  assert.ok(yoneticiDali.includes('<AdminDashboard'), 'panel yönetici dalının içinde değil');
  assert.equal(
    app.split('<AdminDashboard ').length - 1,
    1,
    'panel ikinci bir yerde daha çiziliyor',
  );
  /* Rotanın kendisi de sunucu tarafı kapının arkasında. */
  assert.match(app, /temizYol === '\/yonetim\/bolum-talepleri'[\s\S]{0,400}?<AdminRouteGate/);
});

/* ------------------------------------------------------------------ */
/*  BİRLEŞİK EKRAN — SOLDA PROFİL/CV, SAĞDA SOSYAL PORTFOLYO           */
/* ------------------------------------------------------------------ */

test('/cv birleşik ekranı, /cv/yazdir yazdırılabilir CV', () => {
  /*
    İki adres AYRILDI çünkü iki farklı iş: biri profili yönetmek, öteki
    bir belgeyi almak. Tek adreste dursalardı yazdırma görünümü profili
    düzenleyen kullanıcının altından ekranı çeker, ya da tersine belge
    adresi paylaşılamazdı. Sunucu tarafı da ikisini de tanıyor; tanımasa
    doğrudan açılan `/cv/yazdir` 404 dönerdi.
  */
  assert.match(app, /if \(temizYol === '\/cv' \|\| temizYol === '\/cv\/yazdir'\) \{/);
  assert.match(app, /if \(temizYol === '\/cv\/yazdir'\) \{\n\s*return <CvPage student=\{student\} onBack=\{\(\) => navigate\('\/cv'\)\} \/>;/);
  assert.match(app, /return icerikSayfasi\(<main className=\{anaAlanSinifi\}>\{ogrenciProfilEkrani\(\)\}<\/main>\);/);
  assert.match(orta, /'\/cv',/);
  assert.match(orta, /'\/cv\/yazdir',/);

  /* Birleşik ekran: sol sütun profil/CV kartı, sağ sütun portfolyo. */
  assert.match(ogrenciProfili, /lg:col-span-4/);
  assert.match(ogrenciProfili, /lg:col-span-8/);
  assert.match(ogrenciProfili, /\{sosyalPortfolyo\}/);
  assert.match(app, /sosyalPortfolyo=\{\n\s*<SosyalProfilSayfasi\n\s*gomulu/);
});

test('CV eylemi yazdırılabilir belgeye gidiyor, birleşik ekrana değil', () => {
  /*
    `/cv` artık birleşik ekranın kendisi. "CV'yi görüntüle" oraya
    götürseydi düğme kullanıcıyı bulunduğu sayfaya geri koyardı — hiçbir
    şey yapmayan bir eylem.
  */
  assert.match(app, /onOpenCv=\{\(\) => navigate\('\/cv\/yazdir'\)\}/);
  assert.equal((app.match(/navigate\('\/cv'\)/g) ?? []).length, 2);
});

test('Başvurularım sağ sütundan kalktı ama yolu duruyor', () => {
  /*
    Bölüm profilin sağ sütunundan kaldırıldı; yerini sosyal portfolyo
    aldı. Başvuru takibi SİLİNMEDİ: kendi sekmesine döndü. Bir süre
    'applications' sekmesi 'profile'a çevriliyordu ve o çeviri kalsaydı
    hesap menüsündeki satır kullanıcıyı başvuru diye bir şey olmayan bir
    ekrana düşürürdü.
  */
  assert.doesNotMatch(ogrenciProfili, /basvuruListesi/);
  assert.doesNotMatch(ogrenciProfili, /baslik="Başvurularım"/);
  assert.doesNotMatch(ogrenciProfili, /id="basvuru"/);

  assert.match(app, /const istenenTab = activeTab;/);
  assert.match(app, /\{safeTab === 'applications' && basvuruTakibi\}/);
  assert.match(app, /const basvuruTakibi = activeStudent \? \(/);
  assert.match(hesapSayfasi, /data-testid="account-sheet-applications"/);
  assert.match(hesapSayfasi, /onClick=\{onOpenApplications\}/);

  /* Sayaçlar da o ekrana götürüyor: sayının gittiği yerde aynı sayı var. */
  assert.match(ogrenciProfili, /onBasvurulariAc\?: \(altSekme\?: 'all' \| 'interviews'\) => void;/);
  assert.match(ogrenciProfili, /onBasvurulara=\{onBasvurulariAc \? \(\) => onBasvurulariAc\('all'\) : undefined\}/);
  assert.match(app, /setActiveTab\('applications'\);\n\s*setActiveSubTab\(altSekme \?\? 'all'\);/);
});

test('ziyaretçi dalı portfolyo üst satırını ve CV alanını DOM’a hiç sokmuyor', () => {
  /*
    Dişli menüsü, "Paylaş" düğmesi ve sahibin kendi listeleri
    `PortfolyoUstSatiri` içinde; o bileşen sayfanın SAHİP dalında, yani
    `if (!sahibiMi) return <GuvenliEkran/>` satırından SONRA çiziliyor.
    Ziyaretçi dalı çok daha yukarıda dönüyor ve o dala hiç ulaşmıyor —
    gizlenmiş bir menü klavyeyle bulunur, çizilmeyen menü bulunmaz.

    CV kartı, profil tamamlanma oranı ve düzenleme alanları
    `StudentProfileView` içinde ve o bileşen sosyal ağaçta hiç geçmiyor:
    ziyaretçi görünümü `SosyalProfilGorunumu` ile çiziliyor.
  */
  const ziyaretciDali = sayfa.indexOf('if (ziyaretciYolu) {');
  const sahipDali = sayfa.indexOf('if (!sahibiMi) {');
  const ustSatirCagrisi = sayfa.indexOf('<PortfolyoUstSatiri');
  assert.ok(ziyaretciDali > 0 && sahipDali > 0 && ustSatirCagrisi > 0);
  assert.ok(ziyaretciDali < sahipDali, 'ziyaretçi dalı sahip dalından önce dönmeli');
  assert.ok(sahipDali < ustSatirCagrisi, 'üst satır sahip dalından sonra çiziliyor');

  /* Ziyaretçiye açıkça `sahibiMi={false}` geçiyor; varsayılana bırakılmıyor. */
  assert.match(sayfa, /<SosyalProfilGorunumu\n\s*profil=\{ziyaretciProfili\}\n\s*sahibiMi=\{false\}/);

  /* Sosyal ağaçta CV/profil düzenleme bileşenlerinin adı bile geçmiyor. */
  for (const kaynak of [sayfa, gorunum, ustSatir]) {
    assert.doesNotMatch(kaynak, /StudentProfileView|CvAlani|CvPage|ProfilBasligi/);
  }
  /* Üst satır bir `sahibiMi` bayrağı ALMIYOR: sınır çağıranda, burada değil. */
  assert.doesNotMatch(ustSatir, /sahibiMi\?:/);
});

test('ziyaretçi görünümü iki sütun, ızgara sahibin ekranıyla aynı ölçüde', () => {
  /*
    Ziyaretçi görünümü TEK SÜTUNDU: kimlik kartı tam genişlikte duruyor,
    ızgara onun altından başlıyordu. Geniş ekranda kartın sağı boş
    kalıyor, kullanıcı fotoğrafları görmek için önce biyografiyi geçmek
    zorunda kalıyordu.

    İskelet birleşik ekrandakiyle (`/cv`) BİREBİR aynı olmalı: iki farklı
    profil yerleşimi olsaydı aynı kişi kendi ekranıyla başkasının ekranı
    arasında geçerken düzen kayardı. Bu yüzden iddia sınıf dizesini TEK
    TEK karşılaştırıyor, "iki sütun var mı" diye bakmıyor.
  */
  const iskelet = /grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start/;
  assert.match(gorunum, iskelet);
  assert.match(ogrenciProfili, iskelet);
  assert.match(gorunum, /className="lg:col-span-4 lg:sticky lg:top-4"/);
  assert.match(gorunum, /className="lg:col-span-8 min-w-0"/);

  /*
    Izgara sabiti DEĞİŞMEDİ ve iki ekran da `gorunum="sade"` istiyor: iki
    kip olsaydı aynı paylaşım iki adreste iki farklı boyda görünürdü.
  */
  assert.ok(
    izgara.includes(
      "export const PAYLASIM_IZGARASI = 'grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3';",
    ),
    'ızgara sabiti değişmemeli',
  );
  assert.match(gorunum, /<PaylasimIzgarasi[\s\S]{0,400}?gorunum="sade"/);
  assert.match(sayfa, /<PaylasimIzgarasi[\s\S]{0,400}?gorunum="sade"/);

  /* Sol sütun yalnız herkese açık alanlar: sahibin üst satırı burada yok. */
  assert.doesNotMatch(gorunum, /PortfolyoUstSatiri/);
});

test('alt çubuktaki Profil birleşik ekranın kendi adresine gidiyor', () => {
  /*
    Düğme `setActiveTab('profile')` yapıyordu: aynı birleşik ekran `/`
    adresinde çiziliyor, yani aynı ekranın iki adresi vardı. Artık üst
    çubuktaki hesap bağlantısıyla AYNI prop'u çağırıyor — ikinci bir yol
    açılmadı.
  */
  const altCubukProfil = ustCubuk.indexOf('aria-label="Profilim"');
  assert.ok(altCubukProfil > 0, 'alt çubuktaki Profil düğmesi bulunmalı');
  const dugme = ustCubuk.slice(altCubukProfil, altCubukProfil + 1400);
  assert.ok(
    dugme.includes('if (onOpenProfilVeCv) {') && dugme.includes('onOpenProfilVeCv();'),
    'alt çubuk üst çubuktaki hesap bağlantısıyla aynı prop’u çağırmalı',
  );
  /* Prop verilmezse eski sekme davranışı yedekte kalıyor. */
  assert.ok(dugme.includes("setActiveTab('profile');"), 'yedek davranış korunmalı');
  assert.match(app, /onOpenProfilVeCv=\{\(\) => navigate\('\/cv'\)\}/);

  /*
    Seçili vurgusu ADRESE de bakıyor: /cv'ye götüren düğme, gittiği yerde
    sönük kalmamalı.
  */
  assert.ok(
    ustCubuk.includes(String.raw`const cvEkranindaMi = /^\/cv(\/|$)/.test(bulunulanYol);`),
    'adres /cv iken Profil seçili görünmeli',
  );
  assert.ok(ustCubuk.includes('const profildeMi = cvEkranindaMi ||'));
});

/* ------------------------------------------------------------------ */
/*  G AŞAMASI — ÜÇ KAVRAM AYRIŞTI                                      */
/* ------------------------------------------------------------------ */

test('/cv ana görünümünde "Profil bilgileri" listesi ve kurulum girişi yok', () => {
  /*
    ANA GÖRÜNÜM SADE: solda kim olduğun, sağda portfolyon.

    Doldurulacak alanların listesi bir GEZİNME aracı ve yeri düzenleme
    ekranı. Ana görünümde dururken sol sütunun yarısını kaplıyor,
    kullanıcıya her açılışta "burada eksiklerin var" diyordu — oysa aynı
    eksikler kimlik kartındaki rozetlerde zaten yazılı.

    "Sosyal profil oluştur" girişi de yok: 20260926050000 profili kayıtla
    birlikte SUNUCUDA açıyor. Arkasında kullanıcının vereceği bir bilgi
    olmayan bir karar sormak, olmayan bir adımı varmış gibi göstermek
    olurdu. Satır gelmediğinde çizilen şey bir kurulum çağrısı değil,
    dürüst bir hata kutusu.
  */
  assert.doesNotMatch(profilBasligi, /<Bolumler /);
  assert.doesNotMatch(ogrenciProfili, /oneCikanlar=\{oneCikanlar\}\n\s*secili=/);
  /* Kimlik kartı hâlâ ana görünümde ve tek çağrısı orada. */
  assert.equal((ogrenciProfili.match(/<ProfilBasligi\b/g) ?? []).length, 1);
  /* Kurulum ekranının tek çağrısı `/profil` dalında; gömülü kip hata yazıyor. */
  assert.doesNotMatch(ogrenciProfili, /SosyalProfilKurulum|Sosyal profil oluştur/);
  assert.match(sayfa, /if \(gomulu\) \{[\s\S]{0,200}?<SosyalProfilHazirDegil/);
});

test('kaldırılan bölümler silinmedi: düzenleme ekranının içindeler', () => {
  /*
    TAŞINDI, KOPYALANMADI. Aynı `Bolum` bileşenleri, aynı veri, aynı
    `onUpdateProfile` çağrıları — yalnız `duzenleme` dalında çiziliyorlar.
    İki kopya olsaydı biri değiştiğinde öteki geride kalır ve aynı alan
    iki ekranda iki farklı değer gösterirdi.

    Liste de aynı diziden besleniyor (`oneCikanlar`): gezinme ile
    bölümlerin sırası tek yerde.
  */
  assert.match(ogrenciProfili, /\{duzenleme && \(\n\s*<>/);
  assert.match(ogrenciProfili, /<ProfilBolumListesi ogeler=\{oneCikanlar\} secili=\{acikBolum\} \/>/);
  for (const kimlik of ['"cv"', '"kisisel"', '"teknik"', '"sosyal"', '"dil"', '"proje"']) {
    assert.equal(
      (ogrenciProfili.match(new RegExp(`id=${kimlik}\n`, 'g')) ?? []).length,
      1,
      `${kimlik} bölümü tam olarak bir kez çizilmeli`,
    );
  }
  /* Portfolyo yalnız ana görünümde: sağ sütun aynı anda görünüm+form olmuyor. */
  assert.match(ogrenciProfili, /\{!duzenleme && \(\n\s*<>\n\s*\{sosyalPortfolyo\}/);
  /* Düzenlemeye giden tek kapı `bolumeGit`; her giriş oradan geçiyor. */
  assert.equal((ogrenciProfili.match(/setDuzenleme\(true\)/g) ?? []).length, 1);
});

test('tek düzenleme ekranı, iki ayrı bölüm, iki ayrı kayıt', () => {
  /*
    Sosyal alanlar dişliden açılan AYRI bir ekrandaydı; öğrenci alanları
    ise `/cv` düzenleme dalında. Tek bir profili düzenlemek için iki
    ekran ve iki giriş vardı. Ekran birleşti.

    KAYIT BİRLEŞMEDİ VE BİRLEŞMİŞ GİBİ GÖSTERİLMİYOR: öğrenci alanları
    `student_profiles`e, sosyal alanlar `social_profiles`a yazıyor.
    Tek bir "Kaydet" düğmesi tek bir sonuç iddia ederdi ve yarısı
    başarılı bir gönderimde o iddia yanlış olurdu. Bölümün kendi düğmesi,
    kendi durumu (bekliyor / gönderiliyor / kaydedildi / hata) ve kendi
    hata satırı var; ortak tek bir hata şeridi yok.

    Dişli menüsündeki giriş de kalktı: aynı işin iki kapısı olmasın.
  */
  assert.match(ogrenciProfili, /\{sosyalProfilDuzenleme && \(/);
  assert.match(ogrenciProfili, /Öğrenci bilgilerin/);
  assert.match(duzenleme, /Sosyal profilin/);
  assert.match(duzenleme, /'bekliyor' \| 'gonderiliyor' \| 'kaydedildi' \| 'hata'/);
  assert.match(duzenleme, /Sosyal profili kaydet/);
  /* Hata satırı bölümün kendi formunun içinde; ekran düzeyinde şerit yok. */
  assert.match(duzenleme, /\{kayitHatasi && <KayitHatasi mesaj=\{kayitHatasi\} \/>\}/);
  assert.doesNotMatch(ogrenciProfili, /KayitHatasi|SosyalHata/);
  /* Dişli artık düzenlemeye ve fotoğrafa götürmüyor. */
  assert.doesNotMatch(ustSatir, /onDuzenle|onFotograf/);
  /* Sosyal panelin tek çağrısı App'te ve düzenleme kipinde. */
  assert.match(app, /gomuluKip="duzenleme"/);
});

test('kariyer hedefi ve yetkinlik testleri ana görünümde duruyor', () => {
  /*
    İkisi de doldurulacak bir profil ALANI değil: hedef geleceği
    anlatıyor, testler ise bir eylem (çözülecek sınav). Düzenleme
    ekranına taşınsalardı ikisi de "eksik alan" gibi okunurdu.

    Yerleri sol sütunun ana görünüm dalı: `{!duzenleme && (` ile
    `{duzenleme && (` arasında, `ProfilBasligi`nin hemen altında.
  */
  const solSutun = ogrenciProfili.slice(
    ogrenciProfili.indexOf('<ProfilBasligi'),
    ogrenciProfili.indexOf('DOSYA SEÇİCİ HER İKİ DALDA DA AĞAÇTA'),
  );
  assert.match(solSutun, /Kariyer hedefin/);
  assert.match(solSutun, /Yetkinlik testleri/);
  /* Düzenleme dalına kopyalanmadılar: her biri tam olarak bir kez. */
  assert.equal((ogrenciProfili.match(/Kariyer hedefin/g) ?? []).length, 1);
  assert.equal((ogrenciProfili.match(/Yetkinlik testleri/g) ?? []).length, 1);
});

test('arama en az üç harf istiyor ve profile_id kullanmıyor', () => {
  /*
    Üç harf altında istek ATILMIYOR: sunucu zaten sıfır satır dönüyor ve
    o sıfır "sonuç yok" değil "henüz arama yok" demek. Sayı tek yerden
    (`ARAMA_EN_AZ_HARF`) geliyor; iki yerde yazılsaydı biri değiştiğinde
    arayüz ya boşuna istek atar ya da sunucunun bulacağı sonucu hiç
    sormazdı.

    Kimlik hiç taşınmıyor: RPC `profile_id` döndürmüyor ve gezinme
    kullanıcı adıyla yapılıyor. Kimlik listesi, ileride yazılacak her
    sorguya hazır bir hedef listesi olurdu.
  */
  assert.match(arama, /ARAMA_EN_AZ_HARF/);
  assert.doesNotMatch(yorumsuz(arama), /profilId|profile_id/);
  assert.doesNotMatch(yorumsuz(sorgular), /profilId: String\(satir\.profile_id\)/);
  /* Kutu sahibin dalında: ziyaretçi bu koda hiç ulaşmıyor. */
  assert.ok(sayfa.indexOf('if (!sahibiMi) {') < sayfa.indexOf('<KullaniciArama'));
  /*
    Yorumsuz kaynak: gerekçe yazısı sınırın nerede olduğunu anlatmak için
    `sahibiMi` adını anmak zorunda; bayrak olarak ALINMIYOR.
  */
  assert.doesNotMatch(yorumsuz(arama), /sahibiMi/);
});

test('üye sayısı NULL iken hiçbir sayı çizilmiyor', () => {
  /*
    `uye_sayisi` yalnız ÜYE OLUNAN toplulukta dolu; ötekilerde `null` ve
    NULL "sıfır" değil "sana verilmiyor" demek. 0 basmak, ölçülmemiş bir
    sayı uydurmak olurdu. Veri katmanı da `Number(null)`ı sıfıra
    çevirmiyor.
  */
  assert.equal(
    (topluluklar.match(/topluluk\.uyeMiyim && topluluk\.uyeSayisi !== null &&/g) ?? []).length,
    2,
  );
  assert.match(sorgular, /satir\.uye_sayisi === null \|\| satir\.uye_sayisi === undefined\n?\s*\? null/);
  /* Üye olmayana boş liste + "içerik yok" DEĞİL, sebep yazılıyor. */
  assert.match(topluluklar, /Topluluk paylaşımları üye olunca görünür/);
  assert.doesNotMatch(yorumsuz(topluluklar), /henüz içerik yok/i);
});

test('"Alan topluluğum" kitlesi yalnız üyede açılıyor', () => {
  /*
    Sunucu tarafı da aynı sınırı çiziyor (`paylasim_kitlesi_kilidi`,
    20260926040000); buradaki kapı ikinci kapı. Seçenek açık kalsaydı
    kullanıcı fotoğraflarını yükledikten SONRA reddedilirdi.

    Üyelik OKUNAMADIYSA da kapalı ve "üye değilsin" denmiyor: bilinmeyen
    bir yetkiyi bilinen gibi yazmak, kullanıcıya kendi üyeliği hakkında
    yanlış bilgi vermek olurdu.

    Varsayılan yine DAR olan: `useState<PaylasimKitlesi>('baglantilarim')`.
  */
  assert.match(olustur, /const pasif = kilitli \|\| \(uyelikSarti && !uyeMiyim\);/);
  assert.match(olustur, /disabled=\{pasif\}/);
  assert.match(olustur, /uyeMiyim/);
  assert.match(olustur, /setUyeMiyim\(liste\.some\(\(topluluk\) => topluluk\.uyeMiyim\)\)/);
  /* Sebep ve açan adres yazılı; bağlantı etiketin DIŞINDA. */
  assert.match(olustur, /alan topluluğuna katılınca açılıyor/);
  assert.match(olustur, /href=\{TOPLULUKLAR_YOLU\}/);
  assert.match(olustur, /aria-describedby=\{uyelikSarti && !uyeMiyim \? 'kitle-uyelik-sebebi' : undefined\}/);
  assert.match(olustur, /React\.useState<PaylasimKitlesi>\('baglantilarim'\)/);
  /* Sunucunun tetikleyici hatası yutulmuyor, Türkçe cümleye çevriliyor. */
  assert.match(sorgular, /'topluluk-uyeligi-yok':/);
});

test('/topluluklar rotası App içinde tek dala bağlı', () => {
  /*
    Liste ve detay AYNI bileşende: ikisi de `sosyal_topluluklar`
    okumasından besleniyor ve katılma eylemi ikisinde de aynı satırı
    değiştiriyor. İki bileşen olsaydı aynı üyelik iki yerden yazılırdı.
  */
  assert.match(
    app,
    /if \(temizYol === '\/topluluklar' \|\| temizYol\.startsWith\('\/topluluklar\/'\)\) \{/,
  );
  assert.equal((app.match(/<TopluluklarSayfasi\b/g) ?? []).length, 1);
  assert.match(app, /slug=\{hamSlug\}/);
});
