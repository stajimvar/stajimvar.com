/**
 * Başvuru niyeti — girişten sonra kaldığı yerden devam.
 *
 * NEDEN sessionStorage, REACT DURUMU DEĞİL
 * ----------------------------------------
 * App'te `authDonusYolu` diye bir durum vardı ve e-posta girişinde
 * çalışıyordu: modal aynı sayfada açılıp kapanıyor, React durumu yerinde
 * kalıyor. OAuth'ta çalışmıyordu — Google'a gidiş TAM SAYFA yönlendirmesi,
 * dönüşte uygulama sıfırdan kuruluyor ve o durum silinmiş oluyor.
 *
 * Sonuç: misafir "Başvurmak için giriş yap"a basıyor, Google'dan dönüyor ve
 * ana sayfada buluyordu kendini. İlanı yeniden aramak zorundaydı.
 *
 * sessionStorage sekme ömrü boyunca yaşıyor ve tam sayfa yönlendirmesini
 * atlatıyor. localStorage KULLANILMIYOR: orada kalan bir niyet, kullanıcı
 * günler sonra sekme açtığında beklenmedik biçimde tetiklenirdi.
 *
 * GÜVENLİK
 * --------
 * İki alan da doğrulanıyor:
 *   `yol`      site içi bir yol olmalı ("/..." ama "//..." değil) — aksi
 *              hâlde açık yönlendirme (open redirect) açığı olur.
 *   `disAdres` yalnızca http/https. `javascript:` ve `data:` şemaları
 *              tıklamayla kod çalıştırma yolu açar.
 *
 * Kayıt bozuksa ya da süresi geçmişse OKUNMUYOR ve siliniyor: yarım bir
 * niyeti "iyi niyetle" tamamlamak, kullanıcıyı bilmediği bir adrese
 * göndermek demek.
 *
 * PENCERE KAPANINCA NİYET SİLİNMİYOR — BİLEREK
 * --------------------------------------------
 * İlk bakışta "kullanıcı vazgeçtiyse kaydı sil" doğru görünüyor. Değil:
 * OAuth'a gidiş de tam sayfa yönlendirmesi, yani pencere kapanmış gibi
 * görünüyor. Kapanışta silseydik Google'a giden her kullanıcının niyeti
 * tam da ihtiyaç duyulduğu anda silinirdi — özelliğin kendisi çalışmazdı.
 *
 * Vazgeçen kullanıcıyı iki şey koruyor: niyet YALNIZCA kendi ilanının
 * sayfasındayken çalışıyor ve 30 dakikada düşüyor.
 */

const ANAHTAR = 'stajimvar:basvuru-niyeti';

/**
 * Niyetin ömrü: 30 dakika.
 *
 * OAuth turu birkaç dakika sürüyor. Yarım saat sonra hâlâ bekleyen bir
 * niyet, kullanıcının vazgeçtiği bir işlemdir; onu diriltmek sürpriz olur.
 */
export const OMUR_MS = 30 * 60 * 1000;

/** Site içi yol mu ("/ilan/x" evet, "//evil.com" ve "https://…" hayır). */
export function guvenliYol(yol) {
  return typeof yol === 'string' && /^\/(?!\/)/.test(yol) ? yol : null;
}

/** Yalnızca http ve https. Diğer şemalar reddediliyor. */
export function guvenliDisAdres(adres) {
  if (typeof adres !== 'string' || !adres) return null;
  try {
    const u = new URL(adres);
    return u.protocol === 'http:' || u.protocol === 'https:' ? adres : null;
  } catch {
    return null;
  }
}

/**
 * Niyeti yazar. Geçersiz alan varsa HİÇ yazmıyor.
 *
 * @param {Storage} depo  sessionStorage (testte sahte bir nesne)
 * @param {{tur: 'dis'|'ic', ilanId: string, yol: string, disAdres?: string,
 *          baslik?: string}} niyet
 * @returns {boolean} yazıldı mı
 */
export function niyetYaz(depo, niyet, simdi = Date.now()) {
  if (!depo || !niyet) return false;
  const yol = guvenliYol(niyet.yol);
  if (!yol) return false;
  if (niyet.tur !== 'dis' && niyet.tur !== 'ic') return false;
  if (!niyet.ilanId) return false;

  let disAdres;
  if (niyet.tur === 'dis') {
    disAdres = guvenliDisAdres(niyet.disAdres);
    /* Dış başvuru niyetinin adresi yoksa niyet işe yaramaz. */
    if (!disAdres) return false;
  }

  try {
    depo.setItem(
      ANAHTAR,
      JSON.stringify({
        tur: niyet.tur,
        ilanId: String(niyet.ilanId),
        yol,
        disAdres,
        baslik: niyet.baslik ? String(niyet.baslik) : undefined,
        yazildi: simdi,
      }),
    );
    return true;
  } catch {
    /* Gizli sekmede depolama kapalı olabiliyor; giriş yine de çalışsın. */
    return false;
  }
}

/**
 * Niyeti okur. Bozuk, süresi geçmiş ya da güvensiz kayıt null döner ve
 * silinir.
 */
export function niyetOku(depo, simdi = Date.now()) {
  if (!depo) return null;
  let ham;
  try {
    ham = depo.getItem(ANAHTAR);
  } catch {
    return null;
  }
  if (!ham) return null;

  let kayit;
  try {
    kayit = JSON.parse(ham);
  } catch {
    niyetSil(depo);
    return null;
  }

  const yol = guvenliYol(kayit?.yol);
  const surelDogru =
    Number.isFinite(kayit?.yazildi) && simdi - kayit.yazildi >= 0 && simdi - kayit.yazildi <= OMUR_MS;

  if (!yol || !surelDogru || (kayit.tur !== 'dis' && kayit.tur !== 'ic')) {
    niyetSil(depo);
    return null;
  }

  if (kayit.tur === 'dis') {
    const disAdres = guvenliDisAdres(kayit.disAdres);
    if (!disAdres) {
      niyetSil(depo);
      return null;
    }
    return { ...kayit, yol, disAdres };
  }

  return { ...kayit, yol, disAdres: undefined };
}

export function niyetSil(depo) {
  try {
    depo?.removeItem(ANAHTAR);
  } catch {
    /* Yazamıyorsak silemiyoruz da; sessiz geçiliyor. */
  }
}
