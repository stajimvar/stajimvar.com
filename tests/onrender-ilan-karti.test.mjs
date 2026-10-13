import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { basHarfler, paletSirasi, PALET_UZUNLUGU } from '../src/lib/logo-yedegi.mjs';

/*
  ÖN RENDER İLAN KARTI — GÖRSELLİ (14 Ekim 2026)

  JavaScript'siz ilk HTML'in kartları yalnız metindi; bağımsız okuyucular
  ve arama motorunun ilk okuması görselsiz bir liste görüyordu. Kart artık
  InternshipCard'ın iskeletinde: logo, başlık, şirket, şehir · çalışma
  şekli, "İlanı incele". Logo katalog verisinden; yoksa CompanyLogo'nun
  yedeği. Uydurma logo yok.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const r = oku('scripts/onrender.mjs');

test('logo yedeği React ile ortak: aynı harfler, aynı renk sırası', () => {
  assert.equal(basHarfler('Texas Instruments'), 'TI');
  assert.equal(basHarfler('Otis'), 'OT');
  assert.equal(basHarfler('İş Bankası'), 'İB');
  assert.equal(basHarfler(''), '?');
  assert.equal(basHarfler(null), '?');
  const s = paletSirasi('Haleon');
  assert.ok(Number.isInteger(s) && s >= 0 && s < PALET_UZUNLUGU);
  assert.equal(paletSirasi('Haleon'), s, 'kararlı');
  const logo = oku('src/components/CompanyLogo.tsx');
  assert.match(logo, /import \{ basHarfler, paletSirasi \} from '\.\.\/lib\/logo-yedegi\.mjs';/);
  assert.match(logo, /const initials = basHarfler;/);
  assert.match(logo, /const paletteIndex = paletSirasi;/);
  /* Palet ön render stillerinde de altı renk. */
  const html = oku('index.html');
  for (let i = 0; i < PALET_UZUNLUGU; i++) assert.match(html, new RegExp(`\\.sv-logo-p${i} \\{`));
});

test('logo kaynağı katalog verisi, yalnız güvenli adres; yoksa baş harf yedeği', () => {
  assert.match(r, /const adres = guvenliLogoAdresi\(\(i\.companies \|\| \{\}\)\.logo_url\);/);
  assert.match(r, /sv-logo sv-logo-yedek sv-logo-p\$\{paletSirasi\(sirket\)\}" role="img"/);
  assert.match(r, /\$\{kacir\(basHarfler\(sirket\)\)\}/);
});

test('logo ölçüsü sabit, alt metinli; ilk 3 hemen, kalanı tembel', () => {
  assert.match(r, /alt="\$\{kacir\(sirket \? `\$\{sirket\} logosu` : 'Şirket logosu'\)\}" width="80" height="80" /);
  assert.match(r, /const HEMEN_YUKLENEN_LOGO = 3;/);
  assert.match(r, /\(sira < HEMEN_YUKLENEN_LOGO \? 'loading="eager" ' : 'loading="lazy" '\)/);
  assert.match(r, /'decoding="async" \/>'/);
  const html = oku('index.html');
  assert.match(html, /\.sv-logo \{[\s\S]*?width: 80px;[\s\S]*?height: 80px;[\s\S]*?aspect-ratio: 1 \/ 1;/);
  assert.match(html, /\.sv-logo img \{[\s\S]*?object-fit: contain;/);
});

test('kart React kartının parçalarını taşıyor; çalışmayan kaydet düğmesi yok', () => {
  const blok = r.slice(r.indexOf('const gorunurIlanKartlari = (liste) =>'), r.indexOf('/* ---------------------------------------------- /staj-ilanlari ---- */'));
  assert.match(blok, /`<a class="sv-kart-baslik" href="\$\{yol\}">\$\{kacir\(i\.title\)\}<\/a>`/);
  assert.match(blok, /<span class="sv-kart-sirket">/);
  assert.match(blok, /i\.work_type \? calismaEtiketi\(i\.work_type\) : ''/);
  assert.match(blok, /<a class="sv-kart-incele" href="\$\{yol\}" aria-label="\$\{kacir\(`\$\{i\.title\} ilanını incele`\)\}">İlanı incele<\/a>/);
  assert.doesNotMatch(blok, /aydet|<button/);
  /* Ana sayfa ve /staj-ilanlari aynı yardımcı. */
  assert.match(r, /const ilanKartlari = gorunurIlanKartlari\(gorunurIlanlar\);/);
  assert.match(r, /gorunurIlanKartlari\(stajIlanlariKartlari\)/);
});

test('dist: kartlarda logo ya da yedek, alt metin, tek H1', () => {
  for (const ad of ['staj-ilanlari.html', 'index.html']) {
    const dosya = path.join(KOK, 'dist', ad);
    if (!existsSync(dosya)) return;
    const h = readFileSync(dosya, 'utf8');
    const govde = h.slice(h.indexOf('<div id="root">'), h.lastIndexOf('</body>'));
    const kart = (govde.match(/<li class="sv-kart">/g) || []).length;
    const logo = (govde.match(/<span class="sv-logo">/g) || []).length;
    const yedek = (govde.match(/sv-logo sv-logo-yedek/g) || []).length;
    assert.ok(kart > 0, `${ad}: kart yok`);
    assert.equal(logo + yedek, kart, `${ad}: her kartta logo ya da yedek olmalı`);
    for (const img of govde.match(/<img [^>]*>/g) || []) {
      assert.match(img, /alt="[^"]+"/, `${ad}: alt metinsiz logo`);
      assert.match(img, /width="80" height="80"/, `${ad}: ölçüsüz logo`);
      assert.match(img, /src="(https:\/\/|\/(?!\/))/, `${ad}: güvensiz logo adresi`);
    }
    assert.equal((govde.match(/<h1\b/g) || []).length, 1, `${ad}: tek h1`);
    assert.equal((govde.match(/class="sv-kart-incele"/g) || []).length, kart, `${ad}: her kartta İlanı incele`);
  }
});
