import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { firsatInceMi, seritFirsatlari, SERIT_ADEDI, ANASAYFA_BOLUMLERI } from '../src/lib/anasayfa-baglantilari.mjs';
import { LOGOSU_OLMAYAN_ISVERENLER, isverenLogoAdresi } from '../src/lib/isveren-logolari.mjs';
import { konumEtiketi, ilanKonumEtiketi } from '../src/lib/sehir.ts';

/*
  ANA SAYFA SEO BAĞLANTILARI VE VERİ KALİTESİ (14 Ekim 2026)

  1) Fırsat şeridinin 8 bağlantısının 8'i noindex sayfaya gidiyordu.
  2) Ana sayfadan bölüm sayfalarına JavaScript'siz bağlantı yoktu.
  3) Insider One kartında ham "Turkey" yazıyordu; iki işverenin logosu 404.
  Kurallar ön render ve uygulamada ortak; burada sahte verilerle, kaynakta
  ve (varsa) derleme çıktısında sınanıyor. Noindex, canonical, harita ve
  robots kuralları değişmedi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const kodu = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

/* ---------------------------------------------------------- fırsat şeridi */

const firsat = (slug, ek = {}) => ({
  slug,
  title: slug,
  status: 'published',
  application_deadline: null,
  description: 'Ayrıntılı açıklama.',
  eligibility: '',
  ...ek,
});

test('ince fırsat kuralı ön render\'ın noindex koşuluyla aynı; noindex kuralı değişmedi', () => {
  const r = oku('scripts/onrender.mjs');
  assert.match(r, /const firsatInce = !duzMetin\(f\.description\) && !duzMetin\(f\.eligibility\);/);
  assert.match(r, /dizinDisi: firsatInce,/);
  assert.equal(firsatInceMi({ description: '', eligibility: '' }), true);
  assert.equal(firsatInceMi({ description: '<p> </p>', eligibility: null }), true);
  assert.equal(firsatInceMi({ description: '', eligibility: 'Lisans öğrencileri' }), false);
  assert.equal(firsatInceMi({ description: 'Burs', eligibility: '' }), false);
});

test('şerit yalnız dizine açık, güncel ve yayındaki fırsatlar; ince olanla doldurulmuyor', () => {
  const bugun = '2026-10-14';
  const liste = [
    firsat('ince', { description: '', eligibility: '' }),
    firsat('dun-bitti', { application_deadline: '2026-10-13' }),
    firsat('bugun-son', { application_deadline: '2026-10-14T00:00:00Z' }),
    firsat('taslak', { status: 'draft' }),
    firsat('', {}),
    firsat('tarihsiz'),
    firsat('yakin', { application_deadline: '2026-10-20' }),
  ];
  assert.deepEqual(seritFirsatlari(liste, bugun).map((f) => f.slug), ['bugun-son', 'yakin', 'tarihsiz']);
  /* Uygun fırsat yoksa şerit boş — noindex sayfayla doldurulmuyor. */
  assert.deepEqual(seritFirsatlari([firsat('a', { description: '' }), firsat('b', { description: '' })], bugun), []);
  /* En çok 8; uygulamanın camelCase biçimi de okunuyor. */
  const cok = Array.from({ length: 12 }, (_, n) => ({ slug: `f${n}`, description: 'x', applicationDeadline: `2026-11-${String(n + 10)}` }));
  assert.equal(SERIT_ADEDI, 8);
  assert.deepEqual(seritFirsatlari(cok, bugun).map((f) => f.slug), ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7']);
  /*
    Eşit tarihte (canlıda 11 fırsatın 11'i tarihsiz) sıra gelen sıraya
    bağlı OLMAMALI: ilk HTML ile uygulama aynı 8'i göstersin.
  */
  const tarihsiz = ['c', 'a', 'b'].map((s) => firsat(s));
  assert.deepEqual(seritFirsatlari(tarihsiz, bugun).map((f) => f.slug), ['a', 'b', 'c']);
  assert.deepEqual(seritFirsatlari([...tarihsiz].reverse(), bugun).map((f) => f.slug), ['a', 'b', 'c']);
});

test('ön render ve uygulama şeridi ortak kuralı kullanıyor; uygulamada gerçek bağlantılar', () => {
  const r = oku('scripts/onrender.mjs');
  assert.match(r, /const seritFirsatlari = seritFirsatlariSec\(firsatlar, bugunFirsat\);/);
  const bilesen = kodu(oku('src/components/OpportunitiesHomeSection.tsx'));
  assert.match(bilesen, /const dizinde = seritFirsatlari\(all, istanbulBugun\(\), all\.length\);/);
  assert.match(bilesen, /return \{ items: dizinde\.slice\(0, SERIT_ADEDI\), kisisel: false \};/);
  assert.match(bilesen, /const uygun = dizinde\.filter/);
  assert.match(bilesen, /href=\{`\/firsatlar\/\$\{item\.slug\}`\}/);
  assert.match(bilesen, /href="\/firsatlar"/);
  assert.doesNotMatch(bilesen, /<button/);
});

/* ------------------------------------------------------ bölüm bağlantıları */

test('ana sayfa bölüm bağlantıları var olan bölümlere gidiyor; ön render ve uygulama aynı liste', () => {
  const bolumler = oku('src/data/bolumler.ts');
  assert.ok(ANASAYFA_BOLUMLERI.length >= 8 && ANASAYFA_BOLUMLERI.length <= 12);
  for (const [slug, ad] of ANASAYFA_BOLUMLERI) {
    const m = bolumler.match(new RegExp(`slug: '${slug}',[\\s\\S]{0,200}?ad: '([^']+)'`));
    assert.ok(m, `${slug}: bölüm verisinde yok`);
    assert.ok(m[1].startsWith(ad), `${slug}: etiket bölüm adıyla uyuşmuyor (${m[1]})`);
  }
  for (const zorunlu of ['yazilim-muhendisligi', 'bilgisayar-muhendisligi', 'makine-muhendisligi']) {
    assert.ok(ANASAYFA_BOLUMLERI.some(([s]) => s === zorunlu), zorunlu);
  }
  const r = oku('scripts/onrender.mjs');
  assert.match(r, /ANASAYFA_BOLUMLERI\.map\(\(\[slug, ad\]\) => `<li><a href="\/bolum\/\$\{slug\}">\$\{kacir\(ad\)\}<\/a><\/li>`\)/);
  assert.match(r, /firsatSeridi \+\s*bolumBaglantilari \+\s*anaSayfaNav \+/);
  const bilesen = oku('src/components/AnaSayfaBolumleri.tsx');
  assert.match(bilesen, /ANASAYFA_BOLUMLERI\.map\(\(\[slug, ad\]\) =>/);
  assert.match(bilesen, /href=\{`\/bolum\/\$\{slug\}`\}/);
  assert.match(bilesen, /flex flex-wrap/);
  const app = oku('src/App.tsx');
  assert.match(app, /\{!stajIlanlariAdresi && <AnaSayfaBolumleri onNavigate=\{navigate\} \/>\}/);
  assert.match(oku('index.html'), /\.sv-bolum-baglantilari ul \{[\s\S]*?flex-wrap: wrap;/);
});

/* -------------------------------------------------------- konum etiketi */

test('konum: ülke adı şehir gibi basılmıyor; normalize il/ilçe önce', () => {
  assert.equal(konumEtiketi('Turkey'), 'Türkiye');
  assert.equal(konumEtiketi('Türkiye'), 'Türkiye');
  assert.equal(konumEtiketi('Germany'), 'Almanya');
  assert.equal(konumEtiketi('Turkey - Istanbul'), 'İstanbul');
  assert.equal(konumEtiketi('Istanbul'), 'İstanbul');
  assert.equal(konumEtiketi('Paris'), 'Paris');
  assert.equal(konumEtiketi(null), 'Konum belirtilmemiş');
  /* Insider One: il yok, şehir alanında yalnız ülke. */
  assert.equal(ilanKonumEtiketi({ il: null, ilce: null, city: 'Turkey' }), 'Türkiye');
  assert.equal(ilanKonumEtiketi({ il: 'İstanbul', city: 'Turkey - Istanbul' }), 'İstanbul');
  assert.equal(ilanKonumEtiketi({ il: 'İstanbul', ilce: 'Şişli', city: 'Istanbul' }), 'Şişli, İstanbul');
  assert.equal(ilanKonumEtiketi({ il: 'İstanbul', city: 'Zincirlikuyu, Istanbul' }), 'Zincirlikuyu, İstanbul');
  /* Ham metin başka bir ili gösteriyorsa doğrulanmış il esas. */
  assert.equal(ilanKonumEtiketi({ il: 'Kocaeli', city: 'Istanbul' }), 'Kocaeli');
  assert.equal(ilanKonumEtiketi({ city: 'Berlin' }), 'Berlin');
});

test('konum: bütün ilan kartları ve ilan ekranları aynı yardımcıdan', () => {
  for (const dosya of ['src/components/InternshipCard.tsx', 'src/components/InternshipDetailModal.tsx', 'src/components/ListingPage.tsx']) {
    const k = kodu(oku(dosya));
    assert.match(k, /ilanKonumEtiketi\(listing\)/, dosya);
    assert.doesNotMatch(k, /konumEtiketi\(listing\.city\)/, dosya);
  }
  assert.match(oku('scripts/onrender.mjs'), /konum: \(i\) => \(i\.il \|\| i\.city \? ilanKonumEtiketi\(i\) : ''\),/);
  /* Uygulamadaki sade kart da (bölüm ve şehir sayfası) aynı yardımcıyı kullanıyor. */
  assert.match(kodu(oku('src/components/SadeIlanKarti.tsx')), /ilan\.il \|\| ilan\.city \? ilanKonumEtiketi\(ilan\) : ''/);
});

/* ---------------------------------------------------------- işveren logoları */

test('işveren logosu: dosyası olmayan küme klasörle birebir; görsel yalnız dosya varsa', () => {
  const veri = oku('src/data/stajProgramlari.ts');
  const sluglar = [...veri.matchAll(/^\s{4}slug: '([a-z0-9-]+)'/gm)].map((m) => m[1]);
  assert.ok(sluglar.length > 40);
  const eksik = sluglar.filter((s) => !fs.existsSync(path.join(KOK, 'public', 'isveren-logolari', `${s}.png`)));
  assert.deepEqual([...LOGOSU_OLMAYAN_ISVERENLER].sort(), eksik.sort(), 'logo eklendiyse ya da silindiyse küme güncellenmeli');
  assert.equal(isverenLogoAdresi('roketsan'), null);
  assert.equal(isverenLogoAdresi('aselsan'), '/isveren-logolari/aselsan.png');
  for (const dosya of ['src/components/BolumIcerik.tsx', 'src/components/StajProgramlari.tsx']) {
    const k = kodu(oku(dosya));
    assert.match(k, /isverenLogoAdresi\(/, dosya);
    assert.doesNotMatch(k, /isveren-logolari\/\$\{/, `${dosya}: logo adresi hâlâ varsayılıyor`);
  }
});

/* ------------------------------------------------------------------ dist */

const DIST = path.join(KOK, 'dist');
const distVar = fs.existsSync(path.join(DIST, 'index.html')) && fs.existsSync(path.join(DIST, 'bolum'));
const distOku = (p) => fs.readFileSync(path.join(DIST, p), 'utf8');
const govde = (h) => h.slice(h.indexOf('<div id="root">'), h.lastIndexOf('</body>')).replace(/<script[\s\S]*?<\/script>/g, '');
const noindexMi = (h) => /<meta name="robots" content="[^"]*noindex/.test(h);

test('dist: ana sayfa şeridi yalnız dizine açık fırsatlara, bölüm bağlantıları dizine açık bölümlere gidiyor', { skip: !distVar }, () => {
  const ana = govde(distOku('index.html'));
  const serit = (ana.match(/<section class="sv-firsatlar"[\s\S]*?<\/section>/) || [''])[0];
  const firsatlar = [...serit.matchAll(/href="(\/firsatlar\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(firsatlar.length <= SERIT_ADEDI);
  for (const y of firsatlar) {
    const dosya = `${y.slice(1)}.html`;
    assert.ok(fs.existsSync(path.join(DIST, dosya)), `${y}: sayfa yok`);
    const h = distOku(dosya);
    assert.ok(!noindexMi(h), `${y}: şeritte noindex fırsat`);
    assert.doesNotMatch(h, /Başvuru dönemi kapandı/, `${y}: süresi geçmiş`);
  }
  const nav = (ana.match(/<nav class="sv-bolum-baglantilari"[\s\S]*?<\/nav>/) || [''])[0];
  const bolumler = [...nav.matchAll(/href="(\/bolum\/[^"]+)"/g)].map((m) => m[1]);
  assert.equal(bolumler.length, ANASAYFA_BOLUMLERI.length);
  for (const y of bolumler) {
    const h = distOku(`${y.slice(1)}.html`);
    assert.ok(!noindexMi(h), `${y}: noindex`);
    assert.match(h, new RegExp(`<link rel="canonical" href="https://stajimvar\\.com${y}" />`));
  }
  assert.match(nav, /<a href="\/bolumler">Tüm bölümler →<\/a>/);
  assert.equal((ana.match(/<h1\b/g) || []).length, 1);
});

test('dist: ilan kartlarında ülke adı şehir gibi yok; işveren satırında kırık logo yok', { skip: !distVar }, () => {
  const sayfalar = ['index.html', 'staj-ilanlari.html', ...fs.readdirSync(path.join(DIST, 'staj-ilanlari', 'sayfa')).map((f) => `staj-ilanlari/sayfa/${f}`)];
  for (const s of sayfalar) {
    assert.doesNotMatch(govde(distOku(s)), /class="sv-kart-konum">(?:<svg[\s\S]*?<\/svg>)?(Turkey|Germany|France)\b/, s);
  }
  for (const s of ['bolum/makine-muhendisligi.html', 'staj-programlari.html']) {
    assert.doesNotMatch(govde(distOku(s)), /isveren-logolari\/(roketsan|coca-cola-icecek)\.png/, s);
  }
  for (const f of fs.readdirSync(path.join(DIST, 'bolum'))) {
    for (const [, slug] of govde(distOku(`bolum/${f}`)).matchAll(/src="\/isveren-logolari\/([a-z0-9-]+)\.png"/g)) {
      assert.ok(fs.existsSync(path.join(KOK, 'public', 'isveren-logolari', `${slug}.png`)), `${f}: ${slug}.png yok`);
    }
  }
});
