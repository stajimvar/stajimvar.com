import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
  BAŞVURU DURUMU SÖZLÜĞÜ — KAPSAM VE TEKİLLİK

  Panelde aynı başvuru iki farklı adla görünüyordu: kart "İnceleniyor",
  çekmece "İncelemede" diyordu; "Değerlendirme" ise çekmecede "Case"
  oluyordu. İki ayrı sözlük vardı ve biri değişince diğeri değişmiyordu.

  Bu testler iki şeyi bağlıyor:
    1. Sözlük `application_status` enum'unun TAMAMINI kapsıyor — yani
       kullanıcıya hiçbir zaman ham enum yazılamaz.
    2. Panelde ikinci bir durum sözlüğü yeniden doğmuyor.
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

const sozluk = oku('src/sirket/basvuru-durumu.ts');
const tipler = oku('src/lib/database.types.ts');

/** database.types.ts içindeki application_status enum üyeleri. */
function enumUyeleri() {
  const bas = tipler.indexOf('application_status:');
  assert.ok(bas > -1, 'application_status enum bulunamadı');
  const govde = tipler.slice(bas, tipler.indexOf(';', bas));
  return [...govde.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

/** DURUM_ROZETI gövdesi — yorum metni sayılmasın diye ayrı çıkarılıyor. */
function rozetGovdesi() {
  const bas = sozluk.indexOf('export const DURUM_ROZETI');
  assert.ok(bas > -1, 'DURUM_ROZETI bulunamadı');
  return sozluk.slice(bas, sozluk.indexOf('\n};', bas));
}

test('sözlük application_status enum üyelerinin tamamını kapsıyor', () => {
  const uyeler = enumUyeleri();
  const govde = rozetGovdesi();
  assert.ok(uyeler.length >= 7, `enum beklenenden kısa: ${uyeler.join(', ')}`);
  for (const uye of uyeler) {
    assert.ok(
      govde.includes(`${uye}:`),
      `${uye} için görünen ad yok — panelde ham enum yazılabilir`,
    );
  }
});

test('DURUM_SIRASI enum ile aynı kümeyi taşıyor', () => {
  const bas = sozluk.indexOf('export const DURUM_SIRASI');
  const govde = sozluk.slice(bas, sozluk.indexOf('];', bas));
  const sirada = [...govde.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  assert.deepEqual([...sirada].sort(), [...enumUyeleri()].sort());
});

const PANEL = [
  'src/sirket/AdayKarti.tsx',
  'src/sirket/AdayIzgarasi.tsx',
  'src/sirket/AdayCekmecesi.tsx',
];

test('tanınmayan durumda ham değer geri verilmiyor', () => {
  /* `?? kart.durum` deseni geri gelirse şemaya eklenen yeni aşama ekranda çıplak yazılır. */
  for (const yol of PANEL) {
    assert.doesNotMatch(oku(yol), /\?\?\s*kart\.durum/, `${yol}: ham enum'a geri düşülüyor`);
  }
});

test('panelde ikinci bir durum sözlüğü yok', () => {
  for (const yol of [...PANEL, 'src/lib/aday-kart.mjs']) {
    assert.doesNotMatch(
      oku(yol),
      /^\s*(export\s+)?const\s+DURUM_(ETIKETI|ADI|SIRASI)\s*[:=]/m,
      `${yol}: ikinci durum sözlüğü tanımlanmış`,
    );
  }
});

test('eski ve yeni adlar aynı anda yaşamıyor', () => {
  /* "İncelemede" ve "Case" eski sözlüğün adlarıydı; ikisi de gitmiş olmalı. */
  const panel = [...PANEL, 'src/sirket/basvuru-durumu.ts'].map(oku).join('\n');
  assert.ok(!panel.includes("etiket: 'İncelemede'"), 'eski "İncelemede" adı hâlâ var');
  assert.ok(!panel.includes("etiket: 'Case'"), 'eski "Case" adı hâlâ var');
});
