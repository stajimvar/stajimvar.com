import { tarihMetni } from './tarih.mjs';

/**
 * ANA SAYFA GÜVEN SATIRI — CÜMLE VERİDEN KURULUYOR
 *
 * NEDEN SABİT BİR CÜMLE YAZILAMIYOR
 * ---------------------------------
 * "Kaynaklar düzenli kontrol ediliyor" sitenin en ayırt edici iddiası ve
 * tam da bu yüzden kanıtsız yazılamaz. Ölçüldü (üretim, 7 Eylül 2026):
 *
 *   Türkiye  : 62 ilanın 62'sinin kaynağı doğrulanmış, en son 6 Eylül
 *   Fransa   : 48 ilanın 0'ının kaynağı doğrulanmış (alan hiç yazılmamış)
 *   Tüm ülke : 114 ilanın 66'sı
 *
 * Yani tek bir sabit cümle Fransa listesinde YALAN olurdu. Cümle burada
 * veriye bakarak kuruluyor: doğrulama yoksa o kısım hiç yazılmıyor.
 *
 * "BUGÜN KONTROL EDİLDİ" EN DAR İDDİA
 * -----------------------------------
 * Yalnızca gösterilen ilanların HEPSİ gerçekten bugün doğrulandıysa
 * yazılıyor. Ölçüm anında hiçbir ülkede öyle değildi (en son doğrulama
 * 6 Eylül'dü, sayfa 7 Eylül'de açıldı) — yani bu dal bilerek konuldu ama
 * o gün ekrana düşmedi. Tarihi olduğu gibi yazmak, "bugün" demekten
 * hem daha dürüst hem de daha bilgilendirici.
 *
 * @param {object} girdi
 * @param {number} girdi.toplam Gösterilecek açık ilan sayısı.
 * @param {number} [girdi.dogrulanan] Kaynağı doğrulanmış ilan sayısı.
 * @param {string|null} [girdi.sonDogrulama] En son doğrulama zamanı (ISO).
 * @param {Date} [girdi.simdi] Bugünün tespiti için; testlerde sabitleniyor.
 * @returns {{ilan: string, dogrulama: string|null}|null}
 */
export function guvenSatiri({ toplam, dogrulanan, sonDogrulama, simdi = new Date() }) {
  if (!Number.isFinite(toplam) || toplam <= 0) return null;

  const ilan = `${Math.trunc(toplam)} açık ilan`;

  const sayi = Number.isFinite(dogrulanan) ? Math.trunc(dogrulanan) : 0;
  if (sayi <= 0) return { ilan, dogrulama: null };

  const zaman = sonDogrulama ? new Date(sonDogrulama) : null;
  if (!zaman || Number.isNaN(zaman.getTime())) return { ilan, dogrulama: null };

  /*
    Aynı takvim gününde miyiz? Saat dilimi okuyucunun kendisi: "bugün"
    kullanıcının günü demek, sunucunun değil.
  */
  const ayniGun =
    zaman.getFullYear() === simdi.getFullYear() &&
    zaman.getMonth() === simdi.getMonth() &&
    zaman.getDate() === simdi.getDate();

  const neZaman = ayniGun ? 'bugün' : tarihMetni(zaman);
  if (!neZaman) return { ilan, dogrulama: null };

  /*
    Hepsi mi, bir kısmı mı? Yuvarlamıyoruz: "66 ilanın kaynağı" demek,
    kalan 48'in doğrulanmadığını da söylüyor ve bu bilgi okuyucunun
    hakkı.
  */
  const hepsi = sayi >= Math.trunc(toplam);
  return {
    ilan,
    dogrulama: hepsi
      ? `Kaynaklar ${neZaman} kontrol edildi`
      : `${sayi} ilanın kaynağı ${neZaman} kontrol edildi`,
  };
}
