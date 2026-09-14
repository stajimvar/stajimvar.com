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
  /*
    KART ARTIK `kartSatiri` OKUYOR: "doğrulanamadı" satırı kartta
    çizilmiyor, detayda duruyor. Kaynağın kendi ifadeleri ve
    doğrulanmış rakam kartta kalıyor.
  */
  assert.match(sayfa, /\{tutar\.kartSatiri \? ` · \$\{tutar\.kartSatiri\}` : ''\}/);
  /* Telefonda metin uzasa da kart uzamıyor: en fazla iki satır. */
  assert.match(sayfa, /line-clamp-2 text-xs text-gray-500 sm:hidden/);
  /* Masaüstünde de durum yoksa alan hiç çizilmiyor. */
  assert.match(sayfa, /\{tutar\.kartSatiri && \(/);
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

test('KARTTA "doğrulanamadı" satırı YOK, detayda var', () => {
  /*
    Kartta o satır ekranın dörtte üçünde çıkıyordu (120 kaydın 90'ı) ve
    taşıdığı bilgi sıfır: kullanıcı kartı tarıyor, "doğrulanamadı"
    cümlesi hiçbir kararı değiştirmiyor, yalnız gerçek bilgiyi (tür,
    son tarih) bastırıyordu. Detayda yer var ve bilgi anlam taşıyor.
  */
  const b = opportunityAmount(kayit({ amountStatus: 'belirtilmemis' }));
  assert.equal(b.satir, 'Tutar doğrulanamadı', 'detay satırı duruyor');
  assert.equal(b.kartSatiri, null, 'KARTTA çizilmemeli');

  /* KAYNAĞIN KENDİ İFADELERİ KARTTA KALIYOR: başvuru kararını etkiliyor. */
  for (const durum of ['mali_destek', 'aciklanacak', 'ucretsiz']) {
    const t = opportunityAmount(kayit({ amountStatus: durum }));
    assert.equal(t.kartSatiri, t.satir, `${durum}: kartta kalmalı`);
    assert.ok(t.kartSatiri, `${durum}: metin olmalı`);
  }

  /* DOĞRULANMIŞ RAKAM KARTTA KALIYOR. */
  const d = opportunityAmount(
    kayit({
      amountStatus: 'kesin',
      amountVerifiedAt: '2026-09-13',
      amountMin: 5000,
      currency: 'TRY',
      paymentPeriod: 'monthly',
    })
  );
  assert.equal(d.kartSatiri, d.satir);
  assert.match(d.kartSatiri, /5\.000/);

  /* Kart bileşeni gerçekten `kartSatiri` okuyor. */
  const SAYFA = oku('src/components/OpportunitiesPage.tsx');
  assert.match(SAYFA, /tutar\.kartSatiri \? ` · \$\{tutar\.kartSatiri\}` : ''/);
  assert.match(SAYFA, /\{tutar\.kartSatiri && \(/);
  assert.ok(!/\{tutar\.satir/.test(SAYFA), 'kart artık detay satırını kullanmıyor');
});

test('arka arkaya iki 404 bağımsız teyit sayılmıyor', async () => {
  /*
    KENDİ ELİMLE ÜRETTİM: işçiyi elle iki kez koşturdum (~30 dk arayla)
    ve bir kayıt ikinci koşuda `expired` oldu. O iki ölçüm bağımsız
    değil — aynı yarım saat içinde aynı durumu iki kez gördüler.
    Kurumun sitesi bakımda olsaydı gerçekten açık bir burs yarım saatte
    listeden düşerdi.
  */
  const { guncellemeyiHesapla, bagimsizTeyitMi, TEYIT_ARALIGI_MS } = await import(
    '../scripts/firsat-kaynak-kontrol.mjs'
  );
  const SIMDI = '2026-09-15T12:00:00Z';
  assert.equal(TEYIT_ARALIGI_MS, 24 * 60 * 60 * 1000);

  /* Damga yoksa ilk ölçüm sayılıyor. */
  assert.equal(bagimsizTeyitMi(null, SIMDI), true);
  assert.equal(bagimsizTeyitMi('2026-09-15T11:30:00Z', SIMDI), false, '30 dk bağımsız değil');
  assert.equal(bagimsizTeyitMi('2026-09-14T11:00:00Z', SIMDI), true, '25 saat bağımsız');

  /* ARKA ARKAYA: sayaç ilerlemiyor, kayıt açık kalıyor. */
  const arkaArkaya = guncellemeyiHesapla(
    { status: 'published', source_failure_count: 1, source_failure_last_at: '2026-09-15T11:30:00Z' },
    { durum: 'closed' },
    SIMDI
  );
  assert.equal(arkaArkaya.status, undefined, 'elle arka arkaya koşu kapatmamalı');
  assert.ok(!('source_failure_count' in arkaArkaya), 'sayaç ilerlememeli');

  /* 24 SAAT SONRA: ikinci teyit sayılıyor ve kayıt düşüyor. */
  const ertesiGun = guncellemeyiHesapla(
    { status: 'published', source_failure_count: 1, source_failure_last_at: '2026-09-14T11:00:00Z' },
    { durum: 'closed' },
    SIMDI
  );
  assert.equal(ertesiGun.status, 'expired');
  assert.equal(ertesiGun.source_failure_count, 2);
  assert.equal(ertesiGun.source_failure_last_at, SIMDI);
});

test('açık "başvurular kapandı" ifadesi tek ölçümde kapatıyor', async () => {
  const { acikKapanisVar, guncellemeyiHesapla } = await import(
    '../scripts/firsat-kaynak-kontrol.mjs'
  );
  assert.equal(acikKapanisVar('<p>2026 dönemi başvurularımız kapandı.</p>'), true);
  assert.equal(acikKapanisVar('<p>Applications are closed</p>'), true);
  /* Açık bir sayfa yanlışlıkla kapanmıyor. */
  assert.equal(acikKapanisVar('<p>Başvuru formunu doldurun, son başvuru 30 Eylül.</p>'), false);
  /* HTML yorumundaki metin sayılmıyor: sayfada GÖRÜNMÜYOR. */
  assert.equal(acikKapanisVar('<!-- başvurular kapandı -->'), false);

  /*
    KESİN KANIT EŞİĞİ BEKLEMİYOR: kurumun kendi cümlesi tek ölçümde
    yeterli. Bir 404 buraya GİRMİYOR — o geçici dağıtım hatası da
    olabilir.
  */
  const k = guncellemeyiHesapla(
    { status: 'published', source_failure_count: 0, source_failure_last_at: null },
    { durum: 'closed', kesin: true },
    '2026-09-15T12:00:00Z'
  );
  assert.equal(k.status, 'expired');

  const dortyuzdort = guncellemeyiHesapla(
    { status: 'published', source_failure_count: 0, source_failure_last_at: null },
    { durum: 'closed' },
    '2026-09-15T12:00:00Z'
  );
  assert.equal(dortyuzdort.status, undefined, '404 tek ölçümde kapatmamalı');
});

test('arka arkaya kapanan kayıt göçle geri değerlendiriliyor', () => {
  const GOC = oku('supabase/migrations/20261009010000_firsat_kapanis_guvenligi.sql');
  assert.match(GOC, /add column if not exists source_failure_last_at timestamptz/);
  /* Dar koşul: yalnız bugün, closed ve tam iki sayaçla düşenler. */
  assert.match(GOC, /source_failure_count = 2/);
  assert.match(GOC, /source_checked_at >= now\(\) - interval '24 hours'/);
  assert.match(GOC, /set status = 'published'/);
  /* Kayıt "açık" ilan EDİLMİYOR: doğrulama damgası atılmıyor. */
  assert.ok(!/set[\s\S]{0,200}verified_at = now\(\)/.test(GOC), 'verified_at elle atılmamalı');
});
