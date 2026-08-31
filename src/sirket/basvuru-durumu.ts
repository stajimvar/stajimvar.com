import { SIRKET_ROZET, SIRKET_VURGU_KOYU } from './renk';
import { DURUM_ADI } from '../lib/basvuru-durumu.mjs';

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
  | 'offer_accepted'
  | 'offer_declined'
  | 'rejected'
  | 'withdrawn';

/*
  TERİMLER ARTIK ÜRÜNÜN ORTAK SÖZLÜĞÜNDEN

  Sözlük burada duruyordu ve yalnızca işveren paneli okuyordu; öğrenci
  tarafında ayrı bir sözlük vardı ve aynı başvuru iki tarafta iki farklı
  kelimeyle görünüyordu. Terimler ../lib/basvuru-durumu.mjs içine
  taşındı; burada YALNIZCA işveren temasına bağlı renkler kaldı.
*/
export {
  DURUM_SIRASI,
  SIRKET_DURUMLARI,
  durumAdi,
  sirketDurumCumlesi,
  sonrakiDurum,
  durumKapandi,
  teklifBekliyor,
  iletisimAcik,
  ogrencininKarari,
  surecKapandi,
} from '../lib/basvuru-durumu.mjs';

type Rozet = { etiket: string; stil: React.CSSProperties };

export const DURUM_ROZETI: Record<BasvuruDurumu, Rozet> = {
  submitted: { etiket: DURUM_ADI.submitted, stil: { background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU } },
  under_review: { etiket: DURUM_ADI.under_review, stil: { background: '#FEF3C7', color: '#92400E' } },
  technical_assessment: {
    etiket: DURUM_ADI.technical_assessment,
    stil: { background: '#FEF3C7', color: '#92400E' },
  },
  interview_scheduled: {
    etiket: DURUM_ADI.interview_scheduled,
    stil: { background: '#DBEAFE', color: '#1E40AF' },
  },
  /* Teklif verildi ama HENÜZ KABUL EDİLMEDİ: dolu yeşil değil, çerçeveli. */
  offer_extended: {
    etiket: DURUM_ADI.offer_extended,
    stil: { background: '#F0FDF4', color: '#166534', boxShadow: 'inset 0 0 0 1px #86EFAC' },
  },
  /* Sürecin tek gerçek başarısı: dolu yeşil yalnızca burada. */
  offer_accepted: {
    etiket: DURUM_ADI.offer_accepted,
    stil: { background: '#DCFCE7', color: '#166534' },
  },
  /*
    Öğrencinin reddi ŞİRKETİN olumsuz kararıyla aynı renkte değil: biri
    adayın kararı, diğeri şirketin. Aynı kırmızı ikisini karıştırırdı.
  */
  offer_declined: {
    etiket: DURUM_ADI.offer_declined,
    stil: { background: '#F3F4F6', color: '#4B5563' },
  },
  rejected: { etiket: DURUM_ADI.rejected, stil: { background: '#FEE2E2', color: '#991B1B' } },
  withdrawn: { etiket: DURUM_ADI.withdrawn, stil: { background: '#F3F4F6', color: '#4B5563' } },
};

/** Rozet biçemi; tanınmayan değerde nötr. */
export function durumRozeti(durum: string): Rozet {
  return DURUM_ROZETI[durum as BasvuruDurumu] ?? {
    etiket: 'Durum bilinmiyor',
    stil: { background: '#F3F4F6', color: '#4B5563' },
  };
}
