/**
 * ÖN RENDER — tarayıcılar için gerçek HTML üretir.
 *
 * SORUN
 * -----
 * Site tek sayfa uygulaması. `curl https://stajimvar.com` ile alınan HTML'in
 * gövdesinde ÖLÇÜLDÜ: sıfır karakter görünür metin. İçeriğin tamamını
 * tarayıcıda JavaScript çiziyor.
 *
 * Googlebot JavaScript çalıştırabiliyor ama bunu ikinci bir turda, günler
 * sonra ve garantisiz yapıyor. Bir ilan sitesi için bu kabul edilemez:
 * ilan iki hafta sonra dizine girerse ilan çoktan kapanmış oluyor.
 *
 * ÇÖZÜM
 * -----
 * `vite build` bittikten sonra bu betik çalışıyor ve her adres için
 * dist/<yol>/index.html yazıyor. Dosyanın içinde:
 *   - sayfaya özgü <title>, açıklama, canonical, Open Graph
 *   - yapısal veri (ilanlarda JobPosting → Google for Jobs)
 *   - #root içinde GÖRÜNÜR metin: başlık, özet, ana bilgiler
 *
 * Cloudflare Pages önce gerçek dosyaya bakıyor; `_redirects` içindeki SPA
 * yedeği yalnızca dosya yoksa devreye giriyor. Yani bu dosyalar kazanıyor.
 *
 * GİZLEME (CLOAKING) YAPMIYORUZ
 * -----------------------------
 * Buraya basılan metin, React'in aynı sayfada çizdiği metnin aynısı.
 * Tarayıcıya bir şey, kullanıcıya başka bir şey göstermek Google'ın
 * yasakladığı bir davranış; o yüzden içerik uydurulmuyor, veritabanındaki
 * ve kayıtlardaki gerçek metin kullanılıyor.
 *
 * React `createRoot().render()` ile bağlanıyor (hydrate değil): açılışta
 * kabı temizleyip kendi ağacını kuruyor. Yani bu metin kullanıcı için
 * geçici bir ilk kare, tarayıcı için kalıcı içerik.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const kok = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const dist = path.join(kok, 'dist');
const SITE = 'https://stajimvar.com';

/* ------------------------------------------------------------------ yardımcı */

function envOku(anahtar) {
  if (process.env[anahtar]) return process.env[anahtar];
  for (const dosya of ['.env', path.join('automation', '.env')]) {
    const yol = path.join(kok, dosya);
    if (!fs.existsSync(yol)) continue;
    for (const satir of fs.readFileSync(yol, 'utf8').split(/\r?\n/)) {
      const e = satir.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (e && e[1] === anahtar) return e[2].replace(/^["']|["']$/g, '');
    }
  }
  return undefined;
}

const kacir = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Uzun metni arama sonucunda görünecek uzunluğa indirir. */
function ozetle(metin, uzunluk = 155) {
  const duz = String(metin ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (duz.length <= uzunluk) return duz;
  return duz.slice(0, uzunluk).replace(/\s+\S*$/, '') + '…';
}

/** src/lib/slug.ts ve automation/sitemap.py ile aynı kural. */
function slugla(metin) {
  const tablo = { İ: 'i', I: 'i', ı: 'i', Ğ: 'g', ğ: 'g', Ü: 'u', ü: 'u', Ş: 's', ş: 's', Ö: 'o', ö: 'o', Ç: 'c', ç: 'c' };
  return String(metin)
    .replace(/[İIıĞğÜüŞşÖöÇç]/g, (c) => tablo[c])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .replace(/-{2,}/g, '-');
}

/* ------------------------------------------------- kayıtlardan veri çıkarma */

/**
 * TypeScript kayıtlarından alan okur.
 *
 * Kayıtlar TS; Node onları doğrudan içe aktaramıyor (tip söz dizimi var).
 * sitemap.py'da da aynı yol izleniyor: girdiler düz bir dizi ve her alan
 * tek satırda, o yüzden düzenli ifade yeterli ve kırılgan değil.
 */
function kayittanOku(dosya, alanlar) {
  const yol = path.join(kok, 'src', 'data', dosya);
  if (!fs.existsSync(yol)) return [];
  const metin = fs.readFileSync(yol, 'utf8');
  const kayitlar = [];
  const slugKalibi = /^\s{4}slug: '([a-z0-9-]+)',$/gm;
  let e;
  while ((e = slugKalibi.exec(metin))) {
    const parca = metin.slice(e.index, e.index + 2400);
    const kayit = { slug: e[1] };
    for (const alan of alanlar) {
      // Tek satırlık ya da ' + ' ile bölünmüş çok satırlı dizeler
      const m = parca.match(new RegExp(`${alan}:\\s*((?:'(?:[^'\\\\]|\\\\.)*'\\s*\\+?\\s*)+)`, 's'));
      if (m) {
        kayit[alan] = m[1]
          .split(/'\s*\+\s*'/)
          .join('')
          .replace(/^'|'\s*$/g, '')
          .replace(/\\'/g, "'")
          .trim();
      }
    }
    kayitlar.push(kayit);
  }
  return kayitlar;
}

/* ------------------------------------------------------- Supabase'ten ilanlar */

async function ilanlariGetir() {
  const urlAdres = envOku('SUPABASE_URL') || envOku('VITE_SUPABASE_URL');
  const anahtar = envOku('SUPABASE_SERVICE_ROLE_KEY') || envOku('VITE_SUPABASE_ANON_KEY');
  if (!urlAdres || !anahtar) {
    console.log('  ilanlar atlandı (Supabase bilgisi yok)');
    return [];
  }
  const secim =
    'id,title,description,city,work_type,apply_url,posted_at,created_at,application_deadline,is_paid,stipend_text,companies(name,slug,website_url,logo_url)';
  const istek = `${urlAdres}/rest/v1/listings?status=eq.published&select=${encodeURIComponent(secim)}`;
  const yanit = await fetch(istek, {
    headers: { apikey: anahtar, Authorization: `Bearer ${anahtar}` },
  });
  if (!yanit.ok) {
    console.log(`  ilanlar alınamadı: HTTP ${yanit.status}`);
    return [];
  }
  return yanit.json();
}

/* --------------------------------------------------------------- HTML üretimi */

const kabuk = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

/**
 * Tek bir sayfanın HTML'ini yazar.
 *
 * @param {string} yol       "/bolum/mimarlik" gibi
 * @param {object} s         { baslik, aciklama, govde, jsonLd }
 */
function sayfaYaz(yol, s) {
  let html = kabuk;
  const tamAdres = SITE + yol;

  // <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${kacir(s.baslik)}</title>`);

  // description + Open Graph
  html = html.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${kacir(s.aciklama)}" />`
  );
  html = html.replace(
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${kacir(s.baslik)}" />`
  );
  html = html.replace(
    /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${kacir(s.aciklama)}" />`
  );

  // canonical + og:url — hiç yoktu
  html = html.replace(
    '</head>',
    `  <link rel="canonical" href="${tamAdres}" />\n` +
      `    <meta property="og:url" content="${tamAdres}" />\n` +
      (s.jsonLd
        ? `    <script type="application/ld+json">${JSON.stringify(s.jsonLd)}</script>\n`
        : '') +
      '  </head>'
  );

  // #root içine görünür metin
  html = html.replace(
    /<div id="root">\s*<\/div>/,
    `<div id="root">${s.govde}</div>`
  );

  /*
    DOSYA ADI: <yol>.html — <yol>/index.html DEĞİL.

    Önce dizin + index.html olarak yazılıyordu. Cloudflare Pages bu durumda
    "/bolum/mimarlik" isteğini "/bolum/mimarlik/" adresine 308 ile
    yönlendiriyor (ölçüldü). Ama site haritamız ve canonical etiketimiz
    eğik çizgisiz sürümü gösteriyor; yani tarayıcıya "asıl adres bu" deyip
    o adreste yönlendirme veriyorduk. Bu çelişki taramayı zayıflatıyor.

    Uzantılı dosya yazılınca Pages "/bolum/mimarlik" isteğine doğrudan 200
    dönüyor, yönlendirme olmuyor. Kök sayfa istisna: o index.html kalmalı.
  */
  if (yol === '/') {
    fs.writeFileSync(path.join(dist, 'index.html'), html, 'utf8');
  } else {
    const hedef = path.join(dist, yol.replace(/^\//, '') + '.html');
    fs.mkdirSync(path.dirname(hedef), { recursive: true });
    fs.writeFileSync(hedef, html, 'utf8');
  }
}

/** Ön render gövdesi: başlık + özet + isteğe bağlı ek satırlar. */
function govde(baslik, ozet, satirlar = []) {
  return (
    `<main><h1>${kacir(baslik)}</h1><p>${kacir(ozet)}</p>` +
    (satirlar.length ? `<ul>${satirlar.map((x) => `<li>${kacir(x)}</li>`).join('')}</ul>` : '') +
    '</main>'
  );
}

/* --------------------------------------------------------------------- akış */

async function main() {
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.error('dist/index.html yok — önce `vite build` çalışmalı');
    process.exit(1);
  }

  let sayac = 0;

  /* ---- ana sayfa: Organization + WebSite ---- */
  sayfaYaz('/', {
    baslik: 'StajımVar — Şirketlerin staj ilanları, tek listede',
    aciklama:
      "Türkiye'deki staj ilanlarını şirketlerin kendi kariyer sayfalarından derliyoruz. " +
      'Her ilanda şirketin kendi başvuru bağlantısı var.',
    govde: govde(
      'Şirketlerin staj ilanları, tek listede',
      'Sekiz ayrı kariyer sayfasını tek tek gezme. İlanları aracı sitelerden değil, ' +
        'şirketlerin kendi kariyer sayfalarından derliyoruz; her ilanda şirketin kendi ' +
        'başvuru bağlantısı var.'
    ),
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          name: 'StajımVar',
          url: SITE,
          logo: `${SITE}/icon-512.png`,
        },
        {
          '@type': 'WebSite',
          name: 'StajımVar',
          url: SITE,
          inLanguage: 'tr-TR',
        },
      ],
    },
  });
  sayac++;

  /* ---- bölümler ---- */
  const bolumler = kayittanOku('bolumler.ts', ['ad', 'ozet', 'aciklama']);
  for (const b of bolumler) {
    sayfaYaz(`/bolum/${b.slug}`, {
      baslik: `${b.ad} stajı | StajımVar`,
      aciklama: ozetle(b.aciklama || b.ozet),
      govde: govde(`${b.ad} stajı`, b.ozet || ''),
    });
    sayac++;
  }

  /* ---- rehberler ---- */
  const rehberler = kayittanOku('rehberler.tsx', ['baslik', 'ozet', 'aciklama']);
  for (const r of rehberler) {
    sayfaYaz(`/rehber/${r.slug}`, {
      baslik: `${r.baslik} | StajımVar`,
      aciklama: ozetle(r.aciklama || r.ozet),
      govde: govde(r.baslik, r.ozet || ''),
    });
    sayac++;
  }

  /* ---- sabit sayfalar ---- */
  const sabitler = [
    ['/rehber', 'Staj rehberi | StajımVar', 'Belgeler, sigorta, CV, mülakat — staj sürecinin bilinmeyen kısımları sırayla.', 'Staj, işini bilene kolay.'],
    ['/bolumler', 'Bölüme göre staj rehberi | StajımVar', `${bolumler.length} bölüm için: staj nerede yapılır, stajyer ne iş yapar, ne öğrenmeli.`, 'Bölüme göre staj'],
    ['/araclar', 'Hesaplama araçları | StajımVar', 'Net hesaplama, YKS sıralama tahmini, staj ücreti ve staj günü hesaplama.', 'Hesaplama araçları'],
    ['/araclar/net-hesaplama', 'Net hesaplama (TYT, AYT, KPSS) | StajımVar', 'Doğru ve yanlış sayını gir, netini gör. TYT, AYT ve KPSS için.', 'Net hesaplama'],
    ['/araclar/siralama-tahmini', 'YKS sıralama tahmini | StajımVar', 'Puanın 2025 ÖSYM verilerine göre kaçıncı sıraya denk geliyor?', 'Sıralama tahmini'],
    ['/araclar/staj-ucreti-hesaplama', 'Staj ücreti hesaplama | StajımVar', '3308 sayılı kanuna göre stajyere en az ne kadar ödenmesi gerektiğini hesapla.', 'Staj ücreti hesaplama'],
    ['/araclar/staj-gunu-hesaplama', 'Staj günü hesaplama | StajımVar', '20 veya 30 iş günü staj hangi tarihte biter? Resmî tatiller düşülerek.', 'Staj günü hesaplama'],
    ['/isveren', 'Stajyer nasıl alınır? İşveren rehberi | StajımVar', 'Sigorta kimde, ücret zorunlu mu, okulla hangi evrak imzalanır — sırayla.', 'Stajyer almak sandığınızdan kolay.'],
  ];
  for (const [yol, baslik, aciklama, h1] of sabitler) {
    sayfaYaz(yol, { baslik, aciklama, govde: govde(h1, aciklama) });
    sayac++;
  }

  /* ---- ilanlar: JobPosting ---- */
  const ilanlar = await ilanlariGetir();
  for (const i of ilanlar) {
    const sirket = i.companies || {};
    const onek = String(i.id).split('-')[0];
    const yol = `/ilan/${slugla(i.title)}-${onek}`;
    const ozet = ozetle(i.description, 155);

    /*
      JobPosting — Google for Jobs uygunluğu.

      DİKKAT: uydurma alan yazılmıyor. `validThrough` ancak veritabanında
      gerçek bir son başvuru tarihi varsa ekleniyor; Google süresi geçmiş
      veya yanlış tarihli ilanları cezalandırıyor. `directApply` de yok:
      başvuru şirketin kendi sayfasında tamamlanıyor, bizde değil.
    */
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: i.title,
      description: `<p>${kacir(ozetle(i.description, 1200))}</p>`,
      datePosted: (i.posted_at || i.created_at || '').slice(0, 10),
      employmentType: 'INTERN',
      hiringOrganization: {
        '@type': 'Organization',
        name: sirket.name || 'Bilinmiyor',
        ...(sirket.website_url ? { sameAs: sirket.website_url } : {}),
        ...(sirket.logo_url ? { logo: sirket.logo_url } : {}),
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          ...(i.city ? { addressLocality: i.city } : {}),
          addressCountry: 'TR',
        },
      },
      ...(i.application_deadline ? { validThrough: i.application_deadline } : {}),
      ...(i.work_type === 'Remote' ? { jobLocationType: 'TELECOMMUTE' } : {}),
    };

    sayfaYaz(yol, {
      baslik: `${i.title}${sirket.name ? ' — ' + sirket.name : ''} | StajımVar`,
      aciklama: ozet,
      govde: govde(
        i.title,
        ozet,
        [
          sirket.name && `Şirket: ${sirket.name}`,
          i.city && `Şehir: ${i.city}`,
          i.work_type && `Çalışma şekli: ${i.work_type}`,
        ].filter(Boolean)
      ),
      jsonLd,
    });
    sayac++;
  }

  console.log(
    `ön render: ${sayac} sayfa yazıldı ` +
      `(${bolumler.length} bölüm, ${rehberler.length} rehber, ${ilanlar.length} ilan)`
  );
}

main().catch((e) => {
  console.error('ön render başarısız:', e);
  process.exit(1);
});
