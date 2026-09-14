/**
 * GERÇEK İSTATİSTİKLER — HER SAYI BİR SORGUNUN CEVABI
 *
 * NEDEN BU MODÜL VAR
 * ------------------
 * Güven sayfasında sayı göstermek, o sayının doğru kalacağına söz
 * vermek demek. Elle yazılan sayı yazıldığı gün doğru, ertesi gün
 * iddia olur. Bu modüldeki her metrik canlı sorgudan geliyor ve
 * ölçülemeyen metrik ÇİZİLMİYOR.
 *
 * İKİ SAYI BİRBİRİNE KARIŞTIRILMIYOR
 * ----------------------------------
 * `etkin ilan kaynağı`  = ilan TOPLADIĞIMIZ sistemler (Lever,
 *                         Greenhouse, şirketin kendi kariyer sayfası…).
 *                         `automation/sources.json` içinde tanımlı ve
 *                         `enabled` olanlar. Ölçüm: 42.
 *
 * `işveren kariyer sayfası` = büyük işveren dizinindeki şirketlerin
 *                         kariyer adresleri; ilan TOPLAMIYORUZ, yalnız
 *                         adresin çalıştığını ve staj programının açık
 *                         olup olmadığını kontrol ediyoruz. Ölçüm: 44.
 *
 * İkisi farklı işler ve ayrı adlarla sunuluyor. Tek "kaynak sayısı"
 * başlığı altında toplamak 86 gibi anlamsız bir sayı üretirdi.
 *
 * KAPANAN İLAN İLE KIRIK BAĞLANTI DA AYRI
 * ---------------------------------------
 * `kapali`       şirket ilanı kaldırdı ya da "başvurular kapandı" dedi.
 * `erisilemedi`  adrese ULAŞAMADIK — 403, zaman aşımı, ağ hatası.
 * `belirsiz`     sayfa açıldı ama ilanın durduğuna dair kanıt yok.
 *
 * `belirsiz` ve `erisilemedi` KAPANMIŞ SAYILMIYOR. Bir kez engellenmek
 * ya da sayfayı okuyamamak, ilanın bittiği anlamına gelmiyor; o yüzden
 * bu ilanlar listede kalıyor ve kartında ne bildiğimiz yazıyor.
 */

/** Son 24 saat penceresi (ms). */
export const PENCERE_MS = 24 * 60 * 60 * 1000;

/**
 * METRİK ADLARI — KULLANICIYA GÖRÜNEN TEK DOĞRU AD
 *
 * Adlar burada duruyor ki iki ekran aynı sayıyı farklı isimle
 * sunmasın.
 */
export const METRIK_ADLARI = {
  aktifIlan: 'Aktif staj ilanı',
  etkinKaynak: 'Etkin ilan kaynağı',
  isverenSayfasi: 'Kontrol edilen işveren kariyer sayfası',
  kapanan: 'Son 24 saatte kesin kapanan ilan',
  bozuk: 'Son 24 saatte erişilemeyen ilan bağlantısı',
  taramaKapsami: 'Son taramanın kapsamı',
};

/**
 * Metrik gösterilsin mi?
 *
 * `null` = ÖLÇEMEDİK. O durumda sıfır yazmak yanlış olurdu: "hiç
 * kapanan ilan yok" ile "kapanan ilan sayısını okuyamadık" aynı şey
 * değil. Sıfır ise gösteriliyor — ölçtük ve sıfır çıktı.
 */
export function metrikGosterilsinMi(deger) {
  return typeof deger === 'number' && Number.isFinite(deger);
}

/**
 * TÜRKİYE SAATİYLE TARİH-SAAT
 *
 * Türkiye kalıcı olarak UTC+3 ve yaz saati uygulaması yok; sabit üç
 * saat eklemek yıl boyu doğru.
 */
export function turkiyeSaatMetni(damga) {
  if (!damga) return null;
  const d = new Date(damga);
  if (Number.isNaN(d.getTime())) return null;
  const tr = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  const iki = (n) => String(n).padStart(2, '0');
  return `${iki(tr.getUTCDate())}.${iki(tr.getUTCMonth() + 1)}.${tr.getUTCFullYear()} ${iki(tr.getUTCHours())}:${iki(tr.getUTCMinutes())}`;
}

/**
 * TARAMA KAPSAMI CÜMLESİ
 *
 * "Kaynaklar tarandı" DEMİYOR: kaç ilanın gerçekten kontrol edildiğini
 * söylüyor. Hiç kontrol edilmemişse `null` dönüyor ve satır çizilmiyor.
 */
export function taramaKapsamiMetni(kontrolEdilen, toplam, sonDamga) {
  if (!metrikGosterilsinMi(kontrolEdilen) || !metrikGosterilsinMi(toplam)) return null;
  if (kontrolEdilen === 0) return null;
  /*
    SON SAVUNMA: pay paydayı aşarsa cümle HİÇ yazılmıyor.

    Canlıda tam bunu gördüm ("158 aktif ilanın 172 tanesi"). Sorgu
    düzeltildi ama bu denetim duruyor: sayım kümeleri bir gün yine
    ayrışırsa saçma bir oran yazmak yerine satırı gizlemek doğru.
  */
  if (kontrolEdilen > toplam) return null;
  const saat = turkiyeSaatMetni(sonDamga);
  const govde = `${toplam} aktif ilanın ${kontrolEdilen} tanesi son 24 saatte yeniden kontrol edildi`;
  return saat ? `${govde}. En son kontrol: ${saat} (Türkiye saati)` : `${govde}.`;
}

/*
  ÖNBELLEK — HER ZİYARETÇİDE AĞIR SORGU KOŞMUYOR

  Altı sayım sorgusu var ve hepsi `count=exact`. Sayfayı her açanda
  yeniden koşmak, veri tabanına ziyaretçi sayısı kadar tam sayım
  yüklemek olurdu. Ölçüm günde bir kez değişiyor; on dakika fazlasıyla
  taze.
*/
let soz = null;
let zaman = 0;
export const ONBELLEK_MS = 10 * 60 * 1000;

/** Testler için. */
export function onbellegiBosalt() {
  soz = null;
  zaman = 0;
}

/**
 * Canlı istatistikler.
 *
 * Okunamayan metrik `null` dönüyor; çağıran taraf onu ÇİZMİYOR. Tek
 * bir sorgu düşse sayfa gitmiyor, yalnız o satır eksiliyor.
 *
 * @param {number} etkinKaynak `automation/sources.json` içindeki etkin
 *   kaynak sayısı — üretilmiş dosyadan geliyor, burada sorgulanmıyor.
 */
export async function fetchIstatistikler(etkinKaynak) {
  const simdi = Date.now();
  if (soz && simdi - zaman < ONBELLEK_MS) return soz;
  zaman = simdi;

  soz = (async () => {
    const bos = {
      aktifIlan: null,
      etkinKaynak: metrikGosterilsinMi(etkinKaynak) ? etkinKaynak : null,
      isverenSayfasi: null,
      kapanan: null,
      bozuk: null,
      taramaKontrolEdilen: null,
      sonKontrol: null,
    };
    try {
      const { supabase } = await import('./supabase');
      const esik = new Date(simdi - PENCERE_MS).toISOString();

      /* Sayım sorguları: gövde İSTENMİYOR (`head: true`) — yalnız sayı. */
      const say = async (kur) => {
        const { count, error } = await kur;
        return error ? null : (count ?? null);
      };

      const [aktifIlan, isverenSayfasi, kapanan, bozuk, taranan] = await Promise.all([
        say(
          supabase
            .from('listings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'published')
        ),
        say(
          supabase
            .from('employer_career_checks')
            .select('slug', { count: 'exact', head: true })
        ),
        /*
          KESİN KAPANAN — YALNIZ `kapali`

          `belirsiz` ve `erisilemedi` buraya GİRMİYOR: ölçüldü, 24
          saatte 47 ilan `belirsiz` ve 7 ilan `erisilemedi` durumunda.
          Onları "kapandı" saymak, duran ilanları kapanmış göstermek
          olurdu.
        */
        say(
          supabase
            .from('listings')
            .select('id', { count: 'exact', head: true })
            .eq('source_status', 'kapali')
            .gte('source_checked_at', esik)
        ),
        say(
          supabase
            .from('listings')
            .select('id', { count: 'exact', head: true })
            .eq('source_status', 'erisilemedi')
            .gte('source_checked_at', esik)
        ),
        /*
          KAPSAM AYNI KÜMEDEN SAYILMALI — CANLIDA YANLIŞ ÇIKTI

          Bu sayım `status` süzgeci olmadan koşuyordu ve cümle şunu
          yazdı: "158 aktif ilanın 172 tanesi son 24 saatte yeniden
          kontrol edildi." 172 > 158 çünkü pay bütün ilanları, payda
          yalnız YAYINDA olanları sayıyordu; aradaki fark taramanın az
          önce kapattığı 14 ilan.

          Oran ancak pay ile payda aynı kümeden gelirse anlam taşıyor:
          ikisi de `status = 'published'`.
        */
        say(
          supabase
            .from('listings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'published')
            .gte('source_checked_at', esik)
        ),
      ]);

      /* Son kontrol damgası: tek satır, en yeni. */
      let sonKontrol = null;
      const { data } = await supabase
        .from('listings')
        .select('source_checked_at')
        .order('source_checked_at', { ascending: false })
        .limit(1);
      if (Array.isArray(data) && data[0]?.source_checked_at) {
        sonKontrol = data[0].source_checked_at;
      }

      return {
        ...bos,
        aktifIlan,
        isverenSayfasi,
        kapanan,
        bozuk,
        taramaKontrolEdilen: taranan,
        sonKontrol,
      };
    } catch {
      /* Ön render ve ağ hatası: hiçbir metrik çizilmiyor. */
      return bos;
    }
  })();

  return soz;
}
