import React from 'react';
import { BookOpen, Briefcase, CalendarDays, GraduationCap, ImagePlus, Layers, MapPin } from 'lucide-react';
import { ODAK_HALKASI } from '../../lib/renk-token';
import type { SosyalPaylasim, SosyalProfil, SosyalSayaclar } from '../../lib/queries/sosyal';
import { ogrenciKimligiGorunurMu } from '../../lib/sosyal-profil-kimligi.mjs';
import { katilmaMetni } from '../../lib/tarih.mjs';
import { BaglantiDugmesi } from './BaglantiDugmesi';
import { PaylasimIzgarasi } from './PaylasimIzgarasi';
import { ProfilFotografi } from './ProfilFotografi';
import { KapakFotografi } from './KapakFotografi';
import {
  AVATAR_BINMESI,
  AVATAR_SATIRI,
  BIYOGRAFI,
  HAP,
  HAP_BIRINCIL,
  MesajHapi,
  PaylasIkonDugmesi,
  ZIYARETCI_EYLEMLERI,
  HAP_SIRASI,
  IKON_HAP,
  KIMLIK_BANDI,
  META_SATIRI,
  MetaOgesi,
  SAYAC_ETIKETI,
  SAYAC_OGESI,
  SAYAC_SATIRI,
  SAYAC_SAYISI,
} from './ProfilKimlikKalibi';
import { ResmiTik } from './ResmiTik';
import { ProfilAyarMenusu } from './ProfilAyarMenusu';

/**
 * PROFİL SUNUMU — TEK BİLEŞEN, İKİ YETKİ DURUMU
 *
 * Sahip görünümü ve ziyaretçi görünümü AYRI BİLEŞENE ÇOĞALTILMIYOR. İki
 * kopya olsaydı bir alan birinde değişip ötekinde kalır ve ziyaretçi
 * kopyasına sahibe özel bir şeyin sızması hiçbir yerde yakalanmazdı.
 *
 * Ayrım tek yerde: `sahibiMi`. Sahibe özel her şey (dişli, düzenleme,
 * yayımlama uyarısı) bu koşulun İÇİNDE çiziliyor, yani ziyaretçide DOM'a
 * hiç girmiyor — CSS ile gizlenmiyor. Gizlenmiş bir düğme klavyeyle
 * bulunur.
 *
 * Ziyaretçi dalı artık gerçekten çiziliyor: `/profil/:kullaniciadi`
 * başkasının adı için de açılıyor. Görünmeyen, olmayan ve farklı
 * alandaki üç durum yine TEK güvenli ekrana düşüyor (ayrımı sayfa
 * yapıyor); bu bileşene ancak okunabilen bir profil geliyor.
 *
 * DÜZEN KALIBI X WEB PROFİLİNDEN (kullanıcı kararı, 24 Eylül 2026)
 * ----------------------------------------------------------------
 * Üç profil ekranı (bu, `/cv` kartı, şirket) aynı kalıbı paylaşıyor (20
 * Eylül kararı); referans şirket profiliydi, artık X'in masaüstü profil
 * sayfası. Sıra: kapak → avatar + sağda hap sırası → ad + tik, @ad →
 * biyografi → meta satırı → satır içi sayaçlar → "Paylaşımlar" ızgarası.
 * Dizeler ortak `ProfilKimlikKalibi` modülünde.
 *
 * SEKME YOK — UYDURULMADI: şirkette üç bölüm var (kareler, ilanlar,
 * hakkımızda), öğrencide bir tane (paylaşımlar). Tek bölüm için sekme
 * çubuğu çizmek olmayan bir bölümlemeyi varmış gibi göstermek olurdu.
 * Kimlikle paylaşımlar arasında geçiş yapılacak bir şey de yok: ikisi
 * aynı anda ekranda.
 *
 * ŞİRKETTE OLUP BURADA OLMAYANLAR: "İlan paylaş" düğmesi (öğrencinin
 * ilan açma yetkisi ve rotası yok), "aktif ilan" ve "takipçi" sayaçları
 * (öğrenci profili takip edilemiyor, ilanı da olmuyor — ikisi de burada
 * hep sıfır olurdu), logonun bulanık hâlinden yapılan bant zemini
 * (öğrenci avatarı yetkili indirmeyle geliyor, doğrudan bir adres yok).
 *
 * Yuvarlak "öne çıkanlar" şeridi çizilmiyor çünkü hikâye altyapısı ve
 * `highlights` tablosu yok; boş bir şerit de bir vaat olurdu.
 *
 * ARŞİV GÖRÜNÜMÜ YOK, ARŞİVLEME VAR
 * ---------------------------------
 * Paylaşım oluşturma akışı geldiği için arşiv artık dolabiliyor ve
 * arşivleme eylemi paylaşımın kendi ayrıntı katmanında duruyor. Ayrı bir
 * "Arşiv" GÖRÜNÜMÜ yine çizilmiyor: arşivden geri çıkarma akışı D'de
 * yok, yani o ekranda yapılabilecek tek şey bakmak olurdu. Süzgeç veri
 * katmanında hazır (`paylasimlariGetir({ arsiv: true })`); ekran, geri
 * çıkarma yolu tanımlandığında açılır.
 *
 * PROFİL FOTOĞRAFI ARTIK VAR — DEĞİŞTİRME YOLU YALNIZ SAHİBİNDE
 * -------------------------------------------------------------
 * Fotoğraf hem sahip hem ziyaretçi dalında çiziliyor: okuma politikası
 * (`avatar_dosyasi_gorunur`, 20260924020000) profilin kendi kitle
 * kuralını tekrarlıyor, yani görünmeyen bir profilin fotoğrafı da
 * görünmüyor. DEĞİŞTİRME ve KALDIRMA ise dişli menüsünde; menü
 * `sahibiMi` koşulunun içinde ağaca giriyor ve ekranın kendisi sayfanın
 * sahip dalında. Başkasının fotoğrafına giden bir yol arayüzde yok.
 * Yazma yetkisi 20260924040000 ile geldi (`grant update (avatar_path)` +
 * `avatar_yolu_kilidi`).
 */

interface GorunumProps {
  profil: SosyalProfil;
  sahibiMi: boolean;
  sayaclar: SosyalSayaclar | null;
  sayacDurumu: 'yukleniyor' | 'hazir' | 'hata';
  paylasimlar: SosyalPaylasim[];
  paylasimDurumu: 'yukleniyor' | 'hazir' | 'hata';
  onPaylasimlariYenile: () => void;
  /** Sahibe özel eylemler; ziyaretçide verilmiyor. */
  onDuzenle?: () => void;
  /** Profil BAĞLANTISINI paylaşma (pano / işletim sistemi menüsü). */
  onPaylas?: () => void;
  /**
   * Fotoğraf paylaşma ekranını açıyor.
   *
   * `onPaylas` ile karıştırılmamalı: o profilin adresini kopyalıyor, bu
   * yeni bir paylaşım oluşturuyor. İki eylem aynı adı taşısaydı, hangi
   * düğmenin ne yaptığı kodda okunamazdı.
   */
  onPaylasimOlustur?: () => void;
  /**
   * Profil fotoğrafı ekranını açıyor — SAHİBE ÖZEL.
   *
   * Ziyaretçi dalında verilmiyor ve satır dişli menüsünün içinde; menü
   * de yalnız `sahibiMi` dalında ağaca giriyor, ekranın kendisi ise
   * sayfanın sahip dalında. Bir bayrağı gizlemek yetmezdi: gizlenmiş
   * düğme klavyeyle bulunur.
   *
   * Başlıkta AYRI bir "Fotoğrafı değiştir" düğmesi YOK: eylem tek yerde,
   * dişli menüsünde. Gerekçesi `ProfilAyarMenusu` başlığında.
   */
  onFotografDegistir?: () => void;
  /** `avatar_path`i null'a çekiyor — yalnız fotoğraf varken menüde. */
  onFotografKaldir?: () => void;
  /**
   * Kaldırma isteğinin durumu.
   *
   * 'hata' bir kilit değil: menü tıklanınca kapandığı için hatayı menü
   * değil, aşağıdaki dürüst cümle anlatıyor.
   */
  fotografKaldirmaDurumu?: 'bekliyor' | 'gonderiliyor' | 'hata';
  /** Bir paylaşım arşivlendiğinde listeyi tazeleyen çağrı. */
  onPaylasimArsivlendi?: () => void;
  /**
   * Oturum sahibinin kendi listeleri — dişli menüsündeki üç satır.
   *
   * Ziyaretçi dalında VERİLMİYOR; verilmeyen satır menüde diziye hiç
   * girmiyor ve menünün kendisi zaten `sahibiMi` koşulunun içinde.
   * Ekranlar da sayfanın sahip dalında çiziliyor: gizlenmiş bir ekran
   * klavyeyle bulunur, çizilmeyen ekran bulunmaz.
   */
  onBegendiklerim?: () => void;
  onKaydedilenler?: () => void;
  onArsiv?: () => void;
  /**
   * Dişli menüsündeki çift yönlü eylem. İki eylem de sayfada AYNI
   * fonksiyondan besleniyor; iki ayrı yol olsaydı biri değiştiğinde öteki
   * geride kalırdı.
   */
  onGorunurluk?: () => void;
  yayimlamaDurumu?: 'bekliyor' | 'gonderiliyor' | 'hata';
  /** Panoya kopyalama gibi anlık geri bildirim. */
  bildirim?: string | null;
  /**
   * Bakan kişinin oturum kimliği.
   *
   * Yalnız ziyaretçi dalında kullanılıyor: bağlantı düğmesi hem bakanın
   * hem hedefin kimliğini istiyor. Sahip görünümünde çizilmiyor — kendine
   * bağlantı isteği diye bir şey yok (şemada da `kendine_istek_yok`).
   */
  bakanId?: string | null;
  /** Kart bağlantıları için; uygulama içi gezinme App'ten geliyor. */
  onNavigate?: (yol: string) => void;
  /**
   * Profil sahibinin okulu — sayfa katmanından (`sosyalOkullariniGetir`).
   *
   * Kullanıcı kararı (24 Eylül 2026): okul, profili görebilen herkese
   * görünüyor; bağlantı şartı yok. `null` ya da verilmemiş: okul
   * girilmemiş ya da alınamadı — öğe çizilmiyor, profil yine çiziliyor.
   */
  okul?: string | null;
  /**
   * Mesaj ekranını açar — ZİYARETÇİ DALI, isteğe bağlı.
   *
   * Bugün hiçbir çağıran vermiyor: mesajlaşmanın arka ucu yok. Arka uç
   * gelince sayfa verecek, gelmeden düğme çizilmiyor.
   */
  onMesaj?: () => void;
}

/*
  DÜĞME VE DÜZEN DİZELERİ `ProfilKimlikKalibi`nden (X web profili kalıbı,
  24 Eylül 2026). Üç profil ekranı aynı modülü içe aktarıyor; eski
  `BIRINCIL` / `IKINCIL` (48 piksellik `rounded-xl` blok düğmeler) yerini
  `min-h-11` haplara bıraktı.
*/

/**
 * Tek sayaç — satır içi: kalın sayı + gri etiket (X kalıbı).
 *
 * Sayı BİLİNMİYORSA basılmıyor. Sıfır yazmak en kolay yol olurdu ama
 * "sunucu vermedi" ile "gerçekten sıfır" aynı şey değil; birincisini
 * sıfır diye göstermek uydurma veridir. `dt`/`dd` yapısı korunuyor:
 * görsel sıra `order` ile sayı önde, okunuş "paylaşım: 6".
 */
export const Sayac: React.FC<{ etiket: string; deger: number }> = ({ etiket, deger }) => (
  <div className={SAYAC_OGESI}>
    <dt className={`order-2 ${SAYAC_ETIKETI}`}>{etiket}</dt>
    <dd className={`order-1 ${SAYAC_SAYISI}`}>{deger}</dd>
  </div>
);

/**
 * Bağlantı sayacı — kendi profilinde bir bağlantı.
 *
 * Gerçek `<a href>`: orta tuş ve "yeni sekmede aç" çalışıyor. Yalnız
 * SAHİBİNE bağlantı veriliyor, çünkü `/baglantilar` bakan kişinin KENDİ
 * listesi; başkasının sayacına basınca oraya gitmek, kullanıcıya
 * karşısındakinin bağlantılarını göreceğini düşündürürdü.
 */
export const BaglantiSayaci: React.FC<{
  deger: number;
  sahibiMi: boolean;
  onNavigate?: (yol: string) => void;
}> = ({ deger, sahibiMi, onNavigate }) => {
  /* Etiket küçük harf: üç profil ekranı "paylaşım · bağlantı · takip" yazımını paylaşıyor. */
  if (!sahibiMi) return <Sayac etiket="bağlantı" deger={deger} />;
  return (
    <div className={SAYAC_OGESI}>
      <dt className={`order-2 ${SAYAC_ETIKETI}`}>
        <a
          href="/baglantilar"
          onClick={(olay) => {
            if (!onNavigate) return;
            if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0)
              return;
            olay.preventDefault();
            onNavigate('/baglantilar');
          }}
          /*
            SATIR İÇİ SAYAÇTA `items-center`: eski üst-alt hücrede kutu
            kardeş etiketlerden yüksekti ve metni kaydırmamak için
            `items-start` gerekiyordu. Artık her sayaç aynı `min-h-11`
            kutuda; bağlantının 44 piksellik kutusu satırın kendi
            yüksekliği ve metin kardeşleriyle aynı çizgide.
          */
          className={`inline-flex min-h-11 items-center hover:underline ${ODAK_HALKASI}`}
        >
          bağlantı
        </a>
      </dt>
      <dd className={`order-1 ${SAYAC_SAYISI}`}>{deger}</dd>
    </div>
  );
};

export const SosyalProfilGorunumu: React.FC<GorunumProps> = ({
  profil,
  sahibiMi,
  sayaclar,
  sayacDurumu,
  paylasimlar,
  paylasimDurumu,
  onPaylasimlariYenile,
  onDuzenle,
  onPaylas,
  onPaylasimOlustur,
  onFotografDegistir,
  onFotografKaldir,
  fotografKaldirmaDurumu = 'bekliyor',
  onPaylasimArsivlendi,
  onBegendiklerim,
  onKaydedilenler,
  onArsiv,
  onGorunurluk,
  yayimlamaDurumu = 'bekliyor',
  bildirim,
  bakanId,
  onNavigate,
  okul = null,
  onMesaj,
}) => {
  /*
    Başlıkta görünen ad yoksa kullanıcı adı geçiyor. Uydurma bir ad
    (örneğin e-postanın baş kısmı) üretilmiyor.
  */
  const baslik = profil.gorunenAd ?? `@${profil.kullaniciAdi}`;
  const ogrenciKimligiGorunur = ogrenciKimligiGorunurMu(profil.resmiMi);

  /*
    Görünen ad yoksa başlık zaten "@kullaniciadi"; altında aynı satırı
    ikinci kez yazmak (@stajimvar / @stajimvar) tekrar oluyordu.
  */
  const adAyri = Boolean(profil.gorunenAd);
  /*
    Katılma satırı resmî hesapta da var: öğrenci kimliği gibi gizlenecek
    bir bilgi değil, hesabın yaşı. Okunamazsa (null) satır yok.
  */
  const katilma = katilmaMetni(profil.katilmaAni);

  return (
    /*
      ÖĞRENCİ PROFİLİ X WEB PROFİLİNİN KALIBINDA (kullanıcı kararı, 24
      Eylül 2026: "stajımvar web profili x in profille girince olan web
      arayuzune uyarla")

      Üç profil ekranı aynı kalıbı paylaşıyor (20 Eylül kararı); referans
      şirket profiliydi, artık X. Sıra ve gerekçeler `ProfilKimlikKalibi`
      başlığında: kapak → avatar + sağda hap sırası → ad + tik, @ad →
      biyografi → meta satırı → satır içi sayaçlar. Her şey başlığın sol
      dolgusundan başlıyor; ortalanmış `max-w-2xl` sütunu kalktı.

      SEKME ÇUBUĞU YOK — UYDURULMADI: şirkette üç bölüm var (kareler,
      ilanlar, hakkımızda), öğrencide tek bölüm var (paylaşımlar). Tek
      bölüm için sekme çizmek, olmayan bir bölümlemeyi varmış gibi
      göstermek olurdu. Bölümün adı ızgaranın üstündeki `h2`de kalıyor.

      Kimlik İÇERİĞİ değişmedi: sahibe özel her şey (dişli, düzenleme,
      paylaşım düğmesi, hata cümleleri) yine `sahibiMi` koşulunun içinde;
      resmî hesapta öğrenci kimliği (`ogrenciKimligiGorunur`) yine gizli.

      TELEFONDA KART DEĞİL YÜZEY: kabuk telefonda kenarsız
      (`PROFIL_KABUGU`), başlık tek alt çizgiyle bitiyor ve ızgara ekranın
      iki kenarına yaslı. Yan boşluk bu yüzden `header`ın kendisinde değil,
      kimlik bandının `px-4`ünde.
    */
    <div className="space-y-0 sm:space-y-6">
      <header className="border-b border-gray-200 bg-white sm:rounded-2xl sm:border">
        {/*
          KAPAK BANDI — başlığın en üstünde, 3:1 (lg'de 5:1; oran kararı
          `KapakFotografi` içinde). Sahipte de ziyaretçide de aynı bant:
          okuma kapısı avatarınkiyle aynı fonksiyon (20261105010000). Kapak
          yoksa ya da inemediyse nötr bant; sahte görsel yok.

          `sm:rounded-t-[15px]`: başlığın köşesi 16, kenarı 1 piksel.
          Başlığa `overflow-hidden` verilmedi — dişli menüsü başlığın
          içinden açılıyor ve kesilirdi.
        */}
        <KapakFotografi ad={baslik} yol={profil.kapakFotografiYolu} className="w-full sm:rounded-t-[15px]" />

        {/* ------------------------------------------- kimlik bandı */}
        <div className={KIMLIK_BANDI}>
          <div className={AVATAR_SATIRI}>
            {/*
              FOTOĞRAF KAPAĞA YARI YARIYA BİNİYOR (`AVATAR_BINMESI`: 40 / 56
              / 72). `relative` kap kapağın ÜSTÜNDE çizdiriyor. Halka
              `ring-4 ring-white`: X'teki beyaz ayraç.

              BÜYÜTME (kullanıcı isteği, 17 Eylül 2026): dokununca tam ekran
              görüntüleyici. Kalem `sahibiMi` kapısının arkasında:
              ziyaretçide prop hiç gitmiyor, DOM'a girmiyor.
            */}
            <div className={AVATAR_BINMESI}>
              <ProfilFotografi
                ad={baslik}
                yol={profil.avatarYolu}
                className="h-20 w-20 shrink-0 rounded-full text-2xl ring-4 ring-white sm:h-28 sm:w-28 sm:text-3xl lg:h-36 lg:w-36 lg:text-4xl"
                buyutme={{
                  onPaylas,
                  kullaniciAdi: profil.yayindaMi ? profil.kullaniciAdi : null,
                  onFotografDegistir: sahibiMi ? onFotografDegistir : undefined,
                }}
              />
            </div>

            {/*
              HAP SIRASI — avatar satırının sağı, alt hiza (X'teki "Edit
              profile" yeri). Üç dal, üçü de kendi yetki kapısında:

                sahip      dişli menüsü (X'teki "…"; @ad satırından buraya
                           taşındı), Fotoğraf paylaş, Profili düzenle
                ziyaretçi  yalnız yuvarlak ikon düğmesi: profili paylaş
                           (X mobil kalıbı, 24 Eylül 2026). Bağlantı
                           durumu ve Mesaj sayaçların altındaki eylem
                           satırında — aşağıda.

              "FOTOĞRAF PAYLAŞ" KALDI: ızgaranın başlığında da var ama
              buradaki kopyanın koşulu sunucunun önkoşulunu ölçüyor
              (`yayinda_mi` + `sector_id`, `sosyal_paylasim_baslat`) ve
              `sosyal-profil-arayuzu` bunu kilitliyor. Telefonda yalnız ikon.
              Ölçüldü (Chromium, yerleşim genişliği 360): avatarın yanında
              236 piksel kalıyor; dişli 44 + ikon hap 48 + "Profili düzenle"
              128.7 + aralar 12 = 232.7, tek satır. Metinli hap 156.1
              piksel olurdu ve sığmazdı. Metin `sr-only` ile erişilebilir
              adda kalıyor.

              CSS ile gizleme yok: sahibe özel her düğme `sahibiMi`
              koşulunun İÇİNDE; ziyaretçide DOM'a girmiyor.
            */}
            <div className={HAP_SIRASI}>
              {sahibiMi && onPaylas && onGorunurluk && (
                <ProfilAyarMenusu
                  onPaylas={onPaylas}
                  yayindaMi={profil.yayindaMi}
                  onGorunurluk={onGorunurluk}
                  onFotografDegistir={onFotografDegistir}
                  /* Kaldırma satırının koşulu ekranda ne olduğunun kendisi: `avatar_path` dolu mu. */
                  avatarVarMi={Boolean(profil.avatarYolu)}
                  onFotografKaldir={onFotografKaldir}
                  onBegendiklerim={onBegendiklerim}
                  onKaydedilenler={onKaydedilenler}
                  onArsiv={onArsiv}
                  fotografDurumu={fotografKaldirmaDurumu === 'gonderiliyor' ? 'gonderiliyor' : 'bekliyor'}
                  gorunurlukDurumu={yayimlamaDurumu === 'gonderiliyor' ? 'gonderiliyor' : 'bekliyor'}
                  tetikSinifi={IKON_HAP}
                />
              )}
              {!sahibiMi && onPaylas && <PaylasIkonDugmesi onPaylas={onPaylas} />}
              {sahibiMi && (onDuzenle || (profil.yayindaMi && profil.sektorId && onPaylasimOlustur)) && (
                <>
                  {profil.yayindaMi && profil.sektorId && onPaylasimOlustur && (
                    <button type="button" onClick={onPaylasimOlustur} className={HAP_BIRINCIL}>
                      <ImagePlus aria-hidden className="h-4 w-4 shrink-0" />
                      <span className="sr-only sm:not-sr-only">Fotoğraf paylaş</span>
                    </button>
                  )}
                  {onDuzenle && (
                    <button type="button" onClick={onDuzenle} className={HAP}>
                      Profili düzenle
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/*
            AD + TİK, ALTINDA @AD (X sırası). `flex-wrap`: uzun ad ile tik
            dar ekranda alt satıra iniyor, kırpılmıyor. Tik kardeş düğüm ve
            `shrink-0` (ResmiTik): ad sarsa da yerinde duruyor.
          */}
          <div className="mt-3 flex max-w-full flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="min-w-0 break-words text-xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-2xl">
              {baslik}
            </h1>
            <ResmiTik resmiMi={profil.resmiMi} />
          </div>
          {/*
            Görünen ad yoksa başlık zaten "@kullaniciadi"; altında aynı
            satırı ikinci kez yazmak tekrar olurdu.
          */}
          {adAyri && (
            <p className="mt-0.5 min-w-0 max-w-full truncate text-sm text-gray-600 sm:text-base">@{profil.kullaniciAdi}</p>
          )}

          {/*
            BİYOGRAFİ — X sırası: ad bloğunun altında, meta satırının üstünde.

            Şirkette açıklama `line-clamp-3` ile kısalıyor çünkü tam metni
            "Hakkımızda" sekmesi taşıyor. Öğrencide o sekme YOK —
            kısaltılsaydı metnin geri kalanına giden hiçbir yol kalmazdı.
            Sarma (`break-words`) ve satır sonları (`whitespace-pre-line`)
            aynen duruyor; okunabilirlik için tek genişlik sınırı burada.
          */}
          {profil.biyografi && <p className={BIYOGRAFI}>{profil.biyografi}</p>}

          {/*
            META SATIRI — alan, bölüm · sınıf, şehir, katılma; ikonlu, gri,
            sarıyor. Olmayan öğe çizilmiyor.

            Alan eskiden mavi bir kapsüldü; X kalıbında meta satırının bir
            öğesi. Ad gelmediyse öğe hiç yok — "alanı" sözcüğü tek başına
            bilgi taşımaz. Resmî hesapta alan ve bölüm · sınıf gizli
            (`ogrenciKimligiGorunur`); şehir ve katılma kurum kimliğinin de
            parçası, onlar kalıyor.
          */}
          {((ogrenciKimligiGorunur && (okul || profil.sektorAdi || profil.bolumAdi || profil.sinifEtiketi)) ||
            profil.sehir ||
            katilma) && (
            <div className={META_SATIRI}>
              {/*
                OKUL: resmî hesapta çizilmiyor — sunucu zaten vermiyor
                (`sosyal_okullari` resmî hesabı dışarıda bırakıyor), arayüz
                de sormuyor; kapı burada ikinci kez çekiliyor.
              */}
              {ogrenciKimligiGorunur && okul && (
                <MetaOgesi ikon={GraduationCap} etiket="Okul">
                  {okul}
                </MetaOgesi>
              )}
              {/*
                BÖLÜM VE SINIF İKİ AYRI ÖĞE, "·" İLE BİRLEŞMİYOR: bölüm adı
                katalogdan (`departments`), sınıf etiketi kullanıcının
                yazdığı metin. Aynı öğede dursalar, kullanıcı sınıf alanına
                bir bölüm adı yazarak resmî bölümü uzatabilir ya da taklit
                edebilirdi ("Bilgisayar Müh. · Tıp Fakültesi").
              */}
              {ogrenciKimligiGorunur && profil.bolumAdi && (
                <MetaOgesi ikon={BookOpen} etiket="Bölüm">
                  {profil.bolumAdi}
                </MetaOgesi>
              )}
              {ogrenciKimligiGorunur && profil.sinifEtiketi && (
                <MetaOgesi ikon={Layers} etiket="Sınıf">
                  {profil.sinifEtiketi}
                </MetaOgesi>
              )}
              {/*
                SIRA İKİ EKRANDA AYNI (kullanıcı bildirimi, 24 Eylül 2026):
                okul → bölüm → sınıf → alan → şehir → katılma. /cv kartında
                okul → bölüm · sınıf → konum → katılma; alan orada yok, öteki
                öğeler aynı sırada. Alan eskiden okulun hemen ardındaydı ve
                bölümle aynı satıra düşüyordu; iki ekranda aynı bilgiler
                farklı sırada okunuyordu.
              */}
              {ogrenciKimligiGorunur && profil.sektorAdi && (
                <MetaOgesi ikon={Briefcase} etiket="Alan">
                  {profil.sektorAdi} alanı
                </MetaOgesi>
              )}
              {profil.sehir && (
                <MetaOgesi ikon={MapPin} etiket="Şehir">
                  {profil.sehir}
                </MetaOgesi>
              )}
              {katilma && (
                <MetaOgesi ikon={CalendarDays} etiket="Katılma">
                  {katilma}
                </MetaOgesi>
              )}
            </div>
          )}

          {/*
            "EĞİTİM NOTU" META SATIRINA KARIŞMIYOR: resmî bölüm adı
            katalogdan, bu not kullanıcının serbest metni. Aynı satırda
            dursalar, kullanıcının yazdığı bir cümle katalog bilgisiyle aynı
            ağırlıkta okunur ve resmî bölüm adını taklit edebilirdi. Ayrı
            satırda, etiketli ve ikincil tonda kalıyor; `break-words` ile
            sarıyor, sessizce kırpılmıyor.
          */}
          {ogrenciKimligiGorunur && profil.bolumEtiketi && (
            <p className="mt-1 max-w-2xl break-words text-xs text-gray-600 sm:text-sm">
              <span className="font-semibold">Eğitim notu:</span> {profil.bolumEtiketi}
            </p>
          )}

          {/*
            SAYAÇ SATIRI — tek satır, satır içi: paylaşım, bağlantı, takip.
            "Bağlantıda" diye dördüncü yok — bağlantı simetrik. Takip tek
            yönlü (→ şirket), kişinin kaç şirketi izlediği; sayı herkese
            açık, LİSTE değil. `takipci` çizilmiyor: öğrenci profili takip
            edilemediği için hep sıfır olurdu.

            ÜÇ DURUM, AYNI SATIR: yüklenirken satır içi iskelet, hazırken
            sayılar, alınamadığında cümle — sıfır uydurulmuyor. Üçü de aynı
            `min-h-11` yükseklikte, sayı gelince altı zıplamıyor.
          */}
          {sayacDurumu === 'yukleniyor' && (
            <div aria-busy="true" className={SAYAC_SATIRI}>
              <span aria-hidden className={SAYAC_OGESI}>
                <span className="h-4 w-5 animate-pulse rounded bg-gray-100" />
                <span className="h-4 w-14 animate-pulse rounded bg-gray-100" />
              </span>
              <span aria-hidden className={SAYAC_OGESI}>
                <span className="h-4 w-5 animate-pulse rounded bg-gray-100" />
                <span className="h-4 w-14 animate-pulse rounded bg-gray-100" />
              </span>
              <span aria-hidden className={SAYAC_OGESI}>
                <span className="h-4 w-5 animate-pulse rounded bg-gray-100" />
                <span className="h-4 w-14 animate-pulse rounded bg-gray-100" />
              </span>
            </div>
          )}
          {sayacDurumu === 'hazir' && sayaclar && (
            <dl className={SAYAC_SATIRI}>
              <Sayac etiket="paylaşım" deger={sayaclar.paylasim} />
              <BaglantiSayaci deger={sayaclar.baglanti} sahibiMi={sahibiMi} onNavigate={onNavigate} />
              <Sayac etiket="takip" deger={sayaclar.takip} />
            </dl>
          )}
          {(sayacDurumu === 'hata' || (sayacDurumu === 'hazir' && !sayaclar)) && (
            <p className={`${SAYAC_SATIRI} ${SAYAC_ETIKETI} min-h-11 text-sm`}>Sayaçlar şu anda alınamadı.</p>
          )}

          {/*
            ZİYARETÇİ EYLEM SATIRI — X mobil kalıbı (kullanıcı ekran
            görüntüsü, 24 Eylül 2026): sayaçların altında, tam genişlik.
            [Mesaj] [bağlantı durumu] iki eşit hücre; Mesaj yoksa (bugün
            hep yok, arka ucu yok) bağlantı hapı tek başına tam satır.
            Hücre genişliğini bağlantı düğmesi kendi durumundan seçiyor
            (gelen istekte Kabul et + Reddet tam satır); gerekçe
            `ProfilKimlikKalibi`nde.

            Bağlantı düğmesi YALNIZ ZİYARETÇİ DALINDA: kendine istek
            göndermek şemada da yasak (`kendine_istek_yok`). Düğme kendi
            durumunu sunucudan okuyor.
          */}
          {!sahibiMi && bakanId && (
            <div className={ZIYARETCI_EYLEMLERI}>
              {onMesaj && <MesajHapi onMesaj={onMesaj} />}
              <BaglantiDugmesi bakanId={bakanId} hedefId={profil.profilId} />
            </div>
          )}

          {/* Sahibe özel hata cümleleri: menü tıklanınca kapandığı için burada. */}
          {sahibiMi && yayimlamaDurumu === 'hata' && (
            <p role="alert" className="mt-3 text-xs font-semibold leading-relaxed text-rose-700">
              Profilinin görünürlüğü değiştirilemedi; eski ayarın duruyor. Yeniden deneyebilirsin.
            </p>
          )}
          {sahibiMi && fotografKaldirmaDurumu === 'hata' && (
            <p role="alert" className="mt-3 text-xs font-semibold leading-relaxed text-rose-700">
              Profil fotoğrafın kaldırılamadı; fotoğrafın duruyor. Yeniden deneyebilirsin.
            </p>
          )}
          {bildirim && (
            <p role="status" className="mt-3 text-sm font-semibold text-gray-700">
              {bildirim}
            </p>
          )}
        </div>
      </header>

      {/*
        PAYLAŞIMLAR — Instagram ızgarası (sahibin ekranıyla aynı `galeri`).
        `sahibiMi` ızgaraya da geçiyor: ayrıntı katmanındaki arşivleme bu
        bayrağın içinde, ziyaretçide DOM'a girmiyor.
      */}
      <section aria-labelledby="ziyaretci-paylasimlar" className="min-w-0 space-y-4">
        <h2
          id="ziyaretci-paylasimlar"
          className="px-4 pt-5 text-xl font-extrabold tracking-tight text-gray-900 sm:px-0 sm:pt-0 sm:text-2xl"
        >
          Paylaşımlar
        </h2>
        <PaylasimIzgarasi
          paylasimlar={paylasimlar}
          durum={paylasimDurumu}
          onYenidenDene={onPaylasimlariYenile}
          sahibiMi={sahibiMi}
          onArsivlendi={sahibiMi ? onPaylasimArsivlendi : undefined}
          gorunum="galeri"
          kullaniciAdi={profil.kullaniciAdi}
        />
      </section>
    </div>
  );
};
