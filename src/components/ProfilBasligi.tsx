import React from 'react';
import { Camera, Loader2, Plus } from 'lucide-react';
import { Avatar } from './Avatar';

/**
 * Profil başlığı — Instagram profil düzeninin bu ürüne çevrilmiş hâli.
 *
 * NEDEN BU DÜZEN
 * --------------
 * Eski başlık bir "kimlik kartı"ydı: fotoğraf, ad, okul ve bir ilerleme
 * çubuğu. Bilgi doğruydu ama sayfa kendini tanıtmıyordu — öğrenci profiline
 * girdiğinde ne yapması gerektiğini anlamıyordu.
 *
 * Instagram'ın profil başlığı bu işi üç öğeyle çözüyor ve üçü de burada
 * karşılığını buluyor:
 *
 *   halka   -> orada hikâye var mı; burada PROFİL NE KADAR DOLU
 *   sayılar -> gönderi/takipçi/takip; burada başvuru/beceri/doluluk
 *   düğmeler-> düzenle/paylaş; burada düzenle/CV indir
 *
 * KOPYALAMADIĞIMIZ ŞEY
 * --------------------
 * Halkayı dekor olarak almadık. Instagram'da halka bir durumu anlatıyor
 * (okunmamış hikâye var). Burada da bir durumu anlatıyor: yüzde kaç dolu.
 * Anlamı olmayan bir halka, taklit olurdu.
 *
 * Sayılar da uydurma değil: üçü de gerçekten sayılabilen şeyler. "Profil
 * görüntülenme" gibi ölçmediğimiz bir sayı koymak, boş bir vaat olurdu.
 */

/** Doluluk halkası. Konik degrade ile çiziliyor; ek bir kütüphane yok. */
const Halka: React.FC<{ oran: number; children: React.ReactNode }> = ({ oran, children }) => {
  const renk = oran === 100 ? '#10b981' : '#2563eb';
  return (
    <div
      className="rounded-full p-[3px] shrink-0"
      style={{
        background: `conic-gradient(${renk} ${oran * 3.6}deg, #e5e7eb ${oran * 3.6}deg)`,
      }}
    >
      {/* Beyaz ara halka: dolu kısmın nerede bittiğini gözle ayırıyor. */}
      <div className="rounded-full bg-white p-[3px]">{children}</div>
    </div>
  );
};

const Sayi: React.FC<{ deger: number | string; etiket: string; onClick?: () => void }> = ({
  deger,
  etiket,
  onClick,
}) => {
  const icerik = (
    <>
      <span className="block text-lg sm:text-xl font-extrabold text-gray-900 tabular-nums leading-tight">
        {deger}
      </span>
      <span className="block text-xs text-gray-500 leading-tight">{etiket}</span>
    </>
  );
  if (!onClick) return <div className="text-center">{icerik}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-center cursor-pointer rounded-lg px-2 py-1 -mx-2 hover:bg-gray-50 transition-colors"
    >
      {icerik}
    </button>
  );
};

export interface OneCikan {
  id: string;
  etiket: string;
  /** Dolu olanlarda içerik özeti; boş olanlarda ekleme çağrısı. */
  deger: string | null;
  ikon: React.ReactNode;
  onClick: () => void;
}

/**
 * Öne çıkanlar şeridi — Instagram'ın hikâye vurguları.
 *
 * Orada geçmiş hikâyeler duruyor; burada profilin bölümleri duruyor. Dolu
 * olan bölüm içeriğinin özetini gösteriyor, boş olan "+" ile ekleme
 * çağrısı yapıyor. Yani şerit hem gezinme hem eksik listesi.
 */
const OneCikanlar: React.FC<{ ogeler: OneCikan[] }> = ({ ogeler }) => (
  <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
    <div className="flex gap-4 sm:gap-5 min-w-max pb-1">
      {ogeler.map((o) => {
        const dolu = Boolean(o.deger);
        return (
          <button
            key={o.id}
            type="button"
            onClick={o.onClick}
            className="w-[72px] shrink-0 flex flex-col items-center gap-1.5 cursor-pointer group"
            title={o.deger || `${o.etiket} ekle`}
          >
            <span
              className={`w-16 h-16 rounded-full flex items-center justify-center border transition-colors ${
                dolu
                  ? 'bg-gray-50 border-gray-200 text-gray-700 group-hover:border-blue-400'
                  : 'bg-white border-dashed border-gray-300 text-gray-400 group-hover:border-blue-400 group-hover:text-blue-500'
              }`}
            >
              {dolu ? o.ikon : <Plus className="w-5 h-5" />}
            </span>
            <span className="w-full text-center">
              <span className="block text-[11px] font-semibold text-gray-800 truncate">
                {o.etiket}
              </span>
              <span className="block text-[10px] text-gray-400 truncate">
                {o.deger || 'ekle'}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

interface Props {
  ad: string;
  avatarUrl?: string;
  okul: string;
  bolum?: string;
  sinif: string;
  bio?: string;
  oran: number;
  basvuruSayisi: number;
  beceriSayisi: number;
  oneCikanlar: OneCikan[];
  avatarYukleniyor: boolean;
  onFotografSec: () => void;
  onDuzenle: () => void;
  onCv?: () => void;
  onBasvurulara?: () => void;
}

export const ProfilBasligi: React.FC<Props> = ({
  ad,
  avatarUrl,
  okul,
  bolum,
  sinif,
  bio,
  oran,
  basvuruSayisi,
  beceriSayisi,
  oneCikanlar,
  avatarYukleniyor,
  onFotografSec,
  onDuzenle,
  onCv,
  onBasvurulara,
}) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-5">
    {/*
      Instagram'daki gibi: fotoğraf solda, sayılar sağda, ad ve açıklama
      altta. Mobilde de aynı — orada da bu düzen çalışıyor ve zaten
      herkesin bildiği bir yerleşim.
    */}
    <div className="flex items-center gap-4 sm:gap-8">
      <button
        type="button"
        onClick={onFotografSec}
        className="relative cursor-pointer shrink-0"
        title="Fotoğrafını değiştir"
      >
        <Halka oran={oran}>
          <Avatar
            name={ad}
            url={avatarUrl || undefined}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full text-2xl sm:text-3xl"
          />
        </Halka>
        <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white">
          {avatarYukleniyor ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Camera className="w-3.5 h-3.5" />
          )}
        </span>
      </button>

      <div className="flex-1 flex items-center justify-around sm:justify-start sm:gap-10">
        <Sayi deger={basvuruSayisi} etiket="başvuru" onClick={onBasvurulara} />
        <Sayi deger={beceriSayisi} etiket="beceri" />
        <Sayi deger={`%${oran}`} etiket="profil" />
      </div>
    </div>

    <div className="space-y-0.5">
      <h1 className="text-base font-bold text-gray-900">{ad}</h1>
      <p className="text-sm text-gray-500">
        {okul || 'Okulun eksik'}
        {bolum ? ` · ${bolum}` : ''}
      </p>
      <p className="text-sm text-gray-400">{sinif}</p>
      {bio && <p className="text-sm text-gray-700 leading-relaxed pt-1.5">{bio}</p>}
    </div>

    {/*
      İki geniş düğme — Instagram'daki "Düzenle / Profili paylaş" hizası.
      İkincisi paylaşım değil CV indirme: bu üründe öğrencinin elindeki
      somut çıktı o.
    */}
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onDuzenle}
        className="flex-1 py-2 rounded-xl text-sm font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
      >
        Profili düzenle
      </button>
      {onCv && (
        <button
          type="button"
          onClick={onCv}
          className="flex-1 py-2 rounded-xl text-sm font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
        >
          CV'ni indir
        </button>
      )}
    </div>

    <OneCikanlar ogeler={oneCikanlar} />
  </div>
);
