import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

test('ortak keşif dairesi şirket ölçüsünü ve yatay kaydırmayı tek yerde tutuyor', () => {
  const ortak = oku('src/components/KesifSeridi.tsx');
  assert.match(ortak, /w-\[76px\]/);
  assert.match(ortak, /h-14 w-14|w-14 h-14/);
  assert.match(ortak, /overflow-x-auto/);
  assert.match(ortak, /min-w-max/);
  assert.match(ortak, /seciliRenk = '#111827'/);
});

test('şirket şeridi ortak bileşeni varsayılan görünümle kullanıyor', () => {
  const sirket = oku('src/components/SirketSeridi.tsx');
  assert.match(sirket, /from ['"]\.\/KesifSeridi['"]/);
  assert.match(sirket, /<KesifSeridi/);
  assert.match(sirket, /<KesifDairesi/);
  assert.doesNotMatch(sirket, /seciliRenk=/);
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
