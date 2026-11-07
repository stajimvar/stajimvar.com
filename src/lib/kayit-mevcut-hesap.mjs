/**
 * KAYIT: E-POSTA ZATEN KAYITLI MI? (7 Kasım 2026)
 *
 * Supabase, kayıtlı bir e-postayla `signUp` çağrısına HATA DÖNMÜYOR (e-posta
 * varlığını dışarı sızdırmamak için). Ekran bunu ayırt etmeden "Hesabın
 * oluşturuldu" diyordu. Ölçülen olay: 27 Ağustos'ta açılıp doğrulanmamış bir
 * öğrenci hesabının e-postasıyla "İşverenim" kaydı yapıldı; yeni hesap
 * açılmadı, Supabase eski hesaba doğrulama postasını yeniden gönderdi ve
 * bağlantıya tıklayan kişi işveren değil eski öğrenci hesabıyla girdi.
 *
 * İki işaret, ikisi de SUNUCUNUN döndürdüğü kullanıcı nesnesinden (tarayıcı
 * saatine bakılmıyor, saat kayması karar vermiyor):
 *   · `identities` boş dizi  → doğrulanmış bir hesap zaten var; posta gitmedi.
 *   · açılış (`created_at`) son güncellemeden/son doğrulama postasından
 *     (`updated_at` / `confirmation_sent_at`) bir dakikadan eski → hesap daha
 *     önce açılmış ama doğrulanmamış; posta yeniden gönderildi.
 * Hiçbiri yoksa hesap şimdi açıldı.
 *
 * @param {{ identities?: unknown[] | null, created_at?: string | null,
 *           updated_at?: string | null, confirmation_sent_at?: string | null } | null | undefined} kullanici
 * @returns {'yeni' | 'dogrulanmis' | 'dogrulanmamis'}
 */
export function kayitSonucu(kullanici) {
  if (!kullanici) return 'yeni';
  if (Array.isArray(kullanici.identities) && kullanici.identities.length === 0) return 'dogrulanmis';
  const ms = (d) => {
    const t = d ? new Date(d).getTime() : NaN;
    return Number.isNaN(t) ? null : t;
  };
  const acilis = ms(kullanici.created_at);
  const sonHareket = Math.max(ms(kullanici.updated_at) ?? -Infinity, ms(kullanici.confirmation_sent_at) ?? -Infinity);
  if (acilis !== null && Number.isFinite(sonHareket) && sonHareket - acilis > ESKI_HESAP_ESIGI_MS) return 'dogrulanmamis';
  return 'yeni';
}

/** Açılış ile son hareket arasında bu kadar fark varsa hesap yeni değil. */
export const ESKI_HESAP_ESIGI_MS = 60_000;

/**
 * Kayıtlı e-posta için ekrandaki metin. İşveren bağlamında sahiplenme yolu
 * da söyleniyor: şirket sahiplenmesi onaylanınca mevcut hesap şirket hesabı
 * oluyor (approve_company_claim → profiles.role = 'company'); ayrı hesap
 * gerekmiyor.
 *
 * @param {'dogrulanmis' | 'dogrulanmamis'} durum
 * @param {boolean} isveren
 */
export function mevcutHesapMetni(durum, isveren) {
  const isverenEki = isveren
    ? ' İşveren olarak devam etmek için giriş yaptıktan sonra şirketini bu hesapla sahiplenebilirsin; ayrı bir hesap gerekmiyor.'
    : '';
  if (durum === 'dogrulanmamis') {
    return (
      'Bu e-postayla daha önce açılmış ama henüz doğrulanmamış bir hesabın var; yeni hesap açılmadı. ' +
      'Doğrulama bağlantısını yeniden gönderdik: bağlantıya tıklayınca o hesapla giriş yaparsın. ' +
      'Şifreni hatırlamıyorsan Giriş Yap ekranındaki "Şifremi unuttum"u kullan.' +
      isverenEki
    );
  }
  return 'Bu e-postayla zaten bir hesabın var; yeni hesap açılmadı. Giriş Yap sekmesinden giriş yap.' + isverenEki;
}
