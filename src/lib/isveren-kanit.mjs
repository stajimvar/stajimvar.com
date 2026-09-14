/**
 * İŞVEREN KARİYER SAYFASI — KANIT KURALLARI (AĞ YOK, SAF İŞLEVLER)
 *
 * NEDEN AYRI MODÜL
 * ----------------
 * Bu kurallar bir kez ÇOK YANLIŞ ölçtü ve sekiz şirketi haksız yere
 * "staj programı açık" ilan etti. Ölçtüğüm gerçek eşleşmeler:
 *
 *   roketsan    → "Tedarik Zinciri Portalı BAŞVURU Kılavuzu"   (tedarikçi)
 *   is-bankasi  → "POS BAŞVURU"                                (banka menüsü)
 *   kordsa      → "iş başvuru platformumuzdur"                 (tüm pozisyonlar)
 *   vodafone    → sayfa başlığı "Kariyer & İş Başvurusu"        (sayfa kromu)
 *   tupras      → adres /kariyer → /tr/404 ama HTTP 200         (yumuşak 404)
 *
 * Eski kural "sayfada staj programı ifadesi VAR ve başvuru ifadesi VAR"
 * diyordu. İkisi 13.000 karakter arayla, biri tedarikçi biri POS
 * başvurusu olabiliyordu. Kural ölçülebilir olduğu için yanlış olduğu
 * da ölçülebildi; bu modül düzeltilmiş hâli ve kendi testleri var.
 *
 * YENİ KURAL: BAĞLANTI, PROZA DEĞİL
 * ---------------------------------
 * "Açık" kararı artık serbest metinden ÇIKARILMIYOR. Aranan şey
 * STAJA ÖZGÜ BİR BAĞLANTI: hem staj izi hem başvuru/ilan izi taşıyan,
 * tedarikçi/POS/bayi bağlamında olmayan bir `<a>`. Bulunursa o adres
 * ikinci adımda ÇAĞIRILIYOR ve "açık" kararı oradan geliyor — genel
 * kariyer ana sayfası tek başına asla "açık" üretmiyor.
 */

/*
  STAJ İZİ — "internet" TUZAĞI

  `intern` alt dizesi "internet", "international" ve "internal"
  içinde de var; bir kariyer sayfasında üçü birlikte geçiyor.
  Kelime sınırı şart: eskiden `burs` Bursa'yı, `maas` Maastricht'i
  yakalamıştı ve o iki hata üretimdeki tek "ücretli" kanıtıydı.
*/
export const STAJ_IZI = /staj\w*|\bintern(ship)?s?\b|\btrainee\b/i;

/** Başvuru ya da ilan izi. */
export const BASVURU_IZI = /ba[şs]vur\w*|apply|application form|ilan\w*|pozisyon/i;

/*
  DİSKALİFİYE BAĞLAM

  Aynı sayfada staj kelimesiyle yan yana duran ama öğrenci stajıyla
  ilgisi olmayan başvurular. Ölçülen gerçek örnekler: tedarikçi
  portalı, POS başvurusu, bayi başvurusu.
*/
export const DISKALIFIYE_IZI =
  /tedarik|supplier|bayi|dealer|kredi|\bpos\b|vize|abonelik|fatura|ihale|sat[ıi]n ?alma/i;

/*
  BLOG / HABER — BAŞVURU YOLU DEĞİL

  Ölçümde vodafone'un tek staj bağlantısı
  "/insan-kaynaklari/blog/staj-basvurusunda-dikkat-edilmesi-gerekenler"
  çıktı: başvuru nasıl yapılır diye ANLATAN bir yazı. Tavsiye yazısı
  açık program kanıtı değil.
*/
export const YAZI_IZI = /\/blog\/|\/haber|\/news|\/makale|\/duyuru|dikkat edilmesi|nas[ıi]l yaz/i;

/*
  KAPANIŞ — AÇIK İFADE ŞART

  "İlan bulunamadı" kanıt değil: şirketin bütün programlarının kapalı
  olduğu sonucu çıkarılamaz. Yalnız açıkça kapandığını söyleyen cümle.
*/
export const KAPANIS_IZI =
  /ba[şs]vurular(ı|i)?m?[ıi]z? kapan|ba[şs]vuru d[öo]nemi (kapan|sona er)|son ba[şs]vuru tarihi ge[çc]|form(umuz)? kapat[ıi]l|applications? (are )?closed|no longer accepting/i;

/*
  PROGRAM SAYFASINDA AKTİF BAŞVURU

  "Hemen başvur" gibi bir EYLEM çağrısı. "başvuru sürecinin ardından
  testler uygulanır" gibi SÜREÇ ANLATIMI bunu geçmiyor — bilim-ilac'ta
  tam olarak o cümle "açık" sayılmıştı.
*/
export const AKTIF_BASVURU_IZI =
  /hemen ba[şs]vur|ba[şs]vuru yap|[şs]imdi ba[şs]vur|ba[şs]vuru formunu doldur|online ba[şs]vuru|apply now|start your application/i;

/*
  GENEL HAVUZ — STAJ PROGRAMI BAŞVURUSU DEĞİL

  "Tüm açık ilanlarımıza başvurmak için tıklayın" bütün pozisyonlara
  giden tek kapı; belirli bir staj programının açık olduğunu
  söylemiyor.
*/
export const GENEL_HAVUZ_IZI =
  /t[üu]m a[çc][ıi]k (ilan|pozisyon)|b[üu]t[üu]n a[çc][ıi]k (ilan|pozisyon)|all (open|current) (jobs|positions|vacancies)|t[üu]m pozisyonlar/i;

/** Etiketleri atıp okunur metin bırakır. */
export function gorunurMetin(govde) {
  return String(govde ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    /*
      HTML YORUMLARI DA ATILIYOR

      Borusan'da "Şimdi Başvur" düğmesi yorum içinde duruyordu
      (`Detaylı Bilgi Şimdi Başvur -->`): sayfada GÖRÜNMEYEN bir
      düğmeyi aktif başvuru sanmak tam da kaçınılan hata.
    */
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

/** `&#58;` gibi kaçışlanmış adresleri açar (İş Bankası sayfası böyle veriyor). */
export function adresiCoz(href) {
  return String(href ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * YUMUŞAK 404 — HTTP 200 DÖNEN "SAYFA BULUNAMADI"
 *
 * Ölçümde dört şirket (tupras, tusas, yildiz-holding) kariyer
 * adresinden 404 sayfasına yönlendi ve sunucu 200 döndü. Eski kural
 * bunu "bağlantı çalışıyor" sayıyordu; kartta çalışan bir adres
 * gösterip öğrenciyi boş sayfaya göndermek bozuk bağlantıdan farksız.
 *
 * @returns {string|null} bozukluk nedeni ya da null
 */
export function yumusak404(sonAdres, govde) {
  if (/\/404(\/|$|\?|#)|not-?found|sayfa-bulunamadi/i.test(String(sonAdres ?? ''))) {
    return 'yumuşak 404: son adres 404 sayfası';
  }
  const baslik = (String(govde ?? '').match(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i) ?? [])[1];
  if (baslik && /(^|\D)404(\D|$)|sayfa bulunamad|page not found/i.test(baslik)) {
    return `yumuşak 404: başlık "${gorunverBaslik(baslik)}"`;
  }
  return null;
}

function gorunverBaslik(baslik) {
  return gorunurMetin(baslik).trim().slice(0, 60);
}

/** Sayfadaki bağlantıları `{href, yazi}` olarak çıkarır. */
export function baglantilar(govde) {
  return [...String(govde ?? '').matchAll(/<a\b([^>]*)>([\s\S]{0,400}?)<\/a>/gi)].map((e) => ({
    href: adresiCoz((e[1].match(/href\s*=\s*["']([^"']+)["']/i) ?? [])[1] ?? ''),
    yazi: gorunurMetin(e[2]).trim(),
  }));
}

/**
 * STAJA ÖZGÜ BAŞVURU/PROGRAM BAĞLANTISI
 *
 * Genel kariyer sayfasında aradığımız tek şey bu: stajın KENDİ
 * sayfasına giden bir bağlantı. Bulunamazsa sayfa yalnız genel kariyer
 * sayfasıdır ve program durumu `bilinmiyor` kalır.
 *
 * @returns {{href: string, yazi: string}|null}
 */
export function stajBaglantisi(govde) {
  for (const bag of baglantilar(govde)) {
    const hepsi = `${bag.href} ${bag.yazi}`;
    if (!STAJ_IZI.test(hepsi)) continue;
    if (/internet|international|internal/i.test(hepsi) && !/staj/i.test(hepsi)) continue;
    if (DISKALIFIYE_IZI.test(hepsi)) continue;
    if (YAZI_IZI.test(hepsi)) continue;
    if (!BASVURU_IZI.test(hepsi) && !/staj|intern/i.test(bag.href)) continue;
    if (!bag.href || /^(#|javascript:|mailto:|tel:)/i.test(bag.href)) continue;
    return bag;
  }
  return null;
}

/**
 * GENEL KARİYER SAYFASININ KARARI — BİRİNCİ ADIM
 *
 * Bu adım "açık" ÜRETEMEZ. En iyi durumda "staj sayfası şurada" der ve
 * kararı ikinci adıma bırakır.
 *
 * @returns {{durum:'kapali'|'bilinmiyor', kanit:string, izlenecek?:string}}
 */
export function kariyerSayfasiKarari(govde) {
  const metin = gorunurMetin(govde);
  /*
    KAPANIŞ ÖNCE: "başvurular kapandı" cümlesinin içinde "başvuru" da
    geçiyor ve başvuru kalıbı onu aktif bir yol sanardı.
  */
  if (KAPANIS_IZI.test(metin)) {
    return { durum: 'kapali', kanit: 'basvuru-kapandi-ifadesi' };
  }
  const bag = stajBaglantisi(govde);
  if (bag) {
    return { durum: 'bilinmiyor', kanit: 'staj-sayfasi-baglantisi', izlenecek: bag.href };
  }
  if (STAJ_IZI.test(metin)) {
    /*
      Sayfa stajdan BAHSEDİYOR ama staj sayfasına bağlantı yok. Eski
      kural burada "açık" diyordu; artık demiyor.
    */
    return { durum: 'bilinmiyor', kanit: 'genel-kariyer-sayfasi' };
  }
  return { durum: 'bilinmiyor', kanit: 'kanit-yok' };
}

/**
 * STAJ SAYFASININ KARARI — İKİNCİ ADIM, "AÇIK" YALNIZ BURADAN
 *
 * @returns {{durum:'acik'|'kapali'|'bilinmiyor', kanit:string}}
 */
export function programSayfasiKarari(govde) {
  const metin = gorunurMetin(govde);
  if (KAPANIS_IZI.test(metin)) {
    return { durum: 'kapali', kanit: 'basvuru-kapandi-ifadesi' };
  }
  if (!AKTIF_BASVURU_IZI.test(metin)) {
    return { durum: 'bilinmiyor', kanit: 'staj-sayfasinda-aktif-basvuru-yok' };
  }
  /*
    AKTİF BAŞVURU VAR AMA GENEL HAVUZA GİDİYORSA "AÇIK" DEĞİL

    "Tüm açık ilanlarımıza başvurmak için tıklayın" belirli bir staj
    programının açık olduğunu söylemiyor.
  */
  if (GENEL_HAVUZ_IZI.test(metin)) {
    return { durum: 'bilinmiyor', kanit: 'genel-ilan-havuzuna-yonlendiriyor' };
  }
  return { durum: 'acik', kanit: 'staj-sayfasinda-aktif-basvuru' };
}
