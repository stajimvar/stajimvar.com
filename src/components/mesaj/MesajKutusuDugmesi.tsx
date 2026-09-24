import React from 'react';
import { MessageCircle } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import { BildirimRozeti } from '../BildirimMerkezi';
import { useMesajSayaclari } from './mesajDinleme';

/**
 * ÜST ÇUBUKTAKİ MESAJ İKONU — zilin yanında
 *
 * Gerçek `<a href="/mesajlar">`: orta tuş ve "yeni sekmede aç" çalışıyor,
 * sol tık uygulama içi gezinme. Kendi sayısını kendisi okuyor: aynı düğme
 * sitenin üst çubuğunda ve Ağım'ın telefondaki kompakt çubuğunda duruyor;
 * sayıyı çağıranlardan taşımak iki ayrı veri yolu demekti.
 *
 * ROZET: `okunmamisSohbet + bekleyenIstek`. Sayılar alınamadıysa (`null`)
 * rozet ÇİZİLMİYOR — 0 uydurulmuyor; `BildirimRozeti` sıfırda da çizmiyor.
 * Rozet zilinkinin AYNISI (aynı bileşen, aynı renk): iki rozet yan yana iki
 * farklı biçimde durmasın.
 *
 * YALNIZ OTURUM AÇIK ÖĞRENCİDE: kararı çağıran veriyor (Header:
 * `isLoggedIn && userRole === 'student'`); bu bileşen çizildiyse sayıları
 * soruyor.
 */
export const MesajKutusuDugmesi: React.FC<{
  onNavigate: (yol: string) => void;
  /** Rozet rengi — zilin rozetiyle aynı değer çağırandan. */
  renk?: string;
  /** Köşe ve renk; ölçü (44×44) ve `relative` her zaman buradan. */
  className?: string;
}> = ({ onNavigate, renk = '#2563EB', className }) => {
  const sayac = useMesajSayaclari(true);
  const toplam = sayac ? sayac.okunmamisSohbet + sayac.bekleyenIstek : null;
  return (
    <a
      href="/mesajlar"
      onClick={(olay) => {
        if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
        olay.preventDefault();
        onNavigate('/mesajlar');
      }}
      aria-label={toplam && toplam > 0 ? `Mesajlar, ${toplam} yeni` : 'Mesajlar'}
      /*
        Köşe taban dizede YOK, çağırandan: üst çubuk `rounded-xl` (zille
        aynı), Ağım çubuğu `rounded-full`. İkisi aynı dizede dursaydı
        hangisinin kazanacağı CSS sırasına kalırdı.
      */
      className={`relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center ${RENK_GECISI} ${
        className ?? 'rounded-xl text-gray-700 hover:bg-gray-100'
      } ${ODAK_HALKASI}`}
    >
      <MessageCircle aria-hidden className="h-6 w-6" />
      <BildirimRozeti sayi={toplam} renk={renk} />
    </a>
  );
};
