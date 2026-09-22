import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * TEK KATALOG SÖZLEŞMESİ — v3
 *
 * ÖLÇÜLEN SORUN (20-21 Eylül 2026)
 *   /staj-ilanlari sayacı ... 107
 *   sitemap.xml ............. 190
 *   veritabanı published .... 191
 * Üç yüzey üç ayrı SQL yazıyordu. v2 son başvuru tarihine hiç
 * bakmıyordu; sitemap bakıyordu.
 *
 * Ayrıca v2 şehir sayısını HAM metinden hesaplıyordu: "İstanbul",
 * "Istanbul", "Atasehir Istanbul" ve "Turkey - Istanbul" dört ayrı
 * şehir sayılıyor, ekranda "10 şehirde" yazıyordu. Gerçek il 7.
 *
 * Testler sayıları değil KURALLARI bağlıyor.
 */

const oku = (y) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');
const GOC = oku('supabase/migrations/20261026010000_katalog_sozlesmesi_v3.sql');
const API = oku('src/lib/global-listings-api.mjs');
const MAPPER = oku('src/lib/queries/mappers.ts');
const KART = oku('src/components/InternshipCard.tsx');
const ETIKET = oku('src/components/IlanDurumEtiketleri.tsx');
const DETAY = oku('src/components/InternshipDetailModal.tsx');

const sqlYorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*--.*$/gm, '');
const tsYorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');

/* ------------------------------------------------ 1. SÖZLEŞME */

test('katalog tanımı: published + son başvurusu geçmemiş', () => {
  const g = sqlYorumsuz(GOC);
  assert.match(g, /l\.status = 'published'/);
  assert.match(g, /not \(l\.application_deadline is not null and l\.application_deadline < bugun\)/);
});

test('ülke tanımın parçası değil, süzgeç', () => {
  const g = sqlYorumsuz(GOC);
  const aktif = g.slice(g.indexOf('with active as'), g.indexOf('), ulkeli as'));
  assert.ok(!/country_code\s*=\s*p_country/.test(aktif), 'ülke `active` içinde süzülmemeli');
  assert.match(g, /ulkeli as materialized/, 'ülke ayrı bir katmanda');
});

test('şehir sayısı normalize il üzerinden, ham city değil', () => {
  const g = sqlYorumsuz(GOC);
  assert.match(g, /count\(distinct il\) as sehir/);
  assert.ok(
    !/count\(distinct nullif\(btrim\(l?\.?city\)/.test(g),
    'ham city sayımı geri gelmemeli',
  );
});

test('sayaçlar süzgeçten sonra ve aynı ifadede', () => {
  /*
    İlk yazımda sayaçlar ayrı bir `return sonuc || (select ... from
    filtered)` satırındaydı ve üretimde düştü: "relation filtered does
    not exist". CTE yalnız kendi ifadesinde yaşıyor.
  */
  const g = sqlYorumsuz(GOC);
  assert.match(g, /sayaclar as \(/);
  assert.match(g, /from filtered/);
  assert.ok(!/return sonuc \|\|/.test(g), 'sayaçlar RETURN satırına taşınmamalı');
});

test('tür süzgeci sözleşmedeki beş değerle sınırlı', () => {
  const g = sqlYorumsuz(GOC);
  for (const t of ['staj', 'uzun_donem', 'trainee', 'mt', 'erken_kariyer']) {
    assert.match(g, new RegExp(`'${t}'`), `${t} tanınmalı`);
  }
  assert.match(g, /Geçersiz ilan türü süzgeci/, 'bilinmeyen tür sessizce boş liste vermemeli');
});

/* -------------------------------------------- 2. ARAYÜZ BAĞLANTISI */

test('istemci v3 çağırıyor ve tür süzgecini geçiriyor', () => {
  assert.match(API, /rpc\('get_published_listings_catalog_v3'/);
  assert.match(API, /p_tip: options\.tip \?\? null/);
});

test('normalize alanlar mapper üzerinden dışarı veriliyor', () => {
  const m = tsYorumsuz(MAPPER);
  for (const alan of ['il:', 'ilce:', 'uzaktan:', 'ilanTipi:', 'kaynakDurumu:', 'applyUrlOk:']) {
    assert.match(m, new RegExp(alan.replace(':', '\\s*:')), `${alan} eşlenmeli`);
  }
});

test('bilinmeyen değer etikete çevrilmiyor', () => {
  /*
    Kolonlar veritabanında `text`. Kör `as` ile zorlamak, bir gün
    'kapali' yazılsa kartın onu tanımadığı hâlde göstermeye
    çalışmasına yol açardı. Daraltıcı tanımadığını `undefined` yapıyor.
  */
  const m = tsYorumsuz(MAPPER);
  assert.match(m, /function daralt</);
  assert.match(m, /ilanTipi: daralt\(row\.ilan_tipi, ILAN_TIPLERI\)/);
  assert.match(m, /kaynakDurumu: daralt\(row\.kaynak_durumu, KAYNAK_DURUMLARI\)/);
  assert.match(m, /applyUrlOk: daralt\(row\.apply_url_ok, URL_DURUMLARI\)/);
});

/* ------------------------------------------- 3. GÖRÜNÜR ETİKETLER */

test('sorunlu durum etiketle söyleniyor', () => {
  const e = tsYorumsuz(ETIKET);
  assert.match(e, /listing\.applyUrlOk === 'kirik'/);
  assert.match(e, /listing\.applyUrlOk === 'dogrulanamadi'/);
  assert.match(e, /listing\.kaynakDurumu === 'belirsiz'/);
  assert.match(e, /listing\.kaynakDurumu === 'erisilemedi'/);
  assert.match(e, /Başvuru bağlantısı çalışmıyor/);
  assert.match(e, /Kaynak doğrulanamadı/);
});

test('etiketler hem kartta hem ilan detayında', () => {
  /*
    Etiketler kartta vardı ama detayda YOKTU: kartta "başvuru bağlantısı
    çalışmıyor" uyarısını görüp tıklayan kişi, başvuru kararını verdiği
    ekranda uyarıyı göremiyordu. Uyarı tam da işe yarayacağı anda
    kayboluyordu.

    Tek bileşen kullanılıyor; iki kopya er geç ayrışır ve iki ekran aynı
    ilan için farklı şey söylerdi.
  */
  for (const [ad, kaynak] of [['kart', KART], ['detay', DETAY]]) {
    const t = tsYorumsuz(kaynak);
    assert.match(t, /<IlanDurumEtiketleri listing=\{listing\}/, ad + ' etiketleri göstermeli');
    assert.match(t, /from '\.\/IlanDurumEtiketleri'/, ad + ' ortak bileşeni kullanmalı');
  }
});

test('etiket ilanı listeden çıkarmıyor', () => {
  /*
    Kanıtsız gizlemek, açık bir ilanı listeden silmek olur. Etiket durumu
    söylüyor, kararı kullanıcıya bırakıyor.

    Bu artık YAPISAL olarak garanti: kart ve detay durum alanlarına hiç
    BAKMIYOR, yalnız ortak etiket bileşenini çiziyorlar. Bakmayan bir
    bileşen, o alana göre gizleme kararı da veremez.

    Ortak bileşendeki `return null` ilanı değil ROZETİ gizliyor: durum
    sağlıklıyken rozet basmamak gürültüyü önlüyor.
  */
  for (const [ad, kaynak] of [['kart', KART], ['detay', DETAY]]) {
    const t = tsYorumsuz(kaynak);
    assert.ok(
      !/kaynakDurumu ===/.test(t),
      ad + ' durum alanına göre dallanmamalı, etiketi ortak bileşene bırakmalı',
    );
    assert.ok(!/applyUrlOk ===/.test(t), ad + ' bağlantı durumuna göre dallanmamalı');
  }
});

test('sağlıklı durumda etiket basılmıyor', () => {
  /* `gecerli` ve `acik` için rozet yok: her şey yolundayken rozet gürültü. */
  const k = tsYorumsuz(ETIKET);
  assert.ok(!/applyUrlOk === 'gecerli'/.test(k), 'geçerli bağlantıya etiket basılmamalı');
  assert.ok(!/kaynakDurumu === 'acik'/.test(k), 'açık kaynağa etiket basılmamalı');
});
