import { Calculator, TrendingUp, Wallet, CalendarDays } from 'lucide-react';

/**
 * Hesaplama araçlarının listesi — hesaplayıcıların kendisi değil.
 *
 * NEDEN AYRI DOSYA
 * ----------------
 * Bu liste rehber merkezinde de kullanılıyor ("4 hesaplama aracı" rozeti).
 * Araclar.tsx içinde dururken, rehber sayfası dosyayı içe aktardığı için
 * dört hesaplayıcının tamamı ve ÖSYM sıralama tabloları ana pakete
 * giriyordu — ölçüldü: Araclar hiç ayrı parçaya çıkmıyordu.
 *
 * Burada yalnızca ad, özet ve ikon var; hesaplama kodu Araclar.tsx'te kaldı
 * ve artık gerçekten gecikmeli yükleniyor.
 */
export const ARACLAR = [
  {
    slug: 'net-hesaplama',
    baslik: 'Net hesaplama',
    ozet: 'TYT, AYT ve KPSS — doğru ve yanlış sayısından net.',
    ikon: Calculator,
  },
  {
    slug: 'siralama-tahmini',
    baslik: 'Sıralama tahmini',
    ozet: 'Puanın 2025 verilerine göre kaçıncı sıraya denk geliyor.',
    ikon: TrendingUp,
  },
  {
    slug: 'staj-ucreti-hesaplama',
    baslik: 'Staj ücreti hesaplama',
    ozet: 'Sana en az ne kadar ödenmesi gerektiğini hesapla.',
    ikon: Wallet,
  },
  {
    slug: 'staj-gunu-hesaplama',
    baslik: 'Staj günü hesaplama',
    ozet: '20 veya 30 iş günü hangi tarihte biter?',
    ikon: CalendarDays,
  },
];
