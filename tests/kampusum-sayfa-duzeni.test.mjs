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

test('sayfa kendi varyantında; panel varyantları aynı', () => {
  assert.match(SAYFA_KAYNAGI, /yerlesim="sayfa"/);
  assert.match(PANEL, /type Yerlesim = 'sutun' \| 'akis' \| 'sayfa';/);
  /* Profil panelinin kapları 25 Eylül 2026 öncesiyle aynı. */
  assert.match(PANEL, /sutun: 'rounded-2xl border border-gray-200 bg-white p-4',/);
  assert.match(PANEL, /akis: 'border-b border-gray-200 bg-white px-4 py-5 sm:rounded-2xl sm:border sm:p-4',/);
  const panel = stil('PANEL');
  assert.match(panel, /yemekKabi: BOLUM,/);
  assert.match(panel, /bolumBasligi: BOLUM_BASLIGI,/);
  assert.match(panel, /satirBasligi: 'line-clamp-2 text-sm font-semibold leading-snug text-gray-900 group-hover:text-blue-700',/);
  assert.match(panel, /tumuEtiketi: 'Duyuruları gör',/);
  /* Veri tek yerden: bölüm bileşenleri bir kez yazılı, stil parametre. */
  assert.equal((PANEL.match(/const YemekBolumu:/g) || []).length, 1);
  assert.equal((PANEL.match(/const DuyuruBolumu:/g) || []).length, 1);
  assert.equal((PANEL.match(/const BursBolumu:/g) || []).length, 1);
});

test('başlık: 22/28, sayfada "Senin üniversiten" yok, uzun ad kırpılmıyor', () => {
  assert.match(PANEL, /'text-\[22px\] font-extrabold leading-7 tracking-tight text-slate-900'/);
  assert.match(PANEL, /\{sayfa \? \(\s*<span className="min-w-0 break-words font-medium">\{okulAdi\}<\/span>\s*\) : \(/);
  /* Panelde eski cümle duruyor; başkasının kampüsünde kimin olduğu yazıyor. */
  assert.match(PANEL, /Senin üniversiten · <span className="font-semibold text-gray-800">\{okulAdi\}<\/span>/);
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
  assert.match(PANEL, /kaynak\.sonBasariAni \? 'Bugün için yayımlanmış menü yok\.' : 'Menü kaynağı henüz okunamadı\.'/);
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
