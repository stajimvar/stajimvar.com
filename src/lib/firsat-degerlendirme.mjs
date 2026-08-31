import { calendarDay, daysUntilDeadline, opportunityStatus } from './opportunity-domain.mjs';
import { boyutEslesmesi, kisisellestirmeyeHazir } from './burs-uygunluk.mjs';

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

function paraBicimi(deger, currency) {
  const sayi = Number(deger);
  if (deger == null || !Number.isFinite(sayi)) return null;
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency || 'TRY',
      maximumFractionDigits: 0,
    }).format(sayi);
  } catch {
    return `${new Intl.NumberFormat('tr-TR').format(sayi)} ${currency || ''}`.trim();
  }
}

/**
 * Karta yazılacak tutar bilgisi.
 *
 * metin      — "Aylık 12.000 ₺" ya da açıklama; bilinmiyorsa null
 * donem      — "2026-2027 dönemi"; yoksa null
 * geriOdeme  — "Karşılıksız" | "Geri ödemeli"; bilinmiyorsa null
 * bilinmiyor — true ise ekranda "açıklanmadı" cümlesi yazılmalı
 */
export function opportunityAmount(item) {
  const bos = { metin: null, donem: null, geriOdeme: null, bilinmiyor: true };
  if (!item) return bos;

  const geriOdeme =
    item.repayable === true ? 'Geri ödemeli' : item.repayable === false ? 'Karşılıksız' : null;

  /*
    Doğrulanmamış tutar gösterilmiyor. amount_text hâlâ duruyor ama o bir
    NİTELİK alanı ("Karşılıksız") — miktar değil; miktarmış gibi
    göstermek okuyanı yanıltırdı.
  */
  if (!item.amountVerifiedAt) return { ...bos, geriOdeme };

  const donem = item.amountPeriodLabel || null;
  const sikliK = ODEME_DONEMI_ETIKETLERI[item.paymentPeriod] || null;
  const alt = paraBicimi(item.amountMin, item.currency);
  const ust = paraBicimi(item.amountMax, item.currency);

  /*
    SIKLIĞI OLMAYAN SAYI GÖSTERİLMİYOR

    "2.250 ₺" tek başına aylık mı tek seferlik mi belli değil ve ikisi
    arasında on iki katlık fark var. Sıklık yoksa sayı atlanıyor;
    varsa açıklama alanındaki kaynak ifadesi gösteriliyor. Veri girişi
    de sıklığı zorunlu tutuyor, bu yalnızca eski kayıtlar için ağ.
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

  if (!metin) return { ...bos, geriOdeme, donem };
  return { metin, donem, geriOdeme, bilinmiyor: false };
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
    şart ihlali değil ama "uygun" demeye de yetmiyor.
  */
  if (Object.values(eslesmeler).some((e) => e === 'BILINMIYOR')) {
    return {
      durum: 'bilinmiyor',
      not: 'Profilinde bölüm, sınıf ve şehir dolu olursa bu fırsatı eşleştirebiliriz.',
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
