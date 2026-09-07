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

/** Fırsat kartının alt düğme ızgarası. */
function firsatCtaBlogu() {
  const bas = FIRSAT.indexOf("onNavigate(`/firsatlar/${item.slug}`)");
  assert.ok(bas > 0, 'fırsat kartının detay düğmesi bulunamadı');
  return FIRSAT.slice(bas - 200, bas + 1200);
}

test('fırsat kartında detay ikincil, dış bağlantı birincil', () => {
  const blok = firsatCtaBlogu();
  /* Detay düğmesinin kendi className'i ikincil sınıfı taşıyor. */
  assert.match(
    blok,
    /onNavigate\(`\/firsatlar\/\$\{item\.slug\}`\)\}\s*\n\s*className=\{`\$\{CTA_ORTAK\} \$\{CTA_IKINCIL\}`\}/,
    'detay düğmesi ikincil değil'
  );
  /* Dış bağlantı birincil (mavi) kutu. */
  assert.match(blok, /DisBaglanti[\s\S]*?\$\{CTA_ORTAK\} \$\{CTA_BIRINCIL\}/, 'dış bağlantı birincil değil');
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
