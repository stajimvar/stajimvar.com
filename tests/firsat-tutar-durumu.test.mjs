import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  opportunityAmount,
  TUTAR_DURUMU,
  TUTAR_METNI,
} from '../src/lib/firsat-degerlendirme.mjs';

/*
  TUTAR SATIRI — BEŞ DURUM

  Kart 113 kaydın 113'ünde "Tutar açıklanmadı" diyordu. Cümle üç ayrı
  gerçeği tek torbaya atıyordu: kurumun henüz rakam yayımlamadığı burs,
  tanımı gereği sabit rakamı olmayan kapsamlı program ve parayla hiç
  ilgisi olmayan atölye. Üçü de aynı cümleyi görünce cümle hiçbir şey
  söylemiyor.

  Kural kaydın KENDİ alanlarının bir fonksiyonu: yeni eklenen kayıt da
  aynı yerden geçiyor, ayrıca bir şey yapmak gerekmiyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const kayit = (yama = {}) => ({ opportunityType: 'scholarship', ...yama });

test('doğrulanmış rakam varsa tutar ve dönemi yazılıyor', () => {
  const t = opportunityAmount(
    kayit({
      amountVerifiedAt: '2026-09-01',
      amountMin: 5000,
      amountMax: 5000,
      currency: 'TRY',
      paymentPeriod: 'monthly',
      amountPeriodLabel: '2026–2027',
    }),
  );
  assert.equal(t.durum, TUTAR_DURUMU.rakam);
  assert.equal(t.bilinmiyor, false);
  assert.match(t.satir, /5\.000/);
  assert.match(t.satir, /2026–2027/, 'ödeme dönemi satırda');
});

test('ESKİ DÖNEM TUTARI KULLANILMIYOR: damgasız sayı rakam sayılmıyor', () => {
  /*
    Burs tutarları her yıl değişiyor. `amount_verified_at` o rakamın
    kurumun kendi sayfasında GÖRÜLDÜĞÜ an; damga yoksa sayı geçen yılın
    rakamı olabilir. Damgasız kayıt rakam dalına hiç girmiyor.
  */
  const t = opportunityAmount(
    kayit({ amountMin: 5000, currency: 'TRY', paymentPeriod: 'monthly' }),
  );
  assert.equal(t.durum, TUTAR_DURUMU.aciklanacak);
  assert.equal(t.satir, 'Tutar kurumca açıklanacak');
  assert.doesNotMatch(t.satir, /5\.000/);
});

test('sıklığı olmayan sayı gösterilmiyor', () => {
  /* "2.250 ₺" tek başına aylık mı tek seferlik mi belli değil. */
  const t = opportunityAmount(kayit({ amountVerifiedAt: '2026-09-01', amountMin: 2250, currency: 'TRY' }));
  assert.equal(t.durum, TUTAR_DURUMU.aciklanacak);
});

test('sabit tutarı olmayan destek programı: "Mali destek sağlanıyor"', () => {
  /*
    Fulbright FLTA'nın resmî sayfası (doğrulandı 13 Eylül 2026): "Burs,
    sağlık sigortası, Fulbright etkinlikleri masrafları, kalacak yer,
    yaşam giderleri ve gidiş-dönüş ulaşım desteğini kapsamaktadır" ve
    "aylık burs ödemesi miktarı eyalete göre değişmektedir". Yani destek
    var, yayımlanacak tek bir sayı yok.
  */
  for (const nitelik of ['Programa göre değişiyor', 'Hibe destekli', 'Yol ve konaklama desteği', 'Harcırah ödeniyor']) {
    const t = opportunityAmount(kayit({ amountText: nitelik }));
    assert.equal(t.durum, TUTAR_DURUMU.maliDestek, nitelik);
    assert.equal(t.satir, 'Mali destek sağlanıyor');
  }
});

test('katılım ücretsizse: "Ücretsiz"', () => {
  for (const nitelik of ['Ücretsiz', 'Katılım ücreti yok']) {
    const t = opportunityAmount(kayit({ opportunityType: 'education', amountText: nitelik }));
    assert.equal(t.durum, TUTAR_DURUMU.ucretsiz);
    assert.equal(t.satir, 'Ücretsiz');
  }
});

test('para var ama rakam yok: "Tutar kurumca açıklanacak"', () => {
  for (const nitelik of ['Karşılıksız', 'Geri ödemeli', 'Ödüllü']) {
    const t = opportunityAmount(kayit({ opportunityType: 'competition', amountText: nitelik }));
    assert.equal(t.durum, TUTAR_DURUMU.aciklanacak, nitelik);
  }
});

test('parayla ilgisi olmayan kayıtta satır hiç çizilmiyor', () => {
  /*
    Yarışma, atölye ve gençlik programında para olabilir de olmayabilir
    de. Kayıt kendi alanlarında bir şey söylemiyorsa iddia edilmiyor:
    "açıklanacak" demek olmayan bir ödemeyi varmış gibi göstermek olurdu.
  */
  for (const tur of ['competition', 'education', 'youth_program', 'career_fair']) {
    const t = opportunityAmount(kayit({ opportunityType: tur }));
    assert.equal(t.durum, TUTAR_DURUMU.yok, tur);
    assert.equal(t.satir, null, `${tur}: satır çizilmemeli`);
  }
});

test('parası tanımı gereği olan türlerde rakamsız kayıt "açıklanacak" diyor', () => {
  /*
    `international` bu kümede: envanterdeki yurt dışı kayıtlarının hepsi
    burs ve değişim programı (Fulbright, Erasmus, Swiss Government
    Excellence, NAWA, Deutschlandstipendium …) ve ortak noktaları bir
    ödeme taşımaları.
  */
  for (const tur of ['scholarship', 'kyk', 'student_support', 'international']) {
    const t = opportunityAmount(kayit({ opportunityType: tur }));
    assert.equal(t.durum, TUTAR_DURUMU.aciklanacak, tur);
  }
});

test('ücretsizlik önce okunuyor: "Ücretsiz · burs yok" burs sayılmıyor', () => {
  const t = opportunityAmount(kayit({ opportunityType: 'education', amountText: 'Ücretsiz', supportType: 'Burs' }));
  assert.equal(t.durum, TUTAR_DURUMU.ucretsiz);
});

test('metinler tek yerde tanımlı ve kart oradan okuyor', () => {
  assert.deepEqual(TUTAR_METNI, {
    aciklanacak: 'Tutar kurumca açıklanacak',
    mali_destek: 'Mali destek sağlanıyor',
    ucretsiz: 'Ücretsiz',
  });
  const sayfa = oku('src/components/OpportunitiesPage.tsx');
  /* Kart artık kendi cümlesini kurmuyor: `satir` ne diyorsa onu yazıyor. */
  assert.doesNotMatch(sayfa, /Tutar açıklanmadı/, 'eski tek cümle geri gelmiş');
  assert.match(sayfa, /\{tutar\.satir \? ` · \$\{tutar\.satir\}` : ''\}/);
  /* Telefonda metin uzasa da kart uzamıyor: en fazla iki satır. */
  assert.match(sayfa, /line-clamp-2 text-xs text-gray-500 sm:hidden/);
  /*
    Logo yalnız HER ZAMAN VAR OLAN iki satırı kaplıyor; tutar satırı
    gizlenebildiği için üçe yayılsaydı ızgara boş bir örtük satır açar
    ve kart uzardı.
  */
  assert.match(sayfa, /col-start-1 row-start-1 row-span-2 !h-10 !w-10/);
});
