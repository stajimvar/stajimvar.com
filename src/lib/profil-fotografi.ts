/**
 * PROFİL FOTOĞRAFININ TEK KAYNAĞI
 *
 * Bir kullanıcının İKİ fotoğrafı vardı ve ikisi birbirinden habersizdi:
 *   · `student_profiles.avatar_url` — sol sütundaki kamera düğmesinden
 *     yüklenen, herkese açık adres
 *   · `social_profiles.avatar_path` — sosyal profilin düzenleme
 *     bloğundan yüklenen, private kovadaki depolama yolu
 * Aynı kişinin profil ekranında bir fotoğraf, sosyal profilinde başka
 * bir fotoğraf görünebiliyordu; hangisinin "asıl" olduğunu kullanıcı
 * hiçbir yerden okuyamıyordu.
 *
 * KARAR: TEK KAYNAK `avatar_path`
 * -------------------------------
 * Yükleme ve kaldırma yalnız sosyal bloktan yapılıyor. `avatar_url`
 * kolonu SİLİNMEDİ ve okunmaya devam ediyor: eskiden kamera düğmesiyle
 * fotoğraf yüklemiş kullanıcı bu değişiklikle fotoğrafsız kalmamalı.
 * Yani kolon artık yazılmıyor ama yedek olarak duruyor.
 *
 * KARAR TEK YERDE
 * ---------------
 * Her çağrı yerinde `avatarYolu ?? avatarUrl` yazılsaydı iki değer
 * birbirinin yerine geçebilir sanılırdı; oysa biri DEPOLAMA YOLU (kova
 * private, dosya oturumla iniyor), öteki doğrudan bir ADRES. İkisi aynı
 * `<img src>` alanına konamaz. Bu yüzden karar burada veriliyor ve
 * dışarı ayrık bir durum olarak çıkıyor.
 *
 * 'bilinmiyor' NEDEN AYRI BİR DURUM
 * ---------------------------------
 * Sosyal satır sayfayla aynı anda gelmiyor. O aralıkta baş harf çizmek,
 * fotoğrafı olan kullanıcıda her açılışta "fotoğrafı yok → var" diye bir
 * yanıp sönme üretirdi ve ilk kare YANLIŞ bilgi olurdu. Yedek adres
 * varsa beklemeye gerek yok (o adres zaten elde); yoksa çağıran taraf
 * iskelet çiziyor.
 */

export type ProfilFotografKaynagi =
  /** Sosyal satır henüz gelmedi ve gösterilecek yedek de yok. */
  | { tur: 'bilinmiyor' }
  /** `social_profiles.avatar_path`; private kovadan oturumla iniyor. */
  | { tur: 'yol'; yol: string }
  /** `student_profiles.avatar_url`; doğrudan kullanılabilir adres. */
  | { tur: 'adres'; adres: string }
  /** İkisi de yok: baş harfler. */
  | { tur: 'yok' };

/** Boş dize de "yok" sayılıyor: kolon eski satırlarda '' olabiliyor. */
function dolu(deger: string | null | undefined): deger is string {
  return typeof deger === 'string' && deger.trim() !== '';
}

/**
 * Gösterilecek fotoğrafı seçiyor.
 *
 * @param avatarYolu   `social_profiles.avatar_path`; `undefined` =
 *                     sosyal satır henüz okunmadı, `null` = fotoğraf yok.
 * @param ogrenciAvatarUrl `student_profiles.avatar_url` yedeği.
 */
export function profilFotografi(
  avatarYolu: string | null | undefined,
  ogrenciAvatarUrl?: string | null,
): ProfilFotografKaynagi {
  if (dolu(avatarYolu)) return { tur: 'yol', yol: avatarYolu };
  if (dolu(ogrenciAvatarUrl)) return { tur: 'adres', adres: ogrenciAvatarUrl };
  /* Yol okunmadıysa "yok" denemez: bilinmeyen ile boş aynı şey değil. */
  return avatarYolu === undefined ? { tur: 'bilinmiyor' } : { tur: 'yok' };
}
