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
} from 'lucide-react';
import { InternshipListing, MatchBreakdown } from '../types';
import { ListingLogo } from './ListingLogo';
import { DisBaglanti } from '../ui';
import { SIRKET_KENAR_GUCLU, SIRKET_ROZET, SIRKET_VURGU_KOYU } from '../sirket/renk';
import { calismaEtiketi, konumEtiketi } from '../lib/sehir';
import { eklenmeMetni, sonKontrolMetni, uzunSuredirAcik } from '../lib/zaman';
import { basvuruYolu } from '../lib/basvuru-yolu.mjs';
import { ILAN_KAYNAGI } from '../lib/urun-metni';

/*
  ALT CTA GEOMETRİSİ — TEK AİLE

  Kartın altındaki iki kutu (ikincil, birincil ve başarı durumu) aynı
  ölçüleri paylaşıyor: aynı yükseklik, aynı köşe, aynı yazı boyu, aynı
  iç boşluk. Böylece ilan durumu değişince — dış ilan, StajımVar ilanı,
  başvurulmuş — alt alan aynı kalıyor ve kartlar arasında zıplama olmuyor.

  `min-h-11`: telefonda dokunma hedefi 44 pikselin altına düşmüyor.
*/
const CTA_ORTAK =
  'flex min-h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition-colors';

const CTA_IKINCIL = 'cursor-pointer border border-gray-200 bg-white text-gray-800 hover:bg-gray-50';
const CTA_BIRINCIL = 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700 shadow-xs';

/*
  Başarı durumu tıklanmıyor: `cursor-pointer` ve `hover` YOK. Ölçüsü
  düğmeyle aynı ama davranışı düğme gibi değil — basılabilir görünüp
  hiçbir şey yapmayan bir kutu, kullanıcıyı boşuna deneme yaptırır.
*/
const CTA_BASARI = 'border border-emerald-200 bg-emerald-50 text-emerald-800';

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
  onGirisGerekli?: () => void;
  /*
    KENDİ ŞİRKETİNİN İLANI

    Şirket üyesi öğrenci görünümüne geçip kendi ilanını kontrol
    edebiliyor; oradan yanlışlıkla başvurabilmesi ise kendi paneline
    sahte bir aday düşürüyor ve başvuru sayacını şişiriyordu.

    Bu bir GÖRÜNÜM kuralı: veritabanı hâlâ izin veriyor, çünkü kuralı
    RLS'e taşımak ürün kararı ve ayrı ele alınıyor.
  */
  kendiIlanim?: boolean;
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
      className="bg-white rounded-2xl border border-gray-200 hover:border-blue-500 hover:shadow-xs transition-all duration-150 p-3.5 sm:p-4.5 group flex flex-col gap-3 sm:gap-3.5"
    >
      {/* Left & Middle Info Area */}
      <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0 w-full">
        {/*
          Şirket logosu — uyum puanı hesaplanabiliyorsa halkanın içinde.

          Halka yalnızca puan varken çiziliyor. Hesaplanamayan ilanlarda
          (öğrenci giriş yapmamış ya da ilanda beceri şartı yok) boş bir
          halka çizmek, olmayan bir ölçümü varmış gibi gösterirdi.
        */}
        <div className="shrink-0">
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
            className="rounded-full p-[3px]"
            style={{
              background: match.isScorable
                ? `conic-gradient(${halkaRengi} ${match.overallScore * 3.6}deg, #e5e7eb ${match.overallScore * 3.6}deg)`
                : 'transparent',
            }}
            title={
              match.isScorable
                ? `%${match.overallScore} uyum — ${match.summaryInsight}`
                : listing.companyName
            }
          >
            <div className="rounded-full bg-white p-[2px]">
              <ListingLogo
                name={listing.companyName}
                logoUrl={listing.companyLogo || undefined}
                halkaIcinde
                className="group-hover:scale-105 transition-transform"
              />
            </div>
          </div>

          {/*
            Sayı halkanın altında, şirket şeridindeki gibi. Halka oranı
            gösteriyor ama kaç olduğunu söylemiyor; ikisi birlikte tam
            bilgi veriyor ve yine tek bir yerde duruyor.
          */}
          {match.isScorable && (
            <span
              className="block text-center text-[10px] font-bold mt-1 tabular-nums"
              style={{ color: halkaRengi }}
            >
              %{match.overallScore}
            </span>
          )}
        </div>

        {/* Text Details */}
        <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
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
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
            <h3
              onClick={onViewDetails}
              className="font-bold text-blue-600 text-sm sm:text-base hover:underline cursor-pointer transition-colors"
            >
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
              KAYDET: SARMAYAN İKİNCİ ÇOCUK

              `ml-auto` ile sol taraftan itiliyordu ve sarma satırında bu
              "son öğenin solu" demek, "kartın sağ üstü" değil. Artık dış
              flex'in ikinci çocuğu: solundaki grup ne kadar sararsa sarsın
              düğme aynı yerde kalıyor. `-mr-1` görsel hizayı kartın kenarına
              çekiyor, dokunma hedefini küçültmeden.
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
                className={`-mr-1 shrink-0 rounded-lg p-1.5 transition-colors cursor-pointer ${
                  kayitli ? 'text-blue-600 bg-blue-50' : 'text-gray-300 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${kayitli ? 'fill-blue-600' : ''}`} />
              </button>
            )}
          </div>

          {/* Row 2: Job Title (Bold & Clear) */}
          <div>
            {/*
              İki satır sınırı: başlık artık tam genişlikte olduğu için iki
              satır neredeyse her ilanı alıyor. Sınır olmadan tek bir uzun
              başlık ızgaradaki bütün kartların boyunu belirliyordu.
            */}
            <h4
              className="text-base sm:text-lg font-bold text-gray-900 leading-snug cursor-pointer hover:text-blue-600 transition-colors line-clamp-2"
              onClick={onViewDetails}
              title={listing.title}
            >
              {listing.title}
            </h4>
            {listing.department && (
              <p className="text-xs sm:text-sm text-gray-600 font-normal mt-0.5">
                ({listing.department})
              </p>
            )}
          </div>

          {/* Row 3: Badges & Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            {/* Work Type & City */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50/80 text-blue-700 font-medium border border-blue-100">
              <MapPin className="w-3.5 h-3.5 text-blue-600"/>
              {/*
                Ham konum metni "Turkey - Istanbul" gibi gelebiliyor.
                konumEtiketi ülke önekini atıyor ve ilçeyi iliyle birlikte
                yazıyor: "Şişli, İstanbul".
              */}
              <span>{konumEtiketi(listing.city)} ({calismaEtiketi(listing.workType)})</span>
            </span>

            {/* Mandatory SGK Badge */}
            {listing.mandatoryStajAccepted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600"/>
                <span>Zorunlu Staj (SGK)</span>
              </span>
            )}

            {/* Stipend */}
            {listing.stipend.isPaid && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                <DollarSign className="w-3.5 h-3.5 text-amber-600"/>
                <span>{listing.stipend.amountText?.split('+')[0] || 'Ücretli'}</span>
              </span>
            )}

            {/*
              Süre bilgisi toplanan ilanların çoğunda yok. Koşulsuz çizilince
              içi boş, yalnızca takvim ikonu olan bir rozet kalıyordu — kartın
              bozuk görünmesinin başlıca sebebi buydu.
            */}
            {listing.duration?.trim() && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 font-medium">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>{listing.duration}</span>
              </span>
            )}

            {/* Matched Skills */}
            {match.matchedRequiredSkills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50/80 text-emerald-800 border border-emerald-200/80"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0"/>
                <span>{skill}</span>
              </span>
            ))}

            {/*
              KAYNAK ETİKETİ — İKİ TÜR, İKİ CÜMLE

              Önce yalnızca derlenen ilanda "Kariyer sayfasından" yazıyordu;
              şirketin buraya kendi açtığı ilanda hiçbir şey yazmıyordu. İki
              tür kart yan yana duruyor ve ikisinin başvuru yolu farklı —
              öğrenci düğmeye basmadan hangisinde olduğunu bilmiyordu.

              Şirket adı satırındaydı ve orada kaydet düğmesiyle aynı sarma
              satırını paylaşıyordu; ad uzayınca ikisinin sırası değişiyordu.
              Buraya indi.

              Şeridin BAŞINA değil SONUNA kondu: 375 pikselde bu çip tek
              başına bir satır dolduruyor ve başta durduğunda konumu alt
              satıra itiyordu (ölçüldü: konum çipi 131 pikselden başlıyordu).
              Öğrencinin taradığı bilgi konum ve ücret; kaydın nereden
              geldiği künye, o yüzden artakalan yere düşüyor.

              Çip dili komşularıyla aynı, rengi nötr: bu bir kazanım değil
              (ücret, zorunlu staj gibi), bir künye.
            */}
            {kariyerSayfasindanIlan ? (
              <span
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 font-medium text-gray-700"
                title="Bu ilan şirketin kendi kariyer sayfasından alındı"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{ILAN_KAYNAGI.dis.etiket}</span>
              </span>
            ) : sirketinKendiIlani ? (
              <span
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 font-medium text-gray-700"
                title="Bu ilanı şirket doğrudan StajımVar'da yayımladı; başvuru burada tamamlanıyor"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{ILAN_KAYNAGI.ic.etiket}</span>
              </span>
            ) : null}

            {/*
              Ne zaman eklendiği. Sıralamada "Önce Yeni Eklenenler" seçeneği
              var; kartta karşılığı görünmezse kullanıcı sıralamanın işleyip
              işlemediğini anlayamaz.

              Yayın tarihi çok eski ama başvuru adresi yakın zamanda
              doğrulanmışsa tarih yerine ne anlama geldiği yazılıyor:
              "10 ay önce yayınlandı" listenin bakımsız olduğunu düşündürüyor,
              oysa ilan gerçekten açık. Ayrıntısı src/lib/zaman.ts içinde.
            */}
            {uzunSuredirAcik(listing.postedAt, listing.postedAtDogrulandi, listing.lastSeenAt) ? (
              <span
                className="text-[11px] text-gray-600"
                title={`İlk yayın: ${eklenmeMetni(listing.postedAt, listing.postedAtDogrulandi)}`}
              >
                Uzun süredir açık
              </span>
            ) : (
              eklenmeMetni(listing.postedAt, listing.postedAtDogrulandi) && (
                <span className="text-[11px] text-gray-600">
                  {eklenmeMetni(listing.postedAt, listing.postedAtDogrulandi)}
                </span>
              )
            )}

            {/*
              SON KONTROL

              "1 hafta önce eklendi" ilanın hâlâ açık olduğunu söylemiyor;
              "bugün kontrol edildi" söylüyor. Sitenin en ayırt edici
              iddiası bu ve görünmediği sürece iddia olarak kalıyor.

              Tarih tazelenmezse metin de eskiyor — bu doğru davranış:
              kaynaktan kalkan ilanın kaç gündür doğrulanmadığı görünmeli.
            */}
            {sonKontrolMetni(listing.lastSeenAt) && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <ShieldCheck className="w-3 h-3" />
                {sonKontrolMetni(listing.lastSeenAt)}
              </span>
            )}

            {/*
              Eksik beceri, sahip olunan becerilerle aynı biçimde çizilince
              ikisi ayırt edilemiyordu. Başına "Eksik:" geldi.

              GİRİŞ YAPMAMIŞ ZİYARETÇİYE "EKSİK" DENMEZ

              Karşılaştırılacak bir profil yokken ilanın istediği her beceri
              "eksik" sayılıyordu: hesabı olmayan ziyaretçi ilk kartta
              "Eksik: React" görüyor ve kendisi hakkında bir yargı sanıyordu.
              Oysa site onun hakkında hiçbir şey bilmiyor.

              Aynı beceri artık ne olduğu olarak yazılıyor: ilanın istediği
              bir beceri. Karşılaştırma ancak profil varken anlamlı.
            */}
            {match.missingRequiredSkills.slice(0, 1).map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-50 text-gray-600 border border-gray-200"
                title={
                  girisGerekli
                    ? 'İlanın istediği becerilerden biri. Giriş yaparsan profilinle karşılaştırılıyor.'
                    : 'İlanın istediği ama profilinde olmayan beceri'
                }
              >
                <AlertCircle className="w-3 h-3 text-gray-500 shrink-0" />
                <span>{girisGerekli ? `İlanda geçen: ${skill}` : `Eksik: ${skill}`}</span>
              </span>
            ))}
          </div>
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
        {listing.applicationDeadline && (
          <p className="mb-2 text-[11px] text-gray-600">
            Son: <strong className="text-gray-700">{listing.applicationDeadline}</strong>
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
        <div className="grid grid-cols-2 gap-2">
          <button
            id={`view-details-btn-${listing.id}`}
            onClick={onViewDetails}
            className={`${CTA_ORTAK} ${CTA_IKINCIL}`}
          >
            Detaylar
          </button>

          {(() => {
            /*
              Kendi ilanında başvuru yok, nötr bir durum: suçlayıcı ya da
              hata gibi değil, yalnızca bilgi. Şirket kendi ilanını
              öğrenci gözüyle görebilmeli.
            */
            if (kendiIlanim) {
              return (
                <span
                  className={`${CTA_ORTAK} border`}
                  style={{
                    borderColor: SIRKET_KENAR_GUCLU,
                    background: SIRKET_ROZET,
                    color: SIRKET_VURGU_KOYU,
                  }}
                  title="Bu ilanı şirket hesabınız yönetiyor"
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Şirketinizin ilanı</span>
                </span>
              );
            }

            /*
              BAŞVURULDU BİR AKSİYON DEĞİL

              Platform üzerinden başvurulmuş ilanda ikinci kutu bir başarı
              durumu: `span`, tıklanmıyor, imleç değişmiyor, hover'ı yok.
              Geometrisi düğmeyle aynı — kart alt alanı durum değişince
              aynı yüksekliği koruyor.
            */
            if (hasApplied && yol.teslimEdiliyor) {
              return (
                <span className={`${CTA_ORTAK} ${CTA_BASARI}`}>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Başvuruldu</span>
                </span>
              );
            }

            /*
              Ana eylem: derlenen ilanda şirketin kendi sayfası, StajımVar
              ilanında site içi başvuru. Karar tek yerde:
              lib/basvuru-yolu.mjs.
            */
            if (yol.resmiAdres && yol.anaEylem === 'resmi-site') {
              return (
                <DisBaglanti
                  id={`external-apply-btn-${listing.id}`}
                  href={yol.resmiAdres}
                  girisGerekli={girisGerekli}
                  onGirisGerekli={onGirisGerekli}
                  title={yol.ozet}
                  className={`${CTA_ORTAK} ${CTA_BIRINCIL}`}
                >
                  <span className="truncate">
                    {girisGerekli && onGirisGerekli ? 'Başvurmak için giriş yap' : yol.anaEtiket}
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </DisBaglanti>
              );
            }

            /*
              UZUN ETİKET KIRPILMASIN

              Resmî adresi olmayan kayıtta ana eylem "Başvurduğumu
              işaretle" ve bu etiket 160 piksellik kutuya 12 punto ile
              sığmıyordu (ölçüldü: 130 px metin, 122 px yer). Etiketi
              kısaltmak anlamı bozardı — "İşaretle" neyi işaretlediğini
              söylemiyor. Yazı bir punto küçülüyor; geometri aynı kalıyor.
            */
            const uzunEtiket = yol.anaEtiket.length > 18;

            return (
              <button
                id={`quick-apply-btn-${listing.id}`}
                onClick={onQuickApply}
                title={yol.ozet}
                className={`${CTA_ORTAK} ${CTA_BIRINCIL} ${uzunEtiket ? 'text-[11px]' : ''}`}
              >
                <span className="truncate">{yol.anaEtiket}</span>
                <ArrowRight className="h-3 w-3 shrink-0" />
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
