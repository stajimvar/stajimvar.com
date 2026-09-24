import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
  PROFİL SAYFA DÜZENİ — kullanıcı kararı 24 Eylül 2026: X sayfa düzeni,
  sol menü yok.

  Kullanıcı x.com/StajimVar ekran görüntüsünde sol menünün üstünü çizdi:
  istenen X'in SAYFA düzeni — ortada ~600 piksellik profil sütunu, sağında
  ayrı bir yan sütun. Üç profil ekranı (/cv ana görünümü, /profil/:ad,
  şirket sayfası) aynı kabı paylaşıyor; /cv düzenleme kipi ve Ağım
  değişmiyor.
*/

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
function yorumsuz(kaynak) {
  return kaynak.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*/gm, '$1');
}

const duzen = oku('src/components/sosyal/ProfilSayfaDuzeni.tsx');
const genisEkran = oku('src/components/sosyal/useGenisEkran.ts');
const cv = oku('src/components/StudentProfileView.tsx');
const sayfa = oku('src/components/sosyal/SosyalProfilSayfasi.tsx');
const agim = oku('src/components/sosyal/AgimSayfasi.tsx');

test('kabın ölçüleri: ana sütun 600, yan sütun 350, aralık 32, ortalı', () => {
  assert.match(duzen, /export const PROFIL_SAYFA_DUZENI = 'lg:flex lg:items-start lg:justify-center lg:gap-8';/);
  assert.match(duzen, /export const PROFIL_ANA_SUTUNU = 'w-full min-w-0 lg:max-w-\[600px\]';/);
  assert.match(duzen, /export const PROFIL_YAN_SUTUNU = 'w-\[350px\] shrink-0 sticky top-4 space-y-4';/);
  /* Sol menü yok: kapta yalnız iki sütun. */
  assert.doesNotMatch(yorumsuz(duzen), /<nav/);
});

test('yan sütun yalnız xl ve üstünde ve yalnız verildiğinde DOM\'a giriyor', () => {
  /*
    1024'te iki sütun sığmıyor (600 + 32 + 350 = 982, içerik alanı daha
    dar — ölçüm kabın başlık yorumunda). Yan sütun CSS ile gizlenmiyor,
    hiç kurulmuyor: kendi verisini çekiyor ve görünmeyen bir sütun için
    istek atılırdı.
  */
  assert.match(genisEkran, /export const XL_SORGUSU = '\(min-width: 1280px\)';/);
  assert.match(duzen, /const genis = useGenisEkran\(XL_SORGUSU\);/);
  assert.match(duzen, /\{genis && yanSutun && \(\s*<aside aria-label="Önerilenler" className=\{PROFIL_YAN_SUTUNU\}>/);
  assert.doesNotMatch(yorumsuz(duzen), /hidden xl:block|hidden lg:block/);
  /* Düzenleme kipi için kap devre dışı bırakılabiliyor. */
  assert.match(duzen, /if \(devreDisi\) return <>\{children\}<\/>;/);
});

test('/cv ana görünümü kapta; düzenleme kipi değişmiyor; yan sütun sahibin satırından', () => {
  assert.match(cv, /<ProfilSayfaDuzeni\s+devreDisi=\{duzenleme\}/);
  assert.match(
    cv,
    /sosyalPortfolyoSatiri\?\.profilId \? \(\s*<AgimYanSutun\s+kullaniciId=\{sosyalPortfolyoSatiri\.profilId\}\s+sektorId=\{sosyalPortfolyoSatiri\.sektorId\}\s+onNavigate=\{sosyalPortfolyoSatiri\.onNavigate\}/,
  );
  /* İçerideki 12'lik iskelet aynen: kap onu sarıyor, değiştirmiyor. */
  const kapBasi = cv.indexOf('<ProfilSayfaDuzeni');
  const izgara = cv.indexOf('<div className="grid grid-cols-1 gap-0 sm:gap-6 lg:grid-cols-12 items-start">');
  assert.ok(kapBasi > 0 && izgara > kapBasi);
  /* Kimlik ve alan panelden taşınıyor, tahmin edilmiyor. */
  assert.match(sayfa, /profilId: profil\?\.profilId \?\? null,\n\s*sektorId: profil\?\.sektorId \?\? null,/);
});

test('/profil/:ad ve şirket sayfası aynı kapta; yan sütun BAKAN için, oturum yoksa yok', () => {
  assert.match(
    sayfa,
    /const bakaninYanSutunu = kullaniciId \? \(\s*<AgimYanSutun kullaniciId=\{kullaniciId\} sektorId=\{profil\?\.sektorId \?\? null\} onNavigate=\{onNavigate\} \/>\s*\) : undefined;/,
  );
  assert.equal((sayfa.match(/<ProfilSayfaDuzeni yanSutun=\{bakaninYanSutunu\}>/g) ?? []).length, 2);
  /* Şirket dalı ve ziyaretçi dalı ayrı ayrı sarılı. */
  const sirketDali = sayfa.slice(sayfa.indexOf('<SirketSayfasi'), sayfa.indexOf('</React.Suspense>'));
  assert.ok(sirketDali.length > 0);
  assert.ok(sayfa.lastIndexOf('<ProfilSayfaDuzeni yanSutun={bakaninYanSutunu}>', sayfa.indexOf('<SirketSayfasi')) > 0);
  assert.ok(sayfa.lastIndexOf('<ProfilSayfaDuzeni yanSutun={bakaninYanSutunu}>', sayfa.indexOf('profil={ziyaretciProfili}\n            sahibiMi={false}')) > 0);
  /* İskelet de aynı sütunda: profil gelince genişlik zıplamıyor. */
  assert.match(sayfa, /<ProfilSayfaDuzeni>\s*<ProfilIskeleti \/>\s*<\/ProfilSayfaDuzeni>/);
});

test('Ağım değişmedi: kendi yan sütununu kendi iskeletinde çiziyor', () => {
  assert.doesNotMatch(agim, /ProfilSayfaDuzeni/);
  assert.match(agim, /<AgimYanSutun kullaniciId=\{kullaniciId\} sektorId=\{benim\?\.sektorId \?\? null\} onNavigate=\{onNavigate\} \/>/);
});
