import React from 'react';
import { SayfaKabugu } from '../SayfaKabugu';
import { BIRINCIL_EYLEM } from '../../lib/renk-token';
import { KampusumPaneli } from './KampusumPaneli';
import type { StudentProfile } from '../../types';

/**
 * KAMPÜSÜM — /kampusum (kullanıcı isteği, 25 Eylül 2026)
 *
 * NEDEN AYRI BİR ADRES
 * --------------------
 * Panel yalnız profil ekranlarında çiziliyordu (`/cv`, `/profil/<ad>`).
 * Telefonda başlığın sol üstündeki ana sayfa simgesi kalktı (logo zaten
 * ana sayfaya gidiyor) ve yerine Kampüsüm düğmesi geldi; düğmenin
 * gideceği, orta tuşla yeni sekmede de açılabilen bir adres gerekiyordu.
 * Panel burada YENİDEN YAZILMADI: aynı bileşen, aynı RPC, `yerlesim='akis'`.
 *
 * `lg` altında TEK YER BURASI: düğme gelince profil sayfaları telefonda
 * paneli çizmeyi bıraktı (kullanıcı isteği, 25 Eylül 2026: profilde
 * tekrarı gereksiz; `useKampusYerlesimi`).
 *
 * DÖRT DURUM — `/takip` ile aynı kalıp
 * ------------------------------------
 * Oturum okunuyor → iskelet; oturum yok → giriş kartı ve
 * `onGirisGerekli`; şirket kabuğu → "öğrenci hesabına açık" (erişim yok);
 * öğrenci → panel. Panelin içindeki yükleniyor / hata / okulsuz /
 * kaynaksız dalları panelin kendisinde; burada tekrar edilmiyor.
 *
 * ŞİRKET HESABI PANELİ GÖRMÜYOR
 * -----------------------------
 * `kampusum()` okulu `student_profiles`tan okuyor; şirket kabuğunda App
 * öğrenci profilini yüklemiyor ve panel "Üniversiteni ekle" derdi. Şirket
 * hesabının eklenecek bir üniversitesi yok — bu yüzden paneli çizmek
 * yerine erişimin neden olmadığı yazılıyor. Başlıktaki düğme zaten
 * şirkette çizilmiyor; bu dal adres elle açılırsa diye.
 *
 * BAŞLIK
 * ------
 * Panel kendi görünür başlığını ("Kampüsüm", `h2`) çiziyor. Sayfanın `h1`i
 * aynı adı ekran okuyucuya veriyor ama görünmüyor: iki "Kampüsüm" alt
 * alta yazılırdı.
 */

const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';

export const KampusumSayfasi: React.FC<{
  kullaniciId: string | null;
  oturumHazir: boolean;
  /** Şirket kabuğu mu (App'teki `kabukRolu === 'company'`). */
  sirketHesabi: boolean;
  /** Bakan öğrencinin profili (App'teki `student`); burs uygunluğu buradan. */
  ogrenci: StudentProfile | null;
  onNavigate: (yol: string) => void;
  onGirisGerekli?: () => void;
}> = ({ kullaniciId, oturumHazir, sirketHesabi, ogrenci, onNavigate, onGirisGerekli }) => {
  React.useEffect(() => {
    if (!oturumHazir || kullaniciId) return;
    onGirisGerekli?.();
    /* `onGirisGerekli` bağımlılığa konmuyor: App her render'da yeni bir fonksiyon üretiyor (`/takip` ile aynı). */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oturumHazir, kullaniciId]);

  if (!oturumHazir) {
    return (
      <SayfaKabugu>
        <div aria-busy="true" className="space-y-2">
          <div aria-hidden className={`${KART} h-16 animate-pulse bg-gray-50`} />
          <div aria-hidden className={`${KART} h-16 animate-pulse bg-gray-50`} />
        </div>
      </SayfaKabugu>
    );
  }

  if (!kullaniciId) {
    return (
      <SayfaKabugu>
        <div className={`${KART} space-y-3 text-center`}>
          <h1 className="text-lg font-extrabold text-gray-900">Kampüsüm için giriş gerekiyor</h1>
          <p className="text-sm leading-relaxed text-gray-600">
            Kampüs bilgileri giriş yapmış öğrenciye, kendi üniversitesine göre gösteriliyor.
          </p>
          {onGirisGerekli && (
            <button type="button" onClick={onGirisGerekli} className={BIRINCIL_EYLEM}>
              Giriş yap
            </button>
          )}
        </div>
      </SayfaKabugu>
    );
  }

  if (sirketHesabi) {
    return (
      <SayfaKabugu>
        <div className={`${KART} space-y-2 text-center`}>
          <h1 className="text-lg font-extrabold text-gray-900">Kampüsüm öğrenci hesaplarına açık</h1>
          <p className="text-sm leading-relaxed text-gray-600">
            Bu sayfa öğrencinin profilindeki üniversiteye göre hazırlanıyor; işveren hesabında gösterilecek bir
            üniversite yok.
          </p>
        </div>
      </SayfaKabugu>
    );
  }

  return (
    /*
      Telefonda kenarsız ve üst boşluksuz: panelin `akis` kabı telefonda
      kart değil yüzey (kenardan kenara, tek alt çizgi), profilin geri
      kalanıyla aynı kalıp. `sm:` üstünde kart ve gri zemin.
    */
    <SayfaKabugu mobilKenarsiz ustBosluk="pt-0 sm:pt-6" icerikGenisligi="max-w-2xl">
      <h1 className="sr-only">Kampüsüm</h1>
      <KampusumPaneli ogrenci={ogrenci} onNavigate={onNavigate} yerlesim="akis" />
    </SayfaKabugu>
  );
};
