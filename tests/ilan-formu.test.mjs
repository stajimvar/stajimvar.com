import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACIKLAMA_EN_AZ,
  ZORUNLU_ALANLAR,
  ilanGecerli,
  ilanSatiri,
  ilanSorunlari,
  ilanFormDegeri,
} from '../src/lib/ilan-formu.mjs';
import { ULKE_SECENEKLERI, ulkeAdi, ulkeListesiTemizle } from '../src/lib/ulkeler.mjs';
import { GEREKCE_FORM_ALANI } from '../src/lib/ilan-kontrol-gorunumu.mjs';

/*
  Hedef: İK telefonla iki dakikada ilan açsın. Bunun tek yolu az soru
  sormak. Bu testler formun zamanla şişmesini engelliyor — yeni bir
  zorunlu alan eklemek testi kırıyor ve eklemeyi bilinçli bir karar
  hâline getiriyor.
*/

const GECERLI = {
  unvan: 'Yazılım Stajyeri',
  sehir: 'İstanbul',
  ulke: 'TR',
  calismaSekli: 'Hybrid',
  tur: 'yaz',
  sure: '20 iş günü',
  ucret: 'asgari',
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
  for (const alan of ['unvan', 'sehir', 'calismaSekli', 'tur', 'sure', 'ucret', 'aciklama']) {
    assert.ok(s[alan], `${alan} için sorun bildirilmeliydi`);
  }
});

test('iş tanımı alt sınırı', () => {
  const s = ilanSorunlari({ ...GECERLI, aciklama: 'kısa' });
  assert.match(s.aciklama, /en az 200/);
});

test('iş tanımı üst sınırı 5000 (sunucuyla aynı); 2000 üstü geçerli', () => {
  assert.equal(ilanSorunlari({ ...GECERLI, aciklama: 'a'.repeat(3000) }).aciklama, undefined);
  const s = ilanSorunlari({ ...GECERLI, aciklama: 'a'.repeat(5001) });
  assert.match(s.aciklama, /en fazla 5000/);
});

test('uzaktan çalışmada şehir zorunlu değil; ofiste zorunlu', () => {
  assert.equal(ilanSorunlari({ ...GECERLI, sehir: '', calismaSekli: 'Remote' }).sehir, undefined);
  assert.ok(ilanSorunlari({ ...GECERLI, sehir: '', calismaSekli: 'On-site' }).sehir);
});

test('son başvuru: geçmiş tarih hata; bugün, ileri tarih ve boş (süresiz) geçerli', () => {
  const bugun = '2026-10-04';
  assert.match(ilanSorunlari({ ...GECERLI, sonBasvuru: '2026-10-03', bugun }).sonBasvuru, /geçmiş/);
  for (const t of ['2026-10-04', '2028-01-01', '']) {
    assert.equal(ilanSorunlari({ ...GECERLI, sonBasvuru: t, bugun }).sonBasvuru, undefined, t);
  }
});

test('net ücret seçilince tutar isteniyor', () => {
  const s = ilanSorunlari({ ...GECERLI, ucret: 'net' });
  assert.ok(s.ucret);
  assert.deepEqual(ilanSorunlari({ ...GECERLI, ucret: 'net', ucretTutari: '17.000 TL' }), {});
});

test('son başvuru opsiyonel', () => {
  assert.deepEqual(ilanSorunlari({ ...GECERLI, sonBasvuru: '' }), {});
  /* Sabit "bugün": tarih geçince test kendiliğinden kırılmasın. */
  assert.deepEqual(ilanSorunlari({ ...GECERLI, sonBasvuru: '2026-09-30', bugun: '2026-09-01' }), {});
});

/* İş tanımı şablonları pozisyona bağlandı: tests/ilan-pozisyon-sablonlari.test.mjs */

test('satır isveren ilani olarak isaretleniyor', () => {
  const satir = ilanSatiri(GECERLI, { companyId: 'abc', durum: 'published' });
  /* Toplama hattından gelen ilanlarla karışmasın. */
  assert.equal(satir.origin, 'employer_posted');
  assert.equal(satir.status, 'published');
  assert.ok(satir.posted_at);
});

test('taslakta yayın tarihi yazılmıyor', () => {
  const satir = ilanSatiri(GECERLI, { companyId: 'abc', durum: 'draft' });
  assert.equal(satir.status, 'draft');
  assert.equal(satir.posted_at, null);
});

test('tek "staj türü" seçimi kabul alanlarına tahmin yazmıyor', () => {
  /*
    ÖNCEKİ HÂL: `mandatory = tur === 'zorunlu' || tur === 'yaz'`.
    "Yaz stajı" seçmek şirketin zorunlu staj kabul ETMEDİĞİ anlamına
    gelmez — tek seçim öteki tür için RET kanıtı değil. Form bu iki
    bilgiyi ayrı ayrı sormadığı sürece buraya tahmin yazılmıyor.

    `term` DEĞİŞMEDİ: o gerçekten ilanın dönemi ve formun sorduğu şey.
  */
  for (const tur of ['zorunlu', 'gonullu', 'yaz', 'uzun']) {
    const satir = ilanSatiri({ ...GECERLI, tur }, { companyId: 'a', durum: 'draft' });
    assert.equal(satir.mandatory_staj_accepted, null, `${tur}: zorunlu tahmini olmamalı`);
    assert.equal(satir.voluntary_staj_accepted, null, `${tur}: gönüllü tahmini olmamalı`);
  }
  /* Dönem hâlâ seçimden geliyor. */
  assert.equal(
    ilanSatiri({ ...GECERLI, tur: 'yaz' }, { companyId: 'a', durum: 'draft' }).term,
    'Summer 2026'
  );
});

test('ücret üç değerli: belirtilmeyecek ÜCRETSİZ DEĞİL', () => {
  /*
    `is_paid: deger.ucret !== 'belirtilmeyecek'` yazıyordu — açıklamamayı
    "ücretsiz" beyanı saymak. Üstelik gerçekten ücretsiz staj veren
    şirketin bunu söyleyeceği seçenek YOKTU.
  */
  const bilinmiyor = ilanSatiri({ ...GECERLI, ucret: 'belirtilmeyecek' }, { companyId: 'a', durum: 'draft' });
  assert.equal(bilinmiyor.is_paid, null);
  const ucretsiz = ilanSatiri({ ...GECERLI, ucret: 'ucretsiz' }, { companyId: 'a', durum: 'draft' });
  assert.equal(ucretsiz.is_paid, false);
  const asgari = ilanSatiri({ ...GECERLI, ucret: 'asgari' }, { companyId: 'a', durum: 'draft' });
  assert.equal(asgari.is_paid, true);
  const satir = bilinmiyor;
  assert.equal(satir.stipend_text, null);
});

/* ------------------------------------ Başvuru yolu artık seçim değil */

test('BAŞVURU YOLU SATIRA HİÇ YAZILMIYOR', () => {
  /*
    "Kendi sitemizden" seçeneği kaldırıldı; başvuru her zaman StajımVar
    üzerinden geliyor. Yol istemcinin göndereceği bir alan değil:
    `application_method` kolon varsayılanından ('internal') geliyor ve
    şirketin o kolona yazma yetkisi yok. Satıra yazılsaydı istek
    "permission denied for column" ile düşerdi.
  */
  const satir = ilanSatiri(GECERLI, { companyId: 'c1', durum: 'published' });
  assert.ok(!('application_method' in satir), 'application_method gönderilmemeli');
  assert.ok(!('apply_url' in satir), 'apply_url gönderilmemeli');
});

test('eski basvuruTipi alani gonderilse bile satiri degistirmiyor', () => {
  /* Eski form durumu taşıyan bir istemci yeni davranışı bozmamalı. */
  const a = ilanSatiri({ ...GECERLI, basvuruTipi: 'kendi', basvuruUrl: 'https://x.com/b' },
    { companyId: 'c1', durum: 'draft' });
  const b = ilanSatiri(GECERLI, { companyId: 'c1', durum: 'draft' });
  assert.deepEqual(a, b);
});

test('basvuru adresi artik zorunlu alan degil', () => {
  assert.ok(!ZORUNLU_ALANLAR.includes('basvuruUrl'));
  assert.equal(ilanSorunlari(GECERLI).basvuruUrl, undefined);
});

/*
  ÜLKE VE BAŞVURULABİLEN ÜLKELER (13 Ekim 2026)

  Sunucu kuralıyla aynı (20261213010000): ofis/hibrit ilanda ülke, uzaktan
  ilanda başvurulabilen en az bir ülke zorunlu. Kayıtlı ülkesi olmayan
  ilan düzenlemeye açılınca ülke BOŞ gelir; Türkiye'ye düşmez.
*/
test('ofis ve hibrit ilanda ülke zorunlu; uzaktan ilanda iş yeri ülkesi değil başvuru ülkeleri zorunlu', () => {
  assert.equal(ilanSorunlari({ ...GECERLI, ulke: '' }).ulke, 'Ülkeyi seç.');
  assert.equal(ilanSorunlari({ ...GECERLI, ulke: 'tr' }).ulke, 'Ülkeyi seç.', 'küçük harf kod geçersiz');
  assert.equal(ilanSorunlari({ ...GECERLI, calismaSekli: 'On-site', ulke: 'DE' }).ulke, undefined);

  const uzak = { ...GECERLI, calismaSekli: 'Remote', sehir: '', ulke: '' };
  assert.equal(ilanSorunlari(uzak).ulke, undefined);
  assert.equal(ilanSorunlari(uzak).basvuruUlkeleri, 'Hangi ülkelerden başvurulabileceğini seç.');
  assert.equal(ilanSorunlari({ ...uzak, basvuruUlkeleri: ['TR'] }).basvuruUlkeleri, undefined);
  assert.equal(ilanSorunlari({ ...uzak, basvuruUlkeleri: ['Türkiye'] }).basvuruUlkeleri, 'Hangi ülkelerden başvurulabileceğini seç.');
});

test('satır: ülke ve başvuru ülkeleri veritabanı kısıtlarına uygun gidiyor', () => {
  const ofis = ilanSatiri({ ...GECERLI, ulke: 'TR', basvuruUlkeleri: ['DE'] }, { companyId: 'c', durum: 'draft' });
  assert.equal(ofis.country_code, 'TR');
  assert.equal(ofis.basvuru_ulkeleri, null, 'uzaktan olmayan ilanda başvuru ülkeleri gitmemeli (kısıt)');

  const uzak = ilanSatiri(
    { ...GECERLI, calismaSekli: 'Remote', sehir: '', ulke: '', basvuruUlkeleri: ['TR', 'de', 'TR', 'xx1'] },
    { companyId: 'c', durum: 'draft' },
  );
  assert.equal(uzak.country_code, null);
  assert.deepEqual(uzak.basvuru_ulkeleri, ['TR', 'DE']);

  assert.equal(ilanSatiri({ ...GECERLI, ulke: '' }, { companyId: 'c', durum: 'draft' }).country_code, null);
});

test('düzenleme: kayıtlı ülkesi olmayan ilan Türkiye varsayılmadan boş açılıyor', () => {
  assert.equal(ilanFormDegeri({ title: 'x', city: 'İstanbul', country_code: null }).ulke, '');
  assert.deepEqual(ilanFormDegeri({ title: 'x', city: 'İstanbul' }).basvuruUlkeleri, []);
  const d = ilanFormDegeri({ title: 'x', work_type: 'Remote', country_code: 'DE', basvuru_ulkeleri: ['TR', 'DE'] });
  assert.equal(d.ulke, 'DE');
  assert.deepEqual(d.basvuruUlkeleri, ['TR', 'DE']);
  /* Gidip gelince değer korunuyor. */
  const geri = ilanSatiri({ ...GECERLI, ...d, calismaSekli: 'Remote', sehir: '' }, { companyId: 'c', durum: 'draft' });
  assert.deepEqual(geri.basvuru_ulkeleri, ['TR', 'DE']);
  assert.equal(geri.country_code, 'DE');
});

test('ülke seçenekleri: Türkiye başta, Türkçe adlar, geçerli ve tekrarsız kodlar', () => {
  assert.equal(ULKE_SECENEKLERI[0].kod, 'TR');
  assert.equal(ulkeAdi('DE'), 'Almanya');
  assert.equal(ulkeAdi('TR'), 'Türkiye');
  const kodlar = ULKE_SECENEKLERI.map((u) => u.kod);
  assert.equal(new Set(kodlar).size, kodlar.length);
  assert.ok(kodlar.every((k) => /^[A-Z]{2}$/.test(k)));
  assert.deepEqual(ulkeListesiTemizle(['de', 'DE', '', null, 'TUR', 'NL']), ['DE', 'NL']);
});

test('sunucu gerekçeleri ülke alanlarının altına düşüyor', () => {
  assert.equal(GEREKCE_FORM_ALANI.country_code, 'ulke');
  assert.equal(GEREKCE_FORM_ALANI.basvuru_ulkeleri, 'basvuruUlkeleri');
});
