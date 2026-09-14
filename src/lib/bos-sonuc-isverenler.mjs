/**
 * BOŞ SONUÇTA GÖSTERİLECEK İŞVERENLER
 *
 * Kaynak `src/data/stajProgramlari.ts` — İKİNCİ BİR DİZİN KURULMUYOR.
 * O dosya 46 büyük işverenin doğrulanmış kariyer sayfasını ve editoryal
 * bölüm eşleştirmesini (`bolumler`) taşıyor.
 *
 * NE İDDİA EDİLİYOR, NE EDİLMİYOR
 * -------------------------------
 * Bu kayıtlar AÇIK STAJ İLANI DEĞİL: şirketin kendi başvuru sayfası.
 * `sonKontrol` o SAYFANIN çalıştığının son doğrulandığı tarih — programın
 * açık olduğunun kanıtı değil. Bu yüzden durum her kayıtta
 * "Durum bilinmiyor": açık olduğunu da kapalı olduğunu da bilmiyoruz ve
 * ikisinden birini söylemek uydurma olurdu.
 *
 * ÜLKE UYGUNLUĞU
 * --------------
 * Dizindeki kurumların hepsi Türkiye'deki işverenler; veri setinde ülke
 * alanı yok çünkü tek ülke var. Kullanıcı başka bir ülke seçtiyse bu
 * blok GÖSTERİLMİYOR — Fransa'da staj arayan öğrenciye Türk holdinginin
 * kariyer sayfasını önermek, filtresini yok saymak olurdu.
 *
 * `remote` seçimi de dışarıda: bunlar kariyer sayfaları, uzaktan çalışma
 * vaadi taşımıyorlar.
 */

/** Dizindeki işverenlerin bulunduğu tek ülke. */
const DIZIN_ULKESI = 'TR';

/**
 * Seçili ülke bu dizine uygun mu?
 *
 * 'all' ve 'TR' uygun; başka ülke kodu ya da 'remote' uygun değil.
 */
export function ulkeUygunMu(country) {
  const secim = String(country ?? 'all').trim();
  return secim === 'all' || secim.toUpperCase() === DIZIN_ULKESI;
}

/**
 * @typedef {'acik' | 'kapali' | 'bilinmiyor'} IsverenDurumu
 */

/**
 * Ülke ve bölüme GERÇEKTEN uyan işverenler.
 *
 * @returns {Array<{slug: string, isveren: string, sektor: string, kariyerUrl: string, durum: IsverenDurumu}>}
 *
 * Bölüm seçilmişse `bolumler` alanında TAM slug eşleşmesi aranıyor —
 * alt dize değil. `burs`/Bursa ve `maaş`/Maastricht sınıfı hataları
 * burada tekrarlamıyoruz: eşleşme bir dizi üyeliği sorgusu.
 *
 * Bölüm seçilmemişse dizinin tamamı uygun.
 *
 * @param {Array<{slug: string, isveren: string, sektor: string, kariyerUrl: string, bolumler?: string[], sonKontrol?: string}>} programlar
 * @param {{country?: string, departments?: string[]}} filtreler
 * @param {number} sinir Gösterilecek en fazla kayıt.
 */
export function uygunIsverenler(programlar, filtreler, sinir = 6) {
  if (!Array.isArray(programlar) || programlar.length === 0) return [];
  if (!ulkeUygunMu(filtreler?.country)) return [];

  const bolumler = Array.isArray(filtreler?.departments) ? filtreler.departments : [];
  const havuz =
    bolumler.length === 0
      ? programlar
      : programlar.filter((p) =>
          (Array.isArray(p.bolumler) ? p.bolumler : []).some((b) => bolumler.includes(b))
        );

  /*
    SABİT SAYI SÖZÜ VERİLMİYOR: bulunan kadarı gösteriliyor ve üst sınır
    yalnız ekranın boyu için. "10 şirket" gibi bir söz, dizin küçüldüğünde
    ya da bölüm daraldığında yalan olurdu.
  */
  return havuz.slice(0, sinir).map((p) => ({
    slug: p.slug,
    isveren: p.isveren,
    sektor: p.sektor,
    kariyerUrl: p.kariyerUrl,
    /*
      DURUM HER ZAMAN BİLİNMİYOR

      `sonKontrol` sayfanın çalıştığını doğruluyor, programın açık
      olduğunu doğrulamıyor. Bir gün program durumu gerçekten
      doğrulanırsa bu alan 'acik' / 'kapali' dönebilir.
    */
    durum: /** @type {IsverenDurumu} */ ('bilinmiyor'),
  }));
}
