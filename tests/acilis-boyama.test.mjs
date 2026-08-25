import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  AÇILIŞTA ÇIPLAK METİN GÖRÜNMESİN

  Soğuk açılışta sayfanın bir an stilsiz göründüğü bildirildi: ön render
  edilmiş SEO metni, dış CSS gelmeden çizilip ekranda kalıyordu (FOUC).

  Yirmi kez elle yenileyip bakmak yerine burada sebep sınanıyor. Elle
  bakmak yalnızca bakılan sayfayı ve o günkü ağ hızını kanıtlar; buradaki
  koşullar üretilen BÜTÜN sayfalar için geçerli ve bir daha bozulursa
  derleme değil test kırılır.

  Sınanan zincir:
    1. Satır içi kritik stil, ilk script'ten ve gövdeden ÖNCE geliyor.
    2. O stil ön render metnini gizliyor (yani metin hiç boyanmıyor).
    3. Dış stil dosyası module script'inden önce isteniyor.
    4. #root içinde önce iskelet, sonra gizli ön render metni var.
    5. JS kapalıyken noscript metni geri açıyor — SEO bozulmuyor.
    6. body'nin açık bir arka planı var: beyazdan griye sıçrama olmuyor.
*/

const DIST = path.resolve(import.meta.dirname, '..', 'dist');

function sayfalar() {
  if (!fs.existsSync(DIST)) return [];
  const bulunan = [];
  const gez = (dizin) => {
    for (const oge of fs.readdirSync(dizin, { withFileTypes: true })) {
      const tam = path.join(dizin, oge.name);
      if (oge.isDirectory()) gez(tam);
      else if (oge.name.endsWith('.html')) bulunan.push(tam);
    }
  };
  gez(DIST);
  return bulunan;
}

const HEPSI = sayfalar();

test('derleme çıktısı var', () => {
  /* dist yoksa test anlamsız; "npm run build" çalışmadan koşuluyor demektir. */
  if (!HEPSI.length) {
    console.log('dist yok — açılış boyama testi atlandı');
    return;
  }
  assert.ok(HEPSI.length > 100, `beklenenden az sayfa: ${HEPSI.length}`);
});

test('her sayfada açılış boyama zinciri kurulu', () => {
  if (!HEPSI.length) return;


  for (const dosya of HEPSI) {
    const ad = path.relative(DIST, dosya);
    const h = fs.readFileSync(dosya, 'utf8');

    const stil = h.indexOf('<style>');
    const script = h.indexOf('<script');
    const govde = h.indexOf('<body');
    assert.ok(stil !== -1, `${ad}: satır içi kritik stil yok`);
    assert.ok(stil < script, `${ad}: kritik stil ilk script'ten sonra geliyor`);
    assert.ok(stil < govde, `${ad}: kritik stil gövdeden sonra geliyor`);

    const kritik = h.slice(stil, h.indexOf('</style>', stil));
    assert.match(
      kritik.replace(/\s+/g, ''),
      /\[data-seo-prerender\]\{display:none/,
      `${ad}: ön render metni kritik stille gizlenmiyor`
    );
    assert.match(kritik.replace(/\s+/g, ''), /background:#/, `${ad}: gövdeye arka plan verilmemiş`);

    const css = h.indexOf('<link rel="stylesheet"');
    const modul = h.indexOf('<script type="module"');
    if (css !== -1 && modul !== -1) {
      assert.ok(css < modul, `${ad}: stil dosyası module script'inden sonra isteniyor`);
    }

    const iskelet = h.indexOf('id="acilis-iskeleti"');
    const onRender = h.indexOf('<div data-seo-prerender>');
    assert.ok(iskelet !== -1, `${ad}: açılış iskeleti yok`);
    const kok = h.indexOf('<div id="root">');
    assert.ok(kok !== -1 && kok < iskelet, `${ad}: iskelet #root içinde değil`);
    if (onRender !== -1) {
      assert.ok(iskelet < onRender, `${ad}: ön render metni iskeletten önce geliyor`);
    }

    assert.match(
      h,
      /<noscript>\s*<style>[^<]*\[data-seo-prerender\]\s*\{\s*display:\s*block/,
      `${ad}: JS kapalıyken SEO metni görünmüyor`
    );
  }
});
