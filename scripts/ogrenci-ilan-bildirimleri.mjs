#!/usr/bin/env node
/**
 * ÖĞRENCİ İLAN BİLDİRİMLERİ (20261226010000)
 *
 * Günde bir `ogrenci_ilan_bildirimleri` çağrılıyor: kaydedilen ilanın son
 * başvurusu yaklaşıyor (3 gün / 1 gün) ve bölümüne uygun yeni ilan (günde
 * öğrenci başına tek toplu bildirim). Yalnız service_role çağırabiliyor;
 * tek istek Supabase'e.
 */
const ADRES = process.env.SUPABASE_URL;
const ANAHTAR = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ADRES || !ANAHTAR) {
  console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
  process.exit(1);
}

const y = await fetch(`${ADRES}/rest/v1/rpc/ogrenci_ilan_bildirimleri`, {
  method: 'POST',
  headers: {
    apikey: ANAHTAR,
    Authorization: `Bearer ${ANAHTAR}`,
    'content-type': 'application/json',
  },
  body: '{}',
});

if (!y.ok) {
  console.error(`ogrenci_ilan_bildirimleri: HTTP ${y.status} ${(await y.text()).slice(0, 300)}`);
  process.exit(1);
}

const sonuc = await y.json();
console.log(`Son başvuru bildirimi: ${sonuc.son_basvuru} · Uygun yeni ilan bildirimi: ${sonuc.uygun_yeni_ilan}`);
