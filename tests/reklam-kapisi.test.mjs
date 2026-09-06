import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import {
  REKLAM_ACIK_AILELER,
  editoryalDeger,
  indeksDegeri,
  reklamGosterilebilir,
} from '../src/lib/reklam-kapisi.mjs';

/*
  REKLAM VE İNDEKS KAPILARI REGRESYONU

  İki karar bağımsız: bir sayfada reklam göstermemek, o sayfayı arama
  motorundan silmek için sebep değil. Testler asıl olarak şunu koruyor:
  reklam yalnız kendi yazdığımız içerikte çıksın, ve "reklam yok" kararı
  sessizce "noindex"e dönüşmesin.

  Ölçülen gerçek: 70 rehberin medyanı 396 kelime, en uzunu 894. Bu
  yüzden internette dolaşan "1000 kelime" eşiği bu sitede her şeyi
  elerdi — Google'ın yazmadığı bir eşiği politika diye kodlamıyoruz.
*/

const KOK = path.resolve(import.meta.dirname, '..');

const GUCLU = {
  kelime: 650, sss: 4, kaynak: 2, karsilastirma: true,
  liste: 10, hizliCevap: true, tablo: true,
};

/* ---------------------------- A–F: reklam kapalı yüzeyler */

const KAPALI_YOLLAR = [
  ['/', 'ana sayfa: içerik şirketlerin ilanları'],
  ['/ilan/yazilim-stajyeri-abc123', 'ilan detayı'],
  ['/sirket/aselsan', 'şirket sayfası'],
  ['/firsatlar/bir-burs', 'fırsat detayı'],
  ['/kesfet/bir-etkinlik', 'etkinlik detayı'],
  ['/burslar', 'burs listesi'],
  ['/gizlilik', 'yasal metin'],
  ['/kvkk-aydinlatma-metni', 'yasal metin'],
  ['/cerez-politikasi', 'yasal metin'],
  ['/kullanim-kosullari', 'yasal metin'],
  ['/iletisim', 'iletişim'],
  ['/sirket/ilanlar', 'işveren paneli'],
  ['/basvurularim', 'öğrenci paneli'],
  ['/cv', 'kullanıcının kendi verisi'],
];

for (const [yol, neden] of KAPALI_YOLLAR) {
  test(`reklam kapalı: ${yol} (${neden})`, () => {
    assert.equal(reklamGosterilebilir(yol, true), false);
  });
}

test('A–F: kaynak kodda bu yüzeylerde reklam bileşeni kalmadı', () => {
  const bakilacak = [];
  const gez = (dizin) => {
    for (const ad of readdirSync(dizin)) {
      const tam = path.join(dizin, ad);
      if (statSync(tam).isDirectory()) {
        if (ad === 'node_modules') continue;
        gez(tam);
      } else if (/\.tsx$/.test(ad) && ad !== 'GoogleAdBanner.tsx') {
        bakilacak.push(tam);
      }
    }
  };
  gez(path.join(KOK, 'src'));

  const kullananlar = bakilacak
    .filter((d) => /<GoogleAdBanner/.test(readFileSync(d, 'utf8')))
    .map((d) => path.basename(d));

  assert.deepEqual(
    kullananlar,
    ['GuidePages.tsx'],
    'reklam yalnız rehber sayfasında çizilmeli'
  );
});

/* ------------------------------ G/H: editoryal kapı */

test('G: güçlü editoryal rehberde reklam uygun', () => {
  const k = editoryalDeger(GUCLU);
  assert.equal(k.sinif, 'EDITORIAL_STRONG');
  assert.equal(k.reklamUygun, true);
  assert.equal(reklamGosterilebilir('/rehber/staj-nasil-bulunur', k.reklamUygun), true);
});

test('H: zayıf rehberde reklam yok', () => {
  const k = editoryalDeger({ kelime: 120 });
  assert.equal(k.sinif, 'THIN_OR_INCOMPLETE');
  assert.equal(k.reklamUygun, false);
  assert.equal(reklamGosterilebilir('/rehber/kisa-yazi', k.reklamUygun), false);
});

test('H2: orta seviye rehber indekslenir ama reklamsız', () => {
  /*
    Örnekte önce `guncelleme: true` vardı ve puanın üçte biri oradan
    geliyordu. Tarih artık puan vermiyor — bütün rehberlerde bulunduğu
    için hiçbir şeyi ayırt etmiyordu (bkz. reklam-kapisi.mjs). Örnek,
    hâlâ ayırt eden bir sinyalle kuruldu; testin ölçtüğü şey değişmedi:
    orta seviye bir yazı indekslenir ama reklam almaz.
  */
  const k = editoryalDeger({
    /* Ön koşullar: puan getirmiyor ama yoksa güçlü sayılmıyor. */
    sss: 3,
    hizliCevap: true,
    dayanak: true,
    /* Puan: 400 kelime (+1) ve kontrol listesi (+1) = 2 → ORTA. */
    kelime: 400,
    liste: 6,
  });
  assert.equal(k.puan, 2);
  assert.equal(k.sinif, 'EDITORIAL_MEDIUM');
  assert.equal(k.reklamUygun, false);
});

test('H2c: ön koşulu eksik yazı puanı ne olursa olsun güçlü değil', () => {
  /*
    Hızlı cevabı, SSS'i ya da neye dayandığı olmayan bir yazı, uzun ve
    listeli olsa bile güçlü sayılmıyor. Bu üç şey puan getirmiyor —
    71 rehberin 71'inde var, ayırt etmiyorlar — ama yokluğu eliyor.
  */
  const tam = { kelime: 700, kaynak: 2, liste: 10, karsilastirma: true, tablo: true };
  const gucluOlan = editoryalDeger({ ...tam, sss: 3, hizliCevap: true });
  assert.equal(gucluOlan.sinif, 'EDITORIAL_STRONG');

  for (const eksik of [{ sss: 0 }, { hizliCevap: false }, { kaynak: 0, dayanak: false }]) {
    const k = editoryalDeger({ ...tam, sss: 3, hizliCevap: true, ...eksik });
    assert.equal(k.sinif, 'THIN_OR_INCOMPLETE', JSON.stringify(eksik));
    assert.ok(k.eksikler.length > 0);
  }
});

test('H2b: güncelleme tarihi tek başına puan getirmiyor', () => {
  /*
    Tarih 71 rehberin 71'inde var; puan verseydi eşiği herkes için aşağı
    çeker, reklam kapısı içerik değişmeden 13'ten 30 rehbere açılırdı
    (ölçüldü).
  */
  const tarihsiz = editoryalDeger({ kelime: 400, sss: 3 });
  const tarihli = editoryalDeger({ kelime: 400, sss: 3, guncelleme: true });
  assert.equal(tarihli.puan, tarihsiz.puan);
  assert.doesNotMatch(tarihli.nedenler.join(' '), /gözden geçirme tarihi/);
});

test('H3: kelime sayısı TEK BAŞINA karar değil', () => {
  /* Uzun ama yapısız bir yazı güçlü sayılmıyor. */
  assert.notEqual(editoryalDeger({ kelime: 2000 }).sinif, 'EDITORIAL_STRONG');
  /* Kısa ama zengin bir yazı orta seviyeye çıkabiliyor. */
  const kisaZengin = editoryalDeger({
    kelime: 300, sss: 4, kaynak: 1, karsilastirma: true, hizliCevap: true,
  });
  assert.notEqual(kisaZengin.sinif, 'THIN_OR_INCOMPLETE');
});

test('H4: uygun rehber listesi üretilmiş dosyayla tutarlı', async () => {
  const { rehberleriOlc } = await import('../scripts/rehber-sayimi.mjs');
  const kaynak = readFileSync(path.join(KOK, 'src/data/reklam-uygun-rehberler.ts'), 'utf8');
  const listedeki = [...kaynak.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
  const olculen = rehberleriOlc().filter((r) => r.reklamUygun).map((r) => r.slug).sort();
  assert.deepEqual(listedeki, olculen, 'liste sayımla ayrışmış; `--yaz` ile yenile');
});

/* ------------------------- A: reklam kapalı ≠ noindex */

test('A(index): reklam kapalı olması indeksten çıkarma sebebi değil', () => {
  /* Şirket sayfası: reklam yok ama doğrulanmış kaynak + bağlam var. */
  assert.equal(reklamGosterilebilir('/sirket/aselsan', true), false);
  const k = indeksDegeri({
    baslik: 'Aselsan',
    kaynakAdresi: 'https://www.aselsan.com/en/careers',
    sonKontrol: '2026-08-25',
    aciklama: 'Savunma elektroniği üreticisi; radar ve haberleşme sistemleri geliştiriyor. '
      + 'Başvurular kendi kariyer sayfasından alınıyor.',
    ekBaglam: true,
  });
  assert.equal(k.indeks, true);
  assert.equal(k.neden, 'OK');
});

test('C/E/G(index): kaynağı ya da bağlamı olmayan sayfa indekslenmiyor', () => {
  assert.deepEqual(indeksDegeri({ baslik: 'X' }), { indeks: false, neden: 'MISSING_SOURCE' });
  assert.deepEqual(
    indeksDegeri({ baslik: '', kaynakAdresi: 'https://x' }),
    { indeks: false, neden: 'INCOMPLETE' }
  );
  /* Açıklaması hiç olmayan sayfada özgün metin diye yalnızca başlık kalıyor. */
  assert.deepEqual(
    indeksDegeri({ baslik: 'X', kaynakAdresi: 'https://x' }),
    { indeks: false, neden: 'NO_TEXT' }
  );

  /*
    TARİH + ŞEHİR TEK BAŞINA YETMEZ

    Sinyal sayımı metnin uzunluğuna bakmıyordu ve her etkinliğin tarihi ile
    şehri olduğu için pratikte hiçbir şeyi elemiyordu: ölçüldü, yayındaki
    136 etkinliğin 136'sı indekse giriyordu ama 22'sinin açıklaması boştu.
  */
  assert.deepEqual(
    indeksDegeri({
      baslik: 'X',
      kaynakAdresi: 'https://x',
      sonKontrol: '2026-09-05',
      ekBaglam: true,
      aciklama: '   ',
    }),
    { indeks: false, neden: 'NO_TEXT' }
  );

  /* Kısa ama gerçek bir cümle + tarih + yer: eleme buraya uzanmıyor. */
  assert.deepEqual(
    indeksDegeri({
      baslik: 'X',
      kaynakAdresi: 'https://x',
      sonKontrol: '2026-09-05',
      ekBaglam: true,
      aciklama: 'Kısa ama gerçek bir açıklama.',
    }),
    { indeks: true, neden: 'OK' }
  );
});

test('index kararı reklam gerekçesi taşımıyor', () => {
  const kaynak = readFileSync(path.join(KOK, 'src/lib/reklam-kapisi.mjs'), 'utf8');
  const blok = kaynak.slice(kaynak.indexOf('export function indeksDegeri'));
  for (const yasak of ['reklam', 'ads', 'adsense']) {
    assert.ok(
      !blok.toLowerCase().includes(yasak),
      'indeks kararı reklam gerekçesiyle verilmemeli'
    );
  }
});

/* --------------------------------- J/K: boş yuva ve ads.txt */

test('J: dolmayan reklam yer kaplamıyor', () => {
  const kaynak = readFileSync(path.join(KOK, 'src/components/GoogleAdBanner.tsx'), 'utf8');
  assert.match(kaynak, /data-ad-status/);
  assert.match(kaynak, /height: 0/);
});

test('K: ads.txt tek ve doğru yayıncıyı gösteriyor', () => {
  const adsTxt = readFileSync(path.join(KOK, 'public/ads.txt'), 'utf8');
  const satirlar = adsTxt.split('\n').filter((s) => s.trim() && !s.startsWith('#'));
  assert.equal(satirlar.length, 1, 'birden fazla yayıncı satırı var');
  assert.match(satirlar[0], /^google\.com, pub-2635670487159819, DIRECT, f08c47fec0942fa0$/);

  const ayar = JSON.parse(readFileSync(path.join(KOK, 'reklam.json'), 'utf8'));
  assert.equal(ayar.yayinciKimligi, 'ca-pub-2635670487159819');
});

/* ---------------------------- reklam açık aile tek ve dar */

test('reklam açık yüzey yalnız rehber', () => {
  assert.deepEqual([...REKLAM_ACIK_AILELER], ['/rehber/']);
});

test('H5: liste ve tablo iki yazımda da sayılıyor', async () => {
  /*
    Sayım yalnız JSX'e bakıyordu (`<li>`, `<Karsilastirma`, `<Tablo`).
    Rehberlerin altmışı `metinRehberi` ile yazılıyor ve orada bunlar
    birer VERİ anahtarı. Sonuç: en yüksek puanlı on altı MEDIUM rehberin
    HEPSİ "liste yok, karşılaştırma yok" görünüyordu — oysa çoğunda
    ikisi de vardı.
  */
  const { listeMaddesi } = await import('../scripts/rehber-sayimi.mjs');

  /*
    JSX tarafı değişmedi. Sarmalayıcı `<L>` de sayılıyor — eski
    davranış; burada karışmasın diye örnekte yalnız maddeler var.
  */
  const jsx = '<li>bir</li><li>iki</li>';
  assert.equal(listeMaddesi(jsx), 2);

  const veri = [
    '  liste: [',
    "    'bir',",
    "    'iki',",
    "    'üç',",
    '  ],',
  ].join('\n');
  assert.equal(listeMaddesi(veri), 3);

  const kontrol = [
    '  kontrol: {',
    "    baslik: 'Tek e-postada sor',",
    '    maddeler: [',
    "      'unvan',",
    "      'adres',",
    '    ],',
    '  },',
  ].join('\n');
  assert.equal(listeMaddesi(kontrol), 2);

  /* İkisi bir aradaysa toplanıyor. */
  assert.equal(listeMaddesi(jsx + '\n' + veri), 5);
});
