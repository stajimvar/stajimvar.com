/**
 * İLAN SIRALAMASI — LİSTENİN ÜSTÜNDEKİ SEÇİCİ (1 Kasım 2026)
 *
 * Dört seçenek, varsayılan "En yeni". Karşılaştırıcılar saf: aynı girdi
 * her zaman aynı sırayı veriyor (eşitlikte ikincil ölçüt "en yeni", o da
 * eşitse ilan kimliği). Kararsız sıra "daha fazla göster"de kartların yer
 * değiştirmesi demekti.
 *
 * "EN YENİ" HANGİ TARİH: `postedAt` — veritabanında `posted_at ??
 * created_at` (queries/mappers). Sunucu kataloğu da
 * (get_published_listings_catalog_v3) aynı alanla en yeniden eskiye
 * sıralıyor ve imleçle sayfalıyor; yani "En yeni" için sunucunun sırası
 * zaten doğru ve ek istek gerekmiyor.
 *
 * ÖTEKİ ÜÇÜ KATALOĞUN TAMAMINI İSTİYOR: sunucu yalnız tarih sırasıyla
 * sayfalıyor. İlk 24 ilanı "son başvuru tarihine" göre dizmek, 25.
 * ilanın tarihi daha yakınsa yanlış bir ilk sıra göstermek olurdu.
 * Sıralama SAYFALAMADAN ÖNCE uygulanabilsin diye bu seçimlerde kalan
 * sayfalar (süzgeçlerde olduğu gibi) yükleniyor — bkz. `tamKatalogGerekir`.
 *
 * TARİHSİZ İLAN: iki son başvuru sıralamasında da EN ALTTA. "Tarihi yok"
 * ne "en yakın" ne "en uzak"; onu bir uca koymak kullanıcıya olmayan bir
 * tarih söylemek olurdu.
 */

/** @typedef {'newest' | 'deadline_asc' | 'deadline_desc' | 'company_asc'} SiralamaDegeri */

/** @type {SiralamaDegeri} */
export const VARSAYILAN_SIRALAMA = 'newest';

/** @type {ReadonlyArray<{ deger: SiralamaDegeri, etiket: string }>} */
export const SIRALAMA_SECENEKLERI = Object.freeze([
  { deger: 'newest', etiket: 'En yeni' },
  { deger: 'deadline_asc', etiket: 'Son başvuru tarihi yaklaşan' },
  { deger: 'deadline_desc', etiket: 'Son başvuru tarihi en uzak' },
  { deger: 'company_asc', etiket: 'Şirket adına göre A–Z' },
]);

/** Bilinmeyen değer varsayılana düşüyor; seçici dışarıdan bozuk değer alamaz. */
export function siralamaDegeri(deger) {
  return SIRALAMA_SECENEKLERI.some((s) => s.deger === deger) ? deger : VARSAYILAN_SIRALAMA;
}

/** Tarih (ms); boş ya da bozuksa null. NaN ile karşılaştırma sırayı bozardı. */
export function tarihMs(deger) {
  if (!deger) return null;
  const ms = new Date(deger).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** "En yeni" sırası; tarihi olmayan sona, eşitlikte kimlik. */
function enYeni(a, b) {
  const at = tarihMs(a.postedAt);
  const bt = tarihMs(b.postedAt);
  if (at !== bt) {
    if (at === null) return 1;
    if (bt === null) return -1;
    return bt - at;
  }
  return String(a.id ?? '').localeCompare(String(b.id ?? ''));
}

/**
 * İki ilanı karşılaştıran işlev. Girdi ilan nesnesi:
 * `{ id, postedAt, applicationDeadline, companyName }`.
 *
 * @param {SiralamaDegeri} sira
 */
export function ilanKarsilastirici(sira) {
  const s = siralamaDegeri(sira);
  if (s === 'deadline_asc' || s === 'deadline_desc') {
    const yon = s === 'deadline_asc' ? 1 : -1;
    return (a, b) => {
      const ad = tarihMs(a.applicationDeadline);
      const bd = tarihMs(b.applicationDeadline);
      if (ad === null && bd === null) return enYeni(a, b);
      if (ad === null) return 1;
      if (bd === null) return -1;
      return ad !== bd ? (ad - bd) * yon : enYeni(a, b);
    };
  }
  if (s === 'company_asc') {
    return (a, b) => {
      const ak = String(a.companyName ?? '').trim();
      const bk = String(b.companyName ?? '').trim();
      /* Adı boş kayıt sona: "A–Z" listesinin başında isimsiz satır olmasın. */
      if (!ak !== !bk) return ak ? -1 : 1;
      const k = ak.localeCompare(bk, 'tr', { sensitivity: 'base' });
      return k !== 0 ? k : enYeni(a, b);
    };
  }
  return enYeni;
}

/**
 * Bu sıralama kataloğun tamamını istiyor mu? Yalnız "En yeni" sunucunun
 * kendi sırası; ötekiler ancak bütün kayıtlar elde iken doğru.
 */
export function tamKatalogGerekir(sira) {
  return siralamaDegeri(sira) !== 'newest';
}
