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
 * HENÜZ YAZILMAMIŞ SAYFALAR
 * -------------------------
 * Menüdeki her bağlantı tıklanabilir. Yazılmamış olanlar boş ekran
 * değil, ne göstereceğini ve neyin beklendiğini söyleyen bir kart
 * çiziyor: tıklayınca hiçbir şey olmayan bir menü, panelin bozuk
 * olduğunu düşündürür.
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

const Hazirlaniyor: React.FC<{ baslik: string; anlatim: string; bekleyen: string[] }> = ({
  baslik,
  anlatim,
  bekleyen,
}) => (
  <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-5">
    <h2 className="text-sm font-bold text-gray-900">{baslik}</h2>
    <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{anlatim}</p>
    <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
      Bu ekranda olacaklar
    </p>
    <ul className="mt-1.5 space-y-1">
      {bekleyen.map((b) => (
        <li key={b} className="flex gap-2 text-sm text-gray-700">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
          <span className="min-w-0">{b}</span>
        </li>
      ))}
    </ul>
  </section>
);

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

      {etkin === 'kesfet' && (
        <Hazirlaniyor
          baslik="Keşfet arşivi"
          anlatim="Arşivdeki kayıtları vitrine alma ya da gizleme."
          bekleyen={['Vitrine al / gizle']}
        />
      )}
      {etkin === 'bolum' && (
        <Hazirlaniyor
          baslik="Bölüm talepleri"
          anlatim="Öğrencilerin açılmasını istediği bölüm sayfaları."
          bekleyen={['Sayfa aç / reddet']}
        />
      )}
      {etkin === 'paylasim' && (
        <Hazirlaniyor
          baslik="Gönderi paylaş"
          anlatim="İlan seçip Instagram ve X metni üretme, kopyalama ve paylaşıldı işaretleme."
          bekleyen={['İlan seç', 'Metin üret ve kopyala', 'Paylaşıldı işaretle']}
        />
      )}
    </YonetimKabuk>
  );
};
