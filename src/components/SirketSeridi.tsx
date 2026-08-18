import React from 'react';
import { Layers } from 'lucide-react';

/**
 * Şirket şeridi — Instagram akışının üstündeki hikâye şeridinin karşılığı.
 *
 * NEDEN ŞİRKET
 * ------------
 * Instagram'da o şerit yuvarlak profil fotoğraflarından oluşuyor ve tek
 * tıkla o kişinin içeriğine götürüyor. Buradaki karşılığı şirket: elimizde
 * gerçek logolar var ve bir tık o şirketin ilanlarını süzüyor.
 *
 * Şehir ya da bölüm de olabilirdi ama ikisinin de yuvarlak bir görseli yok;
 * yuvarlak içine yazı koymak şeridi anlamsız bir düğme dizisine çevirirdi.
 *
 * HALKA NE ANLATIYOR
 * ------------------
 * Instagram'da renkli halka "okunmamış hikâye var" demek. Burada da bir
 * durum anlatıyor: son 24 saatte eklenmiş ilanı olan şirketin halkası
 * renkli.
 *
 * PENCERE NEDEN 24 SAAT
 * ---------------------
 * Önce yedi gündü. Ölçüldü: yayındaki on üç ilanın hepsi bir ile iki
 * buçuk günlüktü, yani ON ŞİRKETİN ONU DA "yeni" çıkıyordu. Hepsi renkli
 * olunca halka hiçbir şey ayırt etmiyor — dekordan farkı kalmıyor.
 *
 * 24 saat bugün gerçekten ayırıyor (on şirketten ikisi) ve otomasyon
 * saatte bir çalıştığı için ileride de ayırmaya devam edecek. Sakin bir
 * günde hiçbir halka yanmayabilir; bu bir kusur değil, doğru bilgi —
 * Instagram'da da okunmamış hikâye yoksa halka yanmıyor.
 */

const YENI_SAAT = 24;

export interface SeritSirketi {
  ad: string;
  logo?: string;
  adet: number;
  /** Son YENI_SAAT saat içinde eklenmiş ilanı var mı. */
  yeni: boolean;
}

/** Logo yoksa baş harfler. Avatar bileşeniyle aynı mantık, kare değil yuvarlak. */
function basHarfler(ad: string): string {
  const k = ad.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  if (k.length === 0) return '?';
  if (k.length === 1) return k[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  return (k[0][0] + k[1][0]).toLocaleUpperCase('tr-TR');
}

const Daire: React.FC<{
  etiket: string;
  altEtiket: string;
  secili: boolean;
  halka: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ etiket, altEtiket, secili, halka, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={`${etiket} — ${altEtiket}`}
    className="w-[76px] shrink-0 flex flex-col items-center gap-1.5 cursor-pointer group"
  >
    <span
      className="rounded-full p-[2.5px] transition-colors"
      style={
        secili
          ? { background: '#111827' }
          : halka
            ? { background: 'linear-gradient(135deg,#2563eb,#10b981)' }
            : { background: '#e5e7eb' }
      }
    >
      <span className="block rounded-full bg-white p-[2px]">
        <span className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-gray-50">
          {children}
        </span>
      </span>
    </span>
    <span className="w-full text-center">
      <span
        className={`block text-[11px] truncate ${
          secili ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'
        }`}
      >
        {etiket}
      </span>
      <span className="block text-[10px] text-gray-400 truncate">{altEtiket}</span>
    </span>
  </button>
);

export const SirketSeridi: React.FC<{
  sirketler: SeritSirketi[];
  secili: string[];
  toplam: number;
  onSec: (ad: string) => void;
  onTumu: () => void;
}> = ({ sirketler, secili, toplam, onSec, onTumu }) => {
  if (sirketler.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 py-3">
      <div className="overflow-x-auto px-3">
        <div className="flex gap-3 min-w-max">
          {/*
            İlk daire "Tümü" — Instagram'daki "Hikayen" gibi, şeridin
            başındaki sabit öğe. Süzgeç açıkken çıkış yolu bu; olmasaydı
            kullanıcı seçtiği şirketi tek tek geri tıklamak zorunda kalırdı.
          */}
          <Daire
            etiket="Tümü"
            altEtiket={`${toplam} ilan`}
            secili={secili.length === 0}
            halka={false}
            onClick={onTumu}
          >
            <Layers className="w-5 h-5 text-gray-500" />
          </Daire>

          {sirketler.map((s) => (
            <Daire
              key={s.ad}
              etiket={s.ad}
              altEtiket={s.yeni ? 'yeni ilan' : `${s.adet} ilan`}
              secili={secili.includes(s.ad)}
              halka={s.yeni}
              onClick={() => onSec(s.ad)}
            >
              {s.logo ? (
                <img
                  src={s.logo}
                  alt=""
                  className="w-full h-full object-contain p-1.5"
                  loading="lazy"
                  onError={(e) => {
                    /* Kırık logo yerine baş harfler; kırık görsel ikonu çirkin. */
                    const el = e.currentTarget;
                    el.style.display = 'none';
                    el.parentElement?.insertAdjacentHTML(
                      'beforeend',
                      `<span class="text-sm font-bold text-gray-500">${basHarfler(s.ad)}</span>`
                    );
                  }}
                />
              ) : (
                <span className="text-sm font-bold text-gray-500">{basHarfler(s.ad)}</span>
              )}
            </Daire>
          ))}
        </div>
      </div>
    </div>
  );
};
