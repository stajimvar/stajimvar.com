import { okulKisaltmasi } from './ad-kisaltma.mjs';

/**
 * OKUL ROZETİ
 *
 * Okulunu girmiş öğrencinin profilinde, okul adının yanında duran küçük
 * bir rozet. İki işi var: kimliği görünür kılmak ve okulu GİRMEMİŞ
 * öğrenciye o boşluğu hissettirmek.
 *
 * NEDEN LOGO DEĞİL — HENÜZ
 * ------------------------
 * Üniversite logoları tescilli marka. Bu depoda bu konuda yerleşik bir
 * ilke var: şirket görsellerinde 29 görsel eklenirken HAKKI BELİRSİZ
 * olanlar dışarıda bırakıldı (#119). Aynı çizgiyi üniversitede de
 * tutuyoruz — logoları toplayıp basmak, hakkı belirsiz görseli yayımlamak
 * olurdu.
 *
 * Bileşen buna rağmen LOGOYA HAZIR: `logoAdresi` verildiğinde onu
 * çiziyor, yüklenemezse monograma düşüyor. Yani hakkı net bir kaynak
 * bulunduğunda (ya da üniversite kendi izin verdiğinde) tek bir alan
 * doldurmak yetiyor; bileşeni yeniden yazmak gerekmiyor.
 *
 * Bu desen şirket tarafındaki `CompanyLogo` ile aynı: logo varsa görsel,
 * yoksa baş harfler ve addan türetilen sabit bir renk.
 *
 * KAZANILAN ROZETLERLE KARIŞMASIN
 * -------------------------------
 * Profilde ayrıca `earnedBadges` var — onlar öğrencinin KAZANDIĞI
 * şeyler. Bu ise bir kimlik işareti, bir başarı değil. Bu yüzden
 * biçimi farklı: kare-yuvarlak bir kutu, madalya değil.
 */

export const PALET = [
  'bg-blue-100 text-blue-800',
  'bg-emerald-100 text-emerald-800',
  'bg-violet-100 text-violet-800',
  'bg-amber-100 text-amber-900',
  'bg-rose-100 text-rose-800',
  'bg-cyan-100 text-cyan-800',
];

/** Aynı okul her yerde aynı rengi alsın; rastgele değil, addan türesin. */
export function paletSirasi(ad) {
  let toplam = 0;
  for (const ch of ad) toplam = (toplam + ch.codePointAt(0)) % 997;
  return toplam % PALET.length;
}

/**
 * Rozette yazacak kısa ad.
 *
 * `okulKisaltmasi` uzun adları baş harflere indiriyor
 * ("Mimar Sinan Güzel Sanatlar Üniversitesi" → "MSGSÜ") ama kısa adları
 * olduğu gibi bırakıyor. Rozet dar bir kutu: kısa da olsa en fazla dört
 * harf alıyor, gerisi taşardı.
 */
export function rozetYazisi(okul) {
  const kisa = okulKisaltmasi(okul);
  if (!kisa) return '';
  if (kisa.length <= 5) return kisa;

  /* Kısaltma üretilmemişse (kısa ad) baş harfleri kendimiz çıkarıyoruz. */
  const harfler = kisa
    .split(/\s+/)
    .filter(Boolean)
    .map((k) => k[0])
    .join('')
    .toLocaleUpperCase('tr-TR');
  return harfler.slice(0, 5) || kisa.slice(0, 4).toLocaleUpperCase('tr-TR');
}
