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
 * DÜZENLEME VE FOTOĞRAF SATIRLARI ARTIK BU MENÜDE DEĞİL
 * -----------------------------------------------------
 * Dişli menüsünde üç satır vardı: sosyal alanları ayrı bir ekranda açan
 * "Sosyal profili düzenle" ile profil fotoğrafını değiştirme/kaldırma.
 * Üçü de profilin KENDİSİNİ değiştiriyor ve profili değiştirmenin artık
 * tek bir yeri var: `/cv` düzenleme ekranının sosyal bölümü. Satırlar
 * orada bırakılsaydı aynı işin iki kapısı olurdu ve kullanıcı bir alanı
 * hangisinde arayacağını ancak deneyerek bulurdu.
 *
 * Menüde kalanlar portfolyonun kendisine ait: bağlantıyı paylaşmak,
 * görünürlük ve üç liste. `ProfilAyarMenusu` o satırları koşullu
 * çiziyor; eylem verilmediğinde diziye hiç girmiyorlar.
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
  /**
   * `yayinda_mi` — bugünkü anlamıyla PROFİL GÖRÜNÜRLÜĞÜ (20260926040000).
   *
   * Dişli menüsündeki görünürlük satırının yönünü belirliyor. "Paylaş"
   * düğmesinin de önkoşulu ama bu ayrı bir sebeple: sunucudaki
   * `sosyal_paylasim_baslat` (20260924030000) hâlâ `yayinda_mi` VE
   * `sector_id is not null` arıyor.
   */
  yayindaMi: boolean;
  /**
   * `social_profiles.sector_id` dolu mu — "Paylaş"ın ikinci önkoşulu.
   *
   * Bölümü katalogla eşleşmeyen kullanıcının alanı NULL kalıyor
   * (20260926050000). Ona düğme çizmek, her basışta 'toplulukta-degil'
   * ile reddedilen bir eylem sunmak olurdu. Düğmenin neden olmadığını
   * çağıran taraf yazıyor: sebep profil verisinde, burada değil.
   */
  alaniVarMi: boolean;
  /** Yeni paylaşım ekranı. Alanı olmayan kullanıcıda çizilmiyor. */
  onPaylasimOlustur: () => void;
  /** Profil BAĞLANTISINI paylaşma — dişli menüsünde. */
  onProfilBaglantisiPaylas: () => void;
  onGorunurluk: () => void;
  gorunurlukDurumu?: 'bekliyor' | 'gonderiliyor';
  onBegendiklerim: () => void;
  onKaydedilenler: () => void;
  onArsiv: () => void;
  onNavigate?: (yol: string) => void;
}

export const PortfolyoUstSatiri: React.FC<UstSatirProps> = ({
  sayaclar,
  sayacDurumu,
  yayindaMi,
  alaniVarMi,
  onPaylasimOlustur,
  onProfilBaglantisiPaylas,
  onGorunurluk,
  gorunurlukDurumu = 'bekliyor',
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
        PAYLAŞ DÜĞMESİNİN İKİ ÖNKOŞULU SUNUCUDAN

        `sosyal_paylasim_baslat` (20260924030000) taslağı ancak
        `yayinda_mi` VE `sector_id is not null` iken açıyor; ikisinden
        biri eksikken 'toplulukta-degil' ile reddediyor. Düğmeyi yine de
        çizip hatayı sonradan göstermek, her basışta başarısız olan bir
        eylem sunmak olurdu.

        Eksikliğin SEBEBİ burada yazılmıyor, çağıran tarafta: iki koşulun
        cümlesi ayrı ve ikisi de profil verisine bakıyor.

        İkon tek başına bilgi taşımıyor: yanında "Paylaş" yazıyor.
      */}
      {yayindaMi && alaniVarMi && (
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
        onBegendiklerim={onBegendiklerim}
        onKaydedilenler={onKaydedilenler}
        onArsiv={onArsiv}
      />
    </div>
  </div>
);
