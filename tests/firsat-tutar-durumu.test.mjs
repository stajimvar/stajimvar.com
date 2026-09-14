import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  opportunityAmount,
  paraBicimi,
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

test('doğrulanmış rakam varsa tutar ve ödeme dönemi yazılıyor', () => {
  const t = opportunityAmount(
    kayit({
      amountStatus: 'kesin',
      amountVerifiedAt: '2026-09-13',
      amountMin: 7000,
      amountMax: 7000,
      currency: 'TRY',
      paymentPeriod: 'monthly',
      amountPeriodLabel: '2026–2027',
    }),
  );
  assert.equal(t.durum, 'kesin');
  assert.equal(t.bilinmiyor, false);
  assert.match(t.satir, /7\.000/);
  assert.match(t.satir, /2026–2027/, 'ödeme dönemi satırda');
});

test('DURUM VERİDEN GELİYOR, TÜRDEN DEĞİL', () => {
  /*
    Durum kaydın türünden türetiliyordu: "burs ya da yurt dışı ise demek
    ki bir ödeme var, kurum henüz açıklamamış". 113 kaydın 106'sı
    "Tutar kurumca açıklanacak" cümlesini kaynağında öyle yazdığı için
    değil, TÜRÜ öyle olduğu için gösteriyordu.

    Tür artık hiçbir şey söylemiyor: `amount_status` yoksa satır yok.
  */
  for (const tur of ['scholarship', 'kyk', 'student_support', 'international', 'competition']) {
    const t = opportunityAmount(kayit({ opportunityType: tur }));
    assert.equal(t.durum, null, tur);
    assert.equal(t.satir, null, `${tur}: türden cümle üretilmemeli`);
  }
});

test('her durumun ekranda tek bir karşılığı var', () => {
  const bekleme = {
    aciklanacak: 'Tutar kurumca açıklanacak',
    mali_destek: 'Mali destek sağlanıyor',
    belirtilmemis: 'Tutar doğrulanamadı',
    ucretsiz: 'Ücretsiz',
  };
  for (const [durum, metin] of Object.entries(bekleme)) {
    const t = opportunityAmount(kayit({ amountStatus: durum }));
    assert.equal(t.satir, metin, durum);
  }
});

test('belirsiz ve kontrol edilmemiş kayıtta satır çizilmiyor', () => {
  /*
    Betiğin kararsızlığı ekranda bir iddiaya dönüşmemeli: açılamayan,
    çelişkili ya da hiç bakılmamış kaynak için hiçbir şey yazılmıyor.
  */
  assert.equal(opportunityAmount(kayit({ amountStatus: 'belirsiz' })).satir, null);
  assert.equal(opportunityAmount(kayit({})).satir, null);
  /* İleride eklenip arayüze yansımamış bir durum da satır çizdirmiyor. */
  assert.equal(opportunityAmount(kayit({ amountStatus: 'yeni_bir_durum' })).satir, null);
});

test('ESKİ DÖNEM TUTARI KULLANILMIYOR: damgasız sayı rakam sayılmıyor', () => {
  /*
    Rakam yalnızca `amount_verified_at` damgası varken çıkıyor; damgayı
    da yalnız betiğin `kesin` dalı atıyor. Damgasız bir sayı geçen yılın
    rakamı olabilir.
  */
  const t = opportunityAmount(
    kayit({ amountStatus: 'belirtilmemis', amountMin: 22500, currency: 'TRY', paymentPeriod: 'yearly' }),
  );
  assert.equal(t.durum, 'belirtilmemis');
  assert.equal(t.satir, 'Tutar doğrulanamadı');
  assert.doesNotMatch(t.satir, /22\.500/);
});

test('sıklığı olmayan sayı gösterilmiyor', () => {
  /* "2.250 TL" tek başına aylık mı tek seferlik mi belli değil. */
  const t = opportunityAmount(
    kayit({ amountStatus: 'kesin', amountVerifiedAt: '2026-09-13', amountMin: 2250, currency: 'TRY' }),
  );
  assert.equal(t.bilinmiyor, true);
});

test('metinler tek yerde tanımlı ve kart oradan okuyor', () => {
  assert.deepEqual(TUTAR_METNI, {
    aciklanacak: 'Tutar kurumca açıklanacak',
    mali_destek: 'Mali destek sağlanıyor',
    belirtilmemis: 'Tutar doğrulanamadı',
    ucretsiz: 'Ücretsiz',
  });
  assert.equal(TUTAR_DURUMU.kesin, 'kesin');
  assert.equal(TUTAR_DURUMU.belirsiz, 'belirsiz');

  const sayfa = oku('src/components/OpportunitiesPage.tsx');
  /* Kart kendi cümlesini kurmuyor: `satir` ne diyorsa onu yazıyor. */
  assert.doesNotMatch(sayfa, /Tutar açıklanmadı/, 'eski tek cümle geri gelmiş');
  assert.match(sayfa, /\{tutar\.satir \? ` · \$\{tutar\.satir\}` : ''\}/);
  /* Telefonda metin uzasa da kart uzamıyor: en fazla iki satır. */
  assert.match(sayfa, /line-clamp-2 text-xs text-gray-500 sm:hidden/);
  /* Masaüstünde de durum yoksa alan hiç çizilmiyor. */
  assert.match(sayfa, /\{tutar\.satir && \(/);
  assert.doesNotMatch(sayfa, /'Belirtilmemiş'/, 'masaüstü hâlâ varsayım basıyor');
  /*
    Logo yalnız HER ZAMAN VAR OLAN iki satırı kaplıyor; tutar satırı
    gizlenebildiği için üçe yayılsaydı ızgara boş bir örtük satır açar
    ve kart uzardı.
  */
  assert.match(sayfa, /col-start-1 row-start-1 row-span-2 !h-10 !w-10/);
});

test('sorgu ve tip yeni alanları taşıyor', () => {
  /* Kanıt alanları ekranda kullanılmıyor ama denetim için çekiliyor. */
  const lib = oku('src/lib/opportunities.ts');
  for (const alan of ['amount_status', 'amount_checked_at', 'amount_source_url', 'amount_evidence']) {
    assert.ok(lib.includes(alan), `${alan} sorguda yok`);
  }
  assert.match(lib, /amountStatus\?: 'kesin' \| 'aciklanacak' \| 'mali_destek' \| 'belirtilmemis' \| 'ucretsiz' \| 'belirsiz'/);
});

test('TÜRK LİRASI "7.000 TL" yazılıyor, "₺7.000" değil', () => {
  /*
    `Intl` TRY için ₺ işaretini SAYIDAN ÖNCE koyuyor. Türkçede tutar
    sayıdan sonra ve çoğunlukla "TL" ile yazılıyor; burs ilanlarının
    kendi sayfalarında da öyle geçiyor ("aylık burs miktarı 7.000 TL").
    Kaynağıyla aynı yazılmayan bir rakam, öğrenciyi ikisini
    karşılaştırırken duraklatıyor.
  */
  assert.equal(paraBicimi(7000, 'TRY'), '7.000 TL');
  assert.equal(paraBicimi(22500, 'TRY'), '22.500 TL');
  /* Birim verilmezse varsayılan TRY. */
  assert.equal(paraBicimi(7000), '7.000 TL');

  const t = opportunityAmount(
    kayit({
      amountStatus: 'kesin',
      amountVerifiedAt: '2026-09-13',
      amountMin: 7000,
      amountMax: 7000,
      currency: 'TRY',
      paymentPeriod: 'monthly',
      amountPeriodLabel: '2026–2027',
    }),
  );
  assert.equal(t.satir, 'Aylık 7.000 TL · 2026–2027');
  assert.doesNotMatch(t.satir, /₺/);
});

test('öteki para birimlerinin gösterimi değişmedi', () => {
  /*
    EUR ve USD `Intl`in yerel kuralında kalıyor: onların doğru yazımını
    zaten biliyor ve her birim için elle kural yazmak yeni bir hata
    yüzeyi açardı.
  */
  assert.match(paraBicimi(3000, 'EUR'), /3\.000/);
  assert.match(paraBicimi(3000, 'EUR'), /€/);
  assert.match(paraBicimi(60000, 'USD'), /60\.000/);
  assert.match(paraBicimi(60000, 'USD'), /\$/);
  /*
    Tanınmayan ama geçerli biçimdeki kodu `Intl` kendisi yazıyor
    ("XYZ 500"); catch dalı yalnız gerçekten geçersiz kodlar için.
    Sınanan şey davranışın DEĞİŞMEMESİ: sayı kaybolmuyor.
  */
  assert.match(paraBicimi(500, 'XYZ'), /500/);
  assert.match(paraBicimi(500, 'XYZ'), /XYZ/);
  assert.equal(paraBicimi(null, 'TRY'), null);
  assert.equal(paraBicimi('abc', 'TRY'), null);
});

test('KURUM ADINA BEYAN YOK: "belirtilmemiş" iddiası kaldırıldı', () => {
  /*
    `belirtilmemis` satırı "Tutar belirtilmemiş" yazıyordu ve bu KURUM
    ADINA bir beyan: "kurum tutarı açıklamadı". Bildiğimiz tek şey BİZİM
    okuduğumuz sayfada rakam GÖRMEDİĞİMİZ — rakam bir PDF'te, giriş
    arkasında ya da ayrıştırıcının atladığı bir tabloda olabilir.

    Ölçüm: 120 kaydın 89'u bu durumdaydı, yani iddia ekranın dörtte
    üçünde çıkıyordu.
  */
  assert.equal(TUTAR_METNI.belirtilmemis, 'Tutar doğrulanamadı');
  for (const metin of Object.values(TUTAR_METNI)) {
    assert.ok(
      !/belirtilmemi|açıklanmadı|açıklamadı/i.test(metin),
      `kurum adına beyan olmamalı: ${metin}`
    );
  }
  /*
    ÖTEKİ ÜÇ DURUM KAYNAĞIN KENDİ İFADESİ: "açıklanacak", "mali destek
    sağlanıyor", "ücretsiz" — onlar bizim değil kurumun beyanı ve
    değişmedi.
  */
  assert.equal(TUTAR_METNI.aciklanacak, 'Tutar kurumca açıklanacak');
  assert.equal(TUTAR_METNI.mali_destek, 'Mali destek sağlanıyor');
  assert.equal(TUTAR_METNI.ucretsiz, 'Ücretsiz');
});

test('kaynak kontrolü açılış okumasını yeniden deniyor', () => {
  /*
    ÖLÇÜLDÜ: 13 Eylül 2026 koşusu "fırsatlar okunamadı: Gateway Timeout"
    ile düştü. Okuma tek denemeydi ve hata ölümcüldü; cron üç günde bir
    koştuğu için 120 kaydın `source_status` alanı boş kaldı — kapanış
    kontrolü hiç çalışmadı.
  */
  const ISCI = oku('scripts/firsat-kaynak-kontrol.mjs');
  assert.match(ISCI, /deneme <= 3/);
  assert.match(ISCI, /fırsatlar okunamadı \(deneme \$\{deneme\}\/3\)/);
  /* Üçü de düşerse hâlâ hata veriyor: kalıcı sorun gizlenmiyor. */
  assert.match(ISCI, /üç denemede de okunamadı/);
  assert.match(ISCI, /process\.exit\(1\)/);
  /* Cron üç günde bir: mevcut otomasyon, ikinci zamanlama yok. */
  const AKIS = oku('.github/workflows/firsat-kaynak-kontrolu.yml');
  assert.match(AKIS, /cron: "10 5 \*\/3 \* \*"/);
  assert.equal((AKIS.match(/cron:/g) ?? []).length, 1, 'tek zamanlama olmalı');
});

test('kesin kapanış iki teyitte aktif listeden çıkıyor', async () => {
  /*
    ÖLÇÜLDÜ: tek eşik 3'tü ve kontrol üç günde bir koştuğu için KESİN
    kapanmış (404/410) bir fırsat DOKUZ GÜN aktif listede kalıyordu.
    Canlıda iki kayıt 404 döndü ve `published` kaldı.

    İşçi geçici ile kesini zaten ayırıyor (403/429/5xx sayaca hiç
    girmiyor), yani sayaca giren şey baştan kesin bir sinyal.
  */
  const { guncellemeyiHesapla, kapanisEsigi } = await import(
    '../scripts/firsat-kaynak-kontrol.mjs'
  );
  const kur = (sayac, durum) =>
    guncellemeyiHesapla({ source_failure_count: sayac, status: 'published' }, { durum, sebep: 'x' }, 'T');

  assert.equal(kapanisEsigi('closed'), 2);
  /* Taşınma geçici bir yönlendirme olabilir: üç teyit. */
  assert.equal(kapanisEsigi('moved'), 3);

  assert.equal(kur(0, 'closed').status, undefined, 'ilk 404 tek başına düşürmüyor');
  assert.equal(kur(1, 'closed').status, 'expired', 'ikinci teyitte aktif listeden çıkıyor');
  assert.equal(kur(1, 'moved').status, undefined);
  assert.equal(kur(2, 'moved').status, 'expired');

  /* GEÇİCİ HATA SAYACA HİÇ GİRMİYOR: ne artırıyor ne sıfırlıyor. */
  const gecici = kur(1, 'transient_error');
  assert.equal(gecici.status, undefined, 'geçici hata kaydı kapatmıyor');
  assert.ok(!('source_failure_count' in gecici), 'sayaca dokunmuyor');
});
