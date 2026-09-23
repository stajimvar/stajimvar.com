import React from 'react';
import { CalendarDays, ImagePlus, Pencil } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI, RENK_PRIMARY } from '../../lib/renk-token';
import type { SosyalPaylasim, SosyalProfil, SosyalSayaclar } from '../../lib/queries/sosyal';
import { ogrenciKimligiGorunurMu } from '../../lib/sosyal-profil-kimligi.mjs';
import { katilmaMetni } from '../../lib/tarih.mjs';
import { BaglantiDugmesi } from './BaglantiDugmesi';
import { PaylasimIzgarasi } from './PaylasimIzgarasi';
import { ProfilFotografi } from './ProfilFotografi';
import { KapakFotografi } from './KapakFotografi';
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
 * DÜZEN KALIBI ŞİRKET PROFİLİNDEN (kullanıcı isteği, 20 Eylül 2026)
 * ----------------------------------------------------------------
 * Kullanıcı iki profil ekranının aynı kalıbı paylaşmasını istedi; şirket
 * referans (`src/sirket/SirketProfilGorunumu.tsx`), öğrenci uyarlanan.
 * Sıra: ortalanmış kimlik bandı → ince ayırıcı → sayaç satırı → eylem
 * satırı → "Paylaşımlar" ızgarası. Önceki yerleşimde kimlik solda,
 * sayaçlar ve düğmeler `lg:w-[400px]` ayrı bir sütundaydı; şirkette öyle
 * bir sütun hiç olmadığı için aynı kişi iki profili arasında geçerken
 * sayaçların yeri değişiyordu.
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
}

/*
  DÜĞME KALIBI ŞİRKET PROFİLİNDEN (kullanıcı isteği, 20 Eylül 2026)

  İki profil ekranı aynı düzen kalıbını paylaşacak; şirket referans,
  öğrenci uyarlanan. Bu yüzden dizeler `SirketProfilGorunumu` ile BİREBİR
  aynı: `min-h-12` (48 piksel, 44'lük dokunma eşiğinin üstünde), aynı
  köşe, aynı punto, aynı odak halkası.

  Önceki kalıp (`min-h-11 flex-1 ... border-gray-200 text-gray-800`)
  kalktı: aynı iki eylem iki ekranda iki farklı yükseklikte ve iki farklı
  gri tonunda duruyordu.
*/
const BIRINCIL = `inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold ${RENK_PRIMARY.zemin} ${RENK_PRIMARY.zeminHover} ${RENK_PRIMARY.yazi} ${RENK_GECISI} ${ODAK_HALKASI}`;
const IKINCIL = `inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-900 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`;

/**
 * Tek sayaç.
 *
 * Sayı BİLİNMİYORSA basılmıyor. Sıfır yazmak en kolay yol olurdu ama
 * "sunucu vermedi" ile "gerçekten sıfır" aynı şey değil; birincisini
 * sıfır diye göstermek uydurma veridir.
 */
/*
  Sayaç: büyük sayı üstte, küçük etiket altta.

  ÖLÇÜ ŞİRKET PROFİLİNDEKİYLE EŞİTLENDİ (20 Eylül 2026): sayı geniş
  ekranda `sm:text-[28px]` ile bir punto daha büyüyordu, şirketinki
  `text-2xl`de kalıyordu. İki profil aynı kalıbı paylaşacağı için
  fazladan basamak kalktı; mobil ölçü (24 piksel) zaten eşitti.
*/
export const Sayac: React.FC<{ etiket: string; deger: number }> = ({ etiket, deger }) => (
  <div className="flex flex-col items-center py-1 text-center">
    <dt className="order-2 mt-0.5 text-sm text-gray-600">{etiket}</dt>
    <dd className="order-1 text-2xl font-extrabold leading-tight tabular-nums text-gray-900">{deger}</dd>
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
  /*
    ETİKET KÜÇÜK HARF (kullanıcı kararı, 20 Eylül 2026: "tüm profil
    görüntüleri şirket gibi olsun"). Şirket profili "paylaşım · aktif
    ilan · takipçi" yazıyor, `/cv` kartı da "paylaşım · bağlantı ·
    takip"; büyük harfle başlayan tek yer burasıydı.
  */
  if (!sahibiMi) return <Sayac etiket="bağlantı" deger={deger} />;
  return (
    <div className="flex flex-col items-center py-1 text-center">
      <dt className="order-2 mt-0.5 text-sm text-gray-600">
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
            `items-start`, `items-center` DEĞİL (ölçüldü: Chromium, 390
            piksel, sahip görünümü). Dokunma hedefi 44 piksel olduğu için
            kutu kardeş etiketlerden (20 piksel) yüksek; ortalanınca
            METİN 12 piksel aşağı kayıyordu ve üç sayacın etiketi tek
            hizada durmuyordu. Üç hücrenin de `dt` üst kenarı 420
            pikselde; `items-start` ile yazı da orada başlıyor.

            BEDELİ ÖLÇÜLDÜ: sayaç satırı 73 → 97 piksel (fazlalık 24
            piksel, hücrenin ALTINDA boşluk olarak duruyor). Negatif
            margin ile geri alınmadı: 44 piksellik kutu alttaki eylem
            düğmesinin üstüne biner ve düğmeye dokunmak isteyen parmak
            bağlantı bağlantısına düşerdi.
          */
          className={`inline-flex min-h-11 items-start hover:underline ${ODAK_HALKASI}`}
        >
          bağlantı
        </a>
      </dt>
      <dd className="order-1 text-2xl font-extrabold leading-tight tabular-nums text-gray-900">{deger}</dd>
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
      ÖĞRENCİ PROFİLİ ŞİRKET PROFİLİYLE AYNI KALIPTA (kullanıcı isteği,
      20 Eylül 2026)

      Kullanıcı iki profil ekranının aynı düzeni paylaşmasını istedi;
      ŞİRKET referans (`src/sirket/SirketProfilGorunumu.tsx`), öğrenci
      uyarlanan. Kalıp sırayla: ortalanmış kimlik bandı (daire, ad,
      kullanıcı adı, kimlik satırları), ince ayırıcının altında sayaç
      satırı, onun altında eylem satırı.

      ÖNCEKİ DÜZEN: solda fotoğraf + kimlik, sağda `lg:w-[400px]` bir
      sütunda sayaçlar ve dikey dizilmiş eylemler; iki sütunu `lg:border-l`
      ayırıyordu. Şirket ekranında böyle bir sütun hiç yoktu, yani aynı
      kişi kendi şirketiyle kendi öğrenci profili arasında geçerken
      sayaçların ve düğmelerin yeri değişiyordu.

      SEKME ÇUBUĞU YOK — UYDURULMADI: şirkette üç bölüm var (kareler,
      ilanlar, hakkımızda), öğrencide tek bölüm var (paylaşımlar). Tek
      bölüm için sekme çizmek, olmayan bir bölümlemeyi varmış gibi
      göstermek olurdu. Bölümün adı bu yüzden tek yerde, ızgaranın
      üstündeki `h2`de kalıyor — şirkette kalkan başlık orada SEKMEYLE
      yineleniyordu, burada yineleyen bir şey yok.

      Kimlik İÇERİĞİ değişmedi: sahibe özel her şey (dişli, düzenleme,
      paylaşım düğmesi, hata cümleleri) yine `sahibiMi` koşulunun içinde;
      resmî hesapta öğrenci kimliği (`ogrenciKimligiGorunur`) yine gizli.

      TELEFONDA KART DEĞİL YÜZEY: kabuk telefonda kenarsız
      (`PROFIL_KABUGU`), kart tek alt çizgiyle bitiyor ve ızgara ekranın
      iki kenarına yaslı. Yan boşluk bu yüzden `header`ın kendisinde
      değil, içindeki iki bloğun `px-4`ünde — şirkettekiyle aynı.
    */
    <div className="space-y-0 sm:space-y-6">
      <header className="border-b border-gray-200 bg-white sm:rounded-2xl sm:border">
        {/*
          KAPAK BANDI (X kalıbı, 2/2) — başlığın en üstünde, 3:1

          Sahipte de ziyaretçide de aynı bant: okuma kapısı avatarınkiyle
          aynı fonksiyon (20261105010000), yani bu bileşene gelen profilin
          kapağı da görünür. Kapak yoksa ya da inemediyse nötr bant; sahte
          görsel yok. Değiştirme yolu burada DEĞİL — tek giriş düzenleme
          ekranı.

          `sm:rounded-t-[15px]`: başlığın köşesi 16, kenarı 1 piksel; bant
          iç kenara oturuyor. Başlığa `overflow-hidden` verilmedi — dişli
          menüsü başlığın içinden açılıyor ve kesilirdi.
        */}
        <KapakFotografi ad={baslik} yol={profil.kapakFotografiYolu} kip="bant" className="w-full sm:rounded-t-[15px]" />
        {/* ------------------------------------------- kimlik bandı */}
        <div className="px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          {/*
            Ortalanmış sütun `max-w-2xl` ile sınırlı: geniş ekranda
            biyografi bandın bir ucundan ötekine uzanıyordu ve ortalı
            metinde o satır uzunluğu okunmuyor (şirkette ölçülen gerekçe).
          */}
          {/* Sola hizalı kimlik (23 Eylül 2026): üç profil ekranı aynı kalıbı paylaşıyor. */}
          <div className="mx-auto flex max-w-2xl flex-col items-start text-left">
            {/*
              Yol boşsa baş harfler çiziliyor; sahte bir fotoğraf değil.
              Dosya kullanıcının oturumundan geçerek iniyor (`ProfilFotografi`).
            */}
            {/*
              BÜYÜTME (kullanıcı isteği, 17 Eylül 2026): dokununca tam ekran
              görüntüleyici. Paylaş sayfanın var olan `onPaylas`ı; kopya
              adresi yalnız profil YAYINDAYKEN (yayında olmayan profilin
              herkese açık adresi yok). Kalem `sahibiMi` kapısının
              arkasında: ziyaretçide prop hiç gitmiyor, DOM'a girmiyor.
            */}
            {/*
              FOTOĞRAF KAPAĞA BİNİYOR: bandın üst dolgusu üç profil
              ekranının ortak dizesi (testle kilitli), bu yüzden dolgu
              değil fotoğraf kabı negatif boşluk alıyor. Değer = üst
              dolgu + dairenin yarısı: 20+40 → -mt-15, 24+56 → sm:-mt-20,
              24+72 → lg:-mt-24. `relative` kabı kapağın ÜSTÜNDE
              çizdiriyor. Halka `ring-1 ring-blue-500/20` idi; kapağın
              üstünde o ince mavi çizgi kayboluyordu, yerini X'teki beyaz
              ayraç (`ring-4 ring-white`) aldı.
            */}
            <div className="relative -mt-15 sm:-mt-20 lg:-mt-24">
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
              `ring-offset` kadar nefes payı dairenin altında zaten var;
              şirketteki `mt-3` aynen geçerli.

              Ad ölçüsü de eşitlendi: `lg:text-[28px]` basamağı kalktı,
              şirketteki gibi `text-xl` → `sm:text-2xl`. `flex-wrap`:
              uzun ad ile tik dar ekranda alt satıra iniyor, kırpılmıyor.
            */}
            <div className="mt-3 flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1">
              <h1 className="min-w-0 break-words text-xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-2xl">
                {baslik}
              </h1>
              {/* Tik kardeş düğüm ve `shrink-0`: ad kırpılsa da yerinde duruyor. */}
              {!adAyri && <ResmiTik resmiMi={profil.resmiMi} />}
            </div>
            {/*
              KULLANICI ADI SATIRI ORTADA ama içerik değişmedi: şirkette
              burada yalnız bir `<p>` var, öğrencide aynı satırda tik ve
              sahibin dişli menüsü de duruyor. Bu yüzden satır bir flex
              kabı; `justify-center` ortalamayı şirketle aynı yapıyor.
            */}
            {(adAyri || (sahibiMi && onPaylas && onGorunurluk)) && (
              <div className="mt-0.5 flex max-w-full items-center justify-center gap-1">
                {adAyri && (
                  <>
                    <p className="min-w-0 truncate text-sm text-gray-600 sm:text-base">@{profil.kullaniciAdi}</p>
                    <ResmiTik resmiMi={profil.resmiMi} />
                  </>
                )}
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
                  />
                )}
              </div>
            )}
            {/* Ad gelmediyse rozet hiç çizilmiyor — "alanı" sözcüğü tek başına bilgi taşımaz. */}
            {ogrenciKimligiGorunur && profil.sektorAdi && (
              <p
                className={`mt-1.5 inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${RENK_PRIMARY.kenar} ${RENK_PRIMARY.yumusakZemin} ${RENK_PRIMARY.metin}`}
              >
                <span className="truncate">{profil.sektorAdi} alanı</span>
              </p>
            )}
            {/*
              RESMÎ BÖLÜM ADI KATALOGDAN, "EĞİTİM NOTU" KULLANICIDAN.
              Kullanıcının yazdığı metin `break-words` ile sarıyor, sessizce
              kırpılmıyor.

              Şirkette bu yerde sektör ve konum satırları var; öğrencide
              karşılığı bölüm, eğitim notu, sınıf ve şehir. Aynı yer, aynı
              punto, İÇERİK öğrencinin kendi gerçeği.
            */}
            {((ogrenciKimligiGorunur && (profil.bolumAdi || profil.bolumEtiketi || profil.sinifEtiketi)) ||
              profil.sehir) && (
              <div className="max-w-full space-y-0.5 pt-1 text-sm text-gray-600 sm:text-base">
                {ogrenciKimligiGorunur && profil.bolumAdi && (
                  <p className="break-words font-semibold text-gray-900">{profil.bolumAdi}</p>
                )}
                {ogrenciKimligiGorunur && profil.bolumEtiketi && (
                  <p className="break-words text-xs text-gray-600 sm:text-sm">
                    <span className="font-semibold">Eğitim notu:</span> {profil.bolumEtiketi}
                  </p>
                )}
                {ogrenciKimligiGorunur && profil.sinifEtiketi && (
                  <p className="break-words">{profil.sinifEtiketi}</p>
                )}
                {profil.sehir && <p className="break-words">{profil.sehir}</p>}
              </div>
            )}

            {/* KATILMA TARİHİ — `/cv` kartındaki satırın aynısı; ikon `aria-hidden`. */}
            {katilma && (
              <p className="mt-1.5 flex max-w-full min-w-0 items-center gap-1.5 text-sm text-gray-700 sm:mt-2.5">
                <CalendarDays aria-hidden className="h-4 w-4 shrink-0 text-gray-500" />
                <span className="min-w-0 truncate">{katilma}</span>
              </p>
            )}

            {/*
              BİYOGRAFİ BANDIN İÇİNDE, KISALTILMADAN

              Şirkette açıklama `line-clamp-3` ile üç satıra iniyor çünkü
              tam metni "Hakkımızda" sekmesi taşıyor. Öğrencide o sekme
              YOK — kısaltılsaydı metnin geri kalanına giden hiçbir yol
              kalmazdı. Bu yüzden satır sayısı sınırlanmıyor; sarma
              (`break-words`) ve satır sonları (`whitespace-pre-line`)
              aynen duruyor.
            */}
            {profil.biyografi && (
              <p className="mt-3 max-w-full whitespace-pre-line break-words text-sm leading-relaxed text-gray-800 sm:text-base">
                {profil.biyografi}
              </p>
            )}
          </div>
        </div>

        {/*
          BANDIN ALTI: SAYAÇLAR VE EYLEMLER

          Şirketteki ayrımın aynısı — kimlik bandı kendi bloğunda, sayaç
          ve düğmeler ayrı bir blokta, aralarında ince bir çizgi. Üst
          boşluğu bandın `pb`si veriyor.
        */}
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          {/*
            ÜÇ SAYI: paylaşım, bağlantı, takip. "Bağlantıda" diye dördüncü
            yok — bağlantı simetrik, o sayı aynı şeyi tekrar ederdi. Takip
            ise tek yönlü (→ şirket), bu yüzden gerçekten ayrı bir bilgi:
            kişinin kaç şirketi izlediği. Sayı herkese açık (RPC aynı
            satırda veriyor); LİSTE değil — takip edilen şirketler yalnız
            sahibinin Ağım'ında. Arada dikey çizgi yok: üç hücrede iki
            ayraç şeridi parçalıyordu.

            DÖRDÜNCÜ SAYAÇ UYDURULMADI: `sosyal_sayaclar` bir de `takipci`
            veriyor ama o sayı hedefi ŞİRKET olan takiplerin sayısı; bir
            öğrenci profili takip edilemediği için burada hep sıfır
            olurdu. Şirkette "takipçi" sayacı var, öğrencide YOK — sıfır
            göstermek için sahte bir hücre açmıyoruz.

            AYIRICI ŞİRKETTEKİYLE AYNI: `border-t ... pt-3`. Önceki
            `border-y ... py-2 lg:border-y-0 lg:py-0` iki sütunlu düzenin
            artığıydı — sayaçlar geniş ekranda kendi sütununa geçince
            çizgiler kaldırılıyordu. O sütun kalktı. Çizgi üç durumda da
            aynı yerde: yüklenirken, hazırken ve alınamadığında satır
            zıplamıyor.
          */}
          {sayacDurumu === 'yukleniyor' && (
            <div aria-busy="true" className="grid grid-cols-3 border-t border-gray-100 pt-3">
              <div aria-hidden className="mx-auto h-12 w-16 animate-pulse rounded bg-gray-100" />
              <div aria-hidden className="mx-auto h-12 w-16 animate-pulse rounded bg-gray-100" />
              <div aria-hidden className="mx-auto h-12 w-16 animate-pulse rounded bg-gray-100" />
            </div>
          )}
          {sayacDurumu === 'hazir' && sayaclar && (
            <dl className="grid grid-cols-3 border-t border-gray-100 pt-3">
              <Sayac etiket="paylaşım" deger={sayaclar.paylasim} />
              <BaglantiSayaci deger={sayaclar.baglanti} sahibiMi={sahibiMi} onNavigate={onNavigate} />
              <Sayac etiket="takip" deger={sayaclar.takip} />
            </dl>
          )}
          {(sayacDurumu === 'hata' || (sayacDurumu === 'hazir' && !sayaclar)) && (
            <p className="border-t border-gray-100 pt-3 text-center text-sm text-gray-600">
              Sayaçlar şu anda alınamadı.
            </p>
          )}

          {/*
            BAĞLANTI DÜĞMESİ YALNIZ ZİYARETÇİ DALINDA: kendine istek göndermek
            şemada da yasak. Düğme kendi durumunu sunucudan okuyor.

            Kabı şirketteki ziyaretçi eyleminin (Takip et) kabıyla birebir
            aynı: telefonda tam genişlik, `sm:` üstünde içerik genişliğinde
            ve ortada. Düğme kendi `className`ini almıyor, bu yüzden hizayı
            kap veriyor.
          */}
          {!sahibiMi && bakanId && (
            <div className="mt-3 flex flex-col items-stretch sm:items-center">
              <BaglantiDugmesi bakanId={bakanId} hedefId={profil.profilId} />
            </div>
          )}

          {/*
            SAHİBİN EYLEM SATIRI — ŞİRKETTEKİ IZGARANIN AYNISI

            Kap sınıfları şirketle BİREBİR: telefonda `grid grid-cols-2
            gap-3`, `sm:` üstünde `flex flex-wrap justify-center`. Sırayla
            önce paylaşma, sonra düzenleme — şirketteki sıranın aynısı
            (İlan paylaş · Fotoğraf paylaş · Profili düzenle).

            İLAN PAYLAŞ YOK: öğrencinin ilan açma yetkisi de rotası da
            yok. Şirkette olan her düğmeyi buraya kopyalamak, olmayan bir
            eylemi varmış gibi göstermek olurdu.

            İKİSİ DE `col-span-2`: şirkette iki BİRİNCİL eylem ilk satırı
            paylaşıyor, üçüncüsü tam satır kaplıyor. Öğrencide birincil
            eylem tek; yarım hücrede bırakılsaydı yanında boş bir hücre
            kalırdı. Telefonda ikisi alt alta tam genişlikte, `sm:` üstünde
            satır flex olduğu için `col-span` etkisiz ve ikisi yan yana.

            Düğme rolleri şirketle aynı: Fotoğraf paylaş BİRİNCİL (mavi),
            Profili düzenle İKİNCİL (beyaz çerçeveli). Öğrencide ikisi de
            beyazdı; aynı eylem iki ekranda iki farklı ağırlıkta duruyordu.

            SAHİBE ÖZEL: kap `sahibiMi` koşulunun İÇİNDE kuruluyor —
            ziyaretçide DOM'a hiç girmiyor, CSS ile gizlenmiyor. Kapın
            koşulu ayrıca "en az bir eylem var mı" diye soruyor: eylemsiz
            bir sahipte boş bir ızgara ve 12 piksellik ölü boşluk kalırdı.

            PAYLAŞIM DÜĞMESİNİN ÖNKOŞULU SUNUCUDAN: `yayinda_mi` ve
            `sector_id` — `sosyal_paylasim_baslat` taslağı yalnız ikisi
            birlikteyken açılıyor.
          */}
          {sahibiMi && (onDuzenle || (profil.yayindaMi && profil.sektorId && onPaylasimOlustur)) && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center">
              {profil.yayindaMi && profil.sektorId && onPaylasimOlustur && (
                <button
                  type="button"
                  onClick={onPaylasimOlustur}
                  className={`${BIRINCIL} col-span-2 sm:min-w-52`}
                >
                  <ImagePlus aria-hidden className="h-5 w-5" />
                  Fotoğraf paylaş
                </button>
              )}
              {onDuzenle && (
                <button type="button" onClick={onDuzenle} className={`${IKINCIL} col-span-2 sm:min-w-52`}>
                  <Pencil aria-hidden className="h-4 w-4" />
                  Profili düzenle
                </button>
              )}
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
