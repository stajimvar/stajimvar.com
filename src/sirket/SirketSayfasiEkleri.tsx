import React from 'react';
import { Check, ExternalLink, Play } from 'lucide-react';
import { ODAK_HALKASI, RENK_PRIMARY } from '../lib/renk-token';
import { INSTAGRAM_DESENI, LINKEDIN_DESENI, youtubeKimligi } from '../lib/sirket-sayfasi-ek.mjs';
import type { SirketAcikKimlik } from '../lib/sirket-veri';

/**
 * ŞİRKET SAYFASI EKLERİ (rakip analizi #12): yan haklar, sosyal
 * hesaplar, tanıtım videosu. Hakkımızda sekmesinde; boş olan çizilmiyor.
 *
 * VİDEO TIKLAYINCA YÜKLENİYOR: sayfa açılır açılmaz YouTube'a istek
 * gitmiyor (ziyaretçinin gizliliği); oynat'a basınca
 * youtube-nocookie.com gömmesi açılıyor. Adres kimliğe indirgeniyor,
 * yazılan adres iframe'e hiç girmiyor.
 *
 * Bağlantılar yine desenle süzülüyor: sunucu kısıtı var ama eski ya da
 * yönetici eliyle yazılmış bir değer başka bir siteye götürmesin.
 */
export const SirketSayfasiEkleri: React.FC<{ kimlik: SirketAcikKimlik }> = ({ kimlik }) => {
  const [videoAcik, setVideoAcik] = React.useState(false);
  const yanHaklar = kimlik.yanHaklar ?? [];
  const linkedin = kimlik.linkedinUrl && LINKEDIN_DESENI.test(kimlik.linkedinUrl) ? kimlik.linkedinUrl : null;
  const instagram = kimlik.instagramUrl && INSTAGRAM_DESENI.test(kimlik.instagramUrl) ? kimlik.instagramUrl : null;
  const videoId = youtubeKimligi(kimlik.videoUrl);

  if (!yanHaklar.length && !linkedin && !instagram && !videoId) return null;

  const baglanti = `inline-flex min-h-11 items-center gap-1.5 font-semibold ${RENK_PRIMARY.metin} hover:underline ${ODAK_HALKASI}`;

  return (
    <div className="space-y-4 border-t border-gray-100 pt-4">
      {videoId && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Tanıtım videosu</h3>
          <div className="mt-2 aspect-video w-full overflow-hidden rounded-xl bg-gray-900">
            {videoAcik ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                title={`${kimlik.ad} tanıtım videosu`}
                className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                onClick={() => setVideoAcik(true)}
                className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 text-white ${ODAK_HALKASI}`}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
                  <Play aria-hidden className="h-7 w-7" />
                </span>
                <span className="text-sm font-bold">Videoyu oynat</span>
                <span className="text-xs text-white/70">YouTube'dan yüklenir</span>
              </button>
            )}
          </div>
        </div>
      )}

      {yanHaklar.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Yan haklar</h3>
          <ul className="mt-2 grid gap-1.5 text-sm text-gray-900 sm:grid-cols-2">
            {yanHaklar.map((h) => (
              <li key={h} className="flex items-start gap-2">
                <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span className="break-words">{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(linkedin || instagram) && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Sosyal hesaplar</h3>
          <div className="mt-1 flex flex-wrap gap-x-5">
            {linkedin && (
              <a href={linkedin} target="_blank" rel="noreferrer noopener" className={baglanti}>
                LinkedIn
                <ExternalLink aria-hidden className="h-3.5 w-3.5" />
              </a>
            )}
            {instagram && (
              <a href={instagram} target="_blank" rel="noreferrer noopener" className={baglanti}>
                Instagram
                <ExternalLink aria-hidden className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
