/**
 * Rehber kapaklarını ÜRETİR (fotoğraf indirmez).
 *
 * NEDEN ÜRETİM, STOK FOTOĞRAF DEĞİL
 * ---------------------------------
 * Elli dokuz yeni rehber için açık lisanslı havuzlar tarandı ve ölçüldü:
 * CC0 havuzunda konuya uyan modern fotoğraf çok az. "job interview"
 * sorgusuna tekne gezisi, "rental contract" sorgusuna çivi yazılı tablet
 * geliyor. Yetmiş kartın yarısı alakasız fotoğrafla dolduğunda ızgara
 * "stok görsel" hissi veriyor ve güven düşüyor.
 *
 * Üretilen kapak üç şeyi birden veriyor: konuya gerçekten uyan bir simge,
 * kategoriye göre tutarlı bir renk dili ve altı koyu biten bir kompozisyon —
 * yani kartın üzerindeki başlık her zaman okunuyor.
 *
 * KURALLAR
 * --------
 *   - Görselin İÇİNDE yazı YOK. Başlık zaten kartın üzerinde duruyor;
 *     ikisi üst üste binerse ikisi de okunmuyor.
 *   - Alt üçte bir SAKİN ve KOYU. Kartın kendi siyah geçişi oraya iniyor.
 *   - Kategori rengi sabit: kullanıcı ızgarada konuyu renkten tanıyor.
 *   - Aynı kategorideki iki kapak birbirinin aynısı olmasın diye desen
 *     slug'dan türeyen bir sayıya bağlı — ama rastgele değil, deterministik:
 *     aynı slug her çalıştırmada aynı kapağı üretiyor.
 *
 * ÇIKTI
 * -----
 * WebP ve AVIF. Kart `<picture>` ile önce AVIF'i, sonra WebP'yi deniyor.
 * Mevcut on bir FOTOĞRAF kapağa dokunulmuyor: onların .jpg dosyaları
 * yerinde kalıyor, yalnızca aynı görselin webp/avif kopyası üretiliyor ki
 * işaretleme bütün kartlarda aynı olsun.
 *
 * Kullanım:
 *   node scripts/rehber-kapaklari.mjs               # üretilecek olanların hepsi
 *   node scripts/rehber-kapaklari.mjs --ornek       # kategori başına 2 örnek
 *   node scripts/rehber-kapaklari.mjs slug1 slug2   # seçili slug'lar
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as Lucide from 'lucide-react';
import sharp from 'sharp';

const KOK = path.resolve(import.meta.dirname, '..');
const HEDEF = path.join(KOK, 'public', 'rehber-gorselleri');
const BOY = 720;

/* Kartın kendisi kare (aspect-square); kapak da kare üretiliyor. */

/**
 * Kategori renkleri.
 *
 * Ton sırası: üst (açık) → orta → alt (koyu). Alt ton bilerek koyu:
 * kartın siyah geçişi oraya iniyor ve beyaz başlık orada duruyor.
 */
const PALET = {
  staj: { ust: '#3b82f6', orta: '#1d4ed8', alt: '#0f2a6b' },
  cv: { ust: '#c084fc', orta: '#9333ea', alt: '#4a1d80' },
  burs: { ust: '#10b981', orta: '#059669', alt: '#053f31' },
  yurt: { ust: '#fb923c', orta: '#ea580c', alt: '#7a2c07' },
  universite: { ust: '#22d3ee', orta: '#0d9488', alt: '#0a4a45' },
  /*
    Yurtdışı ile kariyer ilk denemede birbirine çok benziyordu — ikisi de
    mor-lacivert bandındaydı ve ızgarada ayırt edilmiyordu. Yurtdışı
    LACİVERT ağırlıklı (üstte menekşe, altta gece mavisi), kariyer ise
    çivit: aynı aileden ama farklı iki ton.
  */
  yurtdisi: { ust: '#a5b4fc', orta: '#312e81', alt: '#14113d' },
  kariyer: { ust: '#6366f1', orta: '#4338ca', alt: '#272185' },
};

/**
 * Slug -> simge. Simge konuyu ANLATMALI: ızgarada okuyucunun gözü önce
 * renge, sonra simgeye takılıyor.
 */
const SIMGELER = {
  // staj
  'staj-sigortasi-kim-yapar': 'ShieldCheck',
  'staj-ucreti-nasil-hesaplanir': 'Calculator',
  'staj-basvurusu-gerekli-belgeler': 'FolderOpen',
  'ilan-acmayan-sirkete-nasil-yazilir': 'Send',
  'stajda-izin-ve-devamsizlik': 'CalendarDays',
  'uzaktan-staj-kabul-edilir-mi': 'Laptop',
  'stajyerin-gorev-ve-sorumluluklari': 'ClipboardList',
  'kotu-gecen-stajda-ne-yapilir': 'AlertTriangle',

  // cv ve başvuru
  'ats-uyumlu-cv': 'FileText',
  'cvde-proje-nasil-anlatilir': 'Lightbulb',
  'on-yazi-nasil-yazilir': 'PenLine',
  'portfolyo-nasil-hazirlanir': 'LayoutGrid',
  'linkedin-profili-nasil-duzenlenir': 'UserCircle',
  'online-mulakat': 'Video',
  'basvuruya-cevap-gelmezse': 'Inbox',

  // burs ve kyk
  'burslar-hangi-aylarda-acilir': 'CalendarRange',
  'ayni-anda-birden-fazla-burs': 'Layers',
  'burs-basvurusu-gerekli-belgeler': 'FileCheck',
  'burs-mulakati': 'MessagesSquare',
  'burs-hangi-durumlarda-kesilir': 'AlertCircle',
  'kyk-kredisi-geri-odeme': 'Banknote',
  'karsiliksiz-ve-geri-odemeli-burs-farki': 'Scale',
  'burs-dolandiriciligi': 'ShieldAlert',
  'burs-basvuru-takvimi-takibi': 'CalendarCheck',

  // yurt ve barınma
  'kyk-yurt-basvurusu': 'BedDouble',
  'kyk-yurt-tipleri': 'Bed',
  'yurt-yedek-sirasi': 'ListOrdered',
  'kyk-yurt-nakli': 'Truck',
  'yurt-izin-ve-giris-cikis': 'DoorOpen',
  'yurttan-kayit-silme': 'PackageOpen',
  'ozel-yurt-secerken': 'Building2',
  'ogrenci-evi-kiralarken': 'Home',
  'depozito-ve-kira-sozlesmesi': 'KeyRound',
  'baska-sehirde-staj-barinma': 'Luggage',

  // üniversite hayatı
  'universite-kariyer-merkezi': 'Compass',
  'ogrenci-isleri-hangi-islemler': 'ClipboardCheck',
  'yaz-okulu-ve-staj': 'Sun',
  'ogrenci-kulupleri-cvye-nasil-yazilir': 'Users',
  'cift-anadal-ve-yan-dal': 'BookOpen',
  'yatay-gecis': 'ArrowLeftRight',
  'ogrenciyken-yari-zamanli-calisma': 'Clock',
  'mezun-olmadan-once-yapilacaklar': 'GraduationCap',

  // yurtdışı
  'erasmus-ogrenim-hareketliligi': 'Globe',
  'erasmus-staj-hareketliligi': 'Plane',
  'hibesiz-erasmus': 'Wallet',
  'iaeste-ile-yurtdisinda-staj': 'FlaskConical',
  'yurtdisi-staj-vizesi': 'Stamp',
  'europass-cv': 'Files',
  'ingilizce-basvuru-epostasi': 'Mail',
  'yurtdisi-burslari': 'Earth',
  'yurtdisinda-staj-sigortasi': 'HeartPulse',
  'yurtdisinda-barinma': 'Building',

  // ilk iş ve kariyer
  'stajdan-sonra-is-teklifi': 'Handshake',
  'yeni-mezun-cvsi': 'ScrollText',
  'ilk-is-mulakati': 'Briefcase',
  'maas-beklentisi-nasil-soylenir': 'TrendingUp',
  'referans-nasil-istenir': 'MailCheck',
  'is-teklifini-degerlendirme': 'FileSignature',
  'yeni-mezun-programlari': 'Presentation',
};

/** Konu başına yedek simge: eşleme unutulursa kapak yine anlamlı çıksın. */
const YEDEK_SIMGE = {
  staj: 'Briefcase',
  cv: 'FileText',
  burs: 'Award',
  yurt: 'Home',
  universite: 'GraduationCap',
  yurtdisi: 'Globe',
  kariyer: 'TrendingUp',
};

/* Slug'dan deterministik sayı: aynı slug her zaman aynı deseni veriyor. */
function tohum(metin) {
  let h = 2166136261;
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function simgeSvg(ad, boyut) {
  const Bilesen = Lucide[ad];
  if (!Bilesen) return null;
  const ham = renderToStaticMarkup(
    React.createElement(Bilesen, {
      size: boyut,
      strokeWidth: 1.35,
      color: '#ffffff',
      absoluteStrokeWidth: false,
    })
  );
  /* Dış <svg> etiketi iç içe geçecek; xmlns tekrarı sorun çıkarmıyor. */
  return ham;
}

function kapakSvg(slug, konu) {
  const p = PALET[konu] || PALET.staj;
  const t = tohum(slug);
  const simgeAdi = SIMGELER[slug] || YEDEK_SIMGE[konu] || 'BookOpen';
  const simge = simgeSvg(simgeAdi, 320) || simgeSvg('BookOpen', 320);

  /* Desen: üç yumuşak daire ve iki yay. Konumları tohumdan geliyor. */
  const d1x = 120 + (t % 240);
  const d1y = 90 + ((t >> 3) % 140);
  const d2x = 380 + ((t >> 6) % 260);
  const d2y = 40 + ((t >> 9) % 160);
  const d3x = 60 + ((t >> 12) % 600);
  const d3y = 300 + ((t >> 15) % 120);
  const r1 = 150 + ((t >> 18) % 90);
  const r2 = 90 + ((t >> 21) % 70);
  const r3 = 60 + ((t >> 24) % 50);
  const aci = (t >> 5) % 40 - 20;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BOY}" height="${BOY}" viewBox="0 0 ${BOY} ${BOY}">
  <defs>
    <linearGradient id="zemin" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stop-color="${p.ust}"/>
      <stop offset="52%" stop-color="${p.orta}"/>
      <stop offset="100%" stop-color="${p.alt}"/>
    </linearGradient>
    <linearGradient id="dip" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.alt}" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.45"/>
    </linearGradient>
  </defs>

  <rect width="${BOY}" height="${BOY}" fill="url(#zemin)"/>

  <!--
    Desen yalnızca ÜST kısımda: alt üçte bir sakin kalıyor, kartın siyah
    geçişi oraya iniyor ve başlık orada duruyor.
  -->
  <g opacity="0.16" fill="#ffffff">
    <circle cx="${d1x}" cy="${d1y}" r="${r1}"/>
    <circle cx="${d2x}" cy="${d2y}" r="${r2}"/>
  </g>
  <g opacity="0.10" fill="none" stroke="#ffffff" stroke-width="2">
    <circle cx="${d3x}" cy="${d3y}" r="${r3}"/>
    <circle cx="${d3x}" cy="${d3y}" r="${r3 + 46}"/>
  </g>

  <!-- Simge: yatayda ortada, dikeyde üst-orta. Alt bant boş kalıyor. -->
  <g transform="translate(${BOY / 2 - 160}, 156) rotate(${aci * 0.15}, 160, 160)" opacity="0.97">
    ${simge}
  </g>

  <rect y="${BOY * 0.55}" width="${BOY}" height="${BOY * 0.45}" fill="url(#dip)"/>
</svg>`;
}

/* ---- rehber kaydını derleyip oku (onrender.mjs ile aynı yöntem) ---- */
async function rehberleriOku() {
  const esbuild = await import('esbuild');
  const gecici = path.join(KOK, 'node_modules', '.cache', 'kapak-rehberler.mjs');
  fs.mkdirSync(path.dirname(gecici), { recursive: true });
  await (esbuild.build || esbuild.default.build)({
    entryPoints: [path.join(KOK, 'src', 'data', 'rehberler.tsx')],
    outfile: gecici,
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    logLevel: 'silent',
    packages: 'external',
  });
  const { REHBERLER } = await import(url.pathToFileURL(gecici).href + `?t=${Date.now()}`);
  return REHBERLER;
}

const rehberler = await rehberleriOku();
const konuHaritasi = Object.fromEntries(rehberler.map((r) => [r.slug, r.konu]));

/* Mevcut fotoğraf kapakları: bunların görseline dokunulmuyor. */
const FOTOGRAFLILAR = new Set(
  fs
    .readdirSync(HEDEF)
    .filter((d) => d.endsWith('.jpg'))
    .map((d) => d.replace(/\.jpg$/, ''))
);

fs.mkdirSync(HEDEF, { recursive: true });

const argv = process.argv.slice(2);
const ornekModu = argv.includes('--ornek');
const secilenler = argv.filter((a) => !a.startsWith('--'));

let hedefSluglar;
if (secilenler.length) {
  hedefSluglar = secilenler;
} else if (ornekModu) {
  /* Kategori başına ilk iki üretilecek rehber: görsel dili önce burada denetleniyor. */
  hedefSluglar = [];
  for (const konu of Object.keys(PALET)) {
    const adaylar = rehberler
      .filter((r) => r.konu === konu && !FOTOGRAFLILAR.has(r.slug))
      .slice(0, 2)
      .map((r) => r.slug);
    hedefSluglar.push(...adaylar);
  }
} else {
  hedefSluglar = rehberler.filter((r) => !FOTOGRAFLILAR.has(r.slug)).map((r) => r.slug);
}

/* Eksik simge adı varsa sessizce yedeğe düşmesin: söylensin. */
const eksikSimge = Object.entries(SIMGELER).filter(([, ad]) => !Lucide[ad]);
if (eksikSimge.length) {
  console.log('UYARI: lucide-react içinde bulunmayan simge adları:');
  for (const [slug, ad] of eksikSimge) console.log(`  ${slug} -> ${ad}`);
}

let sayac = 0;
for (const slug of hedefSluglar) {
  const konu = konuHaritasi[slug];
  if (!konu) {
    console.log(`${slug.padEnd(38)} ATLANDI  rehber kaydında yok`);
    continue;
  }
  const svg = Buffer.from(kapakSvg(slug, konu));
  const temel = sharp(svg, { density: 144 }).resize(BOY, BOY);
  const webp = await temel.clone().webp({ quality: 84 }).toBuffer();
  const avif = await temel.clone().avif({ quality: 55 }).toBuffer();
  fs.writeFileSync(path.join(HEDEF, `${slug}.webp`), webp);
  fs.writeFileSync(path.join(HEDEF, `${slug}.avif`), avif);
  console.log(
    `${slug.padEnd(38)} ${konu.padEnd(11)} ${(webp.length / 1024).toFixed(0)}KB webp  ${(avif.length / 1024).toFixed(0)}KB avif`
  );
  sayac++;
}

/*
  MEVCUT FOTOĞRAF KAPAKLAR

  Görselleri değişmiyor — aynı fotoğrafın webp/avif kopyası üretiliyor.
  Sebebi işaretleme: kart bütün kapaklarda aynı <picture> yapısını
  kullanıyor. On bir slug için jpg, elli dokuzu için webp olsaydı bileşende
  slug'a göre uzantı seçen bir istisna taşımak gerekirdi; o istisna da yeni
  rehber eklendiğinde unutulacak bir şey olurdu.

  .jpg dosyaları yerinde duruyor: fotoğrafın kaynağı onlar.
*/
let fotoSayac = 0;
if (!secilenler.length) {
  for (const slug of FOTOGRAFLILAR) {
    const jpg = path.join(HEDEF, `${slug}.jpg`);
    const temel = sharp(jpg).resize(BOY, BOY, { fit: 'cover', position: 'attention' });
    fs.writeFileSync(path.join(HEDEF, `${slug}.webp`), await temel.clone().webp({ quality: 82 }).toBuffer());
    fs.writeFileSync(path.join(HEDEF, `${slug}.avif`), await temel.clone().avif({ quality: 52 }).toBuffer());
    fotoSayac++;
  }
  console.log(`${fotoSayac} fotoğraf kapak webp/avif'e çevrildi (görsel değişmedi)`);
}

console.log(`\n${sayac} kapak üretildi -> public/rehber-gorselleri/`);
