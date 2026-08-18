/**
 * Cloudflare Web Analytics — çerezsiz ziyaret ölçümü.
 *
 * NEDEN BU ARAÇ
 * -------------
 * Site aylardır ölçümsüz çalışıyordu: kaç kişi geliyor, hangi sayfaya
 * geliyor, hiçbiri bilinmiyordu. "Ne kadar büyüyebiliriz" sorusunun
 * cevabı tahmin olmaktan çıkması için önce görmek gerekiyor.
 *
 * Google Analytics yerine bu seçildi çünkü:
 *
 *   - ÇEREZ KOYMUYOR. GA4 koyuyor ve o an bir onay bandı gerekiyor;
 *     bant da her ziyaretçiyi karşılayan bir engel demek.
 *   - Kişisel veri toplamıyor, parmak izi çıkarmıyor. Sayfa adresi,
 *     yönlendiren, ülke ve tarayıcı türü gibi toplu veriler kalıyor.
 *   - Zaten Cloudflare üzerindeyiz; veri yeni bir sağlayıcıya gitmiyor.
 *
 * BEDELİ
 * ------
 * GA4 kadar ayrıntı yok: kullanıcı bazlı huni, kohort, olay takibi yok.
 * Bizim sorumuz "kaç kişi, nereye, nereden" — bunun için fazlası zaten
 * gereksiz ve toplamadığımız veri sızdıramayacağımız veri.
 *
 * BELİRTEÇ TANIMLI DEĞİLSE HİÇBİR ŞEY YAPMIYOR
 * --------------------------------------------
 * AdSense betiğindeki mantığın aynısı: yerel geliştirmede ve belirteç
 * tanımlanmadan yapılan derlemelerde boşuna dış istek atılmıyor.
 */

const BELIRTEC = import.meta.env.VITE_CF_ANALYTICS_TOKEN as string | undefined;

let istendi = false;

export function olcumuBaslat(): void {
  if (istendi || typeof document === 'undefined') return;
  const belirtec = (BELIRTEC ?? '').trim();
  if (!belirtec) return;
  istendi = true;

  const betik = document.createElement('script');
  betik.defer = true;
  betik.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  /*
    Belirteç JSON içinde geçiyor; Cloudflare'in beklediği biçim bu.
    JSON.stringify ile üretiliyor, elle tırnak birleştirmiyoruz — belirteçte
    beklenmedik bir karakter olursa öznitelik bozulmasın.
  */
  betik.setAttribute('data-cf-beacon', JSON.stringify({ token: belirtec }));
  document.head.appendChild(betik);
}
