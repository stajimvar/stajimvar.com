/**
 * Adres dostu kimlikler.
 *
 * İlan adresleri `/ilan/frontend-stajyeri-3f2a1b9c` biçiminde: okunabilir bir
 * başlık ve sonunda kimliğin ilk 8 hanesi. Başlık değişse bile adres çalışmaya
 * devam eder, çünkü arama kimlik önekiyle yapılıyor.
 *
 * Neden tam UUID değil: `/ilan/3f2a1b9c-...-9d8e` hem çirkin hem arama
 * motorları için değersiz. Neden sadece başlık değil: iki şirket aynı başlığı
 * kullanabilir ve adres çakışır.
 */

const TR_HARFLER: Record<string, string> = {
  ı: 'i', İ: 'i', I: 'i', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u',
  ş: 's', Ş: 's', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c', â: 'a', î: 'i', û: 'u',
};

export function slugify(value: string): string {
  let out = '';
  for (const ch of value) out += TR_HARFLER[ch] ?? ch;
  return out
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

/** İlanın adres parçası. */
export function listingSlug(listing: { id: string; title: string }): string {
  const kisaId = listing.id.replace(/-/g, '').slice(0, 8);
  const baslik = slugify(listing.title);
  return baslik ? `${baslik}-${kisaId}` : kisaId;
}

/**
 * Adresten kimlik önekini çıkarır.
 * Yalnızca onaltılık ve tam 8 hane kabul edilir; aksi halde arama yapılmaz.
 */
export function idPrefixFromSlug(slug: string): string | null {
  const son = slug.split('-').pop() ?? '';
  return /^[0-9a-f]{8}$/i.test(son) ? son.toLowerCase() : null;
}
