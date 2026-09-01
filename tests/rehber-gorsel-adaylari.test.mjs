import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { adaylar, puanla } from '../scripts/rehber-gorsel-adaylari.mjs';

/*
  SIRADAKİ GÖRSEL ADAYI SEÇİMİ

  Bu sıralamanın işi "hangi rehbere görsel eklenmeli" sorusunu ölçüyle
  cevaplamak. İki hata sınıfına karşı korunuyor:

  1) Zaten görselleşmiş bir rehberin tekrar aday çıkması.
  2) Kısa bir yazının yalnız popüler olduğu için üste çıkması — orada
     eksik olan görsel değil, içerik.
*/

const KOK = path.resolve(import.meta.dirname, '..');

test('görsel bileşeni olan rehber aday listesinde çıkmıyor', () => {
  const { sirali } = adaylar();
  for (const r of sirali) assert.equal(r.mevcut.length, 0, `${r.slug}: zaten görselli`);
});

test('bu turda görselleştirilen beş rehber artık aday değil', () => {
  const { sirali } = adaylar();
  const adlar = new Set(sirali.map((r) => r.slug));
  for (const slug of [
    'staj-nasil-bulunur',
    'staj-cv-nasil-yazilir',
    'staj-basvuru-epostasi',
    'staj-mulakati',
    'zorunlu-staj-rehberi',
  ]) {
    assert.ok(!adlar.has(slug), `${slug} hâlâ aday görünüyor`);
  }
});

test('kısa yazı ceza alıyor — görsel dolgu olmuyor', () => {
  const kisa = puanla({ slug: 'deneme', govde: "slug: 'deneme', konu: 'staj', adım sonra adım" });
  assert.ok(kisa.puan < 0, `kısa yazı puanı ${kisa.puan}`);
  assert.match(kisa.nedenler.join(' '), /görsel dolgu olur/);
});

test('sıra ve karşılaştırma sinyali puanı yükseltiyor', () => {
  const dolgu = ' kelime'.repeat(800);
  const yalin = puanla({ slug: 'a', govde: `slug: 'a',${dolgu}` });
  const surecli = puanla({
    slug: 'b',
    govde: `slug: 'b', adım adım adım sonra sonra sonra ardından${dolgu}`,
  });
  assert.ok(surecli.puan > yalin.puan, 'süreç sinyali puanı artırmalı');
});

test('veriyle yazılmış görsel de sayılıyor — yalnız JSX değil', () => {
  /*
    `metinRehberi` rehberleri görseli bir blok anahtarıyla çiziyor.
    Yalnız `<RehberFigur` aramak, bu turda görsel eklenen üç rehberi
    hâlâ "aday" gösteriyordu (ölçüldü).
  */
  const { hepsi } = adaylar();
  for (const slug of [
    'staj-sigortasi-kim-yapar',
    'staj-basvurusu-gerekli-belgeler',
    'kotu-gecen-stajda-ne-yapilir',
  ]) {
    const r = hepsi.find((x) => x.slug === slug);
    assert.ok(r.varlikVar, `${slug}: veri figürü görülmedi`);
    assert.equal(r.sinif, 'GORSEL_YETERLI');
  }
});

test('sınıflar birbirini dışlıyor ve hepsi kaplanıyor', () => {
  const { hepsi, firsat, ince, metinYeterli, yeterli } = adaylar();
  assert.equal(firsat.length + ince.length + metinYeterli.length + yeterli.length, hepsi.length);
});

test('ince içerik "görsel ekle" olarak raporlanmıyor', () => {
  const { ince, firsat } = adaylar();
  for (const r of ince) assert.ok(r.kelime < 300, `${r.slug}: ince değil`);
  for (const r of firsat) assert.ok(r.kelime >= 300, `${r.slug}: fırsat sayılmamalı`);
});

test('kelime sayımı ikinci kez yazılmamış — sayım betiğinden geliyor', () => {
  const kaynak = readFileSync(path.join(KOK, 'scripts/rehber-gorsel-adaylari.mjs'), 'utf8');
  assert.match(kaynak, /from '\.\/rehber-sayimi\.mjs'/);
  assert.doesNotMatch(kaynak, /function kelimeSay/, 'ayrı bir kelime sayacı yazılmamalı');
});
