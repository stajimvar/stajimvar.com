/**
 * ÜRÜN METNİ — TEK KAYNAK
 *
 * NEDEN VAR
 * ---------
 * "İlanlar nereden geliyor" cümlesi sitede üç ayrı dosyada, üç ayrı
 * elle yazılmış kopyayla duruyordu. Ürün değişince (şirketler artık
 * ilanlarını doğrudan burada yayımlıyor ve başvuru StajımVar üzerinde
 * tamamlanıyor) kopyaların biri güncellendi, ikisi eskide kaldı ve
 * canlıda artık doğru olmayan bir iddia yazılı kaldı:
 * "her ilanda şirketin kendi başvuru bağlantısı var".
 *
 * Ürünün ne yaptığını anlatan cümleler artık burada. Bir kabiliyet
 * değişince tek dosya değişiyor.
 *
 * KURAL
 * -----
 * Buraya yalnızca ÜRÜNÜN BUGÜN YAPTIĞI şey yazılır. "Yakında", "yakın
 * zamanda" ya da hedeflenen davranış buraya girmez.
 */

/** İki ilan türü. Veritabanındaki `listings.origin` ile birebir. */
export const ILAN_KAYNAGI = {
  /** Şirketin resmî işe alım sisteminden derlenen ilan. */
  dis: {
    etiket: 'Kariyer sayfasından',
    basvuruEylemi: 'Resmî sitede başvur',
    aciklama: 'Başvuru şirketin kendi kariyer sayfasında tamamlanıyor.',
  },
  /** Şirketin StajımVar'da açtığı ilan. */
  ic: {
    etiket: 'StajımVar ilanı',
    basvuruEylemi: 'StajımVar ile başvur',
    aciklama: 'Başvuru StajımVar üzerinde tamamlanıyor; şirket panelinden görüyor.',
  },
} as const;

/**
 * Ana sayfadaki ve bölüm sayfalarındaki "ilanlar nereden geliyor"
 * açıklaması. Kısa sürüm tek paragraf, uzun sürüm iki cümle.
 */
export const ILAN_KAYNAGI_KISA =
  'İlanların bir kısmını şirketlerin kendi resmî kariyer kaynaklarından derliyoruz; ' +
  'orada başvuru şirketin kendi sayfasında tamamlanıyor. StajımVar işverenleri ise ' +
  'ilanını doğrudan burada yayımlıyor ve başvuruyu StajımVar üzerinden alıyor.';

/**
 * Aynı bilginin kart içinde kullanılan iki parçalı hâli. Kalın yazılacak
 * kısım ayrı tutuluyor ki JSX'te `<strong>` ile sarılabilsin.
 */
export const ILAN_KAYNAGI_PARCALI = {
  once: 'Farklı kariyer sayfalarını tek tek gezme. İlanların bir kısmını aracı sitelerden değil, ',
  vurgu: 'şirketlerin kendi kariyer sayfalarından',
  sonra:
    ' derliyoruz. StajımVar işverenleri ise ilanını doğrudan burada yayımlıyor; o ilanlarda ' +
    'başvuru siteden çıkmadan tamamlanıyor.',
} as const;
