import React from 'react';
import { ChevronDown, List } from 'lucide-react';

/*
  REHBER OKUMA DENEYİMİ — yardımcı parçalar (17 Eylül 2026)

  Rehber metni DEĞİŞMİYOR; yalnız sunumu. Buradaki parçalar metnin
  üstüne biniyor:
    - `useRehberBasliklari`: gövdedeki h2'leri bulup kimlik veriyor ve
      ekranda okunan bölümü izliyor.
    - `OkumaCubugu`: sayfanın en üstünde okuma ilerlemesi.
    - `IcindekilerYan` / `IcindekilerMobil`: aynı başlık listesi, geniş
      ekranda yapışkan sütunda, telefonda açılır kutuda.
    - `REHBER_GOVDE_STILI`: doğrudan çocuk h2/p/ul/ol için okunaklı
      tipografi; numaralı bölüm rozetleri ve onay işaretli liste.
*/

export interface RehberBasligi {
  id: string;
  metin: string;
}

/**
 * Başlıkları bulur. Dört başlıktan azsa içindekiler çizilmiyor (kısa yazıda
 * gereksiz). `kendiNumarasiVar`: yazar başlıkları zaten numaraladıysa
 * ("1. …") bizim sayımız eklenmiyor, "1. 1. …" çıkmasın.
 */
export function useRehberBasliklari(kap: React.RefObject<HTMLDivElement | null>, anahtar: string) {
  const [basliklar, setBasliklar] = React.useState<RehberBasligi[]>([]);
  const [etkin, setEtkin] = React.useState<string | null>(null);

  React.useEffect(() => {
    const kok = kap.current;
    if (!kok) return;
    const ogeler = Array.from(kok.querySelectorAll<HTMLHeadingElement>(':scope > h2'));
    const bulunan = ogeler.map((h, i) => {
      if (!h.id) h.id = `bolum-${i + 1}`;
      h.classList.add('scroll-mt-24');
      return { id: h.id, metin: h.textContent || '' };
    });
    setBasliklar(bulunan);
    setEtkin(bulunan[0]?.id ?? null);
    if (ogeler.length === 0) return;
    /*
      Etkin bölüm: üst kısmı ekranın üst %30'unu geçmiş SON başlık.
      Kesişim gözlemcisi başlık dar bandın dışına çıkınca hiçbir şey
      bildirmiyordu ve vurgu eski bölümde takılı kalıyordu (ölçüldü).
    */
    let kare = 0;
    const hesapla = () => {
      kare = 0;
      const sinir = window.innerHeight * 0.3;
      let secili = ogeler[0].id;
      for (const h of ogeler) {
        if (h.getBoundingClientRect().top <= sinir) secili = h.id;
        else break;
      }
      setEtkin(secili);
    };
    const kaydir = () => {
      if (!kare) kare = requestAnimationFrame(hesapla);
    };
    hesapla();
    window.addEventListener('scroll', kaydir, { passive: true });
    return () => {
      window.removeEventListener('scroll', kaydir);
      if (kare) cancelAnimationFrame(kare);
    };
  }, [kap, anahtar]);

  const kendiNumarasiVar = basliklar.some((b) => /^\d+[.)]\s/.test(b.metin.trim()));
  return { basliklar: basliklar.length >= 4 ? basliklar : [], tumBasliklar: basliklar, etkin, kendiNumarasiVar };
}

const git = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export const IcindekilerYan: React.FC<{
  basliklar: RehberBasligi[];
  etkin: string | null;
  kendiNumarasiVar: boolean;
}> = ({ basliklar, etkin, kendiNumarasiVar }) => {
  if (!basliklar.length) return null;
  const sira = Math.max(0, basliklar.findIndex((b) => b.id === etkin));
  return (
    <nav aria-label="İçindekiler" className="rounded-3xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
          <List aria-hidden className="h-4 w-4" />
          İçindekiler
        </p>
        <span className="text-xs font-semibold tabular-nums text-gray-500">
          {sira + 1}/{basliklar.length}
        </span>
      </div>
      <div aria-hidden className="mt-3 h-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
          style={{ width: `${((sira + 1) / basliklar.length) * 100}%` }}
        />
      </div>
      <ol className="mt-3 space-y-0.5">
        {basliklar.map((b, i) => {
          const aktif = b.id === etkin;
          return (
            <li key={b.id}>
              <a
                href={`#${b.id}`}
                onClick={git(b.id)}
                aria-current={aktif ? 'location' : undefined}
                className={`flex min-h-10 items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm transition-colors ${
                  aktif ? 'bg-blue-50 font-bold text-blue-800' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {!kendiNumarasiVar && (
                  <span
                    aria-hidden
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      aktif ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {i + 1}
                  </span>
                )}
                <span className="min-w-0">{b.metin}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export const IcindekilerMobil: React.FC<{ basliklar: RehberBasligi[]; kendiNumarasiVar: boolean }> = ({
  basliklar,
  kendiNumarasiVar,
}) => {
  if (!basliklar.length) return null;
  return (
    <details className="group rounded-2xl border border-gray-200 bg-white lg:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-bold text-gray-900">
        <span className="flex items-center gap-2">
          <List aria-hidden className="h-4 w-4 text-blue-600" />
          İçindekiler · {basliklar.length} bölüm
        </span>
        <ChevronDown aria-hidden className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" />
      </summary>
      <ol className="space-y-0.5 px-2 pb-3">
        {basliklar.map((b, i) => (
          <li key={b.id}>
            <a
              href={`#${b.id}`}
              onClick={git(b.id)}
              className="flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              {!kendiNumarasiVar && (
                <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">
                  {i + 1}
                </span>
              )}
              <span className="min-w-0">{b.metin}</span>
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
};

/** Sayfanın en üstünde ince okuma ilerlemesi. */
export const OkumaCubugu: React.FC = () => {
  const [oran, setOran] = React.useState(0);
  React.useEffect(() => {
    let kare = 0;
    const hesapla = () => {
      kare = 0;
      const kok = document.documentElement;
      const toplam = kok.scrollHeight - kok.clientHeight;
      setOran(toplam > 0 ? Math.min(1, kok.scrollTop / toplam) : 0);
    };
    const kaydir = () => {
      if (!kare) kare = requestAnimationFrame(hesapla);
    };
    hesapla();
    window.addEventListener('scroll', kaydir, { passive: true });
    window.addEventListener('resize', kaydir);
    return () => {
      window.removeEventListener('scroll', kaydir);
      window.removeEventListener('resize', kaydir);
      if (kare) cancelAnimationFrame(kare);
    };
  }, []);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 bg-transparent">
      <div className="h-full origin-left bg-blue-600" style={{ transform: `scaleX(${oran})` }} />
    </div>
  );
};

/*
  GÖVDE TİPOGRAFİSİ

  Yalnız DOĞRUDAN çocuklara uygulanıyor (`> h2`, `> p` …): gövde içindeki
  hazır görsel bileşenler (karşılaştırma kutuları, tablolar, CV örneği)
  kendi stillerinde kalıyor. Numaralı rozet yazar başlıkları kendisi
  numaralamadıysa (`rehber-govde--sayili`) ekleniyor.
*/
const ONAY =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='10' fill='%23DBEAFE'/%3E%3Cpath d='M6 10.5l2.5 2.5L14 7.5' stroke='%232563EB' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

export const REHBER_GOVDE_STILI = `
.rehber-govde { counter-reset: rehber-bolum; }
.rehber-govde > * + * { margin-top: 1rem; }
.rehber-govde > h2 {
  display: flex; align-items: center; gap: .75rem;
  margin-top: 2.75rem; padding-top: 0;
  font-size: 1.375rem; line-height: 1.3; font-weight: 800; letter-spacing: -.01em; color: #0f172a;
}
.rehber-govde > h2:first-child { margin-top: .5rem; }
.rehber-govde--sayili > h2 { counter-increment: rehber-bolum; }
.rehber-govde--sayili > h2::before {
  content: counter(rehber-bolum);
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 2.25rem; height: 2.25rem; border-radius: 9999px;
  background: linear-gradient(135deg, #2563eb, #60a5fa); color: #fff;
  font-size: .95rem; font-weight: 800; box-shadow: 0 6px 16px -8px rgba(37,99,235,.7);
}
.rehber-govde > p { font-size: 1.0625rem; line-height: 1.85; color: #374151; }
.rehber-govde > h2 + p { font-size: 1.0625rem; }
.rehber-govde > ul { list-style: none; padding-left: 0; }
.rehber-govde > ul > li {
  position: relative; padding-left: 2rem; font-size: 1.0625rem; line-height: 1.8; color: #374151;
}
.rehber-govde > ul > li + li { margin-top: .6rem; }
.rehber-govde > ul > li::before {
  content: ''; position: absolute; left: 0; top: .3rem; width: 1.3rem; height: 1.3rem;
  background: ${ONAY} no-repeat center / contain;
}
.rehber-govde > ol { padding-left: 1.4rem; }
.rehber-govde > ol > li { font-size: 1.0625rem; line-height: 1.8; color: #374151; padding-left: .25rem; }
.rehber-govde > ol > li::marker { color: #2563eb; font-weight: 800; }
.rehber-govde > p strong, .rehber-govde > ul strong { color: #0f172a; }
@media (max-width: 639px) {
  .rehber-govde > h2 { font-size: 1.2rem; margin-top: 2.25rem; }
  .rehber-govde > p, .rehber-govde > ul > li, .rehber-govde > ol > li { font-size: 1rem; line-height: 1.75; }
}
`;
