import React from 'react';
import { createPortal } from 'react-dom';
import { Bell, Briefcase, CalendarClock, CheckCircle2, ChevronLeft, FileText, Heart, UserPlus, X } from 'lucide-react';
import { gecenSure, type Bildirim } from '../lib/bildirim';
import { bildirimleriGrupla } from '../lib/bildirim-grubu.mjs';
import { ProfilFotografi } from './sosyal/ProfilFotografi';

/**
 * BİLDİRİM MERKEZİ — İKİ DÜNYA, TEK SİSTEM
 *
 * Öğrenci tarafı mavi, işveren paneli yeşil-beyaz. Bildirim aynı
 * sistemden geliyor ama bulunduğu dünyanın rengini alıyor: aynı bileşen,
 * dışarıdan verilen tek bir vurgu rengi.
 *
 * Bu bir OLAY GÜNLÜĞÜ DEĞİL. Satırlar kompakt, tür dizesi ekranda
 * görünmüyor, tablo yok: yalnız ikon, başlık, kısa açıklama ve zaman.
 *
 * Dar ekranda alttan tam yükseklikte panel, geniş ekranda sağa hizalı
 * açılır kutu.
 */

/** Bildirim türünden ikon. Tanınmayan türde nötr bir belge ikonu. */
function BildirimIkonu({
  tur,
  renk,
  kisi = null,
}: {
  tur: string;
  renk: string;
  kisi?: { ad: string; avatarYolu: string | null } | null;
}) {
  /*
    Yuvarlak simge (telefonda 56, geniş ekranda 44 px): Instagram'da kişinin fotoğrafının durduğu yer.
    Bildirim satırı kişi bilgisi taşımadığı için türün simgesi çiziliyor;
    renk tek vurgu rengi, zemin onun açık tonu.
  */
  const ortak = { className: 'h-5 w-5 shrink-0', style: { color: renk }, strokeWidth: 1.9 };
  const simge =
    tur === 'gorusme_daveti' || tur === 'gorusme_guncellendi' ? <CalendarClock {...ortak} />
    : tur === 'teklif' || tur === 'teklif_kabul' ? <CheckCircle2 {...ortak} />
    : tur === 'yeni_basvuru' ? <Briefcase {...ortak} />
    /* Takip de kişiye dair bir olay: belge simgesine düşüyordu, oysa ortada belge yok. */
    : tur === 'baglanti_istegi' || tur === 'baglanti_kabul' || tur === 'takip' ? <UserPlus {...ortak} />
    : tur === 'paylasim_begeni' ? <Heart {...ortak} />
    : <FileText {...ortak} />;
  /*
    KİŞİ VARSA FOTOĞRAFI (Instagram gibi): olayı yapan kişinin profil
    fotoğrafı, sağ altında küçük tür rozeti (beğenide kırmızı kalp). Kişi
    bilinmiyorsa ya da profili görünmüyorsa tür simgesi.
  */
  if (kisi) {
    const begeni = tur === 'paylasim_begeni';
    return (
      <span className="relative h-14 w-14 shrink-0 sm:h-11 sm:w-11">
        <ProfilFotografi
          ad={kisi.ad}
          yol={kisi.avatarYolu}
          className="h-14 w-14 rounded-full text-lg sm:h-11 sm:w-11 sm:text-sm"
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white sm:h-5 sm:w-5"
          style={{ background: begeni ? '#EF4444' : renk }}
        >
          {begeni ? (
            <Heart className="h-3 w-3 fill-white text-white sm:h-2.5 sm:w-2.5" strokeWidth={2.5} />
          ) : (
            <UserPlus className="h-3 w-3 text-white sm:h-2.5 sm:w-2.5" strokeWidth={2.5} />
          )}
        </span>
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white sm:h-11 sm:w-11"
    >
      <span className="absolute inset-0 opacity-10" style={{ background: renk }} />
      <span className="relative">{simge}</span>
    </span>
  );
}

/**
 * Bağlantı isteğine verilen yanıtın SONUCU.
 *
 * `kabul` ile `gecersiz` arasındaki fark sunucuya sorularak
 * belirleniyor: istek daha önce yanıtlanmışsa güncelleme hiçbir satır
 * döndürmüyor ve çağrı hata veriyor, ama bağlantı KURULMUŞ olabilir.
 * O durumda kullanıcıya hata değil başarı gösteriliyor.
 */
export type BaglantiYanitSonucu = 'kabul' | 'red' | 'gecersiz';

/**
 * Bir bağlantı isteğinin ŞU ANKİ durumu — sunucudan.
 *
 * Yanıtın sonucu önce yalnız bileşenin belleğinde tutuluyordu: sayfa
 * yenilenince kayboluyor ve kabul edilmiş bir istek yeniden "Kabul et /
 * Reddet" gösteriyordu (bildirildi ve canlıda ölçüldü). Bellek bir
 * gerçeğin kaynağı olamaz; durum artık her panel açılışında bağlantı
 * listesinden türetiliyor.
 *
 *   bekliyor  düğmeler çiziliyor
 *   kabul     "Bağlantı kuruldu. Tebrikler!"
 *   yok       satır geçmişte kaldı (geri çekilmiş ya da reddedilmiş);
 *             ne düğme ne sonuç yazılıyor
 */
export type IstekDurumu = 'bekliyor' | 'kabul' | 'yok';

export const BildirimRozeti: React.FC<{ sayi: number | null; renk: string }> = ({ sayi, renk }) => {
  /*
    SAYI BİLİNMİYORSA ROZET ÇİZİLMİYOR

    `null` "henüz yüklenmedi" demek. Önce 0 gösterip sonra 3'e zıplamak,
    kullanıcının gözünde rozetin güvenilirliğini bitiriyor.
  */
  if (sayi === null || sayi <= 0) return null;
  return (
    <span
      aria-hidden="true"
      /*
        `pointer-events-none`: rozet düğmenin kenarından taşıyor. Tıklama
        yine de düğmeye ulaşıyordu (rozet düğmenin çocuğu, olay
        kabarcıklanıyor) ama taşan kısım artık hiçbir olayı yakalamıyor —
        rozetin tıklamayı yutabileceği bir hal kalmıyor.
      */
      className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white"
      style={{ background: renk }}
    >
      {sayi > 9 ? '9+' : sayi}
    </span>
  );
};

/*
  BAĞLANTI İSTEĞİ AYNI SATIRDAN YANITLANIYOR

  İstek bildirimi kullanıcıyı Bağlantılar sayfasına götürüyordu ve karar
  orada veriliyordu: zili aç, oku, sayfaya git, tekrar bul, kabul et.
  Karar tek dokunuşluk bir şey — bildirimin kendisinde duruyor.

  `onBaglantiYanitla` VERİLMEZSE düğmeler hiç çizilmiyor: eylemi olmayan
  bir düğme, basınca hiçbir şey yapmayan bir düğmedir. Şirket hesabında
  ve sosyal katmanın kapalı olduğu durumda prop geçilmiyor.
*/
export const BildirimMerkezi: React.FC<{
  bildirimler: Bildirim[];
  okunmamis: number | null;
  yukleniyor: boolean;
  /* Dünyanın vurgu rengi: öğrenci mavi, işveren yeşil. */
  renk: string;
  onKapat: () => void;
  onAc: (b: Bildirim) => void;
  onTumunuOkundu: () => void;
  /*
    Bağlantı isteğini satır içinde yanıtlar. Verilmezse düğmeler hiç
    çizilmiyor — şirket hesabında ve sosyal katman kapalıyken böyle.
    Çağıran hem isteği yanıtlıyor hem bildirimi okundu yapıp listeyi
    tazeliyor; bu bileşen kendi başına veri yazmıyor.
  */
  onBaglantiYanitla?: (bildirimId: string, karar: 'kabul' | 'red') => Promise<BaglantiYanitSonucu>;
  /*
    Bildirimin işaret ettiği isteğin şu anki durumu. Çağıran her panel
    açılışında bağlantı listesinden hesaplıyor; bileşen kendi başına
    veri okumuyor. Verilmezse bütün istekler "bekliyor" sayılıyor —
    eski davranış, dev fikstürü için.
  */
  istekDurumu?: (b: Bildirim) => IstekDurumu;
  /**
   * Olayı yapan kişinin adı ve fotoğraf yolu. Çağıran olay anahtarından
   * okuyup sunucudan getiriyor; bilinmiyorsa `null` ve satır tür simgesiyle
   * kalıyor.
   */
  kisi?: (b: Bildirim) => { ad: string; avatarYolu: string | null } | null;
}> = ({
  bildirimler,
  okunmamis,
  yukleniyor,
  renk,
  onKapat,
  onAc,
  onTumunuOkundu,
  onBaglantiYanitla,
  istekDurumu,
  kisi,
}) => {
  const kapsayici = React.useRef<HTMLDivElement>(null);
  /* Hangi bildirimin düğmeleri işlemde: çift dokunma ikinci istek atmasın. */
  const [islemdeki, setIslemdeki] = React.useState<string | null>(null);
  /*
    YANITLANAN İSTEĞİN DÜĞMELERİ KALMIYOR

    Düğmeler yanıttan sonra da duruyordu. Bildirim okundu işaretleniyor
    ama satır hâlâ "Kabul et / Reddet" gösteriyordu; ikinci kez basınca
    sunucu haklı olarak "kayıt değişmedi" diyor ve hata yutulduğu için
    ekranda hiçbir şey olmuyordu. Kullanıcıya düğme takılmış gibi
    görünüyordu (bildirildi ve canlıda ölçüldü).

    `okunduMu` bu iş için YETMİYOR: satıra dokunmak da bildirimi okundu
    yapıyor, o zaman yanıtlamadan düğmeler kaybolurdu. Bu yüzden sonuç
    ayrı tutuluyor ve bildirim kimliğine bağlı — liste tazelenip aynı
    satır yeniden çizilse de sonuç yerinde kalıyor.
  */
  const [sonuc, setSonuc] = React.useState<Record<string, BaglantiYanitSonucu>>({});

  const yanitla = async (bildirimId: string, karar: 'kabul' | 'red') => {
    if (!onBaglantiYanitla || islemdeki || sonuc[bildirimId]) return;
    setIslemdeki(bildirimId);
    try {
      /*
        Sonucu ÇAĞIRAN belirliyor: "zaten kabul edilmiş" bir hata değil,
        başarıdır ve bunu ancak sunucuya sorarak ayırt edebiliyoruz
        (bkz. App · baglantiIsteginiYanitla).
      */
      const cikti = await onBaglantiYanitla(bildirimId, karar);
      setSonuc((o) => ({ ...o, [bildirimId]: cikti }));
    } catch {
      setSonuc((o) => ({ ...o, [bildirimId]: 'gecersiz' }));
    } finally {
      setIslemdeki(null);
    }
  };

  /*
    İKİ KAYNAK, BİRİ ÖNCELİKLİ

    Yerel sonuç yanıtın HEMEN ardından doğru cevabı veriyor (liste
    tazelenene kadar). Sunucudan gelen durum ise sayfa yenilendikten
    sonra tek doğru kaynak. Yerel olan önce okunuyor; yoksa sunucunun
    durumuna düşülüyor.
  */
  const gosterilecekSonuc = (b: Bildirim): BaglantiYanitSonucu | null => {
    if (sonuc[b.id]) return sonuc[b.id];
    const durum = istekDurumu?.(b) ?? 'bekliyor';
    return durum === 'kabul' ? 'kabul' : null;
  };

  /* Düğmeler yalnız gerçekten bekleyen istekte. */
  const dugmeCizilsin = (b: Bildirim) =>
    !sonuc[b.id] && (istekDurumu?.(b) ?? 'bekliyor') === 'bekliyor';

  const SONUC_METNI: Record<BaglantiYanitSonucu, string> = {
    kabul: 'Bağlantı kuruldu. Tebrikler!',
    red: 'İstek reddedildi.',
    gecersiz: 'Bu istek artık geçerli değil.',
  };

  /* Escape ile kapanıyor ve açılınca odak panele giriyor. */
  React.useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onKapat();
    };
    document.addEventListener('keydown', tus);
    kapsayici.current?.focus();
    return () => document.removeEventListener('keydown', tus);
  }, [onKapat]);

  /*
    TELEFONDA SAYFANIN ARKASI KAYMIYOR

    Telefonda bildirimler tam ekran bir sayfa gibi açılıyor; arkadaki
    sayfa parmakla kaydırılınca birlikte kaymasın. Geniş ekranda panel
    küçük bir açılır kutu ve sayfa kaydırılabilir kalıyor.
  */
  React.useEffect(() => {
    if (!window.matchMedia('(max-width: 639px)').matches) return;
    const onceki = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = onceki;
    };
  }, []);

  /*
    INSTAGRAM'DAN ESİNLENEN LİSTE (17 Eylül 2026)

    - Bekleyen BAĞLANTI İSTEKLERİ en üstte kendi bölümünde; yanıtlanınca
      satır panel kapanana kadar yerinde kalıyor ve sonuç cümlesini
      gösteriyor (aşağı zıplamıyor).
    - Kalanlar zaman gruplarında: Bugün / Dün / Son 7 gün / Son 30 gün /
      Daha önce (`lib/bildirim-grubu.mjs`).
    - Satır: solda yuvarlak tür simgesi, ortada kalın başlık + metin tek
      paragrafta ve yanında gri zaman, sağda okunmamış için nokta.
      Nokta tek başına bilgi taşımıyor: yanında ekran okuyucuya "Yeni".
    - TELEFONDA TAM EKRAN: geri okuyla açılan ayrı bir sayfa gibi; satırlar
      ve yazı daha büyük. GENİŞ EKRANDA sağ üstte küçük açılır panel.

    Kişi fotoğrafı ya da paylaşım küçük resmi ÇİZİLMİYOR: bildirim satırı
    bu bilgiyi taşımıyor ve uydurulmuyor; yerini türün simgesi tutuyor.
  */
  const istekSatiriMi = (b: Bildirim) =>
    b.tur === 'baglanti_istegi' && Boolean(onBaglantiYanitla) && (dugmeCizilsin(b) || Boolean(sonuc[b.id]));
  const istekler = bildirimler.filter(istekSatiriMi);
  const gruplar = bildirimleriGrupla(bildirimler.filter((b) => !istekSatiriMi(b)));

  const satirCiz = (b: Bildirim) => (
    <li key={b.id} className="flex flex-wrap items-center gap-x-2 pr-4 transition-colors hover:bg-gray-50 sm:flex-nowrap">
      <button
        type="button"
        onClick={() => onAc(b)}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3.5 py-3 pl-4 text-left sm:gap-3 sm:py-2.5 sm:pl-5"
      >
        <BildirimIkonu tur={b.tur} renk={renk} kisi={kisi?.(b) ?? null} />
        <span className="min-w-0 flex-1">
          {/*
            Karar bekleyen istekte metin kırpılmıyor: düğmeler satırın
            sağında yer kaplıyor ve kırpılan bir istek kimin bağlantı
            istediğini gizliyordu (ölçüldü, 420 px).
          */}
          <span
            className={`break-words text-[15px] leading-snug text-gray-900 sm:text-sm ${
              b.tur === 'baglanti_istegi' && onBaglantiYanitla && dugmeCizilsin(b) ? '' : 'line-clamp-3'
            }`}
          >
            <span className="font-bold">{b.baslik}</span>
            {b.govde && <span className="text-gray-700"> {b.govde}</span>}
            <span className="whitespace-nowrap text-gray-500"> · {gecenSure(b.tarih)}</span>
          </span>
          {b.tur === 'baglanti_istegi' && onBaglantiYanitla && gosterilecekSonuc(b) && (
            <span
              role="status"
              className={`mt-0.5 block text-xs font-semibold ${
                gosterilecekSonuc(b) === 'gecersiz'
                  ? 'text-amber-800'
                  : gosterilecekSonuc(b) === 'kabul'
                    ? 'text-emerald-700'
                    : 'text-gray-600'
              }`}
            >
              {SONUC_METNI[gosterilecekSonuc(b)!]}
            </span>
          )}
        </span>
        {/* OKUNMAMIŞ YALNIZCA RENKLE ANLATILMIYOR: nokta görsel, "Yeni" ekran okuyucu için. */}
        {!b.okunduMu && !(b.tur === 'baglanti_istegi' && onBaglantiYanitla && dugmeCizilsin(b)) && (
          <span className="flex shrink-0 items-center">
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: renk }} />
            <span className="sr-only">Yeni</span>
          </span>
        )}
      </button>

      {/*
        KARAR SATIRIN SAĞINDA, AMA BAĞLANTININ DIŞINDA

        Düğmeler yukarıdaki `<button>`ın İÇİNDE olamaz — iç içe iki düğme
        geçersiz ve tıklama hedefleri karışır. Kardeş olarak duruyorlar;
        satıra basmak yine bildirimi açıyor.
      */}
      {b.tur === 'baglanti_istegi' && onBaglantiYanitla && dugmeCizilsin(b) && (
        /*
          Telefonda düğmeler metnin ALTINDA, metinle aynı hizada (56 px simge
          + 14 px boşluk + 16 px kenar): yan yana durunca istek cümlesi dört
          satıra bölünüyordu (375 px'te ölçüldü). Geniş ekranda sağda.
        */
        <div className="flex w-full shrink-0 gap-2 pb-3 pl-[86px] sm:w-auto sm:gap-1.5 sm:pb-0 sm:pl-0">
          <button
            type="button"
            disabled={islemdeki === b.id}
            onClick={() => void yanitla(b.id, 'kabul')}
            className="min-h-9 flex-1 rounded-lg px-3 text-sm font-bold text-white disabled:opacity-60 sm:flex-none sm:text-xs"
            style={{ background: renk }}
          >
            {islemdeki === b.id ? 'İşleniyor…' : 'Kabul et'}
          </button>
          <button
            type="button"
            disabled={islemdeki === b.id}
            onClick={() => void yanitla(b.id, 'red')}
            className="min-h-9 flex-1 rounded-lg bg-gray-100 px-3 text-sm font-bold text-gray-900 hover:bg-gray-200 disabled:opacity-60 sm:flex-none sm:text-xs"
          >
            Reddet
          </button>
        </div>
      )}
    </li>
  );

  const bolumBasligi = 'px-4 pb-1 pt-4 text-lg font-bold text-gray-900 sm:px-5 sm:pt-3 sm:text-base';

  const govde = (
    <div
      ref={kapsayici}
      tabIndex={-1}
      role="dialog"
      aria-label="Bildirimler"
      className="flex h-full w-full flex-col overflow-hidden bg-white outline-none sm:h-auto sm:max-h-[75vh] sm:w-[420px] sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-2xl"
    >
      {/*
        BAŞLIK: telefonda solda yuvarlak geri düğmesi (Instagram gibi),
        geniş ekranda sağda kapatma çarpısı. İkisi de aynı `onKapat`.
      */}
      <div
        className="flex items-center gap-3 px-4 pb-2 pt-3 sm:justify-between sm:px-5 sm:pt-4"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
      >
        <button
          type="button"
          onClick={onKapat}
          aria-label="Bildirimleri kapat"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-900 shadow-sm hover:bg-gray-50 sm:hidden"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-2xl font-extrabold tracking-tight text-gray-900 sm:text-xl">
          Bildirimler
        </h2>
        <div className="flex items-center gap-1">
          {(okunmamis ?? 0) > 0 && (
            <button
              type="button"
              onClick={onTumunuOkundu}
              className="min-h-9 rounded-lg px-2 text-sm font-bold"
              style={{ color: renk }}
            >
              Tümü okundu
            </button>
          )}
          <button
            type="button"
            onClick={onKapat}
            aria-label="Bildirimleri kapat"
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 sm:flex"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto overscroll-contain pb-2"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {yukleniyor ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">Yükleniyor…</p>
        ) : bildirimler.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-16 text-center sm:py-12">
            <span
              aria-hidden="true"
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gray-900 text-gray-900"
            >
              <Bell className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-sm text-gray-500">Henüz bildirimin yok.</p>
          </div>
        ) : (
          <>
            {istekler.length > 0 && (
              <section aria-label="Bağlantı istekleri">
                <h3 className={bolumBasligi}>Bağlantı istekleri</h3>
                <ul>{istekler.map(satirCiz)}</ul>
              </section>
            )}
            {gruplar.map((grup, sira) => (
              <section
                key={grup.baslik}
                aria-label={grup.baslik}
                className={sira > 0 || istekler.length > 0 ? 'border-t border-gray-100' : undefined}
              >
                <h3 className={bolumBasligi}>{grup.baslik}</h3>
                <ul>{grup.ogeler.map(satirCiz)}</ul>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );

  return createPortal(
    <>
      {/* Panel dışına dokunmak kapatıyor (geniş ekranda; telefonda sayfa tam ekran). */}
      <div
        className="fixed inset-0 z-[190] bg-black/25 sm:bg-transparent"
        onClick={onKapat}
        aria-hidden="true"
      />
      {/*
        TELEFONDA TAM EKRAN (`inset-0`), geniş ekranda sağ üstte açılır
        panel. Alttan açılan yarım sayfa kalktı: kullanıcı Instagram'daki
        gibi ayrı bir sayfa istedi (17 Eylül 2026).
      */}
      <div className="fixed inset-0 z-[200] flex sm:inset-auto sm:right-4 sm:top-16 sm:justify-end">
        {govde}
      </div>
    </>,
    document.body,
  );
};

/** Header'daki zil düğmesi. Rozet yalnız sayı bilindiğinde çiziliyor. */
export const BildirimDugmesi: React.FC<{
  okunmamis: number | null;
  renk: string;
  onAc: () => void;
  className?: string;
  style?: React.CSSProperties;
}> = ({ okunmamis, renk, onAc, className, style }) => (
  <button
    type="button"
    onClick={onAc}
    aria-label={
      okunmamis && okunmamis > 0 ? `Bildirimler, ${okunmamis} okunmamış` : 'Bildirimler'
    }
    /*
      `relative` VE DOKUNMA HEDEFİ HER ZAMAN BURADAN

      Çağıran yalnızca renk/kenar gibi şeyleri değiştirebiliyor. Konum
      bağlamı (`relative`) ve 44×44 hedef dışarıdan gelen sınıfla
      düşürülemiyor: `relative` olmayan bir düğmede rozet en yakın
      konumlandırılmış ataya kaçar, küçük hedefte de zil telefonda
      ıskalanır.
    */
    className={`relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors ${
      className ?? 'text-gray-700 hover:bg-gray-100'
    }`}
    style={style}
  >
    {/*
      ZİL 24 PİKSEL — akıştaki (`/agim`) zille aynı.

      Burada 20 pikseldi ve aynı simge sitenin iki yerinde iki farklı
      ölçüde duruyordu. Dokunma hedefi DEĞİŞMEDİ: düğme 44 piksel
      kalıyor, büyüyen yalnız görünen simge.
    */}
    <Bell className="h-6 w-6" />
    <BildirimRozeti sayi={okunmamis} renk={renk} />
  </button>
);
