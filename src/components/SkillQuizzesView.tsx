import React, { useEffect, useState } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import { SkillQuiz, StudentProfile } from '../types';

/**
 * Yetenek doğrulama testleri.
 *
 * Önceki hali her testi ayrı bir karta koyuyordu: başlık, "Hazır" rozeti,
 * her testte aynı olan bir açıklama cümlesi, üç parçalı bilgi satırı ve tam
 * genişlikte mavi bir düğme. Telefonda tek teste bir ekranın üçte biri
 * gidiyordu ve on iki test birbirinin aynısı görünüyordu.
 *
 * Artık her test tek satır ve satırın tamamı düğme — dokununca test başlıyor.
 * Tekrarlanan açıklama kaldırıldı; her testte aynı olan bir cümle bilgi
 * taşımıyor, yalnızca yer kaplıyordu.
 */

interface SkillQuizzesViewProps {
  quizzes: SkillQuiz[];
  student: StudentProfile;
  subTab?: string;
  onSubTabChange?: (subTab: string) => void;
  onStartQuiz: (quiz: SkillQuiz) => void;
}

interface Kategori {
  id: string;
  emoji: string;
  ad: string;
}

const KATEGORILER: Kategori[] = [
  { id: 'hard_skills', emoji: '🛠️', ad: 'Teknik yetenekler' },
  { id: 'soft_skills', emoji: '🤝', ad: 'Sosyal beceriler' },
  { id: 'languages', emoji: '🌍', ad: 'Yabancı diller' },
];

/* Arama kutusu az sayıda testte yalnızca yer kaplıyor. */
const ARAMA_ESIGI = 8;

export const SkillQuizzesView: React.FC<SkillQuizzesViewProps> = ({
  quizzes,
  student,
  subTab = 'all',
  onStartQuiz,
}) => {
  const [kapali, setKapali] = useState<Record<string, boolean>>({});
  const [arama, setArama] = useState('');

  /* Başlıktaki alt menüden bir kategori seçilirse yalnızca o açık kalsın. */
  useEffect(() => {
    if (subTab && subTab !== 'all' && subTab !== 'earned') {
      setKapali({
        hard_skills: subTab !== 'hard_skills',
        soft_skills: subTab !== 'soft_skills',
        languages: subTab !== 'languages',
      });
    } else {
      setKapali({});
    }
  }, [subTab]);

  const kazanildi = (quiz: SkillQuiz) => student.earnedBadges?.includes(quiz.id) ?? false;

  const kategoriTestleri = (katId: string) =>
    quizzes.filter((quiz) => {
      if (quiz.category !== katId) return false;
      if (subTab === 'earned' && !kazanildi(quiz)) return false;
      if (arama.trim()) {
        const q = arama.toLocaleLowerCase('tr');
        const eslesme =
          quiz.badgeName.toLocaleLowerCase('tr').includes(q) ||
          quiz.skillName.toLocaleLowerCase('tr').includes(q);
        if (!eslesme) return false;
      }
      return true;
    });

  const toplam = quizzes.length;
  const kazanilan = quizzes.filter(kazanildi).length;
  const oran = toplam > 0 ? Math.round((kazanilan / toplam) * 100) : 0;

  const tonu =
    kazanilan === 0 ? 'Bir testle başla'
      : kazanilan === toplam ? 'Hepsini topladın 🎉'
      : `${kazanilan} rozetin var`;

  return (
    <div className="max-w-3xl mx-auto space-y-3 pb-16 animate-in fade-in duration-200">
      {/* ---------------- Üst kart ---------------- */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-lg font-bold text-gray-900">{tonu}</h1>
          <span className="text-xs font-bold text-gray-500 tabular-nums">
            {kazanilan}/{toplam}
          </span>
        </div>

        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              kazanilan === toplam && toplam > 0 ? 'bg-emerald-500' : 'bg-blue-600'
            }`}
            style={{ width: `${oran}%` }}
          />
        </div>

        <p className="text-xs text-gray-500">
          5 soruluk kısa testler, yaklaşık 5 dakika. 3 doğru yeterli — geçtiğinde
          o yeteneğin yanında doğrulanmış işareti çıkıyor.
        </p>
      </div>

      {/* ---------------- Arama ---------------- */}
      {toplam >= ARAMA_ESIGI && (
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Test ara"
            className="w-full pl-10 pr-10 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-medium text-gray-900 focus:outline-none focus:border-blue-600"
          />
          {arama && (
            <button
              type="button"
              onClick={() => setArama('')}
              aria-label="Aramayı temizle"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* ---------------- Kategoriler ---------------- */}
      {KATEGORILER.map((kategori) => {
        if (subTab !== 'all' && subTab !== 'earned' && subTab !== kategori.id) return null;

        const testler = kategoriTestleri(kategori.id);
        if (arama.trim() && testler.length === 0) return null;

        const acik = !kapali[kategori.id];
        const katKazanilan = testler.filter(kazanildi).length;
        const hepsiTamam = testler.length > 0 && katKazanilan === testler.length;

        return (
          <section
            key={kategori.id}
            id={`accordion-${kategori.id}`}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden scroll-mt-28"
          >
            <button
              type="button"
              onClick={() => setKapali((p) => ({ ...p, [kategori.id]: acik }))}
              aria-expanded={acik}
              className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <span
                aria-hidden
                className="w-10 h-10 shrink-0 rounded-xl bg-gray-100 flex items-center justify-center text-lg"
              >
                {kategori.emoji}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-900 text-sm sm:text-base">
                    {kategori.ad}
                  </span>
                  {hepsiTamam && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                </span>
                <span className="block text-xs text-gray-500">
                  {testler.length} test
                  {katKazanilan > 0 && ` · ${katKazanilan} rozet kazanıldı`}
                </span>
              </span>

              <ChevronDown
                className={`w-5 h-5 shrink-0 text-gray-400 transition-transform ${acik ? 'rotate-180' : ''}`}
              />
            </button>

            {acik && (
              <div className="border-t border-gray-100">
                {testler.length === 0 ? (
                  <p className="px-4 py-5 text-xs text-gray-600">
                    Bu grupta gösterilecek test yok.
                  </p>
                ) : (
                  <ul>
                    {testler.map((quiz) => {
                      const bitti = kazanildi(quiz);
                      return (
                        <li key={quiz.id} className="border-b border-gray-50 last:border-b-0">
                          {/*
                            Satırın tamamı düğme: eskiden karttaki ayrı bir
                            "Testi Başlat" düğmesine dokunmak gerekiyordu.
                          */}
                          <button
                            id={`start-quiz-btn-${quiz.id}`}
                            type="button"
                            onClick={() => onStartQuiz(quiz)}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer hover:bg-blue-50/60 transition-colors"
                          >
                            <span
                              className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
                                bitti ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                              }`}
                            >
                              {bitti ? (
                                <CheckCircle2 className="w-4.5 h-4.5" />
                              ) : (
                                <Award className="w-4.5 h-4.5" />
                              )}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold text-sm text-gray-900 truncate">
                                {quiz.skillName}
                              </span>
                              <span className="block text-xs text-gray-500">
                                {bitti
                                  ? 'Rozet kazanıldı · tekrar çözebilirsin'
                                  : `${quiz.questions.length} soru · ~5 dk`}
                              </span>
                            </span>

                            <ChevronRight className="w-5 h-5 shrink-0 text-gray-300" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}

      {arama.trim() && KATEGORILER.every((k) => kategoriTestleri(k.id).length === 0) && (
        <p className="text-center text-xs text-gray-600 py-6">
          "{arama}" için test bulunamadı.
        </p>
      )}
    </div>
  );
};
