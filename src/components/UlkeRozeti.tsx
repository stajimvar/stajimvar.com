import React from 'react';
import { ulkeAdi } from '../lib/ulke-adi';
import { ulkeRozetiGerekli } from '../lib/ulke-rozeti.mjs';

/**
 * Yurt dışı ilanları işaretleyen düz metin rozeti.
 *
 * Bayrak emojisi yok: bölge göstergesi harf çiftleri Windows'ta bayrak olarak
 * çizilmiyor, iki büyük harf olarak görünüyor. Kullanıcıların bir kısmında
 * rozet bozuk görünürdü; ülke adının kendisi zaten bilgiyi taşıyor.
 *
 * Anlam yalnız renkte değil metinde: rozet "Fransa" yazıyor. Ekran okuyucuda
 * konum rozetinden ayrı bir bilgi olarak duyulsun diye görsel olarak gizli bir
 * "Ülke:" öneki var.
 *
 * Çizilip çizilmeyeceği kararı burada değil, tek kural dosyasında:
 * src/lib/ulke-rozeti.mjs → ulkeRozetiGerekli.
 */
export const UlkeRozeti: React.FC<{ countryCode?: string; className?: string }> = ({
  countryCode,
  className = '',
}) => {
  const kod = ulkeRozetiGerekli(countryCode);
  if (!kod) return null;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-violet-50 text-violet-800 border border-violet-200 ${className}`}
    >
      <span className="sr-only">Ülke: </span>
      {ulkeAdi(kod)}
    </span>
  );
};
