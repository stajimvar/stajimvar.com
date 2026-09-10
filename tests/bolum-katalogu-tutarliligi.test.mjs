import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { bolumKatalogu, katalogSql } from '../scripts/bolum-katalogu.mjs';

/*
  BÖLÜM KATALOĞU — İKİ KAYNAK, TEK GERÇEK

  Kontrollü bölüm listesi iki yerde yaşıyor:

    src/data/bolumler.ts                          rehber sayfalarının verisi
    supabase/migrations/…_bolum_katalogu.sql      sosyal katmanın kataloğu

  İkisinin AYNI slug kümesini taşıması bir tercih değil zorunluluk:
  `/bolumler/<slug>` adresi ile profildeki bölüm aynı kimliği gösteriyor.
  Ayrışırlarsa profil, var olmayan bir rehber sayfasına işaret eder ve
  bunu hiçbir yerde fark etmeyiz.

  Bu yüzden seed ELLE YAZILMIYOR: `scripts/bolum-katalogu.mjs` TS
  dosyasını okuyup üretiyor, bu test de üretilenle göçteki bloğun aynı
  olduğunu ölçüyor. Yeni bölüm eklendiğinde test düşer ve göçün yeniden
  üretilmesi gerektiğini söyler.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

const goc = oku('supabase/migrations/20260923010000_bolum_katalogu.sql');
const kaynak = oku('src/data/bolumler.ts');

test('katalog 42 bölüm taşıyor ve TS kaynağıyla aynı sayıda', () => {
  const tsSayisi = (kaynak.match(/^    slug: '/gm) ?? []).length;
  assert.equal(tsSayisi, 42, 'src/data/bolumler.ts artık 42 bölüm taşımıyor');
  assert.equal(bolumKatalogu().length, 42);
});

test('üretilen slug kümesi TS kaynağıyla birebir', () => {
  const tsSluglar = [...kaynak.matchAll(/^    slug: '([^']+)'/gm)].map((m) => m[1]).sort();
  const uretilen = bolumKatalogu().map((b) => b.slug).sort();
  assert.deepEqual(uretilen, tsSluglar);
});

test('göçteki seed bloğu üreteçle birebir aynı — drift yok', () => {
  const uretilen = katalogSql();
  assert.ok(
    goc.includes(uretilen),
    'göçteki seed bloğu güncel değil: `node scripts/bolum-katalogu.mjs` ile yeniden üret',
  );
});

test('slug deseni şemadaki CHECK ile uyumlu', () => {
  const desen = /^[a-z0-9-]{2,80}$/;
  for (const b of bolumKatalogu()) {
    assert.match(b.slug, desen, `${b.slug} şemadaki desene uymuyor`);
  }
  assert.match(goc, /check \(slug ~ '\^\[a-z0-9-\]\{2,80\}\$'\)/);
});

test('grup değerleri şemadaki CHECK kümesiyle aynı', () => {
  const semaGruplari = goc
    .match(/grup\s+text not null check \(grup in\s*\(([^)]+)\)\)/s)[1]
    .match(/'([a-z]+)'/g)
    .map((s) => s.replaceAll("'", ''))
    .sort();
  const kullanilan = [...new Set(bolumKatalogu().map((b) => b.grup))].sort();
  for (const g of kullanilan) {
    assert.ok(semaGruplari.includes(g), `${g} şemadaki CHECK kümesinde yok`);
  }
  assert.deepEqual(semaGruplari, ['hizmet', 'muhendislik', 'myo', 'saglik', 'sosyal', 'tasarim']);
});

test('adlar boş değil ve tekrar etmiyor', () => {
  const adlar = bolumKatalogu().map((b) => b.ad);
  for (const ad of adlar) assert.ok(ad.trim().length > 2, `boş ad: "${ad}"`);
  assert.equal(new Set(adlar).size, adlar.length, 'aynı ad iki kez geçiyor');
});

test('üretilen SQL tek tırnak kaçışını doğru yapıyor', () => {
  /*
    Bölüm adlarında kesme işareti bugün yok ama eklenirse SQL'i bozardı.
    Ölçüm satır başına tırnak SAYISI üzerinden: her satırda üç dizeli
    değer var, yani tam altı tırnak. Kaçırılmamış bir kesme işareti
    sayıyı tek yapardı ve bu satır düşerdi.
  */
  const sql = katalogSql();
  const satirlar = sql.split('\n').filter((s) => /^\s+\('/.test(s));
  assert.equal(satirlar.length, 42, 'seed satır sayısı 42 değil');
  for (const satir of satirlar) {
    const tirnakSayisi = (satir.match(/'/g) ?? []).length;
    assert.equal(tirnakSayisi, 6, `tırnak dengesi bozuk: ${satir.trim()}`);
  }
});
