import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  MASAÜSTÜ ÜST MENÜ — ÖĞRENCİ VE İŞVEREN AYNI DİL (10 Ekim 2026)

  Öğrenci menüsü #327 ile bağımsız sekmelere geçti; işveren menüsü eski
  gri kapsülde kalmıştı ve iki hesabın üst çubuğu iki farklı tasarım
  diliyle konuşuyordu. İki menü artık sınıflarını aynı sabitlerden
  alıyor. Bu test, biri değişip öteki geride kalırsa düşer.

  Seçenekler ORTAK DEĞİL: öğrencide İlanlar · Fırsatlar · Ağım · Rehber,
  işverende İlanlar · Başvurular · Takipçiler · Rehber. Ortak olan
  yalnızca görünüm.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const BASLIK = fs.readFileSync(path.join(KOK, 'src', 'components', 'Header.tsx'), 'utf8');

const blok = (isaret) => {
  const bas = BASLIK.indexOf(isaret);
  assert.ok(bas > 0, `${isaret} bulunamadı`);
  return BASLIK.slice(bas, BASLIK.indexOf('</nav>', bas));
};

const OGRENCI = blok('{/* Desktop Student Navigation Bar */}');
const ISVEREN = blok('MASAÜSTÜ ŞİRKET GEZİNMESİ');

const say = (metin, parca) => metin.split(parca).length - 1;

test('iki menü de ortak sabitleri kullanıyor', () => {
  for (const [ad, kaynak] of [['öğrenci', OGRENCI], ['işveren', ISVEREN]]) {
    assert.equal(say(kaynak, 'className={MASAUSTU_MENU}'), 1, `${ad}: menü kabı`);
    assert.equal(say(kaynak, 'className={masaustuSekme('), 4, `${ad}: dört sekme`);
    assert.equal(say(kaynak, 'className={masaustuSekmeIkonu('), 4, `${ad}: dört simge`);
  }
});

test('gri kapsül kalmadı', () => {
  assert.ok(!BASLIK.includes('bg-gray-100/90 rounded-2xl border border-gray-200/90'));
});

test('menü yalnız masaüstünde çiziliyor', () => {
  /* Telefonun alt menüsü ayrı bileşen; bu sabitler ona dokunmuyor. */
  assert.match(BASLIK, /const MASAUSTU_MENU = 'hidden lg:flex /);
});

test('etkin sekme: mavi zemin, mavi yazı, altta 3 px çizgi', () => {
  assert.match(BASLIK, /const MASAUSTU_SEKME_AKTIF =\s*'bg-blue-50 text-blue-700 [^']*after:h-\[3px\][^']*after:bg-blue-600'/);
  assert.match(BASLIK, /const MASAUSTU_SEKME_PASIF = '[^']*hover:bg-gray-50'/);
});

test('işveren seçenekleri ve etkin sayfa mantığı korunuyor', () => {
  for (const [kimlik, kosul] of [
    ['nav-tab-sirket-ilanlar', 'sirketIlanlarindaMi'],
    ['nav-tab-sirket-basvuranlar', 'sirketBasvuranlarindaMi'],
    ['nav-tab-sirket-agim', 'agimdaMi'],
    ['nav-tab-sirket-rehber', 'rehberdeMi && !isverendeMi'],
  ]) {
    const bas = ISVEREN.indexOf(`id="${kimlik}"`);
    assert.ok(bas > 0, kimlik);
    const sekme = ISVEREN.slice(bas, ISVEREN.indexOf('</a>', bas));
    assert.ok(sekme.includes(`masaustuSekme(${kosul})`), `${kimlik}: sınıf koşulu`);
    assert.ok(sekme.includes(`aria-current={${kosul} ? 'page' : undefined}`), `${kimlik}: aria-current`);
  }
});
