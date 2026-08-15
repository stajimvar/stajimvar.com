/**
 * Kibar HTTP istemcisi.
 *
 * Kurallar (şemadaki `sources` alanlarıyla eşleşir):
 *   - robots.txt her host için bir kez okunur ve uygulanır
 *   - robots.txt'teki Crawl-delay ile kaynağın `crawl_delay_seconds` değerinden
 *     BÜYÜK olanı kullanılır — kaynak sahibinin dediği asgari değildir, azamidir
 *   - istekler arasında bekleme host bazında tutulur
 *   - User-Agent kimliği açık: kim olduğumuz ve nereye bakılacağı yazıyor
 *
 * Bu dosya bilinçli olarak "engel aşma" özelliği içermiyor: proxy rotasyonu,
 * tarayıcı taklidi, CAPTCHA çözme yok. Kaynak istemiyorsa geri çekiliyoruz.
 */

const DEFAULT_UA = 'StajimVarBot/1.0 (+https://stajimvar.com/bot)';

interface RobotsRules {
  disallow: string[];
  allow: string[];
  crawlDelaySeconds: number | null;
}

const robotsCache = new Map<string, RobotsRules | 'unavailable'>();
const lastRequestAt = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * robots.txt'i ilgili User-agent grubu için ayrıştırır.
 * Bizim UA'mıza özel grup varsa o, yoksa `*` grubu kullanılır.
 */
function parseRobots(body: string, userAgent: string): RobotsRules {
  const uaToken = userAgent.split('/')[0].toLowerCase();
  const lines = body.split(/\r?\n/);

  const groups: Array<{ agents: string[]; rules: RobotsRules }> = [];
  let current: { agents: string[]; rules: RobotsRules } | null = null;
  let lastWasAgent = false;

  for (const rawLine of lines) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;

    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: { disallow: [], allow: [], crawlDelaySeconds: null } };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }

    lastWasAgent = false;
    if (!current) continue;

    if (field === 'disallow') current.rules.disallow.push(value);
    else if (field === 'allow') current.rules.allow.push(value);
    else if (field === 'crawl-delay') {
      const n = Number(value);
      if (Number.isFinite(n)) current.rules.crawlDelaySeconds = n;
    }
  }

  const specific = groups.find((g) => g.agents.some((a) => a !== '*' && uaToken.includes(a)));
  if (specific) return specific.rules;

  const wildcard = groups.find((g) => g.agents.includes('*'));
  return wildcard?.rules ?? { disallow: [], allow: [], crawlDelaySeconds: null };
}

/** robots.txt kalıbı eşleşmesi: `*` ve sondaki `$` desteklenir. */
function pathMatches(pattern: string, path: string): boolean {
  if (pattern === '') return false;
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = body.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  const re = new RegExp('^' + escaped + (anchored ? '$' : ''));
  return re.test(path);
}

async function getRobots(origin: string, userAgent: string): Promise<RobotsRules | 'unavailable'> {
  const cached = robotsCache.get(origin);
  if (cached) return cached;

  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(10_000),
    });

    // 4xx = robots.txt yok, bu "her şey serbest" demektir (RFC 9309).
    if (res.status >= 400 && res.status < 500) {
      const empty: RobotsRules = { disallow: [], allow: [], crawlDelaySeconds: null };
      robotsCache.set(origin, empty);
      return empty;
    }
    if (!res.ok) {
      // 5xx = sunucu sorunlu. RFC 9309'a göre bu durumda taramayı DURDUR.
      robotsCache.set(origin, 'unavailable');
      return 'unavailable';
    }

    const rules = parseRobots(await res.text(), userAgent);
    robotsCache.set(origin, rules);
    return rules;
  } catch {
    robotsCache.set(origin, 'unavailable');
    return 'unavailable';
  }
}

export class RobotsDisallowedError extends Error {
  constructor(url: string) {
    super(`robots.txt bu adrese izin vermiyor: ${url}`);
    this.name = 'RobotsDisallowedError';
  }
}

export interface PoliteFetchOptions {
  userAgent?: string;
  /** Kaynağın `crawl_delay_seconds` değeri. robots.txt daha büyük derse o kazanır. */
  minDelaySeconds?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

/**
 * robots.txt'e uyan, hız sınırlı fetch.
 * İzin yoksa `RobotsDisallowedError` fırlatır — sessizce devam etmez.
 */
export async function politeFetch(
  url: string,
  options: PoliteFetchOptions = {}
): Promise<Response> {
  const userAgent = options.userAgent ?? DEFAULT_UA;
  const parsed = new URL(url);
  const origin = parsed.origin;

  const robots = await getRobots(origin, userAgent);
  if (robots === 'unavailable') {
    throw new RobotsDisallowedError(`${url} (robots.txt okunamadı, tarama durduruldu)`);
  }

  const path = parsed.pathname + parsed.search;
  // En uzun eşleşen kural kazanır; eşitlikte Allow öncelikli (RFC 9309).
  const longestDisallow = robots.disallow
    .filter((p) => pathMatches(p, path))
    .reduce((max, p) => (p.length > max.length ? p : max), '');
  const longestAllow = robots.allow
    .filter((p) => pathMatches(p, path))
    .reduce((max, p) => (p.length > max.length ? p : max), '');

  if (longestDisallow && longestDisallow.length > longestAllow.length) {
    throw new RobotsDisallowedError(url);
  }

  // Bekleme: kaynağın söylediği ile bizim asgari değerimizden büyük olanı.
  const delaySeconds = Math.max(robots.crawlDelaySeconds ?? 0, options.minDelaySeconds ?? 1);
  const last = lastRequestAt.get(origin) ?? 0;
  const waitMs = last + delaySeconds * 1000 - Date.now();
  if (waitMs > 0) await sleep(waitMs);
  lastRequestAt.set(origin, Date.now());

  return fetch(url, {
    headers: { 'User-Agent': userAgent, Accept: 'application/json, text/html;q=0.9', ...options.headers },
    signal: AbortSignal.timeout(options.timeoutMs ?? 20_000),
    redirect: 'follow',
  });
}

/** Test/bakım için önbelleği temizler. */
export function resetHttpCaches(): void {
  robotsCache.clear();
  lastRequestAt.clear();
}
