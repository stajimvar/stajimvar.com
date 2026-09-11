import React from 'react';
import { Camera, Images, Undo2 } from 'lucide-react';
import { SOSYAL_PAYLASIM_KOVASI, type SosyalPaylasim } from '../../lib/queries/sosyal';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import { tarihMetni } from '../../lib/tarih.mjs';
import { IKON_TONU } from '../../ui/tokens';
import { PaylasimDetayi } from './PaylasimDetayi';
import { useGorselAdresleri } from './useGorselAdresleri';

/**
 * PAYLAŞIM IZGARASI
 *
 * İKİ ÖLÇÜ, İKİ İŞ
 * ----------------
 * Sade ızgara (profil, ziyaretçi görünümü) her genişlikte ÜÇ sütun ve
 * 2 px boşluk: hücre çıplak dikey (3:4) fotoğraf, çerçevesi ve köşesi yok;
 * hücreler arasında yalnız o boşluk var. Depodaki kart kalıbı (iki/üç
 * sütun, 10–16 px boşluk, yuvarlak köşe) burada bilerek kullanılmıyor —
 * o kalıp metin taşıyan kartlar için; fotoğraf duvarında boşluk ve
 * köşe, fotoğrafın kendisinden yer çalıyor ve mobilde iki sütun,
 * masaüstünde üç sütun olunca aynı duvar iki genişlikte farklı
 * dizilirdi.
 *
 * Ayrıntılı ızgara (Arşiv, Beğendiklerim, Kaydedilenler) kart kalıbında
 * KALIYOR (`AYRINTILI_IZGARA`): orada hücre açıklama, tarih ve kart altı
 * düğme taşıyor; üç dar sütuna sığmaz.
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
   * Yetki durumu; varsayılan `false`, yani ziyaretçi.
   *
   * Bayrak ayrıntı katmanındaki sahibe özel eylemleri kesiyor: arşivleme
   * ziyaretçi dalında DOM'a hiç girmiyor. Boş ızgaranın CÜMLESİNİ artık
   * belirlemiyor — iki cümle vardı ve ziyaretçininki ("Görebileceğin bir
   * paylaşım yok.") tam da saklanan şeyin varlığını ima ediyordu; boş
   * durum bu yüzden tek ve tarafsız (aşağıda).
   */
  sahibiMi?: boolean;
  /** Arşivleme başarılı olduğunda listeyi tazeleyen çağrı. */
  onArsivlendi?: () => void;
  /**
   * Boş listenin cümlesi.
   *
   * Verilmezse profil ızgarasının tek cümlesi geçerli. Beğendiklerim,
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
  /**
   * Hücrenin ne kadarını çizeceği.
   *
   * 'ayrintili' (VARSAYILAN) hücreyi kart kabına koyup açıklamayı ve
   * tarihi de basıyor. Arşiv ekranı bunu istiyor: orada kart ALTINDA
   * "Profilde yeniden göster" düğmesi var ve kullanıcı hangi satırı geri
   * yüklediğini çıplak kapaktan ayırt edemez — aynı fotoğrafın iki ayrı
   * gün paylaşılmış hâli olabilir.
   *
   * 'sade' hücreyi çıplak dikey (3:4) fotoğrafa indiriyor; profil ızgarasının
   * onaylanan tasarımı bu. Açıklama YOK OLMUYOR, yer değiştiriyor: tam
   * metin ayrıntı katmanında (`PaylasimDetayi`) duruyor. "Açıklama yok"
   * satırı da bu yüzden kalktı — boş bir alanın boşluğunu ilan eden bir
   * satır, ızgaranın asıl sorusunu ("hangi fotoğraf") bulandırıyordu.
   *
   * Varsayılan bilerek 'ayrintili': prop'u geçirmeyi unutan çağıran
   * bugünkü davranışı görüyor. Ters varsayılan, arşivdeki tarihi sessizce
   * kaldırırdı.
   */
  gorunum?: 'sade' | 'ayrintili';
  /**
   * Listedeki gönderilerin sahibi — akış başlığında "@ad" olarak yazılıyor.
   *
   * Yalnız listenin tamamı tek profile aitken (profil ızgarası) veriliyor.
   * Beğendiklerim, Kaydedilenler ve Arşiv karışık yazarlı; orada
   * verilmiyor ve başlık "Gönderi" kalıyor. Gönderi satırı yazar adı
   * taşımıyor, bu yüzden buradan geçmeyen ad ekranda uydurulmuyor.
   */
  kullaniciAdi?: string | null;
}

const KART_KABI = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';

/** Sade ızgara: her genişlikte üç sütun, hücreler arasında yalnız 2 px. */
export const PAYLASIM_IZGARASI = 'grid grid-cols-3 gap-0.5';

/** Ayrıntılı ızgara depodaki kart kalıbında (RehberKartlari.tsx). */
export const AYRINTILI_IZGARA = 'grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3';

/**
 * Kapak kutusu: içerik gelmeden de aynı yeri kaplıyor, ızgara zıplamıyor.
 * Köşe yuvarlaması yalnız ayrıntılı hücrede — sade ızgarada hücreler
 * 2 px arayla yan yana ve yuvarlak köşe o arada beyaz üçgenler açardı.
 *
 * SADE HÜCRE DİKEY 3:4, AYRINTILI HÜCRE KARE
 * ------------------------------------------
 * Sade ızgara Instagram'ın bugünkü karosunu izliyor: o karo artık kare
 * değil dikey 3:4. Kare hücre üç sütunlu masaüstünde her karoyu hem
 * geniş hem kısa bırakıyordu; dikey oran aynı sütun genişliğinde
 * fotoğrafa daha çok yükseklik veriyor. Kapak `object-cover` ile
 * kırpılıyor, deforme olmuyor. Ayrıntılı hücre kare KALIYOR — orada
 * kapağın altında açıklama ve tarih var, dikey kapak kartı gereksiz
 * uzatırdı.
 */
const KAPAK_KABI = 'relative aspect-[3/4] w-full overflow-hidden bg-gray-100';
const AYRINTILI_KAPAK_KABI = 'relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100';

interface KartProps {
  paylasim: SosyalPaylasim;
  /** İndirme durumu ızgaranın tamamı için tek: kartlar birlikte iniyor. */
  kapakDurumu: 'yukleniyor' | 'hazir' | 'hata';
  kapakAdresi: string | null;
  onAc: (paylasim: SosyalPaylasim, tetikleyici: HTMLElement) => void;
  onGeriYukle?: (paylasim: SosyalPaylasim) => void;
  geriYukleKilidi?: boolean;
  sade: boolean;
}

const GERI_YUKLE_DUGMESI = `inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 text-[13px] font-bold text-gray-800 hover:bg-gray-50 disabled:cursor-default disabled:opacity-40 sm:text-sm ${RENK_GECISI} ${ODAK_HALKASI}`;

const PaylasimKarti: React.FC<KartProps> = ({
  paylasim,
  kapakDurumu,
  kapakAdresi,
  onAc,
  onGeriYukle,
  geriYukleKilidi = false,
  sade,
}) => {
  const tarih = tarihMetni(paylasim.arsivAni ?? paylasim.olusturmaAni);

  /*
    SADE HÜCRENİN ERİŞİLEBİLİR ADI

    Ayrıntılı hücrede düğmenin adı içeriğinden geliyordu: açıklama metni
    ve tarih düğmenin İÇİNDE yazılı. Sade hücrede metin kalmadı ve
    fotoğrafın `alt`ı da boş OLABİLİR (yazar yazmadıysa) — o durumda
    düğmenin erişilebilir adı tamamen boş kalır, ekran okuyucu "düğme"
    diye okurdu.

    Ad bu yüzden ELDE VAR OLANDAN kuruluyor: paylaşımın tarihi. İçerik
    uydurulmuyor — "Tekstil paylaşımı" gibi bir tahmin, olmayan bir
    başlığı ekran okuyucuya gerçek diye sunardı. Tarih de yoksa ad tek
    başına eyleme iniyor.
  */
  const sadeAd = tarih ? `${tarih} tarihli paylaşımı aç` : 'Paylaşımı aç';

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
      /*
        Sade hücrede kart kabı yok: kenarlık ve dolgu kalkınca aynı sütun
        genişliğinde fotoğrafın kendisi büyüyor. Odak halkası İKİ dalda da
        duruyor — çerçevesiz bir hücrede klavye odağının nerede olduğu
        yalnız o halkadan okunuyor.
      */
      aria-label={sade ? sadeAd : undefined}
      className={
        sade
          ? `block h-full w-full min-w-0 cursor-pointer ${RENK_GECISI} ${ODAK_HALKASI}`
          : `${KART_KABI} flex h-full min-w-0 flex-col gap-1.5 cursor-pointer text-left hover:border-gray-300 ${RENK_GECISI} ${ODAK_HALKASI}`
      }
    >
      <div className={sade ? KAPAK_KABI : AYRINTILI_KAPAK_KABI}>
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

      {/*
        AÇIKLAMA VE TARİH YALNIZ AYRINTILI HÜCREDE

        Sade hücrede ikisi de basılmıyor; açıklamanın tam metni ayrıntı
        katmanında duruyor ve tarih de orada yazıyor. Sade hücrede bu
        satırların yerine düğmenin `aria-label`ı geçiyor, yani bilgi ekran
        okuyucudan da kaçmıyor.
      */}
      {!sade && (
        <>
          {paylasim.aciklama ? (
            <p className="text-[13px] leading-snug text-gray-900 break-words line-clamp-3 sm:text-sm">
              {paylasim.aciklama}
            </p>
          ) : (
            /* Açıklama boş olabilir; uydurma başlık üretilmiyor. */
            <p className="text-[13px] italic leading-snug text-gray-500 sm:text-sm">Açıklama yok</p>
          )}

          {tarih && <span className="mt-auto pt-1 text-[11px] text-gray-600">{tarih}</span>}
        </>
      )}
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

/**
 * İskelet ölçüsü gerçek kartla aynı: içerik gelince ızgara zıplamıyor.
 *
 * Sade dalda metin çizgileri de yok — onları çizmek, gelmeyecek bir
 * satırın yerini ayırıp içerik gelince ızgarayı kısaltırdı.
 */
const Iskelet: React.FC<{ sade: boolean }> = ({ sade }) =>
  sade ? (
    <div aria-hidden className={`${KAPAK_KABI} animate-pulse`} />
  ) : (
    <div aria-hidden className={`${KART_KABI} flex h-full flex-col gap-1.5`}>
      <div className={`${AYRINTILI_KAPAK_KABI} animate-pulse`} />
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
  gorunum = 'ayrintili',
  kullaniciAdi = null,
}) => {
  const sade = gorunum === 'sade';
  const izgaraSinifi = sade ? PAYLASIM_IZGARASI : AYRINTILI_IZGARA;
  /*
    Açık olan gönderinin KİMLİĞİ, nesnesi değil: katman ızgaranın güncel
    listesini alıyor (dar ekranda o listenin tamamı bir akış olarak
    çiziliyor) ve tazelenen listede aynı kimliği kendisi buluyor.
  */
  const [acikId, setAcikId] = React.useState<string | null>(null);
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

  /*
    KATMAN IZGARANIN DURUMUNDAN BAĞIMSIZ

    Arşivleme listeyi sunucudan yeniden çektiriyor ve ızgara o sırada
    'yukleniyor'a dönüyor. Katman yalnız 'hazir' dalında çizilseydi, dar
    ekrandaki akış bir gönderi arşivlenir arşivlenmez sökülür, kullanıcı
    ızgaraya düşer ve odağı kaybederdi. Bu yüzden katman yükleme, hata ve
    liste dallarının üçüne de ekleniyor (boş dalda açılacak gönderi yok);
    tazeleme sürerken eski listeyle duruyor — `paylasimlar` yalnız başarılı
    yanıtta yazılıyor — ve arşivlenen kimliği katman kendisi düşürüyor.
  */
  const katman = acikId !== null && paylasimlar.length > 0 && (
    <PaylasimDetayi
      liste={paylasimlar}
      baslangicId={acikId}
      sahibiMi={sahibiMi}
      tetikleyici={tetikRef.current}
      onKapat={() => setAcikId(null)}
      onArsivlendi={onArsivlendi}
      kullaniciAdi={kullaniciAdi}
    />
  );

  if (durum === 'yukleniyor') {
    return (
      <>
        <div className={izgaraSinifi} aria-busy="true">
          <Iskelet sade={sade} />
          <Iskelet sade={sade} />
          <Iskelet sade={sade} />
        </div>
        {katman}
      </>
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
      <>
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
        {katman}
      </>
    );
  }

  /*
    BOŞ, HATANIN TERSİ: `[]` başarıdır, `throw` hatadır. Bu dal yalnız
    sorgu 200 dönüp sıfır satır verdiğinde çiziliyor; sorgu fırlarsa
    yukarıdaki 'hata' dalı ya da sayfanın "Portfolyon alınamadı" ekranı
    devrede ve ikisi asla aynı cümleye inmiyor.
  */
  if (paylasimlar.length === 0) {
    return (
      /*
        Boş durumda EYLEM DÜĞMESİ YOK: paylaşım oluşturma girişi profil
        başlığında ve yalnız topluluğa katılmış sahibine çiziliyor.
        Burada ikinci bir giriş, aynı eylemin iki yerde iki farklı
        koşulla durması demek olurdu.
      */
      <div className={`${KART_KABI} flex flex-col items-center gap-3 py-8 text-center`}>
        {/*
          BOŞ IZGARANIN CÜMLESİ YETKİYE GÖRE DEĞİŞMİYOR

          Eskiden iki cümle vardı: sahibe "Henüz paylaşım yok.",
          ziyaretçiye "Görebileceğin bir paylaşım yok.". İkinci cümle
          RLS'in kestiği satırların VARLIĞINI ima ediyordu — "görebileceğin"
          sözcüğü, göremediklerin olduğunu söyler. Görünürlük burada bir
          güvenlik sınırı; boş ızgara kitlesi dar bir paylaşımın var mı yok
          mu olduğunu hiçbir sözcükle haber vermemeli. Tek tarafsız cümle
          bu yüzden.

          Simge dekoratif ve tek başına bilgi taşımıyor: metin yanında,
          simge `aria-hidden`. Ton depodaki IKON_TONU; IKON_KUTUSU'nun 40px
          karesi yerine daire, çünkü burası satır başı ikonu değil ızgaranın
          tamamının yerini tutan tek görsel.
        */}
        <span
          aria-hidden="true"
          className={`flex h-14 w-14 items-center justify-center rounded-full ${IKON_TONU}`}
        >
          <Camera className="h-7 w-7" strokeWidth={1.5} />
        </span>
        {/*
          Çağıran bir cümle verdiyse o geçerli: Beğendiklerim, Kaydedilenler
          ve Arşiv'in boşluğu "gönderi yok" değil, "listende görüntülenebilen
          bir şey yok" demek ve ikisi aynı cümleye indirilemez.
        */}
        <p className="text-sm font-bold text-gray-900">{bosMetni ?? 'Henüz hiç gönderi yok'}</p>
      </div>
    );
  }

  return (
    <>
      <div className={izgaraSinifi}>
        {paylasimlar.map((paylasim) => (
          <PaylasimKarti
            key={paylasim.id}
            paylasim={paylasim}
            kapakDurumu={kapakDurumu}
            kapakAdresi={paylasim.kapakYolu ? (adresler.get(paylasim.kapakYolu) ?? null) : null}
            onAc={(secilen, tetikleyici) => {
              tetikRef.current = tetikleyici;
              setAcikId(secilen.id);
            }}
            onGeriYukle={onGeriYukle}
            geriYukleKilidi={geriYuklenenId === paylasim.id}
            sade={sade}
          />
        ))}
      </div>

      {katman}
    </>
  );
};
