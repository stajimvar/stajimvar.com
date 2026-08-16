import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, CornerDownLeft, Plus, Check } from 'lucide-react';
import { findPredictions, normalizeSearch } from '../data/skillsDictionary';

interface PredictiveInputProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  onSubmit: (val: string) => void;
  dictionary: string[];
  excludeList?: string[];
  placeholder?: string;
  buttonText?: string;
  accentColor?: 'blue' | 'indigo' | 'teal' | 'emerald';
  helperHint?: string;
  disabled?: boolean;
}

export const PredictiveInput: React.FC<PredictiveInputProps> = ({
  id,
  value,
  onChange,
  onSubmit,
  dictionary,
  excludeList = [],
  placeholder = 'Yazmaya başlayın...',
  buttonText = 'Ekle',
  accentColor = 'blue',
  helperHint,
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find predictions
  const predictions = findPredictions(value, dictionary, excludeList, 5);

  // Find the best inline completion (if value is prefix of the top prediction)
  const topPrediction = predictions[0] || '';
  const isInlineMatch =
    value.trim().length > 0 &&
    topPrediction &&
    normalizeSearch(topPrediction).startsWith(normalizeSearch(value));

  // The inline ghost completion suffix
  const ghostSuffix = isInlineMatch ? topPrediction.slice(value.length) : '';

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(-1);
    if (value.trim() && isFocused) {
      setShowDropdown(true);
    }
  }, [value, isFocused]);

  const handleSelectPrediction = (suggestion: string) => {
    onChange(suggestion);
    onSubmit(suggestion);
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 1. Tab or Right Arrow for Autocomplete inline ghost text
    if ((e.key === 'Tab' || e.key === 'ArrowRight') && ghostSuffix) {
      // If cursor is at the end or Tab was pressed
      if (
        e.key === 'Tab' ||
        (inputRef.current && inputRef.current.selectionStart === value.length)
      ) {
        e.preventDefault();
        const completed = topPrediction;
        onChange(completed);
        return;
      }
    }

    // 2. Navigation in dropdown
    if (showDropdown && predictions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : 0));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : predictions.length - 1));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < predictions.length) {
          handleSelectPrediction(predictions[selectedIndex]);
        } else if (ghostSuffix && value.trim()) {
          // If top prediction matches prefix, accept it on enter
          handleSelectPrediction(topPrediction);
        } else if (value.trim()) {
          onSubmit(value.trim());
          setShowDropdown(false);
        }
        return;
      }

      if (e.key === 'Escape') {
        setShowDropdown(false);
        return;
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim()) {
        onSubmit(value.trim());
        setShowDropdown(false);
      }
    }
  };

  // Color mappings
  const colorStyles = {
    blue: {
      borderFocus: 'focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      activeItem: 'bg-blue-50 text-blue-900 border-l-2 border-blue-600',
      highlight: 'text-blue-600 font-bold',
      ghost: 'text-blue-400/70',
    },
    indigo: {
      borderFocus: 'focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100',
      button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      activeItem: 'bg-indigo-50 text-indigo-900 border-l-2 border-indigo-600',
      highlight: 'text-indigo-600 font-bold',
      ghost: 'text-indigo-400/70',
    },
    teal: {
      borderFocus: 'focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-100',
      button: 'bg-teal-600 hover:bg-teal-700 text-white',
      badge: 'bg-teal-50 text-teal-700 border-teal-200',
      activeItem: 'bg-teal-50 text-teal-900 border-l-2 border-teal-600',
      highlight: 'text-teal-600 font-bold',
      ghost: 'text-teal-400/70',
    },
    emerald: {
      borderFocus: 'focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100',
      button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      activeItem: 'bg-emerald-50 text-emerald-900 border-l-2 border-emerald-600',
      highlight: 'text-emerald-600 font-bold',
      ghost: 'text-emerald-400/70',
    },
  }[accentColor];

  // Helper to highlight matching text in predictions
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const index = normalizeSearch(text).indexOf(normalizeSearch(query));
    if (index === -1) return text;
    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);

    return (
      <span>
        {before}
        <span className={colorStyles.highlight}>{match}</span>
        {after}
      </span>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Main Input Wrapper */}
      <div
        className={`flex items-center gap-2 p-1 bg-white rounded-xl border border-gray-200 transition-all ${colorStyles.borderFocus}`}
      >
        {/* Predictive Text Container */}
        <div className="relative flex-1 flex items-center min-w-0">
          {/* Real Input */}
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => {
              onChange(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              setIsFocused(true);
              if (value.trim()) setShowDropdown(true);
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            className="w-full text-xs py-2 px-3 bg-transparent text-gray-900 focus:outline-none font-medium z-10"
            autoComplete="off"
            spellCheck="false"
          />

          {/* Ghost Completion Overlay */}
          {ghostSuffix && isFocused && (
            <div
              aria-hidden="true"
              className="absolute left-0 top-0 bottom-0 py-2 px-3 text-xs pointer-events-none flex items-center select-none font-medium truncate"
            >
              <span className="invisible">{value}</span>
              <span className={`${colorStyles.ghost} italic transition-all`}>
                {ghostSuffix}
              </span>
            </div>
          )}

          {/* Inline Tab/Auto Hint */}
          {ghostSuffix && isFocused && (
            <div className="hidden sm:flex items-center gap-1 mr-2 px-1.5 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-[10px] text-gray-500 shrink-0 select-none">
              <span className="font-semibold text-gray-700">Tab</span>
              <span>tamamla</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="button"
          disabled={!value.trim() || disabled}
          onClick={() => {
            if (value.trim()) {
              // If ghost completion exists, allow submitting top prediction or user text
              onSubmit(value.trim());
              setShowDropdown(false);
            }
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs shrink-0 flex items-center gap-1 ${colorStyles.button}`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{buttonText}</span>
        </button>
      </div>

      {/* Floating Smart Predictions Dropdown */}
      {showDropdown && predictions.length > 0 && isFocused && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden animate-in fade-in-50 slide-in-from-top-1 duration-150">
          <div className="px-3 py-2 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold text-gray-700">Akıllı Tahminler</span>
            </div>
            <span className="text-[10px] text-gray-400">
              Seçmek için tıklayın veya yön tuşlarını kullanın
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
            {predictions.map((pred, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={pred}
                  /* Dokunmatikte de seçilebilsin; mousedown her cihazda güvenilir değil. */
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleSelectPrediction(pred);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                    handleSelectPrediction(pred);
                  }}
                  className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                    isSelected ? colorStyles.activeItem : 'hover:bg-gray-50/90 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                    <span className="font-medium truncate">
                      {renderHighlightedText(pred, value)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {index === 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                        En İyi Eşleşme
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <CornerDownLeft className="w-2.5 h-2.5" />
                      <span>Ekle</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {helperHint && (
            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between">
              <span>{helperHint}</span>
              <span>💡 'Tab' tuşu ile hızlı tamamlayabilirsiniz</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
