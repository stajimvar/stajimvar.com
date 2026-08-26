/**
 * Kişi adının Türkçe kurallarına göre yazılışı.
 *
 * NEDEN GEREKLİ
 * -------------
 * Ad kayıt sırasında nasıl yazıldıysa öyle duruyordu: "Mustafa oğulcan
 * doğan". Profilde, CV'de ve işverene giden başvuruda hep bu görünüyordu.
 * Ad, öğrencinin işverene gösterdiği ilk şey; küçük harfle başlayan bir
 * soyadı, sitenin özensiz olduğunu düşündürüyor.
 *
 * Türkçe büyütme şart: 'i' harfinin büyüğü 'İ', 'ı' harfinin büyüğü 'I'.
 * Varsayılan locale ile "ilker" → "Ilker" olurdu.
 *
 * NEYE DOKUNULMUYOR
 * -----------------
 * Yalnızca TAMAMI küçük ya da TAMAMI büyük yazılmış kelimeler
 * düzeltiliyor. İçinde bilerek büyük harf olan kelimeler ("McDonald",
 * "AyŞe" gibi kişinin kendi tercihi olabilecek yazımlar) olduğu gibi
 * bırakılıyor — adın nasıl yazılacağına karar vermek sahibinin işi.
 *
 * Bu bir GÖRÜNÜM biçimlendirmesi: kayıtlı değeri değiştirmiyor. Kayıtlı
 * değerin kendisi, düzenleme ekranındaki tek dokunuşluk öneri kabul
 * edilince düzeliyor.
 */
export function adYazimi(ad: string): string {
  return ad
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((kelime) => {
      const kucuk = kelime.toLocaleLowerCase('tr-TR');
      const buyuk = kelime.toLocaleUpperCase('tr-TR');
      /* Bilerek karışık yazılmışsa (ne tamamı küçük ne tamamı büyük) dokunma. */
      if (kelime !== kucuk && kelime !== buyuk) return kelime;
      return kucuk.charAt(0).toLocaleUpperCase('tr-TR') + kucuk.slice(1);
    })
    .join(' ');
}

/**
 * Uzun üniversite adını kısaltır: "Mimar Sinan Güzel Sanatlar Üniversitesi" → MSGSÜ.
 *
 * NEDEN KISALTMA
 * --------------
 * Profil satırında okul ve bölüm tek satıra sığmalı. Tam ad yazılınca
 * satır kesiliyor ("Mimar Sinan Güzel Sanatlar Ünive…") ve bölüm adı hiç
 * görünmüyor; oysa satırın asıl bilgisi ikisi birlikte.
 *
 * KURAL DAR TUTULDU
 * -----------------
 * Kısaltma yalnızca ÜÇ ya da daha fazla kelimeli ve yirmi karakterden
 * uzun adlarda yapılıyor. İki kelimeli adlarda ("Boğaziçi Üniversitesi")
 * baş harfler kimsenin kullanmadığı bir kısaltma üretir ("BÜ" değil,
 * herkes "Boğaziçi" der) — o yüzden dokunulmuyor.
 *
 * Baş harfler Türkçe büyütmeyle alınıyor: i → İ.
 */
export function okulKisaltmasi(ad?: string | null): string {
  const temiz = (ad ?? '').trim();
  if (!temiz) return '';

  const kelimeler = temiz.split(/\s+/).filter(Boolean);
  if (kelimeler.length < 3 || temiz.length <= 20) return temiz;

  return kelimeler.map((k) => k[0].toLocaleUpperCase('tr-TR')).join('');
}
