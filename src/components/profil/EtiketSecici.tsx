import React from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { ODAK_HALKASI } from '../../lib/renk-token';

/**
 * ETİKET SEÇİCİ — hazır seçeneklerden tek dokunuşla çoklu seçim.
 *
 * NEDEN VAR
 * ---------
 * Öğrenci yeteneklerini ve ilgi alanlarını tek tek yazmak zorundaydı.
 * Yazmak hem yavaş hem tutarsız ("excel", "Excel", "MS Excel"); hazır
 * listeden seçmek ikisini de çözüyor. Listede olmayanı yine ekleyebiliyor.
 *
 * KAYIT ÇAĞIRANDA
 * ---------------
 * Bileşen durum tutmuyor: seçili olanları çağıran veriyor, değişikliği
 * çağırana bildiriyor. Profil ekranında her dokunuş anında kaydediliyor
 * (mevcut yetenek ekleme davranışıyla aynı).
 *
 * TEKRAR ENGELİ
 * -------------
 * Karşılaştırma Türkçe küçük harfle: "İletişim" ile "iletişim" aynı.
 * Seçili bir etikete dokunmak onu kaldırıyor; aynısını ikinci kez eklemek
 * mümkün değil.
 */

export interface EtiketGrubu {
  baslik: string;
  ogeler: string[];
}

const anahtar = (s: string) => s.trim().toLocaleLowerCase('tr-TR');

export const EtiketSecici: React.FC<{
  /** Kimlik önekleri (arama kutusu, etiketler) — sayfada tekil olmalı. */
  kimlik: string;
  gruplar: EtiketGrubu[];
  secili: string[];
  onSec: (ad: string) => void;
  onKaldir: (ad: string) => void;
  aramaYeri: string;
  /** Kaydediliyorken dokunuşlar kilitlenir: iki kayıt birbirinin üstüne yazmasın. */
  kilitli?: boolean;
}> = ({ kimlik, gruplar, secili, onSec, onKaldir, aramaYeri, kilitli = false }) => {
  const [sorgu, setSorgu] = React.useState('');
  const seciliAnahtarlar = React.useMemo(() => new Set(secili.map(anahtar)), [secili]);
  const sorguAnahtari = anahtar(sorgu);

  const tumOgeler = React.useMemo(() => gruplar.flatMap((g) => g.ogeler), [gruplar]);
  /* Hazır listede olmayan ama seçilmiş etiketler de görünmeli — yoksa kaldırılamazlardı. */
  const ozeller = secili.filter((s) => !tumOgeler.some((o) => anahtar(o) === anahtar(s)));

  const goruntulenen = gruplar
    .map((g) => ({ ...g, ogeler: g.ogeler.filter((o) => !sorguAnahtari || anahtar(o).includes(sorguAnahtari)) }))
    .filter((g) => g.ogeler.length > 0);

  const listedeVar = tumOgeler.some((o) => anahtar(o) === sorguAnahtari) || seciliAnahtarlar.has(sorguAnahtari);
  const ozelEklenebilir = Boolean(sorguAnahtari) && !listedeVar && sorgu.trim().length <= 60;

  const dokun = (ad: string) => {
    if (kilitli) return;
    if (seciliAnahtarlar.has(anahtar(ad))) {
      /* Kaldırırken kayıttaki ASIL yazımı gönder (büyük/küçük harf farkı olabilir). */
      onKaldir(secili.find((s) => anahtar(s) === anahtar(ad)) ?? ad);
    } else {
      onSec(ad);
    }
  };

  const ozelEkle = () => {
    if (!ozelEklenebilir || kilitli) return;
    onSec(sorgu.trim());
    setSorgu('');
  };

  const Etiket: React.FC<{ ad: string }> = ({ ad }) => {
    const aktif = seciliAnahtarlar.has(anahtar(ad));
    return (
      <button
        type="button"
        aria-pressed={aktif}
        onClick={() => dokun(ad)}
        disabled={kilitli}
        className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-60 ${ODAK_HALKASI} ${
          aktif
            ? 'border-blue-600 bg-blue-600 text-white'
            : 'border-gray-200 bg-white text-gray-800 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900'
        }`}
      >
        {aktif && <Check aria-hidden className="h-3.5 w-3.5" />}
        {ad}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          id={`${kimlik}-ara`}
          type="search"
          value={sorgu}
          onChange={(e) => setSorgu(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              ozelEkle();
            }
          }}
          placeholder={aramaYeri}
          aria-label={aramaYeri}
          className={`w-full min-h-11 rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-[15px] text-gray-900 placeholder:text-gray-400 ${ODAK_HALKASI}`}
        />
      </div>

      {ozelEklenebilir && (
        <button
          type="button"
          onClick={ozelEkle}
          disabled={kilitli}
          className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-blue-400 bg-blue-50 px-3.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60 ${ODAK_HALKASI}`}
        >
          <Plus aria-hidden className="h-4 w-4" />“{sorgu.trim()}” ekle
        </button>
      )}

      {ozeller.length > 0 && !sorguAnahtari && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-gray-500">Kendi eklediklerin</p>
          <div className="flex flex-wrap gap-2">
            {ozeller.map((ad) => (
              <Etiket key={ad} ad={ad} />
            ))}
          </div>
        </div>
      )}

      {goruntulenen.map((g) => (
        <div key={g.baslik}>
          <p className="mb-1.5 text-xs font-semibold text-gray-500">{g.baslik}</p>
          <div className="flex flex-wrap gap-2">
            {g.ogeler.map((ad) => (
              <Etiket key={ad} ad={ad} />
            ))}
          </div>
        </div>
      ))}

      {sorguAnahtari && goruntulenen.length === 0 && !ozelEklenebilir && (
        <p className="text-sm text-gray-500">Bu zaten seçili.</p>
      )}
    </div>
  );
};
