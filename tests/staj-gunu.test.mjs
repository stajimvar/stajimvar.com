import assert from 'node:assert/strict';
import test from 'node:test';
import { bugununTarihi, stajBitisi , stajTakvimi} from '../src/lib/staj-gunu.mjs';

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
  /*
    26 Ekim 2026 pazartesi başlayan 5 iş günlük staj:
      26 Pzt tam (1) · 27 Sal tam (2) · 28 Çar YARIM (2,5) ·
      29 Per Cumhuriyet Bayramı · 30 Cum tam (3,5) · 31-1 hafta sonu ·
      2 Pzt (4,5) · 3 Sal (5,5) → biter.

    Eskiden 3 Kasım değil 2 Kasım çıkıyordu: 28 Ekim tam iş günü sayılıyordu.
    2429 sayılı Kanun'a göre 28 Ekim saat 13.00'ten sonra tatil, yani yarım
    iş günü. Yarım günü tam saymak öğrenciye çalışmadığı yarım günü
    çalışmış gibi yazıyordu.
  */
  const tatilli = stajBitisi({ baslangic: '2026-10-26', gunSayisi: 5 });
  assert.equal(gunAdi(tatilli.bitis), '2026-11-03');
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

/* ---------------------------------------------------------------- takvim */

/*
  `stajBitisi` ve `stajTakvimi` aynı kuralı iki ayrı döngüde uyguluyor.
  Bu test ikisinin ayrışmasını yakalıyor: takvimdeki son gün ile hesaplanan
  bitiş tarihi aynı olmalı, yoksa kullanıcı bir sonuç görüp takvimde başka
  bir gün görüyor.
*/
test('takvim ve bitiş tarihi aynı günü gösteriyor', () => {
  const girdiler = [
    { baslangic: '2026-09-01', gunSayisi: 20, cumartesi: false, ekTatil: 0 },
    { baslangic: '2026-06-15', gunSayisi: 30, cumartesi: true, ekTatil: 3 },
    { baslangic: '2026-10-26', gunSayisi: 10, cumartesi: false, ekTatil: 0 },
  ];
  for (const g of girdiler) {
    const takvim = stajTakvimi(g);
    const bitis = stajBitisi(g);
    assert.ok(takvim.length > 0, `takvim boş: ${JSON.stringify(g)}`);
    assert.equal(
      takvim[takvim.length - 1].tarih.toDateString(),
      bitis.bitis.toDateString(),
      `ayrışma: ${JSON.stringify(g)}`
    );
  }
});

test('takvimdeki çalışma günü sayısı hedefe eşit', () => {
  const takvim = stajTakvimi({ baslangic: '2026-09-01', gunSayisi: 20, cumartesi: false, ekTatil: 0 });
  assert.equal(takvim.filter((g) => g.durum === 'calisma').length, 20);
});

test('resmî tatil takvimde işaretleniyor', () => {
  /* 29 Ekim 2026 perşembe — çalışma günü olmamalı. */
  const takvim = stajTakvimi({ baslangic: '2026-10-26', gunSayisi: 10, cumartesi: false, ekTatil: 0 });
  const yirmiDokuz = takvim.find((g) => g.tarih.getMonth() === 9 && g.tarih.getDate() === 29);
  assert.equal(yirmiDokuz.durum, 'resmi');
});

test('bildirilen bayram günleri takvimde ayrı görünüyor', () => {
  const takvim = stajTakvimi({ baslangic: '2026-09-01', gunSayisi: 10, cumartesi: false, ekTatil: 2 });
  assert.equal(takvim.filter((g) => g.durum === 'bildirilen').length, 2);
});

test('geçersiz girdide takvim boş', () => {
  assert.deepEqual(stajTakvimi({ baslangic: '', gunSayisi: 20 }), []);
  assert.deepEqual(stajTakvimi({ baslangic: '2026-09-01', gunSayisi: 0 }), []);
  assert.deepEqual(stajTakvimi({ baslangic: 'bozuk', gunSayisi: 20 }), []);
});

/* ---------------------------------------------- otomatik resmî tatiller */

import { stajPlani } from '../src/lib/staj-gunu.mjs';
import { yilinTatilleri, yilKapsamda, anahtar } from '../src/lib/resmi-tatiller.mjs';

test('dinî bayramlar otomatik düşülüyor — kullanıcı girmiyor', () => {
  /*
    Ramazan Bayramı 2026: 20-22 Mart (Diyanet). 18 Mart çarşamba başlayan
    staj bu üç günü kendiliğinden atlamalı; eskiden kullanıcının "ek tatil"
    kutusuna 3 yazması gerekiyordu, yazmazsa hesap sessizce yanlış çıkıyordu.
  */
  const plan = stajPlani({ baslangic: '2026-03-18', gunSayisi: 10, ekTatil: 0 });
  const adlar = plan.cikarilanlar.map((c) => c.ad);
  assert.ok(
    adlar.some((a) => a.includes('Ramazan Bayramı 1. gün')),
    'Ramazan Bayramı otomatik düşmeli',
  );
  /*
    Bayramın 2. ve 3. günü 2026'da cumartesi-pazara denk geliyor. Zaten
    çalışılmıyor, ama çıkarılma sebebi olarak bayram adı yazılıyor — "neden
    çıkarıldı" listesinde "Cumartesi" demek doğru ama eksik olurdu.
  */
  const bayram = plan.gunler.filter((g) => (g.ad || '').startsWith('Ramazan Bayramı'));
  assert.equal(bayram.length, 4, 'arife + üç bayram günü adlandırılmalı');
});

test('kurban bayramı ve arifesi', () => {
  /* 2026: arife 26 Mayıs (yarım), bayram 27-30 Mayıs (tam). */
  const plan = stajPlani({ baslangic: '2026-05-25', gunSayisi: 8 });
  const harita = new Map(plan.gunler.map((g) => [anahtar(g.tarih), g]));
  assert.equal(harita.get('2026-05-26').durum, 'yarim', 'arife yarım gün');
  assert.equal(harita.get('2026-05-27').durum, 'resmi', 'bayram 1. gün tam tatil');
  /* 30 Mayıs 2026 cumartesi: hafta sonu ama adı bayramın 4. günü. */
  assert.equal(harita.get('2026-05-30').ad, 'Kurban Bayramı 4. gün');
});

test('yarım gün 0,5 iş günü sayılıyor', () => {
  const plan = stajPlani({ baslangic: '2026-05-26', gunSayisi: 1 });
  const ilk = plan.gunler[0];
  assert.equal(ilk.durum, 'yarim');
  assert.equal(ilk.sira, 0.5, 'arife yarım gün sayılmalı');
});

test('çıkarılan günler ad ve tarihle raporlanıyor', () => {
  const plan = stajPlani({ baslangic: '2026-04-20', gunSayisi: 10 });
  const nisan23 = plan.cikarilanlar.find((c) => anahtar(c.tarih) === '2026-04-23');
  assert.ok(nisan23, '23 Nisan çıkarılanlar listesinde olmalı');
  assert.equal(nisan23.ad, 'Ulusal Egemenlik ve Çocuk Bayramı');
  assert.equal(nisan23.durum, 'resmi');
});

test('yıl geçişi: aralıkta başlayan staj sonraki yılın tatillerini biliyor', () => {
  /* 28 Aralık 2026 başlayan 60 iş günlük staj 2027'ye taşıyor. */
  const plan = stajPlani({ baslangic: '2026-12-28', gunSayisi: 60 });
  assert.ok(plan, 'yıl aşan staj hesaplanmalı');
  assert.ok(plan.bitis.getFullYear() === 2027, 'bitiş 2027 olmalı');
  const yilbasi = plan.cikarilanlar.find((c) => anahtar(c.tarih) === '2027-01-01');
  assert.ok(yilbasi, '1 Ocak 2027 düşülmeli');
  const ramazan = plan.cikarilanlar.find((c) => anahtar(c.tarih) === '2027-03-09');
  assert.ok(ramazan, '2027 Ramazan Bayramı düşülmeli');
});

test('kuruma özel izin resmî tatilin üstüne ekleniyor', () => {
  const izinsiz = stajPlani({ baslangic: '2026-09-01', gunSayisi: 20, ekTatil: 0 });
  const izinli = stajPlani({ baslangic: '2026-09-01', gunSayisi: 20, ekTatil: 3 });
  assert.equal(izinli.atlanan, izinsiz.atlanan + 3);
  assert.ok(izinli.bitis > izinsiz.bitis);
});

test('tatil listesi yıl bazlı ve kapsam bildiriliyor', () => {
  assert.equal(yilKapsamda(2026), true);
  assert.equal(yilKapsamda(2099), false, 'yazılmamış yıl kapsam dışı olmalı');
  const t2026 = yilinTatilleri(2026);
  assert.equal(t2026.get('2026-01-01').ad, 'Yılbaşı');
  assert.equal(t2026.get('2026-10-28').yarim, true, '28 Ekim yarım gün');
  assert.equal(t2026.get('2026-10-29').yarim, false, '29 Ekim tam gün');
  assert.equal(t2026.get('2026-03-20').ad, 'Ramazan Bayramı 1. gün');
});
