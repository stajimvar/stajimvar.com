/**
 * DÜZ HARİTA AYARLARI — ANAHTARSIZ
 *
 * Harita stili eskiden anahtar isteyen ücretli bir servisten (Mapbox)
 * geliyordu: ortamda anahtar yoksa harita hiç kurulmuyordu, yani /kesfet
 * ekranının yarısı kurulumdan kuruluma değişiyordu. Artık stil
 * OpenFreeMap'ten geliyor — OpenStreetMap verisinden üretilen vektör
 * karoları ücretsiz ve anahtarsız sunan açık bir servis. Böylece tarayıcıya
 * hiçbir gizli değer gitmiyor ve yapılandırma kaynaklı "harita yok" durumu
 * ortadan kalkıyor.
 *
 * KARŞILIĞI: ATIF ZORUNLU
 * -----------------------
 * Lisans, OpenStreetMap ve OpenFreeMap atıflarının GÖRÜNÜR olmasını
 * istiyor. Atıf `KesfetGeoMap` içinde, haritanın hemen altında kalıcı
 * olarak duruyor; gizlenmiyor, açılır kutuya saklanmıyor.
 */

/**
 * Stil adresi tek bir yerde duruyor: sağlayıcı ya da stil değişirse
 * değişecek satır sayısı bir.
 */
export const HARITA_STIL_ADRESI = 'https://tiles.openfreemap.org/styles/liberty';

export interface HaritaAyari {
  hazir: boolean;
  styleUrl: string;
  /** Kullanıcıya gösterilecek dürüst gerekçe; hazırsa boş. */
  gerekce: string;
}

/**
 * Anahtar ya da ortam değişkeni okunmuyor, dolayısıyla yapılandırmadan
 * doğan bir engel de kalmıyor: ayar her zaman hazır. Gerçek engeller
 * (WebGL yokluğu, stilin ağdan inmemesi) kendi yerlerinde sınanıyor;
 * `gerekce` alanı yalnızca öyle bir engel için doldurulacak.
 */
export function haritaAyari(): HaritaAyari {
  return { hazir: true, styleUrl: HARITA_STIL_ADRESI, gerekce: '' };
}

/**
 * WebGL yoksa maplibre hiç kurulamıyor. Bunu önceden bilmek, tuvali
 * çizmeye çalışıp konsola hata bırakmaktan iyi: kullanıcı doğrudan
 * erişilebilir listeyi görüyor.
 */
export function webglVarMi(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const tuval = document.createElement('canvas');
    return Boolean(tuval.getContext('webgl2') || tuval.getContext('webgl'));
  } catch {
    return false;
  }
}
