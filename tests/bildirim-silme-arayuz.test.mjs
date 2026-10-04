import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
  BİLDİRİMİ TEK TEK SİLME — ARAYÜZ TARAFI

  Veritabanı tarafı (DELETE politikası, başkasının satırına 0 satır)
  `bildirim-silme.test.mjs` içinde gerçek Postgres'te sınanıyor. Bu dosya
  kanca ve paneldeki sözleşmeyi bağlıyor:

    1. Silme İYİMSER DEĞİL: satır sunucu onaylayınca çıkıyor, hata
       çağırana istisna olarak geçiyor.
    2. Okunmamış silinince sayı 1 düşüyor ve sunucudan yeniden okunuyor;
       sıra ilerletiliyor ki eski bir sayım düşüşü ezmesin.
    3. Silmeden önce yola çıkmış liste okuması silinen satırı geri
       getirmiyor; aynı satıra ikinci dokunuş ikinci istek atmıyor.
    4. Panelde Sil satırın KARDEŞİ, hedefi 44 px, adı bildirimin başlığını
       taşıyor, hata `role="alert"` ile duyuruluyor ve satır yerinde kalıyor.

  Kaynak metni yorumlar düşürülerek okunuyor: yorumlar neyin neden
  yapılmadığını da anlatıyor ve o cümleleri kod sanmak açıklamayı
  yasaklamak olurdu.
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');
const koddan = (metin) =>
  metin.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const kanca = koddan(oku('src/lib/useBildirimler.ts'));
const merkez = koddan(oku('src/components/BildirimMerkezi.tsx'));
const app = koddan(oku('src/App.tsx'));

/** `bas` ile başlayan ilk bloğu, süslü parantezleri sayarak keser. */
function blok(metin, bas) {
  const i = metin.indexOf(bas);
  assert.ok(i >= 0, `bulunamadı: ${bas}`);
  const ac = metin.indexOf('{', i + bas.length - 1);
  let derinlik = 0;
  for (let j = ac; j < metin.length; j += 1) {
    if (metin[j] === '{') derinlik += 1;
    else if (metin[j] === '}') {
      derinlik -= 1;
      if (derinlik === 0) return metin.slice(i, j + 1);
    }
  }
  throw new Error(`kapanmayan blok: ${bas}`);
}

const silKanca = kanca.slice(kanca.indexOf('const sil = React.useCallback('), kanca.indexOf('return {\n    bildirimler,'));

/* ------------------------------------------------ 1. kanca: iyimser değil */

test('kanca sil eylemini döndürüyor ve bildirimSil kullanıyor', () => {
  assert.match(kanca, /import \{[^}]*bildirimSil[^}]*\} from '\.\/bildirim'/);
  assert.match(kanca, /return \{[\s\S]*?\bsil,[\s\S]*?\};\s*\}\s*$/);
  assert.ok(silKanca.length > 0, 'sil eylemi bulunamadı');
});

test('satır ancak sunucu yanıtından SONRA listeden çıkıyor', () => {
  const bekle = silKanca.indexOf('await bildirimSil(b.id)');
  const cikar = silKanca.indexOf('setBildirimler((o) => o.filter((x) => x.id !== b.id))');
  assert.ok(bekle > 0, 'sunucu beklenmiyor');
  assert.ok(cikar > bekle, 'satır yanıttan önce çıkarılıyor (iyimser silme)');
  /* Hata yutulmuyor: catch yok, istisna çağırana geçiyor. */
  assert.ok(!/catch/.test(silKanca), 'silme hatası kancada yutuluyor');
});

test('okunmamış silinince sayı 1 düşüyor, sıra ilerliyor, sonra sunucudan okunuyor', () => {
  assert.match(
    silKanca,
    /if \(!b\.okunduMu\) \{\s*sayiSirasi\.current \+= 1;\s*setOkunmamis\(\(o\) => \(o === null \? o : Math\.max\(0, o - 1\)\)\);\s*\}\s*void sayiyiTazele\(\);/,
  );
});

test('satır sunucuda yoksa (false) liste ve sayı sunucudan tazeleniyor', () => {
  assert.match(silKanca, /const silindi = await bildirimSil\(b\.id\);/);
  assert.match(silKanca, /\} else \{\s*void listeyiTazele\(\);\s*void sayiyiTazele\(\);\s*\}/);
});

/* --------------------------------------------- 2. yarış ve çift dokunuş */

test('geç dönen liste okuması silinen satırı geri getirmiyor', () => {
  const liste = blok(kanca, 'const listeyiTazele = React.useCallback(async () =>');
  assert.match(liste, /\(await bildirimleriGetir\(\)\)\.filter\(\(b\) => !silinenler\.current\.has\(b\.id\)\)/);
  /* Kimlik yalnız ONAYDAN sonra kümeye giriyor; başarısız silme süzülmüyor. */
  assert.ok(
    silKanca.indexOf('silinenler.current.add(b.id)') > silKanca.indexOf('await bildirimSil(b.id)'),
    'kimlik sunucu onayından önce süzgece giriyor',
  );
});

test('oturum değişince silme süzgeci ve yoldaki silmeler temizleniyor', () => {
  const temizlik = kanca.slice(kanca.indexOf('aboneligiKapat();'));
  assert.match(temizlik, /silinenler\.current\.clear\(\);/);
  assert.match(temizlik, /yoldakiSilmeler\.current\.clear\(\);/);
  /* Başka oturumda dönen yanıt yeni kullanıcının sayısını düşürmüyor. */
  assert.match(silKanca, /if \(oturum\.current !== baslangic\) return;/);
});

test('aynı bildirime ikinci çağrı ikinci istek atmıyor, ilk isteğin sözünü alıyor', () => {
  assert.match(silKanca, /const yoldaki = yoldakiSilmeler\.current\.get\(b\.id\);\s*if \(yoldaki\) return yoldaki;/);
  assert.match(silKanca, /finally \{\s*yoldakiSilmeler\.current\.delete\(b\.id\);/);
  assert.equal((silKanca.match(/bildirimSil\(/g) ?? []).length, 1);
});

test('tümü okundu davranışı değişmedi', () => {
  const tumu = blok(kanca, 'const tumunuOkunduYap = React.useCallback(async () =>');
  assert.match(tumu, /await tumBildirimlerOkundu\(\);/);
  assert.ok(!/bildirimSil|silinenler/.test(tumu), 'tümü okundu silmeye bağlanmış');
});

/* ------------------------------------------------------ 3. panel */

test('App kancanın sil eylemini panele bağlıyor', () => {
  assert.match(app, /<BildirimMerkezi[\s\S]*?onSil=\{bildirim\.sil\}[\s\S]*?\/>/);
});

test('onSil verilmezse Sil düğmesi hiç çizilmiyor', () => {
  assert.match(merkez, /onSil\?: \(b: Bildirim\) => Promise<void>;/);
  assert.match(merkez, /\{onSil && \(\s*<button/);
});

test('Sil satır düğmesinin içinde değil, kardeşi', () => {
  const satir = blok(merkez, 'const satirCiz = (b: Bildirim) =>');
  const ana = satir.indexOf('onClick={() => onAc(b)}');
  const anaKapanis = satir.indexOf('</button>', ana);
  const sil = satir.indexOf('data-bildirim-sil={b.id}');
  assert.ok(ana > 0 && sil > anaKapanis, 'Sil satırın <button> öğesinin içinde');
  /* Sil, bağlantı isteği kararlarından önce: sekme sırası görünen sırayla aynı. */
  assert.ok(sil < satir.indexOf("void yanitla(b.id, 'kabul')"), 'Sil kararlardan sonra geliyor');
});

test('Sil erişilebilir: başlıklı ad, 44 px hedef, odak halkası, meşgul durumu', () => {
  const satir = blok(merkez, 'const satirCiz = (b: Bildirim) =>');
  const dugme = satir.slice(satir.indexOf('data-bildirim-sil={b.id}'), satir.indexOf('</button>', satir.indexOf('data-bildirim-sil={b.id}')));
  assert.match(dugme, /aria-label=\{`"\$\{b\.baslik\}" bildirimini sil`\}/);
  assert.match(dugme, /disabled=\{silinmekte\}/);
  assert.match(dugme, /aria-busy=\{silinmekte\}/);
  assert.match(dugme, /\bh-11 w-11\b/);
  assert.match(dugme, /\$\{ODAK_HALKASI\}/);
  /* Yalnız hover'da görünür değil: görünürlüğü gizleyen bir sınıf yok. */
  const sinif = dugme.match(/className=\{`([^`]*)`\}/)?.[1] ?? '';
  assert.match(sinif, /text-gray-500/);
  assert.ok(!/\bopacity-0\b|\binvisible\b|(^|\s)(sm:)?hidden\b/.test(sinif), 'Sil yalnız hover\'da görünüyor');
  /* Simge bilgi taşımıyor, ad aria-label'da. */
  assert.match(dugme, /<Trash2 aria-hidden="true"/);
  assert.match(merkez, /import \{ ODAK_HALKASI \} from '\.\.\/lib\/renk-token';/);
});

test('silinirken "Siliniyor…", başarısızlıkta role=alert ile hata', () => {
  assert.match(merkez, /\{silinmekte && \(\s*<p role="status"[^>]*>\s*Siliniyor…/);
  assert.match(
    merkez,
    /\{!silinmekte && silinemedi && \(\s*<p role="alert"[^>]*>\s*Bildirim silinemedi\. Bağlantını kontrol edip yeniden dene\./,
  );
});

test('panel satırı kendisi çıkarmıyor; hata durumu satıra bağlı kalıyor', () => {
  const sil = blok(merkez, 'const sil = async (b: Bildirim, dugme: HTMLButtonElement) =>');
  assert.match(sil, /await onSil\(b\);/);
  assert.match(sil, /catch \{\s*setSilmeHatasi\(\(k\) => kumeyeEkle\(k, b\.id\)\);/);
  /* Bileşen listeye dokunmuyor: satır ancak çağıran çıkarınca gidiyor. */
  assert.ok(!/bildirimler\.filter\(\(x\) => x\.id !== b\.id\)/.test(merkez), 'panel satırı iyimser çıkarıyor');
});

test('çift tıklama ref kilidiyle tek istek', () => {
  const sil = blok(merkez, 'const sil = async (b: Bildirim, dugme: HTMLButtonElement) =>');
  assert.match(sil, /if \(!onSil \|\| silmeKilidi\.current\.has\(b\.id\)\) return;\s*silmeKilidi\.current\.add\(b\.id\);/);
  assert.match(sil, /finally \{\s*silmeKilidi\.current\.delete\(b\.id\);/);
  assert.ok(sil.indexOf('silmeKilidi.current.add') < sil.indexOf('await onSil'));
});

test('silmeden sonra odak sonraki, önceki ya da başlığa gidiyor', () => {
  const sil = blok(merkez, 'const sil = async (b: Bildirim, dugme: HTMLButtonElement) =>');
  assert.match(sil, /sonrakiler: sira\.slice\(yer \+ 1\)/);
  assert.match(sil, /oncekiler: sira\.slice\(0, Math\.max\(0, yer\)\)\.reverse\(\)/);
  const etki = merkez.slice(merkez.indexOf('if (!odakIstegi) return;'));
  assert.match(etki, /odakIstegi\.sonrakiler\.find\([\s\S]*?\?\?\s*odakIstegi\.oncekiler\.find\(/);
  assert.match(etki, /else baslikRef\.current\?\.focus\(\);/);
  assert.match(merkez, /<h2\s+ref=\{baslikRef\}\s+tabIndex=\{-1\}/);
  /* Zamanlayıcı yok: odak çizimden sonra etkide taşınıyor. */
  assert.ok(!/setTimeout/.test(merkez));
});

test('panel açılış odağı yeniden çizimde tekrarlanmıyor', () => {
  /*
    Etki `[onKapat]`'a bağlıyken yeni `onKapat` veren çağıranda her çizim
    odağı panele çekiyor ve silmeden sonraki odak taşımasını bozuyordu.
  */
  assert.match(merkez, /if \(e\.key === 'Escape'\) onKapatRef\.current\(\);[\s\S]*?kapsayici\.current\?\.focus\(\);[\s\S]*?\}, \[\]\);/);
});

test('silme ekran okuyucuya duyuruluyor, liste boşalınca boş durum metni', () => {
  assert.match(merkez, /setDuyuru\('Bildirim silindi\.'\)/);
  assert.match(merkez, /<p role="status" className="sr-only">\s*\{duyuru\}/);
  assert.match(merkez, /bildirimler\.length === 0 \?[\s\S]*?Henüz bildirimin yok\./);
});

test('onay penceresi açılmıyor', () => {
  assert.ok(!/window\.confirm|confirm\(/.test(merkez), 'tek bildirim için onay penceresi açılıyor');
});
