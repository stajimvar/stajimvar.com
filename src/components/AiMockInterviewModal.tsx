import {
  buildInterviewSession,
  analyzeAnswerStructure,
  type InterviewQuestion,
} from '../lib/interviewCoach';
import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquareCode,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trophy,
  RotateCcw,
} from 'lucide-react';
import { InternshipListing, StudentProfile } from '../types';

interface AiMockInterviewModalProps {
  listing: InternshipListing | null;
  student: StudentProfile;
  onClose: () => void;
}

interface Message {
  sender: 'ai' | 'user';
  text: string;
  feedback?: {
    score: number;
    strengths: string;
    improvements: string;
    tip: string;
  };
  tips?: string[];
  type?: string;
}

export const AiMockInterviewModal: React.FC<AiMockInterviewModalProps> = ({
  listing,
  student,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [session, setSession] = useState<InterviewQuestion[]>([]);
  const [answerScores, setAnswerScores] = useState<number[]>([]);

  const startInterview = async () => {
    if (!listing) return;
    setLoading(true);
    setMessages([]);
    setCurrentQuestionIndex(0);
    setAnswerScores([]);
    setInterviewComplete(false);

    try {
      const questions = buildInterviewSession(listing, 5);
      setSession(questions);
      await new Promise((r) => setTimeout(r, 200));

      const first = questions[0];
      setMessages([
        {
          sender: 'ai',
          text: `Merhaba ${student.fullName}! ${listing.companyName} bünyesindeki ${listing.title} stajı için mülakat provasına hoş geldin.\n\nSoruları sesli cevaplıyormuş gibi yaz. Cevaplarının yapısını değerlendireceğim — içeriğin doğruluğunu değil.\n\nİlk Soru: ${first.question}`,
          tips: first.idealAnswerPoints,
          type: first.type,
        },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listing) {
      startInterview();
    }
  }, [listing]);

  const handleSendAnswer = async () => {
    if (!userInput.trim() || loading || !listing) return;

    const answer = userInput.trim();
    setUserInput('');

    // Append user message
    const newMessages: Message[] = [...messages, { sender: 'user', text: answer }];
    setMessages(newMessages);
    setLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 200));

      const currentQ = session[currentQuestionIndex];
      const analysis = analyzeAnswerStructure(answer, currentQ);

      // Modal'ın beklediği feedback şekline uyarla.
      const feedback = {
        score: analysis.score,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        tip: analysis.tip,
        label: analysis.label,
        signals: analysis.signals,
      };

      const nextIdx = currentQuestionIndex + 1;
      const nextQ = session[nextIdx];

      if (!nextQ) {
        setInterviewComplete(true);
        const scores = [...answerScores, analysis.score];
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        setAnswerScores(scores);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `Prova tamamlandı. ${scores.length} cevabının ortalama yapı puanı: ${avg}/100.\n\nUnutma: bu puan cevaplarının doğruluğunu değil, nasıl kurgulandığını ölçüyor. Gerçek mülakatta içerik de değerlendirilecek.`,
            feedback,
          },
        ]);
      } else {
        setAnswerScores((prev) => [...prev, analysis.score]);
        setCurrentQuestionIndex(nextIdx);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `Soru ${nextIdx + 1}: ${nextQ.question}`,
            feedback,
            tips: nextQ.idealAnswerPoints,
            type: nextQ.type,
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
              <MessageSquareCode className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                Mülakat Prova Aracı
              </h2>
              <p className="text-xs text-gray-500">
                {listing.companyName} • {listing.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={startInterview}
              className="p-2 rounded-full text-gray-500 hover:text-blue-600 hover:bg-gray-100 transition-colors"
              title="Yeniden Başlat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat / Interview Area */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-[360px]">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-2`}
            >
              {/* Önceki cevabın yapı analizi */}
              {msg.feedback && (
                <div className="w-full max-w-lg bg-emerald-50 rounded-xl p-4 border border-emerald-200 space-y-2 text-xs text-emerald-950 my-1 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span>Cevap Değerlendirmesi</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 font-bold text-emerald-900">
                      {msg.feedback.score} / 100 Puan
                    </span>
                  </div>
                  <p>
                    <strong>Güçlü Yönler:</strong> {msg.feedback.strengths}
                  </p>
                  {msg.feedback.improvements && (
                    <p className="text-gray-700">
                      <strong>Geliştirme Önerisi:</strong> {msg.feedback.improvements}
                    </p>
                  )}
                  {msg.feedback.tip && (
                    <p className="text-[11px] italic text-emerald-800">
                      💡 <strong>Mülakat Tüyosu:</strong> {msg.feedback.tip}
                    </p>
                  )}
                </div>
              )}

              {/* Message text */}
              <div
                className={`max-w-lg p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                    : 'bg-gray-50 text-gray-800 rounded-bl-none border border-gray-200'
                }`}
              >
                {msg.text}

                {/* Helpful tips for the student */}
                {msg.tips && msg.tips.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600 space-y-1">
                    <p className="font-bold text-gray-700 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                      <span>İdeal Cevapta Bulunması Gerekenler:</span>
                    </p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {msg.tips.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-500 italic p-3 bg-gray-50 rounded-xl w-fit border border-gray-200">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span>Mülakatçı cevabınızı inceliyor ve sıradaki soruyu hazırlıyor...</span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
          {!interviewComplete ? (
            <div className="flex items-center gap-2">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendAnswer();
                  }
                }}
                placeholder="Cevabınızı yazın... (Enter ile gönderin)"
                rows={2}
                disabled={loading}
                className="flex-1 text-xs sm:text-sm p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 bg-white resize-none"
              />
              <button
                onClick={handleSendAnswer}
                disabled={!userInput.trim() || loading}
                className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Simülasyon tamamlandı! Gerçek mülakata hazırsınız.</span>
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Kapat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
