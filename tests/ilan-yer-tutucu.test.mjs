import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { yerTutucuAciklamaMi, gercekAciklama } from '../src/lib/ilan-yer-tutucu.mjs';
import { ilanJobPosting, ilanSayfasi } from '../src/lib/seo/ilan-sayfasi.mjs';
import { ilanIsteginiCoz } from '../src/lib/seo/kenar-ilan.mjs';
import { ilanYolu } from '../src/lib/seo/metin.mjs';

/*
  YER TUTUCU İLAN AÇIKLAMASI — JobPosting YOK, SAYFA DİZİNE AÇIK (15 Ekim 2026)

  Toplama hattı açıklama yokken "Bu ilanın ayrıntıları şirketin kendi
  kariyer sayfasında. Başvurmak için ilana git." yazıyordu; canlıda 7 ilan bu
  cümleyle iş ilanı yapısal verisi taşıyordu. Yer tutucu artık açıklama
  sayılmıyor (JobPosting yazılmıyor); sayfanın dizine açıklığı değişmiyor;
  otomasyon cümleyi bir daha yazmıyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const YER_TUTUCU = 'Bu ilanın ayrıntıları şirketin kendi kariyer sayfasında. Başvurmak için ilana git.';
const etiket = (s) => s;
const SIMDI = Date.parse('2026-10-15T09:00:00Z');
const TEMEL = {
  id: 'abcdef12-0000-4000-8000-000000000001',
  title: 'Kalite Mühendisliği Stajyeri',
  description: 'Kalite ekibinde süreç iyileştirme çalışmalarına katılım.',
  responsibilities: ['Ölçüm raporlarını hazırlamak'],
  required_skills: ['Excel'],
  posted_at: '2026-10-01T09:00:00Z',
  created_at: '2026-09-30T09:00:00Z',
  updated_at: '2026-10-05T09:00:00Z',
  city: 'Berlin',
  country_code: 'DE',
  work_type: 'On-site',
  application_method: 'external',
  apply_url: 'https://ornek.com/kariyer/ilan/42',
  companies: { name: 'Örnek GmbH', slug: 'ornek' },
};
const jsonLdTipleri = (s) => (s.jsonLd['@graph'] || [s.jsonLd]).map((d) => d['@type']);

test('yer tutucu tanıma: eşdeğer yazımlar evet, gerçek metin ve boş metin hayır', () => {
  for (const t of [
    YER_TUTUCU,
    'Bu ilanın ayrıntıları şirketin kendi kariyer sayfasında.',
    'Başvurmak için ilana git',
    'BU İLANIN AYRINTILARI ŞİRKETİN KENDİ KARİYER SAYFASINDA. BAŞVURMAK İÇİN İLANA GİT!',
    '<p>Bu ilanın ayrıntıları şirketin kendi kariyer sayfasında.</p>\n\n<p>Başvurmak için ilana git.</p>',
    '  Bu  ilanın ayrıntıları   şirketin kendi kariyer sayfasında&nbsp;—  Başvurmak için ilana git… ',
  ]) {
    assert.equal(yerTutucuAciklamaMi(t), true, t);
    assert.equal(gercekAciklama(t), '');
  }
  for (const t of [
    '',
    null,
    undefined,
    'Kalite ekibinde süreç iyileştirme çalışmalarına katılım.',
    `Gerçek açıklama. ${YER_TUTUCU}`,
    'Bu ilanın ayrıntıları için mülakatta konuşulacak.',
  ]) {
    assert.equal(yerTutucuAciklamaMi(t), false, String(t));
  }
  assert.equal(gercekAciklama(TEMEL.description), TEMEL.description);
});

test('JobPosting: yer tutucu açıklamada YOK (tahmini beceri listesi olsa bile); gerçek açıklamada VAR', () => {
  const yerTutucu = ilanJobPosting({ ...TEMEL, description: YER_TUTUCU, responsibilities: [], required_skills: [] }, etiket, SIMDI);
  assert.equal(yerTutucu.veri, null);
  assert.ok(yerTutucu.eksik.includes('description (yer tutucu metin)'));
  /* Toplama hattı required_skills'i başlıktan tahminle dolduruyor: yine JobPosting yok. */
  const beceriyle = ilanJobPosting({ ...TEMEL, description: YER_TUTUCU, responsibilities: [], required_skills: ['Excel', 'SAP'] }, etiket, SIMDI);
  assert.equal(beceriyle.veri, null);
  const gercek = ilanJobPosting(TEMEL, etiket, SIMDI);
  assert.equal(gercek.veri['@type'], 'JobPosting');
  assert.match(gercek.veri.description, /Kalite ekibinde süreç iyileştirme/);
  assert.doesNotMatch(gercek.veri.description, /kariyer sayfasında/);
  assert.deepEqual(gercek.eksik, []);
});

test('açıklama eksikse sahte metin üretilmiyor; mevcut eksik alan kuralı aynı', () => {
  const bos = ilanJobPosting({ ...TEMEL, description: null, responsibilities: [], required_skills: [] }, etiket, SIMDI);
  assert.equal(bos.veri, null);
  assert.ok(bos.eksik.includes('description'));
  /* Açıklama yok ama kaynaktan sorumluluk var: önceki kural gibi JobPosting yazılıyor. */
  const sorumlulukla = ilanJobPosting({ ...TEMEL, description: '', required_skills: [] }, etiket, SIMDI);
  assert.equal(sorumlulukla.veri['@type'], 'JobPosting');
  assert.doesNotMatch(sorumlulukla.veri.description, /kariyer sayfasında|Başvurmak için ilana git/);
  const sayfa = ilanSayfasi({ ...TEMEL, description: null, responsibilities: [], required_skills: [] }, etiket, SIMDI);
  assert.doesNotMatch(JSON.stringify(sayfa.s), /Bu ilanın ayrıntıları şirketin kendi kariyer sayfasında/);
});

test('ön render yolu: yer tutucu ilanın sayfası dizine açık, BreadcrumbList var, JobPosting yok', () => {
  const sayfa = ilanSayfasi({ ...TEMEL, description: YER_TUTUCU, responsibilities: [], required_skills: [] }, etiket, SIMDI);
  assert.deepEqual(jsonLdTipleri(sayfa.s), ['BreadcrumbList']);
  assert.ok(!sayfa.s.dizinDisi, 'sayfa noindex yapılmamalı');
  assert.ok(sayfa.eksik.includes('description (yer tutucu metin)'));
  assert.equal(sayfa.yol, ilanYolu(TEMEL));
  /* Geçerli ilan: JobPosting + BreadcrumbList, değişmedi. */
  assert.deepEqual(jsonLdTipleri(ilanSayfasi(TEMEL, etiket, SIMDI).s), ['JobPosting', 'BreadcrumbList']);
});

test('kenar yolu: yer tutucu ilan 200, noindex yok, JobPosting yok; geçerli ilan JobPosting taşıyor', async () => {
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
  const yt = await coz({ ...TEMEL, description: YER_TUTUCU, responsibilities: [], required_skills: [] });
  assert.equal(yt.tur, 200);
  assert.doesNotMatch(yt.html, /"@type":"JobPosting"/);
  assert.match(yt.html, /"@type":"BreadcrumbList"/);
  assert.doesNotMatch(yt.html, /<meta name="robots" content="[^"]*noindex/);
  const gecerli = await coz(TEMEL);
  assert.equal(gecerli.tur, 200);
  assert.match(gecerli.html, /"@type":"JobPosting"/);
});

test('otomasyon: yer tutucuyu yazmıyor; iki taraf aynı cümleleri tanıyor', () => {
  const py = oku('automation/promote.py');
  assert.doesNotMatch(py, /"description": description or "Bu ilanın/);
  assert.match(py, /aciklama = ilan_aciklamasi\(raw\.get\("description"\)\)/);
  assert.match(py, /"description": aciklama,/);
  const pyCumleler = [...py.match(/YER_TUTUCU_CUMLELER = \(([\s\S]*?)\)/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const js = oku('src/lib/ilan-yer-tutucu.mjs');
  const jsCumleler = [...js.match(/const YER_TUTUCU_CUMLELER = \[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(pyCumleler, jsCumleler);
  assert.equal(jsCumleler.length, 2);
  /* Yer tutucu metni üreten başka bir yer kalmadı (yalnız tanıma listeleri). */
  for (const dosya of ['automation/promote.py', 'src/lib/seo/ilan-sayfasi.mjs', 'scripts/onrender.mjs']) {
    assert.doesNotMatch(oku(dosya), /Bu ilanın ayrıntıları şirketin kendi kariyer sayfasında\. Başvurmak/, dosya);
  }
});

const DIST = path.join(KOK, 'dist', 'ilan');
test('dist: hiçbir JobPosting yer tutucu açıklama taşımıyor; o ilanların sayfası dizine açık', { skip: !fs.existsSync(DIST) }, () => {
  let yerTutucuSayfa = 0;
  for (const f of fs.readdirSync(DIST)) {
    const h = fs.readFileSync(path.join(DIST, f), 'utf8');
    for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const v = JSON.parse(m[1]);
      for (const d of v['@graph'] || [v]) {
        if (d['@type'] === 'JobPosting') assert.ok(!yerTutucuAciklamaMi(d.description), `${f}: yer tutucu JobPosting`);
      }
    }
    if (/Bu ilanın ayrıntıları şirketin kendi kariyer sayfasında/.test(h)) {
      yerTutucuSayfa++;
      assert.doesNotMatch(h, /"@type":"JobPosting"/, `${f}: JobPosting var`);
      assert.doesNotMatch(h, /<meta name="robots" content="[^"]*noindex/, `${f}: noindex yapıldı`);
    }
  }
  /* Bilgi: canlı veride bugün 7 ilan; geriye dönük düzeltme ayrı ve onaylı bir iş. */
  assert.ok(yerTutucuSayfa >= 0);
});
