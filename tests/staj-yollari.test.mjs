import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  ÜÇ YOLDAKİ BAĞLANTILAR GERÇEK SAYFALARA GİTSİN

  StajYollari rehber girişinin ilk bloğu ve elle yazılmış 13 slug taşıyor.
  Bir rehberin slug'ı değişirse ya da yazı silinirse buradaki bağlantı
  sessizce 404 olur — üstelik sayfanın EN ÜSTÜNDE, yani en çok tıklanan
  yerde. Bu test o kopmayı derleme zamanında yakalıyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');

const kaynak = fs.readFileSync(path.join(KOK, 'src/components/StajYollari.tsx'), 'utf8');

function mevcutSluglar() {
  const bulunan = new Set();
  const dizin = path.join(KOK, 'src/data/rehber-yazilari');
  const dosyalar = fs
    .readdirSync(dizin)
    .filter((d) => d.endsWith('.tsx'))
    .map((d) => path.join(dizin, d));
  dosyalar.push(path.join(KOK, 'src/data/rehberler.tsx'));

  for (const dosya of dosyalar) {
    const metin = fs.readFileSync(dosya, 'utf8');
    for (const e of metin.matchAll(/slug: '([a-z0-9-]+)'/g)) bulunan.add(e[1]);
  }
  return bulunan;
}

test('üç yoldaki her rehber bağlantısının karşılığı var', () => {
  const kullanilan = [...new Set([...kaynak.matchAll(/yol: '\/rehber\/([a-z0-9-]+)'/g)].map((e) => e[1]))];
  assert.ok(kullanilan.length >= 10, 'yol bağlantıları okunamadı');

  const mevcut = mevcutSluglar();
  const kirik = kullanilan.filter((s) => !mevcut.has(s));
  assert.deepEqual(
    kirik,
    [],
    'Bu rehberler yok ama üç yol bloğunda bağlantısı var:\n  ' + kirik.join('\n  ')
  );
});

/*
  ZORUNLU STAJ SIRASI KORUNSUN

  Dört adımın SIRASI bilginin kendisi: belge olmadan sigorta, sigorta
  olmadan defter yürümüyor. Sıra bozulursa liste yanlış şey öğretir.
*/
test('zorunlu staj adımları belge → sigorta → defter → ücret sırasında', () => {
  const blok = kaynak.slice(kaynak.indexOf('ZORUNLU_ADIMLAR'));
  const sluglar = [...blok.matchAll(/yol: '\/rehber\/([a-z0-9-]+)'/g)].map((e) => e[1]).slice(0, 4);
  assert.deepEqual(sluglar, [
    'staj-basvurusu-gerekli-belgeler',
    'staj-sigortasi-kim-yapar',
    'staj-defteri-nasil-doldurulur',
    'staj-ucreti-nasil-hesaplanir',
  ]);
});

/*
  İÇ BAĞLANTI GERÇEK <a href> OLMALI

  Düğmeye bastırılan geçişi tarayıcı bağlantı saymıyor; rehber sayfaları
  arasında sinyal taşınması için gerçek adres şart. Bu daha önce ölçülmüş
  bir sorundu (bkz. GuidePages ve RehberMerkezi notları).
*/
test('yollar düğmeyle değil bağlantıyla geziliyor', () => {
  assert.match(kaynak, /<a\s[\s\S]*?href=\{yol\}/, 'gerçek <a href> yok');
});
