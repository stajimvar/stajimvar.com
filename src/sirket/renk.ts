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
 * Zemin #F5FBF7 — beyaza çok yakın, yeşile yalnızca fısıldıyor
 * (beyazla arasındaki oran 1.06). Kartlar beyaz kalıyor. Yeşil
 * düğmede, aktif sekmede, seçili durumda ve rozette görünüyor; yüzey
 * boyamak "her yeri pastel yeşil" görünümü üretirdi.
 *
 * Yüzey boyanmıyor: imza rengi dolguda ve vurguda görünüyor, arka
 * planda değil. Gradyan yok.
 *
 * WHATSAPP YEŞİLİ AİLESİ
 * -----------------------
 * Palet WhatsApp yeşiline yaklaştırıldı: daha canlı ve tanıdık, ama
 * yüzeyler beyaz kaldığı için panel hâlâ sakin duruyor.
 *
 * #25D366 ZEMİNDE, KOYU YEŞİL YAZIDA
 * ----------------------------------
 * Önce tam tersiydi: birincil düğme koyu yeşil zemin + beyaz yazı,
 * parlak yeşil yalnızca ilerleme çubuğu dolgusu. İkisi yer değişti;
 * parlak yeşil artık panelin ana rengi.
 *
 * Bu bir ödün DEĞİL: #25D366 üzerinde koyu nötr yazı 8.35:1 veriyor,
 * eski koyu yeşil + beyaz yazı düzeni 4.81:1 veriyordu. Kontrast
 * yükseldi.
 *
 * Ama #25D366 METİN OLAMIYOR: beyaz üzerinde 1.98:1, yumuşak yüzeyde
 * 1.81:1. Ne metin (4.5) ne de ince kenar/durum göstergesi (3) eşiğini
 * geçiyor. Bu yüzden yazı, ikon ve kenarlar ailenin koyu ucunu
 * (#075E54, #3E9569) kullanmaya devam ediyor. Parlak yeşil yalnızca
 * ZEMİN ve DOLGU.
 *
 * KONTRAST (ölçüldü)
 * ------------------
 * Birincil düğme: #16211C yazı / #25D366 zemin = 8.35:1
 * Hover:          #16211C yazı / #1DB854 zemin = 6.34:1
 * Vurgu metni:    #075E54 / beyaz = 7.67:1, / rozet #E9F8EF = 6.99:1
 * Ana metin:      #16211C / zemin #F5FBF7 = 15.79:1
 * İkincil metin:  #55655C / zemin = 5.89:1
 * Kontrol kenarı: #3E9569 / beyaz = 3.68:1
 *
 * SEMANTİK RENKLER AYRI
 * ---------------------
 * Marka yeşili "birincil ve seçili" demek; "başarılı" demek DEĞİL.
 * Başarı, hata ve uyarı kendi renklerini koruyor — aday durumları da
 * öyle. Tema yeşil diye her rozet yeşile boyanmıyor.
 */

export const SIRKET_ZEMIN = '#F5FBF7';
export const SIRKET_YUZEY = '#FFFFFF';
export const SIRKET_KENAR = '#BFE8CE';
export const SIRKET_METIN = '#16211C';
export const SIRKET_METIN_IKINCIL = '#55655C';
export const SIRKET_VURGU = '#25D366';
export const SIRKET_VURGU_KOYU = '#075E54';
export const SIRKET_ROZET = '#E9F8EF';


/** Birincil düğmenin hover zemini. Koyu yazıyla 6.34:1. */
export const SIRKET_VURGU_HOVER = '#1DB854';

/**
 * Kontrol kenarı — form alanı ve çerçeveli düğme.
 *
 * Kartın kenarı dekoratif, kontrolün kenarı DEĞİL: kutunun nerede
 * başladığını o çizgi söylüyor ve WCAG orada 3:1 istiyor. Beyaz
 * üzerinde 3.05:1.
 */
export const SIRKET_KENAR_GUCLU = '#3E9569';

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
  YAZI KOYU.

  Zemin artık ailenin parlak yeşili ve orada beyaz yazı okunmuyor
  (1.98:1). Koyu nötr ile 8.35:1 — önceki koyu yeşil + beyaz yazı
  düzeninin (4.81:1) neredeyse iki katı. Yani parlak yeşile geçmek
  kontrastı düşürmedi, yükseltti.
*/
export const birincilStil = { background: SIRKET_VURGU, color: SIRKET_METIN };

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
