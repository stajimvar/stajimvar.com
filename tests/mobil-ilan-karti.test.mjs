import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

/* Kart ve detayın PAYLAŞTIĞI kararlar — gerçekten çalıştırılıyor. */
import {
  donemEtiketi,
  sigortaMetni,
  stajTuruRozeti,
  stajTuruSatirlari,
  ucretMetniHesapla,
} from '../src/lib/staj-turu.mjs';

/**
 * MOBİL İLAN KARTI — BİLGİ DOĞRULUĞU
 *
 * Kartın mobil DÜZENİ `ui/tokens`taki YUZEY ile zaten kurulu (tam
 * genişlik, köşesiz, gölgesiz, 1 px ayırıcı). Buradaki testler o düzeni
 * ve kartın SÖYLEDİĞİ bilginin doğruluğunu bağlıyor.
 */

const oku = (y) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');
const yorumsuz = (m) => m.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

const KART = oku('src/components/InternshipCard.tsx');
/* Kart tek tipe indi (onaylanan tasarım): ücret, sigorta ve staj türü
   artık ilan DETAY sayfasında. Kararlar yine lib/staj-turu'da. */
const ILAN_DETAYI = oku('src/components/ListingPage.tsx');
const TOKEN = oku('src/ui/tokens.ts');
const MAPPER = oku('src/lib/queries/mappers.ts');
const TIPLER = oku('src/types.ts');

test('ücret rozeti üç değeri ayırıyor', () => {
  /*
    Önce `isPaid &&` yazıyordu: sütun `not null default false` olduğu
    için false hem "ücretsiz" hem "bilinmiyor" demekti. Göç
    20261001010000'dan beri ayrım veride var.
  */
  /* Kartta ücret rozeti YOK (tek tip kart); karar detay sayfasında ve
     ortak dosyada. Üç değer ayrımı burada gerçekten çalıştırılıyor. */
  assert.ok(!/stipend\.isPaid/.test(yorumsuz(KART)), 'kart ücret rozeti taşımıyor');
  assert.match(ILAN_DETAYI, /ucretMetni && \(/);
  assert.equal(ucretMetniHesapla({ isPaid: false }), 'Ücretsiz');
  assert.equal(ucretMetniHesapla({ isPaid: null }), null, 'bilinmeyen ücret metin üretmiyor');
});

test('sigorta sağlayanı yalnız biliniyorsa görünüyor', () => {
  /* Sigorta kartta değil, detayda: kart tek tip. */
  assert.ok(!/insuranceProvider/.test(yorumsuz(KART)), 'kart sigorta rozeti taşımıyor');
  assert.match(ILAN_DETAYI, /sigorta && \(/);
  assert.equal(sigortaMetni('yok'), 'Sigorta yok');
  assert.equal(sigortaMetni(undefined), null, 'bilinmeyen sağlayıcı metin üretmiyor');
  /* Tanınmayan değer `undefined`a düşüyor: uydurma etiket yok. */
  assert.match(MAPPER, /SIGORTA_SAGLAYICILARI\.includes\(/);
  assert.match(TIPLER, /insuranceProvider\?: 'isveren' \| 'universite' \| 'aday' \| 'yok';/);
});

test('zorunlu ve gönüllü birlikte true olduğunda ikisi de kaybolmuyor', () => {
  /*
    ÖNCEKİ HÂL BİR KUSURDU: gönüllü rozetini yalnız zorunlu YOKKEN
    çiziyordum. Ölçüldü (14 Eylül 2026, üretim): 175 ilanın 122'sinde
    ikisi de true — yani o kural 122 ilanda gönüllü bilgisini
    gizliyordu.

    Kural artık ortak dosyada ve gerçekten çalıştırılıyor.
  */
  assert.equal(
    stajTuruRozeti({ mandatoryStajAccepted: true, voluntaryStajAccepted: true }),
    'Zorunlu ve gönüllü staj'
  );
  assert.equal(
    stajTuruRozeti({ mandatoryStajAccepted: true, voluntaryStajAccepted: null }),
    'Zorunlu Staj (SGK)'
  );
  assert.equal(
    stajTuruRozeti({ mandatoryStajAccepted: null, voluntaryStajAccepted: true }),
    'Gönüllü staj'
  );
  /* İkisi de bilinmiyorsa rozet YOK. */
  assert.equal(stajTuruRozeti({ mandatoryStajAccepted: null, voluntaryStajAccepted: null }), null);
  /* Açık RET gerçek bilgi. */
  assert.equal(
    stajTuruRozeti({ mandatoryStajAccepted: false, voluntaryStajAccepted: null }),
    'Zorunlu staj kabul etmiyor'
  );
  /* Detayda BİLİNEN İKİ BİLGİ DE ayrı satırda. */
  assert.deepEqual(
    stajTuruSatirlari({ mandatoryStajAccepted: true, voluntaryStajAccepted: false }),
    [
      { etiket: 'Zorunlu staj', deger: 'Kabul ediliyor' },
      { etiket: 'Gönüllü staj', deger: 'Kabul edilmiyor' },
    ]
  );
  assert.deepEqual(stajTuruSatirlari({}), []);
  /* Kart tek kompakt rozet çiziyor. */
  /* Rozet kartta değil; kural ortak dosyada ve yukarıda çalıştırıldı. */
  assert.match(ILAN_DETAYI, /stajTuru\.map\(/);
});

test('doğrulama bilgisi source_verified_at üzerinden', () => {
  /*
    İki farklı "son kontrol" var: `last_seen_at` toplama hattının HAM
    KAYDI yeniden gördüğü an, `source_verified_at` ise başvuru
    sayfasının çalıştığının doğrulandığı an. Kart ikincisini
    gösteriyor — mapper `lastSeenAt`i o kolondan besliyor.
  */
  assert.match(MAPPER, /lastSeenAt: row\.source_verified_at \?\? undefined/);
  /* Son kontrol kartta değil, ilan sayfasında: kart tek tip. */
  assert.match(ILAN_DETAYI, /lastSeenAt/);
  /* `source_checked_at` arayüze HİÇ geçmiyor: ilerlemiş bir kontrol
     doğrulama gibi sunulmasın. */
  assert.ok(!/source_checked_at/.test(MAPPER), 'checked alanı ürün modeline girmemeli');
  assert.ok(!/sourceCheckedAt/.test(KART));
});

test('belirsiz ve erişilemedi kapalı gibi gösterilmiyor', () => {
  /* Kart yalnız `kapali` durumunda kapanma dili kullanıyor; diğer
     durumlar rozet üretmiyor. */
  const kod = yorumsuz(KART);
  const kapanma = kod.match(/sourceStatus === '(\w+)'/g) || [];
  for (const e of kapanma) {
    assert.ok(
      !/erisilemedi|belirsiz/.test(e),
      `geçici/belirsiz durum kartta kapanma gibi kullanılmamalı: ${e}`
    );
  }
});

test('mobil düzen: tam genişlik, köşesiz, gölgesiz, 1 px ayırıcı', () => {
  /* Düzen token'da: sınıflar EKLENMİYOR, dala göre tam yazılıyor. */
  assert.match(TOKEN, /kap: '-mx-4 sm:mx-0'/);
  assert.match(TOKEN, /kabuk: 'border-b border-gray-200 sm:rounded-2xl sm:border'/);
  /* Kart mobil dalda YUZEY kullanıyor; gölge yalnız `sm:` üstünde. */
  assert.match(KART, /\$\{YUZEY\.kabuk\} \$\{YUZEY\.ic\} sm:hover:border-blue-500 sm:hover:shadow-xs/);
  /* Masaüstü dalı korunuyor: yuvarlak köşe + kenar + gölge. */
  assert.match(KART, /rounded-2xl border border-gray-200 p-3\.5 hover:border-blue-500 hover:shadow-xs sm:p-4\.5/);
});

test('kart tek tip: ilana göre değişen rozet yığını yok', () => {
  /*
    Kartta "%N uyum", "Eksik: <beceri>", "Son kontrol", yayın tarihi,
    süre, ücret ve sigorta rozetleri vardı; her ilanda farklı sayıda
    çip çıkıyor, aynı listedeki kartlar birbirine benzemiyordu.
    Onaylanan tasarımda kart tek tip: şirket, pozisyon, konum, kaynak.
  */
  const kod = yorumsuz(KART);
  for (const kalinti of ['Eksik:', 'sonKontrolMetni', 'SIGORTA_ETIKET', 'stipend.isPaid']) {
    assert.ok(!kod.includes(kalinti), `kartta kalmamalı: ${kalinti}`);
  }
  /* Kaynak çipi KALIYOR: her ilanda var ve başvurunun nereye gittiğini
     söylüyor. */
  assert.match(KART, /ILAN_KAYNAGI\.dis\.etiket/);
});

test('başvuru yöntemine göre ana düğme', () => {
  /*
    "Resmî site" hangi site olduğunu söylemiyor: öğrenci StajımVar'ı da
    resmî sayabilir. Düğme başvurunun NEREDE yapılacağını söylemeli.
  */
  const YOL = oku('src/lib/basvuru-yolu.mjs');
  assert.match(YOL, /anaEtiket: 'Şirket sayfasında başvur'/);
  /* internal ve email_application mevcut platform içi işlemi
     kullanmaya devam ediyor — ikisi de "StajımVar ile Başvur". */
  assert.equal((YOL.match(/anaEtiket: 'StajımVar ile Başvur'/g) || []).length, 2);
  /* Adres yoksa yapılabilecek tek şey kaydı tutmak. */
  assert.match(YOL, /anaEtiket: 'Başvurduğumu işaretle'/);
  /* Aynı etiket diyalogda da tutarlı. */
  assert.match(oku('src/components/ApplyDialog.tsx'), /'Şirket sayfasında başvur'/);
  /* İlan bildir bağlantısı korunuyor. */
  assert.match(oku('src/components/InternshipDetailModal.tsx'), /Bu ilanı bildir/);
});

test('kolon listesine eklenen her kolonun okuma yetkisi var', () => {
  /*
    CANLIDA KIRIKTI (14 Eylül 2026): `insurance_provider`
    `LISTING_COLUMNS`a eklendiği anda bütün ilan sorguları
    `42501 permission denied for table listings` verdi ve ilan detayı
    "İlan yüklenemedi" gösterdi.

    `listings` tablosunda SELECT tablo düzeyinde DEĞİL, kolon kolon
    veriliyor. Yetkisi olmayan TEK bir kolonu istemek sorgunun
    TAMAMINI düşürüyor.

    Bu test o bağı kuruyor. Göç adlarını elle eşlemiyor: dizini
    tarıyor, yoksa yeni bir göç eklendiğinde test sessizce eksik
    kalırdı. Regex de kullanmıyor — ilk hâlinde kaçış bozulmuş ve test
    kendi kalıbında patlamıştı.
  */
  const dizin = new URL('../supabase/migrations/', import.meta.url);
  const tumGocler = readdirSync(dizin)
    .filter((ad) => ad.endsWith('.sql'))
    .map((ad) => readFileSync(new URL(ad, dizin), 'utf8'))
    .join('\n');

  /* Göç 20261001010000'ın eklediği üç kolon. */
  for (const kolon of ['location_raw', 'insurance_provider', 'department_tags']) {
    const yetkiliMi = tumGocler
      .split('grant select (')
      .slice(1)
      .some((parca) => parca.slice(0, parca.indexOf(')')).includes(kolon));
    assert.ok(yetkiliMi, `${kolon} icin grant select yok — butun ilan sorgularini dusurur`);
  }

  /* Kolon listesinde olan `insurance_provider` gerçekten yetkili. */
  assert.match(MAPPER, /'insurance_provider',/);
});

test('dönem etiketi enum değerini ekrana sızdırmıyor', () => {
  /*
    ÖLÇÜLDÜ (canlı, 14 Eylül 2026): detayda "DÖNEM: All Year" yazıyordu
    — `listing_term` şema enum'ının ham hâli.
  */
  assert.equal(donemEtiketi('All Year'), 'Yıl boyu');
  assert.equal(donemEtiketi('Summer 2026'), 'Yaz 2026');
  assert.equal(donemEtiketi('Long-term 2026'), 'Uzun dönem 2026');
  /* Tanınmayan değer olduğu gibi dönüyor: uydurma çeviri üretmiyoruz. */
  assert.equal(donemEtiketi('Spring 2027'), 'Spring 2027');
  assert.equal(donemEtiketi(''), null);
  assert.equal(donemEtiketi(null), null);
  assert.match(oku('src/components/ListingPage.tsx'), /donemEtiketi\(listing\?\.term\)/);
});

test('mobilde ikincil takip işlemi var ve iOS güvenli alanı korunuyor', () => {
  const DETAY = oku('src/components/ListingPage.tsx');
  /*
    ÖLÇÜLDÜ: masaüstü blokta "Başvurduğumu işaretle" vardı ama o blok
    `hidden lg:flex`; telefonda yalnız birincil düğme çiziliyordu ve
    detaydan takip listesine ekleme yolu HİÇ YOKTU.
  */
  const cubuk = DETAY.slice(DETAY.indexOf('aria-label="Başvuru"'));
  assert.match(cubuk.slice(0, 2600), /onClick=\{\(\) => onTrack\(listing\)\}/);
  assert.match(cubuk.slice(0, 2600), /Başvurdum/);
  /* Yalnız doğru bağlamda: `takipEtiketi` harici ilanda dolu. */
  assert.match(cubuk.slice(0, 2600), /\{yol\.takipEtiketi && \(/);
  /* iOS güvenli alanı ve alt menü: çubuk kendi dolgusunu taşıyor. */
  assert.match(DETAY, /pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\]/);
  /* Dokunma hedefi 48 px (min-h-12). */
  assert.match(cubuk.slice(0, 2600), /min-h-12/);
});
