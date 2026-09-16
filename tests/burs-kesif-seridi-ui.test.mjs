import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

test('ortak keşif dairesi şirket ölçüsünü ve yatay kaydırmayı tek yerde tutuyor', () => {
  const ortak = oku('src/components/KesifSeridi.tsx');
  assert.match(ortak, /w-\[76px\]/);
  assert.match(ortak, /h-14 w-14|w-14 h-14/);
  assert.match(ortak, /min-w-max/);
  assert.match(ortak, /seciliRenk = '#111827'/);
  /*
    Kaydırma kabının sınıfları `SERIT.ic` belirtecine taşındı — şerit
    kabuğu telefonda kaldırıldığında iki şeridin (şirket ve konu)
    ölçüleri ayrışmasın diye. İddia yerini değiştirdi, kapsamı değil:
    yatay kaydırma ve `relative` sarmalayıcı hâlâ zorunlu.
  */
  assert.match(ortak, /className=\{SERIT\.ic\}/);
  assert.match(oku('src/ui/tokens.ts'), /ic: 'relative overflow-x-auto/);
});

test('ilan küre şeridi kendi kürelerini çiziyor, ortak bileşeni değiştirmiyor', () => {
  /*
    Onaylanan İlanlar tasarımında şerit Tümü → Türkiye → Yurtdışı →
    Uzaktan → şirketler; küreler büyük ve etiket tek satır. Ortak
    `KesifDairesi` fırsat şeritlerinde kullanılıyor; onu değiştirmek
    Fırsatlar sayfasını da değiştirirdi. Bu yüzden ilan şeridi kendi
    kürelerini çiziyor ve ortak bileşen olduğu gibi kalıyor.
  */
  const sirket = oku('src/components/SirketSeridi.tsx');
  assert.doesNotMatch(sirket, /from ['"]\.\/KesifSeridi['"]/);
  /* Kapılar: Türkiye · Yurtdışı · Tüm ilanlar; "Uzaktan" çalışma biçimi süzgecine taşındı (17 Eylül 2026). */
  for (const etiket of ['Türkiye', 'Yurtdışı', 'Tüm ilanlar']) {
    assert.ok(sirket.includes(`etiket: '${etiket}'`), `${etiket} küresi yok`);
  }
  assert.ok(!sirket.includes("etiket: 'Uzaktan'"), 'Uzaktan kapı olmamalı');
  const ortak = oku('src/components/KesifSeridi.tsx');
  assert.match(ortak, /seciliRenk = '#111827'/, 'ortak küre bileşeni değişmemeli');
});

test('burs şeridi sekiz kategoriyi mavi seçim halkasıyla çiziyor', () => {
  const burs = oku('src/components/BursKesifSeridi.tsx');
  assert.match(burs, /Bursları keşfet/);
  assert.match(burs, /BURS_KESIF_KATEGORILERI/);
  assert.match(burs, /seciliRenk="#2563eb"/);
  assert.match(burs, /\{sayilar\[kategori\.id\] \?\? 0\} burs/);
});

test('burs sayfası mevcut süzgeç tabanından sayar, sonra orb süzgecini uygular', () => {
  const sayfa = oku('src/components/BurslarKesfetPage.tsx');
  assert.match(sayfa, /const \[kesifKategori, setKesifKategori\]/);
  assert.match(sayfa, /bursSonuclari\(items, suzgec\)/);
  assert.match(sayfa, /bursKesifSayilari\(suzulmusTaban/);
  assert.match(sayfa, /bursKesifSonuclari\(suzulmusTaban, kesifKategori/);
  assert.match(sayfa, /suzgecAktifMi\(suzgec\) \|\| kesifKategori !== 'tumu'/);
  assert.match(sayfa, /<BursKesifSeridi/);
});
