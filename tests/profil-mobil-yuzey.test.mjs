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
    Dört ekran: `/cv`, ziyaretçi profili, `/agim` akışı ve şirketin kendi
    profili (`/sirket/profil`, 18 Eylül 2026). Dördü de aynı yüzey
    mantığında — telefonda beyaz, geniş ekranda gri — ve aynı dizeyi
    paylaşıyorlar ki biri değişince ötekiler geride kalmasın.
  */
  assert.equal(
    [...app.matchAll(zemin)].length,
    4,
    '/cv, ziyaretçi profili, akış ve şirket profili aynı zemin dizesini paylaşmalı',
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
  /*
    20 Eylül 2026: öğrenci profili şirket profiliyle aynı kalıba geçti
    (kullanıcı isteği). Yüzey kuralı DEĞİŞMEDİ — telefonda tek alt
    çizgi, `sm:` üstünde kart — ama yan ve dikey boşluk artık `header`ın
    kendisinde değil, içindeki iki bloğun (`kimlik bandı` ve `sayaçlar +
    eylemler`) kendi `px-4`ünde. Şirket profilindeki kap sınıfı da
    birebir böyle; iddia o yüzden `px-4 py-5` aramıyor.
  */
  assert.match(sosyalGorunum, /<header className="border-b border-gray-200 bg-white sm:rounded-2xl sm:border">/);
  /*
    Boşluk kayboldu sanılmasın: kimlik bloğu telefonda px-4 taşıyor.
    24 Eylül 2026 (X kalıbı): iki iç blok (kimlik + sayaç/eylem) teke
    indi — sayaçlar ve haplar kimliğin içinde. Kabın dizesi ortak
    `KIMLIK_BANDI` sabitinde; üst dolgu yok çünkü avatar kapağa biniyor.
  */
  assert.match(sosyalGorunum, /<div className=\{KIMLIK_BANDI\}>/);
  assert.match(
    oku('src/components/sosyal/ProfilKimlikKalibi.tsx'),
    /export const KIMLIK_BANDI = 'px-4 pb-4 sm:px-6 sm:pb-5';/,
  );
});

/* ------------------------------------------------------------- bleed */

test('kenara yaslanma yalnız kimlik bloğu ve fotoğraf ızgarasında', () => {
  assert.match(ogrenciProfili, /<ProfilBasligi\n\s*className="-mx-4 sm:mx-0"/);
  assert.match(ogrenciProfili, /className="order-1 -mx-4 min-w-0 sm:mx-0 lg:order-none"/);

  /*
    Hesap eylemleri artık kimlik kartının alt satırında (kullanıcı isteği,
    17 Eylül 2026); sayfanın altında ayrı bir kutu yok.
  */
  assert.doesNotMatch(ogrenciProfili, /className="order-2 mt-6 /);
  assert.match(ogrenciProfili, /onCikis=\{onLogout\}/);
});

test('iki ekran aynı düzende: üstte yatay kart, altında galeri', () => {
  /*
    17 Eylül 2026: iki sütunlu iskelet iki ekrandan da kalktı. Sahibin
    /cv ana görünümü tek sütun (sütunlar lg:col-span-12), ziyaretçi
    görünümü de kart + "Paylaşımlar" + aynı galeri ızgarası.
  */
  assert.ok(ogrenciProfili.includes("'contents lg:block lg:col-span-12'"));
  assert.match(sosyalGorunum, /<div className="space-y-0 sm:space-y-6">/);
  assert.match(sosyalGorunum, /gorunum="galeri"/);
});
