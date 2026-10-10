import React from 'react';
import { Plus, ShieldCheck, X } from 'lucide-react';
import { TR_CITIES } from '../../data/turkeyData';
import { HEDEF_POZISYONLAR } from '../../lib/pozisyonlar.mjs';
import { ODAK_HALKASI } from '../../lib/renk-token';
import { ALAN, EKLE, ETIKET, IPUCU, KUCUK_EYLEM } from './form-siniflari';
import type { BolumProps, Taslak } from './ortak';

/*
  "NE ARIYORSUN?" — eşleşme tercihleri (11 Ekim 2026'dan beri taslakta)

  Önceden her dokunuş anında kaydediliyordu; artık öteki bölümler gibi
  "Tüm değişiklikleri kaydet" ile. Yüzdeyi etkilemiyor.
*/

/* Eski "Ne arıyorsun?" bölümündeki ülke listesi — aynı kodlar, aynı sıra. */
const GLOBAL_COUNTRIES = [
  ['TR', 'Türkiye'], ['FR', 'Fransa'], ['DE', 'Almanya'], ['US', 'Amerika Birleşik Devletleri'],
  ['GB', 'Birleşik Krallık'], ['NL', 'Hollanda'], ['ES', 'İspanya'], ['IT', 'İtalya'],
] as const;

const CIP = 'inline-flex min-h-11 items-center gap-1 rounded-xl border border-blue-100 bg-blue-50 pl-3 pr-1 text-sm font-semibold text-blue-900';

export const TercihAyarlari: React.FC<Pick<BolumProps, 't' | 'degistir'>> = ({ t, degistir }) => {
  const [tumHedefler, setTumHedefler] = React.useState(false);
  const p = t.tercih;
  const yaz = (yama: Partial<Taslak['tercih']>) => degistir((o) => ({ ...o, tercih: { ...o.tercih, ...yama } }));
  const hedefDegistir = (rol: string) =>
    yaz({ hedefler: p.hedefler.includes(rol) ? p.hedefler.filter((r) => r !== rol) : [...p.hedefler, rol] });
  return (
    <div className="space-y-5">
      <div>
        <span className={ETIKET}>Aradığın pozisyon</span>
        {p.hedefler.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-2">
            {p.hedefler.map((rol) => (
              <li key={rol} className={CIP}>
                {rol}
                <button type="button" onClick={() => hedefDegistir(rol)} aria-label={`${rol} kaldır`} className={KUCUK_EYLEM}>
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-1.5">
          {(tumHedefler ? HEDEF_POZISYONLAR : HEDEF_POZISYONLAR.slice(0, 8))
            .filter((r: string) => !p.hedefler.includes(r))
            .map((rol: string) => (
              <button key={rol} type="button" onClick={() => hedefDegistir(rol)} className={EKLE}>
                <Plus aria-hidden className="h-3.5 w-3.5" />
                {rol}
              </button>
            ))}
          <button
            type="button"
            onClick={() => setTumHedefler((v) => !v)}
            className={`min-h-11 cursor-pointer px-2 text-sm font-bold text-blue-700 ${ODAK_HALKASI}`}
          >
            {tumHedefler ? 'Daha az göster' : 'Tümünü göster'}
          </button>
        </div>
      </div>

      <div>
        <span className={ETIKET}>Çalışmak istediğin şehirler</span>
        {p.sehirler.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-2">
            {p.sehirler.map((sehir) => (
              <li key={sehir} className={CIP}>
                {sehir}
                <button
                  type="button"
                  onClick={() => yaz({ sehirler: p.sehirler.filter((c) => c !== sehir) })}
                  aria-label={`${sehir} kaldır`}
                  className={KUCUK_EYLEM}
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <select
          value=""
          aria-label="Şehir ekle"
          onChange={(e) => {
            const secilen = e.target.value;
            if (secilen && !p.sehirler.includes(secilen)) yaz({ sehirler: [...p.sehirler, secilen] });
          }}
          className={ALAN}
        >
          <option value="">+ Şehir ekle</option>
          {TR_CITIES.filter((c) => !p.sehirler.includes(c)).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={ETIKET} htmlFor="calisma-sekli">
            Çalışma şekli
          </label>
          <select id="calisma-sekli" value={p.calismaSekli} onChange={(e) => yaz({ calismaSekli: e.target.value })} className={ALAN}>
            <option value="Any">Farketmez</option>
            <option value="On-site">Ofiste</option>
            <option value="Hybrid">Hibrit</option>
            <option value="Remote">Uzaktan</option>
          </select>
        </div>
        <div>
          <label className={ETIKET} htmlFor="staj-turu">
            Staj türü
          </label>
          <select id="staj-turu" value={p.stajTuru} onChange={(e) => yaz({ stajTuru: e.target.value })} className={ALAN}>
            {p.stajTuru === 'Any' && <option value="Any">Farketmez</option>}
            <option value="Summer Mandatory">Yaz dönemi zorunlu staj</option>
            <option value="Long-term">Uzun dönem (dönem içi)</option>
            <option value="Voluntary">Gönüllü staj</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={ETIKET} htmlFor="arayuz-dili">
            Arayüz dili
          </label>
          <select id="arayuz-dili" value={p.arayuzDili} onChange={(e) => yaz({ arayuzDili: e.target.value })} className={ALAN}>
            <option value="">Tarayıcı dilini kullan</option>
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
        <div>
          <label className={ETIKET} htmlFor="staj-ulkesi">
            Staj aradığın ülkeler
          </label>
          <select
            id="staj-ulkesi"
            value=""
            onChange={(e) => {
              const kod = e.target.value;
              if (kod && !p.ulkeler.includes(kod)) yaz({ ulkeler: [...p.ulkeler, kod] });
            }}
            className={ALAN}
          >
            <option value="">+ Ülke ekle</option>
            {GLOBAL_COUNTRIES.filter(([kod]) => !p.ulkeler.includes(kod)).map(([kod, ad]) => (
              <option key={kod} value={kod}>
                {ad}
              </option>
            ))}
          </select>
        </div>
        {p.ulkeler.length > 0 && (
          <ul className="flex flex-wrap gap-2 sm:col-span-2">
            {p.ulkeler.map((kod, i) => (
              <li key={kod} className={CIP}>
                {i + 1}. {GLOBAL_COUNTRIES.find((x) => x[0] === kod)?.[1] ?? kod}
                <button
                  type="button"
                  aria-label={`${kod} tercihini kaldır`}
                  onClick={() => yaz({ ulkeler: p.ulkeler.filter((x) => x !== kod) })}
                  className={KUCUK_EYLEM}
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className={`${IPUCU} sm:col-span-2`}>
          İlk ülke varsayılan keşif ülken olur. İlan ekranında geçici ülke değiştirmek bu listeyi değiştirmez.
        </p>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-emerald-700" />
          Sigortamı üniversite karşılıyor
        </span>
        <input
          type="checkbox"
          checked={p.sigorta}
          onChange={(e) => yaz({ sigorta: e.target.checked })}
          className="h-5 w-5 shrink-0 accent-blue-600"
        />
      </label>
    </div>
  );
};
