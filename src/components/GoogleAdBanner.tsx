import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ExternalLink,
  Info,
  ShieldCheck,
  Star,
  CheckCircle2,
  TrendingUp,
  Sliders,
  Code2,
  Check,
  Copy,
  Layers,
  AlertTriangle,
  Eye,
  Zap,
} from 'lucide-react';
import { SPONSORED_ADS, SponsoredAd } from '../data/sponsoredAdsData';

export type AdFormat =
  | 'in-feed'
  | 'sidebar-rectangle'
  | 'sidebar-halfpage'
  | 'top-leaderboard'
  | 'modal-footer';

interface GoogleAdBannerProps {
  format?: AdFormat;
  adSlotId?: string;
  adClientId?: string;
  adIndex?: number;
  adCategory?: 'education' | 'tech' | 'language' | 'career' | 'hr_b2b';
  isCorporateMode?: boolean;
  className?: string;
  showInspectorButton?: boolean;
}

export const GoogleAdBanner: React.FC<GoogleAdBannerProps> = ({
  format = 'in-feed',
  adSlotId = '9876543210',
  adClientId = 'ca-pub-8039794017009999',
  adIndex = 0,
  adCategory,
  isCorporateMode = false,
  className = '',
  showInspectorButton = false,
}) => {
  // AdBlock simulation and AdSense code mode state
  const [adBlocked, setAdBlocked] = useState<boolean>(false);
  const [useRealScript, setUseRealScript] = useState<boolean>(false);
  const [showInspectorModal, setShowInspectorModal] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [selectedAdId, setSelectedAdId] = useState<string>('');

  // Choose the relevant ad
  const availableAds = isCorporateMode
    ? SPONSORED_ADS.filter((a) => a.category === 'hr_b2b')
    : adCategory
    ? SPONSORED_ADS.filter((a) => a.category === adCategory)
    : SPONSORED_ADS.filter((a) => a.category !== 'hr_b2b');

  const ad: SponsoredAd =
    (selectedAdId && SPONSORED_ADS.find((a) => a.id === selectedAdId)) ||
    availableAds[adIndex % availableAds.length] ||
    SPONSORED_ADS[0];

  // Auto-detect browser AdBlocker gracefully if present
  useEffect(() => {
    try {
      const testAd = document.createElement('div');
      testAd.innerHTML = '&nbsp;';
      testAd.className = 'adsbox pub_300x250 pub_728x90 text-ad textAd text_ad';
      testAd.style.position = 'absolute';
      testAd.style.left = '-9999px';
      document.body.appendChild(testAd);
      window.setTimeout(() => {
        if (testAd.offsetHeight === 0) {
          // Adblock is active in browser
          setAdBlocked(true);
        }
        testAd.remove();
      }, 100);
    } catch {
      // Ignored
    }
  }, []);

  const generatedAdSenseSnippet = `<!-- StajımVar Google AdSense Entegrasyonu (${format}) -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClientId}" crossorigin="anonymous"></script>
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="${adClientId}"
     data-ad-slot="${adSlotId}"
     data-ad-format="${format === 'in-feed' ? 'fluid' : 'auto'}"
     ${format === 'in-feed' ? 'data-ad-layout-key="-fb+5w+4e-db+86"' : ''}
     data-full-width-responsive="true"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>`;

  const copyCode = () => {
    navigator.clipboard.writeText(generatedAdSenseSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  /* =========================================================================
   * 1. IN-FEED NATIVE AD FORMAT (Perfect match with Internship Card)
   * ========================================================================= */
  if (format === 'in-feed') {
    return (
      <div className={`relative group ${className}`}>
        <div className="bg-gradient-to-r from-blue-50/40 via-white to-indigo-50/30 rounded-2xl p-4 sm:p-5 border border-blue-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3">
          {/* Top Row: Sponsor Info & Badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={ad.sponsorLogo}
                alt={ad.sponsorName}
                className="w-10 h-10 rounded-xl object-cover border border-blue-200 shadow-2xs shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-900 truncate">
                    {ad.sponsorName}
                  </span>
                  <span className="text-[10px] bg-blue-100/80 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                    <span>Sponsorlu • Google Ads</span>
                  </span>
                  {ad.discountBadge && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      {ad.discountBadge}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-gray-900 mt-0.5 group-hover:text-blue-600 transition-colors">
                  {ad.title}
                </h3>
              </div>
            </div>

            {/* Quick action / Inspector button */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowInspectorModal(true)}
                title="Google Ads Yapılandırmasını İncele"
                className="text-[10px] text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-white transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Description & Tagline */}
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
            {ad.description}
          </p>

          {/* Highlights & CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-blue-100/60">
            <div className="flex flex-wrap items-center gap-1.5">
              {ad.highlights.map((h, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 font-semibold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                  <span>{h}</span>
                </span>
              ))}
            </div>

            <a
              href={ad.ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-2xs hover:shadow-xs transition-all shrink-0"
            >
              <span>{ad.ctaText}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* AdSense Info microfooter */}
          <div className="flex items-center justify-between text-[9px] text-gray-400 font-medium">
            <span>
              {adBlocked
                ? '🛡️ AdBlock aktif (Kariyer Sponsorluğu Yedek Banner devrede)'
                : '🎯 İlgi alanlarınıza ve yeteneklerinize göre optimize edilmiş ilan'}
            </span>
            <span className="hover:underline cursor-pointer" onClick={() => setShowInspectorModal(true)}>
              Reklam Tercihleri
            </span>
          </div>
        </div>

        {/* Inspector Modal */}
        {showInspectorModal && renderInspectorModal()}
      </div>
    );
  }

  /* =========================================================================
   * 2. SIDEBAR RECTANGLE & HALF-PAGE (300x250 / 300x600 Display)
   * ========================================================================= */
  if (format === 'sidebar-rectangle' || format === 'sidebar-halfpage') {
    return (
      <div className={`relative group ${className}`}>
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Günün Sponsorlu Fırsatı</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                Google Ads
              </span>
              <button
                type="button"
                onClick={() => setShowInspectorModal(true)}
                title="Reklam Ayarları & Kod Önizleme"
                className="text-gray-400 hover:text-blue-600 p-0.5"
              >
                <Sliders className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Visual Banner */}
          {ad.bannerImage && (
            <div className="relative rounded-xl overflow-hidden mb-3 aspect-video bg-gray-100 border border-gray-100">
              <img
                src={ad.bannerImage}
                alt={ad.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {ad.discountBadge && (
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                  {ad.discountBadge}
                </div>
              )}
              {ad.rating && (
                <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  <span>{ad.rating}</span>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <img
                src={ad.sponsorLogo}
                alt={ad.sponsorName}
                className="w-6 h-6 rounded-md object-cover border border-gray-200"
              />
              <span className="text-xs font-bold text-gray-700 truncate">
                {ad.sponsorName}
              </span>
            </div>

            <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors">
              {ad.title}
            </h4>

            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {ad.description}
            </p>

            <div className="pt-1 flex flex-wrap gap-1">
              {ad.highlights.slice(0, 2).map((h, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-100"
                >
                  ✓ {h}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
            <span className="text-[10px] text-gray-400">
              {adBlocked ? 'AdBlock Yedek Banner' : 'Güvenli Bağlantı'}
            </span>
            <a
              href={ad.ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center gap-1 shadow-2xs"
            >
              <span>{ad.ctaText}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Inspector Modal */}
        {showInspectorModal && renderInspectorModal()}
      </div>
    );
  }

  /* =========================================================================
   * 3. TOP LEADERBOARD (728x90 Responsive Banner)
   * ========================================================================= */
  if (format === 'top-leaderboard') {
    return (
      <div className={`relative ${className}`}>
        <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl p-3 sm:p-4 shadow-sm border border-indigo-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[9px] bg-white/20 text-white font-bold uppercase px-2 py-0.5 rounded tracking-wider shrink-0">
              Sponsorlu
            </span>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold truncate">
                {ad.title}
              </p>
              <p className="text-[11px] text-indigo-200 truncate hidden sm:block">
                {ad.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={ad.ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white text-blue-900 hover:bg-blue-50 transition-colors flex items-center gap-1 shadow-xs"
            >
              <span>{ad.ctaText}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={() => setShowInspectorModal(true)}
              className="text-white/60 hover:text-white p-1"
              title="Reklam Seçenekleri"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inspector Modal */}
        {showInspectorModal && renderInspectorModal()}
      </div>
    );
  }

  /* =========================================================================
   * 4. MODAL FOOTER & REWARDED TEST COMPLETION BANNER
   * ========================================================================= */
  return (
    <div className={`rounded-xl p-3 bg-amber-50/70 border border-amber-200/80 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                Önerilen Fırsat
              </span>
              <span className="text-[9px] text-gray-400">• Sponsorlu</span>
            </div>
            <p className="text-xs font-bold text-gray-900 truncate">
              {ad.title}
            </p>
          </div>
        </div>

        <a
          href={ad.ctaLink}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shrink-0 flex items-center gap-1"
        >
          <span>{ad.ctaText}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {showInspectorModal && renderInspectorModal()}
    </div>
  );

  /* =========================================================================
   * Interactive Inspector Modal (Settings, Live Test & Code Snippet Generator)
   * ========================================================================= */
  function renderInspectorModal() {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
        <div
          className="relative bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 p-6 space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Google Ads & AdSense Entegrasyon Paneli
                </h3>
                <p className="text-[11px] text-gray-500">
                  Responsive yerleşim, AdBlock koruması ve kod şablonu
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInspectorModal(false)}
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 text-xs font-bold"
            >
              ✕ Kapat
            </button>
          </div>

          {/* Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/70">
              <span className="font-bold text-blue-900 block mb-0.5">🎯 Responsive Placement</span>
              <span className="text-[11px] text-blue-700">Sayfayı bölmeyen, doğal In-Feed & Sidebar formatı.</span>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/70">
              <span className="font-bold text-emerald-900 block mb-0.5">🛡️ AdBlock Koruması</span>
              <span className="text-[11px] text-emerald-700">Engelleyici algılandığında boş kutu yerine kariyer bursu gösterir.</span>
            </div>
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/70">
              <span className="font-bold text-indigo-900 block mb-0.5">💼 İK / Şirket Modu</span>
              <span className="text-[11px] text-indigo-700">Şirket portalında reklamlar kurumsal B2B araçlarına evrilir.</span>
            </div>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-gray-600" />
              <span>Canlı Simülasyon ve Test</span>
            </h4>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={adBlocked}
                  onChange={(e) => setAdBlocked(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>AdBlock Aktif Simülasyonu (Yedek Banner Testi)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={useRealScript}
                  onChange={(e) => setUseRealScript(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Gerçek AdSense Script Modu</span>
              </label>
            </div>

            {/* Change Ad Campaign */}
            <div>
              <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                Önizlenen Sponsor / Kampanya:
              </label>
              <select
                value={selectedAdId || ad.id}
                onChange={(e) => setSelectedAdId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:outline-none focus:border-blue-600"
              >
                {SPONSORED_ADS.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.badge}] {a.sponsorName} - {a.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AdSense HTML Code Snippet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800">
                Üretilen Google AdSense Yerleşim Kodu
              </span>
              <button
                type="button"
                onClick={copyCode}
                className="flex items-center gap-1 px-3 py-1 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-800 transition-colors shadow-2xs"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Kopyalandı!' : 'Kodu Kopyala'}</span>
              </button>
            </div>

            <pre className="p-3 bg-gray-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed border border-gray-800">
              {generatedAdSenseSnippet}
            </pre>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowInspectorModal(false)}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Tamam
            </button>
          </div>
        </div>
      </div>
    );
  }
};
