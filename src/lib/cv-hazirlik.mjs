/**
 * CV HAZIRLIĞI VE PROFİL DOLULUĞU — TEK KAYNAK (17 Eylül 2026)
 *
 * Aynı bilgi farklı ekranlarda farklı tamamlanma durumu üretiyordu: profil
 * ekranı 11 adım sayıyordu (fotoğraf ve PDF yükleme dahil), ilan sayfası
 * 10 adım (not ortalaması dahil, fotoğraf ve CV hariç). İkisi de bu
 * dosyadan okuyor.
 *
 * Tamamlanma kuralları 11 Ekim 2026'da değişti; aşağıda, `profilAdimlari`
 * başlığında. CV: platformda oluşturulan CV (okul ve bölüm) YA DA
 * yüklenmiş PDF; ikisi de yüzdeye girmiyor.
 */

/** Platform CV'si okunur bir belge üretecek kadar dolu mu. */
export function platformCvHazirMi(ogrenci) {
  if (!ogrenci) return false;
  return Boolean(metin(ogrenci.university) && metin(ogrenci.department));
}

/** Başvuruda kullanılabilecek bir CV var mı: oluşturulmuş ya da yüklenmiş. */
export function cvVarMi(ogrenci) {
  if (!ogrenci) return false;
  return Boolean(metin(ogrenci.cvPath)) || platformCvHazirMi(ogrenci);
}

function metin(deger) {
  return typeof deger === 'string' ? deger.trim() : '';
}

/*
  PROFİL TAMAMLANMA — YALNIZ TEMEL BİLGİLER (11 Ekim 2026, kullanıcı kararı)

  Temel bilgilerdeki zorunlu alanlar dolunca profil %100. Yetenek, ilgi
  alanı, proje, sertifika, deneyim, bağlantılar, not ortalaması, hedef
  pozisyon, PDF CV ve CV görünürlük tercihleri yüzdeyi ETKİLEMİYOR: boş
  olmaları profili "eksik" yapmıyor. Deneyimi olmayan öğrenci sahte
  deneyim yazmak zorunda kalmıyor; LinkedIn'i olmayan zorlanmıyor.

  Zorunlu adımlar (sekiz; her biri gerçekten dolu olunca sayılıyor):
    kişisel  → ad ve soyad, profil fotoğrafı, şehir, telefon, e-posta, hakkımda
    eğitim   → en az bir okul: okul, bölüm, düzey, başlangıç yılı ve
               "devam ediyor" ya da mezuniyet yılı
    dil      → en az bir dil, seviyesiyle

  "DEVAM EDİYOR" BİLGİSİ UYDURULMUYOR: `educationOngoing` boşsa (eski
  kayıt) profil ekranıyla aynı kural — sınıfı "Yüksek Lisans / Mezun"
  değilse sürüyor sayılıyor; mezunsa mezuniyet yılı ancak öğrenci "devam
  etmiyor" dediğinde geçerli (boş yıl okuyucuda tahminle dolduruluyor,
  queries/mappers).

  Fotoğraf iki kaynaktan gelebiliyor (sosyal profilin `avatar_path`ı ya
  da eski `avatarUrl`); çağıran yolu biliyorsa `fotografVar` ile söylüyor.

  `bolum` profil düzenleme ekranındaki bölümün kimliği (DuzenlemeBolumu).
*/

/** "Ayşe Nur Kaya" → { ad: "Ayşe Nur", soyad: "Kaya" }. Tek kelimede soyad boş. */
export function adSoyadAyir(tamAd) {
  const parcalar = metin(tamAd).split(/\s+/).filter(Boolean);
  if (parcalar.length < 2) return { ad: parcalar[0] ?? '', soyad: '' };
  return { ad: parcalar.slice(0, -1).join(' '), soyad: parcalar[parcalar.length - 1] };
}

const yil = (deger) => Number.isInteger(deger) && deger > 1900;

/** Ana okul (student_profiles) tamam mı. */
function anaEgitimTamamMi(s) {
  if (!metin(s.university) || !metin(s.department) || !metin(s.educationLevel) || !yil(s.educationStartYear)) return false;
  if (s.educationOngoing === true) return true;
  if (s.educationOngoing === false) return yil(s.graduationYear);
  return s.gradeLevel !== 'Yüksek Lisans / Mezun';
}

/** Ek eğitim kaydı (student_educations) tamam mı. */
function ekEgitimTamamMi(e) {
  if (!metin(e?.school) || !metin(e?.department) || !metin(e?.level) || !yil(e?.startYear)) return false;
  return Boolean(e.ongoing) || yil(e.endYear);
}

export function egitimTamamMi(ogrenci) {
  const s = ogrenci ?? {};
  return anaEgitimTamamMi(s) || (s.educations ?? []).some(ekEgitimTamamMi);
}

/** Zorunlu adımlar. Sıra ekranda gösterilen sıra. */
export function profilAdimlari(ogrenci, { fotografVar } = {}) {
  const s = ogrenci ?? {};
  const { ad, soyad } = adSoyadAyir(s.fullName);
  return [
    { anahtar: 'ad', tamam: Boolean(ad && soyad), etiket: 'adını ve soyadını yaz', bolum: 'kisisel', alan: 'ad' },
    {
      anahtar: 'foto',
      tamam: fotografVar ?? Boolean(metin(s.avatarUrl)),
      etiket: 'profil fotoğrafı ekle',
      bolum: 'foto',
      alan: null,
    },
    { anahtar: 'sehir', tamam: Boolean(metin(s.city)), etiket: 'şehrini seç', bolum: 'kisisel', alan: 'sehir' },
    { anahtar: 'telefon', tamam: Boolean(metin(s.phone)), etiket: 'telefonunu yaz', bolum: 'kisisel', alan: 'telefon' },
    { anahtar: 'eposta', tamam: Boolean(metin(s.email)), etiket: 'e-postanı ekle', bolum: 'kisisel', alan: null },
    { anahtar: 'tanitim', tamam: Boolean(metin(s.bio)), etiket: 'kendini kısaca tanıt', bolum: 'kisisel', alan: 'bio' },
    { anahtar: 'egitim', tamam: egitimTamamMi(s), etiket: 'eğitim bilgini tamamla', bolum: 'egitim', alan: null },
    {
      anahtar: 'dil',
      tamam: (s.languages ?? []).some((l) => metin(l?.language) && metin(l?.level)),
      etiket: 'bildiğin bir dili ekle',
      bolum: 'dil',
      alan: null,
    },
  ];
}

/**
 * Tamamlanma yüzdesi — sitedeki BÜTÜN göstergeler (profil, ilanlar,
 * düzenleme ekranı, hesap menüsü) buradan okuyor.
 */
export function profilDolulugu(ogrenci, secenekler = {}) {
  const adimlar = profilAdimlari(ogrenci, secenekler);
  const tamamlanan = adimlar.filter((a) => a.tamam).length;
  const oran = Math.round((tamamlanan / adimlar.length) * 100);
  return { adimlar, oran, tamam: tamamlanan === adimlar.length };
}

/* ------------------------------------------------------------------ */
/* Kayıt sonrası karşılama ve ilan sayfasındaki küçük çağrı           */
/* ------------------------------------------------------------------ */

/**
 * Karşılamanın yayına girdiği an. Bu andan ÖNCE açılmış hesaplar mevcut
 * kullanıcı sayılıyor ve karşılamayı hiç görmüyor.
 */
export const KARSILAMA_YAYIN_ANI = Date.parse('2026-09-17T00:00:00+03:00');

/** Yeni hesap penceresi: hesap açıldıktan sonra bu süre içinde gösteriliyor. */
export const KARSILAMA_PENCERESI_MS = 14 * 24 * 60 * 60 * 1000;

const KARSILAMA_ONEKI = 'stajimvar:cv-karsilama:v1:';
const CAGRI_ONEKI = 'stajimvar:cv-cagrisi-kapatildi:v1:';

const KIMLIK = /^[0-9a-f-]{16,64}$/i;

function oku(depo, anahtar) {
  if (!depo) return null;
  try {
    return depo.getItem(anahtar);
  } catch {
    return null;
  }
}

function yaz(depo, anahtar, deger) {
  if (!depo) return false;
  try {
    depo.setItem(anahtar, deger);
    return true;
  } catch {
    return false;
  }
}

/**
 * Karşılama bu hesaba gösterilsin mi. Anahtar KULLANICI KİMLİĞİYLE: aynı
 * tarayıcıda başka bir hesabın tercihi bu hesabı etkilemiyor.
 */
export function karsilamaGosterilsinMi({ depo, kullaniciId, hesapOlusturmaAni, cvVar = false, simdi = Date.now() }) {
  if (!kullaniciId || !KIMLIK.test(String(kullaniciId))) return false;
  if (cvVar) return false;
  const olusturma = Date.parse(hesapOlusturmaAni ?? '');
  if (!Number.isFinite(olusturma)) return false;
  if (olusturma < KARSILAMA_YAYIN_ANI) return false;
  if (simdi - olusturma > KARSILAMA_PENCERESI_MS) return false;
  return oku(depo, KARSILAMA_ONEKI + kullaniciId) === null;
}

/** Karşılama gösterildi/atlandı: bir daha açılmıyor. */
export function karsilamaIsaretle(depo, kullaniciId, durum = 'gosterildi') {
  if (!kullaniciId || !KIMLIK.test(String(kullaniciId))) return false;
  return yaz(depo, KARSILAMA_ONEKI + kullaniciId, durum);
}

/** İlan sayfasındaki CV çağrısı bu hesapta kapatılmış mı. */
export function cvCagrisiKapatildiMi(depo, kullaniciId) {
  if (!kullaniciId) return true;
  return oku(depo, CAGRI_ONEKI + kullaniciId) !== null;
}

export function cvCagrisiniKapat(depo, kullaniciId) {
  if (!kullaniciId || !KIMLIK.test(String(kullaniciId))) return false;
  return yaz(depo, CAGRI_ONEKI + kullaniciId, '1');
}
