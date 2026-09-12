import React from 'react';
import { Bell, ImagePlus, Users } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import {
  akisiGetir,
  baglantilarimiGetir,
  begeniDurumuGetir,
  kaydetmeDurumuGetir,
  kendiSosyalProfiliGetir,
  type AkisPaylasimi,
  type BegeniDurumu,
  type SosyalProfil,
} from '../../lib/queries/sosyal';
import { AkisKarti } from './AkisKarti';
import { ProfilFotografi } from './ProfilFotografi';

/**
 * /agim — bağlantılarının ve alanının akışı.
 *
 * YOĞUNLUK INSTAGRAM'DAN, KURALLAR SUNUCUDAN
 * ------------------------------------------
 * Telefonda: kompakt başlık ve kenardan kenara paylaşımlar. Kart kutusu ve gri bant yok — akış tek bir beyaz yüzey.
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
  const [bekleyenIstek, setBekleyenIstek] = React.useState(0);
  const [begeniler, setBegeniler] = React.useState<Map<string, BegeniDurumu>>(new Map());
  const [kayitlilar, setKayitlilar] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!oturumHazir || !kullaniciId) return;
    let iptal = false;
    setDurum('yukleniyor');

    (async () => {
      try {
        const [paylasimlar, profil, baglantilar] = await Promise.all([
          akisiGetir(),
          kendiSosyalProfiliGetir(kullaniciId),
          baglantilarimiGetir(kullaniciId).catch(() => ({ kabul: [], gelen: [], giden: [] })),
        ]);
        if (iptal) return;

        setAkis(paylasimlar);
        setBenim(profil);
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
      söylemiyordu. Boş akışta gereken şey açıklama değil, çıkış: nasıl
      bağlanacağın ve ne paylaşacağın.

      ÖNERİLEN KİŞİ LİSTESİ KALDIRILDI — hem buradan hem üstteki halka
      şeridinden hem de masaüstü sütunundan. Satırlar `social_profiles`
      tablosundan gerçekten geliyordu ama arkalarındaki hesapların bir
      kısmı deneme kaydı; onları "alanındaki kişiler" diye önermek,
      kullanıcıya gerçek olmayan bir topluluk göstermek olurdu.
      Sorgusu da silindi (bkz. lib/queries/sosyal): kullanılmayan bir
      dışa aktarım, yarın yanlışlıkla geri bağlanmayı kolaylaştırır.
    */
    <div className="space-y-6 px-4 py-8">
      <div className="space-y-1.5 text-center">
        <h2 className="text-base font-extrabold text-gray-900">Akışın henüz boş</h2>
        <p className="text-sm leading-relaxed text-gray-600">
          Paylaşımlar bağlantılarından ve alanındaki kişilerden geliyor.
        </p>
      </div>

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
        MASAÜSTÜ: ortalanmış akış + sağda kendi kimliğin ve bağlantı
        girişi. TELEFON: tek sütun, kenardan kenara.

        Sağ sütunda ÖNERİ LİSTESİ YOK — gerekçe boş durumun yanında.
      */}
      <div className="mx-auto w-full max-w-[975px] gap-8 px-0 lg:flex lg:items-start lg:px-6 lg:pt-6">
        <main className="min-w-0 flex-1 lg:max-w-[600px]">
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

              <button
                type="button"
                onClick={() => onNavigate('/agim/baglantilar')}
                className={`mt-3 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`}
              >
                {/* Sayı gerçek; sıfırken hiç yazılmıyor. */}
                {bekleyenIstek > 0 ? `Bağlantılar · ${bekleyenIstek} istek` : 'Bağlantılar'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
