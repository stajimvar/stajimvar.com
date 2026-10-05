#!/usr/bin/env node
/**
 * BEKLEYEN BAŞVURU HATIRLATMASI (20261124010000)
 *
 * Uzun süredir işlem görmemiş başvurular için site içi bildirim üretir.
 * Bütün kural sunucuda: eşikler (7/14/30 gün), alıcı seçimi (sorumlu,
 * yoksa şirket sahipleri) ve tekrar koruması (`dedupe_key`) RPC'nin
 * içinde. Bu betik yalnız günde bir kez o RPC'yi çağırıyor.
 *
 * NEDEN BETİK: `pg_cron` bu projede kurulu değil ve zamanlanmış işler
 * GitHub Actions'ta koşuyor (service_role yalnız orada).
 *
 * Yapay zekâ ya da ücretli dış servis yok: tek istek Supabase'e.
 */
const ADRES = process.env.SUPABASE_URL;
const ANAHTAR = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ADRES || !ANAHTAR) {
  console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
  process.exit(1);
}

const yanit = await fetch(`${ADRES}/rest/v1/rpc/bekleyen_basvuru_hatirlatmalari`, {
  method: 'POST',
  headers: {
    apikey: ANAHTAR,
    Authorization: `Bearer ${ANAHTAR}`,
    'content-type': 'application/json',
  },
  body: '{}',
});

if (!yanit.ok) {
  console.error(`Hatırlatma üretilemedi (HTTP ${yanit.status}): ${await yanit.text()}`);
  process.exit(1);
}

/*
  Dönen sayı YAZILAN bildirim adedi. Sıfır olması hata değil: ya bekleyen
  başvuru yok ya da hepsi o eşik için zaten haberdar edilmiş. İkisini
  ayırt etmeye çalışmak, `dedupe_key`in sakladığı bilgiyi dışarı
  sızdırmak olurdu ve bu sayının bir karşılığı yok.
*/
const yazilan = await yanit.json();
console.log(`${Number(yazilan) || 0} hatırlatma yazıldı.`);
