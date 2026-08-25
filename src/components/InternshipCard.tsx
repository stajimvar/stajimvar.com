import React from 'react';
import {
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Bookmark,
  Check,
  ExternalLink,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { InternshipListing, MatchBreakdown } from '../types';
import { ListingLogo } from './ListingLogo';
import { calismaEtiketi, konumEtiketi } from '../lib/sehir';
import { eklenmeMetni, sonKontrolMetni } from '../lib/zaman';
import { basvuruYolu } from '../lib/basvuru-yolu.mjs';

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

  return (
    <div
      id={`internship-card-${listing.id}`}
      className="bg-white rounded-2xl border border-gray-200 hover:border-blue-500 hover:shadow-xs transition-all duration-150 p-3.5 sm:p-4.5 group flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 sm:gap-4"
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
          {/* Row 1: Company Name in vibrant blue, Industry & Star Rating */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
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
                className={`ml-auto shrink-0 p-1.5 rounded-lg transition-colors cursor-pointer ${
                  kayitli ? 'text-blue-600 bg-blue-50' : 'text-gray-300 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${kayitli ? 'fill-blue-600' : ''}`} />
              </button>
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
            {listing.origin === 'scraped' && (
              /*
                Güven sinyali kalıyor ama ağırlığı düştü: her kartta tekrar
                eden koyu yeşil bir cümle, on bir ilanda on bir kez okunacak
                bir şey değil. İkon + kısa etiket aynı şeyi söylüyor.
              */
              <span
                className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-medium"
                title="Bu ilan şirketin kendi kariyer sayfasından alındı"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Kariyer sayfasından
              </span>
            )}
          </div>

          {/* Row 2: Job Title (Bold & Clear) */}
          <div>
            <h4
              className="text-base sm:text-lg font-bold text-gray-900 leading-snug cursor-pointer hover:text-blue-600 transition-colors"
              onClick={onViewDetails}
            >
              {listing.title}
            </h4>
            {listing.department && (
              <p className="text-xs sm:text-sm text-gray-400 font-normal mt-0.5">
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
              Ne zaman eklendiği. Sıralamada "Önce Yeni Eklenenler" seçeneği
              var; kartta karşılığı görünmezse kullanıcı sıralamanın işleyip
              işlemediğini anlayamaz.
            */}
            {eklenmeMetni(listing.postedAt, listing.postedAtDogrulandi) && (
              <span className="text-[11px] text-gray-400">
                {eklenmeMetni(listing.postedAt, listing.postedAtDogrulandi)}
              </span>
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
            */}
            {match.missingRequiredSkills.slice(0, 1).map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-50 text-gray-500 border border-gray-200"
                title="İlanın istediği ama profilinde olmayan beceri"
              >
                <AlertCircle className="w-3 h-3 text-gray-400 shrink-0" />
                <span>Eksik: {skill}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Actions & Match Score Area */}
      {/*
        Mobilde bu alan tek satıra sığmıyordu: iki buton eklendikten sonra
        "StajımVar ile Başvur" kartın 109px dışına taşıyordu. Artık satır
        sarabiliyor ve shrink-0 kaldırıldı (o, daralmayı engelliyordu).
      */}
      <div className="flex flex-wrap lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto gap-2.5 pt-2.5 lg:pt-0 border-t lg:border-t-0 border-gray-100 min-w-0">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/*
            Uyum rozeti buradan kaldırıldı: artık logonun etrafındaki halka
            gösteriyor. Aynı sayıyı iki yerde göstermek kartın alt yarısını
            gereksiz uzatıyordu.
          */}
          {listing.applicationDeadline && (
            <span className="text-[11px] text-gray-400 hidden sm:inline">
              Son:{' '}
              <strong className="text-gray-700">
                {listing.applicationDeadline}
              </strong>
            </span>
          )}
        </div>

        {/* Buttons */}
        {/*
          Dar ekranda satır sarabiliyor: üç düğme yan yana sığmadığında
          `nowrap` ile kartın kenarından taşıyorlardı (375 pikselde ölçüldü).
        */}
        <div className="flex flex-wrap items-center gap-2">
          {/*
            Üç çerçeveli düğme yan yana durunca kartın alt yarısı düğme
            tarlasına dönüyordu. Detaylar çerçevesiz metin bağlantısı oldu:
            aynı iş, dörtte bir görsel ağırlık. Başlığa dokunmak da açıyor.
          */}
          <button
            id={`view-details-btn-${listing.id}`}
            onClick={onViewDetails}
            className="px-2 py-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors cursor-pointer"
          >
            Detaylar
          </button>

          {/*
            DÜĞME DÜZENİ: önce çerçeveli, en sağda mavi.

            Kartın eski düzeni buydu ("Detaylar · İlana Git · mavi düğme") ve
            göz en sağdaki mavi düğmeyi arıyor. Doğruluk düzeltmesinde mavi
            düğme ortaya kaymıştı; sıra eski hâline döndü, yalnızca hangi
            eylemin mavi olduğu değişti.

            Mavi olan hep ANA eylem: resmî başvuru adresi varsa o adres,
            yoksa StajımVar üzerinden başvuru. Yayındaki ilanların tamamı
            şirketin kendi sayfasından başvuru alıyor ve başvuru oraya
            İLETİLMİYOR; bu yüzden StajımVar kaydı ikincil ve adı ne
            yaptığını söylüyor. Karar tek yerde: lib/basvuru-yolu.mjs.
          */}
          {(() => {
            const cerceveli =
              'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-2xs';
            const mavi = 'text-white bg-blue-600 hover:bg-blue-700 shadow-xs';
            const ortak =
              'flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer';

            const resmiSiteBirincil = yol.anaEylem === 'resmi-site';

            const disBaglanti = yol.resmiAdres ? (
              <a
                key="dis"
                id={`external-apply-btn-${listing.id}`}
                href={yol.resmiAdres}
                target="_blank"
                rel="noopener noreferrer nofollow"
                title="İlanın resmî başvuru sayfası"
                className={`${ortak} ${resmiSiteBirincil ? mavi : cerceveli}`}
              >
                <span>{resmiSiteBirincil ? yol.anaEtiket : 'İlana Git'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : null;

            const kayit = hasApplied ? (
              <span
                key="kayit"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{yol.teslimEdiliyor ? 'Başvuruldu' : 'İşaretlendi'}</span>
              </span>
            ) : (
              <button
                key="kayit"
                id={`quick-apply-btn-${listing.id}`}
                onClick={onQuickApply}
                title={yol.ozet}
                className={`${ortak} ${resmiSiteBirincil ? cerceveli : mavi}`}
              >
                {/*
                  Kartta kısa etiket: "Başvurduğumu işaretle" iki düğmeyle
                  birlikte metin sütununu daraltıyor, başlık dört satıra
                  sarıyordu. Anlam aynı, tam cümle title'da ve diyalogda.
                */}
                <span>{resmiSiteBirincil ? 'Başvurdum' : yol.anaEtiket}</span>
                {/*
                  İşaretleme düğmesinde ok değil onay simgesi: ok "bir yere
                  gidiyorsun" diyor ve bu düğme hiçbir yere gitmiyor, sadece
                  kaydı işaretliyor. Yanındaki asıl düğme zaten dışarı çıkan
                  olan.
                */}
                {resmiSiteBirincil ? <Check className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
              </button>
            );

            return resmiSiteBirincil ? [kayit, disBaglanti] : [disBaglanti, kayit];
          })()}
        </div>
      </div>
    </div>
  );
};
