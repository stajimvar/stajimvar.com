import React, { useState } from 'react';
import { X, CheckCircle2, Trophy, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SkillQuiz, StudentProfile } from '../types';
import { submitQuizAttempt, type QuizResult } from '../lib/queries';

/**
 * Yetenek doğrulama testi.
 *
 * NEDEN YENİDEN YAZILDI
 * ---------------------
 * Önceki hali puanı TARAYICIDA hesaplıyordu ve bunu yapabilmesi için doğru
 * cevapların uygulama paketinde bulunması gerekiyordu. Yani:
 *
 *   1. Paketi açan herkes tüm cevapları okuyabiliyordu.
 *   2. Rozet kazanmak için testi çözmeye bile gerek yoktu; `onEarnBadge`
 *      çağrısı istemcideydi.
 *
 * Artık cevaplar sunucuda kalıyor. Öğrenci yalnızca seçtiği şıkları
 * gönderiyor, puanı ve rozeti `submit_quiz_attempt` fonksiyonu veriyor.
 *
 * BUNUN UX MALİYETİ
 * -----------------
 * Soru başına anında "doğru/yanlış" geri bildirimi kalktı: doğru cevabı
 * göstermek, doğru cevabı istemciye göndermek demek — açığın kendisi buydu.
 * Artık tüm sorular cevaplanıyor, sonra tek seferde sonuç geliyor. Bilinen
 * ve kabul edilmiş bir takas.
 */

interface SkillAssessmentModalProps {
  quiz: SkillQuiz | null;
  student: StudentProfile;
  onClose: () => void;
  /** Sunucu rozeti verdikten sonra arayüzü tazelemek için. */
  onEarnBadge: (badgeId: string, skillName: string) => void;
}

export const SkillAssessmentModal: React.FC<SkillAssessmentModalProps> = ({
  quiz,
  onClose,
  onEarnBadge,
}) => {
  const [sira, setSira] = useState(0);
  const [secilen, setSecilen] = useState<number | null>(null);
  const [cevaplar, setCevaplar] = useState<Record<string, number>>({});
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [sonuc, setSonuc] = useState<QuizResult | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  if (!quiz) return null;

  const soru = quiz.questions[sira];
  const sonSoru = sira + 1 === quiz.questions.length;

  const ilerle = async () => {
    if (secilen === null) return;
    const yeniCevaplar = { ...cevaplar, [soru.id]: secilen };
    setCevaplar(yeniCevaplar);

    if (!sonSoru) {
      setSira((s) => s + 1);
      setSecilen(null);
      return;
    }

    setGonderiliyor(true);
    setHata(null);
    try {
      const r = await submitQuizAttempt(quiz.id, yeniCevaplar);
      setSonuc(r);
      if (r.gecti) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        onEarnBadge(quiz.id, quiz.skillName);
      }
    } catch (error) {
      setHata(error instanceof Error ? error.message : 'Sonuç kaydedilemedi.');
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="relative bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 truncate">{quiz.skillName}</h2>
            {!sonuc && (
              <p className="text-xs text-gray-500">
                Soru {sira + 1} / {quiz.questions.length}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!sonuc ? (
            <>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <h3 className="font-bold text-gray-900 text-sm leading-relaxed">{soru.question}</h3>
                {soru.codeSnippet && (
                  <pre className="p-3 bg-gray-900 text-blue-300 rounded-xl text-xs font-mono overflow-x-auto">
                    <code>{soru.codeSnippet}</code>
                  </pre>
                )}
              </div>

              <div className="space-y-2">
                {soru.options.map((secenek, i) => (
                  <button
                    key={i}
                    onClick={() => setSecilen(i)}
                    className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      secilen === i
                        ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span>{secenek}</span>
                    {secilen === i && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-gray-600">
                Sonuç tüm sorular cevaplandıktan sonra hesaplanır.
              </p>

              {hata && <p className="text-xs font-semibold text-rose-600">{hata}</p>}
            </>
          ) : (
            <div className="py-4 text-center space-y-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border ${
                  sonuc.gecti
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
              >
                <Trophy className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-gray-900">
                  {sonuc.gecti ? 'Rozeti kazandın 🎉' : 'Test tamamlandı'}
                </h3>
                <p className="text-sm text-gray-600">
                  {sonuc.toplam} sorudan <strong>{sonuc.dogru}</strong> doğru.
                </p>
              </div>

              {sonuc.gecti ? (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-2 max-w-md mx-auto">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-sm text-emerald-950">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>"{sonuc.rozet}" profiline eklendi</span>
                  </div>
                  <p>
                    Bu yeteneğin artık profilinde doğrulanmış olarak görünüyor ve eşleşme
                    puanına katkı sağlıyor.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Rozet için en az {sonuc.gecmeNotu} doğru gerekiyor. İstediğin zaman tekrar
                  deneyebilirsin.
                </p>
              )}

              <div className="pt-2">
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
          >
            Kapat
          </button>

          {!sonuc && (
            <button
              onClick={ilerle}
              disabled={secilen === null || gonderiliyor}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {gonderiliyor ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Değerlendiriliyor…</span>
                </>
              ) : (
                <>
                  <span>{sonSoru ? 'Testi bitir' : 'Sıradaki soru'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
