import React from 'react';

export const KesifDairesi: React.FC<{
  etiket: string;
  altEtiket: string;
  secili: boolean;
  halka?: boolean;
  halkaRenk?: string;
  seciliRenk?: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({
  etiket,
  altEtiket,
  secili,
  halka = false,
  halkaRenk = 'linear-gradient(135deg,#2563eb,#10b981)',
  seciliRenk = '#111827',
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={secili}
    title={`${etiket} — ${altEtiket}`}
    className="w-[76px] shrink-0 flex flex-col items-center gap-1.5 cursor-pointer group"
  >
    <span
      aria-hidden
      className="rounded-full p-[2.5px] transition-colors"
      style={{ background: secili ? seciliRenk : halka ? halkaRenk : '#e5e7eb' }}
    >
      <span className="block rounded-full bg-white p-[2px]">
        <span className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-gray-50">
          {children}
        </span>
      </span>
    </span>
    <span aria-hidden className="w-full text-center">
      <span
        className={`block text-[11px] truncate ${
          secili ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'
        }`}
      >
        {etiket}
      </span>
      <span className="block text-[10px] text-gray-600 truncate">{altEtiket}</span>
    </span>
    <span className="sr-only">{etiket}, {altEtiket}</span>
  </button>
);

export const KesifSeridi: React.FC<{
  baslik?: string;
  children: React.ReactNode;
}> = ({ baslik, children }) => (
  <div className="bg-white rounded-2xl border border-gray-200 py-3">
    {baslik && <h2 className="px-3 pb-3 text-sm font-extrabold text-gray-900">{baslik}</h2>}
    <div className="relative overflow-x-auto px-3">
      <div className="flex gap-3 min-w-max">{children}</div>
    </div>
  </div>
);
