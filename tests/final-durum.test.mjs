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
const goc = koddan(oku('supabase/migrations/20260914020000_durum_gecisi_tek_yerde.sql'));
const sql = oku('scripts/sql/rls-regresyon-testleri.sql');

/* ------------------------------------------------- 1. tek başlık */

test('sayfada tek "Başvurular" başlığı var', () => {
  /*
    Masaüstünde başlık iki kez yazıyordu: panel kendi <h1>'ini
    çiziyordu, AdayIzgarasi de kendi başlığını.

    18 Eylül 2026: Başvuranlar kabuğun kendi sekmesi oldu
    (/sirket/basvuranlar tam sayfa), sayfanın `h1`'i yine panelin
    Başvuranlar bileşeninde ve TEK. Izgara o sayfada `basliksiz`
    çiziliyor — kendi "Başvuranlar" başlığını atlıyor; aynı sözcük
    alt alta iki kez okunmuyor.

    27 Eylül 2026: başlık EKRANDA görünmüyor (`sr-only`) — alt gezinme
    zaten "Başvurular" diyor. Kural değişmedi: h1 hâlâ TEK ve hâlâ var.
    Silinseydi sayfa başlıksız kalırdı; gezinme etiketi başlık değildir.
  */
  const basvuranlarBileseni = panel.slice(panel.indexOf('const Basvuranlar'));
  assert.equal(
    (basvuranlarBileseni.match(/<h1/g) ?? []).length,
    1,
    'Başvuranlar bileşeni tek h1 çizmeli (sayfanın başlığı)',
  );
  assert.match(basvuranlarBileseni, /<AdayIzgarasi\s+basliksiz/, 'ızgara başlıksız çağrılmalı');
  /*
    Izgaranın kendi başlığı `h2` ve yalnız `basliksiz` değilken: bir
    sayfanın içinde bölüm başlığı. `h1` kalsaydı aynı sayfada iki `h1`
    olurdu.
  */
  assert.equal((izgara.match(/<h1/g) ?? []).length, 0, 'ızgara hâlâ h1 çiziyor');
  /*
    26 Eylül 2026: boş durum ("ilan var, başvuru yok") kendi `h2`sini
    taşıyor. İki dal birbirini dışlıyor (`if (kartlar.length === 0)
    return`), yani ekranda yine tek bölüm başlığı var: boş dalda bir,
    dolu dalda bir.
  */
  const bosDal = izgara.slice(izgara.indexOf('if (kartlar.length === 0) {'), izgara.indexOf('İlanlarıma git'));
  assert.equal((bosDal.match(/<h2/g) ?? []).length, 1, 'boş durumda tek başlık');
  assert.equal((izgara.match(/<h2/g) ?? []).length, 2, 'ızgarada başlık yok ya da dolu dalda birden fazla');
  assert.match(izgara, /basliksiz \?/);
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
  assert.match(goc, /old\.status = any \(v_ogrencinin_karari\)/);
  assert.match(goc, /Öğrencinin verdiği karar değiştirilemez/);
});

test('rejected bilerek geri alınabilir kalıyor', async () => {
  /* Şirketin KENDİ kararı; yanlışlıkla kapatılan adayı yeniden açmak meşru. */
  const m = await import('../src/lib/basvuru-durumu.mjs');
  assert.equal(m.ogrencininKarari('rejected'), false);
  assert.ok(!/rejected/.test(goc.split('v_ogrencinin_karari constant')[1]?.split(';')[0] ?? ''));
});

test('terminal durumda ilerletme ve olumsuz düğmeleri yok', () => {
  /* Sade akışta ilerletme düğmesi tek; terminal durumda çizilmiyor. */
  assert.match(cekmece, /\{!terminal && sonraki && \(/);
  assert.match(cekmece, /\{!terminal && \(\s*olumsuzSoruldu/);
});

/* --------------------------------------- 4. bilgi sırası ve tekrar */

test('final blok gövdenin başında', () => {
  const govdeBas = cekmece.indexOf('min-h-0 flex-1 space-y-5 overflow-y-auto');
  const finalBlok = cekmece.indexOf('{terminal && (');
  /*
    4 Ekim 2026: başlık "Başvurudan sonra değişti" işaretini taşıyabiliyor
    (`<Baslik degisti={…}>`); arama prop'lu biçimi de buluyor. Üç konum
    da VAR olmalı — bulunamayan bir konum (-1) sırayı yanlışlıkla
    doğrulamasın.
  */
  const yetenekler = cekmece.search(/<Baslik(?:\s[^>]*)?>Yetenekler<\/Baslik>/);
  assert.ok(govdeBas > -1 && finalBlok > -1 && yetenekler > -1, 'gövde, final blok ya da yetenek başlığı bulunamadı');
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

test('şirket iletişim kapısı ONAYA bağlı, teklife değil', () => {
  /*
    KURAL DEĞİŞTİ (sade akış, 20261201010000): şirket tarafında teklif
    kabulü ARTIK SORULMUYOR. Sorulan şey öğrencinin onayının bu akışı
    kapsayıp kapsamadığı. Asıl kapı sunucuda (`basvuru_iletisimi`);
    buradaki koşul gösterim için.

    Test gevşemiyor: eskiden "teklif kabul edildi mi" sabitleniyordu,
    şimdi "onay kapsıyor mu" sabitleniyor — ikisi de tek ve açık bir
    koşul.
  */
  assert.match(cekmece, /adayIletisimiAcik\(kart\)/);
  assert.doesNotMatch(
    cekmece,
    /iletisimAcik\(kart\.durum\)/,
    'şirket çekmecesi artık teklif durumuna bakmamalı',
  );
  /* Salt okunur üye için istek HİÇ gönderilmiyor. */
  assert.match(cekmece, /saltOkunur \|\| !adayIletisimiAcik\(kart\)/);
});

test('öğrenciye şirket yetkilisi kuralı DEĞİŞMEDİ', () => {
  /*
    Teklif temel akıştan çıktı ama geçmişte kabul edilmiş teklifler
    duruyor; o öğrencilerin gördüğü bilgi kaybolmamalı.
  */
  const goc = oku('supabase/migrations/20261201010000_iletisim_paylasimi_sadelesti.sql');
  assert.match(goc, /if v_durum <> 'offer_accepted' or v_riza is null then/);
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
    'A, kabul edilmis basvuruya not yazabilir',
    'A, kabul edilmis teklifi bozamaz',
    'A, reddedilmis teklifi bozamaz',
    'A, geri cekilmis basvuruyu yeniden acamaz',
    'A, kendi olumsuz kararini geri alabilir',
  ]) {
    assert.ok(sql.includes(ad), `RLS regresyonunda eksik: ${ad}`);
  }
});
