import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { aktarilacak } from '../scripts/resmi-paylasim-aktar.mjs';
import { aciklamaKur, paylasimSorunlari } from '../src/lib/instagram-paylasim.mjs';

/**
 * INSTAGRAM PANELİ — AKTARIM SÖZLEŞMESİ
 *
 * "28 takvim seti `kartlar` biçimi yüzünden panele aktarılamıyor" diye
 * bildirmiştim. ÖLÇTÜM: öyle bir hata YOK.
 *
 *   `setiAktar` kartı DÜZ DİZE olarak kullanıyor
 *   (`kart.replace(/^\\//, '')`) — yani düz dize canonical biçim ve
 *   manifestteki 28 setin 28'i o biçimde.
 *
 * Kırmızı test tamamen benim COMMIT ETMEDİĞİM yerel `setler.json`
 * kopyamdan geliyordu: PR #57'de eski setleri birleştirmişim ve
 * `staj-sigortasi` kaydı artık olarak kalmış; dosyada 28 yerine 29 set
 * görünüyordu. `origin/main` sürümüyle aynı test yeşil.
 *
 * Bu dosya o dersi bağlıyor: aktarımın gerçekten çalıştığı, yayın
 * isteğinden ÖNCEKİ veriyle doğrulanıyor. GERÇEK INSTAGRAM GÖNDERİSİ
 * OLUŞTURULMUYOR — yayınlama, gönderi kimliği ve 24 saat temizliği
 * akışlarına dokunulmuyor.
 */

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const setler = JSON.parse(
  fs.readFileSync(path.join(kok, 'public', 'paylasim', 'setler.json'), 'utf8')
);

test('kartlar biçimi canonical: düz dize, setiAktar bunu okuyor', () => {
  /*
    `setiAktar` içinde `kart.replace(/^\//, '')` var — string işlemi.
    Nesne gelse `replace` diye bir alan olmadığı için çökerdi.
  */
  const AKTAR = fs.readFileSync(path.join(kok, 'scripts', 'resmi-paylasim-aktar.mjs'), 'utf8');
  assert.match(AKTAR, /kart\.replace\(\/\^\\\/\/, ''\)/);

  for (const set of setler) {
    for (const kart of set.kartlar ?? []) {
      assert.equal(typeof kart, 'string', `${set.kod}: kart düz dize olmalı`);
      assert.match(kart, /^\/paylasim\//, `${set.kod}: yol /paylasim/ ile başlamalı`);
    }
  }
});

test('28 setin tamamı panele taslak olarak aktarılabiliyor', () => {
  assert.equal(setler.length, 28, 'panel iki haftalık takvim');

  const anahtarlar = new Set();
  for (const set of setler) {
    const icerik = aktarilacak(set);

    /* Açıklama boş olmamalı: boş açıklamalı taslak panelde işe yaramaz. */
    assert.ok(icerik.aciklama.length > 0, `${set.kod}: açıklama boş`);
    /* Dört kart: manifest sözleşmesi. */
    assert.equal(icerik.kartlar.length, 4, `${set.kod}: dört kart olmalı`);
    /* Kitle her zaman resmî — sunucu da aynı sınırı çiziyor. */
    assert.equal(icerik.kitle, 'resmi', `${set.kod}: kitle resmi olmalı`);

    /*
      ANAHTAR TÜRETİLMİŞ VE TEKİL: aynı set iki kez aktarılınca ikinci
      paylaşım oluşmuyor (`istemci_anahtari` çakışıyor).
    */
    assert.match(icerik.istemciAnahtari, /^[0-9a-f-]{36}$/, `${set.kod}: uuid bekleniyor`);
    assert.ok(!anahtarlar.has(icerik.istemciAnahtari), `${set.kod}: anahtar tekil olmalı`);
    anahtarlar.add(icerik.istemciAnahtari);

    /* Görsellerin hepsi diskte: eksik dosya aktarımı yarıda bırakırdı. */
    for (const kart of icerik.kartlar) {
      const dosya = path.join(kok, 'public', kart.replace(/^\//, ''));
      assert.ok(fs.existsSync(dosya), `${set.kod}: ${kart} diskte yok`);
    }
  }
  assert.equal(anahtarlar.size, 28);
});

test('yayın isteği öncesi veri Instagram kurallarını geçiyor', () => {
  /*
    GERÇEK GÖNDERİ OLUŞTURULMUYOR: `paylasimSorunlari` yayın
    isteğinden önce çalışan doğrulayıcı ve burada onunla aynı veriyi
    sınıyoruz. Boş dizi = istek gönderilebilir durumda.
  */
  for (const set of setler) {
    const sorunlar = paylasimSorunlari(
      {
        gorseller: set.kartlar.map((k) => `https://stajimvar.com${k}`),
        aciklama: aciklamaKur(set.metin, set.etiketler),
      },
      'stajimvar.com'
    );
    assert.deepEqual(sorunlar, [], `${set.kod}: ${sorunlar.join(', ')}`);
  }
});

test('eski set kaydı silinmedi: üreticisi ve testi yerinde', () => {
  /*
    İDDİAMI DÜZELTİYORUM — CI YAKALADI

    Önce `public/paylasim/staj-sigortasi/` klasörünün diskte durduğunu
    iddia ediyordum ve o klasör DEPODA İZLENMİYOR: yerel çalışma
    ağacımdaki bir artıktı (PR #57'deki birleşimimden). CI'da klasör
    yok ve test haklı olarak kırmızı döndü.

    "Kayıt silinmedi" güvencesinin gerçek dayanağı klasör değil
    ÜRETİCİ: `scripts/paylasim-staj-sigortasi.mjs` duruyor ve kendi
    testi setini manifeste ekleyip görsellerini üretiyor. Panel
    görünümü iki haftalık takvime daraldı; set kaybolmadı, istendiğinde
    yeniden üretiliyor.
  */
  assert.ok(
    fs.existsSync(path.join(kok, 'scripts', 'paylasim-staj-sigortasi.mjs')),
    'eski setin üreticisi korunmalı'
  );
  assert.ok(
    fs.existsSync(path.join(kok, 'tests', 'staj-sigortasi-set.test.mjs')),
    'eski setin testi korunmalı'
  );

  /*
    Asıl korunması istenen şey takvimin kendi dosyaları: 28 set × 4
    kart = 112 görsel. Hepsi DEPODA izlenir olmalı, yoksa CI'da
    aktarım kırılır.
  */
  const tumKartlar = setler.flatMap((set) => set.kartlar ?? []);
  assert.equal(tumKartlar.length, 112, 'takvimin 112 görseli');
  for (const kart of tumKartlar) {
    assert.ok(
      fs.existsSync(path.join(kok, 'public', kart.replace(/^\//, ''))),
      `${kart} diskte olmalı`
    );
  }
});
