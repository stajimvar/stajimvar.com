/**
 * REHBER KALİTE SAYIMI
 *
 * Amaç: hangi rehberin reklam gösterilebilecek editoryal değerde olduğunu
 * ÖLÇMEK. Kelime sayısı tek başına karar değil — Google'ın yazmadığı
 * "1000 kelime" gibi bir eşiği politika diye kodlamıyoruz. Kelime sayısı
 * kanıtlardan yalnız biri.
 *
 * Ölçülen sinyaller: gövde uzunluğu, örnek/karşılaştırma bloğu, kontrol
 * listesi ve tablo, sık sorulanlar, resmî kaynak, iç bağlantı, hızlı
 * cevap ve son gözden geçirme tarihi.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { editoryalDeger } from '../src/lib/reklam-kapisi.mjs';

const KOK = path.dirname(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')));

/*
  KELİME SAYIMI ÖN RENDER ÇIKTISINDAN

  İlk sürüm JSX kaynağını sayıyordu ve `{...}` ifadelerini attığı için
  ortalamayı 151 kelime gösteriyordu — gerçek değer 384. Kullanıcının
  gördüğü metin ön render edilmiş HTML'de duruyor; ölçüm oradan.
*/
function onRenderKelime(slug) {
  const dosya = path.join(KOK, 'dist', 'rehber', `${slug}.html`);
  if (!fs.existsSync(dosya)) return null;
  const html = fs.readFileSync(dosya, 'utf8');
  const m = /data-seo-prerender>([\s\S]*)/.exec(html);
  if (!m) return null;
  return m[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((x) => x.length > 1).length;
}

/** JSX gövdesinden okunabilir metin. */
function metin(jsx) {
  return jsx
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^{}]*\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function kelimeSay(s) {
  return metin(s).split(' ').filter((x) => x.length > 1).length;
}

/** Bir rehber bloğunun kaynak metnini slug'a göre ayırır. */
function rehberBloklari(kaynak) {
  const bloklar = [];
  const kalip = /slug:\s*'([^']+)'/g;
  let m;
  const konumlar = [];
  while ((m = kalip.exec(kaynak)) !== null) konumlar.push({ slug: m[1], index: m.index });
  for (let i = 0; i < konumlar.length; i += 1) {
    const bas = konumlar[i].index;
    const son = i + 1 < konumlar.length ? konumlar[i + 1].index : kaynak.length;
    bloklar.push({ slug: konumlar[i].slug, govde: kaynak.slice(bas, son) });
  }
  return bloklar;
}

export function rehberleriOlc() {
  const dosyalar = fs
    .readdirSync(path.join(KOK, 'src/data/rehber-yazilari'))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => path.join(KOK, 'src/data/rehber-yazilari', f));
  dosyalar.push(path.join(KOK, 'src/data/rehberler.tsx'));

  const sonuc = [];
  for (const dosya of dosyalar) {
    const kaynak = fs.readFileSync(dosya, 'utf8');
    for (const { slug, govde } of rehberBloklari(kaynak)) {
      const kelime = onRenderKelime(slug) ?? kelimeSay(govde);
      const sinyal = {
        slug,
        dosya: path.basename(dosya),
        kelime,
        sss: (govde.match(/soru:/g) || []).length,
        kaynak: (govde.match(/adres:\s*'https?:/g) || []).length,
        karsilastirma: /<Karsilastirma/.test(govde),
        liste: (govde.match(/<li>|<L>|<Adim/g) || []).length,
        tablo: /<Tablo|<table/.test(govde),
        hizliCevap: /hizliCevap:/.test(govde),
        guncelleme: /guncelleme:/.test(govde),
        sonrakiAdim: /sonrakiAdim:/.test(govde),
      };

      /*
        Puanlama TEK KAYNAKTAN: `src/lib/reklam-kapisi.mjs`. Sayım ile
        çalışma zamanı ayrı formül kullansaydı rapor ile sayfanın
        davranışı ayrışırdı.
      */
      const karar = editoryalDeger(sinyal);
      sinyal.puan = karar.puan;
      sinyal.sinif = karar.sinif;
      sinyal.reklamUygun = karar.reklamUygun;
      sonuc.push(sinyal);
    }
  }
  return sonuc;
}

/**
 * Reklam uygun rehber listesini kaynak dosyaya yazar.
 *
 * Liste ÜRETİLİYOR, elle tutulmuyor: sayım ile uygulamanın ayrı listeler
 * taşıması, raporun sayfanın davranışını anlatmaması demek olurdu.
 */
function listeyiYaz(hepsi) {
  const uygun = hepsi.filter((r) => r.reklamUygun).map((r) => r.slug).sort();
  const govde = [
    '/*',
    ' * REKLAM GÖSTERİLEBİLECEK REHBERLER — ÜRETİLMİŞ DOSYA',
    ' *',
    ' * `node scripts/rehber-sayimi.mjs --yaz` üretiyor; elle düzenlenmiyor.',
    ' * Kapı `src/lib/reklam-kapisi.mjs` içindeki editoryalDeger(); burada',
    ' * yalnız o kapıdan geçen sluglar duruyor.',
    ' *',
    ' * Kelime sayısı tek başına ölçüt değil: 70 rehberin medyanı 396',
    ' * kelime ve en uzunu 894. İnternette dolaşan "1000 kelime" eşiği bu',
    ' * sitede her şeyi elerdi ve hiçbir şey anlatmazdı.',
    ' */',
    'export const REKLAM_UYGUN_REHBERLER: readonly string[] = [',
    ...uygun.map((s) => `  '${s}',`),
    '];',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(KOK, 'src/data/reklam-uygun-rehberler.ts'), govde, 'utf8');
  console.error(`reklam uygun rehber yazıldı: ${uygun.length}`);
}

function main() {
  const hepsi = rehberleriOlc();
  if (process.argv.includes('--yaz')) listeyiYaz(hepsi);
  const sayim = {};
  for (const r of hepsi) sayim[r.sinif] = (sayim[r.sinif] || 0) + 1;
  const cikti = {
    toplam: hepsi.length,
    sinif: sayim,
    ortalamaKelime: Math.round(hepsi.reduce((a, r) => a + r.kelime, 0) / hepsi.length),
    reklamUygun: hepsi.filter((r) => r.reklamUygun).length,
    reklamUygunSluglar: hepsi.filter((r) => r.reklamUygun).map((r) => r.slug),
    zayiflar: hepsi
      .filter((r) => r.sinif !== 'EDITORIAL_STRONG')
      .sort((a, b) => a.puan - b.puan)
      .map((r) => ({ slug: r.slug, puan: r.puan, kelime: r.kelime, sinif: r.sinif })),
  };
  console.log(JSON.stringify(cikti, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
