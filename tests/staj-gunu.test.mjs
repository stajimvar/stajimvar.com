import assert from 'node:assert/strict';
import test from 'node:test';
import { bugununTarihi, stajBitisi } from '../src/lib/staj-gunu.mjs';

/**
 * Staj günü hesabının gerilemesini yakalayan testler.
 *
 * NEDEN VAR
 * ---------
 * Bu araca rehberlerden yönlendiriliyor: "Staj gününü hesapla" birçok
 * rehberin sıradaki adımı. Bozulduğunda okuyucu çıkmaza giriyor ve bunu
 * ancak biri bildirirse öğreniyoruz. Denetimde "masaüstünde sonuç
 * üretmedi" bildirimi geldiği için hesap bileşenden çıkarıldı ve buraya
 * bağlandı.
 */

/*
  YEREL tarihten okuyoruz, toISOString'den değil: hesap yerel gün başına
  göre yapılıyor ve toISOString UTC'ye çevirdiği için saat farkı olan
  makinelerde tarihi bir gün geriye kaydırıyordu. Testin makineye göre
  değişmesi, testi güvenilmez yapar.
*/
const gunAdi = (d) =>
  [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');

test('tarih girilince sonuç üretiyor', () => {
  const sonuc = stajBitisi({ baslangic: '2026-09-01', gunSayisi: 20 });
  assert.ok(sonuc, 'sonuç null olmamalı');
  assert.equal(gunAdi(sonuc.bitis), '2026-09-28');
  assert.equal(sonuc.toplamTakvim, 28);
  assert.equal(sonuc.atlanan, 8);
});

test('gün sayısı değişince yeniden hesaplıyor', () => {
  const yirmi = stajBitisi({ baslangic: '2026-09-01', gunSayisi: 20 });
  const otuz = stajBitisi({ baslangic: '2026-09-01', gunSayisi: 30 });
  assert.equal(gunAdi(otuz.bitis), '2026-10-12');
  assert.ok(otuz.bitis > yirmi.bitis, '30 gün, 20 günden sonra bitmeli');
});

test('cumartesi seçimi sonucu değiştiriyor', () => {
  const cumartesiz = stajBitisi({ baslangic: '2026-09-01', gunSayisi: 20, cumartesi: false });
  const cumartesili = stajBitisi({ baslangic: '2026-09-01', gunSayisi: 20, cumartesi: true });
  assert.ok(
    cumartesili.bitis < cumartesiz.bitis,
    'cumartesi çalışılıyorsa staj daha erken bitmeli'
  );
  assert.ok(cumartesili.atlanan < cumartesiz.atlanan);
});

test('sabit resmî tatil düşülüyor', () => {
  /* 29 Ekim 2026 perşembe: iş günü olacakken tatil olduğu için atlanıyor. */
  const tatilli = stajBitisi({ baslangic: '2026-10-26', gunSayisi: 5 });
  assert.equal(gunAdi(tatilli.bitis), '2026-11-02');
  assert.ok(tatilli.atlanan >= 1, '29 Ekim atlanmalı');
});

test('elle girilen bayram günü düşülüyor', () => {
  const tatilsiz = stajBitisi({ baslangic: '2026-09-01', gunSayisi: 20, ekTatil: 0 });
  const uctatil = stajBitisi({ baslangic: '2026-09-01', gunSayisi: 20, ekTatil: 3 });
  assert.equal(uctatil.atlanan, tatilsiz.atlanan + 3);
  assert.ok(uctatil.bitis > tatilsiz.bitis);
});

test('eksik ya da geçersiz girdide null dönüyor', () => {
  assert.equal(stajBitisi({ baslangic: '', gunSayisi: 20 }), null);
  assert.equal(stajBitisi({ baslangic: '2026-09-01', gunSayisi: 0 }), null);
  assert.equal(stajBitisi({ baslangic: '2026-09-01', gunSayisi: '' }), null);
  assert.equal(stajBitisi({ baslangic: 'abc', gunSayisi: 20 }), null);
  assert.equal(stajBitisi({ baslangic: '2026-09-01', gunSayisi: 401 }), null);
});

test('bugünün tarihi tarih alanının kabul ettiği biçimde', () => {
  const deger = bugununTarihi(new Date('2026-03-07T22:30:00'));
  assert.equal(deger, '2026-03-07');
  assert.match(bugununTarihi(), /^\d{4}-\d{2}-\d{2}$/);
});
