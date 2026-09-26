import React from 'react';
import { ODAK_HALKASI } from '../../lib/renk-token';

/*
  PAYLAŞIM AÇIKLAMASI — KISA ÖNİZLEME, "DAHA FAZLA" İLE AÇILIYOR
  (kullanıcı kararı, 26 Eylül 2026)

  Akışta açıklama görselin altında; uzun metin kartı uzatıp sonraki
  gönderiyi aşağı itiyordu. 95 harften uzunsa önizleme tek satıra
  indirilmiş metnin başı (son kelime yarım kalmasın diye son boşluktan
  kesiliyor, boşluk çok gerideyse harften), yanında "… daha fazla".
  Açılınca metin satır sonlarıyla olduğu gibi, yanında "daha az".

  Harf sayımı `Array.from` ile: emoji ve birleşik karakterler ikiye
  bölünmesin. Metin değişirse (başka gönderi) yeniden kapalı başlıyor.
  Diyalogda (`kisaltilsin={false}`) metin hep tam.
*/
const ONIZLEME_UZUNLUGU = 95;

function onizlemeMetni(metin: string): string | null {
  const tekSatir = metin.trim().replace(/\s+/g, ' ');
  const harfler = Array.from(tekSatir);
  if (harfler.length <= ONIZLEME_UZUNLUGU) return null;
  const bolum = harfler.slice(0, ONIZLEME_UZUNLUGU).join('');
  const sonBosluk = bolum.lastIndexOf(' ');
  return sonBosluk > ONIZLEME_UZUNLUGU / 2 ? bolum.slice(0, sonBosluk) : bolum;
}

interface Props {
  metin: string;
  yazar?: string;
  onYazarAc?: () => void;
  kisaltilsin?: boolean;
  className?: string;
}

export const PaylasimAciklamasi: React.FC<Props> = ({
  metin,
  yazar,
  onYazarAc,
  kisaltilsin = true,
  className = '',
}) => {
  const [acik, setAcik] = React.useState(false);
  React.useEffect(() => setAcik(false), [metin]);
  const onizleme = kisaltilsin ? onizlemeMetni(metin) : null;

  return (
    <p className={`break-words text-sm leading-relaxed text-gray-900 ${className}`}>
      {yazar && (
        <button
          type="button"
          onClick={onYazarAc}
          className={`mr-1.5 font-bold ${onYazarAc ? 'cursor-pointer' : 'cursor-default'} ${ODAK_HALKASI}`}
        >
          {yazar}
        </button>
      )}
      <span className={acik || !onizleme ? 'whitespace-pre-line' : undefined}>
        {onizleme && !acik ? onizleme : metin}
      </span>
      {onizleme && (
        <>
          {acik ? ' ' : '… '}
          <button
            type="button"
            onClick={() => setAcik((onceki) => !onceki)}
            aria-expanded={acik}
            className={`font-medium text-gray-500 hover:text-gray-800 cursor-pointer ${ODAK_HALKASI}`}
          >
            {acik ? 'daha az' : 'daha fazla'}
          </button>
        </>
      )}
    </p>
  );
};
