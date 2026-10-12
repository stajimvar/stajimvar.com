/**
 * ÖN RENDER İLE KENAR ÇİZİMİNİN ORTAK METİN ARAÇLARI (12 Ekim 2026)
 *
 * Bu dosya iki ortamda çalışıyor: derleme anında Node (`scripts/onrender.mjs`)
 * ve istek anında Cloudflare Pages ara katmanı (`functions/_middleware.ts`).
 * İkisi aynı ilan sayfasını üretiyor; kaçırma, kısaltma ve adres kuralı iki
 * yerde ayrı yazılsaydı aynı ilan derlemede bir, kenarda başka biçimde
 * çizilirdi. Bu yüzden Node'a ya da tarayıcıya özgü hiçbir API kullanılmıyor.
 */

/** HTML özniteliği ve metni için kaçırma. */
export const kacir = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/*
  VARLIK ÇÖZME

  Kaynaktan derlenen açıklamalar düz metin ama içinde HTML varlıkları var:
  ölçüldü (12 Ekim 2026), en uzun açıklama `&nbsp;` ile dolu. Önce
  kaçırıldıklarında sayfada "&nbsp;" yazısı olarak görünüyorlardı. Sık
  görülen varlıklar ve sayısal varlıklar çözülüyor; sonra metin yeniden
  kaçırılıyor, yani çözme bir enjeksiyon kapısı açmıyor.
*/
const ADLI_VARLIKLAR = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  bull: '•',
};

export function varliklariCoz(metin) {
  return String(metin ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (tam, ad) => {
    if (ad[0] === '#') {
      const kod = ad[1] === 'x' || ad[1] === 'X' ? parseInt(ad.slice(2), 16) : parseInt(ad.slice(1), 10);
      return Number.isFinite(kod) && kod > 0 && kod < 0x110000 ? String.fromCodePoint(kod) : tam;
    }
    return ADLI_VARLIKLAR[ad.toLowerCase()] ?? tam;
  });
}

/** Etiketleri, varlıkları ve fazla boşluğu atar; kısaltmaz. */
export function duzMetin(metin) {
  return varliklariCoz(String(metin ?? '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Uzun metni arama sonucunda görünecek uzunluğa indirir (meta açıklama için). */
export function ozetle(metin, uzunluk = 155) {
  const duz = duzMetin(metin);
  if (duz.length <= uzunluk) return duz;
  return duz.slice(0, uzunluk).replace(/\s+\S*$/, '') + '…';
}

/**
 * Paragraf yapısını koruyarak düz metin: satır sonları paragraf ayıracı.
 * Açıklama sayfada ve yapısal veride KESİLMEDEN, paragraf paragraf basılıyor.
 */
export function paragraflar(metin) {
  return String(metin ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .split(/\n+/)
    .map((p) => duzMetin(p))
    .filter(Boolean);
}

/*
  İLAN ADRESİ — TEK KURAL

  Derleme (`slugla`) ile istemci (`src/lib/slug.ts`) farklı kural
  uyguluyordu: istemci başlığı 70 karaktere kısaltıyordu, derleme
  kısaltmıyordu. Ölçüldü (12 Ekim 2026): başlığı uzun 3 ilanda uygulama
  içindeki bağlantı doğrudan açılınca canlıda HTTP 404 dönüyordu. Kural
  artık burada; `src/lib/slug.ts` de bunu kullanıyor.

  Kısaltma YOK: arama motorunda dizinli adresler kısaltılmamış biçimde.
  Kısaltılmış eski bağlantılar kenarda kimlik önekinden çözülüp kanonik
  adrese 301 alıyor.
*/
const TR_HARFLER = {
  ı: 'i', İ: 'i', I: 'i', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u',
  ş: 's', Ş: 's', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c', â: 'a', î: 'i', û: 'u',
};

export function slugla(metin) {
  let cikti = '';
  for (const harf of String(metin ?? '')) cikti += TR_HARFLER[harf] ?? harf;
  return cikti
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Kimliğin ilk 8 onaltılık hanesi — adresin değişmeyen parçası. */
export function ilanOneki(id) {
  return String(id ?? '').replace(/-/g, '').slice(0, 8).toLowerCase();
}

/** `/ilan/<başlık>-<önek>` — sitemap, canonical, iç bağlantı ve istemci aynı adresi kullanıyor. */
export function ilanYolu(ilan) {
  const baslik = slugla(ilan.title);
  const onek = ilanOneki(ilan.id);
  return `/ilan/${baslik ? `${baslik}-${onek}` : onek}`;
}

/**
 * Adresten kimlik bilgisi. Üç biçim kabul ediliyor:
 *   /ilan/<başlık>-<önek>     bugünkü biçim (başlık kısmı yanlış olabilir)
 *   /ilan/<önek>              çıplak önek (eski)
 *   /ilan/<tam uuid>          ham kimlik (eski)
 */
export function ilanAdresiniCoz(parca) {
  let cozulmus;
  try {
    cozulmus = decodeURIComponent(String(parca ?? ''));
  } catch {
    return null;
  }
  const temiz = cozulmus.replace(/\/+$/, '').toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(temiz)) {
    return { onek: temiz.slice(0, 8), tamKimlik: temiz };
  }
  const son = temiz.split('-').pop() ?? '';
  return /^[0-9a-f]{8}$/.test(son) ? { onek: son, tamKimlik: null } : null;
}
