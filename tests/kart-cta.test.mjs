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

test('ilan kartında tam genişlikte düğme kalmadı', () => {
  /*
    Kart tek eylem taşıyor: sağ altta "İlanı incele", mavi kenarlı ve 44
    px (`KART_EYLEMI`, mobil sadeleştirme 25 Eylül 2026). Dış başvuru
    ilan sayfasında, şartların yanında.
  */
  assert.match(ILAN, /from '\.\.\/lib\/kart-cta'/);
  assert.match(ILAN, /className=\{KART_EYLEMI\.kenar\}\s*>\s*İlanı incele\s*</);
  assert.doesNotMatch(ILAN, /target="_blank"/, 'kart dış siteye çıkmamalı');
  assert.doesNotMatch(ILAN, /CTA_BIRINCIL|CTA_IKINCIL/, 'tam genişlikte eski düğme geometrisi geri gelmiş');
  const cta = oku('src/lib/kart-cta.ts');
  assert.match(cta, /export const KART_EYLEMI = \{/);
  assert.match(cta, /min-h-11/);
});

test('FIRSAT KARTINDA DIŞARI ÇIKAN DÜĞME YOK', () => {
  /*
    Ayrıntı önce (kullanıcı kararı, 25 Eylül 2026 — yeniden teyit): kartın
    tek eylemi "Ayrıntıları gör" ve fırsat sayfasına gidiyor. Kurumun
    başvuru sayfası, giriş kapısıyla birlikte, detay sayfasında.
  */
  assert.doesNotMatch(FIRSAT, /DisBaglanti/, 'kartta dış başvuru düğmesi geri gelmiş');
  assert.doesNotMatch(FIRSAT, /opportunityCta/, 'kart başvuru hedefini kendisi kuruyor');
  assert.doesNotMatch(FIRSAT, /target="_blank"/, 'kart dış siteye çıkmamalı');
  assert.doesNotMatch(FIRSAT, /CTA_BIRINCIL|CTA_IKINCIL|CTA_ORTAK/, 'kart eski düğme geometrisini geri almış');
  /*
    Son rötuş (25 Eylül 2026): her kartta tekrarlanan "Ayrıntıları gör"
    de kalktı. Tek bağlantı başlıktaki `<a>` ve `after:` örtüsüyle kartın
    tamamını kaplıyor; kartta başka bağlantı ya da eylem düğmesi yok.
  */
  assert.doesNotMatch(FIRSAT, /Ayrıntıları gör<|KART_EYLEMI/);
  const kart = FIRSAT.slice(FIRSAT.indexOf('<article'), FIRSAT.indexOf('</article>'));
  const kod = kart.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  assert.equal((kod.match(/<a\b/g) || []).length, 1, 'kartta tek bağlantı olmalı');
  assert.equal((kod.match(/<button\b/g) || []).length, 1, 'kartta yalnız kaydet düğmesi olmalı');
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
  assert.match(FIRSAT, /const detayYolu = `\/firsatlar\/\$\{item\.slug\}`;/, 'gerçek adres olmalı');
  assert.match(FIRSAT, /href=\{detayYolu\}/);
  assert.match(FIRSAT, /relative z-10 -mr-2 -mt-2 shrink-0/, 'kaydet örtünün altında kalır');
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
  /* İlan kartıyla tek tip: görünen yazı "İncele", tür tür ifade bağlantının adında. */
  assert.match(FIRSAT, /aria-label=\{`\$\{item\.title\}: \$\{opportunityReviewLabel\(item\.opportunityType\)\}`\}/);
});

test('İLAN KARTINDA TEK EYLEM VAR: ilan sayfasına götürüyor', () => {
  /*
    "Detaylar" gibi ikinci bir düğme yok. Tek eylem "İlanı incele" ve kart
    ile başlıkla aynı adrese (StajımVar ilan sayfası) gidiyor; dış
    hedefin adı ("İlana git ↗", "Kariyer sayfasına git ↗") o sayfadaki
    düğmede (tests/ilan-arayuz-duzeltmeleri).
  */
  assert.doesNotMatch(ILAN, />\s*Detaylar\s*</);
  assert.doesNotMatch(ILAN, /CTA_IKINCIL|CTA_BIRINCIL/);
  assert.doesNotMatch(ILAN, /ilanHedefi\(/);
  assert.match(ILAN, /<a href=\{ilanAdresi\} onClick=\{ilanaGit\}|href=\{ilanAdresi\}\s*onClick=\{ilanaGit\}\s*aria-label=\{`\$\{listing\.title\} ilanını incele`\}/);
});
