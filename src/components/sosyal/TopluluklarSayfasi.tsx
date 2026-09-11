import React from 'react';
import { Users } from 'lucide-react';
import { SayfaKabugu } from '../SayfaKabugu';
import { BIRINCIL_EYLEM, ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import {
  SosyalHata,
  sosyalToplulugaKatil,
  sosyalTopluluklariGetir,
  sosyalTopluluktanAyril,
  type AlanToplulugu,
} from '../../lib/queries/sosyal';

/**
 * ALAN TOPLULUKLARI — LİSTE VE DETAY
 *
 * ÜYELİK PROFİLDEN AYRI BİR KAVRAM
 * --------------------------------
 * `social_profiles.yayinda_mi` bir zamanlar üç şeyi birden anlatıyordu
 * (profilim görünür mü, topluluktayım mı, paylaşımlarım kime açık) ve
 * sosyal profili kullanmak topluluğa katılmayı ZORUNLU kılıyordu.
 * 20260926030000 üyeliği ayrı bir tabloya (`community_members`) taşıdı:
 * artık profil görünürlüğü dişlide, üyelik burada. İki eylem aynı yerde
 * dursaydı kullanıcı profilini gizlemek isterken topluluğundan çıkmış
 * olurdu.
 *
 * UYGUNLUK SUNUCUDA, ARAYÜZDE DEĞİL
 * ---------------------------------
 * "Katıl" düğmesi yalnız `uygun_mu` satırında çiziliyor ama bu bir
 * KAPI DEĞİL, kolaylık: `sosyal_topluluga_katil` gönderilen kimliği bir
 * istek olarak alıyor ve uygun alanı çağıranın bölümünden kendisi
 * okuyor. İstemcinin kimliği değiştirmesi kuralı aşmıyor.
 *
 * ÜYE SAYISI SIFIRLA DOLDURULMUYOR
 * --------------------------------
 * `uye_sayisi` yalnız ÜYE OLUNAN toplulukta dolu; ötekilerde `null` ve
 * NULL "sıfır" değil "sana verilmiyor" demek. Ekranda `null` iken hiçbir
 * sayı çizilmiyor — 0 basmak ölçülmemiş bir sayı uydurmak olurdu.
 *
 * ÜYE OLMAYANA İÇERİK ÇİZİLMİYOR
 * ------------------------------
 * Detay ekranında üye olmayan kişiye boş bir liste ve "henüz içerik yok"
 * cümlesi GÖSTERİLMİYOR: o cümle, dolu bir topluluğu boş göstermek
 * olurdu. "Üye olunca görünür" farklı bir şey söylüyor ve doğrusu bu —
 * sunucu da paylaşımları `sosyal_gizli.ayni_toplulukta` kapısından
 * geçiriyor, yani arayüz burada ikinci kapı.
 *
 * NE YOK
 * ------
 * Üye listesi, topluluk akışı, yönetici, kural metni, katılma isteği
 * kuyruğu: hiçbirinin arka ucu yok. `community_members` iki kolon ve bir
 * zaman damgasından ibaret.
 */

const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';

const IKINCIL = `inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-40 ${RENK_GECISI} ${ODAK_HALKASI}`;

type Durum = 'yukleniyor' | 'hazir' | 'hata';

interface Props {
  /** `/topluluklar/<slug>` için adresteki slug; liste ekranında null. */
  slug: string | null;
  kullaniciId: string | null;
  /** Oturum okunmadan "giriş yapmamış" kararı verilmiyor. */
  oturumHazir: boolean;
  onNavigate: (yol: string, secenek?: { degistir?: boolean }) => void;
  onGirisGerekli?: () => void;
}

const Iskelet: React.FC = () => (
  <div aria-busy="true" className="space-y-2">
    {[0, 1, 2].map((sira) => (
      <div key={sira} className={`${KART} flex items-center gap-3`}>
        <div aria-hidden className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-gray-100" />
        <div aria-hidden className="h-5 w-40 animate-pulse rounded bg-gray-100" />
      </div>
    ))}
  </div>
);

export const TopluluklarSayfasi: React.FC<Props> = ({
  slug,
  kullaniciId,
  oturumHazir,
  onNavigate,
  onGirisGerekli,
}) => {
  const [liste, setListe] = React.useState<AlanToplulugu[]>([]);
  const [durum, setDurum] = React.useState<Durum>('yukleniyor');
  const [deneme, setDeneme] = React.useState(0);

  /* Hangi satırda istek uçuyor: iki satır aynı anda kilitlenmesin. */
  const [islemdeki, setIslemdeki] = React.useState<string | null>(null);
  const [islemHatasi, setIslemHatasi] = React.useState<string | null>(null);

  /* Oturum yoksa mevcut giriş akışı açılıyor; sayfa da kapıyı çiziyor. */
  React.useEffect(() => {
    if (!oturumHazir || kullaniciId) return;
    onGirisGerekli?.();
    /*
      `onGirisGerekli` bağımlılığa konmuyor: App her render'da yeni bir
      fonksiyon üretiyor ve modal her render'da yeniden açılırdı.
    */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oturumHazir, kullaniciId]);

  React.useEffect(() => {
    if (!kullaniciId) return;
    let iptal = false;
    setDurum('yukleniyor');
    sosyalTopluluklariGetir()
      .then((satirlar) => {
        if (iptal) return;
        setListe(satirlar);
        setDurum('hazir');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [kullaniciId, deneme]);

  /**
   * Katıl / ayrıl — tek fonksiyon, iki yön.
   *
   * İYİMSER GÜNCELLEME YOK: liste sunucudan YENİDEN okunuyor. Yerel
   * durumu elde değiştirmek, `uye_sayisi` alanını da istemcide
   * artırmak/azaltmak demekti ve o sayı sunucunun kendi kapısından
   * geçerek geliyor — istemcide üretilen bir sayı ölçülmemiş bir sayı
   * olurdu.
   */
  const uyelikDegistir = async (topluluk: AlanToplulugu) => {
    if (islemdeki) return;
    setIslemdeki(topluluk.sektorId);
    setIslemHatasi(null);
    try {
      if (topluluk.uyeMiyim) await sosyalTopluluktanAyril(topluluk.sektorId);
      else await sosyalToplulugaKatil(topluluk.sektorId);
      setIslemdeki(null);
      setDeneme((sayi) => sayi + 1);
    } catch (sorun) {
      /*
        Başarısız bir istek SESSİZ GEÇMİYOR: cümle olmasaydı kullanıcı
        düğmeye basıp hiçbir şey olmadığını görür ve katıldığını sanırdı.
      */
      setIslemHatasi(
        sorun instanceof SosyalHata
          ? sorun.message
          : 'İşlem tamamlanamadı. Yeniden deneyebilirsin.',
      );
      setIslemdeki(null);
    }
  };

  const kabuk = (icerik: React.ReactNode, onBack?: () => void) => (
    <SayfaKabugu onBack={onBack}>{icerik}</SayfaKabugu>
  );

  if (!oturumHazir) return kabuk(<Iskelet />);

  /* YETKİSİZ: oturum yok. Topluluklar giriş yapmış kullanıcıya açık. */
  if (!kullaniciId) {
    return kabuk(
      <div className={`${KART} space-y-3 text-center`}>
        <h1 className="text-lg font-extrabold text-gray-900">Topluluklar için giriş gerekiyor</h1>
        <p className="text-sm leading-relaxed text-gray-600">
          Alan toplulukları yalnızca giriş yapmış kullanıcılara açık.
        </p>
        {onGirisGerekli && (
          <button type="button" onClick={onGirisGerekli} className={BIRINCIL_EYLEM}>
            Giriş yap
          </button>
        )}
      </div>,
    );
  }

  if (durum === 'yukleniyor') return kabuk(<Iskelet />);

  /* HATA: boş listeyle karıştırılmıyor. */
  if (durum === 'hata') {
    return kabuk(
      <div className={`${KART} space-y-3 text-center`} role="alert">
        <h1 className="text-lg font-extrabold text-gray-900">Topluluklar alınamadı</h1>
        <p className="text-sm leading-relaxed text-gray-600">
          Sunucudan cevap alınamadı. Üyeliğinde bir değişiklik olmadı.
        </p>
        <button type="button" onClick={() => setDeneme((sayi) => sayi + 1)} className={IKINCIL}>
          Yeniden dene
        </button>
      </div>,
    );
  }

  const eylemEtiketi = (topluluk: AlanToplulugu) => {
    const suruyor = islemdeki === topluluk.sektorId;
    if (topluluk.uyeMiyim) return suruyor ? 'Ayrılıyor…' : 'Ayrıl';
    return suruyor ? 'Katılıyor…' : 'Katıl';
  };

  /* ------------------------------------------------------------ DETAY */
  if (slug !== null) {
    const topluluk = liste.find((satir) => satir.slug === slug) ?? null;

    /*
      Adresteki slug listede yoksa tek bir güvenli ekran: "böyle bir
      topluluk yok" ile "bu topluluk sana kapalı" ayrı cümleler olsaydı
      adres çubuğu bir topluluk sözlüğüne dönerdi. `sosyal_topluluklar`
      zaten yalnız aktif sektörleri veriyor.
    */
    if (!topluluk) {
      return kabuk(
        <div className={`${KART} space-y-3 text-center`}>
          <h1 className="text-lg font-extrabold text-gray-900">Bu topluluk görüntülenemiyor</h1>
          <p className="text-sm leading-relaxed text-gray-600">
            Adres yanlış olabilir ya da bu topluluk artık açık olmayabilir.
          </p>
        </div>,
        () => onNavigate('/topluluklar'),
      );
    }

    return kabuk(
      <div className="space-y-3">
        <header className="space-y-1.5">
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
            {topluluk.ad}
          </h1>
          {/*
            SAYI YALNIZ ÜYEDE VE YALNIZ GELDİYSE

            `uyeSayisi` null iken satır hiç çizilmiyor. "— üye" ya da
            "0 üye" yazmak, sunucunun bilerek vermediği bir bilgiyi
            uydurmak olurdu.
          */}
          {topluluk.uyeMiyim && topluluk.uyeSayisi !== null && (
            <p className="text-sm text-gray-600">{topluluk.uyeSayisi} üye</p>
          )}
        </header>

        {/*
          ÜYE OLMAYANA İÇERİK YERİNE SEBEP

          Boş bir ızgara ve "henüz içerik yok" cümlesi burada YANLIŞ
          olurdu: içerik olabilir, sunucu vermiyor. İkisi kullanıcıya
          farklı şey söylüyor.
        */}
        {!topluluk.uyeMiyim && (
          <p className={`${KART} text-sm leading-relaxed text-gray-600`}>
            Topluluk paylaşımları üye olunca görünür.
          </p>
        )}
        {topluluk.uyeMiyim && (
          <p className={`${KART} text-sm leading-relaxed text-gray-600`}>
            Bu topluluğun üyesisin. Paylaşırken kitle olarak "Alan topluluğum" seçebilirsin.
          </p>
        )}

        {islemHatasi && (
          <p role="alert" className="text-xs font-semibold leading-relaxed text-rose-700">
            {islemHatasi}
          </p>
        )}

        {/*
          "Katıl" yalnız uygun toplulukta. Uygun olmayanda düğme DOM'a
          hiç girmiyor: her basışta reddedilecek bir eylem sunmak yerine
          sebebi yazılıyor.
        */}
        {(topluluk.uyeMiyim || topluluk.uygunMu) && (
          <button
            type="button"
            onClick={() => uyelikDegistir(topluluk)}
            disabled={islemdeki !== null}
            className={topluluk.uyeMiyim ? IKINCIL : BIRINCIL_EYLEM}
          >
            {eylemEtiketi(topluluk)}
          </button>
        )}
        {!topluluk.uyeMiyim && !topluluk.uygunMu && (
          <p className="text-sm leading-relaxed text-gray-600">
            Bu topluluk senin bölümüne açık değil.
          </p>
        )}
      </div>,
      () => onNavigate('/topluluklar'),
    );
  }

  /* ------------------------------------------------------------ LİSTE */
  /*
    Kullanıcının katılabileceği hiçbir topluluk yoksa sebebi yazılıyor.
    Bu, "topluluk yok" DEMEK DEĞİL: liste dolu olabilir ama kullanıcının
    bölümü katalogla eşleşmemiş ya da bölümünün alanı tanımlı değil
    (`department_sectors` satırı yok). Yakın bir topluluk ÖNERİLMİYOR —
    yanlış topluluk, yanlış alan ve yanlış içerik demek.
  */
  const uygunVarMi = liste.some((satir) => satir.uygunMu);

  return kabuk(
    <div className="space-y-3">
      <header className="space-y-1.5">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
          Alan toplulukları
        </h1>
        <p className="text-sm leading-relaxed text-gray-600">
          Bölümünün alanına açık topluluğa katılabilirsin. Üyelik profil görünürlüğünden ayrı:
          katılmak ya da ayrılmak profilini değiştirmiyor.
        </p>
      </header>

      {liste.length === 0 && (
        <p className={`${KART} text-sm leading-relaxed text-gray-600`}>
          Şu anda açık bir alan topluluğu yok.
        </p>
      )}

      {liste.length > 0 && !uygunVarMi && (
        <p role="status" className={`${KART} text-sm leading-relaxed text-gray-600`}>
          Bölümün için topluluk henüz tanımlı değil.
        </p>
      )}

      {islemHatasi && (
        <p role="alert" className="text-xs font-semibold leading-relaxed text-rose-700">
          {islemHatasi}
        </p>
      )}

      <ul className="space-y-2">
        {liste.map((topluluk) => {
          const yol = `/topluluklar/${topluluk.slug}`;
          return (
            <li key={topluluk.sektorId} className={`${KART} flex items-center gap-2.5`}>
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700"
              >
                <Users className="h-5 w-5" />
              </span>
              {/*
                Kart bağlantısı gerçek `<a href>`; Katıl/Ayrıl düğmesi
                onun İÇİNDE değil KARDEŞİ — iç içe `<a>` ya da
                bağlantının içindeki düğme, orta tuşla açmayı ve klavye
                sırasını bozardı.
              */}
              <a
                href={yol}
                onClick={(olay) => {
                  if (
                    olay.metaKey ||
                    olay.ctrlKey ||
                    olay.shiftKey ||
                    olay.altKey ||
                    olay.button !== 0
                  )
                    return;
                  olay.preventDefault();
                  onNavigate(yol);
                }}
                className={`min-w-0 flex-1 rounded-xl py-1 ${ODAK_HALKASI}`}
              >
                <span className="block truncate text-sm font-bold text-gray-900">
                  {topluluk.ad}
                </span>
                {/* Sayı yalnız üyede ve yalnız geldiyse; null iken satır yok. */}
                {topluluk.uyeMiyim && topluluk.uyeSayisi !== null && (
                  <span className="block text-xs text-gray-600">{topluluk.uyeSayisi} üye</span>
                )}
              </a>

              {(topluluk.uyeMiyim || topluluk.uygunMu) && (
                <button
                  type="button"
                  onClick={() => uyelikDegistir(topluluk)}
                  disabled={islemdeki !== null}
                  className={`shrink-0 ${topluluk.uyeMiyim ? IKINCIL : BIRINCIL_EYLEM}`}
                >
                  {eylemEtiketi(topluluk)}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>,
  );
};
