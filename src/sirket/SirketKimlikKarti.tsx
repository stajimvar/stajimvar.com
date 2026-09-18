import React from 'react';
import { Users } from 'lucide-react';
import { SIRKET_METIN, SIRKET_METIN_IKINCIL, SIRKET_ROZET, SIRKET_VURGU_KOYU } from './renk';
import { CikisDugmesi, SirketProfili } from './SirketProfili';
import type { SirketBaglami, SirketProfilDegeri } from '../lib/sirket-veri';

/**
 * Şirket kimlik kartı — ARTIK `SirketProfili` İÇİNDE.
 *
 * Buradaki yatay kimlik kartı (logo · ad · sektör · konum; sağda ilan
 * ve başvuru sayaçları) şirket sayfasına dönüştü: dairesel logo, "Şirket
 * hesabı" etiketi, üç sayaç (paylaşım · aktif ilan · takipçi) ve üç
 * sekme. Takipçi sayacı artık GERÇEK: `takipci_sayisi` RPC'si
 * (20261014010000) sayıyı veriyor; önceki sürümde sayaç bu yüzden
 * çizilmiyordu. Paylaşım ızgarası da aynı göçle geldi (`sirket` kitlesi).
 *
 * `SirketProfilSekmesi` ESKİ ÇAĞRI ŞEKLİYLE DURUYOR: geliştirme fikstürü
 * (src/dev/SirketPanelDevFixture) bu adla ve bu prop'larla çiziyor ve o
 * dosya bu işin kapsamı dışında. Sarmalayıcı yeni sayfayı çiziyor;
 * fikstür ilan satırlarını vermediği için İlanlar sekmesi orada boş
 * durumda kalıyor — fikstür yeni bileşene geçirilince bu sarmalayıcı
 * silinmeli.
 */
export const SirketProfilSekmesi: React.FC<{
  baglam: SirketBaglami;
  profil: SirketProfilDegeri | null;
  ilanSayisi: number;
  basvuruSayisi: number;
  userId: string | null;
  onKaydedildi: () => void;
  onNavigate: (yol: string) => void;
  onCikis?: () => void;
}> = ({ baglam, profil, userId, onKaydedildi, onNavigate, onCikis }) => (
  <SirketProfili
    yol="/sirket/profil"
    baglam={baglam}
    profil={profil}
    ilanlar={[]}
    basvurular={[]}
    userId={userId}
    onKaydedildi={onKaydedildi}
    onNavigate={onNavigate}
    onDurum={async () => undefined}
    onKaldir={async () => undefined}
    onCikis={onCikis}
  />
);

export { CikisDugmesi };

/**
 * Şirketin Ağım sekmesi — GERÇEK SIFIRIN kartı.
 *
 * Takip artık açık (öğrenci ve şirket, şirket sayfasındaki "Takip et"
 * ile; 20261015010000 listeyi veriyor) ve liste `SirketAgim`de. Bu kart
 * yalnız sunucu SIFIR satır dediğinde çiziliyor: sayı yok, iskelet yok,
 * "yakında" yok. Kesik kenar sitenin boş-durum dili (src/ui/EmptyState).
 * Başlık `p`: sayfanın `h1`i bölüm başlığında ("Seni takip edenler").
 */
export const SirketAgimBos: React.FC = () => (
  <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
    <span
      className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
      style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
    >
      <Users className="h-6 w-6" aria-hidden />
    </span>
    <p className="font-bold" style={{ color: SIRKET_METIN }}>
      Henüz seni takip eden yok
    </p>
    <p
      className="mx-auto mt-1 max-w-md text-sm leading-relaxed"
      style={{ color: SIRKET_METIN_IKINCIL }}
    >
      Şirket sayfanı takip eden öğrenciler ve şirketler burada görünecek.
    </p>
  </div>
);
