import React from 'react';

/** Tailwind `lg` kırılımı; sunum kararı da aynı sayıdan. */
const LG_SORGUSU = '(min-width: 1024px)';

const simdiGenisMi = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(LG_SORGUSU).matches;

/**
 * Geniş ekran mı? (lg ve üstü)
 *
 * İlk değer SENKRON okunuyor, effect'i beklemiyor: bu kanca bir katmanın
 * hangi sunumunun çizileceğine karar veriyor ve katman kullanıcı
 * tıklayınca, tarayıcıda açılıyor — ölçülecek bir pencere hep var.
 * Varsayılan `false` ile başlayıp effect'te düzeltmek, masaüstünde önce
 * tam ekran akışı takıp (odak, kaydırma, gözlemciler) bir kare sonra
 * söküp diyaloğu kurmak demekti.
 *
 * Kırılım geçişi (pencere yeniden boyutlandı) izleniyor: sunum ortada
 * değişiyor ama açık katman kapanmıyor.
 */
export function useGenisEkran(): boolean {
  const [genis, setGenis] = React.useState(simdiGenisMi);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const sorgu = window.matchMedia(LG_SORGUSU);
    const uygula = () => setGenis(sorgu.matches);
    sorgu.addEventListener('change', uygula);
    return () => sorgu.removeEventListener('change', uygula);
  }, []);

  return genis;
}
