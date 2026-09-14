/**
 * KİŞİSEL TAKİP — SAF KARARLAR
 *
 * Ekrandan ayrı bir dosyada olmasının sebebi test: bu iki kural zamanla
 * ilgili ve tek tek sınanabilir olmalı. Bileşenin içinde kalsalardı
 * doğrulamak için React ağacı kurmak gerekirdi.
 */

/** Başvurudan bu yana geçen tam gün. */
export function gecenGun(appliedAt, simdi = Date.now()) {
  const t = new Date(appliedAt).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.floor((simdi - t) / 86_400_000);
}

/** Hatırlatmanın çıkmadığı durumlar: iş bitmiş, hatırlatma gürültü. */
const KAPANMIS = new Set(['teklif', 'olumsuz', 'vazgectim']);

/**
 * YEDİ GÜNLÜK HATIRLATMA — HÜKÜM DEĞİL, ÖNERİ
 *
 * "Şirket cevap vermedi" diyemeyiz: cevabın şirketin kendi sistemine
 * düşüp düşmediğini bilmiyoruz, harici başvuruda hiç bilmiyoruz.
 * Söylenebilen tek şey, öğrencinin takip etmek isteyebileceği.
 */
export function hatirlatmaGosterilsinMi(takip, simdi = Date.now()) {
  if (KAPANMIS.has(takip?.personalStatus)) return false;
  return gecenGun(takip?.appliedAt, simdi) >= 7;
}
