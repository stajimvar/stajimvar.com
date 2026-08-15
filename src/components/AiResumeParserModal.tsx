import { parseResume } from '../lib/resumeParser';
import React, { useState } from 'react';
import {
  X,
  Sparkles,
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { StudentProfile, StudentSkill } from '../types';

interface AiResumeParserModalProps {
  onClose: () => void;
  onUpdateProfile: (extracted: Partial<StudentProfile>) => void;
}

export const AiResumeParserModal: React.FC<AiResumeParserModalProps> = ({
  onClose,
  onUpdateProfile,
}) => {
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);

  const sampleResume = `Marmara Üniversitesi Bilgisayar Mühendisliği 3. sınıf öğrencisiyim. GPA: 3.52.
Frontend tarafında React, TypeScript, Tailwind CSS ve Redux Toolkit ile modern arayüzler geliştiriyorum.
Backend tarafında Node.js, Express ve PostgreSQL ile RESTful API'lar kurdum.
GitHub üzerinde 5+ açık kaynak projem bulunuyor. Git ve Docker temellerine hakimim.
Zorunlu yaz stajı arayışındayım.`;

  const handleParse = async () => {
    if (!resumeText.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Yerel ayrıştırma — sunucuya gitmiyor. Yine de kısa bir gecikme
      // bırakıyoruz ki arayüz anlık zıplamasın.
      await new Promise((r) => setTimeout(r, 250));
      const parsed = parseResume(resumeText);

      setExtractedData({
        fullName: parsed.fullName.value,
        university: parsed.university.value,
        department: parsed.department.value,
        graduationYear: parsed.graduationYear.value,
        gpa: parsed.gpa.value,
        email: parsed.email.value,
        githubUsername: parsed.githubUsername.value,
        linkedinUrl: parsed.linkedinUrl.value,
        bio: parsed.bio,
        skills: parsed.skills,
        softSkills: parsed.softSkills,
        languages: parsed.languages,
        projects: parsed.projects,
        targetRoles: parsed.targetRoles,
        recommendedNextSteps: parsed.recommendedNextSteps,
        needsReview: parsed.needsReview,
      });
    } catch (err) {
      console.error(err);
      setError('CV metni okunamadı. Farklı bir biçimde yapıştırmayı dene.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToProfile = () => {
    if (!extractedData) return;

    const formattedSkills: StudentSkill[] = (extractedData.skills || []).map((s: any) => ({
      name: typeof s === 'string' ? s : s.name,
      level: s.level || 'Intermediate',
      category: s.category || 'General',
      verified: false,
    }));

    onUpdateProfile({
      fullName: extractedData.fullName || 'Öğrenci',
      university: extractedData.university || 'Üniversite',
      department: extractedData.department || 'Mühendislik',
      gpa: extractedData.gpa || 3.5,
      bio: extractedData.bio || resumeText.slice(0, 180),
      skills: formattedSkills.length > 0 ? formattedSkills : undefined,
      targetRoles: extractedData.targetRoles || ['Software Engineering Intern'],
      projects: extractedData.projects?.map((p: any, idx: number) => ({
        id: `proj-ai-${Date.now()}-${idx}`,
        title: p.title || 'Proje',
        description: p.description || '',
        techStack: p.techStack || ['React'],
      })),
    });

    onClose();
  };

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
                CV & Yetenek Ayrıştırıcı
              </h2>
              <p className="text-xs text-gray-500">
                Özgeçmiş metnini yapıştırın, yeteneklerinizi ve profilinizi saniyeler içinde çıkaralım.
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
        <div className="p-6 space-y-4">
          {!extractedData ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">
                  CV / Özgeçmiş Metni veya LinkedIn Özeti
                </label>
                <button
                  onClick={() => setResumeText(sampleResume)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Örnek Metin Doldur
                </button>
              </div>

              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Özgeçmişinizi buraya yapıştırın (Üniversite, Bölüm, Kullandığınız diller ve kütüphaneler, projeler...)"
                rows={8}
                className="w-full text-xs sm:text-sm p-4 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 bg-white"
              />

              {error && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs">
                  {error}
                </div>
              )}

              <button
                onClick={handleParse}
                disabled={loading || !resumeText.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>CV metni taranıyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Yeteneklerimi Çıkar ve Analiz Et</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Extracted Data Preview */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>CV Başarıyla Ayrıştırıldı!</span>
                </p>
                <p>
                  Aşağıdaki bilgileri onaylayarak profilinizi ve staj eşleşme algoritmasını anında güncelleyebilirsiniz.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">Ad Soyad:</span>
                    <p className="font-bold text-gray-900">{extractedData.fullName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Üniversite & Bölüm:</span>
                    <p className="font-bold text-gray-900">
                      {extractedData.university} • {extractedData.department}
                    </p>
                  </div>
                </div>

                {/* Skills found */}
                <div>
                  <span className="text-gray-500 font-medium">Tespit Edilen Yetenekler:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {extractedData.skills?.map((s: any, i: number) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-800 font-medium text-xs"
                      >
                        {typeof s === 'string' ? s : `${s.name} (${s.level})`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Target roles */}
                {extractedData.targetRoles?.length > 0 && (
                  <div>
                    <span className="text-gray-500 font-medium">Önerilen Staj Rolleri:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {extractedData.targetRoles.map((r: string, i: number) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-100"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-200/60 transition-colors"
          >
            Vazgeç
          </button>

          {extractedData && (
            <button
              onClick={handleApplyToProfile}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
            >
              <span>Profilime Uygula ve Eşleşmeleri Yenile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
