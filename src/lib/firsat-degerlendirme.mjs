import { calendarDay, daysUntilDeadline, opportunityStatus } from './opportunity-domain.mjs';
import { DURUM, boyutEslesmesi, kisisellestirmeyeHazir, kisitDurumu } from './burs-uygunluk.mjs';

/**
 * Fırsat değerlendirme: tutar, profile uygunluk, gruplama.
 *
 * opportunity-domain.mjs bir fırsatın NE OLDUĞUNU tanımlıyor (durum, tür,
 * bağlantı etiketi). Burası fırsatın KİME ve NE KADAR ettiğini
 * değerlendiriyor. İkisi ayrı dosyada çünkü ikincisi öğrenciye bağlı ve
 * çok daha hızlı değişiyor.
 */

/* ------------------------------------------------------------------ */
/*  TUTAR                                                              */
/* ------------------------------------------------------------------ */

/*
  NEDEN YAPISAL ALAN

  Tutar tek bir serbest metindeydi (amount_text) ve içindekiler sayı değil
  nitelikti: "Karşılıksız", "Geri ödemeli", "Programa göre değişiyor".
  Ölçüldü: 68 kaydın HİÇBİRİNDE okunabilir bir miktar yoktu; burs seçerken
  en çok merak edilen bilgi sitede hiç bulunmuyordu.

  Kural: tutar YALNIZCA resmî kaynaktan doğrulanmışsa (amountVerifiedAt
  dolu) gösteriliyor. Doğrulanmamışsa "resmî kaynakta açıklanmadı" yazıyor.
  Geçen yılın rakamını bu yılınmış gibi sunmak, hiç göstermemekten kötü.

  Dönem etiketi tutarın yanında duruyor: burs tutarları her yıl değişiyor,
  hangi yıla ait olduğunu söylemeyen bir rakam yanıltıcı.
*/
export const ODEME_DONEMI_ETIKETLERI = {
  monthly: 'Aylık',
  once: 'Tek seferlik',
  yearly: 'Yıllık',
  term: 'Dönemlik',
};

/*
  TÜRK LİRASI "7.000 TL", "₺7.000" DEĞİL

  `Intl` TRY için ₺ işaretini SAYIDAN ÖNCE koyuyor: "₺7.000". Türkçede
  tutar sayıdan sonra ve çoğunlukla "TL" ile yazılıyor; burs ilanlarının
  kendi sayfalarında da öyle geçiyor ("aylık burs miktarı 7.000 TL").
  Kaynağıyla aynı yazılmayan bir rakam, öğrenciyi ikisini
  karşılaştırırken duraklatıyor.

  Yalnızca TRY'ye özel: öteki para birimleri `Intl`in yerel kuralında
  kalıyor (EUR "3.000 €", USD "60.000 $"), çünkü onların doğru yazımını
  `Intl` zaten biliyor ve elle kural yazmak her birim için yeni bir
  hata yüzeyi açardı.
*/
export function paraBicimi(deger, currency) {
  const sayi = Number(deger);
  if (deger == null || !Number.isFinite(sayi)) return null;

  const birim = currency || 'TRY';
  const sayiMetni = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(sayi);
  if (birim === 'TRY') return `${sayiMetni} TL`;

  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: birim,
      maximumFractionDigits: 0,
    }).format(sayi);
  } catch {
    /* Tanınmayan birim kodu: sayıyı kaybetmemek için kodu yanına yazıyoruz. */
    return `${sayiMetni} ${birim}`.trim();
  }
}

/**
 * Karta yazılacak tutar bilgisi.
 *
 * metin      — "Aylık 12.000 TL" ya da açıklama; bilinmiyorsa null
 * donem      — "2026-2027 dönemi"; yoksa null
 * geriOdeme  — "Karşılıksız" | "Geri ödemeli"; bilinmiyorsa null
 * bilinmiyor — true ise ekranda "açıklanmadı" cümlesi yazılmalı
 */
/*
  TUTAR SATIRI — DURUM VERİDEN GELİYOR, TÜRDEN DEĞİL

  ÖNCEKİ HÂLİ VE HATASI
  ---------------------
  Durum kaydın TÜRÜNDEN türetiliyordu: "burs ya da yurt dışı ise demek
  ki bir ödeme var, kurum henüz açıklamamış". 113 kaydın 106'sı
  "Tutar kurumca açıklanacak" cümlesini kaynağında öyle yazdığı için
  değil, türü öyle olduğu için gösteriyordu. Yani ekran, hiç bakmadığı
  bir sayfa hakkında iddiada bulunuyordu.

  ŞİMDİ
  -----
  Durum `amount_status` sütunundan okunuyor ve o sütunu yalnızca
  `scripts/firsat-tutar-kontrol.mjs` yazıyor: kurumun kendi güncel
  sayfasını açıp okuduğu cümleye bakarak. Kanıt da satırda duruyor
  (`amount_evidence`, `amount_source_url`, `amount_checked_at`), yani
  her cümlenin arkasında denetlenebilir bir kaynak var.

  ALTI DURUM
  ----------
    kesin          Güncel dönem için kesin rakam → "Aylık 5.000 TL"
    aciklanacak    Kaynak "tutar sonra açıklanacak" diyor
    mali_destek    Destek var, miktar programa/şehre/kişiye göre değişiyor
    belirtilmemis  Güncel sayfa okundu, tutar BULUNAMADI (kurumun
                   açıklamadığı iddia EDİLMİYOR — ekranda "Tutar
                   doğrulanamadı" yazıyor)
    ucretsiz       Katılımın ücretsiz olduğu açıkça yazıyor
    belirsiz       Açılamadı, çelişkili ya da karar verilemedi

  `belirsiz` ve NULL (hiç bakılmamış) EKRANDA AYNI ŞEY: satır hiç
  çizilmiyor. Betiğin kararsızlığı bir iddiaya dönüşmüyor.

  ESKİ DÖNEM TUTARI KULLANILMIYOR
  ------------------------------
  Rakam yalnızca `amount_verified_at` damgası varken çıkıyor; damgayı da
  yalnız `kesin` dalı atıyor. Betik öteki dallarda eski rakamı
  temizliyor: durumu "belirtilmemiş" olan bir kayıtta geçen yıldan kalma
  bir sayı durmamalı.
*/
export const TUTAR_DURUMU = {
  kesin: 'kesin',
  aciklanacak: 'aciklanacak',
  maliDestek: 'mali_destek',
  belirtilmemis: 'belirtilmemis',
  ucretsiz: 'ucretsiz',
  belirsiz: 'belirsiz',
};

/*
  EKRANDA GÖRÜNEN KARŞILIKLAR — "BELİRTİLMEMİŞ" ARTIK İDDİA ETMİYOR

  `belirtilmemis` satırı "Tutar belirtilmemiş" yazıyordu ve bu, KURUM
  ADINA bir beyan: "kurum tutarı açıklamadı". Oysa bildiğimiz tek şey
  BİZİM okuduğumuz sayfada rakam GÖRMEDİĞİMİZ. Rakam bir PDF'te, giriş
  arkasında, bir tabloda ya da ayrıştırıcımızın atladığı bir yerde
  olabilir. Ölçüm: 120 kaydın 89'u bu durumda, yani bu iddia ekranın
  dörtte üçünde çıkıyordu.

  Yeni metin yalnızca ölçümün kendisini söylüyor. Aynı ayrım
  `programDurumMetni`'nde de yapıldı: "bakmadık" ile "baktık,
  bulamadık" ayrı cümleler.

  ÖTEKİ ÜÇ DURUM DEĞİŞMEDİ: `aciklanacak`, `mali_destek` ve `ucretsiz`
  kaynağın KENDİ ifadesine dayanıyor — onlar bizim değil kurumun beyanı.
*/
export const TUTAR_METNI = {
  aciklanacak: 'Tutar kurumca açıklanacak',
  mali_destek: 'Mali destek sağlanıyor',
  belirtilmemis: 'Tutar doğrulanamadı',
  ucretsiz: 'Ücretsiz',
};

export function opportunityAmount(item) {
  const bos = {
    metin: null,
    donem: null,
    geriOdeme: null,
    bilinmiyor: true,
    durum: null,
    satir: null,
  };
  if (!item) return bos;

  const geriOdeme =
    item.repayable === true ? 'Geri ödemeli' : item.repayable === false ? 'Karşılıksız' : null;

  /*
    Durum SATIRDAN geliyor. Tanınmayan bir değer (ileride eklenip
    arayüze yansımamış bir durum) satır çizdirmiyor: bilmediğimiz bir
    etiketi kullanıcıya okutmaktansa susmak doğru.
  */
  const durum = item.amountStatus ?? null;
  const rakamsiz = () => ({
    ...bos,
    geriOdeme,
    durum,
    satir: TUTAR_METNI[durum] ?? null,
  });

  /*
    Doğrulanmamış tutar gösterilmiyor. amount_text hâlâ duruyor ama o bir
    NİTELİK alanı ("Karşılıksız") — miktar değil; miktarmış gibi
    göstermek okuyanı yanıltırdı.
  */
  if (!item.amountVerifiedAt) return rakamsiz();

  const donem = item.amountPeriodLabel || null;
  const sikliK = ODEME_DONEMI_ETIKETLERI[item.paymentPeriod] || null;
  const alt = paraBicimi(item.amountMin, item.currency);
  const ust = paraBicimi(item.amountMax, item.currency);

  /*
    SIKLIĞI OLMAYAN SAYI GÖSTERİLMİYOR

    "2.250 TL" tek başına aylık mı tek seferlik mi belli değil ve ikisi
    arasında on iki katlık fark var. Sıklık yoksa sayı atlanıyor;
    varsa açıklama alanındaki kaynak ifadesi gösteriliyor.
  */
  let metin = null;
  if (sikliK) {
    if (alt && ust && String(item.amountMin) !== String(item.amountMax)) metin = `${alt}–${ust}`;
    else if (alt) metin = alt;
    if (metin) metin = `${sikliK} ${metin}`;
  }

  /* Sayıya sığmayan durumlar: "Eğitim ücretinin %50'si", "Hibe yok". */
  if (!metin && item.amountNote) metin = item.amountNote;
  else if (metin && item.amountNote) metin = `${metin} · ${item.amountNote}`;

  if (!metin) return { ...rakamsiz(), donem };
  return {
    metin,
    donem,
    geriOdeme,
    bilinmiyor: false,
    durum: TUTAR_DURUMU.kesin,
    /* Kartta tek satır: rakam ve varsa ödeme dönemi. */
    satir: donem ? `${metin} · ${donem}` : metin,
  };
}

/* ------------------------------------------------------------------ */
/*  PROFİLE UYGUNLUK                                                   */
/* ------------------------------------------------------------------ */

/*
  UYGUNLUK YALNIZCA DOĞRULANMIŞ KISITLA

  ESKİ HÂLİ VE HATASI
  -------------------
  Buradaki eşleştirme iki kaynağa bakıyordu:
    1. `educationLevels` dizisi doluysa "KESİN bilgi" sayılıyordu.
    2. Dizi boşsa başlıktaki sözcükler okunuyordu ("lisansüstü", "lise").

  Birincisi yanlıştı: dolu bir dizi, o kısıtın KAYNAKTAN DOĞRULANDIĞINI
  söylemiyor. Ölçüldü (üretim, 31 Ağustos 2026): education_levels dizisi
  dolu 11 kayıt var ve ON BİRİNİN DE education_levels_verified_at damgası
  NULL. Yani "kesin" diye işaretlenen her kayıt aslında doğrulanmamıştı
  ve bu bilgiyle öğrenci listeden ELENEBİLİYORDU.

  İkincisi de eleme yapıyordu: başlığında "lisansüstü" geçen bir fırsat
  listeden çıkarılıyordu. Başlık bir tahmindir; tahminle eleme, öğrenciye
  başvurabileceği bir bursu hiç göstermemek demek.

  YENİ HÂLİ
  ---------
  Tek doğruluk kaynağı ./burs-uygunluk.mjs — üç boyutun (bölüm, seviye,
  şehir) doğrulama damgası:

    damga yok                → DOGRULANMADI  → 'bilinmiyor'
    damga var + dizi boş     → KISIT_YOK     → o boyut uyuyor
    damga var + dizi dolu    → KISITLI       → listede varsa uyuyor

  Üç boyut da doğrulanmadan hiçbir fırsat "uygun" ya da "uygun değil"
  diye işaretlenmiyor. Başlık sinyali kaldı ama artık YALNIZCA bir
  uyarı metni: `durum` üretmiyor, süzmeye ve sıralamaya girmiyor.

  Çağıran taraf da izin listesiyle çalışmalı ("uygun_olabilir && kesin"),
  eleme listesiyle değil: eleme listesinde DOĞRULANMAMIŞ her kayıt
  sessizce "sana uygun" sayılıyordu.
*/
const LISANSUSTU_IZLERI = ['lisansüstü', 'yüksek lisans', 'doktora'];
const LISE_IZLERI = ['lise', 'ortaöğretim'];

const kucult = (metin) => String(metin || '').toLocaleLowerCase('tr-TR');

/**
 * Başlıktan okunan YUMUŞAK uyarı. Karar vermiyor, yalnızca kartta bir
 * cümle olarak görünüyor. Doğrulanmış kısıt varsa hiç çağrılmıyor.
 */
function baslikUyarisi(item, mezunSayilir) {
  const yazi = kucult(`${item.title} ${item.shortDescription || ''}`);
  if (!mezunSayilir && LISANSUSTU_IZLERI.some((iz) => yazi.includes(iz)))
    return 'Başlığı lisansüstü öğrencilerine işaret ediyor. Koşulları resmî kaynaktan kontrol et.';
  if (LISE_IZLERI.some((iz) => yazi.includes(iz)) && !yazi.includes('lisans'))
    return 'Başlığı lise öğrencilerine işaret ediyor. Koşulları resmî kaynaktan kontrol et.';
  return null;
}

/** Öğrenci profilinden üç boyutun değerleri. */
function ogrenciBoyutlari(ogrenci) {
  return {
    bolum: ogrenci?.department || ogrenci?.bolum || null,
    seviye: ogrenci?.gradeLevel || ogrenci?.seviye || null,
    sehir: ogrenci?.city || ogrenci?.sehir || null,
  };
}

/**
 * @returns {{ durum: 'sart_uymuyor'|'uygun_olabilir'|'bilinmiyor', not: string|null, kesin: boolean }}
 *
 * `kesin` YALNIZCA üç boyutun da doğrulanmış olduğu durumda true. Çağıran
 * taraf "sana uygun" listesini bu bayrakla kuruyor.
 */
export function opportunityFit(item, ogrenci) {
  if (!item || !ogrenci) return { durum: 'bilinmiyor', not: null, kesin: false };

  const mezunSayilir = (ogrenci.gradeLevel || ogrenci.seviye) === 'Yüksek Lisans / Mezun';

  /*
    Bir boyut bile doğrulanmadıysa hiçbir iddia yok. Kartta yalnızca
    başlıktan okunan yumuşak uyarı görünebiliyor; o da süzmüyor.
  */
  if (!kisisellestirmeyeHazir(item)) {
    return { durum: 'bilinmiyor', not: baslikUyarisi(item, mezunSayilir), kesin: false };
  }

  const ogr = ogrenciBoyutlari(ogrenci);
  const eslesmeler = {
    bolum: boyutEslesmesi(item, 'bolum', ogr.bolum),
    seviye: boyutEslesmesi(item, 'seviye', ogr.seviye),
    sehir: boyutEslesmesi(item, 'sehir', ogr.sehir),
  };

  const UYMAYAN_NOT = {
    bolum: () => `${(item.eligibleDepartments || []).join(', ')} bölümü şartı bulunuyor.`,
    seviye: () => `${(item.educationLevels || []).join(', ')} öğrencisi olma şartı bulunuyor.`,
    sehir: () => `${(item.cities || []).join(', ')} şartı bulunuyor.`,
  };

  const uymayan = Object.keys(eslesmeler).find((b) => eslesmeler[b] === 'UYMUYOR');
  if (uymayan) return { durum: 'sart_uymuyor', not: UYMAYAN_NOT[uymayan](), kesin: true };

  /*
    Öğrencinin kendi bilgisi eksikse boyut BILINMIYOR dönüyor. Bu bir
    şart ihlali DEĞİL: kayıt listede kalıyor, yalnızca "Sana uygun"
    rozetini alamıyor.

    Not artık hangi alanın eksik olduğunu tek tek söylüyor. Eski cümle üç
    alanı birden sayıyordu ("bölüm, sınıf ve şehir dolu olursa") ve
    ikisini doldurmuş bir öğrenciye hâlâ üçünü de eksikmiş gibi
    gösteriyordu — ne yapacağını söylemeyen bir uyarı.

    Buraya gelindiğinde üç boyutun damgası da var (kisisellestirmeyeHazir
    yukarıda geçildi); dolayısıyla BILINMIYOR'un tek sebebi öğrencinin
    kendi profilindeki boşluk.
  */
  const EKSIK_ALAN_ADI = { bolum: 'bölüm', seviye: 'sınıf', sehir: 'şehir' };
  const eksikler = Object.keys(eslesmeler)
    .filter((b) => eslesmeler[b] === 'BILINMIYOR')
    .map((b) => EKSIK_ALAN_ADI[b]);
  if (eksikler.length) {
    const alanlar =
      eksikler.length === 1 ? eksikler[0] : `${eksikler.slice(0, -1).join(', ')} ve ${eksikler.at(-1)}`;
    return {
      durum: 'bilinmiyor',
      not: `Bu fırsatın ${alanlar} şartı var; profilinde ${alanlar} yazmıyor.`,
      kesin: false,
    };
  }

  return { durum: 'uygun_olabilir', not: 'Profil bilgilerine göre uygun olabilir.', kesin: true };
}

/**
 * Listede kişiselleştirmeye HAZIR kaç kayıt var?
 *
 * Arayüz "Sana uygun" sekmesini bu sayıya göre çiziyor: sıfırsa ortada
 * kişiselleştirme yok ve sekmeyi aktif bir süzgeç gibi göstermek sahte
 * bir yetenek sunmak olur.
 */
export function personalizationReadyCount(items = []) {
  return items.filter((item) => kisisellestirmeyeHazir(item || {})).length;
}

/**
 * Listede kaç kaydın DOĞRULANMIŞ ve DOLU bir şehir şartı var?
 *
 * Profilinde ikamet ili yazmayan öğrenciye "şehir yaz" demenin ancak bu
 * sayı sıfırdan büyükken bir karşılığı oluyor. Sıfırken şehir yazmak o
 * ekranda hiçbir sonucu değiştirmezdi; olmayan bir kazanç vaat etmemek
 * için çağrı da çizilmiyor. Sayı gerçek listeden sayılıyor.
 */
export function sehirSartliSayisi(items = []) {
  return (items || []).filter((item) => kisitDurumu(item || {}, 'sehir') === DURUM.KISITLI).length;
}

/* ------------------------------------------------------------------ */
/*  GRUPLAMA VE SAYAÇLAR                                               */
/* ------------------------------------------------------------------ */

/*
  Üstte "21 başvurusu devam eden" yazarken listede 68 fırsat gösteriliyordu:
  iki sayı aynı ekranda birbiriyle çelişiyordu. Sayaçların saydığı şey ile
  listenin gösterdiği şey artık aynı gruplardan geliyor.
*/
export function groupOpportunities(items, now = new Date()) {
  const gruplar = { acik: [], yakinda: [], takvim_bekleniyor: [], kapali: [] };
  for (const item of items || []) gruplar[opportunityStatus(item, now)].push(item);
  return gruplar;
}

/** Kaç gün kaldı. Tarih yoksa null. */
export function opportunityDaysLeft(item, now = new Date()) {
  if (!item?.applicationDeadline) return null;
  return daysUntilDeadline(item.applicationDeadline, now);
}

/*
  SON BAŞVURU ETİKETİ — TEK KAYNAK

  Aynı fırsat aynı gün üç ayrı yerde üç farklı şey diyordu: kartta "Bugün
  son gün", üst uyarıda "Yarına kadar açık", ana sayfa aramasında "Yarın
  sona eriyor". Üçü de ayrı ayrı yazılmış üç fonksiyondan geliyordu.

  Kullanıcı için bunlar farklı üç bilgi gibi okunuyor ve hangisinin doğru
  olduğu belirsizleşiyor. Bir tarih tek bir cümleyle anlatılmalı; o cümle
  burada.

  Gün hesabı Türkiye saat dilimine göre GÜN BAŞINA normalize ediliyor
  (calendarDay): saat farkı yüzünden aynı tarihin bir yerde "bugün", başka
  yerde "yarın" görünmesi böyle önleniyor.
*/
export function deadlineLabel(item, now = new Date()) {
  const gun = opportunityDaysLeft(item, now);
  if (gun == null) return null;
  if (gun === 0) return 'Bugün son gün';
  if (gun === 1) return 'Son gün yarın';
  if (gun <= 30) return `${gun} gün kaldı`;
  return null;
}

/**
 * Başlık altındaki bilgi satırında yazan kapanış uyarısı.
 *
 * KISALDI
 * -------
 * "Bugün ve yarın kapanan 2 fırsat var." 36 karakterdi ve 390 pikselde
 * sayaçların yanına sığmayıp kendi satırına düşüyordu — üst blokta
 * dördüncü bir yatay şerit demekti. "var." zaten hiçbir şey söylemiyor;
 * cümle bir sayaç, bir haber değil.
 *
 * Yeni hâli sayaçlarla aynı satıra sığıyor ve aynı şeyi söylüyor:
 * "2'si bugün/yarın kapanıyor".
 */
export function closingSoonLabel(sayi, gun = 1) {
  if (!sayi) return null;
  if (gun <= 1) return `${sayi}'si bugün/yarın kapanıyor`;
  return `${sayi}'si ${gun} gün içinde kapanıyor`;
}

/** N gün içinde kapanan AÇIK fırsatlar. Uyarı satırı bunu sayıyor. */
export function closingSoon(items, gun = 1, now = new Date()) {
  return (items || []).filter((item) => {
    if (opportunityStatus(item, now) !== 'acik') return false;
    const kalan = opportunityDaysLeft(item, now);
    return kalan != null && kalan <= gun;
  });
}

/* ------------------------------------------------------------------ */
/*  SIRALAMA                                                           */
/* ------------------------------------------------------------------ */

/*
  VARSAYILAN SIRA: UYGUN → YAKLAŞAN → YENİ → DİĞER

  Liste tek bir alana göre diziliyordu: `application_deadline` artan,
  tarihi olmayanlar sona. Sonucu şuydu — öğrencinin profiline uyan, üç
  boyutu da doğrulanmış bir burs, hiç uymayan ama iki gün sonra kapanacak
  bir çağrının ALTINDA kalıyordu. Tarih bir aciliyet ölçüsü, alaka ölçüsü
  değil.

  Dört kova var ve kovalar arası sıra kesin:

    0  uygun      opportunityFit → uygun_olabilir VE kesin
    1  yaklaşan   son başvuru tarihi biliniyor
    2  yeni       tarihi yok ama yayın tarihi var
    3  diğer      ikisi de yok

  Kova içinde: 0 ve 1 son tarihe göre artan (yakın olan üstte), 2 yayın
  tarihine göre azalan (yeni olan üstte), 3 başlığa göre alfabetik —
  belirsiz bir sıra her yüklemede listeyi karıştırırdı.

  UYDURMA ORAN YOK
  ----------------
  Kova 0'a girmek için `kesin` şart: üç kısıt boyutunun da kurumun kendi
  sayfasından doğrulanmış olması gerekiyor (bkz. burs-uygunluk.mjs).
  Profili eksik öğrencide ya da doğrulanmamış kayıtta bu kova boş kalıyor
  ve sıra sessizce "yaklaşan"dan başlıyor; kimseye "%84 uyum" denmiyor.
*/
const SIRA_SONU = Number.MAX_SAFE_INTEGER;

/* Boş değer `calendarDay` içinde epoch'a düşüyor; önce ayıklanıyor. */
const gunDegeri = (deger) => (deger ? calendarDay(deger) : null);

function varsayilanKova(item, ogrenci) {
  if (ogrenci) {
    const fit = opportunityFit(item, ogrenci);
    if (fit.durum === 'uygun_olabilir' && fit.kesin) return 0;
  }
  if (gunDegeri(item?.applicationDeadline) != null) return 1;
  if (gunDegeri(item?.publishedAt) != null) return 2;
  return 3;
}

/**
 * @param {object[]} items
 * @param {{ogrenci?: object|null, mod?: ''|'son-tarih'|'yeni'}} secenek
 *   `mod` boşsa yukarıdaki dört kovalı varsayılan sıra. 'son-tarih' ve
 *   'yeni' kullanıcının AÇIKÇA seçtiği sıralar; uygunluk onları ezmiyor,
 *   yoksa seçim yaptığı hâlde liste değişmemiş görünürdü.
 */
export function firsatSirala(items = [], { ogrenci = null, mod = '' } = {}) {
  const liste = [...items];
  const baslik = (item) => String(item?.title ?? '');

  if (mod === 'son-tarih') {
    return liste.sort((a, b) => {
      const x = gunDegeri(a.applicationDeadline) ?? SIRA_SONU;
      const y = gunDegeri(b.applicationDeadline) ?? SIRA_SONU;
      return x - y || baslik(a).localeCompare(baslik(b), 'tr');
    });
  }
  if (mod === 'yeni') {
    return liste.sort((a, b) => {
      const x = gunDegeri(a.publishedAt) ?? -SIRA_SONU;
      const y = gunDegeri(b.publishedAt) ?? -SIRA_SONU;
      return y - x || baslik(a).localeCompare(baslik(b), 'tr');
    });
  }

  /* Kova bir kez hesaplanıyor: `opportunityFit` her karşılaştırmada
     yeniden çağrılsaydı n·log(n) yerine n²·log(n) iş çıkardı. */
  const kovalar = new Map(liste.map((item) => [item, varsayilanKova(item, ogrenci)]));
  return liste.sort((a, b) => {
    const fark = kovalar.get(a) - kovalar.get(b);
    if (fark !== 0) return fark;
    const kova = kovalar.get(a);
    if (kova <= 1) {
      const x = gunDegeri(a.applicationDeadline) ?? SIRA_SONU;
      const y = gunDegeri(b.applicationDeadline) ?? SIRA_SONU;
      if (x !== y) return x - y;
    }
    if (kova === 2) {
      const x = gunDegeri(a.publishedAt) ?? -SIRA_SONU;
      const y = gunDegeri(b.publishedAt) ?? -SIRA_SONU;
      if (x !== y) return y - x;
    }
    return baslik(a).localeCompare(baslik(b), 'tr');
  });
}

/** Takvim görünümü için ay ay gruplanmış olaylar. */
export function opportunityCalendar(items, now = new Date()) {
  const bugun = calendarDay(now);
  const olaylar = [];

  for (const item of items || []) {
    const acilis = calendarDay(item.applicationStartAt);
    /*
      Açılış günü de takvime giriyor ama yalnızca GELECEKTEyse: geçmiş bir
      açılış tarihi öğrencinin yapabileceği bir şey söylemiyor.
    */
    if (acilis != null && bugun != null && acilis >= bugun) {
      olaylar.push({ item, tur: 'acilis', gun: acilis });
    }
    const kapanis = calendarDay(item.applicationDeadline);
    if (kapanis != null && bugun != null && kapanis >= bugun) {
      olaylar.push({ item, tur: 'kapanis', gun: kapanis });
    }
  }

  olaylar.sort((a, b) => a.gun - b.gun);

  const aylar = [];
  for (const olay of olaylar) {
    const tarih = new Date(olay.gun);
    const anahtar = `${tarih.getUTCFullYear()}-${tarih.getUTCMonth()}`;
    let ay = aylar[aylar.length - 1];
    if (!ay || ay.anahtar !== anahtar) {
      ay = {
        anahtar,
        etiket: new Intl.DateTimeFormat('tr-TR', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(tarih),
        olaylar: [],
      };
      aylar.push(ay);
    }
    ay.olaylar.push(olay);
  }
  return aylar;
}

/* ------------------------------------------------------------------ */
/*  ACİLİYET RENGİ                                                     */
/* ------------------------------------------------------------------ */

/*
  Kırmızı bir uyarı rengi: "şimdi bak, yoksa kaçıracaksın" demek. Son
  başvuruya 17 gün kalan bir burs da kırmızı gösteriliyordu; her şey
  kırmızı olunca kırmızı hiçbir şey söylemiyor.

  Eşikler kalan güne göre: 0-3 kırmızı, 4-7 turuncu, 8+ nötr. Yakında
  açılacaklar yeşil — orada kaçırılacak bir şey yok, aksine iyi haber.
*/
export function deadlineTone(item, now = new Date()) {
  const durum = opportunityStatus(item, now);
  if (durum === 'yakinda') return 'yakinda';
  if (durum === 'kapali') return 'kapali';
  if (durum === 'takvim_bekleniyor') return 'takvimsiz';
  const gun = opportunityDaysLeft(item, now);
  if (gun == null) return 'notr';
  if (gun <= 3) return 'acil';
  if (gun <= 7) return 'yakin';
  return 'notr';
}

export const ACILIYET_SINIFLARI = {
  acil: { kutu: 'bg-rose-50', yazi: 'text-rose-700' },
  yakin: { kutu: 'bg-amber-50', yazi: 'text-amber-800' },
  notr: { kutu: 'bg-sky-50', yazi: 'text-sky-900' },
  yakinda: { kutu: 'bg-emerald-50', yazi: 'text-emerald-800' },
  takvimsiz: { kutu: 'bg-gray-50', yazi: 'text-gray-700' },
  kapali: { kutu: 'bg-gray-50', yazi: 'text-gray-500' },
};
