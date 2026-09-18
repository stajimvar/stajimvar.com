import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  ŞİRKET PANELİ YOLLARI 200 DÖNMELİ

  ÖLÇÜLEN KUSUR (17 Eylül 2026, canlı): /sirket/ilanlar, /sirket/basvuranlar
  ve /sirket/profil doğrudan açılışta HTTP 404 dönüyordu. Sayfa açılıyordu
  (404.html uygulamayı başlatıyor) ama durum kodu yanlıştı: ara katman
  `/sirket/` önekini veri sanıp dosya arıyor, panel yolunun dosyası yok.

  İki dosya aynı listeyi taşımak zorunda: App.tsx yolları tanır, ara
  katman 404 vermez. Biri değişip öteki unutulursa yeni bir panel yolu
  yine 404'e düşer — bu test ikisini eşit tutuyor.
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const app = oku('src/App.tsx');
const araKatman = oku('functions/_middleware.ts');

const liste = (kaynak) => {
  const m = kaynak.match(/const SIRKET_PANEL_YOLLARI = \[([^\]]*)\]/);
  assert.ok(m, 'SIRKET_PANEL_YOLLARI bulunamadı');
  return [...m[1].matchAll(/'(\/[^']+)'/g)].map((e) => e[1]).sort();
};

test('App.tsx ile ara katman aynı panel yollarını taşıyor', () => {
  assert.deepEqual(liste(araKatman), liste(app));
});

test('panel yolları veri dalından ÖNCE uygulama sayılıyor', () => {
  assert.match(araKatman, /function sirketPaneliMi\(yol: string\): boolean/);
  /* Veri dalı panel yolunu dışarıda bırakmalı; yoksa 404'e düşer. */
  assert.match(araKatman, /const veriyeDayali =\s*\n\s*!sirketPaneliMi\(yol\) &&/);
  /* Kabuk dalı da tanımalı; yoksa Pages'in ham 404'ü geçer. */
  assert.match(araKatman, /if \(sirketPaneliMi\(temiz\)\) return true;/);
  /* Alt yol (/sirket/ilan/<id>) da panel. */
  assert.match(araKatman, /temiz === p \|\| temiz\.startsWith\(`\$\{p\}\/`\)/);
});
