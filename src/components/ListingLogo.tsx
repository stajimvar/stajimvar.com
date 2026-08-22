import React from 'react';
import { CompanyLogo } from './CompanyLogo';

/**
 * İlan, burs ve fırsat kartlarındaki kurum logosu — tek ölçü.
 *
 * NEDEN TEK BİLEŞEN
 * -----------------
 * Ölçü her sayfada ayrı yazılmıştı: ana sayfadaki fırsat kartında 36px,
 * başvuru takibinde 40px, fırsat listesinde ve ilan önizlemesinde 44px,
 * ilan kartında 44/48px, ilan detayında 56/64px, şirket sayfasında 64px.
 * Kenarlık ve iç boşluk da her yerde farklıydı (kimi p-1, kimi p-2, kimi
 * border-gray-100, kimi hiç). Aynı şirketin logosu sayfadan sayfaya
 * büyüyüp küçülüyor, listelerde göz hizası kayıyordu.
 *
 * Ölçü artık burada: 72×72. İş ilanı kartı esas alındı — en çok görülen
 * ve logonun en okunaklı çıktığı yer orasıydı.
 *
 * Kutu her yerde aynı: sabit 72×72, `shrink-0` (dar ekranda metin uzunsa
 * logo ezilmesin), dairesel, aynı kenarlık ve 8px iç boşluk. Görsel
 * `object-contain` ile duruyor — CompanyLogo'dan geliyor — yani geniş
 * logolar kırpılmıyor, logosu olmayan kurumda baş harfler aynı kutuda
 * ortalanıyor.
 *
 * `className` yalnızca kartın kendi etkileşimi içindir (örneğin hover
 * ölçeklemesi). Buraya ölçü sınıfı geçilirse standart bozulur.
 */
interface ListingLogoProps {
  name: string;
  logoUrl?: string;
  className?: string;
}

export const ListingLogo: React.FC<ListingLogoProps> = ({ name, logoUrl, className = '' }) => (
  <CompanyLogo
    name={name}
    logoUrl={logoUrl}
    className={`w-[72px] h-[72px] shrink-0 rounded-full p-2 text-lg ${className}`}
  />
);
