import React from 'react';
import {
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Bookmark,
  Building2,
  ExternalLink,
  ShieldCheck,
  Star,
  ArrowUpRight,
  FileText,
} from 'lucide-react';
import { InternshipListing, MatchBreakdown } from '../types';
import { ListingLogo } from './ListingLogo';
import { listingSlug } from '../lib/slug';
import { SIRKET_KENAR_GUCLU, SIRKET_ROZET, SIRKET_VURGU_KOYU } from '../sirket/renk';
import { calismaEtiketi, konumEtiketi } from '../lib/sehir';
import { UlkeRozeti } from './UlkeRozeti';
import { basvuruYolu } from '../lib/basvuru-yolu.mjs';
import { ILAN_KAYNAGI } from '../lib/urun-metni';
import { tarihMetni } from '../lib/tarih.mjs';
import { YUZEY } from '../ui/tokens';
/*
  Staj türü kararı ayrı dosyada: kart ve detay AYNI kuralı kullanıyor
  ve kural React ağacı kurmadan sınanabiliyor.
*/

/**
 * SİGORTAYI SAĞLAYAN TARAFIN OKUNABİLİR ADI.
 *
 * "yok" da GÖSTERİLİYOR: kaynağın açık beyanı ve öğrenci için gerçek
 * bir bilgi. Gösterilmeyen tek hâl `undefined` — kaynağın hiç
 * konuşmadığı hâl.
 */

/*
  ALT CTA GEOMETRİSİ — TEK AİLE

  Kartın altındaki iki kutu (ikincil, birincil ve başarı durumu) aynı
  ölçüleri paylaşıyor: aynı yükseklik, aynı köşe, aynı yazı boyu, aynı
  iç boşluk. Böylece ilan durumu değişince — dış ilan, StajımVar ilanı,
  başvurulmuş — alt alan aynı kalıyor ve kartlar arasında zıplama olmuyor.

  Tanımlar `lib/kart-cta` dosyasına taşındı: aynı düğme çifti fırsat
  kartında da var ve iki dosyada elle yazılınca renkleri ters, puntoları
  farklı hâle gelmişti.
*/

interface InternshipCardProps {
  listing: InternshipListing;
  match: MatchBreakdown;
  hasApplied: boolean;
  onViewDetails: () => void;
  onQuickApply: () => void;
  /*
    KAYDET, BAŞVURDUM'DAN AYRI

    İkisi farklı niyet: kaydetmek "ilgileniyorum, henüz başvurmadım",
    başvurdum işaretlemek "resmî sayfada tamamladım". Tek düğmede toplamak,
    kullanıcıyı yapmadığı bir şeyi işaretlemeye zorluyordu.

    Kaydet düğme sırasına DEĞİL kartın köşesine kondu: alt sıra zaten iki
    düğme taşıyor ve üçüncüsü başlığı satırlara sarıyordu (daha önce
    ölçüldü).
  */
  kayitli?: boolean;
  onToggleKayit?: () => void;
  /*
    Misafir kullanıcıda da yer imi GÖRÜNÜYOR ama işaretlenmiş olmuyor:
    düğme gizlendiğinde giriş yapmamış ziyaretçi bu özelliğin varlığından
    haberdar olmuyordu. Tıklayınca giriş penceresi açılıyor.
  */
  girisGerekli?: boolean;
  /*
    Misafirken dış başvuru bağlantısı giriş penceresini açıyor. İlanın
    kendisi açık; kapanan yalnızca son adım — bkz. ui/DisBaglanti.
  */
  onGirisGerekli?: (niyet: {
    tur: 'dis' | 'ic';
    ilanId: string;
    yol: string;
    disAdres?: string;
    baslik?: string;
  }) => void;
  /*
    KENDİ ŞİRKETİNİN İLANI

    Şirket üyesi öğrenci görünümüne geçip kendi ilanını kontrol
    edebiliyor; oradan yanlışlıkla başvurabilmesi ise kendi paneline
    sahte bir aday düşürüyor ve başvuru sayacını şişiriyordu.

    Bu bir GÖRÜNÜM kuralı: veritabanı hâlâ izin veriyor, çünkü kuralı
    RLS'e taşımak ürün kararı ve ayrı ele alınıyor.
  */
  kendiIlanim?: boolean;
  /*
    TELEFONDA KART DEĞİL, YÜZEY

    Liste ekranında kartlar gri zemin üzerinde yüzen kutulardı: iki
    yanında 16 pikselik şeritler, köşelerinde yuvarlatma, aralarında
    12 piksel boşluk. Bu bayrak açıkken telefonda kabuk yerini tek bir
    alt çizgiye bırakıyor ve kart ekranın iki kenarına yaslanıyor;
    `sm:` ve üstünde kart olduğu gibi geri geliyor.

    PROP'A BAĞLI, ÇÜNKÜ KART PAYLAŞILIYOR: aynı bileşen dev
    düzeneğinde ve ileride başka bağlamlarda da çiziliyor. Yüzey
    davranışı yalnız liste ekranının kararı.
  */
  yuzey?: boolean;
}

export const InternshipCard: React.FC<InternshipCardProps> = ({
  listing,
  match,
  hasApplied,
  onViewDetails,
  onQuickApply,
  kayitli = false,
  onToggleKayit,
  girisGerekli = false,
  onGirisGerekli,
  kendiIlanim = false,
  yuzey = false,
}) => {
  /*
    UYUM PUANI LOGONUN ETRAFINDA HALKA OLARAK

    Önce kartın alt satırında "%38 uyum" yazan ayrı bir rozet vardı. Bilgi
    doğruydu ama kendi satırını ve kendi çerçevesini istiyordu; kartın alt
    yarısı zaten üç düğmeyle doluydu.

    Halka, sitede üçüncü kez aynı işi yapıyor ve hep aynı anlamda: ölçülmüş
    bir durumu göstermek. Profilde doluluk, şirket şeridinde "son 24 saatte
    yeni ilan", burada uyum puanı. Dekor değil — yüzde neyse halkanın o
    kadarı doluyor.

    Renk: turuncu bilerek yok, uyarı gibi okunuyor ve düşük puanlı ilanı
    "sorunlu" göstermek istemiyoruz. Düşük puan sessiz gri, iyisi yeşil.
  */
  const halkaRengi =
    match.overallScore >= 75 ? '#10b981' : match.overallScore >= 50 ? '#2563eb' : '#9ca3af';

  /* Başvurunun gerçekte nasıl işlediği — düğmelerin yazısı buradan geliyor. */
  const yol = basvuruYolu(listing);
  /*
    Şirketin StajımVar'da kendi açtığı ilan. `origin` alanının üretilmiş
    tipinde 'employer_posted' henüz yok (tipler yeniden üretilmedi), o
    yüzden karşılaştırma dizeyle yapılıyor.
  */
  const sirketinKendiIlani =
    String(listing.origin) === 'employer_posted' || String(listing.origin) === 'internal';
  /*
    "Kariyer sayfasından" ETİKETİ ARTIK ELLE EKLENEN İLANI DA KAPSIYOR

    Koşul yalnızca `origin === 'scraped'` idi. Ama üçüncü bir tür var:
    otomasyonun derleyemediği bir ilanı kaynağından okuyup elle giriyoruz
    ve `origin` 'manual' oluyor. O ilan da başvuruyu şirketin kendi
    sayfasına yolluyor — düğmesinde "Resmî sitede başvur" yazıyor — ama
    kartında hiçbir kaynak etiketi çıkmıyordu. Yeni eklenen ilanlar
    listede etiketsiz duruyor, komşusu etiketli: öğrenci ikisinin farklı
    işlediğini sanıyor.

    Koşul artık başvurunun gerçekte nereye gittiğine bakıyor
    (`basvuruYolu`), yani düğmenin yazısıyla etiket asla ayrışamıyor.
    Adresi olmayan elle girilmiş ilan hâlâ etiketsiz: onu kariyer
    sayfasına yollayamıyoruz, "kariyer sayfasından" demek de yanıltır.
  */
  const kariyerSayfasindanIlan =
    !sirketinKendiIlani && (listing.origin === 'scraped' || yol.anaEylem === 'resmi-site');

  /* Ham ISO yerine "6 Eylül 2026"; değer yoksa satır hiç basılmıyor. */
  const sonBasvuru = tarihMetni(listing.applicationDeadline);

  return (
    <div
      id={`internship-card-${listing.id}`}
      /*
        MASAÜSTÜNDE DE TEK SÜTUN

        Kart `lg:flex-row` idi: geniş ekranda sol yarı bilgiye, sağ yarı
        düğmelere gidiyordu. Ölçüldü: 622 piksellik kartta başlığa kalan yer
        144 piksel — uzun bir ilan başlığı beş altı satıra sarıyor, kartın
        boyu 300 pikseli buluyordu.

        Başlık artık tam genişlikte ve en fazla iki satır; düğmeler alta,
        sağa yaslı tek satıra indi. Aynı bilgi, yarı yükseklik.
      */
      className={`group relative flex min-w-0 flex-col gap-3 bg-white transition-all duration-150 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 sm:gap-3.5 ${
        yuzey
          ? `rounded-2xl border border-gray-200 bg-white ${YUZEY.ic} hover:border-blue-400`
          : 'rounded-2xl border border-gray-200 p-3.5 hover:border-blue-500 hover:shadow-xs sm:p-4.5'
      }`}
    >
      {/*
        KÜNYE IZGARASI — BAŞLIK TELEFONDA TAM GENİŞLİKTE

        Burası `flex` idi: solda logo sütunu, sağda bütün metin. Bu,
        başlığın 375 piksellik ekranda logo genişliği kadar (48 + 12 =
        60 piksel) içeriden başlaması demekti — kartın sol kenarıyla
        başlığın arasında, altındaki hiçbir şeyin doldurmadığı boş bir
        sütun kalıyordu.

        Izgara ikisini birden verebiliyor: telefonda başlık üç sütunu
        birden kaplıyor (yani kartın tam iç genişliğini), `sm:` ve
        üstünde eskisi gibi ikinci sütundan başlıyor. Logo da aynı
        şekilde telefonda yalnız ilk satırda, geniş ekranda bütün
        satırlar boyunca duruyor.
      */}
      <div className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:items-start sm:gap-x-3.5">
        {/*
          Şirket logosu — uyum puanı hesaplanabiliyorsa halkanın içinde.

          Halka yalnızca puan varken çiziliyor. Hesaplanamayan ilanlarda
          (öğrenci giriş yapmamış ya da ilanda beceri şartı yok) boş bir
          halka çizmek, olmayan bir ölçümü varmış gibi gösterirdi.
        */}
        {/*
          KAPAK GÖRSELİ — VARSA ÇİZİLİYOR, YOKSA ALAN HİÇ AÇILMIYOR

          Onaylanan tasarımda kartın sağında şirketin kapak görseli var.
          `companyCover` boşken bu blok HİÇ çizilmiyor: yer tutan gri bir
          kutu ya da uydurma bir görsel, olmayan bir şeyi varmış gibi
          gösterirdi. Kart o durumda eskisi gibi tek sütun akıyor.

          Dekoratif: `alt=""` ve `aria-hidden` — ilanın kaynağı, konumu
          ve doğrulaması metinde yazıyor, görsel bir iddia taşımıyor.
          Yüklenemezse kendini gizliyor (kırık görsel simgesi kalmasın).
        */}
        {listing.companyCover && (
          <div className="col-start-3 row-span-3 row-start-2 w-[104px] shrink-0 self-start overflow-hidden rounded-xl border border-gray-200 sm:w-[124px] lg:w-[168px]">
            <img
              src={listing.companyCover}
              alt=""
              aria-hidden
              loading="lazy"
              className="h-[84px] w-full object-cover sm:h-[104px] lg:h-[116px]"
              onError={(olay) => {
                olay.currentTarget.parentElement?.classList.add('hidden');
              }}
            />
          </div>
        )}

        <div className="col-start-1 row-start-1 shrink-0 sm:row-span-4">
          {/*
            Logo HER ZAMAN yuvarlak, halka yalnızca puan varken.

            Önce iki ayrı biçim vardı: puanı olan ilanda yuvarlak, olmayanda
            kare. Aynı listede iki farklı logo biçimi, sayfayı derli toplu
            olmaktan çıkarıyordu — üstelik şirket şeridindeki logolar da
            yuvarlak.

            Yapı tek: sarmalayıcı hep aynı boyutta duruyor, yalnızca zemini
            değişiyor. Puan yoksa zemin saydam, yani halka görünmüyor ama
            logo aynı yerde ve aynı boyutta kalıyor — kartlar birbirinden
            kaymıyor.
          */}
          <div
            /*
              UYUM HALKASI KALDIRILDI

              Logonun etrafındaki renkli halka ilana göre değişiyordu ve
              kartı tek tip olmaktan çıkarıyordu; üstelik "bu logo neden
              yeşil/sarı" sorusunu kartın kendisi yanıtlamıyordu. Uyum
              puanı ilan sayfasında duruyor.
            */
            className="rounded-xl"
            title={listing.companyName}
          >
            <div className="bg-white">
              {/*
                TELEFONDA BİR KADEME KÜÇÜK

                46 piksellik logo halkasıyla birlikte 56 piksellik bir
                hücre yapıyor; yanındaki şirket adı 20 piksel. Kartın
                ilk satırı, taşıdığı yazının iki buçuk katı yükseklikte
                kalıyordu. Telefonda 36 piksele iniyor, `sm:` üstünde
                eski ölçü — orada satırda sektör ve puan da var.
              */}
              <ListingLogo
                name={listing.companyName}
                logoUrl={listing.companyLogo || undefined}
                className="!h-12 !w-12 !rounded-lg !text-sm sm:!h-14 sm:!w-14"
              />
            </div>
          </div>

          {/*
            Sayı halkanın altında, şirket şeridindeki gibi. Halka oranı
            gösteriyor ama kaç olduğunu söylemiyor; ikisi birlikte tam
            bilgi veriyor ve yine tek bir yerde duruyor.
          */}
          {match.isScorable && (
            /*
              Telefonda bu satır GİZLİ: logonun altına inen yüzde, ilk
              satırın yüksekliğini şirket adının iki katına çıkarıyor ve
              adın yanında karşılığı olmayan bir boşluk bırakıyordu.
              Sayı orada kaybolmuyor — şirket adının yanındaki künye
              şeridine giriyor (aşağıda).
            */
            <span
              className="mt-1 hidden text-center text-[10px] font-bold tabular-nums sm:block"
              style={{ color: halkaRengi }}
            >
              %{match.overallScore}
            </span>
          )}
        </div>

        {/*
          SATIR 1: KAYDET HEP SAĞ ÜST KÖŞEDE

            Şirket adı, sektör, puan, kaydet düğmesi ve kaynak rozeti tek bir
            `flex-wrap` satırındaydı. Ad kısayken hepsi yan yana sığıyor, ad
            uzayınca sarma sırası değişiyordu: kaydet düğmesi kimi kartta
            rozetin soluna düşüyor, kimi kartta rozet alt satıra kayıyordu.
            Ölçüldü — "TikTok"ta düğme ortada, "The Magnum Ice Cream
            Company"de rozet ikinci satırda.

            Artık iki parça var: solda sarabilen künye grubu, sağda
            sarmayan (`shrink-0`) kaydet düğmesi. Düğmenin yeri şirket adının
            uzunluğundan bağımsız.

            Kaynak rozeti bu satırdan çıkıp aşağıdaki künye şeridine indi;
            orası zaten konum ve ücret gibi aynı türden bilgilerin yeri.
          */}
          <div className="col-start-2 row-start-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
            {/*
              Şirket adı artık kendi tıklama işleyicisini taşımıyor: kartın
              tamamı zaten aynı ilana gidiyor (aşağıdaki uzatılmış bağlantı).
              İki ayrı tıklama hedefi üst üste binince biri ötekini yutuyordu.
            */}
            <h3 className="font-bold text-gray-900 text-[15px] sm:text-base">
              {listing.companyName}
            </h3>
            {/*
              Toplanan şirketlerde sektör ve puan bilgisi yok. Boş bir alanı
              ayraçla göstermek "• • 0" gibi bozuk bir satır üretiyordu;
              bilinmeyen alanlar artık hiç çizilmiyor.
            */}
            {listing.companyIndustry && (
              <>
                <span className="text-gray-300">•</span>
                <span className="truncate">{listing.companyIndustry}</span>
              </>
            )}

            {listing.companyRating > 0 && (
              <>
                <span className="text-gray-300">•</span>
                <div className="flex items-center text-amber-500 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 inline mr-1" />
                  <span>{listing.companyRating}</span>
                </div>
              </>
            )}
          </div>

            {/*
              KAYDET: KENDİ IZGARA HÜCRESİ

              `ml-auto` ile sol taraftan itiliyordu ve sarma satırında bu
              "son öğenin solu" demek, "kartın sağ üstü" değil. Şimdi
              ızgaranın üçüncü sütununda: solundaki künye ne kadar sararsa
              sarsın düğme aynı yerde kalıyor. `-mr-1` görsel hizayı kartın
              kenarına çekiyor, dokunma hedefini küçültmeden.
            */}
            {onToggleKayit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleKayit();
                }}
                aria-pressed={girisGerekli ? undefined : kayitli}
                aria-label={
                  girisGerekli
                    ? 'Kaydetmek için giriş yap'
                    : kayitli
                      ? 'Kayıtlardan çıkar'
                      : 'Daha sonra bakmak için kaydet'
                }
                title={
                  girisGerekli
                    ? 'Kaydetmek için giriş yap'
                    : kayitli
                      ? 'Kayıtlardan çıkar'
                      : 'Daha sonra bakmak için kaydet'
                }
                /* `relative z-10`: uzatılmış kart bağlantısının örtüsünün üstünde. */
              className={`relative z-10 col-start-3 row-start-1 -mr-1 shrink-0 cursor-pointer rounded-lg p-1.5 transition-colors ${
                  kayitli ? 'text-blue-600 bg-blue-50' : 'text-gray-300 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${kayitli ? 'fill-blue-600' : ''}`} />
              </button>
            )}

          {/* Satır 2: ilan başlığı — telefonda kartın tam iç genişliği */}
          <div className="col-span-3 col-start-1 row-start-2 min-w-0 sm:col-span-2 sm:col-start-2">
            {/*
              İki satır sınırı: başlık artık tam genişlikte olduğu için iki
              satır neredeyse her ilanı alıyor. Sınır olmadan tek bir uzun
              başlık ızgaradaki bütün kartların boyunu belirliyordu.
            */}
            {/*
              KARTIN TAMAMI TIKLANABİLİR — UZATILMIŞ BAĞLANTI

              Önce ayrı bir "Detaylar" düğmesi vardı ve başlık `onClick`
              taşıyordu. İkisi de gerçek bir bağlantı değildi: sağ tıkla
              yeni sekmede açmak, orta tuş, adresi kopyalamak ve bağlantıyı
              gören arama motoru — hiçbiri çalışmıyordu.

              Şimdi başlık gerçek bir `<a href>` ve `after:absolute
              after:inset-0` ile kartın tamamına yayılıyor. İç içe `<a>`
              üretilmiyor: kartta başka bağlantı yok, bağımsız denetimler
              (kaydet, başvuru) `relative z-10` ile örtünün ÜSTÜNDE duruyor
              ve kendi işlerini yapmaya devam ediyor.

              Değiştirici tuşlu tıklamalar tarayıcıya bırakılıyor; yalnız
              düz sol tık SPA gezinmesine çevriliyor.
            */}
            <h4 className="text-base sm:text-lg font-bold text-gray-900 leading-snug line-clamp-2">
              <a
                href={`/ilan/${listingSlug(listing)}`}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  onViewDetails();
                }}
                title={listing.title}
                className="rounded-sm outline-none transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-blue-600"
              >
                {listing.title}
              </a>
            </h4>
            {listing.department && (
              <p className="text-xs sm:text-sm text-gray-600 font-normal mt-0.5">
                ({listing.department})
              </p>
            )}
          </div>

          {/*
            SATIR 3: KONUM SADE METİN

            Konum ve çalışma modeli mavi bir çipti ve kartın en dikkat
            çeken ikinci öğesiydi — oysa "İstanbul · Hibrit" bir kazanım
            değil, künye. Rozet ücret, sigorta ve zorunlu staj gibi
            gerçekten ayırt edici özelliklere kaldı; bunlar sade metne
            indi ve şerit okunur hâle geldi.
          */}
          <p className="col-span-3 col-start-1 row-start-3 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-gray-600 sm:col-span-2 sm:col-start-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            {/*
              Ham konum metni "Turkey - Istanbul" gibi gelebiliyor.
              konumEtiketi ülke önekini atıyor ve ilçeyi iliyle birlikte
              yazıyor: "Şişli, İstanbul".
            */}
            <span className="min-w-0">
              {konumEtiketi(listing.city)} · {calismaEtiketi(listing.workType)}
            </span>
            {/*
              Ülke yalnız yurt dışı ilanlarda yazılıyor; kararı tek kural
              dosyası (lib/ulke-rozeti.mjs) veriyor. Konumun hemen yanında
              duruyor: "Paris" tek başına yurt içi bir ilan gibi okunuyordu.
            */}
            <UlkeRozeti countryCode={listing.countryCode} />
            {/*
              Süre de künye: takvim ikonlu gri bir çipti, aynı şeridin
              düz metnine indi.
            */}
            {listing.duration?.trim() && (
              <>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  {listing.duration}
                </span>
              </>
            )}
          </p>

          {/*
            SATIR 4: TEK TİP KÜNYE — YALNIZ KAYNAK

            Burada ilana göre değişen bir rozet yığını vardı: "%N uyum",
            "Eksik: <beceri>", "Son kontrol: bugün", "dün yayınlandı",
            süre, ücret, ülke, zorunlu/gönüllü... Kartlar birbirine
            benzemiyordu; aynı listede kimi kart iki, kimi kart beş çip
            taşıyor, göz her kartta yeniden yer arıyordu.

            Onaylanan tasarımda kart tek tip: şirket, pozisyon, konum ve
            KAYNAK. Kaldırılan bilgiler silinmedi — hepsi ilan sayfasında
            duruyor; doğrulama ve son kontrol de orada, kaynağıyla
            birlikte. Kaynak çipi kartta kalıyor çünkü her ilanda var ve
            başvurunun nereye gittiğini söylüyor.
          */}
          <div className="col-span-3 col-start-1 row-start-4 flex min-w-0 flex-wrap items-center gap-1.5 text-xs sm:col-span-2 sm:col-start-2">
            {kariyerSayfasindanIlan ? (
              <span
                className="inline-flex items-center gap-1.5 text-gray-600"
                title="Bu ilan şirketin kendi kariyer sayfasından alındı"
              >
                <FileText className="w-4 h-4 text-gray-400" />
                <span>{ILAN_KAYNAGI.dis.etiket}</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 text-gray-600"
                title="Bu ilanı şirket doğrudan StajımVar'da yayımladı; başvuru burada tamamlanıyor"
              >
                <FileText className="w-4 h-4 text-gray-400" />
                <span>{ILAN_KAYNAGI.ic.etiket}</span>
              </span>
            )}
          </div>
      </div>

      {/* Right Actions & Match Score Area */}
      {/*
        EYLEMLER ALTTA, SAĞA YASLI

        Bu alan geniş ekranda kartın SAĞ SÜTUNUYDU ve başlığın yerini
        yiyordu. Artık her ekranda kartın alt satırı: solda son başvuru
        bilgisi, sağda düğmeler. Satır sarabiliyor — dar ekranda üç düğme
        yan yana sığmadığında kartın kenarından taşıyorlardı.
      */}
      <div className="w-full min-w-0 border-t border-gray-100 pt-2.5">
        {/*
          ÜST SATIR: YALNIZCA SON BAŞVURU TARİHİ

          Burada bir de "✓ İşaretledin" durumu vardı. Kaldırıldı: dış
          ilanda "başvurduğumu işaretle" kartta bir eylem olarak
          sunulmuyor ve olmayan bir özelliğin durumunu göstermek
          kullanıcıya yapmadığı bir şeyi hatırlatıyordu. Kartın işi ilanı
          göstermek; kişisel işaretleme kaydı "Başvurularım" tarafının işi.

          Tarih düğmelerle aynı satırdaydı; düğme sayısı değişince satır
          sağa sola kayıyordu. Ayrı satırda duruyor.
        */}
        {/*
          Tarih ham ISO olarak basılıyordu: "Son: 2026-09-06" (canlıda
          ölçüldü). Biçimlendirme `lib/tarih` içinde ve saatsiz değerlerde
          gün kaymasına karşı UTC'de yapılıyor.
        */}
        {sonBasvuru && (
          <p className="mb-2 text-[11px] text-gray-600">
            Son: <strong className="text-gray-700">{sonBasvuru}</strong>
          </p>
        )}

        {/*
          ALT CTA: HER KARTTA AYNI GEOMETRİ

          Önce dış ilanda üç aksiyon vardı — "Detaylar" (çerçevesiz metin),
          "Başvurdum" ve "Resmî sitede başvur" — ve dar ekranda satır
          sarıyordu. Üstelik "Detaylar" düz yazıyken diğer ikisi düğmeydi,
          yani üç farklı görsel ağırlık yan yana duruyordu.

          Artık her durumda İKİ EŞİT KUTU: solda "Detaylar" (ikincil),
          sağda tek ana eylem. Üçünün de geometrisi aynı yerden geliyor
          (CTA_ORTAK); değişen yalnızca renk ve etkileşim. Böylece kartlar
          arasında alt alan zıplamıyor.
        */}
        {/*
          "Detaylar" düğmesi kalktı: kartın tamamı zaten ilana gidiyor,
          ikinci bir "aynı yere git" düğmesi yer kaplıyordu. Geriye tek ana
          eylem kaldı ve tam genişlikte duruyor. `relative z-10`: uzatılmış
          bağlantının örtüsünün üstünde kalması gerekiyor, yoksa başvuru
          tıklaması karta gidiyor.
        */}
        {/*
          ALT EYLEM: "İLANI İNCELE" (onaylanan tasarım)

          Kartta tam genişlikte "Şirket sayfasında başvur" düğmesi vardı
          ve öğrenciyi karttan doğrudan dış siteye atıyordu: ilanın kendi
          sayfasındaki ücret, sigorta, staj türü ve doğrulama bilgisi
          atlanıyordu. Kart artık ilan sayfasına götürüyor; başvuru
          düğmesi orada, bilgiyle birlikte duruyor.

          `relative z-10`: uzatılmış kart bağlantısının örtüsünün üstünde.
        */}
        <div className="relative z-10 flex justify-end">
          <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-600">
            İlanı incele
            <ArrowUpRight aria-hidden className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  );
};
