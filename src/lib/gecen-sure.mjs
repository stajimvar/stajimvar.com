/**
 * "2 dk önce" gibi doğal zaman.
 *
 * Damga UTC geliyor, `Date` yereli çözüyor: fark iki `Date` arasında
 * hesaplandığı için saat dilimi kayması olmuyor. Bir haftadan eskisi
 * için takvim tarihi yazılıyor — "412 saat önce" kimseye bir şey
 * söylemiyor.
 */
export function gecenSure(damga, simdi = new Date()) {
  const t = new Date(damga);
  if (Number.isNaN(t.getTime())) return '';

  const saniye = Math.floor((simdi.getTime() - t.getTime()) / 1000);
  /* İleri tarihli damga (saat farkı, sunucu sapması): "şimdi". */
  if (saniye < 60) return 'şimdi';

  const dakika = Math.floor(saniye / 60);
  if (dakika < 60) return `${dakika} dk önce`;

  /*
    SAAT DEĞİL, TAKVİM GÜNÜ

    Önce saat sayılıyordu ve "20 saat önce" yazıyordu; oysa dün öğleden
    sonra olan bir şey için insanlar "dün" der. Ölçü takvim günü farkı:
    aynı gün içindeyken saat, sonrasında gün.
  */
  const gun0 = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());
  const gun1 = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const gunFarki = Math.round((gun0.getTime() - gun1.getTime()) / 86400000);

  const saat = Math.floor(dakika / 60);
  if (gunFarki === 0) return `${saat} saat önce`;
  if (gunFarki === 1) return 'dün';
  if (gunFarki < 7) return `${gunFarki} gün önce`;

  return t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}
