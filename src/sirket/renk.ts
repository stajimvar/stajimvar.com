/**
 * İşveren panelinin renk belirteçleri.
 *
 * NEDEN ÖĞRENCİ TARAFIYLA AYNI AİLE
 * ---------------------------------
 * Panel sırasıyla koyu, turuncu ve WhatsApp yeşili oldu; her seferinde
 * gerekçe "işveren başka bir iş yapıyor, rengi de başka olsun" idi.
 * Sonuç, aynı hesaptan iki dünyaya giren kullanıcı için "başka bir
 * ürüne düştüm" hissiydi. Ayrım kaldırıldı (kullanıcı kararı, 17 Eylül
 * 2026): panel öğrenci tarafının mavi-beyazını devralıyor. Zemin gray-50,
 * yüzey beyaz, kenar gray-200, birincil blue-600, rozet blue-50 üstünde
 * blue-700. Değerler öğrenci tarafındaki Tailwind sınıflarının hex
 * karşılığı; iki taraf artık aynı sayıları çiziyor.
 *
 * SABİT ADLARI DEĞİŞMEDİ
 * ----------------------
 * Panel ağacı ve dışarıdaki birkaç bileşen (Header, AccountSheet,
 * IsverenLanding) bu adlarla bağlı. Adlar kalınca tema tek dosyadan
 * döndü; yeniden adlandırma sekiz dosyaya dokunurdu.
 *
 * MAVİ ZEMİNDE BEYAZ YAZI
 * -----------------------
 * Yeşilde yazı koyuydu, çünkü #25D366 üstünde beyaz 1.98:1 veriyordu.
 * blue-600 üstünde durum tersine: beyaz 5.17:1, koyu gri 1.5:1'in
 * altında. Birincil düğme bu yüzden beyaz yazılı.
 *
 * KONTRAST (hesaplandı, WCAG bağıl parlaklık)
 * -------------------------------------------
 * Birincil düğme: #FFFFFF yazı / #2563EB zemin = 5.17:1
 * Hover:          #FFFFFF yazı / #1D4ED8 zemin = 6.70:1
 * Vurgu metni:    #1D4ED8 / beyaz = 6.70:1, / rozet #EFF6FF = 6.16:1
 * Ana metin:      #111827 / zemin #F9FAFB = 16.98:1
 * İkincil metin:  #4B5563 / zemin = 7.23:1, / beyaz = 7.56:1
 * Kontrol kenarı: #D1D5DB / beyaz = 1.47:1 — öğrenci tarafındaki form
 *                 alanlarıyla aynı (border-gray-300); kutunun sınırını
 *                 odakta 2 px mavi halka gösteriyor.
 *
 * SEMANTİK RENKLER AYRI
 * ---------------------
 * Marka mavisi "birincil ve seçili" demek; "başarılı" demek DEĞİL.
 * Başarı, hata ve uyarı kendi renklerini koruyor — aday durumları
 * (basvuru-durumu.ts) da öyle.
 */

export const SIRKET_ZEMIN = '#F9FAFB';
export const SIRKET_YUZEY = '#FFFFFF';
export const SIRKET_KENAR = '#E5E7EB';
export const SIRKET_METIN = '#111827';
export const SIRKET_METIN_IKINCIL = '#4B5563';
export const SIRKET_VURGU = '#2563EB';
export const SIRKET_VURGU_KOYU = '#1D4ED8';
export const SIRKET_ROZET = '#EFF6FF';

/** Birincil düğmenin hover zemini. Beyaz yazıyla 6.70:1. */
export const SIRKET_VURGU_HOVER = '#1D4ED8';

/**
 * Kontrol kenarı — form alanı ve çerçeveli düğme. Öğrenci tarafındaki
 * alanlarla aynı gri (gray-300).
 */
export const SIRKET_KENAR_GUCLU = '#D1D5DB';

/**
 * Vurgulu kenar — doğrulanmış rozeti, basılı süzgeç, odaklı kart.
 * Öğrenci tarafındaki border-blue-200.
 */
export const SIRKET_KENAR_VURGU = '#BFDBFE';

/**
 * Klavye odak halkası — öğrenci tarafındaki ODAK_HALKASI ile aynı.
 * `transition-colors` yerine geçiş listesi elle yazılıyor; o kısayol
 * outline rengini de geçişe alıyor ve halka mavi düğmede beyaz kalıyordu
 * (src/lib/renk-token.ts'de ölçüldü).
 */
export const SIRKET_ODAK =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
const GECIS = 'transition-[background-color,border-color,color] duration-150';

/**
 * Birincil düğmenin renk sınıfları — zemin, hover ve beyaz yazı.
 *
 * Renk SINIFTA, satır içi biçemde değil: satır içi `background` her
 * sınıfı ezer ve hover zemini hiç uygulanmazdı. Hex burada AÇIK yazılı
 * (SIRKET_VURGU / SIRKET_VURGU_HOVER ile aynı): Tailwind sınıfı kaynak
 * metinde tam hâliyle görmezse CSS'e hiç yazmıyor; şablon dizesiyle
 * birleştirilen bir sınıf derlenen pakete girmez.
 */
export const BIRINCIL_RENK = 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white';

/**
 * Birincil düğme.
 *
 * Panelde tek bir birincil düğme kalıbı var; sayfalar kendi rengini
 * yazmıyor.
 */
export const BIRINCIL_DUGME =
  'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 ' +
  `text-sm font-black disabled:cursor-not-allowed disabled:opacity-40 ${BIRINCIL_RENK} ${GECIS} ${SIRKET_ODAK}`;

/*
  Eski çağrı yerleri `style={birincilStil}` geçiyor; zemin artık sınıfta
  olduğu için burada yalnızca yazı rengi kalıyor (mavi üstünde beyaz,
  5.17:1). Satır içi zemin bırakılsaydı hover yine ezilirdi.
*/
export const birincilStil = { color: SIRKET_YUZEY };

export const IKINCIL_DUGME =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 ' +
  `text-sm font-bold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 ${GECIS} ${SIRKET_ODAK}`;

export const ikincilStil = {
  borderColor: SIRKET_KENAR_GUCLU,
  color: SIRKET_METIN,
};

export const KUTU = 'rounded-2xl border p-4 shadow-xs sm:p-5';
export const kutuStil = { background: SIRKET_YUZEY, borderColor: SIRKET_KENAR };

/** Form alanları — panelin her yerinde aynı. Odakta mavi halka. */
export const ALAN =
  'w-full min-h-11 rounded-xl border px-3 text-sm outline-none focus:outline-2 focus:outline-blue-600 ' +
  'placeholder:text-gray-500';

export const alanStil = {
  borderColor: SIRKET_KENAR_GUCLU,
  background: SIRKET_YUZEY,
  color: SIRKET_METIN,
};

/*
  ALT GEZİNME TEMASI

  Yüzen alt çubuğun geometrisi öğrenci tarafıyla ortak (src/ui/
  BottomNavigation) ve varsayılan renkleri de zaten bu değerler. Tema
  yine de buradan geçiyor: panel bir gün yeniden ayrışırsa tek yer.

  Kontrast: seçili yazı #1D4ED8, rozet #EFF6FF üzerinde 6.16:1;
  seçilmeyen ikon #4B5563 beyaz üzerinde 7.56:1.
*/
export const SIRKET_ALT_MENU = {
  zemin: SIRKET_YUZEY,
  kenar: SIRKET_KENAR,
  aktifZemin: SIRKET_ROZET,
  aktifMetin: SIRKET_VURGU_KOYU,
  pasifMetin: SIRKET_METIN_IKINCIL,
  nokta: SIRKET_VURGU,
};
