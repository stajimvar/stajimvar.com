import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { telefonBaglantisi, telefonYaz } from '../src/lib/telefon.mjs';

/*
  SÜREÇ BİTTİĞİNDE EKRAN DEĞİŞİR

  Teklif kabul edildiği hâlde aday çekmecesi hâlâ aktif bir ATS işlem
  ekranı gibi duruyordu:

    - sayfada iki kez "Başvuranlar" başlığı
    - kabul edilmiş adayın kartında "Düşük uyum"
    - "Teklif kabul edildi" cümlesi birden fazla yerde
    - hâlâ çalışan bir durum seçici (üstelik öğrencinin kararını bozan)
    - iletişim, yetenek ve proje listelerinin ARKASINDA

  Kural: teklif kabul edildikten sonra ekran "adayı değerlendir" ekranı
  değil, "eşleşme tamamlandı — iletişime geç" ekranıdır.
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');
/*
  YORUM SATIRLARINI DÜŞÜRÜR — ARALIK EŞLEŞTİRMEDEN

  Önce blok yorumun açılış ve kapanışı arasındaki her şey siliniyordu.
  JSX'te yorumlar süslü parantez içinde duruyor ve aralık eşleştirme
  gerçek kodu da yutuyordu: başlık testi, kodda başlık dururken
  düşmüştü.

  Bunun yerine satır süzgeci — yorum olarak BAŞLAYAN satırlar atılıyor.
  Kod satırını asla yutmuyor.
*/
const YORUM_SATIRI = /^\s*(\*|\/\/|\{?\/\*|--)/;
const koddan = (metin) =>
  metin
    .split('\n')
    .filter((satir) => !YORUM_SATIRI.test(satir))
    .join('\n');

const cekmeceHam = oku('src/sirket/AdayCekmecesi.tsx');
const cekmece = cekmeceHam;
const cekmeceKod = koddan(cekmeceHam);
const kart = oku('src/sirket/AdayKarti.tsx');
const panel = koddan(oku('src/sirket/SirketPaneli.tsx'));
const izgara = koddan(oku('src/sirket/AdayIzgarasi.tsx'));
const goc = koddan(oku('supabase/migrations/20260914010000_ogrencinin_karari_nihai.sql'));
const sql = oku('scripts/sql/rls-regresyon-testleri.sql');

/* ------------------------------------------------- 1. tek başlık */

test('sayfada tek "Başvuranlar" başlığı var', () => {
  /*
    Masaüstünde başlık iki kez yazıyordu: panel kendi <h1>'ini
    çiziyordu, AdayIzgarasi de kendi başlığını. Kalan ızgaranınki —
    aday sayısını da taşıyor ve süzgeçler doğrudan altında.
  */
  /*
    Panelin başka sekmeleri (İlanlar, Şirket) kendi başlıklarını
    çiziyor; bakılan yer YALNIZCA Başvuranlar bileşeni.
  */
  const basvuranlarBileseni = panel.slice(panel.indexOf('const Basvuranlar'));
  assert.equal(
    (basvuranlarBileseni.match(/<h1/g) ?? []).length,
    0,
    'Başvuranlar bileşeni hâlâ kendi başlığını çiziyor',
  );
  assert.equal((izgara.match(/<h1/g) ?? []).length, 1, 'ızgarada başlık yok ya da birden fazla');
  assert.match(izgara, /Başvuranlar/);
});

/* -------------------------------------------- 2. uyum skoru gizli */

test('final durumlarda uyum skoru gösterilmiyor', () => {
  assert.match(kart, /const uyumGoster = !surecKapandi\(kart\.durum\)/);
  /* Ham etiket doğrudan çizilmiyor; hepsi bayrağın arkasında. */
  assert.ok(
    !/\{UYUM_ETIKETI\[kart\.band[^}]*\}\s*<\/span>\s*\)\}\s*<\/span>\s*<span[^>]*>\s*\{kart\.band/.test(kart),
    'uyum etiketi bayraktan bağımsız çiziliyor',
  );
});

test('süreç kapandı dört terminal durumu kapsıyor', async () => {
  const m = await import('../src/lib/basvuru-durumu.mjs');
  for (const d of ['offer_accepted', 'offer_declined', 'rejected', 'withdrawn']) {
    assert.equal(m.surecKapandi(d), true, `${d} terminal sayılmıyor`);
  }
  for (const d of ['submitted', 'under_review', 'technical_assessment', 'interview_scheduled', 'offer_extended']) {
    assert.equal(m.surecKapandi(d), false, `${d} terminal sayılıyor — akış bozulur`);
  }
});

test('uyum puanı yalnız gizleniyor, silinmiyor', () => {
  const veri = oku('src/lib/aday-kart.mjs');
  assert.match(veri, /puan:/, 'uyum puanı karttan kaldırılmış');
  assert.match(veri, /band: uyumBandi/, 'uyum bandı hesaplanmıyor');
});

/* ------------------------------------- 3. durum seçici final durumda */

test('öğrencinin kararı arayüzde okunur satır', () => {
  assert.match(cekmece, /const kararKilitli = ogrencininKarari\(kart\.durum\)/);
  assert.match(cekmece, /\{kararKilitli \? \(/);
});

test('öğrencinin kararı veritabanında da nihai', () => {
  /*
    Kuralı arayüzde kapatıp veritabanında açık bırakmak kuralı hiç
    koymamaktır. WITH CHECK yalnız yeni satırı görüyordu; eski değeri
    görmek için tetikleyici gerekiyor.
  */
  assert.match(goc, /create trigger applications_guard_ogrenci_karari/);
  assert.match(goc, /old\.status not in \('offer_accepted', 'offer_declined', 'withdrawn'\)/);
  assert.match(goc, /Öğrencinin verdiği karar değiştirilemez/);
});

test('rejected bilerek geri alınabilir kalıyor', async () => {
  /* Şirketin KENDİ kararı; yanlışlıkla kapatılan adayı yeniden açmak meşru. */
  const m = await import('../src/lib/basvuru-durumu.mjs');
  assert.equal(m.ogrencininKarari('rejected'), false);
  assert.ok(!/'rejected'/.test(goc.split('old.status not in')[1]?.split(';')[0] ?? ''));
});

test('terminal durumda ilerletme ve olumsuz düğmeleri yok', () => {
  assert.match(cekmece, /\{terminal \? null : sonraki === 'interview_scheduled' \?/);
  assert.match(cekmece, /\{!terminal && \(\s*olumsuzSoruldu/);
});

/* --------------------------------------- 4. bilgi sırası ve tekrar */

test('final blok gövdenin başında', () => {
  const govdeBas = cekmece.indexOf('min-h-0 flex-1 space-y-5 overflow-y-auto');
  const finalBlok = cekmece.indexOf('{terminal && (');
  const yetenekler = cekmece.indexOf('<Baslik>Yetenekler</Baslik>');
  assert.ok(finalBlok > govdeBas, 'final blok gövdenin dışında');
  assert.ok(finalBlok < yetenekler, 'iletişim yetenek listesinin arkasında kalıyor');
});

test('final durum cümlesi ekranda bir kez', () => {
  /* Alt eylem alanındaki cümle terminal durumda çizilmiyor. */
  assert.match(cekmece, /\{!terminal && \(gorusmeAsamasi \|\| teklifBekliyor\(kart\.durum\)\) && \(/);
  /* Teklif özeti de tek yerde: altta yalnız BEKLEYEN teklif. */
  assert.match(cekmece, /\{!terminal &&\s+teklifBekliyor\(kart\.durum\) &&/);
});

/* ------------------------------------------------ 5. iletişim kartı */

test('iletişim kartı e-posta ve telefon aksiyonu taşıyor', () => {
  assert.match(cekmece, /href=\{`mailto:\$\{iletisim\.eposta\}`\}/);
  assert.match(cekmece, /href=\{`tel:\$\{telefonBaglantisi\(iletisim\.telefon\)\}`\}/);
  /* Telefon yoksa düğme hiç çizilmiyor. */
  assert.match(cekmece, /\{telefonBaglantisi\(iletisim\.telefon\) && \(/);
});

test('iletişim aksiyonları anlamlı etiket taşıyor', () => {
  assert.match(cekmece, /aria-label=\{`\$\{iletisim\.ad \?\? 'Adaya'\} e-posta gönder`\}/);
  assert.match(cekmece, /aria-label=\{`\$\{iletisim\.ad \?\? 'Adayı'\} ara/);
});

test('iletişim kapısına dokunulmadı', () => {
  /* Gösterim koşulu hâlâ tek: teklif kabul edildi. Kural sunucuda. */
  assert.match(cekmece, /\{iletisimAcik\(kart\.durum\) && \(/);
  assert.match(cekmece, /!iletisimAcik\(kart\.durum\) \|\| !onIletisim/);
});

/* ---------------------------------------------------- 6. telefon */

test('Türkiye numarası okunur yazılıyor', () => {
  assert.equal(telefonYaz('+905323311338'), '+90 532 331 13 38');
  assert.equal(telefonYaz('05323311338'), '+90 532 331 13 38');
  assert.equal(telefonYaz('5323311338'), '+90 532 331 13 38');
  assert.equal(telefonYaz(' 0532 331 13 38'), '+90 532 331 13 38');
});

test('tanınmayan biçim TR kalıbına zorlanmıyor', () => {
  /* Yabancı numarayı Türkiye kalıbına sokmak yanlış numara göstermek olurdu. */
  assert.equal(telefonYaz('+1 415 555 2671'), '+1 415 555 2671');
  assert.equal(telefonYaz('+49 30 123456'), '+49 30 123456');
  assert.equal(telefonYaz(''), '');
  assert.equal(telefonYaz(null), '');
});

test('arama bağlantısı ham rakamları kullanıyor', () => {
  assert.equal(telefonBaglantisi('+90 532 331 13 38'), '+905323311338');
  assert.equal(telefonBaglantisi('0532 331 13 38'), '05323311338');
  assert.equal(telefonBaglantisi(''), '');
  assert.equal(telefonBaglantisi('abc'), '');
});

/* ----------------------------------------------- 7. teklif özeti */

test('teklif özeti eksik alanı gizliyor', () => {
  assert.match(cekmece, /\.filter\(\(satir\) => satir\.deger\)/);
  assert.ok(!cekmeceKod.includes('Belirtilmedi'), 'boş alan "Belirtilmedi" ile dolduruluyor');
});

test('ücret teklifte yoksa ilandan geliyor', () => {
  assert.match(cekmece, /kart\.teklifUcreti \|\| kart\.ilanUcreti/);
  assert.match(oku('src/lib/sirket-veri.ts'), /work_type, duration, stipend_text/);
});

test('kabul edilen teklif başlığı duruma göre', () => {
  assert.match(cekmece, /'Kabul edilen teklif' : 'Gönderilen teklif'/);
});

test('teklif notu görüşme notuyla karışmıyor', () => {
  /* İkisi ayrı kolon ve ayrı bölümde çiziliyor. */
  assert.match(cekmece, /Teklif notu/);
  assert.match(cekmece, /kart\.gorusmeNotu/);
  assert.ok(
    !/teklifNotu[\s\S]{0,80}gorusmeNotu/.test(cekmece),
    'teklif notu ile görüşme notu aynı blokta',
  );
});

/* ------------------------------------------------- 8. öğrenciye not */

test('not öğrenciye görünür olarak adlandırılıyor', () => {
  /*
    `company_feedback` adayın kendi başvuru sayfasında okunuyor. "İç
    not" demek, dahili sanılan bir metnin adaya gitmesine yol açardı.
    Şirket içine özel bir not alanı üründe YOK.
  */
  assert.match(cekmece, /Öğrenciye not/);
  assert.ok(!cekmeceKod.includes('İç not'), 'olmayan şirket içi not alanı uyduruluyor');
  assert.match(oku('src/components/ApplicationsTrackerView.tsx'), /Şirketin notu/);
});

/* --------------------------------------------- 9. RLS regresyonu */

test('regresyon nihai kararı sınıyor', () => {
  for (const ad of [
    'A, kabul edilmis teklifi bozamaz',
    'A, reddedilmis teklifi bozamaz',
    'A, geri cekilmis basvuruyu yeniden acamaz',
    'A, kendi olumsuz kararini geri alabilir',
  ]) {
    assert.ok(sql.includes(ad), `RLS regresyonunda eksik: ${ad}`);
  }
});
