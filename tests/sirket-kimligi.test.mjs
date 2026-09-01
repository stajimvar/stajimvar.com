import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  alanAdi,
  kayitAlani,
  kaliteKapisi,
  kanitlaEslestir,
  kanonikSirketler,
  indekslenebilirler,
  programKimligi,
} from '../src/lib/sirket-kimligi.mjs';

/*
  ŞİRKET KİMLİĞİ REGRESYONU

  Ölçülen gerçek: büyük işverenler dizinindeki 44 kurum ile `companies`
  tablosundaki şirketler AYRIK iki küme. Kariyer adresinin alan adı ile
  şirket kaydının site adresi karşılaştırıldı; eşleşme 0/44. Slug ve ad
  çakışması da yok.

  Bu testler asıl olarak şunu koruyor: benzer ADLAR birleşmesin. Yanlış
  birleştirme, iki farklı şirketin sayfasını tek kimlik altında toplar ve
  bunu geri almak zordur.
*/

const KOK = path.resolve(import.meta.dirname, '..');

const ASELSAN = {
  slug: 'aselsan',
  isveren: 'Aselsan',
  sektor: 'Savunma ve havacılık',
  kariyerUrl: 'https://www.aselsan.com/en/careers',
  ozet:
    'Savunma elektroniği üreticisi; radar, haberleşme ve elektro-optik sistemler ' +
    'geliştiriyor. Başvurular kendi kariyer sayfasından alınıyor.',
  bolumler: ['elektrik-elektronik-muhendisligi', 'bilgisayar-muhendisligi'],
  sonKontrol: '2026-08-25',
};

/* ------------------------------------------- A/B: alan adı kanıtı */

test('A: resmî alan adı eşleşince aynı kimlik', () => {
  const { eslesme, ambiguous } = kanitlaEslestir(ASELSAN, [
    { id: 'c1', name: 'Aselsan', slug: 'aselsan-db', website_url: 'https://aselsan.com' },
  ]);
  assert.equal(eslesme?.id, 'c1');
  assert.equal(ambiguous, false);
});

test('B: kariyer alt alan adı da kayıt alanına iniyor', () => {
  assert.equal(kayitAlani(alanAdi('https://careers.aselsan.com/tr')), 'aselsan.com');
  assert.equal(kayitAlani(alanAdi('https://www.roketsan.com.tr/kariyer')), 'roketsan.com.tr');
  const { eslesme } = kanitlaEslestir(
    { ...ASELSAN, kariyerUrl: 'https://careers.aselsan.com/tr' },
    [{ id: 'c2', name: 'Aselsan', slug: 'x', website_url: 'https://www.aselsan.com' }]
  );
  assert.equal(eslesme?.id, 'c2');
});

test('B2: ikinci seviye uzantı bütün şirketleri birbirine bağlamıyor', () => {
  const { eslesme } = kanitlaEslestir(
    { ...ASELSAN, kariyerUrl: 'https://www.tofas.com.tr/kariyer' },
    [{ id: 'c3', name: 'Başka', slug: 'baska', website_url: 'https://www.arcelik.com.tr' }]
  );
  assert.equal(eslesme, undefined, 'com.tr ortak diye eşleşmemeli');
});

/* ---------------------------- C: kanıtsız ad benzerliği birleştirmez */

test('C: benzer ad kanıt değil — birleştirme yok', () => {
  const { eslesme, ambiguous, evidence } = kanitlaEslestir(ASELSAN, [
    { id: 'c9', name: 'Aselsan Teknoloji A.Ş.', slug: 'aselsan-teknoloji', website_url: 'https://bambaska.com' },
  ]);
  assert.equal(eslesme, undefined);
  assert.equal(ambiguous, false);
  assert.ok(evidence.join(' ').includes('eşleşmesi yok'));
});

test('C2: aynı alan adına iki kayıt işaret ederse AMBIGUOUS', () => {
  const kimlik = programKimligi(ASELSAN, [
    { id: 'a', name: 'A', slug: 'a', website_url: 'https://aselsan.com' },
    { id: 'b', name: 'B', slug: 'b', website_url: 'https://www.aselsan.com/x' },
  ]);
  assert.equal(kimlik.sinif, 'AMBIGUOUS');
});

/* --------------------------------- D/E: kalite kapısı ve sınıflar */

test('D: dolu dizin kaydı geçerli sayfa üretir', () => {
  const k = programKimligi(ASELSAN, []);
  assert.equal(k.sinif, 'PROGRAM_ONLY_VERIFIED');
  assert.equal(k.careerUrl, ASELSAN.kariyerUrl);
  assert.deepEqual(k.departments, ASELSAN.bolumler);
  assert.equal(k.lastChecked, '2026-08-25');
});

test('E: eksik kayıt için sayfa açılmıyor', () => {
  const ince = programKimligi(
    { slug: 'x', isveren: 'X', kariyerUrl: 'https://x.com', ozet: 'Kısa.', bolumler: [] },
    []
  );
  assert.equal(ince.sinif, 'INSUFFICIENT_DATA');
  assert.ok(ince.evidence.some((e) => e.includes('açıklama')));

  const adressiz = programKimligi(
    { slug: 'y', isveren: 'Y', ozet: 'x'.repeat(80), bolumler: [] },
    []
  );
  assert.equal(adressiz.sinif, 'INSUFFICIENT_DATA');
});

test('E2: kalite kapısı boş kimliği geçirmiyor', () => {
  const { gecti, eksikler } = kaliteKapisi({ displayName: '', departments: [] });
  assert.equal(gecti, false);
  assert.ok(eksikler.length >= 2);
});

test('E3: ambiguous kayıt indekslenebilir listeye girmiyor', () => {
  const liste = indekslenebilirler([ASELSAN], [
    { id: 'a', name: 'A', slug: 'a', website_url: 'https://aselsan.com' },
    { id: 'b', name: 'B', slug: 'b', website_url: 'https://aselsan.com' },
  ]);
  assert.deepEqual(liste, []);
});

/* ------------------------ F/G: ilanlı ve ilansız şirket sayfası */

test('F/G: gerçek dizin ilansız da yararlı içerik taşıyor', () => {
  const onrender = readFileSync(path.join(KOK, 'scripts/onrender.mjs'), 'utf8');
  assert.match(onrender, /doğruladığımız açık staj ilanı bulunmuyor/);
  assert.match(onrender, /Resmî kariyer sayfası/);
  assert.match(onrender, /İlgili bölümler/);
  assert.match(onrender, /Başvuruya hazırlan/);
});

/* --------------------- H: dizin kaydı doğrulanmış işveren değildir */

test('H: dizin sayfasında doğrulama rozeti dili yok', () => {
  for (const dosya of ['scripts/onrender.mjs', 'src/components/IsverenKimlikSayfasi.tsx']) {
    const govde = readFileSync(path.join(KOK, dosya), 'utf8');
    const kod = govde
      .split('\n')
      .filter((s) => {
        const t = s.trim();
        return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
      })
      .join('\n');
    const blok = kod.includes('işveren hesabı yok') ? kod : '';
    assert.ok(blok, `${dosya}: hesabın olmadığı açıkça yazılmalı`);
    assert.doesNotMatch(blok, /doğrulanmış işveren/i, dosya);
  }
});

/* ------------------------------------------- I: bölüm bağları gerçek */

test('I: dizin kayıtlarının bölümleri gerçek bölüm slug\'ları', async () => {
  const bolumKaynak = readFileSync(path.join(KOK, 'src/data/bolumler.ts'), 'utf8');
  const gecerli = new Set([...bolumKaynak.matchAll(/^\s{4}slug: '([^']+)'/gm)].map((m) => m[1]));
  assert.ok(gecerli.size >= 30, `bölüm slug'ı okunamadı (${gecerli.size})`);

  const programKaynak = readFileSync(path.join(KOK, 'src/data/stajProgramlari.ts'), 'utf8');
  const bolumListeleri = [...programKaynak.matchAll(/bolumler: \[([^\]]*)\]/g)];
  const hatali = [];
  for (const m of bolumListeleri) {
    for (const s of [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])) {
      if (!gecerli.has(s)) hatali.push(s);
    }
  }
  assert.deepEqual([...new Set(hatali)], [], 'dizinde olmayan bölüm slug\'ı var');
});

/* ------------------------------- J/K/L: slug, canonical ve sitemap */

test('J: dizin slug\'ları benzersiz', () => {
  const kaynak = readFileSync(path.join(KOK, 'src/data/stajProgramlari.ts'), 'utf8');
  const sluglar = [...kaynak.matchAll(/^\s{4}slug: '([^']+)'/gm)].map((m) => m[1]);
  assert.equal(sluglar.length, new Set(sluglar).size, 'çift slug var');
});

test('J2: tabloda karşılığı olan slug ikinci kez yazılmıyor', () => {
  const onrender = readFileSync(path.join(KOK, 'scripts/onrender.mjs'), 'utf8');
  assert.match(onrender, /if \(sirketler\.has\(k\.slug\)\) continue;/);
  const sitemap = readFileSync(path.join(KOK, 'automation/sitemap.py'), 'utf8');
  assert.match(sitemap, /set\(program_sluglari\(\)\) - sirketler/);
});

test('L: dizin sayfaları site haritasına giriyor', () => {
  const sitemap = readFileSync(path.join(KOK, 'automation/sitemap.py'), 'utf8');
  assert.match(sitemap, /program_sluglari/);
});

/* ------------------------- M/N: sahte yapısal veri ve hukuki veri yok */

/** Yorum satırları çıkarılmış gövde: yorumda geçen ad yayınlanmıyor. */
function kodOlarak(metin) {
  return metin
    .split('\n')
    .filter((s) => {
      const t = s.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    .join('\n');
}

test('M: ilansız şirket sayfasında JobPosting üretilmiyor', () => {
  const onrender = readFileSync(path.join(KOK, 'scripts/onrender.mjs'), 'utf8');
  const blok = kodOlarak(
    onrender.slice(
      onrender.indexOf('büyük işveren sayfaları'),
      onrender.indexOf('---- ana sayfa ----')
    )
  );
  assert.ok(blok.length > 500, 'işveren bloğu bulunamadı');
  assert.doesNotMatch(blok, /JobPosting/, 'açık ilanı olmayan sayfada iş ilanı şeması olmamalı');
  assert.match(blok, /'@type': 'Organization'/);
});

test('N: Organization şemasında uydurma hukuki alan yok', () => {
  const onrender = readFileSync(path.join(KOK, 'scripts/onrender.mjs'), 'utf8');
  const blok = kodOlarak(
    onrender.slice(
      onrender.indexOf('büyük işveren sayfaları'),
      onrender.indexOf('---- ana sayfa ----')
    )
  );
  for (const yasak of ['legalName', 'address', 'numberOfEmployees', 'aggregateRating', 'taxID']) {
    assert.doesNotMatch(blok, new RegExp(yasak), `${yasak} uydurulmamalı`);
  }
});

/* -------------------------------------- gerçek veri üstünde sayım */

test('gerçek dizin: hepsi sınıflandırılmış ve gerekçeli', async () => {
  const kaynak = readFileSync(path.join(KOK, 'src/data/stajProgramlari.ts'), 'utf8');
  const adet = [...kaynak.matchAll(/^\s{4}slug: '([^']+)'/gm)].length;
  assert.ok(adet >= 40, `dizinde ${adet} kayıt var, beklenen 40+`);

  const hepsi = kanonikSirketler([ASELSAN], []);
  assert.equal(hepsi.length, 1);
  assert.ok(hepsi[0].evidence.length > 0, 'gerekçesiz sınıf yok');
});
