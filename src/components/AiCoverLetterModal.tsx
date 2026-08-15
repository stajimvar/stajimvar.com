import {
  generateCoverLetter,
  type LetterTone,
  type LetterLanguage,
} from '../lib/coverLetter';
import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Send,
  Loader2,
  FileText,
  Languages,
} from 'lucide-react';
import { InternshipListing, StudentProfile } from '../types';

interface AiCoverLetterModalProps {
  listing: InternshipListing | null;
  student: StudentProfile;
  onClose: () => void;
  onApplyWithLetter?: (letter: string) => void;
}

export const AiCoverLetterModal: React.FC<AiCoverLetterModalProps> = ({
  listing,
  student,
  onClose,
  onApplyWithLetter,
}) => {
  const [tone, setTone] = useState<'profesyonel' | 'samimi' | 'teknik'>('profesyonel');
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [letterText, setLetterText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeholderCount, setPlaceholderCount] = useState(0);
  const [tips, setTips] = useState<string[]>([]);

  const generateLetter = async () => {
    if (!listing) return;
    setLoading(true);
    setError(null);

    try {
      await new Promise((r) => setTimeout(r, 200));
      const result = generateCoverLetter(
        student,
        listing,
        tone as LetterTone,
        language as LetterLanguage,
      );
      setLetterText(result.text);
      setPlaceholderCount(result.placeholderCount);
      setTips(result.tips);
    } catch (err) {
      console.error(err);
      setError('Mektup taslağı oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listing) {
      generateLetter();
    }
  }, [listing, tone, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(letterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                Kişiselleştirilmiş Motivasyon Mektubu
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
        <div className="p-6 space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            {/* Tone Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">Ton:</span>
              <div className="inline-flex bg-white p-0.5 rounded-lg border border-gray-200 text-xs">
                <button
                  onClick={() => setTone('profesyonel')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    tone === 'profesyonel'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Profesyonel
                </button>
                <button
                  onClick={() => setTone('samimi')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    tone === 'samimi'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Dinamik & Samimi
                </button>
                <button
                  onClick={() => setTone('teknik')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    tone === 'teknik'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Teknik Odaklı
                </button>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <Languages className="w-3.5 h-3.5 text-gray-400" />
              <div className="inline-flex bg-white p-0.5 rounded-lg border border-gray-200 text-xs">
                <button
                  onClick={() => setLanguage('tr')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    language === 'tr'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  TR
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    language === 'en'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  EN
                </button>
              </div>

              <button
                onClick={generateLetter}
                disabled={loading}
                className="p-1.5 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
                title="Yeniden Oluştur"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Letter Editor / Display */}
          <div className="relative">
            {loading ? (
              <div className="min-h-[280px] bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center space-y-2 p-6">
                <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                <p className="text-xs font-semibold text-gray-600">
                  {listing.companyName} için yeteneklerinize özel motivasyon metni yazılıyor...
                </p>
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs">
                {error}
              </div>
            ) : (
              <textarea
                value={letterText}
                onChange={(e) => setLetterText(e.target.value)}
                rows={12}
                className="w-full text-xs sm:text-sm p-4 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 bg-white font-mono leading-relaxed resize-y"
              />
            )}
          </div>

          <p className="text-[11px] text-gray-500">
            💡 <strong>İpucu:</strong> Metin üzerinde dilediğiniz düzenlemeyi yapabilirsiniz. Şirket gereksinimleri ile projeleriniz eşleştirilerek hazırlanmıştır.
          </p>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between z-10">
          <button
            onClick={handleCopy}
            disabled={!letterText}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-gray-500" />
                <span>Panoya Kopyala</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-200/60 transition-colors"
            >
              Kapat
            </button>

            {onApplyWithLetter && (
              <button
                onClick={() => {
                  onApplyWithLetter(letterText);
                  onClose();
                }}
                disabled={!letterText}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Bu Mektupla Başvur</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
