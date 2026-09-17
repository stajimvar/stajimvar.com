/**
 * İLAN COĞRAFYASI — KURU ÇALIŞTIRMA RAPORU (yalnız okur)
 *
 * Yayındaki kataloğu herkese açık RPC'den (`get_published_listings_catalog_v2`,
 * anon anahtar — sitenin kendisiyle aynı erişim) sayfa sayfa okur ve her ilanı
 * `src/lib/ilan-cografyasi.mjs` ile sınıflandırır. HİÇBİR YAZMA YOK: kolon
 * güncellemesi, yayın durumu değişikliği ya da silme bu betikte bulunmuyor.
 * Mevcut alanlar (country_code, city) görünüm kararı için yeterli olduğu için
 * kalıcı bir coğrafya kolonu ve "uygulama modu" hazırlanmadı.
 *
 * Kullanım:
 *   node scripts/ilan-cografyasi-rapor.mjs            # özet
 *   node scripts/ilan-cografyasi-rapor.mjs --ayrinti  # belirsizlerin kimliği
 *
 * Ortam: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (.env). Değerler yazdırılmıyor.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { requestPublishedListingsCatalog } from '../src/lib/global-listings-api.mjs';
import { COGRAFYA, ilanCografyasi } from '../src/lib/ilan-cografyasi.mjs';

const KOK = path.resolve(import.meta.dirname, '..');

function ortamOku() {
  const ortam = { ...process.env };
  const dosya = path.join(KOK, '.env');
  if (fs.existsSync(dosya)) {
    for (const satir of fs.readFileSync(dosya, 'utf8').split(/\r?\n/)) {
      const m = satir.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && ortam[m[1]] === undefined) ortam[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return ortam;
}

export async function raporUret(client) {
  const ilanlar = [];
  let cursor = null;
  let snapshot = null;
  for (let sayfa = 0; sayfa < 500; sayfa++) {
    const veri = await requestPublishedListingsCatalog(client, { country: 'all', cursor, snapshot });
    ilanlar.push(...veri.listings);
    snapshot = veri.snapshot;
    if (!veri.hasMore || !veri.nextCursor) break;
    cursor = veri.nextCursor;
  }

  const sayim = { toplam: 0, turkiye: 0, yurtdisi: 0, belirsiz: 0, cokKonumlu: 0 };
  const belirsizler = [];
  for (const satir of ilanlar) {
    const kayit = { countryCode: satir.country_code ?? null, city: satir.city ?? null, konumlar: satir.konumlar };
    const sonuc = ilanCografyasi(kayit);
    sayim.toplam++;
    sayim[sonuc]++;
    if (Array.isArray(satir.konumlar) && satir.konumlar.length > 1) sayim.cokKonumlu++;
    if (sonuc === COGRAFYA.BELIRSIZ) {
      belirsizler.push({ id: satir.id, country_code: satir.country_code ?? null, city: satir.city ?? null, work_type: satir.work_type ?? null });
    }
  }
  return { sayim, belirsizler, snapshot };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('ilan-cografyasi-rapor.mjs')) {
  const ortam = ortamOku();
  const eksik = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((ad) => !ortam[ad]);
  if (eksik.length) {
    console.error(`Eksik ortam değişkeni: ${eksik.join(', ')}`);
    process.exit(2);
  }
  const client = createClient(ortam.VITE_SUPABASE_URL, ortam.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { sayim, belirsizler, snapshot } = await raporUret(client);
  console.log(JSON.stringify({ kaynak: 'get_published_listings_catalog_v2 (yayında, anon)', snapshot, ...sayim }, null, 2));
  if (process.argv.includes('--ayrinti')) console.log(JSON.stringify(belirsizler, null, 2));
}
