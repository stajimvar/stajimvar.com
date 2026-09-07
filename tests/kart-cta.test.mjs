import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  KART ALT DÜĞMELERİ TEK KAYNAKTAN

  İlan kartı ile fırsat kartındaki düğme çifti aynı işi yapıyor ama iki
  ayrı dosyada elle yazıldıkları için ayrışmışlardı: renkler TERSTİ
  (birinde detay mavi, ötekinde başvuru mavi) ve punto iki katman
  farklıydı (text-sm / text-xs). Aynı sitede mavi kutu bir listede
  siteden çıkaran eylemi, ötekinde site içi sayfayı gösteriyordu.

  Bu testler o ayrışmanın geri gelmesini engelliyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const CTA = oku('src/lib/kart-cta.ts');
const ILAN = oku('src/components/InternshipCard.tsx');
const FIRSAT = oku('src/components/OpportunitiesPage.tsx');

/** `export const AD = '...'` gövdesini çok satırlı da olsa çıkarır. */
function sabit(kaynak, ad) {
  const m = new RegExp(`export const ${ad}\\s*[:=][\\s\\S]*?;`).exec(kaynak);
  assert.ok(m, `${ad} bulunamadı`);
  return m[0];
}

test('mavi yalnız birincil eylemde, ikincil beyaz', () => {
  const birincil = sabit(CTA, 'CTA_BIRINCIL');
  const ikincil = sabit(CTA, 'CTA_IKINCIL');
  assert.match(birincil, /bg-blue-600/);
  assert.match(birincil, /text-white/);
  assert.match(ikincil, /bg-white/);
  assert.doesNotMatch(ikincil, /bg-blue/, 'ikincil kutu mavi olmamalı');
});

test('geometri ve punto tek yerde tanımlı', () => {
  const ortak = sabit(CTA, 'CTA_ORTAK');
  assert.match(ortak, /min-h-11/, 'dokunma hedefi 44px');
  assert.match(ortak, /text-xs/, 'punto tek yerden');
  assert.match(ortak, /rounded-xl/);
  /* Renk ortak geometride yok: rol sınıfları taşıyor. */
  assert.doesNotMatch(ortak, /bg-(blue|white|gray)/);
});

test('iki kart da paylaşılan tanımları kullanıyor', () => {
  for (const [ad, kaynak] of [
    ['InternshipCard', ILAN],
    ['OpportunitiesPage', FIRSAT],
  ]) {
    assert.match(kaynak, /from '\.\.\/lib\/kart-cta'/, `${ad}: paylaşılan tanım alınmamış`);
  }
});

/** Fırsat kartının alt eylem alanı. */
function firsatCtaBlogu() {
  const bas = FIRSAT.indexOf('<DisBaglanti');
  assert.ok(bas > 0, 'fırsat kartının dış bağlantısı bulunamadı');
  return FIRSAT.slice(bas - 700, bas + 900);
}

test('FIRSAT KARTINDA TEK EYLEM VAR ve o birincil', () => {
  /*
    Kartın altında "Detayı gör" adında ikincil bir düğme vardı. Kartın
    KENDİSİ artık detaya gidiyor (gerilmiş bağlantı), yani aynı hedefe
    giden ikinci bir düğme kalan tek gerçek eylemi — resmî kaynağa
    çıkmayı — eşit ağırlıkta bir rakiple paylaştırıyordu.

    Aynı karar ilan kartında da verilmişti; üç liste artık aynı kalıpta.
  */
  const blok = firsatCtaBlogu();
  assert.match(blok, /DisBaglanti[\s\S]*?\$\{CTA_ORTAK\} \$\{CTA_BIRINCIL\}/, 'dış bağlantı birincil değil');
  assert.doesNotMatch(FIRSAT, />\s*Detayı gör\s*</, 'ayrı "Detayı gör" düğmesi kalmamalı');
  assert.doesNotMatch(FIRSAT, /CTA_IKINCIL/, 'fırsat kartında ikincil rol kalmadı');
});

test('kartın tamamı detaya gidiyor, düğme örtünün üstünde', () => {
  /* Gerilmiş bağlantı kartı kaplıyor; dış bağlantı z-10 ile üstte kalıyor. */
  assert.match(FIRSAT, /after:absolute after:inset-0/, 'gerilmiş bağlantı yok');
  assert.match(FIRSAT, /href=\{`\/firsatlar\/\$\{item\.slug\}`\}/, 'gerçek adres olmalı');
  assert.match(FIRSAT, /relative z-10 mt-auto/, 'eylem alanı örtünün altında kalır');
});

test('fırsat kartının düğmelerinde elle yazılmış renk ve punto yok', () => {
  const blok = firsatCtaBlogu();
  for (const kalip of [/bg-blue-600/, /text-sm/, /border-gray-200 px-3/]) {
    assert.doesNotMatch(blok, kalip, `elle yazılmış stil kaldı: ${kalip}`);
  }
});

test('İLAN KARTINDA TEK EYLEM VAR ve o birincil', () => {
  /*
    Kartta "Detaylar" adında ikincil bir düğme vardı. Kartın KENDİSİ zaten
    detaya gidiyor (bkz. tests/ilan-arayuz-duzeltmeleri.test.mjs): aynı
    hedefe giden ikinci bir düğme, kalan tek gerçek eylemi — başvuruyu —
    eşit ağırlıkta bir rakiple paylaştırıyordu.

    Fırsat kartında ikili düzen sürüyor, bu yüzden CTA_IKINCIL kalkmadı;
    burada yalnızca kullanılmıyor.
  */
  assert.doesNotMatch(ILAN, />\s*Detaylar\s*</);
  assert.doesNotMatch(ILAN, /CTA_IKINCIL/, 'ilan kartında ikincil rol kalmadı');
  assert.match(ILAN, /className=\{`\$\{CTA_ORTAK\} \$\{CTA_BIRINCIL\}`\}/);
});
