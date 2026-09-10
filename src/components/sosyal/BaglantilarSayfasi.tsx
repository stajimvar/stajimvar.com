import React from 'react';
import { SayfaKabugu } from '../SayfaKabugu';
import { BIRINCIL_EYLEM, ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import {
  SosyalHata,
  baglantiKaldir,
  baglantiYanitla,
  baglantilarimiGetir,
  type BaglantiKisisi,
  type Baglantilarim,
} from '../../lib/queries/sosyal';
import { profilYolu } from '../../lib/sosyal-kullanici-adi.mjs';
import { ProfilFotografi } from './ProfilFotografi';

/**
 * BAĞLANTILAR — TEK ADRES, ÜÇ BÖLÜM
 *
 * Bağlantılar · Gelen istekler · Gönderilen istekler aynı sayfada.
 * Sekme adresi ya da ayrı rota yok: üçü de aynı tek okumadan geliyor ve
 * bir isteği kabul etmek satırı bir bölümden ötekine taşıyor — ayrı
 * adresler olsaydı kullanıcı her eylemden sonra sayfa değiştirirdi.
 *
 * TAKİP MODELİ YOK
 * ----------------
 * Tek ilişki karşılıklı bağlantı; tek yönlü bir ilişki veritabanında da
 * yok. Bu yüzden bu sayfada "takipçi" ya da benzeri bir kavram geçmiyor.
 *
 * KARŞI TARAFIN PROFİLİ AYRI BİR YETKİ SORUSU
 * -------------------------------------------
 * Bağlantı satırını taraf olan herkes görüyor, ama karşı tarafın profili
 * RLS'e ayrıca tabi: araya engel girmiş ya da kişi topluluktan ayrılmış
 * olabilir. O zaman ad UYDURULMUYOR; satır "profil şu anda
 * görüntülenemiyor" olarak çiziliyor ve eylemler yerinde kalıyor (kaydı
 * kaldırmak hâlâ mümkün olmalı).
 *
 * YORUM, MESAJ VE BİLDİRİM MERKEZİ EKLENMEDİ
 * ------------------------------------------
 * Üçünün de tablosu ya da akışı yok; boş bir giriş noktası çizmek vaat
 * olurdu.
 */

interface BaglantilarProps {
  kullaniciId: string | null;
  oturumHazir: boolean;
  onNavigate: (yol: string, secenek?: { degistir?: boolean }) => void;
  onGirisGerekli?: () => void;
}

type Durum = 'yukleniyor' | 'hazir' | 'hata';

const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';
const IKINCIL = `inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-40 ${RENK_GECISI} ${ODAK_HALKASI}`;

const BOS_LISTE: Baglantilarim = { kabul: [], gelen: [], giden: [] };

/**
 * Tek satır.
 *
 * Ad bağlantısı gerçek `<a href>`: orta tuş ve "yeni sekmede aç"
 * çalışıyor. Eylem düğmeleri bağlantının İÇİNDE değil yanında — iç içe
 * `<a>`/`<button>` hem geçersiz hem de tıklama hedeflerini karıştırırdı.
 */
const BaglantiSatiri: React.FC<{
  kisi: BaglantiKisisi;
  eylemler: React.ReactNode;
  onNavigate: (yol: string, secenek?: { degistir?: boolean }) => void;
}> = ({ kisi, eylemler, onNavigate }) => {
  const ad = kisi.profil?.gorunenAd ?? (kisi.profil?.kullaniciAdi ? `@${kisi.profil.kullaniciAdi}` : null);
  const hedef = kisi.profil?.kullaniciAdi ? profilYolu(kisi.profil.kullaniciAdi) : null;

  return (
    <li className={`${KART} flex flex-wrap items-center gap-3`}>
      {/*
        GERÇEK FOTOĞRAF, YOKSA BAŞ HARF

        `ProfilFotografi` yolu kullanıcının OTURUMUYLA indiriyor
        (`useGorselAdresleri`): satırda bir yol görünmesi dosyanın
        görüldüğü anlamına gelmiyor, okuma politikası her indirmede
        ayrıca çalışıyor. Yol yoksa ya da dosya inemediyse baş harfler
        kalıyor — sahte bir görsel ya da genel bir "kişi" simgesi
        üretilmiyor.

        Profili RLS vermediğinde ad da yol da null: ad yerine '?'
        geçiyor ve satırın kendisi zaten "görüntülenemiyor" yazıyor.
      */}
      <ProfilFotografi
        ad={ad ?? '?'}
        yol={kisi.profil?.avatarYolu ?? null}
        className="h-11 w-11 shrink-0 rounded-full text-sm ring-1 ring-blue-500/20"
      />
      <div className="min-w-0 flex-1">
        {hedef && ad ? (
          <a
            href={hedef}
            onClick={(olay) => {
              if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0)
                return;
              olay.preventDefault();
              onNavigate(hedef);
            }}
            className={`block truncate text-sm font-bold text-gray-900 hover:underline ${ODAK_HALKASI}`}
          >
            {ad}
          </a>
        ) : (
          /* Ad uydurulmuyor: profil gelmediyse durum olduğu gibi yazılıyor. */
          <p className="text-sm font-semibold text-gray-600">Bu profil şu anda görüntülenemiyor</p>
        )}
        {kisi.profil?.sektorAdi && (
          <p className="truncate text-xs text-gray-600">{kisi.profil.sektorAdi} alanı</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">{eylemler}</div>
    </li>
  );
};

/** Bir bölüm: dört durumun dördü de burada çiziliyor. */
const Bolum: React.FC<{
  baslik: string;
  durum: Durum;
  satirlar: BaglantiKisisi[];
  bosMetin: string;
  onYenidenDene: () => void;
  satirCiz: (kisi: BaglantiKisisi) => React.ReactNode;
}> = ({ baslik, durum, satirlar, bosMetin, onYenidenDene, satirCiz }) => (
  <section className="space-y-2">
    <h2 className="text-base font-extrabold tracking-tight text-gray-900">{baslik}</h2>

    {durum === 'yukleniyor' && (
      <div aria-busy="true" className="space-y-2">
        <div aria-hidden className={`${KART} h-16 animate-pulse bg-gray-50`} />
        <div aria-hidden className={`${KART} h-16 animate-pulse bg-gray-50`} />
      </div>
    )}

    {durum === 'hata' && (
      <div role="alert" className={`${KART} space-y-2`}>
        <p className="text-sm font-bold text-gray-900">Bağlantılar alınamadı.</p>
        <p className="text-sm text-gray-600">
          Sunucudan cevap gelmedi. Bağlantılarında bir değişiklik olmadı.
        </p>
        <button type="button" onClick={onYenidenDene} className={IKINCIL}>
          Yeniden dene
        </button>
      </div>
    )}

    {durum === 'hazir' && satirlar.length === 0 && (
      <p className={`${KART} text-sm text-gray-600`}>{bosMetin}</p>
    )}

    {durum === 'hazir' && satirlar.length > 0 && (
      <ul className="space-y-2">{satirlar.map((kisi) => satirCiz(kisi))}</ul>
    )}
  </section>
);

export const BaglantilarSayfasi: React.FC<BaglantilarProps> = ({
  kullaniciId,
  oturumHazir,
  onNavigate,
  onGirisGerekli,
}) => {
  const [liste, setListe] = React.useState<Baglantilarim>(BOS_LISTE);
  const [durum, setDurum] = React.useState<Durum>('yukleniyor');
  const [deneme, setDeneme] = React.useState(0);
  const [islemdeki, setIslemdeki] = React.useState<string | null>(null);
  const [islemHatasi, setIslemHatasi] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!oturumHazir || kullaniciId) return;
    onGirisGerekli?.();
    /* `onGirisGerekli` bağımlılığa konmuyor: App her render'da yeni bir fonksiyon üretiyor. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oturumHazir, kullaniciId]);

  React.useEffect(() => {
    if (!kullaniciId) return;
    let iptal = false;
    setDurum('yukleniyor');
    baglantilarimiGetir(kullaniciId)
      .then((veri) => {
        if (iptal) return;
        setListe(veri);
        setDurum('hazir');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [kullaniciId, deneme]);

  /*
    TEK EYLEM YOLU

    Kabul, ret, geri çekme ve kaldırma aynı kilit ve aynı hata dalından
    geçiyor. Ayrı işleyiciler olsaydı biri kilidi unutur, çift tıklama
    ikinci bir istek atardı. Liste sunucudan YENİDEN okunuyor: yerelde
    satır taşımak, sunucunun reddettiği bir işlemi olmuş gibi gösterirdi.
  */
  const eylemiCalistir = async (anahtar: string, eylem: () => Promise<void>) => {
    if (islemdeki) return;
    setIslemdeki(anahtar);
    setIslemHatasi(null);
    try {
      await eylem();
      setDeneme((sayi) => sayi + 1);
    } catch (sorun) {
      setIslemHatasi(
        sorun instanceof SosyalHata
          ? sorun.message
          : 'İşlem tamamlanamadı. Bağlantılarında bir değişiklik olmadı.',
      );
    } finally {
      setIslemdeki(null);
    }
  };

  if (!oturumHazir) {
    return (
      <SayfaKabugu>
        <div aria-busy="true" className="space-y-2">
          <div aria-hidden className={`${KART} h-16 animate-pulse bg-gray-50`} />
          <div aria-hidden className={`${KART} h-16 animate-pulse bg-gray-50`} />
        </div>
      </SayfaKabugu>
    );
  }

  if (!kullaniciId) {
    return (
      <SayfaKabugu>
        <div className={`${KART} space-y-3 text-center`}>
          <h1 className="text-lg font-extrabold text-gray-900">Bağlantılar için giriş gerekiyor</h1>
          <p className="text-sm leading-relaxed text-gray-600">
            Bağlantı listesi yalnızca giriş yapmış kullanıcıya açık.
          </p>
          {onGirisGerekli && (
            <button type="button" onClick={onGirisGerekli} className={BIRINCIL_EYLEM}>
              Giriş yap
            </button>
          )}
        </div>
      </SayfaKabugu>
    );
  }

  const yenidenDene = () => setDeneme((sayi) => sayi + 1);

  return (
    <SayfaKabugu>
      <div className="space-y-5">
        <header className="space-y-1.5">
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
            Bağlantılar
          </h1>
          <p className="text-sm leading-relaxed text-gray-600">
            Bağlantı karşılıklı: iki taraf da kabul ettiğinde kuruluyor.
          </p>
        </header>

        {islemHatasi && (
          <p role="alert" className="text-sm font-semibold leading-relaxed text-rose-700">
            {islemHatasi}
          </p>
        )}

        <Bolum
          baslik="Bağlantılar"
          durum={durum}
          satirlar={liste.kabul}
          bosMetin="Henüz bağlantın yok."
          onYenidenDene={yenidenDene}
          satirCiz={(kisi) => (
            <BaglantiSatiri
              key={kisi.kisiId}
              kisi={kisi}
              onNavigate={onNavigate}
              eylemler={
                <button
                  type="button"
                  disabled={islemdeki === kisi.kisiId}
                  onClick={() =>
                    eylemiCalistir(kisi.kisiId, () => baglantiKaldir(kullaniciId, kisi.kisiId))
                  }
                  className={IKINCIL}
                >
                  Bağlantıyı kaldır
                </button>
              }
            />
          )}
        />

        <Bolum
          baslik="Gelen istekler"
          durum={durum}
          satirlar={liste.gelen}
          bosMetin="Bekleyen bir istek yok."
          onYenidenDene={yenidenDene}
          satirCiz={(kisi) => (
            <BaglantiSatiri
              key={kisi.kisiId}
              kisi={kisi}
              onNavigate={onNavigate}
              eylemler={
                <>
                  <button
                    type="button"
                    disabled={islemdeki === kisi.kisiId}
                    onClick={() =>
                      eylemiCalistir(kisi.kisiId, () =>
                        baglantiYanitla(kullaniciId, kisi.kisiId, 'kabul'),
                      )
                    }
                    className={BIRINCIL_EYLEM}
                  >
                    Kabul et
                  </button>
                  <button
                    type="button"
                    disabled={islemdeki === kisi.kisiId}
                    onClick={() =>
                      eylemiCalistir(kisi.kisiId, () =>
                        baglantiYanitla(kullaniciId, kisi.kisiId, 'red'),
                      )
                    }
                    className={IKINCIL}
                  >
                    Reddet
                  </button>
                </>
              }
            />
          )}
        />

        <Bolum
          baslik="Gönderilen istekler"
          durum={durum}
          satirlar={liste.giden}
          bosMetin="Gönderdiğin bekleyen bir istek yok."
          onYenidenDene={yenidenDene}
          satirCiz={(kisi) => (
            <BaglantiSatiri
              key={kisi.kisiId}
              kisi={kisi}
              onNavigate={onNavigate}
              eylemler={
                <button
                  type="button"
                  disabled={islemdeki === kisi.kisiId}
                  onClick={() =>
                    eylemiCalistir(kisi.kisiId, () => baglantiKaldir(kullaniciId, kisi.kisiId))
                  }
                  className={IKINCIL}
                >
                  İsteği geri çek
                </button>
              }
            />
          )}
        />
      </div>
    </SayfaKabugu>
  );
};
