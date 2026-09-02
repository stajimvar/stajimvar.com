import React from 'react';

/**
 * Süzgeç paneli yapı taşları.
 *
 * NEDEN PAYLAŞILAN
 * ----------------
 * Aynı panel üç sayfada var: staj ilanları, fırsatlar ve keşfet. Her
 * birinde ayrı ayrı yazıldığında bölüm başlığının puntosu, satır
 * yüksekliği ve sağdaki sayının hizası sessizce birbirinden ayrılıyor —
 * tokens.ts'in baştan uyardığı durum.
 *
 * Ölçüler MatchedInternshipsView'daki ilk uygulamadan alındı; oradaki
 * panel bu üçlünün referansı.
 */

/** Başlıklı süzgeç bölümü: "KONUM", "TARİH", "KATEGORİ" … */
export const FiltreBlogu: React.FC<{ baslik: string; children: React.ReactNode }> = ({
  baslik,
  children,
}) => (
  <div className="space-y-2 px-4 py-3.5">
    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">{baslik}</h3>
    {children}
  </div>
);

/**
 * Tek seçenek satırı.
 *
 * `adet` verilmezse sağda sayı çizilmiyor — sayısı olmayan bir seçeneğe
 * (örneğin "Tümü") uydurma bir rakam koymamak için.
 *
 * Dokunma hedefi: satır 16 piksel dikey boşlukla ~34 piksele çıkıyor ve
 * tıklama alanı `label` sayesinde yazıyı da kapsıyor.
 */
export const SecenekSatiri: React.FC<{
  tip: 'checkbox' | 'radio';
  etiket: string;
  adet?: number;
  secili: boolean;
  onChange: () => void;
}> = ({ tip, etiket, adet, secili, onChange }) => (
  <label className="group flex cursor-pointer select-none items-center gap-2.5 py-1.5">
    <input
      type={tip}
      checked={secili}
      onChange={onChange}
      className={`h-4 w-4 shrink-0 cursor-pointer border-gray-300 text-blue-600 focus:ring-blue-500/30 ${
        tip === 'checkbox' ? 'rounded' : 'rounded-full'
      }`}
    />
    <span
      className={`min-w-0 flex-1 truncate text-sm transition-colors ${
        secili ? 'font-semibold text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
      }`}
      title={etiket}
    >
      {etiket}
    </span>
    {adet !== undefined && (
      <span className="shrink-0 text-xs tabular-nums text-gray-600">{adet}</span>
    )}
  </label>
);
