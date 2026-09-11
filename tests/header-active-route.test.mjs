import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/Header.tsx", "utf8");

test("Keşfet rotasında İlanlar sekmesi aktif kalmaz", () => {
  assert.match(
    source,
    /const ilanlardaMi = !rehberdeMi && !firsatlardaMi && !kesfetteMi && !kurumsalSayfada && !sosyaldeMi && activeTab === 'internships'/,
  );
});

test("sosyal rotada (/cv) İlanlar sönük, Profil aktif; aria-current görselle aynı", () => {
  /* /cv'de activeTab 'internships' kalıyor; adres sekmeyi ezmeli, iki sekme birden yanmamalı. */
  assert.match(source, /const profildeMi = cvEkranindaMi \|\|/);
  assert.match(source, /aria-label="Profilim"\s*aria-current=\{profildeMi \? 'page' : undefined\}/);
});

test("Keşfet rotasında üst arama etkinlik içeriğini arar", () => {
  assert.match(source, /kesfetteMi[\s\S]{0,80}\? 'Etkinlik, şehir veya mekân ara'/);
  assert.match(source, /if \(rehberSayfasindaMi \|\| kesfetteMi\) return/);
});

// Keşfet now has a paginated catalog. Reachability, responsive layout and
// header search are exercised against the real page in kesfet-catalog.spec.ts.

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
    /onFocus=\{\(\) => \{\s*if \(sosyaldeMi\) \{[\s\S]{0,120}return;\s*\}\s*if \(rehberSayfasindaMi \|\| kesfetteMi\) return;/,
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
