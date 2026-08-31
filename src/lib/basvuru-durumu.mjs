/**
 * BAŞVURU DURUMU — ÜRÜNÜN TEK SÖZLÜĞÜ
 *
 * NEDEN BURADA
 * ------------
 * Sözlük `src/sirket/basvuru-durumu.ts` içindeydi ve yalnızca işveren
 * paneli okuyordu. Öğrencinin "Başvurularım" ekranında ise BAŞKA bir
 * sözlük vardı; aynı başvuru iki tarafta iki farklı kelimeyle
 * görünüyordu:
 *
 *   enum                  şirket          öğrenci
 *   under_review          İnceleniyor     "İK İnceliyor"
 *   technical_assessment  Değerlendirme   "Teknik Case Aşamasında"
 *   interview_scheduled   Mülakat         "Mülakat Daveti Geldi"
 *   offer_extended        Teklif          "🎉 Staj Teklifi Geldi!"
 *   withdrawn             Geri çekildi    "İşlemde"   ← yanlış
 *
 * Sonuncusu yalnız tutarsız değil, YANLIŞTI: öğrencinin kendi geri
 * çektiği başvuru ona "İşlemde" diyordu.
 *
 * Artık terim tek: `DURUM_ADI`. Öğrenci tarafında cümleleşebiliyor
 * ("Başvurun inceleniyor") ama TERİM değişmiyor.
 *
 * Bu dosya saf: renk, React ve Supabase yok. Renkler işveren temasına
 * bağlı olduğu için ./sirket/basvuru-durumu.ts içinde kalıyor.
 */

/** `application_status` enum'unun tamamı, akışın gerçek sırasıyla. */
export const DURUM_SIRASI = [
  'submitted',
  'under_review',
  'technical_assessment',
  'interview_scheduled',
  'offer_extended',
  'rejected',
  'withdrawn',
];

/**
 * Ürünün tek terim sözlüğü. İki taraf da bunu kullanıyor.
 *
 * Uydurma aşama yok: anahtarlar enum'un tamamı ve yalnızca o.
 */
export const DURUM_ADI = {
  submitted: 'Yeni',
  under_review: 'İnceleniyor',
  technical_assessment: 'Değerlendirme',
  interview_scheduled: 'Mülakat',
  offer_extended: 'Teklif',
  rejected: 'Olumsuz',
  withdrawn: 'Geri çekildi',
};

/**
 * Öğrenciye gösterilen cümle.
 *
 * Terim aynı kalıyor, yalnız cümleleşiyor: şirket "Mülakat" derken
 * öğrenci "Mülakat aşamasında" görüyor. Farklı bir kelime değil, aynı
 * kelimenin cümlesi.
 */
export const OGRENCI_CUMLESI = {
  submitted: 'Başvurun alındı',
  under_review: 'Başvurun inceleniyor',
  technical_assessment: 'Değerlendirme aşamasında',
  interview_scheduled: 'Mülakat aşamasında',
  offer_extended: 'Teklif aldın',
  rejected: 'Olumsuz sonuçlandı',
  withdrawn: 'Başvurunu geri çektin',
};

/**
 * ŞİRKETİN GEÇEBİLECEĞİ DURUMLAR
 *
 * `withdrawn` YOK: geri çekmek adayın kararı ve şirket onun adına bu
 * kararı veremez. Aynı kural veritabanında da duruyor — işveren
 * güncelleme politikasının WITH CHECK ifadesi bu değeri reddediyor
 * (20260910010000_basvuru_durum_gecis_siniri). Buradaki liste yalnızca
 * arayüzün doğru seçenekleri göstermesi için.
 */
export const SIRKET_DURUMLARI = DURUM_SIRASI.filter((d) => d !== 'withdrawn');

/**
 * Akıştaki bir sonraki adım — arayüzdeki tek birincil düğme.
 *
 * Yedi düğme yerine bir sonraki adım: şirket adayı açtığında ne
 * yapacağını düşünmeden yapabilsin. Kapanmış durumlarda (teklif,
 * olumsuz, geri çekildi) bir sonraki adım yok.
 */
export function sonrakiDurum(durum) {
  const akis = {
    submitted: 'under_review',
    under_review: 'technical_assessment',
    technical_assessment: 'interview_scheduled',
    interview_scheduled: 'offer_extended',
  };
  return akis[durum] ?? null;
}

/** Süreç kapandı mı? Kapalıysa "bir sonraki adım" gösterilmiyor. */
export function durumKapandi(durum) {
  return durum === 'rejected' || durum === 'withdrawn' || durum === 'offer_extended';
}

/** Durumun kullanıcıya görünen adı. Tanınmayan değerde ham enum YAZILMIYOR. */
export function durumAdi(durum) {
  return DURUM_ADI[durum] ?? 'Durum bilinmiyor';
}

/** Öğrenciye gösterilen cümle. */
export function ogrenciDurumCumlesi(durum) {
  return OGRENCI_CUMLESI[durum] ?? 'Durum bilinmiyor';
}
