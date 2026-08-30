/**
 * İşveren panelinin renk belirteçleri.
 *
 * NEDEN AYRI BİR ALT TEMA
 * -----------------------
 * Öğrenci tarafı mavi-beyaz. İşveren tarafı aynı markanın alt ürünü ama
 * farklı bir iş yapıyor: öğrenci keşfediyor, işveren yönetiyor. Renk
 * ayrımı bu farkı taşıyor — logo, tipografi ve yerleşim ortak kalıyor.
 *
 * Panel önce koyu (#0E1116) kuruldu, sonra turuncu-beyaz oldu. Turuncu
 * enerjikti ama İK'nın aday verisi ve doğrulama gördüğü bir ekranda
 * "sakin ve güvenilir" hissi vermiyordu. Şimdi koyu doğal yeşil.
 *
 * YEŞİL VURGU, ZEMİN DEĞİL
 * ------------------------
 * Zemin #F6F9F7 — beyaza çok yakın, yeşile yalnızca fısıldıyor
 * (beyazla arasındaki oran 1.06). Kartlar beyaz kalıyor. Yeşil
 * düğmede, aktif sekmede, seçili durumda ve rozette görünüyor; yüzey
 * boyamak "her yeri pastel yeşil" görünümü üretirdi.
 *
 * Parlak yeşil bilerek yok: #1F5A45 doygunluğu düşük, koyu ve doğal.
 * Emerald-500 tonu, gradyan ve neon kullanılmıyor.
 *
 * KONTRAST (ölçüldü)
 * ------------------
 * Birincil düğme: #FFFFFF yazı / #1F5A45 zemin = 8.06:1
 * Hover:          #FFFFFF yazı / #174536 zemin = 10.82:1
 * Vurgu metni:    #1F5A45 / beyaz = 8.06:1, / rozet #E6F0EA = 6.91:1
 * Ana metin:      #16211C / zemin = 15.62:1
 * İkincil metin:  #55655C / zemin = 5.82:1
 * Vurgu (ikincil): #2B7357 / beyaz = 5.69:1, / rozet = 4.88:1
 *
 * İKİ KENAR RENGİ VAR
 * -------------------
 * #D9E5DE kart ve ayıraç için — dekoratif, beyazla oranı 1.30 ve o
 * yeterli. Ama form alanının ve çerçeveli düğmenin kenarı KONTROLÜN
 * KENDİSİNİ tanımlıyor; WCAG orada 3:1 istiyor. Eski turuncu temada
 * ikisi de aynı yumuşak renkti (#F3D5B8, 1.3:1) ve girdi kutuları
 * sınırdaydı. #7E9A8C = 3.05:1 ile o eşiği geçiyor.
 *
 * SEMANTİK RENKLER AYRI
 * ---------------------
 * Marka yeşili "birincil ve seçili" demek; "başarılı" demek DEĞİL.
 * Başarı, hata ve uyarı kendi renklerini koruyor — aday durumları da
 * öyle. Tema yeşil diye her rozet yeşile boyanmıyor.
 */

export const SIRKET_ZEMIN = '#F6F9F7';
export const SIRKET_YUZEY = '#FFFFFF';
export const SIRKET_KENAR = '#D9E5DE';
export const SIRKET_METIN = '#16211C';
export const SIRKET_METIN_IKINCIL = '#55655C';
export const SIRKET_VURGU = '#1F5A45';
export const SIRKET_VURGU_KOYU = '#2B7357';
export const SIRKET_ROZET = '#E6F0EA';

/** Birincil düğmenin hover zemini. Beyaz yazıyla 10.82:1. */
export const SIRKET_VURGU_HOVER = '#174536';

/**
 * Kontrol kenarı — form alanı ve çerçeveli düğme.
 *
 * Kartın kenarı dekoratif, kontrolün kenarı DEĞİL: kutunun nerede
 * başladığını o çizgi söylüyor ve WCAG orada 3:1 istiyor. Beyaz
 * üzerinde 3.05:1.
 */
export const SIRKET_KENAR_GUCLU = '#7E9A8C';

/**
 * Birincil düğme.
 *
 * Panelde tek bir birincil düğme kalıbı var; sayfalar kendi turuncusunu
 * yazmıyor. "Doğrudan renk yazılmasın" kuralı burada da geçerli.
 */
export const BIRINCIL_DUGME =
  'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 ' +
  'text-sm font-black transition-colors disabled:opacity-40';

/*
  Yazı BEYAZ. Turuncu zeminde koyu yazı gerekiyordu; koyu yeşilde tersi
  doğru ve daha yüksek kontrast veriyor (8.06:1).
*/
export const birincilStil = { background: SIRKET_VURGU, color: '#FFFFFF' };

export const IKINCIL_DUGME =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 ' +
  'text-sm font-bold transition-colors';

export const ikincilStil = {
  borderColor: SIRKET_KENAR_GUCLU,
  color: SIRKET_METIN,
  background: SIRKET_YUZEY,
};

export const KUTU = 'rounded-2xl border p-4 sm:p-5';
export const kutuStil = { background: SIRKET_YUZEY, borderColor: SIRKET_KENAR };

/** Form alanları — panelin her yerinde aynı. */
export const ALAN =
  'w-full min-h-11 rounded-xl border px-3 text-sm outline-none transition-colors ' +
  'placeholder:text-[#69796F]';

export const alanStil = {
  borderColor: SIRKET_KENAR_GUCLU,
  background: SIRKET_YUZEY,
  color: SIRKET_METIN,
};
