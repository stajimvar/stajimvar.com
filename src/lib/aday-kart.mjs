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

import { PAYLASIM_SURUMU } from './basvuru-durumu.mjs';

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

/*
  TEK DEĞER DE VERİ SINIRINDA DOĞRULANIYOR

  Diziler süzülüyordu ama tekil alanlar (ad, okul, bölüm, şehir,
  bağlantılar) ve proje alanları HAM geçiyordu. Kopyada bir proje
  açıklaması nesne olarak geldiğinde çekmece çizilirken düşüyor ve aday
  ekranı hiç açılmıyordu. Artık her alan burada bir kez kontrol
  ediliyor: metinse kırpılıp alınıyor, sayıysa metne çevriliyor, başka
  her şey (nesne, dizi, boolean, boş metin) null. Bozuk bir alan yalnız
  KENDİSİNİ düşürüyor; adayın geçerli öteki bilgileri gösteriliyor.
*/
function metin(deger) {
  if (typeof deger === 'string') {
    const t = deger.trim();
    return t ? t : null;
  }
  if (typeof deger === 'number' && Number.isFinite(deger)) return String(deger);
  return null;
}

/*
  Proje: başlık ZORUNLU (başlıksız kart boş kutu olurdu), açıklama ve
  adres isteğe bağlı. Ham nesne geçirilmiyor; yalnız bilinen üç alan,
  doğrulanmış hâlleriyle yeni bir nesnede.
*/
function projeListesi(deger) {
  if (!Array.isArray(deger)) return [];
  return deger
    .filter((p) => p && typeof p === 'object' && !Array.isArray(p))
    .map((p) => ({ baslik: metin(p.baslik), aciklama: metin(p.aciklama), adres: metin(p.adres) }))
    .filter((p) => p.baslik);
}

/*
  PAYLAŞIM ETKİN Mİ — sunucudaki `basvuru_iletisimi_acik` ile AYNI cümle
  (20261201010000): rıza damgası var VE (StajımVar üzerinden başvuru YA
  DA sade sürümle verilmiş rıza). Profil kopyası da artık bu kurala bağlı
  (20261203010000): eski dış başvuru rızası kopyayı da açmıyor.
*/
function paylasimEtkin(satir) {
  if (!satir?.contact_share_consent_at) return false;
  return satir.application_method === 'internal' || satir.contact_share_consent_version === PAYLASIM_SURUMU;
}

export function kartVerisi(satir, ek = {}) {
  /* Kopya yalnız NESNE ise kopya; dizi, metin ya da başka bir şey değil. */
  const hamKopya = satir?.profile_snapshot ?? null;
  const anlik = hamKopya && typeof hamKopya === 'object' && !Array.isArray(hamKopya) ? hamKopya : null;
  const paylasildi = paylasimEtkin(satir) && anlik !== null;

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
    /* Teklif özetinde kullanılıyor; ilanda yoksa o satır hiç çizilmiyor. */
    ilanCalismaBicimi: satir?.ilanCalismaBicimi ? String(satir.ilanCalismaBicimi) : '',
    ilanSuresi: satir?.ilanSuresi ? String(satir.ilanSuresi) : '',
    ilanUcreti: satir?.ilanUcreti ? String(satir.ilanUcreti) : '',
    durum: satir?.status ?? 'submitted',
    /*
      SORUMLU (20261123010000). `null` = sorumlusu yok ve bu bir eksiklik
      değil, ayrı bir durum: "henüz kimse üstlenmedi". Ekran onu boş
      bırakmak yerine açıkça yazıyor.
    */
    atananUye: satir?.atanan_uye ? String(satir.atanan_uye) : null,
    atananAn: satir?.atanan_at ?? null,
    tarih: satir?.applied_at ?? null,
    /*
      SON İŞLEM ANI. Her güncellemede tetikleyiciyle damgalanıyor (0001,
      t5): durum değişimi, not, mülakat tarihi, sorumlu atama. Bekleme
      süresi bundan; sunucudaki hatırlatma da aynı alanı kullanıyor.
    */
    guncellendi: satir?.updated_at ?? null,
    /*
      BEKLEME ÖLÇÜSÜ BU: adaya yönelik son gerçek ilerleme
      (20261127010000). `guncellendi` ayrı duruyor ve bekleme hesabında
      KULLANILMIYOR — sorumlu atamak onu tazeliyor, adayın bekleyişini
      bitirmiyor.
    */
    adayIlerlemesi: satir?.aday_ilerleme_at ?? null,
    /*
      SADE AKIŞ: iletişim paylaşımının kapsamı ve şirketin ilk bakışı.
      Paylaşım kuralı `adayIletisimiAcik` içinde, sunucudaki
      `basvuru_iletisimi_acik` ile aynı cümle.
    */
    paylasimOnayi: satir?.contact_share_consent_at ?? null,
    paylasimSurumu: satir?.contact_share_consent_version ?? null,
    basvuruYontemi: satir?.application_method ?? null,
    ilkGoruntulenme: satir?.ilk_goruntulenme_at ?? null,
    puan: Number.isFinite(Number(satir?.match_score)) ? Number(satir.match_score) : null,
    band: uyumBandi(satir?.match_score),

    /* Rıza yoksa hiçbiri dolu değil. */
    paylasildi,
    ad: paylasildi ? metin(anlik.ad) : null,
    fotoUrl: paylasildi ? metin(anlik.fotoUrl) : null,
    universite: paylasildi ? metin(anlik.universite) : null,
    bolum: paylasildi ? metin(anlik.bolum) : null,
    sinif: paylasildi ? metin(anlik.sinif) : null,
    sehir: paylasildi ? metin(anlik.sehir) : null,
    github: paylasildi ? metin(anlik.github) : null,
    portfolyo: paylasildi ? metin(anlik.portfolyo) : null,
    /*
      Kopya LinkedIn adresini başından beri taşıyordu (basvuru-kopyasi.mjs)
      ama karta geçmiyordu; inceleme ekranı bağlantıyı ancak buradan
      alabiliyor. `href`e yazılmadan önce `guvenliDisAdres`ten geçiyor.
    */
    linkedin: paylasildi ? metin(anlik.linkedin) : null,
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
    /* Proje alanları tek tek doğrulanıyor (bkz. projeListesi). */
    projeler: paylasildi ? projeListesi(anlik.projeler) : [],
    yetenekler,
    /*
      Yetenekler kopyadan mı geldi? Eski kopyalarda liste yok ve kart
      canlı tablodan tamamlıyor; o durumda "başvurudan sonra ne değişti"
      sorusu cevaplanamaz (aday-profil-farki.mjs karşılaştırmayı atlıyor).
    */
    yetenekKopyadan: anlikYetenek !== null,

    /*
      Öğrencinin bu başvuruda paylaşımlarını gösterme izni (20261121010000).
      Yalnız bilgi: inceleme ekranı izni yine sunucuya soruyor, çünkü
      öğrenci liste yüklendikten sonra izni açmış ya da kapatmış olabilir.
    */
    paylasimIzniAt: satir?.paylasim_izni_at ?? null,

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
    /* Teklifin içeriği. Eski tekliflerde hepsi boş olabilir. */
    teklifNotu: satir?.offer_note ? String(satir.offer_note) : '',
    teklifBaslangici: satir?.offer_start_date ? String(satir.offer_start_date).slice(0, 10) : '',
    teklifUcreti: satir?.offer_compensation ? String(satir.offer_compensation) : '',

    /*
      GÖRÜŞME DAVETİ

      Eski `interview_scheduled` kayıtlarında tarih de biçim de yer de
      olmayabilir: bu alanlar bu turda eklendi. Hepsi boş dizeye
      düşüyor, ekran boş alanı hiç çizmiyor — "undefined" ya da
      "belirtilmedi" yazmak bir bilgi uydurmak olurdu.
    */
    gorusmeSaati: satir?.interview_time ? String(satir.interview_time).slice(0, 5) : '',
    gorusmeTuru: satir?.interview_type ? String(satir.interview_type) : '',
    gorusmeYeri: satir?.interview_location ? String(satir.interview_location) : '',
    gorusmeNotu: satir?.interview_note ? String(satir.interview_note) : '',
    gorusmeYaniti: satir?.interview_response ? String(satir.interview_response) : '',

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
