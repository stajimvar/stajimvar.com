import React from 'react';
import { ArrowLeft, Eye, ImagePlus, LogOut, Pencil, Plus, Settings } from 'lucide-react';
import {
  IKINCIL_DUGME,
  KUTU,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ODAK,
  ikincilStil,
  kutuStil,
} from './renk';
import { GenelBakis } from './GenelBakis';
import { SirketProfilFormu } from './SirketProfilFormu';
import { SirketProfilGorunumu, type SayacDurumu } from './SirketProfilGorunumu';
import { SirketSayfasi } from './SirketSayfasi';
import { KapakFotografiYukleme } from '../components/sosyal/KapakFotografiYukleme';
import { ProfilAyarlarSayfasi, type AyarBolumu } from '../components/ProfilAyarlarSayfasi';
import { ProfilSayfaDuzeni } from '../components/sosyal/ProfilSayfaDuzeni';
import { SirketSolSutun, SirketYanSutun } from './SirketYanSutunlari';
import { adayGorebilir } from '../lib/sirket-kademe.mjs';
import type { AdayOzeti } from './IlanKarti';
import {
  kendiSosyalProfiliGetir,
  paylasimlariGetir,
  sosyalSayaclariGetir,
  type SosyalPaylasim,
  type SosyalProfil,
} from '../lib/queries/sosyal';
import {
  sirketAcikKimligi,
  type SirketBaglami,
  type SirketProfilDegeri,
} from '../lib/sirket-veri';

/**
 * ŞİRKETİN PROFİL SEKMESİ — SAHİP DALI (/sirket/profil)
 *
 * Bu bileşen görünüm çizmiyor, DURUM belirliyor: sosyal satırı, üç
 * sayacı ve paylaşım listesini okuyor; `SirketProfilGorunumu`na sahip
 * eylemleriyle veriyor. Öğrencinin gördüğü sayfa (/profil/<slug>) aynı
 * görünümü SAHİP NESNESİ OLMADAN çiziyor (`SirketSayfasi`); oraya giden
 * bağlantı 20 Eylül 2026'da kullanıcı isteğiyle profilden kaldırıldı, bu
 * yüzden `ogrenciSayfasiYolu` artık sahip nesnesinde de yok.
 *
 * ADRESLER
 * --------
 *   /sirket/profil           profil (sekmeler)
 *   /sirket/profil/duzenle   mevcut düzenleme formu (SirketProfilFormu:
 *                            logo, sektör, konum, çalışan sayısı, site,
 *                            hakkımızda, İK e-postası, doğrulama)
 *
 * Düzenleme ayrı adreste: geri tuşu forma değil profile dönüyor ve
 * "Profili düzenle" gerçek bir `<a href>` (orta tuş çalışıyor).
 *
 * PAYLAŞIM AKIŞI ÖĞRENCİNİNKİYLE AYNI
 * -----------------------------------
 * Seçici, küçültme, EXIF düşürme, taslak → yükleme → tamamla sırası
 * `FotografPaylasGirisi` + `PaylasimOlustur`; burada ikinci bir kopya
 * yok. Tek fark kitle: şirket sayfası yalnız 'sirket' kitlesiyle
 * paylaşabiliyor (`paylasim_kitlesi_kilidi`), besteci seçici çizmiyor.
 *
 * ÇIKIŞ HESAP AYARLARINDA (26 Eylül 2026)
 * -------------------------------------
 * Şirket hesabında üst çubukta hesap menüsü yok. Çıkış sekmenin sonunda
 * ana içeriğin içinde duruyordu; artık "Şirketim" başlığının yanındaki
 * dişli düğmesinin açtığı ayarlar sayfasında (`ProfilAyarlarSayfasi`,
 * öğrenci profilindeki aynı bileşen). Düğme her zaman görünür ve
 * `aria-label` taşıyor; çıkış bir dokunuş daha uzakta ama kaybolmadı.
 * Panel yüklenemediğinde ve şirket kaydı yokken dişli çizilmediği için
 * orada çıkış düğmesi eskisi gibi sayfada.
 *
 * ŞİRKETİM ADRESLERİ (26 Eylül 2026)
 * ---------------------------------
 *   /sirket/profil/kapak   kapak fotoğrafı — öğrencinin kullandığı aynı
 *                          `KapakFotografiYukleme`; yazdığı yer şirketin
 *                          KENDİ sosyal satırı (`kapak_path`, sunucuda
 *                          `kapak_yolu_kilidi` kendi klasörünü şart koşuyor).
 *   /sirket/profil/onizle  öğrencinin gördüğü sayfa: `SirketSayfasi`
 *                          sahip nesnesi OLMADAN — yalnız açık sütunlar
 *                          (`sirketAcikKimliginiOku`) ve yayındaki ilanlar;
 *                          İK e-postası, VKN, taslak ilan ve başvuru yok.
 */

type Durum = 'yukleniyor' | 'hazir' | 'hata';

const PROFIL_YOLU = '/sirket/profil';
const DUZENLE_YOLU = '/sirket/profil/duzenle';
const KAPAK_YOLU = '/sirket/profil/kapak';
const ONIZLE_YOLU = '/sirket/profil/onizle';
const ILAN_OLUSTUR_YOLU = '/sirket/ilan/yeni';

const GERI_SATIRI = `inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 ${SIRKET_ODAK}`;

export const CikisDugmesi: React.FC<{ onCikis: () => void }> = ({ onCikis }) => (
  <div className="flex justify-end">
    <button type="button" onClick={onCikis} className={IKINCIL_DUGME} style={ikincilStil}>
      <LogOut className="h-4 w-4" aria-hidden />
      Çıkış yap
    </button>
  </div>
);

export const SirketProfili: React.FC<{
  yol: string;
  baglam: SirketBaglami;
  /** `null` = okunamadı; kimlik yalnız adla çizilir. */
  profil: SirketProfilDegeri | null;
  /** Şirketin ilanları (taslak dahil, arşiv hariç) — İlanlar sekmesi ve "aktif ilan" sayacı. */
  ilanlar: Record<string, unknown>[];
  basvurular: AdayOzeti[];
  userId: string | null;
  onKaydedildi: () => void;
  onNavigate: (yol: string) => void;
  onDurum: (id: string, d: 'published' | 'closed') => Promise<void>;
  onKaldir: (id: string, arsivle: boolean) => Promise<void>;
  onCikis?: () => void;
}> = ({
  yol,
  baglam,
  profil,
  ilanlar,
  basvurular,
  userId,
  onKaydedildi,
  onNavigate,
  onDurum,
  onKaldir,
  onCikis,
}) => {
  const [sosyal, setSosyal] = React.useState<SosyalProfil | null>(null);
  const [sosyalDurumu, setSosyalDurumu] = React.useState<Durum>('yukleniyor');
  const [paylasimSayaci, setPaylasimSayaci] = React.useState<SayacDurumu>({ durum: 'yukleniyor' });
  const [takipciSayaci, setTakipciSayaci] = React.useState<SayacDurumu>({ durum: 'yukleniyor' });
  const [paylasimlar, setPaylasimlar] = React.useState<SosyalPaylasim[]>([]);
  const [paylasimDurumu, setPaylasimDurumu] = React.useState<Durum>('yukleniyor');
  /*
    Sayaç ve liste tazelemesi sosyal satırdan AYRI: yeni paylaşım ya da
    arşivleme yalnız bu ikisini değiştiriyor; satırı yeniden okumak
    başlığı iskelete çevirirdi.
  */
  const [deneme, setDeneme] = React.useState(0);
  const [bildirim, setBildirim] = React.useState<string | null>(null);
  const [ayarlarAcik, setAyarlarAcik] = React.useState(false);
  const ayarlariKapat = React.useCallback(() => setAyarlarAcik(false), []);

  React.useEffect(() => {
    if (!userId) return;
    let iptal = false;
    setSosyalDurumu('yukleniyor');
    kendiSosyalProfiliGetir(userId)
      .then((satir) => {
        if (iptal) return;
        setSosyal(satir);
        setSosyalDurumu('hazir');
      })
      .catch(() => {
        if (!iptal) setSosyalDurumu('hata');
      });
    return () => {
      iptal = true;
    };
  }, [userId]);

  /*
    Sosyal satır, sayaçlar ve paylaşım listesi birbirinden bağımsız: biri
    düşünce ötekiler durmuyor; her biri kendi hata dalını yazıyor — "0"
    yerine "alınamadı".

    PAYLAŞIM VE TAKİPÇİ TEK ÇAĞRIDAN: `sosyal_sayaclar` 20261015010000 ile
    takipçi sütununu da döndürüyor; `takipci_sayisi` RPC'si ayrıca
    sorulmuyordu, aynı sayı iki kez gelirdi. Kendi satırın `sosyal_gorunur`
    kapısında her zaman açık (hedef = auth.uid()), yani sayfa yayında
    olmasa da satır geliyor.
  */
  React.useEffect(() => {
    if (!userId) return;
    let iptal = false;
    setPaylasimSayaci({ durum: 'yukleniyor' });
    setTakipciSayaci({ durum: 'yukleniyor' });
    sosyalSayaclariGetir(userId)
      .then((s) => {
        if (iptal) return;
        /* `null` = sunucu satır vermedi; kendi profilinde beklenmez ama sıfır uydurulmaz. */
        setPaylasimSayaci(s ? { durum: 'hazir', deger: s.paylasim } : { durum: 'hata' });
        setTakipciSayaci(s ? { durum: 'hazir', deger: s.takipci } : { durum: 'hata' });
      })
      .catch(() => {
        if (iptal) return;
        setPaylasimSayaci({ durum: 'hata' });
        setTakipciSayaci({ durum: 'hata' });
      });
    return () => {
      iptal = true;
    };
  }, [userId, deneme]);

  React.useEffect(() => {
    if (!userId) return;
    let iptal = false;
    setPaylasimDurumu('yukleniyor');
    paylasimlariGetir(userId)
      .then((liste) => {
        if (iptal) return;
        setPaylasimlar(liste);
        setPaylasimDurumu('hazir');
      })
      .catch(() => {
        if (!iptal) setPaylasimDurumu('hata');
      });
    return () => {
      iptal = true;
    };
  }, [userId, deneme]);

  const tazele = () => setDeneme((n) => n + 1);

  /* ------------------------------------------------------- düzenleme */
  if (yol.startsWith(DUZENLE_YOLU)) {
    return (
      <div className="space-y-3">
        <a
          href={PROFIL_YOLU}
          onClick={(olay) => {
            if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0)
              return;
            olay.preventDefault();
            onNavigate(PROFIL_YOLU);
          }}
          className={GERI_SATIRI}
        >
          <ArrowLeft aria-hidden className="h-4 w-4 shrink-0" />
          Profile dön
        </a>
        <h1 className="text-xl font-extrabold tracking-tight" style={{ color: SIRKET_METIN }}>
          Profili düzenle
        </h1>
        <SirketProfilFormu
          baglam={baglam}
          userId={userId}
          onKaydedildi={onKaydedildi}
          onNavigate={onNavigate}
          ozetsiz
        />
      </div>
    );
  }

  const geriSatiri = (
    <a
      href={PROFIL_YOLU}
      onClick={(olay) => {
        if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
        olay.preventDefault();
        onNavigate(PROFIL_YOLU);
      }}
      className={GERI_SATIRI}
    >
      <ArrowLeft aria-hidden className="h-4 w-4 shrink-0" />
      Şirketim'e dön
    </a>
  );

  /* ---------------------------------------------------- kapak fotoğrafı */
  if (yol.startsWith(KAPAK_YOLU) && baglam.companyId && userId) {
    return (
      <ProfilSayfaDuzeni>
      <div className="space-y-3">
        {geriSatiri}
        <h1 className="text-xl font-extrabold tracking-tight" style={{ color: SIRKET_METIN }}>
          Kapak fotoğrafı
        </h1>
        {sosyalDurumu === 'yukleniyor' ? (
          <span aria-busy="true" className="block h-32 w-full animate-pulse rounded-2xl bg-gray-100" />
        ) : sosyalDurumu === 'hata' || !sosyal ? (
          <p role="alert" className={`${KUTU} text-sm`} style={{ ...kutuStil, color: SIRKET_METIN_IKINCIL }}>
            Şirket sayfanızın sosyal kaydı okunamadı; kapak şu anda eklenemiyor.
          </p>
        ) : (
          <KapakFotografiYukleme
            kullaniciId={userId}
            ad={baglam.ad}
            mevcutYol={sosyal.kapakFotografiYolu}
            onVazgec={() => onNavigate(PROFIL_YOLU)}
            onKaydedildi={(yeniYol) => {
              setSosyal((onceki) => (onceki ? { ...onceki, kapakFotografiYolu: yeniYol } : onceki));
              onNavigate(PROFIL_YOLU);
            }}
          />
        )}
      </div>
      </ProfilSayfaDuzeni>
    );
  }

  /* ------------------------------------------ öğrencinin gördüğü sayfa */
  if (yol.startsWith(ONIZLE_YOLU) && baglam.companyId) {
    return (
      <ProfilSayfaDuzeni>
      <div className="space-y-3">
        {geriSatiri}
        <p
          role="note"
          className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm"
          style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: SIRKET_METIN }}
        >
          <Eye aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
          <span>
            Önizleme: giriş yapmış öğrenciler şirket sayfanızı böyle görüyor. Taslak ilanlar, başvurular
            ve iletişim bilgileriniz burada yok. Oturumu kapalı ziyaretçiler{' '}
            {baglam.slug ? (
              <a
                href={`/sirket/${baglam.slug}`}
                onClick={(olay) => {
                  if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
                  olay.preventDefault();
                  onNavigate(`/sirket/${baglam.slug}`);
                }}
                className="font-bold text-blue-700 underline-offset-2 hover:underline"
              >
                herkese açık şirket sayfasını
              </a>
            ) : (
              'herkese açık şirket sayfasını'
            )}{' '}
            görür: kurum bilgileri ve yayındaki ilanlar; paylaşımlar ve takipçi sayısı giriş istiyor.
          </span>
        </p>
        {sosyalDurumu === 'yukleniyor' ? (
          <span aria-busy="true" className="block h-40 w-full animate-pulse rounded-2xl bg-gray-100" />
        ) : sosyalDurumu === 'hata' || !sosyal || !sosyal.sirketId ? (
          <p role="alert" className={`${KUTU} text-sm`} style={{ ...kutuStil, color: SIRKET_METIN_IKINCIL }}>
            Şirket sayfanız henüz açılmamış ya da okunamadı; önizleme gösterilemiyor.
          </p>
        ) : (
          <div className="-mx-4 sm:mx-0">
            <SirketSayfasi
              profil={sosyal}
              paylasimlar={paylasimlar}
              paylasimDurumu={paylasimDurumu}
              paylasimSayaci={paylasimSayaci}
              takipciSayaci={takipciSayaci}
              /* Bakan = sayfanın sahibi: takip düğmesi DOM'a girmiyor (SirketSayfasi). */
              bakanId={userId}
              onPaylasimlariYenile={tazele}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </div>
      </ProfilSayfaDuzeni>
    );
  }

  /* Şirket kaydı yokken profil görünümü yok; form o durumu anlatıyor. */
  if (!baglam.companyId) {
    return (
      <div className="space-y-4">
        <SirketProfilFormu baglam={baglam} userId={userId} onKaydedildi={onKaydedildi} onNavigate={onNavigate} ozetsiz />
        {onCikis && <CikisDugmesi onCikis={onCikis} />}
      </div>
    );
  }

  /*
    PAYLAŞIM ÖNKOŞULU SUNUCUNUNKİ: `sosyal_paylasim_baslat` kullanıcı adı,
    `paylasim_kitlesi_kilidi` `sirket_id` istiyor. Satır okunamadıysa ya
    da eksikse düğme çizilmiyor ve sebebi yazılıyor — sebep uydurulmuyor,
    üç durum üç cümle.
  */
  const paylasabilirMi = Boolean(sosyal?.kullaniciAdi && sosyal?.sirketId);
  const paylasimEngeli =
    sosyalDurumu === 'hata'
      ? 'Şirket sayfanın sosyal kaydı okunamadı; bu yüzden şu anda fotoğraf paylaşılamıyor.'
      : sosyalDurumu === 'hazir' && !paylasabilirMi
        ? 'Şirket sayfan henüz açılmamış; fotoğraf paylaşımı sayfa açıldığında geliyor.'
        : null;

  const aktifIlan = ilanlar.filter((i) => i.status === 'published').length;

  /*
    AYARLAR — öğrenci profilindeki aynı tam ekran liste. Satırların hepsi
    var olan bir işe gidiyor; çıkış en sonda, kırmızı.
  */
  const ayarBolumleri: AyarBolumu[] = [
    {
      baslik: 'Şirket sayfası',
      ogeler: [
        {
          anahtar: 'duzenle',
          etiket: 'Profili düzenle',
          ikon: <Pencil aria-hidden className="h-5 w-5" />,
          onClick: () => {
            setAyarlarAcik(false);
            onNavigate(DUZENLE_YOLU);
          },
        },
        {
          anahtar: 'kapak',
          etiket: 'Kapak fotoğrafı',
          ikon: <ImagePlus aria-hidden className="h-5 w-5" />,
          onClick: () => {
            setAyarlarAcik(false);
            onNavigate(KAPAK_YOLU);
          },
        },
        {
          anahtar: 'onizle',
          etiket: 'Öğrencinin gördüğü sayfa',
          ikon: <Eye aria-hidden className="h-5 w-5" />,
          onClick: () => {
            setAyarlarAcik(false);
            onNavigate(ONIZLE_YOLU);
          },
        },
      ],
    },
    {
      baslik: 'Hesap',
      ogeler: onCikis
        ? [
            {
              anahtar: 'cikis',
              etiket: 'Çıkış yap',
              ikon: <LogOut aria-hidden className="h-5 w-5" />,
              onClick: () => {
                setAyarlarAcik(false);
                onCikis();
              },
              tehlike: true,
            },
          ]
        : [],
    },
  ];

  return (
    /*
      MASAÜSTÜ GENİŞLİĞİ ÖĞRENCİ PROFİLİYLE AYNI (26 Eylül 2026): şirket
      paneli sayfa genişliğinde çiziliyordu ve 3:1 kapak bandı 1280'de
      ~1600×530 piksele büyüyordu. `ProfilSayfaDuzeni` öğrencinin /cv ve
      /profil ekranlarındaki 600 piksellik ana sütun (lg ve üstü); telefonda
      hiçbir sınıf eklemiyor, mobil görünüm aynı.
    */
    <ProfilSayfaDuzeni
      /*
        MASAÜSTÜ ÜÇ SÜTUN (27 Eylül 2026): öğrencinin /cv ekranıyla aynı kap
        ve eşikler — sol (1440+) şirket paneli, sağ (1280+) son başvurular
        ve işveren rehberi. Telefonda ve dar ekranda sütunlar çizilmiyor.
      */
      solSutun={
        <SirketSolSutun
          ilanlar={ilanlar}
          basvurular={basvurular}
          kartAcik={adayGorebilir(baglam.kademe)}
          takipci={takipciSayaci}
          onNavigate={onNavigate}
        />
      }
      yanSutun={
        <SirketYanSutun
          basvurular={basvurular}
          ilanlar={ilanlar}
          kartAcik={adayGorebilir(baglam.kademe)}
          onNavigate={onNavigate}
        />
      }
    >
    <div className="space-y-4">
      {/*
        SAYFA BAŞLIĞI "ŞİRKETİM" (26 Eylül 2026): alt çubuktaki adla aynı.
        Şirket adı aşağıda kimlik bandında (`h2`). Dişli hesap ayarlarını
        açıyor — çıkış artık orada.
      */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: SIRKET_METIN }}>
          Şirketim
        </h1>
        <button
          type="button"
          onClick={() => setAyarlarAcik(true)}
          aria-label="Hesap ayarları"
          className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 ${SIRKET_ODAK}`}
        >
          <Settings aria-hidden className="h-5 w-5" />
        </button>
      </div>
      <ProfilAyarlarSayfasi acik={ayarlarAcik} onKapat={ayarlariKapat} bolumler={ayarBolumleri} />

      {/* Ana alanın `px-4`ü telefonda geri alınıyor: görünüm kenarsız kap bekliyor. */}
      <div className="-mx-4 sm:mx-0">
      <SirketProfilGorunumu
        kimlik={sirketAcikKimligi(baglam, profil)}
        kullaniciAdi={sosyal?.kullaniciAdi ?? null}
        adBasligi="h2"
        /* Satır okunana kadar `undefined`: bant yönlendirmesi yanıp sönmesin. */
        kapakYolu={sosyalDurumu === 'hazir' ? (sosyal?.kapakFotografiYolu ?? null) : undefined}
        sayaclar={{
          paylasim: paylasimSayaci,
          aktifIlan: { durum: 'hazir', deger: aktifIlan },
          takipci: takipciSayaci,
        }}
        paylasimlar={paylasimlar}
        paylasimDurumu={paylasimDurumu}
        onPaylasimlariYenile={tazele}
        onNavigate={onNavigate}
        bildirim={bildirim}
        sahip={{
          ilanOlusturYolu: ILAN_OLUSTUR_YOLU,
          duzenleYolu: DUZENLE_YOLU,
          onizleYolu: ONIZLE_YOLU,
          /* Sosyal satır yoksa kapağın yazılacağı yer de yok: yönlendirme çizilmiyor. */
          kapakYolu: sosyal ? KAPAK_YOLU : undefined,
          paylasabilirMi,
          paylasimEngeli,
          onPaylasimEklendi: () => {
            /* Yalnız `tamamla` döndükten sonra: liste ve sayaç sunucudan yeniden. */
            tazele();
            setBildirim('Paylaşımın eklendi.');
            window.setTimeout(() => setBildirim(null), 2500);
          },
          onPaylasimArsivlendi: tazele,
        }}
        ilanlarIcerigi={
          ilanlar.length === 0 ? (
            /* 0 ilan: tek kart. Metin ve yol referans tasarımdan. */
            <div className={`${KUTU} text-center`} style={kutuStil}>
              <h2 className="text-lg font-extrabold" style={{ color: SIRKET_METIN }}>
                Henüz ilanınız yok
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
                İlk ilanı açmak birkaç dakika sürüyor: pozisyon, şehir, süre, ücret ve iş tanımı.
              </p>
              <a
                href={ILAN_OLUSTUR_YOLU}
                onClick={(olay) => {
                  if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0)
                    return;
                  olay.preventDefault();
                  onNavigate(ILAN_OLUSTUR_YOLU);
                }}
                className={`mx-auto mt-5 inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 text-sm font-black text-white hover:bg-[#1D4ED8] ${SIRKET_ODAK}`}
              >
                <Plus aria-hidden className="h-5 w-5" />
                İlan oluştur
              </a>
            </div>
          ) : (
            /*
              Mevcut ilan listesi, mevcut yetkiyle: Kapat / Yayınla, arşivle-sil,
              Düzenle ve Adaylar — İlanlar sekmesindekinin aynısı.
            */
            <GenelBakis
              baglam={baglam}
              ilanlar={ilanlar}
              basvurular={basvurular}
              profil={profil}
              onNavigate={onNavigate}
              onDurum={onDurum}
              onKaldir={onKaldir}
            />
          )
        }
      />
      </div>
    </div>
    </ProfilSayfaDuzeni>
  );
};
