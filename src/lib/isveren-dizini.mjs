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
    case 'bilinmiyor':
      return 'Güncel açık program doğrulanamadı';
    /*
      ÖLÇÜLMEDİ İLE BİLİNMİYOR AYNI ŞEY DEĞİL

      `null` = bu şirketin sayfasına HİÇ bakamadık (adres 403 döndü,
      ağ hatası aldık ya da yumuşak 404'e düştü). `bilinmiyor` =
      baktık ve kanıt bulamadık. İkisini aynı cümleyle anlatmak,
      bakmadığımız yerde bakmış gibi görünmek olurdu.

      Ölçülen durum (14 Eylül 2026): 6 şirket bu durumda —
      akcansa ve turk-telekom erişilemedi; tusas, tupras,
      yildiz-holding ve acibadem-saglik bozuk adres.
    */
    default:
      return 'Henüz kontrol edilmedi';
  }
}

/** Program durumu gerçekten ÖLÇÜLDÜ mü? */
export function programOlculduMu(durum) {
  return durum === 'acik' || durum === 'kapali' || durum === 'bilinmiyor';
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
 * KARTTAKİ BAĞLANTI — ETİKET NEREYE GİTTİĞİNİ SÖYLÜYOR
 *
 * Üç ayrı sonuç var ve hangisinin çıktığı KANITA bağlı:
 *
 *   1. `program` — kanıtlanmış açık programın KENDİ adresi var.
 *      "Açık programı incele" denebilir, çünkü hedef gerçekten o
 *      programın sayfası.
 *
 *   2. `kariyer` — elimizde yalnız genel kariyer sayfası var.
 *      "Şirketin kariyer sayfası". "Programa başvur" demek, öğrenciyi
 *      başvuru formuna gideceğini sanarak kurumsal bir sayfaya
 *      göndermek olurdu. 14 Eylül 2026 ölçümünde 44 şirketin 44'ü
 *      burada.
 *
 *   3. `yok` — adres bozuk. AKTİF BAĞLANTI HİÇ ÇİZİLMİYOR: çalışmadığını
 *      ölçtüğümüz bir adrese düğme koymak, öğrenciyi 404'e göndermek.
 *
 * @returns {{tur:'program'|'kariyer'|'yok', etiket:string|null, adres:string|null}}
 */
export function baglantiEtiketi(isveren) {
  /* Kanıt: hem durum `acik` HEM de programın kendi adresi. Biri eksikse
     "açık program" iddiası arayüzde kullanılmıyor. */
  if (isveren?.programDurumu === 'acik' && isveren?.programUrl) {
    return { tur: 'program', etiket: 'Açık programı incele', adres: isveren.programUrl };
  }
  if (isveren?.urlDurumu === 'bozuk') {
    return { tur: 'yok', etiket: null, adres: null };
  }
  return {
    tur: 'kariyer',
    etiket: 'Şirketin kariyer sayfası',
    adres: isveren?.kariyerUrl ?? null,
  };
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

      44 kaydın hiçbirinde bu bilgiler yok ve UYDURULMUYOR. (Bu sayıyı
      bir ara 46 diye yazmıştım; dosyayı saydım, 44.) Alanlar
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
    /*
      VARSAYILAN 'bilinmiyor' DEĞİL, `null`

      Eskiden `?? 'bilinmiyor'` yazıyordu ve bu, hiç kontrol edilmemiş
      şirketi "baktık, bulamadık" gibi gösteriyordu. Ölçümün yokluğu
      arayüze aynen taşınıyor.
    */
    programDurumu: kontrol?.program_durumu ?? null,
    programKaniti: kontrol?.program_kaniti ?? null,
    programKontrol: tarih(kontrol?.program_kontrol_at),
    /* Yalnız kanıtlanmış açık programda dolu; yoksa `null`. */
    programUrl: kontrol?.program_url ?? null,
    /* Satır hiç yok mu (işçi bu şirkete hiç bakmamış mı)? */
    olculdu: Boolean(kontrol),

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

/*
  ÖLÇÜMLERİ GETİRME — TEK İSTEK, PAYLAŞILAN ÖNBELLEK

  KART BAŞINA SORGU YOK: üç yüzeyin hepsi bu işlevi çağırıyor, işlev de
  44 satırın tamamını BİR istekte alıyor. 44 kart × 1 sorgu, mobil
  bağlantıda saniyeler demekti.

  ÖNBELLEK SÖZÜ AYNI SEKMEDE: ilk çağrı isteği başlatıyor, eşzamanlı
  çağrılar AYNI sözü bekliyor. İki bileşen aynı anda mount olduğunda
  (bölüm sayfası + boş sonuç ekranı) ikinci istek hiç çıkmıyor.
*/
let kontrolSozu = null;
let kontrolZamani = 0;

/** Önbellek ömrü. Ölçüm günde bir kez yazılıyor; dakikalar fazlasıyla taze. */
export const KONTROL_ONBELLEK_MS = 5 * 60 * 1000;

/** Testler ve yüzey değişimleri için önbelleği boşaltır. */
export function kontrolOnbelleginiBosalt() {
  kontrolSozu = null;
  kontrolZamani = 0;
}

/**
 * `employer_career_checks` satırlarının tamamı.
 *
 * HATA SESSİZ VE BOŞ DÖNÜYOR: ölçüm gelmezse dizin gitmiyor, yalnız
 * durum satırları "Henüz kontrol edilmedi" oluyor. Editoryal bilgi
 * (ad, sektör, bölüm, kariyer adresi) veritabanına hiç bağlı değil.
 *
 * ÖN RENDER'DA AĞ YOK: `import.meta.env` orada tanımsız ve
 * `./supabase` içe aktarımı fırlatıyor. `try` bunu yutuyor ve ön
 * render edilen sayfa ölçüm satırlarını hiç çizmiyor — yanlış bir
 * durum basmaktansa hiç basmamak.
 */
export async function fetchIsverenKontrolleri() {
  const simdi = Date.now();
  if (kontrolSozu && simdi - kontrolZamani < KONTROL_ONBELLEK_MS) return kontrolSozu;

  kontrolZamani = simdi;
  kontrolSozu = (async () => {
    try {
      const { supabase } = await import('./supabase');
      const { data, error } = await supabase
        .from('employer_career_checks')
        .select(
          'slug, url_durumu, url_denendi_at, url_basarili_at, url_hata, program_durumu, program_kaniti, program_kontrol_at, program_url'
        );
      if (error) return [];
      return data ?? [];
    } catch {
      return [];
    }
  })();

  const sonuc = await kontrolSozu;
  /* Boş sonuç önbelleğe ÇAKILMASIN: geçici bir hata dizini beş dakika
     ölçümsüz bırakmasın. */
  if (sonuc.length === 0) kontrolOnbelleginiBosalt();
  return sonuc;
}
