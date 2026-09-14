import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/*
  İLAN DETAYI — JobPosting DENETİMİ

  JobPosting zaten vardı ve düzgün kurulmuştu (159/159 sayfada). Denetim
  iki kusur buldu; bu testler ikisini de geri gelmekten koruyor.

  ALAN KAPSAMI (159 yayında ilan, gerçek sayım — 14 Eylül 2026):
    title 159 · description 159 (en kısa 140 karakter) · datePosted 159
    hiringOrganization 159 · jobLocation(şehir) 151 · validThrough 9
    is_paid=true 6 · stipend_text 3
  Ücret alanı EKLENEMEZ: veri yok, uydurulamaz.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const jobPostinglar = () => {
  const klasor = path.join(KOK, 'dist', 'ilan');
  if (!existsSync(klasor)) return null;
  const cikti = [];
  for (const ad of readdirSync(klasor).filter((f) => f.endsWith('.html'))) {
    const h = readFileSync(path.join(klasor, ad), 'utf8');
    const m = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!m) continue;
    let g;
    try {
      g = JSON.parse(m[1]);
    } catch {
      continue;
    }
    for (const n of g['@graph'] || [g]) {
      if (n['@type'] === 'JobPosting') cikti.push({ ad, jp: n, html: h });
    }
  }
  return cikti;
};

test('İÇİ BOŞ jobLocation basılmıyor', () => {
  /*
    Şehri olmayan ilanlarda şu blok çıkıyordu (159 sayfanın 7'sinde):
      {"@type":"Place","address":{"@type":"PostalAddress","addressCountry":"TR"}}
    "Bir yer var" diyor ama yerin kendisini söylemiyor. Şehir uydurmak
    yerine alan hiç yazılmıyor.

    TAKAS AÇIK: o ilanlar iş zengin sonucuna giremeyebilir. Eksik alanla
    da giremiyorlardı; fark, söylemediğimiz şeyi söylüyormuş gibi
    yapmamak.
  */
  const liste = jobPostinglar();
  if (!liste) return;

  for (const { ad, jp } of liste) {
    const jl = jp.jobLocation;
    if (!jl) continue;
    const yerel = (jl.address || {}).addressLocality;
    assert.ok(yerel, `${ad}: jobLocation var ama addressLocality yok`);
  }

  const betik = oku('scripts/onrender.mjs');
  assert.match(betik, /\.\.\.\(i\.city\s*\n?\s*\?\s*\{\s*\n?\s*jobLocation:/);
});

test('SÜRESİ GEÇMİŞ İLAN: sayfa kalıyor, kapandığı YAZIYOR, haritada yok', () => {
  /*
    Ölçüldü: "KEY+ Uzun Dönem Staj Programı" son başvurusu 2026-09-06,
    sekiz gün geçmiş, hâlâ published. Yapısal veri `validThrough` ile
    Google'a "kapandı" diyordu ama GÖRÜNÜR sayfada kapanışa dair tek
    kelime yoktu ve adres site haritasında bildiriliyordu. İşaretleme
    "kapandı", sayfa ve harita "açık" diyordu.

    Sayfa 404 YAPILMIYOR: Google kapanmış ilanın sayfasının kalmasını
    istiyor ve kullanıcıya da yararlı. Eksik olan, kapandığının
    söylenmesiydi.
  */
  const betik = oku('scripts/onrender.mjs');
  assert.match(betik, /const suresiGecti = Boolean\(/);
  assert.match(betik, /Başvuru dönemi kapandı\. Son başvuru: \$\{/);
  assert.match(betik, /'Durum: başvuru dönemi kapandı'/);
  /* Haritadan dışlanıyor ama sayfası yazılıyor. */
  assert.match(betik, /if \(suresiGecti\) HARITADAN_DISLANAN\.add\(yol\);/);
  assert.match(betik, /const HARITADAN_DISLANAN = new Set\(\);/);
  assert.match(
    betik,
    /aileninMi\(y\) && !HARITADAN_DISLANAN\.has\(y\)/,
  );

  /*
    Üretici de aynı kuralı uyguluyor. SEÇİM `application_deadline`
    TAŞIMAK ZORUNDA: taşımadığında süzgeç her kaydı "açık" sayıyor.
    Aynı sınıfta hata bu işte ÜÇ KEZ yaşandı (opportunity_type,
    countries, application_deadline).
  */
  const uretici = oku('automation/sitemap.py');
  assert.match(uretici, /def ilan_acik\(kayit: dict\) -> bool:/);
  assert.match(uretici, /"id,title,updated_at,application_deadline,companies\(slug\)"/);
});

test('kapanmış ilanın canlı çıktısı tutarlı', () => {
  const liste = jobPostinglar();
  if (!liste) return;
  const harita = path.join(KOK, 'dist', 'sitemap.xml');
  if (!existsSync(harita)) return;
  const xml = readFileSync(harita, 'utf8');
  const bugun = Date.now();

  for (const { ad, jp, html } of liste) {
    if (!jp.validThrough) continue;
    const bitis = new Date(`${String(jp.validThrough).slice(0, 10)}T23:59:59Z`).getTime();
    if (bitis >= bugun) continue;

    /* Görünür metinde kapandığı yazıyor. */
    const govde = html.slice(html.indexOf('<div id="root">'), html.indexOf('</body>'));
    assert.match(govde, /Başvuru dönemi kapandı/, `${ad}: kapanış görünür metinde yok`);
    /* Haritada bildirilmiyor. */
    const yol = `/ilan/${ad.replace(/\.html$/, '')}`;
    assert.ok(!xml.includes(`${yol}<`), `${ad}: süresi geçmiş ama haritada`);
  }
});
