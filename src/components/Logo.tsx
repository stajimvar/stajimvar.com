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
  const iconSize = size === 'sm' ? 15 : size === 'lg' ? 24 : 18;

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
      {/* Monochromatic Royal Blue Circular Emblem */}
      <div
        style={{ width: circleSize, height: circleSize }}
        className="relative shrink-0 bg-blue-600 group-hover:bg-blue-700 rounded-2xl flex items-center justify-center shadow-xs transition-all duration-200 group-hover:scale-105"
        title="stajimvar.com"
      >
        {/* Sleek Minimal Graduation & Placement Vector */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Graduation Cap Diamond Top (Pure White) */}
          <path
            d="M12 3.5L3 8L12 12.5L21 8L12 3.5Z"
            fill="white"
          />

          {/* Under-cap Arc Band */}
          <path
            d="M6 10.5V14.5C6 16.5 8.5 18 12 18C15.5 18 18 16.5 18 14.5V10.5"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Tassel on Left */}
          <path
            d="M4.5 9.5V15"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Clean Placement Check Mark */}
          <path
            d="M10 12.5L13.5 16L21 5.5"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Monochromatic Pure Brand Wordmark */}
      <div className="relative inline-flex items-baseline leading-none">
        <span
          className={`font-black text-gray-900 dark:text-white leading-none ${textClass}`}
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          Stajım<span className="text-blue-600 dark:text-blue-400 font-black">Var</span>
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 ml-1 mb-0.5 inline-block group-hover:scale-125 transition-transform" />

        {showTagline && (
          <span className="hidden lg:inline-block ml-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-2 border-l border-gray-200 dark:border-gray-800">
            Kariyer & Yetenek
          </span>
        )}
      </div>
    </div>
  );
};
