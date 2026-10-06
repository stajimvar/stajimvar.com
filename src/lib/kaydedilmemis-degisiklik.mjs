/**
 * KAYDEDİLMEMİŞ DEĞİŞİKLİK KAYDI
 *
 * "Profilini düzenle" ekranında yazılıp kaydedilmemiş bir bilgi varken
 * kullanıcı başka bir sayfaya geçerse (alt gezinme, üst çubuk, bağlantı)
 * yazdıkları sessizce kayboluyordu. Ekran hangi bölümlerin kirli olduğunu
 * buraya yazıyor; uygulamanın tek gezinme kapısı (`App.navigate`) geçişten
 * önce `ayrilmaOnayi()` soruyor.
 *
 * Modül düzeyinde tek bir küme: ekran söküldüğünde kendi anahtarlarını
 * siliyor (`kaydedilmemisTemizle`), yani başka bir sayfa yanlışlıkla
 * soru sormuyor.
 */

/* anahtar → kaydetme geri çağrısı (yoksa null). Üyelik "kirli" demek. */
const kirliler = new Map();
const dinleyiciler = new Set();

function bildir() {
  for (const dinleyici of dinleyiciler) dinleyici();
}

/**
 * Bir kaynağın (ör. 'profil:temel', 'sosyal:alanlar') kirli olup
 * olmadığını yazar. `kaydet` verilirse "Kaydet" uyarısı o formu
 * gönderebiliyor (ör. sosyal profil formu kendi bileşeninde).
 */
export function kaydedilmemisIsaretle(anahtar, kirli, kaydet = null) {
  const vardi = kirliler.has(anahtar);
  if (kirli) kirliler.set(anahtar, kaydet);
  else kirliler.delete(anahtar);
  if (vardi !== Boolean(kirli)) bildir();
}

/** Önekle başlayan bütün anahtarları siler (ekran sökülürken). */
export function kaydedilmemisTemizle(onek = '') {
  let degisti = false;
  for (const anahtar of [...kirliler.keys()]) {
    if (anahtar.startsWith(onek)) {
      kirliler.delete(anahtar);
      degisti = true;
    }
  }
  if (degisti) bildir();
}

export function kaydedilmemisVarMi() {
  return kirliler.size > 0;
}

/** Önekle başlayan kirli bir kaynak var mı (ör. 'sosyal:'). */
export function kaydedilmemisOnekVarMi(onek) {
  for (const anahtar of kirliler.keys()) if (anahtar.startsWith(onek)) return true;
  return false;
}

/** Önekle başlayan kirli kaynakların kaydetme geri çağrılarını çalıştırır. */
export function kaydedilmemisKaydet(onek) {
  for (const [anahtar, kaydet] of kirliler) if (anahtar.startsWith(onek) && kaydet) kaydet();
}

/** Değişikliklere abone ol (React `useSyncExternalStore` için). Aboneliği bırakan işlevi döndürür. */
export function kaydedilmemisAbone(dinleyici) {
  dinleyiciler.add(dinleyici);
  return () => dinleyiciler.delete(dinleyici);
}

export const AYRILMA_SORUSU =
  'Kaydedilmemiş değişikliklerin var. Bu sayfadan çıkarsan yazdıkların kaybolacak. Yine de çıkılsın mı?';

/**
 * Geçişe izin var mı. Kirli bir şey yoksa sormadan evet; varsa
 * kullanıcıya soruluyor ve "evet" derse kayıt temizleniyor (ekran zaten
 * sökülecek). `onayla` sınamada yerine geçebilsin diye parametre.
 */
export function ayrilmaOnayi(onayla = (soru) => window.confirm(soru)) {
  if (!kaydedilmemisVarMi()) return true;
  const evet = Boolean(onayla(AYRILMA_SORUSU));
  if (evet) {
    kirliler.clear();
    bildir();
  }
  return evet;
}
