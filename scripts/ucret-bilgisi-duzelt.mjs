#!/usr/bin/env node
/**
 * ÜCRET BİLGİSİNİ KANITA GÖRE DÜZELTİR
 *
 * ÖLÇÜLDÜ (14 Eylül 2026, üretim): 175 ilanın 166'sı `is_paid = false`,
 * 9'u true, hiçbiri null. Sütun `not null default false` olduğu için
 * kaynağın hiç konuşmadığı her ilan "ücretsiz" görünüyordu.
 *
 * KÖRLEMESİNE null YAPMIYOR
 * -------------------------
 * Her kayıt KENDİ kanıtına bakılarak karara bağlanıyor:
 *
 *   açık ücretsiz ifadesi      → false  (bilgi korunuyor)
 *   açık ücretli ifadesi       → true
 *   `stipend_text` dolu        → true   (tutar yazılmışsa ücret var)
 *   hiçbiri                    → null   (kaynak söylemiyor)
 *
 * `is_paid = true` kayıtlara DOKUNULMUYOR: varsayılan false olduğu için
 * true değeri ancak bilerek yazılmış olabilir — şirketin kendi formundan
 * ya da ilanı elle girenden. Doğrulanmış bilgiyi silmek, düzeltmek
 * değil kaybetmek olurdu.
 *
 * `stipend_text` BOŞ OLMASI TEK BAŞINA HİÇBİR ŞEYİ GEÇERSİZ KILMIYOR:
 * bir ilan "ücretli staj" deyip tutar yazmayabilir. Bu yüzden metin
 * kanıtı ayrıca aranıyor.
 *
 * Kullanım:
 *   node scripts/ucret-bilgisi-duzelt.mjs --kuru   # yalnız rapor
 *   node scripts/ucret-bilgisi-duzelt.mjs
 */

import { createClient } from '@supabase/supabase-js';

const adres = process.env.SUPABASE_URL;
const anahtar = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!adres || !anahtar) {
  console.error('::error::SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekiyor.');
  process.exit(1);
}
const db = createClient(adres, anahtar, { auth: { persistSession: false } });

const kuru = process.argv.includes('--kuru');

/*
  KALIPLAR promote.py'DEKİYLE AYNI MANTIK

  İki yerde iki farklı kural olması, içe aktarımın yazdığı değerle
  düzeltmenin beklediği değerin ayrışması demek olurdu.

  `burs` KELİME SINIRIYLA: çıplak `burs` "Bursa" ile eşleşiyor. Ölçüldü —
  ücretli sanılan iki kaydın ikisi de şehir listesiydi.
*/
/*
  `maas` DA KELİME SINIRINDA — "Maastricht" TUZAĞI

  `burs`/Bursa ile aynı sınıf kusur, ölçüldü (14 Eylül 2026): Mondi
  ilanının kaynak sayfasında tek "ücretli" eşleşmesi konum
  açılırındaki "Maastricht (2)" idi. Şehir adı, ilanı ücretli
  gösteriyordu.
*/
const UCRETLI = /ucretli staj|\bmaas\b|\bburs\b|burslu|bursiyer|stipend|yemek ve yol|paid internship/;
const UCRETSIZ = /ucretsiz staj|unpaid/;

function katla(metin) {
  return (metin || '')
    .replace(/[İIı]/g, 'i')
    .replace(/[ĞğüÜşŞöÖçÇ]/g, (h) => ({ Ğ: 'g', ğ: 'g', ü: 'u', Ü: 'u', ş: 's', Ş: 's', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c' })[h])
    .toLowerCase();
}

/** Kaydın kendi kanıtından ücret kararı. */
export function ucretKarari(ilan) {
  const metin = katla(`${ilan.description || ''} ${ilan.stipend_text || ''} ${ilan.perks || ''}`);
  if (UCRETSIZ.test(metin)) return { deger: false, sebep: 'açık ücretsiz ifadesi' };
  if (UCRETLI.test(metin)) return { deger: true, sebep: 'açık ücretli ifadesi' };
  if ((ilan.stipend_text || '').trim()) return { deger: true, sebep: 'tutar yazılmış' };
  return { deger: null, sebep: 'kaynak söylemiyor' };
}

const { data: ilanlar, error } = await db
  .from('listings')
  .select('id, title, is_paid, stipend_text, description, perks, origin');

if (error) {
  console.error(`::error::İlanlar okunamadı: ${error.message}`);
  process.exit(1);
}

const oncesi = { true: 0, false: 0, null: 0 };
for (const i of ilanlar) oncesi[String(i.is_paid)] += 1;

const degisenler = [];
for (const ilan of ilanlar) {
  /*
    true DEĞERE DOKUNULMUYOR — yukarıdaki gerekçe. Kanıt bulamasak da
    biri bunu bilerek yazmış.
  */
  if (ilan.is_paid === true) continue;

  const karar = ucretKarari(ilan);
  if (karar.deger === ilan.is_paid) continue;
  degisenler.push({ ilan, karar });
}

console.log(`okunan: ${ilanlar.length} ilan`);
console.log(`önce:  true=${oncesi.true} false=${oncesi.false} null=${oncesi.null}`);
console.log(`değişecek: ${degisenler.length}`);

const kirilim = {};
for (const { ilan, karar } of degisenler) {
  const anahtar2 = `${ilan.is_paid} -> ${karar.deger} (${karar.sebep})`;
  kirilim[anahtar2] = (kirilim[anahtar2] || 0) + 1;
}
for (const [k, v] of Object.entries(kirilim).sort()) console.log(`  ${k}: ${v}`);

/* Kanıtla true'ya çekilenler tek tek yazılıyor: sayı küçük ve iddia büyük. */
for (const { ilan, karar } of degisenler.filter((d) => d.karar.deger === true)) {
  console.log(`  TRUE: ${ilan.title.slice(0, 50)} — ${karar.sebep}`);
}

/*
  BAŞARIDA `process.exit` ÇAĞRILMIYOR

  Ölçüldü: `process.exit(0)` bu betiği Windows'ta 127 ile bitiriyordu —
  libuv, Supabase istemcisinin hâlâ açık tuttuğu tutamağı kapatılırken
  buluyor ve süreç abort ediyor ("!(handle->flags & UV_HANDLE_CLOSING)").
  Yani başarılı bir koşu, çağıran işe BAŞARISIZ görünüyordu.

  Doğal bitiş bekleniyor; çıkış kodu yalnız gerçek hatada zorlanıyor.
*/
let yazildi = 0;
let hata = 0;
for (const { ilan, karar } of kuru ? [] : degisenler) {
  const { error: yazmaHatasi } = await db
    .from('listings')
    .update({ is_paid: karar.deger })
    .eq('id', ilan.id);
  if (yazmaHatasi) {
    hata += 1;
    console.log(`  YAZILAMADI ${ilan.id}: ${yazmaHatasi.message}`);
  } else {
    yazildi += 1;
  }
}

if (kuru) {
  console.log('kuru koşu: hiçbir şey yazılmadı.');
} else {
  const { data: sonra } = await db.from('listings').select('is_paid');
  const sonrasi = { true: 0, false: 0, null: 0 };
  for (const i of sonra || []) sonrasi[String(i.is_paid)] += 1;

  console.log(`yazıldı: ${yazildi}, hata: ${hata}`);
  console.log(`sonra: true=${sonrasi.true} false=${sonrasi.false} null=${sonrasi.null}`);
  if (hata > 0) process.exitCode = 1;
}
