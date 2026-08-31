import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TABAN_DOLULUK,
  TUP_RENKLERI,
  UFUK_GUN,
  tupDolulugu,
  tupDurumu,
  tupErisilebilirAd,
  tupMetni,
} from '../src/lib/zaman-tupu.mjs';
import { calendarDay } from '../src/lib/opportunity-domain.mjs';

/*
  ZAMAN TÜPÜ

  Kartlarda son başvuru bilgisi kırmızı bir bantla yazıyordu ve açık bir
  burs "iptal oldu" gibi görünüyordu. Yeni gösterge süre azaldıkça dolan
  bir kapsül; renk dili pozitif kalıyor.

  Bu testler üç sözü bağlıyor:
    1. Doluluk sona yaklaştıkça ARTIYOR (ilerleme değil, yaklaşma).
    2. Açık hiçbir durumda kırmızı yok.
    3. Bilgi renkten bağımsız olarak metinde de var.
*/

/*
  Üretimdeki biçim: tarih-yalnız (YYYY-MM-DD).

  GÜN, UTC'DE DEĞİL, KÜTÜPHANENİN GÜNÜNDE HESAPLANIYOR
  ----------------------------------------------------
  Burada `Date.now()` doğrudan UTC'ye çevriliyordu; oysa `tupDurumu`
  bugünü Europe/Istanbul'a göre buluyor. İkisi Türkiye saatiyle
  21:00–24:00 arasında bir gün ayrışıyor ve `gun(0)` dünü üretiyordu:
  "bugün son gün" beklenen kayıt "kapalı" görünüyordu. Test her akşam
  aynı saatlerde kırılıyordu.

  Takvim günü artık kütüphanenin kendi `calendarDay`'inden geliyor, ki
  iki taraf aynı günü konuşsun.
*/
const gun = (n) =>
  new Date(calendarDay(new Date()) + n * 86400000).toISOString().slice(0, 10);
const firsat = (n) => ({ applicationDeadline: gun(n) });

/* ------------------------------------------------------------ durumlar */

test('kalan güne göre durum', () => {
  assert.equal(tupDurumu(firsat(0)), 'son-gunler', 'bugün son gün');
  assert.equal(tupDurumu(firsat(1)), 'son-gunler', 'yarın');
  assert.equal(tupDurumu(firsat(3)), 'son-gunler');
  assert.equal(tupDurumu(firsat(4)), 'yaklasiyor');
  assert.equal(tupDurumu(firsat(7)), 'yaklasiyor');
  assert.equal(tupDurumu(firsat(8)), 'rahat');
  assert.equal(tupDurumu(firsat(90)), 'rahat');
});

test('tarihi olmayan kayıt takvimsiz', () => {
  assert.equal(tupDurumu({}), 'takvimsiz');
  assert.equal(tupDurumu({ applicationDeadline: null }), 'takvimsiz');
});

test('süresi geçmiş kayıt kapalı', () => {
  assert.equal(tupDurumu(firsat(-1)), 'kapali');
  assert.equal(tupDurumu(firsat(-30)), 'kapali');
});

test('henüz açılmamış kayıt yakında', () => {
  assert.equal(
    tupDurumu({ applicationStartAt: gun(10), applicationDeadline: gun(40) }),
    'yakinda',
  );
});

/* ------------------------------------------------------------- doluluk */

test('doluluk sona yaklaştıkça ARTIYOR', () => {
  const seri = [90, 30, 20, 10, 5, 3, 1, 0].map((n) => tupDolulugu(firsat(n)));
  for (let i = 1; i < seri.length; i += 1) {
    assert.ok(
      seri[i] >= seri[i - 1],
      `doluluk geriye gitti: ${seri[i - 1].toFixed(2)} → ${seri[i].toFixed(2)}`,
    );
  }
  assert.equal(seri[seri.length - 1], 1, 'son gün tam dolu olmalı');
});

test('doluluk 0–1 aralığında ve tabanın altına düşmüyor', () => {
  for (const n of [0, 1, 3, 7, 15, 30, 60, 365]) {
    const d = tupDolulugu(firsat(n));
    assert.ok(d >= TABAN_DOLULUK && d <= 1, `${n} gün için doluluk aralık dışı: ${d}`);
  }
});

test('ufuktan uzak tarih taban dolulukta', () => {
  assert.equal(tupDolulugu(firsat(UFUK_GUN)), TABAN_DOLULUK);
  assert.equal(tupDolulugu(firsat(UFUK_GUN * 4)), TABAN_DOLULUK);
});

test('takvimi olmayan kayıtta doluluk sıfır — tüp çizilmiyor', () => {
  /*
    Bilinmeyen bir süre için çubuk çizmek, olmayan bir bilgiyi varmış gibi
    göstermek olurdu. Bileşen bu değeri görünce tüpü hiç çizmiyor.
  */
  assert.equal(tupDolulugu({}), 0);
});

test('kapalı kayıt tam dolu', () => {
  assert.equal(tupDolulugu(firsat(-5)), 1);
});

/* -------------------------------------------------------------- metin */

test('mikrocopy kalan güne göre', () => {
  assert.equal(tupMetni(firsat(0)).vurgu, 'Bugün son gün');
  assert.equal(tupMetni(firsat(1)).vurgu, 'Yarın sona eriyor');
  assert.equal(tupMetni(firsat(2)).vurgu, 'Son 2 gün');
  assert.equal(tupMetni(firsat(3)).vurgu, 'Son 3 gün');
  assert.equal(tupMetni(firsat(5)).vurgu, '5 gün kaldı');
  assert.equal(tupMetni(firsat(7)).vurgu, '7 gün kaldı');
});

test('bir haftadan uzun sürede geri sayım yok', () => {
  /* "23 gün kaldı" demek sakin bir kaydı geri sayıma sokmak olurdu. */
  const m = tupMetni(firsat(23));
  assert.equal(m.vurgu, null);
  assert.match(String(m.tarih), /^Son başvuru: /);
});

test('tarih satırı Türkçe ek almıyor', () => {
  /*
    "2026'da bitiyor" demek yıla göre değişen ek gerektiriyor
    (2025'te, 2026'da, 2027'de). Ek istemeyen biçim kullanılıyor.
  */
  const m = tupMetni(firsat(20));
  assert.doesNotMatch(String(m.tarih), /['’]/, 'tarih satırında kesme işareti var');
});

test('takvimsiz ve kapalı kayıtta metin var', () => {
  assert.equal(tupMetni({}).vurgu, 'Takvim açıklanmadı');
  assert.equal(tupMetni({}).tarih, null);
  assert.equal(tupMetni(firsat(-2)).vurgu, 'Başvuru dönemi kapandı');
});

test('erişilebilir ad her durumda dolu', () => {
  for (const item of [firsat(0), firsat(5), firsat(40), firsat(-3), {}]) {
    assert.ok(tupErisilebilirAd(item).length > 0);
  }
});

/* -------------------------------------------------------------- renk */

/**
 * Rengin ton açısı (0–360) ve doygunluğu.
 *
 * Desen eşleştirmesi yetmiyordu: ilk yazılan regex `#DC2626`yı yakalıyor
 * ama `#EF4444`ü kaçırıyordu. Kırmızılık bir yazım biçimi değil, bir ton
 * aralığı; ölçmek gerekiyor.
 */
function tonVeDoygunluk(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const enBuyuk = Math.max(r, g, b);
  const enKucuk = Math.min(r, g, b);
  const fark = enBuyuk - enKucuk;
  if (fark === 0) return { ton: 0, doygunluk: 0 };
  let ton;
  if (enBuyuk === r) ton = ((g - b) / fark) % 6;
  else if (enBuyuk === g) ton = (b - r) / fark + 2;
  else ton = (r - g) / fark + 4;
  ton = (ton * 60 + 360) % 360;
  return { ton, doygunluk: fark / enBuyuk };
}

test('açık hiçbir durumda kırmızı yok', () => {
  /*
    Kırmızı bu üründe hata rengi. Açık ve başvurulabilir bir bursta
    kullanılırsa "iptal oldu / hata var" gibi okunuyor. Kırmızı bandı
    340°–20° arası ve doygunluk anlamlıysa sayılıyor; sıcak amber (~35°)
    bilerek serbest.
  */
  for (const durum of ['rahat', 'yaklasiyor', 'son-gunler', 'yakinda']) {
    for (const [alan, renk] of Object.entries(TUP_RENKLERI[durum])) {
      const { ton, doygunluk } = tonVeDoygunluk(renk);
      const kirmiziBandi = (ton >= 340 || ton <= 20) && doygunluk > 0.25;
      assert.ok(
        !kirmiziBandi,
        `${durum}.${alan} kırmızı bandında: ${renk} (ton ${ton.toFixed(0)}°)`,
      );
    }
  }
});

test('kırmızı ölçütü gerçekten kırmızıyı yakalıyor', () => {
  /* Ölçüt kendini de sınamalı: yakalamayan bir kontrol boşuna yeşildir. */
  for (const kirmizi of ['#DC2626', '#EF4444', '#B91C1C', '#F43F5E']) {
    const { ton, doygunluk } = tonVeDoygunluk(kirmizi);
    assert.ok((ton >= 340 || ton <= 20) && doygunluk > 0.25, `${kirmizi} kırmızı sayılmadı`);
  }
  /* Amber ve yeşil yakalanmamalı. */
  for (const pozitif of ['#B45309', '#059669', '#16A34A', '#3B82F6']) {
    const { ton, doygunluk } = tonVeDoygunluk(pozitif);
    assert.ok(!((ton >= 340 || ton <= 20) && doygunluk > 0.25), `${pozitif} yanlışlıkla kırmızı`);
  }
});

test('her durumun rengi tanımlı', () => {
  for (const durum of ['rahat', 'yaklasiyor', 'son-gunler', 'yakinda', 'takvimsiz', 'kapali']) {
    const r = TUP_RENKLERI[durum];
    assert.ok(r && r.dolgu && r.kanal && r.yazi, `${durum} rengi eksik`);
  }
});

/** WCAG göreli parlaklık. */
function parlaklik(hex) {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const oran = (a, b) => {
  const x = parlaklik(a);
  const y = parlaklik(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

test('metin kendi zemininde 4.5:1 üstünde', () => {
  for (const [durum, r] of Object.entries(TUP_RENKLERI)) {
    const k = oran(r.yazi, r.kanal);
    assert.ok(k >= 4.5, `${durum}: metin kontrastı ${k.toFixed(2)}`);
  }
});

test('dolgu kendi kanalında 3:1 üstünde', () => {
  /*
    Doluluk seviyesi seçilemiyorsa tüpün tek işi görünmüyor demektir.
    İlk seçilen açık tonlar 1.8–2.3 kalıyordu.
  */
  for (const [durum, r] of Object.entries(TUP_RENKLERI)) {
    if (durum === 'takvimsiz') continue; // tüp hiç çizilmiyor
    const k = oran(r.dolgu, r.kanal);
    assert.ok(k >= 3, `${durum}: dolgu/kanal kontrastı ${k.toFixed(2)}`);
  }
});

/* ------------------------------------------------- kartlarda kırmızı yok */

test('burs kartlarında gül/kırmızı sınıf kalmadı', () => {
  const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');
  for (const yol of [
    'src/components/ScholarshipDiscoveryCard.tsx',
    'src/components/ZamanTupu.tsx',
  ]) {
    const kod = oku(yol).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(kod, /rose-\d|red-\d/, `${yol}: kırmızı sınıf duruyor`);
  }
});
