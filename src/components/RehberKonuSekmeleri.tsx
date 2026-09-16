import React from 'react';
import {
  BookOpen,
  Briefcase,
  FileText,
  GraduationCap,
  Home,
  Plane,
  School,
  TrendingUp,
} from 'lucide-react';

/**
 * Rehber merkezinin konu sekmeleri — kompakt, yatay kaydırılabilir haplar.
 *
 * NEDEN DAİRE DEĞİL
 * -----------------
 * Onaylanan tasarımda başlığın hemen altında simgeli, yuvarlak köşeli
 * haplar var: seçili olan mavi dolgulu. Daire şeridi iki satırlık
 * (simge + ad + sayı) bir yer kaplıyordu; haplar tek satır ve öne çıkan
 * rehber daha yukarıdan başlıyor.
 *
 * Ortak `KonuSeridi` fırsat sayfasında kullanılmaya devam ediyor; bu
 * bileşen yalnız rehber merkezinin.
 */

type Simge = React.ComponentType<{ className?: string; strokeWidth?: number }>;

const IKONLAR: Record<string, Simge> = {
  staj: Briefcase,
  cv: FileText,
  burs: GraduationCap,
  yurt: Home,
  universite: School,
  yurtdisi: Plane,
  kariyer: TrendingUp,
};

/*
  KISA ETİKET HAPTA, TAM AD EKRAN OKUYUCUDA

  Onaylanan tasarımda haplar kısa ("CV") ve telefonda beş tanesi aynı
  anda görünüyor. Konunun tam adı ("CV ve başvuru") `aria-label`da ve
  bölüm başlıklarında duruyor.
*/
const KISA_ETIKET: Record<string, string> = {
  cv: 'CV',
  yurt: 'Yurt',
  universite: 'Üniversite',
  kariyer: 'Kariyer',
};

const hapSinifi = (secili: boolean) =>
  `inline-flex min-h-[34px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-[13px] font-medium transition-colors ${
    secili ? 'bg-blue-600 font-semibold text-white' : 'bg-gray-100 text-slate-800 hover:bg-gray-200'
  }`;

export const RehberKonuSekmeleri: React.FC<{
  konular: { id: string; etiket: string; adet: number }[];
  /** Seçili konu; "Tümü" seçiliyken boş dize. */
  secili: string;
  toplam: number;
  onSec: (konu: string) => void;
  onTumu: () => void;
}> = ({ konular, secili, toplam, onSec, onTumu }) => {
  if (konular.length === 0) return null;
  return (
    <nav aria-label="Rehber konuları" className="-mx-4 sm:mx-0">
      <ul className="flex min-w-0 gap-1.5 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] sm:px-0 [&::-webkit-scrollbar]:hidden">
        <li>
          <button
            type="button"
            onClick={onTumu}
            aria-pressed={secili === ''}
            aria-label={`Tümü, ${toplam} rehber`}
            className={hapSinifi(secili === '')}
          >
            <BookOpen aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Tümü
          </button>
        </li>
        {konular.map((k) => {
          const Ikon = IKONLAR[k.id] ?? BookOpen;
          const aktif = secili === k.id;
          return (
            <li key={k.id}>
              <button
                type="button"
                onClick={() => onSec(k.id)}
                aria-pressed={aktif}
                aria-label={`${k.etiket}, ${k.adet} rehber`}
                className={hapSinifi(aktif)}
              >
                <Ikon aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {KISA_ETIKET[k.id] ?? k.etiket}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
