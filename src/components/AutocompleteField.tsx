import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';

/**
 * Öneri listeli metin alanı.
 *
 * `<datalist>` YERİNE yazıldı: iOS Safari datalist önerilerini hiç
 * göstermiyor. Masaüstünde çalışıp mobilde sessizce hiçbir şey yapmayan bir
 * alan, kullanıcıya "bu site bozuk" dedirtiyordu.
 *
 * Kapalı liste değil: listede olmayan bir değer de yazılabilir. Öneriler
 * yalnızca yazmayı kısaltmak ve yazım birliği sağlamak için.
 *
 * Türkçe arama: "mimar sinan" yazınca "Mimar Sinan Güzel Sanatlar
 * Üniversitesi" bulunur; "i" ile "ı", "s" ile "ş" ayrımı arama sırasında
 * yok sayılır.
 */

const TR_KATLAMA: Record<string, string> = {
  ı: 'i', İ: 'i', I: 'i', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u',
  ş: 's', Ş: 's', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c', â: 'a', î: 'i', û: 'u',
};

function katla(s: string): string {
  let out = '';
  for (const ch of s) out += TR_KATLAMA[ch] ?? ch;
  return out.toLowerCase().trim();
}

interface AutocompleteFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  id?: string;
  maxSuggestions?: number;
  className?: string;
}

export const AutocompleteField: React.FC<AutocompleteFieldProps> = ({
  value,
  onChange,
  options,
  placeholder,
  required,
  id,
  maxSuggestions = 8,
  className = '',
}) => {
  const [acik, setAcik] = useState(false);
  const [vurgulu, setVurgulu] = useState(-1);
  const sarmalayici = useRef<HTMLDivElement>(null);

  const oneriler = useMemo(() => {
    const aranan = katla(value);
    if (!aranan) return options.slice(0, maxSuggestions);

    const basSonuc: string[] = [];
    const icSonuc: string[] = [];
    for (const secenek of options) {
      const k = katla(secenek);
      if (k.startsWith(aranan)) basSonuc.push(secenek);
      else if (k.includes(aranan)) icSonuc.push(secenek);
      if (basSonuc.length >= maxSuggestions) break;
    }
    // Baştan eşleşenler önce: "mimar" yazınca "Mimar Sinan..." üste gelsin.
    return [...basSonuc, ...icSonuc].slice(0, maxSuggestions);
  }, [value, options, maxSuggestions]);

  /* Dışarı tıklayınca kapat. Mobilde blur yerine bu daha güvenilir. */
  useEffect(() => {
    if (!acik) return;
    const disariTikla = (e: MouseEvent | TouchEvent) => {
      if (sarmalayici.current && !sarmalayici.current.contains(e.target as Node)) {
        setAcik(false);
      }
    };
    document.addEventListener('mousedown', disariTikla);
    document.addEventListener('touchstart', disariTikla);
    return () => {
      document.removeEventListener('mousedown', disariTikla);
      document.removeEventListener('touchstart', disariTikla);
    };
  }, [acik]);

  const sec = (secenek: string) => {
    onChange(secenek);
    setAcik(false);
    setVurgulu(-1);
  };

  const klavye = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!acik || oneriler.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setVurgulu((v) => (v + 1) % oneriler.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setVurgulu((v) => (v <= 0 ? oneriler.length - 1 : v - 1));
    } else if (e.key === 'Enter' && vurgulu >= 0) {
      e.preventDefault();
      sec(oneriler[vurgulu]);
    } else if (e.key === 'Escape') {
      setAcik(false);
    }
  };

  const gosterilecek = acik && oneriler.length > 0;

  return (
    <div ref={sarmalayici} className="relative">
      <input
        id={id}
        type="text"
        required={required}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={gosterilecek}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          setAcik(true);
          setVurgulu(-1);
        }}
        onFocus={() => setAcik(true)}
        onKeyDown={klavye}
        className={
          className ||
          'w-full p-2.5 rounded-xl border border-gray-200 bg-white font-semibold text-gray-800 focus:outline-none focus:border-blue-600'
        }
      />

      {gosterilecek && (
        <ul
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1"
        >
          {oneriler.map((secenek, i) => {
            const secili = katla(secenek) === katla(value);
            return (
              <li key={secenek}>
                <button
                  type="button"
                  role="option"
                  aria-selected={secili}
                  /*
                    onMouseDown kullanılıyor: onClick, input blur olduktan
                    sonra tetiklendiği için liste kapanıp seçim kaçıyordu.
                  */
                  onMouseDown={(e) => {
                    e.preventDefault();
                    sec(secenek);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    sec(secenek);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
                    i === vurgulu
                      ?'bg-blue-50 text-blue-700'
                      :'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="min-w-0 break-words">{secenek}</span>
                  {secili && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
