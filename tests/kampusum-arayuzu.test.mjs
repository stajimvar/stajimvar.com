import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  guvenliDisAdres,
  kampusBurslari,
  kaynakEskiMi,
  ogunEtiketi,
  UNIVERSITE_EKLE_YOLU,
} from '../src/lib/kampusum.mjs';

/*
  KAMPÜSÜM PANELİ (kullanıcı tasarımı, 25 Eylül 2026)

  Profil sayfalarında bakan öğrencinin kampüs paneli: bugünün yemeği,
  üniversite duyuruları, ona uygun ve başvurusu açık burslar. Tasarım
  görselindeki "TEMSİLİ MENÜ" / "TASARIM ÖRNEĞİ" etiketleri taslaktı;
  gerçek veride örnek içerik yok.

  Kurallar saf fonksiyonlarda (lib/kampusum.mjs) doğrudan, yerleşim ve
  yetki kaynaktan sınanıyor (jsdom yok). Tarayıcıda RPC ve fırsat
  isteği taklit edilerek ölçüldü (Chromium): 1710 ve 1440'ta üç sütun
  330 / 600 / 350, 1280'de sol sütun yok (ana 600, yan 350), 390'da sıra
  profil → panel → paylaşımlar; her genişlikte tek panel ve kampus +
  fırsat için birer istek; boş, hata, okulsuz ve kaynaksız durumları.
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const kod = (m) => m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const PANEL = oku('src/components/kampus/KampusumPaneli.tsx');
const DUZEN = oku('src/components/sosyal/ProfilSayfaDuzeni.tsx');
const GENIS = oku('src/components/sosyal/useGenisEkran.ts');
const SAYFA = oku('src/components/sosyal/SosyalProfilSayfasi.tsx');
const GORUNUM = oku('src/components/sosyal/SosyalProfilGorunumu.tsx');
const CV = oku('src/components/StudentProfileView.tsx');
const APP = oku('src/App.tsx');

/* ------------------------------------------------------------ saf kurallar */

test("öğün etiketi: 'gunluk' günün menüsü, asla Öğle; tanınmayan değere etiket yok", () => {
  assert.equal(ogunEtiketi('ogle'), 'Öğle');
  assert.equal(ogunEtiketi('aksam'), 'Akşam');
  assert.equal(ogunEtiketi('gunluk'), 'Günün menüsü');
  assert.notEqual(ogunEtiketi('gunluk'), 'Öğle');
  assert.equal(ogunEtiketi('kahvalti'), null);
  /* Bileşen öğün adını elle yazmıyor; tek kaynak yardımcı. */
  assert.doesNotMatch(kod(PANEL), /Öğle|Akşam/);
  assert.match(PANEL, /const etiket = ogunEtiketi\(ogun\.ogun\);/);
});

test('kaynak eskiliği: 3 günden eskiyse not, hiç okunmadıysa "eski" değil', () => {
  assert.equal(kaynakEskiMi('2026-09-25T05:00:00Z', '2026-09-25'), false);
  assert.equal(kaynakEskiMi('2026-09-22T05:00:00Z', '2026-09-25'), false, 'tam 3 gün eşikte');
  assert.equal(kaynakEskiMi('2026-09-21T05:00:00Z', '2026-09-25'), true);
  assert.equal(kaynakEskiMi(null, '2026-09-25'), false);
  assert.equal(kaynakEskiMi('bozuk', '2026-09-25'), false);
});

test('dış adres yalnız http(s)', () => {
  assert.equal(guvenliDisAdres('https://www.msgsu.edu.tr/menu.pdf'), 'https://www.msgsu.edu.tr/menu.pdf');
  assert.equal(guvenliDisAdres(' http://ornek.edu.tr/a '), 'http://ornek.edu.tr/a');
  assert.equal(guvenliDisAdres('javascript:alert(1)'), null);
  assert.equal(guvenliDisAdres('/goreli'), null);
  assert.equal(guvenliDisAdres(null), null);
});

const DOGRU = '2026-09-01T00:00:00Z';
const burs = (id, ek = {}) => ({
  id,
  slug: `s-${id}`,
  title: `Burs ${id}`,
  organizationName: 'Kurum',
  opportunityType: 'scholarship',
  status: 'published',
  applicationDeadline: '2026-10-10',
  educationLevels: [],
  eligibleDepartments: [],
  cities: [],
  departmentsVerifiedAt: DOGRU,
  educationLevelsVerifiedAt: DOGRU,
  citiesVerifiedAt: DOGRU,
  ...ek,
});
const OGRENCI = { gradeLevel: '3. Sınıf', department: 'Mimarlık', city: 'İstanbul' };
const SIMDI = new Date('2026-09-25T09:00:00Z');

test('burs süzgeci: son tarihsiz, geçmiş, henüz açılmamış, taslak ve burs olmayan yok', () => {
  const liste = [
    burs('tarihsiz', { applicationDeadline: undefined }),
    burs('gecmis', { applicationDeadline: '2026-09-24' }),
    burs('yakinda', { applicationStartAt: '2026-10-01', applicationDeadline: '2026-10-20' }),
    burs('taslak', { status: 'draft' }),
    burs('yarisma', { opportunityType: 'competition' }),
    burs('bugun', { applicationDeadline: '2026-09-25' }),
    burs('kyk', { opportunityType: 'kyk', applicationDeadline: '2026-10-01' }),
  ];
  assert.deepEqual(
    kampusBurslari(liste, OGRENCI, SIMDI).map((b) => b.id),
    ['bugun', 'kyk'],
  );
});

test('burs süzgeci: uygunluk "Sana Uygun" ile aynı — doğrulanmamış ve şartı tutmayan yok, sınıfsız profilde hiç yok', () => {
  const liste = [
    burs('dogrulanmamis', { departmentsVerifiedAt: undefined }),
    burs('baska-bolum', { eligibleDepartments: ['Hukuk'] }),
    burs('bolume-uygun', { eligibleDepartments: ['Mimarlık'] }),
  ];
  assert.deepEqual(kampusBurslari(liste, OGRENCI, SIMDI).map((b) => b.id), ['bolume-uygun']);
  assert.deepEqual(kampusBurslari(liste, { department: 'Mimarlık' }, SIMDI), []);
  assert.deepEqual(kampusBurslari(liste, null, SIMDI), []);
  /* Yeni kural yazılmadı: mevcut iki fonksiyon. */
  const lib = oku('src/lib/kampusum.mjs');
  assert.match(lib, /if \(!profilYeterliMi\(ogrenci\)\) return \[\];/);
  assert.match(lib, /return uyum\.durum === 'uygun_olabilir' && uyum\.kesin;/);
});

test('burs süzgeci: en yakın son tarih önce, en çok 3', () => {
  const liste = ['2026-12-01', '2026-10-01', '2026-11-01', '2026-09-30'].map((t, i) =>
    burs(String(i), { applicationDeadline: t }),
  );
  assert.deepEqual(
    kampusBurslari(liste, OGRENCI, SIMDI).map((b) => b.applicationDeadline),
    ['2026-09-30', '2026-10-01', '2026-11-01'],
  );
});

/* ------------------------------------------------------------ bileşen */

test('örnek içerik ve taslak etiketi yok', () => {
  assert.doesNotMatch(kod(PANEL), /TEMS[İI]L|TASARIM ÖRNE|örnek|ornek|placeholder|lorem/i);
});

test('menü yalnız `menu` doluyken; kaynak null ise bölüm hiç yok', () => {
  assert.match(PANEL, /\{menu && menu\.ogunler\.length > 0 \? \(/);
  assert.match(PANEL, /\{veri && veri\.universite && veri\.menuKaynagi && \(\s*<YemekBolumu/);
  assert.match(PANEL, /\{veri && veri\.universite && veri\.duyuruKaynagi && \(\s*<DuyuruBolumu/);
  /* Okulun kaynağı yoksa tek satır; yemek ve duyuru bölümü yok. */
  assert.match(PANEL, /\{veri && veri\.ogrenciOkulu && !veri\.universite && \(/);
  /* Hiç okunmamış kaynak "yok" demiyor. */
  assert.match(PANEL, /kaynak\.sonBasariAni \? 'Bugün için yayımlanmış menü yok\.' : 'Menü kaynağı henüz okunamadı\.'/);
  assert.match(PANEL, /kaynak\.sonBasariAni \? 'Son 30 günde duyuru yok\.' : 'Duyuru kaynağı henüz okunamadı\.'/);
});

test('okulsuz öğrenciye "Üniversiteni ekle": gerçek adres, /cv içinde doğrudan düzenleme', () => {
  assert.equal(UNIVERSITE_EKLE_YOLU, '/cv#universite');
  assert.match(PANEL, /\{veri && !veri\.ogrenciOkulu && \(/);
  assert.match(PANEL, /href=\{UNIVERSITE_EKLE_YOLU\}/);
  assert.match(PANEL, /if \(onUniversiteEkle\) onUniversiteEkle\(\);\s*else onNavigate\(UNIVERSITE_EKLE_YOLU\);/);
  /* /cv tarafı: işaret okununca okul bölümü açılıyor, odak üniversite alanına. */
  assert.match(CV, /window\.location\.hash !== '#universite'/);
  assert.match(CV, /kisiselAc\(\);\s*requestAnimationFrame\(\(\) => document\.getElementById\('universite'\)\?\.focus\(\)\);/);
  assert.match(CV, /<AutocompleteField\s+id="universite"/);
});

test('panel BAKAN öğrencinin verisiyle: okul prop olarak girmiyor, bakılan profilin okulu kullanılmıyor', () => {
  /* Bileşen okul ya da profil almıyor; okul RPC'de oturumdan. */
  assert.match(PANEL, /\}> = \(\{ ogrenci, onNavigate, onUniversiteEkle, yerlesim \}\) => \{/);
  assert.match(PANEL, /kampusumuGetir\(\)/);
  /* Ziyaretçi sayfası: bakan öğrenci kapısı ve bakanın kendi profili. */
  assert.match(SAYFA, /kullaniciId && profil && !profil\.sirketId \? \(\s*<KampusumPaneli ogrenci=\{bakanOgrenci\}/);
  const kampusDali = SAYFA.slice(SAYFA.indexOf('const bakanKampusu'), SAYFA.indexOf(') : undefined;', SAYFA.indexOf('const bakanKampusu')));
  assert.doesNotMatch(kampusDali, /ziyaretci/);
  assert.match(APP, /bakanOgrenci=\{student\}/);
  /* /cv: bakan sahibin kendisi. */
  assert.match(CV, /<KampusumPaneli\s+ogrenci=\{student\}/);
});

test('görünmeyen yerleşimde DOM\'a girmiyor: sol sütun kancayla, ana sütundaki kopya tersi koşulla', () => {
  assert.match(GENIS, /export const SOL_SUTUN_SORGUSU = '\(min-width: 1440px\)';/);
  assert.match(DUZEN, /export function useSolSutunAcik\(\): boolean \{\s*return useGenisEkran\(SOL_SUTUN_SORGUSU\);/);
  assert.match(DUZEN, /const sol = solAcik && solSutun \? solSutun : null;/);
  assert.match(DUZEN, /\{sol && <SolSutun>\{sol\}<\/SolSutun>\}/);
  assert.match(SAYFA, /kampusPaneli=\{solSutunAcik \? undefined : bakanKampusu\('akis'\)\}/);
  assert.match(CV, /\{!duzenleme && !solSutunAcik && kampusPaneli\('akis'\) && \(/);
  /* CSS ile gizleme yok: gizli kopya kendi isteğini atardı. */
  for (const kaynak of [DUZEN, SAYFA, CV, PANEL]) {
    assert.doesNotMatch(kod(kaynak), /hidden min-\[1440px\]:block|hidden 2xl:block|min-\[1440px\]:hidden/);
  }
});

test('yerleşim: sol 330 yapışkan, orta 600 ve sağ 350 değişmedi; dar ekranda profil kartının altında', () => {
  assert.match(DUZEN, /export const PROFIL_SOL_SUTUNU = 'w-\[330px\] min-w-0 sticky';/);
  assert.match(DUZEN, /export const PROFIL_ANA_SUTUNU = 'w-full min-w-0 lg:max-w-\[600px\]';/);
  assert.match(DUZEN, /export const PROFIL_YAN_SUTUNU = 'w-\[350px\] shrink-0 sticky top-4 space-y-4';/);
  /* Ziyaretçi görünümü: başlıktan (sayaçlar, eylemler) sonra, Paylaşımlar'dan önce. */
  const baslikSonu = GORUNUM.indexOf('</header>');
  const panelYeri = GORUNUM.indexOf('{kampusPaneli}');
  const paylasimlar = GORUNUM.indexOf('id="ziyaretci-paylasimlar"');
  assert.ok(baslikSonu > 0 && panelYeri > baslikSonu && paylasimlar > panelYeri);
  /* /cv: arayış kartlarından sonra, portfolyodan (paylaşımlar) önce. */
  const cvPanel = CV.indexOf("kampusPaneli('akis') && (");
  assert.ok(cvPanel > CV.indexOf('<ArayisKartlari') && cvPanel < CV.indexOf('{!duzenleme && sosyalPortfolyo && ('));
  /* Şirket sayfası ve düzenleme kipi değişmedi. */
  assert.match(SAYFA, /<ProfilSayfaDuzeni yanSutun=\{bakaninYanSutunu\}>\s*<React\.Suspense/);
  assert.match(CV, /<ProfilSayfaDuzeni\s+devreDisi=\{duzenleme\}/);
});

test('erişilebilirlik: section + başlıklar, listeler ul, dış bağlantı yeni sekme duyurusu, tarih <time>', () => {
  assert.match(PANEL, /<section aria-labelledby=\{`\$\{kimlik\}-baslik`\}/);
  assert.match(PANEL, /<h2 id=\{`\$\{kimlik\}-baslik`\}/);
  assert.equal((PANEL.match(/<h3 id=\{kimlik\}/g) ?? []).length, 3);
  assert.match(PANEL, /<a href=\{href\} target="_blank" rel="noopener noreferrer" className=\{className\}>/);
  assert.match(PANEL, /<span className="sr-only"> \(yeni sekmede açılır\)<\/span>/);
  assert.match(PANEL, /<time dateTime=\{bugun\}>/);
  assert.match(PANEL, /<time dateTime=\{d\.tarih\}/);
  assert.match(PANEL, /<time dateTime=\{burs\.applicationDeadline\}>/);
  /* Elle tarih biçimi yok. */
  assert.doesNotMatch(kod(PANEL), /toLocaleDateString/);
  /* Hata ve yeniden dene; iki istek ayrı. */
  assert.match(PANEL, /Kampüs bilgileri alınamadı\./);
  assert.match(PANEL, /Burslar alınamadı\./);
  assert.equal((PANEL.match(/Yeniden dene/g) ?? []).length, 2);
  assert.match(PANEL, /Şu an sana uygun, başvurusu açık burs yok\./);
});
