import React from 'react';

/** Tailwind `lg` kırılımı; sunum kararı da aynı sayıdan. */
const LG_SORGUSU = '(min-width: 1024px)';

/** Tailwind `xl` kırılımı — profil sayfasının yan sütunu (`ProfilSayfaDuzeni`). */
export const XL_SORGUSU = '(min-width: 1280px)';

const simdiGenisMi = (sorgu: string): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(sorgu).matches;

/**
 * Geniş ekran mı? (varsayılan lg ve üstü; sorgu verilirse o kırılım)
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
export function useGenisEkran(medyaSorgusu: string = LG_SORGUSU): boolean {
  const [genis, setGenis] = React.useState(() => simdiGenisMi(medyaSorgusu));

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const sorgu = window.matchMedia(medyaSorgusu);
    const uygula = () => setGenis(sorgu.matches);
    uygula();
    sorgu.addEventListener('change', uygula);
    return () => sorgu.removeEventListener('change', uygula);
  }, [medyaSorgusu]);

  return genis;
}
