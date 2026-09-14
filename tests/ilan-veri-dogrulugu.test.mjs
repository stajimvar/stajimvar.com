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
  assert.match(KARIYER, /from automation\.promote import detect_paid/);
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
  assert.match(DETAY, /listing\?\.stipend\?\.isPaid === true/);
  assert.match(DETAY, /listing\?\.stipend\?\.isPaid === false\n\s*\? 'Ücretsiz'/);
  /* Kart yalnız pozitif bilgiyi basıyor: null ve false rozet üretmiyor. */
  assert.match(KART, /\{listing\.stipend\.isPaid && \(/);
  assert.ok(!/Ücretsiz/.test(KART), 'kartta ücretsiz rozeti yok');
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
  assert.match(KONTROL, /function acikKaniti\(govde, baslik\)/);
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
