import React from 'react';

/**
 * Mobil alt gezinme.
 *
 * NEDEN AYRI BİLEŞEN
 * ------------------
 * Alt çubuk Header.tsx içinde satır satır yazılıydı ve sayfanın geri
 * kalanından farklı bir ürün gibi görünüyordu: başka köşe yarıçapı, başka
 * gölge, seçili öğede başka bir vurgu dili. Aynı ekranda iki ayrı tasarım
 * dili olması, "hazır bileşenler bir araya getirilmiş" hissinin en görünür
 * kaynağıydı.
 *
 * Burada tek yerde tanımlı: aynı köşe, aynı geçiş süresi, aynı seçili
 * vurgusu. Kimin çizileceğine hâlâ çağıran karar veriyor — rol ve oturum
 * mantığı orada kalıyor.
 *
 * İKİ DÜNYA, TEK GEOMETRİ
 * -----------------------
 * Öğrenci tarafı ve işveren paneli aynı çubuğu kullanıyor: aynı yüzen hap,
 * aynı yükseklik, seçili öğede aynı dolgulu rozet, seçilmeyende yalnız
 * ikon. Ayrılan tek şey RENK — işveren yeşili ./sirket/renk dosyasından
 * `tema` ile geliyor, öğrenci mavisi burada varsayılan. Böylece iki panel
 * aynı üründen çıkmış gibi duruyor ama tema sızmıyor.
 *
 * İÇERİĞİN ÜZERİNE BİNMESİ
 * ------------------------
 * Çubuk yüzer ve içeriğin üstünden geçiyor; bu tasarımın kendisi. Sayfa
 * dibinde bir şeyin altında kalmaması için alt boşluğu sayfa kabuğu
 * veriyor, çubuk da (öğrenci tarafında) aşağı kaydırınca çekiliyor.
 */

/** Çubuğun renkleri. Verilmezse öğrenci tarafının beyaz-mavisi. */
export type AltMenuTemasi = {
  zemin: string;
  kenar: string;
  aktifZemin: string;
  aktifMetin: string;
  pasifMetin: string;
  /** Seçili ikonun köşesindeki küçük nokta. */
  nokta: string;
};

const OGRENCI_TEMASI: AltMenuTemasi = {
  zemin: '#FFFFFF',
  kenar: '#E5E7EB',
  aktifZemin: '#EFF6FF',
  aktifMetin: '#1D4ED8',
  pasifMetin: '#6B7280',
  nokta: '#2563EB',
};

export const BottomNavigation: React.FC<{
  gorunur: boolean;
  etiket: string;
  /**
   * Çubuğun hangi genişlikten sonra gizleneceği. Öğrenci tarafında yan
   * gezinme `lg`'de açılıyor, işveren panelinde üst sekmeler `sm`'de.
   * Tailwind sınıfları taranabilir olsun diye iki tam sınıf arasından
   * seçiliyor; birleştirilmiş bir dize derlenen CSS'e girmez.
   */
  esik?: 'sm' | 'lg';
  tema?: AltMenuTemasi;
  children: React.ReactNode;
}> = ({ gorunur, etiket, esik = 'lg', tema = OGRENCI_TEMASI, children }) => (
  <nav
    aria-label={etiket}
    /*
      Kayma değeri Tailwind sınıfıyla değil satır içi biçemle veriliyor:
      `translate-y-[160%]` derlenen CSS'e hiç girmemişti (canlıda
      doğrulandı) ve sınıf öğenin üzerindeyken hiçbir şey yapmıyordu.
    */
    style={{
      transform: gorunur ? 'none' : 'translateY(160%)',
      background: tema.zemin,
      borderColor: tema.kenar,
    }}
    className={
      esik === 'sm'
        ? 'fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-50 flex items-center justify-around gap-0.5 rounded-full border px-1.5 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition-transform duration-200 sm:hidden'
        : 'fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-50 flex items-center justify-around gap-0.5 rounded-full border px-1.5 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition-transform duration-200 lg:hidden'
    }
  >
    {children}
  </nav>
);

/**
 * Alt çubuk öğesi.
 *
 * Etiket yalnızca seçiliyken görünüyor (yerden kazanmak için) ama
 * `aria-label` HER ZAMAN var: etiketsiz bir ikon ekran okuyucuda yalnızca
 * "düğme" diye okunuyor.
 */
export const BottomNavigationItem: React.FC<{
  ikon: React.ReactNode;
  etiket: string;
  ad: string;
  aktif: boolean;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  /** Sayaç rozeti — yalnızca gerçekten yeni bir şey varsa. */
  sayi?: number;
  /**
   * Etiketi seçili olmasa da göster. Bir SEKME değil KAPI olan öğe için:
   * işveren panelindeki "Öğrenci" hiçbir zaman seçili olmuyor, yalnız
   * ikon kalsaydı geri dönüş yolu adsız bir simgeye inerdi.
   */
  etiketHepZaman?: boolean;
  tema?: AltMenuTemasi;
}> = ({ ikon, etiket, ad, aktif, href, onClick, sayi, etiketHepZaman, tema = OGRENCI_TEMASI }) => {
  const yaziGorunur = aktif || etiketHepZaman === true;

  const icerik = (
    <>
      <span className="relative">
        {ikon}
        {aktif && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full"
            style={{ background: tema.nokta }}
          />
        )}
        {typeof sayi === 'number' && sayi > 0 && (
          <span className="absolute -right-2 -top-1.5 rounded-full bg-teal-600 px-1.5 text-[9px] font-black leading-none text-white shadow-xs">
            {sayi}
          </span>
        )}
      </span>
      {yaziGorunur && <span className="truncate text-[11px] font-bold">{etiket}</span>}
    </>
  );

  /*
    YAZILI ÖĞE KENDİ GENİŞLİĞİNİ ALIR

    Hepsi `flex-1` iken beş öğe eşit bölüşüyordu ve yazısı olan ikisi
    ("Genel", "Öğrenci") 375 pikselde "Ge..." / "Ö..." diye kırpılıyordu —
    yani yazıyı göstermenin tek amacı boşa gidiyordu. Yazılı öğe artık
    içeriği kadar yer kaplıyor, kalan genişliği yalnız ikon olanlar
    paylaşıyor.
  */
  const sinif = `flex h-11 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 transition-colors duration-200 ${
    yaziGorunur ? 'shrink-0' : 'flex-1'
  }`;
  const stil: React.CSSProperties = aktif
    ? { background: tema.aktifZemin, color: tema.aktifMetin, fontWeight: 700 }
    : { color: tema.pasifMetin };

  if (href) {
    return (
      <a
        href={href}
        aria-label={ad}
        aria-current={aktif ? 'page' : undefined}
        onClick={onClick}
        className={sinif}
        style={stil}
      >
        {icerik}
      </a>
    );
  }
  return (
    <button
      type="button"
      aria-label={ad}
      aria-current={aktif ? 'page' : undefined}
      onClick={onClick}
      className={sinif}
      style={stil}
    >
      {icerik}
    </button>
  );
};
