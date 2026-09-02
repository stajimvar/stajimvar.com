import React from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * Alt sayfaların ortak kabuğu.
 *
 * NEDEN TEK YERDE
 * ---------------
 * Rehber, bölüm, araç, işveren, CV ve yasal sayfaların her biri kendi başlık
 * çubuğunu yazıyordu ve hepsi `max-w-3xl` kullanıyordu. Ana sayfanın başlığı
 * ise `max-w-[1536px]`. Sonuç: geniş ekranda logo bazı sayfalarda sol üst
 * köşede, bazılarında sayfanın ortasında duruyordu — aynı sitede gezerken
 * logo yer değiştiriyordu.
 *
 * Artık tek kural var:
 *   BAŞLIK ÇUBUĞU  → ana sayfayla aynı genişlik, logo hep sol üst köşede
 *   İÇERİK         → max-w-3xl, çünkü uzun metin geniş ekranda satır satır
 *                    okunmuyor; okuma genişliği ayrı bir mesele
 *
 * Genişliği değiştirmek gerekirse burada değiştirilecek, altı ayrı dosyada
 * değil.
 */

interface SayfaKabuguProps {
  /**
   * Geri düğmesi. Verilmezse hiç çizilmiyor.
   *
   * Alt menüdeki ANA sekmeler (Rehber gibi) için geri düğmesi gereksiz:
   * kullanıcı oraya bir yerden gelmedi, sekmeye bastı. Mobilde de boşuna
   * dikey yer kaplıyordu.
   */
  onBack?: () => void;
  children: React.ReactNode;
  /** Başlık çubuğunun sağına konacak şey (örn. CV sayfasındaki yazdır düğmesi). */
  sag?: React.ReactNode;
  /** İçerik genişliği; varsayılan okuma genişliği. */
  icerikGenisligi?: string;
  /**
   * Üst boşluk.
   *
   * Varsayılan `pt-6 sm:pt-8` alt sayfalar için: oralarda içerikten önce
   * geri düğmesi ve uzun metin var, nefes payı gerekiyor.
   *
   * Alt menüdeki ANA sekmeler bunu istemiyor. İlanlar, Fırsatlar ve Keşfet
   * kendi `main`'lerini yazıyor ve `pt-2 sm:pt-3` kullanıyor; Rehber ise bu
   * kabuğun içinde olduğu için başlığı 16 piksel aşağıda başlıyordu —
   * sekmeler arasında geçerken üst yazı yer değiştiriyordu (ölçüldü: 85'e
   * karşı 69).
   */
  ustBosluk?: string;
}

export const SayfaKabugu: React.FC<SayfaKabuguProps> = ({
  onBack,
  children,
  sag,
  icerikGenisligi = 'max-w-3xl',
  ustBosluk = 'pt-6 sm:pt-8',
}) => (
  /*
    ARTIK KENDİ BAŞLIĞINI ÇİZMİYOR

    Bu bileşen eskiden geri oku + logodan oluşan sade bir başlık çubuğu
    çiziyordu. Şimdi uygulamanın asıl üst çubuğu (arama, sekmeler, profil)
    App tarafından her sayfada çiziliyor; burada bir başlık daha çizmek
    ikisini üst üste bindirirdi.

    Geri düğmesi içerik bloğunun üstünde ince bir satır olarak kaldı: üst
    çubuk nereye gidileceğini gösteriyor ama "bir önceki sayfaya dön"
    hâlâ ayrı bir ihtiyaç.

    ALT BOŞLUK: mobil gezinme çubuğu için — 120 piksel + güvenli alan

    110 pikseldi ve sayfanın son öğesi çubuğun altında kalıyordu: çubuk
    yüzer, kendi yüksekliği kadar yer bırakmıyor ve iPhone'da altta bir de
    ana ekran çubuğu var. 120 + env(safe-area-inset-bottom) ikisini birden
    karşılıyor.

    Telefonda ekranın altında sabit bir çubuk var (İlanlar · Rehber ·
    Profil) ve içeriğin üstünü örtüyor. Ana sayfada bunun için alt boşluk
    vardı ama içerik sayfalarında yoktu: rehber ve işveren sayfalarının
    en alttaki düğmesi çubuğun arkasında kalıyor, sayfa da daha aşağı
    kaymadığı için düğmeye basılamıyordu.
  */
  /*
    Kenar boşlukları ana sayfayla aynı ölçekte (px-4 → xl:px-10). Önce sabit
    px-4'tü: geniş ekranda alt sayfaların içeriği, ana sayfanınkinden farklı
    bir hizada başlıyordu.
  */
  <main className={`${icerikGenisligi} mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-10 ${ustBosluk} pb-[calc(120px+env(safe-area-inset-bottom))] lg:pb-10`}>
    {(onBack || sag) && (
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>
        {sag && <div className="shrink-0">{sag}</div>}
      </div>
    )}
    {children}
  </main>
);
