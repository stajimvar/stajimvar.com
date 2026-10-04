import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  basvuruKapanisNedeni,
  ETIKET_ILAN_KAPALI,
  ETIKET_SURE_DOLDU,
} from '../src/lib/basvuru-devam.mjs';

/*
  KAPANMIŞ İÇ İLAN VE BEKLEME CÜMLESİ (4 Ekim 2026, kullanıcı kararı)

  1. Son başvuru günü geçmiş iç ilanın sayfasında "StajımVar ile Başvur"
     çiziliyordu; basınca yalnız "artık başvuru kabul etmiyor" deniyordu.
     Artık düğme yok, yerinde durum var. Dış ilanın düğmesi bu kararın
     konusu değil.
  2. Düğmeyi gizlemek kapının yerine geçmiyor: `basvuruKarari` kapısı ve
     girişten dönüşte ilanın sunucudan okunması duruyor.
  3. "Profilin yükleniyor…" hem tıklamada hem girişten dönüşte, aynı
     bekleme için bir kez.

  Kaynak YORUMLARI DÜŞÜRÜLEREK okunuyor (yorumlar eski hatayı anlatıyor).
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');
const koddan = (metin) =>
  metin.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const sayfa = koddan(oku('src/components/ListingPage.tsx'));
const app = koddan(oku('src/App.tsx'));

const arasi = (metin, bas, son) => {
  const i = metin.indexOf(bas);
  assert.ok(i >= 0, `bulunamadı: ${bas}`);
  const j = metin.indexOf(son, i + bas.length);
  assert.ok(j > i, `bitiş bulunamadı: ${son}`);
  return metin.slice(i, j);
};

/* ------------------------------------------------ 1. düğme yerine durum */

test('kapanış nedeni yalnız iç ilan için ve Istanbul gününe göre hesaplanıyor', () => {
  assert.match(
    sayfa,
    /const kapanis =\s*listing && yol\.anaEylem === 'platform-ici'\s*\? basvuruKapanisNedeni\(listing, istanbulGunBaslangici\(\)\.slice\(0, 10\)\)\s*: null;/,
  );
});

test('kapalı iç ilanda onApply düğmesi yerine durum çiziliyor (masaüstü ve telefon)', () => {
  /* İki çizim yeri de aynı kapıdan geçiyor. */
  assert.equal((sayfa.match(/<BasvuruKapaliDurumu neden=\{kapanis\} \/>/g) ?? []).length, 2);
  assert.match(
    sayfa,
    /\{kapanis \? \(\s*<BasvuruKapaliDurumu neden=\{kapanis\} \/>\s*\) : \(\s*<button[\s\S]*?onApply\(listing\)/,
    'masaüstünde düğme kapıdan geçmiyor',
  );
  assert.match(
    sayfa,
    /\) : kapanis \? \(\s*<BasvuruKapaliDurumu neden=\{kapanis\} \/>\s*\) : \(\s*<button[\s\S]*?onApply\(listing\)/,
    'telefon çubuğunda düğme kapıdan geçmiyor',
  );
  /* `onApply` yalnız bu iki düğmede; kapıyı atlayan üçüncü yer yok. */
  assert.equal((sayfa.match(/onApply\(listing\)/g) ?? []).length, 2);
});

test('durum öğesi düğme değil, iki etiketten birini metinle taşıyor', () => {
  const bilesen = sayfa.slice(sayfa.indexOf('const BasvuruKapaliDurumu'));
  assert.ok(!/<button/.test(bilesen), 'kapalı durum tıklanabilir bir düğme olarak çiziliyor');
  assert.match(bilesen, /role="status"/);
  assert.match(bilesen, /neden === 'sure-doldu' \? ETIKET_SURE_DOLDU : ETIKET_ILAN_KAPALI/);
  assert.match(bilesen, /aria-hidden="true"/);
  assert.match(bilesen, /min-h-12/);
  assert.equal(ETIKET_SURE_DOLDU, 'Başvuru süresi doldu');
  assert.equal(ETIKET_ILAN_KAPALI, 'İlan başvuruya kapalı');
});

test('kural: dün biten ilan "süre doldu", bugün biten açık, yayında olmayan "kapalı"', () => {
  const bugun = '2026-10-04';
  assert.equal(basvuruKapanisNedeni({ applicationDeadline: '2026-10-03' }, bugun), 'sure-doldu');
  assert.equal(basvuruKapanisNedeni({ applicationDeadline: '2026-10-04' }, bugun), null);
  assert.equal(basvuruKapanisNedeni({ applicationDeadline: '' }, bugun), null);
  assert.equal(basvuruKapanisNedeni({ status: 'closed', applicationDeadline: '2026-10-01' }, bugun), 'kapali');
});

test('dış ilan yolu etkilenmiyor', () => {
  /* Kapanış yalnız platform içi ilanda hesaplanıyor; dış ilan için null. */
  assert.match(sayfa, /listing && yol\.anaEylem === 'platform-ici'\s*\?/);
  /* Dış ilanın bağlantısı ve "Başvurdum" takibi kapıya bağlanmadı. */
  const disDal = arasi(sayfa, "{yol.resmiAdres && yol.anaEylem === 'resmi-site' ? (", ') : kapanis ? (');
  assert.ok(!/kapanis/.test(disDal), 'dış ilan dalı kapanış kuralına bağlanmış');
  assert.match(disDal, /onClick=\{\(\) => onTrack\(listing\)\}/);
  assert.match(disDal, /\{hedef\.etiket\}/);
});

/* ------------------------------------------- 2. sunucu kapıları duruyor */

test('basvuruKarari kapısı ve devamda sunucu okuması hâlâ duruyor', () => {
  const tiklama = arasi(app, 'const handleApplyToJob = (', 'React.useEffect(');
  assert.match(tiklama, /const karar = basvuruKarariVer\(listing, 'bulundu'\);/);
  const ver = arasi(app, 'const basvuruKarariVer = (', 'const basvuruKarariniUygula = (');
  assert.match(ver, /acik: basvuruyaAcikMi\(ilan, istanbulGunBaslangici\(\)\.slice\(0, 10\)\)/);
  const devam = arasi(app, 'const niyet = niyetOku(window.sessionStorage);', '}, [sessionReady, session]);');
  assert.match(devam, /fetchListingByIdPrefix\(niyet\.ilanId\.slice\(0, 8\)\)/);
  assert.match(devam, /getirilen && getirilen\.id === niyet\.ilanId \? getirilen : null/);
});

/* ------------------------------------------ 3. bekleme cümlesi bir kez */

test('"Profilin yükleniyor…" iki yolun ortak etkisinde ve bekleme başına bir kez', () => {
  const etki = arasi(
    app,
    'const b = bekleyenBasvuru;',
    '}, [bekleyenBasvuru, session, profilDurumu, basvurularYuklenen, applications]);',
  );
  assert.match(
    etki,
    /if \(profilBekleniyor && duyurulanBekleme\.current !== b\.anahtar\) \{\s*duyurulanBekleme\.current = b\.anahtar;\s*showToast\(MESAJ_PROFIL_YUKLENIYOR\);/,
  );
  /* Yalnız profil ya da başvuru listesi beklenirken; ilan yanıtı beklenirken değil. */
  assert.match(etki, /const profilBekleniyor = profilDurumu === 'yukleniyor' \|\| basvurularYuklenen !== session\.userId;/);
  /* Tek kaynak: cümle başka yerde ayrıca basılmıyor (çift gösterim olurdu). */
  assert.equal((app.match(/showToast\(MESAJ_PROFIL_YUKLENIYOR\)/g) ?? []).length, 1);
  assert.ok(!/Profilin yükleniyor/.test(arasi(app, 'const handleApplyToJob = (', 'React.useEffect(')));
  /* İki yol da aynı bekleyen kayda yazıyor. */
  assert.match(app, /kaynak: 'tik',/);
  assert.match(app, /kaynak: 'niyet',/);
  assert.match(app, /const MESAJ_PROFIL_YUKLENIYOR = 'Profilin yükleniyor…';/);
});
