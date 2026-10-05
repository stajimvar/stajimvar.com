#!/usr/bin/env node
/**
 * İLAN KONTROLÜNÜ YENİDEN DENE (20261120010000)
 *
 * Şirket ilanı yayına gönderdiğinde kontrol sunucuda, aynı istekte
 * çalışıyor. Kontrol bir hatayla tamamlanamazsa ilan YAYINA ÇIKMIYOR ve
 * "bekliyor" durumunda kalıyor. Bu betik, zamanı gelmiş olanları
 * `ilan_kontrollerini_yeniden_dene` ile yeniden denetiyor; deneme sınırı
 * aşılınca sunucu ilanı yönetici kuyruğuna düşürüyor.
 *
 * Yalnız service_role çağırabiliyor. Yapay zekâ ya da dış servis yok:
 * tek istek Supabase'e.
 */
const ADRES = process.env.SUPABASE_URL;
const ANAHTAR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PARTI = Number(process.env.ILAN_KONTROL_PARTI || 20);

if (!ADRES || !ANAHTAR) {
  console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
  process.exit(1);
}

const y = await fetch(`${ADRES}/rest/v1/rpc/ilan_kontrollerini_yeniden_dene`, {
  method: 'POST',
  headers: {
    apikey: ANAHTAR,
    Authorization: `Bearer ${ANAHTAR}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({ p_adet: PARTI }),
});

if (!y.ok) {
  console.error(`ilan_kontrollerini_yeniden_dene: HTTP ${y.status} ${(await y.text()).slice(0, 300)}`);
  process.exit(1);
}

const islenen = Number(await y.json());
console.log(`Yeniden denenen ilan: ${islenen}`);
