/**
 * KAPAK ORANI — TEK KAYNAK, HER GENİŞLİKTE 3:1
 *
 * Dosya 3:1 kaydediliyor (`kapagaCevir`) ve profilde de her genişlikte
 * 3:1 gösteriliyor. Profil sütunu X'in sayfa düzeninde en çok 600 piksel
 * (kullanıcı kararı 24 Eylül 2026: X sayfa düzeni, sol menü yok), yani
 * kapak geniş ekranda 600×200 — X'in birebir ölçüsü.
 *
 * GENİŞ EKRAN 5:1 KURALI KALKTI: o kural kart 1343 piksele yayıldığı
 * içindi (3:1'de 1343×448, 900 piksellik ekranın yarısı). Sütun 600'e
 * inince gerek kalmadı; kırpma ekranındaki üst/alt karartma ve "Geniş
 * ekranlarda…" cümlesi de onunla gitti. Kırpmada görülen artık her
 * yerde profilde görülenle aynı.
 */

/** Kaydedilen ve gösterilen kapağın oranı (genişlik / yükseklik). */
export const KAPAK_ORANI = 3;

/*
  ORANIN TAILWIND SINIFI — sayıyla aynı yerde. Literal yazılıyor:
  Tailwind kaynağı düz metin olarak tarıyor ve `aspect-[${KAPAK_ORANI}/1]`
  gibi çalışma anında kurulan bir dizeyi göremez. `profil-kapagi-arayuzu`
  testi sayıyla sınıfı karşılaştırıyor. Öğrenci kapağı ve şirketin logo
  bandı bu sınıfı okuyor: üç profil ekranının üst bandı aynı yükseklikte.
*/
export const KAPAK_SINIFI = 'aspect-[3/1]';
