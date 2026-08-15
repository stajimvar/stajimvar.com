import React from 'react';
import {
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { InternshipListing, MatchBreakdown } from '../types';

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
  // Score Badge (Orange role strictly for match scoring)
  let scoreBadge = 'bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60 font-black';
  if (match.overallScore < 70) {
    scoreBadge = 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-bold';
  } else if (match.overallScore < 85) {
    scoreBadge = 'bg-orange-50/80 text-orange-700 border border-orange-200/80 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/40 font-bold';
  }

  return (
    <div
      id={`internship-card-${listing.id}`}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xs transition-all duration-150 p-3.5 sm:p-4.5 group flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 sm:gap-4"
    >
      {/* Left & Middle Info Area */}
      <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0 w-full">
        {/* Company Logo */}
        <img
          src={listing.companyLogo}
          alt={listing.companyName}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl object-cover border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 shrink-0 group-hover:scale-105 transition-transform shadow-2xs"
        />

        {/* Text Details */}
        <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
          {/* Row 1: Company Name in vibrant blue, Industry & Star Rating */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-slate-400">
            <h3
              onClick={onViewDetails}
              className="font-bold text-blue-600 dark:text-blue-400 text-sm sm:text-base hover:underline cursor-pointer transition-colors"
            >
              {listing.companyName}
            </h3>
            <span className="text-gray-300 dark:text-slate-600">•</span>
            <span className="truncate">{listing.companyIndustry}</span>
            <span className="text-gray-300 dark:text-slate-600">•</span>
            <div className="flex items-center text-amber-500 dark:text-amber-400 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 inline mr-1" />
              <span>{listing.companyRating}</span>
            </div>
          </div>

          {/* Row 2: Job Title (Bold & Clear) */}
          <div>
            <h4
              className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onClick={onViewDetails}
            >
              {listing.title}
            </h4>
            {listing.department && (
              <p className="text-xs sm:text-sm text-gray-400 dark:text-slate-400 font-normal mt-0.5">
                ({listing.department})
              </p>
            )}
          </div>

          {/* Row 3: Badges & Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            {/* Work Type & City */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium border border-blue-100 dark:border-blue-900/50">
              <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{listing.city} ({listing.workType})</span>
            </span>

            {/* Mandatory SGK Badge */}
            {listing.mandatoryStajAccepted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/60">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Zorunlu Staj (SGK)</span>
              </span>
            )}

            {/* Stipend */}
            {listing.stipend.isPaid && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800/60">
                <DollarSign className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{listing.stipend.amountText?.split('+')[0] || 'Ücretli'}</span>
              </span>
            )}

            {/* Duration */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-medium">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>{listing.duration}</span>
            </span>

            <span className="text-gray-300 dark:text-slate-700 hidden sm:inline">|</span>

            {/* Matched Skills */}
            {match.matchedRequiredSkills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{skill}</span>
              </span>
            ))}

            {match.missingRequiredSkills.slice(0, 1).map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700"
              >
                <AlertCircle className="w-3 h-3 text-gray-400 shrink-0" />
                <span>{skill}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Actions & Match Score Area */}
      <div className="flex lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto shrink-0 gap-2.5 pt-2.5 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {/* Match Score */}
          <span
            className={`text-[11px] px-3 py-1 rounded-full uppercase tracking-wider ${scoreBadge}`}
          >
            %{match.overallScore} UYUMLU
          </span>

          <span className="text-[11px] text-gray-400 dark:text-slate-400 hidden sm:inline">
            Son: <strong className="text-gray-700 dark:text-slate-200">{listing.applicationDeadline}</strong>
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            id={`view-details-btn-${listing.id}`}
            onClick={onViewDetails}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-2xs cursor-pointer"
          >
            Detaylar
          </button>

          {hasApplied ? (
            <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Başvuruldu</span>
            </span>
          ) : (
            <button
              id={`quick-apply-btn-${listing.id}`}
              onClick={onQuickApply}
              className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all cursor-pointer"
            >
              <span>Hemen Başvur</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
