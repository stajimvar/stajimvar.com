import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
  GÖRÜŞME DAVETİ ≠ TEKLİF

  Akış görüşmeyi pratikte ATLIYORDU: `interview_scheduled` durumu vardı
  ama içi boştu (yanında yalnızca opsiyonel bir `interview_date`), bu
  yüzden şirketin öğrenciye söyleyebildiği ilk somut şey "Teklif aldın"
  oluyordu. Oysa gerçek işe alımda ücret, başlangıç ve çalışma koşulları
  GÖRÜŞMEDE netleşiyor.

  Bu testler dört şeyi bağlıyor:
    1. Görüşme aşaması için yeni durum değeri AÇILMADI.
    2. Daveti şirket gönderiyor, yanıtı öğrenci veriyor — kapı sunucuda.
    3. Teklif ancak görüşme onaylandıktan sonra gösteriliyor.
    4. İletişim görüşme kabulünde AÇILMIYOR; kural teklif kabulünde.
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');
/* Yorumlar neyin NEDEN yapılmadığını da yazıyor; kodmuş gibi taranmamalı. */
const koddan = (metin) => metin.replace(/--.*/g, '');

const sozluk = oku('src/lib/basvuru-durumu.mjs');
const cekmece = oku('src/sirket/AdayCekmecesi.tsx');
const ogrenci = oku('src/components/ApplicationsTrackerView.tsx');
const goc = koddan(oku('supabase/migrations/20260912010000_gorusme_daveti.sql'));
const gocKopya = koddan(oku('supabase/migrations/20260912020000_basvuru_kopyasinda_eposta_yok.sql'));
const sql = oku('scripts/sql/rls-regresyon-testleri.sql');
const kopya = oku('src/lib/basvuru-kopyasi.mjs');

/* --------------------------------------------------- 1. durum modeli */

test('görüşme aşaması için yeni durum değeri açılmadı', async () => {
  /*
    Üç yeni değer (davet gönderildi / kabul edildi / reddedildi) durum
    makinesini şişirir ve her süzgeç, politika ve rozet haritasının
    üçünü birden bilmesini gerektirirdi. Yanıt, durumun İÇİNDEKİ bir
    olgu olarak ayrı alanda duruyor.
  */
  assert.ok(!/add value/.test(goc), 'application_status enum genişletilmiş');
  assert.match(goc, /add column if not exists interview_response/);

  const m = await import('../src/lib/basvuru-durumu.mjs');
  assert.equal(m.DURUM_SIRASI.length, 9, 'durum sayısı değişmiş');
});

test('görüşme yanıtı ve biçimi uydurma değer kabul etmiyor', () => {
  assert.match(goc, /interview_type in \('in_person', 'online', 'phone'\)/);
  assert.match(goc, /interview_response in \('accepted', 'declined'\)/);
});

test('yer ve bağlantı TEK alanda', () => {
  /*
    Adres ve toplantı bağlantısı aynı sorunun cevabı ("nereye
    geleceğim"); iki ayrı kolon, birinin boş ötekinin dolu olduğu
    belirsiz durumlar üretirdi.
  */
  assert.match(goc, /add column if not exists interview_location/);
  assert.ok(!/interview_link/.test(goc), 'aynı bilgi ikinci bir kolonda');
});

test('ücret gerçek teklifte ve tek alanda', () => {
  assert.match(goc, /add column if not exists offer_compensation/);
});

/* ------------------------------------- 2. daveti şirket, yanıtı öğrenci */

test('görüşme yanıtı tek kapıdan geçiyor', () => {
  assert.match(goc, /create or replace function public\.gorusmeye_yanit_ver/);
  assert.match(goc, /for update/, 'satır kilitlenmiyor');
  assert.match(goc, /if v_durum <> 'interview_scheduled' then/);
  /* Zaten yanıtlanmışsa hata değil, mevcut yanıt. */
  assert.match(goc, /if v_yanit is not null then\s+return v_yanit;/);
});

test('şirket öğrencinin yanıtını yazamıyor', () => {
  assert.match(goc, /create trigger applications_guard_interview_response/);
  assert.match(goc, /Görüşme yanıtını yalnızca başvuran öğrenci verebilir/);
});

test('şirket yalnızca yanıtı TEMİZLEYEBİLİYOR', () => {
  /*
    Öğrenci katılamayacağını söyledikten sonra şirket yeni bir tarih
    önerebilmeli. Yazabildiği tek yanıt değeri NULL.
  */
  assert.match(goc, /if new\.interview_response is null/);
  assert.match(cekmece, /Yeni davet gönder/);
});

test('işlev anon kullanıcıya kapalı', () => {
  assert.match(goc, /revoke all on function public\.gorusmeye_yanit_ver\(uuid, boolean\) from public, anon;/);
});

/* --------------------------------------------- 3. teklif görüşmeden sonra */

test('teklif ancak görüşme onaylandıysa sıradaki adım', async () => {
  const m = await import('../src/lib/basvuru-durumu.mjs');
  assert.equal(m.sonrakiDurum('technical_assessment'), 'interview_scheduled');
  assert.equal(m.sonrakiDurum('interview_scheduled'), null);
  assert.equal(m.sonrakiDurum('interview_scheduled', 'declined'), null);
  assert.equal(m.sonrakiDurum('interview_scheduled', 'accepted'), 'offer_extended');
});

test('şirket ekranı davet ve teklif düğmelerini karıştırmıyor', () => {
  assert.match(cekmece, /Görüşmeye davet et/);
  assert.match(cekmece, /sonraki === 'interview_scheduled' \?/);
  assert.match(cekmece, /sonraki === 'offer_extended' \?/);
});

test('öğrenci görüşme aşamasında teklif kabul/ret görmüyor', () => {
  /*
    Teklif düğmeleri YALNIZCA `offer_extended` durumunda çiziliyor;
    görüşme bloğu ayrı bir koşulun içinde.
  */
  assert.match(ogrenci, /app\.status === 'interview_scheduled' && \(/);
  assert.match(ogrenci, /app\.status === 'offer_extended' && \(/);
});

test('öğrenci daveti ayrı bir CTA ile açıyor', () => {
  assert.match(ogrenci, /Daveti görüntüle/);
  assert.match(ogrenci, /Görüşmeye katılacağım/);
  assert.match(ogrenci, /Katılamayacağım/);
});

test('görüşme reddi şirketin olumsuz kararıyla karışmıyor', async () => {
  const m = await import('../src/lib/basvuru-durumu.mjs');
  assert.match(m.gorusmeSirketCumlesi('declined'), /Öğrenci/);
  assert.match(m.gorusmeOgrenciCumlesi('declined'), /bildirdin/);
  assert.notEqual(m.gorusmeSirketCumlesi('declined'), m.SIRKET_CUMLESI.rejected);
});

test('görüşme daveti öğrenciye "teklif" denmiyor', async () => {
  const m = await import('../src/lib/basvuru-durumu.mjs');
  assert.equal(m.OGRENCI_CUMLESI.interview_scheduled, 'Görüşme daveti aldın');
  assert.ok(!m.OGRENCI_CUMLESI.interview_scheduled.includes('Teklif'));
  assert.equal(m.DURUM_ADI.interview_scheduled, 'Görüşme');
});

/* ------------------------------------------ 4. iletişim kuralı korunuyor */

test('görüşme kabulü iletişimi AÇMIYOR', () => {
  const gocIletisim = koddan(
    oku('supabase/migrations/20260911020000_teklif_yaniti_kurallari.sql'),
  );
  /* Kapı hâlâ tek şarta bağlı: teklif kabul edildi. */
  assert.match(gocIletisim, /v_durum <> 'offer_accepted'/);
  assert.ok(
    !/interview/.test(goc.split('gorusmeye_yanit_ver')[1] ?? '') ||
      !/basvuru_iletisimi/.test(goc),
    'görüşme işlevi iletişim kapısına dokunuyor',
  );
  assert.match(sql, /Gorusme kabulu iletisimi ACMIYOR/);
});

/* -------------------------------- 5. başvuru kopyasında e-posta yok */

test('kopya üretimi artık e-posta yazmıyor', () => {
  /*
    Kopyada `eposta` vardı ve şirket paneli kopyayı olduğu gibi
    çekiyordu: arayüz adresi çizmese de veri tarayıcıya gidiyordu.
    Kural arayüzde değil veride tutulmalı.
  */
  assert.ok(
    !/^\s*eposta:/m.test(kopya),
    'başvuru kopyası hâlâ e-posta taşıyor — kabul öncesi şirkete gidiyor',
  );
});

test('geçmiş kopyalardan yalnızca iletişim anahtarları düşürülüyor', () => {
  assert.match(gocKopya, /profile_snapshot - 'eposta'/);
  assert.match(gocKopya, /profile_snapshot - 'telefon'/);
  /* Kopyanın geri kalanı olduğu gibi duruyor: körlemesine rewrite yok. */
  assert.ok(!/set profile_snapshot = '/.test(gocKopya), 'kopya baştan yazılıyor');
  assert.ok(!/delete from public\.applications/.test(gocKopya), 'başvuru siliniyor');
});

test('şirket sorgusu kopyayı hâlâ çekiyor ama içinde iletişim yok', () => {
  const veri = oku('src/lib/sirket-veri.ts');
  assert.match(veri, /profile_snapshot/, 'şirket paneli kopyayı okumuyor');
  assert.match(sql, /Sirket kopyada e-posta goremez/);
});

/* ---------------------------------------------- 6. eksik veri fail-soft */

test('eski görüşme kayıtlarında boş alanlar çizilmiyor', () => {
  assert.match(cekmece, /kart\.mulakatTarihi \|\| kart\.gorusmeSaati \|\| kart\.gorusmeTuru/);
  assert.match(ogrenci, /\{app\.interviewDate && \(/);
  assert.match(ogrenci, /Görüşmenin tarihi ve biçimi henüz/);
});

test('kart verisi boş alanları boş dizeye düşürüyor', async () => {
  const { kartVerisi } = await import('../src/lib/aday-kart.mjs');
  const k = kartVerisi({ id: 'x', status: 'interview_scheduled' });
  for (const alan of ['gorusmeSaati', 'gorusmeTuru', 'gorusmeYeri', 'gorusmeNotu', 'gorusmeYaniti']) {
    assert.equal(k[alan], '', `${alan} boş dize değil`);
  }
});

test('görüşme biçimi ve yer etiketi tanınmayan değerde metin uydurmuyor', async () => {
  const m = await import('../src/lib/basvuru-durumu.mjs');
  assert.equal(m.gorusmeTuruAdi('uydurma'), '');
  assert.equal(m.gorusmeTuruAdi(undefined), '');
  assert.equal(m.gorusmeYeriEtiketi('online'), 'Toplantı bağlantısı');
  assert.equal(m.gorusmeYeriEtiketi(undefined), 'Konum');
});

/* ------------------------------------------- 7. sahte bildirim vaadi yok */

test('ekranlar gönderilmeyen bildirimi vaat etmiyor', () => {
  const hepsi = [cekmece, ogrenci].join('\n');
  for (const yasak of ['E-posta gönderildi', 'Bildirim gönder', 'bildirim gönderildi', 'SMS']) {
    assert.ok(!hepsi.includes(yasak), `gerçekte olmayan vaat: ${yasak}`);
  }
});

/* --------------------------------------------- 8. RLS regresyonu kapsamı */

test('regresyon görüşme akışının her iki yönünü sınıyor', () => {
  const beklenen = [
    'A, kendi adayini gorusmeye davet edebilir',
    'B, A adayini gorusmeye davet edemez',
    'C, kendine gorusme daveti olusturamaz',
    'A, ogrenci adina davete yanit veremez',
    'C, kendi davetini kabul edebilir',
    'D, C nin davetini yanitlayamaz',
    'Ikinci gorusme yaniti karari degistirmiyor',
    'Gorusme kabulu iletisimi ACMIYOR',
    'Geri cekilmis basvuruda gorusme yanitlanamaz',
    'Olumsuz kapanmis basvuruda gorusme yanitlanamaz',
    'C, katilamayacagini bildirebilir',
    'A, yeni davet gonderip yaniti sifirlayabilir',
    'Sirket kopyada e-posta goremez',
  ];
  for (const ad of beklenen) {
    assert.ok(sql.includes(ad), `RLS regresyonunda eksik: ${ad}`);
  }
});

test('sözlük görüşme katmanını taşıyor', () => {
  for (const ad of ['gorusmeBekliyor', 'gorusmeOnaylandi', 'gorusmeReddedildi', 'GORUSME_TURLERI']) {
    assert.ok(sozluk.includes(ad), `${ad} sözlükte yok`);
  }
});
