import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
  PUBLIC METİN — ÜRÜNÜN GERÇEĞİ

  Kurumsal sayfalar üründen geride kalmıştı: CV yükleme aylardır
  çalışırken sayfa "henüz yapamıyoruz" diyordu, günlük bağlantı
  kontrolü kapanan ilanları düşürürken sayfa "bu otomatik düşürme şu an
  devre dışı" diyordu.

  İki yönlü kural:
    ÜRÜNDE VAR OLANA "YOK" DENMEYECEK.
    ÜRÜNDE OLMAYANA "VAR" DENMEYECEK.
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');
const kurumsal = oku('src/components/CorporatePages.tsx');

/* --------------------------------- 1. var olana "yok" denmiyor */

test('CV yükleme "henüz yok" diye anlatılmıyor', () => {
  /* PDF yükleme + başvuru kopyası üretimde çalışıyor. */
  assert.ok(
    !/Henüz yapamıyoruz:\s*özgeçmiş dosyası yükleme/.test(kurumsal),
    'çalışan CV yükleme "henüz yok" diye anlatılıyor',
  );
  assert.ok(
    !/yüklediğiniz bir PDF değil/.test(kurumsal),
    'başvuruya PDF gitmediği yazıyor — gidiyor',
  );
  assert.match(kurumsal, /profilinize PDF yükleyebiliyorsunuz/);
});

test('başvuru kopyası doğru anlatılıyor', () => {
  /* Profildeki dosya değişse de başvurudaki kopya değişmiyor. */
  assert.match(kurumsal, /şirketin gördüğü belge değişmiyor/);
});

test('şirketlerin ilan açabildiği yazıyor', () => {
  assert.ok(!/şirketler ilan açamaz/i.test(kurumsal));
  assert.match(kurumsal, /Şirketler kendi ilanlarını giriyor/);
});

test('görüşme ve teklif akışı anlatılıyor', () => {
  for (const parca of ['görüşmeye davet', 'teklif gönderiyor', 'iletişim bilgileri']) {
    assert.ok(kurumsal.includes(parca), `işe alım akışında eksik: ${parca}`);
  }
});

/* ------------------------------- 2. olmayana "var" denmiyor */

test('e-posta ya da push bildirimi vaat edilmiyor', () => {
  assert.match(kurumsal, /E-posta, SMS ya da telefon bildirimi göndermiyoruz/);
  assert.match(kurumsal, /Bildirimler uygulama içinde/);
});

test('otomatik düşürme "devre dışı" denmiyor', () => {
  /*
    Günlük bağlantı kontrolü kaynağı kapanan ilanı gerçekten
    düşürüyor (scripts/ilan-baglanti-kontrol.mjs → status='closed').
  */
  assert.ok(
    !/Bu otomatik düşürme şu an devre dışı/.test(kurumsal),
    'çalışan kapanma tespiti "devre dışı" diye anlatılıyor',
  );
  assert.match(kurumsal, /her gün/);
});

test('geçici hataların ilanı kapatmadığı yazıyor', () => {
  /* Gerçek davranış: yalnız 404/410 ve sayfanın kendi kapandı metni. */
  assert.match(kurumsal, /Geçici erişim hataları tek başına/);
});

test('doğrulanmamış büyük sayı vaadi yok', () => {
  for (const abarti of ['binlerce ilan', "Türkiye'deki tüm staj", 'tüm staj ilanları']) {
    assert.ok(!kurumsal.includes(abarti), `doğrulanmamış vaat: ${abarti}`);
  }
});

/* ------------------------------------ 3. iki ilan modeli */

test('harici ve dahili ilan ayrımı anlatılıyor', () => {
  assert.match(kurumsal, /İki ilan modelimiz var/);
  assert.match(kurumsal, /ilanın resmî kaynağına/);
  assert.match(kurumsal, /doğrudan StajımVar/);
});

test('bütün başvurular externalmış gibi anlatılmıyor', () => {
  assert.ok(
    !/başvuruların tamamı şirketin sitesinde/i.test(kurumsal),
    'dahili başvuru yokmuş gibi anlatılıyor',
  );
  assert.match(kurumsal, /başvuru siteden çıkmadan/);
});

/* -------------------------------- 4. tarama sıklığı gerçek */

test('tarama ve bağlantı kontrolü sıklığı ayrı ayrı doğru', () => {
  /*
    Ölçüldü: tarama cron "17 * * * *" (saatlik), bağlantı kontrolü
    cron "40 4 * * *" (günlük). Sayfa ikisini tek cümlede
    birleştiriyordu.
  */
  assert.match(kurumsal, /saatte bir taranıyor/);
  assert.match(kurumsal, /her\s*\n?\s*gün yeniden kontrol/);
});
