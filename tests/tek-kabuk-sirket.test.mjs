import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

/*
  TEK KABUK — ŞİRKET HESABI (kullanıcı kararı, 18 Eylül 2026)

  Ayrı işveren paneli kalktı. Şirket hesabı öğrenciyle AYNI kabuğu
  (Header + alt menü İlanlar · Fırsatlar · Ağım · Rehber · Profil)
  kullanıyor; yalnız İlanlar ve Profil şirketin kendi ekranlarına gidiyor,
  Fırsatlar salt okunur, Ağım dürüst boş durum.

  Bu testler kaynak üzerinden okuyor: bileşenler oturum ve Supabase
  istemcisi istiyor, jsdom kurulu değil. Ölçülen şey, kabuğun ve
  sekmelerin doğru koşula bağlı olması; tarayıcı ölçümü ayrı yapıldı
  (src/dev/SirketPanelDevFixture + Playwright).
*/

const oku = (yol) => readFileSync(yol, 'utf8');
const APP = oku('src/App.tsx');
const HEADER = oku('src/components/Header.tsx');
const FIRSATLAR = oku('src/components/OpportunitiesPage.tsx');
const REHBER = oku('src/components/RehberMerkezi.tsx');
const KIMLIK = oku('src/sirket/SirketKimlikKarti.tsx');

test('şirket ekranları ortak kabukta; eski kabuk ve eski portal sekmeleri yok', () => {
  /* Eski tam sayfa kabuk silindi. */
  assert.equal(existsSync('src/sirket/SirketKabugu.tsx'), false, 'SirketKabugu geri gelmiş');
  assert.doesNotMatch(APP, /SirketKabugu/);

  /* Panel öteki sayfalar gibi icerikSayfasi (Header + alt menü) içinde. */
  assert.match(APP, /icerikSayfasi\(\s*<main className=\{anaAlanSinifi\}>\s*<SirketPaneli/);
  /* Kabuk rolü gerçek oturum rolünden; Header'a bu gidiyor. */
  assert.match(APP, /const kabukRolu: 'student' \| 'company' = session\?\.role === 'company' \? 'company' : 'student';/);
  assert.match(APP, /userRole=\{kabukRolu\}/);
  /* Eski /sirket (Genel) → /sirket/ilanlar; öğrenci görünümüne geçiş düğmesi şirkette yok. */
  assert.match(APP, /if \(temizYol === '\/sirket'\) \{\s*navigate\('\/sirket\/ilanlar', \{ degistir: true \}\);/);
  assert.match(APP, /onDunyaDegistir=\{kabukRolu === 'company' \? undefined : sirketDunyasinaGec\}/);
  /* Şirket için /  ve /cv kendi karşılıklarına. */
  assert.match(APP, /if \(temizYol === '\/' \|\| temizYol === '\/sirket'\) navigate\('\/sirket\/ilanlar', \{ degistir: true \}\);/);
  assert.match(APP, /navigate\('\/sirket\/profil', \{ degistir: true \}\)/);

  /* Header: şirket alt menüsü beş sekme, doğru adreslerle; eski portal öğeleri kalmadı. */
  const altCubuk = HEADER.slice(HEADER.indexOf('aria-label="Mobil Alt Şirket Navigasyon"'));
  const hrefler = [...altCubuk.matchAll(/href="([^"]+)"/g)].map((e) => e[1]);
  assert.deepEqual(hrefler, ['/sirket/ilanlar', '/firsatlar', '/agim', '/rehber', '/sirket/profil']);
  const kod = HEADER.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const iz of ['nav-company-kanban', '%80+ Uyum', 'companyDropdownOpen', 'Şirket Portalından Çıkış', 'Kanban']) {
    assert.ok(!kod.includes(iz), `${iz} hâlâ Header'da`);
  }
  /* "İŞVEREN" rozeti korunuyor; masaüstünde hesap bağlantısı /sirket/profil. */
  assert.match(HEADER, /\{sirketKabugu && \(\s*<span[^>]*font-mono[^>]*>\s*İşveren/);
  assert.match(HEADER, /data-testid="header-sirket-hesabi"/);
  /* Öğrenci alt menüsü DEĞİŞMEDİ: aynı sıra, aynı adresler. */
  const ogrenci = HEADER.slice(HEADER.indexOf('aria-label="Mobil Alt Navigasyon"'), HEADER.indexOf('aria-label="Mobil Alt Şirket Navigasyon"'));
  assert.deepEqual([...ogrenci.matchAll(/href="([^"]+)"/g)].map((e) => e[1]), ['/', '/firsatlar', '/baglantilar', '/rehber']);
});

test('şirket sekmeleri dürüst: Fırsatlar salt okunur, Ağım tek boş kart, Rehber şirket yazısı üstte', () => {
  /* Fırsatlar: kişisel süzgeç ve kaydet şirkette çizilmiyor; kayıt listesi sorulmuyor. */
  assert.match(APP, /saltOkunur=\{kabukRolu === 'company'\}/);
  assert.match(FIRSATLAR, /banaUygunVar=\{!saltOkunur && hazirSayisi > 0\}/);
  assert.match(FIRSATLAR, /kaydedilenVar=\{!saltOkunur && Boolean\(userId\)\}/);
  assert.match(FIRSATLAR, /onKaydet=\{filters\.arsiv \|\| saltOkunur \? undefined : \(\) => kaydiDegistir\(item\)\}/);
  assert.match(FIRSATLAR, /userId && !saltOkunur \? fetchSavedOpportunityIds\(userId\)/);

  /*
    Ağım: takipçi listesi (18 Eylül 2026). Boş kart yalnız sunucu sıfır
    dediğinde; sayı yok, "yakında" yok. Liste bileşeni `SirketAgim`.
  */
  assert.match(APP, /kabukRolu === 'company' && \/\^\\\/\(agim\|baglantilar\)\(\\\/\|\$\)\/\.test\(temizYol\)/);
  assert.match(APP, /<SirketAgim userId=\{session\?\.userId \?\? null\} onNavigate=\{navigate\} \/>/);
  const agim = KIMLIK.slice(KIMLIK.indexOf('export const SirketAgimBos'));
  assert.match(agim, /Henüz seni takip eden yok/);
  assert.doesNotMatch(agim, /yakında|henüz açık değil|\b0 takipçi|tabular-nums/i);

  /*
    Profil: şirket sayfası artık SirketProfili (tests/sirket-profil-sayfasi.test.mjs).
    Eski kimlik kartı bu dosyada yok; yalnız fikstür sarmalayıcısı ve Ağım boş kartı duruyor.
  */
  assert.doesNotMatch(KIMLIK, /export const SirketKimlikKarti/);
  assert.match(KIMLIK, /export const SirketProfilSekmesi/);
  assert.match(KIMLIK, /<SirketProfili\s/);

  /* Rehber: şirket hesabında şirketler için rehber kartı listenin başında, öğrencide sonunda. */
  assert.match(REHBER, /<section aria-label="Rehberler"[^>]*>\s*\{sirketHesabi && sirketRehberKarti\}/);
  assert.match(REHBER, /\{!sirketHesabi && sirketRehberKarti\}\s*<\/section>/);
  assert.match(APP, /sirketHesabi=\{kabukRolu === 'company'\}/);
});
