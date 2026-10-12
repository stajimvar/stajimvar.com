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

test('G: JobPosting directApply ilana göre belirleniyor', async () => {
  /*
    12 Ekim 2026: JobPosting ortak modülde (src/lib/seo/ilan-sayfasi.mjs);
    kaynak metne değil, ÜRETİLEN veriye bakılıyor. directApply başvurunun
    gerçek yolundan (lib/basvuru-yolu.mjs): sitede tamamlanan başvuru true,
    şirketin sayfasına giden başvuru false.
  */
  const { ilanJobPosting } = await import('../src/lib/seo/ilan-sayfasi.mjs');
  const temel = {
    id: '11111111-2222-3333-4444-555555555555',
    title: 'Yazılım Stajyeri',
    description: 'Ekiple birlikte web uygulaması geliştirme.',
    posted_at: '2026-10-01',
    city: 'İstanbul',
    country_code: 'TR',
    work_type: 'On-site',
    companies: { name: 'Örnek A.Ş.' },
  };
  const ic = ilanJobPosting({ ...temel, application_method: 'internal' }, (s) => s).veri;
  const dis = ilanJobPosting({ ...temel, application_method: 'external', apply_url: 'https://ornek.com/kariyer/123' }, (s) => s).veri;
  assert.equal(ic.directApply, true);
  assert.equal(dis.directApply, false);
});

/* ------------------------------- H: dağıtım taze site haritası basıyor */

test('H: üretim dağıtımı site haritasını derlemenin içinde, anonim anahtarla üretiyor', () => {
  /*
    12 Ekim 2026: harita artık `automation/sitemap.py` (servis anahtarı,
    continue-on-error) ile değil, derlemenin kendisinde üretiliyor; bayat
    bir depo kopyasının sessizce yayına girmesi mümkün değil.
  */
  const dagitim = readFileSync(path.join(KOK, '.github/workflows/supabase-production.yml'), 'utf8');
  const is = dagitim.slice(dagitim.indexOf('cloudflare_production:'));
  assert.doesNotMatch(is, /run:\s*\|?\s*\n?\s*(pip install[^\n]*\n\s*)?python sitemap\.py/, 'üretim işi sitemap.py koşmamalı');
  assert.doesNotMatch(is, /SUPABASE_SERVICE_ROLE_KEY/, 'üretim dağıtımı servis anahtarı taşımamalı');
  assert.doesNotMatch(is, /^\s*continue-on-error:/m, 'dağıtım adımları sessizce düşmemeli');
  const paket = JSON.parse(readFileSync(path.join(KOK, 'package.json'), 'utf8'));
  assert.match(paket.scripts.build, /onrender\.mjs && node scripts\/seo-kapisi\.mjs/);
  const onrender = readFileSync(path.join(KOK, 'scripts/onrender.mjs'), 'utf8');
  assert.match(onrender, /function siteHaritalariniYaz\(/);
});

test('H2: harita üretimi yalnız gerçekten yazılan sayfalardan', () => {
  const onrender = readFileSync(path.join(KOK, 'scripts/onrender.mjs'), 'utf8');
  const g = onrender.slice(onrender.indexOf('function siteHaritalariniYaz('));
  assert.match(g, /YAZILAN_ADRESLER/);
  assert.match(g, /bilgi\.dizinDisi \|\| HARITADAN_DISLANAN\.has\(yol\)/);
  assert.doesNotMatch(g, /new Date\(\)/, 'derleme günü lastmod olarak damgalanmamalı');
});

test("H3: keşfet kapandı — /kesfet ön renderda ve haritada yok, adresi /firsatlar'a 301", () => {
  /*
    ESKİ İDDİA: "keşfet etkinlikleri hem ön render hem site haritasında".
    Doğruydu — 11 Eylül 2026'ya kadar. O gün Keşfet (kültür etkinlikleri)
    navigasyondan kaldırıldı: 163 discover_events satırının hiçbiri
    kariyer etkinliği değildi (konser 57, festival 52, sergi 29, tiyatro
    19, atölye 5, müze 1), yani Fırsatlar'a taşınacak satır yoktu. Kayıt
    silinmedi, 20260926120000 ile 'archived' oldu.

    İDDİA TERSİNE ÇEVRİLDİ, GEVŞETİLMEDİ. Kapanan bir bölümün üç kanalı
    da aynı şeyi söylemeli: ön render statik sayfa yazmamalı, harita
    adresi bildirmemeli, adres kalıcı olarak yeni yerine gitmeli. Biri
    ötekinden ayrılırsa arama motoruna "bu sayfayı tara" derken sunucu
    301 döner — çelişkili sinyal, tam da testin yakalaması gereken şey.
  */
  const onrender = readFileSync(path.join(KOK, 'scripts/onrender.mjs'), 'utf8');
  assert.ok(
    !onrender.includes("['/kesfet',"),
    'kapanan bölüm için statik sayfa yazılmamalı: yönlendirmeyi gölgeler'
  );
  const sitemap = readFileSync(path.join(KOK, 'automation/sitemap.py'), 'utf8');
  assert.ok(
    !sitemap.includes('("/kesfet"'),
    'haritada yönlendirmeye giden adres olmaz'
  );

  const yonlendirme = readFileSync(path.join(KOK, 'public/_redirects'), 'utf8');
  assert.match(
    yonlendirme,
    /^\/kesfet[ \t]+\/firsatlar[ \t]+301/m,
    'paylaşılmış /kesfet bağlantısı boş ekrana değil Fırsatlar\'a inmeli'
  );
  assert.match(
    yonlendirme,
    /^\/kesfet\/\*[ \t]+\/firsatlar[ \t]+301/m,
    'arşivlenen tek tek etkinliklerin sayfası yok; onlar da aynı yere'
  );

  /*
    Yönlendirmenin HEDEFİ gerçekten üretiliyor mu: var olmayan bir
    adrese kalıcı yönlendirme, 404'ü bir adım öteye taşımaktan başka bir
    şey değil.
  */
  assert.ok(
    onrender.includes("['/firsatlar',") && sitemap.includes('("/firsatlar"'),
    '301 hedefi /firsatlar hem ön renderda hem haritada olmalı'
  );
});

test('H4: her sayfada tek canonical üretiliyor', async () => {
  const { sayfaHtml } = await import('../src/lib/seo/sayfa-html.mjs');
  const kabuk =
    '<html><head><title>x</title><meta name="description" content="" />' +
    '<link rel="canonical" href="https://stajimvar.com/" /></head><body><div id="root"></div></body></html>';
  const html = sayfaHtml(kabuk, '/rehber/ornek', { baslik: 'Örnek | StajımVar', aciklama: 'a', govde: '<main><h1>Örnek</h1></main>' });
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.match(html, /<link rel="canonical" href="https:\/\/stajimvar\.com\/rehber\/ornek" \/>/);
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
