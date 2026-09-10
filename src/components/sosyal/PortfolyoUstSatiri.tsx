import React from 'react';
import { ImagePlus } from 'lucide-react';
import { BIRINCIL_EYLEM } from '../../lib/renk-token';
import type { SosyalSayaclar } from '../../lib/queries/sosyal';
import { ProfilAyarMenusu } from './ProfilAyarMenusu';
/*
  Sayaçlar KOPYALANMADI, `SosyalProfilGorunumu`dan geliyor.

  İki tanım olsaydı biri değiştiğinde öteki geride kalır ve aynı üründe
  aynı sayı iki farklı ölçüde görünürdü. Bağlantı sayacındaki
  "ziyaretçiye bağlantı verme" kuralı da tek yerde kalıyor.
*/
import { BaglantiSayaci, Sayac } from './SosyalProfilGorunumu';

/**
 * PORTFOLYO ÜST SATIRI — BİRLEŞİK EKRANIN SAĞ SÜTUN BAŞLIĞI
 *
 * NEDEN AYRI BİR BAŞLIK
 * ---------------------
 * `SosyalProfilGorunumu` kendi başlığında fotoğrafı, adı, kullanıcı adını,
 * alan rozetini ve biyografiyi de çiziyor. Birleşik ekranda o bilgilerin
 * hepsi SOL sütunda, profil kartında zaten duruyor; sağ sütunda ikinci kez
 * çizmek aynı kimliği aynı ekranda iki kez göstermek olurdu. Bu yüzden
 * sağ sütunun başlığı yalnız portfolyoya ait olanı taşıyor: iki sayaç ve
 * iki eylem.
 *
 * ZİYARETÇİ BU BİLEŞENE HİÇ ULAŞMIYOR
 * -----------------------------------
 * Birleşik ekran sahibin kendi ekranı; ziyaretçi `/profil/<kullaniciadi>`
 * adresinde `SosyalProfilGorunumu` görüyor. Bileşen bu yüzden `sahibiMi`
 * diye bir bayrak ALMIYOR — alsaydı, yanlış geçirilen tek bir prop dişli
 * menüsünü ziyaretçinin DOM'una sokardı. Sınır çağıran taraftaki
 * `sahibiMi` dalında, burada bir kez daha "gizleme" yapılmıyor.
 *
 * SAYAÇ GELMEDİYSE SAYI YOK
 * -------------------------
 * Sıfır yazmak en kolay yol olurdu ama "sunucu vermedi" ile "gerçekten
 * sıfır" aynı şey değil. `sosyal_sayaclar` satır döndürmediğinde sayı
 * basılmıyor, yerine durumu söyleyen bir cümle geçiyor.
 *
 * KATEGORİ SÜZGECİ VE SIRALAMA YOK
 * --------------------------------
 * "Tümü / Tasarım / Üretim …" şeridi ve "En yeni" açılırı çizilmedi:
 * `posts` tarafında kategori kolonu da sıralama seçeneği de yok.
 * Çalışmayan bir süzgeç çizmek, kullanıcıya olmayan bir bölümlemeyi
 * varmış gibi göstermek olurdu.
 */

interface UstSatirProps {
  sayaclar: SosyalSayaclar | null;
  sayacDurumu: 'yukleniyor' | 'hazir' | 'hata';
  /** `yayinda_mi`: "Paylaş" düğmesinin önkoşulu. */
  yayindaMi: boolean;
  avatarVarMi: boolean;
  /** Yeni paylaşım ekranı. Topluluğa katılmamış kullanıcıda çizilmiyor. */
  onPaylasimOlustur: () => void;
  /** Profil BAĞLANTISINI paylaşma — dişli menüsünde. */
  onProfilBaglantisiPaylas: () => void;
  onGorunurluk: () => void;
  gorunurlukDurumu?: 'bekliyor' | 'gonderiliyor';
  onDuzenle: () => void;
  onFotografDegistir: () => void;
  onFotografKaldir: () => void;
  fotografDurumu?: 'bekliyor' | 'gonderiliyor';
  onBegendiklerim: () => void;
  onKaydedilenler: () => void;
  onArsiv: () => void;
  onNavigate?: (yol: string) => void;
}

export const PortfolyoUstSatiri: React.FC<UstSatirProps> = ({
  sayaclar,
  sayacDurumu,
  yayindaMi,
  avatarVarMi,
  onPaylasimOlustur,
  onProfilBaglantisiPaylas,
  onGorunurluk,
  gorunurlukDurumu = 'bekliyor',
  onDuzenle,
  onFotografDegistir,
  onFotografKaldir,
  fotografDurumu = 'bekliyor',
  onBegendiklerim,
  onKaydedilenler,
  onArsiv,
  onNavigate,
}) => (
  /*
    Tek satır, iki uç: solda sayılar, sağda eylemler. Telefonda sarıyor
    (`flex-wrap`) — eylemler tek satıra sığmadığında sayıların altına
    iniyorlar; kısaltılmış bir sayı ya da kırpılmış bir düğme etiketi
    yerine ikinci satır tercih edildi.
  */
  <div className="flex flex-wrap items-center justify-between gap-2.5">
    {sayacDurumu === 'yukleniyor' && (
      <div aria-busy="true" className="flex gap-5">
        <div aria-hidden className="h-5 w-24 animate-pulse rounded bg-gray-100" />
        <div aria-hidden className="h-5 w-24 animate-pulse rounded bg-gray-100" />
      </div>
    )}
    {sayacDurumu === 'hazir' && sayaclar && (
      <dl className="flex flex-wrap gap-5">
        <Sayac etiket="Paylaşım" deger={sayaclar.paylasim} />
        <BaglantiSayaci deger={sayaclar.baglanti} sahibiMi onNavigate={onNavigate} />
      </dl>
    )}
    {(sayacDurumu === 'hata' || (sayacDurumu === 'hazir' && !sayaclar)) && (
      <p className="text-sm text-gray-600">Sayaçlar şu anda alınamadı.</p>
    )}

    <div className="flex items-center gap-1.5">
      {/*
        PAYLAŞ DÜĞMESİ TOPLULUĞA KATILMIŞ KULLANICIDA

        `sosyal_paylasim_baslat` topluluğa katılmamış kullanıcıyı
        'toplulukta-degil' ile reddediyor; düğmeyi yine de çizip hatayı
        sonradan göstermek, her basışta başarısız olan bir eylem sunmak
        olurdu. Katılmamış kullanıcı bunun yerine aşağıdaki uyarı
        kutusunu görüyor ve oradaki eylem tam olarak bu düğmenin
        önkoşulu.

        İkon tek başına bilgi taşımıyor: yanında "Paylaş" yazıyor.
      */}
      {yayindaMi && (
        <button type="button" onClick={onPaylasimOlustur} className={BIRINCIL_EYLEM}>
          <ImagePlus aria-hidden className="h-4 w-4" />
          Paylaş
        </button>
      )}

      <ProfilAyarMenusu
        onPaylas={onProfilBaglantisiPaylas}
        yayindaMi={yayindaMi}
        onGorunurluk={onGorunurluk}
        gorunurlukDurumu={gorunurlukDurumu}
        /*
          "Sosyal profili düzenle" birleşik ekranda MENÜYE girdi.

          Eskiden üst blokta ayrı bir düğmeydi ve menüde bilerek yoktu:
          aynı işin iki girişi olmasın diye. Birleşik ekranda o üst blok
          hiç çizilmiyor (kimlik alanları sol sütunda), yani düğmenin evi
          kalmadı. Menüye TAŞINDI, kopyalanmadı — sağ sütunda ikinci bir
          giriş yok.
        */
        onDuzenle={onDuzenle}
        onFotografDegistir={onFotografDegistir}
        avatarVarMi={avatarVarMi}
        onFotografKaldir={onFotografKaldir}
        fotografDurumu={fotografDurumu}
        onBegendiklerim={onBegendiklerim}
        onKaydedilenler={onKaydedilenler}
        onArsiv={onArsiv}
      />
    </div>
  </div>
);
