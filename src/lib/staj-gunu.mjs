/**
 * Staj günü hesabı.
 *
 * NEDEN BİLEŞENDEN ÇIKARILDI
 * --------------------------
 * Hesap Araclar.tsx içinde, bir `useMemo` gövdesinin içinde duruyordu.
 * Orada durduğu sürece test edilemiyordu: rehberlerden bu araca yönlendirme
 * yapıyoruz, yani bozulduğunda okuyucuyu çıkmaza sokan bir bağ oluyor.
 * Şimdi saf bir fonksiyon ve tests/staj-gunu.test.mjs onu doğruluyor.
 *
 * KURAL
 * -----
 * Okullar stajı takvim günü değil İŞ GÜNÜ olarak istiyor. Sayılmayanlar:
 * pazar, (işaretlenmediyse) cumartesi, sabit tarihli resmî tatiller ve
 * kullanıcının bildirdiği dinî bayram / idari tatil günleri.
 *
 * Dinî bayramlar her yıl kaydığı için listeye gömülmüyor: gömülen bir
 * tarih bir sonraki yıl sessizce yanlış olur. Kullanıcı gün sayısını
 * kendisi giriyor.
 */

/** Sabit tarihli resmî tatiller: [ay, gün]. */
export const SABIT_TATILLER = [
  [1, 1],
  [4, 23],
  [5, 1],
  [5, 19],
  [7, 15],
  [8, 30],
  [10, 29],
];

/**
 * @param {object} girdi
 * @param {string} girdi.baslangic  YYYY-AA-GG
 * @param {number|string} girdi.gunSayisi  Hedeflenen iş günü
 * @param {boolean} girdi.cumartesi  Cumartesi çalışılıyor mu
 * @param {number|string} girdi.ekTatil  Bayram/idari tatil gün sayısı
 * @returns {{ bitis: Date, atlanan: number, toplamTakvim: number } | null}
 */
export function stajBitisi({ baslangic, gunSayisi, cumartesi = false, ekTatil = 0 }) {
  if (!baslangic) return null;

  const hedef = Number(gunSayisi) || 0;
  if (hedef < 1 || hedef > 400) return null;

  const ek = Math.max(0, Number(ekTatil) || 0);
  const ilkGun = new Date(`${baslangic}T00:00:00`);
  if (Number.isNaN(ilkGun.getTime())) return null;

  const gun = new Date(ilkGun);
  let sayilan = 0;
  let atlanan = 0;
  let ekKalan = ek;
  let guvenlik = 0;
  let sonGun = new Date(gun);

  /*
    Güvenlik sayacı: kullanıcı 400 iş günü girse bile döngü sonlu kalsın.
    Sonsuz döngü tarayıcıyı kilitler ve bunu ancak kullanıcı fark eder.
  */
  while (sayilan < hedef && guvenlik < 2000) {
    guvenlik += 1;
    const haftaninGunu = gun.getDay(); // 0 pazar, 6 cumartesi
    const tatilMi =
      haftaninGunu === 0 ||
      (haftaninGunu === 6 && !cumartesi) ||
      SABIT_TATILLER.some(([ay, g]) => gun.getMonth() + 1 === ay && gun.getDate() === g);

    if (tatilMi) {
      atlanan += 1;
    } else if (ekKalan > 0) {
      /* Bildirilen bayram günleri ilk uygun iş günlerine düşürülüyor. */
      ekKalan -= 1;
      atlanan += 1;
    } else {
      sayilan += 1;
      sonGun = new Date(gun);
    }
    if (sayilan < hedef) gun.setDate(gun.getDate() + 1);
  }

  if (sayilan < hedef) return null;

  const toplamTakvim = Math.round((sonGun.getTime() - ilkGun.getTime()) / 86400000) + 1;
  return { bitis: sonGun, atlanan, toplamTakvim };
}

/** Bugünün tarihi YYYY-AA-GG olarak — tarih alanının başlangıç değeri. */
export function bugununTarihi(now = new Date()) {
  const yil = now.getFullYear();
  const ay = String(now.getMonth() + 1).padStart(2, '0');
  const gun = String(now.getDate()).padStart(2, '0');
  return `${yil}-${ay}-${gun}`;
}

/**
 * Gün gün döküm — takvim görünümü için.
 *
 * NEDEN AYRI FONKSİYON
 * --------------------
 * `stajBitisi` yalnızca sonucu döndürüyor: bitiş tarihi ve kaç gün
 * atlandığı. Kullanıcının asıl sorusu bundan biraz daha büyük — "hangi
 * günler sayılmadı?". Sayı olarak "12 gün çalışılmıyor" demek, o günleri
 * takvimde görmekle aynı şey değil; özellikle bayram günlerini kendisi
 * girdiği için nereye düştüklerini görmek istiyor.
 *
 * İki fonksiyon aynı döngüyü paylaşmıyor ama aynı kuralı uyguluyor;
 * tests/staj-gunu.test.mjs ikisinin aynı bitiş tarihini verdiğini
 * sınıyor, yoksa zamanla ayrışırlar.
 *
 * @param {object} girdi  stajBitisi ile aynı
 * @returns {{ tarih: Date, durum: 'calisma'|'pazar'|'cumartesi'|'resmi'|'bildirilen', sira: number|null }[]}
 */
export function stajTakvimi({ baslangic, gunSayisi, cumartesi = false, ekTatil = 0 }) {
  if (!baslangic) return [];

  const hedef = Number(gunSayisi) || 0;
  if (hedef < 1 || hedef > 400) return [];

  const ilkGun = new Date(`${baslangic}T00:00:00`);
  if (Number.isNaN(ilkGun.getTime())) return [];

  const gun = new Date(ilkGun);
  const gunler = [];
  let sayilan = 0;
  let ekKalan = Math.max(0, Number(ekTatil) || 0);
  let guvenlik = 0;

  while (sayilan < hedef && guvenlik < 2000) {
    guvenlik += 1;
    const haftaninGunu = gun.getDay();
    const resmiMi = SABIT_TATILLER.some(
      ([ay, g]) => gun.getMonth() + 1 === ay && gun.getDate() === g
    );

    let durum;
    let sira = null;
    if (haftaninGunu === 0) durum = 'pazar';
    else if (haftaninGunu === 6 && !cumartesi) durum = 'cumartesi';
    else if (resmiMi) durum = 'resmi';
    else if (ekKalan > 0) {
      ekKalan -= 1;
      durum = 'bildirilen';
    } else {
      sayilan += 1;
      sira = sayilan;
      durum = 'calisma';
    }

    gunler.push({ tarih: new Date(gun), durum, sira });
    if (sayilan < hedef) gun.setDate(gun.getDate() + 1);
  }

  return sayilan < hedef ? [] : gunler;
}
