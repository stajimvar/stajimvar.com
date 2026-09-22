import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { InternshipListing } from '../types';

/**
 * GÖRÜNÜR DURUM ETİKETLERİ — İLANI LİSTEDEN ÇIKARMIYOR
 *
 * Katalogdaki 186 ilanın 35'inde kaynak doğrulanamadı ve 7'sinin başvuru
 * bağlantısı kesin kanıtla ölü (ölçüldü, 22 Eylül 2026). Bu ilanlar
 * listede DURUYOR: kanıtsız kapatmak, açık bir ilanı listeden silmek
 * olurdu. Eksik olan şey kullanıcının bunu BİLMESİYDİ.
 *
 * İKİ AYRI SORU, İKİ AYRI ETİKET
 *   kaynakDurumu → kaynağa ulaşıp ilanın orada olduğunu doğrulayabildik mi
 *   applyUrlOk   → başvuru bağlantısı teknik olarak çalışıyor mu
 * Birini ötekinin yerine kullanmak, "bizim tarafımızın sorunu" ile
 * "ilanın sorunu"nu aynı şeye çevirirdi.
 *
 * `gecerli` ve `acik` için etiket YOK: her şey yolundayken rozet basmak
 * gürültü, sorunlu olanı da görünmez kılar.
 *
 * NEDEN AYRI BİLEŞEN
 * ------------------
 * Aynı etiketler hem kartta hem ilan detayında gerekiyor. Kartta uyarıyı
 * görüp tıklayan kişi, BAŞVUR DÜĞMESİNİN olduğu ekranda uyarıyı
 * göremiyordu — yani uyarı tam da karar anında kayboluyordu. İki yere
 * kopyalamak yerine tek yerde duruyor; kopya er geç ayrışır ve iki ekran
 * aynı ilan için farklı şey söyler.
 */

/*
  Yalnız iki alan isteniyor, ilanın tamamı değil: bileşenin ilan detayında
  da kullanılabilmesi için en dar sözleşme. İkisi de İSTEĞE BAĞLI, çünkü
  katalog v2'den gelen ya da normalize edilmemiş satırlarda yoklar ve
  yokluk "sorun yok" değil "bilgi yok" demek — etiket de basılmıyor.
*/
type Durum = Pick<InternshipListing, 'kaynakDurumu' | 'applyUrlOk'>;

export function ilanDurumuSorunlu(listing: Durum): boolean {
  return (
    listing.kaynakDurumu === 'belirsiz'
    || listing.kaynakDurumu === 'erisilemedi'
    || listing.applyUrlOk === 'kirik'
    || listing.applyUrlOk === 'dogrulanamadi'
  );
}

export const IlanDurumEtiketleri: React.FC<{
  listing: Durum;
  className?: string;
}> = ({ listing, className }) => {
  if (!ilanDurumuSorunlu(listing)) return null;

  return (
    <p className={`flex flex-wrap items-center gap-1.5 ${className ?? ''}`}>
      {listing.applyUrlOk === 'kirik' && (
        <span
          title="Başvuru bağlantısı çağrıldı ve ölü döndü (404/410). İlan listede kalıyor; şirketin kariyer sayfasından arayabilirsin."
          className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700"
        >
          <AlertTriangle aria-hidden className="h-3 w-3" />
          Başvuru bağlantısı çalışmıyor
        </span>
      )}
      {listing.applyUrlOk === 'dogrulanamadi' && (
        <span
          title="Başvuru bağlantısına ulaşılamadı (bot engeli ya da zaman aşımı). Bağlantı ölü demek değil."
          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
        >
          <AlertTriangle aria-hidden className="h-3 w-3" />
          Bağlantı doğrulanamadı
        </span>
      )}
      {listing.kaynakDurumu === 'belirsiz' && (
        <span
          title="Kaynak sayfasına ulaşıldı ama ilanın hâlâ açık olduğuna dair kanıt bulunamadı."
          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700"
        >
          Kaynak doğrulanamadı
        </span>
      )}
      {listing.kaynakDurumu === 'erisilemedi' && (
        <span
          title="Kaynak sayfasına teknik olarak ulaşılamadı. İlan hakkında bir şey söylemiyor."
          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700"
        >
          Kaynağa ulaşılamadı
        </span>
      )}
    </p>
  );
};
