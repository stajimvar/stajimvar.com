import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  ADAY KARTI VE ADAY PROFILI

  Isverenin gordugu liste bir veri kaydi gibi duruyordu ve adayin
  profilini inceleyecek bir yer yoktu. Testler iki seyi koruyor:
  gosterilen alanlarin ogrenciye SOYLENMIS olmasi ve avatarin ortak
  kaynaktan gelmesi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

const GOC = oku('supabase/migrations/20261114010000_aday_profili.sql');
const KART = oku('src/sirket/SirketAdaylar.tsx');
const PROFIL = oku('src/sirket/SirketAdayProfili.tsx');
const ANAHTAR = oku('src/components/ArayisKartlari.tsx');

test('avatar ortak kaynaktan, yeni alan acilmadi', () => {
  /*
    Aday listesine ozel bir avatar alani acmak, ogrenci fotografini
    degistirdiginde listenin eski fotografta kalmasi demekti.
  */
  assert.ok(GOC.includes("'avatarYolu', s.avatar_path"), 'social_profiles.avatar_path okunmali');
  assert.ok(!GOC.includes('aday_avatar'), 'ayri avatar sutunu acilmamali');
  for (const [ad, k] of [['kart', KART], ['profil', PROFIL]]) {
    assert.ok(k.includes('ProfilFotografi'), ad + ' ortak avatar bilesenini kullanmali');
  }
});

test('mobilde avatar 56-64 px ve yuvarlak', () => {
  assert.ok(KART.includes('h-14 w-14 shrink-0 rounded-full sm:h-16 sm:w-16'),
            'kartta 56 px, sm ustunde 64 px, yuvarlak');
});

test('etiketler en fazla uc, fazlasi +N', () => {
  assert.ok(KART.includes('const ETIKET_SINIRI = 3'), 'sinir uc olmali');
  assert.ok(KART.includes('slice(0, ETIKET_SINIRI)'), 'ilk uc gosterilmeli');
  assert.ok(KART.includes('+{kalan}'), 'kalan +N ile kapanmali');
});

test('iki CTA: once profil, sonra e-posta', () => {
  assert.ok(KART.includes('Profili incele'), 'ana CTA olmali');
  assert.ok(KART.includes('E-posta gönder'), 'ikincil CTA korunmali');
  /* Mevcut e-posta akisi bozulmadi. */
  assert.ok(KART.includes('href={`mailto:${ogrenci.eposta}`}'), 'mailto akisi ayni kalmali');
  /* Ana eylem dolu mavi, e-posta kenarlikli. */
  assert.ok(KART.includes('bg-blue-600'), 'ana CTA dolu mavi');
});

test('profil sayfasi aday profiline goturuyor', () => {
  assert.ok(KART.includes('onNavigate(`/sirket/aday/${id}`)'), 'kart profil adresine gitmeli');
  const APP = oku('src/App.tsx');
  const ARA = oku('functions/_middleware.ts');
  assert.ok(APP.includes("'/sirket/aday'"), 'App rotayi tanimali');
  assert.ok(ARA.includes("'/sirket/aday'"), 'ara katman rotayi kapsamali');
});

test('gosterilen alanlar ogrenciye SOYLENMIS', () => {
  /*
    Anahtarin metni rizanin kendisi. Sirket tarafina alan eklenip metin
    guncellenmezse, ogrenciye soylenmemis veri paylasilmis olur.
  */
  for (const soz of ['profil fotoğrafın', 'hakkında', 'becerilerin', 'projelerin', 'portföy']) {
    assert.ok(ANAHTAR.includes(soz), 'riza metni "' + soz + '" icermeli');
  }
});

test('riza disindaki alanlar donmuyor', () => {
  /* Telefon, not ortalamasi, CV dosyasi ve tercihler kasitli olarak disarida. */
  const fn = GOC.slice(GOC.indexOf('function public.aday_profili'));
  for (const alan of ['phone', 'gpa', 'cv_path,', 'pref_']) {
    assert.ok(!fn.includes(alan), alan + ' donmemeli');
  }
  assert.ok(fn.includes("'cvVar'"), 'CV yalniz VAR/YOK olarak donmeli');
});

test('arayisi kapali ogrencinin profili acilmiyor', () => {
  /*
    Kimligi bilen bir sirket, ogrenci anahtari kapattiktan sonra profili
    acabilmemeli.
  */
  const fn = GOC.slice(GOC.indexOf('function public.aday_profili'));
  assert.ok(fn.includes('(sp.is_arayan or sp.staj_arayan)'), 'arayis sarti olmali');
  assert.ok(fn.includes('sirket_dogrulandi'), 'dogrulanmis sirket kapisi olmali');
  assert.ok(GOC.includes('revoke all on function public.aday_profili(uuid) from public, anon'));
});

test('bos alan icin yer tutucu yazilmiyor', () => {
  /*
    "Belirtilmemis" demek, orada bir sey oldugunu ima etmek olurdu.
    Yorumlar cikariliyor: dosyanin kendi aciklamasinda bu sozcuk geciyor.
  */
  const yorumsuz = PROFIL.replace(/\/\*[\s\S]*?\*\//g, ' ');
  assert.ok(!yorumsuz.includes('Belirtilmemiş'), 'yer tutucu metin olmamali');
  assert.ok(PROFIL.includes('{aday.tanitim && ('), 'hakkinda yalniz doluysa cizilmeli');
  assert.ok(PROFIL.includes('{aday.projeler.length > 0 && ('), 'projeler yalniz varsa cizilmeli');
});

test('alt bilgi metni kisaldi', () => {
  assert.ok(KART.includes('Yalnızca işverenlere görünmeyi açan öğrenciler listelenir.'));
});

test('sekmeler ve sayac mantigi degismedi', () => {
  assert.ok(KART.includes("veri?.stajArayan"), 'staj sayaci durmali');
  assert.ok(KART.includes("veri?.isArayan"), 'is sayaci durmali');
  assert.ok(KART.includes('grid grid-cols-2 gap-2'), 'iki esit sekme durmali');
});

test('sinif olarak yazilmiyor -- deger zaten "2. Sinif"', () => {
  /*
    Canlida olculdu: student_profiles.grade_level METIN ve icinde "Sinif"
    sozcugu var ("2. Sınıf", "Yüksek Lisans / Mezun"). Sayi sanip sonuna
    "sinif" eklemek "2. Sınıf. sınıf" ve "Yüksek Lisans / Mezun. sınıf"
    uretiyordu -- ekran goruntusunde de oyleydi.
  */
  for (const [ad, k] of [['kart', KART], ['profil', PROFIL]]) {
    assert.ok(!k.includes('}. sınıf`'), ad + ' sinifi sayi gibi bicimlememeli');
  }
  const q = oku('src/lib/queries/index.ts');
  assert.ok(!q.includes('sinif: number | null'), 'tip metin olmali');
});

test('ogrenci girdisi adresler suzuluyor -- javascript: calismiyor', () => {
  /*
    Portfoy, LinkedIn ve proje adreslerini OGRENCI giriyor. Ham degeri
    href e koymak, "javascript:" yazan bir ogrencinin kodunu tiklayan
    ISVERENIN oturumunda calistirmak demekti (arka plan guvenlik
    incelemesi bildirdi, 27 Eylul 2026).
  */
  assert.ok(PROFIL.includes("import { guvenliDisAdres }"), 'suzgec ice aktarilmali');
  assert.ok(PROFIL.includes('const guvenli = guvenliDisAdres(adres);'), 'adres suzulmeli');
  assert.ok(PROFIL.includes('if (!guvenli) return null;'), 'suzgecten gecmeyen baglanti cizilmemeli');
  assert.ok(PROFIL.includes('href={guvenli}'), 'href yalniz suzulmus adresi almali');
  assert.ok(!PROFIL.includes('href={adres}'), 'ham adres href e girmemeli');
});

test('github kullanici adi bicimi dogrulaniyor', () => {
  /* Alanda adres degil kullanici adi var ve o da serbest metin. */
  assert.ok(PROFIL.includes('gecerliGithub'), 'dogrulanmis ad kullanilmali');
  assert.ok(!PROFIL.includes('github.com/${aday.github}'), 'ham ad adrese gomulmemeli');
});

test('goc numarasi en son gocten buyuk', () => {
  /*
    Ilk denemede 20261104010000 secilmisti; o numara sirket_dogrulama_kuyrugu
    tarafindan coktan kullanilmisti ve CI "migration history divergence" ile
    db push u durdurdu. Dogru davranis -- yarim bir durum yayina cikmadi --
    ama numarayi bastan dogru secmek gerekiyordu.
  */
  const dizin = path.join(KOK, 'supabase/migrations');
  const hepsi = fs.readdirSync(dizin).filter((f) => f.endsWith('.sql')).sort();
  const benim = hepsi.filter((f) => f.includes('aday_profili'));
  assert.equal(benim.length, 1, 'tek aday_profili gocu olmali');
  assert.equal(hepsi[hepsi.length - 1], benim[0], 'aday_profili en son goc olmali');

  /* Ayni surum numarasi iki dosyada olmamali. */
  const surumler = hepsi.map((f) => f.split('_')[0]);
  assert.equal(new Set(surumler).size, surumler.length, 'surum numarasi tekrar etmemeli');
});
