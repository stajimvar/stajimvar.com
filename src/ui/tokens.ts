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

/**
 * TELEFONDA LİSTE YÜZEYİ
 *
 * NEDEN
 * -----
 * Liste ekranlarında kartlar gri zemin üzerinde yüzen kutulardı: iki
 * yanında 16 pikselik şeritler, köşelerinde yuvarlatma, aralarında 12
 * pikselik boşluk. 375 piksellik bir ekranda bu, içeriğe kalan yerin
 * 343 piksele inmesi demek — üstelik ekranın her yerinde farklı bir
 * kutu ritmi.
 *
 * Telefonda kart KUTU değil YÜZEY: ekranın iki kenarına yaslanıyor,
 * köşesi ve gölgesi yok, komşusundan yalnızca 1 pikselik açık gri bir
 * çizgiyle ayrılıyor. `sm:` ve üstünde kart olduğu gibi geri geliyor —
 * orada içerik gri zeminde yüzen bir kutu ve kartın nerede bittiğini
 * söyleyen şey zeminin rengi.
 *
 * NASIL
 * -----
 * Sınıflar EKLENMİYOR, DEĞİŞTİRİLİYOR. `rounded-none` ile
 * `rounded-2xl` aynı katmanda; hangisinin kazanacağı üretilen CSS'in
 * sırasına kalırdı. Her değer kendi dalında tam yazılıyor.
 *
 * Kenar boşluğu KABIN İŞİ. Sayfanın `main` alanı `px-4` taşımaya devam
 * ediyor (formlar ve hesap eylemleri ekranın kenarına yapışmamalı);
 * yüzey olması gereken liste onu `-mx-4` ile geri alıyor.
 */
export const YUZEY = {
  /** Liste kabı: sayfanın yan boşluğunu telefonda geri alıyor. */
  kap: '-mx-4 sm:mx-0',
  /**
   * Kartın kabuğu. Telefonda tek bir alt çizgi — hem kabuk hem komşudan
   * ayıran 1 piksel o çizgi; `sm:` üstünde dört kenar ve köşe geri
   * geliyor. Sıra önemli: Tailwind `sm:` kurallarını taban kuralların
   * ARDINA yazıyor, `sm:border` böylece `border-b`yi eziyor.
   */
  kabuk: 'border-b border-gray-200 sm:rounded-2xl sm:border',
  /**
   * Liste SÜTUNU: telefonda baştan sona beyaz.
   *
   * Kartlar kenara yaslandıktan sonra geriye bloklar ARASINDAKİ boşluk
   * kaldı — şeritle liste arasındaki 16 piksel, gri sayfa zeminini
   * gösteren bir bant olarak okunuyordu. Boşluğu sıfırlamak yanlış
   * olurdu: nefes payı gerçekten gerekiyor, sorun rengi.
   *
   * Sütun telefonda kendi beyaz zeminini taşıyor ve sayfanın yan
   * boşluğunu `-mx-4 px-4` ile geri alıp geri veriyor: zemin ekranın
   * iki kenarına yaslanıyor ama içerik yine 16 piksel içeriden
   * başlıyor. `sm:` üstünde zemin saydamlaşıyor ve kartlar yine gri
   * sayfada yüzen kutular oluyor.
   */
  kolon: 'bg-white -mx-4 px-4 sm:mx-0 sm:bg-transparent sm:px-0',
  /** Kartın iç boşluğu — metinde 12–16 piksel. */
  ic: 'px-4 py-3.5 sm:p-4.5',
  /** Izgara hücrelerinde iç boşluk 10–12 piksel. */
  icDar: 'px-3 py-2.5',
} as const;

/**
 * KURUM / KATEGORİ ŞERİDİ — TELEFONDA KABUKSUZ
 *
 * Şerit yuvarlatılmış, çerçeveli beyaz bir kutunun içindeydi ve o kutu
 * sayfanın yan boşluğunun da içinde duruyordu: 375 piksellik ekranda
 * dairelere kalan yer 343 - 24 = 319 piksel. Yani beşinci daire hep
 * yarım görünüyordu ve kaydırılacağı belli olmuyordu.
 *
 * Telefonda kabuk kalkıyor, şerit ekranın iki kenarına yaslanıyor ve
 * dikey boşluğu 12'den 8 piksele iniyor. Halkalar, seçim durumu ve
 * yatay kaydırma aynen duruyor — değişen yalnız kabuk.
 *
 * İki şerit de (şirket ve konu) buradan besleniyor; ayrı ayrı yazılınca
 * biri ötekinden farklı bir yükseklikte kalıyordu.
 */
export const SERIT = {
  kabuk: `border-b border-gray-200 bg-white py-2 sm:rounded-2xl sm:border sm:py-3 ${YUZEY.kap}`,
  /**
   * Kaydırma kabı: telefonda ilk daire ekranın kenarından 16 piksel
   * içeride.
   *
   * `no-scrollbar`: şerit ekranın iki kenarına yaslanınca tarayıcının
   * klasik kaydırma çubuğu şeridin altında bütün genişlik boyunca gri
   * bir bant olarak duruyordu. Kaydırılabilirliğin işareti çubuk değil,
   * kenardan yarım görünen daire — şerit zaten öyle tasarlandı. Üst
   * çubuktaki alt menü de aynı sınıfı kullanıyor.
   */
  ic: 'relative overflow-x-auto px-4 no-scrollbar sm:px-3',
} as const;

/**
 * LİSTE BAŞLIĞI — ÜÇ SAYFADA AYNI SATIR
 *
 * "AÇIK STAJ İLANLARI (105)", "GÜNCEL FIRSATLAR (113)", "TÜM REHBERLER
 * (71)". Üçü de aynı işi yapıyor: aşağıdaki listenin ne olduğunu ve kaç
 * tane olduğunu söylemek. Üç dosyada elle yazılmışlardı ve ayrışmıştı —
 * biri `gap-3` taşıyor, öteki taşımıyordu.
 *
 * ÜST BOŞLUK BURADA, ÇÜNKÜ KAYNAĞI BURASI
 * ---------------------------------------
 * İlanlar'da üst çubukla başlık arasında 16 piksel vardı ama o boşluk
 * KAZAYDI: sol sütunda, içi boşalmış bir sarmalayıcının `mt-4` değeri
 * kalmıştı (arama kutusu ve süzgeç düğmesi üst çubuğa taşınınca içi
 * boşaldı). Rehber'de öyle bir artık olmadığı için başlık üst çubuğa
 * yapışıyordu.
 *
 * Artık boşluk başlığın kendi `pt-4` değeri: üç sayfada da aynı ve
 * nereden geldiği belli. `sm:pt-0` çünkü geniş ekranda üst boşluğu
 * sayfanın `main` alanı (`sm:pt-3`) zaten veriyor.
 */
export const LISTE_BASLIGI = 'flex items-center justify-between gap-3 px-1 pt-4 sm:pt-0';
export const LISTE_BASLIGI_YAZISI = 'text-xs font-bold uppercase tracking-widest text-gray-600';
/** Sağdaki ikincil satır — telefonda gizli, başlıkla aynı hizada. */
export const LISTE_BASLIGI_NOTU = 'hidden text-xs font-medium text-gray-500 sm:block';

/**
 * LİSTE BLOĞU — BAŞLIK RİTMİNDEN ÇIKIYOR
 *
 * Kartlar sütunun `space-y-4` ritmindeydi ve ilk karta 16 piksel üst
 * boşluk düşüyordu. Ölçüldü (375 px): şerit alt çizgisinden ilk kartın
 * kurum satırına 43 piksel, sonraki kartların ayırıcısından kurum
 * satırına 27. Aradaki 16 piksel tam olarak o boşluk.
 *
 * Kartlar arasında boşluk YOK — ayıran şey 1 pikselik çizgi. İlk kartın
 * üstünde de şeridin alt çizgisi var, yani aynı ayırıcı. Boşluk
 * telefonda sıfıra iniyor ve ritim ilk karttan son karta aynı kalıyor.
 * `sm:pt-4` geniş ekranın ritmini olduğu gibi bırakıyor.
 */
export const LISTE_BLOGU = 'pt-0 sm:pt-4';
