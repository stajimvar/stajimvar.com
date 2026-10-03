import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
  ŞİRKET İLANINA PLATFORM İÇİ BAŞVURU — ARAYÜZ TARAFI

  Veritabanı tarafı (bildirim yalnız `internal` başvuruda, Realtime
  yayını) `basvuru-bildirimi-canli.test.mjs` içinde gerçek Postgres'te
  sınanıyor. Bu dosya arayüzdeki dört kopukluğu bağlıyor:

    1. Açık panelde bildirim anında görünmüyordu: kanca Realtime'a
       abone değildi, sayaç yalnız açılışta okunuyordu.
    2. Başvuranlar ekranı açıkken gelen başvurunun bildirimine dokununca
       kart açılmıyordu: liste yalnız panel açılışında yükleniyordu.
    3. Misafir "StajımVar ile Başvur"a basıp giriş yapınca başvuru
       penceresi açılmıyordu: niyet yazılmıyordu.
    4. Çift tıklama aynı olay döngüsünde iki gönderim yapabiliyordu.

  Kaynak metni okunuyor ama YORUMLAR DÜŞÜRÜLEREK: yorumlar neyin neden
  yapılmadığını da anlatıyor ("olaydan sayaç artırılsaydı…") ve o cümleleri
  kod sanmak tam da açıklamayı yasaklamak olurdu.
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');
const koddan = (metin) => metin.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const kanca = koddan(oku('src/lib/useBildirimler.ts'));
const kancaHam = oku('src/lib/useBildirimler.ts');
const panel = koddan(oku('src/sirket/SirketPaneli.tsx'));
const app = koddan(oku('src/App.tsx'));
const pencere = koddan(oku('src/components/ApplyDialog.tsx'));

/** `bas` ile başlayan ilk bloğu, süslü parantezleri sayarak keser. */
function blok(metin, bas) {
  const i = metin.indexOf(bas);
  assert.ok(i >= 0, `bulunamadı: ${bas}`);
  const ac = metin.indexOf('{', i + bas.length - 1);
  let derinlik = 0;
  for (let j = ac; j < metin.length; j += 1) {
    if (metin[j] === '{') derinlik += 1;
    else if (metin[j] === '}') {
      derinlik -= 1;
      if (derinlik === 0) return metin.slice(i, j + 1);
    }
  }
  throw new Error(`kapanmayan blok: ${bas}`);
}

/* ------------------------------------------- 1. kanca Realtime'a abone */

test('kanca bildirimleriDinle ile abone oluyor ve temizlikte kapatıyor', () => {
  assert.match(kanca, /import \{[^}]*bildirimleriDinle[^}]*\} from '\.\/bildirim'/);
  assert.match(kanca, /const aboneligiKapat = bildirimleriDinle\(kullaniciId, \{ degisti: tazele, baglandi: tazele \}\)/);
  /* Aynı etkinin temizliğinde kapatılıyor; oturum değişince eski kanal kalmıyor. */
  const etki = kanca.slice(kanca.indexOf('const aboneligiKapat'));
  const temizlik = etki.slice(etki.indexOf('return () => {'));
  assert.match(temizlik, /aboneligiKapat\(\);/);
  assert.match(temizlik, /kapandi = true;/);
  assert.match(temizlik, /clearTimeout\(zamanlayici\)/);
  /* Abonelik oturumsuzken kurulmuyor. */
  assert.match(kanca, /if \(!kullaniciId\) return;\s*let kapandi = false;/);
});

test('olaydan sayaç artırılmıyor, sunucudan yeniden okunuyor', () => {
  /* Okunmamış sayısını değiştiren yalnız üç yer var: sunucu yanıtı, okundu ve tümü okundu. */
  const setler = kanca.match(/setOkunmamis\([^;]*\);/g) ?? [];
  for (const s of setler) {
    assert.ok(!/\+\s*1|\+\+|o \+/.test(s), `sayaç olaydan artırılıyor: ${s}`);
  }
  assert.match(kanca, /const sayi = await okunmamisSayisi\(\);/);
  /* Olay işleyicisi yük almıyor; yalnız tazeleme planlıyor. */
  const tazele = blok(kanca, 'const tazele = () =>');
  assert.match(tazele, /void sayiyiTazele\(\);/);
  assert.match(tazele, /if \(acikRef\.current\) void listeyiTazele\(\);/);
  assert.ok(!/payload|new\b|\.new/.test(tazele), 'olay yükü okunuyor');
});

test('arka arkaya olaylar tek tazelemede birleşiyor', () => {
  assert.match(kanca, /const BIRLESTIRME_MS = 300;/);
  const tazele = blok(kanca, 'const tazele = () =>');
  assert.match(tazele, /clearTimeout\(zamanlayici\)/);
  assert.match(tazele, /setTimeout\(/);
});

test('visibilitychange ve online dinleyicileri ekleniyor ve sökülüyor', () => {
  assert.match(kanca, /document\.addEventListener\('visibilitychange', gorunurlukDegisti\)/);
  assert.match(kanca, /document\.removeEventListener\('visibilitychange', gorunurlukDegisti\)/);
  assert.match(kanca, /window\.addEventListener\('online', tazele\)/);
  assert.match(kanca, /window\.removeEventListener\('online', tazele\)/);
  /* Sekme gizlenirken değil, görünür olunca tazeleniyor. */
  assert.match(kanca, /document\.visibilityState === 'visible'\) tazele\(\)/);
});

test('yanıt yarışı: yalnız son isteğin sonucu uygulanıyor', () => {
  const sayi = blok(kanca, 'const sayiyiTazele = React.useCallback(async () =>');
  assert.match(sayi, /const sira = \+\+sayiSirasi\.current;/);
  assert.match(sayi, /if \(sira !== sayiSirasi\.current\) return;\s*setOkunmamis\(sayi\);/);
  const liste = blok(kanca, 'const listeyiTazele = React.useCallback(async () =>');
  assert.match(liste, /const sira = \+\+listeSirasi\.current;/);
  assert.match(liste, /if \(sira !== listeSirasi\.current\) return;\s*setBildirimler\(liste\);/);
  /* Oturum değişince sıra ilerliyor: eski kullanıcının geç yanıtı yazılmıyor. */
  const temizlik = kanca.slice(kanca.indexOf('aboneligiKapat();'));
  assert.match(temizlik, /sayiSirasi\.current \+= 1;\s*listeSirasi\.current \+= 1;/);
});

test('eski "Realtime kullanılmıyor" yorumu kalktı', () => {
  assert.ok(!/REALTIME KULLANILMIYOR/.test(kancaHam), 'eskimiş yorum duruyor');
  assert.match(kancaHam, /Olay yükü KULLANILMIYOR/);
});

/* ------------------------------- 2. panel: listede olmayan aday için tek okuma */

test('açılacak aday listede yoksa başvurular bir kez sessizce okunuyor', () => {
  const etki = panel.slice(
    panel.indexOf("if (!acilacakAday || durum !== 'hazir' || !baglam) return;"),
    panel.indexOf('}, [acilacakAday, durum, baglam, basvurular]);'),
  );
  assert.ok(etki.length > 0, 'bekleyen aday etkisi yok');
  assert.match(etki, /if \(basvurular\.some\(\(k\) => k\.id === acilacakAday\)\) return;/);
  /* Sessiz: `yukle` (iskelet ekranı) çağrılmıyor, durum değiştirilmiyor. */
  assert.ok(!/yukle\(\)/.test(etki), 'bütün panel yeniden yükleniyor');
  assert.ok(!/setDurum\(/.test(etki), 'panel yükleniyor durumuna çekiliyor');
  assert.match(etki, /basvuruKartlari\(baglam\.companyId\)/);
  /* Kimlik başına tek istek: ref ile takip, yoldayken bekleniyor. */
  assert.match(etki, /if \(onceki\?\.id === acilacakAday\) \{[\s\S]*?if \(onceki\.bitti\) gosterilemiyor\(\);\s*return;/);
  assert.match(etki, /yenidenYuklenenAday\.current = takip;/);
});

test('yeniden okumadan sonra da yoksa döngü yok, dürüst cümle var', () => {
  const etki = panel.slice(panel.indexOf('const gosterilemiyor = () =>'));
  assert.match(etki, /setAdayUyarisi\('Bu başvuru şu anda görüntülenemiyor\.'\);\s*onAdayAcildi\?\.\(\);/);
  assert.match(etki, /if \(!kartlar\.some\(\(k\) => k\.id === takip\.id\)\) gosterilemiyor\(\);/);
  /* Başvuru göremeyen kademede istek atılmadan söyleniyor. */
  assert.match(etki, /if \(!baglam\.companyId \|\| !adayGorebilir\(baglam\.kademe\)\) \{\s*gosterilemiyor\(\);/);
  /* Okuma hatası "görüntülenemiyor" sayılmıyor; ayrı cümle. */
  assert.match(etki, /Başvurular yenilenemedi\./);
});

test('yükleme ve sessiz okuma aynı kart dönüşümünü kullanıyor', () => {
  assert.match(panel, /async function basvuruKartlari\(companyId: string\)/);
  assert.match(panel, /setBasvurular\(await basvuruKartlari\(b\.companyId\)\);/);
  assert.equal((panel.match(/kartVerisi\(s, \{ yetenekler \}\)/g) ?? []).length, 1, 'kart dönüşümü iki yerde');
});

test('uyarı erişilebilir ve kapatma düğmesi 44 piksel', () => {
  assert.match(panel, /role="status"/);
  assert.match(panel, /onClick=\{\(\) => setAdayUyarisi\(null\)\}\s*className=\{IKINCIL_DUGME\}/);
  assert.match(oku('src/sirket/renk.ts'), /export const IKINCIL_DUGME =\s*'inline-flex min-h-11/);
});

/* --------------------------------------- 3. misafir başvurusu niyet yazıyor */

test('handleApplyToJob misafirde niyet yazıyor', () => {
  const fn = blok(app, 'const handleApplyToJob = (');
  assert.match(
    fn,
    /if \(!session\) \{\s*handleOpenLogin\(\{ tur: 'ic', ilanId: listing\.id, yol: window\.location\.pathname, baslik: listing\.title \}\);\s*return;/,
  );
  /* İkinci bir mekanizma yok: sessionStorage'a buradan doğrudan yazılmıyor. */
  assert.ok(!/sessionStorage/.test(fn), 'niyet handleOpenLogin dışından yazılıyor');
});

test('devam etkisi ilanı yedekten getiriyor ve kimliği tam eşleştiriyor', () => {
  const etki = app.slice(app.indexOf('const niyet = niyetOku(window.sessionStorage);'));
  const ic = etki.slice(0, etki.indexOf('}, [sessionReady, session, allListings, basvurularYuklenen]);'));
  assert.ok(ic.length > 0, 'devam etkisi bulunamadı');
  assert.match(ic, /allListings\.find\(\(l\) => l\.id === niyet\.ilanId\)/);
  assert.match(ic, /await fetchListingByIdPrefix\(niyet\.ilanId\.slice\(0, 8\)\)/);
  assert.match(ic, /getirilen && getirilen\.id === niyet\.ilanId \? getirilen : null/);
});

test('başvuru listesi yüklenmeden karar verilmiyor', () => {
  const ic = app.slice(app.indexOf('const niyet = niyetOku(window.sessionStorage);'));
  /* Platform içi niyet, liste bu kullanıcı için yüklenene kadar silinmiyor. */
  const bekle = ic.indexOf('if (basvurularYuklenen !== session.userId) return;');
  const sil = ic.indexOf('niyetSil(window.sessionStorage);', ic.indexOf("session.role === 'company'") + 80);
  assert.ok(bekle > 0, 'liste beklenmiyor');
  assert.ok(sil > bekle, 'niyet liste yüklenmeden siliniyor');
  assert.match(app, /\.finally\(\(\) => \{\s*if \(!cancelled\) setBasvurularYuklenen\(session\.userId\);/);
});

test('zaten başvurulmuşsa ya da ilan internal değilse pencere açılmıyor', () => {
  const ic = app.slice(app.indexOf('const niyet = niyetOku(window.sessionStorage);'));
  const govde = ic.slice(0, ic.indexOf('}, [sessionReady, session, allListings, basvurularYuklenen]);'));
  const yol = govde.indexOf("if (basvuruYolu(ilan).anaEylem !== 'platform-ici') return;");
  const zaten = govde.indexOf("showToast('Bu ilana zaten başvurdun.');");
  const ac = govde.indexOf('setApplyTarget({ listing: ilan, matchScore: 0 });');
  assert.ok(yol > 0 && zaten > 0 && ac > 0, 'koşullardan biri eksik');
  assert.ok(yol < ac && zaten < ac, 'pencere koşullardan önce açılıyor');
  assert.match(govde, /if \(basvurulmus\) \{\s*showToast\('Bu ilana zaten başvurdun\.'\);\s*return;/);
});

/* ---------------------------------------------- 4. çift tıklama kilidi */

test('ApplyDialog gönderimi ref kilidiyle koruyor', () => {
  assert.match(pencere, /const gonderiliyorRef = useRef\(false\);/);
  const gonder = blok(pencere, 'const handleSubmit = async () =>');
  assert.match(gonder, /if \(gonderiliyorRef\.current\) return;\s*gonderiliyorRef\.current = true;/);
  assert.match(gonder, /finally \{\s*gonderiliyorRef\.current = false;/);
  /* Kilit `onSubmit`ten ÖNCE kuruluyor. */
  assert.ok(gonder.indexOf('gonderiliyorRef.current = true') < gonder.indexOf('await onSubmit'));
});

test('sunucu ikinci başvuruyu reddederse öğrencinin listesi tazeleniyor', () => {
  const gonder = blok(app, 'const submitApplication = async (');
  assert.match(gonder, /catch \(hata\) \{\s*void basvurulariTazele\(activeStudent\.id\);\s*throw hata;/);
  const tazele = blok(app, 'const basvurulariTazele = React.useCallback(async (');
  assert.match(tazele, /await fetchStudentApplications\(kullaniciId\)/);
  /* Başka kullanıcıya geçildiyse eski yanıt yazılmıyor. */
  assert.match(tazele, /if \(oturumKimligiRef\.current === kullaniciId\) setApplications\(satirlar\);/);
});
