/*
  PARK EDİLDİ — ÖLÜ KOD DEĞİL.

  Bu dosyayı şu an hiçbir yer import etmiyor. Bilerek: ileride açılacak.

  Durmasının maliyeti yok (ölçüldü): import edilmediği için Rollup paketten
  eliyor, dist içinde tek satırı geçmiyor. Buna karşılık `tsc --noEmit`
  dosyayı kontrol etmeye devam ediyor — yani çevresindeki tipler değişirse
  burası da kırılır ve çürüdüğü sessizce anlaşılmaz.

  Silmeden önce sor: bu özellik gerçekten rafa mı kalktı?
*/
import { analyzeGap } from '../lib/gapAnalysis';
import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Lightbulb,
  Target,
  ArrowRight,
  Loader2,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
import { InternshipListing, StudentProfile } from '../types';

interface AiGapAnalysisModalProps {
  listing: InternshipListing | null;
  student: StudentProfile;
  onClose: () => void;
  onOpenCoverLetter: (listing: InternshipListing) => void;
}

interface GapData {
  readinessScore: number;
  overallSummary: string;
  strengths: string[];
  gaps: {
    skill: string;
    importance: string;
    howToBridge: string;
  }[];
  studyPlan7Days: string[];
  interviewAdvice: string;
  highlightProjectsIdea?: string;
}

export const AiGapAnalysisModal: React.FC<AiGapAnalysisModalProps> = ({
  listing,
  student,
  onClose,
  onOpenCoverLetter,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GapData | null>(null);

  useEffect(() => {
    if (!listing) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Yerel analiz — matchingEngine çıktısından türetiliyor.
    const timer = setTimeout(() => {
      if (!isMounted) return;
      try {
        setData(analyzeGap(student, listing));
      } catch (err) {
        console.error('Gap analysis failed:', err);
        setError('Analiz oluşturulamadı.');
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [listing, student]);

  if (!listing) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                Beceri Boşluğu & Öğrenme Yol Haritası
              </h2>
              <p className="text-xs text-gray-500">
                {student.fullName} ➔ {listing.companyName} ({listing.title})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-gray-900">
                  Profiliniz ilanla karşılaştırılıyor...
                </p>
                <p className="text-xs text-gray-500 max-w-sm">
                  Özgeçmişinizdeki teknolojiler ile {listing.companyName} gereksinimleri karşılaştırılıyor ve 7 günlük hızlandırılmış çalışma planı hazırlanıyor.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs">
              <p className="font-bold">Hata oluştu:</p>
              <p>{error}</p>
            </div>
          )}

          {!loading && data && (
            <div className="space-y-6">
              {/* Readiness Score Card */}
              <div className="bg-gray-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Staj Hazırlık & Uyum Skoru
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-white">
                    %{data.readinessScore || 85}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                  {data.overallSummary}
                </p>
              </div>

              {/* Strengths */}
              {data.strengths?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Öne Çıkan Güçlü Yetkinlikleriniz</span>
                  </h3>
                  <div className="space-y-2">
                    {data.strengths.map((st, i) => (
                      <div
                        key={i}
                        className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{st}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gaps & How to Bridge */}
              {data.gaps?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Geliştirilmesi Gereken Beceriler (Skill Gaps)</span>
                  </h3>
                  <div className="space-y-2.5">
                    {data.gaps.map((gap, i) => (
                      <div
                        key={i}
                        className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900">
                            ⚡ {gap.skill}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                            {gap.importance} Öncelik
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          <strong>Kapatma Yolu:</strong> {gap.howToBridge}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7-Day Fast Study Plan */}
              {data.studyPlan7Days?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>7 Günlük Hızlandırılmış Hazırlık Planı</span>
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2.5">
                    {data.studyPlan7Days.map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-gray-700">
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                          {i + 1}
                        </div>
                        <p className="pt-0.5 leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mini Project Recommendation */}
              {data.highlightProjectsIdea && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-blue-900 text-xs font-bold">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>Önerilen Portfolyo Mini Projesi</span>
                  </div>
                  <p className="text-xs text-blue-950 leading-relaxed">
                    {data.highlightProjectsIdea}
                  </p>
                </div>
              )}

              {/* Interview advice */}
              {data.interviewAdvice && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-900 text-xs font-bold">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>{listing.companyName} İçin Mülakat Tüyosu</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {data.interviewAdvice}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-200/60 transition-colors"
          >
            Kapat
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenCoverLetter(listing);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bu İlan İçin Motivasyon Mektubu Yaz</span>
          </button>
        </div>
      </div>
    </div>
  );
};
