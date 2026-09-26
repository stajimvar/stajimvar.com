import React from 'react';
import { SIRKET_METIN, SIRKET_METIN_IKINCIL, kutuStil } from './renk';
import { SirketAgimBos } from './SirketKimlikKarti';
import { sosyalSayaclariGetir, takipEttiklerimiGetir, takipcilerimiGetir } from '../lib/queries/sosyal';
import { TakipListesi, useTakipListesi } from '../components/sosyal/TakipListesi';

/**
 * ŞİRKETİN TAKİPÇİLER SEKMESİ (/agim, şirket kabuğu)
 *
 * İki liste, ikisi de YALNIZ oturum sahibinin kendi listesi: RPC'ler
 * (`takipcilerim`, `takip_ettiklerim`) `auth.uid()`i içeride okuyor,
 * hedef parametresi yok. Başka bir şirketin takipçileri buradan ya da
 * başka bir yoldan okunamıyor (20261015010000).
 *
 *   1. "Seni takip edenler" — öğrenciler ve şirketler. Boşsa eski
 *      dürüst kart (`SirketAgimBos`) duruyor: sayı yok, iskelet yok.
 *   2. "Takip ettiğin şirketler" — şirket→şirket takibi. YALNIZ satır
 *      varsa çiziliyor: takip etmeyen şirkete boş bir bölüm göstermek,
 *      ona bir şey yapması gerektiğini söylemek olurdu; öğrenci
 *      tarafındaki "Bağlantılarını yönet" gibi bir eylem burada yok.
 *
 * Satır biçimi öğrenci Ağım'ındakiyle aynı bileşen (`TakipListesi`):
 * fotoğraf/baş harf, ad, `@kullanıcıadı`, gerçek `<a href>`. Sayfalı,
 * 50'şer, "Daha fazla göster".
 *
 * Dört durum dördü de ayrı: iskelet, alınamadı (`role="alert"`),
 * gerçek sıfır, dolu.
 *
 * "TAKİPÇİLER" (26 Eylül 2026): ekran yalnız takipçileri (ve varsa
 * takip edilen şirketleri) gösterdiği için alt çubukta ve başlıkta adı
 * "Ağım" değil "Takipçiler". Sayı `sosyal_sayaclar.takipci`den — Şirketim
 * sayacıyla aynı okuma; alınamazsa ya da henüz gelmediyse alt satır sayı
 * basmıyor (sıfır uydurulmuyor). Liste engelli/yayından kalkmış
 * takipçiyi süzdüğü için satır sayısıyla birebir olmayabilir; bu yüzden
 * sayı listeden sayılmıyor, sunucunun sayacından okunuyor.
 */
/* Kompakt satırlar: kutunun iç boşluğu dar, satır kendi 44 px'ini taşıyor. */
const LISTE_KUTUSU = 'rounded-2xl border p-1.5 shadow-xs sm:p-2';

export const SirketAgim: React.FC<{
  userId: string | null;
  onNavigate: (yol: string) => void;
}> = ({ userId, onNavigate }) => {
  const etkin = Boolean(userId);
  const takipciler = useTakipListesi(takipcilerimiGetir, etkin);
  const takipEttiklerim = useTakipListesi(takipEttiklerimiGetir, etkin);
  const [takipciSayisi, setTakipciSayisi] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!userId) return;
    let iptal = false;
    sosyalSayaclariGetir(userId)
      .then((sayac) => {
        if (!iptal) setTakipciSayisi(sayac ? sayac.takipci : null);
      })
      .catch(() => {
        if (!iptal) setTakipciSayisi(null);
      });
    return () => {
      iptal = true;
    };
  }, [userId]);

  /* Oturum kimliği yokken liste istenmiyor; kabuk zaten bu duruma düşürmüyor. */
  if (!userId) return <SirketAgimBos onNavigate={onNavigate} />;

  const takipciBos = takipciler.durum === 'hazir' && takipciler.satirlar.length === 0;
  /*
    İKİ LİSTE İKİ BAŞLIK (26 Eylül 2026): şirket başka şirketleri de
    takip ediyorsa ekranda iki liste oluyor. Yalnız takipçi listesi
    başlıksız kalınca ikinci liste de "takipçi" sanılabiliyordu; iki
    liste birlikteyken ilki "Sizi takip edenler" başlığını alıyor, ikincisi
    ayrı bir bölümde ve "bu listedekiler takipçi değil" diyor. Sayaç
    (`sosyal_sayaclar.takipci`) yalnız takipçileri sayıyor; takip edilen
    şirketler ona hiç girmiyor.
  */
  const takipEdilenVar = takipEttiklerim.durum === 'hazir' && takipEttiklerim.satirlar.length > 0;

  return (
    <div className="space-y-4">
      <section aria-labelledby="sirket-agim-takipciler" className="space-y-3">
        <div>
          <h1 id="sirket-agim-takipciler" className="text-2xl font-extrabold tracking-tight" style={{ color: SIRKET_METIN }}>
            Takipçiler
          </h1>
          {takipciSayisi !== null && takipciSayisi > 0 && (
            <p className="mt-0.5 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
              Şirketinizi takip eden {takipciSayisi} hesap.
            </p>
          )}
        </div>
        {takipEdilenVar && (
          <h2 className="text-lg font-extrabold tracking-tight" style={{ color: SIRKET_METIN }}>
            Sizi takip edenler
          </h2>
        )}
        {takipciBos ? (
          <SirketAgimBos onNavigate={onNavigate} />
        ) : (
          <div className={LISTE_KUTUSU} style={kutuStil}>
            <TakipListesi
              liste={takipciler}
              bosMetin="Henüz takipçiniz yok."
              hataMetni="Takipçi listesi alınamadı. Bağlantı ya da sunucu kaynaklı olabilir."
              onNavigate={onNavigate}
              okGoster
            />
          </div>
        )}
      </section>

      {takipEdilenVar && (
        <section aria-labelledby="sirket-agim-takip" className="space-y-3 border-t border-gray-200 pt-4">
          <div>
            <h2 id="sirket-agim-takip" className="text-lg font-extrabold tracking-tight" style={{ color: SIRKET_METIN }}>
              Takip ettiğiniz şirketler
            </h2>
            <p className="mt-0.5 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
              Şirketinizin takip ettiği sayfalar; takipçi sayısına girmez.
            </p>
          </div>
          <div className={LISTE_KUTUSU} style={kutuStil}>
            <TakipListesi
              liste={takipEttiklerim}
              bosMetin="Henüz şirket takip etmiyorsunuz."
              hataMetni="Liste alınamadı."
              onNavigate={onNavigate}
              okGoster
            />
          </div>
        </section>
      )}
    </div>
  );
};
