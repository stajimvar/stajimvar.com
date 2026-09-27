import React from 'react';

/*
  ŞİRKET FORMLARININ ORTAK PARÇALARI (27 Eylül 2026)
  -------------------------------------------------
  Şirket profil formu ile ilan formu aynı alan boyunu ve aynı uzayan metin
  kutusunu kullanıyor; biri sıkılaşıp öteki eski boyda kalmasın diye tek
  yerde.

  Yazı 16 px (telefonda odakta iOS yakınlaştırmasın), sm üstünde 14 px.
  Renkler şirket panelinin alan renkleriyle aynı (`alanStil`: gray-300
  kenar, beyaz zemin, gray-900 yazı) — öneri alanı stil nesnesi almadığı
  için sınıf olarak veriliyor.
*/
export const FORM_ALAN =
  'w-full min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none ' +
  'placeholder:text-gray-500 focus:outline-2 focus:outline-blue-600 sm:text-sm';

/**
 * Yazdıkça uzayan metin alanı: `satir` kadar satırla başlıyor, içerik
 * kadar büyüyor. `field-sizing: content` her tarayıcıda yok; yükseklik
 * yazı değişince ölçülüp veriliyor (kaydırma çubuğu çıkmıyor).
 */
export const UzayanMetin: React.FC<{
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  satir?: number;
  /** Ek sınıf (ör. geniş ekranda en az yükseklik); boyut hesabını bozmuyor. */
  ekSinif?: string;
  'aria-describedby'?: string;
}> = ({ id, value, onChange, placeholder, satir = 3, ekSinif = '', 'aria-describedby': aciklayan }) => {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={satir}
      placeholder={placeholder}
      aria-describedby={aciklayan}
      className={`block w-full resize-none overflow-hidden rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base leading-relaxed text-gray-900 outline-none placeholder:text-gray-500 focus:outline-2 focus:outline-blue-600 sm:text-sm ${ekSinif}`}
    />
  );
};
