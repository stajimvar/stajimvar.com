/**
 * Rehber okuma geçmişi.
 *
 * NEDEN TARAYICIDA, VERİTABANINDA DEĞİL
 * -------------------------------------
 * Rehberler herkese açık: okuyanların çoğu giriş yapmamış oluyor.
 * Geçmiş veritabanında tutulsaydı "Kaldığın yerden devam et" yalnızca
 * üye olanlarda çalışırdı — oysa yarım bırakılan yazıya dönmek en çok
 * ziyaretçinin işine yarıyor.
 *
 * Kayıt yalnızca slug ve zaman: hangi yazıya bakıldığı bu cihazda kalıyor,
 * hiçbir yere gönderilmiyor.
 *
 * BOŞ BÖLÜM ÜRETİLMİYOR
 * ---------------------
 * "Kaldığın yerden devam et" yalnızca gerçekten geçmişi olan kişiye
 * gösteriliyor. Boş bir başlık, olmayan bir özelliği varmış gibi
 * gösterir; kullanıcı da neden boş olduğunu anlamaz.
 */

const ANAHTAR = 'stajimvar_rehber_gecmisi';

/** Geçmişte tutulan en fazla kayıt. Eskisi düşüyor. */
export const GECMIS_SINIRI = 12;

/** Bu süreden eski kayıt "kaldığın yer" sayılmıyor. */
export const GECMIS_GUN = 30;

const GUN_MS = 24 * 60 * 60 * 1000;

/**
 * Ham kayıt listesini temizler: bozuk girdileri atar, eskiyi düşürür,
 * yeniden eskiye sıralar ve sınırı uygular.
 *
 * Saf işlev — depolama burada yok, bu yüzden sınanabiliyor.
 *
 * @param {unknown} ham
 * @param {number} [simdi]
 * @returns {{slug: string, zaman: number}[]}
 */
export function gecmisiDuzenle(ham, simdi = Date.now()) {
  if (!Array.isArray(ham)) return [];

  const gorulen = new Set();
  return ham
    .filter((k) => k && typeof k.slug === 'string' && k.slug && Number.isFinite(k.zaman))
    .filter((k) => simdi - k.zaman <= GECMIS_GUN * GUN_MS && k.zaman <= simdi)
    .sort((a, b) => b.zaman - a.zaman)
    .filter((k) => {
      /* Aynı yazı birden çok kez okunmuş olabilir; en yenisi kalıyor. */
      if (gorulen.has(k.slug)) return false;
      gorulen.add(k.slug);
      return true;
    })
    .slice(0, GECMIS_SINIRI);
}

/**
 * Yeni okumayı listeye ekler.
 *
 * @param {{slug: string, zaman: number}[]} mevcut
 * @param {string} slug
 * @param {number} [simdi]
 */
export function gecmiseEkle(mevcut, slug, simdi = Date.now()) {
  return gecmisiDuzenle([{ slug, zaman: simdi }, ...(mevcut ?? [])], simdi);
}

/* --------------------------------------------------------------- depolama */

function depo() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    /* Gizli sekmede ya da depolama kapalıyken erişim hata veriyor. */
    return null;
  }
}

/** @returns {{slug: string, zaman: number}[]} */
export function gecmisiOku() {
  const d = depo();
  if (!d) return [];
  try {
    return gecmisiDuzenle(JSON.parse(d.getItem(ANAHTAR) ?? '[]'));
  } catch {
    return [];
  }
}

/** Okunan rehberi geçmişe yazar ve güncel listeyi döndürür. */
export function gecmiseYaz(slug) {
  const d = depo();
  const yeni = gecmiseEkle(gecmisiOku(), slug);
  if (d) {
    try {
      d.setItem(ANAHTAR, JSON.stringify(yeni));
    } catch {
      /* kota dolduysa geçmiş tutulmuyor; sayfa çalışmaya devam ediyor */
    }
  }
  return yeni;
}

/** Kullanıcı geçmişini temizlemek isterse. */
export function gecmisiSil() {
  const d = depo();
  if (!d) return;
  try {
    d.removeItem(ANAHTAR);
  } catch {
    /* yoksay */
  }
}
