/**
 * Resmî tatiller — yıl bazlı tek kaynak.
 *
 * NEDEN YIL BAZLI
 * ---------------
 * Staj günü aracı yalnızca sabit tarihli tatilleri (1 Ocak, 23 Nisan, …)
 * biliyordu. Dinî bayramlar kamerî takvimle her yıl yaklaşık 11 gün geriye
 * kaydığı için listeye yazılmamış, "kaç gün bayram tatili var" sorusu
 * kullanıcıya bırakılmıştı. Öğrencinin Ramazan Bayramı'nın hangi güne
 * düştüğünü bilip elle girmesi bekleniyordu; bilmiyorsa hesap sessizce
 * yanlış çıkıyordu.
 *
 * Bayram tarihleri hesaplanabilir değil, İLAN EDİLİR: Diyanet İşleri
 * Başkanlığı'nın dinî günler takvimi resmî kaynaktır. Kamerî takvimi
 * kodda yaklaşık bir formülle üretmek bir gün kayma riski taşır ve o kayma
 * öğrencinin staj bitiş tarihini yanlış gösterir. O yüzden tarihler
 * yazılı — ama tek yerde ve kaynağıyla birlikte.
 *
 * YENİ YIL EKLEME
 * ---------------
 * `YILLAR` nesnesine yeni bir yıl ekle, `dogrulandi` alanına tarih yaz.
 * Yapılandırılmamış bir yıl için hesap YAPILMIYOR (bkz. `yilKapsamda`):
 * eksik tatil listesiyle üretilen bitiş tarihi, hiç tarih vermemekten
 * daha kötü.
 *
 * YARIM GÜNLER
 * ------------
 * 2429 sayılı Ulusal Bayram ve Genel Tatiller Hakkında Kanun'a göre
 * arife günleri saat 13.00'ten sonra ve 29 Ekim'den önceki gün (28 Ekim)
 * saat 13.00'ten sonra tatildir. Staj İŞ GÜNÜ sayıldığı için yarım gün
 * çalışılan bir gündür: tam gün sayılmaz, sıfır da sayılmaz. Araç bunları
 * `yarim` olarak işaretliyor ve 0,5 iş günü sayıyor.
 */

export const KAYNAK = {
  kanun: {
    etiket: '2429 sayılı Ulusal Bayram ve Genel Tatiller Hakkında Kanun',
    adres: 'https://www.mevzuat.gov.tr/mevzuatmetin/1.5.2429.pdf',
  },
  diyanet: {
    etiket: 'Diyanet İşleri Başkanlığı dinî günler takvimi',
    adres: 'https://vakithesaplama.diyanet.gov.tr/dinigunler.php',
  },
};

/** Her yıl aynı tarihte olan ulusal bayram ve genel tatiller: [ay, gün, ad]. */
const SABIT = [
  [1, 1, 'Yılbaşı'],
  [4, 23, 'Ulusal Egemenlik ve Çocuk Bayramı'],
  [5, 1, 'Emek ve Dayanışma Günü'],
  [5, 19, 'Atatürk’ü Anma, Gençlik ve Spor Bayramı'],
  [7, 15, 'Demokrasi ve Millî Birlik Günü'],
  [8, 30, 'Zafer Bayramı'],
  [10, 29, 'Cumhuriyet Bayramı'],
];

/** 28 Ekim öğleden sonra yarım gün — her yıl aynı. */
const SABIT_YARIM = [[10, 28, 'Cumhuriyet Bayramı arifesi (öğleden sonra)']];

/**
 * Dinî bayramlar. Tarihler Diyanet takviminden alındı.
 * Arife günleri yarım, bayram günleri tam tatil.
 */
const YILLAR = {
  2026: {
    dogrulandi: '2026-09-03',
    tam: [
      ['2026-03-20', 'Ramazan Bayramı 1. gün'],
      ['2026-03-21', 'Ramazan Bayramı 2. gün'],
      ['2026-03-22', 'Ramazan Bayramı 3. gün'],
      ['2026-05-27', 'Kurban Bayramı 1. gün'],
      ['2026-05-28', 'Kurban Bayramı 2. gün'],
      ['2026-05-29', 'Kurban Bayramı 3. gün'],
      ['2026-05-30', 'Kurban Bayramı 4. gün'],
    ],
    yarim: [
      ['2026-03-19', 'Ramazan Bayramı arifesi (öğleden sonra)'],
      ['2026-05-26', 'Kurban Bayramı arifesi (öğleden sonra)'],
    ],
  },
  2027: {
    dogrulandi: '2026-09-03',
    tam: [
      ['2027-03-09', 'Ramazan Bayramı 1. gün'],
      ['2027-03-10', 'Ramazan Bayramı 2. gün'],
      ['2027-03-11', 'Ramazan Bayramı 3. gün'],
      ['2027-05-16', 'Kurban Bayramı 1. gün'],
      ['2027-05-17', 'Kurban Bayramı 2. gün'],
      ['2027-05-18', 'Kurban Bayramı 3. gün'],
      ['2027-05-19', 'Kurban Bayramı 4. gün'],
    ],
    yarim: [
      ['2027-03-08', 'Ramazan Bayramı arifesi (öğleden sonra)'],
      ['2027-05-15', 'Kurban Bayramı arifesi (öğleden sonra)'],
    ],
  },
};

/** Dinî bayram tarihleri yazılı olan yıllar. */
export const KAPSANAN_YILLAR = Object.keys(YILLAR).map(Number).sort();

/** Bu yıl için dinî bayram tarihleri elimizde mi. */
export function yilKapsamda(yil) {
  return Object.prototype.hasOwnProperty.call(YILLAR, String(yil));
}

const ikiHane = (n) => String(n).padStart(2, '0');
/** Yerel tarihi YYYY-AA-GG'ye çevirir. `toISOString` UTC'ye kaydırıyor. */
export const anahtar = (d) =>
  `${d.getFullYear()}-${ikiHane(d.getMonth() + 1)}-${ikiHane(d.getDate())}`;

/**
 * Bir yılın bütün resmî tatilleri.
 *
 * @returns {Map<string, {ad: string, yarim: boolean}>} YYYY-AA-GG → tatil
 */
export function yilinTatilleri(yil) {
  const harita = new Map();
  for (const [ay, gun, ad] of SABIT)
    harita.set(`${yil}-${ikiHane(ay)}-${ikiHane(gun)}`, { ad, yarim: false });
  for (const [ay, gun, ad] of SABIT_YARIM)
    harita.set(`${yil}-${ikiHane(ay)}-${ikiHane(gun)}`, { ad, yarim: true });

  const kayit = YILLAR[String(yil)];
  if (kayit) {
    for (const [tarih, ad] of kayit.tam) harita.set(tarih, { ad, yarim: false });
    /*
      Yarım günler tamların ARDINDAN yazılıyor: bir arife günü aynı zamanda
      sabit bir tatile denk gelirse (örneğin 28 Ekim), tam gün tatil olan
      kayıt kazanmalı. Bu yüzden önce tam, sonra yarım YAZILMIYOR — tersi
      olurdu. Burada yarım yalnızca haritada olmayan güne ekleniyor.
    */
    for (const [tarih, ad] of kayit.yarim)
      if (!harita.has(tarih) || harita.get(tarih).yarim) harita.set(tarih, { ad, yarim: true });
  }
  return harita;
}

/** Tarih aralığındaki bütün yılların tatilleri tek haritada. */
export function araliginTatilleri(baslangicYil, bitisYil) {
  const harita = new Map();
  for (let y = baslangicYil; y <= bitisYil; y += 1)
    for (const [k, v] of yilinTatilleri(y)) harita.set(k, v);
  return harita;
}
