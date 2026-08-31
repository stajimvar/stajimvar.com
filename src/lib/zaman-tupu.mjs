import { daysUntilDeadline, opportunityStatus } from './opportunity-domain.mjs';

/* opportunityDaysLeft firsat-degerlendirme.mjs icinde ve o dosya bu modulu
   ice aktaracak; dongusel bagimliligi onlemek icin ayni hesap burada. */
const kalanGun = (item, now) =>
  item?.applicationDeadline ? daysUntilDeadline(item.applicationDeadline, now) : null;

/**
 * ZAMAN TÜPÜ — son başvuruya ne kadar kaldığını anlatan doluluk göstergesi.
 *
 * NEDEN DEĞİŞTİ
 * -------------
 * Kartlarda son başvuru bilgisi kırmızı/pembe bir bantla yazıyordu.
 * Kırmızı bu üründe hata rengi: açık ve başvurulabilir bir burs, sistem
 * uyarısı gibi görünüyordu. Oysa söylenmek istenen şey kötü haber değil —
 * "bu fırsat yaklaşıyor".
 *
 * Yeni gösterge bir tüp: son tarih yaklaştıkça doluyor. Bu bir İLERLEME
 * çubuğu değil (öğrencinin tamamladığı bir şey yok), SONA YAKLAŞMA
 * göstergesi.
 *
 * DOLULUK NEYE GÖRE
 * -----------------
 * Kalan güne göre, 30 günlük bir ufukta. Başvuru penceresinin başlangıcı
 * (`applicationStartAt`) çoğu kayıtta boş; onu varsayıp "sürenin %60'ı
 * geçti" demek uydurma olurdu. Ayrıca pencereye göre hesaplasaydık aynı
 * "5 gün kaldı" iki kartta iki farklı doluluk gösterirdi — tüpün tek
 * iddiası "son ne kadar yakın" ve o iddia her kartta aynı ölçekte.
 *
 * Taban doluluk 0.12: bomboş bir tüp "bozuk/veri yok" gibi okunuyordu.
 *
 * RENK POZİTİF KALIYOR
 * --------------------
 * Açık bursta hata kırmızısı yok. Uzun süre varsa yumuşak nane, süre
 * kısaldıkça canlı yeşil, son günlerde sıcak amber. Amber "dikkat" diyor,
 * "hata" demiyor. Kırmızı yalnızca hiçbir yerde: kapanmış kayıt bile gri,
 * çünkü kapanmış olmak bir hata değil.
 *
 * RENK TEK BAŞINA ANLATMIYOR
 * --------------------------
 * Her durumda metin de var ("Son 3 gün", "Bugün son gün"). Renk körlüğünde
 * ve yüksek kontrast kipinde bilgi kaybolmuyor.
 */

/** Doluluğun ölçeklendiği ufuk. Bundan uzak her tarih taban doluluğunda. */
export const UFUK_GUN = 30;

/** Bomboş görünmesin diye taban. */
export const TABAN_DOLULUK = 0.12;

/**
 * Tüpün durumu.
 *
 *   'rahat'      8+ gün      — yumuşak nane
 *   'yaklasiyor' 4–7 gün     — canlı yeşil
 *   'son-gunler' 0–3 gün     — sıcak amber (hata değil, dikkat)
 *   'yakinda'    henüz açılmadı
 *   'takvimsiz'  tarih yok   — TÜP ÇİZİLMİYOR
 *   'kapali'     süre doldu
 */
export function tupDurumu(item, now = new Date()) {
  const durum = opportunityStatus(item, now);
  if (durum === 'kapali') return 'kapali';
  if (durum === 'yakinda') return 'yakinda';
  if (durum === 'takvim_bekleniyor') return 'takvimsiz';

  const kalan = kalanGun(item, now);
  if (kalan == null) return 'takvimsiz';
  if (kalan <= 3) return 'son-gunler';
  if (kalan <= 7) return 'yaklasiyor';
  return 'rahat';
}

/**
 * Doluluk oranı (0–1).
 *
 * Tarihi bilinmeyen kayıtta 0 dönüyor ve çağıran taraf tüpü hiç
 * çizmiyor: bilinmeyen bir süre için çubuk çizmek, olmayan bir bilgiyi
 * varmış gibi göstermek olurdu.
 */
export function tupDolulugu(item, now = new Date()) {
  const durum = tupDurumu(item, now);
  if (durum === 'takvimsiz') return 0;
  if (durum === 'kapali') return 1;
  /* Henüz açılmamış: süre daha başlamadı, tüp taban seviyesinde. */
  if (durum === 'yakinda') return TABAN_DOLULUK;

  const kalan = kalanGun(item, now);
  if (kalan == null) return 0;
  const oran = 1 - Math.min(Math.max(kalan, 0), UFUK_GUN) / UFUK_GUN;
  return Math.min(1, Math.max(TABAN_DOLULUK, oran));
}

const gunAyYil = (deger) => {
  if (!deger) return null;
  const t = new Date(deger);
  if (Number.isNaN(t.getTime())) return null;
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(t);
};

/**
 * Kartta yazan iki satır: kısa vurgu ve altında kesin tarih.
 *
 * TÜRKÇE EK ALMAYAN BİÇİM
 * -----------------------
 * "1 Eylül 2026'da bitiyor" demek için yıla göre değişen ek gerekiyor
 * (2025'te, 2026'da, 2027'de). Yanlış ek yazmaktansa ek istemeyen biçim
 * kullanılıyor: "Son başvuru: 1 Eylül 2026".
 *
 * @returns {{ vurgu: string|null, tarih: string|null }}
 */
export function tupMetni(item, now = new Date()) {
  const durum = tupDurumu(item, now);
  const tarih = gunAyYil(item?.applicationDeadline);

  if (durum === 'takvimsiz') return { vurgu: 'Takvim açıklanmadı', tarih: null };
  if (durum === 'kapali') return { vurgu: 'Başvuru dönemi kapandı', tarih };
  if (durum === 'yakinda') {
    const acilis = gunAyYil(item?.applicationStartAt);
    return { vurgu: 'Yakında açılıyor', tarih: acilis ? `Başvuru başlangıcı: ${acilis}` : null };
  }

  const kalan = kalanGun(item, now);
  const sonBasvuru = tarih ? `Son başvuru: ${tarih}` : null;

  if (kalan === 0) return { vurgu: 'Bugün son gün', tarih: sonBasvuru };
  if (kalan === 1) return { vurgu: 'Yarın sona eriyor', tarih: sonBasvuru };
  if (kalan != null && kalan <= 3) return { vurgu: `Son ${kalan} gün`, tarih: sonBasvuru };
  if (kalan != null && kalan <= 7) return { vurgu: `${kalan} gün kaldı`, tarih: sonBasvuru };

  /*
    Bir haftadan uzun süre varsa aciliyet yok: vurgu satırı hiç
    çizilmiyor, yalnız tarih duruyor. "23 gün kaldı" demek, sakin bir
    kaydı geri sayıma sokmak olurdu.
  */
  return { vurgu: null, tarih: sonBasvuru };
}

/**
 * Ekran okuyucuya giden tek cümle.
 *
 * Tüp görsel; `role="img"` ile tek bir ad taşıyor. İçindeki dolgunun
 * yüzdesi okunmuyor çünkü yüzde bir bilgi değil, bir görselleştirme.
 */
export function tupErisilebilirAd(item, now = new Date()) {
  const { vurgu, tarih } = tupMetni(item, now);
  return [vurgu, tarih].filter(Boolean).join('. ') || 'Başvuru takvimi bilinmiyor';
}

/**
 * Durum renkleri.
 *
 * KONTRAST ÖLÇÜLDÜ
 * ----------------
 * Metin kendi zemininde (eşik 4.5:1):
 *   rahat       #047857 / #ECFDF5 → 5.21
 *   yaklasiyor  #15803D / #F0FDF4 → 4.79
 *   son-gunler  #92400E / #FFFBEB → 6.84
 *   yakinda     #1D4ED8 / #EFF6FF → 6.16
 *   kapali      #4B5563 / #F3F4F6 → 6.87
 *
 * Dolgu kendi kanalında (grafik öğesi eşiği 3:1):
 *   rahat 3.58 · yaklasiyor 3.15 · son-gunler 3.07 · yakinda 3.38 ·
 *   kapali 4.39
 *
 * İKİ TUR AYAR
 * ------------
 * İlk tonlar (#34D399, #22C55E, #F59E0B) kendi kanallarında 1.8–2.3
 * kalıyordu: doluluk seviyesi seçilemiyordu, yani tüpün tek işi
 * görünmüyordu. İkinci turda dolgular koyulaştırıldı ama son günlerin
 * ambersi (#B45309) yanık kiremit gibi durdu — istenen sıcak ve davetkâr
 * değil, ağır bir tondu. Çözüm dolguyu değil KANALI açmak oldu:
 * #D97706 açık kanalda hem parlak kalıyor hem eşiği geçiyor.
 *
 * Hiçbir açık durumda kırmızı yok; kapanmış kayıt bile gri, çünkü
 * kapanmış olmak bir hata değil.
 */
export const TUP_RENKLERI = {
  rahat: { dolgu: '#059669', kanal: '#ECFDF5', yazi: '#047857' },
  yaklasiyor: { dolgu: '#16A34A', kanal: '#F0FDF4', yazi: '#15803D' },
  'son-gunler': { dolgu: '#D97706', kanal: '#FFFBEB', yazi: '#92400E' },
  yakinda: { dolgu: '#3B82F6', kanal: '#EFF6FF', yazi: '#1D4ED8' },
  takvimsiz: { dolgu: '#D1D5DB', kanal: '#F3F4F6', yazi: '#4B5563' },
  kapali: { dolgu: '#6B7280', kanal: '#F3F4F6', yazi: '#4B5563' },
};
