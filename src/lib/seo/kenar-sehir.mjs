import { sayfaHtml } from './sayfa-html.mjs';
import { zorunluVeriGetir } from './veri-kaynagi.mjs';
import { SEHIR_ILAN_SECIMI, sehirAdresiniCoz, sehirSayfasi } from './sehir-ilanlari.mjs';

/**
 * ŞEHİR SAYFASI — KENARDA CANLI VERİDEN (14 Ekim 2026)
 *
 * Dağıtım yalnız main'e birleştirmede oluyor; derlemede yazılan şehir
 * sayfası iki dağıtım arasında bayatlardı: kapanan ilan listede kalır,
 * yayından kalkan ilanın sayfası 404 döndüğü için şehir sayfası kırık
 * bağlantı taşırdı. Ara katman sayfayı her istekte (60 sn kenar
 * önbelleğiyle) canlı veriden çiziyor; /ilan/* sayfalarıyla aynı model
 * (src/lib/seo/kenar-ilan.mjs).
 *
 * Karar tablosu:
 *   bilinmeyen şehir / biçimsiz adres      'gec'  (ara katman dokunmuyor → 404)
 *   "/sayfa/1", sondaki eğik çizgi          301 (kanonik adres)
 *   sayfa aralık dışında                    404
 *   veri ya da kabuk okunamadı              'yedek' (derleme dosyası, o da yoksa 503)
 *   aksi                                    200
 *
 * @returns {Promise<{tur: 'gec'} | {tur: 301, konum: string} | {tur: 404} | {tur: 'yedek', neden: string} | {tur: 200, html: string}>}
 */
export async function sehirIsteginiCoz({ yol, ayar, getir, kabukGetir, etiketler, bugun = undefined }) {
  const cozum = sehirAdresiniCoz(yol);
  if (!cozum) return { tur: 'gec' };
  if (cozum.yonlendir) return { tur: 301, konum: cozum.yonlendir };

  let ilanlar;
  try {
    ilanlar = await zorunluVeriGetir({
      kaynak: 'şehir ilanları',
      taban: ayar?.taban,
      anahtar: ayar?.anahtar,
      yol: `/rest/v1/listings?status=eq.published&select=${encodeURIComponent(SEHIR_ILAN_SECIMI)}`,
      zamanAsimiMs: 4000,
      deneme: 2,
      getir,
    });
  } catch (hata) {
    return { tur: 'yedek', neden: hata?.message || 'veri okunamadı' };
  }

  const sayfa = sehirSayfasi({ slug: cozum.slug, sayfa: cozum.sayfa, ilanlar, etiketler, ...(bugun ? { bugun } : {}) });
  if (!sayfa) return { tur: 404 };
  const kabuk = await kabukGetir();
  if (!kabuk) return { tur: 'yedek', neden: 'kabuk okunamadı' };
  return { tur: 200, html: sayfaHtml(kabuk, yol, sayfa.s) };
}
