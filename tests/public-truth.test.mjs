import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/*
  PUBLIC TRUTH REGRESYONU

  Ürün ilerledi, kullanıcıya açık metinler yerinde kaldı. Ölçüldü:
  gizlilik ve KVKK sayfaları "özgeçmiş dosyası yükleyemezsiniz",
  "başvuru şirkete iletilmez" ve "hiçbir bilgi paylaşılmaz" diyordu —
  üçü de yayına girmiş özelliklerdi. Bu kozmetik bir tutarsızlık değil:
  kullanıcı, yapmadığımızı söylediğimiz bir veri işlemesine onay vermiş
  oluyordu.

  Bu testler o iddiaların geri gelmesini engelliyor. Ürün gerçekten
  değişirse (örneğin bir özellik kapatılırsa) buradaki kural da bilinçli
  olarak değiştirilmeli — sessizce kaymasın diye test var.
*/

const KOK = path.resolve(import.meta.dirname, '..');

/** Kullanıcıya görünen metin taşıyan kaynaklar. */
function metinDosyalari() {
  const bulunan = [];
  const gez = (dizin) => {
    for (const ad of readdirSync(dizin)) {
      const tam = path.join(dizin, ad);
      if (statSync(tam).isDirectory()) {
        if (ad === 'dev' || ad === 'node_modules') continue;
        gez(tam);
        continue;
      }
      if (/\.(tsx|ts|mjs)$/.test(ad) && !/\.test\./.test(ad)) bulunan.push(tam);
    }
  };
  gez(path.join(KOK, 'src'));
  return bulunan;
}

/** Yorum satırları hariç gövde: yorumda geçen bir iddia yayınlanmıyor. */
function kod(dosya) {
  return readFileSync(dosya, 'utf8')
    .split('\n')
    .filter((s) => {
      const t = s.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    .join('\n');
}

const DOSYALAR = metinDosyalari().map((d) => [d, kod(d)]);

function hicbirDosyadaGecmiyor(kalip, aciklama) {
  const bulunanlar = DOSYALAR.filter(([, govde]) => kalip.test(govde)).map(([d]) =>
    path.relative(KOK, d)
  );
  assert.deepEqual(bulunanlar, [], `${aciklama} — bulunduğu dosyalar: ${bulunanlar.join(', ')}`);
}

/* --------------------------------------------- A: CV yükleme iddiası */

test('A: "özgeçmiş yüklenemez" iddiası kalmadı', () => {
  hicbirDosyadaGecmiyor(
    /(özgeçmiş|CV)[^.\n]{0,40}(yükleyemezsiniz|yüklenemez|yükleme özelliği yoktur|dosyası tutmuyoruz)/i,
    'Profil CV yükleme yayında; "yükleyemezsiniz" demek yanlış'
  );
});

/* ------------------------------------- B: şirket ilan veremez iddiası */

test('B: "şirketler ilan veremez" iddiası kalmadı', () => {
  hicbirDosyadaGecmiyor(
    /şirketler[^.\n]{0,30}ilan[^.\n]{0,15}(veremez|açamaz)/i,
    'Doğrulanmış şirketler panelden ilan açıyor'
  );
});

/* ------------------------- C: "başvuru iletilmez" toptan iddiası */

test('C: başvurunun şirkete iletilmediğine dair toptan iddia kalmadı', () => {
  hicbirDosyadaGecmiyor(
    /başvuru(nuz|lar|su)?[^.\n]{0,40}şirkete[^.\n]{0,20}(iletilmez|gönderilmez|iletilmesi\s*<\/strong>?\s*henüz yoktur)/i,
    'StajımVar ilanlarında başvuru ilanı açan şirkete iletiliyor'
  );
});

test('C2: "tüm ilanlarda başvuru şirketin kendi sayfasında" iddiası kalmadı', () => {
  hicbirDosyadaGecmiyor(
    /tüm ilanlarda başvuru/i,
    'İki ilan modeli var; tek modelmiş gibi anlatılamaz'
  );
});

test('C3: "hiçbir şirketle paylaşılmaz" TOPTAN iddiası kalmadı', () => {
  /*
    Koşullu biçim doğru ve kalabilir: "sen izin vermeden hiçbir şirketle
    paylaşılmaz" gerçeği anlatıyor. Yasak olan koşulsuz hâli — çünkü
    öğrenci başvururken izin veriyor ve teklifi kabul ederse iletişim
    bilgileri açılıyor. İlk sürümde bu ayrım yoktu ve test doğru bir
    cümleyi yakalıyordu.
  */
  const koşulsuz = [];
  for (const [dosya, govde] of DOSYALAR) {
    const kalip = /hiçbir şirketle paylaşılmaz/gi;
    let m;
    while ((m = kalip.exec(govde)) !== null) {
      const once = govde.slice(Math.max(0, m.index - 90), m.index);
      if (!/(izin ver|onay|rıza)/i.test(once)) koşulsuz.push(path.relative(KOK, dosya));
    }
  }
  assert.deepEqual(
    koşulsuz,
    [],
    `Koşulsuz "paylaşılmaz" yanlış: başvuru izniyle paylaşılıyor — ${koşulsuz.join(', ')}`
  );
});

/* ------------------------------------- D: eski traction rakamları */

test('D: doğrulanamayan sabit traction rakamı yok', () => {
  hicbirDosyadaGecmiyor(
    /(12[.,]?500\+|850\+ (şirket|öğrenci)|2[.,]?400\+|binlerce (öğrenci|ilan|şirket))/i,
    'Sayılar veritabanından gelir; SEO metnine sabit rakam yazılmaz'
  );
});

/* --------------------------------- E: kapatma otomasyonu iddiası */

test('E: "otomatik düşürme tek bir kaynakta" iddiası kalmadı', () => {
  hicbirDosyadaGecmiyor(
    /otomatik düşürülmesi[^.\n]{0,30}tek bir kaynakta/i,
    'Kapatma birden çok kaynakta açık ve günlük bağlantı kontrolü de kapatıyor'
  );
});

/* ------------------------------------------ F: işveren SSS gerçek */

test('F: işveren SSS var ve ücret sorusunu cevaplıyor', async () => {
  const { ISVEREN_SSS } = await import('../src/data/isveren-sss.ts').catch(() => ({}));
  const ham = readFileSync(path.join(KOK, 'src/data/isveren-sss.ts'), 'utf8');
  const sayi = ISVEREN_SSS ? ISVEREN_SSS.length : (ham.match(/soru:/g) || []).length;
  assert.ok(sayi >= 6, `işveren SSS en az 6 madde olmalı, ${sayi} var`);
  assert.match(ham, /İlan vermek ücretli mi/);
  assert.match(ham, /iletişim bilgileri ne zaman/i);
});

test('F2: işveren SSS ön render ile aynı kaynaktan besleniyor', () => {
  const onrender = readFileSync(path.join(KOK, 'scripts/onrender.mjs'), 'utf8');
  assert.match(onrender, /isveren-sss/, 'SSS ön render kaynağı tek olmalı (gizleme yok)');
  assert.match(onrender, /FAQPage/);
});

/* --------------------------- G: yapısal veri başvuru modelini yansıtır */

test('G: JobPosting directApply ilana göre belirleniyor', () => {
  const onrender = readFileSync(path.join(KOK, 'scripts/onrender.mjs'), 'utf8');
  assert.doesNotMatch(
    onrender,
    /directApply:\s*false\s*,/,
    'Sabit false, StajımVar ilanlarında yanlış: başvuru sitede tamamlanıyor'
  );
  assert.match(onrender, /directApply:\s*i\.application_method/);
});

/* ------------------------------- H: dağıtım taze site haritası basıyor */

test('H: üretim dağıtımı sitemap üretiyor', () => {
  const dagitim = readFileSync(
    path.join(KOK, '.github/workflows/supabase-production.yml'),
    'utf8'
  );
  const sitemapIndex = dagitim.indexOf('sitemap.py');
  const buildIndex = dagitim.indexOf('npm run build', sitemapIndex);
  assert.ok(sitemapIndex > 0, 'dağıtım iş akışı site haritasını üretmeli');
  assert.ok(
    buildIndex > sitemapIndex,
    'harita derlemeden ÖNCE üretilmeli; sonra üretilirse dist içine girmez'
  );
});

test('H2: sitemap adımı gerçekten kurulabilen bir bağımlılık listesi kullanıyor', () => {
  /*
    İlk denemede `pip install requests` yazılmıştı ve betik
    `ModuleNotFoundError: dotenv` ile düştü. Adım continue-on-error
    olduğu için koşu yeşil göründü, bayat harita yeniden yayına girdi.
  */
  const dagitim = readFileSync(
    path.join(KOK, '.github/workflows/supabase-production.yml'),
    'utf8'
  );
  const blok = dagitim.slice(dagitim.indexOf('Sitemap üret'), dagitim.indexOf('npm run build', dagitim.indexOf('Sitemap üret')));
  const m = blok.match(/pip install -r ([\w.-]+)/);
  assert.ok(m, 'sitemap adımı bir gereksinim dosyası kurmalı');
  const gereksinim = readFileSync(path.join(KOK, 'automation', m[1]), 'utf8');
  for (const paket of ['python-dotenv', 'requests']) {
    assert.match(gereksinim, new RegExp(paket), `${m[1]} içinde ${paket} yok`);
  }
});

test('H3: keşfet etkinlikleri hem ön render hem site haritasında', () => {
  const onrender = readFileSync(path.join(KOK, 'scripts/onrender.mjs'), 'utf8');
  assert.match(onrender, /etkinlikleriGetir/, 'etkinlik detayları ön render edilmeli');
  assert.ok(onrender.includes("'@type': 'Event'"), 'Event yapısal verisi olmalı');
  const sitemap = readFileSync(path.join(KOK, 'automation/sitemap.py'), 'utf8');
  assert.match(sitemap, /discover_events/, 'etkinlikler site haritasına girmeli');
  assert.ok(sitemap.includes('("/kesfet"'), 'keşfet liste sayfası haritada olmalı');
});

test('H4: her sayfada tek canonical üretiliyor', () => {
  const onrender = readFileSync(path.join(KOK, 'scripts/onrender.mjs'), 'utf8');
  assert.match(onrender, /canonicalEtiketi/, 'canonical varsa değiştirilmeli, eklenmemeli');
  assert.ok(
    onrender.includes('rel="canonical"') && onrender.includes('.replace('),
    'mevcut canonical değiştirilerek yazılmalı'
  );
});

/* --------------------------------------- I: onay sürümü işlemeyle uyumlu */

test('I: KVKK onay sürümü CV ve başvuru öncesi sürümde kalmadı', () => {
  const auth = readFileSync(path.join(KOK, 'src/lib/auth.ts'), 'utf8');
  const m = auth.match(/KVKK_VERSION\s*=\s*'([^']+)'/);
  assert.ok(m, 'KVKK_VERSION bulunamadı');
  assert.notEqual(
    m[1],
    '2026-08-v1',
    'Özgeçmiş yükleme ve platform içi başvuru yayına girince sürüm artmalıydı'
  );
});


/* --------------- J: rehber iddiaları fazla kesin olmasın */

test('J: kaynaksız sayısal başarı oranı yok', () => {
  /*
    Ölçüldü: "yirmi başvurudan iki cevap gelirse iyi bir orandır" —
    kaynaksız bir oran, üstelik iki ayrı yerde tekrarlanıyordu. Öğrenci
    bunu bir ölçüt sanıp kendini kıyaslıyor.
  */
  hicbirDosyadaGecmiyor(
    /(yirmi|[0-9]+) başvurudan (iki|[0-9]+) cevap/i,
    'Kaynaksız başvuru/cevap oranı yazılmamalı'
  );
});

test('J2: ölçülmemiş üstünlük iddiası yok', () => {
  hicbirDosyadaGecmiyor(
    /staj bulmanın en çok işe yarayan yolu/i,
    'Yöntemler arasında ölçülmemiş üstünlük iddiası'
  );
});

test('J3: sigorta şablonu mutlak yükümlülük iddiası taşımıyor', () => {
  hicbirDosyadaGecmiyor(
    /sizden ek (bir )?yükümlülük gerekmiyor/i,
    'Zorunlu staj sigortası okul ve bölüme göre değişiyor; mutlak dil kullanılamaz'
  );
});


/* ------------- K: AdSense anlatımı gerçek yüzeyle uyumlu */

test('K: "ileride reklam açılırsa" iddiası kalmadı', () => {
  /*
    AdSense bugün entegre: betik her sayfada yükleniyor. Gizlilik metni
    hâlâ "ileride açılırsa" diyordu ve aynı sitenin çerez metniyle
    çelişiyordu.
  */
  hicbirDosyadaGecmiyor(
    /İleride reklam[^.]{0,40}(açılırsa|devreye girecek)/i,
    'AdSense entegre; "ileride" demek yanlış'
  );
});

test('K2: reklam yüzeyi metinde doğru anlatılıyor', () => {
  const yasal = readFileSync(path.join(KOK, 'src/components/LegalPage.tsx'), 'utf8');
  assert.match(yasal, /yalnızca öğrenci rehberlerinin bir bölümünde/);
  assert.match(yasal, /reklam birimi yok/);
});
