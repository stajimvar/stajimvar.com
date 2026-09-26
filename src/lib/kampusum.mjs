import { calendarDay, opportunityStatus } from './opportunity-domain.mjs';
import { opportunityFit } from './firsat-degerlendirme.mjs';
import { firsatKategorisi } from './firsat-kategori.mjs';
import { profilYeterliMi } from './burs-kesif.mjs';

/**
 * KAMPÜSÜM — panelin saf kuralları.
 *
 * Bileşen oturum ve Supabase istiyor, testte jsdom yok; karar veren her
 * şey burada ve doğrudan sınanıyor. Yeni bir uygunluk kuralı YOK: burs
 * seçimi Burslar sayfasının "Sana Uygun" bölümüyle aynı iki fonksiyondan
 * geçiyor (`profilYeterliMi`, `opportunityFit(...).kesin`).
 */

/**
 * Öğün etiketi.
 *
 * 'gunluk' kaynağın öğün adı VERMEDİĞİ gün (MSGSÜ'nün aylık PDF'i tek
 * liste yayımlıyor). Oraya "Öğle" yazmak, kaynağın söylemediği bir şeyi
 * söylemek olurdu; "Günün menüsü" yalnız bilineni söylüyor. Tanınmayan
 * değer için etiket yok (null): uydurma bir öğün adı basılmıyor.
 *
 * @param {string} ogun
 * @returns {string|null}
 */
export function ogunEtiketi(ogun) {
  if (ogun === 'ogle') return 'Öğle';
  if (ogun === 'aksam') return 'Akşam';
  if (ogun === 'gunluk') return 'Günün menüsü';
  return null;
}

/** "Kaynak en son … okundu" notunun eşiği (gün). */
export const KAYNAK_ESKI_GUN = 3;

/**
 * Kaynağın son başarılı okuması eşikten eski mi?
 *
 * Gün farkı İstanbul takvimine göre (`calendarDay`), `bugun` sunucunun
 * verdiği gün: tarayıcının saat dilimi ya da saati yanlışsa not yanlış
 * günde çıkmasın. Son okuma hiç yoksa (null) bu fonksiyon false döner —
 * o durum "eski" değil "hiç okunmadı" ve bileşen onu ayrı cümleyle yazıyor.
 *
 * @param {string|null} sonBasariAni
 * @param {string} bugun YYYY-MM-DD
 */
export function kaynakEskiMi(sonBasariAni, bugun, esikGun = KAYNAK_ESKI_GUN) {
  if (!sonBasariAni) return false;
  const son = calendarDay(sonBasariAni);
  const gun = calendarDay(bugun);
  if (son == null || gun == null) return false;
  return (gun - son) / 86400000 > esikGun;
}

/** Menü bu kadar gündür yoksa yemek bölümü tek satıra iniyor. */
export const MENU_YOK_GUN = 7;

/**
 * Son menü eşikten eski mi (ya da hiç menü yok mu)?
 *
 * YAZ DÖNEMİ (26 Eylül 2026): yemekhane tatilde menü yayımlamıyor ve
 * panel haftalarca her gün "Bugün için yayımlanmış menü yok." diyordu.
 * Kaynak OKUNUYORSA (bileşen `sonBasariAni` ile kapıyı tutuyor) ve son
 * menü 7 günden eskiyse bölüm tek satır. Hafta sonu ve kısa tatil
 * (≤ 7 gün) eski cümlede kalıyor.
 *
 * @param {string|null} sonMenuTarihi YYYY-MM-DD, bugüne kadarki son menü
 * @param {string} bugun YYYY-MM-DD (sunucunun İstanbul günü)
 */
export function menuUzunSuredirYok(sonMenuTarihi, bugun, esikGun = MENU_YOK_GUN) {
  const gun = calendarDay(bugun);
  if (gun == null) return false;
  if (!sonMenuTarihi) return true;
  const son = calendarDay(sonMenuTarihi);
  if (son == null) return false;
  return (gun - son) / 86400000 > esikGun;
}

/** Panelde gösterilen en çok burs. */
export const KAMPUS_BURS_SINIRI = 3;

/**
 * Bakan öğrenciye uygun, başvurusu AÇIK burslar — en yakın son tarih önce.
 *
 *   - yalnız burs türleri (kategori haritası: `firsatKategorisi`)
 *   - `status` published
 *   - son tarih VAR ve `opportunityStatus` 'acik': tarihi bilinmeyen burs
 *     "açık" diye doğrulanamıyor; henüz açılmamış olan ('yakinda') da açık
 *     değil
 *   - uygunluk Burslar sayfasındaki "Sana Uygun" ile aynı: profilde sınıf
 *     yoksa kişiselleştirme yok, varsa üç boyut da doğrulanmış ve UYUYOR
 *
 * @param {object[]} firsatlar
 * @param {object|null} ogrenci StudentProfile (department, gradeLevel, city)
 * @param {Date} [simdi]
 */
export function kampusBurslari(firsatlar = [], ogrenci, simdi = new Date(), sinir = KAMPUS_BURS_SINIRI) {
  if (!profilYeterliMi(ogrenci)) return [];
  return firsatlar
    .filter(
      (f) =>
        f &&
        f.status === 'published' &&
        firsatKategorisi(f.opportunityType) === 'burslar' &&
        Boolean(f.applicationDeadline) &&
        opportunityStatus(f, simdi) === 'acik',
    )
    .filter((f) => {
      const uyum = opportunityFit(f, ogrenci);
      return uyum.durum === 'uygun_olabilir' && uyum.kesin;
    })
    .sort((a, b) => {
      const fark = (calendarDay(a.applicationDeadline) ?? 0) - (calendarDay(b.applicationDeadline) ?? 0);
      return fark !== 0 ? fark : String(a.title).localeCompare(String(b.title), 'tr');
    })
    .slice(0, sinir);
}

/**
 * "Üniversiteni ekle" adresi. `/cv` düzenleme kipinin okul bölümü; kapı
 * `StudentProfileView`de, adresteki `#universite` okununca açılıyor.
 * Gerçek adres olduğu için orta tuş ve "yeni sekmede aç" da aynı yere
 * gidiyor.
 */
export const UNIVERSITE_EKLE_YOLU = '/cv#universite';

/**
 * Dış bağlantı yalnız http(s) ise çiziliyor.
 *
 * Adresler zamanlanmış bir işin resmî sitelerden okuduğu metin; bir
 * `javascript:` ya da bozuk değer bağlantı olarak basılmasın. Geçersizse
 * null ve bağlantı hiç çizilmiyor.
 *
 * @param {string|null|undefined} adres
 * @returns {string|null}
 */
export function guvenliDisAdres(adres) {
  if (typeof adres !== 'string') return null;
  const temiz = adres.trim();
  return /^https?:\/\/[^\s]+$/i.test(temiz) ? temiz : null;
}
