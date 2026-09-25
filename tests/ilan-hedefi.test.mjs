import test from 'node:test';
import assert from 'node:assert/strict';
import { genelKariyerSayfasiMi, ilanHedefi, ILAN_TIPI_ETIKETI } from '../src/lib/ilan-hedefi.mjs';

/*
  İLAN KARTI EYLEMİNİN HEDEFİ (mobil sadeleştirme, 25 Eylül 2026)

  Düğmenin yazısı gerçek hedefi söylüyor. Veride başvuru adresinin türü
  (form mu, ilan sayfası mı) tutulmadığı için "Şirkette başvur" hiç
  üretilmiyor — form olduğu doğrulanmadan form denmiyor.
*/

test('StajımVar başvuru akışı → "Başvur"', () => {
  const h = ilanHedefi({ applicationMethod: 'internal' });
  assert.deepEqual(h, { tur: 'basvur', etiket: 'Başvur', harici: false, adres: null });
});

test('adres yoksa yalnız ilan ayrıntısı → "İlanı incele"', () => {
  const h = ilanHedefi({ applicationMethod: 'external', applyUrl: null });
  assert.equal(h.tur, 'ilan-detayi');
  assert.equal(h.etiket, 'İlanı incele');
  assert.equal(h.harici, false);
});

test('ilana özel dış adres → "İlana git"', () => {
  for (const adres of [
    'https://jobs.workable.com/view/c8EVgR8VdXrhsnFCiDLBWh/it-intern',
    'https://paynion.com/en/careers/software-engineering-intern/',
    'https://protel.hrpanda.co/tr/egitim-stajyeri',
    'https://eyglobal.yello.co/jobs/cGO6sAl9?job_board_id=c1',
  ]) {
    const h = ilanHedefi({ applicationMethod: 'external', applyUrl: adres });
    assert.equal(h.tur, 'dis-ilan', adres);
    assert.equal(h.etiket, 'İlana git');
    assert.equal(h.adres, adres);
  }
});

test('genel kariyer sayfası → "Kariyer sayfasına git"', () => {
  for (const adres of ['https://aygaz.onenewone.com/', 'https://kslaw.com.tr/kariyer/', 'https://ornek.com/en/careers']) {
    assert.equal(genelKariyerSayfasiMi(adres), true, adres);
    assert.equal(ilanHedefi({ applicationMethod: 'external', applyUrl: adres }).tur, 'kariyer-sayfasi', adres);
  }
  assert.equal(genelKariyerSayfasiMi('bozuk adres'), false);
});

test('"Şirkette başvur" üretilmiyor; güvensiz adres dış hedef olmuyor', () => {
  const etiketler = [
    { applicationMethod: 'internal' },
    { applicationMethod: 'external', applyUrl: 'https://ornek.com/ilan/1' },
    { applicationMethod: 'external', applyUrl: 'https://ornek.com/' },
    { applicationMethod: 'external' },
  ].map((i) => ilanHedefi(i).etiket);
  assert.ok(!etiketler.some((e) => /Şirkette başvur/.test(e)));
  assert.equal(ilanHedefi({ applicationMethod: 'external', applyUrl: 'javascript:alert(1)' }).harici, false);
});

test('ilan türü etiketleri süzgeçteki adlarla aynı; sınıflandırılmamışa etiket yok', () => {
  assert.deepEqual(ILAN_TIPI_ETIKETI, {
    staj: 'Staj',
    uzun_donem: 'Uzun dönem staj',
    trainee: 'Trainee',
    mt: 'Yönetici adayı (MT)',
    erken_kariyer: 'Erken kariyer',
  });
});
