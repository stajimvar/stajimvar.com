/**
 * FIRSAT AÇIKLAMASI — YAPILI METİN (31 Ekim 2026)
 *
 * `opportunities.description` düz metin. Bir kaydın sayfası öğrencinin
 * sorduğu soruları (kim başvurabilir, nasıl, hangi belgeler, ne zaman)
 * bölüm bölüm cevaplayacaksa başlık, madde ve kaynağa bağlantı gerekiyor.
 * Bunun için küçük bir yazım kuralı:
 *
 *   ## Başlık
 *   - madde
 *   [metin](https://resmi.kaynak/...)   ya da   [metin](/rehber/...)
 *   boş satır = yeni paragraf
 *
 * YALNIZ ÇOK SATIRLI METİN YAPILI SAYILIYOR. Ölçüldü (31 Ekim 2026):
 * açıklaması olan 11 kaydın 11'i tek satır düz metin ve hiçbiri bu
 * işaretleri taşımıyor. Tek satırlık metin eskisi gibi tek paragraf
 * kalıyor; o sayfaların çıktısı değişmiyor.
 *
 * Ön render (scripts/onrender.mjs) ve detay sayfası
 * (OpportunityDetailPage) AYNI ayrıştırıcıyı kullanıyor: ilk HTML ile
 * JavaScript sonrası ekran aynı metni söylemeli.
 *
 * Bağlantı yalnız `https://` ya da site içi `/` ile başlıyorsa bağlantı
 * oluyor; başka her şey (javascript:, http:, boşluklu adres) düz metin.
 */

const BAGLANTI = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;

/** Adres bağlantı olabilir mi: yalnız https ya da site içi yol. */
export function guvenliAdres(adres) {
  const a = String(adres ?? '');
  if (/^\/(?!\/)[^\s]*$/.test(a)) return true;
  try {
    const u = new URL(a);
    return u.protocol === 'https:' && Boolean(u.hostname);
  } catch {
    return false;
  }
}

/** Metin çok satırlıysa yapılı açıklama sayılır. */
export function aciklamaYapili(metin) {
  return typeof metin === 'string' && metin.trim().includes('\n');
}

/**
 * Satır içi parçalar: `{ metin }` ya da `{ metin, adres, disari }`.
 * Geçersiz adresli bağlantı yazıldığı gibi düz metin kalıyor.
 */
export function satirParcalari(satir) {
  const parcalar = [];
  let son = 0;
  for (const m of String(satir).matchAll(BAGLANTI)) {
    if (m.index > son) parcalar.push({ metin: satir.slice(son, m.index) });
    const [tam, metin, adres] = m;
    if (guvenliAdres(adres)) parcalar.push({ metin, adres, disari: !adres.startsWith('/') });
    else parcalar.push({ metin: tam });
    son = m.index + tam.length;
  }
  if (son < satir.length) parcalar.push({ metin: satir.slice(son) });
  return parcalar;
}

/**
 * Bloklar: `{ tur: 'baslik', parcalar }`, `{ tur: 'paragraf', parcalar }`,
 * `{ tur: 'liste', maddeler: [parcalar] }`.
 */
export function aciklamaBloklari(metin) {
  const bloklar = [];
  let paragraf = [];
  let liste = null;
  const paragrafiKapat = () => {
    if (paragraf.length) bloklar.push({ tur: 'paragraf', parcalar: satirParcalari(paragraf.join(' ')) });
    paragraf = [];
  };
  const listeyiKapat = () => {
    if (liste) bloklar.push({ tur: 'liste', maddeler: liste });
    liste = null;
  };
  for (const ham of String(metin ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const satir = ham.trim();
    if (!satir) {
      paragrafiKapat();
      listeyiKapat();
    } else if (satir.startsWith('## ')) {
      paragrafiKapat();
      listeyiKapat();
      bloklar.push({ tur: 'baslik', parcalar: satirParcalari(satir.slice(3).trim()) });
    } else if (satir.startsWith('- ')) {
      paragrafiKapat();
      (liste ??= []).push(satirParcalari(satir.slice(2).trim()));
    } else {
      listeyiKapat();
      paragraf.push(satir);
    }
  }
  paragrafiKapat();
  listeyiKapat();
  return bloklar;
}

/** Parçaların düz metni (meta açıklama, sayım, arama için). */
export function parcalarMetni(parcalar) {
  return parcalar.map((p) => p.metin).join('');
}

/** Yapılı açıklamanın düz metni: işaretler ve adresler atılıyor. */
export function aciklamaDuzMetni(metin) {
  return aciklamaBloklari(metin)
    .map((b) => (b.tur === 'liste' ? b.maddeler.map(parcalarMetni).join(' ') : parcalarMetni(b.parcalar)))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ön render için HTML. `kacir` çağıranın kaçış işlevi (lib/seo/metin);
 * burada ikinci bir kaçış kuralı yazılmıyor.
 */
export function aciklamaHtml(metin, kacir) {
  const satirHtml = (parcalar) =>
    parcalar
      .map((p) =>
        p.adres
          ? `<a href="${kacir(p.adres)}"${p.disari ? ' rel="noopener noreferrer"' : ''}>${kacir(p.metin)}</a>`
          : kacir(p.metin)
      )
      .join('');
  return aciklamaBloklari(metin)
    .map((b) => {
      if (b.tur === 'baslik') return `<h2>${satirHtml(b.parcalar)}</h2>`;
      if (b.tur === 'liste') return `<ul>${b.maddeler.map((m) => `<li>${satirHtml(m)}</li>`).join('')}</ul>`;
      return `<p>${satirHtml(b.parcalar)}</p>`;
    })
    .join('');
}
