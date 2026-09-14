/**
 * İŞVEREN DİZİNİ — TEK VERİ SÖZLEŞMESİ
 *
 * Üç yüzey aynı şirket verisini buradan alıyor:
 *   /staj-programlari          dizin sayfası
 *   /bolum/[slug]              bölüm sayfasındaki öneriler
 *   boş sonuç ekranı           filtreye uyan işverenler
 *
 * İKİNCİ DİZİN YOK: şirket listesinin kaynağı
 * `src/data/stajProgramlari.ts` ve bu modül ona bir şey EKLEMİYOR —
 * yalnız ölçüm sonucunu yanına koyuyor.
 *
 * EDİTORYAL BİLGİ İLE ÖLÇÜM AYRI
 * ------------------------------
 * Editoryal: ad, sektör, özet, bölümler, kariyer adresi, ülke, genel
 * başvuru dönemi, gerekli belgeler, ücret/sigorta notu. Bunlar bizim
 * yazımız ve gözden geçirilerek değişiyor.
 *
 * Ölçüm: bağlantı durumu, son deneme, son başarılı kontrol, hata
 * nedeni, program durumu, kanıt türü. `employer_career_checks`
 * tablosundan geliyor ve günlük işçi yazıyor.
 *
 * Bir ara ölçüm EDİTORYAL DOSYANIN İÇİNE yazılıyordu (`sonKontrol`
 * alanı); o hâlde her günlük kontrol kaynak dosyayı değiştiriyor ve
 * insan yazısıyla makine çıktısı aynı diff'e giriyordu.
 */

/** Dizindeki işverenlerin bulunduğu tek ülke. */
export const DIZIN_ULKESI = 'TR';

/**
 * Seçili ülke bu dizine uygun mu?
 *
 * 'all' ve 'TR' uygun. Başka ülke kodu uygun DEĞİL: Fransa'da staj
 * arayan öğrenciye Türk holdinginin kariyer sayfasını önermek,
 * filtresini yok saymak olurdu.
 *
 * `remote` de uygun değil: bunlar kariyer sayfaları, uzaktan çalışma
 * vaadi taşımıyorlar.
 */
export function ulkeUygunMu(country) {
  const secim = String(country ?? 'all').trim();
  return secim === 'all' || secim.toUpperCase() === DIZIN_ULKESI;
}

/**
 * PROGRAM DURUMUNUN OKUNABİLİR HÂLİ
 *
 * "Bilinmiyor" için kullanılan cümle önemli: "kapalı" demek yanlış
 * olurdu, "açık" demek uydurma. Söylenen tek şey ölçümün kendisi.
 */
export function programDurumMetni(durum) {
  switch (durum) {
    case 'acik':
      return 'Staj programı açık';
    case 'kapali':
      return 'Staj programı kapalı';
    default:
      return 'Güncel açık program doğrulanamadı';
  }
}

/**
 * BAĞLANTI DURUMUNUN OKUNABİLİR HÂLİ — PROGRAM DURUMUNDAN AYRI
 *
 * İki ayrı iddia ve kartta iki ayrı satır: adresin çalışması,
 * programın açık olması demek değil.
 */
export function urlDurumMetni(durum) {
  switch (durum) {
    case 'calisiyor':
      return 'Bağlantı çalışıyor';
    case 'gecici_hata':
      return 'Geçici olarak erişilemedi';
    case 'bozuk':
      return 'Bağlantı bozuk';
    default:
      return null;
  }
}

/**
 * Kartta gösterilecek eylem metni.
 *
 * "Başvur" ya da "Açık ilan" DEMİYOR: hedef şirketin genel kariyer
 * sayfası ve orada o an başvuru olup olmadığını bilmiyoruz. Program
 * durumu `acik` olsa bile bağlantı yine kariyer sayfasına gidiyor —
 * "Başvur" demek, tek tıkla bir forma gideceği izlenimi verirdi.
 */
export function baglantiEtiketi() {
  return 'Şirketin kariyer sayfası';
}

function tarih(deger) {
  if (!deger) return null;
  const d = new Date(deger);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Editoryal kaydı ölçümle birleştirir.
 *
 * @param {object} program `stajProgramlari.ts` kaydı
 * @param {object|undefined} kontrol `employer_career_checks` satırı
 * @param {object|undefined} sirket `companies` satırı (logo için)
 */
export function isvereniBirlestir(program, kontrol, sirket) {
  return {
    /* ---- editoryal ---- */
    slug: program.slug,
    isveren: program.isveren,
    sektor: program.sektor,
    kariyerUrl: program.kariyerUrl,
    ozet: program.ozet,
    bolumler: Array.isArray(program.bolumler) ? program.bolumler : [],
    ulke: program.ulke ?? DIZIN_ULKESI,
    /*
      GENEL BAŞVURU DÖNEMİ — GEÇMİŞ DÖNEMLERDEN TÜRETİLMİŞ

      Alan adı bilerek "genel": "Şubat–Nisan" gibi bir bilgi geçmiş
      yılların takviminden geliyor ve GÜNCEL dönemin tarihi değil.
      Arayüz de bunu "Genel başvuru dönemi" diye etiketliyor; boşsa
      satır hiç çizilmiyor.
    */
    genelBasvuruDonemi: program.genelBasvuruDonemi ?? null,
    /*
      BELGE / ÜCRET / SİGORTA — YALNIZ KAYNAKTA VARSA

      46 kaydın hiçbirinde bu bilgiler yok ve UYDURULMUYOR. Alanlar
      sözleşmede duruyor ki bir gün kaynağından doğrulanınca
      eklenecek yer belli olsun.
    */
    gerekliBelgeler: Array.isArray(program.gerekliBelgeler) ? program.gerekliBelgeler : [],
    ucretSigortaNotu: program.ucretSigortaNotu ?? null,

    /* ---- ölçüm ---- */
    urlDurumu: kontrol?.url_durumu ?? null,
    urlDenendi: tarih(kontrol?.url_denendi_at),
    /*
      SON BAŞARILI KONTROL — editoryal `sonKontrol` alanının yerini
      alıyor. Başarısız denemede korunuyor.
    */
    urlBasarili: tarih(kontrol?.url_basarili_at) ?? tarih(program.sonKontrol),
    urlHata: kontrol?.url_hata ?? null,
    programDurumu: kontrol?.program_durumu ?? 'bilinmiyor',
    programKaniti: kontrol?.program_kaniti ?? null,
    programKontrol: tarih(kontrol?.program_kontrol_at),

    /* ---- şirket kaydı (varsa) ---- */
    /*
      GERÇEK LOGO ya da YOK

      `companies.logo_url` yalnız veritabanında karşılığı olan
      şirketlerde dolu. Olmayanda `null` dönüyor ve arayüz mevcut
      baş harf yer tutucusunu çiziyor — logo UYDURULMUYOR.
    */
    logoUrl: sirket?.logo_url ?? null,
    sirketSlug: sirket?.slug ?? null,
  };
}

/**
 * Bütün dizini ölçümlerle birleştirir.
 *
 * TEK TOPLU OKUMA: `kontroller` ve `sirketler` çağıran tarafından bir
 * kez getiriliyor ve burada eşleştiriliyor. Kart başına istek YOK.
 */
export function dizini(programlar, kontroller = [], sirketler = []) {
  const kHarita = new Map((kontroller ?? []).map((k) => [k.slug, k]));
  const sHarita = new Map((sirketler ?? []).map((s) => [s.slug, s]));
  return (programlar ?? []).map((p) => isvereniBirlestir(p, kHarita.get(p.slug), sHarita.get(p.slug)));
}

/**
 * Ülke ve bölüme GERÇEKTEN uyan işverenler.
 *
 * Bölüm eşleşmesi TAM slug: `bolumler` dizisinde üyelik sorgusu, alt
 * dize değil. `burs`/Bursa ve `maaş`/Maastricht sınıfı hataları burada
 * tekrarlamıyoruz.
 *
 * Sabit sayı sözü verilmiyor: bulunan kadarı dönüyor, `sinir` yalnız
 * ekranın boyu için.
 */
export function uygunIsverenler(dizin, filtreler, sinir = 6) {
  if (!Array.isArray(dizin) || dizin.length === 0) return [];
  if (!ulkeUygunMu(filtreler?.country)) return [];

  const bolumler = Array.isArray(filtreler?.departments) ? filtreler.departments : [];
  const havuz =
    bolumler.length === 0
      ? dizin
      : dizin.filter((i) => i.bolumler.some((b) => bolumler.includes(b)));

  return havuz.slice(0, sinir);
}
