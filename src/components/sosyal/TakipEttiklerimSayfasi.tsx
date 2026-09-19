import React from 'react';
import { SayfaKabugu } from '../SayfaKabugu';
import { BIRINCIL_EYLEM } from '../../lib/renk-token';
import { takipEttiklerimiGetir } from '../../lib/queries/sosyal';
import { TakipListesi, useTakipListesi } from './TakipListesi';

/**
 * TAKİP ETTİĞİN ŞİRKETLER — /takip
 *
 * NEDEN AYRI BİR EKRAN
 * --------------------
 * Profil kartındaki üç sayaçtan ikisi bir yere gidiyordu ("paylaşım"
 * aynı ekranın altındaki portfolyo, "bağlantı" /baglantilar), "takip"
 * ise düz bir `<span>`di: basılınca hiçbir şey olmuyordu (kullanıcı
 * bildirdi, 19 Eylül 2026). Liste zaten vardı — öğrenci Ağım'ının ve
 * şirket Ağım'ının kullandığı `TakipListesi` — ama kendi adresi yoktu.
 * Sayıya basınca gidilecek bir yer yoksa sayı bir düğme gibi görünüp
 * düğme gibi davranmıyor demektir.
 *
 * LİSTE YALNIZ KENDİNİN
 * ---------------------
 * `takip_ettiklerim` RPC'si hedef parametresi ALMIYOR, `auth.uid()`i
 * içeride okuyor (20261015010000). Yani bu adres başkasının takip
 * ettiklerini ne sorabiliyor ne de gösterebiliyor; görünürlük kapısı
 * sunucuda, burada gevşetilmiyor.
 *
 * DÖRT DURUM
 * ----------
 * Yetkisiz (oturum yok) → giriş kartı; yükleniyor → iskelet; alınamadı
 * ve gerçek sıfır → `TakipListesi`nin kendi iki dalı. "Erişimin yok" ile
 * "henüz kimseyi takip etmiyorsun" ayrı cümleler.
 *
 * BAŞLIK AĞIM'DAKİYLE BİREBİR AYNI
 * -------------------------------
 * "Takip ettiklerin" değil "Takip ettiğin şirketler": bugün takip
 * edilebilen tek şey şirket — `sosyal_gizli.takip_edilebilir` yalnız
 * `sirket_id`si olan yayındaki profilleri sayıyor. Aynı listeye iki
 * ekranda iki ad vermek (Ağım'da "Takip ettiğin şirketler", burada
 * "Takip ettiklerin") kullanıcıya iki ayrı şey olduğunu düşündürürdü.
 * Takip modeli öğrenciye de açılırsa iki başlık BİRLİKTE değişmeli.
 *
 * SAYI YAZILMIYOR
 * ---------------
 * Başlıkta "N kişi" yok: sayaç `sosyal_sayaclar.takip`ten geliyor, liste
 * ise engelli ya da yayından kalkmış hedefi süzebiliyor. İkisi birebir
 * olmak zorunda değil; burada bir sayı yazmak ikinci bir RPC ve
 * sayaçla çelişebilecek bir rakam demek olurdu.
 */

const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';

export const TakipEttiklerimSayfasi: React.FC<{
  kullaniciId: string | null;
  oturumHazir: boolean;
  onNavigate: (yol: string) => void;
  onGirisGerekli?: () => void;
}> = ({ kullaniciId, oturumHazir, onNavigate, onGirisGerekli }) => {
  /*
    Kanca yetki kapılarının ÜSTÜNDE: kancalar koşullu dala giremez.
    Oturum yokken `etkin` false ve istek hiç atılmıyor (öğrenci Ağım'ında
    aynı kalıp).
  */
  const liste = useTakipListesi(takipEttiklerimiGetir, Boolean(oturumHazir && kullaniciId));

  React.useEffect(() => {
    if (!oturumHazir || kullaniciId) return;
    onGirisGerekli?.();
    /* `onGirisGerekli` bağımlılığa konmuyor: App her render'da yeni bir fonksiyon üretiyor. */
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
          <h1 className="text-lg font-extrabold text-gray-900">Takip listesi için giriş gerekiyor</h1>
          <p className="text-sm leading-relaxed text-gray-600">
            Bu liste yalnızca giriş yapmış kullanıcıya ve yalnız kendi takip ettiklerine açık.
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

  return (
    <SayfaKabugu>
      <div className="space-y-5">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
          Takip ettiğin şirketler
        </h1>
        <div className={KART}>
          <TakipListesi
            liste={liste}
            bosMetin="Henüz şirket takip etmiyorsun."
            hataMetni="Takip listesi alınamadı. Bağlantı ya da sunucu kaynaklı olabilir."
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </SayfaKabugu>
  );
};
