import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  BOLUM_SEKTORU,
  BOLUM_ILAN_ADEDI,
  BASLIK_DESENLERI,
  GENEL_IS_DESENI,
  bolumIlanAlani,
  bolumIlanlari,
  baslikAlaniSoyluyor,
  baslikKatla,
} from '../src/lib/bolum-ilanlari.mjs';
import { BOLUM_ALANI } from '../src/lib/bolum-eslestirme.mjs';
import { ilanYolu } from '../src/lib/seo/metin.mjs';

/*
  BÖLÜM SAYFASINDA GÜNCEL STAJ İLANLARI (14 Ekim 2026)

  Seçim kuralı src/lib/bolum-ilanlari.mjs: ön render ve uygulama aynısını
  çağırıyor. Burada kural sahte satırlarla sınanıyor (veritabanına
  dokunulmuyor), iki sözlük göçe karşı denetleniyor ve dist varsa üretilen
  bölüm sayfaları okunuyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const GOC = oku('supabase/migrations/20261109010000_ilan_alanlari.sql');

/* ------------------------------------------------- sözlükler göçle aynı */

test('bölüm → alan eşlemesi göç 20260923025000 ile birebir', () => {
  const sql = oku('supabase/migrations/20260923025000_bolum_alan_seed.sql');
  const blok = sql.slice(sql.indexOf('insert into public.department_sectors'));
  const goc = Object.fromEntries([...blok.matchAll(/\('([a-z-]+)',\s*'([a-z-]+)'\)/g)].map((m) => [m[1], m[2]]));
  assert.equal(Object.keys(goc).length, 42);
  assert.deepEqual(BOLUM_SEKTORU, goc);
});

test('başlık desenleri ve genel iş kovası göç 20261109010000 ile birebir', () => {
  const blok = GOC.slice(GOC.indexOf('create or replace function public.ilan_islev_desenleri'));
  const desenler = [...blok.slice(0, blok.indexOf('$$;')).matchAll(/\(\d+, '((?:[^']|'')*)', '([a-z-]+)'\)/g)].map((m) => [m[2], m[1]]);
  assert.equal(desenler.length, 14);
  assert.deepEqual(BASLIK_DESENLERI, desenler);
  const genel = GOC.match(/if b ~ '((?:[^']|'')*)' then\s+birinci := 'ekonomi-isletme-yonetim'/)[1];
  assert.equal(GENEL_IS_DESENI, genel);
  /* Katlama sosyal_gizli.ad_sadelestir ile aynı. */
  assert.equal(baslikKatla('İnsan Kaynakları — Stajyeri (F/H)'), 'insan kaynaklari stajyeri f h');
});

test('blok yalnız BOLUM_ALANI kapısından geçen bölümde; sağlık bölümleri bilerek dışarıda', () => {
  for (const slug of Object.keys(BOLUM_ALANI)) {
    assert.ok(BOLUM_SEKTORU[slug], `${slug}: alanı yok`);
    assert.equal(bolumIlanAlani(slug), BOLUM_SEKTORU[slug]);
  }
  for (const slug of ['hemsirelik', 'tip', 'eczacilik', 'fizyoterapi-ve-rehabilitasyon', 'tibbi-laboratuvar-teknikleri', 'cocuk-gelisimi', 'olmayan-bolum']) {
    assert.equal(bolumIlanAlani(slug), null, slug);
    assert.deepEqual(bolumIlanlari({ bolumSlug: slug, ilanlar: [], sektorler: [] }).uygun, false);
  }
});

/* ------------------------------------------------------- seçim kuralı */

const SEKTORLER = [
  { id: 'sek-yazilim', slug: 'bilisim-yazilim', ad: 'Bilişim ve Yazılım' },
  { id: 'sek-gida', slug: 'gida-tarim-hayvancilik', ad: 'Gıda, Tarım ve Hayvancılık' },
  { id: 'sek-moda', slug: 'tekstil-moda-hazir-giyim', ad: 'Tekstil, Moda ve Hazır Giyim' },
  { id: 'sek-isletme', slug: 'ekonomi-isletme-yonetim', ad: 'Ekonomi, İşletme ve Yönetim' },
  { id: 'sek-makine', slug: 'makine-imalat', ad: 'Makine ve İmalat' },
];
const SIMDI = Date.parse('2026-10-14T09:00:00Z');
let sira = 0;
const ilan = (title, alanlar, ek = {}) => ({
  id: `${String(++sira).padStart(8, '0')}-0000-4000-8000-000000000000`,
  title,
  alan_idleri: alanlar,
  country_code: 'TR',
  application_deadline: null,
  status: 'published',
  companies: { name: `Şirket ${sira}`, logo_url: null },
  ...ek,
});

test('ilgili bölüme doğru ilanlar geliyor; ilgisizler gelmiyor', () => {
  const yazilim = ilan('Yazılım Geliştirme Stajyeri', ['sek-yazilim']);
  const veri = ilan('Veri Analizi Stajyeri', ['sek-yazilim', 'sek-gida']);
  const pazarlama = ilan('Pazarlama Stajyeri', ['sek-isletme']);
  const sonuc = bolumIlanlari({ bolumSlug: 'yazilim-muhendisligi', ilanlar: [yazilim, veri, pazarlama], sektorler: SEKTORLER, simdi: SIMDI });
  assert.equal(sonuc.uygun, true);
  assert.equal(sonuc.alan.slug, 'bilisim-yazilim');
  assert.deepEqual(sonuc.ilanlar.map((i) => i.title), ['Yazılım Geliştirme Stajyeri', 'Veri Analizi Stajyeri']);

  /* İkinci alan (şirketin sektörü) eşleşme sayılmıyor: veri analizi gıda bölümüne gitmiyor. */
  const gida = bolumIlanlari({ bolumSlug: 'gida-muhendisligi', ilanlar: [yazilim, veri, pazarlama], sektorler: SEKTORLER, simdi: SIMDI });
  assert.deepEqual(gida.ilanlar, []);

  /* İşe alım stajı moda şirketinde: moda tasarımına gitmiyor. */
  const ik = ilan('Talent Acquisition Intern (h/f)', ['sek-isletme', 'sek-moda']);
  assert.deepEqual(bolumIlanlari({ bolumSlug: 'moda-tasarimi', ilanlar: [ik], sektorler: SEKTORLER, simdi: SIMDI }).ilanlar, []);
  assert.equal(bolumIlanlari({ bolumSlug: 'isletme', ilanlar: [ik], sektorler: SEKTORLER, simdi: SIMDI }).ilanlar.length, 1);
});

test('veritabanının birincil alanı esas: yalnız ikinci alanda geçen bölüm ilanı almıyor', () => {
  /* Başlık yazılım dese de veritabanı birincil alanı başka verdiyse yazılım bölümüne gitmiyor. */
  const ikincide = ilan('Yazılım Stajyeri', ['sek-moda', 'sek-yazilim']);
  assert.deepEqual(bolumIlanlari({ bolumSlug: 'yazilim-muhendisligi', ilanlar: [ikincide], sektorler: SEKTORLER, simdi: SIMDI }).ilanlar, []);
});

test('başlığı işlev söylemeyen ilan (alan şirketin sektöründen) gösterilmiyor', () => {
  const genel = ilan('Stagiaire (H/F)', ['sek-gida']);
  const gercek = ilan('Gıda Güvenliği Kalite Stajyeri', ['sek-gida']);
  assert.equal(baslikAlaniSoyluyor('Stagiaire (H/F)', 'gida-tarim-hayvancilik'), false);
  const sonuc = bolumIlanlari({ bolumSlug: 'gida-muhendisligi', ilanlar: [genel, gercek], sektorler: SEKTORLER, simdi: SIMDI });
  /* "Kalite" başlığı iş güvenliği/kalite alanına işaret ediyor; gıda bölümüne de düşmüyor. */
  assert.deepEqual(sonuc.ilanlar, []);
  assert.equal(baslikAlaniSoyluyor('Uzun Dönem Stajyer — Yatırım ve Projeler', 'ekonomi-isletme-yonetim'), true);
  assert.equal(baslikAlaniSoyluyor('IT Support / IT Operations Intern', 'bilisim-yazilim'), true);
});

test('kapanmış, yayında olmayan ve tekrar eden ilanlar görünmüyor', () => {
  const dun = ilan('Backend Developer Intern', ['sek-yazilim'], { application_deadline: '2026-10-13' });
  const bugun = ilan('Frontend Developer Intern', ['sek-yazilim'], { application_deadline: '2026-10-14' });
  const taslak = ilan('Software Intern', ['sek-yazilim'], { status: 'draft' });
  const ayniKimlik = { ...bugun };
  const ayniIlan = { ...bugun, id: 'ffffffff-0000-4000-8000-000000000000' };
  const basliksiz = ilan('   ', ['sek-yazilim']);
  const sonuc = bolumIlanlari({
    bolumSlug: 'bilgisayar-muhendisligi',
    ilanlar: [dun, bugun, taslak, ayniKimlik, ayniIlan, basliksiz, null],
    sektorler: SEKTORLER,
    simdi: SIMDI,
  });
  assert.deepEqual(sonuc.ilanlar.map((i) => i.title), ['Frontend Developer Intern']);
  assert.equal(sonuc.toplam, 1);
});

test('Türkiye önce, sıra korunuyor, en çok altı', () => {
  const liste = [
    ilan('Software Intern Paris', ['sek-yazilim'], { country_code: 'FR' }),
    ...Array.from({ length: 7 }, (_, n) => ilan(`Yazılım Stajyeri ${n + 1}`, ['sek-yazilim'])),
  ];
  const sonuc = bolumIlanlari({ bolumSlug: 'yazilim-muhendisligi', ilanlar: liste, sektorler: SEKTORLER, simdi: SIMDI });
  assert.equal(BOLUM_ILAN_ADEDI, 6);
  assert.equal(sonuc.ilanlar.length, 6);
  assert.equal(sonuc.toplam, 8);
  assert.deepEqual(sonuc.ilanlar.map((i) => i.title), [1, 2, 3, 4, 5, 6].map((n) => `Yazılım Stajyeri ${n}`));
  const iki = bolumIlanlari({ bolumSlug: 'yazilim-muhendisligi', ilanlar: liste.slice(0, 3), sektorler: SEKTORLER, simdi: SIMDI });
  assert.deepEqual(iki.ilanlar.map((i) => i.country_code), ['TR', 'TR', 'FR']);
});

test('eşleşen ilan yoksa liste boş — dolgu ilan yok', () => {
  const baska = ilan('Pazarlama Stajyeri', ['sek-isletme']);
  const sonuc = bolumIlanlari({ bolumSlug: 'makine-muhendisligi', ilanlar: [baska], sektorler: SEKTORLER, simdi: SIMDI });
  assert.equal(sonuc.uygun, true);
  assert.deepEqual(sonuc.ilanlar, []);
  /* Alan listesi okunamadıysa da boş — uydurma yok. */
  assert.deepEqual(bolumIlanlari({ bolumSlug: 'makine-muhendisligi', ilanlar: [baska], sektorler: [] }).ilanlar, []);
});

/* ------------------------------------------------- ön render ve uygulama */

test('ön render: ilan okuması alan_idleri taşıyor, bölüm gövdesine ortak kartlar giriyor, yapısal veri eklenmiyor', () => {
  const r = oku('scripts/onrender.mjs');
  assert.match(r, /import \{ bolumIlanlari \} from '\.\.\/src\/lib\/bolum-ilanlari\.mjs';/);
  assert.match(r, /encodeURIComponent\(`\$\{ILAN_SECIMI\},alan_idleri`\)/);
  assert.match(r, /yol: '\/rest\/v1\/sectors\?aktif=eq\.true&select=id,slug,ad&order=sira\.asc'/);
  assert.match(r, /const sonuc = bolumIlanlari\(\{ bolumSlug: b\.slug, ilanlar, sektorler \}\);/);
  assert.match(r, /\? gorunurIlanKartlari\(sonuc\.ilanlar\) \+/);
  assert.match(r, /govde: `<main><h1>\$\{kacir\(b\.ad\)\} stajı<\/h1>\$\{b\.cizim\}\$\{blok\.html\}<\/main>`/);
  /* Kenar çiziminin seçimi değişmedi. */
  assert.doesNotMatch(oku('src/lib/seo/ilan-sayfasi.mjs'), /alan_idleri/);
  const blok = r.slice(r.indexOf('const bolumIlanBlogu = (b) =>'), r.indexOf('/* ---------------------------------------------- /staj-ilanlari ---- */'));
  assert.doesNotMatch(blok, /JobPosting|ItemList/);
  assert.match(blok, /jsonLd: \{ '@context': 'https:\/\/schema\.org', '@graph': bolumGrafik \}/);
});

test('uygulama: bölüm sayfası aynı kuralı kullanıyor; dolgu ilan yok; rehber bloğu değişmedi', () => {
  const sayfa = oku('src/components/BolumPages.tsx');
  assert.match(sayfa, /<BolumIlanlari bolumSlug=\{bolum\.slug\} onNavigate=\{onNavigate\} \/>/);
  assert.doesNotMatch(sayfa, /RehberdeIlanlar/);
  const blok = oku('src/components/BolumIlanlari.tsx');
  assert.match(blok, /import \{ bolumIlanAlani, bolumIlanlari \} from '\.\.\/lib\/bolum-ilanlari\.mjs';/);
  assert.match(blok, /const sonuc = bolumIlanlari\(\{ bolumSlug, ilanlar, sektorler \}\);/);
  assert.doesNotMatch(blok, /alanEslestir|\.\.\.hepsi/);
  /* Kart ölçüleri InternshipCard ile aynı: 80×80 logo. */
  assert.match(blok, /className="!h-20 !w-20 !rounded-xl !p-2 !text-2xl"/);
  /* Sorgu derlemeyle aynı sırada ve aynı alanlarla. */
  const sorgu = oku('src/lib/queries/index.ts');
  assert.match(sorgu, /\.select\('id, title, city, country_code, work_type, application_deadline, alan_idleri, companies \( name, logo_url \)'\)/);
  assert.match(sorgu, /\.order\('posted_at', \{ ascending: false, nullsFirst: false \}\)\s*\.order\('id', \{ ascending: true \}\)/);
  /* Rehber sayfaları kendi bloğunu kullanmaya devam ediyor. */
  assert.match(oku('src/components/GuidePages.tsx'), /<RehberdeIlanlar baslik=\{rehber\.baslik\}/);
});

test('ilk HTML stilleri: okuma düzeni karta madde işareti ve girinti vermiyor', () => {
  const html = oku('index.html');
  assert.match(html, /\.sv-metin \.sv-kartlar \{\s*margin: 12px 0;\s*padding-left: 0;\s*list-style: none;\s*\}/);
  assert.match(html, /\.sv-metin \.sv-kart-baslik \{\s*color: #0f172a;\s*\}/);
  assert.match(html, /\.sv-metin \.sv-logo img \{\s*height: 100%;\s*\}/);
});

/* ------------------------------------------------------------------ dist */

const DIST = path.join(KOK, 'dist');
const distVar = fs.existsSync(path.join(DIST, 'bolum'));
const bolumDosyalari = () => (distVar ? fs.readdirSync(path.join(DIST, 'bolum')).filter((f) => f.endsWith('.html')) : []);

test('dist: ilk HTML\'de gerçek, açık ve tekrarsız ilan bağlantıları; uygun olmayan bölümde blok yok', { skip: !distVar }, () => {
  let blokSayisi = 0;
  let ilanliBolum = 0;
  for (const dosya of bolumDosyalari()) {
    const slug = dosya.replace(/\.html$/, '');
    const h = fs.readFileSync(path.join(DIST, 'bolum', dosya), 'utf8');
    const kok = h.slice(h.indexOf('<div id="root">'), h.lastIndexOf('</body>'));
    const blok = (kok.match(/<section class="sv-bolum-ilanlari"[\s\S]*?<\/section>/) || [])[0];
    if (!bolumIlanAlani(slug)) {
      assert.equal(blok, undefined, `${slug}: uygun olmayan bölümde blok var`);
      continue;
    }
    assert.ok(blok, `${slug}: blok yok`);
    blokSayisi++;
    assert.match(blok, /<h2 id="bolum-ilanlari-baslik">[^<]+ alanında açık staj ilanları<\/h2>/);
    const kartlar = [...blok.matchAll(/<a class="sv-kart-baslik" href="(\/ilan\/[^"]+)">([^<]+)<\/a>/g)];
    assert.ok(kartlar.length <= BOLUM_ILAN_ADEDI, `${slug}: ${kartlar.length} kart`);
    assert.equal(new Set(kartlar.map((k) => k[1])).size, kartlar.length, `${slug}: tekrar eden ilan`);
    if (kartlar.length === 0) {
      assert.match(blok, /Şu anda bu alanda açık staj ilanı yok\. <a href="\/staj-ilanlari">/, `${slug}: boş durum`);
      continue;
    }
    ilanliBolum++;
    assert.match(blok, /<a href="\/staj-ilanlari">Tüm staj ilanları →<\/a>/);
    for (const [, yol, baslik] of kartlar) {
      const ilanDosyasi = path.join(DIST, `${yol.slice(1)}.html`);
      assert.ok(fs.existsSync(ilanDosyasi), `${slug}: ${yol} sayfası yok`);
      const ilanHtml = fs.readFileSync(ilanDosyasi, 'utf8');
      assert.doesNotMatch(ilanHtml, /Başvuru dönemi kapandı/, `${slug}: kapanmış ilan ${yol}`);
      assert.doesNotMatch(ilanHtml, /<meta name="robots" content="[^"]*noindex/, `${slug}: dizin dışı ilan ${yol}`);
      const h1 = (ilanHtml.match(/<h1[^>]*>([^<]+)<\/h1>/) || [])[1];
      assert.equal(h1, baslik, `${slug}: kart başlığı ilanın başlığı değil`);
    }
    /* Tek H1, canonical kendisi, yapısal veriye JobPosting/ItemList girmedi. */
    assert.equal((kok.match(/<h1[\s>]/g) || []).length, 1);
    assert.match(h, new RegExp(`<link rel="canonical" href="https://stajimvar\\.com/bolum/${slug}" />`));
    assert.doesNotMatch(h, /"@type":"(JobPosting|ItemList)"/);
  }
  assert.ok(blokSayisi > 0 && ilanliBolum > 0, 'hiçbir bölümde ilan yok');
});

test('dist: yazılım bölümlerinde gelen ilanlar yazılım ilanı', { skip: !distVar }, () => {
  const h = fs.readFileSync(path.join(DIST, 'bolum', 'yazilim-muhendisligi.html'), 'utf8');
  const blok = h.match(/<section class="sv-bolum-ilanlari"[\s\S]*?<\/section>/)[0];
  for (const [, baslik] of blok.matchAll(/class="sv-kart-baslik" href="[^"]+">([^<]+)<\/a>/g)) {
    const metin = baslik.replace(/&amp;/g, '&');
    assert.ok(baslikAlaniSoyluyor(metin, 'bilisim-yazilim'), `yazılım dışı ilan: ${metin}`);
  }
  /* Kart bağlantısı istemcinin ilan adresi kuralıyla aynı biçimde. */
  assert.match(blok, /href="\/ilan\/[a-z0-9-]+-[0-9a-f]{8}"/);
  assert.equal(typeof ilanYolu, 'function');
});
