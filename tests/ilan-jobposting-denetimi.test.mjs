import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { ilanJobPosting, ilanGorunurGovde, ilanSayfasi, ilanKonumu, basvuruUlkesiKanitiGecerli } from '../src/lib/seo/ilan-sayfasi.mjs';

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
  const uzak = { ...TEMEL, origin: 'employer_posted', work_type: 'Remote', city: null, country_code: 'DE', basvuru_ulkeleri: ['TR', 'DE', 'TR', 'TUR'] };
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
    const r = ilanJobPosting({ ...TEMEL, origin: 'employer_posted', work_type: 'Remote', basvuru_ulkeleri: ulkeler }, etiket, SIMDI);
    assert.equal(r.veri, null, JSON.stringify(ulkeler));
    assert.match(r.eksik.join(' '), /applicantLocationRequirements/);
  }
  /* Ofis ilanında (DB kısıtı izin vermese de) alan yok sayılıyor: ofis = jobLocation. */
  const ofis = ilanJobPosting({ ...TEMEL, origin: 'employer_posted', basvuru_ulkeleri: ['DE'] }, etiket, SIMDI).veri;
  assert.equal(ofis.jobLocationType, undefined);
  assert.equal(ofis.applicantLocationRequirements, undefined);
  assert.equal(ofis.jobLocation.address.addressCountry, 'TR');
});

test('YALNIZ DOĞRULANMIŞ: toplama hattından gelen uzaktan ilanda başvuru ülkeleri yok sayılıyor', () => {
  /*
    Doğrulanmış değer = işverenin kendi ilanında seçtiği ve sunucu kontrolünden
    ya da yönetici onayından geçen değer. Kaynaktan derlenen ilanda bu alanı
    doğrulayan bir adım yok: dolu olsa da JobPosting'e ve görünür sayfaya
    girmiyor, ülke tahmin edilmiyor.
  */
  for (const origin of ['scraped', 'manual', 'internal', undefined]) {
    const ilan = { ...TEMEL, origin, work_type: 'Remote', city: null, country_code: 'DE', basvuru_ulkeleri: ['DE'] };
    const r = ilanJobPosting(ilan, etiket, SIMDI);
    assert.equal(r.veri, null, String(origin));
    assert.match(r.eksik.join(' '), /applicantLocationRequirements/);
    assert.doesNotMatch(ilanGorunurGovde(ilan, etiket, SIMDI), /Başvurulabilen ülkeler/);
  }
});

/*
  DOĞRULAMA DAMGASI (20261214010000) — toplama hattından gelen uzaktan ilan

  Başvuru ülkeleri bu ilanlarda ancak geçerli damgayla kullanılıyor:
  okunabilir ve gelecekte olmayan bir doğrulama zamanı + resmî kaynağın
  https adresi + kaynaktaki ifade. Damga geçersizse JobPosting yok ve görünür
  sayfa da ülke söylemiyor (iki çıktı aynı kararı veriyor).
*/
const KANITLI = {
  ...TEMEL,
  origin: 'scraped',
  work_type: 'Remote',
  city: 'Berlin, DE | Germany (REMOTE)',
  country_code: 'DE',
  basvuru_ulkeleri: ['DE'],
  /* Göçteki gerçek kanıt metni (WongDoody). */
  basvuru_ulkeleri_kanit: 'https://job-boards.greenhouse.io/wongdoody/jobs/7988851003 — kaynak konumu: "Berlin, DE | Germany (REMOTE)"',
  basvuru_ulkeleri_dogrulandi_at: '2026-10-12T09:00:00Z',
};

test('damgalı uzaktan ilan: TELECOMMUTE + kanıtlı ülke; görünür sayfa aynı ülkeyi söylüyor', () => {
  const r = ilanJobPosting(KANITLI, etiket, SIMDI);
  assert.deepEqual(r.eksik, []);
  assert.equal(r.veri.jobLocationType, 'TELECOMMUTE');
  assert.deepEqual(r.veri.applicantLocationRequirements, [{ '@type': 'Country', name: 'Germany' }]);
  assert.equal('jobLocation' in r.veri, false, 'tamamen uzaktan işte iş yeri adresi üretilmiyor');
  assert.match(r.veri.description, /tamamen uzaktan yapılıyor\. Başvurulabilen ülkeler: Almanya\./);
  assert.match(ilanGorunurGovde(KANITLI, etiket, SIMDI), /Başvurulabilen ülkeler: Almanya/);
  assert.doesNotMatch(JSON.stringify(r.veri), /null/);
});

test('göçteki dört kanıt metni de geçerli damga sayılıyor', () => {
  const kanitlar = [
    'https://join.com/companies/fixfirst/16668569-founders-associate-intern — kaynak yapısal verisi: jobLocationType TELECOMMUTE, applicantLocationRequirements Country "Germany"; sayfa: "Remote (Germany)"',
    'https://app.gethirex.com/o/kaizen-technology/uyiv8wb6ymtfh4ys--part-time-product-specialist-student-position-4/ — kaynak yapısal verisi: jobLocationType TELECOMMUTE, applicantLocationRequirements Country "TR"; sayfa: "Istanbul, Türkiye · Staj · Uzaktan"',
    'https://jobs.ashbyhq.com/trading212/f8d628f4-6093-48bc-942e-6057b44707fc — kaynak yapısal verisi: jobLocationType TELECOMMUTE, applicantLocationRequirements Country "Germany"',
    KANITLI.basvuru_ulkeleri_kanit,
  ];
  for (const k of kanitlar) {
    assert.equal(basvuruUlkesiKanitiGecerli({ ...KANITLI, basvuru_ulkeleri_kanit: k }, SIMDI), true, k.slice(0, 40));
  }
});

test('damga geçersizse JobPosting yok, görünür sayfa ülke söylemiyor', () => {
  const gecersiz = {
    'damga yok': { basvuru_ulkeleri_dogrulandi_at: null },
    'okunamayan zaman': { basvuru_ulkeleri_dogrulandi_at: 'dün' },
    'gelecekte damga': { basvuru_ulkeleri_dogrulandi_at: '2026-10-13T12:00:00Z' },
    'kanıt yok': { basvuru_ulkeleri_kanit: null },
    'yalnız adres': { basvuru_ulkeleri_kanit: 'https://job-boards.greenhouse.io/wongdoody/jobs/7988851003' },
    'adres yok': { basvuru_ulkeleri_kanit: 'kaynak konumu: "Berlin, DE | Germany (REMOTE)"' },
    'http adres': { basvuru_ulkeleri_kanit: 'http://ornek.com/ilan — kaynak: "Germany (REMOTE)"' },
    'javascript adres': { basvuru_ulkeleri_kanit: 'javascript:alert(1) — kaynak: "Germany (REMOTE)"' },
    'ülke yok': { basvuru_ulkeleri: null },
    'geçersiz ülke': { basvuru_ulkeleri: ['Germany'] },
  };
  for (const [ad, ek] of Object.entries(gecersiz)) {
    const ilan = { ...KANITLI, ...ek };
    const r = ilanJobPosting(ilan, etiket, SIMDI);
    assert.equal(r.veri, null, ad);
    assert.match(r.eksik.join(' '), /applicantLocationRequirements/, ad);
    assert.doesNotMatch(ilanGorunurGovde(ilan, etiket, SIMDI), /Başvurulabilen ülkeler/, ad);
  }
});

test('damga ofis ve hibrit ilanı etkilemiyor', () => {
  for (const work_type of ['On-site', 'Hybrid']) {
    const v = ilanJobPosting({ ...KANITLI, work_type, city: 'Berlin' }, etiket, SIMDI).veri;
    assert.equal(v.jobLocationType, undefined, work_type);
    assert.equal(v.applicantLocationRequirements, undefined, work_type);
    assert.equal(v.jobLocation.address.addressCountry, 'DE', work_type);
  }
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
    /*
      UZAKTAN İLAN (#341, #343): Google TELECOMMUTE ilanda adres yerine
      başvurulabilen ülkeyi (`applicantLocationRequirements`) istiyor. Bu
      dal o PR'lardan beri vardı ama test yalnız derleme çıktısıyla koştuğu
      için güncellenmemişti (14 Ekim 2026). Ülke şartı gevşemedi: ya adresin
      ülkesi ya da en az bir başvuru ülkesi.
    */
    if (jp.jobLocationType === 'TELECOMMUTE') {
      const ulkeler = [].concat(jp.applicantLocationRequirements || []);
      assert.ok(ulkeler.length > 0 && ulkeler.every((u) => String(u?.name || '').trim()), `${ad}: uzaktan ilanda başvuru ülkesi yok`);
    } else {
      assert.ok(jp.jobLocation?.address?.addressCountry, `${ad}: addressCountry yok`);
    }
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
