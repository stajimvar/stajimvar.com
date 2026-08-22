import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = false,
  className = '',
  onClick,
}) => {
  // Dimensions (with responsive classes)
  const circleSize = size === 'sm' ? 26 : size === 'lg' ? 44 : 34;

  const textClass =
    size === 'sm'
      ? 'text-base sm:text-lg tracking-[-0.03em]'
      : size === 'lg'
      ? 'text-2xl sm:text-3xl tracking-[-0.035em]'
      : 'text-xl sm:text-2xl tracking-[-0.03em]';

  return (
    <div
      id="stajimvar-main-brand-logo"
      onClick={onClick}
      className={`inline-flex items-center gap-2 group select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
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
          <span className="hidden lg:inline-block ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-2 border-l border-gray-200">
            Kariyer & Yetenek
          </span>
        )}
      </div>
    </div>
  );
};
