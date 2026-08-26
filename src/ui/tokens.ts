/**
 * StajımVar tasarım belirteçleri.
 *
 * NEDEN VAR
 * ---------
 * Ekranlar tek tek güzelleştirilerek buraya gelindi ve sonuç "özenle
 * tasarlanmış ürün" değil, "farklı hazır bileşenlerin bir araya
 * getirildiği sistem" oldu. Aynı kavram iki ayrı kimlikle çiziliyordu:
 * "Başvurular" üstte mavi bir daire, on santim aşağıda pembe-kırmızı bir
 * kutu. Bazı ikonlar çizgili, bazıları dolu; bir yerde daire, bir yerde
 * yuvarlatılmış kare.
 *
 * Sorun tek tek düğmelerin çirkinliği değildi — hiçbiri aynı dili
 * konuşmuyordu. Bu dosya o dili tek yerde tanımlıyor.
 *
 * NASIL KULLANILIR
 * ----------------
 * Sayfalarda doğrudan renk, gölge, köşe yarıçapı ya da rastgele ikon
 * kutusu YAZILMAZ. src/ui altındaki bileşenler kullanılır; yeni bir
 * ihtiyaç çıkarsa önce buraya eklenir, sonra kullanılır. Aksi hâlde bugün
 * düzelen ekran bir ay sonra yeniden dağılır.
 */

/** Boşluk sistemi 8 piksel tabanlı; ara değerler 4'ün katı. */
export const BOSLUK = {
  xs: 'gap-1', // 4
  sm: 'gap-2', // 8
  md: 'gap-3', // 12
  lg: 'gap-4', // 16
  xl: 'gap-6', // 24
} as const;

/**
 * Köşe yarıçapı.
 *
 * İki ölçü var, üçüncüsü yok: kartlar 20, küçük kontroller 12. Ekranda
 * beş farklı yarıçap olması, biçim sayısını artırıp "tek ürün" hissini
 * bozan şeylerin başında geliyordu.
 */
export const KOSE = {
  kart: 'rounded-[20px]',
  kontrol: 'rounded-xl', // 12
  /**
   * Alttan açılan panel: 24 piksel, yalnızca üst köşeler.
   *
   * Karttan bir kademe büyük olması bilinçli — panel ekranın kenarına
   * yaslanıyor ve daha büyük bir yüzey; kart yarıçapıyla aynı olursa
   * ekranın alt kenarına yapışmış bir kart gibi görünüyor.
   */
  panel: 'rounded-t-3xl',
  tam: 'rounded-full',
} as const;

/**
 * Geçişler 160–220 ms.
 *
 * Daha kısası fark edilmiyor, daha uzunu arayüzü ağır gösteriyor.
 */
export const GECIS = 'transition-all duration-200';

/**
 * İkon ölçüleri. Tek aile (lucide), 2 piksel çizgi.
 *
 * Dolu (filled) ikon kullanılmıyor: aynı ekranda dolu ve çizgili ikonun
 * yan yana durması, ikisinin farklı anlamı varmış izlenimi veriyor.
 */
export const IKON = {
  sm: 'w-5 h-5', // 20
  md: 'w-6 h-6', // 24
} as const;

/**
 * İkon kutusu: 40×40, 12 piksel köşe.
 *
 * Daire KULLANILMIYOR. Daire yalnızca avatar ve logo çerçevesine ait;
 * ikonlar için de daire kullanılınca ikisi karışıyor ve "bu bir kişi mi,
 * bir bölüm mü" sorusu doğuyor.
 */
export const IKON_KUTUSU = 'w-10 h-10 rounded-xl flex items-center justify-center shrink-0';

/**
 * İkon kutusunun varsayılan tonu: çok hafif marka mavisi.
 *
 * Nötr gri kutular sayfayı "ayarlar sayfası" gibi gösteriyordu. Hafif bir
 * marka tonu, renk gürültüsü eklemeden ekranı StajımVar'a ait kılıyor —
 * yeşil ve kırmızı hâlâ yalnızca kendi anlamlarında kullanılıyor.
 */
export const IKON_TONU = 'bg-blue-50/70 text-blue-700';

/**
 * Anlam renkleri.
 *
 * Yeşil YALNIZCA başarı ve doğrulama, kırmızı YALNIZCA hata, tehlike ve
 * reddedilme. Dekoratif amaçla kullanıldıklarında kullanıcı gerçek bir
 * uyarıyla süsü ayırt edemiyor.
 */
export const ANLAM = {
  marka: 'text-blue-700',
  markaZemin: 'bg-blue-50 text-blue-700',
  basari: 'text-emerald-700',
  basariZemin: 'bg-emerald-50 text-emerald-700',
  hata: 'text-rose-700',
  hataZemin: 'bg-rose-50 text-rose-700',
  notr: 'text-gray-700',
  notrZemin: 'bg-gray-100 text-gray-700',
  uyari: 'text-amber-800',
  uyariZemin: 'bg-amber-50 text-amber-800',
} as const;

/**
 * Dokunma alanı en az 44×44.
 *
 * Mobilde asıl şikâyet küçük hedefleri ıskalamak; yükseklik düğmelerde
 * 48–52 pikselden başlıyor, ikon düğmelerinde 44.
 */
export const DOKUNMA = 'min-h-11';
