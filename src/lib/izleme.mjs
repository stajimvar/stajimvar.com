/**
 * ZİYARETÇİ ÖLÇÜMÜ — İSTEMCİ TARAFI
 *
 * Panel ziyaretçi sayılarını gösteriyor; o sayıların gerçek olması için
 * birinin ziyareti bildirmesi gerekiyor. Burası o bildirimi yapıyor.
 *
 * ÇEREZ YOK
 * ---------
 * Oturum kimliği `sessionStorage`'da duruyor: sekmeye özel, sekme
 * kapanınca siliniyor, başka siteye gitmiyor. Çerez olsaydı hem onay
 * gerekirdi hem de sekmeler arası ve ziyaretler arası bir iz bırakırdı.
 * Burada amaç kişiyi tanımak değil, "aynı ziyaret mi" sorusunu
 * cevaplamak — bunun için sekme ömrü yetiyor.
 *
 * KİŞİSEL VERİ GÖNDERİLMİYOR
 * --------------------------
 * Gönderilen alanlar: rastgele oturum kimliği, sayfa yolu, sayfa
 * başlığı, yönlendiren adres ve giriş yapmışsa kullanıcı kimliği. Şehir
 * ve cihaz istemciden GÖNDERİLMİYOR; sunucu onları isteğin kendisinden
 * okuyor. İstemciden gelen bir şehir zaten güvenilmez olurdu.
 *
 * ÖLÇÜM SAYFAYI YAVAŞLATMIYOR
 * ---------------------------
 * `sendBeacon` kullanılıyor: tarayıcı isteği arka planda, sayfa
 * kapanırken bile gönderiyor ve cevabı beklemiyor. Desteklenmiyorsa
 * `keepalive` ile fetch'e düşülüyor. İkisi de başarısız olursa ölçüm
 * kayboluyor — ziyaretçinin sayfası etkilenmiyor. Ölçüm, ölçtüğü şeyi
 * bozmamalı.
 */

const UC = '/api/olay';
const ANAHTAR = 'sv-oturum';

/** Yönetim paneli ziyaret sayılmıyor: kendi bakışımız trafik değil. */
const SAYILMAYAN = /^\/yonetim(\/|$)/;

let sonYol = null;
let girdiBildirildi = false;

/**
 * Sekme ömrü kadar yaşayan rastgele kimlik.
 *
 * `sessionStorage` yoksa (gizli kip kısıtlaması, eski tarayıcı) bellekte
 * tutuluyor: sayfa yenilenince yeni oturum sayılıyor. Ölçümü tamamen
 * bırakmaktansa biraz fazla sayması yeğ.
 */
let bellektekiKimlik = null;

export function oturumKimligi() {
  if (typeof window === 'undefined') return null;
  try {
    let k = window.sessionStorage.getItem(ANAHTAR);
    if (!k) {
      k = kimlikUret();
      window.sessionStorage.setItem(ANAHTAR, k);
    }
    return k;
  } catch {
    if (!bellektekiKimlik) bellektekiKimlik = kimlikUret();
    return bellektekiKimlik;
  }
}

function kimlikUret() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `o${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Olayı gönderir.
 *
 * @param {'girdi'|'sayfa'|'basvuru'|'cikti'} tur
 * @param {{ yol?: string, baslik?: string, kullanici?: string|null }} [ek]
 */
export function olayGonder(tur, ek = {}) {
  if (typeof window === 'undefined') return false;

  const yol = ek.yol ?? window.location.pathname;
  if (SAYILMAYAN.test(yol)) return false;

  const oturum = oturumKimligi();
  if (!oturum) return false;

  const govde = JSON.stringify({
    oturum,
    tur,
    yol,
    baslik: ek.baslik ?? document.title ?? null,
    referrer: document.referrer || null,
    kullanici: ek.kullanici ?? null,
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([govde], { type: 'application/json' });
      if (navigator.sendBeacon(UC, blob)) return true;
    }
  } catch {
    /* aşağıdaki fetch deneniyor */
  }

  try {
    void fetch(UC, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: govde,
      keepalive: true,
    }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sayfa değişimini bildirir.
 *
 * İLK OLAY 'girdi', SONRAKİLER 'sayfa'
 * ------------------------------------
 * "Bugün kaç kişi girdi" ile "kaç sayfa bakıldı" ayrı sorular. İlk olayı
 * ayırmadan ikisini birbirinden ayıramazdık.
 *
 * AYNI YOL İKİ KEZ YAZILMIYOR
 * ---------------------------
 * React yeniden çizimleri aynı yolu birden çok kez bildirebiliyor.
 * Filtrelenmeseydi sayfa bakışı, gerçek bakıştan büyük çıkardı.
 */
export function sayfaBildir(yol, kullanici = null) {
  if (typeof window === 'undefined') return;
  if (SAYILMAYAN.test(yol)) return;
  if (yol === sonYol) return;
  sonYol = yol;

  if (!girdiBildirildi) {
    girdiBildirildi = true;
    olayGonder('girdi', { yol, kullanici });
    return;
  }
  olayGonder('sayfa', { yol, kullanici });
}

/** Başvuru düğmesine basıldı — huninin son adımı. */
export function basvuruBildir(yol, kullanici = null) {
  olayGonder('basvuru', { yol, kullanici });
}

/**
 * Çıkışı bildirir ve dinleyiciyi kurar.
 *
 * `pagehide` seçildi, `beforeunload` değil: mobil tarayıcılarda
 * `beforeunload` çoğu zaman hiç çalışmıyor. `visibilitychange` de
 * dinleniyor çünkü telefonda kullanıcı genelde sekmeyi kapatmıyor,
 * uygulamadan çıkıyor.
 *
 * Yine de çıkış olayının ulaşacağının garantisi yok. Bu yüzden sunucu
 * tarafı beş dakikalık sessizliği de çıkış sayıyor; yalnız bu olaya
 * güvenmek, "şu an bakıyor" sayacını şişirirdi.
 */
export function cikisiDinle(yolAl) {
  if (typeof window === 'undefined') return () => {};

  let bildirildi = false;
  const bildir = () => {
    if (bildirildi) return;
    bildirildi = true;
    olayGonder('cikti', { yol: yolAl ? yolAl() : window.location.pathname });
  };

  const gorunurluk = () => {
    if (document.visibilityState === 'hidden') bildir();
    else bildirildi = false;
  };

  window.addEventListener('pagehide', bildir);
  document.addEventListener('visibilitychange', gorunurluk);
  return () => {
    window.removeEventListener('pagehide', bildir);
    document.removeEventListener('visibilitychange', gorunurluk);
  };
}

/** Testler için: modül durumunu sıfırlar. */
export function _sifirla() {
  sonYol = null;
  girdiBildirildi = false;
  bellektekiKimlik = null;
}
