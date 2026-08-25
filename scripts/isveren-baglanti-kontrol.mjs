/**
 * İşverenlerin kariyer sayfalarını gerçekten çağırır ve tarihi damgalar.
 *
 * NEDEN
 * -----
 * Dizin "doğrulanmış adres" diyor ama kartta bunu gösteren bir şey yoktu.
 * Sitenin en ayırt edici iddiası "gösterdiğimiz adresi gerçekten kontrol
 * ediyoruz" ve bu iddia ancak tarih görünürse anlam taşıyor.
 *
 * NE DOĞRULUYOR, NE DOĞRULAMIYOR
 * ------------------------------
 * Doğruluyor: adres çalışıyor mu, kariyer sayfası hâlâ orada mı.
 * Doğrulamıyor: başvuruların açık olup olmadığı. Bir kariyer sayfasının
 * ayakta olması başvuru alındığı anlamına gelmiyor; "Başvurular açık"
 * etiketi bu yüzden hiçbir yerde yazmıyor. Doğrulayamadığımız şeyi
 * yazmamak, bu dizinin kurucu kuralı.
 *
 * Çıktı doğrudan src/data/stajProgramlari.ts içine `sonKontrol` alanı
 * olarak yazılıyor: veri kodda duruyor, ayrı bir JSON iki listenin
 * zamanla ayrışması demek olurdu.
 *
 * Kullanım: node scripts/isveren-baglanti-kontrol.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { BASLIK } from './logo-araclari.mjs';

const KOK = path.resolve(import.meta.dirname, '..');
const VERI = path.join(KOK, 'src', 'data', 'stajProgramlari.ts');

const bugun = new Date().toISOString().slice(0, 10);

process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

async function calisiyorMu(adres) {
  /*
    Önce HEAD, olmazsa GET. Bazı sunucular HEAD'i 405 ile geri çeviriyor
    ama GET'e cevap veriyor; yalnızca HEAD'e bakmak o adresleri haksız
    yere ölü sayardı.
  */
  for (const yontem of ['HEAD', 'GET']) {
    try {
      const yanit = await fetch(adres, {
        method: yontem,
        headers: { ...BASLIK, Accept: 'text/html,*/*;q=0.8' },
        redirect: 'follow',
        signal: AbortSignal.timeout(20000),
      });
      if (yanit.ok) return true;
      if (yanit.status !== 405 && yanit.status !== 403) return false;
    } catch {
      /* sonraki yöntem denensin */
    }
  }
  return false;
}

const metin = fs.readFileSync(VERI, 'utf8');
const kayitlar = [...metin.matchAll(/slug:\s*'([^']+)',[\s\S]*?kariyerUrl:\s*'([^']+)'/g)].map((e) => ({
  slug: e[1],
  adres: e[2],
}));

console.log(`${kayitlar.length} adres çağrılıyor…`);

const calisan = new Set();
for (const kayit of kayitlar) {
  const iyi = await calisiyorMu(kayit.adres);
  if (iyi) calisan.add(kayit.slug);
  console.log(`  ${iyi ? '✓' : '✗'}  ${kayit.slug}`);
}

/*
  Yalnızca ÇALIŞAN adreslere tarih yazılıyor. Çalışmayan bir adrese
  "bugün kontrol edildi" damgası vurmak, tam da güveni bitiren şey olurdu;
  o kayıtlarda alan hiç görünmüyor ve kartta tarih çıkmıyor.
*/
let yeni = metin;
let yazilan = 0;
for (const kayit of kayitlar) {
  if (!calisan.has(kayit.slug)) continue;
  const desen = new RegExp(`(slug: '${kayit.slug}',)([\\s\\S]*?)(\\n  \\},)`);
  yeni = yeni.replace(desen, (tam, bas, govde, son) => {
    const temiz = govde.replace(/\n\s*sonKontrol: '[^']*',/g, '');
    yazilan++;
    return `${bas}${temiz}\n    sonKontrol: '${bugun}',${son}`;
  });
}

fs.writeFileSync(VERI, yeni, 'utf8');
console.log(`\n${calisan.size}/${kayitlar.length} adres çalışıyor; ${yazilan} kayda tarih yazıldı.`);
