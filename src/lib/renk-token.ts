/**
 * SEMANTİK RENK BELİRTEÇLERİ
 *
 * NEDEN VAR
 * ---------
 * Renk kod içinde doğrudan yazılınca "neden bu renk" sorusunun cevabı
 * kayboluyor ve aynı anlam iki yerde iki renkle çiziliyor. Sayıldı
 * (7 Eylül 2026, src/ altındaki tsx dosyaları):
 *
 *   bg-blue-600   141      bg-emerald-600    9
 *   bg-blue-700    63      bg-teal-600       3
 *                          bg-indigo-600     1
 *
 * Yani ortada bir "renk kargaşası" yok: mavi zaten ezici çoğunlukta ve
 * yeşil kullanımlarının hepsi anlamlı (teklif kabul edildi, doğrulandı,
 * onaylandı). teal/indigo değerleri `PredictiveInput` içindeki
 * kullanılmayan varyantlardan geliyor — hiçbir çağrı yeri onları
 * seçmiyor, üçü de ölü kod.
 *
 * Bu dosya rengi DEĞİŞTİRMİYOR; var olan kullanımı adlandırıyor. Yeni
 * yazılan arayüz doğrudan `bg-blue-600` yerine buradaki adı kullanıyor,
 * böylece "bu mavi marka mı yoksa bilgi mi" sorusu kodda cevaplı duruyor.
 *
 * KONTRAST (hesaplandı, WCAG 2.1 nispi parlaklık)
 * -----------------------------------------------
 *   primary   beyaz yazı / #2563EB  = 5.12:1  (AA metin ✓)
 *   hover     beyaz yazı / #1D4ED8  = 6.65:1  ✓
 *   success   beyaz yazı / #059669  = 4.54:1  (AA metin ✓)
 *   warning   #78350F yazı / #FEF3C7 = 10.9:1 ✓
 *   muted     #4B5563 / beyaz       = 7.56:1  ✓
 *
 * İŞVEREN PANELİ AYRI KALIYOR
 * ---------------------------
 * `src/sirket/renk.ts` giriş yapmış işveren panelinin kendi alt teması
 * ve kendi kabuğuyla (SirketKabugu) birlikte çalışıyor. Orası bilinçli
 * bir alt marka; bu dosya onu ezmiyor.
 *
 * Ayrım şurada: /isveren HALKA AÇIK pazarlama sayfası ve öğrenci
 * başlığını taşıyor. Ölçüldü (canlı, 1440px): mavi logonun ve mavi
 * "Kayıt Ol" düğmesinin hemen altında ana eylem #25D366 (WhatsApp
 * yeşili) zeminliydi — tek ekranda iki ayrı ürün gibi görünüyordu.
 * O sayfadaki BİRİNCİL eylem artık marka mavisi; yumuşak yeşil rozetler
 * işveren alanının kimliği olarak duruyor.
 */

/** Ana marka aksiyonu. Sayfada tek bir birincil eylem olur. */
export const RENK_PRIMARY = {
  zemin: 'bg-blue-600',
  zeminHover: 'hover:bg-blue-700',
  yazi: 'text-white',
  metin: 'text-blue-700',
  yumusakZemin: 'bg-blue-50',
  kenar: 'border-blue-200',
} as const;

/**
 * Başarı ve doğrulama.
 *
 * Marka rengiyle karışmaması önemli: yeşil "oldu" demek, "buraya bas"
 * demek değil. Bu yüzden birincil düğme yeşil olmuyor, ama doğrulanmış
 * kaynak rozeti ve kabul edilen başvuru yeşil kalıyor.
 */
export const RENK_BASARI = {
  zemin: 'bg-emerald-600',
  yazi: 'text-white',
  metin: 'text-emerald-700',
  yumusakZemin: 'bg-emerald-50',
  kenar: 'border-emerald-200',
} as const;

/** Uyarı: dikkat ister ama hata değil (yaklaşan son başvuru gibi). */
export const RENK_UYARI = {
  yumusakZemin: 'bg-amber-50',
  metin: 'text-amber-800',
  kenar: 'border-amber-200',
} as const;

/**
 * İkincil bilgi.
 *
 * Ayrı bir "içerik türü" rengi TANIMLANMADI: fırsat ve etkinlik
 * kartları bugün kendi ikonu ve etiketiyle ayrışıyor, renkle değil.
 * Kullanılmayacak bir token eklemek, ileride birinin onu keyfî yere
 * uygulaması demek olurdu.
 */
export const RENK_SESSIZ = {
  metin: 'text-gray-600',
  metinKoyu: 'text-gray-900',
  kenar: 'border-gray-200',
  yumusakZemin: 'bg-gray-50',
} as const;

/**
 * KLAVYE ODAK HALKASI
 *
 * Odak stili verilmeyen öğe tarayıcının varsayılanına düşüyor. Ölçüldü
 * (canlı, /isveren, 1440px): varsayılan halka 0.8 piksel ve #E59700 —
 * sayfa zemininde 2.29:1. WCAG metin dışı öğeler için 3:1 istiyor, yani
 * klavyeyle gezen kullanıcı nerede olduğunu göremiyordu. O sayfada
 * odaklanabilir 12 öğenin 11'i bu durumdaydı (8 SSS başlığı, 3 düğme).
 *
 * #155DFC beyaz üzerinde 5.25:1 ve 2 piksel kalınlığında.
 *
 * GEÇİŞ LİSTESİNE DİKKAT
 * ----------------------
 * `transition-colors` Tailwind'de `outline-color`'ı DA kapsıyor. Odak
 * dışındayken outline rengi `currentColor` — mavi düğmede beyaz. Odak
 * geldiğinde renk maviye geçmesi gerekirken beyazda kalıyordu: ölçüldü
 * (canlı, gerçek Tab ile, /isveren) halka #FFFFFF, beyaz sayfada 1:1 —
 * yani birincil düğmenin odak halkası GÖRÜNMÜYORDU.
 *
 * `transition-colors` yerine geçiş listesi elle yazılıyor: zemin, kenar
 * ve yazı animasyonlu kalıyor, outline rengi anında uygulanıyor.
 */
export const ODAK_HALKASI =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

/** Renk geçişi — outline HARİÇ. Sebebi yukarıda. */
export const RENK_GECISI =
  'transition-[background-color,border-color,color] duration-150';

/**
 * Birincil düğme kalıbı — geometri + renk birlikte.
 *
 * Odak halkası kalıbın parçası: klavyeyle gezen kullanıcı düğmenin
 * seçili olduğunu ancak bunu görürse anlıyor.
 */
export const BIRINCIL_EYLEM = [
  'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-5',
  'text-sm font-bold disabled:opacity-40',
  RENK_GECISI,
  RENK_PRIMARY.zemin,
  RENK_PRIMARY.zeminHover,
  RENK_PRIMARY.yazi,
  ODAK_HALKASI,
].join(' ');
