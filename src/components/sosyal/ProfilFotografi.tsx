import React from 'react';
import { Avatar } from '../Avatar';
import { profilFotografi } from '../../lib/profil-fotografi';
import { SOSYAL_AVATAR_KOVASI } from '../../lib/queries/sosyal';
import { useGorselAdresleri } from './useGorselAdresleri';
import { ODAK_HALKASI } from '../../lib/renk-token';
import { ProfilFotografiGoruntuleyici } from './ProfilFotografiGoruntuleyici';

/**
 * PROFİL FOTOĞRAFI — YOLDAN İNDİRİLEN DOSYAYA
 *
 * `social_profiles.avatar_path` bir depolama YOLU; tek başına hiçbir
 * yerde açılmıyor. Kova private (20260924020000) ve dosya, gösterileceği
 * anda kullanıcının OTURUMUYLA indiriliyor: her indirme okuma
 * politikasından (`avatar_dosyasi_gorunur`) yeniden geçiyor.
 *
 * İMZALI ADRES KALDIRILDI — ÖLÇÜM
 * -------------------------------
 * Bir kez verilen imza jetonu RLS'i yeniden sormuyordu: arşiv, bağlantı
 * kaldırma ve engel sonrasında eski imza hâlâ 200 dönerken yetkili
 * indirme 400 dönüyordu. Gerekçenin tamamı ve ölçüm tablosu
 * `useGorselAdresleri` ile `gorselIndir` başlıklarında. Buradaki adres
 * artık yalnız bu sekmenin belleğinde (`URL.createObjectURL`) ve
 * bileşen kalkınca bırakılıyor.
 *
 * İNDİRMEYİ BİLEŞEN KENDİ YAPIYOR
 * -------------------------------
 * Sayfa katmanına taşımak, dosyayı profil verisiyle birlikte önbelleğe
 * almak demekti; yetki profilin ömründen daha çabuk değişebiliyor. Aynı
 * kalıp `BaglantiDugmesi`de de var: kendi durumunu kendi okuyan küçük
 * bileşen.
 *
 * DÖRT DURUM, DÖRDÜ DE AYRI
 * -------------------------
 *   yol yok        baş harfler — fotoğraf gerçekten yok
 *   iniyor         nötr daire; baş harf YANIP SÖNMÜYOR (aşağıda)
 *   indi           fotoğrafın kendisi
 *   inemedi        baş harfler — kırık bir <img> değil
 *
 * BEKLERKEN BAŞ HARF ÇİZİLMİYOR
 * -----------------------------
 * Fotoğrafı olan bir profilde dosya gelene kadar baş harfleri çizmek,
 * her sayfa açılışında "fotoğrafı yok → var" diye bir yanıp sönme
 * üretirdi ve o ilk kare yanlış bilgi olurdu. Bekleme durumu bu yüzden
 * iskelet kalıbı: `animate-pulse`, sayfa iskeletinin kullandığı gri.
 *
 * YEDEK ADRES — TEK FOTOĞRAFIN ÖTEKİ UCU
 * --------------------------------------
 * Kullanıcının tek fotoğrafı var ve kaynağı `avatar_path`. Eski kamera
 * düğmesiyle yüklenmiş `student_profiles.avatar_url` ise SİLİNMEDİ:
 * yolu olmayan kullanıcı o adrese düşüyor, yani değişiklikle kimse
 * fotoğrafsız kalmıyor. Hangisinin kullanılacağı burada değil
 * `profilFotografi` içinde kararlaştırılıyor — karar tek yerde olmasa
 * her çağrı yerinde ayrı bir `??` olurdu ve biri unutulduğunda aynı
 * kullanıcı iki ekranda iki farklı fotoğrafla görünürdü.
 *
 * BÜYÜTME — DOKUNMA HEDEFİ YALNIZ FOTOĞRAF VARKEN DÜĞME
 * -----------------------------------------------------
 * `buyutme` verilirse ve ekranda gerçekten bir fotoğraf çiziliyorsa
 * (adres çözüldü) daire bir `<button>` oluyor ve tam ekran görüntüleyici
 * (`ProfilFotografiGoruntuleyici`) AYNI adresle açılıyor — ikinci bir
 * indirme ya da adres üretimi yok. Baş harf ve iskelet dallarında düğme
 * yok: büyütülecek fotoğraf yok, düğme de yok. Karar burada çünkü
 * adresin var olup olmadığını yalnız bu bileşen biliyor.
 */

interface FotografProps {
  /** Baş harf yedeği ve `alt` metni için; başlıkta görünen adın aynısı. */
  ad: string;
  /**
   * `social_profiles.avatar_path`.
   *
   * `null` = fotoğraf yok, `undefined` = sosyal satır HENÜZ OKUNMADI.
   * İkisi ayrı: bilinmeyeni "yok" saymak, yüklenmemiş bir satır için
   * baş harf çizip sonra fotoğrafa atlamak olurdu.
   */
  yol: string | null | undefined;
  /** `student_profiles.avatar_url` yedeği; yalnız sahibin kendi ekranlarında dolu. */
  yedekAdres?: string | null;
  /** Ölçü ve yuvarlaklık çağırandan geliyor: başlıkta ve formda farklı. */
  className?: string;
  /**
   * Verilirse fotoğraf dokununca tam ekran açılıyor. Alanlar
   * görüntüleyicinin eylemleri: `onPaylas` sayfanın var olan paylaşımı,
   * `kullaniciAdi` yalnız profil YAYINDAYKEN dolu (kopyalanacak adres),
   * `onFotografDegistir` yalnız SAHİBİNDE. Verilmezse (düzenleme bloğu,
   * bildirim satırları) bileşen eskisi gibi düz görsel.
   */
  buyutme?: {
    onPaylas?: () => void;
    kullaniciAdi?: string | null;
    onFotografDegistir?: () => void;
  };
}

/*
  Boş dizi her render'da yeniden üretilmesin diye modül düzeyinde:
  kanca yolların METNİNE bakıyor, yine de gereksiz bir dizi üretmiyoruz.
*/
const YOL_YOK: string[] = [];

export const ProfilFotografi: React.FC<FotografProps> = ({
  ad,
  yol,
  yedekAdres = null,
  className = '',
  buyutme,
}) => {
  const kaynak = profilFotografi(yol, yedekAdres);
  /* Görüntüleyici; kapalıyken DOM'da hiçbir şey yok. Kancalar koşulsuz. */
  const [acik, setAcik] = React.useState(false);
  const dugmeRef = React.useRef<HTMLButtonElement>(null);
  const kapat = React.useCallback(() => setAcik(false), []);
  /*
    İndirme yalnız 'yol' dalında anlamlı; kanca koşulsuz çağrılıyor çünkü
    React kancaları dallara giremez. Yol yokken liste boş ve istek atılmıyor.
  */
  const depolamaYolu = kaynak.tur === 'yol' ? kaynak.yol : null;
  const yollar = React.useMemo(
    () => (depolamaYolu ? [depolamaYolu] : YOL_YOK),
    [depolamaYolu],
  );
  const { durum, adresler } = useGorselAdresleri(SOSYAL_AVATAR_KOVASI, yollar);

  /* Satır henüz gelmedi ve elde yedek adres de yok: iskelet. */
  if (kaynak.tur === 'bilinmiyor') {
    return <div aria-hidden className={`animate-pulse bg-gray-100 ${className}`} />;
  }
  if (depolamaYolu && durum === 'yukleniyor') {
    return <div aria-hidden className={`animate-pulse bg-gray-100 ${className}`} />;
  }
  /*
    Gösterilecek adres: yedek adres doğrudan, depolama yolu indirilen
    dosyanın bellek adresi. İki kaynak tek değişkende toplanıyor ki
    büyütme kararı ("adres var mı") tek yerde verilsin.
  */
  const adres =
    kaynak.tur === 'adres' ? kaynak.adres : depolamaYolu ? (adresler.get(depolamaYolu) ?? null) : null;
  if (adres) {
    const gorsel = <Avatar name={ad} url={adres} className={className} />;
    if (!buyutme) return gorsel;
    return (
      <>
        {/*
          Gerçek düğme, `<a>` değil: görüntüleyicinin kalıcı adresi yok
          (`PaylasimDetayi` ile aynı gerekçe). `shrink-0` düğmede: kabın
          flex satırında görsel ezilmesin. Odak halkası daireyi izliyor.
        */}
        <button
          ref={dugmeRef}
          type="button"
          onClick={() => setAcik(true)}
          aria-haspopup="dialog"
          aria-expanded={acik}
          className={`block shrink-0 cursor-pointer rounded-full ${ODAK_HALKASI}`}
        >
          {gorsel}
          <span className="sr-only">Profil fotoğrafını büyüt</span>
        </button>
        {acik && (
          <ProfilFotografiGoruntuleyici
            adres={adres}
            ad={ad}
            tetikleyici={dugmeRef.current}
            onKapat={kapat}
            onPaylas={buyutme.onPaylas}
            kullaniciAdi={buyutme.kullaniciAdi}
            onFotografDegistir={buyutme.onFotografDegistir}
          />
        )}
      </>
    );
  }
  /*
    Baş harfler: yol yoksa (fotoğraf yok) ya da dosya inemediyse.
    İkinci dalda "fotoğraf gösterilemedi" diye ayrı bir kutu çizmek,
    profil başlığında sebebi kullanıcının çözemeyeceği bir hata satırı
    bırakırdı; `Avatar` kendi `onError` yedeğinde de aynı kararı veriyor.
  */
  return <Avatar name={ad} className={className} />;
};
