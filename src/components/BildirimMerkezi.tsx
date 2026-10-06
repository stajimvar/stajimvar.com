import React from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Eye,
  FileText,
  Heart,
  Loader2,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { gecenSure, type Bildirim } from '../lib/bildirim';
import type { AdayGorseli, SirketGorseli } from '../lib/bildirim-basvurusu.mjs';
import { basvuruBildirimiMi } from '../lib/bildirim-turu.mjs';
import { bildirimleriGrupla } from '../lib/bildirim-grubu.mjs';
import { SOSYAL_PAYLASIM_KOVASI } from '../lib/queries/sosyal';
import { ProfilFotografi } from './sosyal/ProfilFotografi';
import { useGorselAdresleri } from './sosyal/useGorselAdresleri';
import { ODAK_HALKASI } from '../lib/renk-token';

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

/** Başvuru bildiriminin görseli; kararı `lib/bildirim-basvurusu.mjs` veriyor. */
export type BasvuruGorseli = SirketGorseli | AdayGorseli;

/** Bildirim türünden ikon. Tanınmayan türde nötr bir belge ikonu. */
function turSimgesi(tur: string) {
  return tur === 'gorusme_daveti' || tur === 'gorusme_guncellendi' ? CalendarClock
    : tur === 'teklif' || tur === 'teklif_kabul' ? CheckCircle2
    : tur === 'yeni_basvuru' ? Briefcase
    /* Takip de kişiye dair bir olay: belge simgesine düşüyordu, oysa ortada belge yok. */
    : tur === 'baglanti_istegi' || tur === 'baglanti_kabul' || tur === 'takip' ? UserPlus
    : tur === 'paylasim_begeni' ? Heart
    /* Şirket başvuruyu açtı: belge değil, bir bakış. Rozette logonun köşesinde. */
    : tur === 'basvuru_goruntulendi' ? Eye
    : FileText;
}

function BildirimIkonu({
  tur,
  renk,
  kisi = null,
  basvuru = null,
}: {
  tur: string;
  renk: string;
  kisi?: { ad: string; avatarYolu: string | null } | null;
  basvuru?: BasvuruGorseli | null;
}) {
  /*
    Yuvarlak simge (telefonda 56, geniş ekranda 44 px): Instagram'da kişinin fotoğrafının durduğu yer.
    Bildirim satırı kişi bilgisi taşımadığı için türün simgesi çiziliyor;
    renk tek vurgu rengi, zemin onun açık tonu.
  */
  const Simge = turSimgesi(tur);
  const simge = <Simge className="h-5 w-5 shrink-0" style={{ color: renk }} strokeWidth={1.9} />;

  /*
    BAŞVURU GÖRSELİ: ŞİRKET LOGOSU YA DA ADAY FOTOĞRAFI

    Başvuru satırları belge ve çanta simgesiyle birbirinin aynısıydı;
    öğrenci hangi şirketin, işveren hangi adayın satırı olduğunu ancak
    metni okuyarak ayırıyordu (kullanıcının canlı ekran görüntüleri).
    Beğeni satırlarındaki desen burada da: görsel + sağ altta tür rozeti.

    Hangi görselin gösterileceğine burada KARAR VERİLMİYOR — aday
    fotoğrafının rıza, başvuru yolu ve adres kuralı `basvuruGorseli`
    içinde. Bu bileşen yalnız gelen adresi çiziyor.

    Görsel inmezse (`onError`) kırık resim yerine tür simgesine dönülüyor:
    adres kuralı geçmiş ama dosya silinmiş ya da şirketin sunucusu
    kapalı olabilir. Bozulan adres saklanıyor ki aynı adres yeniden
    denenip simge ile görsel arasında gidip gelinmesin; adres değişirse
    yeni adres denenir.
  */
  const gorselAdresi = basvuru?.tip === 'sirket' ? basvuru.logo : basvuru?.tip === 'aday' ? basvuru.foto : null;
  const [bozukAdres, setBozukAdres] = React.useState<string | null>(null);
  const gorsel = gorselAdresi && gorselAdresi !== bozukAdres ? gorselAdresi : null;

  /*
    `alt` BOŞ (logo da fotoğraf da): şirket ve aday adı satırın metninde
    zaten yazıyor; görsele ad vermek ekran okuyucuda adı iki kez okuturdu.
  */
  if (basvuru?.tip === 'sirket' && gorsel) {
    return (
      <span data-bildirim-logo="" className="relative flex h-14 shrink-0 sm:h-11">
        {/*
          LOGO KABI YUVARLAK DEĞİL, ORANI LOGODAN

          Logo önce dairenin içindeydi. Dairenin içine sığan kare telefonda
          34, geniş ekranda 26 px'ti; 3000×751'lik yatay bir logo (4:1)
          orada 26 × 6,5 px'e iniyordu (26 / 4) ve fikstürün ekran
          görüntüsünde okunmuyordu.

          Şimdi kap yuvarlatılmış dikdörtgen: yükseklik simgeyle aynı
          (56 / 44), genişlik GÖRSELİN KENDİ ORANINDAN — `h-full w-auto`,
          tarayıcı genişliği doğal orandan hesaplıyor; ölçüm durumu ya da
          `onLoad` yok. Kare ve dikey logolar `min-w` ile simgenin
          genişliğinde kalıyor, metin sütunu öteki satırlarla aynı hizada.
          Yatay logolar en fazla 88 px'e kadar genişliyor; ötesinde
          `object-contain` oranı koruyup küçültüyor. 4:1 logo böylece
          telefonda 68 × 17, geniş ekranda 72 × 18 px çiziliyor (fikstürde
          ölçüldü). Bedeli yalnız yatay logolu satırda: metin sütunu
          telefonda 32, geniş ekranda 44 px sağa kayıyor (ölçüldü).

          Rozet kabın köşesine OTURUYOR, merkezi tam köşede: içeride kalan
          çeyreği iç boşlukla logodan ayrılıyor. Telefonda rozet yarıçapı 12,
          logonun köşesi kap köşesinden 10·√2 ≈ 14,1 px içeride; geniş
          ekranda 10 ile 8·√2 ≈ 11,3. Telefonda iç boşluk önce 8 px'ti ve
          kare logo ile rozet arasında 0,4 px kalıyordu (ölçüldü); alt piksel
          yuvarlamasına pay bırakmak için 9 px.
        */}
        <span className="flex h-full min-w-14 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white sm:min-w-11">
          <img
            src={gorsel}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setBozukAdres(gorsel)}
            className="block h-full w-auto max-w-[86px] object-contain p-[9px] sm:p-[7px]"
          />
        </span>
        <span
          aria-hidden="true"
          className="absolute -bottom-3 -right-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white sm:-bottom-2.5 sm:-right-2.5 sm:h-5 sm:w-5"
          style={{ background: renk }}
        >
          <Simge className="h-3 w-3 text-white sm:h-2.5 sm:w-2.5" strokeWidth={2.5} />
        </span>
      </span>
    );
  }

  /* Aday fotoğrafı yuvarlak kalıyor: kişi fotoğrafıyla (beğeni, bağlantı) aynı desen. */
  if (basvuru?.tip === 'aday' && gorsel) {
    return (
      <span data-bildirim-aday="" className="relative h-14 w-14 shrink-0 sm:h-11 sm:w-11">
        <span className="block h-full w-full overflow-hidden rounded-full border border-gray-200 bg-white">
          <img
            src={gorsel}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setBozukAdres(gorsel)}
            className="h-full w-full object-cover"
          />
        </span>
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white sm:h-5 sm:w-5"
          style={{ background: renk }}
        >
          <Simge className="h-3 w-3 text-white sm:h-2.5 sm:w-2.5" strokeWidth={2.5} />
        </span>
      </span>
    );
  }
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
 * SUNUCU METNİNDEKİ ADLARI VURGULAR — METNİ YENİDEN YAZMAZ
 *
 * Canlıda öğrenci satırı "Ogulsize · Stajyer başvurunu incelemeye aldı."
 * diye okunuyordu: ilan adı ("Stajyer") cümlenin geri kalanına yapışıyor
 * ve "stajyer başvurun" gibi okunuyordu (kullanıcının ekran görüntüsü).
 * Cümle sunucunun; burada yalnız şirket ve ilan adının geçtiği yer koyu
 * yapılıyor, sözcük eklenmiyor ya da çıkarılmıyor.
 *
 * Adlar sırayla aranıyor (önce şirket, ardından ondan SONRA ilan): kısa
 * bir ilan adı şirket adının içinde yakalanmasın. Ad metinde yoksa
 * (bildirimden sonra ilan yeniden adlandırılmış olabilir) o ad
 * vurgulanmıyor ve metne eklenmiyor — sunucu metni olduğu gibi kalıyor.
 */
function adlariVurgula(metin: string, adlar: Array<string | null>): React.ReactNode[] {
  const parcalar: React.ReactNode[] = [];
  let imlec = 0;
  for (const ad of adlar) {
    if (!ad) continue;
    const yer = metin.indexOf(ad, imlec);
    if (yer < 0) continue;
    if (yer > imlec) parcalar.push(<React.Fragment key={`d${imlec}`}>{metin.slice(imlec, yer)}</React.Fragment>);
    parcalar.push(
      <span key={`v${yer}`} className="font-semibold text-gray-900">
        {ad}
      </span>,
    );
    imlec = yer + ad.length;
  }
  if (imlec < metin.length) parcalar.push(<React.Fragment key={`d${imlec}`}>{metin.slice(imlec)}</React.Fragment>);
  return parcalar;
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
  /**
   * Beğenilen paylaşımın özeti ve kapak yolu. Çağıran olay anahtarından
   * okuyup sunucudan getiriyor (`lib/bildirim-icerigi.mjs`); bilinmiyorsa
   * `null` ve satır önizlemesiz kalıyor.
   *
   * NEDEN VAR: "… paylaşımını beğendi" satırları birbirinin aynısıydı;
   * altı satır yan yana duruyordu ve hangi paylaşımın beğenildiği hiçbir
   * yerde yazmıyordu (kullanıcı bildirdi, 27 Eylül 2026).
   */
  icerik?: (b: Bildirim) => { ozet: string | null; kapakYolu: string | null } | null;
  /**
   * Başvuru bildiriminin görseli: öğrencide şirket logosu, işverenin
   * "Yeni başvuru" satırında aday fotoğrafı. Çağıran başvuru satırını
   * okuyup `basvuruGorseli` kuralından geçiriyor; uygun değilse `null`
   * ve satır bugünkü haliyle (tür simgesi, sunucu metni) kalıyor.
   */
  basvuru?: (b: Bildirim) => BasvuruGorseli | null;
  /**
   * Tek bildirimi sunucudan siler. Söz ancak sunucu onaylayınca çözülüyor
   * ve satırı listeden çıkarmak ÇAĞIRANIN işi (`useBildirimler.sil`);
   * başarısızlıkta söz reddediliyor ve satır yerinde kalıyor.
   *
   * Verilmezse Sil düğmesi hiç çizilmiyor: basınca hiçbir şey yapmayan
   * bir düğme olurdu.
   */
  onSil?: (b: Bildirim) => Promise<void>;
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
  icerik,
  basvuru,
  onSil,
}) => {
  const kapsayici = React.useRef<HTMLDivElement>(null);
  const baslikRef = React.useRef<HTMLHeadingElement>(null);
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
    SİLME DURUMU SATIR BAŞINA

    `siliniyor` çizim için, `silmeKilidi` aynı olay döngüsündeki ikinci
    dokunuş için: durum güncellemesi bir sonraki çizime kadar görünmüyor,
    ref hemen görünüyor. Farklı satırlar aynı anda silinebiliyor; biri
    ötekini beklemiyor.

    Hata satıra bağlı ve satır yerinde kalıyor: silinemeyen bildirim
    kaybolmuş gibi görünürse kullanıcı silindiğini sanır, sayfa
    yenilenince geri gelir.
  */
  const [siliniyor, setSiliniyor] = React.useState<ReadonlySet<string>>(() => new Set());
  const [silmeHatasi, setSilmeHatasi] = React.useState<ReadonlySet<string>>(() => new Set());
  const silmeKilidi = React.useRef(new Set<string>());
  /*
    Satır silinince odaklı düğme DOM'dan çıkıyor ve odak belgenin başına
    düşüyordu: klavyeyle silen kişi listede yerini kaybederdi. Silmeden
    önce satırın ekrandaki komşuları kaydediliyor; liste yeniden çizilince
    sonraki satırın Sil düğmesine, yoksa öncekine, liste boşaldıysa
    panelin başlığına gidiliyor.
  */
  const [odakIstegi, setOdakIstegi] = React.useState<{
    sonrakiler: string[];
    oncekiler: string[];
  } | null>(null);
  /* Ekran okuyucuya "silindi" — satır sessizce kaybolmasın. Bölge baştan var, sonradan eklenen bölge okunmayabiliyor. */
  const [duyuru, setDuyuru] = React.useState('');

  const kumeyeEkle = (k: ReadonlySet<string>, id: string) => new Set(k).add(id);
  const kumedenCikar = (k: ReadonlySet<string>, id: string) => {
    const yeni = new Set(k);
    yeni.delete(id);
    return yeni;
  };

  const silDugmesi = (id: string) =>
    kapsayici.current?.querySelector<HTMLButtonElement>(`[data-bildirim-sil="${CSS.escape(id)}"]`) ?? null;

  const sil = async (b: Bildirim, dugme: HTMLButtonElement) => {
    if (!onSil || silmeKilidi.current.has(b.id)) return;
    silmeKilidi.current.add(b.id);
    /*
      Odak yalnız Sil düğmesindeyse taşınıyor: silme sürerken kullanıcı
      başka bir yere geçtiyse yanıt döndüğünde odağı oradan çekmek,
      klavye kullanıcısının elinden imleci almak olurdu.
    */
    const odakBuradaydi = document.activeElement === dugme;
    const sira = ekranSirasi.map((x) => x.id);
    const yer = sira.indexOf(b.id);
    setSilmeHatasi((k) => kumedenCikar(k, b.id));
    setSiliniyor((k) => kumeyeEkle(k, b.id));
    setDuyuru('');
    try {
      await onSil(b);
      setDuyuru('Bildirim silindi.');
      if (odakBuradaydi || document.activeElement === document.body) {
        setOdakIstegi({ sonrakiler: sira.slice(yer + 1), oncekiler: sira.slice(0, Math.max(0, yer)).reverse() });
      }
    } catch {
      setSilmeHatasi((k) => kumeyeEkle(k, b.id));
      /* Düğme `disabled` iken odak düşüyor; yeniden denemek için geri konuyor. */
      if (odakBuradaydi) setOdakIstegi({ sonrakiler: [b.id], oncekiler: [] });
    } finally {
      silmeKilidi.current.delete(b.id);
      setSiliniyor((k) => kumedenCikar(k, b.id));
    }
  };

  React.useEffect(() => {
    if (!odakIstegi) return;
    /* Çağıran satırı listeden çıkarana kadar bekle: silinen düğmeye odaklanılmasın. */
    const mevcut = new Set(bildirimler.map((x) => x.id));
    const hedef =
      odakIstegi.sonrakiler.find((id) => mevcut.has(id) && silDugmesi(id)) ??
      odakIstegi.oncekiler.find((id) => mevcut.has(id) && silDugmesi(id));
    if (hedef) silDugmesi(hedef)?.focus();
    else baslikRef.current?.focus();
    setOdakIstegi(null);
  }, [odakIstegi, bildirimler]);

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

  /*
    Escape ile kapanıyor ve açılınca odak panele giriyor — YALNIZ AÇILIŞTA.

    Etki önceden `[onKapat]`'a bağlıydı: çağıran her çizimde yeni bir
    `onKapat` verince (dev fikstürü böyle) panel her yeniden çizimde odağı
    kendine çekiyordu. Silmeden sonra sonraki satırın Sil düğmesine konan
    odak bir an sonra panele geri sıçrıyordu (fikstürde ölçüldü). Güncel
    `onKapat` ref'ten okunuyor.
  */
  const onKapatRef = React.useRef(onKapat);
  onKapatRef.current = onKapat;
  React.useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onKapatRef.current();
    };
    document.addEventListener('keydown', tus);
    kapsayici.current?.focus();
    return () => document.removeEventListener('keydown', tus);
  }, []);

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
  /* Satırların ekranda göründüğü sıra: silmeden sonra odağın gideceği komşu buradan. */
  const ekranSirasi: Bildirim[] = [...istekler, ...gruplar.flatMap((g) => g.ogeler as Bildirim[])];

  /*
    BEĞENİLEN PAYLAŞIMIN KÜÇÜK RESMİ

    Satırda yalnız "… paylaşımını beğendi" yazıyordu; aynı kişinin altı
    beğenisi altı özdeş satır oluyordu ve hangisinin hangi paylaşım
    olduğu anlaşılmıyordu.

    SUNUM: SATIRIN SAĞINDA KÜÇÜK KARE (kullanıcı isteği, 28 Eylül 2026)
    ------------------------------------------------------------------
    Önce metnin altında çerçeveli bir kutu vardı: içinde küçük resim ve
    yanında açıklama. Kutu satırı iki kata çıkarıyordu ve açıklaması
    olmayan paylaşımlarda "Görsel paylaşımı" diye bir ETİKET yazıyordu —
    hiçbir şey söylemeyen, uydurulmuş bir cümle. Üretimde ölçüldü:
    beğenilen 21 paylaşımın 4'ünde açıklama yok, yani o etiket gerçekten
    görünüyordu.

    Şimdi tek şey var ve o da gerçek: paylaşımın kapağı, satırın en
    sağında kare bir küçük resim. Çerçeve, zemin ve etiket kalktı.

    GÖRSEL GERÇEKTEN İNMİYORDU (ölçülen hata)
    -----------------------------------------
    `useGorselAdresleri` `{ durum, adresler }` döndürüyor ve `adresler`
    bir `Map`. Buradaki kod ikisini de atlıyordu: nesneyi çözmeden
    kullanıyor, sonra `Map`'e köşeli parantezle erişiyordu. Sonuç her
    zaman `undefined`, yani `<img>` HİÇ çizilmiyordu ve ekranda kalıcı
    olarak boş bir gri kare duruyordu (kullanıcının ekran görüntüsünde
    görünen şey). `AkisKarti` aynı kancayı baştan beri doğru çözüyordu.

    ÜÇ DURUM AYRI
    -------------
    İniyorken nabız atan bir kare (yer tutucu, veri değil); indiyse
    görselin kendisi; inmediyse HİÇBİR ŞEY — kalıcı boş bir kare, var
    olmayan ya da bozuk bir paylaşım izlenimi verirdi ve elimizde öyle
    bir bilgi yok.

    Görsel kullanıcının kendi oturumundan iniyor: paylaşılabilir imzalı
    adres üretilmiyor (bkz. `useGorselAdresleri` içindeki ölçüm).
  */
  const IcerikOnizleme: React.FC<{
    ozet: string | null;
    kapakYolu: string | null;
  }> = ({ ozet, kapakYolu }) => {
    const yollar = React.useMemo(() => (kapakYolu ? [kapakYolu] : []), [kapakYolu]);
    const { durum, adresler } = useGorselAdresleri(SOSYAL_PAYLASIM_KOVASI, yollar);
    if (!kapakYolu) return null;

    const adres = adresler.get(kapakYolu) ?? null;
    if (!adres) {
      return durum === 'yukleniyor' ? (
        <span aria-hidden="true" className="h-11 w-11 shrink-0 animate-pulse rounded-lg bg-gray-100" />
      ) : null;
    }

    return (
      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {/*
          `alt` AÇIKLAMA VARSA AÇIKLAMA, YOKSA BOŞ

          Satırın metni zaten "… paylaşımını beğendi" diyor; küçük resim
          o cümlede HANGİ paylaşım olduğunu gösteriyor. Açıklama varsa
          ekran okuyucu da aynı ayrımı duyuyor. Yoksa `alt` boş kalıyor —
          "Görsel paylaşımı" gibi bir doldurma metni, içerik hakkında
          yanlış bir şey söylemek olurdu.
        */}
        <img src={adres} alt={ozet?.trim() || ''} className="h-full w-full object-cover" />
      </span>
    );
  };

  const satirCiz = (b: Bildirim) => {
    const silinmekte = siliniyor.has(b.id);
    const silinemedi = silmeHatasi.has(b.id);
    const bv = basvuru?.(b) ?? null;
    /*
      İŞVERENİN "YENİ BAŞVURU" SATIRI İKİ PARÇA: ad başlığın yanında,
      ilan kendi satırında. Sunucu metni "Ad · İlan" tek parça ve uzun
      ilan adı adın arkasına yapışıp üç satırlık kırpmada kayboluyordu.
      Yalnız iki parça da GERÇEK veriden geldiğinde kuruluyor (başvuru
      anının kopyasındaki ad — sunucu metni de adı oradan alıyor — ve
      ilanın başlığı); biri yoksa sunucu metni aynen kalıyor.
    */
    const adayParcalari = bv?.tip === 'aday' && bv.adayAdi && bv.ilanAdi ? bv : null;
    const bekleyenIstek = b.tur === 'baglanti_istegi' && Boolean(onBaglantiYanitla) && dugmeCizilsin(b);
    return (
      <li key={b.id} className="group transition-colors hover:bg-gray-50">
        {/*
          SATIR VE İLETİSİ AYRI KATLAR: "Siliniyor…" ve hata cümlesi satırın
          altında, metin sütunuyla aynı hizada duruyor. Satırın kendi flex
          düzenine girselerdi geniş ekranda (`sm:flex-nowrap`) metnin yanına
          sıkışırlardı.

          Sil düğmesi 44 px'lik kendi kutusunu getiriyor ve simgenin iki
          yanında 13 px boşluk zaten var: satır arası boşluk ve sağ kenar o
          yüzden daralıyor. Daraltılmadan Sil sütunu metinden 44 px
          alıyordu, daraltınca 36 px (420 px panel, metin 311 → 267 → 275 px;
          simge kenardan 19 px içeride, ölçüldü).
        */}
        <div
          className={`flex flex-wrap items-center ${onSil ? 'gap-x-0.5 pr-1 sm:pr-1.5' : 'gap-x-2 pr-4 sm:flex-nowrap'}`}
        >
          <button
            type="button"
            onClick={() => onAc(b)}
            className={`flex min-h-11 min-w-0 flex-1 items-center gap-3.5 py-3 pl-4 text-left transition-opacity sm:gap-3 sm:py-2.5 sm:pl-5 ${
              silinmekte ? 'opacity-60' : ''
            }`}
          >
            <BildirimIkonu tur={b.tur} renk={renk} kisi={kisi?.(b) ?? null} basvuru={bv} />
            <span className="min-w-0 flex-1">
              {/*
                Karar bekleyen istekte metin kırpılmıyor: düğmeler satırın
                sağında yer kaplıyor ve kırpılan bir istek kimin bağlantı
                istediğini gizliyordu (ölçüldü, 420 px).

                Başvuru bildiriminde de kırpılmıyor — görseli olsun olmasın
                (`lib/bildirim-turu.mjs`): üç satırlık kırpma uzun ilan adını
                ortasından kesiyordu ve kesilen kısım hangi ilan olduğunu
                söyleyen kısımdı. Metnin uzunluğu şirket ya da aday adı ve
                ilan başlığıyla sınırlı. Sosyal bildirimler eskisi gibi
                üç satırda kırpılıyor.
              */}
              <span
                className={`break-words text-[15px] leading-snug text-gray-900 sm:text-sm ${
                  bekleyenIstek || basvuruBildirimiMi(b) ? '' : 'line-clamp-3'
                }`}
              >
                <span className="font-bold">{b.baslik}</span>
                {adayParcalari ? (
                  <>
                    {' '}
                    <span className="font-semibold text-gray-900">{adayParcalari.adayAdi}</span>{' '}
                    <span className="block text-gray-700">
                      {adayParcalari.ilanAdi}
                      <span className="whitespace-nowrap text-gray-500"> · {gecenSure(b.tarih)}</span>
                    </span>
                  </>
                ) : (
                  <>
                    {b.govde && (
                      <span className="text-gray-700">
                        {' '}
                        {bv?.tip === 'sirket'
                          ? adlariVurgula(b.govde, [bv.sirketAdi, bv.ilanAdi])
                          : bv?.tip === 'aday'
                            ? adlariVurgula(b.govde, [bv.adayAdi, bv.ilanAdi])
                            : b.govde}
                      </span>
                    )}
                    <span className="whitespace-nowrap text-gray-500"> · {gecenSure(b.tarih)}</span>
                  </>
                )}
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

            {/*
              KÜÇÜK RESİM SATIRIN EN SAĞINDA

              Metnin altında değil: orada çerçeveli bir kutu olarak duruyordu
              ve satırı iki kata çıkarıyordu. Sağda kare bir küçük resim,
              okunmamış noktasından sonra — yani satırın en dış ucunda.

              Yalnız kapağı olan bildirimlerde çiziliyor; bağlantı isteği ve
              başvuru bildirimlerinde `icerik` zaten null dönüyor.
            */}
            {(() => {
              const ic = icerik?.(b) ?? null;
              return ic ? <IcerikOnizleme ozet={ic.ozet} kapakYolu={ic.kapakYolu} /> : null;
            })()}
          </button>

          {/*
            SİL — SATIRIN KARDEŞİ, İÇİNDE DEĞİL

            Satırın kendisi bir `<button>`: Sil onun içinde olsaydı iç içe
            düğme geçersiz olur ve basmak bildirimi de açardı. Kardeş olarak
            duruyor; satır tıklaması tetiklenmiyor.

            HER ZAMAN GÖRÜNÜR: panel telefonda kullanılıyor ve orada hover yok.
            Simge her durumda gri-500 (beyazda 4.84:1, ölçüldü; simge için gereken 3:1'in
            üstünde); satırın üstüne gelince koyulaşıyor. Dokunma hedefi simge
            değil kutu: 44×44.

            Ad ekran okuyucuya bildirimin başlığıyla gidiyor: listede on tane
            "Sil" duyurmak hangisinin silineceğini söylemezdi.
          */}
          {onSil && (
            <button
              type="button"
              data-bildirim-sil={b.id}
              onClick={(e) => void sil(b, e.currentTarget)}
              disabled={silinmekte}
              aria-busy={silinmekte}
              aria-label={`"${b.baslik}" bildirimini sil`}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 group-hover:text-gray-700 disabled:cursor-wait ${ODAK_HALKASI}`}
            >
              {silinmekte ? (
                <Loader2 aria-hidden="true" className="h-[18px] w-[18px] animate-spin" />
              ) : (
                <Trash2 aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.9} />
              )}
            </button>
          )}

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
              satıra bölünüyordu (375 px'te ölçüldü). Geniş ekranda sağda —
              Sil düğmesi yoksa.

              SİL VARKEN KARARLAR GENİŞ EKRANDA DA İKİNCİ KATTA. Kararlar ve Sil aynı katta dururken istek cümlesine 420 px
              panelde 110 px kalıyordu ve cümle yedi satıra bölünüyordu
              (ölçüldü; Sil'den önce 146 px, beş satır). Sil ilk katta
              metnin yanında, kararlar altta metinle aynı hizada; sekme
              sırası görünen sırayla aynı: satır, Sil, Kabul, Reddet.
            */
            <div
              className={`flex w-full shrink-0 gap-2 pb-3 pl-[86px] ${
                onSil ? 'pr-3 sm:gap-1.5 sm:pl-[76px] sm:pr-3.5' : 'sm:w-auto sm:gap-1.5 sm:pb-0 sm:pl-0'
              }`}
            >
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
        </div>

        {/*
          İLETİ METİN SÜTUNUNDA: telefonda 16 + 56 + 14 = 86 px, geniş ekranda
          20 + 44 + 12 = 76 px içeriden — simgenin altına değil cümlenin altına.
          Hata `role="alert"`: silme kullanıcının açık isteğiydi ve olmadığı
          hemen duyulmalı. Satır yerinde; Sil'e yeniden basmak yeniden dener.
        */}
        {silinmekte && (
          <p role="status" className="pb-2.5 pl-[86px] pr-4 text-xs font-semibold text-gray-600 sm:pl-[76px]">
            Siliniyor…
          </p>
        )}
        {!silinmekte && silinemedi && (
          <p role="alert" className="pb-2.5 pl-[86px] pr-4 text-xs font-semibold text-red-700 sm:pl-[76px]">
            Bildirim silinemedi. Bağlantını kontrol edip yeniden dene.
          </p>
        )}
      </li>
    );
  };

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
        {/* `tabIndex={-1}`: son bildirim silinince odak buraya iniyor, belgenin başına düşmüyor. */}
        <h2
          ref={baslikRef}
          tabIndex={-1}
          className="min-w-0 flex-1 truncate text-2xl font-extrabold tracking-tight text-gray-900 sm:text-xl"
        >
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
        <p role="status" className="sr-only">
          {duyuru}
        </p>
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
