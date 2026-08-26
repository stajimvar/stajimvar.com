import React from 'react';

/**
 * Staj günü takvimi.
 *
 * NEDEN TAKVİM
 * ------------
 * Hesaplayıcı "12 gün çalışılmıyor" diyordu. Doğru ama yetersiz: öğrenci
 * bayram günlerini KENDİ giriyor ve onların nereye düştüğünü göremiyordu.
 * "Bitiş tarihi neden bu?" sorusunun cevabı bir sayıda değil, günlerin
 * kendisinde.
 *
 * Kural src/lib/staj-gunu.mjs içinde ve sınanıyor; burası yalnızca
 * çiziyor.
 *
 * ERİŞİLEBİLİRLİK
 * ---------------
 * Renk tek başına bilgi taşımıyor: çalışma günleri sıra numarasını
 * gösteriyor, tatil günleri soluk ve her hücrede `title` var. Renk körü
 * bir okuyucu için "hangisi çalışma günü" sorusu numaradan cevaplanıyor.
 */

type Gun = { tarih: Date; durum: string; sira: number | null };

const DURUM_ADI: Record<string, string> = {
  calisma: 'Çalışma günü',
  pazar: 'Pazar',
  cumartesi: 'Cumartesi',
  resmi: 'Resmî tatil',
  bildirilen: 'Bildirdiğin tatil',
};

const DURUM_SINIFI: Record<string, string> = {
  calisma: 'bg-blue-600 text-white font-bold',
  pazar: 'bg-gray-100 text-gray-500',
  cumartesi: 'bg-gray-100 text-gray-500',
  resmi: 'bg-rose-50 text-rose-700',
  bildirilen: 'bg-amber-50 text-amber-800',
};

const GUN_ADLARI = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

/** Pazartesi = 0 olacak biçimde hafta günü. */
const haftaGunu = (t: Date) => (t.getDay() + 6) % 7;

export const StajTakvimi: React.FC<{ gunler: Gun[] }> = ({ gunler }) => {
  if (!gunler.length) return null;

  /* Aylara bölünüyor: iki ayı tek ızgarada göstermek tarihleri karıştırıyor. */
  const aylar = React.useMemo(() => {
    const harita = new Map<string, Gun[]>();
    for (const g of gunler) {
      const anahtar = `${g.tarih.getFullYear()}-${g.tarih.getMonth()}`;
      const liste = harita.get(anahtar);
      if (liste) liste.push(g);
      else harita.set(anahtar, [g]);
    }
    return [...harita.values()];
  }, [gunler]);

  const kullanilanDurumlar = [...new Set(gunler.map((g) => g.durum))];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {kullanilanDurumlar.map((d) => (
          <span key={d} className="inline-flex items-center gap-1.5 text-[11px] text-gray-600">
            <span className={`h-3.5 w-3.5 rounded ${DURUM_SINIFI[d]}`} />
            {DURUM_ADI[d]}
          </span>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {aylar.map((ay) => {
          const ilk = ay[0].tarih;
          /* Ayın ilk gününün haftadaki yeri kadar boş hücre. */
          const bosluk = haftaGunu(ilk);
          return (
            <div
              key={`${ilk.getFullYear()}-${ilk.getMonth()}`}
              className="rounded-2xl border border-gray-200 bg-white p-3"
            >
              <p className="mb-2 text-sm font-bold text-gray-900">
                {ilk.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
              </p>
              <div className="grid grid-cols-7 gap-1 text-center">
                {GUN_ADLARI.map((g) => (
                  <span key={g} className="text-[10px] font-bold uppercase text-gray-500">
                    {g}
                  </span>
                ))}
                {Array.from({ length: bosluk }, (_, i) => (
                  <span key={`bos-${i}`} aria-hidden />
                ))}
                {ay.map((g) => (
                  <span
                    key={g.tarih.toISOString()}
                    title={`${g.tarih.toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                    })} — ${DURUM_ADI[g.durum]}${g.sira ? ` (${g.sira}. iş günü)` : ''}`}
                    className={`flex h-8 items-center justify-center rounded-lg text-[11px] ${
                      DURUM_SINIFI[g.durum]
                    }`}
                  >
                    {g.tarih.getDate()}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
