import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

/*
  PYTEST DEPO KÖKÜNDEN ÇAĞRILMALI

  `stajimvar-automation.yml` testleri `working-directory: automation`
  altında çalıştırıyordu. İki test modülü `from automation.X import ...`
  yazdığı için toplama aşamasında ModuleNotFoundError veriyor, iş akışı
  20 saniyede düşüyor ve SAATLİK TARAMA HİÇ ÇALIŞMIYORDU — 30 Ağustos
  2026'da on dört saat boyunca böyle kaldı ve fark edilmedi çünkü
  hata testte değil, testin bulunmasındaydı.

  Kural: pytest çağıran her adım depo kökünden çalışacak ve yolu
  `automation/tests` ile verecek.
*/

const KLASOR = new URL('../.github/workflows/', import.meta.url);

/** İş akışı dosyalarını satır satır oku. */
function akislar() {
  return readdirSync(KLASOR)
    .filter((a) => a.endsWith('.yml') || a.endsWith('.yaml'))
    .map((ad) => ({ ad, satirlar: readFileSync(new URL(ad, KLASOR), 'utf8').split(/\r?\n/) }));
}

/**
 * Bir iş akışı dosyasını ADIMLARA böler.
 *
 * Satır penceresiyle bakmak yetmiyordu: pytest adımının hemen ardından
 * gelen "Kaynakları tara" adımı zaten `working-directory: automation`
 * kullanıyor ve bu doğru — pencere onu yanlışlıkla yakalıyordu. Adım
 * sınırı, girintili listenin tire ile başlayan satırı.
 */
function adimlar(satirlar) {
  const bloklar = [];
  let simdiki = null;
  for (const satir of satirlar) {
    if (/^\s*-\s+\S/.test(satir)) {
      if (simdiki) bloklar.push(simdiki);
      simdiki = [satir];
    } else if (simdiki) {
      simdiki.push(satir);
    }
  }
  if (simdiki) bloklar.push(simdiki);
  return bloklar.map((b) => b.join(String.fromCharCode(10)));
}

test('pytest çağıran adım "automation" klasöründen çalışmıyor', () => {
  for (const { ad, satirlar } of akislar()) {
    for (const adim of adimlar(satirlar)) {
      if (!adim.includes('pytest')) continue;
      assert.ok(
        !/working-directory:\s*automation\s*$/m.test(adim),
        `${ad} — pytest "automation" klasöründen çağrılıyor; ` +
          '`from automation....` importları çözülemez.',
      );
    }
  }
});

test('pytest yolu depo kökünden veriliyor', () => {
  let bulundu = 0;
  for (const { ad, satirlar } of akislar()) {
    for (const satir of satirlar) {
      if (!satir.includes('pytest')) continue;
      bulundu += 1;
      assert.match(
        satir,
        /pytest\s+automation\/tests/,
        `${ad}: pytest yolu "automation/tests" ile başlamıyor → ${satir.trim()}`,
      );
    }
  }
  assert.ok(bulundu >= 3, `pytest çağıran adım beklenenden az: ${bulundu}`);
});
