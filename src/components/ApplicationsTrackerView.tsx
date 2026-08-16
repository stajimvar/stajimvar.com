import React, { useState } from 'react';
import {
  FileText,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Video,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { ApplicationRecord, InternshipListing } from '../types';
import { CompanyLogo } from './CompanyLogo';

interface ApplicationsTrackerViewProps {
  applications: ApplicationRecord[];
  allListings: InternshipListing[];
  subTab?: string;
  onSubTabChange?: (subTab: string) => void;
  onExploreInternships: () => void;
}

export const ApplicationsTrackerView: React.FC<ApplicationsTrackerViewProps> = ({
  applications,
  allListings,
  subTab = 'all',
  onSubTabChange,
  onExploreInternships,
}) => {
  const effectiveFilter = subTab || 'all';

  const getStatusBadge = (status: ApplicationRecord['status']) => {
    switch (status) {
      case 'submitted':
        return {
          label: 'Başvuru Gönderildi',
          color: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700',
        };
      case 'under_review':
        return {
          label: 'İK İnceliyor',
          color: 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-semibold',
        };
      case 'technical_assessment':
        return {
          label: 'Teknik Case Aşamasında',
          color: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-semibold',
        };
      case 'interview_scheduled':
        return {
          label: 'Mülakat Daveti Geldi',
          color: 'bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700 font-bold',
        };
      case 'offer_extended':
        return {
          label: '🎉 Staj Teklifi Geldi!',
          color: 'bg-emerald-600 text-white border-emerald-600 font-extrabold shadow-xs',
        };
      case 'rejected':
        return {
          label: 'Olumsuz Sonuçlandı',
          color: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700',
        };
      default:
        return {
          label: 'İşlemde',
          color: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700',
        };
    }
  };

  const filteredApps = applications.filter((app) => {
    if (effectiveFilter === 'all') return true;
    if (effectiveFilter === 'under_review') return app.status === 'under_review' || app.status === 'submitted';
    if (effectiveFilter === 'interviews') return app.status === 'interview_scheduled' || app.status === 'technical_assessment';
    if (effectiveFilter === 'offers') return app.status === 'offer_extended';
    return true;
  });

  const interviewCount = applications.filter(
    (a) => a.status === 'interview_scheduled' || a.status === 'technical_assessment'
  ).length;
  const offerCount = applications.filter((a) => a.status === 'offer_extended').length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 overflow-hidden">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Staj Başvurularım & Süreç Takibi
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300">
            Başvurduğunuz ilanların anlık aşamalarını, mülakat randevularını ve tekliflerini buradan takip edin.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="w-full lg:w-auto overflow-x-auto no-scrollbar py-0.5">
          <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl sm:rounded-full border border-gray-200 dark:border-slate-700 text-xs font-semibold shrink-0">
            <button
              onClick={() => onSubTabChange && onSubTabChange('all')}
              className={`px-3 py-1.5 rounded-lg sm:rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                effectiveFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Tümü ({applications.length})
            </button>
            <button
              onClick={() => onSubTabChange && onSubTabChange('under_review')}
              className={`px-3 py-1.5 rounded-lg sm:rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                effectiveFilter === 'under_review'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              İncelenenler
            </button>
            <button
              onClick={() => onSubTabChange && onSubTabChange('interviews')}
              className={`px-3 py-1.5 rounded-lg sm:rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                effectiveFilter === 'interviews'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Mülakatlar ({interviewCount})
            </button>
            <button
              onClick={() => onSubTabChange && onSubTabChange('offers')}
              className={`px-3 py-1.5 rounded-lg sm:rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                effectiveFilter === 'offers'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Teklifler ({offerCount})
            </button>
          </div>
        </div>
      </div>

      {/* Applications List */}
      {filteredApps.length > 0 ? (
        <div className="space-y-4">
          {filteredApps.map((app) => {
            const listing = allListings.find((l) => l.id === app.listingId);
            const badge = getStatusBadge(app.status);

            return (
              <div
                key={app.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all space-y-3.5 sm:space-y-4 overflow-hidden"
              >
                {/* Top Line */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-3.5">
                    {listing ? (
                      <CompanyLogo
                        name={listing.companyName}
                        logoUrl={listing.companyLogo || undefined}
                        className="w-11 h-11 rounded-xl p-1 text-sm shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                        <Building2 className="w-6 h-6" />
                      </div>
                    )}

                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {listing?.companyName || 'Şirket'}
                      </span>
                      <h3 className="font-bold text-gray-900 dark:text-slate-100 text-base leading-snug">
                        {listing?.title || 'Staj Başvurusu'}
                      </h3>
                      {listing?.department && (
                        <p className="text-xs text-gray-400 dark:text-slate-400">
                          ({listing.department})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`text-xs px-3 py-1.5 rounded-full border ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* Info Bar */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-gray-500 dark:text-slate-400 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                    <span>Başvuru: {app.appliedAt}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Son Güncelleme: {app.updatedAt ?? app.appliedAt}</span>
                  </span>
                  {app.matchScore > 0 && (
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      %{app.matchScore} Yetenek Uyumu
                    </span>
                  )}
                </div>

                {/* Next Step / Action Box */}
                {app.status === 'interview_scheduled' && listing && (
                  <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-200">
                        <Video className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Online Teknik Mülakat Daveti • 18 Haziran 14:00</span>
                      </div>
                      <p className="text-xs text-blue-800/80 dark:text-blue-300/80">
                        Şirket yetkilileri mülakat bağlantısını e-posta adresinize iletmiştir. Görüşme öncesinde portfolyo ve projelerinizi hazır bulundurmanız önerilir.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3.5 py-1.5 rounded-full text-xs font-bold text-blue-800 dark:text-blue-200 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800">
                        Google Meet Linki İletildi
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-gray-200 dark:border-slate-800 text-center space-y-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Bu filtreye uygun herhangi bir staj başvurusu bulunmuyor.
          </p>
          <button
            onClick={onExploreInternships}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            Staj İlanlarını Keşfet
          </button>
        </div>
      )}
    </div>
  );
};
