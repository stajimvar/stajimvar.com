import * as React from 'react';
import { OnRenderYedegi, onRenderKopyasiKullanilabilir } from './onrender-yedek.tsx';
import { parcaYuklemeHatasiMi } from './parca-hatasi-tanima.mjs';

export { parcaYuklemeHatasiMi };

/**
 * PARÇA HATASI SINIRI — gecikmeli parça yüklenemeyince sayfa boşalmasın
 * (17 Ekim 2026)
 *
 * SORUN (canlıda yeniden üretildi, 16 Ekim 2026)
 * ----------------------------------------------
 * Rehber, bölüm, ilan, fırsat ve staj ilanları gövdeleri `React.lazy` ile
 * gecikmeli parça. Bir dağıtım parçanın adını değiştirince elde kalan eski
 * HTML (ya da tarayıcının önbelleklediği eski ana paket) artık olmayan bir
 * parçayı istiyor; dinamik import reddediliyor. Hata sınırı olmadığı için
 * React bütün kökü kaldırıyordu: `/rehber/burs-cakisma` 16.974 karakter
 * metinden 0'a, H1'siz boş bir sayfaya düştü — ham HTML içeriği tam
 * taşıdığı hâlde.
 *
 * ÇÖZÜM
 * -----
 * Yalnız PARÇA YÜKLEME hatası yakalanıyor:
 *   1. Ön render kopyası (`OnRenderYedegi`, React'ten önce alınan `#root`)
 *      kalıcı olarak gösteriliyor: gerçek içerik ekranda kalıyor.
 *   2. index.html'deki tek seferlik varlık kurtarması
 *      (`window.svVarlikKurtar`) çağrılıyor: sayfa BİR KEZ `?sv=` ile taze
 *      HTML'le yenileniyor. Bayrak sessionStorage'da ve index.html'in
 *      kendi dinleyicileriyle ORTAK: aynı hata iki kez yenileme başlatmıyor.
 *   3. Hata konsola yazılıyor.
 *
 * GERÇEK UYGULAMA HATASI GİZLENMİYOR: parça hatası olmayan bir hata
 * yeniden fırlatılıyor; davranış bu sınır yokken olduğu gibi kalıyor.
 */

declare global {
  interface Window {
    svVarlikKurtar?: () => void;
  }
}

type Durum = { hata: unknown };

export class ParcaHatasiSiniri extends React.Component<{ children: React.ReactNode }, Durum> {
  state: Durum = { hata: null };

  static getDerivedStateFromError(hata: unknown): Durum {
    return { hata };
  }

  componentDidCatch(hata: unknown) {
    if (!parcaYuklemeHatasiMi(hata)) return;
    console.error('[parca-hatasi] gecikmeli parça yüklenemedi; ön render kopyası gösteriliyor', hata);
    try {
      window.svVarlikKurtar?.();
    } catch {
      /* Kurtarma çalışmazsa kopya ekranda kalıyor. */
    }
  }

  render() {
    const { hata } = this.state;
    if (!hata) return this.props.children;
    /* Parça hatası değilse eski davranış: hata yukarı çıkıyor. */
    if (!parcaYuklemeHatasiMi(hata)) throw hata;
    if (onRenderKopyasiKullanilabilir()) return <OnRenderYedegi kalici />;
    /*
      Kopya yok (uygulama içi gezinmeyle gelinen bir adres ya da ön render
      edilmemiş sayfa): boş ekran yerine gerçek bir yenileme bağlantısı.
    */
    return (
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 16px', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ margin: '0 0 12px', fontWeight: 700 }}>Sayfa yüklenemedi.</p>
        <p style={{ margin: 0 }}>
          Site güncellenmiş olabilir.{' '}
          <a href={typeof location === 'undefined' ? '/' : location.pathname + location.search}>Sayfayı yenile</a>
        </p>
      </main>
    );
  }
}
