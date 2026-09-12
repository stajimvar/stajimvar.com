import { katalogYanitiniDogrula } from './global-listings-api.mjs';
import { toInternshipListing, type ListingRowWithCompany } from './queries/mappers';
import type { PublishedListingsCatalogPage } from './queries';

/**
 * AÇILIŞ TOHUMU — ilk ilan sayfası HTML'in içinde geliyor.
 *
 * SORUN
 * -----
 * Anasayfa iki kez bekliyordu. Önce JavaScript paketinin inip
 * çalışmasını, sonra `get_published_listings_catalog_v2` çağrısının
 * dönmesini. İkincisi tamamen gereksizdi: ön render hattı zaten aynı
 * veriyi HTML'i yazarken okuyor.
 *
 * ÇÖZÜM
 * -----
 * `scripts/onrender.mjs` katalogun ilk sayfasını ANONİM anahtarla
 * çekiyor ve `#ilk-katalog` etiketine gömüyor. Kanca bu tohumla
 * `ready` durumunda başlıyor, ilanlar ilk çizimde ekranda oluyor;
 * gerçek çağrı arkada yapılıp sonuç güncelleniyor.
 *
 * NEDEN GÜVENLİ
 * -------------
 * Tohum anonim anahtarla üretiliyor: içinde, siteye giren herhangi
 * birinin zaten görebileceğinden fazlası yok. Oturum, profil ya da
 * eşleşme verisi hiç girmiyor.
 *
 * Yine de dışarıdan gelen bir metin gibi ele alınıyor: canlı yanıtla
 * aynı doğrulamadan (`katalogYanitiniDogrula`) geçiyor ve geçemezse
 * sessizce yok sayılıp eski davranışa — yükleniyor durumuna —
 * dönülüyor.
 */

const ETIKET_ID = 'ilk-katalog';

interface TohumKabi {
  country: string;
  page: unknown;
}

/** Etiket bir kez okunuyor; ikinci çağrı ayrıştırmayı tekrarlamıyor. */
let cozuldu = false;
let tohum: { country: string; page: PublishedListingsCatalogPage } | null = null;

function coz(): typeof tohum {
  if (cozuldu) return tohum;
  cozuldu = true;
  if (typeof document === 'undefined') return null;

  const etiket = document.getElementById(ETIKET_ID);
  if (!etiket?.textContent) return null;

  try {
    const kap = JSON.parse(etiket.textContent) as TohumKabi;
    if (!kap || typeof kap.country !== 'string' || !kap.country) return null;

    const sayfa = katalogYanitiniDogrula(kap.page) as PublishedListingsCatalogPage & {
      listings: unknown[];
    };
    tohum = {
      country: kap.country,
      page: {
        ...sayfa,
        listings: (sayfa.listings as ListingRowWithCompany[]).map(toInternshipListing),
      },
    };
  } catch {
    /*
      Bozuk ya da eski biçimli bir tohum sayfayı kırmamalı. Yok sayılıyor
      ve kanca her zamanki gibi ağdan yüklüyor.
    */
    tohum = null;
  }
  return tohum;
}

/**
 * İstenen ülke için gömülü sayfa; yoksa `null`.
 *
 * Ülke eşleşmesi şart: tohum tek bir ülke için yazılıyor ve başka bir
 * ülkeyi seçmiş ziyaretçiye onu göstermek yanlış listeyi göstermek
 * olurdu.
 */
export function ilkKatalogOku(country: string): PublishedListingsCatalogPage | null {
  const kayit = coz();
  return kayit && kayit.country === country ? kayit.page : null;
}
