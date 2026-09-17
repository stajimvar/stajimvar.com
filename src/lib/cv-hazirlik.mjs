/**
 * CV HAZIRLIĞI VE PROFİL DOLULUĞU — TEK KAYNAK (17 Eylül 2026)
 *
 * Aynı bilgi farklı ekranlarda farklı tamamlanma durumu üretiyordu: profil
 * ekranı 11 adım sayıyordu (fotoğraf ve PDF yükleme dahil), ilan sayfası
 * 10 adım (not ortalaması dahil, fotoğraf ve CV hariç). İkisi de bu
 * dosyadan okuyor.
 *
 * KURALLAR
 *   - Fotoğraf İSTEĞE BAĞLI: yüzdeye girmiyor, eksikliği başarısızlık gibi
 *     sayılmıyor.
 *   - CV adımı iki yoldan tamamlanıyor: platformda oluşturulan CV (okul,
 *     bölüm ve en az bir beceri/program) YA DA yüklenmiş PDF. CV oluşturmuş
 *     öğrenciden ayrıca PDF istenmiyor.
 *   - Not ortalaması isteğe bağlı (formda da öyle yazıyor); adım değil.
 */

/** Platform CV'si okunur bir belge üretecek kadar dolu mu. */
export function platformCvHazirMi(ogrenci) {
  if (!ogrenci) return false;
  const beceri = (ogrenci.skills?.length ?? 0) + (ogrenci.softSkills?.length ?? 0);
  return Boolean(metin(ogrenci.university) && metin(ogrenci.department) && beceri > 0);
}

/** Başvuruda kullanılabilecek bir CV var mı: oluşturulmuş ya da yüklenmiş. */
export function cvVarMi(ogrenci) {
  if (!ogrenci) return false;
  return Boolean(metin(ogrenci.cvPath)) || platformCvHazirMi(ogrenci);
}

function metin(deger) {
  return typeof deger === 'string' ? deger.trim() : '';
}

/**
 * Profil adımları. `bolum` profil ekranındaki düzenleme bölümünün kimliği.
 * Sıra ekranda gösterilen sıra.
 */
export function profilAdimlari(ogrenci) {
  const s = ogrenci ?? {};
  return [
    { anahtar: 'okul', tamam: Boolean(metin(s.university) && metin(s.department)), etiket: 'okulunu gir', bolum: 'kisisel' },
    { anahtar: 'tanitim', tamam: Boolean(metin(s.bio)), etiket: 'kendini tanıt', bolum: 'kisisel' },
    { anahtar: 'telefon', tamam: Boolean(metin(s.phone)), etiket: 'telefonunu gir', bolum: 'kisisel' },
    { anahtar: 'cv', tamam: cvVarMi(s), etiket: 'CV oluştur', bolum: 'cv' },
    { anahtar: 'program', tamam: (s.skills?.length ?? 0) > 0, etiket: 'program ekle', bolum: 'teknik' },
    { anahtar: 'beceri', tamam: (s.softSkills?.length ?? 0) > 0, etiket: 'beceri ekle', bolum: 'sosyal' },
    { anahtar: 'dil', tamam: (s.languages?.length ?? 0) > 0, etiket: 'dil ekle', bolum: 'dil' },
    { anahtar: 'proje', tamam: (s.projects?.length ?? 0) > 0, etiket: 'proje ekle', bolum: 'proje' },
    { anahtar: 'hedef', tamam: (s.targetRoles?.length ?? 0) > 0, etiket: 'hedefini seç', bolum: 'tercih' },
    { anahtar: 'sehir', tamam: (s.preferences?.cities?.length ?? 0) > 0, etiket: 'şehir seç', bolum: 'tercih' },
  ];
}

/** Doluluk yüzdesi ve adımlar. */
export function profilDolulugu(ogrenci) {
  const adimlar = profilAdimlari(ogrenci);
  const tamamlanan = adimlar.filter((a) => a.tamam).length;
  return { adimlar, oran: Math.round((tamamlanan / adimlar.length) * 100) };
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
