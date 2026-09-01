/**
 * SIRADAKİ GÖRSELLEŞTİRME ADAYLARINI SEÇER
 *
 * NEDEN
 * -----
 * "Hangi rehberi görselleştirelim" sorusu his ile cevaplanınca hep aynı
 * popüler başlıklar seçiliyor. Oysa görselin katkısı içeriğin biçimine
 * bağlı: sırası olan bir süreç, iki seçeneğin karşılaştırması ya da bir
 * belge listesi görselden kazanıyor; düz anlatım kazanmıyor. Kısa bir
 * yazıya görsel eklemek de içeriği derinleştirmiyor, yalnız sayfayı
 * doldurmuş oluyor.
 *
 * KELİME SAYIMI NEDEN BURADA YAPILMIYOR
 * -------------------------------------
 * JSX gövdesinden okunabilir metin çıkarmak bu depoda iki kez yanlış
 * yapıldı (bir kez `{...}` blokları komple atıldığı için ortalama 151
 * göründü, bir kez `dist/` okunduğu için temiz checkout'ta çöktü).
 * Doğrusu `rehber-sayimi.mjs` içinde duruyor ve oradan alınıyor —
 * ikinci bir sayaç yazmak, raporun sayfanın davranışından ayrışması
 * demek olurdu.
 *
 * Skor bir sıralama önerisi; karar insanın. Nedenler bilerek
 * yazdırılıyor: hangi sinyalin nereden geldiği görünsün.
 *
 * Kullanım: node scripts/rehber-gorsel-adaylari.mjs [--adet 5]
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { kelimeSay, rehberBloklari } from './rehber-sayimi.mjs';

const KOK = path.resolve(import.meta.dirname, '..');

/*
  GÖRSEL ANLATIM İKİ YAZIMDA BİRDEN ARANIYOR

  Elle yazılan rehberler bileşeni JSX olarak çağırıyor (`<Karsilastirma`),
  `metinRehberi` ile yazılanlar ise aynı bileşeni bir veri anahtarıyla
  çiziyor (`karsilastirma: {`). Yalnız JSX'e bakmak, veriyle yazılmış
  görselli rehberleri "görseli yok" göstermeye yol açıyordu (ölçüldü:
  üç rehbere görsel eklendikten sonra bile aday listesinde kalmışlardı).
*/
const GORSEL_BILESENLER = [
  'Akis',
  'Karsilastirma',
  'KarsilastirmaTablosu',
  'KontrolListesi',
  'RehberOrnek',
  'EpostaOrnegi',
  'CvIskeleti',
  'RehberFigur',
  'SorumlulukTablosu',
  'KazancKartlari',
];

/** `metinRehberi` blok anahtarları → karşılık gelen görsel bileşen. */
const GORSEL_ANAHTARLAR = {
  'figur:': 'RehberFigur',
  'karsilastirma:': 'Karsilastirma',
  'kontrol:': 'KontrolListesi',
  'tablo:': 'KarsilastirmaTablosu',
};

function gorselBilesenleri(govde) {
  const bulunan = new Set(
    GORSEL_BILESENLER.filter((b) => new RegExp(`<${b}[\\s/>]`).test(govde))
  );
  for (const [anahtar, bilesen] of Object.entries(GORSEL_ANAHTARLAR)) {
    if (govde.includes(`\n        ${anahtar} {`)) bulunan.add(bilesen);
  }
  return [...bulunan];
}

/** Görselin gerçekten iş göreceği içerik biçimleri. */
const SINYALLER = {
  sira: /\badım\b|\bsırayla\b|\bsonra\b|\bilk olarak\b|\bardından\b/gi,
  karsilastirma: /\byerine\b|\bfarkı\b|\bhangisi\b|\bikisi arasında\b|\baksine\b/gi,
  belge: /\bbelge\b|\bevrak\b|\bform\b|\bdilekçe\b|\bbaşvuru formu\b/gi,
  takvim: /\bson başvuru\b|\btakvim\b|\bdönem\b|\btarih aralığı\b/gi,
};

function kaynakDosyalari() {
  const klasor = path.join(KOK, 'src/data/rehber-yazilari');
  const yollar = fs
    .readdirSync(klasor)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => path.join(klasor, f));
  yollar.push(path.join(KOK, 'src/data/rehberler.tsx'));
  return yollar;
}

export function puanla({ slug, govde }) {
  const kelime = kelimeSay(govde);
  const mevcut = gorselBilesenleri(govde);

  let puan = 0;
  const nedenler = [];

  for (const [ad, kalip] of Object.entries(SINYALLER)) {
    const adet = (govde.match(kalip) || []).length;
    if (adet >= 6) {
      puan += 2;
      nedenler.push(`${ad}×${adet} (güçlü)`);
    } else if (adet >= 3) {
      puan += 1;
      nedenler.push(`${ad}×${adet}`);
    }
  }

  /*
    Uzunluk eşiği bir "politika" değil, görselin dolgu olup olmadığının
    ölçüsü: 300 kelimenin altındaki bir yazıda diyagram, anlatılan şeyi
    tekrar etmekten başka bir iş yapmıyor.
  */
  if (kelime >= 700) {
    puan += 1;
    nedenler.push(`${kelime} kelime`);
  } else if (kelime < 300) {
    puan -= 2;
    nedenler.push(`${kelime} kelime — görsel dolgu olur`);
  }

  /*
    DÖRT AYRI SONUÇ, TEK LİSTE DEĞİL

    "Görseli yok" tek başına bir eylem çağrısı değil. Kısa bir yazıya
    diyagram eklemek onu derinleştirmiyor, yalnız uzun gösteriyor.
    Yeterince uzun ama düz anlatan bir yazıda da görsel bir şey
    öğretmiyor — orada metin zaten yeterli. Sınıflar:

      GORSEL_YETERLI  — hâlihazırda görsel anlatımı var
      ICERIK_INCE     — önce yazının kendisi derinleşmeli
      GORSEL_FIRSATI  — içerik olgun ve biçimi görselden kazanır
      METIN_YETERLI   — olgun ama görselden kazanacak biçimi yok
  */
  /*
    "Görsel anlatım" ile "editoryal varlık" aynı şey değil. Bir
    karşılaştırma tablosu zaten o karşılaştırmanın görselidir; üstüne
    SVG koymak aynı şeyi iki kez anlatmak olur. Bu yüzden doyum ölçütü
    ikili: ya bir `RehberFigur` varlığı var, ya da en az iki görsel blok
    zaten sayfada duruyor.
  */
  const varlikVar = mevcut.includes('RehberFigur');
  const sinif =
    varlikVar || mevcut.length >= 2
      ? 'GORSEL_YETERLI'
      : kelime < 300
        ? 'ICERIK_INCE'
        : puan >= 2
          ? 'GORSEL_FIRSATI'
          : 'METIN_YETERLI';

  return { slug, kelime, puan, mevcut, nedenler, sinif, varlikVar };
}

export function adaylar() {
  const hepsi = [];
  for (const yol of kaynakDosyalari()) {
    for (const blok of rehberBloklari(fs.readFileSync(yol, 'utf8'))) hepsi.push(puanla(blok));
  }
  const siralaBy = (s) =>
    hepsi.filter((r) => r.sinif === s).sort((a, b) => b.puan - a.puan || b.kelime - a.kelime);
  return {
    hepsi,
    firsat: siralaBy('GORSEL_FIRSATI'),
    ince: siralaBy('ICERIK_INCE'),
    metinYeterli: siralaBy('METIN_YETERLI'),
    yeterli: siralaBy('GORSEL_YETERLI'),
    /* Geriye dönük: yalnız görselsizler, puan sırasıyla. */
    sirali: hepsi
      .filter((r) => r.mevcut.length === 0)
      .sort((a, b) => b.puan - a.puan || b.kelime - a.kelime),
  };
}

function main() {
  const bayrak = process.argv.indexOf('--adet');
  const adet = bayrak > -1 ? Number(process.argv[bayrak + 1]) : 5;
  const { hepsi, firsat, ince, metinYeterli, yeterli } = adaylar();

  console.log(
    `${hepsi.length} rehber tarandı · görsel fırsatı ${firsat.length} · ` +
      `içerik ince ${ince.length} · metin yeterli ${metinYeterli.length} · ` +
      `görsel yeterli ${yeterli.length}`
  );

  console.log(`\nGÖRSEL FIRSATI — sıradaki ${adet}`);
  for (const r of firsat.slice(0, adet)) {
    console.log(`  ${r.slug}  puan=${r.puan}  ${r.kelime} kelime`);
    console.log(`     ${r.nedenler.join(' · ') || 'belirgin sinyal yok'}`);
  }
  if (!firsat.length) console.log('  (yok — görsel eklenecek olgun rehber kalmadı)');

  console.log('\nİÇERİK İNCE — burada eksik olan görsel değil, yazının kendisi');
  for (const r of ince.slice(0, adet)) {
    console.log(`  ${r.slug}  ${r.kelime} kelime`);
  }
  if (ince.length > adet) console.log(`  … ve ${ince.length - adet} rehber daha`);

  console.log(`\nMETİN YETERLİ — ${metinYeterli.length} rehber olgun ama görselden kazanmıyor`);
  for (const r of metinYeterli.slice(0, adet)) {
    console.log(`  ${r.slug}  ${r.kelime} kelime`);
  }
  if (metinYeterli.length > adet) console.log(`  … ve ${metinYeterli.length - adet} rehber daha`);

  console.log(`\nGÖRSEL YETERLİ — ${yeterli.length} rehberde görsel anlatım zaten var`);
}

/* Windows'ta elle `file://` + yol kurmak yanlış URL üretiyor; pathToFileURL şart. */
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
