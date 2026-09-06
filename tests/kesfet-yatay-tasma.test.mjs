import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
  KEŞFET MOBİLDE YATAY KAYMASIN — ŞEHİR ŞERİDİ SÖZLEŞMESİ

  NEDEN BU TEST VAR
  -----------------
  Bu dosyanın koruduğu şey tek bir Tailwind sınıfı: şehir şeridinin kaydırma
  sarmalayıcısındaki `relative`. Görünüşte hiçbir işe yaramayan, "gereksiz"
  diye silinmeye en yatkın sınıf o. Silinirse ne `tsc` ne ESLint tek kelime
  eder; tek belirti, sayfanın telefonda sağa sola kaymaya başlaması olur.

  HATA NEYDİ
  ----------
  Her daire ekran okuyucu için bir `sr-only` düğümü taşıyor ve Tailwind'in
  `sr-only`si `position: absolute`. Sarmalayıcı, iç şerit ve düğmelerin
  hiçbiri konumlandırılmamışken bu mutlak kutuların kapsayıcı bloğu görüntü
  alanı oluyordu. CSS'te bir kaydırma kabı, kapsayıcı bloğu kendi DIŞINDA
  kalan mutlak konumlu kutuyu kırpmaz: `overflow-x-auto` görünen daireleri
  kırpıyor, kaçan `sr-only` düğümleri ise belgenin kaydırma alanını
  büyütüyordu.

  375 px'lik ekranda ölçülen: documentElement.clientWidth = 375 iken
  scrollWidth = 684 — 684, şeritteki son `sr-only` düğümünün sağ kenarı.
  Telefonda yerleşim görüntü alanı 684'e genişliyor, `position: fixed` alt
  gezinme çubuğu 660 px'e, çerez şeridi 684 px'e uzuyordu.

  `relative` eklendikten sonra ölçülen: scrollWidth === clientWidth === 375,
  alt gezinme 351 px, şerit kendi içinde hâlâ kaydırılabiliyor.

  DİKKAT: `overflow-x: hidden` bunu ÇÖZMÜYOR (ölçüldü). Sorun kırpma değil,
  kapsayıcı blok seçimi. Bu yüzden test `overflow-x-auto` ile `relative`i
  BİRLİKTE arıyor; biri diğerinin yerine geçmiyor.

  Kaynak metni okunuyor çünkü bu depoda birim testleri React çizmiyor;
  tarayıcıdaki karşılığı 375 px viewport'ta scrollWidth === clientWidth
  ölçümü.
*/

const sehirSeridi = readFileSync(new URL('../src/components/SehirSeridi.tsx', import.meta.url), 'utf8');

/** Verilen imzayı taşıyan JSX satırının sınıf kümesi. */
const siniflar = (metin, imza) => {
  /* Yorumlar da sınıf adı geçirebiliyor; yalnızca gerçek className taşıyan satıra bakılıyor. */
  const satir = metin.split('\n').find((s) => s.includes(imza) && s.includes('className="'));
  assert.ok(satir, `beklenen öğe bulunamadı: ${imza}`);
  const eslesme = satir.match(/className="([^"]*)"/);
  assert.ok(eslesme, `öğede düz className yok (şablon dizgeye mi döndü?): ${imza}`);
  return new Set(eslesme[1].split(/\s+/).filter(Boolean));
};

test('kaydırma sarmalayıcısı hem overflow-x-auto hem relative taşıyor', () => {
  const sarmalayici = siniflar(sehirSeridi, 'overflow-x-auto px-3');
  assert.ok(sarmalayici.has('overflow-x-auto'), 'yatay kaydırma şeridin içinde kalmalı');
  assert.ok(
    sarmalayici.has('relative'),
    'relative düşerse sr-only düğümleri kaptan kaçar ve belge 375 yerine 684 px olur',
  );
});

test('sr-only düğümü duruyor: taşma düzeltmesi erişilebilirliği bozmadı', () => {
  /*
    Kaçan kutuları "sil gitsin" diye kaldırmak taşmayı da çözerdi ama
    daireler ekran okuyucuda çıplak rakama ("71") düşerdi. Doğru çözüm
    kutuyu kırpmak; düğüm yerinde kalmalı.
  */
  assert.match(sehirSeridi, /<span className="sr-only">\{okunan\}<\/span>/);
  assert.match(sehirSeridi, /okunan=\{`\$\{sehir\.ad\}, \$\{sehir\.adet\} etkinlik`\}/);
  assert.match(sehirSeridi, /okunan=\{`Tüm şehirler, \$\{toplam\} etkinlik`\}/);
});

test('şerit hâlâ kendi içinde kaydırılabilir: düzeltme görünümü daraltmadı', () => {
  /*
    Yanlış çözüm şeridi DARALTMAK olurdu: `min-w-max` kalkarsa daireler
    sıkışır, şerit kaydırılamaz hâle gelir. Doğru çözüm kırpmaktı.
  */
  assert.ok(sehirSeridi.includes('flex min-w-max gap-3'), 'daire sırası min-w-max ile geniş kalmalı');
  assert.ok(sehirSeridi.includes('w-[76px] shrink-0'), 'daireler sabit genişlikte ve sıkışmıyor');
});

test('sarmalayıcıya overflow-x-hidden kaçamağı girmedi', () => {
  /*
    `overflow-x: hidden` bu hatayı çözmüyor (tarayıcıda ölçüldü) ama şeridin
    kaydırılmasını ÖLDÜRÜYOR. Birinin "taşma varsa gizle" refleksiyle
    buraya girmesi iki gerileme birden demek.
  */
  assert.equal(sehirSeridi.includes('overflow-x-hidden'), false, 'kaydırma öldürülmemeli');
  assert.equal(sehirSeridi.includes('overflow-hidden px-3'), false, 'kaydırma öldürülmemeli');
});
