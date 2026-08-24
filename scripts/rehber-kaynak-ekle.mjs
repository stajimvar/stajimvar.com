/**
 * Rehberlere resmî kaynak ekler (tek seferlik düzenleme betiği).
 *
 * NEDEN
 * -----
 * Editoryal denetimde ölçüldü: 70 rehberin yalnızca 16'sında `kaynaklar`
 * alanı doluydu. Mevzuata, başvuru sürecine ya da resmî bir kuruma değen
 * her yazının "bunu nereden doğrularım" sorusuna cevap vermesi gerekiyor.
 *
 * NEREYE EKLENMİYOR
 * -----------------
 * Tavsiye niteliğindeki yazılara (CV nasıl yazılır, mülakatta ne sorulur,
 * maaş nasıl konuşulur) kaynak EKLENMİYOR. Bunların arkasında bir resmî
 * kurum yok; oraya alakasız bir bakanlık bağlantısı koymak kaynağı süse
 * çevirir ve gerçekten kaynaklı yazıların değerini düşürür.
 *
 * Aşağıdaki adreslerin hepsi 200 döndürdüğü ve sayfa başlığının iddia
 * edilen kurumla eşleştiği doğrulandı.
 *
 * Kullanım: node scripts/rehber-kaynak-ekle.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const KOK = path.resolve(import.meta.dirname, '..');
const DIZIN = path.join(KOK, 'src', 'data', 'rehber-yazilari');

const K = {
  kygm: { etiket: 'Gençlik ve Spor Bakanlığı — KYGM', adres: 'https://kygm.gsb.gov.tr' },
  edevlet: { etiket: 'e-Devlet Kapısı', adres: 'https://www.turkiye.gov.tr' },
  sgk: { etiket: 'Sosyal Güvenlik Kurumu', adres: 'https://www.sgk.gov.tr' },
  csgb: { etiket: 'Çalışma ve Sosyal Güvenlik Bakanlığı', adres: 'https://www.csgb.gov.tr' },
  meb: { etiket: 'Millî Eğitim Bakanlığı', adres: 'https://www.meb.gov.tr' },
  yok: { etiket: 'Yükseköğretim Kurulu (YÖK)', adres: 'https://www.yok.gov.tr' },
  ua: { etiket: 'Türkiye Ulusal Ajansı', adres: 'https://www.ua.gov.tr' },
  usom: { etiket: 'USOM — Ulusal Siber Olaylara Müdahale Merkezi', adres: 'https://www.usom.gov.tr' },
  ticaret: { etiket: 'Ticaret Bakanlığı — Tüketici bilgi sistemi', adres: 'https://www.ticaret.gov.tr' },
  mfa: { etiket: 'Dışişleri Bakanlığı', adres: 'https://www.mfa.gov.tr' },
  iskur: { etiket: 'Türkiye İş Kurumu (İŞKUR)', adres: 'https://www.iskur.gov.tr' },
  iaeste: { etiket: 'IAESTE', adres: 'https://iaeste.org' },
};

/** slug -> eklenecek kaynaklar. Yalnızca gerçekten ilgili kurumlar. */
const EKLE = {
  // staj
  'uzaktan-staj-kabul-edilir-mi': [K.yok],
  'stajyerin-gorev-ve-sorumluluklari': [K.csgb],
  'kotu-gecen-stajda-ne-yapilir': [K.csgb],
  'stajda-izin-ve-devamsizlik': [K.yok],

  // burs
  'ayni-anda-birden-fazla-burs': [K.kygm],
  'burs-hangi-durumlarda-kesilir': [K.kygm],
  'karsiliksiz-ve-geri-odemeli-burs-farki': [K.kygm],
  'burs-dolandiriciligi': [K.usom, K.edevlet],
  'burs-mulakati': [K.kygm],

  // yurt
  'yurt-izin-ve-giris-cikis': [K.kygm],
  'yurttan-kayit-silme': [K.kygm],
  'ozel-yurt-secerken': [K.meb],
  'ogrenci-evi-kiralarken': [K.ticaret],
  'depozito-ve-kira-sozlesmesi': [K.ticaret],
  'baska-sehirde-staj-barinma': [K.kygm],

  // üniversite
  'ogrenci-isleri-hangi-islemler': [K.edevlet],
  'cift-anadal-ve-yan-dal': [K.yok],
  'ogrenciyken-yari-zamanli-calisma': [K.sgk, K.csgb],
  'mezun-olmadan-once-yapilacaklar': [K.edevlet],
  'yaz-okulu-ve-staj': [K.yok],

  // yurtdışı
  'iaeste-ile-yurtdisinda-staj': [K.iaeste],
  'yurtdisi-staj-vizesi': [K.mfa],
  'yurtdisinda-staj-sigortasi': [K.sgk],
  'yurtdisi-burslari': [K.meb, K.yok],
  'yurtdisinda-barinma': [K.ua],

  // kariyer
  'is-teklifini-degerlendirme': [K.csgb],
  'yeni-mezun-programlari': [K.iskur],
  'maas-beklentisi-nasil-soylenir': [K.csgb],
};

const bicimle = (liste) =>
  '    kaynaklar: [\n' +
  liste.map((k) => `      { etiket: '${k.etiket.replace(/'/g, "\\'")}', adres: '${k.adres}' },`).join('\n') +
  '\n    ],\n';

let toplam = 0;
for (const dosya of fs.readdirSync(DIZIN).filter((d) => d.endsWith('.tsx'))) {
  const yol = path.join(DIZIN, dosya);
  let metin = fs.readFileSync(yol, 'utf8');
  let degisti = 0;

  for (const [slug, kaynaklar] of Object.entries(EKLE)) {
    const kanca = `    slug: '${slug}',`;
    if (!metin.includes(kanca)) continue;

    /* Kayıt zaten kaynaklıysa dokunma: elle girilmiş olan doğrudur. */
    const bas = metin.indexOf(kanca);
    const sonrakiKayit = metin.indexOf('  metinRehberi({', bas + 10);
    const kapsam = metin.slice(bas, sonrakiKayit === -1 ? undefined : sonrakiKayit);
    if (kapsam.includes('kaynaklar: [')) continue;

    /* Kaynaklar, sonrakiAdim'dan hemen önce duruyor — sıra hep aynı olsun. */
    const adimIzi = '    sonrakiAdim: {';
    const adimYeri = metin.indexOf(adimIzi, bas);
    if (adimYeri === -1 || (sonrakiKayit !== -1 && adimYeri > sonrakiKayit)) continue;

    metin = metin.slice(0, adimYeri) + bicimle(kaynaklar) + metin.slice(adimYeri);
    degisti++;
  }

  if (degisti) {
    fs.writeFileSync(yol, metin);
    console.log(`${dosya.padEnd(18)} ${degisti} yazıya kaynak eklendi`);
    toplam += degisti;
  }
}

console.log(`\ntoplam ${toplam} yazı güncellendi`);
