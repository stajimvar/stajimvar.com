/**
 * CV'DEKİ BÖLÜM LİSTESİ ÜRETECİ
 *
 * NEDEN VAR
 * ---------
 * Ölçüldü (19 Eylül 2026): sitede İKİ AYRI bölüm kataloğu vardı.
 *   · CV'deki tamamlayıcı  `TR_DEPARTMENTS`, 323 kalem, statik dosya
 *   · Alan türetmesi       `departments` tablosu, 42 kalem
 * Öğrenci birinden seçiyor, sunucu ötekinde arıyordu. Sonucu canlıda
 * görünüyordu: yayındaki 21 öğrenci profilinin 16'sında alan yok ve
 * alansız kullanıcı bağlantı da kuramıyor (20261019010000).
 *
 * Bu üreteç ikisini TEK KAYNAĞA bağlıyor: göçteki katalog
 * (20261021010000, YÖK Atlas tercih kılavuzu program grupları) ne
 * diyorsa CV'deki liste de onu diyor. Böylece listeden seçilen her
 * bölüm `bolumu_esle` tarafından da bulunuyor.
 *
 * `tests/cv-bolum-listesi-tutarliligi.test.mjs` üretilenle dosyadakinin
 * aynı olduğunu ölçüyor: katalog büyüyüp liste güncellenmezse test
 * düşüyor, ayrışma sessiz kalmıyor.
 *
 * KULLANIM
 *   node scripts/cv-bolum-listesi.mjs           → listeyi ekrana basar
 *   node scripts/cv-bolum-listesi.mjs --yaz     → turkeyData.ts'i günceller
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const KOK = path.resolve(import.meta.dirname, '..');
const GOC = path.join(KOK, 'supabase/migrations/20261021010000_yok_bolum_katalogu.sql');
const HEDEF = path.join(KOK, 'src/data/turkeyData.ts');

/** Göçteki `insert into yok_katalog ... values` bloğundan adları okur. */
export function katalogAdlari() {
  const sql = readFileSync(GOC, 'utf8');
  const bas = sql.indexOf('insert into yok_katalog (ad, slug, duzey, alan) values');
  const son = sql.indexOf('create or replace function sosyal_gizli.ad_sadelestir');
  if (bas < 0 || son < 0) throw new Error('göçteki katalog bloğu bulunamadı');
  const govde = sql.slice(bas, son);
  /* Her satır: ('Ad', 'slug', 'duzey', 'Alan') — ilk alan aranan. */
  const adlar = [...govde.matchAll(/^\s*\('((?:[^']|'')*)',/gm)].map((m) => m[1].replace(/''/g, "'"));
  if (adlar.length < 500) throw new Error(`katalogdan yalnız ${adlar.length} ad okundu`);
  return adlar;
}

/**
 * Rehber sayfası olan 42 bölüm de listede kalmalı: adlarının arkasında
 * /bolum/<slug> içeriği var ve profil o adı taşıyorsa sayfa açılabilmeli.
 * Katalogda aynı ad zaten varsa ikinci kez yazılmıyor.
 */
export function rehberAdlari() {
  const ts = readFileSync(path.join(KOK, 'src/data/bolumler.ts'), 'utf8');
  return [...ts.matchAll(/^\s*ad:\s*'((?:[^']|\\')*)',/gm)].map((m) => m[1].replace(/\\'/g, "'"));
}

const kat = { 'İ': 'i', 'I': 'i', 'ı': 'i', 'Ç': 'c', 'ç': 'c', 'Ğ': 'g', 'ğ': 'g', 'Ö': 'o', 'ö': 'o', 'Ş': 's', 'ş': 's', 'Ü': 'u', 'ü': 'u' };
/** Göçteki `sosyal_gizli.ad_sadelestir` ile aynı kural. */
export const sadelestir = (s) =>
  String(s ?? '').replace(/[İIıÇçĞğÖöŞşÜü]/g, (h) => kat[h]).toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

/*
  Parantezli ek atılmış hâli. Rehber sayfalarının adlarında düzey eki
  var ("Bilgisayar Programcılığı (MYO)") ve o ek, ölçülen eşleşme
  kusurunun kendisiydi: kullanıcı bölümünü doğru yazmış, ek yüzünden
  tutmamıştı. Ekli ad tamamlayıcıda GÖRÜNMEMELİ; katalogda eksiz hâli
  varsa o kazanıyor.
*/
const eksiz = (ad) => sadelestir(String(ad).replace(/\s*\([^)]*\)\s*$/, ''));

export function liste() {
  /*
    SIRA ÖNEMLİ: katalog önce geliyor. Aynı bölümün hem eksiz (YÖK) hem
    ekli (rehber) hâli varsa tamamlayıcıda eksiz olan kalsın.
  */
  const katalog = katalogAdlari();
  const katalogNormal = new Set(katalog.map(sadelestir));
  const gorulen = new Set();
  const cikti = [];
  for (const ad of [...katalog, ...rehberAdlari()]) {
    const n = sadelestir(ad);
    if (!n || gorulen.has(n)) continue;
    /* Ekli rehber adı, eksiz karşılığı katalogda varsa listeye girmiyor. */
    if (n !== eksiz(ad) && katalogNormal.has(eksiz(ad))) continue;
    gorulen.add(n);
    cikti.push(ad);
  }
  return cikti.sort((a, b) => a.localeCompare(b, 'tr'));
}

export function blok() {
  const satirlar = liste().map((ad) => `  '${ad.replace(/'/g, "\\'")}',`).join('\n');
  return `export const TR_DEPARTMENTS: string[] = [\n${satirlar}\n];`;
}

if (process.argv[1] && process.argv[1].endsWith('cv-bolum-listesi.mjs')) {
  const yeni = blok();
  if (process.argv.includes('--yaz')) {
    const ts = readFileSync(HEDEF, 'utf8');
    const bas = ts.indexOf('export const TR_DEPARTMENTS');
    const son = ts.indexOf('];', bas) + 2;
    if (bas < 0) throw new Error('TR_DEPARTMENTS bulunamadı');
    writeFileSync(HEDEF, ts.slice(0, bas) + yeni + ts.slice(son));
    console.log(`TR_DEPARTMENTS güncellendi: ${liste().length} kalem`);
  } else {
    console.log(`${liste().length} kalem`);
    console.log(yeni.slice(0, 400));
  }
}
