import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gecenSure } from '../src/lib/gecen-sure.mjs';

/*
  UYGULAMA İÇİ BİLDİRİMLER

  Başvuru akışı çalışıyordu ama hiçbir değişiklik HABER VERİLMİYORDU:
  şirket görüşmeye davet etse de teklif gönderse de öğrenci ancak
  Başvurularım'a tekrar girerse öğreniyordu.

  Header'daki zarf ikonu "Mesajlar ve Bildirimler" diyordu ve yaptığı
  tek şey sekme değiştirmekti — mesajlaşma diye bir şey yok. İkon var
  olmayan bir kutuyu vaat ediyordu.

  Bu testler dört şeyi bağlıyor:
    1. Bildirim İSTEMCİDE değil, asıl yazımın yanında üretiliyor.
    2. Değişmeyen alan bildirim üretmiyor; kendi işini kimse duymuyor.
    3. Kimse başkasının bildirimini okuyamıyor, uyduramıyor.
    4. Bildirim merkezi bir olay günlüğü değil.
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');
/*
  Yorumları düşürür — HEM satır (`--`) HEM blok. Göç dosyaları neyin
  neden yapılmadığını da yazıyor ("`profiles` tablosundan değil");
  yorum metnini kodmuş gibi taramak tam da o açıklamayı yasak sayardı.
*/
const koddan = (metin) => metin.replace(/--.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

const goc = koddan(oku('supabase/migrations/20260913010000_bildirimler.sql'));
const veri = oku('src/lib/bildirim.ts');
const kanca = oku('src/lib/useBildirimler.ts');
const merkez = oku('src/components/BildirimMerkezi.tsx');
const header = oku('src/components/Header.tsx');
const sql = oku('scripts/sql/rls-regresyon-testleri.sql');

/* ------------------------------------------------- 1. üretim yeri */

test('bildirim istemcide değil, tetikleyicide üretiliyor', () => {
  /*
    "İşlem başarılı, şimdi bildirim ekleyeyim" yolu sessiz tutarsızlık
    üretir: ana işlem olur, bildirim olmaz. Tetikleyici asıl yazımla
    AYNI İŞLEMİN içinde çalışıyor.
  */
  assert.match(goc, /create trigger applications_bildirimler/);
  assert.match(goc, /after insert or update on public\.applications/);
  assert.ok(
    !/from\('notifications'\)[\s\S]{0,120}\.insert/.test(veri),
    'istemci bildirim yazıyor',
  );
});

test('tek tetikleyici bütün akışı kapsıyor', () => {
  /*
    Görüşme yanıtı ve teklif yanıtı işlevleri de sonunda `applications`
    tablosunu güncelliyor. Her birine ayrı bildirim kodu koymak, birini
    unutmaya açık dört ayrı yer demekti.
  */
  for (const tur of [
    'yeni_basvuru',
    'inceleniyor',
    'degerlendirme',
    'gorusme_daveti',
    'gorusme_guncellendi',
    'teklif',
    'olumsuz',
    'gorusme_kabul',
    'gorusme_ret',
    'teklif_kabul',
    'teklif_ret',
    'geri_cekildi',
  ]) {
    assert.ok(goc.includes(`'${tur}'`), `bildirim türü eksik: ${tur}`);
  }
});

/* --------------------------------------- 2. yinelenme ve kendi işi */

test('değişmeyen alan bildirim üretmiyor', () => {
  /* Aynı durum ikinci kez yazılırsa hiçbir şey olmuyor. */
  assert.match(goc, /new\.status is distinct from old\.status/);
  assert.match(goc, /new\.interview_response is distinct from old\.interview_response/);
});

test('kendi yaptığı işin bildirimini kimse almıyor', () => {
  /*
    Toast ile bildirim ayrı şeyler: toast kullanıcının o an yaptığı
    işlemin sonucu, bildirim karşı tarafın yaptığı değişiklik.
  */
  assert.match(goc, /m\.user_id is distinct from p_aktor/);
  assert.match(goc, /a\.student_id is distinct from p_aktor/);
});

test('görüşme daveti güncellemesi gerçek alan değişimine bağlı', () => {
  for (const alan of [
    'interview_date',
    'interview_time',
    'interview_type',
    'interview_location',
    'interview_note',
  ]) {
    assert.ok(
      new RegExp(`new\\.${alan}\\s+is distinct from old\\.${alan}`).test(goc),
      `${alan} değişimi izlenmiyor`,
    );
  }
});

/* ------------------------------------------------- 3. erişim sınırı */

test('herkes yalnız kendi bildirimini okuyor', () => {
  assert.match(goc, /for select using \(recipient_id = auth\.uid\(\)\)/);
  assert.match(goc, /for update using \(recipient_id = auth\.uid\(\)\)/);
});

test('kullanıcı bildirim uyduramıyor, silemiyor', () => {
  /* INSERT ve DELETE politikası YOK: yazan tek şey tetikleyici. */
  assert.ok(!/for insert/.test(goc), 'kullanıcıya insert politikası verilmiş');
  assert.ok(!/for delete/.test(goc), 'kullanıcıya delete politikası verilmiş');
});

test('yazılabilen tek kolon read_at', () => {
  /*
    Satır yetkisi kolon yetkisi değil: başlık ya da hedef adres
    yazılabilseydi kullanıcı kendi ekranında sahte bildirim üretebilirdi.
  */
  assert.match(goc, /revoke update on public\.notifications from authenticated;/);
  assert.match(goc, /grant update \(read_at\) on public\.notifications to authenticated;/);
});

test('adayın adı kopyadan geliyor, profiles tablosundan değil', () => {
  /*
    Şirket `profiles` satırını okuyamıyor ve bildirim metni bu sınırı
    delmemeli. Rıza yoksa kopya da yok — o zaman "Bir aday".
  */
  assert.match(goc, /new\.profile_snapshot ->> 'ad'/);
  assert.match(goc, /'Bir aday'/);
  assert.ok(
    !/profiles/.test(goc.split('basvuru_bildirimleri')[1] ?? ''),
    'bildirim metni profiles tablosunu okuyor',
  );
});

/* ------------------------------------------------ 4. sayaç ve arayüz */

test('okunmamış sayısı sunucudan, listeden hesaplanmıyor', () => {
  assert.match(veri, /count: 'exact', head: true/);
  assert.match(veri, /\.is\('read_at', null\)/);
});

test('sayı bilinmiyorken rozet çizilmiyor', () => {
  /* Önce 0 gösterip sonra 3'e zıplamak rozetin güvenilirliğini bitiriyor. */
  assert.match(veri, /if \(error\) return null;/);
  assert.match(merkez, /if \(sayi === null \|\| sayi <= 0\) return null;/);
});

test('oturum kapanınca sayaç temizleniyor', () => {
  assert.match(kanca, /if \(!kullaniciId\) \{[\s\S]{0,200}setOkunmamis\(null\)/);
});

test('zarf ikonu kaldırıldı, zil geldi', () => {
  assert.ok(!header.includes('Mesajlar ve Bildirimler'), 'olmayan mesajlaşma hâlâ vaat ediliyor');
  assert.ok(!/<Mail /.test(header), 'zarf ikonu duruyor');
  assert.match(header, /<BildirimDugmesi/);
});

test('rozet 9 üstünü kısaltıyor', () => {
  assert.match(merkez, /sayi > 9 \? '9\+' : sayi/);
});

test('okunmamış yalnızca renkle anlatılmıyor', () => {
  assert.match(merkez, /Yeni/);
  assert.match(merkez, /aria-label=/);
});

test('boş durumda tek cümle', () => {
  assert.match(merkez, /Henüz bildirimin yok\./);
});

test('bildirim merkezi olay günlüğü değil', () => {
  /* Tür dizesi, tablo ya da ham durum adı ekranda görünmüyor. */
  for (const yasak of ['<table', 'application_status', 'offer_extended', 'interview_scheduled']) {
    assert.ok(!merkez.includes(yasak), `bildirim merkezinde teknik ayrıntı: ${yasak}`);
  }
});

test('okundu tıklamayla oluyor, listeyi açmakla değil', () => {
  assert.match(kanca, /const okunduYap/);
  assert.ok(
    !/setYukleniyor\(false\)[\s\S]{0,200}tumBildirimlerOkundu/.test(kanca),
    'panel açılınca hepsi okundu sayılıyor',
  );
});

/* ------------------------------------------------------ 5. zaman metni */

test('geçen süre doğal dille yazılıyor', () => {
  const simdi = new Date('2026-08-31T12:00:00Z');
  const once = (ms) => new Date(simdi.getTime() - ms).toISOString();
  assert.equal(gecenSure(once(10 * 1000), simdi), 'şimdi');
  assert.equal(gecenSure(once(5 * 60 * 1000), simdi), '5 dk önce');
  assert.equal(gecenSure(once(2 * 3600 * 1000), simdi), '2 saat önce');
  /* İleri tarihli damga (sunucu sapması) "şimdi" — negatif sayı yazılmıyor. */
  assert.equal(gecenSure(new Date(simdi.getTime() + 60000).toISOString(), simdi), 'şimdi');
  assert.equal(gecenSure('bozuk', simdi), '');
});

test('dün ve gün farkı takvim gününe göre', () => {
  /*
    YEREL SAATLE KURULUYOR

    "Dün" takvim günü farkı demek, 24 saat değil. Test UTC damgasıyla
    kurulsaydı çalıştığı makinenin saat dilimine göre sonuç değişirdi —
    tam olarak kaçınmak istediğimiz hata.
  */
  const simdi = new Date(2026, 7, 31, 9, 0, 0);
  const saatOnce = (s) => new Date(simdi.getTime() - s * 3600 * 1000).toISOString();

  /* Aynı takvim günü: saat cinsinden yazılıyor. */
  assert.equal(gecenSure(saatOnce(4), simdi), '4 saat önce');
  /* Bir önceki takvim günü. */
  assert.equal(gecenSure(saatOnce(20), simdi), 'dün');
  /* İki gün önce: gün cinsinden. */
  assert.equal(gecenSure(saatOnce(48), simdi), '2 gün önce');
  /* Bir haftadan eski: takvim tarihi — "412 saat önce" kimseye bir şey söylemiyor. */
  assert.match(gecenSure(saatOnce(24 * 20), simdi), /Ağu/);
});

/* ------------------------------------------------ 6. derin bağlantı */

test('bildirim ilgili kaydı açıyor, genel sayfaya atmıyor', () => {
  assert.match(goc, /'\/sirket\/basvuranlar\?aday=' \|\| p_basvuru::text/);
  assert.match(goc, /'\/profil\?basvuru=' \|\| p_basvuru::text/);
  assert.match(oku('src/components/ApplicationsTrackerView.tsx'), /acilacakBasvuru/);
  assert.match(oku('src/sirket/AdayIzgarasi.tsx'), /acilacakAday/);
});

test('açılacak panel başvurunun durumundan çıkıyor', () => {
  const ogrenci = oku('src/components/ApplicationsTrackerView.tsx');
  assert.match(ogrenci, /kayit\.status === 'interview_scheduled'\) setDavetAcik/);
  assert.match(ogrenci, /kayit\.status === 'offer_extended'\) setTeklifAcik/);
});

/* ------------------------------------------- 7. gürültü üretilmiyor */

test('önemsiz olaylar bildirim üretmiyor', () => {
  /* CV, profil, not, ilan kaydı gibi şeyler bildirim değil. */
  for (const yasak of ['cv_snapshot_path', 'company_feedback', 'cover_letter', 'match_score']) {
    assert.ok(
      !new RegExp(`new\\.${yasak}\\s+is distinct`).test(goc),
      `gürültü bildirimi: ${yasak}`,
    );
  }
});

test('yeni cron kurulmadı', () => {
  assert.ok(!/cron/i.test(goc), 'bildirim için zamanlanmış iş kurulmuş');
});

/* ------------------------------------- 8. ZİL: TETİKLEYİCİ VE PANEL */

/*
  P0 REGRESYONU

  Zil görünüyordu, rozet doğru sayıyordu, tıklama durumu değiştiriyordu
  ama PANEL AÇILMIYORDU. Ölçüldü: tetikleyici sağlam — gerçek
  `<button type="button">`, 44×44, `pointer-events: auto`, merkez
  koordinatındaki elementFromPoint düğmenin içinde ve tıklama paneli
  fikstürde açıyor.

  Eksik olan RENDER'dı: merkez yalnızca işveren panelinin döndüğü dalda
  bağlanmıştı, öğrenci tarafındaki hiçbir dalda mount edilmiyordu.
*/

test('zili gösteren her dünyada panel de mount ediliyor', () => {
  const app = oku('src/App.tsx');
  /*
    Öğrenci tarafı: panel üst çubukla AYNI ifadeye bağlı. Zili çizen her
    dal paneli de çiziyor; ikisi ayrı düşemiyor.
  */
  assert.match(app, /\{ogrenciBildirimleri\}/, 'öğrenci tarafında panel mount edilmiyor');
  assert.match(app, /const ogrenciBildirimleri = bildirim\.acik \?/);
  /* İşveren tarafı kendi dalında. */
  assert.match(app, /\{bildirim\.acik && \(\s*<BildirimMerkezi/);
});

test('iki dünyada da zil aynı bileşenden geliyor', () => {
  assert.match(header, /<BildirimDugmesi/);
  assert.match(oku('src/sirket/SirketKabugu.tsx'), /<BildirimDugmesi/);
});

test('zil gerçek button ve hedefi 44px', () => {
  assert.match(merkez, /type="button"/);
  /* Dışarıdan gelen sınıf geometriyi düşüremiyor: şablon dizede sabit. */
  assert.match(merkez, /`relative flex h-11 w-11 shrink-0 cursor-pointer/);
});

test('rozet tıklamayı yutmuyor', () => {
  assert.match(merkez, /pointer-events-none absolute -right-0\.5/);
});

test('dış tıklama kapatıyor ama açan tıklamayı yakalamıyor', () => {
  /*
    Klasik hata: düğme tıklaması paneli açıyor, aynı tıklama belgeye
    bağlı dış-tıklama dinleyicisine ulaşıp paneli anında kapatıyor.
    Burada belge dinleyicisi YOK — kapatan şey panelle birlikte çizilen
    bir örtü, yani açan tıklamadan sonra var oluyor. setTimeout gibi bir
    gecikme oyunu da yok.
  */
  assert.match(merkez, /className="fixed inset-0 z-\[190\]/);
  assert.match(merkez, /onClick=\{onKapat\}/);
  assert.ok(
    !/addEventListener\('(click|mousedown|pointerdown)'/.test(merkez),
    'belgeye bağlı dış-tıklama dinleyicisi açan tıklamayı yakalayabilir',
  );
  assert.ok(!/setTimeout/.test(merkez), 'zamanlayıcı ile sıra oyunu yapılmış');
});

test('panel örtünün üstünde', () => {
  /* Örtü z-190, panel z-200: panel örtünün altında kalıp tıklanamaz olmuyor. */
  assert.match(merkez, /z-\[200\]/);
});

test('Escape kapatıyor, klavye ile açılıyor', () => {
  assert.match(merkez, /e\.key === 'Escape'/);
  /* Enter/Space yerli `button` davranışı: elle tuş yakalama yok. */
  assert.ok(!/onKeyDown/.test(merkez), 'yerli düğme davranışı elle taklit ediliyor');
});

/* -------------------------------------------- 9. RLS regresyon kapsamı */

test('regresyon bildirim sınırlarını ölçüyor', () => {
  const beklenen = [
    'Yeni basvuru sirket uyesine bildirim uretti',
    'Ogrenci kendi basvurusu icin bildirim almadi',
    'Gorusme daveti ogrenciye bildirim uretti',
    'Gorusme yaniti sirkete bildirim uretti',
    'Teklif ogrenciye bildirim uretti',
    'Teklif yaniti sirkete bildirim uretti',
    'Ayni durum tekrar yazilinca ikinci bildirim yok',
    'Kendi aksiyonu icin bildirim uretilmedi',
    'B, A bildirimlerini goremez',
    'B, A bildirimini okundu yapamaz',
    'Okunmamis sayisi yalniz kendi kayitlarini sayiyor',
    'Kullanici kendine bildirim uyduramaz',
    'Kullanici bildirim basligini degistiremez',
  ];
  for (const ad of beklenen) {
    assert.ok(sql.includes(ad), `RLS regresyonunda eksik: ${ad}`);
  }
});
