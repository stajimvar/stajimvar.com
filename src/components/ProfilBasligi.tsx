import React from 'react';
import { Camera, Check, ChevronRight, Loader2, Plus } from 'lucide-react';
import { adYazimi } from '../lib/ad';
import { Avatar } from './Avatar';
import { Button, Card, ProfileSectionCard, StatItem } from '../ui';

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

export interface OneCikan {
  id: string;
  etiket: string;
  /** Bölümde içerik var mı. Yoksa kesik çizgili çember ve "+" çiziliyor. */
  dolu: boolean;
  /**
   * Etiketin altındaki kısa satır: dolu bölümde sayı ("8 beceri"), boş
   * bölümde ne olacağı ("teste başla"). Başka bir yerde zaten yazan
   * sayılar için boş bırakılıyor.
   */
  alt?: string;
  ikon: React.ReactNode;
  /**
   * Boşken çizilecek ikon. Verilmezse "+" çiziliyor.
   *
   * "+" bir şey EKLEYECEĞİNİ söyler. Testler bölümünde ekleyecek bir şey
   * yok — orada çözülecek hazır testler var; "+" kullanıcıya test
   * oluşturacakmış gibi görünüyordu.
   */
  bosIkon?: React.ReactNode;
  onClick: () => void;
}

/** Eksik bir adım: adı ve gittiği yer. */
export interface EksikAdim {
  etiket: string;
  onClick: () => void;
}

/**
 * Bölüm listesi — iki sütunlu yatay kartlar.
 *
 * NEDEN DÖRT KÜÇÜK DAİRE DEĞİL
 * ----------------------------
 * Sekiz bölüm, dört sütunlu bir daire ızgarasındaydı. Mobilde sütun
 * başına ~80 piksel kalıyordu: "Programlar", "Beceriler" gibi başlıklar
 * nefes alamıyor, altlarındaki sayılar sıkışıyordu. Daireler ayrıca
 * avatarla aynı biçimi paylaşıyordu — biri kişi, öteki bölüm olduğu hâlde.
 *
 * Yatay kart aynı bilgiyi rahat veriyor ve TAMAMI tıklanabilir: küçük bir
 * daireyi hedeflemek gerekmiyor. İkon kutusu 40×40 yuvarlatılmış kare;
 * sitedeki bütün ikon kutularıyla aynı (src/ui/tokens.ts).
 *
 * KESİK ÇİZGİ KALKTI
 * ------------------
 * Boş bölümler kesik çizgili daireyle çiziliyordu ve "tamamlanmamış ya da
 * devre dışı" görünüyorlardı. Oysa hepsi çalışan bağlantılar. Kesik çizgi
 * artık yalnızca boş durum kutularında (src/ui/EmptyState.tsx).
 */
const Bolumler: React.FC<{ ogeler: OneCikan[]; secili?: string }> = ({ ogeler, secili }) => (
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
    {ogeler.map((o) => (
      <ProfileSectionCard
        key={o.id}
        ikon={o.dolu ? o.ikon : o.bosIkon || o.ikon}
        baslik={o.etiket}
        bilgi={o.alt}
        tamam={o.dolu}
        secili={o.id === secili}
        onClick={o.onClick}
      />
    ))}
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
  /*
    KART YALNIZCA KİMLİK VE ANA İŞLEMLER

    İçine kimlik, istatistik, iki düğme ve sekiz menü öğesi doldurulmuştu.
    Bölüm listesi karttan çıktı; kart artık avatar, bilgiler, tamamlanma
    durumu ve ana işlemlerden ibaret.
  */
  <div className="space-y-3 sm:space-y-4">
    <Card className="space-y-3 p-4 sm:space-y-4 sm:p-6">
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
        <StatItem deger={kaydedilenSayisi} etiket="kaydedilen" onClick={onKaydedilenlere} />
        <StatItem deger={basvuruSayisi} etiket="başvuru" onClick={onBasvurulara} />
        <StatItem deger={mulakatSayisi} etiket="mülakat" onClick={onMulakatlara} />
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
        /*
          Önce "Staj tercihlerini ekle →" yazıyordu ve hemen altındaki
          eksik listesinde zaten "şehir seç" ile "hedefini seç" duruyordu:
          aynı çağrı iki kez. Burası artık bir çağrı değil, biyografi
          satırının yerini tutan bir DURUM cümlesi. Tıklanabilirliği
          duruyor ama eksik listesiyle yarışmıyor.
        */
        <span className="block text-sm text-gray-600 group-hover:text-blue-700 transition-colors">
          Henüz staj tercihlerini belirtmedin.
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
      CV ANA DÜĞME, DÜZENLE İKİNCİL

      İki düğme de gri ve eşit ağırlıktaydı; "Profili düzenle" düz gri
      olduğu için tıklanabilir bile görünmüyordu — arayüzde gri dolgu
      genelde DEVRE DIŞI demek. İkincil düğme artık beyaz ve kenarlıklı
      (src/ui/Button.tsx).

      İndirme yerine görüntüleme: CV ekranında zaten indirme ve paylaşma
      var, buradan doğrudan indirmek eksik profille eksik bir dosya
      üretebiliyordu.
    */}
    <div className="flex gap-2">
      {onCv && (
        <Button onClick={onCv} tamGenislik>
          CV'ni görüntüle
        </Button>
      )}
      <Button tur="secondary" onClick={onDuzenle} tamGenislik>
        {eksikler.length > 0 ? 'Profilini tamamla' : 'Profili düzenle'}
      </Button>
    </div>
    </Card>

    <Bolumler ogeler={oneCikanlar} secili={secili} />
  </div>
);
