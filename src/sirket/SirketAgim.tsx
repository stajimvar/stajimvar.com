import React from 'react';
import { KUTU, SIRKET_METIN, kutuStil } from './renk';
import { SirketAgimBos } from './SirketKimlikKarti';
import { takipEttiklerimiGetir, takipcilerimiGetir } from '../lib/queries/sosyal';
import { TakipListesi, useTakipListesi } from '../components/sosyal/TakipListesi';

/**
 * ŞİRKETİN AĞIM SEKMESİ — SENİ TAKİP EDENLER (/agim, şirket kabuğu)
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
 * gerçek sıfır, dolu. Takipçi SAYISI burada yazılmıyor: sayaç profil
 * sekmesinde (`sosyal_sayaclar.takipci`) ve liste engelli/yayından
 * kalkmış takipçiyi süzdüğü için sayaçla birebir olmayabilir.
 */
export const SirketAgim: React.FC<{
  userId: string | null;
  onNavigate: (yol: string) => void;
}> = ({ userId, onNavigate }) => {
  const etkin = Boolean(userId);
  const takipciler = useTakipListesi(takipcilerimiGetir, etkin);
  const takipEttiklerim = useTakipListesi(takipEttiklerimiGetir, etkin);

  /* Oturum kimliği yokken liste istenmiyor; kabuk zaten bu duruma düşürmüyor. */
  if (!userId) return <SirketAgimBos />;

  const takipciBos = takipciler.durum === 'hazir' && takipciler.satirlar.length === 0;

  return (
    <div className="space-y-4">
      <section aria-labelledby="sirket-agim-takipciler" className="space-y-3">
        <h1 id="sirket-agim-takipciler" className="text-xl font-extrabold tracking-tight" style={{ color: SIRKET_METIN }}>
          Seni takip edenler
        </h1>
        {takipciBos ? (
          <SirketAgimBos />
        ) : (
          <div className={KUTU} style={kutuStil}>
            <TakipListesi
              liste={takipciler}
              bosMetin="Henüz seni takip eden yok."
              hataMetni="Takipçi listesi alınamadı. Bağlantı ya da sunucu kaynaklı olabilir."
              onNavigate={onNavigate}
            />
          </div>
        )}
      </section>

      {takipEttiklerim.durum === 'hazir' && takipEttiklerim.satirlar.length > 0 && (
        <section aria-labelledby="sirket-agim-takip" className="space-y-3">
          <h2 id="sirket-agim-takip" className="text-lg font-extrabold tracking-tight" style={{ color: SIRKET_METIN }}>
            Takip ettiğin şirketler
          </h2>
          <div className={KUTU} style={kutuStil}>
            <TakipListesi
              liste={takipEttiklerim}
              bosMetin="Henüz şirket takip etmiyorsun."
              hataMetni="Liste alınamadı."
              onNavigate={onNavigate}
            />
          </div>
        </section>
      )}
    </div>
  );
};
