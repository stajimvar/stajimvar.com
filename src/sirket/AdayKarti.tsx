import React from 'react';
import { ExternalLink, ShieldOff } from 'lucide-react';
import {
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU,
  SIRKET_VURGU_KOYU,
  SIRKET_YUZEY,
} from './renk';
import { UYUM_ETIKETI, kimlikSatiri, monogram } from '../lib/aday-kart.mjs';

/**
 * Başvuran kartı.
 *
 * NE VAR: ad (ya da monogram), okul · bölüm · sınıf, şehir, 3–5 yetenek,
 * rozet, başvuru tarihi ve uyum şeridi.
 *
 * NE YOK: overall puanı, stat çubuğu, altın/gümüş kart, forma, stadyum,
 * TCKN, adres, yaş, zorunlu fotoğraf. Karşıdaki gerçek bir öğrenci;
 * oyuncu kartı estetiği için sayı uydurulmuyor.
 *
 * Kart yaklaşık 2:3 oranında (aspect-[2/3]) — ızgarada göz taraması için
 * dikey kart, yatay satırdan hızlı.
 */

const SERIT: Record<string, { renk: string; oran: string }> = {
  yuksek: { renk: SIRKET_VURGU, oran: '100%' },
  orta: { renk: SIRKET_VURGU, oran: '60%' },
  dusuk: { renk: SIRKET_KENAR, oran: '30%' },
  bilinmiyor: { renk: SIRKET_KENAR, oran: '0%' },
};

const tarihYaz = (t: string | null) => {
  if (!t) return '';
  const d = new Date(t);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

export interface AdayKart {
  id: string;
  ad: string | null;
  fotoUrl: string | null;
  universite: string | null;
  bolum: string | null;
  sinif: string | null;
  sehir: string | null;
  yetenekler: string[];
  rozetler: string[];
  puan: number | null;
  band: string;
  tarih: string | null;
  durum: string;
  paylasildi: boolean;
  yontem: string;
  gizli?: boolean;
}

export const AdayKarti: React.FC<{
  kart: AdayKart;
  odakli: boolean;
  onAc: () => void;
}> = ({ kart, odakli, onAc }) => {
  const serit = SERIT[kart.band] ?? SERIT.bilinmiyor;
  const kimlik = kimlikSatiri(kart);

  return (
    <button
      type="button"
      onClick={onAc}
      data-aday-karti={kart.id}
      aria-label={`${kart.ad ?? 'Aday'} — ${UYUM_ETIKETI[kart.band as keyof typeof UYUM_ETIKETI]}`}
      className="flex aspect-[2/3] w-full cursor-pointer flex-col overflow-hidden rounded-2xl border text-left transition-shadow"
      style={{
        background: SIRKET_YUZEY,
        borderColor: odakli ? SIRKET_VURGU : SIRKET_KENAR,
        boxShadow: odakli ? `0 0 0 3px ${SIRKET_ROZET}` : 'none',
      }}
    >
      {/*
        Uyum şeridi. Yüzde sayısı da yazıyor — çubuk tek başına
        "%80 mi %60 mı" sorusunu açık bırakırdı.
      */}
      <span className="block h-1.5 w-full" style={{ background: SIRKET_KENAR }}>
        <span className="block h-full" style={{ width: serit.oran, background: serit.renk }} />
      </span>

      <span className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        <span className="flex items-center gap-2">
          {kart.fotoUrl && !kart.gizli ? (
            <img
              src={kart.fotoUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black"
              style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
            >
              {kart.gizli ? <ShieldOff className="h-4 w-4" /> : monogram(kart.ad)}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-extrabold" style={{ color: SIRKET_METIN }}>
              {kart.gizli ? 'Aday' : (kart.ad ?? 'Ad paylaşılmadı')}
            </span>
            {kart.puan !== null && (
              <span className="block text-[11px] font-bold" style={{ color: SIRKET_VURGU_KOYU }}>
                %{kart.puan} uyum
              </span>
            )}
          </span>
        </span>

        {kimlik && (
          <span
            className="line-clamp-2 text-[11px] font-semibold leading-snug"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            {kimlik}
          </span>
        )}
        {kart.sehir && (
          <span className="text-[11px]" style={{ color: SIRKET_METIN_IKINCIL }}>
            {kart.sehir}
          </span>
        )}

        {kart.yetenekler.length > 0 && (
          <span className="mt-auto flex flex-wrap gap-1">
            {kart.yetenekler.map((y) => (
              <span
                key={y}
                className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
              >
                {y}
              </span>
            ))}
          </span>
        )}

        {/*
          Şirketin kendi sitesinden gelen başvuruda bizde paylaşılmış bir
          profil yok. İsim uydurmak yerine ne olduğu yazıyor.
        */}
        {!kart.paylasildi && (
          <span
            className="mt-auto flex items-center gap-1 text-[10px] font-semibold leading-snug"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            Şirketin kendi sitesinden başvuruldu
          </span>
        )}

        <span
          className="flex items-center justify-between border-t pt-2 text-[10px] font-semibold"
          style={{ borderColor: SIRKET_KENAR, color: SIRKET_METIN_IKINCIL }}
        >
          <span>{tarihYaz(kart.tarih)}</span>
          {kart.rozetler.length > 0 && <span>{kart.rozetler.length} rozet</span>}
        </span>
      </span>
    </button>
  );
};
