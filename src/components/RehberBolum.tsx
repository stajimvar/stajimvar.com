import React from 'react';
import { BriefcaseBusiness, CalendarDays, Check, ChevronDown, Clock, FileText, GraduationCap } from 'lucide-react';
import { ODAK_HALKASI } from '../lib/renk-token';

/*
  REHBER ADIM PARÇALARI (27 Eylül 2026)

  İşveren rehberlerinin her adımı aynı sırada: kısa başlık → görsel
  (temsili fotoğraf ya da seçenek karşılaştırması) → tek cümlelik özet →
  düz "Ayrıntıyı aç" satırı. Kullanıcı geri bildirimiyle kart içinde kart
  yok: gövde zaten bir kart; adımın kendi çerçevesi, özet kutusu ya da
  çerçeveli düğmesi çizilmiyor. `rehber-govde.tsx` bu parçaları yalnız
  `ozet` alanı olan bloklarda kullanıyor; öğrenci rehberleri bu alanı
  taşımıyor ve çizimleri değişmiyor.
*/

/** Bölüm görsellerinin önbellek eki; dosya değişirse bu da değişmeli. */
const BOLUM_SURUMU = 'bolum-20260927';

/* Adım kartının genişliği: telefonda sayfa boşluğu düşülmüş tam genişlik, lg üstünde iki sütunun biri. */
const ADIM_BOYUTLARI = '(min-width: 1024px) 50vw, calc(100vw - 34px)';

/**
 * Temsili adım fotoğrafı: AVIF + WebP, 16:9 oran korunuyor (kırpma yok),
 * gecikmeli. Adım kartında kenardan kenara (köşeyi kart kırpıyor). "Temsili görsel" etiketi her zaman görünür; fotoğraftaki
 * kişi, belge ya da ekran gerçek bir kayıt değil.
 */
export const SadeFotograf: React.FC<{ dosya: string; alt: string }> = ({ dosya, alt }) => (
  <figure className="relative m-0">
    <picture className="block overflow-hidden bg-gray-100">
      <source
        srcSet={`/rehber-gorselleri/bolumler/${dosya}.avif?v=${BOLUM_SURUMU} 1280w`}
        sizes={ADIM_BOYUTLARI}
        type="image/avif"
      />
      {/*
        `loading` `src`'den ÖNCE: React öznitelikleri yazılış sırasıyla
        koyuyor; `src` önce gelirse tarayıcı görseli gecikme özniteliğini
        görmeden indirmeye başlıyor (ölçüldü: rehberin bütün adım
        görselleri sayfa açılışında iniyordu).
      */}
      <img
        loading="lazy"
        decoding="async"
        width={1280}
        height={720}
        sizes={ADIM_BOYUTLARI}
        srcSet={`/rehber-gorselleri/bolumler/${dosya}.webp?v=${BOLUM_SURUMU} 1280w`}
        src={`/rehber-gorselleri/bolumler/${dosya}.webp?v=${BOLUM_SURUMU}`}
        alt={alt}
        className="aspect-video h-auto w-full object-cover"
      />
    </picture>
    <figcaption className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
      Temsili görsel
    </figcaption>
  </figure>
);

/** Düz ayrıntı satırı: çerçeve yok, yalnız mavi yazı ve ok. Yerel `<details>`. */
export const SadeAyrinti: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <details className="group">
    <summary
      className={`inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-md text-[15px] font-bold text-blue-700 hover:text-blue-900 [&::-webkit-details-marker]:hidden ${ODAK_HALKASI}`}
    >
      Ayrıntıyı aç
      <ChevronDown aria-hidden className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
    </summary>
    <div className="space-y-3 pt-1 text-[15px] leading-relaxed text-gray-700">{children}</div>
  </details>
);

/* ------------------------------------------------------ seçenek alanı */

const SECENEK_SIMGELERI = {
  mezuniyet: GraduationCap,
  canta: BriefcaseBusiness,
  saat: Clock,
  takvim: CalendarDays,
  belge: FileText,
} as const;

export interface Secenek {
  baslik: string;
  /** Simge adı (SECENEK_SIMGELERI); süs, metin değil. */
  ikon?: keyof typeof SECENEK_SIMGELERI;
  satirlar: string[];
}

/**
 * Seçeneklerin karşılaştırması — teslim paketindeki iki karşılaştırma
 * görselinin (14, 22) HTML hâli: metin seçilebilir, 16:9'a kırpılmıyor,
 * telefonda alt alta (dar sütunda yan yana okunmuyor), sm üstünde iki
 * sütun. İyi-kötü değil: her seçenek aynı renk ve ağırlıkta.
 */
export const SecenekAlani: React.FC<{
  ogeler: Secenek[];
  not?: string;
  etiket: string;
  metniCiz: (metin: string, anahtar: string) => React.ReactNode;
}> = ({ ogeler, not, etiket, metniCiz }) => (
  /* Tek kat: seçenekler doğrudan açık gri kutucuk; dış zemin/çerçeve yok. */
  <figure className="m-0 pb-2" aria-label={etiket}>
    <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3">
      {ogeler.map((s, i) => {
        const Simge = s.ikon ? SECENEK_SIMGELERI[s.ikon] : null;
        return (
          <li key={s.baslik} className="rounded-xl bg-slate-50 px-4 py-3.5">
            <p className="flex items-center gap-2.5 text-base font-extrabold text-gray-900">
              {Simge && (
                <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-blue-700">
                  <Simge className="h-4 w-4" />
                </span>
              )}
              {s.baslik}
            </p>
            <ul className="mt-2 space-y-1.5">
              {s.satirlar.map((m, j) => (
                <li key={j} className="flex gap-2 text-[15px] leading-relaxed text-gray-700">
                  <span aria-hidden className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                  <span>{metniCiz(m, `secenek-${i}-${j}`)}</span>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
    {not && <figcaption className="pt-2 text-sm text-gray-600">{metniCiz(not, 'secenek-not')}</figcaption>}
  </figure>
);

/* ------------------------------------------------------- işlem akışı */

export interface AkisAdimi {
  ad: string;
  ayrinti?: string;
}

/** Kısa işlem akışı: numaralı adımlar, aralarında ince çizgi. Fotoğrafı tamamlıyor. */
export const IslemAkisi: React.FC<{
  baslik?: string;
  adimlar: AkisAdimi[];
  metniCiz: (metin: string, anahtar: string) => React.ReactNode;
}> = ({ baslik, adimlar, metniCiz }) => (
  <div>
    {baslik && <p className="mb-2 text-sm font-bold text-gray-600">{baslik}</p>}
    <ol className="space-y-0">
      {adimlar.map((a, i) => (
        <li key={a.ad} className="relative flex gap-3 pb-3 last:pb-0">
          {i < adimlar.length - 1 && (
            <span aria-hidden className="absolute left-3 top-7 bottom-0 w-px -translate-x-1/2 bg-blue-200" />
          )}
          <span
            aria-hidden
            className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white"
          >
            {i + 1}
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-bold leading-6 text-gray-900">{metniCiz(a.ad, `akis-a${i}`)}</span>
            {a.ayrinti && (
              <span className="block text-sm leading-relaxed text-gray-600">{metniCiz(a.ayrinti, `akis-y${i}`)}</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  </div>
);

/** Ölçüt listesi (işaret tutulmuyor): onay simgeli düz satırlar, çerçeve yok. */
export const SadeKontrol: React.FC<{
  baslik?: string;
  maddeler: string[];
  metniCiz: (metin: string, anahtar: string) => React.ReactNode;
}> = ({ baslik, maddeler, metniCiz }) => (
  <div>
    {baslik && <p className="mb-2 text-sm font-bold text-gray-600">{baslik}</p>}
    <ul className="space-y-2">
      {maddeler.map((m, i) => (
        <li key={m} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-gray-700">
          <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          <span>{metniCiz(m, `kontrol-${i}`)}</span>
        </li>
      ))}
    </ul>
  </div>
);

/* ------------------------------------------------ işaretlenebilir liste */

export interface IsaretMaddesi {
  ad: string;
  ayrinti?: string;
}

/**
 * İşaretlenebilir kontrol listesi. İşaretler YALNIZ BU TARAYICIDA
 * (`localStorage`): kişisel takip, resmî bir onay değil; sunucuya
 * yazılmıyor. Depo kapalıysa (gizli sekme) işaretler sayfa açıkken kalıyor.
 * Ön render'da depo okunmuyor (etki yalnız tarayıcıda çalışıyor), statik
 * HTML'de liste boş işaretli çiziliyor. Kutu çerçevesi yok: satırlar ince
 * çizgiyle ayrılıyor, her satır 56 px dokunma alanı.
 */
export const IsaretListesi: React.FC<{
  depoAnahtari: string;
  maddeler: IsaretMaddesi[];
  metniCiz: (metin: string, anahtar: string) => React.ReactNode;
}> = ({ depoAnahtari, maddeler, metniCiz }) => {
  const anahtar = `stajimvar:rehber-kontrol:${depoAnahtari}:v1`;
  const [isaretler, setIsaretler] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    try {
      const ham = window.localStorage.getItem(anahtar);
      setIsaretler(ham ? (JSON.parse(ham) as Record<string, boolean>) : {});
    } catch {
      setIsaretler({});
    }
  }, [anahtar]);

  const isaretle = (sira: number, deger: boolean) => {
    setIsaretler((onceki) => {
      const yeni = { ...onceki, [String(sira)]: deger };
      try {
        window.localStorage.setItem(anahtar, JSON.stringify(yeni));
      } catch {
        /* Depo kapalı: işaret yalnız bu oturumda. */
      }
      return yeni;
    });
  };

  return (
    <div>
      <ul className="divide-y divide-gray-100 border-y border-gray-100">
        {maddeler.map((m, i) => {
          const secili = Boolean(isaretler[String(i)]);
          return (
            <li key={m.ad}>
              <label className="flex min-h-14 cursor-pointer items-start gap-3 py-3">
                <input
                  type="checkbox"
                  checked={secili}
                  onChange={(olay) => isaretle(i, olay.target.checked)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-gray-300 bg-white text-white peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600"
                >
                  {secili && <Check className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-gray-900">{metniCiz(m.ad, `${depoAnahtari}-a${i}`)}</span>
                  {m.ayrinti && (
                    <span className="mt-0.5 block text-sm leading-relaxed text-gray-600">
                      {metniCiz(m.ayrinti, `${depoAnahtari}-y${i}`)}
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        Kendi hazırlığınızı takip etmek için işaretleyin. İşaretler yalnız bu tarayıcıda kalır; resmî bir onay ya da
        tamamlanmış bir işlem anlamına gelmez.
      </p>
    </div>
  );
};
