import React, { useState } from 'react';
import {
  X,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trophy,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SkillQuiz, StudentProfile } from '../types';
import { GoogleAdBanner } from './GoogleAdBanner';

interface SkillAssessmentModalProps {
  quiz: SkillQuiz | null;
  student: StudentProfile;
  onClose: () => void;
  onEarnBadge: (badgeId: string, skillName: string) => void;
}

export const SkillAssessmentModal: React.FC<SkillAssessmentModalProps> = ({
  quiz,
  student,
  onClose,
  onEarnBadge,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  if (!quiz) return null;

  const currentQ = quiz.questions[currentQuestionIndex];
  const isPassed = correctAnswersCount >= Math.ceil(quiz.questions.length * 0.6);

  const handleSelectOption = (idx: number) => {
    if (showExplanation) return;
    setSelectedOption(idx);
  };

  const handleConfirmAnswer = () => {
    if (selectedOption === null) return;

    const isCorrect = selectedOption === currentQ.correctIndex;
    if (isCorrect) {
      setCorrectAnswersCount((prev) => prev + 1);
    }
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < quiz.questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setQuizFinished(true);
      if (
        (correctAnswersCount + (selectedOption === currentQ.correctIndex ? 1 : 0)) >=
        Math.ceil(quiz.questions.length * 0.6)
      ) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        onEarnBadge(quiz.id, quiz.skillName);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="relative bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                {quiz.skillName} Yetenek Doğrulama Testi
              </h2>
              <p className="text-xs text-gray-500">
                Soru {currentQuestionIndex + 1} / {quiz.questions.length} • {quiz.badgeName}
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
          {!quizFinished ? (
            <div className="space-y-4">
              {/* Question text */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <h3 className="font-bold text-gray-900 text-sm leading-relaxed">
                  {currentQ.question}
                </h3>
                {currentQ.codeSnippet && (
                  <pre className="p-3 bg-gray-900 text-blue-300 rounded-xl text-xs font-mono overflow-x-auto">
                    <code>{currentQ.codeSnippet}</code>
                  </pre>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2">
                {currentQ.options.map((option, idx) => {
                  let optionClass = 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700';

                  if (showExplanation) {
                    if (idx === currentQ.correctIndex) {
                      optionClass = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold';
                    } else if (idx === selectedOption) {
                      optionClass = 'border-rose-300 bg-rose-50 text-rose-900';
                    }
                  } else if (selectedOption === idx) {
                    optionClass = 'border-blue-600 bg-blue-50 text-blue-950 font-bold';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={showExplanation}
                      className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-2 ${optionClass}`}
                    >
                      <span>{option}</span>
                      {showExplanation && idx === currentQ.correctIndex && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      {showExplanation && idx === selectedOption && idx !== currentQ.correctIndex && (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation box */}
              {showExplanation && (
                <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-950 space-y-1 animate-in fade-in duration-150">
                  <p className="font-bold flex items-center gap-1 text-blue-900">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Açıklama:</span>
                  </p>
                  <p className="leading-relaxed">{currentQ.explanation}</p>
                </div>
              )}
            </div>
          ) : (
            /* Results Screen */
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Trophy className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-gray-900">
                  {isPassed ? 'Tebrikler! Rozet Kazanıldı 🎉' : 'Test Tamamlandı'}
                </h3>
                <p className="text-xs text-gray-600">
                  {quiz.questions.length} sorudan {correctAnswersCount} doğru yanıt verdiniz.
                </p>
              </div>

              {isPassed ? (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-2 max-w-md mx-auto">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-sm text-emerald-950">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>"{quiz.badgeName}" Profilinize Eklendi!</span>
                  </div>
                  <p>
                    Artık staj başvurularınızda şirketler bu yetkinliğinizi doğrulanmış (Verified) olarak görecek ve eşleşme puanınız artacaktır.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Rozeti kazanmak için soruların en az %60'ına doğru yanıt vermelisiniz. İstediğiniz zaman tekrar deneyebilirsiniz!
                </p>
              )}

              {/* Contextual Career & Education Ad on Quiz Results */}
              <div className="pt-2">
                <GoogleAdBanner format="modal-footer" />
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
            Kapat
          </button>

          {!quizFinished ? (
            !showExplanation ? (
              <button
                onClick={handleConfirmAnswer}
                disabled={selectedOption === null}
                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                Cevabı Onayla
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
              >
                <span>{currentQuestionIndex + 1 === quiz.questions.length ? 'Sonuçları Gör' : 'Sıradaki Soru'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Tamam
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
