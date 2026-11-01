import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ilanlariDondur, DONUS_TOHUMU } from '../src/lib/ilan-donusu.mjs';

/*
  İLAN SIRASI HER YENİLEMEDE KAYIYOR

  ÖLÇÜLEN SORUN (kullanıcı, 23 Eylül 2026): "3 gündür siteye giriyorum,
  hep aynı ilan en üstte." Varsayılan sıralama `match`; eşleşme puanı
  profilden hesaplanıyor ve profili olmayan ziyaretçide puanlar
  birbirine çok yakın çıkıyor, sıra pratikte sabitleniyordu. 188 ilanın
  hep aynı ilk beşi görünüyordu.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const GORUNUM = fs.readFileSync(
  path.join(KOK, 'src', 'components', 'MatchedInternshipsView.tsx'),
  'utf8',
);

test('donus hicbir ilani kaybetmiyor, cogaltmiyor', () => {
  /*
    Rastgele karıştırma yerine döngüsel kaydırma seçilmesinin sebebi bu:
    "daha fazla göster"e basınca aynı ilan ikinci kez çıkmamalı, bir
    başkası da hiç çıkmamalı.
  */
  const dizi = Array.from({ length: 188 }, (_, i) => i);
  for (const tohum of [0, 0.01, 0.33, 0.5, 0.99]) {
    const sonuc = ilanlariDondur(dizi, tohum);
    assert.equal(sonuc.length, dizi.length);
    assert.deepEqual([...sonuc].sort((a, b) => a - b), dizi);
  }
});

test('goreli sira korunuyor', () => {
  /* Kaydırma sıralamayı yok etmiyor, yalnız başlangıç noktasını değiştiriyor. */
  const dizi = [1, 2, 3, 4, 5];
  assert.deepEqual(ilanlariDondur(dizi, 0.4), [3, 4, 5, 1, 2]);
  assert.deepEqual(ilanlariDondur(dizi, 0.9), [5, 1, 2, 3, 4]);
});

test('tek ilan ve bos liste bozulmuyor', () => {
  assert.deepEqual(ilanlariDondur([], 0.7), []);
  assert.deepEqual(ilanlariDondur(['tek'], 0.7), ['tek']);
});

test('tohum sayfa yuklenirken bir kez uretiliyor', () => {
  /*
    Modül seviyesinde: bileşen yeniden çizildiğinde (süzgeç değişimi,
    "daha fazla göster") tohum aynı kalmalı, yoksa sıra ekranda zıplar.
  */
  const kaynak = fs.readFileSync(path.join(KOK, 'src', 'lib', 'ilan-donusu.mjs'), 'utf8');
  assert.match(kaynak, /export const DONUS_TOHUMU = Math\.random\(\);/);
  assert.ok(DONUS_TOHUMU >= 0 && DONUS_TOHUMU < 1);
});

/*
  1 KASIM 2026: VARSAYILAN "EN YENİ", GÖRÜNÜM DÖNDÜRMÜYOR

  Kullanıcı listenin üstüne sıralama seçicisi istedi ve varsayılanı "En
  yeni" koydu. Döndürme yalnız eski varsayılan `match` içindi; en yeni
  sırası her gün gelen ilanlarla kendiliğinden değişiyor ve ön render ile
  aynı. Kütüphane (yukarıdaki saf testler) yerinde duruyor.
*/
test('gorunum dondurmuyor; varsayilan siralama en yeni', () => {
  assert.doesNotMatch(GORUNUM, /ilanlariDondur/);
  assert.match(GORUNUM, /useState<SiralamaDegeri>\(VARSAYILAN_SIRALAMA\)/);
});

test('bolum agirligi yalniz varsayilan siralamada', () => {
  /* Seçilmiş "A–Z" ya da son başvuru sırasını bölüm ağırlığı bozmamalı. */
  assert.match(GORUNUM, /return sortBy === VARSAYILAN_SIRALAMA\s*\?\s*bolumeGoreSirala\(\s*sirali,\s*bolumAlani/);
});
