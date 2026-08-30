import { SIRKET_ROZET, SIRKET_VURGU_KOYU } from './renk';

/**
 * BAŞVURU DURUMU — TEK SÖZLÜK
 *
 * NEDEN TEK YERDE
 * ---------------
 * Aynı durumun adı üç yerde ayrı ayrı yazılıydı: aday kartında
 * (`DURUM_ETIKETI`), süzgeç listesinde (`DURUM_ADI`) ve çekmecede
 * kartınkinden okunuyordu. Üçü bugün aynı şeyi söylüyor ama birinin
 * değişmesi diğerlerini değiştirmiyordu — panelde eskiden "İncelemede"
 * ve "Ön İncele" diyen bir ekran zaten vardı ve iki ayrı sözlük tam da
 * böyle doğuyor.
 *
 * DEĞERLER UYDURMA DEĞİL
 * ----------------------
 * Anahtarlar `application_status` enum'unun tamamı: submitted,
 * under_review, technical_assessment, interview_scheduled,
 * offer_extended, rejected, withdrawn. Olmayan bir aşama eklenmiyor;
 * eklemek şirkete var olmayan bir akış vaat etmek olurdu. Kapsamın tam
 * kaldığını tests/basvuru-durumu.test.mjs bağlıyor.
 *
 * RENK SEMANTİĞİ MARKA RENGİNDEN AYRI
 * -----------------------------------
 * Marka yeşili "birincil ve seçili" demek, "başarılı" demek değil. Bu
 * yüzden teklif yeşili ayrı bir yeşil, reddedilen kırmızı, geri çekilen
 * nötr. Yalnızca "Yeni" marka rozetini kullanıyor: yeni başvuru panelin
 * ana işi, vurgusu da oradan geliyor.
 */
export type BasvuruDurumu =
  | 'submitted'
  | 'under_review'
  | 'technical_assessment'
  | 'interview_scheduled'
  | 'offer_extended'
  | 'rejected'
  | 'withdrawn';

/** Süzgeçte ve listelerde kullanılan sıra: akışın gerçek sırası. */
export const DURUM_SIRASI: BasvuruDurumu[] = [
  'submitted',
  'under_review',
  'technical_assessment',
  'interview_scheduled',
  'offer_extended',
  'rejected',
  'withdrawn',
];

type Rozet = { etiket: string; stil: React.CSSProperties };

export const DURUM_ROZETI: Record<BasvuruDurumu, Rozet> = {
  submitted: { etiket: 'Yeni', stil: { background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU } },
  under_review: { etiket: 'İnceleniyor', stil: { background: '#FEF3C7', color: '#92400E' } },
  technical_assessment: {
    etiket: 'Değerlendirme',
    stil: { background: '#FEF3C7', color: '#92400E' },
  },
  interview_scheduled: { etiket: 'Mülakat', stil: { background: '#DBEAFE', color: '#1E40AF' } },
  offer_extended: { etiket: 'Teklif', stil: { background: '#DCFCE7', color: '#166534' } },
  rejected: { etiket: 'Olumsuz', stil: { background: '#FEE2E2', color: '#991B1B' } },
  withdrawn: { etiket: 'Geri çekildi', stil: { background: '#F3F4F6', color: '#4B5563' } },
};

/**
 * Durumun kullanıcıya görünen adı.
 *
 * Tanınmayan bir değer geldiğinde ham enum YAZILMIYOR: çekmece
 * `?? kart.durum` ile geri düşüyordu, yani şemaya yeni bir aşama
 * eklendiği gün panelde "technical_assessment" yazacaktı.
 */
export function durumAdi(durum: string): string {
  return DURUM_ROZETI[durum as BasvuruDurumu]?.etiket ?? 'Durum bilinmiyor';
}

/** Rozet biçemi; tanınmayan değerde nötr. */
export function durumRozeti(durum: string): Rozet {
  return DURUM_ROZETI[durum as BasvuruDurumu] ?? {
    etiket: 'Durum bilinmiyor',
    stil: { background: '#F3F4F6', color: '#4B5563' },
  };
}
