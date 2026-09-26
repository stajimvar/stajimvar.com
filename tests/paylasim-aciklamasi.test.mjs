import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  PAYLAŞIM AÇIKLAMASI (kullanıcı kararı, 26 Eylül 2026)

  Ağım akışında açıklama görselin altında (etkileşimlerden sonra, @ad
  ile); uzun metin kısa önizlemeyle başlıyor ve "daha fazla" ile
  açılıyor. Profil akışı (PaylasimGovdesi 'akis') da aynı bileşeni
  kullanıyor; diyalogda metin hep tam.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const yorumsuz = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
const KART = yorumsuz(oku('src/components/sosyal/AkisKarti.tsx'));
const GOVDE = yorumsuz(oku('src/components/sosyal/PaylasimGovdesi.tsx'));
const ACIKLAMA = oku('src/components/sosyal/PaylasimAciklamasi.tsx');

test('akış kartında açıklama görselin ve beğeni sayısının altında, tek yerde', () => {
  const gorsel = KART.indexOf('paylasim.gorseller.map(');
  const begeni = KART.indexOf('beğeni</p>');
  const aciklama = KART.indexOf('<PaylasimAciklamasi');
  assert.ok(gorsel > 0 && begeni > gorsel && aciklama > begeni, `${gorsel} < ${begeni} < ${aciklama}`);
  assert.equal((KART.match(/paylasim\.aciklama\}/g) || []).length, 1, 'açıklama ikinci kez çizilmiyor');
  assert.match(KART, /yazar=\{paylasim\.yazar\.kullaniciAdi \? `@\$\{paylasim\.yazar\.kullaniciAdi\}` : ad\}/);
});

test('profil akışında kısaltılıyor, diyalogda tam', () => {
  assert.match(GOVDE, /<PaylasimAciklamasi\s+metin=\{paylasim\.aciklama\}\s+kisaltilsin=\{!diyalog\}/);
});

test('"daha fazla" / "daha az" düğmesi, aria-expanded ve 95 harf eşiği', () => {
  assert.match(ACIKLAMA, /const ONIZLEME_UZUNLUGU = 95;/);
  assert.match(ACIKLAMA, /Array\.from\(tekSatir\)/);
  assert.match(ACIKLAMA, /aria-expanded=\{acik\}/);
  assert.match(ACIKLAMA, /\{acik \? 'daha az' : 'daha fazla'\}/);
  /* Açıkken de metinle düğme arasında boşluk var. */
  assert.match(ACIKLAMA, /\{acik \? ' ' : '… '\}/);
});
