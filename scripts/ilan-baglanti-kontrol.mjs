/**
 * Yayındaki ilanların BAŞVURU BAĞLANTISINI kontrol eder.
 *
 * NEDEN GEREKLİ
 * -------------
 * Ölçüldü: yayında görünen 13 ilanın 3'ünün başvuru sayfası kapanmıştı
 * (Workable 410, Workday 404) ama kartta "Son kontrol: bugün" yazıyordu.
 * Sebebi şu: `last_seen_at`, toplama hattının HAM KAYDI yeniden gördüğü anı
 * tutuyor — başvuru sayfasının hâlâ çalıştığını değil. İkisi farklı iddia ve
 * ikincisi kullanıcıya verilen sözün ta kendisi.
 *
 * Görünür envanterin dörtte birinin başvuru kabul etmemesi, "resmî kaynağa
 * götürüyoruz" vaadini doğrudan kırıyor.
 *
 * NE YAPIYOR
 * ----------
 *   1. Başvuru adresini gerçekten çağırıyor.
 *   2. Sağlayıcıya özel kapanma işaretlerini arıyor (aşağıda).
 *   3. Sayfanın KENDİ JSON-LD'sinden gerçek yayın tarihini alıyor.
 *   4. Sonucu ilana yazıyor: kapanan ilan status='closed' oluyor.
 *
 * GERÇEK YAYIN TARİHİ NEDEN ÖNEMLİ
 * --------------------------------
 * JobPosting yapısal verisinde `datePosted` olarak siteye EKLENME tarihi
 * kullanılıyordu. Ölçüldü: Alumil ilanının kaynaktaki gerçek tarihi
 * 2025-10-10, Çiçeksepeti'ninki 2022-01-25 — bizim yazdığımız tarih ise
 * 2026-08. Google eski bir ilanı yeniymiş gibi göstermemeyi açıkça istiyor.
 * Artık tarih kaynağın kendi beyanından geliyor.
 *
 * Kullanım:
 *   node scripts/ilan-baglanti-kontrol.mjs          # kontrol et ve yaz
 *   node scripts/ilan-baglanti-kontrol.mjs --kuru   # yalnızca rapor
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const KOK = path.resolve(import.meta.dirname, '..');

/* Anahtarlar automation/.env içinde; ayrı bir dosya tutmuyoruz. */
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

const ortam = { ...ortamOku(), ...process.env };
const url = ortam.SUPABASE_URL;
const anahtar = ortam.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anahtar) {
  console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (automation/.env).');
  process.exit(1);
}
const db = createClient(url, anahtar, { auth: { persistSession: false } });

const BASLIK = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
  'Accept-Language': 'tr,en;q=0.8',
};

/*
  SAĞLAYICIYA ÖZEL KAPANMA İŞARETLERİ

  HTTP durumu tek başına yetmiyor: Workable kapanan ilanda 410 dönüyor ama
  bazı sağlayıcılar kapanan ilan için de 200 + "artık başvuru alınmıyor"
  sayfası veriyor. Metin işaretleri o yüzden gerekli.

  Workday kapanan ilanı /invalid-url adresine yönlendiriyor — durum 404
  olmasa bile son adresi kontrol etmek gerekiyor.
*/
const KAPANMA_METINLERI = [
  'not available anymore',
  'no longer accepting applications',
  'no longer available',
  'position has been closed',
  'posting is no longer',
  'this job is closed',
  'bu ilan yayından kaldırıl',
  'başvuru süresi doldu',
];

/**
 * Görünür metni ayıklar: script, style ve noscript blokları atılıyor.
 *
 * NEDEN GEREKLİ
 * -------------
 * Kapanma işaretleri BÜTÜN HTML içinde aranıyordu, gömülü JavaScript dahil.
 * Modern iş ilanı siteleri hata metinlerini sayfanın içindeki bir sözlükte
 * taşıyor; ilan açıkken bile o metinler kaynakta duruyor.
 *
 * Ölçüldü — üç canlı ilan bu yüzden kapatıldı:
 *   hrpanda  "booking.errors.slotUnavailable":"This time is no longer available"
 *            (randevu slotu hatası; ilanla ilgisi yok)
 *   Jibe     "NO_JOBS_404":"…this job may be no longer available…"
 *            (404 sayfasının ŞABLONU, sayfanın kendisi değil)
 *
 * Üçünün de adresi 200 dönüyordu. Yanlış kapatma sessiz bir hata: ilan
 * listeden düşüyor ve kimse fark etmiyor.
 */
function gorunurMetin(govde) {
  return govde
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function kapanmaSebebi(yanit, govde) {
  /*
    HTTP durumu ve yönlendirme SAYFANIN TAMAMINDAN okunuyor; metin işaretleri
    ise yalnızca görünür metinden. Durum kodu yanıtın kendi bilgisi, metin
    ise yorum gerektiriyor.
  */
  const metin = gorunurMetin(govde).toLowerCase();
  if (yanit.url.includes('invalid-url')) return 'workday: invalid-url yönlendirmesi';
  if (yanit.status === 404) return 'HTTP 404';
  if (yanit.status === 410) return 'HTTP 410';
  for (const iz of KAPANMA_METINLERI) if (metin.includes(iz)) return `sayfa metni: "${iz}"`;
  return null;
}

/**
 * İLANIN HÂLÂ AÇIK OLDUĞUNA DAİR POZİTİF KANIT
 *
 * HTTP 200 tek başına kanıt DEĞİL. Kaynak sitesi ilanı kaldırdığında
 * adres çoğu zaman 404 dönmüyor: genel kariyer sayfasına, arama
 * sonuçlarına ya da "bu pozisyon artık listede değil" demeyen bir
 * şablona yönlendiriyor. O sayfa 200 dönüyor ve kapanma metni de
 * içermiyor.
 *
 * Eski davranışta bu, iki kere yanlıştı:
 *   · `source_verified_at` ilerliyordu — kartta "Son kontrol: bugün"
 *     yazarken doğrulanan şey ilan değil, şirketin kariyer sayfasıydı.
 *   · KAPANMIŞ ilan `status='published'` ile yayına GERİ ALINIYORDU.
 *
 * ÜÇ KANIT, ÜÇÜ DE SAYFANIN KENDİSİ HAKKINDA:
 *   1. schema.org JobPosting — sayfa "burada bir iş ilanı var" diyor.
 *   2. Kanonik adres bizim ilan kimliğimizi taşıyor — sayfa "ben o
 *      ilanım" diyor.
 *   3. <h1> ana başlığı ilanın ayırt edici kelimelerini taşıyor.
 *
 * BAŞLIK ARTIK GÖRÜNÜR METNİN HER YERİNDE ARANMIYOR. Görünür metin
 * menüyü, "önerilen ilanlar" şeridini, "geçmiş ilanlar" listesini ve
 * genel ilan listesini de kapsıyor: kapanmış bir ilanın başlığı, onu
 * hâlâ listeleyen bir sayfada geçebilir ve ilan yanlışlıkla "açık"
 * damgası alırdı. <h1> sayfanın KENDİ konusu.
 *
 * Kanıt yoksa sonuç 'belirsiz': kapalı demiyoruz, açık da demiyoruz —
 * ilan ne kapatılıyor ne yeniden açılıyor.
 */
/** Sayfanin ANA basligi (ilk <h1>). Menu ve serit basliklari h1 degil. */
function anaBaslik(govde) {
  const m = govde.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? gorunurMetin(m[1]) : '';
}

/** Sayfanin kendi beyan ettigi kanonik adres. */
function kanonikAdres(govde) {
  const m = govde.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  if (!m) return '';
  const h = m[0].match(/href=["']([^"']+)["']/i);
  return h ? h[1] : '';
}

/**
 * ILAN KIMLIGI — adresin icindeki uzun, ayirt edici parca.
 *
 * Workday `.../job/.../R-12345`, Workable `.../j/ABCD1234EF`, Lever ve
 * Greenhouse sayisal kimlik kullaniyor. Kalip bunlarin hepsini tek
 * kurala indiriyor: adresin son parcalari icinde en az alti karakterli,
 * icinde rakam gecen parca.
 */
function ilanKimligi(adres) {
  const parcalar = String(adres || '').split(/[/?#]/).filter(Boolean);
  for (const p of parcalar.reverse()) {
    if (p.length >= 6 && /\d/.test(p) && /^[A-Za-z0-9._-]+$/.test(p)) return p;
  }
  return '';
}

function acikKaniti(govde, baslik, adres) {
  if (/"@type"\s*:\s*"JobPosting"/i.test(govde)) return 'sayfada JobPosting verisi';

  /*
    KANONİK ADRES BİZİM İLANI GÖSTERİYOR

    Sayfa kendi kimliğini beyan ediyor. Kaynak ilanı kaldırıp adresi
    genel kariyer sayfasına yönlendirdiğinde canonical O sayfayı
    gösteriyor, bizim ilan kimliğimizi değil.
  */
  const kimlik = ilanKimligi(adres);
  if (kimlik) {
    const kanonik = kanonikAdres(govde);
    if (kanonik && kanonik.includes(kimlik)) return `canonical ilan kimliğini taşıyor (${kimlik})`;
  }

  /*
    BAŞLIK ANA BAŞLIKTA — GÖRÜNÜR METNİN HER YERİNDE DEĞİL

    Önceki kural başlığın kelimelerini SAYFANIN TAMAMINDA arıyordu.
    Görünür metin menüyü, "önerilen ilanlar" şeridini, "geçmiş
    ilanlar" listesini ve genel ilan listesini de kapsıyor: kapanmış
    bir ilanın başlığı, onu hâlâ listeleyen bir liste sayfasında
    geçebilir ve ilan "açık" damgası alırdı.

    <h1> sayfanın KENDİ konusu. Menü ve öneri şeritleri h1'de olmuyor.
  */
  const genel = /^(staj|stajyer|intern|internship|program|programi|programı|uzun|donem|dönem|yaz|kis|kış|ve|for|the)$/i;
  const kelimeler = gorunurMetin(baslik)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((k) => k.length > 3 && !genel.test(k));
  if (kelimeler.length === 0) return null;

  const h1 = anaBaslik(govde).toLowerCase();
  if (!h1) return null;
  const bulunan = kelimeler.filter((k) => h1.includes(k)).length;
  /*
    EŞİK YARIDAN ÜÇTE İKİYE ÇIKTI: h1 kısa bir metin, tesadüfi
    eşleşme payı daha yüksek. "Yazılım Stajyeri" ile "Yazılım
    Mimarı" arasındaki farkı kaybetmemek için çoğunluk yetmiyor.
  */
  return bulunan * 3 >= kelimeler.length * 2
    ? `ana başlık ilanı gösteriyor (${bulunan}/${kelimeler.length})`
    : null;
}

/** Sayfanın kendi JobPosting verisinden gerçek yayın tarihi. */
function yayinTarihi(govde) {
  const bloklar = [...govde.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, ham] of bloklar) {
    try {
      const veri = JSON.parse(ham);
      for (const oge of Array.isArray(veri) ? veri : [veri]) {
        if (oge && oge['@type'] === 'JobPosting' && oge.datePosted) {
          const t = new Date(oge.datePosted);
          if (Number.isFinite(t.getTime())) return t.toISOString();
        }
      }
    } catch {
      /* Bozuk JSON-LD sayfayı düşürmesin. */
    }
  }
  return null;
}

const kuru = process.argv.includes('--kuru');

/*
  HANGİ İLANLAR GEZİLİYOR

  Yayındakiler ve kapanmış olanlar (geri açılabilir). Buna ek olarak
  AÇIKLIĞI DOĞRULANMAMIŞ TASLAKLAR: kaynak sayfası duran ama açık olduğu
  kanıtlanamayan ilanlar `status='draft'`, `origin='scraped'` olarak
  kaydediliyor (automation/promote.py). Gezilmeselerdi envanterde sessizce
  eskirlerdi; asıl soruları — "sayfa hâlâ duruyor mu" — yanıtsız kalırdı.

  İşveren taslakları (origin='employer') KAPSAM DIŞI: onlar yönetici
  onayını bekleyen kayıtlar, tarama otomasyonunun işi değil.
*/
const { data: ilanlar, error } = await db
  .from('listings')
  .select('id, title, apply_url, source_url, status, origin, posted_at')
  .or('status.in.(published,closed),and(status.eq.draft,origin.eq.scraped)');
if (error) {
  console.error('İlanlar okunamadı:', error.message);
  process.exit(1);
}

const simdi = new Date().toISOString();
let acik = 0;
let kapali = 0;
let erisilemedi = 0;
/* Belirsiz: cevap alındı ama ilanın açık olduğu doğrulanamadı. */
let belirsizSayisi = 0;
let tarihYazildi = 0;
/*
  AYRINTILI SAYAÇLAR

  Önce yalnızca üç sayı yazılıyordu: açık, kapalı, erişilemedi. Günlük
  zamanlı çalışmaya bağlanınca bu yetmiyor — "erişilemedi 9" satırı,
  dokuz sitenin bizi engellediğini mi yoksa dokuz kez zaman aşımı mı
  olduğunu söylemiyor. Birincisi User-Agent/oran sorunu, ikincisi ağ.
*/
const sayac = { adresYok: 0, kapanma404: 0, kapanma410: 0, kapanmaMetin: 0, engel403: 0, oran429: 0, sunucu5xx: 0, digerHTTP: 0, zamanAsimi: 0, agHatasi: 0, belirsiz: 0 };
/*
  Yazma hatası sayılıyor: tek bir üçüncü taraf hatası işi kırmamalı ama
  veritabanına hiç yazamıyorsak bu gerçek bir betik/yetki hatasıdır ve
  iş yeşil görünmemeli.
*/
let yazmaHatasiSayisi = 0;

/*
  ZAMAN AŞIMI

  `fetch` süresiz bekleyebiliyor. Elle çalıştırıldığında insan fark
  edip iptal ediyordu; zamanlanmış işte bu, iş kotasını tüketene kadar
  asılı kalan bir koşu demek. Zaman aşımı `catch` bloğuna düşüyor, yani
  "erişilemedi" sayılıyor — KAPANDI SAYILMIYOR.
*/
const ZAMAN_ASIMI_MS = 20_000;

for (const ilan of ilanlar) {
  const adres = ilan.apply_url || ilan.source_url;
  if (!adres) {
    sayac.adresYok++;
    console.log(`${ilan.title.slice(0, 42).padEnd(44)} ADRES YOK`);
    continue;
  }

  /*
    BAŞARISIZ VE BELİRSİZ DENEMEDE `source_verified_at` YAZILMIYOR

    Güncelleme nesnesi yalnız `source_checked_at` ile başlıyor ve
    `source_verified_at` YALNIZCA kanıtlı açık dalında ekleniyor.
    Alanın hiç yazılmaması korunmasının ta kendisi.

    Ölçüldü (14 Eylül 2026, üretim): 10 ilanda `source_checked_at >
    source_verified_at` — yani bu davranış gerçekten çalışıyor.
  */
  let guncelleme = { source_checked_at: simdi };
  let etiket = '';

  try {
    const yanit = await fetch(adres, {
      headers: BASLIK,
      redirect: 'follow',
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
    });
    const govde = await yanit.text();
    const sebep = kapanmaSebebi(yanit, govde);

    if (sebep) {
      kapali++;
      if (yanit.status === 404) sayac.kapanma404++;
      else if (yanit.status === 410) sayac.kapanma410++;
      else sayac.kapanmaMetin++;
      etiket = `KAPALI  ${sebep}`;
      guncelleme = {
        ...guncelleme,
        source_status: 'kapali',
        status: 'closed',
        deactivated_at: simdi,
        deactivation_reason: `başvuru bağlantısı kapandı — ${sebep}`,
      };
    } else if (yanit.ok) {
      /*
        200 ALINDI — ŞİMDİ KANIT ARANIYOR

        `yanit.ok` doğrudan 'acik' sayılıyordu. Kaynak ilanı kaldırıp
        adresi genel kariyer sayfasına yönlendirdiğinde o sayfa da 200
        dönüyor; kapanma metni yok, ilan da yok.
      */
      const kanit = acikKaniti(govde, ilan.title, adres);

      if (kanit) {
        acik++;
        etiket = `açık  (${kanit})`;
        guncelleme = { ...guncelleme, source_status: 'acik', source_verified_at: simdi };
        /*
          İlan yeniden açıldıysa yayına geri alınıyor: kapanmış diye
          işaretlenen bir ilan sonsuza kadar kapalı kalmamalı.

          GERİ ALMA YALNIZ KANIT VARSA: eskiden 200 yeterliydi, yani
          kariyer sayfası cevap veren her kapanmış ilan yayına dönüyordu.
        */
        /*
          TASLAK KANIT BULUNSA DA YAYINA ÇIKMIYOR: başlığın sayfada
          geçmesi "ilan açık" demek değil; bu ilanların açıklığı zaten
          kanıtlanamadığı için taslakta duruyorlar. Yalnız `source_status`
          ilerliyor.
        */
        if (ilan.status === 'closed') guncelleme.status = 'published';

        const tarih = yayinTarihi(govde);
        if (tarih && tarih !== ilan.posted_at) {
          guncelleme.posted_at = tarih;
          tarihYazildi++;
          etiket += `  yayın tarihi: ${tarih.slice(0, 10)}`;
        }
      } else {
        /*
          BELİRSİZ — ÜÇÜNCÜ SONUÇ

          Kapalı demiyoruz (kapanma işareti yok), açık da demiyoruz
          (ilanın kendi kanıtı yok). `source_checked_at` ilerliyor,
          `source_verified_at` KORUNUYOR ve ilanın durumu değişmiyor:
          yanlış kapatma da yanlış doğrulama da yapılmıyor.
        */
        sayac.belirsiz++;
        belirsizSayisi++;
        etiket = 'BELİRSİZ  200 ama ilanın kanıtı yok';
        guncelleme = { ...guncelleme, source_status: 'belirsiz' };
      }
    } else {
      /*
        Geçici hata kapanma sayılmıyor: 500 ya da 403 alan bir ilanı
        kapatmak, çalışan ilanı listeden düşürmek olurdu.
      */
      erisilemedi++;
      if (yanit.status === 403) sayac.engel403++;
      else if (yanit.status === 429) sayac.oran429++;
      else if (yanit.status >= 500) sayac.sunucu5xx++;
      else sayac.digerHTTP++;
      etiket = `ERİŞİLEMEDİ  HTTP ${yanit.status}`;
      guncelleme = { ...guncelleme, source_status: 'erisilemedi' };
    }
  } catch (hata) {
    erisilemedi++;
    /*
      Zaman aşımı, DNS ve TLS hataları burada birleşiyor. Hiçbiri
      "ilan kapandı" demek değil; hepsi source_status='erisilemedi'.
    */
    const ad = String(hata?.name || '');
    if (ad === 'TimeoutError' || ad === 'AbortError') sayac.zamanAsimi++;
    else sayac.agHatasi++;
    etiket = `ERİŞİLEMEDİ  ${String(hata.message).slice(0, 40)}`;
    guncelleme = { ...guncelleme, source_status: 'erisilemedi' };
  }

  console.log(`${ilan.title.slice(0, 42).padEnd(44)} ${etiket}`);

  if (!kuru) {
    const { error: yazmaHatasi } = await db.from('listings').update(guncelleme).eq('id', ilan.id);
    if (yazmaHatasi) {
      yazmaHatasiSayisi++;
      console.log(`   YAZILAMADI: ${yazmaHatasi.message}`);
    }
  }
}

console.log(
  `\n${ilanlar.length} ilan kontrol edildi — açık ${acik}, kapalı ${kapali}, erişilemedi ${erisilemedi}` +
    (tarihYazildi ? `, ${tarihYazildi} ilanda gerçek yayın tarihi güncellendi` : '') +
    (kuru ? '  (kuru çalıştırma: yazılmadı)' : '')
);

/*
  KIRILIM — İŞ KAYDINDA OKUNABİLİR TEK SATIR

  Adres yazılmıyor: bazı başvuru adresleri sorgu dizesinde oturum ya da
  takip belirteci taşıyor ve iş kaydı herkese açık. Sayılar sorunun
  türünü anlatmaya yetiyor.
*/
console.log(
  `kirilim: kontrol=${ilanlar.length} acik=${acik} 404=${sayac.kapanma404} 410=${sayac.kapanma410} ` +
    `metinle_kapali=${sayac.kapanmaMetin} 403=${sayac.engel403} 429=${sayac.oran429} ` +
    `5xx=${sayac.sunucu5xx} diger_http=${sayac.digerHTTP} zaman_asimi=${sayac.zamanAsimi} ` +
    `belirsiz=${sayac.belirsiz} ` +
    `ag_hatasi=${sayac.agHatasi} adres_yok=${sayac.adresYok} yazma_hatasi=${yazmaHatasiSayisi}`
);

/*
  İŞ NE ZAMAN KIRMIZI OLMALI

  Üçüncü taraf hatası NORMAL: 403, 429, 5xx ve zaman aşımı olağan ve
  zaten "erişilemedi" olarak kaydediliyor; bunlar için işi kırmak, her
  gün kırmızı olan ve bu yüzden kimsenin bakmadığı bir iş üretirdi.

  Veritabanına yazamamak ise gerçek bir hata: betiğin tek işi bu. Sessiz
  yeşil görünmemesi için çıkış kodu 1.
*/
if (yazmaHatasiSayisi > 0) {
  console.error(`::error::${yazmaHatasiSayisi} ilan güncellenemedi — kaynak sağlığı yazılamadı.`);
  process.exit(1);
}

