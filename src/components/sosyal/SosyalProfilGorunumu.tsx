import React from 'react';
import { ImagePlus, Pencil } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI, RENK_PRIMARY } from '../../lib/renk-token';
import type { SosyalPaylasim, SosyalProfil, SosyalSayaclar } from '../../lib/queries/sosyal';
import { ogrenciKimligiGorunurMu } from '../../lib/sosyal-profil-kimligi.mjs';
import { BaglantiDugmesi } from './BaglantiDugmesi';
import { PaylasimIzgarasi } from './PaylasimIzgarasi';
import { ProfilFotografi } from './ProfilFotografi';
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
 * İKİ SÜTUN, SEKME YOK, ÖNE ÇIKANLAR YOK
 * --------------------------------------
 * Yerleşim sahibin birleşik ekranıyla (`/cv`) aynı iskeleti kullanıyor:
 * lg ve üstünde solda kimlik kartı, sağda ızgara;
 * altında tek sütun. Sekme yok — kimlikle paylaşımlar arasında geçiş
 * yapılacak bir şey kalmıyor, ikisi aynı anda ekranda.
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

const IKINCIL_EYLEM = `inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-800 hover:bg-gray-50 sm:flex-none ${RENK_GECISI} ${ODAK_HALKASI}`;

/**
 * Tek sayaç.
 *
 * Sayı BİLİNMİYORSA basılmıyor. Sıfır yazmak en kolay yol olurdu ama
 * "sunucu vermedi" ile "gerçekten sıfır" aynı şey değil; birincisini
 * sıfır diye göstermek uydurma veridir.
 */
/* Sayaç: büyük sayı üstte, küçük etiket altta — sahibin /cv kartıyla aynı ölçü. */
export const Sayac: React.FC<{ etiket: string; deger: number }> = ({ etiket, deger }) => (
  <div className="flex flex-col items-center py-1 text-center">
    <dt className="order-2 mt-0.5 text-sm text-gray-600">{etiket}</dt>
    <dd className="order-1 text-2xl font-extrabold leading-tight tabular-nums text-gray-900 sm:text-[28px]">{deger}</dd>
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
  if (!sahibiMi) return <Sayac etiket="Bağlantı" deger={deger} />;
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
          className={`inline-flex min-h-11 items-center hover:underline ${ODAK_HALKASI}`}
        >
          Bağlantı
        </a>
      </dt>
      <dd className="order-1 text-2xl font-extrabold leading-tight tabular-nums text-gray-900 sm:text-[28px]">{deger}</dd>
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

  return (
    /*
      ZİYARETÇİ PROFİLİ — SAHİBİN /cv EKRANIYLA AYNI TASARIM (17 Eylül 2026)

      Solda kart, sağda ızgara düzeni kalktı: üstte tam genişlikte yatay
      kimlik kartı (solda fotoğraf ve kimlik, sağda iki sayaç ve eylem),
      altında "Paylaşımlar" başlığı ve Instagram ızgarası (telefonda 3,
      geniş ekranda 4 sütun, `gorunum="galeri"`). Kişi kendi ekranıyla
      başkasının ekranı arasında geçerken düzen artık aynı.

      Kartın İÇERİĞİ değişmedi: sahibe özel her şey (dişli, düzenleme,
      paylaşım düğmesi, hata cümleleri) yine `sahibiMi` koşulunun içinde;
      resmî hesapta öğrenci kimliği (`ogrenciKimligiGorunur`) yine gizli.

      TELEFONDA KART DEĞİL YÜZEY: kabuk telefonda kenarsız
      (`PROFIL_KABUGU`), kart tek alt çizgiyle bitiyor ve ızgara ekranın
      iki kenarına yaslı.
    */
    <div className="space-y-0 sm:space-y-6">
      <header className="border-b border-gray-200 bg-white px-4 py-5 sm:rounded-2xl sm:border sm:p-6 lg:px-8 lg:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
          {/* ---------------- Fotoğraf ve kimlik ---------------- */}
          <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
            {/*
              Yol boşsa baş harfler çiziliyor; sahte bir fotoğraf değil.
              Dosya kullanıcının oturumundan geçerek iniyor (`ProfilFotografi`).
            */}
            <ProfilFotografi
              ad={baslik}
              yol={profil.avatarYolu}
              className="h-20 w-20 shrink-0 rounded-full text-2xl ring-1 ring-blue-500/20 sm:h-28 sm:w-28 sm:text-3xl lg:h-36 lg:w-36 lg:text-4xl"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <h1 className="min-w-0 break-words text-xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-2xl lg:text-[28px]">
                  {baslik}
                </h1>
                {/* Tik kardeş düğüm ve `shrink-0`: ad kırpılsa da yerinde duruyor. */}
                {!adAyri && <ResmiTik resmiMi={profil.resmiMi} />}
              </div>
              {(adAyri || (sahibiMi && onPaylas && onGorunurluk)) && (
                <div className="flex items-center gap-1">
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
                  className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${RENK_PRIMARY.kenar} ${RENK_PRIMARY.yumusakZemin} ${RENK_PRIMARY.metin}`}
                >
                  <span className="truncate">{profil.sektorAdi} alanı</span>
                </p>
              )}
              {/*
                RESMÎ BÖLÜM ADI KATALOGDAN, "EĞİTİM NOTU" KULLANICIDAN.
                Kullanıcının yazdığı metin `break-words` ile sarıyor, sessizce
                kırpılmıyor.
              */}
              {((ogrenciKimligiGorunur && (profil.bolumAdi || profil.bolumEtiketi || profil.sinifEtiketi)) ||
                profil.sehir) && (
                <div className="space-y-0.5 pt-1 text-sm text-gray-600 sm:text-base">
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
            </div>
          </div>

          {/* ---------------- Sayaçlar ve eylemler ---------------- */}
          <div className="space-y-4 lg:flex lg:w-[400px] lg:shrink-0 lg:flex-col lg:justify-center lg:self-stretch lg:border-l lg:border-gray-200 lg:pl-8">
            {/* Yalnız iki sayı: bağlantı simetrik, üçüncü bir sayı aynı şeyi tekrar ederdi. */}
            {sayacDurumu === 'yukleniyor' && (
              <div aria-busy="true" className="grid grid-cols-2 gap-4">
                <div aria-hidden className="mx-auto h-12 w-20 animate-pulse rounded bg-gray-100" />
                <div aria-hidden className="mx-auto h-12 w-20 animate-pulse rounded bg-gray-100" />
              </div>
            )}
            {sayacDurumu === 'hazir' && sayaclar && (
              <dl className="grid grid-cols-2 divide-x divide-gray-200 border-y border-gray-100 py-2 lg:border-y-0 lg:py-0">
                <Sayac etiket="Paylaşım" deger={sayaclar.paylasim} />
                <BaglantiSayaci deger={sayaclar.baglanti} sahibiMi={sahibiMi} onNavigate={onNavigate} />
              </dl>
            )}
            {(sayacDurumu === 'hata' || (sayacDurumu === 'hazir' && !sayaclar)) && (
              <p className="text-center text-sm text-gray-600">Sayaçlar şu anda alınamadı.</p>
            )}

            {/*
              BAĞLANTI DÜĞMESİ YALNIZ ZİYARETÇİ DALINDA: kendine istek göndermek
              şemada da yasak. Düğme kendi durumunu sunucudan okuyor.
            */}
            {!sahibiMi && bakanId && <BaglantiDugmesi bakanId={bakanId} hedefId={profil.profilId} />}

            {/* PAYLAŞIM DÜĞMESİNİN ÖNKOŞULU SUNUCUDAN: `yayinda_mi` ve `sector_id`. */}
            {sahibiMi && profil.yayindaMi && profil.sektorId && onPaylasimOlustur && (
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
          </div>
        </div>

        {/* Biyografi kartın tam genişliğinde; kullanıcının yazdığı metin sarıyor. */}
        {profil.biyografi && (
          <p className="mt-4 whitespace-pre-line break-words text-sm leading-relaxed text-gray-800 sm:text-base">
            {profil.biyografi}
          </p>
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
