import { calendarDay, daysUntilDeadline, opportunityStatus } from './opportunity-domain.mjs';

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

  let metin = null;
  if (alt && ust && String(item.amountMin) !== String(item.amountMax)) metin = `${alt}–${ust}`;
  else if (alt) metin = alt;

  if (metin && sikliK) metin = `${sikliK} ${metin}`;

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
  NEDEN "SANA UYGUN" DEMİYORUZ

  İkinci sınıf lisans öğrencisine ilk sırada "TÜBİTAK 2250 Lisansüstü
  Bursu" gösteriliyordu. Sebebi ölçüldü: 68 fırsatın 57'sinde
  education_levels alanı BOŞ (2250 dahil), eligible_class_years alanı ise
  68 kaydın HİÇBİRİNDE dolu değil. Yapısal alana bakan bir eşleştirme
  neredeyse hiçbir şeyi süzmez.

  İki kaynak birlikte kullanılıyor:
    1. Alan doluysa doğrudan ona bakılıyor — KESİN bilgi.
    2. Alan boşsa başlıktaki açık sinyal okunuyor ("lisansüstü", "yüksek
       lisans", "doktora", "lise"). Bu bir TAHMİN, o yüzden yalnızca
       ELEME yönünde kullanılıyor; hiçbir kaydı öne çıkarmıyor.

  Hiçbir durumda "bu bursu alabilirsin" denmiyor. En fazla "profil
  bilgilerine göre uygun olabilir" deniyor; şart varsa şartın kendisi
  yazılıyor. Koşulları resmî kaynaktan doğrulamak her hâlükârda
  öğrencinin işi ve bu kartta da yazıyor.
*/
const LISANSUSTU_IZLERI = ['lisansüstü', 'yüksek lisans', 'doktora'];
const LISE_IZLERI = ['lise', 'ortaöğretim'];

const kucult = (metin) => String(metin || '').toLocaleLowerCase('tr-TR');

/**
 * @returns {{ durum: 'sart_uymuyor'|'uygun_olabilir'|'bilinmiyor', not: string|null, kesin: boolean }}
 */
export function opportunityFit(item, ogrenci) {
  if (!item || !ogrenci) return { durum: 'bilinmiyor', not: null, kesin: false };

  const mezunSayilir = ogrenci.gradeLevel === 'Yüksek Lisans / Mezun';
  const seviyeler = (item.educationLevels || []).map(kucult);

  /* 1. KESİN: alan dolu. */
  if (seviyeler.length > 0) {
    const lisansVar = seviyeler.some((s) => s.includes('lisans') && !s.includes('lisansüstü'));
    const ustVar = seviyeler.some((s) => s.includes('lisansüstü') || s.includes('doktora'));
    const uygun = mezunSayilir ? ustVar || lisansVar : lisansVar;
    if (!uygun) {
      return {
        durum: 'sart_uymuyor',
        not: `${item.educationLevels.join(', ')} öğrencisi olma şartı bulunuyor.`,
        kesin: true,
      };
    }
    return { durum: 'uygun_olabilir', not: 'Profil bilgilerine göre uygun olabilir.', kesin: true };
  }

  /*
    2. TAHMİN: başlıktaki açık sinyal. Yalnızca eleme yönünde.

    METİN NASIL ÇIKTIĞINI ANLATMIYOR

    Önce "Başlığına göre lisansüstü öğrencisi olma şartı içeriyor
    (başlıktan çıkarıldı, resmî kaynaktan doğrula)" yazıyordu. Bu bir
    sistem günlüğü cümlesi: okuyan öğrenciye bilginin nereden geldiğini
    değil, ne yapması gerektiğini söylemeliyiz. Belirsizlik artık
    cümlenin kipinde ("olabilir") ve açık bir yönlendirmede.
  */
  const yazi = kucult(`${item.title} ${item.shortDescription || ''}`);
  if (!mezunSayilir && LISANSUSTU_IZLERI.some((iz) => yazi.includes(iz))) {
    return {
      durum: 'sart_uymuyor',
      not: 'Lisansüstü öğrencilerine yönelik olabilir. Kesin koşulları resmî kaynaktan kontrol et.',
      kesin: false,
    };
  }
  if (LISE_IZLERI.some((iz) => yazi.includes(iz)) && !yazi.includes('lisans')) {
    return {
      durum: 'sart_uymuyor',
      not: 'Lise öğrencilerine yönelik olabilir. Kesin koşulları resmî kaynaktan kontrol et.',
      kesin: false,
    };
  }

  return { durum: 'bilinmiyor', not: null, kesin: false };
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
