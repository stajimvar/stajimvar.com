/**
 * YASAL VE KURUMSAL ADRES HARİTASI — metinlerden ayrı tutuluyor.
 *
 * App.tsx bir adresin yasal sayfa olup olmadığına ÇİZİMDEN ÖNCE karar
 * vermek zorunda: `LEGAL_ROUTES[yol]` bakışı her gezinmede yapılıyor.
 * Harita `LegalPage.tsx` içinde durduğu sürece bu bakış, 24 KB yasal
 * metni + 24 KB kurumsal metni ana pakete çekiyordu — /gizlilik'e hiç
 * girmeyen bir ziyaretçi için bile.
 *
 * Harita burada, metinler orada. App.tsx yalnız bu dosyayı statik
 * okuyor; sayfa gövdeleri gecikmeli iniyor.
 *
 * `LegalPage.tsx` ve `CorporatePages.tsx` bu adları yeniden dışa
 * veriyor; `scripts/onrender.mjs` LegalPage üzerinden okumaya devam
 * ediyor.
 */

export type CorporateSlug =
  | 'hakkimizda'
  | 'iletisim'
  | 'kullanim-kosullari'
  | 'ilan-kurallari'
  | 'ilan-bildir';

export type YasalSlug = 'gizlilik' | 'cerez-politikasi' | 'kvkk-aydinlatma-metni';

/** Yasal ve kurumsal sayfalar aynı kabuğu paylaşıyor. */
export type LegalSlug = YasalSlug | CorporateSlug;

export const CORPORATE_ROUTES: Record<string, CorporateSlug> = {
  '/hakkimizda': 'hakkimizda',
  '/iletisim': 'iletisim',
  '/kullanim-kosullari': 'kullanim-kosullari',
  '/ilan-kurallari': 'ilan-kurallari',
  '/ilan-bildir': 'ilan-bildir',
};

export const CORPORATE_TITLES: Record<CorporateSlug, string> = {
  hakkimizda: 'Hakkımızda',
  iletisim: 'İletişim',
  'kullanim-kosullari': 'Kullanım Koşulları',
  'ilan-kurallari': 'İlan Yayınlama Kuralları',
  'ilan-bildir': 'İçerik ve İlan Bildirimi',
};

export const LEGAL_ROUTES: Record<string, LegalSlug> = {
  '/gizlilik': 'gizlilik',
  '/cerez-politikasi': 'cerez-politikasi',
  '/kvkk-aydinlatma-metni': 'kvkk-aydinlatma-metni',
  ...CORPORATE_ROUTES,
};
