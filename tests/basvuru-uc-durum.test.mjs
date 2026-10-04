import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  basvuruKarari,
  MESAJ_ILAN_KAPALI,
  MESAJ_SIRKET_HESABI,
} from '../src/lib/basvuru-devam.mjs';

/*
  #309 SONRASI ÜÇ DURUM — APP'TEKİ BAĞLANTI

  Karar tablosunun kendisi `basvuru-devam.test.mjs` içinde. Burada
  tablonun App'e DOĞRU bağlandığı sınanıyor; çünkü üç hata da tablonun
  değil bağlantının hatasıydı:

    1. Oturum açık, profil HENÜZ yükleniyor → kayıt penceresi açılıyordu.
       `student === null` hem "yükleniyor" hem "yok" demekti.
    2. Şirket hesabıyla dönen niyet SESSİZCE siliniyordu.
    3. Giriş sırasında kapanan ilan sessizce geçiliyordu; ilan girişten
       ÖNCE yüklenmiş bayat listeden okunuyordu.

  Ayrıca: `/cv` oturumu açık ama profili olmayan kişiye "giriş yapın"
  diyordu, ve toast içerik sayfalarında (ilan sayfası dahil) hiç
  çizilmiyordu — yani üç durumun cümleleri ilan sayfasında görünmezdi.

  Kaynak YORUMLARI DÜŞÜRÜLEREK okunuyor: yorumlar eski hatayı da
  anlatıyor ve o cümleleri kod sanmak açıklamayı yasaklamak olurdu.
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');
const koddan = (metin) =>
  metin.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const app = koddan(oku('src/App.tsx'));
const kart = koddan(oku('src/components/OgrenciProfiliOlustur.tsx'));

const arasi = (bas, son) => {
  const i = app.indexOf(bas);
  assert.ok(i >= 0, `bulunamadı: ${bas}`);
  const j = app.indexOf(son, i + bas.length);
  assert.ok(j > i, `bitiş bulunamadı: ${son}`);
  return app.slice(i, j);
};

const tiklama = arasi('const handleApplyToJob = (', 'React.useEffect(');
const uygula = arasi('const basvuruKarariniUygula = (', 'const handleApplyToJob = (');
const ver = arasi('const basvuruKarariVer = (', 'const basvuruKarariniUygula = (');
const devam = arasi('const niyet = niyetOku(window.sessionStorage);', '}, [sessionReady, session]);');
const bekleyenEtki = arasi('const b = bekleyenBasvuru;', '}, [bekleyenBasvuru, session, profilDurumu, basvurularYuklenen, applications]);');

const temel = {
  oturumVar: true,
  rol: 'student',
  profil: 'hazir',
  basvurularHazir: true,
  zatenBasvurdu: false,
  ilan: 'bulundu',
  platformIci: true,
  acik: true,
};

/* ------------------------------------------------ TEK KARAR, İKİ GİRİŞ */

test('tıklama ve giriş sonrası devam aynı kararı kullanıyor', () => {
  assert.match(tiklama, /const karar = basvuruKarariVer\(listing, 'bulundu'\);/);
  assert.match(ver, /basvuruKarari\(\{/);
  /* Devam etkisi kendisi karar vermiyor; bekleyen başvuruya devrediyor. */
  assert.match(devam, /kaynak: 'niyet'/);
  assert.match(bekleyenEtki, /const karar = basvuruKarariVer\(b\.ilan, b\.ilanDurumu\);/);
  assert.match(bekleyenEtki, /basvuruKarariniUygula\(karar, b\);/);
  /* Eski ayrı zincir kalmadı: devam etkisinde ne pencere açılıyor ne rol soruluyor. */
  assert.ok(!/setApplyTarget\(/.test(devam), 'devam etkisi pencereyi kendisi açıyor');
  assert.ok(!/session\.role === 'company'/.test(devam), 'devam etkisinde ayrı şirket dalı duruyor');
  assert.ok(!/applications\.some/.test(devam), 'devam etkisinde ayrı "zaten başvurdu" dalı duruyor');
  /* Pencereyi açan tek yer `ac` kararı. */
  assert.equal((app.match(/setApplyTarget\(\{ listing: b\.ilan/g) ?? []).length, 1);
});

/* ---------------------------------------- 1. profil yüklenirken bekleme */

test('profil yüklenirken kayıt penceresi açılmıyor, başvuru bekletiliyor', () => {
  assert.equal(basvuruKarari({ ...temel, profil: 'yukleniyor' }).tur, 'bekle');
  assert.ok(!/setIsAuthModalOpen/.test(tiklama), 'tıklama kayıt penceresini doğrudan açıyor');
  assert.ok(!/setIsAuthModalOpen/.test(uygula), 'karar uygulaması kayıt penceresini doğrudan açıyor');
  assert.ok(!/activeStudent/.test(tiklama), 'tıklama hâlâ `activeStudent` boşluğunu "profil yok" sayıyor');
  assert.match(
    tiklama,
    /if \(karar\.tur === 'bekle' && session\) \{\s*setBekleyenBasvuru\(\{[\s\S]*?kaynak: 'tik',\s*\}\);\s*return;/,
  );
});

test('bekleyen başvuru tek seferlik ve oturuma bağlı', () => {
  assert.match(bekleyenEtki, /if \(!session \|\| session\.userId !== b\.kullanici\) \{\s*setBekleyenBasvuru\(null\);\s*return;/);
  /*
    4 Ekim 2026: `bekle` dalı artık "Profilin yükleniyor…" cümlesini de
    söylüyor (iki yol için tek yerden, bkz. basvuru-kapali-ilan testi);
    şart aynı: beklerken kayıt düşmüyor, karar verilince düşüyor.
  */
  assert.match(bekleyenEtki, /if \(karar\.tur === 'bekle'\) \{[\s\S]*?return;\s*\}\s*setBekleyenBasvuru\(null\);/);
  assert.match(bekleyenEtki, /if \(uygulananAnahtar\.current === b\.anahtar\) return;/);
});

test('profil durumu yükleniyor / hazır / yok / hata ayrımı yapıyor', () => {
  assert.match(app, /durum: 'hazir' \| 'yok' \| 'hata';/);
  /* Yüklenen sonuç kullanıcıya bağlı; başka oturumun sonucu "yükleniyor" sayılıyor. */
  assert.match(
    app,
    /const profilDurumu: 'yukleniyor' \| 'hazir' \| 'yok' \| 'hata' =\s*session && profilYuklenen\?\.kullanici === session\.userId \? profilYuklenen\.durum : 'yukleniyor';/,
  );
  const oturumEtkisi = arasi('const profilSahibi = session.userId;', 'setBasvurularYuklenen(null);');
  assert.match(oturumEtkisi, /durum: profile \? 'hazir' : 'yok'/);
  /* Okuma hatası "yok" sayılmıyor. */
  assert.match(oturumEtkisi, /\.catch\(\(\) => \{[\s\S]*?durum: 'hata'/);
  assert.match(ver, /profil: profilDurumu,/);
});

test('profil yoksa yeniden kayıt değil profil tamamlama', () => {
  const dal = uygula.slice(uygula.indexOf("case 'profil-yok':"), uygula.indexOf("case 'bekle':"));
  assert.match(dal, /showToast\(karar\.mesaj \?\? ''\);/);
  assert.match(dal, /navigate\('\/cv'\);/);
  assert.ok(!/handleOpenLogin|setAuthModalMode|setIsAuthModalOpen/.test(dal), 'profil yokken giriş/kayıt isteniyor');
});

/* ------------------------------------------------- 2. şirket hesabı */

test('şirket hesabının niyeti sessizce silinmiyor, mesaj gösteriliyor', () => {
  const karar = basvuruKarari({ ...temel, rol: 'company', profil: 'yukleniyor' });
  assert.equal(karar.tur, 'sirket-hesabi');
  assert.equal(karar.mesaj, MESAJ_SIRKET_HESABI);
  /* `sirket-hesabi` varsayılan dala düşüyor: pencere yok, cümle var. */
  assert.ok(!/case 'sirket-hesabi'/.test(uygula), 'şirket dalı ayrıca ele alınmış — mesajı kontrol et');
  assert.match(uygula, /default:\s*showToast\(karar\.mesaj \?\? ''\);/);
  assert.match(ver, /rol: session\?\.role \?\? null,/);
});

/* --------------------------------------------- 3. ilan kapanmış/kalkmış */

test('devamda ilan her zaman sunucudan okunuyor, tam kimlik eşleşiyor', () => {
  assert.match(devam, /fetchListingByIdPrefix\(niyet\.ilanId\.slice\(0, 8\)\)/);
  assert.match(devam, /getirilen && getirilen\.id === niyet\.ilanId \? getirilen : null/);
  assert.match(devam, /ilanDurumu: ilan \? 'bulundu' : 'bulunamadi'/);
  assert.ok(!/allListings/.test(devam), 'girişten önce yüklenmiş bayat liste kullanılıyor');
});

test('ilan bulunamazsa "artık başvuru kabul etmiyor", pencere yok', () => {
  for (const fark of [{ ilan: 'bulunamadi' }, { acik: false }, { platformIci: false }]) {
    const karar = basvuruKarari({ ...temel, ...fark });
    assert.equal(karar.tur, 'kapali', JSON.stringify(fark));
    assert.equal(karar.mesaj, MESAJ_ILAN_KAPALI);
  }
});

test('ağ hatası kapalı sayılmıyor, ayrı cümleyle söyleniyor', () => {
  assert.match(devam, /\.catch\(\(\) => \{[\s\S]*?showToast\(MESAJ_ILAN_OKUNAMADI\);/);
  assert.ok(!/MESAJ_ILAN_KAPALI/.test(devam), 'ağ hatası "kapalı" sayılıyor');
  assert.match(app, /const MESAJ_ILAN_OKUNAMADI = 'İlanın güncel durumu okunamadı\./);
});

test('açıklık Europe/Istanbul gününe göre, doğrudan tıklamada da soruluyor', () => {
  assert.match(ver, /acik: basvuruyaAcikMi\(ilan, istanbulGunBaslangici\(\)\.slice\(0, 10\)\)/);
  /* Tıklama ekrandaki ilanla aynı karar yolundan geçiyor; kapanmış ilanda pencere açılmıyor. */
  assert.ok(!/setApplyTarget\(/.test(tiklama), 'tıklama kararı atlayıp pencereyi açıyor');
});

/* -------------------------------------------- /cv: profil oluşturma */

test('/cv oturumu açık, profili olmayan kişiye "giriş yapın" demiyor', () => {
  const cv = arasi("if (temizYol === '/cv' || temizYol === '/cv/yazdir') {", "if (temizYol === '/cv/yazdir') {");
  const profilDali = cv.indexOf("if (!student && session && session.role !== 'company' && profilDurumu !== 'hazir') {");
  const girisMetni = cv.indexOf('Profilin için giriş yapın');
  assert.ok(profilDali > 0, 'oturumlu profilsiz dal yok');
  assert.ok(girisMetni > profilDali, '"giriş yapın" oturumlu kişiden önce çiziliyor');
  assert.match(cv, /<OgrenciProfiliOlustur\s+durum=\{profilDurumu\}\s+onOlustur=\{ogrenciProfiliniOlustur\}/);
  assert.ok(!/giriş yap/i.test(kart), 'profil oluşturma kartı giriş istiyor');
  assert.match(kart, /Öğrenci profilini oluştur/);
});

test('profil oluşturma ogrenciProfiliniAc çağırıyor ve düzenleme adımını açıyor', () => {
  const fn = arasi('const ogrenciProfiliniOlustur = async () => {', 'const ogrenciProfiliniYenidenOku = () => {');
  assert.match(fn, /await ogrenciProfiliniAc\(kullanici\);/);
  assert.match(fn, /setStudent\(profil\);\s*setProfilYuklenen\(\{ kullanici, durum: 'hazir' \}\);/);
  assert.match(fn, /setCvAkisi\(\{\s*baslangic: 'form',/);
  /* Bekleyen başvuru varsa "İlana dön" kararı yeniden veriyor. */
  assert.match(fn, /yenidenKarar: bekleyen \? \{ matchScore: bekleyen\.matchScore \} : undefined/);
  /*
    Başvuru penceresi `/cv` rotasında çizilmiyor: karar verilmeden önce
    ilanın sayfasına dönülüyor (taklitle ölçüldü: dönüşte pencere ilanın
    sayfasında açıldı).
  */
  assert.match(
    app,
    /if \(ilan && yenidenKarar\) \{\s*navigate\(`\/ilan\/\$\{listingSlug\(ilan\)\}`\);\s*handleApplyToJob\(ilan, yenidenKarar\.matchScore\);/,
  );
});

test('profil kartı dört durumu ayırıyor ve çift tıklamayı kilitliyor', () => {
  assert.match(kart, /durum === 'yukleniyor'/);
  assert.match(kart, /durum === 'hata'/);
  assert.match(kart, /durum === 'yok'/);
  assert.match(kart, /Profilin yüklenemedi/);
  assert.match(kart, /if \(kilit\.current\) return;\s*kilit\.current = true;/);
  assert.match(kart, /role="alert"/);
});

/* ---------------------------------------- toast içerik sayfalarında da */

test('toast içerik sayfalarında (ilan sayfası dahil) çiziliyor', () => {
  const kabuk = arasi('const icerikSayfasi = (icerik: React.ReactNode', ');\n');
  assert.match(kabuk, /\{toastBandi\}/);
  assert.match(app, /const toastBandi = toastMessage \? \(\s*<div\s+role="status"/);
  assert.equal((app.match(/\{toastBandi\}/g) ?? []).length, 2, 'toast iki kabukta birden çizilmeli');
});
