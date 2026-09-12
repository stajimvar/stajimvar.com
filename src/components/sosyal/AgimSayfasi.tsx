import React from 'react';
import { Bell, ImagePlus, UserRoundPlus, Users } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import {
  akisiGetir,
  baglantilarimiGetir,
  begeniDurumuGetir,
  kaydetmeDurumuGetir,
  kendiSosyalProfiliGetir,
  onerilenKisileriGetir,
  type AkisPaylasimi,
  type BegeniDurumu,
  type OnerilenKisi,
  type SosyalProfil,
} from '../../lib/queries/sosyal';
import { AkisKarti } from './AkisKarti';
import { ProfilFotografi } from './ProfilFotografi';

/**
 * /agim — bağlantılarının ve alanının akışı.
 *
 * YOĞUNLUK INSTAGRAM'DAN, KURALLAR SUNUCUDAN
 * ------------------------------------------
 * Telefonda: kompakt başlık, yatay profil halkaları, kenardan kenara
 * paylaşımlar. Kart kutusu ve gri bant yok — akış tek bir beyaz yüzey.
 * Masaüstünde ortalanmış tek sütun ve sağda öneri şeridi.
 *
 * GÖRÜNÜRLÜK BURADA KARAR VERİLMİYOR. `akisiGetir` "bütün paylaşımları"
 * istiyor; hangisinin geleceğine `posts` okuma politikası karar veriyor
 * (aynı sektör + yayında + engelsiz + kitleye göre bağlantı şartı).
 * İstemciye ikinci bir kural yazmak, iki tanımın zamanla ayrışması
 * demek olurdu.
 *
 * BAĞLANTI KUTULARI BURADA DEĞİL
 * ------------------------------
 * "Bağlantılar / Gelen istekler / Gönderilen istekler" üç kutusu
 * akıştan çıktı ve `/agim/baglantilar` ekranına taşındı. Üst
 * başlıktaki kişiler ikonu oraya götürüyor ve bekleyen istek varsa
 * üzerinde GERÇEK sayı taşıyor.
 */

interface Props {
  kullaniciId: string | null;
  oturumHazir: boolean;
  onNavigate: (yol: string) => void;
  onGirisGerekli?: () => void;
  /** Paylaşım oluşturma ekranı profil tarafında; `+` oraya götürüyor. */
  onPaylasimOlustur?: () => void;
}

type Durum = 'yukleniyor' | 'hazir' | 'hata';

const IKON = `relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-gray-800 hover:bg-gray-100 ${RENK_GECISI} ${ODAK_HALKASI}`;

/** Halka: kendi fotoğrafın ve önerilen kişiler aynı ölçüde. */
const Halka: React.FC<{
  ad: string;
  avatarYolu: string | null;
  etiket: string;
  vurgulu?: boolean;
  rozet?: React.ReactNode;
  onClick: () => void;
}> = ({ ad, avatarYolu, etiket, vurgulu = false, rozet, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-[74px] shrink-0 cursor-pointer flex-col items-center gap-1.5 ${ODAK_HALKASI}`}
  >
    <span className="relative">
      <span
        className={`block rounded-full p-[2.5px] ${
          vurgulu ? 'bg-gradient-to-tr from-blue-600 to-emerald-400' : 'bg-gray-200'
        }`}
      >
        <span className="block rounded-full bg-white p-[2px]">
          <ProfilFotografi ad={ad} yol={avatarYolu} className="h-14 w-14 rounded-full text-base" />
        </span>
      </span>
      {rozet}
    </span>
    <span className="w-full truncate text-center text-[11px] leading-tight text-gray-700">{etiket}</span>
  </button>
);

export const AgimSayfasi: React.FC<Props> = ({
  kullaniciId,
  oturumHazir,
  onNavigate,
  onGirisGerekli,
  onPaylasimOlustur,
}) => {
  const [durum, setDurum] = React.useState<Durum>('yukleniyor');
  const [akis, setAkis] = React.useState<AkisPaylasimi[]>([]);
  const [benim, setBenim] = React.useState<SosyalProfil | null>(null);
  const [oneriler, setOneriler] = React.useState<OnerilenKisi[]>([]);
  const [bekleyenIstek, setBekleyenIstek] = React.useState(0);
  const [begeniler, setBegeniler] = React.useState<Map<string, BegeniDurumu>>(new Map());
  const [kayitlilar, setKayitlilar] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!oturumHazir || !kullaniciId) return;
    let iptal = false;
    setDurum('yukleniyor');

    (async () => {
      try {
        const [paylasimlar, profil, kisiler, baglantilar] = await Promise.all([
          akisiGetir(),
          kendiSosyalProfiliGetir(kullaniciId),
          onerilenKisileriGetir(kullaniciId).catch(() => [] as OnerilenKisi[]),
          baglantilarimiGetir(kullaniciId).catch(() => ({ kabul: [], gelen: [], giden: [] })),
        ]);
        if (iptal) return;

        setAkis(paylasimlar);
        setBenim(profil);
        setOneriler(kisiler);
        setBekleyenIstek(baglantilar.gelen.length);

        /*
          Beğeni ve kayıt durumu TOPLU okunuyor. Her kart kendi isteğini
          atsaydı yirmi paylaşımlık bir akış kırk istek açardı.
        */
        const idler = paylasimlar.map((p) => p.id);
        if (idler.length) {
          const [b, k] = await Promise.all([
            begeniDurumuGetir(idler).catch(() => new Map<string, BegeniDurumu>()),
            kaydetmeDurumuGetir(idler).catch(() => new Set<string>()),
          ]);
          if (iptal) return;
          setBegeniler(b);
          setKayitlilar(k);
        }
        setDurum('hazir');
      } catch {
        if (!iptal) setDurum('hata');
      }
    })();

    return () => {
      iptal = true;
    };
  }, [kullaniciId, oturumHazir]);

  /* --------------------------------------------------------- yetki kapısı */

  if (!oturumHazir) {
    return <div className="min-h-[50vh]" aria-busy="true" />;
  }

  if (!kullaniciId) {
    return (
      <div className="mx-auto max-w-md space-y-3 px-4 py-12 text-center">
        <h1 className="text-lg font-extrabold text-gray-900">Ağın için giriş gerekiyor</h1>
        <p className="text-sm leading-relaxed text-gray-600">
          Akış, bağlantılarının ve alanındaki kişilerin paylaşımlarından oluşuyor.
        </p>
        {onGirisGerekli && (
          <button
            type="button"
            onClick={onGirisGerekli}
            className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 ${RENK_GECISI} ${ODAK_HALKASI}`}
          >
            Giriş yap
          </button>
        )}
      </div>
    );
  }

  const benimAd = benim?.gorunenAd ?? (benim?.kullaniciAdi ? `@${benim.kullaniciAdi}` : 'Sen');

  /* ------------------------------------------------------------- başlık */

  const baslik = (
    <header className="sticky top-0 z-20 flex items-center gap-1 border-b border-gray-200 bg-white px-1.5 py-1.5 lg:hidden">
      <button
        type="button"
        onClick={() => (onPaylasimOlustur ? onPaylasimOlustur() : onNavigate('/cv'))}
        aria-label="Paylaşım oluştur"
        className={IKON}
      >
        <ImagePlus aria-hidden className="h-6 w-6" />
      </button>

      {/*
        Ortadaki başlık şu an TEK akışı adlandırıyor. Yanındaki ok bir
        seçici değil, o akışın adının parçası: ikinci bir akış yokken
        açılan bir menü çizmek, olmayan bir seçim sunmak olurdu.
      */}
      <h1 className="flex-1 text-center text-base font-extrabold text-gray-900">Senin için</h1>

      <button
        type="button"
        onClick={() => onNavigate('/agim/baglantilar')}
        aria-label={
          bekleyenIstek > 0 ? `Bağlantılar, ${bekleyenIstek} bekleyen istek` : 'Bağlantılar'
        }
        className={IKON}
      >
        <Users aria-hidden className="h-6 w-6" />
        {/* Rozet GERÇEK sayı; sıfırken hiç çizilmiyor. */}
        {bekleyenIstek > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {bekleyenIstek > 9 ? '9+' : bekleyenIstek}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onNavigate('/agim/baglantilar')}
        aria-label="Bildirimler"
        className={IKON}
      >
        <Bell aria-hidden className="h-6 w-6" />
      </button>
    </header>
  );

  /* ------------------------------------------------------- profil halkaları */

  const halkalar = (
    <div className="border-b border-gray-200">
      <div className="flex gap-1 overflow-x-auto px-2 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Halka
          ad={benimAd}
          avatarYolu={benim?.avatarYolu ?? null}
          etiket="Paylaş"
          onClick={() => (onPaylasimOlustur ? onPaylasimOlustur() : onNavigate('/cv'))}
          rozet={
            <span className="absolute bottom-0 right-0 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white">
              <ImagePlus aria-hidden className="h-3 w-3" />
            </span>
          }
        />
        {oneriler.map((k) => (
          <Halka
            key={k.profilId}
            ad={k.gorunenAd ?? k.kullaniciAdi ?? 'Kişi'}
            avatarYolu={k.avatarYolu}
            etiket={k.kullaniciAdi ?? k.gorunenAd ?? 'Kişi'}
            vurgulu
            onClick={() => k.kullaniciAdi && onNavigate(`/profil/${k.kullaniciAdi}`)}
          />
        ))}
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- akış */

  const begeniYaz = (postId: string, yeni: BegeniDurumu) =>
    setBegeniler((o) => new Map(o).set(postId, yeni));

  const kayitYaz = (postId: string, kayitli: boolean) =>
    setKayitlilar((o) => {
      const y = new Set(o);
      if (kayitli) y.add(postId);
      else y.delete(postId);
      return y;
    });

  const profilAc = (kullaniciAdi: string) => onNavigate(`/profil/${kullaniciAdi}`);

  const bosDurum = (
    /*
      ÜÇ AYRI BOŞ KUTU YOK.

      Eskiden boşluk üç kutuya bölünmüştü ("bağlantın yok", "istek yok",
      "gönderdiğin istek yok") ve üçü de kullanıcıya YAPACAK BİR ŞEY
      söylemiyordu. Boş akışta gereken şey açıklama değil, çıkış: kimi
      keşfedeceğin, nasıl bağlanacağın, ne paylaşacağın.
    */
    <div className="space-y-6 px-4 py-8">
      <div className="space-y-1.5 text-center">
        <h2 className="text-base font-extrabold text-gray-900">Akışın henüz boş</h2>
        <p className="text-sm leading-relaxed text-gray-600">
          Paylaşımlar bağlantılarından ve alanındaki kişilerden geliyor.
        </p>
      </div>

      {oneriler.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-gray-900">Alanındaki kişileri keşfet</h3>
          <ul className="space-y-1.5">
            {oneriler.slice(0, 5).map((k) => (
              <li key={k.profilId}>
                <button
                  type="button"
                  onClick={() => k.kullaniciAdi && onNavigate(`/profil/${k.kullaniciAdi}`)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-2.5 text-left hover:border-blue-300 ${RENK_GECISI} ${ODAK_HALKASI}`}
                >
                  <ProfilFotografi
                    ad={k.gorunenAd ?? k.kullaniciAdi ?? 'Kişi'}
                    yol={k.avatarYolu}
                    className="h-10 w-10 shrink-0 rounded-full text-sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-gray-900">
                      {k.gorunenAd ?? k.kullaniciAdi ?? 'Kişi'}
                    </span>
                    {k.bolumAdi && (
                      <span className="block truncate text-xs text-gray-600">{k.bolumAdi}</span>
                    )}
                  </span>
                  <UserRoundPlus aria-hidden className="h-4 w-4 shrink-0 text-blue-600" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onNavigate('/agim/baglantilar')}
          className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`}
        >
          Bağlantılarını yönet
        </button>
        <button
          type="button"
          onClick={() => (onPaylasimOlustur ? onPaylasimOlustur() : onNavigate('/cv'))}
          className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 ${RENK_GECISI} ${ODAK_HALKASI}`}
        >
          İlk paylaşımını oluştur
        </button>
      </div>
    </div>
  );

  const akisGovdesi =
    durum === 'yukleniyor' ? (
      <div aria-busy="true" className="space-y-6 py-3">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-3 px-3">
              <span className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
              <span className="h-3.5 w-32 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="aspect-[4/5] w-full animate-pulse bg-gray-100" />
          </div>
        ))}
      </div>
    ) : durum === 'hata' ? (
      <div role="alert" className="space-y-2 px-4 py-8 text-center">
        <p className="text-sm font-bold text-gray-900">Akış alınamadı.</p>
        <p className="text-sm text-gray-600">
          Bağlantı ya da sunucu kaynaklı olabilir. İçeriğinde bir değişiklik olmadı.
        </p>
      </div>
    ) : akis.length === 0 ? (
      bosDurum
    ) : (
      <div className="divide-y divide-gray-200 sm:space-y-4 sm:divide-y-0">
        {akis.map((p) => (
          <AkisKarti
            key={p.id}
            paylasim={p}
            begeni={begeniler.get(p.id)}
            kayitliMi={kayitlilar.has(p.id)}
            onProfilAc={profilAc}
            onBegeniDegisti={begeniYaz}
            onKayitDegisti={kayitYaz}
          />
        ))}
      </div>
    );

  /* ------------------------------------------------------------- düzen */

  return (
    <div className="bg-white lg:bg-transparent">
      {baslik}

      {/*
        MASAÜSTÜ: ortalanmış akış + sağda öneri sütunu.
        TELEFON: tek sütun, kenardan kenara, öneri sütunu yok — oradaki
        keşif işini üstteki profil halkaları yapıyor.
      */}
      <div className="mx-auto w-full max-w-[975px] gap-8 px-0 lg:flex lg:items-start lg:px-6 lg:pt-6">
        <main className="min-w-0 flex-1 lg:max-w-[600px]">
          {/*
            Halkalar yalnız telefon ve tablette. Geniş ekranda keşif işini
            sağdaki öneri sütunu yapıyor; iki yerde aynı kişileri
            göstermek aynı listeyi iki kez çizmek olurdu.
          */}
          <div className="lg:hidden">{halkalar}</div>
          {akisGovdesi}
        </main>

        <aside className="hidden w-[320px] shrink-0 lg:block">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <ProfilFotografi
                  ad={benimAd}
                  yol={benim?.avatarYolu ?? null}
                  className="h-12 w-12 shrink-0 rounded-full"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">{benimAd}</p>
                  {benim?.sektorAdi && (
                    <p className="truncate text-xs text-gray-600">{benim.sektorAdi} alanı</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-bold text-gray-900">Alanından öneriler</h2>
                <button
                  type="button"
                  onClick={() => onNavigate('/agim/baglantilar')}
                  className={`cursor-pointer text-xs font-bold text-blue-700 hover:underline ${ODAK_HALKASI}`}
                >
                  {bekleyenIstek > 0 ? `${bekleyenIstek} istek` : 'Bağlantılar'}
                </button>
              </div>

              {oneriler.length === 0 ? (
                <p className="mt-2 text-xs leading-relaxed text-gray-600">
                  Şimdilik önerilecek kimse yok.
                </p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {oneriler.slice(0, 6).map((k) => (
                    <li key={k.profilId}>
                      <button
                        type="button"
                        onClick={() => k.kullaniciAdi && onNavigate(`/profil/${k.kullaniciAdi}`)}
                        className={`flex w-full cursor-pointer items-center gap-2.5 text-left ${ODAK_HALKASI}`}
                      >
                        <ProfilFotografi
                          ad={k.gorunenAd ?? k.kullaniciAdi ?? 'Kişi'}
                          yol={k.avatarYolu}
                          className="h-9 w-9 shrink-0 rounded-full text-sm"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-bold text-gray-900">
                            {k.kullaniciAdi ?? k.gorunenAd ?? 'Kişi'}
                          </span>
                          {k.bolumAdi && (
                            <span className="block truncate text-[11px] text-gray-600">
                              {k.bolumAdi}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs font-bold text-blue-700">Gör</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
