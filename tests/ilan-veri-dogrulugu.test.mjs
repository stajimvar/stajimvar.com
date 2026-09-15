import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * İLAN VERİSİNİN DOĞRULUĞU
 *
 * Üç iddia düzeltildi; üçü de "bilmiyoruz"u "biliyoruz" gibi
 * gösteriyordu. Buradaki testler kolay bozulan yerleri bağlıyor.
 */

const oku = (y) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');

const GOC = oku('supabase/migrations/20261001010000_ilan_veri_dogrulugu.sql');
const PROMOTE = oku('automation/promote.py');
const KARIYER = oku('automation/kariyer_html_kosu.py');
const KONTROL = oku('scripts/ilan-baglanti-kontrol.mjs');
const DUZELT = oku('scripts/ucret-bilgisi-duzelt.mjs');
const DETAY = oku('src/components/ListingPage.tsx');
const KART = oku('src/components/InternshipCard.tsx');
const TIPLER = oku('src/types.ts');

/* --------------------------------------------------------------- ÜCRET */

test('is_paid varsayılanı kalktı: bilinmeyen artık false olmuyor', () => {
  assert.match(GOC, /alter column is_paid drop not null/);
  assert.match(GOC, /alter column is_paid drop default/);
});

test('"burs" kalıbı kelime sınırında — Bursa ücretli sayılmıyor', () => {
  /*
    ÖLÇÜLDÜ (14 Eylül 2026, üretim): ücretli sanılan iki kaydın ikisi de
    şehir listesiydi — "İstanbul, Ankara, Antalya, Adana, Bursa ve İzmir
    ofisleri". Çıplak `burs` kalıbı Bursa'daki her ilanı ücretli
    işaretleyebilirdi.

    Kalıp DOSYADAN okunup gerçekten çalıştırılıyor: bir ara heredoc
    `\b`yi gerçek backspace baytına (0x08) çevirmişti ve kalıp sessizce
    ölü kalmıştı — grep'te doğru görünüyordu.
  */
  const satir = PROMOTE.match(/^\s*r"ucretli staj.*$/m);
  assert.ok(satir, 'ücretli kalıbı bulunamadı');
  assert.ok(!satir[0].includes(''), 'kalıpta gerçek backspace baytı olmamalı');

  const icerik = satir[0].replace(/^\s*r"/, '').replace(/"\s*$/, '');
  const kalip = new RegExp(icerik.replace(/\\\\b/g, '\\b'));
  assert.equal(kalip.test('adana, bursa ve izmir ofisleri'), false, 'Bursa eşleşmemeli');
  assert.equal(kalip.test('stajyerlerimize burs verilir'), true, 'burs eşleşmeli');
  assert.equal(kalip.test('burslu staj imkani'), true);
  assert.equal(kalip.test('bursiyer ogrenciler'), true);
});

test('detect_paid üç değerli ve tip imzası bunu söylüyor', () => {
  assert.match(PROMOTE, /def detect_paid\(description: str \| None\) -> bool \| None:/);
  /* Kanıt yoksa None: `return bool(...)` kalıbı geri gelmesin. */
  assert.ok(
    !/return bool\(re\.search\(r"ucretli staj/.test(PROMOTE),
    'kanıt yokken False dönen eski hâl geri gelmemeli'
  );
  const govde = PROMOTE.slice(PROMOTE.indexOf('def detect_paid'));
  const son = govde.indexOf('\n\n\n');
  assert.match(govde.slice(0, son > 0 ? son : undefined), /return None/);
});

test('kariyer adaptörü artık sabit False yazmıyor', () => {
  /*
    Kariyer sayfası adaptörü `"is_paid": False` yazıyordu: ücret bilgisi
    hiç BAKILMADAN "ücretsiz" kaydediliyordu.
  */
  assert.ok(!/"is_paid": False/.test(KARIYER), 'sabit False geri gelmemeli');
  assert.match(KARIYER, /"is_paid": detect_paid\(/);
  /* İçe alma satırı büyüdü: aynı dosyadan üç dedektör geliyor. */
  assert.match(KARIYER, /from automation\.promote import .*detect_paid/);
  /* Staj türü kabulü de sabit değer değil, dedektörden. */
  assert.match(KARIYER, /"mandatory_staj_accepted": detect_mandatory_staj\(/);
  assert.match(KARIYER, /"voluntary_staj_accepted": detect_voluntary_staj\(/);
});

test('düzeltme betiği körlemesine null yapmıyor', () => {
  /* true değere dokunulmuyor: varsayılan false olduğu için true ancak
     bilerek yazılmış olabilir. */
  assert.match(DUZELT, /if \(ilan\.is_paid === true\) continue;/);
  /* Açık ücretsiz kanıtı false olarak KORUNUYOR. */
  assert.match(DUZELT, /if \(UCRETSIZ\.test\(metin\)\) return \{ deger: false/);
  /* Tutar yazılmışsa ücret var; ama boş tutar tek başına hiçbir şeyi
     geçersiz kılmıyor — metin kanıtı ayrıca aranıyor. */
  assert.match(DUZELT, /stipend_text \|\| ''\)\.trim\(\)\) return \{ deger: true/);
  assert.match(DUZELT, /\\bburs\\b/, 'düzeltme betiği de kelime sınırı kullanmalı');
});

test('null hiçbir ekranda "Ücretsiz" görünmüyor', () => {
  /* Detay sayfası üç değeri AYRI ele alıyor: false açık beyan, null kutu
     çizilmiyor. Kesin karşılaştırma şart — `isPaid ? …` null'u false
     gibi gösterirdi. */
  /*
    KARAR ORTAK DOSYAYA TAŞINDI

    Ücret metni artık `lib/staj-turu`daki `ucretMetniHesapla` ile
    hesaplanıyor ve kart ile detay AYNI fonksiyonu çağırıyor. Bileşenin
    içindeki üçlü operatörü aramak, kararı tek yere topladığımız anda
    kırılan bir iddiaydı.
  */
  assert.match(DETAY, /const ucretMetni = ucretMetniHesapla\(listing\?\.stipend\)/);
  const STAJ_TURU = oku('src/lib/staj-turu.mjs');
  assert.match(STAJ_TURU, /if \(odenir === true\) return stipend\?\.amountText\?\.trim\(\) \|\| 'Ücretli'/);
  assert.match(STAJ_TURU, /if \(odenir === false\) return 'Ücretsiz'/);
  assert.match(STAJ_TURU, /return null;/);
  /*
    KART DA ÜÇ DEĞERİ AYIRIYOR (davranış bilerek genişledi)

    Önce yalnız pozitif bilgi basılıyordu çünkü false hem "ücretsiz"
    hem "bilinmiyor" demekti. Ayrım veride olduğuna göre kart da
    söyleyebilir: false → "Ücretsiz". Değişmeyen kural, NULL'un rozet
    üretmemesi — üçlü `&&` null'u false gibi gösterirdi.
  */
  assert.match(KART, /listing\.stipend\.isPaid === true && \(/);
  assert.match(KART, /listing\.stipend\.isPaid === false && \(/);
  assert.ok(
    !/\{listing\.stipend\.isPaid && \(/.test(KART),
    'null ücret rozet üretmemeli'
  );
});

test('ürün tipi üç değeri taşıyor', () => {
  assert.match(TIPLER, /isPaid: boolean \| null;/);
});

/* ------------------------------------------------------- KAYNAK KONTROLÜ */

test('HTTP 200 tek başına açık kanıtı sayılmıyor', () => {
  /*
    ÖLÇÜLDÜ (14 Eylül 2026, kuru koşu, 172 ilan): 46 ilan 200 dönüyor ama
    sayfada ilanın açık olduğuna dair kanıt yok. Eski kural hepsini
    "açık" sayıp `source_verified_at` damgası atıyordu — envanterin
    %27'si hakkında doğrulanmamış bir iddia.
  */
  assert.match(KONTROL, /function acikKaniti\(govde, baslik, adres\)/);
  const dal = KONTROL.slice(KONTROL.indexOf('} else if (yanit.ok) {'));
  const kanitSatiri = dal.indexOf('const kanit = acikKaniti(');
  const acikYazma = dal.indexOf("source_status: 'acik'");
  assert.ok(kanitSatiri > 0 && kanitSatiri < acikYazma, "'acik' yazımı kanıttan sonra olmalı");
});

test('belirsiz dördüncü durum: verified korunuyor, durum değişmiyor', () => {
  assert.match(GOC, /source_status in \('acik', 'kapali', 'erisilemedi', 'belirsiz'\)/);
  const dal = KONTROL.slice(KONTROL.indexOf("etiket = 'BELİRSİZ"));
  const son = dal.indexOf('} else {');
  const govde = dal.slice(0, son > 0 ? son : 400);
  assert.match(govde, /source_status: 'belirsiz'/);
  assert.ok(!/source_verified_at/.test(govde), 'belirsizde verified yazılmamalı');
  assert.ok(!/status: 'published'/.test(govde), 'belirsizde ilan yayına alınmamalı');
  assert.ok(!/status: 'closed'/.test(govde), 'belirsizde ilan kapatılmamalı');
});

test('kapanmış ilan yalnız KANITLA yayına geri alınıyor', () => {
  /* Eskiden çıplak 200 yeterliydi: kariyer sayfası cevap veren her
     kapanmış ilan yayına dönüyordu. */
  const i = KONTROL.indexOf("if (ilan.status === 'closed') guncelleme.status = 'published';");
  assert.ok(i > 0);
  const onceki = KONTROL.slice(KONTROL.indexOf('} else if (yanit.ok) {'), i);
  assert.match(onceki, /if \(kanit\) \{/, 'geri alma kanıt dalının içinde olmalı');
});

test('geçici erişim hataları ilanı kapatmıyor', () => {
  /* 403/429/5xx ve zaman aşımı: ikisi de erisilemedi, durum değişmiyor. */
  for (const parca of ['sayac.engel403++', 'sayac.oran429++', 'sayac.sunucu5xx++', 'sayac.zamanAsimi++']) {
    assert.ok(KONTROL.includes(parca), `${parca} sayılmalı`);
  }
  const gecici = KONTROL.slice(KONTROL.indexOf('erisilemedi++'));
  const govde = gecici.slice(0, 1200);
  assert.ok(!/status: 'closed'/.test(govde), 'geçici hata ilanı kapatmamalı');
  assert.ok(!/source_verified_at/.test(govde), 'geçici hatada verified yazılmamalı');
});

test('kapanış nedeni kaydediliyor', () => {
  assert.match(KONTROL, /deactivation_reason: `başvuru bağlantısı kapandı — \$\{sebep\}`/);
});

/* --------------------------------------------------------- ŞEMA EKSİKLERİ */

test('yeni alanlar mevcut eşdeğerlerini bozmuyor', () => {
  assert.match(GOC, /add column if not exists location_raw text/);
  assert.match(GOC, /add column if not exists insurance_provider text/);
  assert.match(GOC, /add column if not exists department_tags text\[\]/);
  /* `city`, `department` ve `insurance_note` düşürülmüyor ya da
     yeniden adlandırılmıyor: onları okuyan ekranlar çalışmaya devam
     etmeli. */
  for (const eski of ['city', 'department', 'insurance_note']) {
    assert.ok(
      !new RegExp(`drop column[^;]*\\b${eski}\\b`, 'i').test(GOC),
      `${eski} düşürülmemeli`
    );
    assert.ok(
      !new RegExp(`rename column ${eski}`, 'i').test(GOC),
      `${eski} yeniden adlandırılmamalı`
    );
  }
});

test('bilinmeyen sigorta "sigortasız" anlamına gelmiyor', () => {
  assert.match(GOC, /insurance_provider is null\s*\n?\s*or insurance_provider in \('isveren', 'universite', 'aday', 'yok'\)/);
  /* "yok" ayrı bir değer: null ile aynı şey değil. */
  assert.match(GOC, /null = kaynak söylemiyor — "yok" ile AYNI ŞEY DEĞİL/);
});

test('geri doldurma yalnız türetileni dolduruyor', () => {
  /* department_tags, department'ın kendisinden türetiliyor — yeni bilgi
     değil. location_raw ve insurance_provider geri doldurulmuyor:
     kaynakta olmayan bilgi üretilmiyor. */
  assert.match(GOC, /set department_tags = array\[department\]/);
  assert.ok(!/update public\.listings\s*\n\s*set location_raw/.test(GOC));
  assert.ok(!/update public\.listings\s*\n\s*set insurance_provider/.test(GOC));
});

/* ------------------------------------------------------ TÜRKİYE KAYNAKLARI */

test('kurumsal_html adaptörü kayıtlı ve genel kariyer sayfasını ilan saymıyor', () => {
  const KAZIYICI = oku('automation/scraper.py');
  assert.match(KAZIYICI, /"kurumsal_html": kurumsal_html,/);

  const govde = KAZIYICI.slice(KAZIYICI.indexOf('def kurumsal_html('));
  const son = govde.indexOf('\ndef greenhouse(');
  const fn = govde.slice(0, son > 0 ? son : undefined);

  /*
    İKİ KAPI

    1. Adres kalıbı: yalnız TEK İLANA giden adres alınıyor. Liste,
       kategori ve "tüm fırsatlar" sayfaları kalıbı geçmiyor.
    2. `erken_kariyer_mi`: staj/yeni mezun olmayan pozisyon atılıyor.
       Türkiye profilinde bu doğrudan `is_early_career` (ülke-duyarlı
       hat, 15 Eylül 2026; davranışı automation/tests/test_ulke_duyarli_hat.py
       sabitliyor).

    Ölçüldü (14 Eylül 2026, canlı): Garanti BBVA listesinde 100 tekil
    ilan adresi var ve hiçbiri staj değil ("Yönetmen", "Lead",
    "Yönetici"). Adaptör 0 ilan döndürüyor — bu doğru cevap.
  */
  assert.match(fn, /if not kalip\.search\(tam\)/);
  assert.match(fn, /if not erken_kariyer_mi\(config, baslik, aciklama\)/);
});

test('erişim engeli aşılmıyor, kaynak bırakılıyor', () => {
  const KAZIYICI = oku('automation/scraper.py');
  const fn = KAZIYICI.slice(KAZIYICI.indexOf('def kurumsal_html('));
  /* 401/403/429 görünce dönülüyor: başka yol denenmiyor, tekrar
     döngüsüne girilmiyor. */
  const dalSayisi = (fn.match(/status_code in \{401, 403, 429\}/g) || []).length;
  assert.equal(dalSayisi, 2, 'liste ve ilan sayfası için ayrı ayrı kontrol edilmeli');
  /* Üçüncü tarafın sunucusuna saygı: sıralı istek, bekleme, üst sınır. */
  assert.match(fn, /time\.sleep\(float\(config\.get\("crawl_delay_seconds"\)/);
  assert.match(fn, /adresler\[:ust_sinir\]/);
});

test('yeni kaynak mevcut global kaynakları bozmuyor', () => {
  const kaynaklar = JSON.parse(oku('automation/sources.json'));
  const liste = Array.isArray(kaynaklar) ? kaynaklar : Object.values(kaynaklar)[0];
  const garanti = liste.find((k) => k.id === 'garanti-bbva-kurumsal');
  assert.ok(garanti, 'Garanti BBVA kaynağı tanımlı olmalı');
  assert.equal(garanti.type, 'kurumsal_html');
  /* Kurumun KENDİ sitesi: üçüncü taraf iş panosu değil. */
  assert.match(garanti.list_url, /^https:\/\/kariyer\.garantibbva\.com\.tr\//);
  /* Mevcut adaptörlü kaynaklar yerinde. */
  const tipler = new Set(liste.map((k) => k.type));
  for (const t of ['lever', 'greenhouse', 'workable', 'workday', 'ashby', 'official_jsonld']) {
    assert.ok(tipler.has(t), `${t} kaynakları korunmalı`);
  }
  /* Mükerrer kaynak yok. */
  const idler = liste.map((k) => k.id);
  assert.equal(new Set(idler).size, idler.length, 'kaynak id\'leri tekil olmalı');
});

test('yoklama betiği yazmıyor ve engelde bırakıyor', () => {
  const YOKLA = oku('scripts/tr-kaynak-yokla.mjs');
  /* Ölçüm betiği: veritabanına hiç dokunmuyor. */
  assert.ok(!/supabase|createClient|rest\/v1/i.test(YOKLA), 'yoklama betiği veri yazmamalı');
  assert.match(YOKLA, /ENGEL \$\{kayit\.engel\} — bırakıldı/);
  assert.match(YOKLA, /captcha\|are you a robot/);
  /* Kuruma en fazla bir istek, arada bekleme. */
  assert.match(YOKLA, /await new Promise\(\(r\) => setTimeout\(r, BEKLEME_MS\)\)/);
});

/* ------------------------------------------------- VERİ DOĞRULUĞU KAPANIŞI */

test('"maas" kalıbı kelime sınırında — Maastricht ücretli sayılmıyor', () => {
  /*
    `burs`/Bursa ile AYNI SINIF kusur, ölçüldü (14 Eylül 2026): Mondi
    ilanının kaynak sayfasındaki tek "ücretli" eşleşmesi konum
    açılırındaki "Maastricht (2)" idi. Bu kayıt bu yüzden true
    görünüyordu.
  */
  const satir = PROMOTE.match(/^\s*r"ucretli staj.*$/m);
  const kalip = new RegExp(satir[0].replace(/^\s*r"/, '').replace(/"\s*$/, ''));
  assert.equal(kalip.test('maastricht (2) madrid (2) milan (1)'), false, 'Maastricht eşleşmemeli');
  assert.equal(kalip.test('aylik maas odenir'), true, 'gerçek maaş eşleşmeli');
  /* Düzeltme betiği aynı kuralı kullanmalı: iki yerde iki kural,
     içe aktarımın yazdığıyla düzeltmenin beklediğinin ayrışması olurdu. */
  assert.match(DUZELT, /\bmaas\b/);
});

test('açık kanıtı ana başlıkta aranıyor, sayfanın her yerinde değil', () => {
  /*
    ÖLÇÜLDÜ (14 Eylül 2026, kuru koşu): kural daraltılınca acik 110→107,
    belirsiz 46→49. Üç ilan, başlığının menüde/önerilen ilanlar
    şeridinde/genel listede geçmesi sayesinde "doğrulandı" damgası
    alıyordu.
  */
  assert.match(KONTROL, /function anaBaslik\(govde\)/);
  assert.match(KONTROL, /<h1\[\^>\]\*>/, 'ana başlık h1\'den okunmalı');
  const fn = KONTROL.slice(KONTROL.indexOf('function acikKaniti('));
  const son = fn.indexOf('\n/** Sayfanın kendi JobPosting');
  const govde = fn.slice(0, son > 0 ? son : 2500);
  /* Başlık karşılaştırması h1 üzerinde; tüm görünür metin üzerinde DEĞİL. */
  assert.match(govde, /const h1 = anaBaslik\(govde\)\.toLowerCase\(\)/);
  assert.ok(
    !/gorunurMetin\(govde\)\.toLowerCase\(\)/.test(govde),
    'başlık kanıtı sayfanın tamamında aranmamalı'
  );
  /* Üçüncü kanıt: canonical ilan kimliğini taşıyor. */
  assert.match(govde, /kanonik\.includes\(kimlik\)/);
  /* Kanıt yoksa null → çağıran taraf 'belirsiz' yazıyor. */
  assert.match(govde, /if \(!h1\) return null;/);
});

test('yoklanan kurum sayısı koddan doğrulanabiliyor', () => {
  /*
    Rapor 16 demişti, liste 17 kurumdu: ikinci turda OYAK listeden
    düşmüş ve sayı koddan doğrulanamaz hâle gelmişti.
  */
  const YOKLA = oku('scripts/tr-kaynak-yokla.mjs');
  const blok = YOKLA.slice(YOKLA.indexOf('const KURUMLAR = ['), YOKLA.indexOf('];', YOKLA.indexOf('const KURUMLAR = [')));
  const adlar = [...blok.matchAll(/ad: '([^']+)'/g)].map((m) => m[1]);
  assert.equal(adlar.length, 17, 'denenen kurum sayısı 17');
  assert.equal(new Set(adlar).size, 17, 'kurum adları tekil');
  /* Betik sayıyı kendisi raporluyor: rapor ile kod bir daha ayrışmasın. */
  assert.match(YOKLA, /yoklanan kurum: \$\{sonuclar\.length\}/);
});

test('"42 şirket kaynağı" yalnız yapılandırılmış ve aktif kaynakları sayıyor', () => {
  const kaynaklar = JSON.parse(oku('automation/sources.json'));
  const liste = Array.isArray(kaynaklar) ? kaynaklar : Object.values(kaynaklar)[0];
  const aktif = liste.filter((k) => k.enabled !== false);
  /* Her kaynağın gerçekten bir uç noktası var: yoklanıp eklenmemiş
     kurumlar bu sayıya girmiyor. */
  for (const k of aktif) {
    assert.ok(
      k.list_url || k.urls || k.url || k.careers_url,
      `${k.id} için yapılandırılmış adres olmalı`
    );
  }
  const { KAYNAK_TOPLAM } = { KAYNAK_TOPLAM: Number(oku('src/data/kaynak-sistemleri.ts').match(/KAYNAK_TOPLAM = (\d+)/)[1]) };
  assert.equal(KAYNAK_TOPLAM, aktif.length, 'gösterilen sayı aktif kaynak sayısı olmalı');
  /* Yoklanıp EKLENMEYEN kurumlar sources.json'da yok. */
  const adlar = liste.map((k) => `${k.name} ${k.company_name ?? ''}`).join(' ').toLowerCase();
  for (const k of ['aselsan', 'tusaş', 'roketsan', 'havelsan', 'turkcell', 'türk telekom', 'koç holding']) {
    assert.ok(!adlar.includes(k), `${k} eklenmediği hâlde sayıya girmemeli`);
  }
});
