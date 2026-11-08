#!/usr/bin/env node
/**
 * GÜNLÜK BİLDİRİMLER (20261226010000, 20261227010000)
 *
 * `gunluk_bildirimler` öğrenci ilan bildirimlerini (aşağıda) ve kalanları
 * üretiyor: fırsat son başvurusu, yanıt bekleyen başvuru, profil tamamlama,
 * pazartesi haftalık özet, şirket ilanının süresi doluyor.
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

const y = await fetch(`${ADRES}/rest/v1/rpc/gunluk_bildirimler`, {
  method: 'POST',
  headers: {
    apikey: ANAHTAR,
    Authorization: `Bearer ${ANAHTAR}`,
    'content-type': 'application/json',
  },
  body: '{}',
});

if (!y.ok) {
  console.error(`gunluk_bildirimler: HTTP ${y.status} ${(await y.text()).slice(0, 300)}`);
  process.exit(1);
}

const sonuc = await y.json();
console.log(Object.entries(sonuc).map(([k, v]) => `${k}: ${v}`).join(' · '));
