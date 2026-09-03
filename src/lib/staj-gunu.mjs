/**
 * Staj günü hesabı.
 *
 * NEDEN BİLEŞENDEN ÇIKARILDI
 * --------------------------
 * Hesap Araclar.tsx içinde, bir `useMemo` gövdesinin içinde duruyordu.
 * Orada durduğu sürece test edilemiyordu: rehberlerden bu araca yönlendirme
 * yapıyoruz, yani bozulduğunda okuyucuyu çıkmaza sokan bir bağ oluyor.
 *
 * KURAL
 * -----
 * Okullar stajı takvim günü değil İŞ GÜNÜ olarak istiyor. Sayılmayanlar:
 * pazar, (işaretlenmediyse) cumartesi ve resmî tatiller. Arife günleri
 * yarım sayılıyor (0,5 iş günü).
 *
 * TATİLLER ARTIK OTOMATİK
 * -----------------------
 * Önce yalnızca sabit tarihli tatiller biliniyordu; Ramazan ve Kurban
 * bayramları "ek tatil günü" kutusuna kullanıcının elle girmesi
 * bekleniyordu. Öğrenci bayramın hangi güne düştüğünü bilmiyorsa hesap
 * sessizce yanlış çıkıyordu. Dinî bayramlar da dahil bütün resmî tatiller
 * lib/resmi-tatiller.mjs'ten geliyor; kullanıcıya yalnızca KURUMA ÖZEL
 * ek izin girişi kaldı.
 *
 * TEK DÖNGÜ
 * ---------
 * `stajBitisi` ve `stajTakvimi` ayrı döngülerdi ve "aynı kuralı uyguluyor"
 * diye not düşülmüştü — yani zamanla ayrışabilecekleri biliniyordu. İkisi
 * de artık `stajPlani`'nı sarıyor; kural tek yerde.
 */
import { araliginTatilleri, anahtar, yilKapsamda } from './resmi-tatiller.mjs';

/**
 * Sabit tarihli resmî tatiller — geriye dönük uyumluluk için duruyor.
 * Gerçek liste artık lib/resmi-tatiller.mjs'te ve dinî bayramları da içeriyor.
 */
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
 * Stajın gün gün planı.
 *
 * @param {object} girdi
 * @param {string} girdi.baslangic  YYYY-AA-GG
 * @param {number|string} girdi.gunSayisi  Hedeflenen iş günü
 * @param {boolean} girdi.cumartesi  Cumartesi çalışılıyor mu
 * @param {number|string} girdi.ekTatil  Kuruma özel ek izin (gün)
 * @returns {{gunler: Array, bitis: Date, atlanan: number, toplamTakvim: number,
 *            cikarilanlar: Array, kapsamDisiYil: number|null} | null}
 */
export function stajPlani({ baslangic, gunSayisi, cumartesi = false, ekTatil = 0 }) {
  if (!baslangic) return null;

  const hedef = Number(gunSayisi) || 0;
  if (hedef < 1 || hedef > 400) return null;

  const ilkGun = new Date(`${baslangic}T00:00:00`);
  if (Number.isNaN(ilkGun.getTime())) return null;

  /*
    Staj yıl sınırını aşabiliyor (Aralık'ta başlayan 60 iş günlük staj).
    Tatil haritası başlangıç yılından iki yıl sonrasına kadar kuruluyor.
  */
  const ilkYil = ilkGun.getFullYear();
  const tatiller = araliginTatilleri(ilkYil, ilkYil + 2);

  const gun = new Date(ilkGun);
  const gunler = [];
  const cikarilanlar = [];
  let sayilan = 0;
  let atlanan = 0;
  let ekKalan = Math.max(0, Number(ekTatil) || 0);
  let guvenlik = 0;
  let sonGun = new Date(gun);
  let kapsamDisiYil = null;

  /*
    Güvenlik sayacı: kullanıcı 400 iş günü girse bile döngü sonlu kalsın.
    Sonsuz döngü tarayıcıyı kilitler ve bunu ancak kullanıcı fark eder.
  */
  while (sayilan < hedef && guvenlik < 3000) {
    guvenlik += 1;
    const haftaninGunu = gun.getDay(); // 0 pazar, 6 cumartesi
    const gunAnahtari = anahtar(gun);
    const tatil = tatiller.get(gunAnahtari);

    /* Dinî bayram tarihi yazılı olmayan bir yıla girdiysek bunu söylüyoruz. */
    if (!yilKapsamda(gun.getFullYear()) && kapsamDisiYil === null)
      kapsamDisiYil = gun.getFullYear();

    let durum;
    let sira = null;
    let ad = null;

    if (haftaninGunu === 0) {
      durum = 'pazar';
      /*
        Hafta sonuna denk gelen bayram günü yine hafta sonu sayılıyor
        (zaten çalışılmıyor), ama ADI bayramın adı oluyor. "Neden
        çıkarıldı" listesinde 21 Mart'a "Cumartesi" yazmak doğru ama eksik;
        o gün aynı zamanda Ramazan Bayramı'nın ikinci günü.
      */
      ad = tatil ? tatil.ad : 'Pazar';
    } else if (haftaninGunu === 6 && !cumartesi) {
      durum = 'cumartesi';
      ad = tatil ? tatil.ad : 'Cumartesi';
    } else if (tatil && !tatil.yarim) {
      durum = 'resmi';
      ad = tatil.ad;
    } else if (ekKalan > 0) {
      ekKalan -= 1;
      durum = 'bildirilen';
      ad = 'Kuruma özel izin';
    } else if (tatil && tatil.yarim) {
      /* Arife: yarım gün çalışılıyor, yarım gün sayılıyor. */
      sayilan += 0.5;
      sira = sayilan;
      durum = 'yarim';
      ad = tatil.ad;
      sonGun = new Date(gun);
    } else {
      sayilan += 1;
      sira = sayilan;
      durum = 'calisma';
      sonGun = new Date(gun);
    }

    if (durum !== 'calisma' && durum !== 'yarim') {
      atlanan += 1;
      cikarilanlar.push({ tarih: new Date(gun), durum, ad });
    } else if (durum === 'yarim') {
      cikarilanlar.push({ tarih: new Date(gun), durum, ad });
    }

    gunler.push({ tarih: new Date(gun), durum, sira, ad });
    if (sayilan < hedef) gun.setDate(gun.getDate() + 1);
  }

  if (sayilan < hedef) return null;

  const toplamTakvim = Math.round((sonGun.getTime() - ilkGun.getTime()) / 86400000) + 1;
  return { gunler, bitis: sonGun, atlanan, toplamTakvim, cikarilanlar, kapsamDisiYil };
}

/**
 * @param {object} girdi
 * @param {string} girdi.baslangic  YYYY-AA-GG
 * @param {number|string} girdi.gunSayisi  Hedeflenen iş günü
 * @param {boolean} girdi.cumartesi  Cumartesi çalışılıyor mu
 * @param {number|string} girdi.ekTatil  Kuruma özel ek izin
 * @returns {{ bitis: Date, atlanan: number, toplamTakvim: number,
 *             cikarilanlar: {tarih: Date, durum: string, ad: string}[],
 *             kapsamDisiYil: number|null } | null}
 */
export function stajBitisi(girdi) {
  const plan = stajPlani(girdi);
  if (!plan) return null;
  const { bitis, atlanan, toplamTakvim, cikarilanlar, kapsamDisiYil } = plan;
  return { bitis, atlanan, toplamTakvim, cikarilanlar, kapsamDisiYil };
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
export function stajTakvimi(girdi) {
  const plan = stajPlani(girdi);
  return plan ? plan.gunler : [];
}
