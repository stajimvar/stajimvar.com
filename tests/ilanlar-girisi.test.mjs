import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  İLANLAR GİRİŞİ, SONUÇ SATIRI VE DURUMLAR (A paketi, 26 Eylül 2026)

  Hero yok: listenin üstünde iki satırlık giriş. Sayı yalnız kesinse "N
  ilan"; etkin süzgeçler görünür ve tek tek kaldırılabilir; filtre
  başlıkları öğrencinin sorusuna göre; istek hatası ile boş sonuç ayrı.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const GORUNUM = oku('src/components/MatchedInternshipsView.tsx');
const kod = GORUNUM.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

test('kısa giriş: tek görünür h1, açıklama gerçek veriyle uyumlu, ön render aynı', () => {
  assert.equal((kod.match(/<h1\b/g) || []).length, 1, 'ekranda tek h1');
  assert.match(kod, /<h1 className="text-lg font-extrabold[^"]*">\s*Staj aramaya buradan başla\.\s*<\/h1>/);
  assert.match(kod, /Şirketlerin kariyer sayfalarından derlenen ve StajımVar’da yayımlanan staj ilanlarını keşfet\./);
  assert.doesNotMatch(kod, /İlk adımın burada/);
  const onRender = oku('scripts/onrender.mjs');
  assert.match(onRender, /'<h1>Staj aramaya buradan başla\.<\/h1>'/);
  assert.match(onRender, /Şirketlerin kariyer sayfalarından derlenen ve StajımVar’da yayımlanan staj ilanlarını keşfet\./);
});

test('liste üstünde sayaç yok; etkin süzgeçler ve tek temizleme işlevi', () => {
  /* "N ilan" satırı kaldırıldı (kullanıcı kararı, 26 Eylül 2026). */
  assert.doesNotMatch(kod, /<\/strong> ilan(\s|<)/);
  assert.doesNotMatch(kod, /ilan gösteriliyor · devamı var/);
  assert.doesNotMatch(kod, /önce bölümüne uyanlar/);
  /* Satır yalnız süzgeç etkinken. */
  assert.match(kod, /\{filteredListings\.length > 0 && aktifSuzgecler\.length > 0 && \(/);
  /* Etkin süzgeçler görünür, tek tek kaldırılabiliyor; temizleme panelle aynı işlev. */
  assert.match(kod, /<ul aria-label="Etkin filtreler"/);
  assert.match(kod, /onClick=\{f\.kaldir\}/);
  assert.match(kod, /onClick=\{suzgecleriTemizle\}[\s\S]{0,300}Filtreleri temizle/);
  /* İkinci bir sayaç ya da sabit sayı yok. */
  assert.doesNotMatch(kod, /\b(1[0-9]{2}|[2-9][0-9]{2})\s+ilan\b/);
});

test('filtre grupları: bölüm veya alan, şehir, staj türü, çalışma biçimi; Uzaktan çalışma biçiminde', () => {
  for (const baslik of ['"Bölüm veya alan"', '"Staj türü"', '"Çalışma biçimi"']) {
    assert.ok(kod.includes(`<FiltreBlogu baslik=${baslik}>`), baslik);
  }
  assert.ok(kod.includes("<FiltreBlogu baslik={seciliBolge === 'turkiye' ? 'Şehir' : 'Ülke'}>"));
  const bicim = kod.slice(kod.indexOf('<FiltreBlogu baslik="Çalışma biçimi">'));
  assert.match(bicim.slice(0, 400), /etiket: 'Uzaktan'/);
  const tur = kod.slice(kod.indexOf('<FiltreBlogu baslik="Staj türü">'));
  assert.doesNotMatch(tur.slice(0, 900), /Uzaktan/);
});

test('saklanan tercih yalnız gerçekten saklanıyorsa söyleniyor', () => {
  const bolum = oku('src/components/BolumCipleri.tsx');
  assert.match(bolum, /const ANAHTAR = 'stajimvar:bolum-tercihi';/);
  assert.match(bolum, /\{secili && \(\s*<p[^>]*>\s*Tercihlerin bu tarayıcıda hatırlanır\. İstediğin zaman temizleyebilirsin\./);
});

test('istek hatası "0 ilan" değil: ayrı ekran ve "Yeniden dene"', () => {
  const app = oku('src/App.tsx');
  const hata = app.slice(app.indexOf("globalListings.phase === 'error'"));
  assert.match(hata.slice(0, 1200), /İlanlar yüklenemedi\./);
  assert.match(hata.slice(0, 1200), /onClick=\{globalListings\.retry\}[\s\S]{0,300}Yeniden dene/);
});
