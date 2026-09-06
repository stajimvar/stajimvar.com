import test from 'node:test';
import assert from 'node:assert/strict';
import { seritSehirleri, seritToplami } from '../src/lib/sehir-seridi.mjs';

/* Ölçülen üretim yanıtı: get_discover_catalog → facets.cityCounts. */
const OLCULEN = {
  'İstanbul': 71, 'İzmir': 17, 'Bursa': 12, 'Konya': 5,
  'Ankara': 1, 'Eskişehir': 1, 'Şanlıurfa': 1,
};

test('şerit etkinlik sayısına göre azalan sıralanıyor', () => {
  assert.deepEqual(
    seritSehirleri(OLCULEN).map((sehir) => sehir.ad),
    ['İstanbul', 'İzmir', 'Bursa', 'Konya', 'Ankara', 'Eskişehir', 'Şanlıurfa'],
  );
  /* Nesne anahtar sırası değişse de çıktı değişmiyor: sıra sayıdan geliyor. */
  const tersinden = Object.fromEntries(Object.entries(OLCULEN).reverse());
  assert.deepEqual(seritSehirleri(tersinden), seritSehirleri(OLCULEN));
});

test('eşit sayıda şehirler Türkçe alfabetik sıralanıyor', () => {
  /*
    'Şanlıurfa' ve 'Eskişehir' üretimde de birer etkinlikle eşit; sıra o
    zaman ada kalıyor.

    'Sivas' ile 'Şanlıurfa' çifti karşılaştırıcının Türkçe olduğunu
    kanıtlıyor: Türkçede 'Ş' ayrı bir harf ve 'S'den SONRA gelir, yani
    Sivas önde. İngilizce sıralamada 'Ş' aksanlı bir 's' sayılıyor, ikinci
    harfe bakılıyor ('a' < 'i') ve Şanlıurfa öne geçiyor. Test bu yüzden
    'tr' argümanı düşerse — makinenin yerel ayarı Türkçe değilse — kırılır.
  */
  const sehirler = seritSehirleri({ 'Şanlıurfa': 1, 'Sivas': 1, 'Zonguldak': 1, 'Çorum': 1, 'Eskişehir': 1, 'İzmir': 1 });
  assert.deepEqual(
    sehirler.map((sehir) => sehir.ad),
    ['Çorum', 'Eskişehir', 'İzmir', 'Sivas', 'Şanlıurfa', 'Zonguldak'],
  );
  /* Sayı her zaman ada baskın: tek etkinlikli 'Adana' çok etkinlikli 'Van'ın önüne geçemiyor. */
  assert.deepEqual(
    seritSehirleri({ 'Adana': 1, 'Van': 9 }).map((sehir) => sehir.ad),
    ['Van', 'Adana'],
  );
});

test('sayısı sıfır olan şehir şeride girmiyor', () => {
  /*
    İçi "0" yazan daire tıklanınca boş liste getirirdi: kullanıcıyı çıkmaz
    sokağa yollayan bir düğme. Sayı olmayan değer de çizilmiyor — dairenin
    içindeki rakam uydurulamaz.
  */
  const sehirler = seritSehirleri({ 'Bursa': 12, 'Rize': 0, 'Sivas': -3, 'Muş': null, 'Kars': '4', 'Van': NaN, '': 7 });
  assert.deepEqual(sehirler, [{ ad: 'Bursa', adet: 12 }]);
});

test('"Tümü" değeri şehir sayılarının toplamı', () => {
  /*
    Katalogdaki `total` KULLANILMIYOR: bir şehir seçiliyken o alan seçili
    şehrin sayısına düşüyor ve "Tümü" şeridin geri kalanıyla tutmazdı.
    Toplam şeridin kendi sayılarından geliyor, dolayısıyla her zaman
    dairelerin toplamına eşit.
  */
  const sehirler = seritSehirleri(OLCULEN);
  assert.equal(seritToplami(sehirler), 108);
  assert.equal(seritToplami(sehirler), Object.values(OLCULEN).reduce((a, b) => a + b, 0));
  /* Çizilmeyen şehir toplama da girmiyor: iki sayı birbirini tutuyor. */
  assert.equal(seritToplami(seritSehirleri({ ...OLCULEN, 'Rize': 0 })), 108);
});

test('cityCounts boş ya da eksik geldiğinde şerit boş, hata yok', () => {
  /*
    Şerit boş listede null dönüyor (SirketSeridi kalıbı). Eski önbellekten
    ya da alanı taşımayan bir yanıttan `undefined` gelmesi hata değil.
  */
  for (const bozuk of [undefined, null, {}, 'İstanbul', 42, [], { 'Rize': 0 }]) {
    assert.deepEqual(seritSehirleri(bozuk), [], `girdi: ${JSON.stringify(bozuk)}`);
  }
  assert.equal(seritToplami(seritSehirleri(undefined)), 0);
});
