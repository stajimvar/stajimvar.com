import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ilanIli } from '../src/lib/ilan-ili.mjs';
import { sehirIlanlari, ilanSehirBaglantisi as eskiYoldan } from '../src/lib/seo/sehir-ilanlari.mjs';
import { ilanSehirBaglantisi, sehirBaglantisi, SEHIR_SAYFALARI } from '../src/lib/seo/sehir-sayfalari.mjs';
import { anaSayfaSehirBaglantisi, ANASAYFA_ILK_KART } from '../src/lib/anasayfa-baglantilari.mjs';
import { ilanGorunurGovde, ilanSayfasi, ILAN_SECIMI } from '../src/lib/seo/ilan-sayfasi.mjs';
import { ilanIsteginiCoz } from '../src/lib/seo/kenar-ilan.mjs';
import { ilanYolu } from '../src/lib/seo/metin.mjs';

/*
  İSTANBUL STAJ İLANLARI SAYFASINA İÇ BAĞLANTI (15 Ekim 2026)

  /staj-ilanlari/istanbul yalnız 3 iç bağlantı alıyordu (hub ve kendi
  sayfalandırması). İstanbul'daki ilanlar ve ana sayfa artık ona bağlanıyor.
  İl kararı şehir sayfasının seçimiyle aynı (ilanIli + SEHIR_SAYFALARI);
  ön render, kenar ve React aynı yardımcıyı çağırıyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const etiket = (s) => s;
const SIMDI = Date.parse('2026-10-15T09:00:00Z');
const BAG = '<a href="/staj-ilanlari/istanbul">İstanbul staj ilanları</a>';
const TEMEL = {
  id: 'abcdef12-0000-4000-8000-000000000001',
  title: 'Pazarlama Stajyeri',
  description: 'Pazarlama ekibinde kampanya hazırlığına destek.',
  responsibilities: ['Rapor hazırlamak'],
  required_skills: ['Excel'],
  posted_at: '2026-10-01T09:00:00Z',
  city: 'İstanbul',
  il: 'İstanbul',
  country_code: 'TR',
  work_type: 'On-site',
  application_method: 'external',
  apply_url: 'https://ornek.com/kariyer/1',
  companies: { name: 'Örnek A.Ş.', slug: 'ornek' },
};

test('il kararı şehir sayfasının seçimiyle aynı: bağlantı ⇔ ilanIli === İstanbul', () => {
  const ilanlar = [
    { ...TEMEL, id: 'a1', il: 'İstanbul', city: 'İstanbul' },
    { ...TEMEL, id: 'a2', il: null, city: 'Atasehir Istanbul', title: 'B' },
    { ...TEMEL, id: 'a3', il: null, city: 'Turkey - Istanbul', title: 'C' },
    { ...TEMEL, id: 'a4', il: 'Ankara', city: 'Ankara', title: 'D' },
    { ...TEMEL, id: 'a5', il: null, city: 'İstanbul / Ankara', title: 'E' },
    { ...TEMEL, id: 'a6', il: null, city: 'Berlin', country_code: 'DE', title: 'F' },
    { ...TEMEL, id: 'a7', il: null, city: '', title: 'G' },
    { ...TEMEL, id: 'a8', il: 'İstanbul', city: 'Kadıköy', title: 'H' },
  ];
  const sehirdeki = new Set(sehirIlanlari(ilanlar, 'İstanbul', '2026-10-15').map((i) => i.id));
  for (const i of ilanlar) {
    const bag = ilanSehirBaglantisi(i);
    assert.equal(Boolean(bag), ilanIli(i) === 'İstanbul', i.id);
    assert.equal(Boolean(bag), sehirdeki.has(i.id), `${i.id}: şehir sayfası seçimiyle farklı`);
    if (bag) assert.deepEqual(bag, { yol: '/staj-ilanlari/istanbul', metin: 'İstanbul staj ilanları' });
  }
  /* React'in verdiği biçim (countryCode) aynı sonucu veriyor. */
  assert.ok(ilanSehirBaglantisi({ il: undefined, city: 'Atasehir Istanbul', countryCode: 'TR' }));
  assert.equal(ilanSehirBaglantisi({ city: 'Ankara', countryCode: 'TR' }), null);
  assert.equal(ilanSehirBaglantisi(null), null);
  assert.equal(sehirBaglantisi('ankara'), null);
  assert.deepEqual(anaSayfaSehirBaglantisi(), { yol: '/staj-ilanlari/istanbul', metin: 'İstanbul staj ilanları' });
  /* Eski içe aktarma yolu aynı fonksiyonu veriyor (yeniden dışa aktarım). */
  assert.equal(eskiYoldan, ilanSehirBaglantisi);
  assert.deepEqual(Object.keys(SEHIR_SAYFALARI), ['istanbul']);
});

test('döngüsel içe aktarma yok: sehir-sayfalari yalnız ilan-ili modülüne bağlı, ilan-sayfasi sehir-ilanlari modülüne ulaşmıyor', () => {
  const graf = {};
  const gez = (f) => {
    f = path.resolve(KOK, f);
    if (graf[f]) return;
    graf[f] = [];
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/(?:^|\n)\s*(?:import|export)[^'"\n;]*?from\s+['"](\.[^'"]+)['"]/g)) {
      const h = path.resolve(path.dirname(f), m[1]);
      if (fs.existsSync(h)) { graf[f].push(h); gez(h); }
    }
  };
  const kokler = ['src/lib/seo/ilan-sayfasi.mjs', 'src/lib/seo/sehir-ilanlari.mjs', 'src/lib/seo/sehir-sayfalari.mjs', 'src/lib/anasayfa-baglantilari.mjs', 'src/lib/seo/kenar-ilan.mjs', 'src/lib/seo/kenar-sehir.mjs'];
  kokler.forEach(gez);
  const ulasir = (a, b, g = new Set()) => a === b || (!g.has(a) && (g.add(a), (graf[a] || []).some((x) => ulasir(x, b, g))));
  const ad = (f) => path.resolve(KOK, f);
  assert.deepEqual(graf[ad('src/lib/seo/sehir-sayfalari.mjs')], [ad('src/lib/ilan-ili.mjs')]);
  assert.equal(ulasir(ad('src/lib/seo/ilan-sayfasi.mjs'), ad('src/lib/seo/sehir-ilanlari.mjs')), false);
  const dongu = Object.keys(graf).filter((a) => graf[a].some((b) => ulasir(b, a)));
  assert.deepEqual(dongu, []);
});

test('ilan gövdesi: İstanbul ilanında "Tüm staj ilanları"nın yanında; başka şehirde yok', () => {
  const ist = ilanGorunurGovde(TEMEL, etiket, SIMDI);
  assert.match(ist, new RegExp(`<a href="/staj-ilanlari">Tüm staj ilanları</a> · ${BAG}`));
  assert.equal(ist.split('/staj-ilanlari/istanbul').length - 1, 1, 'tek bağlantı');
  for (const ek of [{ il: 'Ankara', city: 'Ankara' }, { il: null, city: 'Berlin', country_code: 'DE' }, { il: null, city: null }]) {
    const g = ilanGorunurGovde({ ...TEMEL, ...ek }, etiket, SIMDI);
    assert.doesNotMatch(g, /\/staj-ilanlari\/istanbul/);
    assert.match(g, /<a href="\/staj-ilanlari">Tüm staj ilanları<\/a> · <a href="\/sirket\/ornek">/);
  }
});

test('ön render: başlık, meta, canonical yolu, robots ve JSON-LD şehir bağlantısından bağımsız', () => {
  const ist = ilanSayfasi(TEMEL, etiket, SIMDI);
  const ank = ilanSayfasi({ ...TEMEL, il: 'Ankara', city: 'İstanbul ' }, etiket, SIMDI);
  assert.equal(ist.yol, ilanYolu(TEMEL));
  assert.ok(!ist.s.dizinDisi);
  assert.deepEqual(ist.s.jsonLd['@graph'].map((d) => d['@type']), ['JobPosting', 'BreadcrumbList']);
  const kirinti = ist.s.jsonLd['@graph'][1].itemListElement.map((x) => x.item);
  assert.deepEqual(kirinti.slice(0, 2), ['https://stajimvar.com/', 'https://stajimvar.com/staj-ilanlari']);
  assert.ok(!JSON.stringify(ist.s.jsonLd).includes('/staj-ilanlari/istanbul'), 'JSON-LD değişmedi');
  /* İl Ankara (doğrulanmış) → bağlantı yok; şehir metni İstanbul olsa da şehir sayfası da onu almıyor. */
  assert.doesNotMatch(ank.s.gorunurGovde, /\/staj-ilanlari\/istanbul/);
  assert.match(ist.s.gorunurGovde, /<nav class="sv-kirinti" aria-label="Sayfa yolu"><a href="\/">Ana sayfa<\/a> › <a href="\/staj-ilanlari">Staj ilanları<\/a><\/nav>/);
});

test('kenar: seçim `il` taşıyor; İstanbul ilanında bağlantı var, başka şehirde yok', async () => {
  assert.match(ILAN_SECIMI, /(^|,)il(,|$)/);
  const KABUK =
    '<!doctype html><html lang="tr"><head><title>StajımVar</title><meta name="description" content="" />' +
    '<meta property="og:title" content="" /><meta property="og:description" content="" />' +
    '<link rel="canonical" href="https://stajimvar.com/" /></head><body><div id="root"></div></body></html>';
  const coz = (ilan) =>
    ilanIsteginiCoz({
      yol: ilanYolu(ilan),
      ayar: { taban: 'https://ornek.supabase.co', anahtar: 'anon' },
      getir: async () => new Response(JSON.stringify([ilan]), { status: 200, headers: { 'content-type': 'application/json' } }),
      kabukGetir: async () => KABUK,
      gorselVarMi: async () => true,
      konumEtiketi: etiket,
      simdi: SIMDI,
    });
  /* Şehir metni ilçe, il doğrulanmış: kenar `il` okumasaydı bağlantı düşerdi. */
  const ist = await coz({ ...TEMEL, city: 'Kadıköy' });
  assert.equal(ist.tur, 200);
  assert.ok(ist.html.includes(BAG));
  assert.match(ist.html, /<link rel="canonical" href="https:\/\/stajimvar\.com\/ilan\/[^"]+"/);
  assert.doesNotMatch(ist.html, /<meta name="robots" content="[^"]*noindex/);
  const ank = await coz({ ...TEMEL, il: 'Ankara', city: 'Ankara' });
  assert.equal(ank.tur, 200);
  assert.doesNotMatch(ank.html, /\/staj-ilanlari\/istanbul/);
});

test('React: ilan sayfası ve ana sayfa aynı yardımcıyı gerçek <a> ile çiziyor', () => {
  const lp = oku('src/components/ListingPage.tsx');
  assert.match(lp, /import \{ ilanSehirBaglantisi \} from '\.\.\/lib\/seo\/sehir-sayfalari\.mjs';/);
  assert.match(lp, /ilanSehirBaglantisi\(\{ il: listing\.il, city: listing\.city, countryCode: listing\.countryCode \}\)/);
  assert.match(lp, /<a href=\{sehirBag\.yol\}/);
  assert.match(lp, /<a href="\/staj-ilanlari"[^>]*>\s*Tüm staj ilanları\s*<\/a>/);
  /* Tek ilan sorgusu `il` sütununu okuyor (React'te il kararı veriden). */
  const m = oku('src/lib/queries/mappers.ts');
  assert.ok(m.slice(m.indexOf('export const LISTING_COLUMNS'), m.indexOf("].join(', ')")).includes("'il'"));

  const ab = oku('src/components/AnaSayfaBolumleri.tsx');
  assert.match(ab, /const sehir = anaSayfaSehirBaglantisi\(\);/);
  assert.match(ab, /<a href="\/staj-ilanlari"[^>]*>\s*Tüm staj ilanları →\s*<\/a>/);
  assert.match(ab, /<a href=\{sehir\.yol\}/);
  const app = oku('src/App.tsx');
  assert.match(app, /ilkKartlarSonrasi=\{stajIlanlariAdresi \? undefined : <AnaSayfaIlanBaglantilari onNavigate=\{navigate\} \/>\}/);
  assert.equal((app.match(/<AnaSayfaIlanBaglantilari/g) || []).length, 1, 'satır tek yerde çiziliyor');

  const r = oku('scripts/onrender.mjs');
  assert.match(r, /const GORUNUR_KART = ANASAYFA_ILK_KART;/);
  assert.equal(ANASAYFA_ILK_KART, 6);
  assert.match(r, /const sehirAnaBag = anaSayfaSehirBaglantisi\(\);/);
  assert.match(r, /<a href="\/staj-ilanlari">Tüm staj ilanları →<\/a>\$\{anaSayfaSehirBag\}<\/p>/);
});

test('ana sayfa konumu: React satırı ilk ANASAYFA_ILK_KART kartın ardına koyuyor (ön render ile aynı yer)', () => {
  const mv = oku('src/components/MatchedInternshipsView.tsx');
  assert.match(mv, /import \{ ANASAYFA_ILK_KART \} from '\.\.\/lib\/anasayfa-baglantilari\.mjs';/);
  /* Kartın HEMEN ardında, aynı Fragment içinde; başka öğe araya girmiyor. */
  assert.match(mv, /cografyaEtiketi=\{seciliBolge === 'tumu'\}\n\s*\/>\n\s*\{ilkKartlarSonrasi && index === Math\.min\(ANASAYFA_ILK_KART, filteredListings\.length\) - 1 && ilkKartlarSonrasi\}/);
  /* Kural: hangi kartın ardında? (React'teki ifadenin aynısı) */
  const sira = (n) => Math.min(ANASAYFA_ILK_KART, n) - 1;
  assert.equal(sira(40), 5);
  assert.equal(sira(3), 2);
  assert.equal(sira(0), -1, 'kart yoksa satır yok (liste boş görünümü)');
});

const DIST = path.join(KOK, 'dist');
test('dist: ana sayfa ve İstanbul ilanları şehir sayfasına bağlanıyor; şehir sayfası dizine açık', { skip: !fs.existsSync(path.join(DIST, 'ilan')) }, () => {
  const ana = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  /* DOM sırası: 6 kartlık liste biter bitmez satır geliyor. */
  const m = ana.match(/<ul class="sv-kartlar">([\s\S]*?)<\/ul>(<p class="sv-tum-ilanlar">[\s\S]*?<\/p>)/);
  assert.ok(m, 'satır kart listesinin hemen ardında değil');
  assert.equal((m[1].match(/<li class="sv-kart">/g) || []).length, ANASAYFA_ILK_KART);
  assert.equal(m[2], '<p class="sv-tum-ilanlar"><a href="/staj-ilanlari">Tüm staj ilanları →</a> · <a href="/staj-ilanlari/istanbul">İstanbul staj ilanları →</a></p>');
  assert.equal(ana.split('href="/staj-ilanlari/istanbul"').length - 1, 1);
  let ist = 0, istBag = 0, digerBag = 0;
  for (const f of fs.readdirSync(path.join(DIST, 'ilan'))) {
    const h = fs.readFileSync(path.join(DIST, 'ilan', f), 'utf8');
    const kok = h.slice(h.indexOf('<div id="root">'));
    const bag = kok.includes(BAG);
    if (/<title>[^<]*\(İstanbul\)/.test(h)) { ist++; if (bag) istBag++; } else if (bag) digerBag++;
  }
  assert.ok(ist > 0);
  assert.equal(istBag, ist, 'her İstanbul ilanı bağlanmalı');
  /* Başlığında "(İstanbul)" olmayan ama ili İstanbul olan ilan bağlanabilir (ör. ilçe metni); sayı küçük kalmalı. */
  assert.ok(digerBag <= 5, `başlıkta İstanbul yok ama bağlantı var: ${digerBag}`);
  const sehir = fs.readFileSync(path.join(DIST, 'staj-ilanlari', 'istanbul.html'), 'utf8');
  assert.match(sehir, /<link rel="canonical" href="https:\/\/stajimvar\.com\/staj-ilanlari\/istanbul"/);
  assert.doesNotMatch(sehir, /<meta name="robots" content="[^"]*noindex/);
});
