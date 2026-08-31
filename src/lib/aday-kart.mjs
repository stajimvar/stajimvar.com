/**
 * Başvuran kartının kuralları.
 *
 * KART UYDURMUYOR
 * ---------------
 * Karttaki her sayı bir kaynaktan geliyor: uyum yüzdesi
 * `applications.match_score`, sınıf ve bölüm başvuru anındaki profil
 * kopyasından, yetenekler öğrencinin kendi girdiği kayıtlardan. Hız 89,
 * overall 92, altın kart, stat çubuğu YOK — bunlar oyuncu kartı estetiği
 * için uydurulmuş sayılar olurdu ve karşıdaki gerçek bir öğrenci.
 *
 * KİMLİK YALNIZCA RIZAYLA GELİYOR
 * -------------------------------
 * Şirket öğrencinin adını `profiles` tablosundan OKUYAMIYOR — o tablonun
 * okuma kuralı yalnızca kişinin kendisine ve yöneticiye açık. Ad, okul ve
 * bölüm karta yalnızca `applications.profile_snapshot` üzerinden geliyor;
 * o kopya da başvuru anında, öğrenci "profilim bu şirketle paylaşılsın"
 * dediğinde yazılıyor.
 *
 * Şirketin kendi sitesinden alınan başvurularda (external) bizde
 * paylaşılmış bir profil yok. O kartta ad da yok: "şirketin kendi
 * sitesinden başvuruldu" yazıyor. Boşluğu doldurmak için isim uydurmak
 * ya da e-postadan isim türetmek, verilmemiş bir rızayı varmış gibi
 * göstermek olurdu.
 */

/** Uyum şeridinin üç bandı. Renk değil, ANLAM döndürüyor. */
export function uyumBandi(puan) {
  /*
    null açıkça eleniyor: Number(null) sıfır veriyor ve puanı
    hesaplanmamış bir başvuru "düşük uyum" damgası yerdi.
  */
  if (puan === null || puan === undefined || puan === '') return 'bilinmiyor';
  const p = Number(puan);
  if (!Number.isFinite(p)) return 'bilinmiyor';
  if (p >= 75) return 'yuksek';
  if (p >= 50) return 'orta';
  return 'dusuk';
}

export const UYUM_ETIKETI = {
  yuksek: 'Yüksek uyum',
  orta: 'Orta uyum',
  dusuk: 'Düşük uyum',
  bilinmiyor: 'Uyum hesaplanmadı',
};

/**
 * Ad yoksa fotoğraf da yok; yerine harf monogramı.
 *
 * Zorunlu fotoğraf yok: staj başvurusunda fotoğraf istemek, işe alımda
 * görünüşe dayalı ayrımın en bilinen kapısı.
 */
export function monogram(ad) {
  const parcalar = String(ad ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parcalar.length === 0) return '?';
  const harf = (s) => s.charAt(0).toLocaleUpperCase('tr-TR');
  return parcalar.length === 1
    ? harf(parcalar[0])
    : harf(parcalar[0]) + harf(parcalar[parcalar.length - 1]);
}

/** Kartın alt satırı: "İTÜ · Bilgisayar Müh. · 3. Sınıf" — boşlar atılıyor. */
export function kimlikSatiri(kart) {
  return [kart.universite, kart.bolum, kart.sinif].filter(Boolean).join(' · ');
}

/**
 * Ham başvuru satırını karta çeviriyor.
 *
 * @param {object} satir applications satırı (+ listings başlığı)
 * @param {{yetenekler?: {name:string, level?:string}[]}} ek canlı tablolardan gelenler
 */
/**
 * Bir diziden YALNIZCA dolu dizeleri alır.
 *
 * `profile_snapshot` istemcide üretilip veritabanına yazılıyor ve şeması
 * zorlanmıyor; içindeki dizilerin dize taşıdığı garanti değil. Ölçüldü:
 * dizi içinde bir nesne olduğunda React "Objects are not valid as a
 * React child" atıyor ve aday KARTI çizilirken — daha tıklamadan —
 * bütün ağaç sökülüyordu.
 *
 * Temizlik burada, tek yerde: kart, çekmece ve sonradan eklenecek her
 * tüketici aynı güvenli listeyi alıyor.
 */
/*
  Adı okunamamış dil satırı: "undefined (B1)", "null (A2)". Desen burada
  tanımlı çünkü satır içinde yazıldığında bir kez kaçış hatasıyla
  backspace karakterine dönüştü ve sessizce hiçbir şeyi elemedi.
*/
const BOZUK_DIL = /^\s*(undefined|null)\s*(\(|$)/i;

function dizeListesi(deger) {
  return Array.isArray(deger)
    ? deger.filter((x) => typeof x === 'string' && x.trim().length > 0)
    : [];
}

export function kartVerisi(satir, ek = {}) {
  const anlik = satir?.profile_snapshot ?? null;
  const paylasildi = Boolean(satir?.contact_share_consent_at) && anlik !== null;

  /*
    Yetenek listesi önce başvuru anındaki kopyadan; yoksa canlı tablodan.
    Kopya varsa o kazanıyor: şirketin gördüğü şey, başvurunun yapıldığı
    andaki hâli olmalı.
  */
  const anlikYetenek = Array.isArray(anlik?.yetenekler) ? dizeListesi(anlik.yetenekler) : null;
  const canliYetenek = dizeListesi((ek.yetenekler ?? []).map((y) => y?.name));
  const yetenekler = (anlikYetenek ?? canliYetenek).slice(0, 5);

  return {
    id: String(satir?.id ?? ''),
    ilanId: satir?.listing_id ? String(satir.listing_id) : null,
    ilanBasligi: satir?.ilanBasligi ?? null,
    durum: satir?.status ?? 'submitted',
    tarih: satir?.applied_at ?? null,
    puan: Number.isFinite(Number(satir?.match_score)) ? Number(satir.match_score) : null,
    band: uyumBandi(satir?.match_score),

    /* Rıza yoksa hiçbiri dolu değil. */
    paylasildi,
    ad: paylasildi ? (anlik.ad ?? null) : null,
    fotoUrl: paylasildi ? (anlik.fotoUrl ?? null) : null,
    universite: paylasildi ? (anlik.universite ?? null) : null,
    bolum: paylasildi ? (anlik.bolum ?? null) : null,
    sinif: paylasildi ? (anlik.sinif ?? null) : null,
    sehir: paylasildi ? (anlik.sehir ?? null) : null,
    github: paylasildi ? (anlik.github ?? null) : null,
    portfolyo: paylasildi ? (anlik.portfolyo ?? null) : null,
    /*
      ESKİ KOPYALARDAKİ "undefined (B1)" GÖSTERİLMİYOR

      Kopya üreticisi dil adını yanlış alandan okuyordu (`name`, oysa
      doğrusu `language`) ve şablon `undefined` değerini metne
      çeviriyordu. Hata kaynağında düzeltildi ama ÜRETİMDE o hatayla
      yazılmış başvurular duruyor ve onları toplu olarak yeniden yazmak
      doğru değil — kopya, başvuru anının kaydı.

      Okuma tarafında bu tek bilinen bozuk biçim eleniyor: adı
      bilinmeyen bir dil satırı şirkete hiçbir şey söylemiyor, "undefined
      (B1)" ise yanlış bir şey söylüyor. Liste tamamen boşalırsa Diller
      bölümü hiç çizilmiyor.
    */
    diller: paylasildi
      ? dizeListesi(anlik.diller).filter((d) => !BOZUK_DIL.test(d))
      : [],
    rozetler: paylasildi ? dizeListesi(anlik.rozetler) : [],
    /* Yalnızca nesne olan ve başlığı bulunan projeler: başlıksız kart boş kutu olurdu. */
    projeler: paylasildi && Array.isArray(anlik.projeler)
      ? anlik.projeler.filter(
          (p) => p && typeof p === 'object' && typeof p.baslik === 'string' && p.baslik.trim(),
        )
      : [],
    yetenekler,

    onYazi: satir?.cover_letter ?? null,
    /*
      CV: ÖNCE BAŞVURU ANININ KOPYASI, SONRA ESKİ ALAN

      `cv_snapshot_path` başvuru anında çıkarılmış kopyanın yolu ve yeni
      kodun yazdığı tek alan. `cv_path` ESKİ alan: hiçbir yerden
      yazılmıyor, yalnızca geçmiş kayıtlar için burada duruyor.

      Öğrencinin BUGÜNKÜ profil CV'sine düşülmüyor — düşülseydi şirket,
      değerlendirdiği belgenin yerine sonradan yüklenmiş başka bir
      belgeyi görürdü.
    */
    /* Teklifin içeriği. Eski tekliflerde ikisi de boş olabilir. */
    teklifNotu: satir?.offer_note ? String(satir.offer_note) : '',
    teklifBaslangici: satir?.offer_start_date ? String(satir.offer_start_date).slice(0, 10) : '',

    /* Mülakat tarihi opsiyonel; yoksa alan boş açılıyor. */
    mulakatTarihi: satir?.interview_date ? String(satir.interview_date).slice(0, 10) : '',
    cvYolu: satir?.cv_snapshot_path ?? satir?.cv_path ?? null,
    yontem: satir?.application_method ?? 'external',
  };
}

/**
 * Önyargısız inceleme.
 *
 * Ad ve fotoğraf gizleniyor; kalan her şey duruyor. Amaç ilk elemede
 * ismin çağrıştırdığı cinsiyet, memleket ve etnik köken ipuçlarını
 * devre dışı bırakmak. Şehir kalıyor çünkü stajın yeri gerçek bir
 * kısıt; okul kalıyor çünkü başvurunun konusu o.
 */
export function onyargisizla(kart) {
  return { ...kart, ad: null, fotoUrl: null, gizli: true };
}

/* --------------------------------------------------------- mini ATS */

/**
 * Kart çekmecesindeki eylemler.
 *
 * BİRİNCİ SIRA hep görünür: gün içindeki karar. İKİNCİ SIRA katlanmış
 * duruyor — case, teklif, görüşme bağlantısı bir haftada bir kez
 * kullanılıyor ve kartın üstüne konursa asıl kararı gölgeliyor.
 */
export const BIRINCI_SIRA = [
  { id: 'under_review', etiket: 'İncelemede' },
  { id: 'interview_scheduled', etiket: 'Mülakat' },
  { id: 'rejected', etiket: 'Reddet' },
];

export const IKINCI_SIRA = [
  { id: 'technical_assessment', etiket: 'Case gönder' },
  { id: 'offer_extended', etiket: 'Teklif' },
];

/*
  DURUM SÖZLÜĞÜ BURADAN KALDIRILDI

  Burada ikinci bir sözlük duruyordu ve panelde gerçekten farklı adlar
  çiziliyordu: kart "İnceleniyor / Değerlendirme / Olumsuz" derken
  çekmece aynı başvuru için "İncelemede / Case / Reddedildi" diyordu.
  Tek sözlük artık ../sirket/basvuru-durumu içinde.
*/
