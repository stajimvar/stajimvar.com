/**
 * BAŞVURU BİLDİRİMİNİN GÖRSELİ — şirket logosu ya da aday fotoğrafı
 *
 * Başvuru bildirimleri `notifications.application_id` ile başvuruya bağlı
 * (20260913010000). Panel açılınca bu kimliklerle başvuru, ilan ve şirket
 * satırı okunuyor (`lib/bildirim.ts` → `bildirimBasvurulariniGetir`) ve
 * bu modül hangi görselin gösterileceğine karar veriyor.
 *
 * YENİ YETKİ YOK
 * --------------
 * Okuma, başvuru ekranlarının kullandığı RLS'ten geçiyor:
 *   · öğrenci: "ogrenci kendi basvurulari", "ogrenci basvurdugu ilani gorur",
 *     "sirket profilleri herkese acik"
 *   · işveren: "dogrulanmis sirket basvurulari gorur" — doğrulanmamış
 *     şirkete satır dönmüyor; bildirim metni de orada "Bir aday" diyor
 *     (20261117010000). Satır yoksa görsel yok, tür simgesi kalıyor.
 *
 * ADAY FOTOĞRAFI — aday kartıyla aynı kural (`lib/aday-kart.mjs`)
 * ---------------------------------------------------------------
 * Şirket paneli ad ve fotoğrafı yalnız başvuru anının kopyasından ve
 * yalnız `contact_share_consent_at` doluysa gösteriyor. Burada da öyle;
 * ek olarak:
 *   · yalnız `internal` başvuru (şirkete iletilen tek yol)
 *   · şirket doğrulanmış olmalı (kimlik kapısı)
 *   · adres yalnız kendi depomuzun herkese açık `avatars` kovasından:
 *     kopya istemciden yazılıyor ve öğrenci oraya herhangi bir adres
 *     koyabilir. Başka bir sunucudaki görsel, şirket çalışanının
 *     tarayıcısını o sunucuya istek atmaya zorlardı (iz sürme pikseli).
 *
 * ŞİRKET LOGOSU
 * -------------
 * `companies.logo_url` herkese açık; kökten göreli yol (/isveren-logolari/…)
 * ya da HTTPS adres kabul ediliyor. Başka her şeyde `null` ve tür simgesi.
 */

/**
 * Öğrenciye giden başvuru bildirimleri: durum bildirimleri
 * (`bildir_ogrenciye`) ve şirketin başvuruyu ilk açışı
 * (`basvuru_goruntulendi`, 20261202010000 — `basvuru_goruntulendi_isaretle`).
 *
 * Görüntülenme bildirimi de `application_id` taşıyor; listede olmadığı
 * için şirket logosu yerine genel belge simgesi çiziliyordu (kullanıcı
 * bildirdi, 7 Ekim 2026).
 */
export const OGRENCI_BASVURU_TURLERI = new Set([
  'inceleniyor',
  'degerlendirme',
  'gorusme_daveti',
  'gorusme_guncellendi',
  'teklif',
  'olumsuz',
  'basvuru_goruntulendi',
]);

/** Adayın fotoğrafının gösterildiği işveren bildirimi. */
export const ADAY_FOTOGRAFLI_TURLER = new Set(['yeni_basvuru']);

const metin = (x) => {
  const t = typeof x === 'string' ? x.trim() : '';
  return t || null;
};

/** Şirket logosu: kökten göreli yol ya da HTTPS. */
export function guvenliLogoAdresi(ham) {
  const t = metin(ham);
  if (!t) return null;
  if (t.startsWith('/') && !t.startsWith('//') && !t.includes('\\')) return t;
  try {
    const u = new URL(t);
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

/**
 * Aday fotoğrafı yalnız bizim depomuzun herkese açık avatar kovasından.
 *
 * @param {unknown} ham         kopyadaki `fotoUrl`
 * @param {string | null | undefined} depoAdresi  VITE_SUPABASE_URL
 */
export function guvenliAdayFotografi(ham, depoAdresi) {
  const t = metin(ham);
  if (!t || !depoAdresi) return null;
  let u;
  let kok;
  try {
    u = new URL(t);
    kok = new URL(depoAdresi);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.origin !== kok.origin) return null;
  if (!u.pathname.startsWith('/storage/v1/object/public/avatars/')) return null;
  if (u.pathname.includes('..')) return null;
  return u.href;
}

/**
 * @typedef {{ tip: 'sirket', sirketAdi: string | null, logo: string | null, ilanAdi: string | null }} SirketGorseli
 * @typedef {{ tip: 'aday', adayAdi: string | null, foto: string | null, ilanAdi: string | null }} AdayGorseli
 */

/**
 * Başvuru satırından bildirimin görseli. Uygun değilse `null`.
 *
 * @param {string} tur  bildirimin türü
 * @param {any} satir   `bildirimBasvurulariniGetir` satırı (RLS'ten geçmiş)
 * @param {string | null | undefined} depoAdresi
 * @returns {SirketGorseli | AdayGorseli | null}
 */
export function basvuruGorseli(tur, satir, depoAdresi) {
  if (!satir) return null;
  const ilan = satir.ilan ?? null;
  const sirket = ilan?.sirket ?? null;
  const ilanAdi = metin(ilan?.baslik);

  if (OGRENCI_BASVURU_TURLERI.has(tur)) {
    if (!sirket) return null;
    return {
      tip: 'sirket',
      sirketAdi: metin(sirket.ad),
      logo: guvenliLogoAdresi(sirket.logo),
      ilanAdi,
    };
  }

  if (ADAY_FOTOGRAFLI_TURLER.has(tur)) {
    const paylasildi =
      satir.yontem === 'internal' &&
      Boolean(satir.rizaTarihi) &&
      sirket?.dogrulanmis === true;
    if (!paylasildi) return null;
    return {
      tip: 'aday',
      adayAdi: metin(satir.adayAdi),
      foto: guvenliAdayFotografi(satir.adayFotografi, depoAdresi),
      ilanAdi,
    };
  }

  return null;
}
