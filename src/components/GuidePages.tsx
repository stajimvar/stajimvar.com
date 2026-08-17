import React, { useEffect } from 'react';
import { ArrowLeft, ChevronRight, GraduationCap, Building2 } from 'lucide-react';
import { Logo } from './Logo';
import { REHBERLER, rehberBul, type Rehber } from '../data/rehberler';

/**
 * Rehber merkezi ve tek rehber sayfası.
 *
 * İkisi de aynı kayıttan besleniyor (`src/data/rehberler.tsx`): yeni bir
 * başlık eklemek için o dizine bir girdi yazmak yeterli, burada hiçbir şey
 * değişmiyor. Site haritası da aynı kayıttan üretiliyor.
 *
 * Rehberler sitenin ikinci işi: bir öğrenci "zorunlu staj nasıl yapılır" diye
 * arıyor, bir işveren "stajyer nasıl alınır" diye. İkisi de bize buradan
 * geliyor — davet e-postası gönderemediğimiz için tek keşif kanalı bu.
 */

const Kabuk: React.FC<{ onBack: () => void; children: React.ReactNode }> = ({
  onBack,
  children,
}) => (
  <div className="min-h-screen bg-[#F9FAFB] text-[#111827]">
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-900 cursor-pointer"
          aria-label="Geri"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Logo size="sm" showTagline={false} onClick={onBack} />
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
  </div>
);

/* ------------------------------------------------------------------ merkez */

interface GuideHubProps {
  onBack: () => void;
  onNavigate: (path: string) => void;
}

const Satir: React.FC<{ rehber: Rehber; onNavigate: (p: string) => void }> = ({
  rehber,
  onNavigate,
}) => (
  <li className="border-b border-gray-100 last:border-b-0">
    <button
      type="button"
      onClick={() => onNavigate(`/rehber/${rehber.slug}`)}
      className="w-full flex items-center gap-3 px-4 py-4 text-left cursor-pointer hover:bg-blue-50/60 transition-colors"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-gray-900">{rehber.baslik}</span>
        <span className="block text-sm text-gray-500">{rehber.ozet}</span>
      </span>
      <ChevronRight className="w-5 h-5 shrink-0 text-gray-300" />
    </button>
  </li>
);

export const GuideHub: React.FC<GuideHubProps> = ({ onBack, onNavigate }) => {
  useEffect(() => {
    document.title = 'Staj rehberi | StajımVar';
  }, []);

  const ogrenci = REHBERLER.filter((r) => r.kategori === 'ogrenci');
  const isveren = REHBERLER.filter((r) => r.kategori === 'isveren');

  return (
    <Kabuk onBack={onBack}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Staj rehberi
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Staj sürecinin bilinmeyen kısımları: belgeler, sigorta, CV, mülakat. Bilmediği
            için başlayamayan çok kişi var — hem öğrenci hem işveren tarafında.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
            <GraduationCap className="w-4 h-4" />
            Öğrenciler için
          </h2>
          <ul className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {ogrenci.map((r) => (
              <Satir key={r.slug} rehber={r} onNavigate={onNavigate} />
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
            <Building2 className="w-4 h-4" />
            İşverenler için
          </h2>
          <ul className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/*
              İşveren rehberi ayrı bir bileşen: içinde canlı öğrenci sayısı
              gösteriliyor, durağan bir metin değil. Kayıttan değil elle
              bağlanıyor.
            */}
            <li className="border-b border-gray-100 last:border-b-0">
              <button
                type="button"
                onClick={() => onNavigate('/isveren')}
                className="w-full flex items-center gap-3 px-4 py-4 text-left cursor-pointer hover:bg-blue-50/60 transition-colors"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-gray-900">
                    Stajyer nasıl alınır
                  </span>
                  <span className="block text-sm text-gray-500">
                    Sigorta kimde, ücret zorunlu mu, okulla hangi evrak imzalanır.
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 shrink-0 text-gray-300" />
              </button>
            </li>
            {isveren.map((r) => (
              <Satir key={r.slug} rehber={r} onNavigate={onNavigate} />
            ))}
          </ul>
        </section>

        <p className="text-xs text-gray-400 leading-relaxed">
          Rehberlerde yıldan yıla değişen oran ve tutarlar yazılmıyor; mekanizma anlatılıp
          güncel rakam için resmî kaynağa yönlendiriliyor. Eksik veya hatalı gördüğün bir
          şey olursa bize yaz.
        </p>
      </div>
    </Kabuk>
  );
};

/* ------------------------------------------------------------- tek rehber */

interface GuidePageProps {
  slug: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
}

export const GuidePage: React.FC<GuidePageProps> = ({ slug, onBack, onNavigate }) => {
  const rehber = rehberBul(slug);

  useEffect(() => {
    document.title = rehber ? `${rehber.baslik} | StajımVar` : 'Rehber bulunamadı | StajımVar';
    if (rehber) {
      const etiket = document.querySelector('meta[name="description"]');
      if (etiket) etiket.setAttribute('content', rehber.aciklama);
    }
  }, [rehber]);

  if (!rehber) {
    return (
      <Kabuk onBack={onBack}>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
          <p className="font-bold text-gray-900">Bu rehber bulunamadı</p>
          <button
            type="button"
            onClick={() => onNavigate('/rehber')}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            Tüm rehberler
          </button>
        </div>
      </Kabuk>
    );
  }

  const digerleri = REHBERLER.filter(
    (r) => r.slug !== rehber.slug && r.kategori === rehber.kategori
  );

  return (
    <Kabuk onBack={onBack}>
      <article className="space-y-3">
        <button
          type="button"
          onClick={() => onNavigate('/rehber')}
          className="text-sm font-semibold text-blue-600 hover:underline cursor-pointer"
        >
          &larr; Tüm rehberler
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          {rehber.baslik}
        </h1>
        <div className="space-y-3">{rehber.icerik}</div>
      </article>

      {digerleri.length > 0 && (
        <section className="mt-10 space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Bunlar da işine yarar
          </h2>
          <ul className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {digerleri.map((r) => (
              <Satir key={r.slug} rehber={r} onNavigate={onNavigate} />
            ))}
          </ul>
        </section>
      )}
    </Kabuk>
  );
};
