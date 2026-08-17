/**
 * 2025-YKS resmî sayısal bilgileri.
 *
 * KAYNAK
 * ------
 * ÖSYM, "2025-YKS Sınav Sonuçlarına İlişkin Sayısal Bilgiler"
 * https://dokuman.osym.gov.tr/pdfdokuman/2025/YKS/sayisalbilgiler_tayd21072025.pdf
 * Sayfa 3  → testlerin ortalama ve standart sapmaları
 * Sayfa 12 → sınav puanlarının yığınsal dağılımı
 * Sayfa 13 → yerleştirme puanlarının yığınsal dağılımı
 *
 * Sayılar PDF'ten olduğu gibi alındı; elle yuvarlama veya düzeltme yapılmadı.
 *
 * NEDEN "TAHMİNİ" DİYORUZ
 * ----------------------
 * Bu tablo 2025 sınavına ait. Bir öğrenci 2026 puanını girdiğinde ona
 * gösterdiğimiz şey "2025'te bu puan kaçıncı sıraya denk geliyordu"
 * bilgisidir — 2026'daki yeri değil. Sınavın zorluğu ve aday sayısı her yıl
 * değiştiği için sıralama da kayıyor. Arayüzde bu açıkça yazıyor.
 *
 * NEDEN NETTEN PUAN HESAPLAMIYORUZ
 * --------------------------------
 * ÖSYM puanı iki aşamalı standartlaştırmayla üretiyor ve ikinci aşamada
 * kullanılan ağırlıklı puan dağılımının ortalama/standart sapmasını
 * yayınlamıyor. O sayı olmadan netten puana geçiş ancak uydurma bir
 * katsayıyla yapılır. Öğrenci puanını zaten ÖSYM'den biliyor; biz o puanın
 * neye denk geldiğini söylüyoruz.
 */

export const YKS_KAYNAK = {
  yil: 2025,
  baslik: '2025-YKS Sınav Sonuçlarına İlişkin Sayısal Bilgiler',
  url: 'https://dokuman.osym.gov.tr/pdfdokuman/2025/YKS/sayisalbilgiler_tayd21072025.pdf',
};

export type PuanTuru = 'TYT' | 'SAY' | 'SOZ' | 'EA' | 'DIL';

export const PUAN_TURU_ADI: Record<PuanTuru, string> = {
  TYT: 'TYT',
  SAY: 'Sayısal',
  SOZ: 'Sözel',
  EA: 'Eşit Ağırlık',
  DIL: 'Dil',
};

/**
 * Yığınsal dağılım satırı: [puan eşiği, TYT, SAY, SÖZ, EA, DİL]
 * Değerler "bu puan ve üstünde olan aday sayısı".
 */
export type DagilimSatiri = [number, number, number, number, number, number];

/** Sayfa 12 — sınav puanları (OBP eklenmemiş ham sınav puanı). */
export const SINAV_DAGILIMI: DagilimSatiri[] = [
  [500, 1, 1, 1, 1, 5],
  [480, 180, 701, 4, 32, 66],
  [460, 2050, 4715, 21, 175, 410],
  [440, 8163, 12449, 76, 560, 1231],
  [420, 21061, 24779, 227, 1325, 2880],
  [400, 44193, 40857, 652, 2823, 5789],
  [380, 79260, 60085, 1782, 6028, 10552],
  [360, 127655, 81946, 4912, 15691, 17443],
  [340, 193064, 106251, 12653, 35436, 25724],
  [320, 282276, 134493, 29315, 68083, 34564],
  [300, 404024, 169418, 60680, 115961, 43840],
  [280, 570335, 213365, 115851, 185253, 53317],
  [260, 794784, 270804, 205996, 285967, 63300],
  [240, 1073527, 348345, 338388, 431085, 73733],
  [220, 1379866, 458302, 515827, 629436, 85010],
  [200, 1686626, 627659, 723293, 875112, 97273],
  [180, 1977665, 892884, 920945, 1134243, 111159],
  [160, 2210463, 1149472, 1070609, 1350772, 125793],
  [140, 2303695, 1277493, 1155714, 1474465, 135895],
  [120, 2310493, 1291435, 1173742, 1494355, 140051],
  [100, 2310579, 1291531, 1174047, 1494612, 140657],
];

/** Sayfa 13 — yerleştirme puanları (OBP dahil; tercihte kullanılan puan). */
export const YERLESTIRME_DAGILIMI: DagilimSatiri[] = [
  [550, 14, 57, 1, 4, 12],
  [530, 601, 1930, 7, 58, 151],
  [510, 3648, 7081, 26, 261, 596],
  [490, 11733, 16140, 77, 742, 1606],
  [470, 27141, 29410, 254, 1629, 3514],
  [450, 52500, 46142, 721, 3422, 6543],
  [430, 88915, 65449, 1926, 8145, 11267],
  [410, 137133, 87117, 5036, 20244, 17830],
  [390, 201126, 111498, 12522, 42590, 25711],
  [370, 286158, 139619, 28323, 76959, 34148],
  [350, 397823, 174355, 57848, 125389, 43151],
  [330, 545280, 217778, 108894, 192949, 52414],
  [310, 737144, 274252, 190203, 287630, 62210],
  [290, 976188, 348397, 309551, 418975, 72337],
  [270, 1251236, 449880, 468930, 592803, 83162],
  [250, 1542701, 596635, 658973, 806796, 94736],
  [230, 1835041, 811201, 849410, 1042314, 107318],
  [210, 2099883, 1052783, 1010174, 1262545, 120937],
  [190, 2270224, 1228141, 1121933, 1425544, 132272],
  [170, 2308495, 1287932, 1168866, 1489209, 138558],
  [150, 2310553, 1291491, 1173955, 1494521, 140478],
  [130, 2310579, 1291531, 1174046, 1494611, 140655],
  [115, 2310579, 1291531, 1174047, 1494612, 140657],
];

const SUTUN: Record<PuanTuru, number> = { TYT: 1, SAY: 2, SOZ: 3, EA: 4, DIL: 5 };

export interface SiralamaSonucu {
  siralama: number;
  /** Tablonun kapsadığı aralığın dışındaysak bunu söylüyoruz. */
  sinirDisi: 'ust' | 'alt' | null;
  /** Bu puan türünde sınavı geçerli olan toplam aday. */
  toplamAday: number;
}

/**
 * Verilen puanın 2025'te hangi sıraya denk geldiğini kestirir.
 *
 * Tablo 20 puanlık basamaklarla veriliyor; aradaki değerler için basamağın iki
 * ucu arasında ara değer hesaplıyoruz. Aday sayısı puan düştükçe üstel biçimde
 * arttığı için doğrusal değil LOGARİTMİK ara değer kullanıyoruz: 480 ile 460
 * arasında aday sayısı 180'den 2.050'ye çıkıyor: doğrusal ara değer 470 için
 * 1.115 derdi, logaritmik ~608 diyor ve gerçeğe çok daha yakın duruyor.
 */
export function siralamaTahmin(
  puan: number,
  tur: PuanTuru,
  tablo: DagilimSatiri[]
): SiralamaSonucu | null {
  if (!Number.isFinite(puan)) return null;

  const s = SUTUN[tur];
  const toplamAday = tablo[tablo.length - 1][s];

  // Tablonun üstünde: en yüksek eşiğin de üstünde bir puan.
  if (puan >= tablo[0][0]) {
    return { siralama: Math.max(1, tablo[0][s]), sinirDisi: 'ust', toplamAday };
  }
  // Tablonun altında: herkesin altında.
  if (puan <= tablo[tablo.length - 1][0]) {
    return { siralama: toplamAday, sinirDisi: 'alt', toplamAday };
  }

  for (let i = 0; i < tablo.length - 1; i++) {
    const [ustPuan, ...ustSatir] = tablo[i];
    const [altPuan, ...altSatir] = tablo[i + 1];
    if (puan < ustPuan && puan >= altPuan) {
      const ustAday = Math.max(1, ustSatir[s - 1]);
      const altAday = Math.max(1, altSatir[s - 1]);
      const oran = (ustPuan - puan) / (ustPuan - altPuan);
      const deger = Math.exp(
        Math.log(ustAday) + oran * (Math.log(altAday) - Math.log(ustAday))
      );
      return { siralama: Math.max(1, Math.round(deger)), sinirDisi: null, toplamAday };
    }
  }
  return null;
}

/* ------------------------------------------------- testlerin ortalamaları */

export interface TestIstatistigi {
  ad: string;
  soru: number;
  /** Tüm adaylar için ortalama ham puan (net). */
  ortalama: number;
}

/**
 * Sayfa 3, "Tüm Adaylar" sütunu. Net hesaplama ekranında kişinin netini
 * ülke ortalamasıyla karşılaştırmak için kullanılıyor — puan hesaplamak
 * için değil.
 */
export const TEST_ORTALAMALARI: Record<string, TestIstatistigi> = {
  Türkçe: { ad: 'Türkçe', soru: 40, ortalama: 21.243 },
  'Sosyal Bilimler': { ad: 'Sosyal Bilimler', soru: 20, ortalama: 9.496 },
  'Temel Matematik': { ad: 'Temel Matematik', soru: 40, ortalama: 6.006 },
  'Fen Bilimleri': { ad: 'Fen Bilimleri', soru: 20, ortalama: 4.122 },
  Matematik: { ad: 'Matematik', soru: 40, ortalama: 6.798 },
  Fizik: { ad: 'Fizik', soru: 14, ortalama: 2.442 },
  Kimya: { ad: 'Kimya', soru: 13, ortalama: 1.758 },
  Biyoloji: { ad: 'Biyoloji', soru: 13, ortalama: 2.596 },
  'Türk Dili ve Edebiyatı': { ad: 'Türk Dili ve Edebiyatı', soru: 24, ortalama: 6.63 },
  'Tarih-1': { ad: 'Tarih-1', soru: 10, ortalama: 2.243 },
  'Coğrafya-1': { ad: 'Coğrafya-1', soru: 6, ortalama: 1.436 },
  'Tarih-2': { ad: 'Tarih-2', soru: 11, ortalama: 1.426 },
  'Coğrafya-2': { ad: 'Coğrafya-2', soru: 11, ortalama: 2.635 },
  'Felsefe Grubu': { ad: 'Felsefe Grubu', soru: 12, ortalama: 1.918 },
  'Din Kültürü': { ad: 'Din Kültürü', soru: 6, ortalama: 1.473 },
};
