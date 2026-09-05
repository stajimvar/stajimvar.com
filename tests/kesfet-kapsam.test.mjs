import test from 'node:test';
import assert from 'node:assert/strict';
import {
  kariyerEtkinligiMi,
  kariyerOnce,
  kariyerSayisi,
  KARIYER_KATEGORILERI,
} from '../src/lib/kesfet-kapsam.mjs';

/*
  KEŞFET'İN KAPSAM SINIRI

  Keşfet bir etkinlik toplayıcısına dönüşmüştü. Ölçüldü: yayındaki 136
  etkinliğin dağılımı konser 51, festival 42, sergi 21, tiyatro 18,
  atölye 3, müze 1; kariyerle ilgili tek kayıt TEKNOFEST'ti.

  Bu testler ayrımın hangi sinyallere dayandığını sabitliyor. Sinyaller
  gevşerse Keşfet yeniden kültür akışına döner; sertleşirse gerçek
  kariyer etkinlikleri kaybolur.
*/

test('kariyer kategorileri doğrudan kabul ediliyor', () => {
  for (const k of KARIYER_KATEGORILERI) {
    assert.equal(
      kariyerEtkinligiMi({ category: k, title: 'Herhangi bir başlık' }),
      true,
      `${k} kariyer sayılmalı`
    );
  }
});

/*
  BAŞLIK YEDEK SİNYAL

  TEKNOFEST veritabanında "festival" kategorisinde duruyor çünkü onu bir
  kültür kaynağı göndermiş. Kategori tek başına yetseydi bu kayıt
  kaybolurdu.
*/
test('kültür kategorisindeki kariyer etkinliği başlıktan yakalanıyor', () => {
  assert.equal(kariyerEtkinligiMi({ category: 'festival', title: 'TEKNOFEST 2026 Şanlıurfa' }), true);
  assert.equal(kariyerEtkinligiMi({ category: 'concert', title: 'Yapay Zekâ Zirvesi' }), true);
  assert.equal(kariyerEtkinligiMi({ category: 'festival', title: 'Kariyer Günleri 2026' }), true);
});

/*
  KÜLTÜR ETKİNLİĞİ KARİYER SAYILMAMALI

  Bu yön daha önemli: yanlış pozitif, ayrımı anlamsızlaştırır ve Keşfet
  yeniden karışık bir akışa döner.
*/
test('kültür ve çocuk etkinlikleri kariyer sayılmıyor', () => {
  const kultur = [
    { category: 'concert', title: 'Caz Festivali' },
    { category: 'workshop', title: 'NATİ YOGA İLE YOGAYA DAVET' },
    { category: 'workshop', title: 'Minik Kaşifler Müzede' },
    { category: 'workshop', title: 'Kitap Ayracımı Boyuyorum' },
    { category: 'theatre', title: 'Bir Delinin Hatıra Defteri' },
    { category: 'museum', title: '30 Ağustos Ücretsiz Müze Günü' },
    { category: 'exhibition', title: 'Modern Sanat Sergisi' },
  ];
  for (const e of kultur) {
    assert.equal(kariyerEtkinligiMi(e), false, `${e.title} kariyer sayılmamalı`);
  }
});

test('Türkçe büyük harf eşleşmeyi bozmuyor', () => {
  /* JS'te /i bayrağı U+0130'yı düz i'ye katlamıyor; bu daha önce bir
     eşleşmeyi sessizce kaçırmıştı (bkz. bolum-eslestirme.mjs). */
  assert.equal(kariyerEtkinligiMi({ category: 'festival', title: 'İTÜ KARİYER GÜNLERİ' }), true);
});

test('bozuk girdi çökmüyor', () => {
  assert.equal(kariyerEtkinligiMi(null), false);
  assert.equal(kariyerEtkinligiMi({}), false);
  assert.equal(kariyerEtkinligiMi({ category: null, title: null }), false);
  assert.deepEqual(kariyerOnce(null), []);
  assert.equal(kariyerSayisi(undefined), 0);
});

/*
  SIRALAR, ELEMEZ

  Bugün kariyer etkinliği sayısı bir elin parmaklarını geçmiyor; eleme
  yapan bir yüzey boş sayfa gösterirdi. Sıralama, kaynaklar birikene
  kadar doğru davranış.
*/
test('kariyer etkinlikleri öne alınıyor, hiçbiri elenmiyor', () => {
  const liste = [
    { id: 1, category: 'concert', title: 'Caz Gecesi' },
    { id: 2, category: 'festival', title: 'TEKNOFEST 2026' },
    { id: 3, category: 'theatre', title: 'Oyun' },
    { id: 4, category: 'hackathon', title: 'Bir Hackathon' },
  ];
  const sirali = kariyerOnce(liste);
  assert.equal(sirali.length, liste.length, 'eleme yapılmamalı');
  assert.deepEqual(sirali.map((x) => x.id), [2, 4, 1, 3]);
  assert.equal(kariyerSayisi(liste), 2);
});
