/**
 * İŞVEREN BAŞLANGICI: E-POSTADAN ŞİRKET TAHMİNİ (10 Kasım 2026)
 *
 * "İstemeden önüne koysun": ad@modmere.com ile gelen kişide arama kutusu
 * "Modmere" ile dolu ve arama yapılmış geliyor, yeni şirkette web sitesi
 * "modmere.com". Serbest ve tek kullanımlık sağlayıcılar
 * (sirket-dogrulama.mjs, otomatik onayla AYNI liste) tahmin üretmiyor.
 *
 * Yalnız ÖNERİ: alanlar düzenlenebilir; yetki ve doğrulama sunucuda.
 */
import { SERBEST_SAGLAYICILAR, TEK_KULLANIMLIK, epostaAlanAdi, kayitliAlanAdi } from './sirket-dogrulama.mjs';

/* İkinci düzey ülke uzantıları: modmere.com.tr → "modmere". */
const IKINCI_DUZEY = new Set(['com', 'net', 'org', 'gen', 'biz', 'info', 'av', 'bel', 'edu', 'gov', 'k12', 'co', 'ac']);

/* Kayıtlı alan adı (mail.ornek.com.tr → ornek.com.tr): web sitesi önerisi ve otomatik onay aynı kökü görsün. */
export function kurumsalAlanAdi(eposta) {
  const alan = epostaAlanAdi(eposta);
  if (!alan || SERBEST_SAGLAYICILAR.has(alan) || TEK_KULLANIMLIK.has(alan)) return null;
  const kok = kayitliAlanAdi(alan);
  if (!kok || SERBEST_SAGLAYICILAR.has(kok) || TEK_KULLANIMLIK.has(kok)) return null;
  return kok;
}

export function alanAdindanSirketAdi(alan) {
  const parca = String(alan ?? '').toLowerCase().replace(/^www\./, '').split('.').filter(Boolean);
  if (parca.length < 2) return '';
  let i = parca.length - 2;
  if (parca.length >= 3 && parca[parca.length - 1].length === 2 && IKINCI_DUZEY.has(parca[i])) i -= 1;
  const kok = parca[i] ?? '';
  return kok
    .split('-')
    .filter(Boolean)
    .map((s) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1))
    .join(' ');
}

/** { alan, sirketAdi } ya da serbest sağlayıcıda null. */
export function epostadanSirketTahmini(eposta) {
  const alan = kurumsalAlanAdi(eposta);
  if (!alan) return null;
  const sirketAdi = alanAdindanSirketAdi(alan);
  return sirketAdi.length >= 2 ? { alan, sirketAdi } : null;
}
