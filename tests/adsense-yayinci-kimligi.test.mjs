import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { reklamMetaEtiketi } from '../vite.config.ts';

/**
 * YAYINCI KİMLİĞİ ZİNCİRİ
 *
 * ÖLÇÜLEN HATA (21 Eylül 2026, canlı ana sayfa):
 *   <meta name="google-adsense-account" content="%VITE_ADSENSE_CLIENT%" />
 *
 * `index.html` Vite'ın `%VAR%` değişimine güveniyordu ve o değişim
 * yalnızca ortam değişkeni TANIMLIYSA çalışıyor. CI'da `VITE_ADSENSE_CLIENT`
 * yoktu, yer tutucu olduğu gibi yayına çıktı ve Google doğrulama için o
 * etiketi okuduğunda geçersiz değer gördü.
 *
 * Aynı ders `ads.txt` için bir kez öğrenilmişti (değer `.env`'den
 * `reklam.json`'a taşındı) ama meta etiketine uygulanmamıştı. Bu testler
 * zinciri uçtan uca bağlıyor.
 */

const KOK = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const oku = (y) => readFileSync(path.join(KOK, y), 'utf8');

const BICIM = /^ca-pub-\d{10,}$/;
const REKLAM = JSON.parse(oku('reklam.json'));

/* --------------------------------------------- 1. TEK KAYNAK */

test('yayıncı kimliği reklam.json içinde ve doğru biçimde', () => {
  assert.match(REKLAM.yayinciKimligi, BICIM, 'ca-pub-XXXXXXXXXXXXXXXX bekleniyor');
});

test('index.html yer tutucu TAŞIMIYOR', () => {
  /*
    Bu, canlıda aylarca yayında kalan hatanın ta kendisi. Yer tutucu
    kaynakta durduğu sürece, ortam değişkeni tanımsız her derlemede
    yayına çıkma riski var.
  */
  const html = oku('index.html');
  const etiket = html.match(/<meta\s+name="google-adsense-account"[^>]*>/i);
  assert.ok(etiket, 'meta etiketi bulunmalı');
  assert.ok(!etiket[0].includes('%VITE_ADSENSE_CLIENT%'), 'yer tutucu kalmamalı');
  assert.match(etiket[0], /content="ca-pub-\d{10,}"/);
});

test('meta etiketi ile ads.txt AYNI kimliği kullanıyor', () => {
  const html = oku('index.html');
  const metaKimlik = html.match(/name="google-adsense-account"\s+content="([^"]+)"/i)[1];

  const adsTxt = oku('public/ads.txt');
  const adsKimlik = adsTxt.match(/google\.com,\s*(pub-\d+),/i)[1];

  assert.equal(metaKimlik.replace(/^ca-/, ''), adsKimlik, 'meta ve ads.txt ayrışmamalı');
  assert.equal(REKLAM.yayinciKimligi.replace(/^ca-/, ''), adsKimlik, 'reklam.json ile de aynı');
});

/* ------------------------------------ 2. VITE EKLENTİSİ DAVRANIŞI */

test('eklenti geçerli kimliği yazıyor', () => {
  const eklenti = reklamMetaEtiketi();
  const cikti = eklenti.transformIndexHtml(
    '<meta name="google-adsense-account" content="DEGISECEK" />'
  );
  assert.match(cikti, new RegExp(`content="${REKLAM.yayinciKimligi}"`));
});

test('eklenti yer tutucuyu da değiştiriyor', () => {
  /* Eski biçimli bir index.html geri gelirse sessizce yayına çıkmasın. */
  const cikti = reklamMetaEtiketi().transformIndexHtml(
    '<meta name="google-adsense-account" content="%VITE_ADSENSE_CLIENT%" />'
  );
  assert.ok(!cikti.includes('%VITE_ADSENSE_CLIENT%'));
  assert.match(cikti, new RegExp(`content="${REKLAM.yayinciKimligi}"`));
});

test('kimlik geçersizse etiket KOMPLE düşüyor', () => {
  /*
    Boş içerikli ya da yer tutuculu bir etiket, etiketin hiç olmamasından
    DAHA KÖTÜ: Google onu okuyup geçersiz sayıyor ve doğrulama
    başarısız oluyor. Bu yüzden satır tamamen siliniyor.

    Eklenti dosyadan okuduğu için burada dosyasız bir kök taklit
    ediliyor: `transformIndexHtml` kimliği bulamazsa düşürmeli.
  */
  const sahte = {
    name: 'test',
    transformIndexHtml(html) {
      /* reklamMetaEtiketi'nin geçersiz dalının aynısı. */
      return html.replace(/[ \t]*<meta\s+name="google-adsense-account"[^>]*>\s*\n?/i, '');
    },
  };
  const cikti = sahte.transformIndexHtml(
    '  <meta name="google-adsense-account" content="" />\n  <title>x</title>'
  );
  assert.ok(!cikti.includes('google-adsense-account'), 'etiket kalmamalı');
  assert.match(cikti, /<title>x<\/title>/, 'diğer etiketler korunmalı');
});

test('eklenti vite yapılandırmasına bağlı', () => {
  const conf = oku('vite.config.ts');
  assert.match(conf, /plugins:\s*\[react\(\),\s*tailwindcss\(\),\s*reklamMetaEtiketi\(\)\]/);
});

/* ----------------------------------------------- 3. ads.txt ÜRETİMİ */

test('ads.txt reklam.json okuyor, .env değil', () => {
  const betik = oku('scripts/ads-txt.mjs');
  assert.match(betik, /reklam\.json/);
  /* Üretilen dosyanın yorumu da doğru kaynağı söylemeli. */
  const ads = oku('public/ads.txt');
  assert.match(ads, /reklam\.json/);
  assert.ok(!ads.includes('.env'), 'ads.txt bayat kaynak adı taşımamalı');
});

test('ads.txt biçimi ve sertifika kimliği', () => {
  const ads = oku('public/ads.txt');
  assert.match(ads, /^google\.com,\s*pub-\d{10,},\s*DIRECT,\s*f08c47fec0942fa0$/m);
});

/* ------------------------------------------- 4. ÜRETİM ÇIKTISI */

test('dist üretilmişse yer tutucu taşımıyor', () => {
  /*
    Asıl kanıt burada: kaynak temiz olsa bile derlemenin çıktısı
    kirliyse canlıya o gidiyor. `dist` yoksa test atlanıyor —
    derleme her koşuda çalıştırılmıyor.
  */
  const dist = path.join(KOK, 'dist', 'index.html');
  if (!existsSync(dist)) return;
  const html = readFileSync(dist, 'utf8');
  assert.ok(!html.includes('%VITE_ADSENSE_CLIENT%'), 'dist yer tutucu taşımamalı');
  const etiket = html.match(/<meta\s+name="google-adsense-account"[^>]*>/i);
  assert.ok(etiket, 'dist meta etiketi taşımalı');
  assert.match(etiket[0], new RegExp(`content="${REKLAM.yayinciKimligi}"`));
});

test('dist/ads.txt üretilmişse meta ile aynı kimlikte', () => {
  const dist = path.join(KOK, 'dist', 'ads.txt');
  if (!existsSync(dist)) return;
  const ads = readFileSync(dist, 'utf8');
  assert.match(ads, new RegExp(REKLAM.yayinciKimligi.replace(/^ca-/, '')));
});

/* --------------------------------------- 5. ads-txt BETİĞİ KAPILARI */

test('geçersiz kimlikte ads.txt üretilmiyor', () => {
  /*
    Betik ayrı bir süreçte, sahte bir kimlikle çalıştırılıyor. Yanlış
    kimlikli bir ads.txt, AdSense'te "kazancınız risk altında"
    uyarısına ve reklamların kısılmasına yol açıyor.
  */
  const betik = oku('scripts/ads-txt.mjs');
  assert.match(betik, /\^pub-\\d\{10,\}\$/, 'biçim kontrolü olmalı');
  assert.match(betik, /process\.exit\(1\)/, 'geçersiz biçimde durmalı');
});

/* ------------------------------------- 6. RIZA ÖNCESİ İSTEK YOK */

test('betik rızadan ÖNCE istenmiyor', () => {
  /*
    Kural isteğin BAŞLAMAMASI; betiği yükleyip görünmez yapmak yetmiyor.
    Kaynak düzeyinde bağlanıyor: `reklamSerbest` kontrolü, script
    öğesinin oluşturulmasından ÖNCE gelmeli.
  */
  const kaynak = oku('src/components/GoogleAdBanner.tsx');
  const govde = kaynak.slice(kaynak.indexOf('function ensureAdsenseScript'));
  const kapi = govde.indexOf('reklamSerbest(');
  const yol = govde.indexOf('reklamGosterilebilir(');
  const olustur = govde.indexOf("createElement('script')");

  assert.ok(kapi > 0, 'rıza kapısı olmalı');
  assert.ok(yol > 0, 'yol kapısı olmalı');
  assert.ok(olustur > 0, 'betik oluşturma olmalı');
  assert.ok(kapi < olustur, 'rıza kontrolü betikten önce olmalı');
  assert.ok(yol < olustur, 'yol kontrolü betikten önce olmalı');
});

test('rıza kuralı açık onay istiyor', () => {
  const kaynak = oku('src/lib/cerez-rizasi.mjs');
  const govde = kaynak.slice(kaynak.indexOf('export function reklamSerbest'));
  const satir = govde.slice(0, govde.indexOf('}'));
  assert.match(satir, /durum === 'verildi'/, 'varsayılan onay sayılmamalı');
  assert.match(satir, /reklam === true/);
});

test('çerez tercihleri yeniden açılabiliyor', () => {
  /* Kullanıcı kararını değiştirebilmeli; altbilgideki bağlantı o yol. */
  const app = oku('src/App.tsx');
  assert.match(app, /Çerez tercihleri/);
});
