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
/**
 * `kapsam` — araç sitenin işine mi ait, yoksa komşu bir konuya mı.
 *
 * NEDEN EKLENDİ
 * -------------
 * Dört araç tek listede ve eşit ağırlıktaydı; ilk iki sıra da sınav
 * araçlarındaydı. "Hesaplama araçları" başlığı altında önce TYT neti
 * görmek, staj sitesinde yanlış vaat: gelen kişi burayı sınav sitesi
 * sanıyor, arama motoru da siteyi "üniversite stajı" yerine sınav
 * sorgularıyla eşliyor.
 *
 * Araçlar SİLİNMİYOR — çalışıyorlar ve işe yarıyorlar. Yalnızca sıraları
 * ve çerçeveleri düzeltiliyor: staj araçları önce ve asıl, sınav
 * araçları ayrı bir bölümde ve ne oldukları açıkça yazılı.
 */
export const ARACLAR = [
  {
    slug: 'staj-ucreti-hesaplama',
    baslik: 'Staj ücreti hesaplama',
    ozet: 'Sana en az ne kadar ödenmesi gerektiğini hesapla.',
    ikon: Wallet,
    kapsam: 'staj',
  },
  {
    slug: 'staj-gunu-hesaplama',
    baslik: 'Staj günü hesaplama',
    ozet: '20 veya 30 iş günü hangi tarihte biter?',
    ikon: CalendarDays,
    kapsam: 'staj',
  },
  {
    slug: 'net-hesaplama',
    baslik: 'Net hesaplama',
    ozet: 'TYT, AYT ve KPSS — doğru ve yanlış sayısından net.',
    ikon: Calculator,
    kapsam: 'sinav',
  },
  {
    slug: 'siralama-tahmini',
    baslik: 'Sıralama tahmini',
    ozet: 'Puanın 2025 verilerine göre kaçıncı sıraya denk geliyor.',
    ikon: TrendingUp,
    kapsam: 'sinav',
  },
] as const;

/** Sitenin asıl işine ait araçlar. */
export const STAJ_ARACLARI = ARACLAR.filter((a) => a.kapsam === 'staj');

/** Komşu konu: sınav araçları. Ayrı bölümde gösteriliyor. */
export const SINAV_ARACLARI = ARACLAR.filter((a) => a.kapsam === 'sinav');
