import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  PROFİL DÜZENLEME — CV ALANLARI ARAYÜZÜ (10 Ekim 2026; 11 Ekim'de tek
  taslağa geçti)

  Öğrenci profilini bir kez doldurup kurumsal bir CV indirebilmeli. Bu
  testler ekranın parçalarının taslağa bağlı kaldığını ve birbirinden
  ayrışmadığını tutuyor. Taslağın davranışı (çoklu seçim, tekrar,
  doğrulama) tests/profil-taslagi.test.mjs'de gerçek verilerle sınanıyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');
const EKRAN = oku('src/components/ProfilDuzenleme.tsx');
const SECICI = oku('src/components/profil/EtiketSecici.tsx');
const SINIFLAR = oku('src/components/profil/form-siniflari.ts');
const GORUNURLUK = oku('src/components/profil/CvGorunurluk.tsx');
const DIL_YETENEK = oku('src/components/profil/DilVeYetenek.tsx');
const TASLAK = oku('src/lib/profil-taslagi.mjs');
const SECENEKLER = oku('src/data/cv-secenekleri.ts');

test('bölümler ekrana bağlı', () => {
  for (const parca of ['<KisiselBilgiler', '<Baglantilar', '<DeneyimListesi', '<EgitimListesi', '<DilListesi', '<YetenekVeIlgi', '<ProjeListesi', '<SertifikaListesi', '<TercihAyarlari', '<CvGorunurluk']) {
    assert.ok(EKRAN.includes(parca), parca);
  }
  /* Görünürlük taslaktan okuyor ve taslağa yazıyor; kayıt toplu. */
  assert.match(EKRAN, /student=\{\{ \.\.\.student, cvGizli: t\.cvGizli as CvGizliAlan\[\] \}\}/);
  assert.match(EKRAN, /onDegis=\{\(gizli\) => degistir\(\(o\) => \(\{ \.\.\.o, cvGizli: gizli \}\)\)\}/);
});

test('yetenekler çoklu seçiciden, tekrar etmeyen tek yoldan ekleniyor', () => {
  assert.match(DIL_YETENEK, /<EtiketSecici\s+kimlik="yetenek-sec"/);
  /* Seçici Türkçe küçük harfle karşılaştırıyor: "İletişim" ile "iletişim" aynı. */
  assert.ok(SECICI.includes("s.trim().toLocaleLowerCase('tr-TR')"));
  assert.match(SECICI, /seciliAnahtarlar\.has\(sorguAnahtari\)/);
  assert.match(DIL_YETENEK, /o\.yetenekler\.some\(\(y\) => ayni\(y, ad\)\) \? o :/);
  /* Seçim sunucuya tek tek gitmiyor: yalnız taslak değişiyor. */
  assert.doesNotMatch(DIL_YETENEK, /onUpdateProfile|kaydet\(/);
});

test('hazır yetenekler bölüme göre SINIRLANMIYOR', () => {
  /* Gruplar yalnız bulmayı kolaylaştırıyor; hepsi her zaman çiziliyor. */
  assert.ok(!/department|bolum/i.test(SECICI.replace(/\/\*[\s\S]*?\*\//g, '')));
  const gruplar = [...SECENEKLER.matchAll(/baslik: '([^']+)'/g)].map((m) => m[1]);
  assert.ok(gruplar.length >= 6, 'grup sayısı');
});

test('ilgi alanı sınırı sunucuyla aynı (20)', () => {
  assert.match(TASLAK, /export const ILGI_SINIRI = 20;/);
  assert.match(DIL_YETENEK, /o\.ilgiler\.length >= ILGI_SINIRI/);
});

test('ana dil seçilebiliyor', () => {
  assert.match(TASLAK, /\{ deger: 'Ana dil', etiket: 'Ana dil' \}/);
});

test('sertifika bağlantısı yalnız http(s)', () => {
  /* Sunucudaki CHECK ile aynı kural; `javascript:` CV'de tıklanabilir olurdu. */
  assert.ok(TASLAK.includes('if (!/^https?:\\/\\//i.test(tam)) return null;'));
  assert.match(TASLAK, /const url = adresDuzelt\(c\.url\);/);
});

test('görünürlük: profilde olmayan bilgi için anahtar devre dışı', () => {
  assert.match(GORUNURLUK, /disabled=\{kilitli \|\| !mevcut\}/);
  assert.match(GORUNURLUK, /role="switch"/);
});

test('ortak form sınıfları tek kaynakta', () => {
  /* Ekran kendi kopyasını tutmuyor; bütün parçalar form-siniflari'ndan okuyor. */
  assert.match(EKRAN, /import \{ BIRINCIL, IKINCIL \} from '\.\/profil\/form-siniflari';/);
  assert.doesNotMatch(EKRAN, /^const (ALAN|ETIKET|BIRINCIL|IKINCIL) =/m);
  for (const ad of ['ALAN', 'ETIKET', 'IPUCU', 'HATA', 'BIRINCIL', 'IKINCIL', 'EKLE', 'KUCUK_EYLEM']) {
    assert.match(SINIFLAR, new RegExp(`export const ${ad} =`), ad);
  }
});

test('eğitimde devam ediyor bilgisi uydurulmuyor', () => {
  /* Boşsa (eski kayıt) sınıftan türetiliyor; mezun "devam ediyor" görünmüyor. */
  assert.match(TASLAK, /const suruyor = s\.educationOngoing \?\? \(s\.gradeLevel \?\? ''\) !== MEZUN;/);
  assert.match(TASLAK, /sonYil: s\.educationOngoing === false \? yilMetni\(s\.graduationYear\) : '',/);
});
