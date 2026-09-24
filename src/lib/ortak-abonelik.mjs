/**
 * ORTAK ABONELİK — bir anahtara tek kanal, çok dinleyici
 *
 * NEDEN VAR — ÖLÇÜLDÜ (realtime-js 2.112.3 kaynağı)
 * ------------------------------------------------
 * `supabase.channel(ad)` aynı adla ikinci kez çağrılınca YENİ bir kanal
 * değil, var olanı döndürüyor (`RealtimeClient.channel`: "exists" dalı).
 * Katılmış bir kanala `.on('postgres_changes', …)` eklemek ise hata
 * fırlatıyor ("cannot add `postgres_changes` callbacks … after
 * `subscribe()`"). Kanalın kaldırılması da asenkron (`removeChannel`
 * önce `await unsubscribe()`).
 *
 * Sonuç: gelen kutusunu aynı anda iki yer dinlerse (üst çubuk rozeti ve
 * /mesajlar listesi) ikinci abone hata alır; biri kapatınca öteki de
 * susar. React'ın geliştirme kipindeki çift effect'i (kur → sök → kur)
 * aynı hatayı tek bileşende bile üretiyor.
 *
 * NASIL: anahtar başına tek gerçek abonelik ve bir dinleyici kümesi.
 * İlk dinleyici kanalı kuruyor; son dinleyici ayrılınca kanal BİR TİK
 * SONRA kapanıyor — o arada yeniden gelen dinleyici (çift effect) aynı
 * kanalı devralıyor, kapat-aç yarışı olmuyor.
 *
 * GÜNCEL DURUM (24 Eylül 2026): veri katmanı kanal adlarını abonelik
 * başına tekil yaptı (`crypto.randomUUID()` son eki), yani ad çakışması
 * artık yok. Dosya KALDI: anahtar başına tek kanal, rozet ve liste aynı
 * gelen kutusunu dinlerken iki ayrı Realtime aboneliği yerine bir tane
 * açıyor — ağ trafiği ve sunucu tarafındaki abonelik sayısı yarıya iniyor.
 * Bu dosya `sohbetiDinle` / `gelenKutusunuDinle` fonksiyonlarını sarıyor.
 */

/** @type {Map<string, { dinleyiciler: Set<(olay: any) => void>, kapat: (() => void) | null, zamanlayici: ReturnType<typeof setTimeout> | null }>} */
const kayitlar = new Map();

/**
 * @template T
 * @param {string} anahtar  aynı kanalı paylaşanların ortak adı
 * @param {(yayinla: (olay: T) => void) => () => void} kur  gerçek aboneliği kurar, kapatma fonksiyonu döner
 * @param {(olay: T) => void} dinleyici
 * @returns {() => void} bu dinleyiciyi çıkaran fonksiyon
 */
export function ortakAbone(anahtar, kur, dinleyici) {
  let kayit = kayitlar.get(anahtar);
  if (!kayit) {
    kayit = { dinleyiciler: new Set(), kapat: null, zamanlayici: null };
    kayitlar.set(anahtar, kayit);
  }
  if (kayit.zamanlayici) {
    clearTimeout(kayit.zamanlayici);
    kayit.zamanlayici = null;
  }
  kayit.dinleyiciler.add(dinleyici);
  if (!kayit.kapat) {
    const bu = kayit;
    bu.kapat = kur((olay) => {
      for (const d of [...bu.dinleyiciler]) d(olay);
    });
  }

  let cikti = false;
  return () => {
    if (cikti) return;
    cikti = true;
    const k = kayitlar.get(anahtar);
    if (!k) return;
    k.dinleyiciler.delete(dinleyici);
    if (k.dinleyiciler.size > 0) return;
    k.zamanlayici = setTimeout(() => {
      if (k.dinleyiciler.size > 0) return;
      k.kapat?.();
      kayitlar.delete(anahtar);
    }, 0);
  };
}

/** Yalnız testler için: açık anahtar sayısı. */
export function acikAbonelikSayisi() {
  return kayitlar.size;
}
