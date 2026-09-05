/**
 * COĞRAFİ SEÇİM DURUMU
 *
 * Seçim tek bir değer: hangi düğümdeyiz. Küre, harita, breadcrumb ve kart
 * listesi bu tek değerden türüyor; dördü ayrı bayrak tutsaydı "harita açık
 * ama breadcrumb Dünya'da" gibi tutarsız durumlar mümkün olurdu.
 *
 * DURUM ADRESTE DE TUTULUYOR
 * --------------------------
 * Seçim yalnızca bellekte kalsaydı tarayıcının geri tuşu kullanıcıyı
 * Keşfet'ten tümüyle çıkarırdı — oysa beklenti bir seviye yukarı çıkmak.
 * Kod adres çubuğuna yazılıyor, geri/ileri tuşları `popstate` üzerinden
 * aynı geçmişi geziyor ve seçili görünüm paylaşılabilir oluyor.
 */
import { DUNYA_KODU } from '../lib/kesfet-geo.mjs';

/* Türkçe parametre adı: adres çubuğunda okunur kalıyor (?yer=TR.istanbul). */
export const GEO_PARAM = 'yer';

/*
  İLK SATIR = 3 KART

  Katalog ızgarası geniş ekranda üç sütun. Ülke seçilince harita tam olarak
  bu üç kartın kapladığı satırı alıyor; sayfanın tamamını değil.
*/
export const ILK_SATIR_KART_SAYISI = 3;

export const initialGeoState = (code = null) => ({
  code: !code || code === DUNYA_KODU ? null : code,
});

export function geoReducer(state, action) {
  switch (action?.type) {
    case 'select':
      return initialGeoState(action.code);
    case 'reset':
      return initialGeoState(null);
    case 'sync':
      return initialGeoState(action.code);
    default:
      return state;
  }
}

export function readGeoCode(search) {
  try {
    const code = new URLSearchParams(search || '').get(GEO_PARAM)?.trim() || '';
    return code && code !== DUNYA_KODU ? code : null;
  } catch {
    return null;
  }
}

/**
 * Yeni adres. Kod boşsa parametre siliniyor; boş `?yer=` bırakmak aynı
 * görünümün iki ayrı adresi demek olurdu.
 */
export function geoAdresi(yol, search, code) {
  const parametreler = new URLSearchParams(search || '');
  if (code && code !== DUNYA_KODU) parametreler.set(GEO_PARAM, code);
  else parametreler.delete(GEO_PARAM);
  const kuyruk = parametreler.toString();
  return kuyruk ? yol + '?' + kuyruk : yol;
}

/**
 * Sağ sütunun düzeni.
 *
 * Ülke seçilmeden harita KAPALI ve ilk üç kart yerinde duruyor. Seçim
 * yapıldığında harita tam olarak o üç kartın satırını alıyor; ilk satır
 * haritaya yer AÇIYOR, `leadingCards` bu yüzden sıfıra iniyor. Haritanın
 * altındaki kartlar yerinde kalıyor.
 */
export function geoLayout(state) {
  const mapOpen = Boolean(state?.code);
  return {
    globeVisible: true,
    mapOpen,
    mapColumnSpan: mapOpen ? ILK_SATIR_KART_SAYISI : 0,
    leadingCards: mapOpen ? 0 : ILK_SATIR_KART_SAYISI,
  };
}

/**
 * Izgaraya çizilecek kartlar.
 *
 * Harita açıkken ilk satırın kartları ızgaradan düşüyor: o satırı artık
 * harita kaplıyor, iki katman üst üste binmiyor. Kesme YALNIZCA çizim
 * anında; listenin kendisine dokunulmuyor. Bu yüzden sonuç sayacı,
 * sayfalama ve haritadaki sayılar tam kümeyi göstermeye devam ediyor,
 * "Dünya" seçilir seçilmez de üç kart aynı anda geri geliyor.
 */
export function gorunenKartlar(events, layout) {
  const liste = Array.isArray(events) ? events : [];
  return layout?.mapOpen ? liste.slice(ILK_SATIR_KART_SAYISI) : liste;
}
