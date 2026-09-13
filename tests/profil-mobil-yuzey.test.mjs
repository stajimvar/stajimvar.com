import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/**
 * PROFİL TELEFONDA YÜZEY, GENİŞ EKRANDA KART.
 *
 * Telefonda profil gri zemin üzerinde yüzen bir karttı: iki yanında gri
 * şeritler, kimlik bloğuyla ızgara arasında gri bir bant, köşelerde
 * yuvarlatmanın açtığı gri üçgenler vardı. Telefonda kabuk kalktı;
 * kimlik bloğu ve fotoğraf ızgarası ekranın iki kenarına yaslandı.
 *
 * BURADA SINANAN ŞEY GÖRÜNÜM DEĞİL, KAPSAM:
 *
 *   1. Değişikliğin TAMAMI telefona bağlı. `sm:` ve üstündeki gri
 *      zeminli, kartlı düzen aynı kalmalı — orada içerik kart hâlinde
 *      duruyor ve kartın nerede bittiğini gösteren şey zeminin rengi.
 *   2. `/cv` ile ziyaretçi profili AYNI değerleri kullanmalı. İkisi aynı
 *      tasarımın iki yüzü; biri beyaz öteki gri kalsaydı aynı kişi kendi
 *      profiliyle başkasınınki arasında geçerken zemin değişirdi.
 *   3. Kenara yaslanma yalnız YÜZEY olması gereken iki öğede. Kabuğun
 *      yan boşluğu kaldırılsaydı sağ sütundaki hesap eylemleri ve
 *      düzenleme formları da kenara yapışırdı; onlar kutu.
 */

const oku = (yol) => fs.readFileSync(yol, 'utf8');

const app = oku('src/App.tsx');
const card = oku('src/ui/Card.tsx');
const tokens = oku('src/ui/tokens.ts');
const ogrenciProfili = oku('src/components/StudentProfileView.tsx');
const profilBasligi = oku('src/components/ProfilBasligi.tsx');
const sosyalGorunum = oku('src/components/sosyal/SosyalProfilGorunumu.tsx');
const kabuk = oku('src/components/SayfaKabugu.tsx');

/* --------------------------------------------------------------- zemin */

test('iki profil ekranı da aynı zemini kullanıyor: telefonda beyaz, sm üstünde gri', () => {
  const zemin = /'bg-white sm:bg-\[#F9FAFB\]'/g;
  /*
    Üç ekran: `/cv`, ziyaretçi profili ve `/agim` akışı. Üçü de aynı
    yüzey mantığında — telefonda beyaz, geniş ekranda gri — ve aynı
    dizeyi paylaşıyorlar ki biri değişince öteki ikisi geride kalmasın.
  */
  assert.equal(
    [...app.matchAll(zemin)].length,
    3,
    '/cv, ziyaretçi profili ve akış aynı zemin dizesini paylaşmalı',
  );
});

test('varsayılan zemin değişmedi: öteki içerik sayfaları hâlâ gri', () => {
  // `icerikSayfasi` varsayılanı gri; profil dışındaki sayfalara dokunulmadı.
  assert.match(app, /const icerikSayfasi = \(icerik: React\.ReactNode, zemin = 'bg-\[#F9FAFB\]'\)/);
});

/* --------------------------------------------------- kabuğun yan boşluğu */

test('ana alan telefonda üst boşluk bırakmıyor, yan boşluğu koruyor', () => {
  /*
    Başlıklar telefonda `sr-only` olunca `pt-2` boşa çıktı ve üst çubukla
    liste arasında bant olarak kaldı. Yan boşluk KALIYOR: kaldırılsaydı
    hesap eylemleri ve formlar da ekranın kenarına yapışırdı; kenara
    yaslanması gereken öğeler bunu kendi `-mx-4 sm:mx-0` değeriyle yapıyor.

    `/cv` ile ana alan artık AYNI sınıfı paylaşıyor: ikisi üst boşlukta
    ayrılıyordu, o fark kalkınca ayrı bir sabit tutmak iki tanımın
    sessizce ayrışmasına davetiye olurdu.
  */
  const ana = app.match(/const anaAlanSinifi = `([^`]+)`/)[1];
  assert.ok(ana.includes('px-4 sm:px-6'), 'yan boşluk korunmalı');
  assert.ok(ana.includes('pt-0 sm:pt-3'), 'telefonda üst boşluk sıfır');
  assert.ok(!app.includes('profilAlanSinifi'), 'ayrı bir profil alanı sabiti kalmamalı');
});

test('ziyaretçi kabuğu telefonda kenarsız, sm üstünde varsayılan', () => {
  assert.match(kabuk, /mobilKenarsiz \? 'px-0 sm:px-6' : 'px-4 sm:px-6'/);
});

/* ------------------------------------------------------- kart kabuğu */

test('Card.mobilYuzey telefonda kabuğu bırakıyor, sm üstünde geri veriyor', () => {
  const dal = card.match(/mobilYuzey \? '([^']+)'/)[1];
  assert.equal(dal, 'border-b sm:rounded-[20px] sm:border');
  /* Telefonda yalnız alt çizgi: yuvarlatma ve dört kenar yok. */
  assert.ok(!/(^|\s)rounded-/.test(dal.replace(/sm:rounded-\[20px\]/, '')));
});

test('mobilYuzey köşesi KOSE.kart ile aynı değerde', () => {
  /*
    Sınıf adı literal yazılmak ZORUNDA: Tailwind kaynağı düz metin olarak
    tarıyor ve `sm:${KOSE.kart}` gibi çalışma anında kurulan bir dizeyi
    göremez — kural üretilmez, kart geniş ekranda köşesiz kalır. Literal
    olduğu için de token'dan sessizce ayrışabilir; bu test o ayrışmayı
    yakalıyor.
  */
  const kose = tokens.match(/kart:\s*'([^']+)'/)[1];
  assert.ok(card.includes(`sm:${kose}`), `Card, sm:${kose} literalini taşımalı`);
});

test('kimlik bloğu ve sosyal başlık sm üstünde kart olmaya devam ediyor', () => {
  assert.match(profilBasligi, /<Card mobilYuzey className=/);
  assert.match(sosyalGorunum, /border-b border-gray-200 bg-white p-3 sm:rounded-2xl sm:border/);
});

/* ------------------------------------------------------------- bleed */

test('kenara yaslanma yalnız kimlik bloğu ve fotoğraf ızgarasında', () => {
  assert.match(ogrenciProfili, /<ProfilBasligi\n\s*className="-mx-4 sm:mx-0"/);
  assert.match(ogrenciProfili, /className="order-1 -mx-4 min-w-0 sm:mx-0 lg:order-none"/);

  /*
    Hesap eylemleri KUTU: kenara yaslanmamalı. Yaslansaydı düğmeler
    ekranın kenarına yapışır ve kimlik bloğuyla aynı şeymiş gibi
    okunurdu.
  */
  const hesap = ogrenciProfili.match(/className="order-2 mt-6 [^"]*"/)[0];
  assert.ok(!hesap.includes('-mx-'), 'hesap eylemleri kenara yaslanmamalı');
});

test('iki ekranın mobil iskeleti birebir aynı', () => {
  /*
    Aynı dize iki dosyada: kişi kendi ekranıyla başkasınınki arasında
    geçerken sütunlar kaymasın.
  */
  const iskelet = 'grid grid-cols-1 gap-0 sm:gap-6 lg:grid-cols-12 items-start';
  assert.ok(ogrenciProfili.includes(iskelet));
  assert.ok(sosyalGorunum.includes(iskelet));
});
