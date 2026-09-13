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

test('ilan kartı paylaşılan tanımları kullanıyor', () => {
  assert.match(ILAN, /from '\.\.\/lib\/kart-cta'/, 'paylaşılan tanım alınmamış');
});

/*
  FIRSAT KARTINDAN DÜĞME KALKTI

  Kartın altında tam genişlikte bir "Başvur" düğmesi vardı ve doğrudan
  kurumun sitesine çıkıyordu: öğrenci şartları — kimler başvurabilir,
  tutar ne, son tarih ne — okumadan dışarı gidiyordu. Düğme kaldırılmadı,
  YERİ DEĞİŞTİ: detay sayfasında, şartların hemen altında duruyor.

  Kartta yerine detaya götüren sakin bir satır var ("Bursu incele →") ve
  o satır gerçek bir bağlantı DEĞİL — kartın tamamını zaten gerilmiş
  bağlantı kaplıyor, iç içe iki `<a>` üretilemez.

  Aşağıdaki testler bu kararın geri dönmesini engelliyor: kart yeniden
  dışarı çıkan bir düğme taşımaya başlarsa ya da başvuru detaydan
  kaybolursa yakalanıyor.
*/

test('FIRSAT KARTINDA DIŞARI ÇIKAN DÜĞME YOK', () => {
  assert.doesNotMatch(FIRSAT, /DisBaglanti/, 'kartta dış başvuru düğmesi geri gelmiş');
  assert.doesNotMatch(FIRSAT, /CTA_BIRINCIL|CTA_IKINCIL|CTA_ORTAK/, 'kart düğme geometrisini geri almış');
  assert.doesNotMatch(FIRSAT, />\s*Detayı gör\s*</, 'ayrı "Detayı gör" düğmesi kalmamalı');
});

test('BAŞVURU DETAY SAYFASINDA ERİŞİLEBİLİR', () => {
  const detay = oku('src/components/OpportunityDetailPage.tsx');
  assert.match(detay, /<DisBaglanti/, 'detayda başvuru bağlantısı yok');
  assert.match(detay, /const anaEylem = cta && !suresiDoldu/, 'ana eylem kurulmuyor');
  assert.match(detay, /Resmî sitede başvur/);
});

test('kartın tamamı detaya gidiyor, kaydet örtünün üstünde', () => {
  /* Gerilmiş bağlantı kartı kaplıyor; kaydet düğmesi z-10 ile üstte kalıyor. */
  assert.match(FIRSAT, /after:absolute after:inset-0/, 'gerilmiş bağlantı yok');
  assert.match(FIRSAT, /href=\{`\/firsatlar\/\$\{item\.slug\}`\}/, 'gerçek adres olmalı');
  assert.match(FIRSAT, /relative z-10 -mr-1 shrink-0 cursor-pointer/, 'kaydet örtünün altında kalır');
  assert.match(FIRSAT, /onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);/, 'kaydet tıklaması karta taşıyor');
});

test('inceleme satırı tür tür yazılıyor, şablonla üretilmiyor', () => {
  /*
    "Bursu incele" / "Yarışmayı incele": Türkçede belirtme hâli ünlü
    uyumuna ve son harfe bağlı, kısaltmalar kesme işareti istiyor
    ("Teknofest'i"). Tek bir şablon bunların hepsini yanlış yazardı.
  */
  const alan = oku('src/lib/opportunity-domain.mjs');
  assert.match(alan, /OPPORTUNITY_REVIEW_LABELS/);
  assert.match(alan, /scholarship: 'Bursu incele'/);
  assert.match(alan, /competition: 'Yarışmayı incele'/);
  assert.match(alan, /export function opportunityReviewLabel/);
  assert.match(FIRSAT, /opportunityReviewLabel\(item\.opportunityType\)/);
  /* Ekran okuyucu aynı hedefi iki kez duymamalı: satır `aria-hidden`. */
  assert.match(FIRSAT, /\{!arsivde && \(\s*<p\s+aria-hidden/);
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
