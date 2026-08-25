import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
  /** Tıklanabilirken gerçek adres — varsayılan ana sayfa. */
  href?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = false,
  className = '',
  onClick,
  href = '/',
}) => {
  // Dimensions (with responsive classes)
  const circleSize = size === 'sm' ? 26 : size === 'lg' ? 44 : 34;

  const textClass =
    size === 'sm'
      ? 'text-base sm:text-lg tracking-[-0.03em]'
      : size === 'lg'
      ? 'text-2xl sm:text-3xl tracking-[-0.035em]'
      : 'text-xl sm:text-2xl tracking-[-0.03em]';

  /*
    TIKLANABİLİR LOGO GERÇEK BİR BAĞLANTI

    Önce tıklanabilir bir <div>'di. Ekran okuyucu onu bağlantı olarak
    duyurmuyordu, klavyeyle odaklanılamıyordu ve "yeni sekmede aç" ya da
    orta tuşla açma çalışmıyordu — oysa bir sitede logonun ana sayfaya
    götürmesi öğrenilmiş bir davranış.

    Şimdi <a href="/">: tarayıcı adresi durum çubuğunda gösteriyor, ctrl
    ve orta tuş kendi işini yapıyor, arama motoru da ana sayfaya giden bir
    iç bağlantı görüyor. Sıradan tıklamada varsayılan engelleniyor ve
    uygulama içi geçiş çalışıyor, yani sayfa baştan kurulmuyor.
  */
  const ortakSinif = `inline-flex items-center gap-2 group select-none ${
    onClick ? 'cursor-pointer' : ''
  } ${className}`;

  const icerik = (
    <>
      {/*
        Amblem: markanın kendi çizimi, `assets/logo-kaynak.png`.

        Vektörle yeniden çizilmiş bir taklit denendi ve orijinalden gözle
        görülür biçimde sapıyordu; artık çizimin kendisi ölçekleniyor.
        Daire dışı saydam, böylece amblem gri sayfa zemininde de beyaz bir
        kare bırakmıyor. Aynı dosyadan sekme ve uygulama ikonları da
        üretiliyor: `npm run ikonlar`.
      */}
      <img
        src="/logo.png"
        alt=""
        width={circleSize}
        height={circleSize}
        style={{ width: circleSize, height: circleSize }}
        className="block shrink-0 rounded-full shadow-xs transition-transform duration-200 group-hover:scale-105"
        title="stajimvar.com"
      />

      {/* Monochromatic Pure Brand Wordmark */}
      <div className="relative inline-flex items-baseline leading-none">
        <span
          className={`font-black text-gray-900 leading-none ${textClass}`}
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          Stajım<span className="text-blue-600 font-black">Var</span>
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-1 mb-0.5 inline-block group-hover:scale-125 transition-transform"/>

        {showTagline && (
          <span className="hidden lg:inline-block ml-2 text-[10px] font-bold text-gray-600 uppercase tracking-wider pl-2 border-l border-gray-200">
            Kariyer & Yetenek
          </span>
        )}
      </div>
    </>
  );

  if (!onClick) return <span className={ortakSinif}>{icerik}</span>;

  return (
    <a
      href={href}
      onClick={(e) => {
        /* Ctrl/Cmd/Shift ve orta tuş tarayıcıya bırakılıyor. */
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onClick();
      }}
      className={ortakSinif}
    >
      {icerik}
    </a>
  );
};
