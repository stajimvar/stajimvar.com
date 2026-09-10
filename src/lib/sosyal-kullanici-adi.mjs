/**
 * SOSYAL KULLANICI ADI — KURAL TEK KAYNAKTAN
 *
 * NEDEN AYRI DOSYA
 * ----------------
 * Desen veritabanındaki CHECK kısıtının birebir aynısı:
 *
 *   username ~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$'
 *   (supabase/migrations/20260921010000_sosyal_katman_semasi.sql)
 *
 * Arayüz kendi gevşek kuralını yazsaydı, veritabanının reddedeceği bir adı
 * kullanıcıya "geçerli" diye gösterip kaydet düğmesine bastırırdı; hata
 * ancak sunucudan dönerdi ve kullanıcı nedenini bilemezdi. Kural burada
 * tekrarlanıyor ama DEĞİŞTİRİLMİYOR — sunucu yine son söz sahibi.
 *
 * NEDEN YALNIZ KÜÇÜK ASCII
 * ------------------------
 * Göç dosyasındaki gerekçenin aynısı: `lower('İ')` veritabanı yereline
 * bağlı davranıyor ve 'i' ile 'i̇' (i + birleşen nokta) ayrışabiliyor.
 * Alfabeden Türkçe harfler çıkınca bu tuzak tamamen kapanıyor. Bu yüzden
 * arayüz "Türkçe karakter kullanılamıyor" derken bir üslup tercihini değil
 * bir tekillik kuralını anlatıyor.
 *
 * NEDEN "MÜSAİT Mİ" SORGUSU YOK
 * -----------------------------
 * Bir adın alınmış olup olmadığını istemciden sormak mümkün değil: RLS
 * yalnız kendi satırını ve aynı sektördeki YAYIMLANMIŞ satırları veriyor.
 * Başka sektördeki bir ad için sorgu boş dönerdi ve arayüz "müsait" derdi —
 * sonra kayıt tekil indekse takılırdı. Bu yüzden çakışma yalnız kaydetme
 * anında, veritabanının döndürdüğü 23505 ile bildiriliyor.
 */

/** Veritabanındaki CHECK kısıtının aynısı. */
export const KULLANICI_ADI_DESENI = /^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/;

/** `biyografi` kolonundaki uzunluk kısıtı. */
export const BIYOGRAFI_SINIRI = 300;

/** Türkçe harfler ayrı ele alınıyor: kullanıcıya sebebi adıyla söyleniyor. */
const TURKCE_HARFLER = /[çğıöşüÇĞİÖŞÜ]/;

/** Yalnız desenin izin verdiği karakterler. */
const IZINLI_KARAKTER = /^[a-z0-9._]+$/;

/**
 * Gönderimden önceki normalleştirme.
 *
 * Büyük harf yazan kullanıcı reddedilmiyor, yazdığı küçültülüyor: "Ayse"
 * ile "ayse" aynı adı isteyen iki yazım. Küçültme `toLowerCase()` ile,
 * `toLocaleLowerCase('tr')` ile DEĞİL — Türkçe yerelde 'I' harfi 'ı'ya
 * dönüyor ve 'ı' zaten yasak bir karakter; kullanıcı yazmadığı bir hatayla
 * karşılaşırdı.
 *
 * @param {unknown} ham
 * @returns {string}
 */
export function kullaniciAdiNormalize(ham) {
  return String(ham ?? '').trim().toLowerCase();
}

/**
 * Geçersizlik sebebi.
 *
 * Tek bir "geçersiz" mesajı yerine sebep döndürülüyor: kullanıcı adı
 * kalıcı bir adres ve kullanıcı neyi düzelteceğini bilmeden deneme
 * yapmak zorunda kalıyor.
 *
 * @param {unknown} ham
 * @returns {string|null} hata cümlesi ya da null (geçerli)
 */
export function kullaniciAdiHatasi(ham) {
  const ad = kullaniciAdiNormalize(ham);

  if (ad === '') return 'Kullanıcı adı gerekiyor.';

  if (TURKCE_HARFLER.test(String(ham ?? '')) || TURKCE_HARFLER.test(ad)) {
    return 'Kullanıcı adında Türkçe karakter (ç, ğ, ı, ö, ş, ü) kullanılamıyor.';
  }

  if (/\s/.test(ad)) return 'Kullanıcı adında boşluk olamaz.';

  if (!IZINLI_KARAKTER.test(ad)) {
    return 'Yalnız İngilizce küçük harf, rakam, nokta ve alt çizgi kullanılabilir.';
  }

  if (ad.length < 3) return 'Kullanıcı adı en az 3 karakter olmalı.';
  if (ad.length > 30) return 'Kullanıcı adı en fazla 30 karakter olabilir.';

  if (!/^[a-z0-9]/.test(ad) || !/[a-z0-9]$/.test(ad)) {
    return 'Nokta ve alt çizgi kullanıcı adının başında ya da sonunda olamaz.';
  }

  /*
    Yukarıdaki kontroller desenin bütün dallarını kapsıyor; buradaki son
    kontrol yine de duruyor çünkü tek doğru kaynak desenin kendisi. Mesajı
    ayrı bir sebep vermiyor: buraya düşen bir girdi varsa yukarıdaki
    listede eksik bir dal var demektir.
  */
  if (!KULLANICI_ADI_DESENI.test(ad)) return 'Kullanıcı adı bu biçimde kullanılamıyor.';

  return null;
}

/**
 * @param {unknown} ham
 * @returns {boolean}
 */
export function kullaniciAdiGecerliMi(ham) {
  return kullaniciAdiHatasi(ham) === null;
}

/**
 * Biyografi uzunluğu.
 *
 * @param {unknown} ham
 * @returns {string|null}
 */
export function biyografiHatasi(ham) {
  const metin = String(ham ?? '');
  if (metin.length > BIYOGRAFI_SINIRI) {
    return `Biyografi en fazla ${BIYOGRAFI_SINIRI} karakter olabilir.`;
  }
  return null;
}

/**
 * Kalıcı profil adresi.
 *
 * Tek yerde: adres hem yönlendirmede hem paylaşmada hem bağlantıda
 * kullanılıyor ve üçünün ayrışması kırık bağlantı demek.
 *
 * @param {string} kullaniciAdi
 * @returns {string}
 */
export function profilYolu(kullaniciAdi) {
  return `/profil/${kullaniciAdi}`;
}
