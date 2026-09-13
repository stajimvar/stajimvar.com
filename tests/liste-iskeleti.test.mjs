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

test('Rehber başlık satırı ortak tipografide', () => {
  const baslik = /text-xs font-bold uppercase tracking-widest text-gray-600/;
  for (const ad of ['rehber']) {
    const kaynak = SAYFALAR.find(([x]) => x === ad)[1];
    assert.match(kaynak, baslik, `${ad}: liste başlığı ortak tipografide değil`);
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
    /*
      `sr-only` düğümleri `position: absolute`; sarmalayıcı
      konumlandırılmazsa kapsayıcı blok en dışa düşüyor, `overflow-x-auto`
      onları kırpamıyor ve belge 375 yerine 684 piksele genişliyor
      (Keşfet'te ölçüldü).
    */
    assert.match(kaynak, /relative overflow-x-auto/, `${dosya}: yatay taşma koruması yok`);
  }
});

test('Rehber konu şeridi ve filtre menüsü aynı durumu paylaşıyor', () => {
  const rehber = SAYFALAR.find(([x]) => x === 'rehber')[1];
  /* İkisi de `sekmeSec` çağırıyor: ayrı durum tutulsaydı ayrışırlardı. */
  assert.match(rehber, /onSec=\{\(id\) => sekmeSec\(id as Sekme\)\}/);
  assert.match(rehber, /onChange=\{\(e\) => sekmeSec\(/);
});
