import { ODAK_HALKASI } from '../../lib/renk-token';

/*
  PROFİL FORMU SINIFLARI — yeni bileşenler için ortak kaynak.

  Değerler ProfilDuzenleme.tsx'teki sabitlerle BİREBİR aynı; ekleme
  bileşenleri (ek eğitim, sertifika) aynı ekranda çiziliyor ve farklı bir
  alan yüksekliği ya da düğme kalıbı göze batardı. Ayrışmayı
  tests/profil-cv-arayuzu.test.mjs yakalıyor.
*/
export const ALAN =
  'w-full min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-900 placeholder:text-gray-500 focus:border-blue-600 focus:outline-none sm:text-sm';
export const ETIKET = 'mb-1.5 block text-sm font-semibold text-gray-900';
export const IPUCU = 'mt-1 text-xs text-gray-600';
export const HATA = 'mt-1 text-xs font-semibold text-rose-700';
export const BIRINCIL = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${ODAK_HALKASI}`;
export const IKINCIL = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${ODAK_HALKASI}`;
export const EKLE = `inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-700 ${ODAK_HALKASI}`;
export const KUCUK_EYLEM = `inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-lg px-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 ${ODAK_HALKASI}`;

const buYil = new Date().getFullYear();
/** Yıl seçenekleri: gelecek yıldan 60 yıl geriye (ProfilDuzenleme'deki YILLAR ile aynı). */
export const YILLAR = Array.from({ length: 61 }, (_, i) => buYil + 1 - i);

export const EGITIM_DUZEYI_ETIKET: Record<string, string> = {
  lise: 'Lise',
  on_lisans: 'Ön lisans',
  lisans: 'Lisans',
  yuksek_lisans: 'Yüksek lisans',
  doktora: 'Doktora',
};

export const CALISMA_TURU_ETIKET: Record<string, string> = {
  tam_zamanli: 'Tam zamanlı',
  yari_zamanli: 'Yarı zamanlı',
  staj: 'Staj',
  gonullu: 'Gönüllü',
  serbest: 'Serbest',
  donemlik: 'Dönemlik / proje bazlı',
};
