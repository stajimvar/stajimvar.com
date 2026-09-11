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

/* ------------------------------------------------------------------ */
/*  G AŞAMASI — AD DEĞİŞTİRME ALFABESİ: YALNIZ a-z                     */
/* ------------------------------------------------------------------ */

/**
 * YUKARIDAKİ DESEN NEDEN DURUYOR
 * ------------------------------
 * `KULLANICI_ADI_DESENI` rakama, noktaya ve alt çizgiye izin veriyor ve
 * bu, 20260921010000'deki kısıtın aynısı. 20260926010000 kuralı daralttı
 * (`^[a-z]{3,30}$`) ama kısıtı `not valid` ekledi: MEVCUT satırlar
 * taranmıyor, yani rakamlı ya da noktalı bir ad almış kullanıcının
 * adresi çalışmaya devam ediyor. İki desen bu yüzden iki AYRI işi
 * anlatıyor ve biri ötekinin yerine geçemez:
 *
 *   KULLANICI_ADI_DESENI       var olan adların kabul aralığı
 *   KULLANICI_ADI_HARF_DESENI  YENİ yazılacak adın kuralı
 *
 * Tek desene indirseydik, eski adıyla giriş yapan kullanıcının kendi
 * adını arayüz "geçersiz" gösterirdi.
 */
export const KULLANICI_ADI_HARF_DESENI = /^[a-z]{3,30}$/;

/**
 * Türkçe harflerin ASCII karşılığı.
 *
 * `sosyal_gizli.kullanici_adi_normalize` içindeki `translate(...,
 * 'ÇĞİIÖŞÜçğıiöşü', 'cgiiosucgiiosu')` çağrısının birebir aynısı. İki
 * tablo ayrışsaydı istemcinin gösterdiği önizleme ile sunucunun ürettiği
 * ad farklı olurdu — kullanıcı "ayse" görüp "ayse" dışında bir ad almış
 * olurdu.
 */
const HARF_KARSILIKLARI = {
  Ç: 'c', Ğ: 'g', İ: 'i', I: 'i', Ö: 'o', Ş: 's', Ü: 'u',
  ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u',
};

/**
 * Serbest metni kullanıcı adı alfabesine indirger.
 *
 * "Ayşe Yılmaz" → "ayseyilmaz". Rakam, boşluk, nokta, tire, emoji ve
 * başka alfabeler SİLİNİYOR — reddedilmiyor: kullanıcı yazarken ne
 * alacağını anında görüyor ve "bu karakter olmaz" diye bir uyarıyla
 * durdurulmuyor.
 *
 * ÇEVİRİ `toLowerCase()`TEN ÖNCE, tıpkı SQL'deki gibi: 'I' harfi Türkçe
 * yerelde 'ı'ya düşüyor ve 'ı' zaten alfabede yok. Önce çevrilince sonuç
 * yerelden bağımsız kalıyor.
 *
 * SON KARAR SUNUCUDA. Bu fonksiyon bir kolaylık: aynı metni sunucu da
 * kendi tarafında normalleştiriyor ve kabul ettiği değer neyse o
 * yazılıyor.
 *
 * @param {unknown} ham
 * @returns {string}
 */
export function kullaniciAdiHarfeIndir(ham) {
  const metin = String(ham ?? '');
  let cevrilmis = '';
  for (const harf of metin) {
    cevrilmis += HARF_KARSILIKLARI[harf] ?? harf;
  }
  return cevrilmis.toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Yeni kullanıcı adının geçersizlik sebebi.
 *
 * Girdi ÖNCE harfe indiriliyor, sonra ölçülüyor: kullanıcı ekranda zaten
 * indirgenmiş hâli görüyor ve hata cümlesi de o gördüğü şeyi anlatmalı.
 * Ham metne bakan bir kontrol, ekranda "ayse" yazarken "boşluk olamaz"
 * diyebilirdi.
 *
 * Uzunluk sınırları `sosyal_kullanici_adi_degistir` içindeki
 * `p_yeni !~ '^[a-z]{3,30}$'` kontrolünün aynısı; sunucu yine son söz
 * sahibi ve 'gecersiz-kullanici-adi' dönerse arayüz onu da yazıyor.
 *
 * @param {unknown} ham
 * @returns {string|null} hata cümlesi ya da null (geçerli)
 */
export function kullaniciAdiDegisimHatasi(ham) {
  const ad = kullaniciAdiHarfeIndir(ham);

  if (ad === '') return 'Kullanıcı adı gerekiyor.';
  if (ad.length < 3) return 'Kullanıcı adı en az 3 harf olmalı.';
  if (ad.length > 30) return 'Kullanıcı adı en fazla 30 harf olabilir.';

  /*
    Buraya düşen bir girdi olmamalı: yukarıdaki iki kontrol desenin
    bütün dallarını kapsıyor. Kontrol yine de duruyor çünkü tek doğru
    kaynak desenin kendisi.
  */
  if (!KULLANICI_ADI_HARF_DESENI.test(ad)) return 'Kullanıcı adı bu biçimde kullanılamıyor.';

  return null;
}

/**
 * Kullanıcının profil adresi — ekranda gösterilen tam hâli.
 *
 * `profilYolu` yalnız yolu veriyor ve gezinme için doğru olan o. Ama
 * kullanıcıya "adresin şu" derken alan adı da gerekiyor: yolun tek
 * başına kopyalanıp bir mesaja yapıştırılması işe yaramaz.
 *
 * Alan adı sabit ve tek yerde: iki dosyada yazılsaydı biri değiştiğinde
 * öteki eski alan adını göstermeye devam ederdi.
 *
 * @param {string} kullaniciAdi
 * @returns {string}
 */
export function profilAdresi(kullaniciAdi) {
  return `stajimvar.com${profilYolu(kullaniciAdi)}`;
}
