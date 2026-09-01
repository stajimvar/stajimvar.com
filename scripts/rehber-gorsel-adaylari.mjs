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

/** Görsel anlatım sayılan bileşenler; biri varsa rehber zaten görselleşmiş. */
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
  const mevcut = GORSEL_BILESENLER.filter((b) => new RegExp(`<${b}[\\s/>]`).test(govde));

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

  return { slug, kelime, puan, mevcut, nedenler };
}

export function adaylar() {
  const hepsi = [];
  for (const yol of kaynakDosyalari()) {
    for (const blok of rehberBloklari(fs.readFileSync(yol, 'utf8'))) hepsi.push(puanla(blok));
  }
  return {
    hepsi,
    sirali: hepsi
      .filter((r) => r.mevcut.length === 0)
      .sort((a, b) => b.puan - a.puan || b.kelime - a.kelime),
  };
}

function main() {
  const bayrak = process.argv.indexOf('--adet');
  const adet = bayrak > -1 ? Number(process.argv[bayrak + 1]) : 5;
  const { hepsi, sirali } = adaylar();
  const gorselli = hepsi.filter((r) => r.mevcut.length > 0);

  console.log(
    `${hepsi.length} rehber tarandı · ${gorselli.length} tanesinde görsel anlatım var · ` +
      `${sirali.length} tanesinde yok`
  );
  console.log(`\nSIRADAKİ ${adet} ADAY (puan sırasıyla)`);
  for (const r of sirali.slice(0, adet)) {
    console.log(`  ${r.slug}  puan=${r.puan}  ${r.kelime} kelime`);
    console.log(`     ${r.nedenler.join(' · ') || 'belirgin sinyal yok'}`);
  }

  const zayif = sirali.slice(0, adet).filter((r) => r.puan <= 0);
  if (zayif.length) {
    console.log(
      `\nUYARI: ilk ${adet} adayın ${zayif.length} tanesi sıfır ya da eksi puanlı. ` +
        'Bunlarda eksik olan görsel değil, içerik derinliği.'
    );
  }
}

/* Windows'ta elle `file://` + yol kurmak yanlış URL üretiyor; pathToFileURL şart. */
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
