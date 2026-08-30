/**
 * Burs uygunluk kısıtlarının doğrulama durumu.
 *
 * UNKNOWN ≠ UNRESTRICTED
 * ----------------------
 * Boş bir kısıt listesi tek başına iki zıt şeyi anlatabiliyordu:
 *
 *   A) Kaynak okundu, kısıt YOK.
 *   B) Kaynak okunmadı, kısıt olup olmadığı BİLİNMİYOR.
 *
 * (A) bursu her öğrenciye uygun yapar; (B) hiçbir şey söylemez. İkisini
 * karıştırmak, kısıtları bilinmeyen bir bursa "sana uygun" etiketi
 * yapıştırmak demek — öğrenci başvuramayacağı bir burs için emek harcar.
 *
 * Ayrım veritabanında bir zaman damgasıyla tutuluyor (`*_verified_at`),
 * `amount_verified_at` deseninin aynısı. Bu dosya o damgayı üç değerli
 * bir duruma çeviriyor ve kişiselleştirmenin TEK doğruluk kaynağı.
 *
 * KAPALI BAŞLIYOR
 * ---------------
 * Damga yoksa durum DOGRULANMADI ve o burs kişiselleştirmeye HİÇ
 * girmiyor. Eksik bilgi yüzünden bir bursu göstermemek, yanlış bilgiyle
 * göstermekten iyidir.
 */

export const DURUM = {
  DOGRULANMADI: 'DOGRULANMADI',
  KISIT_YOK: 'KISIT_YOK',
  KISITLI: 'KISITLI',
};

/** Kişiselleştirmede kullanılan üç boyut ve karşılık gelen alanlar. */
export const BOYUTLAR = {
  bolum: { liste: 'eligibleDepartments', damga: 'departmentsVerifiedAt' },
  seviye: { liste: 'educationLevels', damga: 'educationLevelsVerifiedAt' },
  sehir: { liste: 'cities', damga: 'citiesVerifiedAt' },
};

const dizi = (deger) => (Array.isArray(deger) ? deger.filter(Boolean) : []);

/**
 * Bir boyutun doğrulama durumu.
 *
 * @param {object} burs
 * @param {'bolum'|'seviye'|'sehir'} boyut
 */
export function kisitDurumu(burs, boyut) {
  const alan = BOYUTLAR[boyut];
  if (!alan) throw new Error(`bilinmeyen boyut: ${boyut}`);

  const damga = burs?.[alan.damga];
  if (!damga) return DURUM.DOGRULANMADI;
  return dizi(burs?.[alan.liste]).length > 0 ? DURUM.KISITLI : DURUM.KISIT_YOK;
}

/**
 * Öğrencinin bu boyutta bursa uyup uymadığı.
 *
 * @returns {'UYUYOR'|'UYMUYOR'|'BILINMIYOR'}
 */
export function boyutEslesmesi(burs, boyut, ogrenciDegeri) {
  const durum = kisitDurumu(burs, boyut);
  if (durum === DURUM.DOGRULANMADI) return 'BILINMIYOR';
  if (durum === DURUM.KISIT_YOK) return 'UYUYOR';

  /*
    Öğrencinin kendi bilgisi eksikse de karar veremiyoruz: bölümünü
    yazmamış bir öğrenciye "bu burs sana uygun" demek, doğrulanmamış
    bursu uygun saymakla aynı hata.
  */
  if (!ogrenciDegeri) return 'BILINMIYOR';

  const liste = dizi(burs[BOYUTLAR[boyut].liste]);
  return liste.includes(ogrenciDegeri) ? 'UYUYOR' : 'UYMUYOR';
}

/**
 * Burs kişiselleştirmeye girebilir mi?
 *
 * ÖLÇÜT: ÜÇ BOYUTUN DA DOĞRULANMIŞ OLMASI
 * ---------------------------------------
 * Biri bile doğrulanmamışsa "sana uygun" hesabı eksik kalıyor. Örneğin
 * seviyesi doğrulanmış ama bölümü bilinmeyen bir burs, aslında yalnızca
 * hukuk öğrencilerine açık olabilir; bilgisayar mühendisliği öğrencisine
 * "sana uygun" demek yanlış olur.
 *
 * Son başvuru tarihi ayrı tutuluyor: tarih kişiselleştirmenin değil,
 * listelemenin konusu. Burada yalnızca kısıt bilgisi soruluyor.
 */
export function kisisellestirmeyeHazir(burs) {
  return Object.keys(BOYUTLAR).every((boyut) => kisitDurumu(burs, boyut) !== DURUM.DOGRULANMADI);
}

/**
 * Öğrenciye uygun mu?
 *
 * Yalnızca hazır burslarda çalışıyor ve üç boyutun da UYUYOR olmasını
 * istiyor. Tek bir BILINMIYOR bile sonucu false yapıyor.
 *
 * @param {{bolum?: string, seviye?: string, sehir?: string}} ogrenci
 */
export function ogrenciyeUygun(burs, ogrenci) {
  if (!kisisellestirmeyeHazir(burs)) return false;
  return (
    boyutEslesmesi(burs, 'bolum', ogrenci?.bolum) === 'UYUYOR' &&
    boyutEslesmesi(burs, 'seviye', ogrenci?.seviye) === 'UYUYOR' &&
    boyutEslesmesi(burs, 'sehir', ogrenci?.sehir) === 'UYUYOR'
  );
}

/**
 * Yönetici ekranındaki ilerleme sayıları.
 *
 * Hepsi gerçek veriden sayılıyor; uydurma yüzde yok.
 */
export function kapsamaOzeti(burslar = []) {
  const say = (kosul) => burslar.filter(kosul).length;
  return {
    toplam: burslar.length,
    bolumDogrulandi: say((b) => kisitDurumu(b, 'bolum') !== DURUM.DOGRULANMADI),
    seviyeDogrulandi: say((b) => kisitDurumu(b, 'seviye') !== DURUM.DOGRULANMADI),
    sehirDogrulandi: say((b) => kisitDurumu(b, 'sehir') !== DURUM.DOGRULANMADI),
    tutarDogrulandi: say((b) => Boolean(b.amountVerifiedAt)),
    ucBoyutTamam: say(kisisellestirmeyeHazir),
    hicDokunulmamis: say(
      (b) => Object.keys(BOYUTLAR).every((x) => kisitDurumu(b, x) === DURUM.DOGRULANMADI)
    ),
  };
}

/** Yönetici ekranında gösterilecek kısa etiket. */
export const DURUM_ETIKETI = {
  [DURUM.DOGRULANMADI]: 'Doğrulanmadı',
  [DURUM.KISIT_YOK]: 'Kısıt yok',
  [DURUM.KISITLI]: 'Belirli',
};

/**
 * İnceleme sırası.
 *
 * Amaç en az tıklamayla 68 kaydı temizlemek: önce audit önerisi olanlar
 * (karar zaten önünde), sonra son başvurusu yaklaşanlar (kaçırılırsa
 * telafisi yok), sonra hiç dokunulmamışlar.
 */
export function incelemeSirasi(burslar = [], oneriSayisi = {}) {
  const puan = (b) => {
    if (oneriSayisi[b.id]) return 0;
    const kalan = b.applicationDeadline
      ? (new Date(b.applicationDeadline) - Date.now()) / 86400000
      : null;
    if (kalan != null && kalan >= 0 && kalan <= 30) return 1;
    if (Object.keys(BOYUTLAR).every((x) => kisitDurumu(b, x) === DURUM.DOGRULANMADI)) return 2;
    return 3;
  };
  return [...burslar].sort((a, b) => {
    const fark = puan(a) - puan(b);
    if (fark !== 0) return fark;
    return String(a.title ?? '').localeCompare(String(b.title ?? ''), 'tr');
  });
}
