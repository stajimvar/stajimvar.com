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
  onBack: () => void;
  children: React.ReactNode;
  /** Başlık çubuğunun sağına konacak şey (örn. CV sayfasındaki yazdır düğmesi). */
  sag?: React.ReactNode;
  /** İçerik genişliği; varsayılan okuma genişliği. */
  icerikGenisligi?: string;
}

export const SayfaKabugu: React.FC<SayfaKabuguProps> = ({
  onBack,
  children,
  sag,
  icerikGenisligi = 'max-w-3xl',
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

    ALT BOŞLUK: mobil gezinme çubuğu için

    Telefonda ekranın altında sabit bir çubuk var (İlanlar · Rehber ·
    Profil) ve içeriğin üstünü örtüyor. Ana sayfada bunun için `pb-24`
    vardı ama içerik sayfalarında yoktu: rehber ve işveren sayfalarının
    en alttaki düğmesi çubuğun arkasında kalıyor, sayfa da daha aşağı
    kaymadığı için düğmeye basılamıyordu.
  */
  <main className={`${icerikGenisligi} mx-auto w-full px-4 py-6 sm:py-8 pb-24 lg:pb-10`}>
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
