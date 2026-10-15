import { ilanIli } from '../ilan-ili.mjs';
import { ARSIV_SAYFA_BOYU, acikIlanMi, arsivSirasi, arsivSayfaNumaralari } from './ilan-arsivi.mjs';
import { istanbulBugun } from './ilan-sayfasi.mjs';
import { kacir } from './metin.mjs';
import { ilanKartlariHtml } from './ilan-karti-html.mjs';

/**
 * ŞEHİR STAJ İLANLARI — /staj-ilanlari/<şehir> (14 Ekim 2026)
 *
 * Yalnız İstanbul. Diğer iller bugün 2–5 açık ilan taşıyor; ince ve
 * birbirinin kopyası sayfalar açılmıyor. Liste bilerek kapalı: yeni bir
 * şehir ancak buraya yazılarak açılır.
 *
 * Seçim (ön render, kenar çizimi ve uygulama AYNI fonksiyon):
 *   yayında + son başvurusu geçmemiş (arşivle aynı kural) + ilanIli(ilan)
 *   === il (lib/ilan-ili: doğrulanmış il önce, boşsa Türkiye ilanının
 *   şehir metninden, belirsizse il yok) + aynı kimlik ya da aynı şirket ve
 *   başlık bir kez. Sıra arşivle aynı (en yeni önce, eşitlikte kimlik).
 *
 * Sayfalama: 30 ilan (ARSIV_SAYFA_BOYU). Birinci sayfa /staj-ilanlari/<şehir>;
 * "/sayfa/1" adresi yok, kenar onu birinci sayfaya 301'liyor.
 *
 * Dizine açma eşiği: en az 10 açık ilan. Altında sayfa `noindex, follow`
 * alıyor ve haritaya girmiyor (ince sayfa kuralı).
 */
export const SEHIR_SAYFALARI = Object.freeze({
  istanbul: Object.freeze({ il: 'İstanbul', bulunma: "İstanbul'daki" }),
});

export const SEHIR_ESIGI = 10;

/** Kenar ve uygulamanın okuduğu alanlar; hepsi ziyaretçiye açık kolonlar. */
export const SEHIR_ILAN_SECIMI =
  'id,title,city,il,ilce,country_code,work_type,posted_at,created_at,updated_at,application_deadline,status,companies(name,logo_url)';

export const sehirYolu = (slug, n = 1) => (n <= 1 ? `/staj-ilanlari/${slug}` : `/staj-ilanlari/${slug}/sayfa/${n}`);

/**
 * Adresi çözer. Bilinen şehir değilse null (ara katman dokunmuyor).
 * @returns {null | {slug: string, il: string, sayfa: number} | {yonlendir: string}}
 */
export function sehirAdresiniCoz(yol) {
  const m = String(yol || '').match(/^\/staj-ilanlari\/([a-z0-9-]+)(?:\/sayfa\/([0-9]+))?(\/?)$/);
  if (!m || !Object.hasOwn(SEHIR_SAYFALARI, m[1])) return null;
  const slug = m[1];
  if (m[2] !== undefined) {
    const n = Number(m[2]);
    /* "/sayfa/01", "/sayfa/0": aynı içeriğin ikinci adresi olmasın. */
    if (!Number.isSafeInteger(n) || n < 1 || String(n) !== m[2]) return null;
    if (n === 1) return { yonlendir: sehirYolu(slug) };
    if (m[3]) return { yonlendir: sehirYolu(slug, n) };
    return { slug, il: SEHIR_SAYFALARI[slug].il, sayfa: n };
  }
  if (m[3]) return { yonlendir: sehirYolu(slug) };
  return { slug, il: SEHIR_SAYFALARI[slug].il, sayfa: 1 };
}

/**
 * Adres bir şehir sayfasının öneki altında mı (geçerli olsun ya da olmasın).
 * "/staj-ilanlari/istanbul/sayfa/0" gibi geçersiz adresler ara katmanda
 * 404'e düşüyor; bu yardımcı o 404'ün paylaşımlı önbelleğe girmemesi için.
 */
export function sehirOnekindeMi(yol) {
  const m = String(yol || '').match(/^\/staj-ilanlari\/([a-z0-9-]+)(?:\/|$)/);
  return Boolean(m && Object.hasOwn(SEHIR_SAYFALARI, m[1]));
}

const sade = (t) => String(t || '').trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');

/** Şehrin açık ilanları, sıralı ve tekrarsız. */
export function sehirIlanlari(ilanlar, il, bugun = istanbulBugun()) {
  const kimlik = new Set();
  const imza = new Set();
  const sonuc = [];
  for (const i of [...(Array.isArray(ilanlar) ? ilanlar : [])].sort(arsivSirasi)) {
    if (!i || !i.id || !String(i.title || '').trim()) continue;
    if (i.status !== undefined && i.status !== 'published') continue;
    if (!acikIlanMi(i, bugun)) continue;
    if (ilanIli(i) !== il) continue;
    const k = `${sade(i.companies?.name)}|${sade(i.title)}`;
    if (kimlik.has(i.id) || imza.has(k)) continue;
    kimlik.add(i.id);
    imza.add(k);
    sonuc.push(i);
  }
  return sonuc;
}

const SITE = 'https://stajimvar.com';

/**
 * Şehir sayfasının ön render / kenar girdisi (`sayfaHtml`ın `s` nesnesi).
 *
 * @param {object} o
 * @param {string} o.slug
 * @param {number} o.sayfa
 * @param {Array<object>} o.ilanlar   yayındaki ilanlar (ham satırlar)
 * @param {{konum: Function, calisma: Function}} o.etiketler  lib/sehir'den
 * @param {string} [o.bugun]
 * @returns {null | {s: object, toplamSayfa: number, adet: number, dilim: object[]}}
 *   null: sayfa numarası aralık dışında (404).
 */
export function sehirSayfasi({ slug, sayfa = 1, ilanlar, etiketler, bugun = istanbulBugun() }) {
  const tanim = SEHIR_SAYFALARI[slug];
  if (!tanim) return null;
  const liste = sehirIlanlari(ilanlar, tanim.il, bugun);
  const toplamSayfa = Math.max(1, Math.ceil(liste.length / ARSIV_SAYFA_BOYU));
  if (!Number.isInteger(sayfa) || sayfa < 1 || sayfa > toplamSayfa) return null;
  const dilim = liste.slice((sayfa - 1) * ARSIV_SAYFA_BOYU, sayfa * ARSIV_SAYFA_BOYU);
  const sirketSayisi = new Set(liste.map((i) => sade(i.companies?.name)).filter(Boolean)).size;

  /* Çalışma şekli dağılımı: yalnız veride olan değerler, uydurma yok. */
  const sekiller = new Map();
  for (const i of liste) {
    const e = i.work_type ? etiketler.calisma(i.work_type) : null;
    if (e) sekiller.set(e, (sekiller.get(e) || 0) + 1);
  }
  const dagilim = [...sekiller.entries()].sort((a, b) => b[1] - a[1]).map(([e, n]) => `${e} ${n}`).join(' · ');

  const ilkSayfa = sayfa === 1;
  const yol = sehirYolu(slug, sayfa);
  const baslik = ilkSayfa
    ? `${tanim.il} Staj İlanları | StajımVar`
    : `${tanim.il} staj ilanları — sayfa ${sayfa}/${toplamSayfa} | StajımVar`;
  const aciklama =
    `${tanim.bulunma} ${liste.length} açık staj ilanı, ${sirketSayisi} şirketin kendi kariyer sayfasından; ` +
    `en yeniden eskiye${toplamSayfa > 1 ? ` · sayfa ${sayfa}/${toplamSayfa}` : ''}.`;

  const numaralar =
    toplamSayfa > 1
      ? arsivSayfaNumaralari(sayfa, toplamSayfa)
          .map((k) =>
            k === null
              ? '<span aria-hidden="true">…</span>'
              : k === sayfa
                ? `<span aria-current="page">${k}</span>`
                : `<a href="${sehirYolu(slug, k)}">${k}</a>`,
          )
          .join(' ')
      : '';
  const gezinme = [
    sayfa > 1 ? `<a href="${sehirYolu(slug, sayfa - 1)}">← Önceki sayfa</a>` : '',
    numaralar,
    sayfa < toplamSayfa ? `<a href="${sehirYolu(slug, sayfa + 1)}">Sonraki sayfa →</a>` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const govde =
    '<main>' +
    `<nav aria-label="Sayfa yolu" class="sv-kirinti"><a href="/staj-ilanlari">Staj ilanları</a> › ${kacir(tanim.il)}</nav>` +
    `<h1>${kacir(tanim.il)} ${ilkSayfa ? 'Staj İlanları' : 'staj ilanları'}</h1>` +
    `<p>${kacir(tanim.bulunma)} ${liste.length} açık staj ilanı, ${sirketSayisi} şirketten. ` +
    'Başvuru şirketin kendi sayfasında yapılıyor; son başvurusu geçen ve yayından kalkan ilan listeden çıkıyor.' +
    (toplamSayfa > 1 ? ` Sayfa ${sayfa}/${toplamSayfa}.` : '') +
    '</p>' +
    /* Düz bilgi satırı: `.sv-alt` mavi vurgu, bağlantı gibi görünüyordu (telefonda görüldü). */
    (dagilim ? `<p>Çalışma şekli: ${kacir(dagilim)}</p>` : '') +
    (dilim.length
      ? ilanKartlariHtml(dilim, etiketler)
      : `<p>Şu anda ${kacir(tanim.bulunma)} açık staj ilanı yok.</p>`) +
    (gezinme ? `<nav aria-label="Sayfalar" class="sv-sayfalar"><p>${gezinme}</p></nav>` : '') +
    '<p class="sv-tum-ilanlar"><a href="/staj-ilanlari">Türkiye\'deki tüm staj ilanları →</a></p>' +
    '</main>';

  const kirinti = [
    { name: 'Ana sayfa', item: `${SITE}/` },
    { name: 'Staj ilanları', item: `${SITE}/staj-ilanlari` },
    { name: `${tanim.il}`, item: `${SITE}${sehirYolu(slug)}` },
    ...(ilkSayfa ? [] : [{ name: `Sayfa ${sayfa}`, item: `${SITE}${yol}` }]),
  ].map((o, n) => ({ '@type': 'ListItem', position: n + 1, ...o }));

  return {
    s: {
      baslik,
      aciklama,
      govde,
      kirintiYok: true,
      jsonLd: { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: kirinti },
      dizinDisi: liste.length < SEHIR_ESIGI,
      lastmod: dilim.map((i) => String(i.updated_at || '').slice(0, 10)).filter(Boolean).sort().pop() || null,
    },
    toplamSayfa,
    adet: liste.length,
    dilim,
  };
}
