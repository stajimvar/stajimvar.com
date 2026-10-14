
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
/*
  ŞEHİR ALANINDA YALNIZ ÜLKE ADI (14 Ekim 2026)

  Ölçüldü: Insider One ilanının şehir alanında "Turkey" yazıyor ve
  normalize `il` alanı boş (ilçe de yok). Kart bunu olduğu gibi
  "Turkey · Ofisten" diye basıyordu: İngilizce ve şehir gibi duran bir
  ülke adı. Ülke adı şehir sayılmıyor; Türkçe ülke adı gösteriliyor
  ("Türkiye") — doğru ama kaba bir konum, uydurma şehir yok.
  Yapısal verideki karşılığı src/lib/seo/ilan-sayfasi.mjs SEHIR_OLMAYAN.
*/
const ULKE_ADLARI: Record<string, string> = {
  turkey: 'Türkiye',
  turkiye: 'Türkiye',
  germany: 'Almanya',
  deutschland: 'Almanya',
  almanya: 'Almanya',
  france: 'Fransa',
  fransa: 'Fransa',
  'united kingdom': 'Birleşik Krallık',
  uk: 'Birleşik Krallık',
  england: 'Birleşik Krallık',
};

export function konumEtiketi(ham: string | null | undefined): string {
  if (!ham) return 'Konum belirtilmemiş';

  const temiz = String(ham).replace(ONEK, '').trim();
  const ulke = ULKE_ADLARI[katla(temiz)];
  if (ulke) return ulke;
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

/**
 * İlan kartının konum etiketi: önce doğrulanmış normalize alanlar.
 *
 * `il` ve `ilce` veritabanında ham şehir metninden türetiliyor, yalnız
 * Türkiye için ve tahminsiz (göç 20261023010000; il kısıtlı listeden).
 * Varsa onlar esas: "Turkey - Istanbul" → "İstanbul". Ham metin aynı ile
 * işaret ediyor ve daha ayrıntılıysa ("Zincirlikuyu, Istanbul") ayrıntı
 * korunuyor. `il` yoksa ham metin `konumEtiketi`nden geçiyor (yurt dışı
 * şehirler, ülke adı → Türkçe ülke adı).
 */
export function ilanKonumEtiketi(ilan: {
  il?: string | null;
  ilce?: string | null;
  city?: string | null;
}): string {
  const il = ilan.il?.trim();
  if (il) {
    const ilce = ilan.ilce?.trim();
    if (ilce) return `${ilce}, ${il}`;
    const ham = String(ilan.city ?? '').replace(ONEK, '').trim();
    return ham && ilBul(ham) === il ? konumEtiketi(ham) : il;
  }
  return konumEtiketi(ilan.city);
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
