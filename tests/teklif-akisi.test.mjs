import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
  TEKLİF → ÖĞRENCİNİN KARARI → İLETİŞİM

  Ürün akışı teklifte kesiliyordu: şirket "Teklif" durumuna alıyor,
  öğrenci "Teklif aldın" görüyor ve orada bitiyordu. Kabul, ret ve
  kabulden sonra iletişimin açılması yoktu.

  Üç şeyi bağlayan testler:
    1. Kararı ÖĞRENCİ veriyor — kapı tek bir işlev, arayüz değil.
    2. İletişim YALNIZCA kabulden sonra ve yalnız iki taraf arasında.
    3. Öğrencinin reddi ile şirketin olumsuz kararı karışmıyor.
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

/*
  Yorumları düşürür. Göç dosyaları neyin NEDEN yapılmadığını da
  yazıyor ("offer_response elendi çünkü…"); yorum metnini kodmuş gibi
  taramak, tam da o açıklamayı yasak sayardı.
*/
const koddan = (metin) => metin.replace(/--.*/g, '');

const sozluk = oku('src/lib/basvuru-durumu.mjs');
const cekmece = oku('src/sirket/AdayCekmecesi.tsx');
const ogrenci = oku('src/components/ApplicationsTrackerView.tsx');
const gocDurum = koddan(oku('supabase/migrations/20260911010000_teklif_yaniti_durumlari.sql'));
const gocKural = koddan(oku('supabase/migrations/20260911020000_teklif_yaniti_kurallari.sql'));
const sql = oku('scripts/sql/rls-regresyon-testleri.sql');

/* -------------------------------------------------- 1. durum modeli */

test('teklif yanıtı enum içinde, ayrı bir kolonda değil', () => {
  /*
    `offer_response` gibi ikinci bir alan elendi: ürünün tamamı "bu
    başvuru hangi durumda" sorusunu tek yerden okuyor. İkinci kolon,
    durumu iki alanın bileşkesi yapardı.
  */
  assert.match(gocDurum, /add value if not exists 'offer_accepted'/);
  assert.match(gocDurum, /add value if not exists 'offer_declined'/);
  assert.ok(!/offer_response/.test(gocDurum), 'aynı bilgi ikinci bir kolonda tutuluyor');
});

test('yanıt zamanı için yeni kolon açılmadı', () => {
  /* `status_changed_at` her durum değişiminde tetikleyiciyle damgalanıyor. */
  assert.ok(!/offer_responded_at/.test(gocDurum), 'aynı an ikinci kez saklanıyor');
});

test('teklifin içeriği genel notun üzerine yazılmıyor', () => {
  assert.match(gocDurum, /add column if not exists offer_note/);
  assert.match(gocDurum, /add column if not exists offer_start_date/);
  /* Genel not (company_feedback) teklif metni olarak KULLANILMIYOR. */
  assert.ok(
    !/company_feedback/.test(gocDurum),
    'teklif metni genel notla aynı kolona yazılıyor — sonradan üzerine yazılabilir',
  );
});

test('enum değerleri kullanıldıkları göçten AYRI dosyada ekleniyor', () => {
  /*
    PostgreSQL'de bir enum'a eklenen değer, onu ekleyen işlemin içinde
    kullanılamıyor. Kurallar ayrı dosyada olmasaydı göç üretimde
    düşerdi.
  */
  assert.ok(!/offer_accepted'/.test(gocDurum.split('add column')[1] ?? ''), 'değer aynı dosyada kullanılıyor');
  assert.match(gocKural, /offer_accepted/);
});

/* ----------------------------------------- 2. kararı öğrenci veriyor */

test('şirket öğrencinin kararlarını yazamıyor', () => {
  /*
    KURAL POLİTİKADAN TETİKLEYİCİYE TAŞINDI

    WITH CHECK yalnız YENİ satırı ve satırın TAMAMINI görüyordu: kabul
    edilmiş bir başvuruya not yazmak da engelleniyordu, çünkü yeni
    satırın durumu hâlâ `offer_accepted` idi. Regresyon bunu yakaladı.

    Geçiş kuralı eski ve yeni değeri birlikte görmek zorunda; artık
    tamamı tek yerde (20260914020000_durum_gecisi_tek_yerde).
  */
  const gecis = koddan(
    oku('supabase/migrations/20260914020000_durum_gecisi_tek_yerde.sql'),
  );
  assert.match(gecis, /Bu kararı yalnızca aday verebilir/);
  assert.match(gecis, /Öğrencinin verdiği karar değiştirilemez/);
  assert.match(gecis, /array\['offer_accepted', 'offer_declined', 'withdrawn'\]/);
  /* Durum dışındaki alanlar serbest. */
  assert.match(gecis, /new\.status is not distinct from old\.status/);
});

test('kabul/ret tek kapıdan geçiyor', () => {
  assert.match(gocKural, /create or replace function public\.teklife_yanit_ver/);
  /* Öğrencinin doğrudan güncelleme hakkı hâlâ yalnızca `withdrawn`. */
  assert.ok(
    !/ogrenci basvuru geri ceker/.test(gocKural),
    'öğrencinin güncelleme politikası genişletilmiş',
  );
});

test('yanıt yalnızca teklif verilmiş başvurudan alınıyor', () => {
  assert.match(gocKural, /if v_durum <> 'offer_extended' then/);
});

test('satır kilitleniyor: iki paralel yanıt tutarsız sonuç üretmiyor', () => {
  assert.match(gocKural, /for update/, 'eşzamanlı istekler sıraya girmiyor');
});

test('zaten yanıtlanmış teklif hata değil, mevcut sonuç', () => {
  assert.match(gocKural, /if v_durum in \('offer_accepted', 'offer_declined'\) then\s+return v_durum;/);
});

test('işlev anon kullanıcıya kapalı', () => {
  assert.match(gocKural, /revoke all on function public\.teklife_yanit_ver\(uuid, boolean\) from public, anon;/);
  assert.match(gocKural, /revoke all on function public\.basvuru_iletisimi\(uuid\) from public, anon;/);
});

/* ------------------------------------------------ 3. iletişim kapısı */

test('iletişim üç şarta birden bağlı', () => {
  assert.match(gocKural, /v_durum <> 'offer_accepted'/, 'kabul şartı yok');
  assert.match(gocKural, /v_riza is null/, 'rıza damgası aranmıyor');
  assert.match(gocKural, /is_company_member\(v_sirket\) and public\.sirket_dogrulandi\(v_sirket\)/);
});

test('profiles tablosuna yeni okuma politikası açılmadı', () => {
  /*
    Kapıyı tabloya politika ekleyerek açmak, burada tarif edilenden
    geniş açardı: şirket başvuran her öğrencinin satırını görürdü.
  */
  assert.ok(
    !/create policy[^;]*on public\.profiles/.test(gocKural),
    'profiles okuma kuralı genişletilmiş',
  );
});

test('istemci iletişim isteğini kabul edilmemiş başvuruda göndermiyor', () => {
  assert.match(cekmece, /iletisimAcik\(kart\.durum\)/);
  assert.match(ogrenci, /app\.status !== 'offer_accepted'/);
});

/* ------------------------------------------------------- 4. arayüz */

test('şirket teklif gönderirken içerik topluyor', () => {
  assert.match(cekmece, /Teklif notu — öğrenci görecek/);
  assert.match(cekmece, /not: teklifNotu,\s+baslangic: teklifBaslangici,\s+ucret: teklifUcreti,/);
});

test('teklif ve durum tek yazımda gidiyor', () => {
  const veri = oku('src/lib/sirket-veri.ts');
  assert.match(veri, /status: 'offer_extended',\s+offer_note:/, 'durum ve içerik ayrı yazılıyor');
});

test('teklif beklerken şirkete sonraki adım düğmesi yok', () => {
  assert.match(cekmece, /teklifBekliyor\(kart\.durum\)/);
});

test('öğrenci karar verdikten sonra şirket seçicisi HİÇ ÇİZİLMİYOR', () => {
  /*
    Önce seçici çiziliyor ama `disabled` oluyordu. Kapalı bir açılır
    liste hâlâ "buradan başka bir duruma çekebilirim" diyor. Artık
    yerinde okunur bir satır var; seçici o dalda hiç yok.
  */
  assert.match(cekmece, /kararKilitli \? \(/, 'karar verilmiş durumda okunur satır yok');
  assert.match(cekmece, /const kararKilitli = ogrencininKarari\(kart\.durum\)/);
});

test('öğrenci kabul etmeden önce rıza cümlesini görüyor', () => {
  assert.match(
    ogrenci,
    /Teklifi kabul ettiğinde iletişim bilgilerin bu şirketle paylaşılır/,
    'kabulün ne anlama geldiği yazılı değil',
  );
});

test('kabul ve ret onay istiyor', () => {
  assert.match(ogrenci, /Bu teklifi kabul etmek istiyor musun\?/);
  assert.match(ogrenci, /Bu teklifi reddetmek istiyor musun\?/);
});

test('ekran sunucunun döndürdüğü durumu yazıyor', () => {
  const app = oku('src/App.tsx');
  assert.match(app, /const durum = await respondToOffer\(id, kabul\);/);
  assert.match(app, /status: durum/, 'ekran kendi tahminini yazıyor');
});

test('sohbet/takvim/SMS kurulmadı', () => {
  const hepsi = [cekmece, ogrenci].join('\n');
  for (const yasak of ['WhatsApp', 'Google Meet', 'takvime ekle', 'sohbet']) {
    assert.ok(!hepsi.includes(yasak), `bu turda yapılmayacak olan eklenmiş: ${yasak}`);
  }
  /* İletişim e-postayla: mailto yeterli. */
  assert.match(cekmece, /mailto:/);
  assert.match(ogrenci, /mailto:/);
});

test('eski tekliflerde içerik yoksa ekran uydurmuyor', () => {
  /* Teklif içeriği bu turda eklendi; geçmiş kayıtlarda iki alan da boş. */
  assert.match(cekmece, /\(kart\.teklifNotu \|\| kart\.teklifBaslangici \|\| kart\.teklifUcreti\)/);
  assert.match(ogrenci, /\{app\.offerNote && \(/);
});

/* ------------------------------------------------- 5. RLS regresyonu */

test('regresyon teklif akışının iki yönünü de sınıyor', () => {
  const beklenen = [
    'A, adaya teklif gonderebilir',
    'B, A adayina teklif gonderemez',
    'C, kendi basvurusuna teklif olusturamaz',
    'C, kendi teklifini kabul edebilir',
    'D, C nin teklifini yanitlayamaz',
    'A, ogrenci adina teklifi kabul edemez',
    'Kabul oncesi iletisim KAPALI',
    'Kabul sonrasi ogrenci sirket yetkilisini gorur',
    'Kabul sonrasi sirket adayin iletisimini gorur',
    'Ilgisiz sirket iletisimi goremez',
    'Reddedilen teklif iletisimi acmiyor',
    'Geri cekilmis basvuruda teklif yanitlanamaz',
    'Ikinci yanit hata vermiyor',
  ];
  for (const ad of beklenen) {
    assert.ok(sql.includes(ad), `RLS regresyonunda eksik: ${ad}`);
  }
});

test('durum sözlüğü yeni değerleri kapsıyor', () => {
  for (const d of ['offer_accepted', 'offer_declined']) {
    assert.ok(sozluk.includes(`${d}:`), `${d} sözlükte yok`);
  }
});
