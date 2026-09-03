/**
 * Net hesabı: doğru, yanlış ve satır geçerliliği.
 *
 * NEDEN AYRI
 * ----------
 * Kural bileşenin içindeydi ve şöyle davranıyordu: doğru ile yanlış toplamı
 * soru sayısını aşınca satır `asim` diye işaretleniyor, ekranda uyarı
 * çıkıyor — ama net YİNE HESAPLANIP TOPLAMA EKLENİYORDU. Yani araç hem
 * "bu satır hatalı" diyor hem o satırın netini toplama katıyordu. Uyarıyı
 * okumayan öğrenci, olmayan bir neti kendi neti sanıyordu.
 *
 * Geçersiz satırın neti artık yok (null). Toplama girmiyor, ekranda "—"
 * görünüyor ve genel sonuç da hesaplanmıyor.
 *
 * Girdi METİN olarak alınıyor: "boş" ile "sıfır" farklı şeyler ve bunu
 * sayıya çevirdikten sonra ayırt etmek mümkün değil.
 */

/**
 * Tek dersin satırı.
 *
 * @returns {{gecerli: boolean, bos: boolean, net: number|null, dogru: number,
 *            yanlis: number, hata: string|null}}
 */
export function satirNeti(soru, dogruMetin, yanlisMetin) {
  const d = sayiCoz(dogruMetin);
  const y = sayiCoz(yanlisMetin);
  const bos = d.bos && y.bos;

  if (!Number.isInteger(soru) || soru <= 0)
    return red(0, 0, 'Soru sayısı tanımsız.');

  if (!d.gecerli) return red(0, 0, `Doğru sayısı ${d.hata}`);
  if (!y.gecerli) return red(0, 0, `Yanlış sayısı ${y.hata}`);

  const dogru = d.deger;
  const yanlis = y.deger;

  if (dogru + yanlis > soru)
    return red(dogru, yanlis, `Doğru ve yanlış toplamı ${soru} soruyu aşıyor.`);

  /* Dört yanlış bir doğruyu götürüyor; her iki sınavda da aynı. */
  const net = Math.max(0, dogru - yanlis / 4);
  return { gecerli: true, bos, net, dogru, yanlis, hata: null };
}

function red(dogru, yanlis, hata) {
  return { gecerli: false, bos: false, net: null, dogru, yanlis, hata };
}

function sayiCoz(metin) {
  const ham = String(metin ?? '').trim();
  if (!ham) return { gecerli: true, bos: true, deger: 0, hata: null };
  if (!/^\d+$/.test(ham)) {
    if (/^-/.test(ham)) return { gecerli: false, bos: false, deger: 0, hata: 'negatif olamaz.' };
    if (/[.,]/.test(ham))
      return { gecerli: false, bos: false, deger: 0, hata: 'tam sayı olmalı.' };
    return { gecerli: false, bos: false, deger: 0, hata: 'yalnızca rakam olmalı.' };
  }
  return { gecerli: true, bos: false, deger: Number(ham), hata: null };
}

/**
 * Toplam net.
 *
 * Tek bir satır bile geçersizse TOPLAM ÜRETİLMİYOR. Geçersiz satırı atlayıp
 * kalanı toplamak, öğrenciye eksik bir toplamı tam gibi gösterirdi.
 *
 * @returns {{gecerli: boolean, toplam: number|null, gecersizSayisi: number}}
 */
export function toplamNet(satirlar) {
  const gecersiz = satirlar.filter((s) => !s.gecerli);
  if (gecersiz.length > 0)
    return { gecerli: false, toplam: null, gecersizSayisi: gecersiz.length };
  const toplam = satirlar.reduce((t, s) => t + (s.net ?? 0), 0);
  return { gecerli: true, toplam, gecersizSayisi: 0 };
}
