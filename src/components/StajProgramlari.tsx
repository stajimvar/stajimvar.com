import React, { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { SayfaKabugu } from './SayfaKabugu';
import { STAJ_PROGRAMLARI, type StajProgrami } from '../data/stajProgramlari';
import { bolumBul } from '../data/bolumler';
import { SAYFA_GENISLIGI } from '../lib/duzen';

/**
 * /staj-programlari — büyük işverenlerin resmi staj sayfaları dizini.
 *
 * Neden dizin, neden ilan değil: src/data/stajProgramlari.ts başında.
 *
 * TEK KAYNAK
 * ----------
 * `ProgramListesi` hem tarayıcıda hem derleme sırasında ön render tarafında
 * çiziliyor — BolumIcerik ve RehberListesi ile aynı gerekçe. Ön render ayrı
 * bir özet üretseydi iki metin zamanla ayrışır, fark gizleme (cloaking)
 * sayılırdı.
 */

/**
 * Dış bağlantı kartı.
 *
 * `rel="nofollow"` YOK, `noopener` VAR.
 *
 * Bunlar işverenin gerçek kariyer sayfaları; editoryal olarak seçip
 * yönlendirdiğimiz, güvendiğimiz adresler. nofollow koymak "bu bağlantıya
 * kefil değiliz" demek olurdu ve dizinin bütün anlamı tam tersi. noopener
 * ise güvenlik: yeni sekmede açılan sayfa bizim sekmemize erişemesin.
 */
const Kart: React.FC<{ program: StajProgrami; onNavigate?: (p: string) => void }> = ({
  program,
  onNavigate,
}) => (
  <div className="flex flex-col gap-2 p-5 rounded-2xl bg-white border border-gray-200 h-full">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-bold text-gray-900 leading-snug">{program.isveren}</p>
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mt-0.5">
          {program.sektor}
        </p>
      </div>
    </div>

    <p className="text-sm text-gray-600 leading-relaxed">{program.ozet}</p>

    {/*
      Bölüm bağlantıları: dizini otuz dört bölüm sayfasına bağlıyor.
      Kişi "makine mühendisliği stajı" sayfasından buraya, buradan da
      işverenin kendi sayfasına gidebiliyor.
    */}
    {program.bolumler.length > 0 && (
      <div className="flex flex-wrap gap-1.5 pt-1">
        {program.bolumler.map((slug) => {
          const bolum = bolumBul(slug);
          if (!bolum) return null;
          return (
            <a
              key={slug}
              href={`/bolum/${slug}`}
              onClick={(e) => {
                if (!onNavigate) return;
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                onNavigate(`/bolum/${slug}`);
              }}
              className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
            >
              {bolum.ad}
            </a>
          );
        })}
      </div>
    )}

    <a
      href={program.kariyerUrl}
      target="_blank"
      rel="noopener"
      className="mt-auto pt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
    >
      Resmi başvuru sayfası
      <ExternalLink className="w-3.5 h-3.5" />
    </a>
  </div>
);

/** Sektöre göre gruplanmış dizin. Ön render de bu ağacı çiziyor. */
export const ProgramListesi: React.FC<{ onNavigate?: (p: string) => void }> = ({ onNavigate }) => {
  const sektorler = [...new Set(STAJ_PROGRAMLARI.map((p) => p.sektor))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  );

  if (STAJ_PROGRAMLARI.length === 0) return null;

  return (
    <>
      {sektorler.map((sektor) => {
        const liste = STAJ_PROGRAMLARI.filter((p) => p.sektor === sektor);
        return (
          <section key={sektor} className="space-y-4">
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl font-bold text-gray-900">{sektor}</h2>
              <span className="text-sm text-gray-600">{liste.length} işveren</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {liste.map((p) => (
                <Kart key={p.slug} program={p} onNavigate={onNavigate} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
};

export const StajProgramlariSayfasi: React.FC<{
  onBack: () => void;
  onNavigate: (p: string) => void;
}> = ({ onBack, onNavigate }) => {
  useEffect(() => {
    document.title = 'Büyük işverenlerde staj başvurusu | StajımVar';
  }, []);

  return (
    <SayfaKabugu onBack={onBack} icerikGenisligi={SAYFA_GENISLIGI}>
      <div className="space-y-8">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
            Büyük işverenlerde staj
          </h1>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            Türkiye'nin büyük işverenlerinin çoğu staj başvurusunu ilan sitelerinden değil,
            kendi kariyer sayfasından alıyor. Aşağıdakiler o sayfaların doğrulanmış
            adresleri — başvuru doğrudan işverene yapılıyor.
          </p>
        </div>

        <ProgramListesi onNavigate={onNavigate} />

        <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
          Bu sayfa bir dizin: buradaki kayıtlar StajımVar ilanı değil, işverenin kendi
          başvuru sayfasına yönlendirme. Başvuru koşulları, takvim ve kontenjan işverenin
          sayfasında yazıyor; biz o bilgileri kopyalamıyoruz çünkü her yıl değişiyor.
        </p>
      </div>
    </SayfaKabugu>
  );
};
