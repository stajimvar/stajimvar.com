import React from 'react';
import { BadgeCheck, Bookmark, Heart, Send } from 'lucide-react';
import { YUZEY } from '../../ui/tokens';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import {
  SOSYAL_PAYLASIM_KOVASI,
  begen,
  begeniyiKaldir,
  kaydet,
  kaydiKaldir,
  type AkisPaylasimi,
  type BegeniDurumu,
} from '../../lib/queries/sosyal';
import { useGorselAdresleri } from './useGorselAdresleri';
import { ProfilFotografi } from './ProfilFotografi';
import { gecenSure } from '../../lib/gecen-sure.mjs';

/**
 * Akıştaki tek paylaşım.
 *
 * YOĞUNLUK INSTAGRAM'DAN, RENKLER STAJIMVAR'DAN
 * ---------------------------------------------
 * Telefonda kart kabuğu yok: yazar satırı, tam genişlikte görsel, eylem
 * satırı, açıklama. Aralarında gri bant yok — akış kesintisiz bir beyaz
 * yüzey ve paylaşımları ayıran şey görselin kendisi.
 *
 * `sm:` üstünde ortalanmış sütunun içinde kart kenarlığı geri geliyor:
 * orada içerik ekranın tamamını kaplamıyor ve nerede bittiğinin
 * görünmesi gerekiyor.
 *
 * YORUM EYLEMİ YOK
 * ----------------
 * Beğeni (`post_likes`) ve kaydetme (`post_saves`) tabloları var ve bu
 * satırdaki iki düğme gerçekten onlara yazıyor. Yorum için tablo, RLS
 * ve uç HİÇ YOK — çalışmayan bir yorum düğmesi çizmek, olmayan bir
 * özelliği varmış gibi göstermek olurdu. Eklenmesi bir veritabanı göçü
 * gerektiriyor.
 */

interface Props {
  paylasim: AkisPaylasimi;
  /** Beğeni durumu akıştan toplu geliyor; her kart kendi isteğini atmıyor. */
  begeni: BegeniDurumu | undefined;
  kayitliMi: boolean;
  /**
   * Yazarın eski kamera düğmesiyle yüklenmiş fotoğrafı — YEDEK.
   *
   * `social_profiles.avatar_path` boş olan kullanıcı akışta baş harfle
   * görünüyordu; oysa fotoğrafı var, yalnız eski kolonda
   * (`student_profiles.avatar_url`). Profil ekranı bu yedeği zaten
   * kullanıyor (`ogrenciAvatarAdresi`), akış kullanmıyordu.
   *
   * Yalnız OTURUM SAHİBİNİN kendi paylaşımında dolu geliyor: başkasının
   * `student_profiles` satırı akışa açık değil ve olmayan bir adresi
   * uydurmak yerine baş harf çiziliyor.
   */
  yedekAvatarAdresi?: string | null;
  onProfilAc: (kullaniciAdi: string) => void;
  /**
   * Resmî içerikleri sessize alma.
   *
   * Yalnız resmî kartta anlamlı; verilmezse düğme hiç çizilmiyor.
   * Kaynağı kaldırmak diye bir şey yok — bu, kullanıcının elindeki tek
   * düğme ve geri alınabilir olması bilinçli.
   */
  onSessizeAl?: () => void | Promise<void>;
  /** Beğeni/kayıt değişince üst bileşen kendi haritasını güncelliyor. */
  onBegeniDegisti: (postId: string, yeni: BegeniDurumu) => void;
  onKayitDegisti: (postId: string, kayitli: boolean) => void;
}

const EYLEM = `inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-gray-800 hover:bg-gray-100 ${RENK_GECISI} ${ODAK_HALKASI}`;

export const AkisKarti: React.FC<Props> = ({
  paylasim,
  begeni,
  kayitliMi,
  yedekAvatarAdresi = null,
  onProfilAc,
  onSessizeAl,
  onBegeniDegisti,
  onKayitDegisti,
}) => {
  const { adresler } = useGorselAdresleri(
    SOSYAL_PAYLASIM_KOVASI,
    paylasim.gorseller.map((g) => g.storageYolu),
  );
  const [sira, setSira] = React.useState(0);
  const [islemde, setIslemde] = React.useState(false);

  const ad = paylasim.yazar.gorunenAd ?? (paylasim.yazar.kullaniciAdi ? `@${paylasim.yazar.kullaniciAdi}` : 'Kişi');
  const altSatir = [paylasim.yazar.bolumAdi, paylasim.yazar.sektorAdi].filter(Boolean).join(' · ');

  const profilAc = () => {
    if (paylasim.yazar.kullaniciAdi) onProfilAc(paylasim.yazar.kullaniciAdi);
  };

  const begeniDegistir = async () => {
    if (islemde || !begeni) return;
    setIslemde(true);
    const hedef = !begeni.begendimMi;
    /* İyimser güncelleme: dokunma ile boyama arasında bekleme olmuyor. */
    onBegeniDegisti(paylasim.id, {
      begendimMi: hedef,
      adet: Math.max(0, begeni.adet + (hedef ? 1 : -1)),
    });
    try {
      await (hedef ? begen(paylasim.id) : begeniyiKaldir(paylasim.id));
    } catch {
      /* Sunucu kabul etmediyse ekrandaki durum geri alınıyor: sessiz
         başarısızlık, beğenilmiş gibi görünen bir satır bırakırdı. */
      onBegeniDegisti(paylasim.id, begeni);
    } finally {
      setIslemde(false);
    }
  };

  const kayitDegistir = async () => {
    const hedef = !kayitliMi;
    onKayitDegisti(paylasim.id, hedef);
    try {
      await (hedef ? kaydet(paylasim.id) : kaydiKaldir(paylasim.id));
    } catch {
      onKayitDegisti(paylasim.id, kayitliMi);
    }
  };

  const paylas = async () => {
    const adres = paylasim.yazar.kullaniciAdi
      ? `${window.location.origin}/profil/${paylasim.yazar.kullaniciAdi}`
      : window.location.origin;
    try {
      if (navigator.share) await navigator.share({ url: adres, title: ad });
      else await navigator.clipboard.writeText(adres);
    } catch {
      /* Kullanıcı paylaşım sayfasını kapattıysa yapılacak bir şey yok. */
    }
  };

  return (
    /*
      Kabuk ortak belirteçten: liste ekranlarındaki kartlarla AYNI —
      telefonda köşesiz ve yalnız bir alt çizgi, `sm:` üstünde kart.
      Akış tek yerde elle yazılınca ötekilerden farklı kalıyordu
      (ayırıcı çizgisi yoktu, komşu paylaşımlar birbirine yapışıyordu).
    */
    <article className={`bg-white ${YUZEY.kabuk}`}>
      {/* -------------------------------------------------- yazar satırı */}
      <header className="flex items-center gap-3 px-4 py-2.5">
        <button type="button" onClick={profilAc} className={`shrink-0 cursor-pointer rounded-full ${ODAK_HALKASI}`}>
          <ProfilFotografi
            ad={ad}
            yol={paylasim.yazar.avatarYolu}
            yedekAdres={yedekAvatarAdresi}
            className="h-9 w-9 rounded-full text-sm"
          />
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <button
            type="button"
            onClick={profilAc}
            className={`block max-w-full truncate text-sm font-bold text-gray-900 cursor-pointer ${ODAK_HALKASI}`}
          >
            {ad}
          </button>
          {/*
            RESMÎ İÇERİK ETİKETİ ALT SATIRIN YERİNE GEÇİYOR

            Alt satır normalde "bölüm · alan" yazıyor. Resmî hesapta o
            iki alan ya boş ya anlamsız (kurumun bölümü yok); etiketi
            oraya koymak hem yeri boşa harcamıyor hem de kullanıcının
            adın hemen altında aradığı "bu kim" sorusunu cevaplıyor.

            ETİKET PAYLAŞIMDAN OKUNUYOR, YAZARDAN DEĞİL: "bu paylaşım
            resmî kitleyle yayımlandı" demek. Yazarın bayrağına
            bakılsaydı, resmî hesabın ileride sıradan bir paylaşımı da
            resmî içerik gibi etiketlenirdi.
          */}
          {paylasim.resmiMi ? (
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">
              <BadgeCheck aria-hidden className="h-3 w-3" />
              StajımVar'dan · Resmî içerik
            </span>
          ) : (
            altSatir && <span className="block truncate text-xs text-gray-600">{altSatir}</span>
          )}
        </div>

        {/*
          SESSİZE ALMA YALNIZ RESMÎ KARTTA

          Kullanıcı bu kaynağı KALDIRAMIYOR (kaldırılacak bir bağlantı
          yok, bkz. 20260928010000) — elindeki tek düğme bu. Düğmeyi
          yalnız resmî kartta çizmek, kullanıcı içeriğinde olmayan bir
          eylemi vaat etmemek demek.

          `onSessizeAl` verilmezse hiç çizilmiyor: eylemi olmayan bir
          düğme, basınca hiçbir şey yapmayan bir düğmedir.
        */}
        {paylasim.resmiMi && onSessizeAl && (
          <button
            type="button"
            onClick={() => void onSessizeAl()}
            className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer ${ODAK_HALKASI}`}
          >
            Sessize al
          </button>
        )}
      </header>

      {/* ------------------------------------------------------- görseller */}
      <div className="relative">
        {/*
          Yatay kaydırma ile geziniyor — telefonda parmak zaten bunu
          bekliyor. `snap` sıraya oturtuyor ki iki fotoğrafın arasında
          durulamasın.
        */}
        <div
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
          onScroll={(o) => {
            const k = o.currentTarget;
            setSira(Math.round(k.scrollLeft / Math.max(1, k.clientWidth)));
          }}
        >
          {paylasim.gorseller.map((g) => {
            const adres = adresler.get(g.storageYolu) ?? null;
            return (
              <div key={g.sira} className="w-full shrink-0 snap-center">
                <div className="aspect-[4/5] w-full overflow-hidden bg-gray-100">
                  {adres ? (
                    <img src={adres} alt={g.alt ?? ''} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="block h-full w-full animate-pulse bg-gray-100" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sıra göstergesi yalnız seri paylaşımda; tek fotoğrafta anlamsız. */}
        {paylasim.gorselSayisi > 1 && (
          <>
            <span className="absolute right-3 top-3 rounded-full bg-slate-950/60 px-2 py-0.5 text-xs font-semibold text-white">
              {Math.min(sira + 1, paylasim.gorselSayisi)}/{paylasim.gorselSayisi}
            </span>
            <div className="flex items-center justify-center gap-1.5 py-2">
              {paylasim.gorseller.map((g, i) => (
                <span
                  key={g.sira}
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${i === sira ? 'bg-blue-600' : 'bg-gray-300'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* --------------------------------------------------- eylem satırı */}
      {/* `px-2.5`: düğmenin kendi 44 piksellik kutusu 6 piksel iç boşluk
          taşıyor; ikonun görsel sol kenarı böylece yazıyla aynı 16
          piksele oturuyor. */}
      <div className="flex items-center gap-1 px-2.5 pt-1">
        <button
          type="button"
          onClick={begeniDegistir}
          aria-pressed={begeni?.begendimMi ?? false}
          aria-label={begeni?.begendimMi ? 'Beğeniyi kaldır' : 'Beğen'}
          className={EYLEM}
        >
          <Heart
            aria-hidden
            className={`h-6 w-6 ${begeni?.begendimMi ? 'fill-rose-600 text-rose-600' : ''}`}
          />
        </button>
        <button type="button" onClick={paylas} aria-label="Paylaş" className={EYLEM}>
          <Send aria-hidden className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={kayitDegistir}
          aria-pressed={kayitliMi}
          aria-label={kayitliMi ? 'Kaydı kaldır' : 'Kaydet'}
          className={`${EYLEM} ml-auto`}
        >
          <Bookmark aria-hidden className={`h-6 w-6 ${kayitliMi ? 'fill-gray-900' : ''}`} />
        </button>
      </div>

      {/* ------------------------------------------- sayı, açıklama, zaman */}
      <div className="space-y-1 px-4 pb-4">
        {/*
          Sıfır beğeni YAZILMIYOR. Sayı görünürlük kapısından geçiyor ve
          yetkisi olmayan çağırana sıfır satır dönüyor; "0 beğeni" yazmak
          o iki durumu tek cümleye indirir ve olmayan bir bilgiyi iddia
          ederdi (bkz. `BegeniDurumu.adet`).
        */}
        {(begeni?.adet ?? 0) > 0 && (
          <p className="text-sm font-bold text-gray-900">{begeni!.adet} beğeni</p>
        )}

        {paylasim.aciklama && (
          <p className="text-sm leading-relaxed text-gray-900 break-words">
            <button
              type="button"
              onClick={profilAc}
              className={`mr-1.5 font-bold cursor-pointer ${ODAK_HALKASI}`}
            >
              {paylasim.yazar.kullaniciAdi ? `@${paylasim.yazar.kullaniciAdi}` : ad}
            </button>
            {paylasim.aciklama}
          </p>
        )}

        <p className="text-xs text-gray-500">{gecenSure(paylasim.olusturmaAni)}</p>
      </div>
    </article>
  );
};
