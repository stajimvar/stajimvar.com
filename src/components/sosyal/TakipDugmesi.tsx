import React from 'react';
import { Check } from 'lucide-react';
import { HAP, HAP_BIRINCIL } from './ProfilKimlikKalibi';
import { SosyalHata, takibiBirak, takipEdiyorMuyum, takipEt } from '../../lib/queries/sosyal';

/**
 * TAKİP DÜĞMESİ — İKİ DURUM, ONAY YOK
 *
 * Şirket sayfasında ziyaretçinin (öğrenci ya da başka şirket) gördüğü
 * tek eylem. Bağlantı düğmesinin yedi durumu burada yok: takip tek
 * yönlü ve onaysız, satır ya var ya yok.
 *
 *   takip etmiyor   "Takip et"         mavi dolu   → satır açılır
 *   takip ediyor    "Takip ediliyor"   çerçeveli   → satır silinir (onaysız)
 *
 * Bırakma onaysız: geri alması tek dokunuş ve yanlışlıkla bırakılan
 * takibin bir bedeli yok (istek yeniden gönderilmiyor, karşı tarafa
 * bildirim gitmiyor). Bağlantıyı kaldırmak onaylı, çünkü orada karşı
 * tarafın kabulü de siliniyor.
 *
 * İYİMSER GÜNCELLEME — BAĞLANTI DÜĞMESİNİN TERSİ
 * ----------------------------------------------
 * Bağlantıda durum sunucudan yeniden okunuyor çünkü karşı taraf aynı anda
 * kabul/ret yazmış olabilir. Takipte karşı taraf yazmıyor; sonucu yalnız
 * bu istek belirliyor. Düğme ve sayaç bu yüzden dokunuşta değişiyor,
 * sunucu reddederse ESKİ hâline dönüyor ve hata cümlesi bunu söylüyor.
 *
 * SIFIR SATIR / DÜĞME YOK
 * -----------------------
 * Bileşen `bakanId` isteyerek kuruluyor; sahibin kendi sayfasında ve
 * oturumsuz ziyaretçide (o zaten sayfayı görmüyor) hiç çizilmiyor —
 * kararı çağıran veriyor (`SirketSayfasi`). Şirket → öğrenci yönü de
 * burada değil: öğrenci profilinde bu bileşen çağrılmıyor ve sunucu o
 * yönde satırı zaten reddediyor (`takip_edilebilir`).
 *
 * HAP BİÇİMİ, "BAĞLANTI KUR" İLE AYNI KALIP (kullanıcı onayı, 24 Eylül
 * 2026): düğme şirket profilinin hap sırasında duruyor. Biçim
 * `ProfilKimlikKalibi`nden — "Takip et" eylem çağrısı, dolu hap
 * (`HAP_BIRINCIL`); "Takip ediliyor" durum, çerçeveli hap (`HAP`). İki
 * durum aynı yükseklikte (44 piksel) ki geçişte sayfa zıplamasın.
 */

interface TakipDugmesiProps {
  /** Bakan kişinin oturum kimliği. */
  bakanId: string;
  /** Sayfası görüntülenen şirketin kimliği (`social_profiles.profile_id`). */
  hedefId: string;
  /**
   * Takipçi sayacına yansıyacak fark: +1 takip, -1 bırakma. Geri alma da
   * buradan geçiyor (ters işaret) ki sayaç düğmeyle aynı anda dönsün.
   */
  onTakipciFarki: (fark: 1 | -1) => void;
}

/*
  `disabled:` sınıfları kalıbın dizesine EKLENİYOR, değiştirmiyor: kalıpta
  karşılıkları yok, çakışma doğmuyor.

  SABİT ALT GENİŞLİK `min-w-40` (160 piksel): iki durumun metni farklı
  uzunlukta ("Takip et" / onay işaretli "Takip ediliyor"). Genişlik
  metne göre değişseydi dokunuşta hap sırası kayar ve parmağın altındaki
  düğme yer değiştirirdi. Ölçüldü (Chromium): doğal genişlik "Takip et"
  83.9, "Takip ediliyor" 144.2 piksel. `min-w-36` (144) uzun durumu 0.2
  piksel farkla karşılamıyordu; 160 ikisini de aynı genişlikte tutuyor.
  Eski `w-full sm:w-auto sm:min-w-52` kalktı:
  düğme artık avatarın yanındaki hap sırasında, tam genişlikte değil.
*/
const DOLU = `${HAP_BIRINCIL} min-w-40 disabled:cursor-default disabled:opacity-40`;
const CERCEVELI = `${HAP} min-w-40 disabled:cursor-default disabled:opacity-40`;

export const TakipDugmesi: React.FC<TakipDugmesiProps> = ({ bakanId, hedefId, onTakipciFarki }) => {
  const [takipEdiyor, setTakipEdiyor] = React.useState<boolean | null>(null);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [islemde, setIslemde] = React.useState(false);
  const [hataMesaji, setHataMesaji] = React.useState<string | null>(null);

  React.useEffect(() => {
    let iptal = false;
    setDurum('yukleniyor');
    takipEdiyorMuyum(hedefId)
      .then((sonuc) => {
        if (iptal) return;
        setTakipEdiyor(sonuc);
        setDurum('hazir');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [hedefId]);

  /*
    Tek eylem yolu: kilit, iyimser yazma, geri alma ve hata cümlesi aynı
    yerden. İki işleyici olsaydı biri geri almayı unuturdu ve ekranda
    sunucuda olmayan bir takip kalırdı.
  */
  const degistir = async () => {
    if (islemde || takipEdiyor === null) return;
    const onceki = takipEdiyor;
    const yeni = !onceki;
    setIslemde(true);
    setHataMesaji(null);
    setTakipEdiyor(yeni);
    onTakipciFarki(yeni ? 1 : -1);
    try {
      if (yeni) await takipEt(bakanId, hedefId);
      else await takibiBirak(bakanId, hedefId);
    } catch (sorun) {
      setTakipEdiyor(onceki);
      onTakipciFarki(yeni ? -1 : 1);
      setHataMesaji(
        sorun instanceof SosyalHata
          ? sorun.message
          : yeni
            ? 'Takip edilemedi. Takibinde bir değişiklik olmadı.'
            : 'Takip bırakılamadı. Takibin duruyor.',
      );
    } finally {
      setIslemde(false);
    }
  };

  if (durum === 'yukleniyor') {
    return (
      <div aria-busy="true" className="flex">
        <span aria-hidden className="h-11 w-40 animate-pulse rounded-full bg-gray-100" />
      </div>
    );
  }

  if (durum === 'hata') {
    return (
      <p role="alert" className="text-sm text-gray-600">
        Takip durumu alınamadı.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={islemde}
        aria-pressed={takipEdiyor === true}
        onClick={() => void degistir()}
        className={takipEdiyor ? CERCEVELI : DOLU}
      >
        {takipEdiyor && <Check aria-hidden className="h-4 w-4" />}
        {takipEdiyor ? 'Takip ediliyor' : 'Takip et'}
      </button>
      {hataMesaji && (
        <p role="alert" className="text-xs font-semibold leading-relaxed text-rose-700">
          {hataMesaji}
        </p>
      )}
    </div>
  );
};
