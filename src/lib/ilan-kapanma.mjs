/**
 * İLAN KAPANMA VE AÇIKLIK KARARLARI (13 Ekim 2026'da modüle taşındı)
 *
 * Eskiden scripts/ilan-baglanti-kontrol.mjs içindeydi ve dışa
 * aktarılmadığı için yalnız betiğin METNİ sınanabiliyordu. Kararlar saf
 * işlev: sayfa gövdesi + yanıt bilgisi girer, karar çıkar. Betik aynı
 * işlevleri buradan çağırıyor; davranış aynı (bu modüle taşınırken
 * eklenen tek şey: ilana özgü kapanma ifadeleri, aşağıda).
 */

/*
  SAĞLAYICIYA ÖZEL KAPANMA İŞARETLERİ

  HTTP durumu tek başına yetmiyor: Workable kapanan ilanda 410 dönüyor ama
  bazı sağlayıcılar kapanan ilan için de 200 + "artık başvuru alınmıyor"
  sayfası veriyor. Metin işaretleri o yüzden gerekli.

  Workday kapanan ilanı /invalid-url adresine yönlendiriyor — durum 404
  olmasa bile son adresi kontrol etmek gerekiyor.
*/
export const KAPANMA_METINLERI = [
  'not available anymore',
  'no longer accepting applications',
  'no longer available',
  'position has been closed',
  'posting is no longer',
  'this job is closed',
  'bu ilan yayından kaldırıl',
  'başvuru süresi doldu',
  /*
    ALMANCA (13 Ekim 2026, ölçüldü): join.com arşivlenmiş ilan için 200
    dönüyor ve "Diese Stelle ist nicht mehr verfügbar … wurde archiviert
    oder die Bewerbungsfrist ist abgelaufen" diyor — sayfada JobPosting
    verisi DURUYOR. Bu ifadeler tanınmadığı için kapanmış 2zero ilanı
    "açık" sayılıp yayına geri alınabiliyordu. "no longer available" ile
    aynı anlam; ama yalnız "Stelle/Stellenanzeige" ile birlikte (genel
    "nicht mehr verfügbar" başka bir özelliği de anlatabilir).
  */
  'stelle ist nicht mehr verfügbar',
  'stellenanzeige ist nicht mehr verfügbar',
  'wurde archiviert oder die bewerbungsfrist ist abgelaufen',
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
export function gorunurMetin(govde) {
  return govde
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

export function kapanmaSebebi(yanit, govde, { baslik = '', adres = '' } = {}) {
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
  /* İlana özgü ifadeler yalnız başarılı yanıtta ve yalnız ilanın kendi sayfasında. */
  if (yanit.status >= 200 && yanit.status < 300) {
    const ozgu = ilanaOzguKapanma(govde, { baslik, adres });
    if (ozgu) return `sayfa metni: "${ozgu}"`;
  }
  return null;
}

/*
  İLANA ÖZGÜ KAPANMA İFADELERİ (13 Ekim 2026)

  ÖLÇÜLDÜ: Connectinno ilanının resmî sayfası (recruspace) 200 dönüyor ve
  "Application Closed — This job posting is closed for applications"
  diyor; başvuru düğmesi yok. Yukarıdaki listede bu ifadeler olmadığı için
  kontrol ilanı "açık" sayıyordu (sayfada JobPosting verisi var).

  "Application closed" yukarıdaki genel listeye KONMADI: kısa ve genel bir
  ifade, kapanmamış bir ilanın sayfasında da geçebilir — "geçmiş ilanlar"
  şeridinde başka bir ilanın etiketi olarak ya da "başvurular kapanana
  kadar" gibi bir cümlenin içinde. Yanlış kapatma sessiz bir hata (ilan
  listeden düşer, kimse fark etmez). Bu yüzden üç şart birden:
    1. Sayfa İLANIN KENDİSİ: acikKaniti ile aynı kimlik kanıtı (sayfanın
       JobPosting verisi, canonical'da ilan kimliği ya da h1'de başlık).
       Genel kariyer sayfası ya da başka bir ilanın sayfası sayılmıyor.
    2. İfade bir koşul cümlesinin parçası DEĞİL ("until the application is
       closed", "başvurular kapanana kadar").
    3. Sayfada etkin bir başvuru düğmesi YOK ("Apply now", "Jetzt
       bewerben", "Başvur"). Düğme varsa açıklık kazanır.
*/
export const ILANA_OZGU_KAPANMA = [
  /closed for applications/u,
  /(?:^|[^\p{L}])applications? (?:is |are |has been |have been |now )?closed(?![\p{L}])/u,
  /(?:^|[^\p{L}])başvurulara (?:kapalı|kapatıldı|kapanmıştır)(?![\p{L}])/u,
  /(?:^|[^\p{L}])başvurular (?:kapandı|kapanmıştır|kapatılmıştır)(?![\p{L}])/u,
];

const KOSUL_ONEKI = /(?:^|[^\p{L}])(?:until|till|once|when|after|before|if|unless|bis|sobald|wenn|kadar|sonra|önce)(?![\p{L}])[^.!?]{0,40}$/u;
/* Türkçede koşul ifadeden SONRA geliyor: "başvurular kapandı ilan edilene kadar". */
const KOSUL_SONEKI = /^[^.!?]{0,40}?(?:^|[^\p{L}])(?:kadar|sonra|önce|edilene|edildiğinde|edildikten)(?![\p{L}])/u;

const BASVURU_DUGMESI = /^(?:apply|apply now|apply for this job|jetzt bewerben|bewerben|başvur|hemen başvur|başvuru yap|şimdi başvur)$/i;

/** Sayfada etkin (devre dışı olmayan) bir başvuru düğmesi ya da bağlantısı var mı? */
export function etkinBasvuruDugmesi(govde) {
  for (const m of govde.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    const nitelik = m[2];
    if (/\bdisabled\b|aria-disabled=["']true["']/i.test(nitelik)) continue;
    const yazi = gorunurMetin(m[3]).replace(/\s+/g, ' ').trim();
    if (BASVURU_DUGMESI.test(yazi)) return true;
  }
  return false;
}

export function ilanaOzguKapanma(govde, { baslik = '', adres = '' } = {}) {
  if (!acikKaniti(govde, baslik, adres)) return null;
  if (etkinBasvuruDugmesi(govde)) return null;
  const metin = gorunurMetin(govde).toLowerCase().replace(/\s+/g, ' ');
  for (const desen of ILANA_OZGU_KAPANMA) {
    const genel = new RegExp(desen.source, 'gu');
    for (const m of metin.matchAll(genel)) {
      const once = metin.slice(Math.max(0, m.index - 60), m.index + (m[0].length - m[0].trimStart().length));
      if (KOSUL_ONEKI.test(once)) continue;
      if (KOSUL_SONEKI.test(metin.slice(m.index + m[0].length, m.index + m[0].length + 60))) continue;
      return m[0].replace(/^[^\p{L}]+/u, '');
    }
  }
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
export function anaBaslik(govde) {
  const m = govde.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? gorunurMetin(m[1]) : '';
}

/** Sayfanin kendi beyan ettigi kanonik adres. */
export function kanonikAdres(govde) {
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
export function ilanKimligi(adres) {
  const parcalar = String(adres || '').split(/[/?#]/).filter(Boolean);
  for (const p of parcalar.reverse()) {
    if (p.length >= 6 && /\d/.test(p) && /^[A-Za-z0-9._-]+$/.test(p)) return p;
  }
  return '';
}

export function acikKaniti(govde, baslik, adres) {
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

/*
  KAPALI İLANI YENİDEN AÇMAK İÇİN DAHA SIKI KANIT (13 Ekim 2026)

  Yayındaki ilanı açık saymak ile KAPANMIŞ ilanı yayına geri almak aynı
  karar değil. İkincisi bir öğrenciyi kapalı bir başvuruya gönderebilir.

  ÖLÇÜLDÜ: join.com arşivlenmiş ilanın sayfasında JobPosting verisini
  bırakıyor (2zero: "Diese Stelle ist nicht mehr verfügbar" + JobPosting).
  `acikKaniti` JobPosting'i yeterli saydığı için kapalı ilan yayına
  dönebiliyordu. Yeniden açmak için üçü birden:
    1. Sayfa ilanın kendisi (acikKaniti).
    2. Sayfada ETKİN bir başvuru düğmesi var.
    3. JobPosting `validThrough` taşıyorsa geçmişte değil.
  Kanıt yoksa ilan kapalı KALIYOR; betik onu 'belirsiz' olarak işaretliyor
  (yönetici kuyruğu). Yanlış yeniden açma, yanlış kapatma kadar sessiz.
*/
/** JobPosting `validThrough` geçmişte mi? Okunamıyorsa false. */
export function gecerlilikGecmis(govde, simdi = Date.now()) {
  for (const [, ham] of govde.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let veri;
    try {
      veri = JSON.parse(ham);
    } catch {
      continue;
    }
    const ogeler = Array.isArray(veri) ? veri : Array.isArray(veri?.['@graph']) ? veri['@graph'] : [veri];
    for (const oge of ogeler) {
      if (oge?.['@type'] !== 'JobPosting' || !oge.validThrough) continue;
      const t = new Date(oge.validThrough).getTime();
      if (Number.isFinite(t) && t < simdi) return true;
    }
  }
  return false;
}

export function yenidenAcmaKaniti(govde, baslik, adres, simdi = Date.now()) {
  const kanit = acikKaniti(govde, baslik, adres);
  if (!kanit) return null;
  if (!etkinBasvuruDugmesi(govde)) return null;
  if (gecerlilikGecmis(govde, simdi)) return null;
  return `${kanit} + etkin başvuru düğmesi`;
}
