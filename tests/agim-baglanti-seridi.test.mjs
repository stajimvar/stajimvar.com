import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  AĞIM BAĞLANTI ŞERİDİ — KÜRE PROFİLE GÖTÜRÜR

  Kullanıcı kararı 24 Eylül 2026: küre profile götürür. Canlıda bir
  küreye basınca akış o kişinin paylaşımlarına süzülüyordu; paylaşımı
  olmayan kişide ekranda yalnız "Bu kişinin akışında paylaşımı yok."
  kalıyordu. Profilde aynı paylaşımlar ve daha çok seçenek var.

  Bu kararla kalkanlar, madde madde:
    - Akış süzmesi (`seciliKisi`, `gorunenAkis`) ve onun boş cümlesi:
      akış her zaman bütün akış.
    - "Tümü" küresi: süzme olmayınca yapacağı iş kalmadı.
    - Küre çevirme (Ağım'daki `kureDokunusu` / `donukKure` kullanımı,
      `onCevir`, `donuk`) ve seçili küre vurgusu. `lib/kure-donusu.mjs`
      duruyor: İlanlar, Fırsatlar ve Rehber şeritleri hâlâ kullanıyor.

  Bileşen oturum istemiyor ama jsdom yok; iddialar kaynak üzerinden.
  Tarayıcıda test prop'larıyla ölçüldü (Chromium, 390 piksel):
  kürelerin href'i /profil/<ad>, erişilebilir adı "<ad> profili", öğe
  74,2 × 84,7 piksel; sol tık onNavigate'i bir kez çağırıyor ve adres
  değişmiyor; Ctrl, Meta, Shift ve orta tuşta varsayılan davranış
  engellenmiyor. Üç kişi + Bağlantılar şeridi 390 pikselde taşmıyor
  (scrollWidth = clientWidth = 390).
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const kod = (m) => m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const SERIT = kod(oku('src/components/sosyal/BaglantiSeridi.tsx'));
const AGIM = kod(oku('src/components/sosyal/AgimSayfasi.tsx'));

test('küre gerçek <a href>: adres profilYolu, sol tık uygulama içi, değiştirici tuşlar tarayıcıya kalıyor', () => {
  assert.match(SERIT, /import \{ profilYolu \} from '\.\.\/\.\.\/lib\/sosyal-kullanici-adi\.mjs';/);
  assert.match(SERIT, /const yol = profilYolu\(kullaniciAdi\);/);
  assert.match(SERIT, /<a\s+href=\{yol\}/);
  assert.match(
    SERIT,
    /if \(olay\.metaKey \|\| olay\.ctrlKey \|\| olay\.shiftKey \|\| olay\.altKey \|\| olay\.button !== 0\) return;\s*olay\.preventDefault\(\);\s*onNavigate\(yol\);/,
  );
  assert.match(SERIT, /aria-label=\{`\$\{ad\} profili`\}/);
  /* İç içe etkileşim yok: fotoğraf büyütme düğmesi kürede açılmıyor. */
  assert.doesNotMatch(SERIT, /buyutme=/);
});

test('kullanıcı adı yoksa küre düz öğe: uydurma adres yok', () => {
  assert.match(SERIT, /if \(!kullaniciAdi\) \{\s*return \(\s*<li key=\{kisi\.kisiId\}>\s*<div className=\{OGE\}>/);
  assert.match(SERIT, /const gorunen = kisiler\.filter\(\(k\) => k\.profil !== null\);/);
});

test('odak halkası ve dokunma hedefi', () => {
  assert.match(SERIT, /const OGE = `flex w-\[clamp\(68px,19vw,78px\)\] shrink-0 flex-col items-center gap-1\.5 rounded-xl \$\{ODAK_HALKASI\}`;/);
  assert.match(SERIT, /const KURE = 'h-\[clamp\(58px,16vw,64px\)\] w-\[clamp\(58px,16vw,64px\)\]';/);
});

test('süzme, Tümü ve küre çevirme kalktı (kullanıcı kararı 24 Eylül 2026: küre profile götürür)', () => {
  /* Şerit: Tümü küresi, seçim ve dönüş props'u yok. */
  assert.doesNotMatch(SERIT, /Tümü|Tüm akış|Layers/);
  assert.doesNotMatch(SERIT, /aria-pressed|secili|onSec|onCevir|donuk|rotateY/);
  /* Ağım: süzgeç, boş cümlesi ve dönüş durumu yok; akış olduğu gibi çiziliyor. */
  assert.doesNotMatch(AGIM, /seciliKisi|gorunenAkis|kureDurumu|kure-donusu|kureDokunusu|donukKure/);
  assert.doesNotMatch(AGIM, /Bu kişinin akışında paylaşımı yok/);
  assert.match(AGIM, /\{akis\.map\(\(p\) => \(\s*<AkisKarti/);
  assert.match(
    AGIM,
    /<BaglantiSeridi\s+kisiler=\{baglantilar\}\s+bekleyenIstek=\{bekleyenIstek\}\s+onBaglantilar=\{\(\) => onNavigate\('\/agim\/baglantilar'\)\}\s+onNavigate=\{onNavigate\}\s*\/>/,
  );
});

test('Bağlantılar küresi aynen: rozet gerçek sayı, sıfırda çizilmiyor', () => {
  assert.match(SERIT, /onClick=\{onBaglantilar\}/);
  assert.match(SERIT, /\{bekleyenIstek > 0 && \(/);
  assert.match(SERIT, /\{bekleyenIstek > 9 \? '9\+' : bekleyenIstek\}/);
});

test('kure-donusu.mjs öteki şeritlerde kullanılıyor; ölü kod değil', () => {
  for (const dosya of [
    'src/components/MatchedInternshipsView.tsx',
    'src/components/OpportunitiesPage.tsx',
    'src/components/RehberMerkezi.tsx',
  ]) {
    assert.match(oku(dosya), /from '\.\.\/lib\/kure-donusu\.mjs'/, dosya);
  }
});
