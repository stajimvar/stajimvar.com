import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CV_EN_FAZLA_BAYT,
  CV_IMZA_OMRU,
  baytMetni,
  cvBasvuruYolu,
  cvProfilYolu,
  cvSorunu,
  cvYoluOgrenciyemi,
} from '../src/lib/cv-kurallari.mjs';

/*
  CV DOSYASI — İSTEMCİ KURALLARI

  Depolama yetkisi burada ölçülmüyor; onun yeri
  scripts/sql/rls-regresyon-testleri.sql (gerçek politikalarla, tek
  kullanımlık veritabanında). Burada saf kurallar ve modüllerin birbirine
  verdiği sözler duruyor.

  ANA KURAL
  Profildeki CV güncel belgedir; başvurudaki CV o anın belgesidir.
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

/**
 * Yorumları atar.
 *
 * "upsert kullanılmıyor" gibi kontroller kaynağı tararken yorumdaki
 * kelimeyi de yakalıyordu — yani doğru davranışı ANLATAN bir yorum,
 * testi kırıyordu. Kontroller koda bakmalı, açıklamaya değil.
 */
const kodu = (metin) =>
  metin.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const dosya = (ek = {}) => ({
  name: 'ozgecmis.pdf',
  type: 'application/pdf',
  size: 200 * 1024,
  ...ek,
});

/* ------------------------------------------------- yükleme kontrolleri */

test('geçerli PDF kabul ediliyor', () => {
  assert.equal(cvSorunu(dosya()), null);
});

test('PDF olmayan dosya reddediliyor', () => {
  assert.match(String(cvSorunu(dosya({ name: 'cv.docx', type: 'application/msword' }))), /PDF/);
  assert.match(String(cvSorunu(dosya({ name: 'cv.png', type: 'image/png' }))), /PDF/);
});

test('5 MB üstü reddediliyor', () => {
  assert.equal(cvSorunu(dosya({ size: CV_EN_FAZLA_BAYT })), null, 'tam sınır kabul edilmeli');
  assert.match(String(cvSorunu(dosya({ size: CV_EN_FAZLA_BAYT + 1 }))), /5 MB/);
});

test('boş dosya reddediliyor', () => {
  assert.match(String(cvSorunu(dosya({ size: 0 }))), /boş/i);
});

test('uzantısı .pdf olan dosya MIME beyanı eksikse de geçiyor', () => {
  /* Bazı mobil seçiciler type alanını boş bırakıyor; gerçek sınır kovada. */
  assert.equal(cvSorunu(dosya({ type: '' })), null);
});

test('boyut metni okunur', () => {
  assert.equal(baytMetni(240 * 1024), '240 KB');
  assert.equal(baytMetni(0), '');
  assert.equal(baytMetni(null), '');
  assert.match(baytMetni(1.8 * 1024 * 1024), /MB$/);
});

/* --------------------------------------------------------- yol şeması */

const KULLANICI = '00000000-0000-4000-8000-00000000000c';

test('yollar kullanıcının kendi klasöründe başlıyor', () => {
  const profil = cvProfilYolu(KULLANICI, () => 'sabit');
  const basvuru = cvBasvuruYolu(KULLANICI, () => 'sabit');
  assert.equal(profil, `${KULLANICI}/profil/sabit.pdf`);
  assert.equal(basvuru, `${KULLANICI}/basvurular/sabit.pdf`);
});

test('profil ve başvuru yolları birbirinden ayrı', () => {
  /* Aynı klasöre yazılsalardı bir yükleme diğerini ezebilirdi. */
  assert.notEqual(
    cvProfilYolu(KULLANICI, () => 'x'),
    cvBasvuruYolu(KULLANICI, () => 'x'),
  );
});

test('her çağrı yeni bir ad üretiyor', () => {
  /*
    Aynı ad üretilseydi ikinci yükleme "dosya zaten var" ile düşerdi:
    kovada UPDATE politikası yok, üzerine yazılamıyor.
  */
  assert.notEqual(cvProfilYolu(KULLANICI), cvProfilYolu(KULLANICI));
});

test('dosya adı rastgele; kişisel veri taşımıyor', () => {
  const kaynak = oku('src/lib/cv-kurallari.mjs');
  const govde = kaynak.slice(kaynak.indexOf('export function yeniCvAdi'), kaynak.indexOf('export function cvProfilYolu'));
  assert.match(govde, /randomUUID/, 'rastgele ad üretilmiyor');
  assert.doesNotMatch(govde, /fullName|email/, 'dosya adında kişisel veri var');
});

test('başka klasördeki yol öğrencinin sayılmıyor', () => {
  const baskasi = '00000000-0000-4000-8000-00000000000a';
  assert.equal(cvYoluOgrenciyemi(`${KULLANICI}/profil/a.pdf`, KULLANICI), true);
  assert.equal(cvYoluOgrenciyemi(`${baskasi}/profil/a.pdf`, KULLANICI), false);
  /* Yol geçişi denemesi de kendi klasörü sayılmamalı. */
  assert.equal(cvYoluOgrenciyemi(`../${baskasi}/profil/a.pdf`, KULLANICI), false);
  assert.equal(cvYoluOgrenciyemi(null, KULLANICI), false);
});

/* ---------------------------------------------------- değişmezlik sözü */

test('yükleme upsert kullanmıyor', () => {
  /*
    upsert, kovada UPDATE politikası gerektirir. O politika olmadığı için
    çıkarılmış bir başvuru kopyası üzerine yazılamıyor — değişmezlik
    uygulama kuralı değil, veritabanı kuralı. upsert geri gelirse bu söz
    sessizce bozulur.
  */
  assert.doesNotMatch(kodu(oku('src/lib/cv.ts')), /upsert/, 'cv.ts upsert kullanıyor');
});

test('gizli kovada public adres üretilmiyor', () => {
  const kaynak = kodu(oku('src/lib/cv.ts'));
  assert.doesNotMatch(kaynak, /getPublicUrl/, 'public adres üretiliyor');
  assert.match(kaynak, /createSignedUrl/, 'imzalı adres kullanılmıyor');
});

test('imza ömrü kısa', () => {
  assert.ok(CV_IMZA_OMRU > 0 && CV_IMZA_OMRU <= 900, `imza ömrü çok uzun: ${CV_IMZA_OMRU} sn`);
});

/* ----------------------------------------- başvuru kopyası gerçek kopya */

test('başvuru kopyası dosyayı indirip yeniden yüklüyor', () => {
  const kaynak = oku('src/lib/cv.ts');
  const govde = kaynak.slice(kaynak.indexOf('export async function cvBasvuruKopyasiCikar'));
  assert.match(govde, /\.download\(/, 'dosya indirilmiyor — yalnızca yol kopyalanıyor olabilir');
  assert.match(govde, /\.upload\(/, 'kopya yazılmıyor');
  assert.match(govde, /cvBasvuruYolu\(/, 'kopya başvuru klasörüne yazılmıyor');
});

/* ------------------------------------------- profil CV'sine düşme yasağı */

test('şirket kartı profil CV yoluna düşmüyor', () => {
  const adayKart = oku('src/lib/aday-kart.mjs');
  const bas = adayKart.indexOf('cvYolu:');
  const satir = adayKart.slice(bas, bas + 200);
  assert.match(satir, /cv_snapshot_path/, 'kopya yolu okunmuyor');
  /*
    Öğrencinin bugünkü profil CV'sine düşmek, şirkete değerlendirdiği
    belgenin yerine sonradan yüklenmiş başka bir belgeyi göstermek olurdu.
  */
  assert.doesNotMatch(satir, /student_profiles|cvPath/, 'profil CV’sine düşülüyor');
});

/* ---------------------------------------- başvuru kaydında alan seçimi */

test('createApplication cv_snapshot_path yazıyor, cv_path yazmıyor', () => {
  const q = oku('src/lib/queries/index.ts');
  const bas = q.indexOf('export async function createApplication');
  const govde = q.slice(bas, q.indexOf('export async function withdrawApplication'));
  assert.match(govde, /cv_snapshot_path:/, 'kopya yolu yazılmıyor');
  assert.doesNotMatch(govde, /^\s*cv_path:/m, 'eski cv_path alanına yazılıyor');
});

/* ------------------------------------------------ profil silme davranışı */

test('profil CV silme yalnızca profil yolunu kaldırıyor', () => {
  const alan = oku('src/components/CvAlani.tsx');
  const bas = alan.indexOf('const sil = async');
  const govde = kodu(alan.slice(bas, alan.indexOf('const mesgul')));
  assert.match(govde, /onDegisti\(null\)/, 'profil kaydı temizlenmiyor');
  /*
    Geçmiş başvuruların kopyaları ayrı dosyalar; burada yalnızca güncel
    belge siliniyor. Toplu bir silme (klasör/liste) buraya girerse şirket
    değerlendirdiği belgeyi kaybeder.
  */
  assert.doesNotMatch(govde, /basvurular|remove\(\[/, 'silme başvuru kopyalarına uzanıyor');
});
