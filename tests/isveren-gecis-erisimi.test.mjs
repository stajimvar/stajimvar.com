import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
  İŞVEREN PANELİNE DÖNÜŞ — ERİŞİM KURALI

  Şirket üyesi öğrenci görünümüne geçtiğinde geri dönecek görünür bir yol
  kalmıyordu: geçiş yalnızca profil menüsünün içindeydi ve kullanıcı çıkış
  yapmak ya da tarayıcı geri tuşuna basmak zorunda kalıyordu.

  Bağlantının HANGİ SİNYALE bağlı olduğu bu turun asıl konusu. `profiles.role`
  yanlış sinyal: bir kişi hem öğrenci hem şirket üyesi olabiliyor ve öğrenci
  görünümüne geçmek üyeliği düşürmüyor. Doğru sinyal `company_members`.

  Bu testler kaynak üzerinden okuyor: bileşenler oturum ve Supabase istemcisi
  istiyor, jsdom kurulu değil. Ölçülen şey, bağlantının doğru koşula bağlı
  olması ve normal öğrenciye hiç çizilmemesi.
*/

const oku = (yol) => readFileSync(yol, 'utf8');
const HEADER = oku('src/components/Header.tsx');
const SHEET = oku('src/components/AccountSheet.tsx');
const APP = oku('src/App.tsx');
const KABUK = oku('src/sirket/SirketKabugu.tsx');

test('A/B) masaüstü bağlantısı ŞİRKET ÜYELİĞİNE bağlı', () => {
  /* Koşul olmasaydı normal öğrenci de işveren bağlantısı görürdü. */
  assert.match(
    HEADER,
    /\{sirketUyesiMi && onDunyaDegistir && \(/,
    'masaüstü düğmesi üyelik koşulu olmadan çiziliyor'
  );
  assert.match(HEADER, /data-testid="header-isveren-paneli"/);
});

test('A/B) profil menüsündeki dünya seçici de üyeliğe bağlı', () => {
  /*
    Eskiden yalnızca `onDunyaDegistir &&` idi: giriş yapan HER öğrenci
    "Şirket" sekmesi görüyordu. Bu turda kapatıldı.
  */
  const kalanKosulsuz = HEADER.match(/\{onDunyaDegistir && \(/g) ?? [];
  assert.deepEqual(kalanKosulsuz, [], 'üyelik koşulu olmayan dünya seçici kalmış');
});

test('C) sinyal profiles.role DEĞİL, company_members', () => {
  /*
    App bayrağı `sirketBaglami()` üzerinden kuruyor; o da company_members
    okuyor. Rol alanına bakan bir kısayol eklenirse bu test düşer.
  */
  assert.match(APP, /sirketBaglami\(kullanici, false\)/);
  assert.match(APP, /setSirketUyesi\(Boolean\(b\.companyId\)\)/);
  assert.match(APP, /sirketUyesiMi=\{sirketUyesi\}/);
});

test('D/E) bağlantı yola değil duruma bağlı: her sayfada aynı Header', () => {
  /*
    Bayrak Header'a props ile geçiyor ve Header her öğrenci sayfasında
    çiziliyor; yani yenileme ya da doğrudan adres bağlantıyı kaybetmiyor.
    Bayrak oturum kimliğine bağlı bir effect'ten geliyor, yola değil.
  */
  assert.match(APP, /\}, \[session\?\.userId\]\);/);
  assert.doesNotMatch(
    APP,
    /setSirketUyesi\([^)]*temizYol/,
    'üyelik bayrağı adrese bağlanmış'
  );
});

test('F) oturum kapanınca bağlantı kayboluyor', () => {
  assert.match(
    APP,
    /if \(!kullanici\) \{\s*setSirketUyesi\(false\);/,
    'çıkışta üyelik bayrağı sıfırlanmıyor'
  );
});

test('parlama yok: bayrak false başlıyor', () => {
  /*
    Üyelik async çözülüyor. `true` başlasaydı normal öğrenciye bir an
    işveren bağlantısı görünürdü.
  */
  assert.match(APP, /useState\(false\);\s*\n\s*\/\*/);
  assert.match(APP, /const \[sirketUyesi, setSirketUyesi\] = useState\(false\)/);
});

test('mobil: hesap panelinde satır var ve üyeliğe bağlı', () => {
  assert.match(SHEET, /\{sirketUyesiMi && onIsverenPaneli && \(/);
  assert.match(SHEET, /data-testid="account-sheet-isveren"/);
  /* 44px dokunma hedefi. */
  assert.match(SHEET, /account-sheet-isveren"[\s\S]{0,400}min-h-11/);
});

test('masaüstü düğmesi dar ekranda çizilmiyor', () => {
  /* Mobilde yeri hesap paneli; header'a uzun düğme sıkıştırılmıyor. */
  assert.match(
    HEADER,
    /data-testid="header-isveren-paneli"[\s\S]{0,400}hidden sm:inline-flex/
  );
});

test('şirket panelindeki eylem GÖRÜNÜM değiştirdiğini söylüyor', () => {
  /* "Öğrenci" tek başına hesap türü değiştiriyormuş gibi okunuyordu. */
  assert.match(KABUK, /Öğrenci görünümü/);
});
