/**
 * Yayındaki fırsatların resmî kaynağını üç günde bir kontrol eder.
 *
 * NEDEN VAR
 * ---------
 * Fırsat listesinin sözü şu: "şu anda başvurabileceğin açık fırsatlar".
 * Kurumlar duyuruyu kaldırıyor, adresi taşıyor ya da sayfayı kapatıyor;
 * bizde kayıt açık görünmeye devam ediyor. İlan tarafında aynı sorun
 * ölçülmüş ve `ilan-baglanti-kontrol.mjs` ile kapatılmıştı. Burası aynı
 * kalıbın fırsatlar için olanı.
 *
 * ÜÇ VURUŞ KURALI — GEÇİCİ HATA KAPANMA DEĞİL
 * -------------------------------------------
 * Tek bir 404 ile kapatmak sessiz bir hata üretir: kurum sitesinin bir
 * saatlik bakımı yüzünden geçerli bir burs listeden düşer ve kimse fark
 * etmez. Bu yüzden:
 *
 *   erişildi (2xx, aynı alan adı)     → source_status='ok', sayaç sıfır
 *   403 / 429 / 5xx / zaman aşımı / ağ → 'transient_error', sayaç DEĞİŞMEZ
 *   404 / 410 / başka alan adına düşme → 'closed' ya da 'moved', sayaç +1
 *
 * Sayaç 3'e ulaşınca — yani art arda üç koşuda (≈ dokuz gün) kaynak
 * kesin olarak kapalıysa — kayıt 'expired' oluyor. Bir kez 'ok'
 * görülürse sayaç sıfırlanıyor; yani üç vuruşun ART ARDA gelmesi
 * gerekiyor.
 *
 * Aynı koşuda `firsat_suresi_dolanlari_kapat()` de çağrılıyor: son
 * tarihi geçen kayıtlar da gerçek durumuna geçiyor.
 *
 * GÜVENLİK
 * --------
 * Yalnız https ve yalnız `source_url` çağrılıyor; kullanıcıdan gelen bir
 * adres yok. Yönlendirme izleniyor ama son adresin ALAN ADI ilk adresle
 * karşılaştırılıyor: başka alana düşen kaynak "taşındı" sayılıyor,
 * ziyaret edilmiyor. Yerel/iç ağ adresleri şema kısıtında zaten yasak.
 *
 * Kullanım: node scripts/firsat-kaynak-kontrol.mjs [--kuru]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KURU = process.argv.includes('--kuru');
const ESIK = 3;
const ZAMAN_ASIMI_MS = 20_000;

function ortamOku() {
  const dosya = path.join(KOK, 'automation', '.env');
  if (!fs.existsSync(dosya)) return {};
  const cikti = {};
  for (const satir of fs.readFileSync(dosya, 'utf8').split('\n')) {
    const esles = satir.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (esles) cikti[esles[1]] = esles[2].replace(/^["']|["']$/g, '');
  }
  return cikti;
}

/*
  İstemci ANA akışta açılıyor, modül yüklenirken değil: `kaynagiOlc` ve
  `guncellemeyiHesapla` testten içe aktarılıyor ve test ortamında anahtar
  yok. Modül düzeyinde `process.exit` testi de öldürürdü.
*/
function istemciAc() {
  const ortam = { ...ortamOku(), ...process.env };
  const url = ortam.SUPABASE_URL;
  const anahtar = ortam.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anahtar) {
    console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (automation/.env).');
    process.exit(1);
  }
  return createClient(url, anahtar, { auth: { persistSession: false } });
}

const BASLIK = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
  'Accept-Language': 'tr,en;q=0.8',
};

/** Alan adının kayıtlı kökü: www. ve alt alanlar aynı kurum sayılıyor. */
function alanKoku(adres) {
  try {
    const parcalar = new URL(adres).hostname.toLowerCase().replace(/^www\./, '').split('.');
    return parcalar.slice(-2).join('.');
  } catch {
    return '';
  }
}

/**
 * Tek bir kaynağı ölçer. Dönen nesne bir KARAR, veritabanı yazımı değil.
 *   { durum: 'ok' | 'transient_error' | 'closed' | 'moved', sebep }
 */
export async function kaynagiOlc(kaynakAdresi, fetchFn = fetch) {
  const denetleyici = new AbortController();
  const zamanlayici = setTimeout(() => denetleyici.abort(), ZAMAN_ASIMI_MS);
  try {
    const yanit = await fetchFn(kaynakAdresi, {
      headers: BASLIK,
      redirect: 'follow',
      signal: denetleyici.signal,
    });

    if (yanit.status === 404 || yanit.status === 410) {
      return { durum: 'closed', sebep: `HTTP ${yanit.status}` };
    }
    if (yanit.status === 403 || yanit.status === 429 || yanit.status >= 500) {
      return { durum: 'transient_error', sebep: `HTTP ${yanit.status}` };
    }
    if (yanit.ok) {
      const ilk = alanKoku(kaynakAdresi);
      const son = alanKoku(yanit.url || kaynakAdresi);
      if (ilk && son && ilk !== son) {
        return { durum: 'moved', sebep: `alan adı değişti: ${ilk} → ${son}` };
      }
      return { durum: 'ok', sebep: `HTTP ${yanit.status}` };
    }
    return { durum: 'transient_error', sebep: `HTTP ${yanit.status}` };
  } catch (hata) {
    const ad = hata?.name === 'AbortError' ? 'zaman aşımı' : `ağ hatası: ${hata?.message ?? hata}`;
    return { durum: 'transient_error', sebep: ad };
  } finally {
    clearTimeout(zamanlayici);
  }
}

/**
 * Ölçümü satır güncellemesine çevirir. Saf fonksiyon: testte doğrudan
 * çağrılıyor, ağ yok.
 */
export function guncellemeyiHesapla(satir, karar, simdi) {
  const temel = { source_checked_at: simdi, source_status: karar.durum };
  if (karar.durum === 'ok') {
    return { ...temel, source_failure_count: 0, last_checked_at: simdi, verified_at: simdi };
  }
  if (karar.durum === 'transient_error') {
    /* Sayaç DEĞİŞMİYOR: geçici hata ne artırıyor ne sıfırlıyor. */
    return temel;
  }
  const yeniSayac = (satir.source_failure_count ?? 0) + 1;
  const guncelleme = { ...temel, source_failure_count: yeniSayac };
  if (yeniSayac >= ESIK && satir.status === 'published') {
    guncelleme.status = 'expired';
  }
  return guncelleme;
}

async function ana() {
  const db = istemciAc();
  const simdi = new Date().toISOString();
  const { data: firsatlar, error } = await db
    .from('opportunities')
    .select('id, slug, source_url, status, source_failure_count')
    .eq('status', 'published');
  if (error) {
    console.error('fırsatlar okunamadı:', error.message);
    process.exit(1);
  }

  const sayac = { ok: 0, transient_error: 0, closed: 0, moved: 0, expiredYapilan: 0 };

  for (const firsat of firsatlar ?? []) {
    const karar = await kaynagiOlc(firsat.source_url);
    sayac[karar.durum]++;
    const guncelleme = guncellemeyiHesapla(firsat, karar, simdi);
    if (guncelleme.status === 'expired') sayac.expiredYapilan++;

    console.log(
      `${karar.durum.padEnd(15)} ${String(guncelleme.source_failure_count ?? firsat.source_failure_count ?? 0)}/${ESIK}  ${firsat.slug}  (${karar.sebep})` +
        (guncelleme.status === 'expired' ? '  → EXPIRED' : ''),
    );

    if (KURU) continue;
    const { error: yazmaHatasi } = await db.from('opportunities').update(guncelleme).eq('id', firsat.id);
    if (yazmaHatasi) {
      console.error(`yazılamadı ${firsat.slug}: ${yazmaHatasi.message}`);
      process.exit(1);
    }
  }

  /* Son tarihi geçenler de bu koşuda gerçek durumuna geçiyor. */
  let tarihKapanan = 0;
  if (!KURU) {
    const { data, error: rpcHatasi } = await db.rpc('firsat_suresi_dolanlari_kapat');
    if (rpcHatasi) {
      console.error('süresi dolanlar kapatılamadı:', rpcHatasi.message);
      process.exit(1);
    }
    tarihKapanan = Number(data ?? 0);
  }

  console.log(
    `\nkirilim: kontrol=${(firsatlar ?? []).length} ok=${sayac.ok} gecici=${sayac.transient_error} ` +
      `kapali=${sayac.closed} tasindi=${sayac.moved} kaynaktan-expired=${sayac.expiredYapilan} ` +
      `tarihten-expired=${tarihKapanan}${KURU ? '  (KURU — yazılmadı)' : ''}`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  ana();
}
