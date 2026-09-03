/**
 * Çerez rızası — sürümlü ve zaman damgalı kayıt.
 *
 * DURUM NEYDİ
 * -----------
 * Çerez bandı yoktu ve AdSense betiği uygulama açılışında koşulsuz
 * yükleniyordu (main.tsx). Yani ziyaretçi hiçbir şey seçmeden reklam
 * sağlayıcısına istek gidiyordu. Bandı çizip betiği yine de yüklemek de
 * çözüm değil: kural isteğin BAŞLAMAMASI.
 *
 * SÜRÜM NEDEN VAR
 * ---------------
 * Rıza "neye" verildiğinin kaydı. Yarın yeni bir ölçüm aracı eklenirse
 * dünkü onay onu kapsamıyor. Sürüm artınca eski kayıt geçersiz sayılıyor
 * ve band yeniden soruyor. Sürümü artırmadan sağlayıcı eklemek, verilmemiş
 * bir onayı varmış gibi kullanmak olur.
 *
 * ZAMAN DAMGASI
 * -------------
 * "Ne zaman onayladı" sorusunun cevabı. KVKK tarafında ispat yükü bizde;
 * damgasız bir onay kaydı hiçbir şey ispatlamıyor.
 *
 * ZORUNLU ÇEREZLER SORULMUYOR
 * ---------------------------
 * Oturum ve güvenlik çerezleri sitenin çalışması için gerekli; onları
 * kapatma seçeneği sunmak, sunulmayan bir seçim sunmaktır. Band yalnızca
 * reklam ve ölçüm için soruyor.
 */

const ANAHTAR = 'stajimvar:cerez-rizasi';

/**
 * Rıza sürümü.
 *
 * ARTIRMA KURALI: yeni bir üçüncü taraf eklendiğinde ya da mevcut birinin
 * amacı değiştiğinde artır. Artırınca herkese yeniden sorulur.
 */
export const SURUM = 1;

/** Rıza gerektiren kategoriler. Zorunlu çerezler burada yok — sorulmuyor. */
export const KATEGORILER = ['reklam', 'olcum'];

/** Hiçbir şey seçilmemiş durum. */
export const BOS = { durum: 'sorulmadi', reklam: false, olcum: false, surum: SURUM, zaman: null };

/**
 * Kayıtlı rızayı okur.
 *
 * Sürüm eskiyse ya da kayıt bozuksa "sorulmadı" dönüyor: band yeniden
 * çıkıyor. Bozuk bir kaydı "herhâlde onaylamıştır" diye okumak, onay
 * uydurmak demek.
 */
export function rizaOku(depo) {
  if (!depo) return { ...BOS };
  let ham;
  try {
    ham = depo.getItem(ANAHTAR);
  } catch {
    return { ...BOS };
  }
  if (!ham) return { ...BOS };

  let k;
  try {
    k = JSON.parse(ham);
  } catch {
    return { ...BOS };
  }

  if (k?.surum !== SURUM) return { ...BOS };
  if (k.durum !== 'verildi' && k.durum !== 'reddedildi') return { ...BOS };
  if (typeof k.zaman !== 'string' || !k.zaman) return { ...BOS };

  return {
    durum: k.durum,
    reklam: k.reklam === true,
    olcum: k.olcum === true,
    surum: SURUM,
    zaman: k.zaman,
  };
}

/**
 * Rızayı yazar.
 *
 * @param {Storage} depo
 * @param {{reklam: boolean, olcum: boolean}} secim
 */
export function rizaYaz(depo, secim, simdi = new Date()) {
  const kayit = {
    durum: secim.reklam || secim.olcum ? 'verildi' : 'reddedildi',
    reklam: secim.reklam === true,
    olcum: secim.olcum === true,
    surum: SURUM,
    zaman: simdi.toISOString(),
  };
  try {
    depo?.setItem(ANAHTAR, JSON.stringify(kayit));
  } catch {
    /* Depolama kapalıysa rıza kalıcı olmuyor; band her açılışta soruyor. */
  }
  return kayit;
}

/** Reklam betiği yüklenebilir mi. */
export function reklamSerbest(riza) {
  return riza?.durum === 'verildi' && riza.reklam === true;
}

/** Band gösterilmeli mi. */
export function bandGerekli(riza) {
  return riza?.durum === 'sorulmadi';
}
