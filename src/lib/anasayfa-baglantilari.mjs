import { duzMetin } from './seo/metin.mjs';

/**
 * ANA SAYFA: FIRSAT ŞERİDİ VE BÖLÜM BAĞLANTILARI (14 Ekim 2026)
 *
 * Ön render (scripts/onrender.mjs) ve uygulama (OpportunitiesHomeSection,
 * AnaSayfaBolumleri) bu modülü ortak kullanıyor: JavaScript'siz ilk HTML ile
 * JavaScript sonrası ana sayfa aynı bağlantıları taşıyor.
 */

/* ---------------------------------------------------------- fırsat şeridi */

/**
 * Fırsat sayfası "ince" mi — ön render'ın noindex koşulunun AYNISI.
 *
 * scripts/onrender.mjs: `const firsatInce = !duzMetin(f.description) &&
 * !duzMetin(f.eligibility);` → `dizinDisi: firsatInce`. Kural orada
 * değiştirilmedi; burada yalnız okunuyor. tests/anasayfa-baglantilari
 * iki ifadenin aynı kaldığını denetliyor.
 */
export function firsatInceMi(f) {
  return !duzMetin(f?.description) && !duzMetin(f?.eligibility);
}

/** Şeritte en çok kaç fırsat. */
export const SERIT_ADEDI = 8;

/**
 * Ana sayfa şeridinin fırsatları.
 *
 * ÖLÇÜLEN SORUN: şerit "yayında, süresi geçmemiş, son başvuruya göre ilk 8"
 * seçiyordu ve 8 bağlantının 8'i de noindex sayfaya gidiyordu (açıklaması
 * ve koşulları boş, kalıp metinli fırsatlar). Ana sayfanın en görünür
 * bağlantıları dizin dışı sayfalara akıyordu.
 *
 * Artık yalnız DİZİNE AÇIK fırsatlar: yayında, adresi olan, süresi
 * geçmemiş (Türkiye takvim günü), ince olmayan. Sıra aynı: son başvurusu en
 * yakın önce, tarihsizler sonda; eşitlikte adres (slug). Eşitlik kuralı
 * ölçülerek eklendi: dizine açık 11 fırsatın 11'i tarihsizdi ve ilk HTML
 * derleme sorgusunun, uygulama veritabanının belirsiz NULL sırasını
 * kullanıyordu — iki taraf 11'in farklı 8'ini gösteriyordu. Yeterli fırsat yoksa şerit kısalıyor ya da
 * hiç çizilmiyor — noindex sayfayla doldurulmuyor, kural gevşetilmiyor.
 *
 * @param {Array<object>} firsatlar  `slug, status, application_deadline, description, eligibility` (snake_case)
 *   ya da uygulamanın `Opportunity` biçimi (`applicationDeadline`)
 * @param {string} bugun  Türkiye takvim günü, YYYY-AA-GG
 */
export function seritFirsatlari(firsatlar, bugun, adet = SERIT_ADEDI) {
  const gunu = (f) => String(f?.application_deadline ?? f?.applicationDeadline ?? '').slice(0, 10);
  const sira = (f) => (/^\d{4}-\d{2}-\d{2}$/.test(gunu(f)) ? gunu(f) : '9999-12-31');
  return (Array.isArray(firsatlar) ? firsatlar : [])
    .filter((f) => f && f.slug && (f.status === undefined || f.status === 'published'))
    .filter((f) => !/^\d{4}-\d{2}-\d{2}$/.test(gunu(f)) || gunu(f) >= bugun)
    .filter((f) => !firsatInceMi(f))
    .sort((a, b) => sira(a).localeCompare(sira(b)) || String(a.slug).localeCompare(String(b.slug)))
    .slice(0, Math.max(0, adet));
}

/* -------------------------------------------------------- bölüm bağlantıları */

/**
 * Ana sayfadan bölüm sayfalarına giden bağlantılar.
 *
 * Ana sayfa yalnız /bolumler'e bağlanıyordu; "yazılım stajı", "mühendislik
 * stajı" aramalarının karşılığı olan bölüm sayfalarına JavaScript'siz bir
 * yol yoktu. Seçim: staj aramasında en sık geçen ve ilan alanı olan
 * bölümler. Adres yeni değil — hepsi var olan, dizine açık /bolum/ sayfası
 * (testte dist'e karşı denetleniyor).
 */
export const ANASAYFA_BOLUMLERI = [
  ['yazilim-muhendisligi', 'Yazılım Mühendisliği'],
  ['bilgisayar-muhendisligi', 'Bilgisayar Mühendisliği'],
  ['bilgisayar-programciligi', 'Bilgisayar Programcılığı'],
  ['elektrik-elektronik-muhendisligi', 'Elektrik-Elektronik Mühendisliği'],
  ['makine-muhendisligi', 'Makine Mühendisliği'],
  ['endustri-muhendisligi', 'Endüstri Mühendisliği'],
  ['insaat-muhendisligi', 'İnşaat Mühendisliği'],
  ['isletme', 'İşletme'],
  ['iktisat', 'İktisat'],
  ['grafik-tasarim', 'Grafik Tasarım'],
];
