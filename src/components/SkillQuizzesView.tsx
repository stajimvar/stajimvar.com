import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Globe,
  Wrench,
  Users,
  Search,
  Sparkles,
  Layers,
  HelpCircle,
  Clock,
  BookOpen,
} from 'lucide-react';
import { SkillQuiz, StudentProfile } from '../types';

interface SkillQuizzesViewProps {
  quizzes: SkillQuiz[];
  student: StudentProfile;
  subTab?: string;
  onSubTabChange?: (subTab: string) => void;
  onStartQuiz: (quiz: SkillQuiz) => void;
}

interface CategoryConfig {
  id: string;
  name: string;
  iconName: 'Wrench' | 'Users' | 'Globe';
  emoji: string;
  description: string;
  colorScheme: {
    bg: string;
    border: string;
    badge: string;
    iconColor: string;
  };
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'hard_skills',
    name: '1. Teknik & Mesleki Yetenekler (Hard Skills)',
    iconName: 'Wrench',
    emoji: '🛠️',
    description: 'Yazılım & Bilişim, Tasarım, Mühendislik ve İşletme/Excel araçları ve programlama dilleri.',
    colorScheme: {
      bg: 'bg-blue-50/60',
      border: 'border-blue-200',
      badge: 'bg-blue-100 text-blue-800',
      iconColor: 'text-blue-600',
    },
  },
  {
    id: 'soft_skills',
    name: '2. Sosyal & Kişisel Beceriler (Soft Skills)',
    iconName: 'Users',
    emoji: '🤝',
    description: 'Problem çözme, analitik düşünme, ekip çalışması, zaman yönetimi ve sunum becerileri.',
    colorScheme: {
      bg: 'bg-indigo-50/60',
      border: 'border-indigo-200',
      badge: 'bg-indigo-100 text-indigo-800',
      iconColor: 'text-indigo-600',
    },
  },
  {
    id: 'languages',
    name: '3. Yabancı Diller (Language Skills)',
    iconName: 'Globe',
    emoji: '🌐',
    description: 'İngilizce, Almanca, Rusça vb. global staj, Erasmus+ ve kurumsal çalışma mülakat yetkinlikleri.',
    colorScheme: {
      bg: 'bg-teal-50/60',
      border: 'border-teal-200',
      badge: 'bg-teal-100 text-teal-800',
      iconColor: 'text-teal-600',
    },
  },
];

export const SkillQuizzesView: React.FC<SkillQuizzesViewProps> = ({
  quizzes,
  student,
  subTab = 'all',
  onSubTabChange,
  onStartQuiz,
}) => {
  // State for which accordions are expanded (all expanded by default for immediate discoverability)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    hard_skills: true,
    soft_skills: true,
    languages: true,
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Auto-expand and filter if subTab changes from header
  useEffect(() => {
    if (subTab && subTab !== 'all' && subTab !== 'earned') {
      setExpandedCategories({
        hard_skills: subTab === 'hard_skills',
        soft_skills: subTab === 'soft_skills',
        languages: subTab === 'languages',
      });
    } else if (subTab === 'all' || subTab === 'earned') {
      setExpandedCategories({
        hard_skills: true,
        soft_skills: true,
        languages: true,
      });
    }
  }, [subTab]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const expandAll = () => {
    setExpandedCategories({
      hard_skills: true,
      soft_skills: true,
      languages: true,
    });
  };

  const collapseAll = () => {
    setExpandedCategories({
      hard_skills: false,
      soft_skills: false,
      languages: false,
    });
  };

  // Filter quizzes by search query and subTab
  const getFilteredQuizzesForCategory = (catId: string) => {
    return quizzes.filter((quiz) => {
      // Category match
      if (quiz.category !== catId) return false;

      // SubTab filter
      if (subTab === 'earned') {
        const isEarned = student.earnedBadges?.includes(quiz.id);
        if (!isEarned) return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = quiz.badgeName.toLowerCase().includes(query);
        const matchesSkill = quiz.skillName.toLowerCase().includes(query);
        if (!matchesName && !matchesSkill) return false;
      }

      return true;
    });
  };

  const totalQuizzesCount = quizzes.length;
  const totalEarnedCount = student.earnedBadges?.length || 0;

  // Category Icon Renderer
  const renderCategoryIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case 'Globe':
        return <Globe className={className} />;
      case 'Wrench':
        return <Wrench className={className} />;
      case 'Users':
        return <Users className={className} />;
      default:
        return <Award className={className} />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Yetenek Doğrulama Sistemi
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
            Kategori Bazlı Beceri Rozetleri ile Staj Başvurularında Öne Çıkın
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
            Her yetenek grubu için özel hazırlanan <strong>5 soruluk mini testleri</strong> (~5 dakika) tamamlayarak profilinize doğrulanmış onay rozeti ekleyin. Şirketler doğrulanmış becerilere sahip adayları ilk sırada listeler.
          </p>
        </div>

        {/* Global Scorecard */}
        <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-4 shrink-0 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-xs">
            ✓
          </div>
          <div>
            <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">Kazanılan Rozetler</span>
            <p className="text-xl font-black text-emerald-950 dark:text-emerald-100">
              {totalEarnedCount} <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">/ {totalQuizzesCount} Doğrulandı</span>
            </p>
            <div className="w-32 bg-emerald-200/80 dark:bg-emerald-900/60 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 dark:bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${totalQuizzesCount > 0 ? (totalEarnedCount / totalQuizzesCount) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Accordion Toggles */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-2xs">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Yetenek veya test adı ara (örn: React, Python, English)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Accordion Expand / Collapse Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            Tümünü Aç
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            Tümünü Daralt
          </button>
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-4">
        {CATEGORIES.map((category) => {
          const categoryQuizzes = getFilteredQuizzesForCategory(category.id);
          const isExpanded = expandedCategories[category.id] ?? true;

          // Calculate earned badges for this specific category
          const earnedInCategory = categoryQuizzes.filter((q) =>
            student.earnedBadges?.includes(q.id)
          ).length;

          // If subtab is active for other category or no results in search, hide or show empty
          if (subTab !== 'all' && subTab !== 'earned' && subTab !== category.id) {
            return null;
          }

          return (
            <div
              key={category.id}
              id={`accordion-${category.id}`}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all"
            >
              {/* Accordion Header Button */}
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-gray-50/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                  {/* Category Themed Icon */}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border dark:bg-slate-800 dark:border-slate-700 ${category.colorScheme.bg} ${category.colorScheme.border}`}
                  >
                    <span className="text-xl">{category.emoji}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                        {category.name}
                      </h2>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                        {categoryQuizzes.length} Test • 5 Soru / Test
                      </span>

                      {earnedInCategory > 0 && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{earnedInCategory} / {categoryQuizzes.length} Kazanıldı</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                      {category.description}
                    </p>
                  </div>
                </div>

                {/* Toggle Chevron */}
                <div className="p-2 rounded-full hover:bg-gray-200/60 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors shrink-0 ml-2">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {/* Accordion Body: Tests List */}
              {isExpanded && (
                <div className="px-4 sm:px-6 pb-5 pt-2 border-t border-gray-100 dark:border-slate-800 bg-gray-50/40 dark:bg-slate-900/40">
                  {categoryQuizzes.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-500 dark:text-slate-400 font-medium">
                      Bu kategoride arama kriterlerinize uygun test bulunamadı.
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      {categoryQuizzes.map((quiz) => {
                        const isEarned = student.earnedBadges?.includes(quiz.id);

                        return (
                          <div
                            key={quiz.id}
                            id={`quiz-item-${quiz.id}`}
                            className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800/80 ${
                              isEarned
                                ? 'border-emerald-200 dark:border-emerald-800/60 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700'
                                : 'border-gray-200 dark:border-slate-700/80 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xs'
                            }`}
                          >
                            {/* Left: Test Info */}
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                                  isEarned
                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold'
                                    : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300'
                                }`}
                              >
                                {isEarned ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                )}
                              </div>

                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm sm:text-base">
                                    {quiz.badgeName}
                                  </h3>
                                  {isEarned ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                      <span>Kazanıldı</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                                      <span>Hazır</span>
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                                  {quiz.skillName} alanında temel ve ileri düzey kavramları ölçen değerlendirme.
                                </p>

                                <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-slate-500 pt-0.5">
                                  <span className="flex items-center gap-1">
                                    <HelpCircle className="w-3 h-3 text-gray-400 dark:text-slate-500" />
                                    {quiz.questions.length} Soru
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-gray-400 dark:text-slate-500" />
                                    ~5 Dakika
                                  </span>
                                  <span>•</span>
                                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                    Geçme Notu: 3/5 Doğru
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right: Action Button */}
                            <div className="flex items-center sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-slate-800">
                              <button
                                id={`start-quiz-btn-${quiz.id}`}
                                onClick={() => onStartQuiz(quiz)}
                                className={`w-full sm:w-auto px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${
                                  isEarned
                                    ? 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 hover:text-blue-600 dark:hover:text-blue-300'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                                }`}
                              >
                                <span>{isEarned ? 'Tekrar Çöz' : 'Testi Başlat'}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
