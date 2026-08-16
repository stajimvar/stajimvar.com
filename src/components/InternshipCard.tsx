import React from 'react';
import {
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { InternshipListing, MatchBreakdown } from '../types';
import { CompanyLogo } from './CompanyLogo';
import { konumEtiketi } from '../lib/sehir';

interface InternshipCardProps {
  listing: InternshipListing;
  match: MatchBreakdown;
  hasApplied: boolean;
  onViewDetails: () => void;
  onQuickApply: () => void;
}

export const InternshipCard: React.FC<InternshipCardProps> = ({
  listing,
  match,
  hasApplied,
  onViewDetails,
  onQuickApply,
}) => {
  /*
    Uyum rozetinin rengi. Turuncu kaldırıldı: turuncu uyarı rengi gibi
    okunuyor ve düşük puanlı ilanları "sorunlu" göstermek istemiyoruz.
    Düşük puan sessiz gri, iyi puan yeşil.
  */
  let scoreBadge = 'bg-gray-100 text-gray-600 border border-gray-200 font-semibold';
  if (match.overallScore >= 75) {
    scoreBadge = 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold';
  } else if (match.overallScore >= 50) {
    scoreBadge = 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold';
  }

  return (
    <div
      id={`internship-card-${listing.id}`}
      className="bg-white rounded-2xl border border-gray-200 hover:border-blue-500 hover:shadow-xs transition-all duration-150 p-3.5 sm:p-4.5 group flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 sm:gap-4"
    >
      {/* Left & Middle Info Area */}
      <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0 w-full">
        {/* Company Logo */}
        <CompanyLogo
          name={listing.companyName}
          logoUrl={listing.companyLogo || undefined}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl shrink-0 group-hover:scale-105 transition-transform shadow-2xs text-base sm:text-lg p-1.5"
        />

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
              <span>{konumEtiketi(listing.city)} ({listing.workType})</span>
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
            Uyum puanı yalnızca hesaplanabildiğinde çiziliyor.

            Eskiden hesaplanamayan ilanlarda "Uyum hesaplanamadı" yazan gri bir
            rozet vardı. İlanların çoğunda beceri şartı olmadığı için liste
            boyunca aynı gri cümle tekrar ediyor, hiçbir şey söylemeden yer
            kaplıyordu. Açıklama ilan detayında duruyor; uydurma bir yüzde
            gösterilmiyor, sadece boş rozet çizilmiyor.
          */}
          {match.isScorable && (
            <span
              className={`text-[11px] px-3 py-1 rounded-full ${scoreBadge}`}
              title={match.summaryInsight}
            >
              %{match.overallScore} uyum
            </span>
          )}

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
        <div className="flex items-center gap-2">
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
            İki yol birlikte sunuluyor: StajımVar üzerinden başvuru (kayda geçer,
            şirketi platforma davet etmemizi sağlar) ve ilanın kendi sayfası.
            Dış ilanlarda başvurunun şirkete henüz iletilmediğini ApplyDialog
            açıkça söylüyor — öğrenci "başvurdum" sanıp beklememeli.
          */}
          {listing.applyUrl && (
            <a
              id={`external-apply-btn-${listing.id}`}
              href={listing.applyUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              title="İlanın kendi sayfasında başvur"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all shadow-2xs cursor-pointer"
            >
              <span>İlana Git</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {hasApplied ? (
            <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600"/>
              <span>Başvuruldu</span>
            </span>
          ) : (
            <button
              id={`quick-apply-btn-${listing.id}`}
              onClick={onQuickApply}
              className="flex items-center justify-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all cursor-pointer flex-1 sm:flex-none min-w-0"
            >
              <span>StajımVar ile Başvur</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
