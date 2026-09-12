import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/Header.tsx", "utf8");

test("adres sekmeyi eziyor: rehber, fırsat, kurumsal ve sosyal sayfalarda İlanlar sönük", () => {
  assert.match(
    source,
    /const ilanlardaMi = !rehberdeMi && !firsatlardaMi && !kurumsalSayfada && !sosyaldeMi && activeTab === 'internships'/,
  );
});

/*
  KEŞFET NAVİGASYONDAN KALKTI (11 Eylül 2026)

  Göç 20260926120000: 163 kaydın hiçbiri kariyer etkinliği değildi
  (konser 57, festival 52, sergi 29, tiyatro 19, atölye 5, müze 1);
  bölüm arşive alındı, adres _redirects ile /firsatlar'a gidiyor.
  Yerine sosyal ağın girişi "Ağım" geldi; bugün /baglantilar.
*/
test("alt çubuk sırası İlanlar · Fırsatlar · Ağım · Rehber · Profil; Keşfet yok", () => {
  const altCubuk = source.slice(source.indexOf('aria-label="Mobil Alt Navigasyon"'), source.indexOf('aria-label="Mobil Alt Şirket Navigasyon"'));
  const etiketler = [...altCubuk.matchAll(/aria-label="([^"]+)"/g)].map((e) => e[1]).filter((e) => e !== 'Mobil Alt Navigasyon');
  assert.deepEqual(etiketler, ['Staj ilanları', 'Öğrenci fırsatları', 'Ağım', 'Öğrenci rehberi', 'İşveren tarafı', 'Profilim']);
  const hrefler = [...altCubuk.matchAll(/href="([^"]+)"/g)].map((e) => e[1]);
  assert.deepEqual(hrefler, ['/', '/firsatlar', '/baglantilar', '/rehber']);
  /* Keşfet'in izi yok: adres, bayrak, etiket, ikon. Yorumlar atılıyor: kalkışı ANLATAN not kalabilir, kod kalamaz. */
  const kod = source.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const iz of ['/kesfet', 'kesfetteMi', 'onOpenDiscover', 'Etkinlikler', 'Compass']) {
    assert.ok(!kod.includes(iz), `${iz} hâlâ Header'da`);
  }
  /* Masaüstünde de aynı sıra. */
  const ust = source.slice(source.indexOf('id="nav-tab-internships"'), source.indexOf('id="nav-tab-guides"'));
  assert.match(ust, /id="nav-tab-opportunities"[\s\S]+id="nav-tab-network"\s+href="\/baglantilar"/);
});

test("Ağım yalnız /baglantilar'ta yanıyor; /profil/* ve Profil ayrı, her an tek sekme", () => {
  assert.match(source, /const agimdaMi = \/\^\\\/baglantilar\(\\\/\|\$\)\/\.test\(bulunulanYol\);/);
  /* Ağım'da Profil sönük: sekme durumu 'profile' kalsa bile adres eziyor. */
  assert.match(source, /const profildeMi = cvEkranindaMi \|\| \(!rehberdeMi && !kurumsalSayfada && !agimdaMi && activeTab === 'profile'\)/);
  assert.match(source, /aria-label="Ağım"\s*aria-current=\{agimdaMi \? 'page' : undefined\}/);
  /* /baglantilar sosyal küme içinde, yani İlanlar da sönük (ilanlardaMi !sosyaldeMi). */
  assert.match(source, /const sosyaldeMi = \/\^\\\/\(cv\|profil\|topluluklar\|baglantilar\)\(\\\/\|\$\)\/\.test\(bulunulanYol\);/);
});

test("sosyal rotada (/cv) İlanlar sönük, Profil aktif; aria-current görselle aynı", () => {
  /* /cv'de activeTab 'internships' kalıyor; adres sekmeyi ezmeli, iki sekme birden yanmamalı. */
  assert.match(source, /const profildeMi = cvEkranindaMi \|\|/);
  assert.match(source, /aria-label="Profilim"\s*aria-current=\{profildeMi \? 'page' : undefined\}/);
});

test("üst arama rehberde rehber arıyor, başka yerde ilan; Keşfet dalı yok", () => {
  assert.match(source, /rehberSayfasindaMi\s*\? 'Rehberlerde ara'\s*: 'Pozisyon veya şirket ara'/);
  assert.match(source, /if \(rehberSayfasindaMi\) return;/);
});

test("şeritte masaüstünde dört kart yan yana durur", () => {
  const serit = readFileSync("src/ui/Serit.tsx", "utf8");
  /*
    Genişlik oranla veriliyor: (100% - 3 boşluk) / 4. Beşliydi; şerit o
    zaman sayfanın tamamını kaplıyordu. Süzgeç paneli sola alınınca şerit
    9 sütuna indi ve beş kart 200 pikselin altına düşüyordu — afiş okunmaz
    oluyordu. Sabit piksel yerine oran, çünkü kabın genişliği sayfaya göre
    değişiyor.
  */
  assert.match(serit, /lg:w-\[calc\(\(100%-3rem\)\/4\)\]/);
});

/*
  HESAP DÜĞMESİ MENÜ AÇMIYOR

  Üst çubuktaki "ad · Öğrenci hesabı" düğmesi beş satırlık bir açılır menü
  açıyordu; beş satırın beşinin karşılığı zaten /cv ekranında duruyor.
  Düğme artık doğrudan oraya giden gerçek bir bağlantı. Menü kalktığı
  için masaüstünde çıkış ve yönetim panelinin TEK yeri /cv sayfası; ikinci
  iddia o sayfanın bunları gerçekten çizdiğini kaynaktan ölçüyor.
*/
test("üst çubuktaki hesap düğmesi menü açmıyor, /cv'ye giden gerçek bağlantı", () => {
  const basi = source.indexOf('data-testid="header-hesap-baglantisi"');
  assert.ok(basi > 0, "hesap bağlantısı bulunamadı");
  const dugme = source.slice(basi - 200, basi + 1200);

  /* Gerçek <a href>: orta tuş ve "yeni sekmede aç" tarayıcıya kalıyor. */
  assert.match(dugme, /<a\s+href="\/cv"/);
  assert.match(dugme, /onClick=\{baglantiTiklamasi\(\(\) => \{\s*if \(onOpenProfilVeCv\) \{\s*onOpenProfilVeCv\(\);/);
  /* Erişilebilir ad hedefi söylüyor, bir menüyü değil. */
  assert.match(dugme, /aria-label=\{`Profilim ve CV — /);
  assert.match(dugme, /title="Profilim ve CV"/);
  assert.match(dugme, /aria-current=\{cvEkranindaMi \? 'page' : undefined\}/);

  /* Menü nitelikleri, menünün kendisi ve aşağı ok bu düğmeden gitti. */
  assert.doesNotMatch(dugme, /aria-haspopup/);
  assert.doesNotMatch(dugme, /aria-expanded/);
  assert.doesNotMatch(dugme, /ChevronDown/);
  assert.doesNotMatch(source, /desktop-profile-menu/);
  assert.doesNotMatch(source, /profileDropdownOpen/);
  /* Alttan açılan hesap paneli de bu düğmenin tek tetikleyicisiydi; artık bağlı değil. */
  assert.doesNotMatch(source, /<AccountSheet/);
  assert.doesNotMatch(source, /from '\.\/AccountSheet'/);
});

test("/cv ekranı çıkışı her öğrenciye, yönetim panelini yalnız yöneticiye çiziyor", () => {
  const profil = readFileSync("src/components/StudentProfileView.tsx", "utf8");
  const app = readFileSync("src/App.tsx", "utf8");

  /* App /cv'de aynı ekranı çiziyor ve iki prop'u da geçiyor. */
  assert.match(app, /return icerikSayfasi\(<main className=\{anaAlanSinifi\}>\{ogrenciProfilEkrani\(\)\}<\/main>\);/);
  assert.match(app, /const ogrenciProfilEkrani = \(\) =>[\s\S]{0,1200}onLogout=\{handleLogout\}[\s\S]{0,200}isAdmin=\{isAdmin\}[\s\S]{0,200}onOpenAdmin=\{\(\) => navigate\('\/yonetim'\)\}/);

  /* Çıkış yalnız `onLogout` varlığına bağlı — yönetici koşulu yok. */
  assert.match(profil, /\{!duzenleme && \(onLogout \|\| \(isAdmin && onOpenAdmin\)\) && \(/);
  assert.match(profil, /\{onLogout && \([\s\S]{0,500}Çıkış yap/);
  /* Yönetim paneli yalnız yöneticide DOM'a giriyor. */
  assert.match(profil, /\{isAdmin && onOpenAdmin && \([\s\S]{0,500}Yönetim paneli/);
});

/*
  SOSYAL SAYFALARDA ÜST ARAMA KİŞİ ARIYOR

  /cv sağ sütununda "Kullanıcı adıyla ara" kutusu, üst çubukta "Pozisyon
  veya şirket ara" duruyordu: aynı ekranda iki kutu, ikisi farklı şey
  arıyor. Burs ve rehberdeki kalıp izlendi — tek kutu, bulunulan sayfaya
  göre davranıyor. Yazılan metin ilan süzgecine (`onSearchChange`)
  GİTMİYOR: o çağrı App'te boş olmayan her terimde ana sayfaya götürüyor
  ve kişi arayan kullanıcıyı /cv'den atardı.
*/
test("sosyal sayfada üst arama kişi arıyor ve ilan süzgecine yazmıyor", () => {
  assert.ok(
    source.includes("const sosyaldeMi = /^\\/(cv|profil|topluluklar|baglantilar)(\\/|$)/.test(bulunulanYol);"),
  );
  assert.match(source, /sosyaldeMi\s*\? 'Kullanıcı adıyla ara'/);
  assert.match(source, /sosyaldeMi\s*\? 'Kişi ara'/);
  /* Değer ve değişim yerel duruma bağlı; `onSearchChange` sosyal dalda çağrılmıyor. */
  assert.ok(source.includes("value={sosyaldeMi ? kisiSorgusu : (searchQuery ?? '')}"));
  assert.match(
    source,
    /if \(sosyaldeMi\) \{\s*setKisiSorgusu\(e\.target\.value\);\s*setKisiListesiAcik\(true\);\s*return;\s*\}\s*onSearchChange\?\.\(e\.target\.value\);/,
  );
  /* Odaklanınca ilan sekmesine geçiş sosyal dalda çalışmıyor. */
  assert.match(
    source,
    /onFocus=\{\(\) => \{\s*if \(sosyaldeMi\) \{[\s\S]{0,120}return;\s*\}\s*if \(rehberSayfasindaMi\) return;/,
  );
  /* Sonuç mantığı kopyalanmadı: ortak parça çiziliyor; oturumsuz ve şirket hesabında kutu yok. */
  assert.ok(source.includes("import { KullaniciAramaSonuclari } from './sosyal/KullaniciArama';"));
  assert.ok(
    source.includes(
      "sosyaldeMi && isLoggedIn && userRole === 'student' && activeTab !== 'company-portal' && Boolean(onNavigate)",
    ),
  );
  /* Sayfadan çıkınca sorgu sıfırlanıyor. */
  assert.match(source, /useEffect\(\(\) => \{\s*setKisiSorgusu\(''\);\s*setKisiListesiAcik\(false\);\s*\}, \[bulunulanYol\]\)/);
  /* App gezinmeyi geçiyor; geçmeseydi kutu hiç çizilmezdi. */
  const app = readFileSync("src/App.tsx", "utf8");
  assert.match(app, /<Header[\s\S]{0,6000}onNavigate=\{navigate\}/);
});
