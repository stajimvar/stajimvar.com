import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/Header.tsx", "utf8");

test("Keşfet rotasında İlanlar sekmesi aktif kalmaz", () => {
  assert.match(
    source,
    /const ilanlardaMi = !rehberdeMi && !firsatlardaMi && !kesfetteMi && !kurumsalSayfada/,
  );
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
