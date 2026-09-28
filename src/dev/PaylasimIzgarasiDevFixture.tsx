import React from 'react';
import { PaylasimIzgarasi } from '../components/sosyal/PaylasimIzgarasi';
import type { SosyalPaylasim } from '../lib/queries/sosyal';

/**
 * PAYLAŞIM IZGARASININ KİPLERİ YAN YANA.
 *
 * NEDEN VAR
 * ---------
 * Izgara üç kipte çiziliyor ve hepsi oturum arkasında: `/cv` galerisi,
 * ziyaretçi profilinin sade ızgarası, arşivin ayrıntılı kartı. Kip
 * değiştiren bir düzenleme tarayıcıda hiç görülmeden yayına gidiyordu.
 *
 * 28 Eylül 2026'da şirket sayfasının ayrı `kare` kipi kaldırıldı ve
 * öğrenci profiliyle aynı `galeri` kipine geçti (kullanıcı isteği:
 * "Instagram gibi öyle gözüksün"). O değişiklik karonun ORANINI
 * değiştiriyor — kare yerine dikey 3:4 — ve oran ancak gözle
 * doğrulanabilir.
 *
 * KAPAKLAR İNMİYOR, İNMESİ DE GEREKMİYOR
 * --------------------------------------
 * `PaylasimIzgarasi` kapakları kullanıcının kendi oturumundan indiriyor;
 * fikstürde oturum yok ve kareler boş kutu kalıyor. Ölçülen şey zaten
 * kutunun KENDİSİ: oran, sütun sayısı, aralık. `yukleniyor` kipindeki
 * iskelet de aynı kutuyu kullanıyor, bu yüzden iki durum da çiziliyor.
 *
 * Üretim paketine girmiyor (yalnız development sunucusunda servis edilen
 * bağımsız giriş).
 */

/* Kapak yolu gerçek bir dosyaya işaret etmiyor: kutunun ölçüsü ölçülüyor. */
const paylasim = (id: string, gorselSayisi: number): SosyalPaylasim => ({
  id,
  aciklama: null,
  olusturmaAni: '2026-09-20T10:00:00Z',
  arsivAni: null,
  kitle: 'baglantilarim',
  gorselSayisi,
  gorseller: Array.from({ length: gorselSayisi }, (_, i) => ({
    sira: i + 1,
    storageYolu: `fikstur/${id}-${i + 1}.jpg`,
    alt: null,
    genislik: null,
    yukseklik: null,
  })),
  kapakYolu: `fikstur/${id}-1.jpg`,
  kapakAlt: null,
});

/* Biri çok görselli: çoklu görsel simgesi de görünsün. */
const LISTE: SosyalPaylasim[] = [
  paylasim('a', 1),
  paylasim('b', 3),
  paylasim('c', 1),
  paylasim('d', 5),
  paylasim('e', 1),
  paylasim('f', 2),
];

const Bolum: React.FC<{ ad: string; not: string; children: React.ReactNode }> = ({
  ad,
  not,
  children,
}) => (
  <section className="space-y-2">
    <h2 className="text-base font-extrabold text-gray-900">{ad}</h2>
    <p className="text-sm leading-relaxed text-gray-600">{not}</p>
    {/* Profil sütunuyla aynı genişlik: ızgara gerçekte bu kapta duruyor. */}
    <div className="mx-auto w-full max-w-[600px] border border-dashed border-gray-300">{children}</div>
  </section>
);

export const PaylasimIzgarasiDevFixture: React.FC = () => (
  <div className="mx-auto max-w-3xl space-y-8 bg-white p-4 font-sans">
    <header className="space-y-1">
      <h1 className="text-lg font-black text-gray-900">Paylaşım ızgarası — kipler</h1>
      <p className="text-sm leading-relaxed text-gray-600">
        Kesikli çerçeve ızgaranın kabı. Kapaklar oturum gerektirdiği için boş;
        ölçülen şey karonun oranı, sütun sayısı ve aralık.
      </p>
    </header>

    <Bolum
      ad="galeri — öğrenci profili VE şirket sayfası"
      not="Dikey 3:4 karo, her genişlikte üç sütun. 28 Eylül 2026'dan beri şirket sayfası da bu kipi kullanıyor; ayrı `kare` kipi silindi."
    >
      <PaylasimIzgarasi paylasimlar={LISTE} durum="hazir" gorunum="galeri" kullaniciAdi="ornek" />
    </Bolum>

    <Bolum ad="galeri — iskelet" not="Yüklenirken aynı kutu; ızgara zıplamıyor.">
      <PaylasimIzgarasi paylasimlar={[]} durum="yukleniyor" gorunum="galeri" />
    </Bolum>

    <Bolum ad="sade — ziyaretçi profili" not="Aynı oran, aralık 1 px.">
      <PaylasimIzgarasi paylasimlar={LISTE} durum="hazir" gorunum="sade" />
    </Bolum>

    <Bolum ad="ayrintili — arşiv" not="Kare kapak, altında açıklama ve tarih için yer.">
      <PaylasimIzgarasi paylasimlar={LISTE} durum="hazir" gorunum="ayrintili" />
    </Bolum>
  </div>
);
