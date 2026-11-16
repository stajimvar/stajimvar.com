/**
 * BÖLÜM SAYFASI ARAMA METİNLERİ (17 Kasım 2026)
 *
 * ÖLÇÜLEN SORUN (Search Console, 17 Eyl – 15 Kas)
 * -----------------------------------------------
 * Öğrenciler "bilgisayar mühendisliği staj", "… staj yerleri", "endüstri
 * mühendisliği staj ilanları" diye arıyor. Sayfa başlığı ise yalnız
 * "Bilgisayar Mühendisliği stajı" idi; aranan "staj yerleri" ve "staj
 * ilanları" sözcükleri başlıkta, açıklamada ve H1'de yoktu. Sıralar:
 * bilgisayar mühendisliği staj 71, bilgisayar programcılığı staj 58,
 * endüstri mühendisliği staj ilanları 57.
 *
 * Sayfa zaten tam bunu veriyor (nerede staj yapılır + açık ilanlar +
 * staj alan işverenler); başlık bunu söylemiyordu.
 *
 * TEK KAYNAK: tarayıcı (BolumPages.tsx) ve ön render (scripts/onrender.mjs)
 * aynı fonksiyonu çağırıyor; iki başlık birbirinden ayrılamaz.
 *
 * SAĞLIK BÖLÜMLERİ AYRI: orada staj ilanla değil okul yerleştirmesiyle
 * yapılıyor (OKUL_YERLESTIRIR). "Staj ilanları" vaadi yanlış olurdu.
 */

const kucuk = (s) => s.toLocaleLowerCase('tr-TR');

/**
 * @param {{ ad: string, aciklama?: string, ozet?: string }} bolum
 * @param {{ okulYerlestirir?: boolean }} [secenek]
 * @returns {{ baslik: string, h1: string, aciklama: string }}
 */
export function bolumSeo(bolum, { okulYerlestirir = false } = {}) {
  if (okulYerlestirir) {
    return {
      baslik: `${bolum.ad} Stajı ve Klinik Uygulama | StajımVar`,
      h1: `${bolum.ad} stajı`,
      aciklama: bolum.aciklama || bolum.ozet || '',
    };
  }
  const ad = kucuk(bolum.ad);
  return {
    baslik: `${bolum.ad} Staj Yerleri ve İlanları | StajımVar`,
    h1: `${bolum.ad} staj yerleri ve ilanları`,
    aciklama:
      `Güncel ${ad} staj ilanları ve staj yerleri: hangi şirketlerde staj yapılır, ` +
      'stajyer ne iş yapar, başvurmadan önce ne öğrenmeli.',
  };
}

/** /bolumler liste sayfası. */
export const BOLUM_LISTESI_BASLIGI = 'Bölümlere Göre Staj Yerleri ve İlanları | StajımVar';
