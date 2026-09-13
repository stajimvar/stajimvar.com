import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  ÜÇ LİSTE, TEK İSKELET (Keşfet 11 Eylül 2026'da kapandı; ikisi kaldı)

  İlanlar, Keşfet ve Rehber aynı işi yapıyor: süz, gez, aç. Üçü ayrı ayrı
  yazıldığı için düzenleri ayrışmıştı — biri 3/9, biri 3/6/3, biri tek
  sütun. Kullanıcı sayfa değiştirince yeniden yön arıyordu.

  Bu testler iskeletin tekrar ayrışmasını engelliyor. Kartların ve
  içeriğin AYNI olmasını istemiyoruz; istediğimiz şey sayfanın kabı.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const SAYFALAR = [
  /* Keşfet 11 Eylül 2026'da kapandı; listeden çıktı, iddialar kalan ikiye uygulanıyor. */
  ['ilanlar', oku('src/components/MatchedInternshipsView.tsx')],
  ['rehber', oku('src/components/RehberMerkezi.tsx')],
];

test('iki liste de 3/6/3 ızgara kullanıyor', () => {
  for (const [ad, kaynak] of SAYFALAR) {
    assert.match(kaynak, /lg:grid-cols-12/, `${ad}: 12 sütunlu ızgara yok`);
    assert.match(kaynak, /lg:col-span-3/, `${ad}: yan sütun yok`);
    assert.match(kaynak, /lg:col-span-6/, `${ad}: orta sütun 6 birim değil`);
  }
});

test('iki listede de sağ sütun gizli ve yapışkan', () => {
  for (const [ad, kaynak] of SAYFALAR) {
    assert.match(
      kaynak,
      /hidden[^"'`]*lg:col-span-3[^"'`]*lg:block|hidden lg:block lg:col-span-3/,
      `${ad}: sağ sütun telefonda gizlenmiyor`
    );
    assert.match(kaynak, /lg:sticky lg:top-4/, `${ad}: yan sütun yapışkan değil`);
  }
});

test('üç liste telefonda aynı yükseklikte başlıyor', () => {
  /*
    Başlıklar `sr-only` olunca üstteki boşluk boşa çıktı. İlanlar
    `anaAlanSinifi` ile `pt-0`a inmişti; Rehber ve Fırsatlar `pt-2`de
    kalmıştı ve listeleri 8 piksel aşağıda başlıyordu (ölçüldü: 68,8'e
    karşı 60,8). O 8 piksel üst çubukla liste arasında bant olarak
    okunuyordu.

    Üç sayfa üç ayrı yerde yazıyor — biri App'in sabiti, biri kendi
    `main`'i, biri kabuğun `ustBosluk` değeri — bu yüzden hizayı ancak
    ortak bir iddia koruyabiliyor.
  */
  const kaynaklar = [
    ['ilanlar', oku('src/App.tsx').match(/const anaAlanSinifi = `([^`]+)`/)[1]],
    ['firsatlar', oku('src/components/OpportunitiesPage.tsx').match(/xl:px-10 (pt-\S+ sm:pt-\S+)/)[1]],
    ['rehber', oku('src/components/RehberMerkezi.tsx').match(/ustBosluk="([^"]+)"/)[1]],
  ];
  for (const [ad, sinif] of kaynaklar) {
    assert.ok(sinif.includes('pt-0'), `${ad}: telefonda üst boşluk sıfır değil (${sinif})`);
    assert.ok(sinif.includes('sm:pt-3'), `${ad}: geniş ekranda üst boşluk değişmiş (${sinif})`);
  }
});

test('ayırıcı çizgi kalktı: kontroller üst çubuğa taşındı', () => {
  /*
    `h-0.5` ayırıcı "kontroller bitti, liste başlıyor" demek için
    konmuştu. O kontroller — arama kutusu ve süzgeç düğmesi — telefonda
    üst çubuğa taşındı (bkz. lib/sayfa-aramasi); ayıracak bir şey
    kalmadı ve çizgi, üst çubuğun hemen altında duran ince bir şerit
    olarak görünüyordu.

    İddia tersine çevrildi: çizginin GERİ GELMEDİĞİNİ sınıyor. Geri
    gelirse aynı şerit yeniden çıkar.
  */
  const ayirici = /h-0\.5 rounded-2xl border border-gray-200 bg-white shadow-xs lg:hidden/;
  for (const [ad, kaynak] of SAYFALAR) {
    assert.doesNotMatch(kaynak, ayirici, `${ad}: ayırıcı çizgi geri gelmiş`);
  }
});

test('liste başlığı üç sayfada da ortak belirteçten geliyor', () => {
  /*
    Tipografi üç dosyada elle yazılmıştı ve ayrışmıştı (biri `gap-3`
    taşıyor, öteki taşımıyordu). Artık `ui/tokens` içinde tek tanım;
    üst boşluk da orada, çünkü kaynağı orası: İlanlar'daki 16 piksel
    sol sütunda içi boşalmış bir sarmalayıcının `mt-4` artığıydı,
    Rehber'de o artık olmadığı için başlık üst çubuğa yapışıyordu.
  */
  const tokens = oku('src/ui/tokens.ts');
  assert.match(tokens, /LISTE_BASLIGI = 'flex items-center justify-between gap-3 px-1 pt-4 sm:pt-0'/);
  assert.match(tokens, /LISTE_BASLIGI_YAZISI = 'text-xs font-bold uppercase tracking-widest text-gray-600'/);
  assert.match(tokens, /LISTE_BASLIGI_NOTU = 'hidden text-xs font-medium text-gray-500 sm:block'/);

  for (const dosya of [
    'src/components/MatchedInternshipsView.tsx',
    'src/components/OpportunitiesPage.tsx',
    'src/components/RehberMerkezi.tsx',
  ]) {
    const kaynak = oku(dosya);
    assert.match(kaynak, /className=\{LISTE_BASLIGI\}/, `${dosya}: başlık satırı ortak değil`);
    assert.match(kaynak, /className=\{LISTE_BASLIGI_YAZISI\}/, `${dosya}: başlık yazısı ortak değil`);
    assert.match(kaynak, /className=\{LISTE_BASLIGI_NOTU\}/, `${dosya}: ikincil satır ortak değil`);
  }

  /* İlanlar'daki artık sarmalayıcı geri gelmesin: boşluk başlığın kendi işi. */
  assert.doesNotMatch(
    oku('src/components/MatchedInternshipsView.tsx'),
    /<div className="mt-4 flex flex-col sm:flex-row lg:flex-col gap-2">/,
    'içi boşalmış sarmalayıcı geri gelmiş',
  );
});

test('liste bloğu sütunun ritminden ayrı: ilk kart da sonrakiler gibi', () => {
  /*
    Kartlar sütunun `space-y-4` ritmindeydi ve ilk karta 16 piksel üst
    boşluk düşüyordu; sonraki kartların arasında ise boşluk değil 1
    pikselik çizgi var. Ölçüldü (375 px): şerit alt çizgisinden ilk
    kartın kurum satırına 43 piksel, sonrakilerde 27.

    Boşluk `space-y` ile MARGIN olarak veriliyordu, yani listeye
    `padding-top: 0` demek onu götürmüyor. Ritim bölündü: başlık ve
    şeritler kendi kabında, liste onun dışında.
  */
  assert.match(oku('src/ui/tokens.ts'), /LISTE_BLOGU = 'pt-0 sm:pt-4'/);
  for (const dosya of [
    'src/components/MatchedInternshipsView.tsx',
    'src/components/OpportunitiesPage.tsx',
  ]) {
    const kaynak = oku(dosya);
    assert.match(kaynak, /<div className="min-w-0 lg:col-span-6">/, `${dosya}: sütun hâlâ space-y taşıyor`);
    assert.match(kaynak, /<div className=\{LISTE_BLOGU\}>/, `${dosya}: liste bloğu ayrı değil`);
  }
});

test('şeritler aynı ölçüde ve yatay taşmaya karşı korumalı', () => {
  /*
    Yalnız KENDİ çizdiği daireyi taşıyan şeritler denetleniyor. Şirket ve
    burs şeritleri ortak bir daire bileşenine (KesifSeridi) taşındı; onlar
    ölçüyü oradan alıyor, burada ikinci kez aranmıyor.
  */
  for (const dosya of ['src/components/SehirSeridi.tsx', 'src/components/KonuSeridi.tsx']) {
    const kaynak = oku(dosya);
    assert.match(kaynak, /w-\[76px\]/, `${dosya}: daire genişliği ortak değil`);
    assert.match(kaynak, /h-14 w-14/, `${dosya}: daire ölçüsü ortak değil`);
  }

  /*
    `sr-only` düğümleri `position: absolute`; sarmalayıcı
    konumlandırılmazsa kapsayıcı blok en dışa düşüyor, `overflow-x-auto`
    onları kırpamıyor ve belge 375 yerine 684 piksele genişliyor
    (Keşfet'te ölçüldü).

    KonuSeridi bu sarmalayıcıyı artık ortak belirteçten alıyor
    (`SERIT.ic`); şerit kabuğu telefonda kaldırılırken iki şerit tek
    tanımda toplandı. SehirSeridi kendi kabını yazmaya devam ediyor.
  */
  assert.match(oku('src/components/SehirSeridi.tsx'), /relative overflow-x-auto/);
  assert.match(oku('src/components/KonuSeridi.tsx'), /className=\{SERIT\.ic\}/);
  assert.match(oku('src/ui/tokens.ts'), /ic: 'relative overflow-x-auto/);
});

test('iki şerit de telefonda kabuksuz ve ekranın iki kenarına yaslı', () => {
  /*
    Şerit yuvarlatılmış, çerçeveli beyaz bir kutunun içindeydi ve o kutu
    sayfanın 16 pikselik yan boşluğunun da içinde duruyordu: 375
    piksellik ekranda dairelere 319 piksel kalıyor, beşinci daire hep
    yarım görünüyordu.

    Kabuk tek yerde tanımlı; iki şerit de oradan okuyor. Halkalar,
    seçim durumu ve yatay kaydırma değişmedi.
  */
  const tokens = oku('src/ui/tokens.ts');
  assert.match(tokens, /kabuk: `border-b border-gray-200 bg-white py-2 sm:rounded-2xl sm:border sm:py-3 \$\{YUZEY\.kap\}`/);
  for (const dosya of ['src/components/KesifSeridi.tsx', 'src/components/KonuSeridi.tsx']) {
    const kaynak = oku(dosya);
    assert.match(kaynak, /className=\{SERIT\.kabuk\}/, `${dosya}: ortak kabuk kullanılmıyor`);
    assert.doesNotMatch(kaynak, /rounded-2xl border border-gray-200 bg-white py-3/, `${dosya}: eski kabuk duruyor`);
  }
});

test('Rehber konu şeridi ve filtre menüsü aynı durumu paylaşıyor', () => {
  const rehber = SAYFALAR.find(([x]) => x === 'rehber')[1];
  /* İkisi de `sekmeSec` çağırıyor: ayrı durum tutulsaydı ayrışırlardı. */
  assert.match(rehber, /onSec=\{\(id\) => sekmeSec\(id as Sekme\)\}/);
  assert.match(rehber, /onChange=\{\(e\) => sekmeSec\(/);
});
