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
/*
  KAPANIŞ EŞİĞİ — KESİN İLE TAŞINDI AYRI

  Tek eşik vardı: 3. Kontrol üç günde bir koştuğu için KESİN kapanmış
  (HTTP 404/410 — sayfa yok) bir fırsat DOKUZ GÜN aktif listede
  kalıyordu. Ölçüldü: iki kayıt 404 döndü ve `published` kaldı.

  Oysa işçi geçici ile kesini ZATEN ayırıyor: 403/429/5xx/zaman aşımı
  `transient_error` ve sayacı hiç artırmıyor. Yani sayaca giren şey
  baştan kesin bir sinyal; onu üç kez teyit etmek, ölü bir bağlantıyı
  bir haftadan fazla listede tutmak demek.

  İKİ AYRI EŞİK
    closed  404/410, sayfa yok        → 2  (bir teyit yeter)
    moved   başka alan adına düşüyor  → 3  (yönlendirme geçici olabilir)

  Neden `closed` için 1 değil 2: tek bir dağıtım hatası ya da bakım
  penceresi 404 döndürebilir. Üç gün arayla İKİ bağımsız ölçüm, gerçek
  bir kapanış için makul ve gereksiz bekletmiyor.
*/
const ESIK_KAPALI = 2;
const ESIK_TASINDI = 3;

/** Karara göre kaç teyit gerekiyor. */
export function kapanisEsigi(durum) {
  return durum === 'moved' ? ESIK_TASINDI : ESIK_KAPALI;
}
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

/*
  AÇIK KAPANIŞ İFADESİ — HTTP 200 İLE BİRLİKTE

  Sayfa açılıyor (200) ama üstünde "başvurular kapandı" yazıyorsa, bu
  KESİN bir kapanış kanıtı ve eşiği beklemeye gerek yok: kurumun kendi
  cümlesi. Bu aynı zamanda "HTTP 200 tek başına açık kanıtı değildir"
  kuralının öteki yarısı — 200 dönen bir sayfa kapanmış da olabilir.

  Kalıp DAR tutuldu. "başvuru" kelimesi her burs sayfasında geçiyor;
  aranan şey kapanmayı SÖYLEYEN cümle.
*/
const KAPANIS_IFADESI =
  /ba[şs]vurular(ı|i)?m?[ıi]z? (kapan|sona er|bit)|ba[şs]vuru d[öo]nemi (kapan|sona er|bitt)|son ba[şs]vuru tarihi ge[çc]|ba[şs]vurular kapal[ıi]|applications? (are )?closed|no longer accepting applications|ba[şs]vuru al[ıi]nmamaktad[ıi]r/i;

/** Etiketleri atıp okunur metin bırakır; yorumlar da atılıyor. */
function gorunurMetin(govde) {
  return String(govde ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Sayfa gövdesi kapanmayı AÇIKÇA söylüyor mu? */
export function acikKapanisVar(govde) {
  return KAPANIS_IFADESI.test(gorunurMetin(govde));
}

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
      /*
        GÖVDE OKUNUYOR: sayfa açılıyor olabilir ama üstünde
        "başvurular kapandı" yazıyor olabilir. Kurumun kendi cümlesi
        KESİN kanıt ve eşiği beklemiyor.
      */
      let govde = '';
      try {
        govde = await yanit.text();
      } catch {
        /* Gövde okunamazsa yalnız durum kodu kalıyor. */
      }
      if (acikKapanisVar(govde)) {
        return { durum: 'closed', sebep: 'sayfada başvuruların kapandığı yazıyor', kesin: true };
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
/** Bağımsız teyit için iki ölçüm arasında gereken en az süre. */
export const TEYIT_ARALIGI_MS = 24 * 60 * 60 * 1000;

/**
 * İki ölçüm BAĞIMSIZ sayılabilir mi?
 *
 * ÖLÇÜLDÜ VE KENDİ ELİMLE ÜRETTİM: işçiyi elle iki kez koşturdum
 * (aralarında ~30 dakika) ve bir kayıt ikinci koşuda `expired` oldu. O
 * iki ölçüm bağımsız değil — aynı yarım saat içinde aynı geçici durumu
 * iki kez gördüler. Kurumun sitesi bakımda olsaydı gerçekten açık bir
 * burs yarım saatte listeden düşerdi.
 *
 * Eşiğin amacı "iki kez baktık" değil, "iki AYRI GÜN baktık".
 * Zamanlanmış koşu üç günde bir olduğu için gerçek kapanışta gecikme
 * olmuyor: iki zamanlı koşu zaten 72 saat arayla.
 */
export function bagimsizTeyitMi(sonHataDamgasi, simdi) {
  if (!sonHataDamgasi) return true;
  const fark = new Date(simdi).getTime() - new Date(sonHataDamgasi).getTime();
  return Number.isFinite(fark) && fark >= TEYIT_ARALIGI_MS;
}

export function guncellemeyiHesapla(satir, karar, simdi) {
  const temel = { source_checked_at: simdi, source_status: karar.durum };
  if (karar.durum === 'ok') {
    return {
      ...temel,
      source_failure_count: 0,
      source_failure_last_at: null,
      last_checked_at: simdi,
      verified_at: simdi,
    };
  }
  if (karar.durum === 'transient_error') {
    /* Sayaç DEĞİŞMİYOR: geçici hata ne artırıyor ne sıfırlıyor. */
    return temel;
  }

  /*
    KESİN KAPANIŞ EŞİĞİ BEKLEMİYOR

    Kurumun kendi sayfasında "başvurular kapandı" yazıyorsa ya da kesin
    bir son başvuru tarihi geçmişse, ikinci bir teyit istemek gereksiz:
    kanıt tek ölçümde tam. Bu dal YALNIZ açık ifade ya da geçmiş kesin
    tarih için çalışıyor — bir 404 buraya GİRMİYOR, çünkü 404 geçici
    bir dağıtım hatası da olabilir.
  */
  if (karar.kesin && satir.status === 'published') {
    return {
      ...temel,
      source_failure_count: (satir.source_failure_count ?? 0) + 1,
      source_failure_last_at: simdi,
      status: 'expired',
    };
  }

  /*
    SAYAÇ YALNIZ BAĞIMSIZ TEYİTTE ARTIYOR

    Arka arkaya çalıştırılan kontroller sayacı ilerletmiyor; yalnız
    `source_checked_at` güncelleniyor. Böylece elle iki kez koşmak bir
    fırsatı kapatamıyor.
  */
  if (!bagimsizTeyitMi(satir.source_failure_last_at, simdi)) {
    return temel;
  }

  const yeniSayac = (satir.source_failure_count ?? 0) + 1;
  const guncelleme = {
    ...temel,
    source_failure_count: yeniSayac,
    source_failure_last_at: simdi,
  };
  if (yeniSayac >= kapanisEsigi(karar.durum) && satir.status === 'published') {
    guncelleme.status = 'expired';
  }
  return guncelleme;
}

async function ana() {
  const db = istemciAc();
  const simdi = new Date().toISOString();
  /*
    AÇILIŞ OKUMASI YENİDEN DENENİYOR — TEK 504 BÜTÜN KOŞUYU ÖLDÜRDÜ

    ÖLÇÜLDÜ: 13 Eylül 2026 koşusu "fırsatlar okunamadı: Gateway Timeout"
    ile düştü. Okuma tek denemeydi ve hata ölümcüldü; cron üç günde bir
    koştuğu için 120 kaydın `source_status` alanı GÜN­LERCE boş kaldı.
    Yani kapanış kontrolü hiç çalışmadı ve hiç kimse fark etmedi.

    Geçici bir ağ geçidi hatası, kaynak kontrolünü iptal etmek için
    sebep değil — kaydın kendisine bile dokunmadan ölüyordu.

    Üç deneme, artan bekleme. Üçü de düşerse hâlâ hata veriyor:
    kalıcı bir sorun gizlenmiyor.
  */
  let firsatlar = null;
  let sonHata = null;
  for (let deneme = 1; deneme <= 3; deneme += 1) {
    const { data, error } = await db
      .from('opportunities')
      .select('id, slug, source_url, status, source_failure_count, source_failure_last_at, application_deadline')
      .eq('status', 'published');
    if (!error) {
      firsatlar = data;
      if (deneme > 1) console.log(`fırsatlar ${deneme}. denemede okundu.`);
      break;
    }
    sonHata = error.message;
    console.warn(`fırsatlar okunamadı (deneme ${deneme}/3): ${error.message}`);
    if (deneme < 3) await new Promise((c) => setTimeout(c, deneme * 5000));
  }
  if (!firsatlar) {
    console.error(`::error::fırsatlar üç denemede de okunamadı: ${sonHata}`);
    process.exit(1);
  }

  const sayac = { ok: 0, transient_error: 0, closed: 0, moved: 0, expiredYapilan: 0 };

  for (const firsat of firsatlar ?? []) {
    const karar = await kaynagiOlc(firsat.source_url);
    sayac[karar.durum]++;
    const guncelleme = guncellemeyiHesapla(firsat, karar, simdi);
    if (guncelleme.status === 'expired') sayac.expiredYapilan++;

    console.log(
      `${karar.durum.padEnd(15)} ${String(guncelleme.source_failure_count ?? firsat.source_failure_count ?? 0)}/${kapanisEsigi(karar.durum)}  ${firsat.slug}  (${karar.sebep})` +
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
