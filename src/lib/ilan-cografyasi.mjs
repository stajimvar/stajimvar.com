/**
 * İLANIN COĞRAFYASI — Türkiye / Yurtdışı / Belirlenemedi
 *
 * Tek kural, tek yer. İlan listesindeki "Türkiye'de staj" / "Yurtdışında
 * staj" seçimi, kayıtlı arama eşleşmesi (ve onu çağıran günlük özet
 * işçisi), /staj-ilanlari ön render istatistikleri ve kuru çalıştırma
 * raporu (scripts/ilan-cografyasi-rapor.mjs) bu fonksiyonu çağırıyor.
 *
 * NE DEĞİL: bir yayın kararı. Sonuç hiçbir ilanı gizlemiyor, silmiyor,
 * yayından kaldırmıyor; yalnız hangi görünümde bulunacağını söylüyor.
 * "Belirlenemedi" ilanlar "Tüm ilanlar" görünümünde duruyor. Başlık dili,
 * ücret, "Praktikum", "m/w/d", "MT" gibi kelimeler hiç okunmuyor.
 *
 * KAYNAK ALANLAR (mevcut şema, yeni kolon yok)
 *   country_code — pozisyonun çalışma ülkesi (ingest kaynağın ülke kanıtıyla
 *                  yazıyor). Şirket merkezi DEĞİL; şirket ülkesi okunmuyor.
 *   city         — serbest metin konum.
 *   work_type    — çalışma biçimi. "Remote" bir ülke değil: tek başına
 *                  coğrafya belirlemiyor.
 *
 * KURALLAR
 *   1. Ülke TR → Türkiye. (TR kodlu Remote ilan: kaynak çalışma ülkesini
 *      Türkiye diye veriyor — Türkiye'den uzaktan.) Şehir metni açıkça
 *      yabancı bir şehir/ülke söylüyorsa çelişki → Belirlenemedi.
 *   2. Ülke TR dışı → Yurtdışı. Şehir metni bir Türkiye ili/ilçesi ise
 *      çelişki → Belirlenemedi. Yabancı ilan Türkiye'ye TAŞINMIYOR.
 *   3. Ülke yok: şehir metni yalnız Türkiye'yi gösteriyorsa Türkiye (ör.
 *      "Tuzla"), yalnız yabancı bir yeri gösteriyorsa Yurtdışı; ikisi de
 *      ya da hiçbiri → Belirlenemedi. NULL ülke Türkiye SAYILMIYOR.
 *   4. Çok konumlu ilan (`konumlar`): herhangi biri Türkiye ise Türkiye
 *      görünümünde bulunabilir; `konumlar` olduğu gibi korunur, burada
 *      yalnız görünüm kararı veriliyor.
 */
import { ilBul, katla } from './il-bul.mjs';

export const COGRAFYA = Object.freeze({
  TURKIYE: 'turkiye',
  YURTDISI: 'yurtdisi',
  BELIRSIZ: 'belirsiz',
});

/*
  AÇIKÇA YABANCI YER ADLARI

  Kapsam dar ve bilinçli: canlı katalogda geçen şehirler ve ilan
  metinlerinde sık görülen ülke adları. Tanınmayan bir metin yabancı
  SAYILMIYOR — yalnız çelişki tespitinde ve ülkesiz ilanda kanıt olarak
  kullanılıyor.
*/
const YABANCI_YERLER = [
  // ülke adları (tr/en/yerel)
  'germany', 'deutschland', 'almanya', 'france', 'fransa', 'united kingdom', 'uk', 'england', 'ingiltere',
  'netherlands', 'hollanda', 'belgium', 'belcika', 'spain', 'ispanya', 'italy', 'italya', 'austria',
  'avusturya', 'switzerland', 'isvicre', 'poland', 'polonya', 'sweden', 'isvec', 'denmark', 'danimarka',
  'ireland', 'irlanda', 'portugal', 'portekiz', 'usa', 'united states', 'abd', 'canada', 'kanada',
  'dubai', 'united arab emirates', 'bae', 'luxembourg', 'luksemburg', 'czech republic', 'cekya',
  // katalogda ve sık geçen şehirler
  'paris', 'neuilly-sur-seine', 'neuilly sur seine', 'cannes', 'vaires-sur-marne', 'lyon', 'marseille',
  'berlin', 'munich', 'munchen', 'hamburg', 'cologne', 'koln', 'dusseldorf', 'essen', 'boblingen',
  'kusterdingen', 'tubingen', 'frankfurt', 'stuttgart', 'london', 'londra', 'amsterdam', 'brussels',
  'bruksel', 'madrid', 'barcelona', 'milan', 'milano', 'rome', 'roma', 'vienna', 'viyana', 'zurich',
  'geneva', 'cenevre', 'warsaw', 'varsova', 'stockholm', 'copenhagen', 'kopenhag', 'dublin', 'lisbon',
  'lizbon', 'new york', 'toronto', 'prague', 'prag', 'luxembourg city',
];
const YABANCI_DESEN = new RegExp(
  `(^|[^a-z0-9])(${YABANCI_YERLER.map((y) => y.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')).join('|')})([^a-z0-9]|$)`,
);

/** Şehir metni açıkça yabancı bir yer mi? */
export function yabanciYerMi(sehir) {
  if (!sehir) return false;
  return YABANCI_DESEN.test(katla(String(sehir)));
}

function ulkeKodu(deger) {
  const kod = String(deger ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(kod) ? kod : null;
}

function tekKonum(countryCode, city) {
  const ulke = ulkeKodu(countryCode);
  const sehir = String(city ?? '').trim();
  const turkIli = sehir ? ilBul(sehir) : null;
  const yabanci = sehir ? yabanciYerMi(sehir) : false;

  if (ulke === 'TR') return yabanci ? COGRAFYA.BELIRSIZ : COGRAFYA.TURKIYE;
  if (ulke) return turkIli && !yabanci ? COGRAFYA.BELIRSIZ : COGRAFYA.YURTDISI;
  if (turkIli && !yabanci) return COGRAFYA.TURKIYE;
  if (yabanci && !turkIli) return COGRAFYA.YURTDISI;
  return COGRAFYA.BELIRSIZ;
}

/**
 * @param {{ countryCode?: string|null, country_code?: string|null, city?: string|null,
 *           konumlar?: Array<{ countryCode?: string|null, city?: string|null }> }} ilan
 * @returns {'turkiye'|'yurtdisi'|'belirsiz'}
 */
export function ilanCografyasi(ilan) {
  const i = ilan && typeof ilan === 'object' ? ilan : {};
  const konumlar = Array.isArray(i.konumlar) && i.konumlar.length > 0
    ? i.konumlar
    : [{ countryCode: i.countryCode ?? i.country_code ?? null, city: i.city ?? null }];

  const sonuclar = konumlar.map((k) => tekKonum(k?.countryCode ?? k?.country_code ?? null, k?.city ?? null));
  if (sonuclar.includes(COGRAFYA.TURKIYE)) return COGRAFYA.TURKIYE;
  if (sonuclar.length > 0 && sonuclar.every((s) => s === COGRAFYA.YURTDISI)) return COGRAFYA.YURTDISI;
  return COGRAFYA.BELIRSIZ;
}

/** Görünüm → etiket; kartta ve raporda aynı metin. */
export const COGRAFYA_ETIKETI = Object.freeze({
  turkiye: 'Türkiye',
  yurtdisi: 'Yurtdışı',
  belirsiz: 'Konum belirtilmemiş',
});
