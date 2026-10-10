import React from 'react';
import { AY_ADLARI } from '../../lib/deneyim.mjs';
import { taslakOlustur } from '../../lib/profil-taslagi.mjs';
import { ALAN, ETIKET, HATA, IPUCU, YILLAR } from './form-siniflari';

/*
  PROFİL DÜZENLEME — ORTAK PARÇALAR (11 Ekim 2026)

  Bütün bölümler tek bir taslağı düzenliyor (`lib/profil-taslagi.mjs`);
  kayıt en sonda "Tüm değişiklikleri kaydet" ile. Bölümler taslağı
  `degistir` ile güncelliyor, hataları `hata(alanKimligi)` ile okuyor.
*/

export type Taslak = ReturnType<typeof taslakOlustur>;

export interface BolumProps {
  t: Taslak;
  degistir: (f: (t: Taslak) => Taslak) => void;
  /** Bu alan için doğrulama mesajı (yalnız kayıt denendikten sonra). */
  hata: (alan: string) => string | undefined;
  /** Kimliği bu önekle başlayan bir alanda hata var mı (kapalı kartı açmak için). */
  hataVar: (onEk: string) => boolean;
}

/** Etiket + alan + ipucu + hata. Hata metni alanla `aria-describedby` ile bağlı. */
export const Alan: React.FC<{
  id: string;
  etiket: React.ReactNode;
  hata?: string;
  ipucu?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ id, etiket, hata, ipucu, className = '', children }) => (
  <div className={`min-w-0 ${className}`}>
    <label className={ETIKET} htmlFor={id}>
      {etiket}
    </label>
    {children}
    {ipucu && !hata && <p className={IPUCU}>{ipucu}</p>}
    {hata && (
      <p id={`${id}-hata`} role="alert" className={HATA}>
        {hata}
      </p>
    )}
  </div>
);

export const IstegeBagli = () => <span className="font-normal text-gray-600">(isteğe bağlı)</span>;

/** Yıl seçimi. */
export const YilSecimi: React.FC<{
  id: string;
  deger: string;
  onDegis: (v: string) => void;
  bosMetin?: string;
  disabled?: boolean;
  hatali?: boolean;
}> = ({ id, deger, onDegis, bosMetin = 'Seç', disabled = false, hatali = false }) => (
  <select
    id={id}
    value={deger}
    disabled={disabled}
    aria-invalid={hatali || undefined}
    aria-describedby={hatali ? `${id}-hata` : undefined}
    onChange={(e) => onDegis(e.target.value)}
    className={`${ALAN} disabled:bg-gray-100 disabled:text-gray-500`}
  >
    <option value="">{bosMetin}</option>
    {YILLAR.map((y) => (
      <option key={y} value={String(y)}>
        {y}
      </option>
    ))}
  </select>
);

/** Ay + yıl seçimi; iki küçük seçim kutusu, tek etiket. */
export const AyYil: React.FC<{
  idOnEki: string;
  etiket: string;
  ay: string;
  yil: string;
  onAy: (v: string) => void;
  onYil: (v: string) => void;
  disabled?: boolean;
  hata?: string;
}> = ({ idOnEki, etiket, ay, yil, onAy, onYil, disabled = false, hata }) => (
  <fieldset disabled={disabled} className="min-w-0 disabled:opacity-50">
    <legend className={ETIKET}>{etiket}</legend>
    <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-2">
      <select
        id={`${idOnEki}-ay`}
        aria-label={`${etiket} ayı`}
        aria-invalid={Boolean(hata) || undefined}
        aria-describedby={hata ? `${idOnEki}-ay-hata` : undefined}
        value={ay}
        onChange={(e) => onAy(e.target.value)}
        className={ALAN}
      >
        <option value="">Ay</option>
        {AY_ADLARI.map((ad: string, i: number) => (
          <option key={ad} value={String(i + 1)}>
            {ad}
          </option>
        ))}
      </select>
      <select
        id={`${idOnEki}-yil`}
        aria-label={`${etiket} yılı`}
        aria-invalid={Boolean(hata) || undefined}
        value={yil}
        onChange={(e) => onYil(e.target.value)}
        className={ALAN}
      >
        <option value="">Yıl</option>
        {YILLAR.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </div>
    {hata && (
      <p id={`${idOnEki}-ay-hata`} role="alert" className={HATA}>
        {hata}
      </p>
    )}
  </fieldset>
);

/** "Devam ediyorum" kutusu. */
export const DevamKutusu: React.FC<{ isaretli: boolean; onDegis: (v: boolean) => void; metin?: string }> = ({
  isaretli,
  onDegis,
  metin = 'Devam ediyorum',
}) => (
  <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-semibold text-gray-900">
    <input
      type="checkbox"
      checked={isaretli}
      onChange={(e) => onDegis(e.target.checked)}
      className="h-5 w-5 shrink-0 cursor-pointer rounded border-gray-300 accent-blue-600"
    />
    {metin}
  </label>
);

/** Listedeki kaydı kaldırmadan önce sorulan satır. */
export const KaldirmaSorusu: React.FC<{ soru: string; onKaldir: () => void; onVazgec: () => void }> = ({
  soru,
  onKaldir,
  onVazgec,
}) => (
  <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-rose-50 p-2.5">
    <p className="min-w-0 flex-1 text-sm font-semibold text-rose-900">{soru}</p>
    <button
      type="button"
      onClick={onKaldir}
      className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-800 hover:bg-rose-50"
    >
      Kaldır
    </button>
    <button
      type="button"
      onClick={onVazgec}
      className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50"
    >
      Vazgeç
    </button>
  </div>
);
