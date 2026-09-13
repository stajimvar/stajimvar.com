import * as React from 'react';

/**
 * SAYFA ARAMASI — ÜST ÇUBUKTAKİ SİMGE İLE SAYFANIN KENDİ ARAMASI ARASINDA KÖPRÜ
 *
 * SORUN
 * -----
 * İlanlar, Fırsatlar ve Rehber telefonda sayfanın içinde geniş birer
 * arama kutusu çiziyordu. Üçü ayrı ayrı yazılmıştı ve arama durumu her
 * sayfanın kendi içindeydi. Üst çubuk ise paylaşılan tek bileşen: oraya
 * bir arama simgesi koymak, çubuğun o anki sayfanın aramasını bilmesini
 * gerektiriyor.
 *
 * ÇÖZÜM: DURUM YERİNDE KALIYOR, YALNIZ TUTAMAK TAŞINIYOR
 * ------------------------------------------------------
 * Sayfa kendi arama durumunu yönetmeye devam ediyor. Buraya yalnız bir
 * TUTAMAK bırakıyor: yer tutucu metni, değişiklik geri çağrısı ve varsa
 * süzgeç açma geri çağrısı. Üst çubuk bu tutamağı okuyup simgeleri
 * çiziyor.
 *
 * NEDEN ARAMA METNİ BURADA DEĞİL
 * ------------------------------
 * Metin bu bağlamda tutulsaydı her tuş vuruşu sağlayıcıyı — yani
 * uygulamanın kökünü — yeniden çizerdi. Metin üst çubuğun kendi yerel
 * durumunda; buradan aşağı tek yönlü akıyor. Sayfa, değeri kendi
 * durumunda tutmaya devam ediyor ve liste onu süzüyor.
 *
 * NEDEN BİR BAĞLAM (CONTEXT)
 * --------------------------
 * Üç sayfa da üst çubuğun ÇOCUĞU değil; App onları yan yana çiziyor.
 * Prop ile taşımak App'in üç sayfanın arama ayrıntısını bilmesi demekti.
 * Bağlam, kaydı yapan ile okuyanı birbirine bağlıyor ve arada kimse
 * taşımak zorunda kalmıyor.
 */

export interface SayfaAramaKapsami {
  /** Kutudaki yer tutucu; aynı zamanda erişilebilir ad. */
  yerTutucu: string;
  /** Kullanıcı yazdıkça çağrılıyor. Sayfa kendi durumunu güncelliyor. */
  onDegisti: (deger: string) => void;
  /** Süzgeç panelini açıp kapatıyor. Verilmezse süzgeç simgesi çizilmiyor. */
  onSuzgec?: () => void;
  /** Açık süzgeç sayısı; sıfırsa rozet çizilmiyor. */
  acikSuzgec?: number;
  /** Süzgeç paneli şu an açık mı — simgenin `aria-expanded` değeri. */
  suzgecAcik?: boolean;
}

interface BaglamDegeri {
  kapsam: SayfaAramaKapsami | null;
  kaydet: (kapsam: SayfaAramaKapsami | null) => void;
}

const Baglam = React.createContext<BaglamDegeri>({ kapsam: null, kaydet: () => {} });

export const SayfaAramaSaglayici: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [kapsam, setKapsam] = React.useState<SayfaAramaKapsami | null>(null);
  const deger = React.useMemo<BaglamDegeri>(() => ({ kapsam, kaydet: setKapsam }), [kapsam]);
  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>;
};

/** Üst çubuk tarafı: o anki sayfanın arama tutamağı (yoksa `null`). */
export function useSayfaAramasi(): SayfaAramaKapsami | null {
  return React.useContext(Baglam).kapsam;
}

/**
 * Sayfa tarafı: arama tutamağını kaydeder, sayfadan çıkınca siler.
 *
 * Geri çağrıların KARARLI olması gerekiyor (`useCallback`), yoksa her
 * çizimde yeni bir nesne kaydedilir ve sağlayıcı sonsuz döngüye girer.
 * Bağımlılık listesi bu yüzden alan alan yazılıyor, nesnenin kendisi
 * değil.
 */
export function useSayfaAramasiKaydet(kapsam: SayfaAramaKapsami | null): void {
  const { kaydet } = React.useContext(Baglam);
  const { yerTutucu, onDegisti, onSuzgec, acikSuzgec, suzgecAcik } = kapsam ?? {
    yerTutucu: '',
    onDegisti: undefined as unknown as (d: string) => void,
    onSuzgec: undefined,
    acikSuzgec: undefined,
    suzgecAcik: undefined,
  };

  React.useEffect(() => {
    if (!kapsam) {
      kaydet(null);
      return;
    }
    kaydet({ yerTutucu, onDegisti, onSuzgec, acikSuzgec, suzgecAcik });
    return () => kaydet(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(kapsam), yerTutucu, onDegisti, onSuzgec, acikSuzgec, suzgecAcik]);
}
