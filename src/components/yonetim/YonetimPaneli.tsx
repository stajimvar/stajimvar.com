import React from 'react';
import { CanliSayfasi } from './CanliSayfasi';
import { BasvurularSayfasi } from './BasvurularSayfasi';
import { IlanlarSayfasi } from './IlanlarSayfasi';
import { OgrencilerSayfasi } from './OgrencilerSayfasi';
import { OnaySayfasi } from './OnaySayfasi';
import { SirketlerSayfasi } from './SirketlerSayfasi';
import { TaramaSayfasi } from './TaramaSayfasi';
import { OzetSayfasi } from './OzetSayfasi';
import { TrafikSayfasi } from './TrafikSayfasi';
import { YonetimKabuk, type YonetimSayfaKimlik } from './YonetimKabuk';

/**
 * YÖNETİM PANELİ — kabuk ve sayfa seçimi.
 *
 * ADRES SENKRONU
 * --------------
 * Seçili sayfa adreste taşınıyor (`/yonetim/trafik`). Yalnız bileşen
 * durumunda tutulsaydı sayfa yenilenince özete düşerdi ve bir ekranı
 * paylaşmak mümkün olmazdı. Tarayıcının geri düğmesi de çalışıyor.
 *
 * YER TUTUCU KALMADI
 * ------------------
 * Panelin her sayfası gerçek veriyle çalışıyor. Yazılmamış sayfalar için
 * "bu ekranda olacaklar" diyen kartlar vardı; hepsi kaldırıldı.
 *
 * Keşfet arşivi, bölüm talepleri ve gönderi paylaşma ekranları bu panelden
 * ÖNCE yazılmıştı ve kendi adreslerinde çalışıyor; bu yüzden buraya
 * gelmiyorlar. Kenar çubuğundaki bağlantıları panel dışında açıldıklarını
 * söyleyen bir simge taşıyor — sol sütunun sebepsiz kaybolması, panelin
 * bozulduğunu düşündürürdü.
 */

const YOL_ONEKI = '/yonetim';

const KIMLIK_YOL: Record<YonetimSayfaKimlik, string> = {
  ozet: `${YOL_ONEKI}`,
  trafik: `${YOL_ONEKI}/trafik`,
  canli: `${YOL_ONEKI}/canli`,
  ogrenciler: `${YOL_ONEKI}/ogrenciler`,
  ilanlar: `${YOL_ONEKI}/ilanlar`,
  basvurular: `${YOL_ONEKI}/basvurular`,
  sirketler: `${YOL_ONEKI}/sirketler`,
  onay: `${YOL_ONEKI}/onay`,
  tarama: `${YOL_ONEKI}/tarama`,
  kesfet: `${YOL_ONEKI}/kesfet`,
  bolum: `${YOL_ONEKI}/bolum-talepleri`,
  paylasim: `${YOL_ONEKI}/instagram`,
};

export function yoldanKimlik(yol: string): YonetimSayfaKimlik {
  const temiz = (yol || '').split('?')[0].replace(/\/+$/, '') || YOL_ONEKI;
  const eslesen = (Object.entries(KIMLIK_YOL) as [YonetimSayfaKimlik, string][])
    .filter(([, y]) => y !== YOL_ONEKI)
    .find(([, y]) => temiz === y || temiz.startsWith(`${y}/`));
  return eslesen ? eslesen[0] : 'ozet';
}


export const YonetimPaneli: React.FC<{
  yol: string;
  onNavigate: (yol: string) => void;
}> = ({ yol, onNavigate }) => {
  const etkin = yoldanKimlik(yol);
  const git = React.useCallback(
    (k: YonetimSayfaKimlik) => onNavigate(KIMLIK_YOL[k]),
    [onNavigate],
  );

  return (
    <YonetimKabuk etkin={etkin} sec={git} onSiteyeDon={() => onNavigate('/')}>
      {etkin === 'ozet' && <OzetSayfasi onNavigate={onNavigate} git={git} />}
      {etkin === 'trafik' && <TrafikSayfasi />}
      {etkin === 'canli' && <CanliSayfasi />}
      {etkin === 'onay' && <OnaySayfasi />}
      {etkin === 'ogrenciler' && <OgrencilerSayfasi />}
      {etkin === 'ilanlar' && <IlanlarSayfasi />}
      {etkin === 'basvurular' && <BasvurularSayfasi />}
      {etkin === 'sirketler' && <SirketlerSayfasi />}
      {etkin === 'tarama' && <TaramaSayfasi />}

    </YonetimKabuk>
  );
};
