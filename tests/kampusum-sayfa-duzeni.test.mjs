import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  KAMPÜSÜM SAYFA DÜZENİ (kullanıcı isteği, 25 Eylül 2026)

  Bağımsız /kampusum sayfası kendi görünüm varyantında (`yerlesim='sayfa'`).
  Veri ve durum dalları profil paneliyle ORTAK; yalnız sınıflar ayrı. Profil
  paneli (`akis`, `sutun`) değişmedi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const PANEL = oku('src/components/kampus/KampusumPaneli.tsx');
const SAYFA_KAYNAGI = oku('src/components/kampus/KampusumSayfasi.tsx');
const stil = (ad) => {
  const bas = PANEL.indexOf(`const ${ad}: Stil = {`);
  assert.ok(bas > 0, `${ad} stili yok`);
  return PANEL.slice(bas, PANEL.indexOf('\n};', bas));
};

test('sayfa kendi varyantında; profil paneli ayrı kartlar', () => {
  assert.match(SAYFA_KAYNAGI, /yerlesim="sayfa"/);
  assert.match(PANEL, /type Yerlesim = 'sutun' \| 'akis' \| 'sayfa';/);
  /*
    27 Eylül 2026 (kullanıcı tasarımı): profil panelinde tek kutu yok;
    kap çerçevesiz, bölümler arasında 16 px olan ayrı beyaz kartlar.
  */
  assert.match(PANEL, /sutun: 'space-y-4',/);
  assert.match(PANEL, /akis: 'space-y-4',/);
  assert.match(PANEL, /const KART = 'rounded-2xl border border-gray-200 bg-white p-4';/);
  const panel = stil('PANEL');
  assert.match(panel, /yemekKabi: KART,/);
  assert.match(panel, /bolum: KART,/);
  assert.match(panel, /bolumBasligi: BOLUM_BASLIGI,/);
  /* Okunur yazı: duyuru başlığı ve açıklamalar 15 px. */
  assert.match(panel, /satirBasligi: 'line-clamp-3 block text-\[15px\] font-semibold leading-\[21px\] text-gray-900 group-hover:text-blue-700',/);
  assert.match(PANEL, /const ACIKLAMA = 'text-\[15px\] leading-\[22px\] text-gray-600';/);
  assert.match(panel, /tumuEtiketi: 'Duyuruları gör',/);
  /* Kart fotoğrafı 88 px. */
  assert.match(PANEL, /width=\{88\}\s*height=\{88\}/);
  /* Veri tek yerden: bölüm bileşenleri bir kez yazılı, stil parametre. */
  assert.equal((PANEL.match(/const YemekBolumu:/g) || []).length, 1);
  assert.equal((PANEL.match(/const DuyuruBolumu:/g) || []).length, 1);
  assert.equal((PANEL.match(/const BursBolumu:/g) || []).length, 1);
});

test('başlık: 22/28, sayfada "Senin üniversiten" yok, uzun ad kırpılmıyor', () => {
  assert.match(PANEL, /'text-\[22px\] font-extrabold leading-7 tracking-tight text-slate-900'/);
  assert.match(PANEL, /\{okulAdi && !baskasi && sayfa && \(\s*<p className=\{altSatir\}>[\s\S]{0,120}<span className="min-w-0 break-words font-medium">\{okulAdi\}<\/span>/);
  /*
    Panelde (27 Eylül 2026) "Senin üniversiten ·" satırı "Üniversiten"
    alanı oldu: temsili görsel, başlık ve veriden okul adı. Başkasının
    kampüsünde kimin olduğu yazıyor.
  */
  assert.doesNotMatch(PANEL.replace(/\/\*[\s\S]*?\*\//g, ''), /Senin üniversiten ·/);
  /* Okul adı küçük alt açıklama değil, kartın başlığı (17 px, kırpılmıyor). */
  assert.match(PANEL, /\{okulAdi && !baskasi && !sayfa && \([\s\S]{0,200}<KartBasligi gorsel="kampus">\s*<p[^>]*>Üniversiten<\/p>\s*<h3 id=\{`\$\{kimlik\}-okul`\} className="mt-0\.5 break-words text-\[17px\] font-extrabold[^"]*">\s*\{okulAdi\}/);
  assert.match(PANEL, /\{kisiAdi\}/);
});

test('yemek ilk belirgin kart; satırlar 15/22, öğünler ayraçlı, kaynak metni olduğu gibi', () => {
  const s = stil('SAYFA');
  assert.match(s, /yemekKabi: 'mt-4 rounded-2xl border border-gray-200 bg-white p-4',/);
  assert.doesNotMatch(s, /shadow-(md|lg|xl)/);
  assert.match(s, /yemekBaslikGrubu: 'flex flex-wrap items-baseline justify-between/);
  assert.match(s, /ogunListesi: 'mt-3 divide-y divide-gray-100',/);
  assert.match(s, /yemekler: 'mt-2 space-y-1\.5 text-\[15px\] leading-\[22px\]/);
  assert.match(s, /kalori: 'ml-auto rounded-md bg-gray-100/);
  assert.match(PANEL, /\{ogun\.yemekler\.map\(\(yemek, i\) => \(\s*<li key=\{`\$\{yemek\}-\$\{i\}`\}>\{yemek\}<\/li>/);
  /* İki bağlantı farklı ağırlıkta, ikisi de 44 px. */
  assert.match(s, /menuBaglantisi: `inline-flex min-h-11 [^`]*font-semibold text-blue-700/);
  assert.match(s, /yemekhaneBaglantisi: `inline-flex min-h-11 [^`]*font-medium text-gray-600/);
  /* "Okunamadı" ile "menü yok" ayrı cümle. */
  assert.match(PANEL, /kaynak\.sonBasariAni\s*\? 'Bugün için yayımlanmış menü yok\.'\s*: 'Menü kaynağı henüz okunamadı\.'/);
});

test('duyurular ve burs: ince ayraçlı tek liste, başlık en çok üç satır, satırın tamamı bağlantı', () => {
  const s = stil('SAYFA');
  assert.match(s, /bolum: 'mt-6',/);
  assert.match(s, /bolumBasligi: 'text-lg font-bold leading-6 text-slate-900',/);
  assert.match(s, /liste: 'mt-1 divide-y divide-gray-100',/);
  assert.match(s, /satir: `group flex min-h-11 items-start gap-3 rounded-lg py-3 /);
  assert.match(s, /satirBasligi: 'line-clamp-3 block text-\[15px\] font-semibold leading-\[21px\]/);
  assert.match(s, /satirTarihi: 'mt-1 block text-\[13px\]/);
  assert.match(s, /tumuEtiketi: 'Tüm duyurular',/);
  /* Satır başına ayrı "İncele" düğmesi yok; bağlantı `DisBaglanti`nin kendisi. */
  assert.doesNotMatch(PANEL, />\s*İncele\s*</);
  assert.match(PANEL, /<DisBaglanti href=\{d\.adres\} className=\{stil\.satir\}>/);
  /* Burs aynı satır kalıbında; uygunluk hesabı ve başkasının kampüsü kuralı aynı. */
  assert.match(PANEL, /className=\{stil\.satir\}\s*>\s*<span className="flex min-w-0 flex-1 flex-col">\s*<span className=\{stil\.satirBasligi\}>\{burs\.title\}/);
  assert.match(PANEL, /kampusBurslari\(burslar\.veri, ogrenci\)/);
  assert.match(PANEL, /\{!baskasi && \(\s*<BursBolumu/);
});
