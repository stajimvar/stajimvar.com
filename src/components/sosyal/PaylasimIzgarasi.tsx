import React from 'react';
import { Images, Undo2 } from 'lucide-react';
import { SOSYAL_PAYLASIM_KOVASI, type SosyalPaylasim } from '../../lib/queries/sosyal';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import { tarihMetni } from '../../lib/tarih.mjs';
import { PaylasimDetayi } from './PaylasimDetayi';
import { useGorselAdresleri } from './useGorselAdresleri';

/**
 * PAYLAŞIM IZGARASI
 *
 * Ölçü depodaki kalıptan geliyor (RehberKartlari.tsx): telefonda iki,
 * geniş ekranda üç sütun. Yeni bir ızgara ölçüsü tanımlanmadı — aynı
 * üründe ikinci bir ızgara ölçeği, aynı sayfada iki farklı kart boyu
 * demek olurdu.
 *
 * SEKME YOK
 * ---------
 * Izgara tek parça: "Projeler", "Üretim Süreçleri", "CV ve Yetenekler"
 * gibi bölümler çizilmiyor. Şemadaki `profile_categories` bile ızgarayı
 * bölmüyor; kategoriler yalnız düzenleme ve öneri tarafında yardımcı.
 *
 * KAPAK ARTIK ÇİZİLİYOR — HER KART KENDİ DOSYASINI İNDİRİYOR
 * ----------------------------------------------------------
 * Kova `public = false` (20260924020000) ve kalıcı adres yok. Bir süre
 * kapaklar tek istekte İMZALANIYORDU; imza kalktı çünkü ölçüldü: bir kez
 * verilen jeton RLS'i yeniden sormuyor, arşiv/engel sonrasında eski imza
 * hâlâ 200 dönerken yetkili indirme 400 dönüyor. Şimdi N kapak için N
 * indirme var ve her biri kullanıcının oturumundan geçiyor; gerekçenin
 * tamamı `useGorselAdresleri` başlığında.
 *
 * KART NEDEN `<a href>` DEĞİL
 * ---------------------------
 * Depodaki kural kart bağlantısının gerçek bir `<a href>` olmasını
 * istiyor; o kural bir ADRESE giden kartlar için. Paylaşımın kalıcı
 * adresi yok: ne App'te `/paylasim/:id` rotası var ne sunucuda karşılığı.
 * Olmayan bir adrese bağlantı yazmak, orta tuşla açıldığında 404 veren
 * bir kart üretirdi. Kart bu yüzden `<button>` ve ayrıntı bir `dialog`.
 */

/*
  IZGARA TEK LİSTE ÇİZİYOR — LİSTENİN KİM OLDUĞUNU ÇAĞIRAN SÖYLÜYOR

  Aynı ızgara artık dört yerde: profil, Beğendiklerim, Kaydedilenler ve
  Arşiv. İkinci bir ızgara yazmak yerine boş cümle ve kart altı eylemi
  prop olarak geçiyor; iki kopya olsaydı biri değiştiğinde öteki geride
  kalır ve aynı üründe iki farklı kart ölçüsü çıkardı.
*/
interface IzgaraProps {
  paylasimlar: SosyalPaylasim[];
  durum: 'yukleniyor' | 'hazir' | 'hata';
  onYenidenDene?: () => void;
  /**
   * Boş ızgaranın CÜMLESİNİ belirleyen yetki durumu.
   *
   * Varsayılan `false`, yani ziyaretçi. Ters varsayılan daha tehlikeli
   * olurdu: prop'u geçirmeyi unutan bir çağıran, ziyaretçiye "Henüz
   * paylaşım yok." yazdırırdı ve o cümle ortada paylaşım olmadığını
   * İDDİA eder. Ziyaretçi cümlesi ise sahibine yanlış geldiğinde bile
   * bir şey sızdırmıyor, yalnız garip duruyor.
   *
   * Aynı bayrak ayrıntı katmanındaki sahibe özel eylemleri de kesiyor:
   * arşivleme ziyaretçi dalında DOM'a hiç girmiyor.
   */
  sahibiMi?: boolean;
  /** Arşivleme başarılı olduğunda listeyi tazeleyen çağrı. */
  onArsivlendi?: () => void;
  /**
   * Boş listenin cümlesi.
   *
   * Verilmezse profil ızgarasının iki cümlesi geçerli. Beğendiklerim,
   * Kaydedilenler ve Arşiv'in boşluğu farklı şeyler anlatıyor ve aynı
   * cümleyle geçiştirilemez: "henüz paylaşım yok" bir arşiv ekranında
   * yanlış bir iddia olurdu.
   */
  bosMetni?: string;
  /**
   * Arşiv ekranının kart altı eylemi — "Profilde yeniden göster".
   *
   * Verilmediğinde satır DOM'a HİÇ girmiyor: ötekiler `disabled` bir
   * düğme görmüyor, çünkü orada geri yüklenecek bir şey yok. Düğme
   * kartın İÇİNDE değil ALTINDA: kart zaten bir `<button>` ve iç içe
   * düğme geçersiz HTML olurdu.
   */
  onGeriYukle?: (paylasim: SosyalPaylasim) => void;
  /** Şu anda geri yüklenen kimlik; o kartın düğmesi kilitli. */
  geriYuklenenId?: string | null;
}

const KART_KABI = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';

export const PAYLASIM_IZGARASI = 'grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3';

/** Kapak kutusu: içerik gelmeden de aynı yeri kaplıyor, ızgara zıplamıyor. */
const KAPAK_KABI = 'relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100';

interface KartProps {
  paylasim: SosyalPaylasim;
  /** İndirme durumu ızgaranın tamamı için tek: kartlar birlikte iniyor. */
  kapakDurumu: 'yukleniyor' | 'hazir' | 'hata';
  kapakAdresi: string | null;
  onAc: (paylasim: SosyalPaylasim, tetikleyici: HTMLElement) => void;
  onGeriYukle?: (paylasim: SosyalPaylasim) => void;
  geriYukleKilidi?: boolean;
}

const GERI_YUKLE_DUGMESI = `inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 text-[13px] font-bold text-gray-800 hover:bg-gray-50 disabled:cursor-default disabled:opacity-40 sm:text-sm ${RENK_GECISI} ${ODAK_HALKASI}`;

const PaylasimKarti: React.FC<KartProps> = ({
  paylasim,
  kapakDurumu,
  kapakAdresi,
  onAc,
  onGeriYukle,
  geriYukleKilidi = false,
}) => {
  const tarih = tarihMetni(paylasim.arsivAni ?? paylasim.olusturmaAni);

  const kart = (
    /*
      UZUN DİZE KARTI GENİŞLETMİYOR

      Açıklamayı kullanıcı yazıyor. `line-clamp-3` satır SAYISINI
      sınırlıyor ama satır İÇİ bölmeyi sağlamıyor: boşluksuz uzun bir
      dize satıra sığmadığında kutudan taşıyordu. İki koruma birlikte
      gerekiyor — `break-words` metni kırıyor, `min-w-0` ise kartın
      kendisini sütununda tutuyor: ızgara çocuğunun varsayılan
      `min-width: auto` değeri kartın kendi sütununu aşmasına izin
      veriyor, yani sarma sınıfı tek başına yetmiyor.

      `break-all` kullanılmadı: normal Türkçe metni de rastgele böler.
    */
    <button
      type="button"
      /*
        Odak, bir kart geri yüklendikten sonra ELLE taşınıyor ve hedef
        kart bu nitelikten bulunuyor; `id` üretmek yerine kimliğin
        kendisi yazılıyor. Sıra kararı `geriYuklemeOdagi` içinde.
      */
      data-paylasim-kimligi={paylasim.id}
      onClick={(olay) => onAc(paylasim, olay.currentTarget)}
      className={`${KART_KABI} flex h-full min-w-0 flex-col gap-1.5 cursor-pointer text-left hover:border-gray-300 ${RENK_GECISI} ${ODAK_HALKASI}`}
    >
      <div className={KAPAK_KABI}>
        {kapakDurumu === 'yukleniyor' && paylasim.kapakYolu && (
          <span aria-hidden className="block h-full w-full animate-pulse bg-gray-100" />
        )}

        {kapakDurumu !== 'yukleniyor' && paylasim.kapakYolu && kapakAdresi && (
          <img
            src={kapakAdresi}
            /*
              `alt` yazarın yazdığı metin; yazmadıysa BOŞ kalıyor.
              "Paylaşım görseli" gibi bir doldurma, ekran okuyucuya
              içerik hakkında hiçbir şey söylemeden gürültü üretirdi.
              Kartın kendisi zaten açıklama ve tarihle okunuyor.
            */
            alt={paylasim.kapakAlt ?? ''}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}

        {/*
          "Alınamadı" ile "yok" AYRI cümleler: birincisi geçici bir sorun,
          ikincisi paylaşımın kendisi hakkında bir iddia.
        */}
        {kapakDurumu !== 'yukleniyor' && paylasim.kapakYolu && !kapakAdresi && (
          <span className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-gray-600">
            Görsel açılamadı
          </span>
        )}

        {!paylasim.kapakYolu && (
          <span className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-gray-600">
            Görsel yok
          </span>
        )}

        {/*
          ÇOKLU FOTOĞRAF GÖSTERGESİ — SAYI YAZMIYOR

          İkon tek başına bilgi taşımıyor; yanındaki metin ekran
          okuyucuya durumu söylüyor. Rozette sayı basılmadı: kapak
          üstündeki küçük alanda okunan bir sayı, kartın asıl işi olan
          "hangi paylaşım" sorusunu bulandırıyordu. Gerçek sayı ayrıntı
          katmanında, gezinme satırında yazıyor.
        */}
        {paylasim.gorselSayisi > 1 && (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center rounded-full bg-slate-950/60 p-1.5 text-white">
            <Images aria-hidden className="h-3.5 w-3.5" />
            <span className="sr-only">Birden çok fotoğraf</span>
          </span>
        )}
      </div>

      {paylasim.aciklama ? (
        <p className="text-[13px] leading-snug text-gray-900 break-words line-clamp-3 sm:text-sm">
          {paylasim.aciklama}
        </p>
      ) : (
        /* Açıklama boş olabilir; uydurma başlık üretilmiyor. */
        <p className="text-[13px] italic leading-snug text-gray-500 sm:text-sm">Açıklama yok</p>
      )}

      {tarih && <span className="mt-auto pt-1 text-[11px] text-gray-600">{tarih}</span>}
    </button>
  );

  /* Eylem yoksa hücre tek çocuktan ibaret: sarmalayıcı da eklenmiyor. */
  if (!onGeriYukle) return kart;

  return (
    <div className="flex h-full min-w-0 flex-col gap-1.5">
      {kart}
      <button
        type="button"
        onClick={() => onGeriYukle(paylasim)}
        disabled={geriYukleKilidi}
        className={GERI_YUKLE_DUGMESI}
      >
        <Undo2 aria-hidden className="h-4 w-4 shrink-0" />
        {/*
          Etiket eylemin SONUCUNU söylüyor: "geri al" ya da "çıkar"
          kullanıcıya paylaşımın nereye gideceğini anlatmazdı. Uzun
          etiket iki satıra düşebilir; `min-h-11` taban yükseklik olduğu
          için kutu küçülmüyor.
        */}
        <span className="min-w-0 text-center leading-tight">
          {geriYukleKilidi ? 'Geri yükleniyor…' : 'Profilde yeniden göster'}
        </span>
      </button>
    </div>
  );
};

/** İskelet ölçüsü gerçek kartla aynı: içerik gelince ızgara zıplamıyor. */
const Iskelet: React.FC = () => (
  <div aria-hidden className={`${KART_KABI} flex h-full flex-col gap-1.5`}>
    <div className={`${KAPAK_KABI} animate-pulse`} />
    <div className="h-3.5 w-4/5 animate-pulse rounded bg-gray-100" />
    <div className="mt-auto h-3 w-20 animate-pulse rounded bg-gray-100" />
  </div>
);

export const PaylasimIzgarasi: React.FC<IzgaraProps> = ({
  paylasimlar,
  durum,
  onYenidenDene,
  sahibiMi = false,
  onArsivlendi,
  bosMetni,
  onGeriYukle,
  geriYuklenenId = null,
}) => {
  const [acik, setAcik] = React.useState<SosyalPaylasim | null>(null);
  /* Katmanı açan kart; kapanışta odak buraya dönüyor. */
  const tetikRef = React.useRef<HTMLElement | null>(null);

  /*
    KAPAKLAR TEK TEK İNİYOR

    Toplu imza dokuz kapağı tek istekte adresliyordu; o tek istek dokuz
    dosyanın yetkisini bir kez soruyor ve sonrası için jetona
    güveniyordu. Ölçüm o jetonun yetki değişikliğini görmediğini
    gösterdi. Artık her kapak ayrı bir yetkili indirme: inemeyen dosya
    haritaya girmiyor ve o kart için "Görsel açılamadı" yazılıyor —
    sessizce boş bir kutu bırakmak, kırık görselden farksız olurdu.
  */
  const kapakYollari = React.useMemo(
    () =>
      paylasimlar
        .map((paylasim) => paylasim.kapakYolu)
        .filter((yol): yol is string => Boolean(yol)),
    [paylasimlar],
  );
  const { durum: kapakDurumu, adresler } = useGorselAdresleri(
    SOSYAL_PAYLASIM_KOVASI,
    kapakYollari,
  );

  if (durum === 'yukleniyor') {
    return (
      <div className={PAYLASIM_IZGARASI} aria-busy="true">
        <Iskelet />
        <Iskelet />
        <Iskelet />
      </div>
    );
  }

  /*
    HATA İLE BOŞ AYRI CÜMLE

    "Veri alınamadı" ile "henüz içerik yok" farklı şeyler. İkincisini
    hatanın yerine yazmak, kullanıcıya paylaşımlarının silindiğini
    düşündürürdü.
  */
  if (durum === 'hata') {
    return (
      <div className={`${KART_KABI} space-y-2 text-center`}>
        <p className="text-sm font-bold text-gray-900">Paylaşımlar alınamadı.</p>
        <p className="text-sm text-gray-600">
          Bağlantı ya da sunucu kaynaklı olabilir. İçeriğinde bir değişiklik olmadı.
        </p>
        {onYenidenDene && (
          <button
            type="button"
            onClick={onYenidenDene}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 transition-[background-color,border-color,color] duration-150 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Yeniden dene
          </button>
        )}
      </div>
    );
  }

  if (paylasimlar.length === 0) {
    return (
      /*
        Boş durumda EYLEM DÜĞMESİ YOK: paylaşım oluşturma girişi profil
        başlığında ve yalnız topluluğa katılmış sahibine çiziliyor.
        Burada ikinci bir giriş, aynı eylemin iki yerde iki farklı
        koşulla durması demek olurdu.
      */
      <div className={`${KART_KABI} text-center`}>
        {/*
          BOŞ IZGARANIN CÜMLESİ YETKİYE GÖRE DEĞİŞİYOR

          Sahibi kendi ızgarasına baktığında liste GERÇEKTEN boş: kendi
          satırlarının hepsini görüyor. Ziyaretçinin gördüğü boşluk ise
          RLS'in verdiği kadarı; "henüz paylaşım yok" demek, kitlesi dar
          bir paylaşımın yokluğunu ona İDDİA etmek olurdu.

          Ziyaretçi cümlesi gizli paylaşım olup olmadığını da AÇIKLAMIYOR.
          "Bazıları sana kapalı olabilir" gibi bir ek, tam da saklanan
          şeyin varlığını haber verirdi; bu yüzden cümle tek ve kısa.
        */}
        {/*
          Çağıran bir cümle verdiyse o geçerli: Beğendiklerim ve
          Kaydedilenler'in boşluğu "paylaşım yok" değil, "listende
          görüntülenebilen bir şey yok" demek ve ikisi aynı cümleye
          indirilemez.
        */}
        <p className="text-sm leading-relaxed text-gray-600">
          {bosMetni ?? (sahibiMi ? 'Henüz paylaşım yok.' : 'Görebileceğin bir paylaşım yok.')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={PAYLASIM_IZGARASI}>
        {paylasimlar.map((paylasim) => (
          <PaylasimKarti
            key={paylasim.id}
            paylasim={paylasim}
            kapakDurumu={kapakDurumu}
            kapakAdresi={paylasim.kapakYolu ? (adresler.get(paylasim.kapakYolu) ?? null) : null}
            onAc={(secilen, tetikleyici) => {
              tetikRef.current = tetikleyici;
              setAcik(secilen);
            }}
            onGeriYukle={onGeriYukle}
            geriYukleKilidi={geriYuklenenId === paylasim.id}
          />
        ))}
      </div>

      {acik && (
        <PaylasimDetayi
          paylasim={acik}
          sahibiMi={sahibiMi}
          tetikleyici={tetikRef.current}
          onKapat={() => setAcik(null)}
          onArsivlendi={onArsivlendi}
        />
      )}
    </>
  );
};
