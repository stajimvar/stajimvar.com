/**
 * YER TUTUCU İLAN AÇIKLAMASI (15 Ekim 2026)
 *
 * Toplama hattı (automation/promote.py) kaynak açıklama vermediğinde
 * `listings.description` alanına şu cümleyi yazıyordu:
 *
 *   "Bu ilanın ayrıntıları şirketin kendi kariyer sayfasında. Başvurmak
 *    için ilana git."
 *
 * Bu bir iş tanımı değil. JobPosting `description` alanı işin TAM tanımını
 * istiyor; canlıda 7 ilan bu cümleyle iş ilanı yapısal verisi taşıyordu
 * (ölçüldü). Burada yer tutucu "açıklama yok" sayılıyor ve JobPosting'in
 * mevcut eksik alan kuralı uygulanıyor. Sayfanın dizine açıklığı ayrı bir
 * karar: bu kural ona dokunmuyor.
 *
 * Eşdeğerler: büyük/küçük harf, HTML etiketi, boşluk ve noktalama farkı;
 * cümlelerden yalnız biri. Gerçek metnin İÇİNDE geçen cümle yer tutucu
 * sayılmıyor — yalnız açıklamanın TAMAMI bu cümlelerden ibaretse.
 */
const YER_TUTUCU_CUMLELER = [
  'bu ilanın ayrıntıları şirketin kendi kariyer sayfasında',
  'başvurmak için ilana git',
];

const sadelestir = (metin) =>
  String(metin ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .toLocaleLowerCase('tr')
    .replace(/\s+/g, ' ')
    .trim();

/** Açıklamanın tamamı yer tutucu mu? Boş metin yer tutucu değil (zaten "yok"). */
export function yerTutucuAciklamaMi(metin) {
  let kalan = sadelestir(metin);
  if (!kalan) return false;
  for (const c of YER_TUTUCU_CUMLELER) kalan = kalan.split(c).join(' ');
  return kalan.replace(/[\s.,;:!?…—–-]+/g, '') === '';
}

/** JobPosting ve özet için gerçek açıklama: yer tutucuysa boş. */
export function gercekAciklama(metin) {
  return yerTutucuAciklamaMi(metin) ? '' : metin;
}
