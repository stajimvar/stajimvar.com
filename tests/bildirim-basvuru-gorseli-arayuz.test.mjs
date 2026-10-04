import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/*
  BAŞVURU BİLDİRİMİNİN GÖRSELİ — ARAYÜZ BAĞLANTISI

  Kural testleri `bildirim-basvurusu.test.mjs` içinde. Burada arayüzün o
  kurala SADIK kaldığı denetleniyor:
    · App başvuru satırlarını kişi/içerik çözümüyle aynı desende okuyor
      (panel açıkken, sıralı anahtar, iptal bayrağı, hata → boş harita)
    · bileşen ikinci bir gizlilik kuralı kurmuyor, kendi başına sorgu atmıyor
    · görsel inmezse tür simgesine dönülüyor
    · uzun ilan adı tek satırda ya da üç satırda kesilmiyor
    · öteki türlerin çizimi değişmiyor
*/

const oku = (yol) => fs.readFileSync(yol, 'utf8');
/* Yorumlar çıkarılıyor: açıklama metnindeki sözcükler kod sayılmasın. */
const kodu = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const app = kodu(oku('src/App.tsx'));
const merkezHam = oku('src/components/BildirimMerkezi.tsx');
const merkez = kodu(merkezHam);

const parca = (metin, bas, son) => {
  const i = metin.indexOf(bas);
  assert.ok(i >= 0, `bulunamadı: ${bas}`);
  const j = metin.indexOf(son, i + bas.length);
  assert.ok(j > i, `bulunamadı: ${son}`);
  return metin.slice(i, j);
};

test('App: başvuru satırları panel açıkken, tek sorguyla ve iptal bayrağıyla okunuyor', () => {
  assert.match(app, /import \{ bildirimBasvurulariniGetir, type BildirimBasvurusu \} from '\.\/lib\/bildirim';/);
  const anahtar = parca(app, 'const bildirimBasvuruAnahtari = bildirim.acik', ": '';");
  assert.match(anahtar, /OGRENCI_BASVURU_TURLERI\.has\(b\.tur\) \|\| ADAY_FOTOGRAFLI_TURLER\.has\(b\.tur\)/);
  assert.match(anahtar, /\.map\(\(b\) => b\.basvuruId\)/);
  assert.match(anahtar, /\.sort\(\)\s*\.join\(','\)/);

  const etki = parca(app, 'if (!bildirimBasvuruAnahtari) return;', '}, [bildirimBasvuruAnahtari]);');
  assert.match(etki, /let iptal = false;/);
  assert.match(etki, /bildirimBasvurulariniGetir\(bildirimBasvuruAnahtari\.split\(','\)\)/);
  assert.match(etki, /if \(!iptal\) setBildirimBasvurulari\(harita\);/);
  assert.match(etki, /\.catch\(\(\) => \{\s*if \(!iptal\) setBildirimBasvurulari\(new Map\(\)\);/, 'hata boş haritaya düşmeli');
  assert.match(etki, /iptal = true;/);
});

test('App: görsel kararı yalnız basvuruGorseli veriyor ve depo kökü ortamdan geliyor', () => {
  const bilgi = parca(app, 'const bildirimBasvuruBilgisi = React.useCallback(', '[bildirimBasvurulari],');
  assert.match(
    bilgi,
    /basvuruGorseli\(b\.tur, bildirimBasvurulari\.get\(b\.basvuruId\) \?\? null, import\.meta\.env\.VITE_SUPABASE_URL\)/,
  );
  /* İkinci bir kural ya da gevşetme yok. */
  for (const yasak of ['rizaTarihi', 'yontem', 'dogrulanmis', 'adayFotografi', "'internal'"]) {
    assert.ok(!bilgi.includes(yasak), `App içinde ikinci gizlilik kuralı: ${yasak}`);
  }
  assert.match(app, /<BildirimMerkezi[\s\S]*?basvuru=\{bildirimBasvuruBilgisi\}[\s\S]*?\/>/);
  assert.equal((app.match(/<BildirimMerkezi/g) ?? []).length, 1, 'panel tek yerde bağlanmalı');
});

test('bileşen: gizlilik kararı vermiyor, veri okumuyor', () => {
  /* Yalnız TİP alınıyor; kural fonksiyonu bileşene girmiyor. */
  assert.match(merkez, /import type \{ AdayGorseli, SirketGorseli \} from '\.\.\/lib\/bildirim-basvurusu\.mjs';/);
  for (const yasak of [
    'basvuruGorseli(',
    'guvenliAdayFotografi',
    'guvenliLogoAdresi',
    'rizaTarihi',
    'dogrulanmis',
    'contact_share_consent_at',
    'profile_snapshot',
    'bildirimBasvurulariniGetir',
    "from('applications')",
    'student_profiles',
  ]) {
    assert.ok(!merkez.includes(yasak), `bileşende kural ya da sorgu: ${yasak}`);
  }
});

test('bileşen: görsel inmezse tür simgesine dönülüyor, kırık resim kalmıyor', () => {
  const ikon = parca(merkez, 'function BildirimIkonu(', '\nexport type BaglantiYanitSonucu');
  assert.match(ikon, /const \[bozukAdres, setBozukAdres\] = React\.useState<string \| null>\(null\);/);
  assert.match(ikon, /const gorsel = gorselAdresi && gorselAdresi !== bozukAdres \? gorselAdresi : null;/);
  assert.match(ikon, /onError=\{\(\) => setBozukAdres\(gorsel\)\}/);
  assert.match(ikon, /if \(basvuru\?\.tip === 'sirket' && gorsel\) \{/);
  assert.match(ikon, /if \(basvuru\?\.tip === 'aday' && gorsel\) \{/);
  assert.equal((ikon.match(/onError=\{\(\) => setBozukAdres\(gorsel\)\}/g) ?? []).length, 2, 'logo ve fotoğraf ikisi de simgeye dönmeli');
  /* Logo ya da fotoğraf yoksa (null) da aynı kapıdan simgeye düşülüyor. */
  assert.match(ikon, /basvuru\?\.tip === 'sirket' \? basvuru\.logo : basvuru\?\.tip === 'aday' \? basvuru\.foto : null/);
});

test('logo kabı yuvarlak değil ve oranı logodan alıyor', () => {
  const logo = parca(merkez, "if (basvuru?.tip === 'sirket' && gorsel) {", "if (basvuru?.tip === 'aday' && gorsel) {");
  /* Yuvarlatılmış dikdörtgen; daire yok. */
  assert.match(logo, /rounded-xl border border-gray-200 bg-white/);
  assert.ok(!/rounded-full border border-gray-200/.test(logo), 'logo yine daireye sıkıştırılmış');
  /* Yükseklik simgeyle aynı, genişlik görselin doğal oranından; sabit genişlik yok. */
  assert.match(logo, /className="relative flex h-14 shrink-0 sm:h-11"/);
  assert.ok(!/(?<![\w-])(sm:)?w-(14|11)\b/.test(logo), 'logo kabına sabit genişlik verilmiş');
  assert.match(logo, /min-w-14 [^"]*sm:min-w-11/, 'kare logo simge genişliğinde kalmalı');
  const img = logo.match(/<img[\s\S]*?\/>/)?.[0] ?? '';
  assert.match(img, /className="block h-full w-auto max-w-\[86px\] object-contain/, 'oran korunmalı, üst sınır olmalı');
  assert.ok(!/object-cover/.test(img), 'logo kırpılıyor');
  assert.match(img, /alt=""/, 'ad metinde yazıyor; görsel ikinci kez okutmamalı');
  /* Rozet kabın köşesinde, merkezi köşede: logo iç boşlukla rozetten ayrık. */
  assert.match(logo, /aria-hidden="true"\s+className="absolute -bottom-3 -right-3 flex h-6 w-6[^"]*sm:-bottom-2\.5 sm:-right-2\.5 sm:h-5 sm:w-5/);
  assert.match(img, /p-\[9px\] sm:p-\[7px\]/);
});

test('aday fotoğrafı yuvarlak kalıyor', () => {
  const aday = parca(merkez, "if (basvuru?.tip === 'aday' && gorsel) {", 'if (kisi) {');
  assert.match(aday, /className="relative h-14 w-14 shrink-0 sm:h-11 sm:w-11"/);
  assert.match(aday, /rounded-full border border-gray-200 bg-white/);
  assert.match(aday, /className="h-full w-full object-cover"/);
  assert.match(aday, /alt=""/);
  /* Köşe rozeti kişi satırındakiyle aynı ölçüde ve ekran okuyucudan gizli. */
  assert.match(aday, /aria-hidden="true"\s+className="absolute -bottom-0\.5 -right-0\.5 flex h-6 w-6/);
});

test('uzun ilan adı kesilmiyor', () => {
  const satir = parca(merkez, 'const satirCiz = (b: Bildirim) => {', '<span className="sr-only">Yeni</span>');
  /* Başvuru bildiriminde, görselden bağımsız, üç satırlık kırpma kalkıyor. */
  assert.match(satir, /bekleyenIstek \|\| basvuruBildirimiMi\(b\) \? '' : 'line-clamp-3'/);
  assert.match(merkez, /import \{ basvuruBildirimiMi \} from '\.\.\/lib\/bildirim-turu\.mjs';/);
  /* Tek tanım: bileşende ikinci bir tür listesi yok. */
  assert.ok(!/'teklif_ret'|'geri_cekildi'|'gorusme_ret'/.test(merkez), 'başvuru türleri bileşende yeniden sayılmış');
  /* İşveren satırında ilan kendi satırında ve tek satıra sıkıştırılmıyor. */
  const aday = parca(satir, '{adayParcalari ? (', ') : (');
  assert.match(aday, /<span className="block text-gray-700">\s*\{adayParcalari\.ilanAdi\}/);
  assert.ok(!/\btruncate\b|line-clamp|whitespace-nowrap text-gray-700/.test(aday), 'ilan adı tek satırda kesiliyor');
});

test('işveren satırı yalnız gerçek ad ve ilan varsa yeniden kuruluyor, yoksa sunucu metni', () => {
  assert.match(merkez, /const adayParcalari = bv\?\.tip === 'aday' && bv\.adayAdi && bv\.ilanAdi \? bv : null;/);
  /* Öğrenci satırında sunucu metni yeniden yazılmıyor; yalnız adlar vurgulanıyor. */
  assert.match(merkez, /adlariVurgula\(b\.govde, \[bv\.sirketAdi, bv\.ilanAdi\]\)/);
  const vurgu = parca(merkez, 'function adlariVurgula(', '\n}\n');
  assert.match(vurgu, /metin\.indexOf\(ad, imlec\)/);
  assert.match(vurgu, /if \(yer < 0\) continue;/, 'metinde olmayan ad eklenmemeli');
});

test('öteki türler aynen: kişi fotoğrafı, simge eşlemesi ve kırpma', () => {
  assert.match(merkez, /if \(kisi\) \{/);
  assert.match(merkez, /<ProfilFotografi/);
  const esleme = parca(merkez, 'function turSimgesi(tur: string) {', '\n}\n');
  for (const [tur, simge] of [
    ["tur === 'gorusme_daveti' || tur === 'gorusme_guncellendi'", 'CalendarClock'],
    ["tur === 'teklif' || tur === 'teklif_kabul'", 'CheckCircle2'],
    ["tur === 'yeni_basvuru'", 'Briefcase'],
    ["tur === 'baglanti_istegi' || tur === 'baglanti_kabul' || tur === 'takip'", 'UserPlus'],
    ["tur === 'paylasim_begeni'", 'Heart'],
  ]) {
    assert.ok(esleme.includes(`${tur} ? ${simge}`), `simge eşlemesi değişmiş: ${simge}`);
  }
  assert.match(esleme, /: FileText;/);
  /* Görseli olmayan satır eskisi gibi üç satırda kırpılıyor. */
  assert.match(merkez, /'line-clamp-3'/);
  /* Sil, okunmamış noktası ve istek yanıtı yerinde. */
  assert.match(merkez, /\{onSil && \(\s*<button/);
  assert.match(merkez, /<span className="sr-only">Yeni<\/span>/);
  assert.match(merkez, /void yanitla\(b\.id, 'kabul'\)/);
});

test('kırpma tanımı: başvuru bildirimleri kırpılmıyor, sosyal bildirimler kırpılıyor', async () => {
  const { basvuruBildirimiMi, ISVEREN_BASVURU_TURLERI } = await import('../src/lib/bildirim-turu.mjs');
  for (const tur of [
    'inceleniyor', 'degerlendirme', 'gorusme_daveti', 'gorusme_guncellendi', 'teklif', 'olumsuz',
    'yeni_basvuru', 'teklif_kabul', 'teklif_ret', 'geri_cekildi', 'gorusme_kabul', 'gorusme_ret',
  ]) {
    assert.equal(basvuruBildirimiMi({ tur, basvuruId: null }), true, `${tur} başvuru sayılmalı`);
  }
  /* Kimliği dolu, türü bilinmeyen satır da başvurudur. */
  assert.equal(basvuruBildirimiMi({ tur: 'yeni_bir_tur', basvuruId: 'a1' }), true);
  for (const tur of ['baglanti_istegi', 'baglanti_kabul', 'takip', 'paylasim_begeni']) {
    assert.equal(basvuruBildirimiMi({ tur, basvuruId: null }), false, `${tur} sosyal kalmalı`);
  }
  assert.equal(basvuruBildirimiMi({ tur: 'paylasim_begeni', basvuruId: '  ' }), false);
  assert.equal(basvuruBildirimiMi(null), false);
  assert.equal(ISVEREN_BASVURU_TURLERI.size, 6);
});
