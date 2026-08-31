import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
  BAŞVURU SÜRECİ — İKİ TARAFTA AYNI AKIŞ

  Panelde aday ayrıntısının altında beş düğme vardı ("İncelemede",
  "Mülakat", "Reddet" + katlanmış iki tane daha); hangisinin sıradaki
  adım olduğu belli değildi ve her tıklamada çekmece kapanıyordu.
  Öğrenci tarafında ise mülakat aşamasındaki HER başvuruda aynı sabit
  metin duruyordu:

    "Online Teknik Mülakat Daveti • 18 Haziran 14:00"
    "Google Meet Linki İletildi"

  Hiçbiri veriden gelmiyordu. Ürün mesajlaşma, takvim ya da video
  bağlantısı taşımıyor; o kutu olmamış bir şeyi anlatıyordu.

  Bu testler üç şeyi bağlıyor:
    1. Panel tek durum seçici + tek "sonraki adım" gösteriyor.
    2. Öğrenci ekranı yalnızca gerçekten kayıtlı alanları yazıyor.
    3. Durum damgası `status_changed_at` — her yazımda oynayan
       `updated_at` değil.
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

const cekmece = oku('src/sirket/AdayCekmecesi.tsx');
const ogrenci = oku('src/components/ApplicationsTrackerView.tsx');

/* ------------------------------------------------- 1. panel: tek seçici */

test('çekmece durumları tek seçicide gösteriyor', () => {
  assert.match(cekmece, /SIRKET_DURUMLARI\.map/, 'durum seçici yok');
  assert.match(cekmece, /<select/, 'yerli select kullanılmıyor');
});

test('her durum için ayrı düğme dizisi kalmadı', () => {
  for (const eski of ['BIRINCI_SIRA', 'IKINCI_SIRA']) {
    assert.ok(!cekmece.includes(eski), `${eski} hâlâ çiziliyor — beş düğme geri geldi`);
  }
});

test('sonraki adım sözlükten geliyor, çekmecede yeniden yazılmıyor', () => {
  assert.match(cekmece, /sonrakiDurum\(kart\.durum\)/, 'sonraki adım hesaplanmıyor');
  /* Akış sırası ikinci bir yerde tanımlanmamalı. */
  assert.ok(!/const\s+akis\s*=/.test(cekmece), 'çekmece kendi akış haritasını kuruyor');
});

test('olumsuz tek tıkla uygulanmıyor', () => {
  assert.match(cekmece, /olumsuzSoruldu/, 'reddetme onayı yok');
});

test('durum hatası satır içinde, çekmece kapanmadan', () => {
  assert.match(cekmece, /setDurumHatasi/, 'durum hatası için satır içi alan yok');
  assert.match(cekmece, /role="alert"/, 'hata mesajı erişilebilir değil');
});

test('durum değişimi çekmeceyi kapatmıyor', () => {
  const izgara = oku('src/sirket/AdayIzgarasi.tsx');
  assert.ok(
    !/durumUygula\([^)]*\)\.then\(\(\) => setAcikId\(null\)\)/.test(izgara),
    'durum değişince çekmece kapanıyor — şirket sonucu göremiyor',
  );
});

/* --------------------------------------- 2. öğrenci: uydurma içerik yok */

const UYDURMA = [
  'Google Meet',
  '18 Haziran',
  'mülakat bağlantısını',
  'Online Teknik Mülakat Daveti',
];

test('öğrenci ekranında sabit mülakat metni kalmadı', () => {
  for (const parca of UYDURMA) {
    assert.ok(!ogrenci.includes(parca), `uydurma içerik hâlâ var: ${parca}`);
  }
});

test('mülakat kutusu yalnızca kayıtlı tarihi yazıyor', () => {
  assert.match(ogrenci, /app\.interviewDate/, 'gerçek mülakat tarihi okunmuyor');
});

/* ---------------------------------------------- 3. damga gerçek kolondan */

test('öğrenci ekranı status_changed_at okuyor', () => {
  assert.match(ogrenci, /app\.statusChangedAt/, 'durum damgası okunmuyor');
  assert.ok(
    !/app\.updatedAt/.test(ogrenci),
    'updated_at "güncelleme" diye gösteriliyor — o kolon her yazımda oynuyor',
  );
});

test('damga yoksa başvuru tarihi güncelleme gibi gösterilmiyor', () => {
  assert.ok(
    !/Güncelleme: \{tarihMetni\(app\.appliedAt\)/.test(ogrenci),
    'durum hiç değişmediğinde başvuru tarihi güncelleme diye yazılıyor',
  );
});

test('mapper status_changed_at taşıyor', () => {
  assert.match(oku('src/lib/queries/mappers.ts'), /statusChangedAt: row\.status_changed_at/);
});

/* -------------------------------------------------- 4. geri çekme kuralı */

test('öğrenci geri çekmeyi yalnızca açık başvuruda görüyor', () => {
  assert.match(ogrenci, /durumKapandi\(app\.status\)/, 'kapanmış başvuruda da geri çekme görünüyor');
});

test('geri çekme onay istiyor', () => {
  assert.match(ogrenci, /geriCekilen/, 'tek tıkla geri çekiliyor');
});

test('şirket tarafında geri çekme EYLEMİ yok', () => {
  /*
    Değer ekranda görünebiliyor: aday kendi geri çektiyse seçicide
    o durum yazmalı, yoksa `select` ilk seçeneği gösterip yanlış bilgi
    verirdi. Yasak olan onu YAZMAK.
  */
  assert.ok(
    !/(durumDegistir|onDurum)\(\s*'withdrawn'/.test(cekmece),
    'şirket aday adına geri çekebiliyor',
  );
  assert.match(cekmece, /value="withdrawn" disabled/, 'geri çekilmiş durum seçilebilir kalmış');
});

/* --------------------------------------- 5. veritabanı kuralı korunuyor */

test('RLS regresyonu şirketin geri çekmesini sınıyor', () => {
  const sql = oku('scripts/sql/rls-regresyon-testleri.sql');
  assert.match(sql, /ADAY ADINA geri cekemez/, 'kural yalnızca arayüzde duruyor');
  assert.match(sql, /C, kendine teklif veremez/, 'öğrenci tarafı sınanmıyor');
  assert.match(sql, /status_changed_at damgalaniyor/, 'damga sınanmıyor');
});

test('göç kuralı WITH CHECK ile yazıyor', () => {
  const gocler = readFileSync(
    new URL('../supabase/migrations/20260910010000_basvuru_durum_gecis_siniri.sql', import.meta.url),
    'utf8',
  );
  assert.match(gocler, /with check/i, 'değer kısıtı WITH CHECK olmadan uygulanmaz');
  assert.match(gocler, /status <> 'withdrawn'/);
});
