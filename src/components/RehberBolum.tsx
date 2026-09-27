import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { ODAK_HALKASI } from '../lib/renk-token';

/*
  REHBER BÖLÜM PARÇALARI (27 Eylül 2026)

  Onaylanan /stajyer-nasil-alinir pilotunun dili metin rehberlerine
  taşınıyor: bölüm başına bir cümlelik özet, gerekiyorsa temsili fotoğraf,
  ayrıntı açılır kutuda, yapılacaklar işaretlenebilir listede. Bileşenler
  pilottakilerle (EmployerGuide: Fotograf, Ayrinti, "Başlamadan önce")
  aynı ölçülerde; `rehber-govde.tsx` yalnız `ozet` alanı olan bloklarda
  kullanıyor, diğer rehberlerin çizimi değişmiyor.
*/

/** Bölüm görsellerinin önbellek eki; dosya değişirse bu da değişmeli. */
const BOLUM_SURUMU = 'bolum-20260927';

/*
  Görsel kutusu: telefonda kartın tam genişliği (sayfa boşluğu + gövde
  kartının iç boşluğu düşülünce), sm üstünde kartın 5/11'lik sütunu.
  Dosyalar tek boy (1280×720); `sizes` tarayıcıya yer tutmayı söylüyor.
*/
const BOLUM_BOYUTLARI = '(min-width: 1024px) 340px, (min-width: 640px) 42vw, calc(100vw - 74px)';

/**
 * Temsili bölüm fotoğrafı: AVIF + WebP, 16:9 oran korunuyor (kırpma yok),
 * ilk ekranda olmadığı için gecikmeli. "Temsili görsel" etiketi her
 * zaman görünür; fotoğraftaki belge ya da ekran gerçek bir kayıt değil.
 */
export const BolumFotografi: React.FC<{ dosya: string; alt: string }> = ({ dosya, alt }) => (
  <figure className="relative m-0 sm:self-start sm:p-4 sm:pr-0">
    <picture className="block overflow-hidden bg-gray-100 sm:rounded-xl">
      <source
        srcSet={`/rehber-gorselleri/bolumler/${dosya}.avif?v=${BOLUM_SURUMU} 1280w`}
        sizes={BOLUM_BOYUTLARI}
        type="image/avif"
      />
      <img
        src={`/rehber-gorselleri/bolumler/${dosya}.webp?v=${BOLUM_SURUMU}`}
        srcSet={`/rehber-gorselleri/bolumler/${dosya}.webp?v=${BOLUM_SURUMU} 1280w`}
        sizes={BOLUM_BOYUTLARI}
        alt={alt}
        width={1280}
        height={720}
        loading="lazy"
        decoding="async"
        className="aspect-video h-auto w-full object-cover"
      />
    </picture>
    <figcaption className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-gray-700 sm:bottom-6">
      Temsili görsel
    </figcaption>
  </figure>
);

/** Açılır ayrıntı — yerel `<details>`: klavye (Enter/Boşluk) ve ekran okuyucu kendiliğinden. */
export const BolumAyrintisi: React.FC<{ etiket?: string; children: React.ReactNode }> = ({
  etiket = 'Ayrıntıyı aç',
  children,
}) => (
  <details className="group rounded-xl border border-gray-200 bg-white">
    <summary
      className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-[15px] font-bold text-blue-700 hover:bg-blue-50/60 [&::-webkit-details-marker]:hidden ${ODAK_HALKASI}`}
    >
      <span>{etiket}</span>
      <ChevronDown aria-hidden className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" />
    </summary>
    <div className="space-y-3 px-4 pb-4 text-[15px] leading-relaxed text-gray-700">{children}</div>
  </details>
);

/* ------------------------------------------------------------------ SADE
  SADE BÖLÜM PARÇALARI (27 Eylül 2026, kullanıcı geri bildirimi): kart içinde
  kart yok. Bölüm = başlık, görünür kısa özet, TEK görsel alan (fotoğraf +
  akış, fotoğraf + liste ya da iki seçenek), düz bir "Ayrıntıyı aç" satırı.
  Çerçeve yalnız işaretlenebilir listede (dokunma alanlarını ayırıyor).
*/

/** Çerçevesiz temsili fotoğraf; oran korunuyor, gecikmeli. */
export const SadeFotograf: React.FC<{ dosya: string; alt: string }> = ({ dosya, alt }) => (
  <figure className="relative m-0">
    <picture className="block overflow-hidden rounded-xl bg-gray-100">
      <source
        srcSet={`/rehber-gorselleri/bolumler/${dosya}.avif?v=${BOLUM_SURUMU} 1280w`}
        sizes={SADE_BOYUTLARI}
        type="image/avif"
      />
      <img
        src={`/rehber-gorselleri/bolumler/${dosya}.webp?v=${BOLUM_SURUMU}`}
        srcSet={`/rehber-gorselleri/bolumler/${dosya}.webp?v=${BOLUM_SURUMU} 1280w`}
        sizes={SADE_BOYUTLARI}
        alt={alt}
        width={1280}
        height={720}
        loading="lazy"
        decoding="async"
        className="aspect-video h-auto w-full object-cover"
      />
    </picture>
    <figcaption className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
      Temsili görsel
    </figcaption>
  </figure>
);

/* Telefonda gövdenin tam genişliği; sm üstünde görsel alanın yarısı. */
const SADE_BOYUTLARI = '(min-width: 1024px) 360px, (min-width: 640px) 45vw, calc(100vw - 66px)';

/** Düz ayrıntı satırı: çerçeve yok, yalnız mavi yazı ve ok. Yerel `<details>`. */
export const SadeAyrinti: React.FC<{ etiket?: string; children: React.ReactNode }> = ({
  etiket = 'Ayrıntıyı aç',
  children,
}) => (
  <details className="group">
    <summary
      className={`inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-md text-[15px] font-bold text-blue-700 hover:text-blue-900 [&::-webkit-details-marker]:hidden ${ODAK_HALKASI}`}
    >
      {etiket}
      <ChevronDown aria-hidden className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
    </summary>
    <div className="space-y-3 pt-1 text-[15px] leading-relaxed text-gray-700">{children}</div>
  </details>
);

export interface Secenek {
  baslik: string;
  satirlar: string[];
}

/**
 * İki seçeneğin karşılaştırması (ör. zorunlu / gönüllü staj). İyi-kötü
 * değil, iki durum: aynı renk, aynı ağırlık. Telefonda alt alta (dar
 * sütunda iki madde yan yana okunmuyor), sm üstünde yan yana.
 */
export const IkiSecenek: React.FC<{
  secenekler: [Secenek, Secenek];
  metniCiz: (metin: string, anahtar: string) => React.ReactNode;
}> = ({ secenekler, metniCiz }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    {secenekler.map((s, i) => (
      <div key={s.baslik} className="rounded-xl bg-slate-50 px-4 py-3.5">
        <p className="text-[15px] font-extrabold text-gray-900">{s.baslik}</p>
        <ul className="mt-2 space-y-1.5">
          {s.satirlar.map((m, j) => (
            <li key={j} className="flex gap-2 text-[15px] leading-relaxed text-gray-700">
              <span aria-hidden className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
              <span>{metniCiz(m, `secenek-${i}-${j}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

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
    {baslik && <p className="mb-2 text-sm font-bold text-gray-500">{baslik}</p>}
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

export interface IsaretMaddesi {
  ad: string;
  ayrinti?: string;
}

/**
 * İşaretlenebilir kontrol listesi. İşaretler YALNIZ BU TARAYICIDA
 * (`localStorage`): kişisel takip, resmî bir onay değil; sunucuya
 * yazılmıyor. Depo kapalıysa (gizli sekme) işaretler sayfa açıkken kalıyor.
 * Ön render'da depo okunmuyor (etki yalnız tarayıcıda çalışıyor), statik
 * HTML'de liste boş işaretli çiziliyor.
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
    <div className="space-y-2">
      <p className="text-sm leading-relaxed text-gray-600">
        Kendi hazırlığınızı takip etmek için işaretleyin. İşaretler yalnız bu tarayıcıda kalır; resmî bir onay ya da
        tamamlanmış bir işlem anlamına gelmez.
      </p>
      <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
        {maddeler.map((m, i) => {
          const secili = Boolean(isaretler[String(i)]);
          return (
            <li key={m.ad}>
              <label className="flex min-h-14 cursor-pointer items-start gap-3 px-4 py-3">
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
    </div>
  );
};
