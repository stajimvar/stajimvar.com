import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { basvuruYolu } from '../src/lib/basvuru-yolu.mjs';

/*
  İLAN DETAYI YENİ DÜZEN (4 Ekim 2026, kullanıcının onayladığı görsel)

  Solda başlık kartı + bilgi ızgarası ve ilan metni, sağda yalnız içeriği
  kadar yüksek başvuru kartı. Görseldeki açıklama cümlesi bir MAKETTİ;
  kartın açıklaması gerçek başvuru yolundan (`yol.ozet`) geliyor ve mavi
  "StajımVar üzerinden" kutusu yalnız başvuru gerçekten bizden geçerken
  çiziliyor.

  Kaynak YORUMLARI DÜŞÜRÜLEREK okunuyor: yorumlar eski hataları ve maket
  cümlesini anlatabilir, sınanan şey çalışan kod.
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');
const koddan = (metin) =>
  metin.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const HAM = oku('src/components/ListingPage.tsx');
const sayfa = koddan(HAM);

const arasi = (metin, bas, son) => {
  const i = metin.indexOf(bas);
  assert.ok(i >= 0, `bulunamadı: ${bas}`);
  const j = metin.indexOf(son, i + bas.length);
  assert.ok(j > i, `bitiş bulunamadı: ${son}`);
  return metin.slice(i, j);
};

const MAVI_KUTU_KAPISI = "{yol.anaEylem === 'platform-ici' && yol.teslimEdiliyor && !kapanis && (";
const SARI_UYARI_KAPISI = '{!yol.teslimEdiliyor && (';

/* ------------------------------------------------ 1. açıklama metni */

test('görseldeki maket cümlesi kaynakta YOK (yorumlar dahil)', () => {
  for (const parca of [
    'Başvurun StajımVar üzerinden alınacaktır',
    'Profil bilgilerinle kolayca',
    'kolayca başvurabilirsin',
  ]) {
    assert.ok(!HAM.includes(parca), `maket cümlesi kaynağa girmiş: ${parca}`);
  }
});

test('mavi açıklama kutusu yol.ozet basıyor ve yalnız platform içi, açık ilanda', () => {
  const mavi = arasi(sayfa, MAVI_KUTU_KAPISI, SARI_UYARI_KAPISI);
  assert.match(mavi, /bg-blue-50/);
  assert.match(mavi, /\{yol\.ozet\}/);
  /* Kutuda sabit, elle yazılmış bir cümle yok: metin tek kaynaktan. */
  assert.ok(!/StajımVar üzerinden/.test(mavi), 'mavi kutuda elle yazılmış cümle var');
  /* Mavi kutu yalnız bir kez ve yalnız bu kapının arkasında. */
  assert.equal(sayfa.split(MAVI_KUTU_KAPISI).length - 1, 1);
});

test('dış ve adressiz ilanda sarı uyarı aynen duruyor, mavi kutu yok', () => {
  const sari = arasi(sayfa, SARI_UYARI_KAPISI, '</aside>');
  assert.match(sari, /\{yol\.ozet\} StajımVar kaydı yalnızca senin takip listen içindir —/);
  assert.match(sari, /<strong>resmî sayfadan başvurmayı unutma<\/strong>/);
  assert.match(sari, /bg-amber-50/);
  assert.ok(!/bg-blue-50/.test(sari), 'sarı uyarı dalında mavi kutu çizilmiş');
});

test('kapılar başvuru yolunun gerçek davranışıyla örtüşüyor', () => {
  /* İç ilan teslim ediliyor → mavi kutu; dış ve adressiz → sarı uyarı. */
  const ic = basvuruYolu({ applicationMethod: 'internal' });
  assert.equal(ic.anaEylem, 'platform-ici');
  assert.equal(ic.teslimEdiliyor, true);
  const dis = basvuruYolu({ applicationMethod: 'external', applyUrl: 'https://kariyer.ornek.com/staj/1' });
  assert.equal(dis.anaEylem, 'resmi-site');
  assert.equal(dis.teslimEdiliyor, false);
  const kayit = basvuruYolu({ applicationMethod: 'external' });
  assert.equal(kayit.anaEylem, 'kayit');
  assert.equal(kayit.teslimEdiliyor, false);
  /* E-posta yolu gönderici çalışmadığı sürece teslim vaadi vermiyor. */
  assert.equal(basvuruYolu({ applicationMethod: 'email_application', applicationChannelId: 'k' }).teslimEdiliyor, false);
});

/* ------------------------------------------------ 2. sağ kart */

test('sağ kart gerilmiyor: ızgara items-start, sütun self-start', () => {
  assert.match(sayfa, /lg:grid lg:grid-cols-12 lg:items-start/);
  assert.match(sayfa, /lg:col-span-4 lg:sticky lg:top-6 lg:self-start/);
  /* Sütunda sabit ya da en az yükseklik yok: kart içeriği kadar. */
  const aside = arasi(sayfa, '<aside', '>');
  assert.ok(!/\b(h-full|min-h-|h-screen)/.test(aside), 'sağ sütuna yükseklik verilmiş');
});

test('son başvuru satırı tarih varsa çiziliyor, uydurulmuyor', () => {
  const kart = arasi(sayfa, '<aside', '</aside>');
  assert.match(kart, /\{sonBasvuru && \(/);
  assert.match(kart, /\{sonBasvuru\}/);
});

test('ana başvuru düğmesi: odak halkası, 48 piksel, platform içinde ok simgesi', () => {
  const blok = arasi(sayfa, 'hidden lg:flex flex-col gap-2.5', '</aside>');
  assert.match(blok, /ODAK_HALKASI/);
  assert.match(blok, /min-h-12/);
  assert.match(blok, /yol\.anaEylem === 'platform-ici' && \(\s*<ArrowRight aria-hidden="true"/);
  /* `transition-colors` odak halkasının rengini de geçişe sokuyor (renk-token). */
  assert.ok(!/transition-colors/.test(blok), 'eylem bloğunda transition-colors kaldı');
});

/* ------------------------------------------------ 3. başlık kartı ve ızgara */

test('sayfada tek h1 var ve ilanın adı', () => {
  assert.equal((sayfa.match(/<h1\b/g) ?? []).length, 1);
  assert.match(sayfa, /<h1[^>]*>\s*\{listing\.title\}\s*<\/h1>/);
  /* Uzun başlık kırılıyor, taşmıyor. */
  assert.match(arasi(sayfa, '<h1', '>'), /break-words/);
});

test('bilgi ızgarası: telefonda 2, sm üstünde 3 sütun; ayırıcı satır başında yok', () => {
  assert.match(sayfa, /'-mx-3 grid grid-cols-2 sm:grid-cols-3'/);
  assert.match(sayfa, /'max-sm:\[&>\*:nth-child\(even\)\]:border-l'/);
  assert.match(sayfa, /'sm:\[&>\*:not\(:nth-child\(3n\+1\)\)\]:border-l'/);
  /* Satır aralığı yok: alt alta ayırıcılar tek çizgi. */
  const izgara = arasi(sayfa, 'const BILGI_IZGARASI', '.join');
  assert.ok(!/gap-y-|\bgap-\d/.test(izgara), 'ızgaraya satır aralığı verilmiş');
});

test('bilgi simgeleri ekran okuyucudan gizli', () => {
  const bilgi = arasi(sayfa, 'const Bilgi', 'const BILGI_IZGARASI');
  assert.match(bilgi, /aria-hidden="true">\{ikon\}/);
});

test('geri dönüş gerçek bağlantı, yalnız site kabuğunda', () => {
  const geri = arasi(sayfa, '{gomulu && (', '</a>');
  assert.match(geri, /href="\/"/);
  assert.match(geri, /e\.metaKey \|\| e\.ctrlKey/);
  assert.match(geri, /İlanlara dön/);
});

/* ------------------------------------------------ 4. ilan metni */

test('"tamamını göster" gerçek taşmaya bağlı, karakter sayısına değil', () => {
  assert.ok(!/description \|\| ''\)\.length > 900/.test(sayfa), 'eski 900 karakter eşiği kaldı');
  assert.match(sayfa, /\{\(metinAcik \|\| metinTasiyor\) && \(/);
  assert.match(sayfa, /el\.scrollHeight > el\.clientHeight/);
  assert.match(sayfa, /max-w-\[75ch\]/);
  assert.match(sayfa, /whitespace-pre-line/);
});

test('otomatik çeviri notu ve kaynak satırı duruyor', () => {
  assert.match(sayfa, /Otomatik çeviri/);
  assert.match(sayfa, /Bu metin kaynak ilanın otomatik Türkçe çevirisi\./);
  assert.match(sayfa, /Kaynak: \{new URL\(listing\.sourceUrl\)\.hostname\}/);
});

/* ------------------------------------------------ 5. telefon */

test('telefondaki sabit başvuru çubuğu ve masaüstü bloğunun gizlenmesi korunuyor', () => {
  assert.match(sayfa, /lg:hidden fixed inset-x-0 z-40/);
  assert.match(sayfa, /gomulu \? 'bottom-\[calc\(60px\+env\(safe-area-inset-bottom\)\)\] pb-3'/);
  assert.match(sayfa, /pb-\[calc\(170px\+env\(safe-area-inset-bottom\)\)\] lg:pb-8/);
  /* Aynı düğme telefonda iki kez görünmesin. */
  assert.match(sayfa, /<div className="hidden lg:flex flex-col gap-2\.5">/);
});

test('telefonda boş başvuru kartı çizilmiyor', () => {
  assert.match(sayfa, /telefondaKartBos \? 'max-lg:hidden' : ''/);
});

/* ------------------------------------------------ 6. fikstür üretime girmiyor */

test('hazirIlan yalnız geliştirme fikstüründe; uygulama vermiyor', () => {
  assert.ok(!/hazirIlan/.test(koddan(oku('src/App.tsx'))), 'App.tsx hazirIlan veriyor');
  assert.match(oku('src/dev/IlanDetayDevFixture.tsx'), /hazirIlan=\{durum\.ilan\}/);
  /* Vite yalnız index.html'i derliyor; fikstür sayfası ek giriş değil. */
  const vite = oku('vite.config.ts');
  assert.ok(!/ilan-detay-test\.html|input\s*:/.test(vite), 'fikstür üretim derlemesine eklenmiş');
  /* src/dev dışındaki hiçbir kaynak fikstürü içe aktarmıyor. */
  const kok = new URL('../src/', import.meta.url);
  const tara = (dizin) => readdirSync(dizin).flatMap((ad) => {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) return ad === 'dev' ? [] : tara(yol);
    return /\.(tsx?|mjs)$/.test(ad) ? [yol] : [];
  });
  for (const dosya of tara(fileURLToPath(kok))) {
    const kod = koddan(readFileSync(dosya, 'utf8'));
    assert.ok(!/from ['"][^'"]*\/dev\//.test(kod), `${dosya} src/dev'den içe aktarıyor`);
  }
});
