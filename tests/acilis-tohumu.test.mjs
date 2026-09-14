import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

import { katalogYanitiniDogrula } from '../src/lib/global-listings-api.mjs';

/**
 * AÇILIŞ TOHUMU HTML'DE, DOĞRU BİÇİMDE VE OKUNABİLİR DURUMDA.
 *
 * Tohum sessizce bozulabilen bir şey: sarmal yanlış yazılırsa sayfa yine
 * açılır, hiçbir hata çıkmaz, yalnızca ilanlar eskisi gibi ağ beklenerek
 * gelir. Ölçüldü — ilk denemede `country` sarmalı unutulmuştu ve tek
 * belirtisi ilanların 300 ms geç görünmesiydi.
 *
 * Bu test o sessiz kaybı gürültülü hâle getiriyor.
 */

const DIST = path.resolve(import.meta.dirname, '..', 'dist');
const ANASAYFA = path.join(DIST, 'index.html');

const html = fs.existsSync(ANASAYFA) ? fs.readFileSync(ANASAYFA, 'utf8') : null;

const tohumMetni = () => {
  const m = html.match(/<script type="application\/json" id="ilk-katalog">([\s\S]*?)<\/script>/);
  assert.ok(m, 'anasayfada #ilk-katalog etiketi yok');
  return m[1];
};

test('derleme çıktısı var', () => {
  if (!html) console.log('dist yok — açılış tohumu testi atlandı');
});

test('tohum ülkesiyle birlikte sarmalanmış', () => {
  if (!html) return;
  const tohum = JSON.parse(tohumMetni());
  // Sarmal olmadan okuyucu tohumu hangi ülkeye ait bilemez ve kullanmaz.
  assert.deepEqual(Object.keys(tohum).sort(), ['country', 'page']);
  assert.match(tohum.country, /^[A-Z]{2}$/);
});

test('tohum istemcideki doğrulamadan geçiyor', () => {
  if (!html) return;
  // Aynı kapı: canlı RPC yanıtı da buradan geçiyor. Geçemeyen bir tohum
  // istemcide sessizce atılır ve kazanç kaybolur.
  const tohum = JSON.parse(tohumMetni());
  katalogYanitiniDogrula(tohum.page);
  assert.ok(tohum.page.listings.length > 0, 'tohumda hiç ilan yok');
});

test('görünür kartlar tohumun ilk ilanlarıyla aynı', () => {
  if (!html) return;
  /*
    Asıl korunan şey bu: ekrandaki ilk kart ile React'in çizeceği ilk kart
    aynı ilan olmalı. Farklı olsalardı kullanıcı sayfanın açılışında
    ilanların değiştiğini görürdü.
  */
  const tohum = JSON.parse(tohumMetni());
  const kartBasliklari = [...html.matchAll(/<a class="sv-kart-baslik"[^>]*>([\s\S]*?)<\/a>/g)].map(
    (m) => m[1],
  );
  assert.ok(kartBasliklari.length > 0, 'görünür ilan kartı yok');
  const cozumle = (s) =>
    s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  kartBasliklari.forEach((baslik, i) => {
    assert.equal(cozumle(baslik), tohum.page.listings[i].title, `${i}. kart tohumla eşleşmiyor`);
  });
});

test('tohum script etiketini erken kapatamıyor', () => {
  if (!html) return;
  // `</script>` dizisi veriye girerse etiket orada biter ve sayfanın geri
  // kalanı çiğ HTML olarak akar.
  assert.ok(!/<\/script/i.test(tohumMetni()), 'tohum içinde kaçırılmamış </script> var');
});

test('anasayfada gizli ilan listesi kalmadı', () => {
  if (!html) return;
  /*
    Kalan ilanlar bir zamanlar `display:none` bir blokta duruyordu:
    "arama motoru okusun, insan görmesin". Gizlenmiş bağlantı sağlam bir
    tarama kanalı değil ve anasayfanın HTML'ini 22 KB şişiriyordu.
    Doğru kanal site haritası — `siteHaritasiniUzlastir` onun gerçekten
    kapsadığını her dağıtımda güvence altına alıyor.
  */
  assert.ok(!html.includes('<div data-seo-prerender>'), 'anasayfada gizli SEO bloğu var');

  const ilanBaglari = [...html.matchAll(/href="\/ilan\/[^"]+"/g)].length;
  const gorunurKart = [...html.matchAll(/<a class="sv-kart-baslik"/g)].length;
  assert.equal(
    ilanBaglari,
    gorunurKart,
    'anasayfada görünür kartların dışında ilan bağlantısı var',
  );
});

test('görünür her ilan site haritasında', () => {
  if (!html) return;
  // Gizli liste kaldırıldığına göre tek tarama kanalı harita; boş ya da
  // eksik bir harita bu sayfaları görünmez yapar.
  const harita = path.join(DIST, 'sitemap.xml');
  if (!fs.existsSync(harita)) {
    assert.fail('dist/sitemap.xml yok — ilan sayfalarına taranabilir yol kalmadı');
  }
  const xml = fs.readFileSync(harita, 'utf8');
  const sayfalar = fs
    .readdirSync(path.join(DIST, 'ilan'))
    .filter((ad) => ad.endsWith('.html'))
    .map((ad) => `/ilan/${ad.slice(0, -'.html'.length)}`);
  assert.ok(sayfalar.length > 0, 'hiç ilan sayfası üretilmemiş');

  /*
    SÜRESİ GEÇMİŞ İLAN BİLEREK HARİTADA DEĞİL

    Sayfası KALIYOR (Google kapanmış ilanın sayfasının durmasını istiyor
    ve kullanıcıya da yararlı) ama arama motoruna "bunu tara" demenin
    anlamı yok. Kapandığı görünür metinde yazıyor; bu testin kuralı da
    o yüzden "her sayfa haritada" değil, "kapanmamış her sayfa
    haritada".

    Kapanmış olduğu sayfanın KENDİ metninden okunuyor: harita ile sayfa
    arasında üçüncü bir kaynak yok.
  */
  const acikSayfalar = sayfalar.filter((yol) => {
    const dosya = path.join(DIST, `${yol.slice(1)}.html`);
    if (!fs.existsSync(dosya)) return true;
    return !fs.readFileSync(dosya, 'utf8').includes('Başvuru dönemi kapandı');
  });
  const eksik = acikSayfalar.filter(
    (yol) => !xml.includes(`<loc>https://stajimvar.com${yol}</loc>`)
  );
  assert.deepEqual(eksik, [], `site haritasında olmayan ilan sayfaları: ${eksik.slice(0, 5).join(', ')}`);

  /* Kapanmış olanlar gerçekten dışarıda mı — kural iki yönlü sınanıyor. */
  const kapanmis = sayfalar.filter((yol) => !acikSayfalar.includes(yol));
  const haritadaKapanmis = kapanmis.filter((yol) =>
    xml.includes(`<loc>https://stajimvar.com${yol}</loc>`)
  );
  assert.deepEqual(haritadaKapanmis, [], 'kapanmış ilan haritada bildiriliyor');
});
