/**
 * Metin normalizasyonu. Türkçe karakterler eşleşmeyi bozmasın diye
 * karşılaştırmadan önce her şey ASCII'ye katlanır.
 *
 * Dikkat: JavaScript'in `toLowerCase()`'i Türkçe'de yanılır — "I".toLowerCase()
 * "i" verir ama Türkçe'de "ı" olmalı. Bu yüzden önce harf eşlemesi yapılıyor.
 */

const TR_MAP: Record<string, string> = {
  İ: 'i',
  I: 'i',
  ı: 'i',
  Ğ: 'g',
  ğ: 'g',
  Ü: 'u',
  ü: 'u',
  Ş: 's',
  ş: 's',
  Ö: 'o',
  ö: 'o',
  Ç: 'c',
  ç: 'c',
  Â: 'a',
  â: 'a',
  Î: 'i',
  î: 'i',
  Û: 'u',
  û: 'u',
};

/** Karşılaştırma için: ASCII'ye katlanmış, küçük harfli, tek boşluklu. */
export function fold(input: string | null | undefined): string {
  if (!input) return '';
  let out = '';
  for (const ch of input) {
    out += TR_MAP[ch] ?? ch;
  }
  return out
    .toLowerCase()
    .replace(/[‐-―]/g, '-') // çeşitli tire karakterleri
    .replace(/\s+/g, ' ')
    .trim();
}

/** Şirket adı eşleştirmesi için: yalnızca harf ve rakam. */
export function foldCompanyName(name: string): string {
  return fold(name).replace(/[^a-z0-9]/g, '');
}

/**
 * Şirket adının sonundaki tüzel kişilik ekleri dedup'ı bozar:
 * "Trendyol A.Ş." ile "Trendyol" aynı şirket.
 */
const LEGAL_SUFFIXES = [
  'anonim sirketi',
  'limited sirketi',
  'a s',
  'as',
  'ltd sti',
  'ltd',
  'sti',
  'inc',
  'llc',
  'gmbh',
  'bv',
  'plc',
  'corp',
  'corporation',
  'co',
  'company',
];

export function canonicalCompanyName(raw: string): string {
  let name = fold(raw)
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of LEGAL_SUFFIXES) {
      if (name.endsWith(' ' + suffix)) {
        name = name.slice(0, -(suffix.length + 1)).trim();
        changed = true;
      }
    }
  }
  return name;
}

/** HTML'i düz metne çevirir. Açıklama alanları çoğu kaynakta HTML gelir. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * URL'i dedup için kanonikleştirir: izleme parametreleri atılır,
 * şema/host küçültülür, sondaki eğik çizgi kaldırılır.
 */
const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gh_src',
  'gh_jid',
  'ref',
  'referrer',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'source',
];

export function canonicalizeUrl(input: string): string {
  try {
    const url = new URL(input);
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    url.hash = '';
    for (const param of TRACKING_PARAMS) url.searchParams.delete(param);
    // Parametre sırası kaynağa göre değişebiliyor; sabitle.
    url.searchParams.sort();
    let out = url.toString();
    if (out.endsWith('/') && url.pathname !== '/') out = out.slice(0, -1);
    return out;
  } catch {
    return input.trim();
  }
}

/** Türkiye şehirleri — ilan metninden şehir çıkarmak için. */
export const TR_CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep',
  'Kocaeli', 'Mersin', 'Kayseri', 'Eskişehir', 'Samsun', 'Denizli', 'Sakarya',
  'Trabzon', 'Erzurum', 'Malatya', 'Diyarbakır', 'Şanlıurfa', 'Manisa', 'Balıkesir',
  'Aydın', 'Tekirdağ', 'Muğla', 'Hatay', 'Van', 'Elazığ', 'Sivas', 'Çanakkale',
];

const CITY_INDEX = new Map(TR_CITIES.map((c) => [fold(c), c]));

/** Serbest metinden şehir yakalar. Bulamazsa null döner — uydurmaz. */
export function detectCity(...parts: (string | null | undefined)[]): string | null {
  const haystack = fold(parts.filter(Boolean).join(' '));
  for (const [folded, display] of CITY_INDEX) {
    // Kelime sınırı: "van" kelimesi "vanilya" içinde eşleşmesin.
    const re = new RegExp(`(^|[^a-z])${folded}($|[^a-z])`);
    if (re.test(haystack)) return display;
  }
  return null;
}

export type WorkType = 'Remote' | 'Hybrid' | 'On-site';

/** Çalışma modelini tahmin eder. Belirsizse ofis kabul edilir (en yaygın). */
export function detectWorkType(...parts: (string | null | undefined)[]): WorkType {
  const text = fold(parts.filter(Boolean).join(' '));
  if (/\b(hibrit|hybrid)\b/.test(text)) return 'Hybrid';
  if (/\b(remote|uzaktan|evden|work from home|tamamen uzaktan)\b/.test(text)) return 'Remote';
  return 'On-site';
}
