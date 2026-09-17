import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  PROFİL FOTOĞRAFI GÖRÜNTÜLEYİCİ — INSTAGRAM KALIBI (kullanıcı isteği, 17 Eylül 2026)

  İki kural ölçülüyor; ikisi de "sahte özellik yok" ilkesinin bu ekrandaki
  karşılığı:

  1. Fotoğraf yoksa görüntüleyici AÇILMIYOR ve dokunma hedefi düğme
     değil. Baş harf yer tutucusunu büyütmenin karşılığı yok.
  2. Alt eylemler yalnız "Paylaş" ve "Bağlantıyı kopyala". Kullanıcının
     üstünü çizdiği parçalar (avatar sırası, QR kodu, Avatar ekle) hiç
     çizilmiyor — "yakında" etiketi dahil.

  Tarayıcı çalıştırılmıyor; ölçülen şey kaynak metnin yapısı (deponun
  öteki arayüz testleriyle aynı yöntem).
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
/* Yorumlar düşülüyor: gerekçe metninde geçen bir sözcük iddiayı bozmasın. */
const yorumsuz = (metin) => metin.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const fotograf = oku('src/components/sosyal/ProfilFotografi.tsx');
const goruntuleyici = oku('src/components/sosyal/ProfilFotografiGoruntuleyici.tsx');

test('fotoğraf yokken görüntüleyici açılmıyor; dokunma hedefi düğme değil', () => {
  /*
    Düğme ve görüntüleyici yalnız `if (adres) {` bloğunun içinde. Blok
    sınırı: `if (adres) {` ile baş harf dalı (`return <Avatar name={ad}
    className={className} />`) arasındaki metin.
  */
  const kod = yorumsuz(fotograf);
  const bas = kod.indexOf('if (adres) {');
  const son = kod.indexOf('return <Avatar name={ad} className={className} />');
  assert.ok(bas > 0 && son > bas, 'adres dalı ve baş harf dalı bu sırayla olmalı');
  const adresDali = kod.slice(bas, son);
  const disi = kod.slice(0, bas) + kod.slice(son);

  assert.match(adresDali, /<button[\s\S]*?ref=\{dugmeRef\}/);
  assert.match(adresDali, /\{acik && \(\n\s*<ProfilFotografiGoruntuleyici/);
  /* Blok dışında ne düğme ne görüntüleyici: iskelet, yedek ve baş harf dalları düz. */
  assert.doesNotMatch(disi, /<button|<ProfilFotografiGoruntuleyici/);
  /* Büyütme istenmemişse (düzenleme bloğu, bildirim satırı) görsel yine düz. */
  assert.match(adresDali, /if \(!buyutme\) return gorsel;/);

  /* Görüntüleyici adres olmadan çizilemiyor: prop zorunlu, "adres yoksa" dalı yok. */
  assert.match(goruntuleyici, /\n  adres: string;\n/);
  assert.doesNotMatch(yorumsuz(goruntuleyici), /adres\s*\?\?|!adres/);
});

test('alt eylemler yalnız Paylaş ve Bağlantıyı kopyala; üstü çizilenler yok', () => {
  const kod = yorumsuz(goruntuleyici);

  /* Tam olarak dört düğme: kapat, kalem (yalnız sahibinde), Paylaş, Bağlantıyı kopyala. */
  assert.equal((kod.match(/<button/g) ?? []).length, 4);
  assert.match(kod, /<button[^>]*onClick=\{paylas\}[\s\S]{0,200}Paylaş\n/);
  assert.match(kod, /'Bağlantıyı kopyala'/);
  /* "Kopyalandı" ancak pano yazmayı kabul edince; hata dalı ayrı cümle. */
  assert.match(kod, /await navigator\.clipboard\.writeText\(tamAdres\);\n\s*setKopyalama\('kopyalandi'\);/);
  assert.match(kod, /'Kopyalanamadı'/);
  /* Kopya adresi yalnız kullanıcı adı verilmişse; çağıran onu yalnız yayındayken veriyor. */
  assert.match(kod, /\{kullaniciAdi && \(\n\s*<button/);
  assert.match(oku('src/components/sosyal/SosyalProfilGorunumu.tsx'), /kullaniciAdi: profil\.yayindaMi \? profil\.kullaniciAdi : null/);
  assert.match(oku('src/components/ProfilBasligi.tsx'), /kullaniciAdi: satir\?\.menu\.yayindaMi \? satir\.kullaniciAdi : null/);

  /* Kalem `onFotografDegistir` kapısının arkasında; ziyaretçi görünümü onu yalnız sahibe veriyor. */
  assert.match(kod, /\{onFotografDegistir && \(\n\s*<button/);
  assert.match(oku('src/components/sosyal/SosyalProfilGorunumu.tsx'), /onFotografDegistir: sahibiMi \? onFotografDegistir : undefined/);

  /* Üstü çizilenler ve "yakında" yok. */
  assert.doesNotMatch(kod, /QR|[Aa]vatar ekle|[Yy]akında|hikaye|story/);
  /* Paylaş yeni mantık değil, sayfanın eylemi: burada `navigator.share` çağrılmıyor. */
  assert.doesNotMatch(kod, /navigator\.share/);
});
