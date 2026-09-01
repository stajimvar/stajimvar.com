import React from 'react';
import { ArrowUpRight, Building2, GraduationCap, MapPin } from 'lucide-react';
import { RehberIzgarasi, RehberKarti, type KartProps } from './RehberKartlari';
import type { Rehber } from '../data/rehberler';

/**
 * Birleşik arama sonuçları.
 *
 * NEDEN GRUPLU
 * ------------
 * Rehber alanı dört ayrı hazine taşıyor: yazılar, bölüm rehberleri,
 * doğrulanmış işverenler ve kariyer merkezleri. Arama artık dördünde
 * birden geziyor — "Aselsan" yazan kişi hiçbir sonuç alamıyordu.
 *
 * Dördü tek listeye karışsaydı okuyucu neye baktığını anlamazdı: bir yazı
 * ile bir şirket aynı görünürdü. Her tür kendi başlığı altında ve kendi
 * biçiminde; yazılar kart, ötekiler satır.
 */

const Baslik: React.FC<{ metin: string; adet: number }> = ({ metin, adet }) => (
  <div className="flex items-baseline gap-2.5">
    <h3 className="text-sm font-bold text-gray-900">{metin}</h3>
    <span className="text-xs text-gray-600">{adet}</span>
  </div>
);

const Satir: React.FC<{
  ikon: React.ReactNode;
  baslik: string;
  altMetin?: string;
  onClick: () => void;
}> = ({ ikon, baslik, altMetin, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-blue-300"
  >
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
      {ikon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-bold text-gray-900">{baslik}</span>
      {altMetin && <span className="block truncate text-xs text-gray-600">{altMetin}</span>}
    </span>
    <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-500" />
  </button>
);

export interface Sonuclar {
  rehberler: Rehber[];
  bolumler: { slug: string; ad: string; ozet?: string }[];
  isverenler: { slug: string; isveren: string; sektor?: string }[];
  merkezler: { universite: string; sehir?: string; url: string }[];
  toplam: number;
}

export const RehberSonuclari: React.FC<{
  sonuclar: Sonuclar;
  onNavigate: (yol: string) => void;
  kartOzellikleri: (r: Rehber) => KartProps;
}> = ({ sonuclar, onNavigate, kartOzellikleri }) => (
  <div className="space-y-6">
    {sonuclar.rehberler.length > 0 && (
      <section className="space-y-3">
        <Baslik metin="Rehberler" adet={sonuclar.rehberler.length} />
        <RehberIzgarasi>
          {sonuclar.rehberler.map((r) => (
            <RehberKarti key={r.slug} {...kartOzellikleri(r)} />
          ))}
        </RehberIzgarasi>
      </section>
    )}

    {sonuclar.bolumler.length > 0 && (
      <section className="space-y-3">
        <Baslik metin="Bölümler" adet={sonuclar.bolumler.length} />
        <div className="grid gap-2 sm:grid-cols-2">
          {sonuclar.bolumler.map((b) => (
            <Satir
              key={b.slug}
              ikon={<GraduationCap className="h-4 w-4" />}
              baslik={b.ad}
              altMetin={b.ozet}
              onClick={() => onNavigate(`/bolum/${b.slug}`)}
            />
          ))}
        </div>
      </section>
    )}

    {sonuclar.isverenler.length > 0 && (
      <section className="space-y-3">
        <Baslik metin="İşverenler" adet={sonuclar.isverenler.length} />
        <div className="grid gap-2 sm:grid-cols-2">
          {sonuclar.isverenler.map((i) => (
            <Satir
              key={i.slug}
              ikon={<Building2 className="h-4 w-4" />}
              baslik={i.isveren}
              altMetin={i.sektor}
              onClick={() => onNavigate(`/sirket/${i.slug}`)}
            />
          ))}
        </div>
      </section>
    )}

    {sonuclar.merkezler.length > 0 && (
      <section className="space-y-3">
        <Baslik metin="Kariyer merkezleri" adet={sonuclar.merkezler.length} />
        <div className="grid gap-2 sm:grid-cols-2">
          {sonuclar.merkezler.map((mk) => (
            <Satir
              key={mk.universite}
              ikon={<MapPin className="h-4 w-4" />}
              baslik={mk.universite}
              altMetin={mk.sehir}
              onClick={() => onNavigate('/universite-kariyer-merkezleri')}
            />
          ))}
        </div>
      </section>
    )}
  </div>
);
