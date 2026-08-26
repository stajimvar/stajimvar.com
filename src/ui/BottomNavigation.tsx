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
 * vurgusu. Kimin çizileceğine hâlâ Header karar veriyor — rol ve oturum
 * mantığı orada kalıyor.
 *
 * İÇERİĞİN ÜZERİNE BİNMESİ
 * ------------------------
 * Çubuk yüzer ve içeriğin üstünden geçiyor; bu tasarımın kendisi. Sayfa
 * dibinde bir şeyin altında kalmaması için alt boşluğu SayfaKabugu
 * veriyor (pb-[calc(110px+safe-area)]), çubuk da aşağı kaydırınca
 * çekiliyor.
 */

export const BottomNavigation: React.FC<{
  gorunur: boolean;
  etiket: string;
  children: React.ReactNode;
}> = ({ gorunur, etiket, children }) => (
  <nav
    aria-label={etiket}
    /*
      Kayma değeri Tailwind sınıfıyla değil satır içi biçemle veriliyor:
      `translate-y-[160%]` derlenen CSS'e hiç girmemişti (canlıda
      doğrulandı) ve sınıf öğenin üzerindeyken hiçbir şey yapmıyordu.
    */
    style={{ transform: gorunur ? 'none' : 'translateY(160%)' }}
    className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-50 flex items-center justify-around gap-0.5 rounded-full border border-gray-200 bg-white px-1.5 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition-transform duration-200 lg:hidden"
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
}> = ({ ikon, etiket, ad, aktif, href, onClick, sayi }) => {
  const icerik = (
    <>
      <span className="relative">
        {ikon}
        {typeof sayi === 'number' && sayi > 0 && (
          <span className="absolute -right-2 -top-1.5 rounded-full bg-teal-600 px-1.5 text-[9px] font-black leading-none text-white shadow-xs">
            {sayi}
          </span>
        )}
      </span>
      {aktif && <span className="truncate text-[11px] font-bold">{etiket}</span>}
    </>
  );

  const sinif = `flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 transition-colors duration-200 ${
    aktif ? 'bg-blue-50 font-bold text-blue-700' : 'text-gray-500 hover:text-gray-900'
  }`;

  if (href) {
    return (
      <a href={href} aria-label={ad} aria-current={aktif ? 'page' : undefined} onClick={onClick} className={sinif}>
        {icerik}
      </a>
    );
  }
  return (
    <button type="button" aria-label={ad} onClick={onClick} className={sinif}>
      {icerik}
    </button>
  );
};
