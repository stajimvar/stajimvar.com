import React from 'react';
import { Briefcase, Building2, GraduationCap, Users } from 'lucide-react';
import {
  SIRKET_KENAR,
  SIRKET_METIN,
  SIRKET_METIN_IKINCIL,
  SIRKET_ROZET,
  SIRKET_VURGU,
  SIRKET_VURGU_KOYU,
  SIRKET_YUZEY,
  SIRKET_ZEMIN,
} from './renk';

/**
 * Şirket dünyasının kabuğu.
 *
 * NEDEN AYRI KABUK
 * ----------------
 * Öğrenci arayüzü mavi-beyaz ve listeler hâlinde. İK'nın işi başka: gün
 * içinde birkaç kez girip ilan açmak ve başvuranları taramak. Ayrım
 * temanın karanlığında değil, RENGİNDE: burası turuncu-beyaz.
 *
 * Öğrenci teması buraya SIZMIYOR: bu ağaçta öğrenci navigasyonu, öğrenci
 * zemini (#F9FAFB) ve öğrenci mavisi hiç çizilmiyor.
 *
 * DÖRT İŞ, FAZLASI DEĞİL
 * ----------------------
 * İlanlar, Başvuranlar, Şirket, Öğrenci. Dördüncüsü bir sekme değil
 * KAPI: kullanıcıyı kendi öğrenci tarafına geri götürüyor. Eskiden
 * "Çıkış" yazıyordu ve oturumu kapattığı sanılıyordu; oturumu kapatmak
 * hesap menüsünün işi.
 */

export type SirketSekmesi = 'ilanlar' | 'basvuranlar' | 'sirket';

const SEKMELER: { id: SirketSekmesi; etiket: string; ikon: React.ReactNode; yol: string }[] = [
  { id: 'ilanlar', etiket: 'İlanlar', ikon: <Briefcase className="h-5 w-5" />, yol: '/sirket/ilanlar' },
  { id: 'basvuranlar', etiket: 'Başvuranlar', ikon: <Users className="h-5 w-5" />, yol: '/sirket/basvuranlar' },
  { id: 'sirket', etiket: 'Şirket', ikon: <Building2 className="h-5 w-5" />, yol: '/sirket/profil' },
];

export const SirketKabugu: React.FC<{
  secili: SirketSekmesi;
  onNavigate: (yol: string) => void;
  /** Öğrenci dünyasına dönüş. Oturum kapatma DEĞİL. */
  onOgrenciyeDon: () => void;
  /** Sağ üstte görünen kısa durum. Kademe numarası yazmıyor. */
  durumRozeti?: React.ReactNode;
  children: React.ReactNode;
}> = ({ secili, onNavigate, onOgrenciyeDon, durumRozeti, children }) => (
  <div className="min-h-screen" style={{ background: SIRKET_ZEMIN, color: SIRKET_METIN }}>
    <header
      className="sticky top-0 z-30 border-b"
      style={{ background: SIRKET_YUZEY, borderColor: SIRKET_KENAR }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => onNavigate('/sirket/ilanlar')}
          className="flex cursor-pointer items-center gap-2 font-black tracking-tight"
        >
          <span className="text-lg" style={{ color: SIRKET_METIN }}>
            StajımVar
          </span>
          {/*
            Monospace YALNIZCA etiketlerde (VKN, ilan no). Gövde metninde
            kullanmak paneli terminal taklidine çeviriyor.
          */}
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest"
            style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
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
                  ? { background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }
                  : { color: SIRKET_METIN_IKINCIL }
              }
            >
              {s.ikon}
              {s.etiket}
            </button>
          ))}
          <span className="mx-1 h-6 w-px" style={{ background: SIRKET_KENAR }} />
          <button
            type="button"
            onClick={onOgrenciyeDon}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-bold transition-colors"
            style={{ color: SIRKET_METIN_IKINCIL }}
          >
            <GraduationCap className="h-5 w-5" />
            Öğrenci
          </button>
        </nav>

        {durumRozeti && <span className="ml-auto sm:ml-2">{durumRozeti}</span>}
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
        background: SIRKET_YUZEY,
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
          style={secili === s.id ? { color: SIRKET_VURGU_KOYU } : { color: SIRKET_METIN_IKINCIL }}
        >
          {s.ikon}
          {s.etiket}
        </button>
      ))}
      <button
        type="button"
        onClick={onOgrenciyeDon}
        aria-label="Öğrenci tarafına dön"
        className="flex h-11 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-bold"
        style={{ color: SIRKET_METIN_IKINCIL }}
      >
        <GraduationCap className="h-5 w-5" />
        Öğrenci
      </button>
    </nav>
  </div>
);

/*
  Eski koyu tema belirteçleri buradan kaldırıldı; renkler artık ./renk
  dosyasında. Panelde doğrudan renk yazılmıyor.
*/
export { SIRKET_KENAR, SIRKET_VURGU, SIRKET_YUZEY, SIRKET_ZEMIN };
