import React from 'react';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import { BIYOGRAFI_SINIRI } from '../../lib/sosyal-kullanici-adi.mjs';

/**
 * KURULUM VE DÜZENLEME AYNI ALANLARI KULLANIYOR
 *
 * İki ekran da aynı kolonları yazıyor (görünen ad, biyografi, bölüm,
 * sınıf, şehir). Alanlar iki dosyada ayrı ayrı yazılsaydı biri
 * değiştiğinde öteki sessizce ayrışırdı — depoda kart düğmelerinde
 * ölçülen ayrışmanın (bkz. lib/kart-cta.ts) aynısı.
 *
 * Hata metni `aria-describedby` ile alana bağlanıyor: kırmızı çerçeve tek
 * başına ekran okuyucuya hiçbir şey söylemez.
 */

const ALAN_KUTUSU = `w-full min-h-11 rounded-xl border bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 ${RENK_GECISI} ${ODAK_HALKASI}`;

export interface MetinAlaniProps {
  kimlik: string;
  etiket: string;
  deger: string;
  onDegis: (deger: string) => void;
  yardim?: string;
  hata?: string | null;
  yerTutucu?: string;
  enFazla?: number;
  gerekli?: boolean;
  otomatikTamamlama?: string;
}

export const MetinAlani: React.FC<MetinAlaniProps> = ({
  kimlik,
  etiket,
  deger,
  onDegis,
  yardim,
  hata,
  yerTutucu,
  enFazla,
  gerekli = false,
  otomatikTamamlama,
}) => {
  const yardimKimlik = `${kimlik}-yardim`;
  const hataKimlik = `${kimlik}-hata`;
  const aciklamalar = [yardim ? yardimKimlik : null, hata ? hataKimlik : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-1.5">
      <label htmlFor={kimlik} className="block text-sm font-bold text-gray-900">
        {etiket}
        {!gerekli && <span className="ml-1.5 font-medium text-gray-500">(isteğe bağlı)</span>}
      </label>
      <input
        id={kimlik}
        type="text"
        value={deger}
        required={gerekli}
        maxLength={enFazla}
        placeholder={yerTutucu}
        autoComplete={otomatikTamamlama}
        aria-invalid={hata ? true : undefined}
        aria-describedby={aciklamalar || undefined}
        onChange={(olay) => onDegis(olay.target.value)}
        className={`${ALAN_KUTUSU} ${hata ? 'border-rose-300' : 'border-gray-200'}`}
      />
      {yardim && (
        <p id={yardimKimlik} className="text-xs text-gray-600">
          {yardim}
        </p>
      )}
      {hata && (
        <p id={hataKimlik} role="alert" className="text-xs font-semibold text-rose-700">
          {hata}
        </p>
      )}
    </div>
  );
};

export interface BiyografiAlaniProps {
  deger: string;
  onDegis: (deger: string) => void;
  hata?: string | null;
}

export const BiyografiAlani: React.FC<BiyografiAlaniProps> = ({ deger, onDegis, hata }) => {
  const sayacKimlik = 'sosyal-biyografi-sayac';
  const hataKimlik = 'sosyal-biyografi-hata';

  return (
    <div className="space-y-1.5">
      <label htmlFor="sosyal-biyografi" className="block text-sm font-bold text-gray-900">
        Biyografi
        <span className="ml-1.5 font-medium text-gray-500">(isteğe bağlı)</span>
      </label>
      <textarea
        id="sosyal-biyografi"
        rows={3}
        value={deger}
        /*
          `maxLength` sınırı tarayıcıda da uyguluyor ama sayaç yine
          gösteriliyor: kullanıcı yazarken kesileceğini önceden görsün.
          Sınır veritabanındaki CHECK ile aynı sayı.
        */
        maxLength={BIYOGRAFI_SINIRI}
        aria-invalid={hata ? true : undefined}
        aria-describedby={[sayacKimlik, hata ? hataKimlik : null].filter(Boolean).join(' ')}
        onChange={(olay) => onDegis(olay.target.value)}
        className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 ${RENK_GECISI} ${ODAK_HALKASI} ${
          hata ? 'border-rose-300' : 'border-gray-200'
        }`}
      />
      <p id={sayacKimlik} className="text-xs text-gray-600">
        {deger.length} / {BIYOGRAFI_SINIRI} karakter
      </p>
      {hata && (
        <p id={hataKimlik} role="alert" className="text-xs font-semibold text-rose-700">
          {hata}
        </p>
      )}
    </div>
  );
};

export interface AciklamaAlaniProps {
  kimlik: string;
  etiket: string;
  deger: string;
  onDegis: (deger: string) => void;
  enFazla: number;
  yardim?: string;
}

/**
 * Çok satırlı serbest metin — biyografi DIŞINDAKİ kullanımlar için.
 *
 * `BiyografiAlani` kendi kimliğine ve şemadaki 300 karakter sınırına
 * bağlı; onu parametreleştirmek yerine ikinci bir bileşen açıldı, çünkü
 * biyografinin sınırı bir CHECK kısıtından geliyor ve oynatılabilir bir
 * prop olmamalı. Sayaç burada da var: kullanıcı kesileceğini yazarken
 * görsün.
 */
export const AciklamaAlani: React.FC<AciklamaAlaniProps> = ({
  kimlik,
  etiket,
  deger,
  onDegis,
  enFazla,
  yardim,
}) => {
  const sayacKimlik = `${kimlik}-sayac`;
  const yardimKimlik = `${kimlik}-yardim`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={kimlik} className="block text-sm font-bold text-gray-900">
        {etiket}
        <span className="ml-1.5 font-medium text-gray-500">(isteğe bağlı)</span>
      </label>
      <textarea
        id={kimlik}
        rows={3}
        value={deger}
        maxLength={enFazla}
        aria-describedby={[sayacKimlik, yardim ? yardimKimlik : null].filter(Boolean).join(' ')}
        onChange={(olay) => onDegis(olay.target.value)}
        className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 ${RENK_GECISI} ${ODAK_HALKASI}`}
      />
      {yardim && (
        <p id={yardimKimlik} className="text-xs text-gray-600">
          {yardim}
        </p>
      )}
      <p id={sayacKimlik} className="text-xs text-gray-600">
        {deger.length} / {enFazla} karakter
      </p>
    </div>
  );
};

/**
 * Kaydetme hatası kutusu.
 *
 * Sunucu hatası SESSİZ GEÇİLMİYOR ve "kaydedildi" gibi de gösterilmiyor:
 * kullanıcı yazdığı metnin kaybolup kaybolmadığını bilmeli. Form değerleri
 * yerinde kalıyor, hata üstünde duruyor.
 */
export const KayitHatasi: React.FC<{ mesaj: string }> = ({ mesaj }) => (
  <p
    role="alert"
    className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800"
  >
    {mesaj}
  </p>
);
