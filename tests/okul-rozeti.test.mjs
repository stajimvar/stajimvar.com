import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { rozetYazisi, paletSirasi, PALET } from '../src/lib/okul-rozeti.mjs';

/*
  OKUL ROZETI

  Okulunu girmis ogrencinin profilinde, okul adinin yaninda duran kucuk
  bir rozet. Testler iki seyi koruyor: hakki belirsiz gorsel basilmamasi
  ve rozetin okul adinin YERINE gecmemesi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

const BILESEN = oku('src/components/OkulRozeti.tsx');
const BASLIK = oku('src/components/ProfilBasligi.tsx');

test('uzun okul adi kisaltiliyor', () => {
  assert.equal(rozetYazisi('Mimar Sinan Güzel Sanatlar Üniversitesi'), 'MSGSÜ');
  assert.equal(rozetYazisi('İstanbul Beykent Üniversitesi'), 'İBÜ');
});

test('bos okulda rozet yazisi yok', () => {
  assert.equal(rozetYazisi(''), '');
  assert.equal(rozetYazisi(null), '');
  assert.equal(rozetYazisi(undefined), '');
});

test('rozet yazisi dar kutuya sigacak kadar kisa', () => {
  for (const okul of [
    'Anadolu Üniversitesi',
    'Haliç Üniversitesi',
    'İstanbul Üniversitesi',
    'Üsküdar Üniversitesi',
    'Orta Doğu Teknik Üniversitesi',
    'İstanbul Teknik Üniversitesi',
  ]) {
    const y = rozetYazisi(okul);
    assert.ok(y.length > 0, okul + ' icin yazi uretilmeli');
    assert.ok(y.length <= 5, okul + ' -> "' + y + '" cok uzun, kutuyu tasirir');
  }
});

test('ayni okul her zaman ayni rengi aliyor', () => {
  /* Rastgele olsaydi ayni ogrenci her yenilemede baska renk gorurdu. */
  const a = paletSirasi('Anadolu Üniversitesi');
  const b = paletSirasi('Anadolu Üniversitesi');
  assert.equal(a, b);
  assert.ok(a >= 0 && a < PALET.length);
});

test('logo adresi disaridan geliyor', () => {
  /*
    22 Eylul 2026: rozet artik okulun amblemini ciziyor. Dosyalar depoda
    (`public/universite-logolari`) ve adresi `lib/universite-logosu.mjs`
    veriyor; bilesen DIS BIR ADRES GOMMUYOR. Boylece logo listesi tek
    yerden yonetiliyor ve profil sayfasi ucuncu bir sunucuya istek
    atmiyor.
  */
  assert.ok(!/https?:\/\//.test(BILESEN), 'bilesende gomulu dis adres olmamali');
  assert.ok(BILESEN.includes('logoAdresi'), 'logo alani hazir olmali');
  assert.ok(BILESEN.includes('setDustu'), 'logo yuklenemezse monograma dusmeli');
});

test('rozet okul adinin YERINE gecmiyor', () => {
  /*
    Rozet kisaltma tasiyor ("MSGSÜ") ve tek basina hangi okul oldugunu
    soylemiyor. Ad metin olarak yaninda kalmali.
  */
  assert.ok(BASLIK.includes('<OkulRozeti okul={okul} logoAdresi='));
  assert.ok(
    BASLIK.includes("{okul || 'Okulun eksik'}"),
    'okul adi metin olarak kalmali',
  );
});

test('okul girilmemisse rozet cizilmiyor', () => {
  /* Olmayan bir kimligi cizmek, satirin kendisini yalan yapardi. */
  assert.match(BASLIK, /\{okul && \([\s\S]{0,200}<OkulRozeti/);
  assert.ok(BILESEN.includes('if (!okul || !yazi) return null;'));
});

test('rozet ekran okuyucuya tekrar okunmuyor', () => {
  /* Ad zaten metin olarak yaziyor; kisaltmayi ikinci kez okutmak tekrar olurdu. */
  assert.ok(BILESEN.includes('aria-hidden'));
});

test('kazanilan rozetlerle karistirilmiyor', () => {
  /*
    Profilde ayrica earnedBadges var -- onlar KAZANILAN seyler. Bu ise bir
    kimlik isareti. Ayri bilesen, ayri bicim.
  */
  assert.ok(!BILESEN.includes('earnedBadges'));
  /*
    Bicim 22 Eylul 2026'da yuvarlaga dondu: rozet artik profil
    fotografinin kosesinde duruyor ve fotograf yuvarlak. Kare bir etiket
    orada yamali kaliyordu.
  */
  assert.ok(BILESEN.includes('rounded-full'), 'fotografin kosesinde yuvarlak duruyor');
});

test('uzun kisaltma kutuya sigiyor', () => {
  /*
    OLCULDU (Chromium, 390 ve 1000 piksel): sabit 28x28 kutuda "MSGSÜ"
    tasiyor, harfler yanindaki okul adina giriyordu. Kutu artik en az kare
    ama gerekirse genisliyor; iki harfli kisaltma hala kare duruyor.
  */
  assert.ok(BILESEN.includes('min-w-7'), 'kucuk rozet en az kare olmali');
  assert.ok(BILESEN.includes('px-1.5'), 'uzun kisaltma icin yatay dolgu olmali');
  assert.ok(!/h-7 w-7 text-/.test(BILESEN), 'monogram kutusu sabit genislikte kalmamali');
});

test('logo fotografin kosesinde, yuvarlak ve beyaz halkali', () => {
  /*
    22 Eylul 2026: rozet once okul adinin soluna konmustu. Hangi olcu
    denendiyse yamali durdu -- satir telefonda 14 piksel, amblemlerin
    orani birbirini tutmuyor (MSGSU'nun baykusu genis ve yassi, muhurler
    kare) ve ortalanmis satirin basindaki kutu adi ortadan kaydiriyordu.

    Rozet profil fotografinin sag alt kosesine tasindi. Beyaz halka onu
    altindaki tamamlanma halkasindan ayiriyor: halkanin yesili amblemin
    kenarina karismiyor.
  */
  assert.ok(
    BILESEN.includes('h-6 w-6 p-0.5 sm:h-7 sm:w-7'),
    'logo kutusu ekran olcusune gore buyumeli',
  );
  assert.ok(BILESEN.includes('ring-2 ring-white'), 'beyaz halka olmali');
  assert.ok(
    BILESEN.includes('border border-gray-200 bg-white object-contain'),
    'logo cercevesi sirket logolariyla ayni dilde olmali',
  );
  /* Fotografin kosesi: kapsayici `relative`, rozet `absolute`. */
  assert.match(BASLIK, /<div className="relative">[\s\S]{0,1500}<\/Halka>/);
  assert.match(BASLIK, /<span className="absolute bottom-0 right-0 sm:/);
  /* Satirda rozet kalmadi: okul adi tek basina. */
  assert.ok(BASLIK.includes(`<p className="min-w-0 break-words">{okul || 'Okulun eksik'}</p>`));
});
