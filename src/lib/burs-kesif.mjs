import {
  calendarDay,
  daysUntilDeadline,
  isExpiredOpportunity,
  opportunityStatus,
  OPPORTUNITY_TYPE_LABELS,
} from './opportunity-domain.mjs';
import { opportunityFit } from './firsat-degerlendirme.mjs';

/**
 * Bursları Keşfet — bölümleme, süzme ve tarih sınıflandırması.
 *
 * NEDEN AYRI DOSYA
 * ----------------
 * opportunity-domain.mjs bir fırsatın NE OLDUĞUNU söylüyor (durum, tür),
 * firsat-degerlendirme.mjs KİME ve NE KADAR ettiğini. Burası üçüncü bir
 * soruyu cevaplıyor: keşif sayfasında NEREDE duracağı. Üçü ayrı çünkü
 * keşif düzeni en hızlı değişen katman ve diğer ikisini kırmadan
 * değişebilmesi gerekiyor.
 *
 * SAAT DİLİMİ
 * -----------
 * Gün hesabı `calendarDay` üzerinden Europe/Istanbul'a göre gün başına
 * normalize ediliyor. Ham `Date` farkı kullanılsaydı gece yarısına yakın
 * saatlerde aynı burs bir yerde "son gün", başka yerde "yarın" görünürdü.
 */

/* ------------------------------------------------------------------ */
/*  TARİH SINIFLANDIRMASI                                              */
/* ------------------------------------------------------------------ */

/**
 * Bir bursun tarih durumu.
 *
 *   'son-gunler'  0–3 gün   — kırmızı ama sakin; yanıp sönen sayaç yok
 *   'yakin'       4–7 gün   — amber uyarı
 *   'normal'      8+ gün
 *   'yakinda'     henüz açılmadı
 *   'tarihsiz'    son tarih açıklanmadı
 *   'kapali'      süresi doldu
 *
 * Sahte aciliyet üretilmiyor: "son 3 gün" gerçekten üç gün kaldığında
 * yazıyor, "hemen başvur" baskısı hiç kurulmuyor.
 */
export function bursTarihDurumu(item, now = new Date()) {
  const durum = opportunityStatus(item, now);
  if (durum === 'kapali') return 'kapali';
  if (durum === 'yakinda') return 'yakinda';
  if (durum === 'takvim_bekleniyor') return 'tarihsiz';

  const kalan = daysUntilDeadline(item?.applicationDeadline, now);
  if (kalan == null) return 'tarihsiz';
  if (kalan <= 3) return 'son-gunler';
  if (kalan <= 7) return 'yakin';
  return 'normal';
}

const gunAy = (value) => {
  const gun = calendarDay(value);
  if (gun == null) return null;
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(gun));
};

/**
 * Kartta tek satırda yazan tarih cümlesi.
 *
 * Tek kaynak: aynı burs kartta, bölümde ve detayda aynı cümleyi görüyor.
 */
export function bursTarihMetni(item, now = new Date()) {
  const tarihDurumu = bursTarihDurumu(item, now);
  const kalan = daysUntilDeadline(item?.applicationDeadline, now);

  if (tarihDurumu === 'yakinda') {
    const acilis = gunAy(item?.applicationStartAt);
    return acilis ? `${acilis}'ta açılıyor` : 'Yakında açılıyor';
  }
  if (tarihDurumu === 'tarihsiz') return 'Başvuru tarihi açıklanmadı';
  if (tarihDurumu === 'kapali') return 'Başvuru dönemi kapandı';

  if (kalan === 0) return 'Bugün son gün';
  if (kalan === 1) return 'Son gün yarın';

  const son = gunAy(item?.applicationDeadline);
  if (kalan != null && kalan <= 7) return `${kalan} gün kaldı · ${son}`;
  return son ? `Son başvuru ${son}` : 'Başvuru tarihi açıklanmadı';
}

/* ------------------------------------------------------------------ */
/*  UYGUNLUK ETİKETLERİ                                                */
/* ------------------------------------------------------------------ */

/**
 * Kartta gösterilecek en fazla üç uygunluk etiketi.
 *
 * Hepsi VERİDEN geliyor: eğitim seviyesi, bölüm, şehir. Alan boşsa etiket
 * üretilmiyor — "Herkese açık" gibi bir varsayım yazmak, doğrulanmamış
 * bir koşulu doğrulanmış gibi göstermek olurdu.
 */
export function bursEtiketleri(item, sinir = 3) {
  const etiketler = [];
  for (const seviye of item?.educationLevels ?? []) etiketler.push(seviye);
  for (const bolum of item?.eligibleDepartments ?? []) etiketler.push(bolum);
  for (const sehir of item?.cities ?? []) etiketler.push(sehir);
  for (const ulke of item?.countries ?? []) etiketler.push(ulke);
  return [...new Set(etiketler.filter(Boolean).map(String))].slice(0, sinir);
}

/** Tutar biliniyor mu? Bilinmiyorsa kartta o alan HİÇ çizilmiyor. */
export function bursTutariVar(item) {
  return Boolean(item?.amountVerifiedAt);
}

/* ------------------------------------------------------------------ */
/*  SÜZGEÇLER                                                          */
/* ------------------------------------------------------------------ */

export const BOS_SUZGEC = {
  q: '',
  seviye: '',
  bolum: '',
  tur: '',
  durum: '',
  yer: '',
};

export function suzgecAktifMi(suzgec) {
  const s = { ...BOS_SUZGEC, ...(suzgec || {}) };
  return Object.values(s).some((deger) => String(deger || '').trim() !== '');
}

const kucult = (metin) => String(metin ?? '').toLocaleLowerCase('tr-TR');

/** "Türkiye geneli" = şehir ya da ülke şartı yok. */
export function turkiyeGeneliMi(item) {
  return (item?.cities?.length ?? 0) === 0 && (item?.countries?.length ?? 0) === 0;
}

export const TURKIYE_GENELI = '__turkiye__';

/** Kısıt listesi boşsa kısıt yoktur ve her seçim uyar. */
export function kisitaUyar(liste, secim) {
  const kisit = Array.isArray(liste) ? liste.filter(Boolean) : [];
  if (kisit.length === 0) return true;
  return kisit.includes(secim);
}

export function bursSuzgectenGecer(item, suzgec, now = new Date()) {
  const s = { ...BOS_SUZGEC, ...(suzgec || {}) };

  if (s.q) {
    const metin = kucult(
      `${item.title} ${item.organizationName} ${item.shortDescription ?? ''}`
    );
    if (!metin.includes(kucult(s.q))) return false;
  }
  /*
    BOŞ LİSTE = KISIT YOK, "BİLİNMİYOR" DEĞİL

    Şema kısıtı dizi olarak tutuyor. "Tüm lisans öğrencileri" diyen bir
    bursta `eligible_departments` BOŞ oluyor — bu kısıt olmadığı anlamına
    geliyor, o bursun hiçbir bölüme uymadığı anlamına değil.

    Önceki hâl boş listeyi "eşleşmiyor" sayıyordu: bölüm süzgeci seçen
    öğrenci, kendisine AÇIK olan bursların neredeyse tamamını eliyordu.
    Kısıtsız burs her bölüm süzgecinden geçiyor; süzgeç yalnızca gerçekten
    başka bir bölüme kısıtlanmış bursları eliyor.
  */
  if (s.seviye && !kisitaUyar(item.educationLevels, s.seviye)) return false;
  if (s.bolum && !kisitaUyar(item.eligibleDepartments, s.bolum)) return false;
  if (s.tur && item.opportunityType !== s.tur) return false;
  if (s.durum && opportunityStatus(item, now) !== s.durum) return false;

  if (s.yer === TURKIYE_GENELI) {
    /* Burada boş liste ARANAN şeyin kendisi: şehir şartı olmayan burslar. */
    if (!turkiyeGeneliMi(item)) return false;
  } else if (s.yer) {
    /*
      Belirli bir şehir seçildiğinde, şehir şartı OLMAYAN burslar da
      listede kalıyor: Türkiye geneli bir burs o şehirdeki öğrenciye de
      açık.
    */
    const yerler = [...(item.cities ?? []), ...(item.countries ?? [])];
    if (!kisitaUyar(yerler, s.yer)) return false;
  }

  return true;
}

/**
 * Süzgeç kutularının seçenekleri — VERİDEN türetiliyor.
 *
 * Boş kalan bir süzgeç çizilmiyor. Ölçüldü: 68 kaydın yalnızca 11'inde
 * eğitim seviyesi, 1'inde şehir dolu; bölüm alanı hiçbirinde dolu değil.
 * Hiçbir seçeneği olmayan bir açılır kutu, kullanıcıya var olmayan bir
 * süzme sözü verir.
 */
export function bursSuzgecSecenekleri(items = []) {
  const topla = (secici) => {
    const kume = new Set();
    for (const item of items) for (const deger of secici(item) ?? []) if (deger) kume.add(String(deger));
    return [...kume].sort((a, b) => a.localeCompare(b, 'tr'));
  };

  const turler = [...new Set(items.map((i) => i.opportunityType).filter(Boolean))].map((tur) => [
    tur,
    OPPORTUNITY_TYPE_LABELS[tur] ?? tur,
  ]);

  const sehirler = topla((i) => [...(i.cities ?? []), ...(i.countries ?? [])]);
  const yerler = items.some(turkiyeGeneliMi)
    ? [[TURKIYE_GENELI, 'Türkiye geneli'], ...sehirler.map((y) => [y, y])]
    : sehirler.map((y) => [y, y]);

  return {
    seviyeler: topla((i) => i.educationLevels).map((s) => [s, s]),
    bolumler: topla((i) => i.eligibleDepartments).map((b) => [b, b]),
    turler: turler.sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'tr')),
    durumlar: [
      ['acik', 'Başvurusu açık'],
      ['yakinda', 'Yakında açılacak'],
      ['takvim_bekleniyor', 'Takvim bekleniyor'],
    ].filter(([kod]) => items.some((i) => opportunityStatus(i) === kod)),
    yerler,
  };
}

/* ------------------------------------------------------------------ */
/*  KEŞİF BÖLÜMLERİ                                                    */
/* ------------------------------------------------------------------ */

/*
  İKİ AYRI SIRA VAR VE İKİSİ DE AÇIK

  ONCELIK  — bir bursu hangi bölümün SAHİPLENECEĞİ. Bir burs sayfada
             yalnızca bir kez görünüyor; ilk eşleşen bölüm alıyor.
  GORUNUM  — bölümlerin ekranda hangi sırayla ÇİZİLECEĞİ.

  İkisi neden farklı: "Son Günler" ekranda ikinci sırada duruyor ama
  sahiplenmede birinci. Yoksa profiline uyan ve iki gün sonra kapanan bir
  burs "Sana Uygun"a düşer, öğrenci de son üç günü toplu göremezdi. Tarih
  kaçırılınca telafisi olmayan tek bilgi; sahiplenmede önce o geliyor.

  Yeni bir bölüm eklerken iki listeye de yazmak gerekiyor — biri
  unutulursa bölüm ya hiç çizilmez ya hiç dolmaz, ikisi de sessiz hata
  değil görünür hata.
*/
export const BOLUM_ONCELIGI = [
  'son-gunler',
  'sana-uygun',
  'basvurusu-acik',
  'yakinda',
  'turkiye-geneli',
  'yurtdisi-egitim',
];

export const BOLUM_GORUNUMU = [
  'sana-uygun',
  'son-gunler',
  'basvurusu-acik',
  'yakinda',
  'turkiye-geneli',
  'yurtdisi-egitim',
];

const YURTDISI_TURLERI = new Set(['international', 'education', 'student_support', 'youth_program']);

/** "Sana Uygun" için profilin yeterli olup olmadığı. */
export function profilYeterliMi(student) {
  return Boolean(student?.gradeLevel);
}

const BOLUM_BASLIKLARI = {
  'sana-uygun': 'Sana Uygun Burslar',
  'one-cikanlar': 'Bu Dönem Öne Çıkanlar',
  'son-gunler': 'Son Günler',
  'basvurusu-acik': 'Başvurusu Açık',
  yakinda: 'Yakında Açılacak',
  'turkiye-geneli': 'Türkiye Geneli',
  'yurtdisi-egitim': 'Yurt Dışı ve Eğitim Destekleri',
};

/**
 * Keşif bölümlerini kurar.
 *
 * Süresi dolmuş burslar hiçbir bölüme girmiyor: öğrencinin
 * yapabileceği bir şey kalmamış bir kayıt keşif vitrininde yer kaplar.
 *
 * @param {object[]} items
 * @param {{ student?: object|null, now?: Date, sinir?: number }} baglam
 */
export function bursBolumleri(items = [], baglam = {}) {
  const now = baglam.now || new Date();
  const student = baglam.student || null;
  const sinir = baglam.sinir ?? 12;

  const aday = items.filter((item) => item && !isExpiredOpportunity(item, now));

  /*
    "Sana uygun" YALNIZCA kesin bilgiyle. opportunityFit tahmin de
    üretiyor (başlıktaki sözcüklerden); tahminle "sana uygun" demek,
    olmayan bir eşleşme iddiasında bulunmak olur. Sahte yüzde de yok.
  */
  const kisisel =
    profilYeterliMi(student) &&
    aday.some((item) => {
      const fit = opportunityFit(item, student);
      return fit.durum === 'uygun_olabilir' && fit.kesin;
    });

  const kural = {
    'son-gunler': (item) => bursTarihDurumu(item, now) === 'son-gunler',
    'sana-uygun': (item) => {
      if (!kisisel) return false;
      const fit = opportunityFit(item, student);
      return fit.durum === 'uygun_olabilir' && fit.kesin;
    },
    'basvurusu-acik': (item) => opportunityStatus(item, now) === 'acik',
    yakinda: (item) => opportunityStatus(item, now) === 'yakinda',
    'turkiye-geneli': (item) => turkiyeGeneliMi(item) && !YURTDISI_TURLERI.has(item.opportunityType),
    'yurtdisi-egitim': (item) =>
      YURTDISI_TURLERI.has(item.opportunityType) || (item.countries?.length ?? 0) > 0,
  };

  /*
    Profil yetmiyorsa "Sana Uygun" yerine "Bu Dönem Öne Çıkanlar".

    Öne çıkanlar uydurma bir seçki değil: başvurusu açık, resmî kaynağı
    doğrulanmış ve son başvurusu en yakın olanlar. Sıralama tarihe göre,
    puana göre değil — puan olsaydı neye dayandığını açıklamak gerekirdi.
  */
  if (!kisisel) {
    kural['sana-uygun'] = (item) =>
      opportunityStatus(item, now) === 'acik' && Boolean(item.verifiedAt);
  }

  const sahiplenilen = new Set();
  const kutu = {};

  for (const id of BOLUM_ONCELIGI) {
    const secilen = aday
      .filter((item) => !sahiplenilen.has(item.id) && kural[id](item))
      .sort(siralayici(now))
      .slice(0, sinir);
    secilen.forEach((item) => sahiplenilen.add(item.id));
    kutu[id] = secilen;
  }

  return BOLUM_GORUNUMU.map((id) => ({
    id: id === 'sana-uygun' && !kisisel ? 'one-cikanlar' : id,
    baslik: BOLUM_BASLIKLARI[id === 'sana-uygun' && !kisisel ? 'one-cikanlar' : id],
    kisisel: id === 'sana-uygun' ? kisisel : false,
    items: kutu[id],
  })).filter((bolum) => bolum.items.length > 0);
}

/** Son başvurusu yakın olan önce; tarihi olmayan en sona. */
function siralayici(now) {
  return (a, b) => {
    const ka = daysUntilDeadline(a.applicationDeadline, now);
    const kb = daysUntilDeadline(b.applicationDeadline, now);
    if (ka == null && kb == null) return String(a.title).localeCompare(String(b.title), 'tr');
    if (ka == null) return 1;
    if (kb == null) return -1;
    return ka - kb;
  };
}

/** Arama/süzgeç modundaki tek ızgara. Süresi dolanlar burada da yok. */
export function bursSonuclari(items = [], suzgec, now = new Date()) {
  return items
    .filter((item) => item && !isExpiredOpportunity(item, now))
    .filter((item) => bursSuzgectenGecer(item, suzgec, now))
    .sort(siralayici(now));
}
