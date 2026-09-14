import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

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
const TOKEN = oku('src/ui/tokens.ts');
const MAPPER = oku('src/lib/queries/mappers.ts');
const TIPLER = oku('src/types.ts');

test('ücret rozeti üç değeri ayırıyor', () => {
  /*
    Önce `isPaid &&` yazıyordu: sütun `not null default false` olduğu
    için false hem "ücretsiz" hem "bilinmiyor" demekti. Göç
    20261001010000'dan beri ayrım veride var.
  */
  assert.match(KART, /listing\.stipend\.isPaid === true && \(/);
  assert.match(KART, /listing\.stipend\.isPaid === false && \(/);
  assert.match(KART, /<span>Ücretsiz<\/span>/);
  /* Doğruluk testi: üçlü `&&` geri gelmesin — null'u false gibi
     gösterirdi. */
  const kod = yorumsuz(KART);
  assert.ok(
    !/\{listing\.stipend\.isPaid && \(/.test(kod),
    'null ücret rozet üretmemeli'
  );
});

test('sigorta sağlayanı yalnız biliniyorsa görünüyor', () => {
  assert.match(KART, /\{listing\.insuranceProvider && \(/);
  assert.match(KART, /SIGORTA_ETIKET\[listing\.insuranceProvider\]/);
  /* "yok" gösteriliyor (kaynağın açık beyanı), `undefined` gösterilmiyor. */
  assert.match(KART, /yok: 'Sigorta yok'/);
  /* Tanınmayan değer `undefined`a düşüyor: uydurma etiket yok. */
  assert.match(MAPPER, /SIGORTA_SAGLAYICILARI\.includes\(/);
  assert.match(TIPLER, /insuranceProvider\?: 'isveren' \| 'universite' \| 'aday' \| 'yok';/);
});

test('gönüllü staj rozeti zorunluyla çakışmıyor', () => {
  assert.match(
    KART,
    /!listing\.mandatoryStajAccepted && listing\.voluntaryStajAccepted && \(/
  );
});

test('doğrulama bilgisi source_verified_at üzerinden', () => {
  /*
    İki farklı "son kontrol" var: `last_seen_at` toplama hattının HAM
    KAYDI yeniden gördüğü an, `source_verified_at` ise başvuru
    sayfasının çalıştığının doğrulandığı an. Kart ikincisini
    gösteriyor — mapper `lastSeenAt`i o kolondan besliyor.
  */
  assert.match(MAPPER, /lastSeenAt: row\.source_verified_at \?\? undefined/);
  assert.match(KART, /sonKontrolMetni\(listing\.lastSeenAt\)/);
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

test('rozetler sarıyor, metin kırpılmıyor', () => {
  /*
    İlk hâlde dilimi `match.isScorable`dan başlatmıştım ve içine
    şirket sektörü satırı giriyordu — o satır `truncate` kullanıyor ve
    orada DOĞRU. Kontrol rozetlerin kendisine daraltıldı.
  */
  const rozetler = [
    'Zorunlu Staj (SGK)',
    'Gönüllü staj',
    'Ücretsiz',
    'SIGORTA_ETIKET[listing.insuranceProvider]',
  ];
  for (const r of rozetler) {
    const i = KART.indexOf(r);
    assert.ok(i > 0, `rozet bulunamadı: ${r}`);
    /* Rozetin kendi <span>'ında kırpma yok. */
    const span = KART.slice(KART.lastIndexOf('<span', i), i);
    assert.ok(!/truncate|line-clamp/.test(span), `rozet kırpılmamalı: ${r}`);
  }
  /*
    Şerit sarıyor: rozetler tek satıra zorlanmıyor. Izgara hücresi
    olduğu için sınıf `flex min-w-0 flex-wrap items-center` sırasında.
  */
  assert.match(KART, /flex min-w-0 flex-wrap items-center gap-1\.5 text-xs/);
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
