import React from 'react';
import { Briefcase, Building2, LogOut, Users } from 'lucide-react';

/**
 * Şirket dünyasının kabuğu.
 *
 * NEDEN AYRI KABUK
 * ----------------
 * Öğrenci arayüzü açık, kâğıt gibi, listeler hâlinde (#F9FAFB). İK'nın
 * işi başka: gün içinde birkaç kez girip ilan açmak ve başvuranları
 * taramak. Aynı temayı iki işe birden giydirmek, ikisini de yarım
 * bırakıyor.
 *
 * Öğrenci teması buraya SIZMIYOR: bu ağaçta öğrenci navigasyonu,
 * öğrenci zemini ve öğrenci sekmeleri hiç çizilmiyor.
 *
 * DÖRT İŞ, FAZLASI DEĞİL
 * ----------------------
 * İlanlar, Başvuranlar, Şirket, Çıkış. Panelde beşinci bir şey olsaydı
 * gün içinde birkaç dakika ayıran İK onu hiç açmazdı; olmayan bir şey,
 * açılmayan bir şeyden iyidir.
 *
 * TEK VURGU RENGİ
 * ---------------
 * Zemin #0E1116, vurgu amber. İki vurgu rengi olsaydı hangisinin ne
 * demek olduğu belirsizleşirdi — yeşil ve kırmızı burada da yalnızca
 * kendi anlamlarında (doğrulandı / hata).
 */

export const SIRKET_ZEMIN = '#0E1116';
export const SIRKET_YUZEY = '#161B22';
export const SIRKET_KENAR = '#232A34';
export const SIRKET_VURGU = '#F5A524';

export type SirketSekmesi = 'ilanlar' | 'basvuranlar' | 'sirket';

const SEKMELER: { id: SirketSekmesi; etiket: string; ikon: React.ReactNode; yol: string }[] = [
  { id: 'ilanlar', etiket: 'İlanlar', ikon: <Briefcase className="h-5 w-5" />, yol: '/sirket/ilanlar' },
  { id: 'basvuranlar', etiket: 'Başvuranlar', ikon: <Users className="h-5 w-5" />, yol: '/sirket/basvuranlar' },
  { id: 'sirket', etiket: 'Şirket', ikon: <Building2 className="h-5 w-5" />, yol: '/sirket/profil' },
];

export const SirketKabugu: React.FC<{
  secili: SirketSekmesi;
  onNavigate: (yol: string) => void;
  onCikis: () => void;
  /** Sağ üstte görünen kısa durum: "Kademe 1" ya da doğrulanmış rozeti. */
  durumRozeti?: React.ReactNode;
  children: React.ReactNode;
}> = ({ secili, onNavigate, onCikis, durumRozeti, children }) => (
  <div className="min-h-screen text-gray-100" style={{ background: SIRKET_ZEMIN }}>
    <header
      className="sticky top-0 z-30 border-b"
      style={{ background: SIRKET_ZEMIN, borderColor: SIRKET_KENAR }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <button
          type="button"
          onClick={() => onNavigate('/sirket/ilanlar')}
          className="flex cursor-pointer items-center gap-2 font-black tracking-tight"
        >
          <span className="text-lg text-white">StajımVar</span>
          {/*
            Monospace YALNIZCA etiketlerde (VKN, ilan no). Gövde metninde
            kullanmak paneli terminal taklidine çeviriyor; burada amaç
            hız hissi, kostüm değil.
          */}
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest"
            style={{ background: SIRKET_YUZEY, color: SIRKET_VURGU }}
          >
            İşveren
          </span>
        </button>

        <nav aria-label="Şirket menüsü" className="ml-auto hidden items-center gap-1 sm:flex">
          {SEKMELER.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onNavigate(s.yol)}
              aria-current={secili === s.id ? 'page' : undefined}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-bold transition-colors"
              style={
                secili === s.id
                  ? { background: SIRKET_YUZEY, color: SIRKET_VURGU }
                  : { color: '#9AA4B2' }
              }
            >
              {s.ikon}
              {s.etiket}
            </button>
          ))}
          <button
            type="button"
            onClick={onCikis}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-bold text-gray-400 transition-colors hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Çıkış
          </button>
        </nav>

        {durumRozeti && <span className="ml-auto sm:ml-0">{durumRozeti}</span>}
      </div>
    </header>

    <main className="mx-auto max-w-6xl px-4 py-6 pb-[calc(96px+env(safe-area-inset-bottom))] sm:pb-10">
      {children}
    </main>

    {/* Dar ekranda aynı dört iş altta. */}
    <nav
      aria-label="Şirket menüsü"
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t px-2 py-2 sm:hidden"
      style={{
        background: SIRKET_ZEMIN,
        borderColor: SIRKET_KENAR,
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}
    >
      {SEKMELER.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onNavigate(s.yol)}
          aria-label={s.etiket}
          aria-current={secili === s.id ? 'page' : undefined}
          className="flex h-11 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-bold"
          style={secili === s.id ? { color: SIRKET_VURGU } : { color: '#9AA4B2' }}
        >
          {s.ikon}
          {s.etiket}
        </button>
      ))}
      <button
        type="button"
        onClick={onCikis}
        aria-label="Çıkış"
        className="flex h-11 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-bold text-gray-400"
      >
        <LogOut className="h-5 w-5" />
        Çıkış
      </button>
    </nav>
  </div>
);
