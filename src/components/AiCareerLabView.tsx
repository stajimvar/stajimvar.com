/*
  PARK EDİLDİ — ÖLÜ KOD DEĞİL.

  Bu dosyayı şu an hiçbir yer import etmiyor. Bilerek: ileride açılacak.

  Durmasının maliyeti yok (ölçüldü): import edilmediği için Rollup paketten
  eliyor, dist içinde tek satırı geçmiyor. Buna karşılık `tsc --noEmit`
  dosyayı kontrol etmeye devam ediyor — yani çevresindeki tipler değişirse
  burası da kırılır ve çürüdüğü sessizce anlaşılmaz.

  Silmeden önce sor: bu özellik gerçekten rafa mı kalktı?
*/
import React from 'react';
import {
  Sparkles,
  FileText,
  MessageSquareCode,
  Target,
  ArrowRight,
} from 'lucide-react';
import { StudentProfile, InternshipListing } from '../types';

interface AiCareerLabViewProps {
  student: StudentProfile;
  allListings: InternshipListing[];
  onOpenResumeParser: () => void;
  onOpenGapAnalysis: (listing: InternshipListing) => void;
  onOpenCoverLetter: (listing: InternshipListing) => void;
  onOpenMockInterview: (listing: InternshipListing) => void;
}

export const AiCareerLabView: React.FC<AiCareerLabViewProps> = ({
  student,
  allListings,
  onOpenResumeParser,
  onOpenGapAnalysis,
  onOpenCoverLetter,
  onOpenMockInterview,
}) => {
  const topListing = allListings[0];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 text-white rounded-3xl p-6 sm:p-8 border border-gray-800 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-400/30">
            <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
            <span>Kariyer Laboratuvarı</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Staj Başvurularınızı <span className="text-orange-400">Araçlarla</span> Güçlendirin
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
            Yapay zeka asistanımız özgeçmişinizi analiz eder, staj ilanlarındaki eksik becerilerinizi tespit edip 7 günlük hızlandırılmış öğrenme planı ve şirkete özel motivasyon mektupları hazırlar.
          </p>
        </div>

        {/* Ambient Decorative Orange Glow */}
        <div className="absolute top-[-30px] right-[-30px] w-48 h-48 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-20px] left-[-20px] w-36 h-36 bg-orange-600/15 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 4 çekirdek modül */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Modül 1: CV ayrıştırıcı */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between space-y-5 group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base group-hover:text-orange-600 transition-colors">
                CV & Yetenek Ayrıştırıcı
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Herhangi bir formattaki CV metnini veya LinkedIn özetinizi yapıştırın. Yapay zeka tüm teknik becerilerinizi, projelerinizi ve seviyenizi otomatik olarak profilinize aktarsın.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenResumeParser}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-xs font-bold text-orange-700 transition-colors border border-orange-100"
          >
            <span>CV'mi Analiz Et</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module 2: Skill Gap & Learning Roadmap */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between space-y-5 group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 group-hover:scale-105 transition-transform">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base group-hover:text-orange-600 transition-colors">
                Yetenek Boşluğu & 7 Günlük Plan
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Hedeflediğiniz bir staj için sahip olduğunuz beceriler ile şirketin aradığı gereksinimleri kıyaslayın. 1 hafta içinde eksikleri kapatacak mikro yol haritası alın.
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenGapAnalysis(topListing)}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-xs font-bold text-orange-700 transition-colors border border-orange-100"
          >
            <span>Örnek İlanla Analiz Başlat ({topListing?.companyName})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module 3: Mock Interview Coach */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between space-y-5 group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 group-hover:scale-105 transition-transform">
              <MessageSquareCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base group-hover:text-orange-600 transition-colors">
                Mülakat Prova Aracı
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Şirketlerin teknik ve İK mülakatlarında sorduğu gerçekçi soruları yanıtlayın. Yapay zeka cevaplarınızı 100 üzerinden puanlayıp altın değerinde geri bildirim versin.
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenMockInterview(topListing)}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-xs font-bold text-orange-700 transition-colors border border-orange-100"
          >
            <span>Mülakat Provası Başlat</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module 4: Tailored Cover Letter Builder */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between space-y-5 group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base group-hover:text-orange-600 transition-colors">
                Kişiselleştirilmiş Motivasyon Mektubu
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Klişe metinleri unutun. Başvuracağınız şirketin sektörüne ve aradığı teknolojiye göre sizin projelerinizi öne çıkaran etkileyici bir staj ön yazısı oluşturun.
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenCoverLetter(topListing)}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-xs font-bold text-orange-700 transition-colors border border-orange-100"
          >
            <span>Ön Yazı Oluştur</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
