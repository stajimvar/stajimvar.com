import React from 'react';
import {
  CalendarPlus,
  Clock3,
  Globe2,
  GraduationCap,
  HandCoins,
  Layers,
  School,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { BURS_KESIF_KATEGORILERI } from '../lib/burs-kesif.mjs';
import { KesifDairesi, KesifSeridi } from './KesifSeridi';

const IKONLAR: Record<string, LucideIcon> = {
  tumu: Layers,
  'sana-uygun': Sparkles,
  'yeni-eklenenler': CalendarPlus,
  'son-gunler': Clock3,
  karsiliksiz: HandCoins,
  lisans: GraduationCap,
  'yuksek-lisans': School,
  'yurt-disi': Globe2,
};

export const BursKesifSeridi: React.FC<{
  sayilar: Record<string, number>;
  secili: string;
  onSec: (kategori: string) => void;
}> = ({ sayilar, secili, onSec }) => (
  <KesifSeridi baslik="Bursları keşfet">
    {BURS_KESIF_KATEGORILERI.map((kategori) => {
      const Ikon = IKONLAR[kategori.id];
      return (
        <KesifDairesi
          key={kategori.id}
          etiket={kategori.etiket}
          altEtiket={`${sayilar[kategori.id] ?? 0} burs`}
          secili={secili === kategori.id}
          seciliRenk="#2563eb"
          onClick={() => onSec(kategori.id)}
        >
          <Ikon className="h-5 w-5 text-blue-600" />
        </KesifDairesi>
      );
    })}
  </KesifSeridi>
);
