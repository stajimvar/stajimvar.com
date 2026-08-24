import React from 'react';
import { Camera, Check, ChevronRight, Loader2, Plus } from 'lucide-react';
import { adYazimi } from '../lib/ad';
import { Avatar } from './Avatar';

/**
 * Profil başlığı — öğrencinin kişisel kontrol paneli.
 *
 * NEDEN "KİMLİK KARTI" DEĞİL
 * --------------------------
 * Başlık uzun süre bir kimlik kartıydı: fotoğraf, ad, okul, birkaç sayı.
 * Bilgi doğruydu ama öğrenciye BUGÜN ne yapması gerektiğini söylemiyordu.
 * Artık üç şeyi birden söylüyor: kim olduğunu, sürecinin nerede olduğunu
 * (kaydedilen / başvuru / mülakat) ve sıradaki eksik adımı.
 *
 * SAYILAR TEK KAYNAKTAN
 * ---------------------
 * Üstte "13 beceri" yazarken alttaki şeritte "Beceriler · 8 tane"
 * yazıyordu: üstteki üçünün toplamıydı (program + beceri + dil), alttaki
 * yalnızca sosyal becerilerdi. Aynı kelime, iki sayı. Aynı kelimeyi iki
 * farklı şey için kullanmak, sayının kendisinden daha kötü bir hata.
 *
 * "Beceri" sayısı üstten tamamen kalktı. Yerine öğrencinin sürecini
 * anlatan üçlü geldi; her biri TEK bir kaynaktan sayılıyor ve her biri
 * kendi listesine gidiyor. Sayıya basınca gittiği yerde aynı sayıyı
 * göremiyorsa, sayı yanlıştır.
 *
 * DOLULUK HALKASI
 * ---------------
 * Yüzde hem halkada hem sayılarda duruyordu — aynı bilgi iki kez. Halkada
 * kaldı (Instagram'daki gibi bir DURUMU anlatıyor: profil ne kadar dolu),
 * sayılardan çıktı. Yüzdenin kendisi de artık tıklanabilir bir cümle:
 * yüzde tek başına ne yapılacağını söylemiyor, eksik adımın adı söylüyor.
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
  /** Bölümde içerik var mı. Yoksa kesik çizgili çember ve "+" çiziliyor. */
  dolu: boolean;
  /**
   * Etiketin altındaki kısa sayı: "8 beceri". Başka bir yerde zaten
   * yazan sayılar için boş bırakılıyor.
   */
  alt?: string;
  ikon: React.ReactNode;
  onClick: () => void;
}

/** Eksik bir adım: adı ve gittiği yer. */
export interface EksikAdim {
  etiket: string;
  onClick: () => void;
}

/**
 * Bölüm ızgarası.
 *
 * NEDEN YATAY KAYDIRMA DEĞİL
 * --------------------------
 * Şerit yatay kayıyordu ve sağ kenarda hep yarım bir daire kalıyordu;
 * altındaki açıklamalar da tek satıra sığmayıp kesiliyordu ("Giyim
 * Üretim…"). Yarım ikon kaydırılabilirliği anlatıyor ama burada sekiz
 * bölümün hepsi ekrana zaten sığıyor: dört sütunlu ızgarada iki satır
 * ediyor, hiçbir şey kesilmiyor ve kaydırma gerekmiyor.
 *
 * SAYI NEDEN ROZET DEĞİL
 * ----------------------
 * Sayılar bir ara dairenin köşesinde mavi rozet olarak duruyordu.
 * Rozet arayüzde belirli bir şey söyler: "burada senin görmediğin yeni
 * bir şey var". Oysa bu sayılar öğrencinin kendi girdiği ve zaten bildiği
 * şeyler — okunmamış bildirim gibi görünüp boşuna dikkat çekiyorlardı.
 * Mavi rozet gerçekten yeni bir duruma saklanıyor.
 *
 * Sayı artık etiketin altında sade gri bir satır: "8 beceri". Kesilme
 * riski yok çünkü metinler kısa; uzun olan tek şey bölüm adıydı, o da
 * artık sayı içermiyor.
 */
const Bolumler: React.FC<{ ogeler: OneCikan[]; secili?: string }> = ({ ogeler, secili }) => (
  <div className="grid grid-cols-4 gap-x-1 gap-y-2.5">
    {ogeler.map((o) => {
      const acik = o.id === secili;
      return (
        <button
          key={o.id}
          type="button"
          onClick={o.onClick}
          className="flex flex-col items-center gap-1 cursor-pointer group min-w-0"
          title={o.alt || `${o.etiket} ekle`}
        >
          {/*
            Seçili olan MARKA MAVİSİ. Önce siyahtı: sitenin geri kalanında
            seçili olan her şey mavi, yalnızca burada siyahtı ve ayrı bir
            anlamı varmış gibi duruyordu.
          */}
          <span
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              acik
                ? 'bg-blue-600 border-2 border-blue-600 text-white'
                : o.dolu
                  ? 'bg-gray-50 border border-gray-200 text-gray-700 group-hover:border-blue-400'
                  : 'bg-white border border-dashed border-gray-300 text-gray-400 group-hover:border-blue-400 group-hover:text-blue-500'
            }`}
          >
            {o.dolu ? o.ikon : <Plus className="w-5 h-5" />}
          </span>
          <span className="w-full text-center px-0.5">
            <span
              className={`block text-[10px] leading-tight ${
                acik ? 'font-bold text-blue-700' : 'font-semibold text-gray-700'
              }`}
            >
              {o.etiket}
            </span>
            {o.alt && (
              <span className="block text-[10px] leading-tight text-gray-400">{o.alt}</span>
            )}
          </span>
        </button>
      );
    })}
  </div>
);

interface Props {
  ad: string;
  avatarUrl?: string;
  okul: string;
  bolum?: string;
  sinif: string;
  /**
   * Ne aradığı — tercihlerinden üretilen iki satır.
   *
   * `basSatir` zamanı söylüyor ("2026 yaz stajına açığım"), `altSatir`
   * koşulları ("İstanbul · Hibrit"). İkisi de boşsa tercih girilmemiştir
   * ve yerine kısa bir çağrı çiziliyor.
   */
  durum: { basSatir: string | null; altSatir: string | null };
  onEtiketDuzenle: () => void;
  oran: number;
  eksikler: EksikAdim[];
  kaydedilenSayisi: number;
  basvuruSayisi: number;
  mulakatSayisi: number;
  oneCikanlar: OneCikan[];
  /** Aşağıda hangi bölümün açık olduğu; ızgarada işaretleniyor. */
  secili?: string;
  avatarYukleniyor: boolean;
  onFotografSec: () => void;
  onDuzenle: () => void;
  onCv?: () => void;
  onKaydedilenlere?: () => void;
  onBasvurulara?: () => void;
  onMulakatlara?: () => void;
}

export const ProfilBasligi: React.FC<Props> = ({
  ad,
  avatarUrl,
  okul,
  bolum,
  sinif,
  durum,
  onEtiketDuzenle,
  oran,
  eksikler,
  kaydedilenSayisi,
  basvuruSayisi,
  mulakatSayisi,
  oneCikanlar,
  secili,
  avatarYukleniyor,
  onFotografSec,
  onDuzenle,
  onCv,
  onKaydedilenlere,
  onBasvurulara,
  onMulakatlara,
}) => (
    /*
    Bloklar arası boşluk mobilde 16'dan 12 piksele indi. Kartta yedi blok
    var; her boşluktan kazanılan 4 piksel, altındaki başvuru bölümünü 24
    piksel yukarı çekiyor. Geniş ekranda yer sorunu yok, orada 16 kalıyor.
  */
  <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-3 sm:space-y-4">
    <div className="flex items-center gap-4 sm:gap-8">
      <button
        type="button"
        onClick={onFotografSec}
        className="relative cursor-pointer shrink-0"
        title={`Fotoğrafını değiştir — profilin %${oran} dolu`}
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

      {/*
        SÜREÇ ÜÇLÜSÜ

        Eskiden "başvuru / beceri / profil" duruyordu. "Beceri" öğrencinin
        sürecine dair bir şey söylemiyor (kaç beceri girdiğini zaten
        kendisi biliyor) ve alttaki şeritle çelişiyordu; "profil" yüzdesi
        de halkanın tekrarıydı.

        Üçü de aynı hikâyenin adımları: baktım → başvurdum → çağrıldım.
      */}
      <div className="flex-1 flex items-center justify-around sm:justify-start sm:gap-8">
        <Sayi deger={kaydedilenSayisi} etiket="kaydedilen" onClick={onKaydedilenlere} />
        <Sayi deger={basvuruSayisi} etiket="başvuru" onClick={onBasvurulara} />
        <Sayi deger={mulakatSayisi} etiket="mülakat" onClick={onMulakatlara} />
      </div>
    </div>

    <div className="space-y-0.5">
      <h1 className="text-base font-bold text-gray-900">{adYazimi(ad)}</h1>
      {/*
        Sınıf ayrı satırdaydı; okul satırının devamı olduğu için tek
        satırda birleşti. Kart yüksekliğinden bir satır kazanmak,
        altındaki başvuru bölümünü o kadar yukarı çekiyor.
      */}
      <p className="text-sm text-gray-500">
        {okul || 'Okulun eksik'}
        {bolum ? ` · ${bolum}` : ''}
        {sinif ? ` · ${sinif}` : ''}
      </p>
    </div>

    {/*
      NE ARADIĞI, TERCİHLERİNDEN

      Başlıkta "Staj yapmak için yer arıyorum" yazıyordu: herkeste aynı
      cümle. Onun yerine öğrencinin GERÇEK tercihleri okunuyor — böylece
      hem kişiye özel bir şey yazıyor hem de yazan şey ilanları süzen
      veriyle aynı veri.

      Boşken metin bir talimat değil, tek dokunuşluk bir çağrı: "Ne
      aradığını yaz" ne yapılacağını anlatıyordu, "Staj tercihlerini ekle"
      nereye gidileceğini söylüyor.
    */}
    <button
      type="button"
      onClick={onEtiketDuzenle}
      className="block w-full text-left cursor-pointer group"
    >
      {durum.basSatir || durum.altSatir ? (
        <>
          {durum.basSatir && (
            <span className="block text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
              {durum.basSatir}
            </span>
          )}
          {durum.altSatir && (
            <span className="block text-xs text-gray-500">{durum.altSatir}</span>
          )}
        </>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
          Staj tercihlerini ekle
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      )}
    </button>

    {/*
      YÜZDE TIKLANABİLİR BİR CÜMLE

      "%70 profil" bir sayıydı ve öğrenci ondan bir sonraki hareketi
      çıkaramıyordu. Eksik adımların ADI yazıyor ve her biri kendi
      bölümünü açıyor: yüzde artık bir ölçü değil, bir yapılacaklar listesi.
    */}
    {eksikler.length > 0 && (
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5 space-y-1.5">
        <p className="text-xs font-bold text-blue-900">
          Profilin %{oran} tamamlandı · {eksikler.length} adım kaldı
        </p>
        <div className="flex flex-wrap gap-1.5">
          {eksikler.slice(0, 3).map((eksik) => (
            <button
              key={eksik.etiket}
              type="button"
              onClick={eksik.onClick}
              className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-700 bg-white border border-blue-200 rounded-full pl-2.5 pr-1.5 py-1 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              {eksik.etiket}
              <ChevronRight className="w-3 h-3" />
            </button>
          ))}
        </div>
      </div>
    )}

    {/*
      TAMAMLANINCA KART KÜÇÜLÜYOR

      Eksik listesi profil dolduğunda anlamsız bir yer kaplıyordu ve
      altındaki başvuru bölümünü aşağı itiyordu. Kutu tamamen kalkıyor,
      yerine tek satır kalıyor.
    */}
    {eksikler.length === 0 && (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
        <Check className="w-3.5 h-3.5" />
        Profilin tamamlandı
      </p>
    )}

    {/*
      ANA DÜĞME EKSİK VARSA "TAMAMLA"

      İki düğme de gri ve eşit ağırlıktaydı; eksik profilden indirilen CV
      de eksik çıkıyordu. Profil doluyken ana eylem düzenlemek değil, o
      yüzden %100'de mavi düğme CV'ye geçiyor.
    */}
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onDuzenle}
        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
          eksikler.length > 0
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
        }`}
      >
        {eksikler.length > 0 ? 'Profilini tamamla' : 'Profili düzenle'}
      </button>
      {onCv && (
        <button
          type="button"
          onClick={onCv}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
            eksikler.length > 0
              ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          CV'ni indir
        </button>
      )}
    </div>

    <Bolumler ogeler={oneCikanlar} secili={secili} />
  </div>
);
