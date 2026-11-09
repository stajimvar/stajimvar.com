/**
 * ÜYE OLMAYANA DIŞ BAŞVURU YERİNE KAYIT — NEDENİYLE (9 Kasım 2026, kullanıcı isteği)
 *
 * "İlanlarda ve burslarda şirket sayfasına yönlendiriyoruz; StajımVar'a
 * üye olmayanları yönlendirme, kayıt olmaya yönlendir ve bunu açıkla."
 *
 * Kayıt penceresinin üstünde bu not duruyor. Vaatler sitenin BUGÜN
 * yaptıkları: başvuru takibi, son başvuru hatırlatması (kaydedilen ilan
 * ve fırsat, 20261226010000 / 20261227010000), bölüme uygun yeni ilan
 * bildirimi. Kayıt bitince başvuru sayfası kendiliğinden açılıyor
 * (lib/basvuru-niyeti).
 */
export const UYELIK_NOTLARI = {
  ilan: {
    baslik: 'Başvurmadan önce ücretsiz üye ol',
    aciklama:
      'Bu ilanın başvurusu şirketin kendi sitesinde yapılıyor. Üye olduğunda başvuru sayfası hemen açılır; ayrıca:',
    maddeler: [
      'Başvurduğun ilanları tek listede takip edersin.',
      'Kaydettiğin ilanların son başvurusu yaklaşınca hatırlatma alırsın.',
      'Bölümüne uygun yeni ilanlar sana bildirilir.',
    ],
  },
  burs: {
    baslik: 'Başvurmadan önce ücretsiz üye ol',
    aciklama:
      'Bu fırsatın başvurusu kurumun kendi sitesinde yapılıyor. Üye olduğunda başvuru sayfasına geçebilirsin; ayrıca:',
    maddeler: [
      'Kaydettiğin burs ve fırsatların son başvurusu yaklaşınca hatırlatma alırsın.',
      'Başvurularını ve kaydettiklerini tek yerde takip edersin.',
      'Bölümüne uygun yeni staj ilanları sana bildirilir.',
    ],
  },
};
