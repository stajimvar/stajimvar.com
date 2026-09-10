import React from 'react';
import { ImagePlus, Pencil } from 'lucide-react';
import {
  BIRINCIL_EYLEM,
  ODAK_HALKASI,
  RENK_GECISI,
  RENK_PRIMARY,
  RENK_UYARI,
} from '../../lib/renk-token';
import type { SosyalPaylasim, SosyalProfil, SosyalSayaclar } from '../../lib/queries/sosyal';
import { BaglantiDugmesi } from './BaglantiDugmesi';
import { PaylasimIzgarasi } from './PaylasimIzgarasi';
import { ProfilFotografi } from './ProfilFotografi';
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
 * SEKME YOK, ÖNE ÇIKANLAR YOK
 * ---------------------------
 * Üst bloğun hemen altında ızgara başlıyor. Yuvarlak "öne çıkanlar"
 * şeridi çizilmiyor çünkü hikâye altyapısı ve `highlights` tablosu yok;
 * boş bir şerit de bir vaat olurdu.
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
  /** Yayımlanmamış kendi profilindeki uyarı kutusunun eylemi. */
  onYayimla?: () => void;
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

const IKINCIL_EYLEM = `inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-800 hover:bg-gray-50 sm:flex-none ${RENK_GECISI} ${ODAK_HALKASI}`;

/**
 * Tek sayaç.
 *
 * Sayı BİLİNMİYORSA basılmıyor. Sıfır yazmak en kolay yol olurdu ama
 * "sunucu vermedi" ile "gerçekten sıfır" aynı şey değil; birincisini
 * sıfır diye göstermek uydurma veridir.
 */
const Sayac: React.FC<{ etiket: string; deger: number }> = ({ etiket, deger }) => (
  <div className="flex items-baseline gap-1.5">
    <dt className="order-2 text-sm text-gray-600">{etiket}</dt>
    <dd className="order-1 text-base font-extrabold tabular-nums text-gray-900">{deger}</dd>
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
const BaglantiSayaci: React.FC<{
  deger: number;
  sahibiMi: boolean;
  onNavigate?: (yol: string) => void;
}> = ({ deger, sahibiMi, onNavigate }) => {
  if (!sahibiMi) return <Sayac etiket="Bağlantı" deger={deger} />;
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="order-2 text-sm text-gray-600">
        <a
          href="/baglantilar"
          onClick={(olay) => {
            if (!onNavigate) return;
            if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0)
              return;
            olay.preventDefault();
            onNavigate('/baglantilar');
          }}
          className={`inline-flex min-h-11 items-center hover:underline ${ODAK_HALKASI}`}
        >
          Bağlantı
        </a>
      </dt>
      <dd className="order-1 text-base font-extrabold tabular-nums text-gray-900">{deger}</dd>
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
  onYayimla,
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

  return (
    <div className="space-y-4">
      <header className="space-y-3 rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5">
        <div className="flex items-start gap-3">
          {/*
            Yol boşsa baş harfler çiziliyor; sahte bir fotoğraf ya da
            genel bir "kişi" simgesi değil. Dosyanın indirilmesi
            `ProfilFotografi` içinde: paylaşılabilir bir adres yok, dosya
            kullanıcının oturumundan geçerek iniyor.
          */}
          <ProfilFotografi
            ad={baslik}
            yol={profil.avatarYolu}
            className="h-16 w-16 shrink-0 rounded-full text-lg ring-1 ring-blue-500/20 sm:h-20 sm:w-20 sm:text-xl"
          />

          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="truncate text-lg font-extrabold tracking-tight text-gray-900 sm:text-xl">
              {baslik}
            </h1>

            <div className="flex items-center gap-1">
              <p className="min-w-0 truncate text-sm text-gray-600">@{profil.kullaniciAdi}</p>
              {/* Dişli sahibe özel: ziyaretçide bu dal hiç çalışmıyor. */}
              {sahibiMi && onPaylas && onGorunurluk && (
                <ProfilAyarMenusu
                  onPaylas={onPaylas}
                  yayindaMi={profil.yayindaMi}
                  onGorunurluk={onGorunurluk}
                  onFotografDegistir={onFotografDegistir}
                  /*
                    Kaldırma satırının koşulu ekranda ne olduğunun
                    KENDİSİ: `avatar_path` dolu mu. Tahmin değil.
                  */
                  avatarVarMi={Boolean(profil.avatarYolu)}
                  onFotografKaldir={onFotografKaldir}
                  /*
                    Üç liste de sahip dalının içinde: bu blok zaten
                    `sahibiMi` koşulunun altında, ziyaretçide hiç
                    çalışmıyor.
                  */
                  onBegendiklerim={onBegendiklerim}
                  onKaydedilenler={onKaydedilenler}
                  onArsiv={onArsiv}
                  fotografDurumu={
                    fotografKaldirmaDurumu === 'gonderiliyor' ? 'gonderiliyor' : 'bekliyor'
                  }
                  /*
                    Menüye yalnız KİLİT durumu geçiyor. 'hata' bir kilit
                    değil: hatayı menü değil, aşağıdaki dürüst cümleler
                    anlatıyor — menü tıklandığı anda kapanıyor, orada
                    yazılan bir hata kimseye görünmezdi.
                  */
                  gorunurlukDurumu={
                    yayimlamaDurumu === 'gonderiliyor' ? 'gonderiliyor' : 'bekliyor'
                  }
                />
              )}
            </div>

            {/*
              Rozet "Tekstil ve Moda alanı" diye okunuyor: tek başına
              duran bir ad, kullanıcının bölümü mü şehri mi belli
              etmiyordu. Ad gelmediyse rozet hiç çizilmiyor — "alanı"
              sözcüğü tek başına bir bilgi taşımaz.
            */}
            {profil.sektorAdi && (
              <p
                className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${RENK_PRIMARY.kenar} ${RENK_PRIMARY.yumusakZemin} ${RENK_PRIMARY.metin}`}
              >
                <span className="truncate">{profil.sektorAdi} alanı</span>
              </p>
            )}
          </div>
        </div>

        {/*
          RESMÎ BÖLÜM ADI KATALOGDAN, "EĞİTİM NOTU" KULLANICIDAN

          İki bölüm bilgisi var ve ikisi aynı ağırlıkta çizilmiyor:
          `bolumAdi` `departments` ilişkisinden geliyor ve kullanıcı ona
          hiçbir yoldan yazamıyor (kolon yetkisi kapalı). `bolumEtiketi`
          ise serbest metin; oraya başka bir bölüm adı yazan kullanıcı
          sistem bölümünü taklit edebilirdi. Bu yüzden resmî satır her
          zaman katalogdan, kullanıcının notu ise açıkça "Eğitim notu"
          etiketiyle ve daha zayıf ağırlıkta.
        */}
        {(profil.bolumAdi ||
          profil.bolumEtiketi ||
          profil.sinifEtiketi ||
          profil.sehir ||
          profil.biyografi) && (
          /*
            KULLANICININ YAZDIĞI METİN SARIYOR, SESSİZCE KIRPILMIYOR

            Eğitim notu, sınıf, şehir ve biyografinin içeriğini kullanıcı
            yazıyor (resmî bölüm adı katalogdan gelir ve o da uzun
            olabilir). Boşluksuz uzun
            bir dize girildiğinde satır kutuya sığmıyordu: 390px
            yerleşiminde biyografi paragrafı clientWidth 336px,
            scrollWidth 722px ölçüldü. Sayfa kaymıyordu (body
            `overflow-x: clip`) ama tam da bu yüzden metnin yarısından
            fazlası GÖRÜNMEZ şekilde kesiliyor, kullanıcı kendi
            biyografisine ulaşamıyordu — kırpma hiçbir iz bırakmıyordu.

            `break-words` seçildi, `break-all` değil: yalnız satıra
            sığmayan uzun dizeyi kırıyor, normal Türkçe kelimeleri
            olduğu gibi bırakıyor. Sarmalayan kap blok düzeninde (header
            içinde bir <div>), esnek kutu ya da ızgara çocuğu değil; o
            yüzden burada `min-w-0` gerekmiyor, genişliğini zaten
            kutudan alıyor.

            Üstteki başlık, kullanıcı adı ve alan rozeti bilerek
            `truncate` kalıyor: onlar tek satırlık kimlik alanları ve
            ölçümde taşmıyorlar.
          */
          <div className="space-y-1 text-sm text-gray-700">
            {profil.bolumAdi && (
              <p className="break-words font-semibold text-gray-900">{profil.bolumAdi}</p>
            )}
            {profil.bolumEtiketi && (
              <p className="break-words text-xs text-gray-600">
                <span className="font-semibold">Eğitim notu:</span> {profil.bolumEtiketi}
              </p>
            )}
            {profil.sinifEtiketi && <p className="break-words">{profil.sinifEtiketi}</p>}
            {profil.sehir && <p className="break-words">{profil.sehir}</p>}
            {profil.biyografi && (
              <p className="whitespace-pre-line break-words leading-relaxed text-gray-800">
                {profil.biyografi}
              </p>
            )}
          </div>
        )}

        {/*
          SAYAÇLAR: YALNIZ İKİ TANE

          "Bağlantıda" diye üçüncü bir sayı yok — bağlantı simetrik ve tek
          satır olduğu için ikinci bir sayı aynı şeyi tekrar söylerdi.
        */}
        {sayacDurumu === 'yukleniyor' && (
          <div aria-busy="true" className="flex gap-5">
            <div aria-hidden className="h-5 w-24 animate-pulse rounded bg-gray-100" />
            <div aria-hidden className="h-5 w-24 animate-pulse rounded bg-gray-100" />
          </div>
        )}
        {sayacDurumu === 'hazir' && sayaclar && (
          <dl className="flex flex-wrap gap-5">
            <Sayac etiket="Paylaşım" deger={sayaclar.paylasim} />
            <BaglantiSayaci
              deger={sayaclar.baglanti}
              sahibiMi={sahibiMi}
              onNavigate={onNavigate}
            />
          </dl>
        )}
        {(sayacDurumu === 'hata' || (sayacDurumu === 'hazir' && !sayaclar)) && (
          <p className="text-sm text-gray-600">Sayaçlar şu anda alınamadı.</p>
        )}

        {/*
          YAYIMLANMAMIŞ PROFİL UYARISI — YALNIZ SAHİBİNE

          `yayinda_mi` false iken profil kimseye görünmüyor ve kullanıcı
          bunu hiçbir yerden anlayamıyordu: ekran, yayındaki profille
          birebir aynı görünüyordu. Kutu koşulun İÇİNDE; ziyaretçide ve
          başkasının profilinde DOM'a hiç girmiyor.

          `role="status"` seçildi, `alert` değil: bu bir hata değil, bir
          durum bildirimi — okuyucu aracını sözünü keserek kesmiyor.
        */}
        {sahibiMi && !profil.yayindaMi && onYayimla && (
          <div
            role="status"
            className={`space-y-2 rounded-xl border p-2.5 ${RENK_UYARI.kenar} ${RENK_UYARI.yumusakZemin} ${RENK_UYARI.metin}`}
          >
            <p className="text-sm font-bold">Alan topluluğuna henüz katılmadın</p>
            <p className="text-xs leading-relaxed">
              Şu anda profilini yalnızca sen görüyorsun. Katılırsan aynı alandaki öğrenciler
              profiline ulaşabilir.
            </p>
            <button
              type="button"
              onClick={onYayimla}
              disabled={yayimlamaDurumu === 'gonderiliyor'}
              className={BIRINCIL_EYLEM}
            >
              {yayimlamaDurumu === 'gonderiliyor' ? 'Topluluğa katılıyor…' : 'Topluluğa katıl'}
            </button>
            {/*
              BAŞARILI GİBİ GÖSTERME YOK: sunucu reddettiyse kullanıcı
              topluluğun dışında kalıyor ve cümle bunu açıkça söylüyor.
            */}
            {yayimlamaDurumu === 'hata' && (
              <p className="text-xs font-semibold leading-relaxed text-rose-700">
                Alan topluluğuna katılamadın; profilinde bir değişiklik olmadı. Yeniden
                deneyebilirsin.
              </p>
            )}
          </div>
        )}

        {/*
          YAYINDAN KALDIRMA HATASI AYRI BİR CÜMLE

          Yayımlama hatasını yukarıdaki uyarı kutusu anlatıyor, ama o kutu
          profil YAYINDAYKEN hiç çizilmiyor. Menüdeki "Yayından kaldır"
          başarısız olduğunda cümle olmasaydı ekranda hiçbir iz kalmazdı
          ve kullanıcı olmamış bir işi olmuş sanardı — sessiz başarısızlık
          başarı gibi okunur. Blok sahibiMi koşulunun içinde.
        */}
        {sahibiMi && profil.yayindaMi && yayimlamaDurumu === 'hata' && (
          <p role="alert" className="text-xs font-semibold leading-relaxed text-rose-700">
            Alan topluluğundan ayrılamadın; hâlâ topluluktasın. Yeniden deneyebilirsin.
          </p>
        )}

        {/*
          PAYLAŞIM DÜĞMESİ TOPLULUĞA KATILMIŞ SAHİBE ÖZEL

          Üç koşul da gerekli ve üçü de bu satırda: sahibi olmak,
          topluluğa katılmış olmak ve eylemin verilmiş olması.
          `sosyal_paylasim_baslat` topluluğa katılmamış kullanıcıyı
          'toplulukta-degil' ile reddediyor; düğmeyi yine de çizip hatayı
          sonradan göstermek, her basışta başarısız olan bir eylem
          sunmak olurdu. Katılmamış kullanıcı zaten yukarıdaki uyarı
          kutusunu görüyor ve oradaki eylem tam olarak bu düğmenin
          önkoşulu.

          Düzenleme düğmesiyle AYNI kutuya konmadı: o `onDuzenle`
          koşuluna bağlı ve iki eylemin görünürlük koşulu farklı. Ortak
          bir kutu, birinin koşulunu ötekine de dayatırdı.
        */}
        {sahibiMi && profil.yayindaMi && onPaylasimOlustur && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onPaylasimOlustur} className={IKINCIL_EYLEM}>
              <ImagePlus aria-hidden className="h-4 w-4" />
              Fotoğraf paylaş
            </button>
          </div>
        )}

        {sahibiMi && onDuzenle && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onDuzenle} className={IKINCIL_EYLEM}>
              <Pencil aria-hidden className="h-4 w-4" />
              Profili düzenle
            </button>
          </div>
        )}

        {/*
          FOTOĞRAF EYLEMLERİ BAŞLIKTA DEĞİL, DİŞLİ MENÜSÜNDE

          Burada "Fotoğrafı değiştir" adında üçüncü bir tam genişlik
          düğmesi vardı. Telefonda üst blok paylaşım + düzenleme + bu
          düğmeyle üç satır ediyordu ve ızgara ilk ekranın altına
          düşüyordu. Eylem menüye TAŞINDI, kopyalanmadı: iki giriş
          olsaydı biri değiştiğinde öteki geride kalırdı. Kaldırma da
          aynı menüde ve yalnız fotoğraf varken çiziliyor.
        */}

        {/*
          KALDIRMA BAŞARISIZ OLDUYSA CÜMLE BURADA

          Menü tıklandığı anda kapanıyor; hatayı orada yazmak kimseye
          görünmeyen bir cümle üretirdi. Sessiz başarısızlık başarı gibi
          okunur — kullanıcı fotoğrafının kalktığını sanırdı. Blok
          `sahibiMi` koşulunun içinde.
        */}
        {sahibiMi && fotografKaldirmaDurumu === 'hata' && (
          <p role="alert" className="text-xs font-semibold leading-relaxed text-rose-700">
            Profil fotoğrafın kaldırılamadı; fotoğrafın duruyor. Yeniden deneyebilirsin.
          </p>
        )}

        {/*
          BAĞLANTI DÜĞMESİ YALNIZ ZİYARETÇİ DALINDA

          Kendi profilinde çizilmiyor: kendine istek göndermek şemada da
          yasak. Düğme kendi durumunu sunucudan okuyor ve göremediği bir
          hedef için hiçbir şey çizmiyor — bu yüzden burada bir koşul daha
          yok.
        */}
        {!sahibiMi && bakanId && (
          <BaglantiDugmesi bakanId={bakanId} hedefId={profil.profilId} />
        )}

        {bildirim && (
          <p role="status" className="text-sm font-semibold text-gray-700">
            {bildirim}
          </p>
        )}
      </header>

      {/*
        BAŞLIK YOK, SEKME YOK

        Üst bloğun hemen altında ızgara geliyor. "Projeler", "Üretim
        Süreçleri", "CV ve Yetenekler" gibi bölümler çizilmiyor: profil
        tek bir üretim akışı, birden çok sekmeye bölünmüş bir dosya değil.
      */}
      {/*
        Boş ızgaranın cümlesi yetki durumuna bağlı: sahibinin boşluğu
        "hiç yok", ziyaretçinin boşluğu "sana açık bir şey yok".
      */}
      {/*
        `sahibiMi` ızgaraya da geçiyor: ayrıntı katmanındaki arşivleme ve
        görünürlük satırı bu bayrağın İÇİNDE çiziliyor, ziyaretçide DOM'a
        hiç girmiyor.
      */}
      <PaylasimIzgarasi
        paylasimlar={paylasimlar}
        durum={paylasimDurumu}
        onYenidenDene={onPaylasimlariYenile}
        sahibiMi={sahibiMi}
        onArsivlendi={sahibiMi ? onPaylasimArsivlendi : undefined}
      />
    </div>
  );
};
