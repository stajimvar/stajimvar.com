/**
 * MESAJ EKRANININ SAF KURALLARI
 *
 * Bileşenden ayrı ve saf: hepsi `node --test` ile doğrudan ölçülüyor.
 * Tarih biçimi `tarih.mjs`ten (depo kuralı: elle `toLocaleDateString`
 * yazılmıyor); göreli zaman sitenin başka yerlerindeki `gecenSure` ile
 * aynı.
 */
import { tarihMetni } from './tarih.mjs';

/** İki damga aynı YEREL takvim gününde mi. */
export function ayniGunMu(a, b) {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
  );
}

/**
 * Tarih ayracı: "Bugün", "Dün" ya da takvim tarihi ("6 Eylül 2026").
 * Ölçü takvim günü farkı, saat farkı değil — dün gece 23:50'deki mesaj
 * 10 dakika önce olsa da "Dün".
 */
export function gunAyraci(damga, simdi = new Date()) {
  const t = new Date(damga);
  if (Number.isNaN(t.getTime())) return '';
  if (ayniGunMu(t, simdi)) return 'Bugün';
  const dun = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() - 1);
  if (ayniGunMu(t, dun)) return 'Dün';
  return tarihMetni(t) ?? '';
}

/** Balonun altındaki saat: "14:05" (okuyucunun saat diliminde; mesaj bir an). */
export function saatMetni(damga) {
  const t = new Date(damga);
  if (Number.isNaN(t.getTime())) return '';
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(t);
}

/**
 * "Görüldü" gösterilsin mi?
 *
 * Yalnız EN SON KENDİ mesajım için ve yalnız karşı tarafın okuma anı o
 * mesajdan sonraysa. Okuma anı yoksa (istek aşamasında sunucu vermiyor,
 * ya da hiç okunmadı) HİÇBİR ZAMAN — "görülmedi" diye bir etiket de yok.
 *
 * @param {string | null | undefined} sonKendiMesajAni
 * @param {string | null | undefined} karsiOkunduAni
 */
export function gorulduMu(sonKendiMesajAni, karsiOkunduAni) {
  if (!sonKendiMesajAni || !karsiOkunduAni) return false;
  const m = new Date(sonKendiMesajAni).getTime();
  const o = new Date(karsiOkunduAni).getTime();
  if (Number.isNaN(m) || Number.isNaN(o)) return false;
  return o >= m;
}

/** Liste satırındaki son mesaj: kendi mesajımsa "Sen: " önekli; mesaj yoksa null. */
export function sonMesajOnizlemesi(sonMesaj, benim) {
  if (!sonMesaj) return null;
  return benim ? `Sen: ${sonMesaj}` : sonMesaj;
}

/**
 * Kalan karakter — yalnız sınıra yaklaşınca (1800'den sonra) bir sayı;
 * öncesinde null ve sayaç çizilmiyor. Sınır istemcide `MESAJ_EN_UZUN`,
 * sunucuda `metin` kısıtı; ikisi aynı sayı.
 *
 * @param {string} metin
 * @param {number} enUzun
 * @param {number} [esik]
 */
export function kalanKarakter(metin, enUzun, esik = 1800) {
  const uzunluk = [...metin].length;
  if (uzunluk <= esik) return null;
  return enUzun - uzunluk;
}

/**
 * İstek aşamasında başlatanın kalan mesaj hakkı. Sunucu kuralının
 * (kabulden önce en çok N mesaj) ekrandaki yansıması; asıl kapı sunucuda
 * ('istek-bekliyor'). Negatife inmiyor.
 *
 * @param {number} gonderdigim
 * @param {number} sinir
 */
export function istekHakki(gonderdigim, sinir) {
  return Math.max(0, sinir - gonderdigim);
}

/*
  İSTEK SEKMESİ SORGU PARAMETRESİNDE, YOLDA DEĞİL (24 Eylül 2026 kararı)

  `/mesajlar/istekler` adresi `/mesajlar/<kullaniciadi>` ile çakışıyordu:
  "istekler" adlı bir kullanıcıyla sohbet açılamazdı. Sekme artık
  `/mesajlar?kutu=istekler`; yol her kullanıcı adı için sohbet olarak
  kalıyor. Kullanıcı adı listesine ayrılmış ad eklenmedi.
*/

/**
 * Adresin sorgu dizesinden liste kutusu. Tanınmayan değer 'gelen'.
 * @param {string} sorgu  `window.location.search`
 * @returns {'gelen' | 'istekler'}
 */
export function mesajKutusu(sorgu) {
  return new URLSearchParams(sorgu).get('kutu') === 'istekler' ? 'istekler' : 'gelen';
}

/**
 * Kutunun adresi — sekme bağlantıları ve geri dönüşler için.
 * @param {'gelen' | 'istekler'} kutu
 */
export function kutuYolu(kutu) {
  return kutu === 'istekler' ? '/mesajlar?kutu=istekler' : '/mesajlar';
}
