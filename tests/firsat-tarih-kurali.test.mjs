import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { firsatDurumu } from '../src/lib/firsat-kategori.mjs';

/**
 * FIRSAT TARİH KURALI — TÜRKİYE TAKVİM GÜNÜ, HER YERDE AYNI
 *
 * ÖLÇÜLDÜ (canlı, 15 Eylül 2026): "süresi geçmiş" görünen 10 kaydın
 * 8'inin son başvuru tarihi O GÜNDÜ ve Türkiye gününe göre hâlâ AÇIKTI.
 * Sekizinin de statik sayfası üretilmiyordu; biri
 * (btso-yuksekogrenim-bursu) arama sonuçlarında gösterim alırken canlıda
 * HTTP 404 dönüyordu.
 *
 * Sebep: aynı soruya üç farklı ölçüt cevap veriyordu —
 *   arayüz    Türkiye takvim günü   (doğru olan)
 *   ön render deadline < Date.now() (damga)
 *   RLS       now() - 1 gün         (kayan pencere)
 */

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const GOC = oku('supabase/migrations/20261011010000_firsat_tarih_kurali_turkiye_gunu.sql');
const ONRENDER = oku('scripts/onrender.mjs');

/*
  ESKİ İFADE GEREKÇE YORUMLARINDA GEÇİYOR

  Göçün başındaki açıklama kaldırılan ölçütü (`now() - interval '1 day'`)
  bilerek yazıyor — neden kaldırıldığını anlatmak için. "Kalkmış olmalı"
  iddiası YORUMA değil KODA bakmalı; yoksa doğru kodu reddeden bir test
  olurdu. Aynı hata depoda bir kez yapılmıştı.
*/
const sqlYorumsuz = (m) =>
  m.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*--.*$/gm, ' ');
const GOC_KOD = sqlYorumsuz(GOC);

/** Verilen TRT saatinde, o günün `00:00+00` damgalı kaydı. */
const trtAninda = (isoUtc) => new Date(isoUtc);

/* ------------------------------------------------- 1. GÜN SINIRLARI */

test('son başvuru günü DAHİL açık: bugün kapanmıyor', () => {
  /*
    Kritik durum: tarih 00:00 UTC saklanıyor ve TRT UTC+3. Damga
    karşılaştırması kaydı kendi son gününün sabahı 03:00'te kapatıyordu.
  */
  const sonTarih = '2026-09-15';
  /* 15 Eylül, TRT 03:00 (= 00:00 UTC) — eski kuralın kaydı öldürdüğü an. */
  assert.notEqual(
    firsatDurumu('published', sonTarih, trtAninda('2026-09-15T00:00:00Z')),
    'expired',
    'son başvuru günü sabahı kayıt kapanmamalı'
  );
  /* Aynı gün TRT 23:59 (= 20:59 UTC) — gün hâlâ bitmedi. */
  assert.notEqual(
    firsatDurumu('published', sonTarih, trtAninda('2026-09-15T20:59:00Z')),
    'expired',
    'son başvuru gününün sonuna kadar açık kalmalı'
  );
});

test('ertesi gün kapanıyor', () => {
  /* 16 Eylül TRT 00:01 (= 15 Eylül 21:01 UTC) — Türkiye günü değişti. */
  assert.equal(
    firsatDurumu('published', '2026-09-15', trtAninda('2026-09-15T21:01:00Z')),
    'expired',
    'Türkiye günü dönünce kapanmalı'
  );
});

test('dünkü tarih kapalı', () => {
  assert.equal(
    firsatDurumu('published', '2026-09-14', trtAninda('2026-09-15T09:00:00Z')),
    'expired'
  );
});

test('TRT SINIRI: UTC günü dönmüş ama Türkiye günü dönmemişken kapanmıyor', () => {
  /*
    15 Eylül 22:00 UTC = 16 Eylül 01:00 TRT → Türkiye günü DÖNDÜ, kapalı.
    15 Eylül 20:00 UTC = 15 Eylül 23:00 TRT → Türkiye günü dönmedi, açık.
    Saat dilimi UTC'ye göre hesaplansaydı ikisi de aynı sonucu verirdi.
  */
  assert.notEqual(
    firsatDurumu('published', '2026-09-15', trtAninda('2026-09-15T20:00:00Z')),
    'expired',
    'TRT 23:00: gün bitmedi'
  );
  assert.equal(
    firsatDurumu('published', '2026-09-15', trtAninda('2026-09-15T22:00:00Z')),
    'expired',
    'TRT ertesi gün 01:00: gün bitti'
  );
});

test('tarihsiz kayıt kapanmış SAYILMIYOR', () => {
  /*
    Boş tarih, kurumun başvuruyu kapattığını KANITLAMIYOR — takvimi
    açıklamamış olabilir. 112 yayın kaydının 83'ü tarihsiz.
  */
  for (const bos of [null, '', undefined]) {
    assert.notEqual(firsatDurumu('published', bos, new Date()), 'expired');
  }
});

/* --------------------------------- 2. ÖN RENDER AYNI KURALI ÇAĞIRIYOR */

test('ön render kendi eşiğini taşımıyor, paylaşılan fonksiyonu çağırıyor', () => {
  /* Eski damga karşılaştırması tamamen kalkmalı. */
  assert.doesNotMatch(
    ONRENDER,
    /new Date\(f\.application_deadline\)\.getTime\(\) < Date\.now\(\)/,
    'ön render kendi tarih eşiğini yeniden yazmamalı'
  );
  assert.match(ONRENDER, /firsatDurumu\(f\.status, f\.application_deadline\) === 'expired'/);
  /* Kural arayüzle AYNI modülden geliyor. */
  assert.match(
    ONRENDER,
    /const \{ firsatKategorisi, yurtDisiFirsatMi, firsatDurumu \} = await icerikDerle\(/
  );
});

test('süresi geçen fırsatın SAYFASI duruyor, yalnız haritadan düşüyor', () => {
  /*
    Eskiden `continue` ile atlanıyordu ve adres 404 dönüyordu. `/ilan/`
    ailesindeki kural: sayfa 200 kalır, metninde kapandığı yazar,
    haritaya girmez.
  */
  assert.doesNotMatch(ONRENDER, /if \(!firsatSayfasiVar\(f\)\) continue;/);
  assert.match(ONRENDER, /if \(suresiGecti\) HARITADAN_DISLANAN\.add\(firsatYolu\);/);
});

test('sorgu expired kayıtları da çekiyor', () => {
  /*
    Sayfası yazılacak kayıt çekilmezse yazılamaz. RLS de aynı kümeyi
    okutuyor; iki taraf ayrışırsa statik HTML'de olup hidrasyonda
    kaybolan sayfa üretilirdi.
  */
  assert.match(ONRENDER, /opportunities\?status=in\.\(published,expired\)/);
});

/* ------------------------------------------ 3. GÖÇ AYNI KURALI YAZIYOR */

test('RLS görünürlüğü DURUMA bakıyor, tarihe DEĞİL', () => {
  /*
    Tarih ölçütü burada dururken bir delik açılıyordu: `published` ama
    son başvurusu geçmiş kayıt ne tarih dalına ne `expired` dalına
    düşüyordu (durumu çeviren iş henüz bağlı değil). Ön render sayfayı
    yazıyor, tarayıcı kaydı çekemiyor, ekran "bulunamadı"ya düşüyordu.
    Bu delik Paket 2 koşana kadar kapanmıyordu — yani Paket 1 tek başına
    tutarsızdı.
  */
  assert.doesNotMatch(GOC_KOD, /now\(\) - interval '1 day'/, 'kayan 24 saat kalkmalı');
  assert.match(GOC_KOD, /using \(status in \('published', 'expired'\)\)/);
  /* Politikanın içinde tarih ölçütü KALMAMALI. */
  const politika = GOC_KOD.slice(
    GOC_KOD.indexOf('create policy "yayindaki ve suresi dolan firsatlar okunur"'),
    GOC_KOD.indexOf('comment on policy')
  );
  assert.doesNotMatch(politika, /application_deadline/, 'görünürlük tarihe bağlanmamalı');
});

test('ön render ziyaretçiyle AYNI anahtarı kullanıyor (RLS atlanmıyor)', () => {
  /*
    Servis anahtarı RLS'i atlıyor; ön render onu kullanırsa ziyaretçinin
    çekemeyeceği kaydın sayfasını yazabilir. ÖLÇÜLDÜ: `envOku`
    `automation/.env`'i de okuyor ve orada servis anahtarı var — yani
    yerel derleme üretimi temsil etmiyordu.
  */
  const fn = ONRENDER.slice(ONRENDER.indexOf('async function firsatlariGetir'));
  const govde = fn.slice(0, fn.indexOf('\n}'));
  assert.doesNotMatch(govde, /SUPABASE_SERVICE_ROLE_KEY/, 'fırsat çekimi servis anahtarı kullanmamalı');
  assert.match(govde, /envOku\('VITE_SUPABASE_ANON_KEY'\)/);
});

test('süre doldurma fonksiyonu aynı kurala bağlı ve BU PAKETTE ÇAĞRILMIYOR', () => {
  const fn = GOC_KOD.slice(GOC_KOD.indexOf('function public.deactivate_expired_opportunities'));
  assert.match(
    fn,
    /\(application_deadline at time zone 'Europe\/Istanbul'\)::date\s*\n?\s*< \(now\(\) at time zone 'Europe\/Istanbul'\)::date/
  );
  /* Yetki daralmış kalmalı. */
  assert.match(GOC, /grant execute on function public\.deactivate_expired_opportunities\(\) to service_role/);

  /*
    SIRA ÖNEMLİ: iş, yeni tarih kuralı canlıya geçmeden koşarsa bugünün
    kayıtlarını eski kuralla kapatır. Bu yüzden zamanlanmış adım bu
    pakette YOK.
  */
  const akislar = path.join(KOK, '.github', 'workflows');
  const hepsi = readFileSync(path.join(akislar, 'ilan-bildirim-kuyrugu.yml'), 'utf8');
  assert.doesNotMatch(hepsi, /deactivate_expired/, 'süre doldurma adımı bu pakette bağlanmamalı');
});

/* ----------------------------- 4. DOĞRULANMAMIŞ İDDİA YAZILMIYOR */

test('"başvurusu açık" DENMİYOR, kapanma ise tarihe dayanıyor', () => {
  const kod = ONRENDER.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  /*
    Açık olduğunu ancak kaynağın kendi sayfasında görürsek söyleyebiliriz;
    ön render bunu ölçmüyor. Kapandığını ise kaydın KENDİ tarihinden
    biliyoruz — o yüzden yalnız kapanma yazılıyor.
  */
  assert.doesNotMatch(kod, /başvurusu açık/i);
  assert.doesNotMatch(kod, /başvuruya açık/i);
  assert.match(kod, /Başvuru dönemi kapandı — son başvuru/);
  /* Tarih yoksa kapanma satırı da yazılmıyor. */
  assert.match(kod, /f\.application_deadline &&\s*\n?\s*`\$\{suresiGecti \?/);
});

test('DOĞRULANMAMIŞ TUTAR YAZILMIYOR', () => {
  /*
    Tutar yalnız `amount_status = 'kesin'` ve `amount_text` doluyken
    yazılıyor. ÖLÇÜLDÜ (canlı, 15 Eylül 2026): yayındaki 112 kaydın
    SIFIRI bu durumda — yani bugün hiçbir sayfada tutar yazılmıyor.
    "Açıklanmadı" da denmiyor: kurum adına beyan olurdu.
  */
  assert.match(ONRENDER, /f\.amount_status === 'kesin' && \(f\.amount_text \|\| ''\)\.trim\(\)/);
  const kod = ONRENDER.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  assert.doesNotMatch(kod, /açıklanmadı/i);
  assert.doesNotMatch(kod, /karşılıksız/i);
});
