/**
 * Rehber sayfasının birleşik araması.
 *
 * NEDEN TEK ARAMA
 * ---------------
 * Rehber alanı dört ayrı hazine taşıyor: 70 rehber yazısı, 34 bölüm
 * rehberi, 46 doğrulanmış işveren ve 22 kariyer merkezi. Ama arama
 * yalnızca yazıların içinde geziyordu. "Aselsan" yazan kişi hiçbir sonuç
 * alamıyor, "Marmara" yazan kendi okulunun kariyer merkezini bulamıyordu.
 * İçerik eksikliği değil, içeriğin bulunamamasıydı.
 *
 * İkinci bir arama kutusu AÇILMIYOR. Üst çubuktaki kutu bu sayfadayken
 * rehberleri arıyordu; artık dördünü birden arıyor. Aynı ekranda iki
 * arama kutusu "hangisi neyi arıyor" sorusunu doğuruyor.
 *
 * SONUÇLAR GRUPLU
 * ---------------
 * Dört tür tek listeye karışsaydı okuyucu neye baktığını anlamazdı: bir
 * yazıyla bir şirket aynı görünürdü. Her tür kendi başlığı altında.
 */

/** Türkçe karakter duyarsız sadeleştirme; sıralama tarafıyla aynı kural. */
export function sadelestir(metin) {
  return String(metin ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a');
}

/**
 * Aramanın çalışması için gereken en az harf.
 *
 * Tek harf bütün listeyi döndürüyor ve sonuç sayfası anlamsız oluyor.
 */
export const EN_AZ_HARF = 2;

function eslesiyorMu(havuz, terim) {
  return sadelestir(havuz.filter(Boolean).join(' ')).includes(terim);
}

/**
 * Dört kaynakta birden arar.
 *
 * @param {string} arama
 * @param {{
 *   rehberler?: {slug: string, baslik: string, ozet?: string, aciklama?: string, etiketler?: string[], konuAdi?: string}[],
 *   bolumler?: {slug: string, ad: string, ozet?: string, grup?: string}[],
 *   isverenler?: {slug: string, isveren: string, sektor?: string, ozet?: string}[],
 *   merkezler?: {universite: string, sehir?: string}[],
 * }} kaynaklar
 */
export function birlesikArama(arama, kaynaklar = {}) {
  const terim = sadelestir(String(arama ?? '').trim());
  const bos = { terim, aktif: false, rehberler: [], bolumler: [], isverenler: [], merkezler: [], toplam: 0 };
  if (terim.length < EN_AZ_HARF) return bos;

  const rehberler = (kaynaklar.rehberler ?? []).filter((r) =>
    eslesiyorMu([r.baslik, r.ozet, r.aciklama, r.konuAdi, ...(r.etiketler ?? [])], terim)
  );
  const bolumler = (kaynaklar.bolumler ?? []).filter((b) =>
    eslesiyorMu([b.ad, b.ozet, b.grup], terim)
  );
  const isverenler = (kaynaklar.isverenler ?? []).filter((i) =>
    eslesiyorMu([i.isveren, i.sektor, i.ozet], terim)
  );
  const merkezler = (kaynaklar.merkezler ?? []).filter((m) =>
    eslesiyorMu([m.universite, m.sehir], terim)
  );

  return {
    terim,
    aktif: true,
    rehberler,
    bolumler,
    isverenler,
    merkezler,
    toplam: rehberler.length + bolumler.length + isverenler.length + merkezler.length,
  };
}

/**
 * Profildeki bölüm adını bölüm kaydına bağlar.
 *
 * Profildeki alan serbest metin ("Bilgisayar Mühendisliği"), bölüm
 * kayıtları ise sabit bir liste. Tam eşleşme aranıyor, sonra kapsama:
 * "Bilgisayar Mühendisliği (İngilizce)" da doğru sayfaya gitmeli.
 *
 * Eşleşme yoksa null — yanlış bir bölüm sayfasına götürmek, hiç
 * götürmemekten kötü.
 *
 * @param {string|null|undefined} bolumAdi
 * @param {{slug: string, ad: string}[]} bolumler
 */
export function profilBolumu(bolumAdi, bolumler) {
  const ad = sadelestir(bolumAdi);
  if (!ad || ad.length < 3) return null;

  const liste = bolumler ?? [];
  const tam = liste.find((b) => sadelestir(b.ad) === ad);
  if (tam) return tam;

  /*
    En uzun eşleşme kazanıyor: "Makine Mühendisliği" hem kendisiyle hem de
    kısa bir kayıtla eşleşebilir; uzun olan daha belirgin.
  */
  const kapsayan = liste
    .filter((b) => {
      const bAd = sadelestir(b.ad);
      return bAd.length >= 4 && (ad.includes(bAd) || bAd.includes(ad));
    })
    .sort((a, b) => sadelestir(b.ad).length - sadelestir(a.ad).length);

  return kapsayan[0] ?? null;
}

/**
 * Profildeki üniversite adını kariyer merkezi kaydına bağlar.
 *
 * @param {string|null|undefined} universite
 * @param {{universite: string}[]} merkezler
 */
/*
  ÜNİVERSİTE TAKMA ADLARI — ELLE, TAHMİNSİZ

  Öğrenci profilinde üniversite serbest metin. Kısaltma ve eksik yazım
  yaygın olduğu için küçük bir eşleme tutuluyor; ama her giriş burada
  AÇIKÇA yazılı, kelime benzerliğiyle üretilmiyor.
*/
const UNIVERSITE_TAKMA_ADLARI = {
  bogazici: 'bogazici universitesi',
  odtu: 'orta dogu teknik universitesi',
  itu: 'istanbul teknik universitesi',
  ytu: 'yildiz teknik universitesi',
  ktu: 'karadeniz teknik universitesi',
  iyte: 'izmir yuksek teknoloji enstitusu',
  omu: 'ondokuz mayis universitesi',
  sdu: 'suleyman demirel universitesi',
  tobb: 'tobb ekonomi ve teknoloji universitesi',
  ege: 'ege universitesi',
  marmara: 'marmara universitesi',
  hacettepe: 'hacettepe universitesi',
  sabanci: 'sabanci universitesi',
};

/**
 * Öğrencinin üniversitesine karşılık gelen kariyer merkezi.
 *
 * TAM EŞLEŞME — ALT DİZE DEĞİL
 * ----------------------------
 * İlk sürüm iki yönlü `includes` kullanıyordu ve ölçüldüğünde yanlış
 * üniversiteyi gösteriyordu: "İstanbul Üniversitesi" yazan öğrenciye
 * "İstanbul Üniversitesi-Cerrahpaşa" merkezini açıyordu — bunlar farklı
 * iki üniversite. Yalnız "İstanbul" yazmak bile eşleşiyordu.
 *
 * Yanlış kişiselleştirme, kişiselleştirmemekten kötü: öğrenci kendi
 * okulunun sayfası sandığı yerden yanlış belge indirir. Artık yalnız
 * normalize edilmiş TAM eşitlik ya da elle yazılmış bir takma ad
 * kabul ediliyor.
 */
export function profilMerkezi(universite, merkezler) {
  const ad = sadelestir(universite);
  if (!ad || ad.length < 4) return null;
  const hedef = UNIVERSITE_TAKMA_ADLARI[ad] ?? ad;

  return (
    (merkezler ?? []).find((m) => sadelestir(m.universite) === hedef) ?? null
  );
}
