/**
 * Şirket panelinin renk belirteçleri.
 *
 * NEDEN SİYAH DEĞİL
 * -----------------
 * Panel önce koyu (#0E1116) kuruldu. Yanlıştı: koyu tema paneli
 * "başka bir ürün" gibi gösteriyor, İK'nın günde iki dakika baktığı
 * bir ekranda okunurluğu düşürüyor ve amber-siyah düğmelerin kontrastı
 * zaten sınırdaydı. Şimdi iki dünya da beyaz zeminde; ayrım renkte:
 * öğrenci mavi-beyaz, şirket turuncu-beyaz.
 *
 * ZEMİN SICAK BEYAZ
 * -----------------
 * #FFF8F1, soğuk gri değil. Öğrenci tarafının zemini #F9FAFB (soğuk);
 * aynı gri iki dünyada da kullanılsaydı geçiş hissedilmezdi. Sıcaklık
 * farkı, tema farkını renk körü kullanıcıda bile taşıyor.
 *
 * KONTRAST
 * --------
 * Birincil düğme: #EA7A1C zemin + #1C1410 yazı = 6.3:1.
 * Hover: #EA7A1C'nin %6 karartılmışı (#DC731A) + koyu yazı = 5.6:1.
 *
 * #C45F0F yazı için KULLANILMIYOR: sıcak beyaz üzerinde 4.0:1, beyaz
 * yazıyla zemin olarak 4.0:1 — ikisi de 4.5 eşiğinin altında. Yalnızca
 * çizgi, damga kenarı ve odak halkası olarak geçiyor; metin dışı
 * öğelerde eşik 3:1 ve orada rahat geçiyor.
 */

export const SIRKET_ZEMIN = '#FFF8F1';
export const SIRKET_YUZEY = '#FFFFFF';
export const SIRKET_KENAR = '#F3D5B8';
export const SIRKET_METIN = '#1C1410';
export const SIRKET_METIN_IKINCIL = '#6B5344';
export const SIRKET_VURGU = '#EA7A1C';
export const SIRKET_VURGU_KOYU = '#C45F0F';
export const SIRKET_ROZET = '#FFF1E4';

/** Birincil düğmenin hover zemini. Yazı koyu kaldığı için 5.6:1. */
export const SIRKET_VURGU_HOVER = '#DC731A';

/**
 * Birincil düğme.
 *
 * Panelde tek bir birincil düğme kalıbı var; sayfalar kendi turuncusunu
 * yazmıyor. "Doğrudan renk yazılmasın" kuralı burada da geçerli.
 */
export const BIRINCIL_DUGME =
  'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 ' +
  'text-sm font-black transition-colors disabled:opacity-40';

export const birincilStil = { background: SIRKET_VURGU, color: SIRKET_METIN };

export const IKINCIL_DUGME =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 ' +
  'text-sm font-bold transition-colors';

export const ikincilStil = {
  borderColor: SIRKET_KENAR,
  color: SIRKET_METIN,
  background: SIRKET_YUZEY,
};

export const KUTU = 'rounded-2xl border p-4 sm:p-5';
export const kutuStil = { background: SIRKET_YUZEY, borderColor: SIRKET_KENAR };

/** Form alanları — panelin her yerinde aynı. */
export const ALAN =
  'w-full min-h-11 rounded-xl border px-3 text-sm outline-none transition-colors ' +
  'placeholder:text-[#A08C7D]';

export const alanStil = {
  borderColor: SIRKET_KENAR,
  background: SIRKET_YUZEY,
  color: SIRKET_METIN,
};
