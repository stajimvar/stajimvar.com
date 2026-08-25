/**
 * İşveren ve üniversite logolarını kurumun KENDİ sayfasından indirir.
 *
 * NEDEN GEREKLİ
 * -------------
 * Rehber girişindeki "Büyük işverenler" ve "Kariyer merkezleri" kartları
 * logo önizlemesi gösteriyor. Logolar olmadan o kartlar iki satır metne
 * düşüyor ve dizinin gerçekten 46 işveren ve 22 üniversite taşıdığı
 * hissedilmiyor — sorun içerik eksikliği değil, içeriğin görünmemesiydi.
 *
 * ADRES UYDURULMUYOR
 * ------------------
 * kurum-logo-bul.mjs ile aynı kural: her adres kurumun kendi HTML'inden
 * geliyor (<link rel="icon">, apple-touch-icon, og:image ya da sayfadaki
 * logo <img>'i) veya sitenin kökündeki /favicon.ico deneniyor. İndirilen
 * her dosya açılıp ölçülüyor; küçük, boş ya da tek renk olan eleniyor.
 *
 * TİCARİ MARKA
 * ------------
 * Logolar dizin amaçlı, kurumu TANITMAK için kullanılıyor — ortaklık
 * iddiası taşımıyor. Kartların altında bunu açıkça yazan bir satır var
 * (bkz. StajProgramlari.tsx). Logo dosyaları kurumun kendi sitesinden
 * geliyor ve kurum isterse kaldırılıyor.
 *
 * Kullanım:
 *   node scripts/marka-logolari.mjs isveren
 *   node scripts/marka-logolari.mjs universite
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { gorseliIndir, icoyuAc, sayfayiAl } from './logo-araclari.mjs';

const KOK = path.resolve(import.meta.dirname, '..');
const BOYUT = 128;

/* Ölçülerin gerekçesi kurum-logolari.mjs başındaki notlarda. */
const EN_AZ_KENAR = 32;

const tur = process.argv[2];
if (tur !== 'isveren' && tur !== 'universite') {
  console.error('Kullanım: node scripts/marka-logolari.mjs <isveren|universite>');
  process.exit(1);
}

/* --------------------------------------------------------------- girdiler */

/*
  Kaynak listeler TypeScript dosyalarında. Node onları okuyamıyor; düz
  metin olarak ayrıştırılıyor. Ayrı bir JSON tutmak, iki listenin zamanla
  ayrışması demek olurdu.
*/
function isverenler() {
  const metin = fs.readFileSync(path.join(KOK, 'src', 'data', 'stajProgramlari.ts'), 'utf8');
  const bulunan = [];
  const desen = /slug:\s*'([^']+)',\s*\n\s*isveren:\s*'([^']+)',[\s\S]*?kariyerUrl:\s*'([^']+)'/g;
  let e;
  while ((e = desen.exec(metin)) !== null) {
    bulunan.push({ kod: e[1], ad: e[2], sayfa: new URL(e[3]).origin + '/' });
  }
  return bulunan;
}

function universiteler() {
  const metin = fs.readFileSync(path.join(KOK, 'src', 'data', 'kariyerMerkezleri.ts'), 'utf8');
  const bulunan = [];
  const desen = /universite:\s*'([^']+)',\s*\n\s*sehir:\s*'([^']+)',\s*\n\s*url:\s*'([^']+)'/g;
  let e;
  while ((e = desen.exec(metin)) !== null) {
    const kod = e[1]
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    /*
      Kariyer merkezi çoğu okulda alt alan adında (kariyer.cu.edu.tr).
      Logo ana alan adında duruyor; iki seviye yukarısı deneniyor.
    */
    const u = new URL(e[3]);
    const parcalar = u.hostname.split('.');
    const anaAlan = parcalar.length > 3 ? parcalar.slice(1).join('.') : u.hostname;
    bulunan.push({ kod, ad: e[1], sayfa: `${u.protocol}//${anaAlan}/`, yedek: u.origin + '/' });
  }
  return bulunan;
}

const kurumlar = tur === 'isveren' ? isverenler() : universiteler();
const HEDEF = path.join(KOK, 'public', tur === 'isveren' ? 'isveren-logolari' : 'universite-logolari');

/* ----------------------------------------------------------------- bulma */

function adaylariCikar(html, sayfaAdresi) {
  const adaylar = [];
  const mutlak = (deger) => {
    try {
      const adres = new URL(String(deger).replace(/&amp;/g, '&').trim(), sayfaAdresi);
      return adres.protocol === 'https:' || adres.protocol === 'http:' ? adres.href : null;
    } catch {
      return null;
    }
  };

  for (const etiket of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = (etiket.match(/rel\s*=\s*["']([^"']+)["']/i)?.[1] ?? '').toLowerCase();
    const href = etiket.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href || !/icon/.test(rel)) continue;
    const adres = mutlak(href);
    if (adres) adaylar.push({ adres, puan: rel.includes('apple-touch') ? 60 : 20 });
  }

  let logoSayisi = 0;
  for (const etiket of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (!/logo|amblem|brand/i.test(etiket) || logoSayisi >= 3) continue;
    const src = etiket.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    const adres = src && !src.startsWith('data:') ? mutlak(src) : null;
    if (adres) {
      adaylar.push({ adres, puan: 40 });
      logoSayisi++;
    }
  }

  adaylar.push({ adres: new URL('/favicon.ico', sayfaAdresi).href, puan: 0 });

  const gorulen = new Set();
  return adaylar.filter((a) => !gorulen.has(a.adres) && gorulen.add(a.adres));
}

/**
 * Adayı indirir, açar ve puanlar. Kabul edilmezse null döner.
 *
 * Yatay kilitler (277x35 gibi) ceza alıyor: kare çerçevede ince bir
 * şeride dönüşüyorlar.
 */
async function adayiDegerlendir(aday) {
  /* gorseliIndir başarısızlıkta HATA FIRLATIYOR; burada aday elenmiş sayılıyor. */
  let inen = null;
  try {
    inen = await gorseliIndir(aday.adres);
  } catch {
    return null;
  }
  if (!inen) return null;

  let veri = inen.veri;
  const svgMi = inen.tur.includes('svg');
  if (!svgMi) {
    try {
      veri = await icoyuAc(veri);
    } catch {
      return null;
    }
  }

  try {
    const olcu = await sharp(veri, { density: 300 }).metadata();
    const en = olcu.width ?? 0;
    const boy = olcu.height ?? 0;
    if (!svgMi && Math.min(en, boy) < EN_AZ_KENAR) return null;

    const oran = en && boy ? Math.max(en, boy) / Math.min(en, boy) : 1;
    const puan = aday.puan + Math.min(en, boy) - (oran > 2.5 ? 120 : 0) + (svgMi ? 80 : 0);
    return { veri, puan };
  } catch {
    return null;
  }
}

/*
  TEK BİR SUNUCU BÜTÜN TARAMAYI DÜŞÜRMESİN

  Bazı sunucular bağlantıyı Node'un HTTP çözümleyicisini iç bir doğrulamaya
  düşürecek biçimde kapatıyor (undici "assert(!this.paused)"). Hata bizim
  await zincirimizin dışında doğduğu için try/catch yakalamıyor ve süreç
  ölüyordu — 46 kurumun ikincisinde.

  Yutuluyor ve döngü devam ediyor. Betik zaten var olan dosyayı atlıyor,
  yani yeniden çalıştırmak kaldığı yerden sürdürüyor.
*/
process.on('uncaughtException', (hata) => {
  console.log(`  !  ağ hatası yutuldu: ${String(hata.message).slice(0, 60)}`);
});
process.on('unhandledRejection', () => {});

/* ---------------------------------------------------------------- çalıştır */

fs.mkdirSync(HEDEF, { recursive: true });

let basarili = 0;
const bulunamayan = [];

for (const kurum of kurumlar) {
  const hedefDosya = path.join(HEDEF, `${kurum.kod}.png`);
  if (fs.existsSync(hedefDosya)) {
    basarili++;
    continue;
  }

  let enIyi = null;
  for (const sayfaAdresi of [kurum.sayfa, kurum.yedek].filter(Boolean)) {
    /* sayfayiAl { html, adres } döndürüyor; yönlendirme sonrası adres önemli. */
    let sayfa = null;
    try {
      sayfa = await sayfayiAl(sayfaAdresi);
    } catch {
      sayfa = null;
    }
    if (!sayfa?.html) continue;

    for (const aday of adaylariCikar(sayfa.html, sayfa.adres || sayfaAdresi).slice(0, 8)) {
      const sonuc = await adayiDegerlendir(aday);
      if (sonuc && (!enIyi || sonuc.puan > enIyi.puan)) enIyi = sonuc;
    }
    if (enIyi) break;
  }

  if (!enIyi) {
    bulunamayan.push(kurum);
    console.log(`  —  ${kurum.kod}`);
    continue;
  }

  /*
    Şeffaf zemin korunuyor ve logo kırpılmadan kutuya oturtuluyor:
    `contain` oranı bozmuyor, `fit: cover` markayı kırpardı.
  */
  const cikti = await sharp(enIyi.veri, { density: 300 })
    .resize(BOYUT, BOYUT, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(hedefDosya, cikti);
  basarili++;
  console.log(`  ✓  ${kurum.kod}`);
}

console.log(`\n${basarili}/${kurumlar.length} logo hazır -> ${path.relative(KOK, HEDEF)}`);
if (bulunamayan.length) {
  console.log('\nLogosu bulunamayanlar (kart harfle çiziliyor, uydurma logo konmuyor):');
  for (const k of bulunamayan) console.log(`  ${k.kod} — ${k.sayfa}`);
}
