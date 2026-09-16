import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

import { donukKure, kureDokunusu, kureSayisi } from '../src/lib/kure-donusu.mjs';

const oku = (yol) => readFileSync(yol, 'utf8');

test('seçili olmayan küreye dokunuş filtreliyor, dönüşü temizliyor', () => {
  const durum = { anahtar: 'bolge:turkiye', imza: 'a' };
  assert.deepEqual(kureDokunusu(durum, { anahtar: 'sirket:FedEx', secili: false, imza: 'a' }), {
    eylem: 'filtrele',
    durum: null,
  });
});

test('seçili küre: ikinci dokunuş çeviriyor, üçüncü geri döndürüyor', () => {
  const ikinci = kureDokunusu(null, { anahtar: 'bolge:turkiye', secili: true, imza: 'a' });
  assert.deepEqual(ikinci, { eylem: 'cevir', durum: { anahtar: 'bolge:turkiye', imza: 'a' } });
  const ucuncu = kureDokunusu(ikinci.durum, { anahtar: 'bolge:turkiye', secili: true, imza: 'a' });
  assert.deepEqual(ucuncu, { eylem: 'cevir', durum: null });
});

test('filtre değişince eski dönüş görünmüyor', () => {
  const durum = { anahtar: 'bolge:tumu', imza: 'eski' };
  assert.equal(donukKure(durum, 'eski'), 'bolge:tumu');
  assert.equal(donukKure(durum, 'yeni'), null);
  /* Eski imzalı durumdayken dokunuş yeniden açıyor, kapatmıyor. */
  assert.deepEqual(kureDokunusu(durum, { anahtar: 'bolge:tumu', secili: true, imza: 'yeni' }).durum, {
    anahtar: 'bolge:tumu',
    imza: 'yeni',
  });
});

test('daraltma yokken bölge sayısı sunucu toplamı', () => {
  assert.equal(
    kureSayisi({ daraltmaVar: false, catalogTotal: 107, tumuYuklendi: false, suzulmusSirketler: Array(24).fill('x') }),
    107,
  );
});

test('eksik yüklenmiş ve daraltılmış listede sayı bilinmiyor (0 değil)', () => {
  assert.equal(
    kureSayisi({ daraltmaVar: true, catalogTotal: 194, tumuYuklendi: false, suzulmusSirketler: ['a', 'b'] }),
    null,
  );
  assert.equal(
    kureSayisi({ sirketAdi: 'FedEx', daraltmaVar: true, catalogTotal: 194, tumuYuklendi: false, suzulmusSirketler: [] }),
    null,
  );
});

test('bütün sayfalar yüklenince süzülmüş liste sayılıyor', () => {
  const ads = ['FedEx', 'Haleon', 'FedEx'];
  assert.equal(kureSayisi({ daraltmaVar: true, catalogTotal: 194, tumuYuklendi: true, suzulmusSirketler: ads }), 3);
  assert.equal(
    kureSayisi({ sirketAdi: 'FedEx', daraltmaVar: true, catalogTotal: 194, tumuYuklendi: true, suzulmusSirketler: ads }),
    2,
  );
  assert.equal(kureSayisi({ daraltmaVar: true, catalogTotal: 194, tumuYuklendi: true, suzulmusSirketler: [] }), 0);
});

test('şerit dönüşü animasyonla ve erişilebilir çiziyor', () => {
  const serit = oku('src/components/SirketSeridi.tsx');
  assert.match(serit, /\[backface-visibility:hidden\]/);
  assert.match(serit, /\[perspective:/);
  assert.match(serit, /duration-\[350ms\]/);
  assert.match(serit, /motion-reduce:transition-none/);
  assert.match(serit, /aria-live="polite"/);
  const gorunum = oku('src/components/MatchedInternshipsView.tsx');
  assert.match(gorunum, /kureSayisi\(/);
  assert.doesNotMatch(gorunum, /\b107\b/);
});
