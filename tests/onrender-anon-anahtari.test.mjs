import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * ÖN RENDER SERVİS ANAHTARI KULLANMIYOR
 *
 * NEDEN
 * -----
 * `SUPABASE_SERVICE_ROLE_KEY` satır güvenliğini (RLS) ATLIYOR. Ön render
 * herkese açık HTML üretiyor; bu yolda servis anahtarı kullanmak iki
 * somut zarar üretiyor:
 *
 *   1. Ziyaretçinin göremeyeceği bir satır statik sayfaya girebilir.
 *   2. Statik HTML ile hidrasyon AYRIŞIR: sayfa dolu geliyor, tarayıcı
 *      aynı kaydı çekemeyince ekran "bulunamadı"ya düşüyor.
 *
 * İkincisi teorik değil, ÖLÇÜLDÜ (15 Eylül 2026): fırsat çekimi servis
 * anahtarını tercih ediyordu ve `envOku` `automation/.env` dosyasını da
 * okuduğu için yerel derleme RLS'i atlıyordu — yani yerel çıktı üretimi
 * temsil etmiyordu. Fırsat tarafı düzeltildi; bu test kalan iki genel
 * yolu da bağlıyor ki kural bir daha sessizce gevşemesin.
 *
 * KAYIP YOK — POLİTİKALAR ÖLÇÜLDÜ (canlı, 15 Eylül 2026):
 *   listings   status='published' OR is_company_member(...)
 *              → sorgu zaten status=eq.published süzüyor
 *   companies  koşul `true` → anon bütün şirketleri görüyor
 *   opportunities  status IN ('published','expired')
 *
 * KAPSAM: yalnız ön render. Elle koşan bakım betikleri (veri düzeltme,
 * avatar taşıma, paylaşım temizleme) servis anahtarını kullanmaya devam
 * ediyor; onlar herkese açık HTML üretmiyor ve bu testin konusu değil.
 */

const KOK = path.resolve(import.meta.dirname, '..');
const ONRENDER = readFileSync(path.join(KOK, 'scripts', 'onrender.mjs'), 'utf8').replace(
  /\r\n/g,
  '\n'
);

/** Bir fonksiyonun gövdesi: adından bir sonraki satır başı `}` işaretine kadar. */
const govde = (ad) => {
  const bas = ONRENDER.indexOf(`async function ${ad}(`);
  assert.ok(bas > 0, `${ad} bulunamadı`);
  const son = ONRENDER.indexOf('\n}', bas);
  return ONRENDER.slice(bas, son);
};

test('herkese açık veri çeken üç yol da servis anahtarı okumuyor', () => {
  for (const ad of ['ilanlariGetir', 'sirketSluglariniGetir', 'firsatlariGetir']) {
    const g = govde(ad);
    assert.doesNotMatch(
      g,
      /SUPABASE_SERVICE_ROLE_KEY/,
      `${ad}: servis anahtarı RLS'i atlıyor, ön render onu kullanmamalı`
    );
    assert.match(
      g,
      /envOku\('VITE_SUPABASE_ANON_KEY'\)/,
      `${ad}: anonim anahtar okumalı`
    );
  }
});

test('katalog tohumu da anonim kalıyor (mevcut kural korunuyor)', () => {
  const g = govde('katalogTohumuGetir');
  assert.doesNotMatch(g, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(g, /envOku\('VITE_SUPABASE_ANON_KEY'\)/);
});

test('anahtar yoksa sessizce boş dönülüyor, servis anahtarına düşülmüyor', () => {
  /*
    Yedek zincir (`|| envOku('SUPABASE_SERVICE_ROLE_KEY')`) kuralı geri
    getirirdi: ortamda anon anahtarı yokken servis anahtarı devreye
    girerdi ve fark yine sessiz olurdu.
  */
  for (const ad of ['ilanlariGetir', 'sirketSluglariniGetir', 'firsatlariGetir']) {
    const g = govde(ad);
    assert.doesNotMatch(g, /\|\|\s*envOku\('SUPABASE_SERVICE_ROLE_KEY'\)/, `${ad}: yedek zincir kalmamalı`);
    assert.match(g, /if \(!urlAdres \|\| !anahtar\)/, `${ad}: eksik anahtarda erken çıkmalı`);
  }
});

test('bakım betikleri kapsam dışı: servis anahtarını kullanmaya devam ediyor', () => {
  /*
    Bu iş "servis anahtarını her yerden kaldır" DEĞİL. Elle koşan bakım
    araçları yazma yapıyor ve anahtara gerçekten ihtiyaç duyuyor; onlara
    dokunmak bu değişikliğin kapsamı dışında. Test bunu açıkça yazıyor ki
    sonraki bir tur "tutarlılık" adına onları da kırmasın.
  */
  const bakim = readFileSync(path.join(KOK, 'scripts', 'paylasim-temizle.mjs'), 'utf8');
  assert.match(bakim, /SUPABASE_SERVICE_ROLE_KEY/);
});
