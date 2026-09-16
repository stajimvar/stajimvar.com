
/**
 * İlan konum metnini ile çevirir.
 *
 * NEDEN GEREKLİ: ilanları şirketlerin kendi kariyer sistemlerinden topluyoruz
 * ve oradaki konum alanı serbest metin. Canlıdaki 11 ilan şu değerleri
 * üretiyor:
 *
 *   Istanbul · Turkey - Istanbul · Zincirlikuyu, Istanbul · Üsküdar · Şişli
 *   · Çorlu · İzmir
 *
 * Bunları olduğu gibi bir şehir menüsüne koyarsak kullanıcı 3 il yerine 7
 * ayrı seçenek görür ve "İstanbul" seçtiğinde Şişli'deki ilanı kaçırır.
 * Burası o metni ile indirger; bulamazsa uydurmaz, null döner.
 *
 * Kapsam bilinçli olarak dar: 970 ilçenin tamamı değil, staj ilanlarında
 * gerçekten geçen büyük şehir ilçeleri ve sanayi bölgeleri. Tanınmayan bir
 * değer geldiğinde ilan kaybolmaz, "Diğer" altında listelenir.
 */

import { ONEK, ilBul, katla } from './il-bul.mjs';

export { ilBul };

/**
 * Kartta gösterilecek konum etiketi.
 *
 * İl bilinmiyorsa ham metin olduğu gibi kalır; bildiğimizden fazlasını
 * yazmıyoruz. İl biliniyor ama metin daha ayrıntılıysa ikisi birlikte
 * gösteriliyor: "Şişli, İstanbul".
 */
export function konumEtiketi(ham: string | null | undefined): string {
  if (!ham) return 'Konum belirtilmemiş';

  const temiz = String(ham).replace(ONEK, '').trim();
  const il = ilBul(temiz);
  if (!il) return temiz;

  /* Metin zaten ilin kendisiyse tekrar etme. */
  if (katla(temiz) === katla(il)) return il;

  /* "Zincirlikuyu, Istanbul" → "Zincirlikuyu, İstanbul" */
  const ilceler = temiz
    .split(/[,/|]+/)
    .map((p) => p.trim())
    .filter((p) => p && katla(p) !== katla(il));

  return ilceler.length > 0 ? `${ilceler.join(', ')}, ${il}` : il;
}

/*
  ÇALIŞMA BİÇİMİ TÜRKÇE GÖRÜNSÜN

  Veritabanındaki değerler İngilizce ('On-site', 'Remote', 'Hybrid'):
  şema öyle kurulmuş ve değiştirmek veri göçü gerektiriyor. Ama karta
  "İstanbul (On-site)" diye basmak, sitenin geri kalanı Türkçeyken tek
  başına yabancı duruyordu. Çeviri görüntüde yapılıyor, veride değil.

  Bilinmeyen bir değer gelirse olduğu gibi gösteriliyor — sessizce boş
  bırakmak, yanlış çevirmekten de kötü.
*/
const CALISMA_BICIMLERI: Record<string, string> = {
  'on-site': 'Ofisten',
  onsite: 'Ofisten',
  remote: 'Uzaktan',
  hybrid: 'Hibrit',
};

export function calismaEtiketi(ham: string | null | undefined): string | null {
  if (!ham) return null;
  const anahtar = String(ham).trim().toLowerCase();
  return CALISMA_BICIMLERI[anahtar] ?? String(ham).trim();
}
