/**
 * BİLDİRİM ZAMAN GRUPLARI — Instagram'daki "Bugün / Son 7 gün / Son 30 gün"
 *
 * Ölçü `gecenSure` ile aynı: saat değil TAKVİM GÜNÜ farkı, tarayıcının
 * yerel saatine göre. Aynı bildirim satırda "dün" yazarken başka bir
 * grupta durmasın diye iki işlev aynı gün hesabını kullanıyor.
 *
 * Gruplar sıralı ve boş grup başlığı çizilmiyor (`bildirimleriGrupla`
 * yalnız dolu grupları döndürüyor).
 */

export const BILDIRIM_GRUPLARI = ['Bugün', 'Dün', 'Son 7 gün', 'Son 30 gün', 'Daha önce'];

function gunFarki(damga, simdi) {
  const t = new Date(damga);
  if (Number.isNaN(t.getTime())) return null;
  const gun0 = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());
  const gun1 = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((gun0.getTime() - gun1.getTime()) / 86400000);
}

/** Tek bildirimin grubu. Geçersiz ya da ileri tarihli damga "Bugün" sayılıyor. */
export function bildirimGrubu(damga, simdi = new Date()) {
  const fark = gunFarki(damga, simdi);
  if (fark === null || fark <= 0) return 'Bugün';
  if (fark === 1) return 'Dün';
  if (fark < 7) return 'Son 7 gün';
  if (fark < 30) return 'Son 30 gün';
  return 'Daha önce';
}

/**
 * Listeyi sırası bozulmadan gruplara ayırır. Liste zaten yeniden eskiye
 * sıralı geliyor (`bildirimleriGetir`); burada yeniden sıralanmıyor.
 */
export function bildirimleriGrupla(bildirimler, simdi = new Date()) {
  const kovalar = new Map(BILDIRIM_GRUPLARI.map((ad) => [ad, []]));
  for (const b of bildirimler) kovalar.get(bildirimGrubu(b.tarih, simdi)).push(b);
  return BILDIRIM_GRUPLARI.filter((ad) => kovalar.get(ad).length > 0).map((ad) => ({
    baslik: ad,
    ogeler: kovalar.get(ad),
  }));
}
