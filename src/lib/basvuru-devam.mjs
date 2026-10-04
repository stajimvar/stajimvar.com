/**
 * BAŞVURU KAPISI — "Başvur"a basınca ya da girişten dönünce NE OLACAK?
 *
 * Tek karar tablosu; hem doğrudan tıklama (`handleApplyToJob`) hem giriş
 * sonrası devam (`niyet`) bunu çağırıyor. İki yerde ayrı ayrı `if`
 * zinciri olsaydı biri yeni bir durumu öğrenip öteki öğrenmeyebilirdi —
 * #309 sonrası kalan üç açık tam olarak böyle doğmuştu:
 *
 *   1. Oturum açık, öğrenci profili HENÜZ YÜKLENİYOR → kayıt penceresi
 *      açılıyordu ("profil yok" ile "henüz bilinmiyor" aynı `null`du).
 *   2. Şirket hesabıyla dönen niyet SESSİZCE siliniyordu.
 *   3. Giriş sırasında yayından kalkan / kapanan ilan sessizce geçiliyordu.
 *
 * Saf modül: React ve Supabase bilmiyor; Node testinde doğrudan sınanıyor.
 */

export const MESAJ_SIRKET_HESABI = 'Başvurmak için öğrenci hesabıyla giriş yapmalısın.';
export const MESAJ_ILAN_KAPALI = 'Bu ilan artık başvuru kabul etmiyor.';
export const MESAJ_ZATEN_BASVURDU = 'Bu ilana zaten başvurdun.';
export const MESAJ_PROFIL_YOK = 'Başvurmadan önce öğrenci profilini tamamlaman gerekiyor.';
export const MESAJ_PROFIL_HATA = 'Profilin yüklenemedi. Biraz sonra yeniden dene.';

/**
 * İlan bugün başvuru kabul ediyor mu?
 *
 * Sunucudaki başvuru politikasının ("ogrenci basvuru yapar") istemci
 * karşılığı: ilan yayında VE son başvuru tarihi yok ya da bugün/sonrası.
 * Tarih karşılaştırması gün düzeyinde (YYYY-AA-GG): son gün de açık.
 *
 * @param {{ applicationDeadline?: string | null, status?: string } | null | undefined} ilan
 * @param {string} bugun  YYYY-AA-GG
 */
export function basvuruyaAcikMi(ilan, bugun) {
  if (!ilan) return false;
  if (ilan.status !== undefined && ilan.status !== 'published') return false;
  const son = (ilan.applicationDeadline || '').slice(0, 10);
  return !son || son >= bugun;
}

export const ETIKET_SURE_DOLDU = 'Başvuru süresi doldu';
export const ETIKET_ILAN_KAPALI = 'İlan başvuruya kapalı';

/**
 * İlan neden başvuru kabul etmiyor? Açıksa `null`.
 *
 * Düğme yerine çizilecek durum etiketini seçmek için: son başvuru günü
 * geçmişse "süre doldu", yayında değilse "kapalı". İkisi birlikteyse
 * yayın durumu önce gelir — yayından kalkmış ilan için "süresi doldu"
 * demek nedeni yanlış söylemek olur.
 *
 * DÜĞMEYİ GİZLEMEK SUNUCU KONTROLÜNÜN YERİNE GEÇMİYOR: sayfa açıkken ilan
 * kapanabilir. Gönderimde başvuru politikası ("ogrenci basvuru yapar")
 * yayın ve son günü yeniden denetliyor; girişten dönüşte ilan sunucudan
 * yeniden okunuyor.
 *
 * @param {{ applicationDeadline?: string | null, status?: string } | null | undefined} ilan
 * @param {string} bugun  YYYY-AA-GG
 * @returns {'sure-doldu' | 'kapali' | null}
 */
export function basvuruKapanisNedeni(ilan, bugun) {
  if (!ilan) return 'kapali';
  if (ilan.status !== undefined && ilan.status !== 'published') return 'kapali';
  const son = (ilan.applicationDeadline || '').slice(0, 10);
  if (son && son < bugun) return 'sure-doldu';
  return null;
}

/**
 * Karar.
 *
 * @param {object} g
 * @param {boolean} g.oturumVar
 * @param {string | null | undefined} g.rol            oturumun rolü ('company' şirket hesabı)
 * @param {'yukleniyor' | 'hazir' | 'yok' | 'hata'} g.profil  öğrenci profilinin durumu
 * @param {boolean} g.basvurularHazir                  öğrencinin başvuru listesi okundu mu
 * @param {boolean} g.zatenBasvurdu
 * @param {'yukleniyor' | 'bulundu' | 'bulunamadi'} g.ilan   ilanın SUNUCUDAKİ güncel hâli
 * @param {boolean} g.platformIci                      `basvuruYolu(ilan).anaEylem === 'platform-ici'`
 * @param {boolean} g.acik                             `basvuruyaAcikMi(ilan, bugun)`
 * @returns {{ tur: 'giris' | 'bekle' | 'sirket-hesabi' | 'profil-yok' | 'profil-hata' | 'kapali' | 'zaten' | 'ac', mesaj?: string }}
 */
export function basvuruKarari(g) {
  if (!g.oturumVar) return { tur: 'giris' };
  /* Şirket hesabının öğrenci profili yok; profili beklemek anlamsız. */
  if (g.rol === 'company') return { tur: 'sirket-hesabi', mesaj: MESAJ_SIRKET_HESABI };
  /*
    "Henüz bilinmiyor" ≠ "yok": yüklenirken kayıt penceresi açmak, zaten
    oturum açmış kişiden yeniden hesap istemek demekti.
  */
  if (g.profil === 'yukleniyor') return { tur: 'bekle' };
  if (g.profil === 'hata') return { tur: 'profil-hata', mesaj: MESAJ_PROFIL_HATA };
  if (g.profil === 'yok') return { tur: 'profil-yok', mesaj: MESAJ_PROFIL_YOK };
  if (g.ilan === 'yukleniyor') return { tur: 'bekle' };
  if (g.ilan === 'bulunamadi' || !g.platformIci || !g.acik) return { tur: 'kapali', mesaj: MESAJ_ILAN_KAPALI };
  /* Liste okunmadan "zaten başvurdun" ya da "aç" denmiyor. */
  if (!g.basvurularHazir) return { tur: 'bekle' };
  if (g.zatenBasvurdu) return { tur: 'zaten', mesaj: MESAJ_ZATEN_BASVURDU };
  return { tur: 'ac' };
}
