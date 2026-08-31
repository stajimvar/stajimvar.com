/**
 * CV dosyasının SAF kuralları: sınırlar, yol şeması, biçimlendirme.
 *
 * NEDEN AYRI DOSYA
 * ----------------
 * `cv.ts` Supabase istemcisine bağlı; test edilebilmesi için tarayıcı ya
 * da ağ gerekiyor. Buradaki kurallar hiçbir şeye bağlı değil ve
 * doğrudan sınanabiliyor — depodaki diğer saf mantık dosyalarıyla aynı
 * düzen (basvuru-yolu.mjs, burs-uygunluk.mjs, ilan-formu.mjs).
 *
 * Kuralların ikizini teste kopyalamak yerine test bu dosyayı içe
 * aktarıyor: kopya, asıl dosya değişince sessizce yeşil kalırdı.
 */

/** Kovadaki sınırların istemci tarafındaki karşılığı. */
export const CV_EN_FAZLA_BAYT = 5 * 1024 * 1024;
export const CV_TURU = 'application/pdf';

/**
 * İmzalı görüntüleme adresinin ömrü (saniye).
 *
 * Kısa tutuluyor: adres tarayıcı geçmişine ve paylaşılan bağlantılara
 * düşebiliyor. On dakika, bir PDF'i açıp okumaya yeterli.
 */
export const CV_IMZA_OMRU = 600;

/**
 * Dosya adı RASTGELE.
 *
 * Öğrencinin adı ya da e-postası dosya adına yazılmıyor: ad, imzalı
 * adresin içinde görünüyor ve orada kişisel veri taşımasının bir faydası
 * yok.
 */
export function yeniCvAdi(rastgele) {
  const uret =
    rastgele ??
    (() => {
      const c = globalThis.crypto;
      return c && c.randomUUID
        ? c.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    });
  return `${uret()}.pdf`;
}

/** Profildeki güncel CV: {user_id}/profil/<uuid>.pdf */
export function cvProfilYolu(userId, rastgele) {
  return `${userId}/profil/${yeniCvAdi(rastgele)}`;
}

/** Başvuru anının kopyası: {user_id}/basvurular/<uuid>.pdf */
export function cvBasvuruYolu(userId, rastgele) {
  return `${userId}/basvurular/${yeniCvAdi(rastgele)}`;
}

/**
 * Yüklemeden önceki istemci kontrolü.
 *
 * Bu bir güvenlik katmanı DEĞİL, bir nezaket katmanı: MIME beyanı
 * istemciden geliyor ve değiştirilebilir. Gerçek sınır kovanın kendisinde
 * (public=false, 5 MB, yalnız application/pdf). Buradaki kontrolün tek
 * işi, 20 MB'lık bir dosyayı yükleyip sonunda anlaşılmaz bir hata almaktan
 * kullanıcıyı kurtarmak.
 */
export function cvSorunu(dosya) {
  if (!dosya) return 'Dosya seçilmedi.';
  if (dosya.size === 0) return 'Dosya boş görünüyor.';
  if (dosya.size > CV_EN_FAZLA_BAYT) return 'CV en fazla 5 MB olabilir.';
  /*
    Bazı mobil dosya seçiciler `type` alanını boş bırakıyor; uzantı da
    kabul ediliyor. Yanlış dosya yine kovada eleniyor.
  */
  const pdfMi = dosya.type === CV_TURU || /\.pdf$/i.test(String(dosya.name || ''));
  if (!pdfMi) return 'Yalnızca PDF yükleyebilirsin.';
  return null;
}

/** "240 KB" / "1,8 MB" — okunur boyut. Bilinmiyorsa boş dize. */
export function baytMetni(bayt) {
  if (typeof bayt !== 'number' || bayt <= 0) return '';
  if (bayt < 1024 * 1024) return `${Math.round(bayt / 1024)} KB`;
  return `${(bayt / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Yolun son parçası. Kullanıcıya yol değil dosya adı gösteriliyor. */
export function cvDosyaAdi(yol) {
  if (!yol) return '';
  return String(yol).split('/').pop() ?? '';
}

/**
 * Bir CV yolu, o öğrencinin kendi klasöründe mi?
 *
 * Aynı kural veritabanında da var (applications_guard_cv_path): şirketin
 * okuma yetkisi başvuru satırındaki yoldan türediği için, başkasının
 * dosya yolunu kendi başvurusuna yazmak bir saldırı yüzeyi olurdu.
 * Buradaki kopya erken uyarı; asıl kapı tetikleyici.
 */
export function cvYoluOgrenciyemi(yol, userId) {
  if (!yol || !userId) return false;
  return String(yol).startsWith(`${userId}/`);
}
