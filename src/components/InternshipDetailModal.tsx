import React from 'react';
import {
  X,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Star,
  Users,
  Send,
  MessageSquareCode,
  FileText,
  Clock,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import { InternshipListing, MatchBreakdown, StudentProfile } from '../types';
import { ListingLogo } from './ListingLogo';
import { basvuruYolu } from '../lib/basvuru-yolu.mjs';
import { useModalErisim } from '../lib/modal-erisim';

interface InternshipDetailModalProps {
  listing: InternshipListing | null;
  match: MatchBreakdown | null;
  /** Giriş yapılmamışsa null — modal ziyaretçiye de açılıyor. */
  student: StudentProfile | null;
  hasApplied: boolean;
  onClose: () => void;
  onApply: (coverLetterText?: string) => void;
}

export const InternshipDetailModal: React.FC<InternshipDetailModalProps> = ({
  listing,
  match,
  student,
  hasApplied,
  onClose,
  onApply,
}) => {
  const [customLetter, setCustomLetter] = React.useState('');
  const [showCoverLetterInput, setShowCoverLetterInput] = React.useState(false);

  /* Odak yönetimi, ESC, focus trap ve arka plan kilidi. */
  const kutuRef = useModalErisim<HTMLDivElement>(Boolean(listing && match), onClose);

  if (!listing || !match) return null;

  /* Başvurunun gerçek işleyişi; alt bardaki düğmeler buradan besleniyor. */
  const yol = basvuruYolu(listing);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        ref={kutuRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ilan-onizleme-basligi"
        className="relative bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <ListingLogo
              name={listing.companyName}
              logoUrl={listing.companyLogo || undefined}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">
                  {listing.companyName}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">{listing.companyIndustry}</span>
              </div>
              <h2 id="ilan-onizleme-basligi" className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                {listing.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 space-y-6">
          {/* Match Score Master Banner */}
          <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-orange-600">
                    %{match.overallScore} Uyum
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    {match.verdict === 'Excellent Match'
                      ? 'Mükemmel Eşleşme'
                      : match.verdict === 'Great Match'
                      ? 'Yüksek Eşleşme'
                      : 'Potansiyel Eşleşme'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{match.summaryInsight}</p>
              </div>

              <div className="text-xs font-semibold text-gray-500 bg-white px-3.5 py-2 rounded-xl border border-gray-200">
                <span>Son Başvuru: </span>
                <strong className="text-gray-900">{listing.applicationDeadline}</strong>
              </div>
            </div>

            {/* 4 Score Breakdown Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                <p className="text-[11px] font-medium text-gray-500">Temel Beceriler</p>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-sm font-bold text-gray-900">
                    %{match.coreSkillsMatchScore}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {(match.matchedRequiredSkills || []).length}/{(listing.requiredSkills || []).length}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1 overflow-hidden">
                  <div
                    className="bg-orange-500 h-full rounded-full"
                    style={{ width: `${match.coreSkillsMatchScore}%` }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                <p className="text-[11px] font-medium text-gray-500">Artı Yetenekler</p>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-sm font-bold text-gray-900">
                    %{match.bonusSkillsScore}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {(match.matchedPreferredSkills || []).length}/{(listing.preferredSkills || []).length || 1}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1 overflow-hidden">
                  <div
                    className="bg-orange-400 h-full rounded-full"
                    style={{ width: `${match.bonusSkillsScore}%` }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                <p className="text-[11px] font-medium text-gray-500">Lokasyon Uyumu</p>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-sm font-bold text-gray-900">
                    %{match.locationScore}
                  </span>
                  <span className="text-[10px] text-gray-500">{listing.workType}</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1 overflow-hidden">
                  <div
                    className="bg-orange-500 h-full rounded-full"
                    style={{ width: `${match.locationScore}%` }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                <p className="text-[11px] font-medium text-gray-500">Zorunlu Staj</p>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-sm font-bold text-gray-900">
                    {listing.mandatoryStajAccepted ? 'Kabul Edilir' : 'Sadece Uzun Dönem'}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      listing.mandatoryStajAccepted ? 'bg-orange-500 w-full' : 'bg-gray-300 w-1/2'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Key Facts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-gray-500 font-medium">Çalışma Şekli</p>
              <p className="font-bold text-gray-900 mt-0.5">
                {listing.city} ({listing.workType})
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-gray-500 font-medium">Staj Ücreti</p>
              <p className="font-bold text-gray-900 mt-0.5">
                {listing.stipend.amountText || 'Ücretli'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-gray-500 font-medium">Süre / Dönem</p>
              <p className="font-bold text-gray-900 mt-0.5">{listing.duration}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-gray-500 font-medium">Son Başvuru</p>
              <p className="font-bold text-orange-600 mt-0.5">{listing.applicationDeadline}</p>
            </div>
          </div>

          {/* Detailed Skill Breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Yetenek & Gereksinim Kıyaslaması</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <p className="text-xs font-bold text-emerald-950">
                  Eşleşen Gereksinimleriniz ({(match.matchedRequiredSkills || []).length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(match.matchedRequiredSkills || []).map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-emerald-800 border border-emerald-200"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{s}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <p className="text-xs font-bold text-gray-700">
                  Geliştirilmesi Gereken Beceriler ({(match.missingRequiredSkills || []).length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(match.missingRequiredSkills || []).length > 0 ? (
                    (match.missingRequiredSkills || []).map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                        <span>{s}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-emerald-700 font-semibold">
                      Tüm temel şartlar karşılanıyor! 🎉
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description & Responsibilities */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Staj Açıklaması</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>
          </div>

          {listing.responsibilities && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-900">Stajyer Sorumlulukları</h3>
              <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                {listing.responsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Optional Motivation Cover letter prompt */}
          <div className="pt-2 border-t border-gray-100 space-y-3">
            {!showCoverLetterInput ? (
              <button
                onClick={() => setShowCoverLetterInput(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
              >
                <span>+ Başvuruya Özel Motivasyon Notu / Ön Yazı Ekle</span>
              </button>
            ) : (
              <div className="space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">
                    Motivasyon Notu / Ön Yazı (İsteğe Bağlı)
                  </label>
                  <button
                    onClick={() => setShowCoverLetterInput(false)}
                    className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                  >
                    Kaldır
                  </button>
                </div>
                <textarea
                  value={customLetter}
                  onChange={(e) => setCustomLetter(e.target.value)}
                  placeholder="Şirkete bu staj veya iş için neden en uygun aday olduğunuzu, projelerinizi ve öğrenme hedeflerinizi özetleyin..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 bg-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3 z-10">
          <div className="text-xs text-gray-500">
            {student ? (
              <>
                <span>Başvuru Profili: </span>
                <strong className="text-gray-800">{student.fullName}</strong>
              </>
            ) : (
              <span>Başvurmak için giriş yapman gerekiyor.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-200/60 transition-colors"
            >
              Kapat
            </button>

            {/*
              Önizlemedeki düğme de kartla aynı gerçeği söylüyor: başvuru
              şirkete iletilmiyorsa "Gönderildi" yazmak yanıltıcı.
            */}
            {yol.resmiAdres && !yol.teslimEdiliyor && (
              <a
                href={yol.resmiAdres}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all"
              >
                <span>{yol.anaEtiket}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {hasApplied ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{yol.teslimEdiliyor ? 'Başvurunuz Gönderildi' : 'Takip listende'}</span>
              </span>
            ) : (
              <button
                id="modal-submit-apply-btn"
                onClick={() => onApply(customLetter)}
                title={yol.ozet}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold shadow-xs transition-all ${
                  yol.teslimEdiliyor
                    ? 'text-white bg-blue-600 hover:bg-blue-700'
                    : 'text-gray-800 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {yol.teslimEdiliyor
                    ? `Staja Başvur (%${match.overallScore} Eşleşme ile)`
                    : 'Başvurduğumu işaretle'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
