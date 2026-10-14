import { kacir, ilanYolu } from './metin.mjs';
import { guvenliLogoAdresi } from '../bildirim-basvurusu.mjs';
import { basHarfler, paletSirasi } from '../logo-yedegi.mjs';

/**
 * JAVASCRIPT'SİZ İLAN KARTLARI — TEK KAYNAK (14 Ekim 2026)
 *
 * Ana sayfa, /staj-ilanlari ve bölüm sayfaları bu kartları ön render'da
 * (scripts/onrender.mjs) çiziyordu; işaretleme betiğin içindeydi. Şehir
 * sayfası kenarda da (functions/_middleware.ts) canlı veriden çizildiği için
 * kart buraya taşındı — işaretleme BİREBİR aynı, iki yer tek kaynaktan.
 *
 * KART TASARIMI REACT KARTINA YAKIN: 80×80 şirket logosu, başlık, şirket,
 * şehir · çalışma şekli ve "İlanı incele". Ölçüler canlı React kartından
 * alındı (index.html'deki `.sv-kart*` stilleri). Kaydet düğmesi yok:
 * oturum ve etkileşim istiyor, çalışmayan bir düğme çizilmiyor.
 *
 * LOGO KAYNAĞI: `companies.logo_url` — React kartının okuduğu alanın aynısı.
 * Yalnız HTTPS ya da kökten göreli adres (guvenliLogoAdresi). Logo yoksa
 * uydurma görsel YOK: CompanyLogo'nun yedeği, şirket adının baş harfleri,
 * aynı renk sırasıyla (lib/logo-yedegi.mjs).
 *
 * YÜKLEME: sabit 80×80 (width/height + aspect-ratio) — görsel inince satır
 * oynamıyor. İlk ekranda kalan ilk 3 logo hemen, kalanı loading="lazy".
 */
export const HEMEN_YUKLENEN_LOGO = 3;

export function logoHtml(i, sira) {
  const sirket = (i.companies || {}).name || '';
  const adres = guvenliLogoAdresi((i.companies || {}).logo_url);
  if (adres) {
    return (
      '<span class="sv-logo">' +
      `<img src="${kacir(adres)}" alt="${kacir(sirket ? `${sirket} logosu` : 'Şirket logosu')}" width="80" height="80" ` +
      (sira < HEMEN_YUKLENEN_LOGO ? 'loading="eager" ' : 'loading="lazy" ') +
      'decoding="async" />' +
      '</span>'
    );
  }
  return (
    `<span class="sv-logo sv-logo-yedek sv-logo-p${paletSirasi(sirket)}" role="img" aria-label="${kacir(`${sirket || 'Şirket'} logosu yok`)}">` +
    `${kacir(basHarfler(sirket))}</span>`
  );
}

/**
 * @param {Array<object>} liste  ilan satırları (snake_case)
 * @param {{konum: (i: object) => string, calisma: (w: string) => string|null}} etiket
 *   konum etiketi lib/sehir'den (TypeScript; ön render derleyip, kenar
 *   doğrudan veriyor) — burada içe aktarılmıyor.
 */
export function ilanKartlariHtml(liste, { konum, calisma }) {
  if (!liste.length) return '';
  return (
    '<ul class="sv-kartlar">' +
    liste
      .map((i, sira) => {
        const sirket = (i.companies || {}).name || '';
        /* Konum önce normalize il/ilçeden; ülke adı şehir gibi basılmıyor (lib/sehir). */
        const yer = [konum(i), i.work_type ? calisma(i.work_type) : ''].filter(Boolean).join(' · ');
        const yol = ilanYolu(i);
        return (
          '<li class="sv-kart">' +
          logoHtml(i, sira) +
          '<div class="sv-kart-govde">' +
          `<a class="sv-kart-baslik" href="${yol}">${kacir(i.title)}</a>` +
          (sirket ? `<span class="sv-kart-sirket">${kacir(sirket)}</span>` : '') +
          '<div class="sv-kart-alt-sira">' +
          (yer
            ? '<span class="sv-kart-konum"><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>' +
              `${kacir(yer)}</span>`
            : '<span></span>') +
          `<a class="sv-kart-incele" href="${yol}" aria-label="${kacir(`${i.title} ilanını incele`)}">İlanı incele</a>` +
          '</div>' +
          '</div>' +
          '</li>'
        );
      })
      .join('') +
    '</ul>'
  );
}
