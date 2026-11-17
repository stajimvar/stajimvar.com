import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { okulAnahtari, okulaGoreBolumler } from '../src/lib/okul-bolumleri.mjs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const veri = JSON.parse(oku('src/data/universite-bolumleri.json'));
const liste = (ad) => {
  const s = oku('src/data/turkeyData.ts');
  const bas = s.indexOf(`export const ${ad}: string[] = [`);
  return s.slice(bas, s.indexOf('];', bas)).split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith("'")).map((l) => l.slice(1, -2));
};
const UNI = liste('TR_UNIVERSITIES');
const BOLUM = liste('TR_DEPARTMENTS');

test('YÖK kılavuzundaki her okul listemizde var (KKTC dahil)', () => {
  assert.ok(Object.keys(veri.okullar).length >= 228);
  const bizim = new Set(UNI.map(okulAnahtari));
  const eksik = Object.keys(veri.okullar).filter((k) => !bizim.has(k));
  assert.deepEqual(eksik, []);
  for (const ad of ['Doğu Akdeniz Üniversitesi (KKTC)', 'Ostim Teknik Üniversitesi', 'Mudanya Üniversitesi', 'Türk-Japon Bilim ve Teknoloji Üniversitesi'])
    assert.ok(UNI.includes(ad), ad);
});

test('YÖK kılavuzundaki her program bölüm listemizde var; listeler tekrarsız ve sıralı', () => {
  const b = new Set(BOLUM);
  assert.deepEqual(veri.programlar.filter((p) => !b.has(p)), []);
  for (const ad of ['Adalet', 'Müzik Öğretmenliği', 'Resim-İş Öğretmenliği', 'Spor Yöneticiliği']) assert.ok(b.has(ad), ad);
  for (const L of [UNI, BOLUM]) {
    assert.equal(new Set(L).size, L.length);
    assert.deepEqual([...L].sort((x, y) => x.localeCompare(y, 'tr')), L);
  }
});

test('okul anahtarı: büyük harf, il parantezi ve Türkçe harf farkı önemsiz', () => {
  assert.equal(okulAnahtari('KOÇ ÜNİVERSİTESİ (İSTANBUL)'), okulAnahtari('Koç Üniversitesi'));
  assert.equal(okulAnahtari('DOĞU AKDENİZ ÜNİVERSİTESİ (KKTC-GAZİMAĞUSA)'), okulAnahtari('Doğu Akdeniz Üniversitesi (KKTC)'));
});

test('okul seçilince önce o okulun programları, sonra genel liste; tanınmayan okulda genel liste', () => {
  const genel = BOLUM;
  const koc = okulaGoreBolumler(veri, 'Koç Üniversitesi', genel);
  const kocun = veri.okullar[okulAnahtari('Koç Üniversitesi')].map((i) => veri.programlar[i]);
  assert.deepEqual(koc.slice(0, kocun.length), kocun);
  assert.equal(new Set(koc).size, koc.length);
  assert.equal(koc.length, new Set([...kocun, ...genel]).size);
  assert.equal(okulaGoreBolumler(veri, 'Hayali Okul', genel), genel);
  assert.equal(okulaGoreBolumler(null, 'Koç Üniversitesi', genel), genel);
});

test('üç form okula göre bölüm öneriyor', () => {
  assert.match(oku('src/components/OgrenciTemelBilgileri.tsx'), /bolumSecenekleri\(bilgi\.university\)/);
  assert.match(oku('src/components/profil/KayitListeleri.tsx'), /options=\{bolumSecenekleri\(e\.okul\)\}/);
  assert.match(oku('src/components/CvOlusturucu.tsx'), /options=\{bolumSecenekleri\(taslak\.university\)\}/);
  assert.match(oku('src/lib/useOkulBolumleri.ts'), /import\('\.\.\/data\/universite-bolumleri\.json'\)/);
});

test('yeni katalogla eşleşen eski profiller bir kez onarılıyor', () => {
  const g = oku('supabase/migrations/20270118020000_bolum_eslesme_onarimi.sql');
  assert.match(g, /where so\.department_id is null/);
  assert.match(g, /sosyal_gizli\.bolumu_esle\(sp\.department\) is not null/);
  assert.match(g, /perform sosyal_gizli\.sosyal_profil_ac\(kim\);/);
});
