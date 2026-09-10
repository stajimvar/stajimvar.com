import React from 'react';
import { Lock } from 'lucide-react';
import { BIRINCIL_EYLEM, ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import { SosyalHata, sosyalProfilGuncelle, type SosyalProfil } from '../../lib/queries/sosyal';
import { biyografiHatasi } from '../../lib/sosyal-kullanici-adi.mjs';
import { BiyografiAlani, KayitHatasi, MetinAlani } from './SosyalFormAlanlari';

/**
 * PROFİL DÜZENLEME
 *
 * KULLANICI ADI VE ALAN BURADA DEĞİŞMİYOR
 * ---------------------------------------
 * İkisi de yalnız okunur olarak gösteriliyor, düzenlenebilir bir kutu
 * olarak DEĞİL:
 *
 *   · Kullanıcı adı kalıcı adres. Değişseydi paylaşılmış her bağlantı
 *     kırılır, üstelik eski ad serbest kalıp başkasına verilebilirdi.
 *   · Alan (sektör) görünürlük sınırı ve veritabanı tetikleyicisi
 *     değişimi zaten reddediyor (`sektor_kilidi`). Düzenlenebilir bir
 *     kutu çizmek, sunucunun reddedeceği bir işi kullanıcıya yaptırmak
 *     olurdu.
 *
 * Devre dışı bir giriş kutusu da çizilmiyor: kapalı bir kutu "burası
 * ileride açılacak" diye okunuyor. Değerler düz metin.
 */

interface DuzenlemeProps {
  kullaniciId: string;
  profil: SosyalProfil;
  onKaydedildi: (girdi: {
    gorunenAd: string | null;
    biyografi: string | null;
    bolumEtiketi: string | null;
    sinifEtiketi: string | null;
    sehir: string | null;
  }) => void;
  onVazgec: () => void;
}

const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';

/** Boş metin veritabanına NULL gidiyor; ekranda da boş satır çizilmiyor. */
function bosNull(deger: string): string | null {
  const metin = deger.trim();
  return metin === '' ? null : metin;
}

export const SosyalProfilDuzenleme: React.FC<DuzenlemeProps> = ({
  kullaniciId,
  profil,
  onKaydedildi,
  onVazgec,
}) => {
  const [gorunenAd, setGorunenAd] = React.useState(profil.gorunenAd ?? '');
  const [biyografi, setBiyografi] = React.useState(profil.biyografi ?? '');
  const [bolum, setBolum] = React.useState(profil.bolumEtiketi ?? '');
  const [sinif, setSinif] = React.useState(profil.sinifEtiketi ?? '');
  const [sehir, setSehir] = React.useState(profil.sehir ?? '');
  const [kaydediliyor, setKaydediliyor] = React.useState(false);
  const [kayitHatasi, setKayitHatasi] = React.useState<string | null>(null);

  const bioHatasi = biyografiHatasi(biyografi);

  const gonder = async (olay: React.FormEvent) => {
    olay.preventDefault();
    setKayitHatasi(null);
    if (bioHatasi || kaydediliyor) return;

    setKaydediliyor(true);
    try {
      await sosyalProfilGuncelle(kullaniciId, {
        gorunenAd,
        biyografi,
        bolumEtiketi: bolum,
        sinifEtiketi: sinif,
        sehir,
      });
      /*
        Ekrandaki profil ancak yazma BAŞARILI olduktan sonra
        güncelleniyor. İyimser güncelleme burada yanlış olurdu: yazma
        başarısızsa kullanıcı ekranda gördüğü değerin kaydedildiğini
        sanırdı.
      */
      onKaydedildi({
        gorunenAd: bosNull(gorunenAd),
        biyografi: bosNull(biyografi),
        bolumEtiketi: bosNull(bolum),
        sinifEtiketi: bosNull(sinif),
        sehir: bosNull(sehir),
      });
    } catch (sorun) {
      setKayitHatasi(
        sorun instanceof SosyalHata
          ? sorun.message
          : 'Profil güncellenemedi. Bağlantını kontrol edip yeniden dene.',
      );
      setKaydediliyor(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1.5">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
          Profili düzenle
        </h1>
      </header>

      <form onSubmit={gonder} className="space-y-4" noValidate>
        <div className={`${KART} space-y-2.5`}>
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <span>Kullanıcı adı, bölüm ve alan değiştirilemiyor.</span>
          </div>
          <dl className="space-y-1.5 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="font-bold text-gray-900">Kullanıcı adı</dt>
              <dd className="text-gray-700">@{profil.kullaniciAdi}</dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="font-bold text-gray-900">Bölüm</dt>
              {/*
                Resmî bölüm adı katalogdan. Gelmediyse uydurulmuyor;
                bilinmediği yazılıyor.
              */}
              <dd className="min-w-0 break-words text-gray-700">
                {profil.bolumAdi ?? 'Bölüm adı alınamadı'}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="font-bold text-gray-900">Alan</dt>
              {/*
                Alan adı `sectors` birleşiminden geliyor. Gelmediyse
                uydurulmuyor; bilinmediği yazılıyor.
              */}
              <dd className="text-gray-700">{profil.sektorAdi ?? 'Alan adı alınamadı'}</dd>
            </div>
          </dl>
        </div>

        <div className={`${KART} space-y-3`}>
          <MetinAlani
            kimlik="sosyal-duzenle-gorunen-ad"
            etiket="Görünen ad"
            deger={gorunenAd}
            onDegis={setGorunenAd}
            enFazla={80}
            otomatikTamamlama="name"
          />
          <BiyografiAlani deger={biyografi} onDegis={setBiyografi} hata={bioHatasi} />
          {/*
            ETİKET "BÖLÜM" DEĞİL "EĞİTİM NOTU"

            Resmî bölüm `departments` ilişkisinden geliyor ve buradan
            değiştirilemiyor (kolon yetkisi kapalı). Bu kutu serbest metin;
            etiketi "Bölüm" kalsaydı kullanıcı buraya başka bir bölüm adı
            yazıp profilinde sistem bölümünü taklit edebileceğini sanırdı.
            Profilde de resmî adın ALTINDA, ikincil ağırlıkta çiziliyor.
          */}
          <MetinAlani
            kimlik="sosyal-duzenle-bolum"
            etiket="Eğitim notu"
            deger={bolum}
            onDegis={setBolum}
            enFazla={80}
            yerTutucu="çift anadal, yandal: veri bilimi"
          />
          <MetinAlani
            kimlik="sosyal-duzenle-sinif"
            etiket="Sınıf"
            deger={sinif}
            onDegis={setSinif}
            enFazla={40}
          />
          <MetinAlani
            kimlik="sosyal-duzenle-sehir"
            etiket="Şehir"
            deger={sehir}
            onDegis={setSehir}
            enFazla={80}
            otomatikTamamlama="address-level2"
          />
        </div>

        {kayitHatasi && <KayitHatasi mesaj={kayitHatasi} />}

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={kaydediliyor} className={BIRINCIL_EYLEM}>
            {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button
            type="button"
            onClick={onVazgec}
            disabled={kaydediliyor}
            className={`inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-40 ${RENK_GECISI} ${ODAK_HALKASI}`}
          >
            Vazgeç
          </button>
        </div>
      </form>
    </div>
  );
};
