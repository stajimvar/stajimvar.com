import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { ilanJobPosting, ilanGorunurGovde, ilanSayfasi, ilanKonumu } from '../src/lib/seo/ilan-sayfasi.mjs';

/*
  İLAN DETAYI — JobPosting DENETİMİ (12 Ekim 2026'da yeniden yazıldı)

  JobPosting artık ortak modülde (src/lib/seo/ilan-sayfasi.mjs); derleme ve
  kenar çizimi aynı fonksiyonu kullanıyor. Bu testler kaynak metni değil,
  modülün ürettiği veriyi ve dist/ çıktısını sınıyor.

  Esas: Google Search Central "Job posting" belgesi (son güncelleme
  2026-09-08): jobLocation'da addressCountry ZORUNLU; açıklama işin TAM
  tanımı (sorumluluk ve nitelik dahil) ve HTML; süresi dolan ilanda
  işaretleme kaldırılır ya da validThrough geçmişte olur.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const etiket = (s) => s; // konumEtiketi yerine: test girdisi zaten düzgün yazılı

const TEMEL = {
  id: 'abcdef12-0000-4000-8000-000000000001',
  title: 'Kalite Mühendisliği Stajyeri',
  description: 'Kalite ekibinde süreç iyileştirme çalışmalarına katılım.',
  responsibilities: ['Ölçüm raporlarını hazırlamak', 'Saha denetimlerine katılmak'],
  required_skills: ['Excel', 'Temel istatistik'],
  posted_at: '2026-10-01T09:00:00Z',
  created_at: '2026-09-30T09:00:00Z',
  updated_at: '2026-10-05T09:00:00Z',
  city: 'İstanbul',
  country_code: 'TR',
  work_type: 'On-site',
  application_method: 'external',
  apply_url: 'https://ornek.com/kariyer/ilan/42',
  companies: { name: 'Örnek A.Ş.', slug: 'ornek' },
};
const SIMDI = Date.parse('2026-10-12T12:00:00Z');

test('jobLocation her zaman addressCountry taşıyor; şehir alanındaki ülke adı yerleşim yeri sayılmıyor', () => {
  const { veri } = ilanJobPosting(TEMEL, etiket, SIMDI);
  assert.deepEqual(veri.jobLocation.address, { '@type': 'PostalAddress', addressLocality: 'İstanbul', addressCountry: 'TR' });

  /* Otis vakası: şehir yok, ülke var → yalnız ülke (Search Console "jobLocation eksik" hatası kapanıyor). */
  const otis = ilanJobPosting({ ...TEMEL, city: null, country_code: 'TR' }, etiket, SIMDI).veri;
  assert.deepEqual(otis.jobLocation.address, { '@type': 'PostalAddress', addressCountry: 'TR' });

  /* "Turkey" yazan şehir alanı: yerleşim yeri değil. */
  const turkey = ilanJobPosting({ ...TEMEL, city: 'Turkey', country_code: 'TR' }, etiket, SIMDI).veri;
  assert.equal(turkey.jobLocation.address.addressLocality, undefined);
});

test('konum kaynakta yoksa JobPosting YAZILMIYOR ve nedeni raporlanıyor (uydurma yok)', () => {
  const r = ilanJobPosting({ ...TEMEL, city: null, country_code: null }, etiket, SIMDI);
  assert.equal(r.veri, null);
  assert.match(r.eksik.join(' '), /jobLocation/);

  /* Tanınmayan şehir + ülke kodu yok: ülke uydurulmuyor, her ilan TR sayılmıyor. */
  const berlin = ilanKonumu({ city: 'Berlin', country_code: null }, etiket);
  assert.equal(berlin.ulke, null);
  /*
    12 Ekim 2026 incelemesi: şehirden ülke ÇIKARILMIYOR. "Çankaya" Türkiye'de
    olsa bile kaynakta ülke kodu yoksa yapısal veriye ülke yazılmıyor.
  */
  assert.equal(ilanKonumu({ city: 'Çankaya', country_code: null }, etiket).ulke, null);
  const cankaya = ilanJobPosting({ ...TEMEL, city: 'Çankaya', country_code: null }, etiket, SIMDI);
  assert.equal(cankaya.veri, null);
  assert.match(cankaya.eksik.join(' '), /addressCountry/);

  /* Şirket adı yoksa "Bilinmiyor" yazılmıyor; işaretleme hiç üretilmiyor. */
  const sirketsiz = ilanJobPosting({ ...TEMEL, companies: null }, etiket, SIMDI);
  assert.equal(sirketsiz.veri, null);
});

test('uzaktan ilan: başvuru coğrafyası kaynakta yoksa JobPosting YAZILMIYOR (ülke kodu başvuru şartı sayılmıyor)', () => {
  /*
    Google: TELECOMMUTE işte en az bir ülke gerekli — applicantLocationRequirements
    ya da fiziksel bir seçenek de varsa jobLocation ülkesi. Kaynakta ikisi de
    yok; ilanın ülke kodunu başvuru şartına çevirmek tahmin olurdu.
  */
  for (const ek of [{ city: null, country_code: 'DE' }, { city: 'Berlin', country_code: 'DE' }, { city: null, country_code: null }]) {
    const r = ilanJobPosting({ ...TEMEL, work_type: 'Remote', ...ek }, etiket, SIMDI);
    assert.equal(r.veri, null, JSON.stringify(ek));
    assert.match(r.eksik.join(' '), /applicantLocationRequirements/);
  }
  /* Sayfa yine görünür ve uzaktan olduğu yazıyor. */
  const govde = ilanGorunurGovde({ ...TEMEL, work_type: 'Remote' }, etiket, SIMDI);
  assert.match(govde, /Çalışma şekli: Uzaktan/);
  /* Hibrit: fiziksel seçenek var, kaynaktaki ülke ve şehirle jobLocation yazılıyor. */
  const hibrit = ilanJobPosting({ ...TEMEL, work_type: 'Hybrid' }, etiket, SIMDI).veri;
  assert.equal(hibrit.jobLocation.address.addressCountry, 'TR');
  assert.equal(hibrit.jobLocationType, undefined);
});

test('uzaktan ilan: başvurulabilen ülkeler beyanlıysa TELECOMMUTE + applicantLocationRequirements', () => {
  /*
    13 Ekim 2026: işveren uzaktan ilanda başvurulabilen ülkeleri seçiyor
    (`basvuru_ulkeleri`, 20261213010000). Google: %100 uzaktan işte
    jobLocationType TELECOMMUTE, en az bir ülke ve açıklamada bunun açıkça
    yazması. Fiziksel iş yeri olmadığı için jobLocation yazılmıyor.
  */
  const uzak = { ...TEMEL, work_type: 'Remote', city: null, country_code: 'DE', basvuru_ulkeleri: ['TR', 'DE', 'TR', 'TUR'] };
  const r = ilanJobPosting(uzak, etiket, SIMDI);
  assert.deepEqual(r.eksik, []);
  assert.equal(r.veri.jobLocationType, 'TELECOMMUTE');
  assert.equal('jobLocation' in r.veri, false, 'tamamen uzaktan işte boş ya da uydurma jobLocation yok');
  assert.deepEqual(
    r.veri.applicantLocationRequirements.map((x) => x['@type']),
    ['Country', 'Country'],
    'geçersiz ve tekrar eden kod ayıklanıyor',
  );
  assert.deepEqual(r.veri.applicantLocationRequirements.map((x) => x.name), ['Türkiye', 'Germany']);
  assert.match(r.veri.description, /tamamen uzaktan yapılıyor\. Başvurulabilen ülkeler: Türkiye, Almanya\./);
  /* Görünür sayfa da aynı bilgiyi söylüyor. */
  assert.match(ilanGorunurGovde(uzak, etiket, SIMDI), /Başvurulabilen ülkeler: Türkiye, Almanya/);
  /* JSON'a dönüşte null alan kalmıyor. */
  assert.doesNotMatch(JSON.stringify(r.veri), /null/);
});

test('başvurulabilen ülkeler yalnız uzaktan ilanda okunuyor; boş ya da geçersizse JobPosting yok', () => {
  for (const ulkeler of [[], ['Türkiye'], null]) {
    const r = ilanJobPosting({ ...TEMEL, work_type: 'Remote', basvuru_ulkeleri: ulkeler }, etiket, SIMDI);
    assert.equal(r.veri, null, JSON.stringify(ulkeler));
    assert.match(r.eksik.join(' '), /applicantLocationRequirements/);
  }
  /* Ofis ilanında (DB kısıtı izin vermese de) alan yok sayılıyor: ofis = jobLocation. */
  const ofis = ilanJobPosting({ ...TEMEL, basvuru_ulkeleri: ['DE'] }, etiket, SIMDI).veri;
  assert.equal(ofis.jobLocationType, undefined);
  assert.equal(ofis.applicantLocationRequirements, undefined);
  assert.equal(ofis.jobLocation.address.addressCountry, 'TR');
});

test('açıklama KESİLMİYOR: uzun metin, sorumluluklar ve nitelikler yapısal veride ve görünür sayfada tam', () => {
  const uzun = 'Bu ilanın açıklaması oldukça uzun bir metin. '.repeat(80).trim(); // ~3600 karakter
  const ilan = { ...TEMEL, description: `${uzun}\nİkinci paragraf burada.` };
  const { veri } = ilanJobPosting(ilan, etiket, SIMDI);
  assert.ok(veri.description.length > 3600, 'açıklama 1200 karakterde kesilmemeli');
  assert.match(veri.description, /<p>İkinci paragraf burada\.<\/p>/);
  assert.match(veri.description, /<li>Ölçüm raporlarını hazırlamak<\/li>/);
  assert.match(veri.description, /<li>Temel istatistik<\/li>/);
  const govde = ilanGorunurGovde(ilan, etiket, SIMDI);
  assert.ok(govde.includes(uzun.slice(-60)), 'görünür metin de tam olmalı');
  assert.match(govde, /<h2>Sorumluluklar<\/h2>/);
  assert.equal((govde.match(/<h1>/g) || []).length, 1);
});

test('HTML varlıkları çözülüp güvenle kaçırılıyor', () => {
  const ilan = { ...TEMEL, description: 'Berlin&nbsp;ve&nbsp;Stuttgart <script>alert(1)</script> &amp; uzaktan' };
  const govde = ilanGorunurGovde(ilan, etiket, SIMDI);
  assert.ok(!govde.includes('&nbsp;'), 'varlık metin olarak görünmemeli');
  assert.ok(!govde.includes('<script>'), 'etiket sayfaya girmemeli');
  assert.match(govde, /Berlin ve Stuttgart/);
});

test('SÜRESİ DOLAN İLAN: sayfa kalıyor, kapandığı yazıyor, JobPosting kaldırılıyor, haritada yok', () => {
  const ilan = { ...TEMEL, application_deadline: '2026-10-11' };
  const s = ilanSayfasi(ilan, etiket, SIMDI);
  assert.equal(s.suresiGecti, true);
  assert.match(s.s.gorunurGovde, /Başvuru dönemi kapandı\. Son başvuru: 11 Ekim 2026\./);
  assert.ok(!s.s.gorunurGovde.includes('sv-eylem'), 'kapanmış ilanda başvuru düğmesi olmamalı');
  const tipler = s.s.jsonLd['@graph'].map((d) => d['@type']);
  assert.deepEqual(tipler, ['BreadcrumbList']);

  /* Son gün DAHİL: 12 Ekim'de son başvurusu 12 Ekim olan ilan açık. */
  const bugun = ilanSayfasi({ ...TEMEL, application_deadline: '2026-10-12' }, etiket, SIMDI);
  assert.equal(bugun.suresiGecti, false);
  assert.equal(bugun.s.jsonLd['@graph'][0].validThrough, '2026-10-12');
});

/* ------------------------------------------------------- dist çıktısı */

const ilanSayfalari = () => {
  const klasor = path.join(KOK, 'dist', 'ilan');
  if (!existsSync(klasor)) return null;
  return readdirSync(klasor)
    .filter((f) => f.endsWith('.html'))
    .map((ad) => {
      const html = readFileSync(path.join(klasor, ad), 'utf8');
      const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      const graf = m ? JSON.parse(m[1]) : { '@graph': [] };
      return { ad, html, dugumler: graf['@graph'] || [graf] };
    });
};

test('dist: her JobPosting zorunlu alanlarla; kırıntı üst adresi gerçek merkez', () => {
  const sayfalar = ilanSayfalari();
  if (!sayfalar) return;
  for (const { ad, dugumler } of sayfalar) {
    const jp = dugumler.find((d) => d['@type'] === 'JobPosting');
    const kirinti = dugumler.find((d) => d['@type'] === 'BreadcrumbList');
    assert.ok(kirinti, `${ad}: kırıntı yok`);
    assert.equal(kirinti.itemListElement[1].item, 'https://stajimvar.com/staj-ilanlari', `${ad}: kırıntı /ilan'a gidiyor`);
    if (!jp) continue;
    assert.ok(jp.jobLocation?.address?.addressCountry, `${ad}: addressCountry yok`);
    assert.ok(String(jp.hiringOrganization?.name || '').trim(), `${ad}: şirket adı yok`);
    assert.notEqual(jp.hiringOrganization.name, 'Bilinmiyor');
  }
});

test('dist: kapanmış ilan görünür metinde kapalı, JobPosting yok, ilan haritasında yok', () => {
  const sayfalar = ilanSayfalari();
  if (!sayfalar) return;
  const haritaYolu = path.join(KOK, 'dist', 'sitemap-ilanlar.xml');
  if (!existsSync(haritaYolu)) return;
  const xml = readFileSync(haritaYolu, 'utf8');
  for (const { ad, html, dugumler } of sayfalar) {
    if (!html.includes('Başvuru dönemi kapandı')) continue;
    assert.ok(!dugumler.some((d) => d['@type'] === 'JobPosting'), `${ad}: kapanmış ama JobPosting var`);
    assert.ok(!xml.includes(`/ilan/${ad.replace(/\.html$/, '')}<`), `${ad}: kapanmış ama haritada`);
  }
});
