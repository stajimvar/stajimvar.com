import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACIKLAMA_EN_AZ,
  SABLONLAR,
  ZORUNLU_ALANLAR,
  basvuruUrlSorunu,
  ilanGecerli,
  ilanSatiri,
  ilanSorunlari,
  platformBasvurusuSecilebilir,
} from '../src/lib/ilan-formu.mjs';

/*
  Hedef: İK telefonla iki dakikada ilan açsın. Bunun tek yolu az soru
  sormak. Bu testler formun zamanla şişmesini engelliyor — yeni bir
  zorunlu alan eklemek testi kırıyor ve eklemeyi bilinçli bir karar
  hâline getiriyor.
*/

const GECERLI = {
  unvan: 'Yazılım Stajyeri',
  sehir: 'İstanbul',
  calismaSekli: 'Hybrid',
  tur: 'yaz',
  sure: '20 iş günü',
  ucret: 'asgari',
  basvuruUrl: 'https://sirket.com/kariyer/staj',
  aciklama: 'a'.repeat(ACIKLAMA_EN_AZ),
};

test('zorunlu alan sayısı dokuzu geçmiyor', () => {
  /* Önizleme dokuzuncu adım; form alanı değil. */
  assert.ok(ZORUNLU_ALANLAR.length <= 8, `zorunlu alan: ${ZORUNLU_ALANLAR.length}`);
});

test('geçerli form sorunsuz', () => {
  assert.deepEqual(ilanSorunlari(GECERLI), {});
  assert.equal(ilanGecerli(GECERLI), true);
});

test('eksik alanlar tek tek bildiriliyor', () => {
  const s = ilanSorunlari({});
  /* Tek bir "form geçersiz" yerine alan başına sorun. */
  for (const alan of ['unvan', 'sehir', 'calismaSekli', 'tur', 'sure', 'ucret', 'basvuruUrl', 'aciklama']) {
    assert.ok(s[alan], `${alan} için sorun bildirilmeliydi`);
  }
});

test('başvuru adresi https zorunlu', () => {
  assert.equal(basvuruUrlSorunu('https://x.com/a'), null);
  assert.match(basvuruUrlSorunu('http://x.com'), /https/);
  assert.match(basvuruUrlSorunu('sirket.com'), /adres/i);
  assert.match(basvuruUrlSorunu(''), /gerekiyor/);
});

test('iş tanımı alt sınırı', () => {
  const s = ilanSorunlari({ ...GECERLI, aciklama: 'kısa' });
  assert.match(s.aciklama, /en az 200/);
});

test('iş tanımı üst sınırı', () => {
  const s = ilanSorunlari({ ...GECERLI, aciklama: 'a'.repeat(2001) });
  assert.match(s.aciklama, /en fazla 2000/);
});

test('net ücret seçilince tutar isteniyor', () => {
  const s = ilanSorunlari({ ...GECERLI, ucret: 'net' });
  assert.ok(s.ucret);
  assert.deepEqual(ilanSorunlari({ ...GECERLI, ucret: 'net', ucretTutari: '17.000 TL' }), {});
});

test('son başvuru opsiyonel', () => {
  assert.deepEqual(ilanSorunlari({ ...GECERLI, sonBasvuru: '' }), {});
  assert.deepEqual(ilanSorunlari({ ...GECERLI, sonBasvuru: '2026-09-30' }), {});
});

test('üç şablon var ve hepsi alt sınırı geçiyor', () => {
  assert.equal(SABLONLAR.length, 3);
  for (const s of SABLONLAR) {
    assert.ok(s.metin.length >= ACIKLAMA_EN_AZ, `${s.id} şablonu çok kısa`);
    assert.ok(s.metin.length <= 2000, `${s.id} şablonu çok uzun`);
  }
});

test('satır isveren ilani olarak isaretleniyor', () => {
  const satir = ilanSatiri(GECERLI, { companyId: 'abc', durum: 'published' });
  /* Toplama hattından gelen ilanlarla karışmasın. */
  assert.equal(satir.origin, 'employer_posted');
  assert.equal(satir.status, 'published');
  assert.equal(satir.application_method, 'external');
  assert.equal(satir.apply_url, GECERLI.basvuruUrl);
  assert.ok(satir.posted_at);
});

test('taslakta yayın tarihi yazılmıyor', () => {
  const satir = ilanSatiri(GECERLI, { companyId: 'abc', durum: 'draft' });
  assert.equal(satir.status, 'draft');
  assert.equal(satir.posted_at, null);
});

test('tür alanları doğru eşleşiyor', () => {
  const zorunlu = ilanSatiri({ ...GECERLI, tur: 'zorunlu' }, { companyId: 'a', durum: 'draft' });
  assert.equal(zorunlu.mandatory_staj_accepted, true);
  const gonullu = ilanSatiri({ ...GECERLI, tur: 'gonullu' }, { companyId: 'a', durum: 'draft' });
  assert.equal(gonullu.voluntary_staj_accepted, true);
  assert.equal(gonullu.mandatory_staj_accepted, false);
});

test('belirtilmeyecek ücret is_paid false', () => {
  const satir = ilanSatiri({ ...GECERLI, ucret: 'belirtilmeyecek' }, { companyId: 'a', durum: 'draft' });
  assert.equal(satir.is_paid, false);
  assert.equal(satir.stipend_text, null);
});

/* ------------------------------------------- E: başvuru tipi (platform) */

test('platform başvurusu yalnızca Kademe 2 ve üstünde seçilebiliyor', () => {
  assert.equal(platformBasvurusuSecilebilir(0), false);
  assert.equal(platformBasvurusuSecilebilir(1), false);
  assert.equal(platformBasvurusuSecilebilir(2), true);
  assert.equal(platformBasvurusuSecilebilir(3), true);
});

test('kendi sitesinden alınan ilanda adres hâlâ zorunlu', () => {
  const sorunlar = ilanSorunlari({ ...GECERLI, basvuruTipi: 'kendi', basvuruUrl: '' });
  assert.ok(sorunlar.basvuruUrl);
});

test('platform başvurusunda adres istenmiyor', () => {
  const sorunlar = ilanSorunlari({ ...GECERLI, basvuruTipi: 'platform', basvuruUrl: '' });
  assert.equal(sorunlar.basvuruUrl, undefined);
});

test('platform başvurusu satırı internal yazıyor ve adresi boşaltıyor', () => {
  const satir = ilanSatiri(
    { ...GECERLI, basvuruTipi: 'platform', basvuruUrl: 'https://x.com/basvur' },
    { companyId: 'c1', durum: 'published' }
  );
  assert.equal(satir.application_method, 'internal');
  assert.equal(satir.apply_url, null);
});

test('varsayılan satır hâlâ şirketin kendi adresine gidiyor', () => {
  const satir = ilanSatiri(GECERLI, { companyId: 'c1', durum: 'published' });
  assert.equal(satir.application_method, 'external');
  assert.equal(satir.apply_url, GECERLI.basvuruUrl);
});
