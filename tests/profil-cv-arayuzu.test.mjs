import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  PROFİL DÜZENLEME — CV ALANLARI ARAYÜZÜ (10 Ekim 2026)

  Öğrenci profilini bir kez doldurup kurumsal bir CV indirebilmeli. Bu
  testler ekranın yeni parçalarının bağlı kaldığını ve birbirinden
  ayrışmadığını tutuyor. Akışların kendisi (ekle, düzenle, sil, hata)
  geliştirme fikstüründe tarayıcıda denendi: profil-duzenleme-test.html.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');
const EKRAN = oku('src/components/ProfilDuzenleme.tsx');
const SECICI = oku('src/components/profil/EtiketSecici.tsx');
const SINIFLAR = oku('src/components/profil/form-siniflari.ts');
const SERTIFIKA = oku('src/components/profil/Sertifikalar.tsx');
const GORUNURLUK = oku('src/components/profil/CvGorunurluk.tsx');
const SECENEKLER = oku('src/data/cv-secenekleri.ts');

test('yeni bölümler ekrana bağlı', () => {
  assert.match(EKRAN, /<EkEgitimler\s+kayitlar=\{student\.educations \?\? \[\]\}/);
  assert.match(EKRAN, /<Sertifikalar\s+kayitlar=\{student\.certificates \?\? \[\]\}/);
  assert.match(EKRAN, /<CvGorunurluk\s+student=\{student\}/);
  assert.ok(EKRAN.includes("| 'sertifika'"), 'sertifika bölümü tipte yok');
});

test('yetenekler çoklu seçiciden, tekrar etmeyen tek yoldan ekleniyor', () => {
  assert.match(EKRAN, /<EtiketSecici\s+kimlik="yetenek-sec"/);
  /* Yazılı "Beceriler" girişi kalktı: aynı listeyi iki kontrolle yönetmek iki davranış demekti. */
  assert.ok(!EKRAN.includes('id="beceri-ekle"'));
  /* Seçici Türkçe küçük harfle karşılaştırıyor: "İletişim" ile "iletişim" aynı. */
  assert.ok(SECICI.includes("s.trim().toLocaleLowerCase('tr-TR')"));
  assert.match(SECICI, /seciliAnahtarlar\.has\(sorguAnahtari\)/);
});

test('hazır yetenekler bölüme göre SINIRLANMIYOR', () => {
  /* Gruplar yalnız bulmayı kolaylaştırıyor; hepsi her zaman çiziliyor. */
  assert.ok(!/department|bolum/i.test(SECICI.replace(/\/\*[\s\S]*?\*\//g, '')));
  const gruplar = [...SECENEKLER.matchAll(/baslik: '([^']+)'/g)].map((m) => m[1]);
  assert.ok(gruplar.length >= 6, 'grup sayısı');
});

test('hızlı seçimde iki kayıt üst üste binmiyor', () => {
  /* Kaydediliyorken dokunuş kilitli: ikinci dokunuş ilkinin listesinin üstüne yazardı. */
  assert.match(EKRAN, /kilitli=\{durumlar\.yetenek === 'kaydediliyor'\}/);
});

test('ilgi alanı sınırı sunucuyla aynı (20)', () => {
  assert.match(EKRAN, /if \(ilgiler\.length >= 20\)/);
});

test('ana dil seçilebiliyor', () => {
  assert.match(EKRAN, /const DIL_SEVIYELERI = \['Ana dil', 'A1'/);
});

test('sertifika bağlantısı yalnız http(s)', () => {
  /* Sunucudaki CHECK ile aynı kural; `javascript:` CV'de tıklanabilir olurdu. */
  assert.ok(SERTIFIKA.includes('if (!/^https?:\\/\\//i.test(tam)) return null;'));
});

test('görünürlük: profilde olmayan bilgi için anahtar devre dışı', () => {
  assert.match(GORUNURLUK, /disabled=\{kilitli \|\| !mevcut\}/);
  assert.match(GORUNURLUK, /role="switch"/);
});

test('ortak form sınıfları ekrandakiyle birebir', () => {
  for (const ad of ['ALAN', 'ETIKET', 'IPUCU', 'HATA', 'BIRINCIL', 'IKINCIL', 'EKLE', 'KUCUK_EYLEM']) {
    const ekranda = EKRAN.match(new RegExp(`const ${ad} =\\s*([\`'][^\`']+[\`'])`));
    const modulde = SINIFLAR.match(new RegExp(`export const ${ad} =\\s*([\`'][^\`']+[\`'])`));
    assert.ok(ekranda && modulde, `${ad} bulunamadı`);
    assert.equal(modulde[1], ekranda[1], `${ad} ayrışmış`);
  }
});

test('eğitimde devam ediyor bilgisi uydurulmuyor', () => {
  /* Boşsa (eski kayıt) sınıftan türetiliyor; mezun "devam ediyor" görünmüyor. */
  assert.match(EKRAN, /student\.educationOngoing \?\? student\.gradeLevel !== 'Yüksek Lisans \/ Mezun'/);
});
