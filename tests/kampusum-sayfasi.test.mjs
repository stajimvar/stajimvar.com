import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { uygulamaBolumuMu, belgeSayfasiMi, kenardaTutulabilirMi } from '../src/lib/onbellek-politikasi.mjs';

/*
  TELEFON BAŞLIĞI: KAMPÜSÜM DÜĞMESİ VE /kampusum (kullanıcı isteği, 25 Eylül 2026)

  "Sol üstteki butonları kaldıralım, mobilde StajımVar'a tıklayınca
  anasayfaya gitsin, yeni üniversite butonu tarzı bir şey olsun."

  Sol üstteki ana sayfa simgesi ve `/cv`deki fotoğraf paylaşma simgesi
  kalktı; logo zaten ana sayfaya gidiyor. Yerine yalnız oturumu açık
  öğrencide çizilen Kampüsüm bağlantısı geldi; `/kampusum` profil
  sayfalarındaki paneli (`KampusumPaneli`) tek başına çiziyor.

  Bileşenler oturum ve Supabase istiyor, jsdom yok; iddialar kaynak
  üzerinden. Tarayıcıda ölçüldü (Chromium, 390 / 1440): ziyaretçi dalı
  gerçek istemciyle; öğrenci ve şirket dalları Supabase yanıtları geçici
  bir service worker ile taklit edilerek (gerçek oturum değil). 390'da
  logo merkezi değişikliğin önünde ve sonunda aynı (187,6 / 195,2),
  Kampüsüm 44 × 44, /kampusum'da aria-current="page" ve seçili sekme
  yok; 1440'ta başlığın görünen öğeleri piksel piksel aynı.
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const kod = (m) => m.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const HEADER = oku('src/components/Header.tsx');
const APP = oku('src/App.tsx');
const SAYFA = oku('src/components/kampus/KampusumSayfasi.tsx');
const ARA_KATMAN = oku('functions/_middleware.ts');

/** Telefon başlığının sol kümesi: `lg:hidden` kaptan arama/süzgeç yorumuna kadar. */
function solKume() {
  const bas = HEADER.indexOf('SOL KÜME — TELEFONDA MARKANIN SOLU');
  const son = HEADER.indexOf('ARAMA VE SÜZGEÇ — YALNIZ TELEFONDA');
  assert.ok(bas > 0 && son > bas, 'sol küme bulunamadı');
  return HEADER.slice(bas, son);
}

test('sol üstte ana sayfa ve fotoğraf paylaşma simgesi yok; logo ana sayfaya gidiyor ve ortada', () => {
  const kume = kod(solKume());
  /* Ev simgesi ve onun "İlanları yenile" dalı kodda yok (yorumda kalkışı anlatılıyor). */
  assert.doesNotMatch(kod(HEADER), /<Home\b|\bHome,/);
  assert.doesNotMatch(kod(HEADER), /İlanları yenile|Ana sayfa: staj ilanları|Ana sayfa: ilanların/);
  assert.doesNotMatch(kod(HEADER), /window\.location\.reload\(\)/);
  assert.doesNotMatch(kume, /href=\{anaAdres\}/);
  assert.doesNotMatch(HEADER, /FotografPaylasGirisi/);
  /* Simgenin ön koşulu da gitti: okuyanı kalmayan durum ve prop ölü kod olurdu. */
  assert.doesNotMatch(HEADER, /sosyalPaylasabilir/);
  assert.doesNotMatch(kod(APP), /sosyalPaylasabilir|setSosyalPaylasabilir/);

  /* Logo: aynı adres, aynı mutlak ortalama; `lg:` üstünde eski hizası. */
  assert.match(HEADER, /<Logo\s+href=\{anaAdres\}/);
  assert.match(HEADER, /const anaAdres = sirketKabugu \? '\/sirket\/ilanlar' : '\/';/);
  assert.match(
    HEADER,
    /className=\{`absolute left-1\/2 top-1\/2 flex -translate-x-1\/2 -translate-y-1\/2 items-center shrink-0 lg:static lg:translate-x-0 lg:translate-y-0 \$\{/,
  );
  /* Kaldırma gerekçesi yorumda. */
  assert.match(HEADER, /ANA SAYFA VE FOTOĞRAF PAYLAŞMA SİMGELERİ KALDIRILDI\s*\n\s*\(kullanıcı isteği, 25 Eylül 2026\)/);
});

test('Kampüsüm: gerçek bağlantı, yalnız oturumu açık öğrencide, telefonda, 44 piksel, görünür odak', () => {
  const kume = solKume();
  const bas = kume.indexOf("{solAksiyon === 'kampus'");
  assert.ok(bas > 0, 'Kampüsüm dalı bulunamadı');
  const dal = kume.slice(bas, kume.indexOf('</a>', bas) + 4);

  /*
    Ziyaretçide RPC `anon`a kapalı; şirket kabuğunda öğrenci profili
    yüklenmiyor. Koşulun dört parçası da şart — biri düşerse düğme
    işe yaramadığı bir hesapta çizilir.
  */
  assert.match(dal, /^\{solAksiyon === 'kampus' && onNavigate && \(/);
  assert.match(
    HEADER,
    /const kampusDugmesiCizilsin =\s*isLoggedIn && userRole === 'student' && Boolean\(activeStudent\) && profilKumesindeMi;/,
  );
  assert.match(dal, /<a\s+href=\{kampusYolu\}/);
  assert.match(dal, /aria-label=\{profilAdi \? 'Bu kişinin kampüsü' : 'Kampüsüm'\}/);
  assert.match(dal, /aria-current=\{kampustaMi \? 'page' : undefined\}/);
  /* Sol tık uygulama içi, orta tuş / değiştirici tuş tarayıcıya. */
  assert.match(dal, /onClick=\{baglantiTiklamasi\(\(\) => onNavigate\(kampusYolu\)\)\}/);
  assert.match(dal, /h-11 w-11/);
  assert.match(dal, /lg:hidden/);
  assert.match(dal, /\$\{ODAK_HALKASI\}/);
  /* Aktif görünüm alt çubuktaki seçili öğeyle aynı renk çifti. */
  assert.match(dal, /kampustaMi \? 'bg-blue-50 text-blue-600' : 'text-gray-800 hover:bg-gray-100'/);
  /* İkon tek başına bilgi taşımıyor; ad `aria-label`da. Kep değil: kullanıcı üst çubukta kep simgesini istemedi. */
  assert.match(dal, /<University aria-hidden className="h-6 w-6" \/>/);
  assert.doesNotMatch(HEADER, /GraduationCap/);

  /* Adres sekmeyi eziyor: /kampusum'da İlanlar da Profil de sönük. */
  assert.ok(HEADER.includes("const kampustaMi = /^\\/kampusum(\\/|$)/.test(bulunulanYol);"));
  assert.match(HEADER, /!sosyaldeMi && !kampustaMi && activeTab === 'internships'/);
  assert.match(HEADER, /!agimdaMi && !kampustaMi && activeTab === 'profile'/);
});

/*
  SOLDA EN ÇOK BİR BAĞLAMSAL AKSİYON (mobil sadeleştirme, 25 Eylül 2026)

  Önce Kampüsüm ilan ve fırsat dışındaki her sayfada, mesaj düğmesi de her
  sayfada soldaydı; /cv'de iki, ilanlarda süzgeçle iki düğme yan yana
  çiziliyordu. Karar: İlanlar'da süzgeç, Ağım ailesinde (ve /mesajlar)
  mesajlar, Profil ailesinde (/cv, /profil/<ad>, /kampusum) Kampüs; öteki
  sayfalarda sol boş.

  Aşağıdaki ifadeler Header kaynağından okunup çalıştırılıyor; adres
  listesi elle yazılmış bir kopya değil, dosyadaki kalıbın kendisi.
*/
function solAksiyon(yol, { ilanlardaMi = false, suzgecVar = false, ogrenci = true } = {}) {
  const ifade = (ad) => {
    const m = HEADER.match(new RegExp(`const ${ad}(?::[^=]+)? =\s*([^;]+);`));
    assert.ok(m, `${ad} bulunamadı`);
    return m[1];
  };
  const govde = `
    const agimdaMi = ${ifade('agimdaMi')};
    const profilKumesindeMi = ${ifade('profilKumesindeMi')};
    const mesajKumesindeMi = ${ifade('mesajKumesindeMi')};
    const mesajDugmesiCizilsin = ${ifade('mesajDugmesiCizilsin')};
    const kampusDugmesiCizilsin = ${ifade('kampusDugmesiCizilsin')};
    return (${ifade('solAksiyon')});
  `;
  return new Function('bulunulanYol', 'ilanlardaMi', 'sayfaAramasi', 'isLoggedIn', 'userRole', 'activeStudent', 'onNavigate', govde)(
    yol,
    ilanlardaMi,
    suzgecVar ? { onSuzgec: () => {} } : null,
    ogrenci,
    'student',
    ogrenci ? {} : null,
    () => {},
  );
}

test('sol aksiyon: ilanlarda süzgeç, Ağım ve mesajlarda mesaj, profilde Kampüs, başka yerde yok', () => {
  assert.equal(solAksiyon('/', { ilanlardaMi: true, suzgecVar: true }), 'suzgec');
  for (const yol of ['/agim', '/agim/baglantilar', '/baglantilar', '/takip', '/mesajlar', '/mesajlar/ayse']) {
    assert.equal(solAksiyon(yol), 'mesaj', yol);
  }
  for (const yol of ['/cv', '/profil/ayse', '/kampusum', '/kampusum/ayse']) {
    assert.equal(solAksiyon(yol), 'kampus', yol);
  }
  for (const yol of ['/firsatlar', '/firsatlar/tubitak-2209-a', '/burslar', '/rehber', '/rehber/cv-hazirlama', '/ilan/x-3f2a1b9c']) {
    assert.equal(solAksiyon(yol), null, yol);
  }
  /* Misafirde ne mesaj ne Kampüs. */
  assert.equal(solAksiyon('/cv', { ogrenci: false }), null);
  assert.equal(solAksiyon('/agim', { ogrenci: false }), null);

  /* Sol kümede her düğme `solAksiyon`a bağlı: aynı anda ikisi çizilemiyor. */
  assert.match(HEADER, /\{solAksiyon === 'kampus' && onNavigate && \(/);
  assert.match(HEADER, /\{solAksiyon === 'suzgec' && sayfaAramasi\?\.onSuzgec && \(/);
  assert.match(HEADER, /\{!genisEkran && solAksiyon === 'mesaj' && onNavigate && \(/);
  /* Gerekçe yorumda, tarihiyle. */
  assert.match(HEADER, /SOLDA EN ÇOK BİR BAĞLAMSAL AKSİYON \(mobil sadeleştirme, 25 Eylül 2026\)/);
});

test('/kampusum rotası: /takip kalıbı, bakanın profili, onUniversiteEkle yok, gecikmeli yükleme', () => {
  assert.match(APP, /const KampusumSayfasi = React\.lazy\(\(\) =>\s*import\('\.\/components\/kampus\/KampusumSayfasi'\)/);
  assert.doesNotMatch(APP, /^import \{ KampusumSayfasi \}/m);

  const bas = APP.indexOf("if (temizYol === '/kampusum' || kampusKisisi) {");
  assert.ok(bas > 0, 'rota bulunamadı');
  const rota = APP.slice(bas, APP.indexOf('\n  }\n', bas));
  assert.match(
    rota,
    /<KampusumSayfasi\s*key=\{kampusKisisi \?\? ''\}\s*kullaniciId=\{session\?\.userId \?\? null\}\s*oturumHazir=\{sessionReady\}\s*sirketHesabi=\{kabukRolu === 'company'\}\s*ogrenci=\{student\}\s*onNavigate=\{navigate\}\s*onGirisGerekli=\{AUTH_ENABLED \? handleOpenLogin : undefined\}\s*kullaniciAdi=\{kampusKisisi\}\s*\/>/,
  );
  /* Panel o durumda kendisi `/cv#universite`e gidiyor. */
  assert.doesNotMatch(rota, /onUniversiteEkle/);
  assert.match(rota, /'bg-white sm:bg-\[#F9FAFB\]'/);
});

test('/kampusum sayfası: dört durum, panel akış yerleşiminde, adres kimlik taşımıyor', () => {
  const govde = kod(SAYFA);
  /* Sıra: oturum okunuyor → oturumsuz → şirket → panel. */
  const iskelet = govde.indexOf('if (!oturumHazir) {');
  const oturumsuz = govde.indexOf('if (!kullaniciId) {');
  const sirket = govde.indexOf('if (sirketHesabi) {');
  const panel = govde.indexOf('<KampusumPaneli');
  assert.ok(iskelet > 0 && iskelet < oturumsuz && oturumsuz < sirket && sirket < panel, 'durum sırası bozuk');

  assert.match(govde.slice(iskelet, oturumsuz), /aria-busy="true"/);
  assert.match(govde.slice(iskelet, oturumsuz), /animate-pulse/);
  /* Oturumsuz: /takip ile aynı giriş kartı ve aynı etki. */
  assert.match(govde, /if \(!oturumHazir \|\| kullaniciId\) return;\s*onGirisGerekli\?\.\(\);/);
  assert.match(govde.slice(oturumsuz, sirket), /Kampüsüm için giriş gerekiyor/);
  assert.match(govde.slice(oturumsuz, sirket), /\{onGirisGerekli && \(/);
  /* Şirket: "erişimin yok" cümlesi — "henüz içerik yok" değil. */
  assert.match(govde.slice(sirket, panel), /Kampüsüm öğrenci hesaplarına açık/);
  assert.doesNotMatch(govde.slice(sirket, panel), /<KampusumPaneli/);

  /* Panel: aynı bileşen, akış yerleşimi, `onUniversiteEkle` yok. `/kampusum/<ad>`de kullanıcı adı. */
  assert.match(govde, /<KampusumPaneli ogrenci=\{ogrenci\} onNavigate=\{onNavigate\} yerlesim="akis" kullaniciAdi=\{kullaniciAdi\} \/>/);
  assert.doesNotMatch(govde, /onUniversiteEkle/);
  /* Sayfa başlığı: görünür başlık panelin `h2`si; `h1` ekran okuyucuya. */
  assert.match(govde, /<h1 className="sr-only">\{kullaniciAdi \? 'Kampüs' : 'Kampüsüm'\}<\/h1>/);
  /* Okul/kimlik prop'u yok: okul sunucuda oturumdan çözülüyor. */
  assert.doesNotMatch(govde, /universiteId|okulAdi|ogrenciOkulu/);
});

test('/kampusum yeni sekmede açılıyor ve kenarda tutulmuyor', () => {
  /* Ön render edilmiyor; ara katman kabuğu vermezse orta tuşla açılan sekme 404 görürdü. */
  assert.match(ARA_KATMAN, /^\s*'\/kampusum',$/m);
  /* Kişiye bağlı bölüm: önbellek politikası uygulama sayıyor, belge saymıyor. */
  assert.equal(uygulamaBolumuMu('/kampusum'), true);
  assert.equal(uygulamaBolumuMu('/kampusum/'), true);
  assert.equal(belgeSayfasiMi('/kampusum'), false);
  assert.equal(kenardaTutulabilirMi({ yontem: 'GET', yol: '/kampusum', cerez: '' }), false);
});
