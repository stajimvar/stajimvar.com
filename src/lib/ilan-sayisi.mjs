/**
 * İlan listesinin başlığında ve şirket şeridinde hangi sayı yazmalı?
 *
 * Sayfa ilanları 24'lük sayfalar hâlinde yüklüyor; gerisi "Daha fazla ilan
 * göster" ile geliyor. Başlıkta YÜKLENMİŞ kayıt sayısını göstermek kullanıcıya
 * "ilan bitti" dedirtiyordu — ölçülen örnek: katalogda 62 ilan varken başlıkta
 * "(24)" yazıyordu ve kullanıcı 24 ilan kaldığını sandı.
 *
 * Kural iki durumlu:
 *
 * - Listeyi daraltan hiçbir kullanıcı seçimi yokken sunucudan gelen toplam
 *   yazılıyor. Doğru olan o: liste henüz tamamı yüklenmemiş bir kümenin
 *   penceresi.
 * - Daraltma varken toplamı gösteremeyiz, çünkü süzme İSTEMCİDE ve yalnız
 *   yüklenmiş kayıtlar üzerinde çalışıyor. Sunucu "arama kutusuna 'yazılım'
 *   yazılınca kaç ilan kalır" sorusunun cevabını bilmiyor. O durumda doğru
 *   sayı yüklenmiş eşleşme sayısı.
 *
 * Toplam yoksa (prop opsiyonel, ilk yüklemede tanımsız olabiliyor) her
 * hâlükârda süzülmüş adede düşülüyor: uydurma bir sayı göstermektense elde
 * olanı göstermek.
 *
 * @param {object} girdi
 * @param {unknown} girdi.catalogTotal Sunucudan gelen katalog toplamı.
 * @param {number} girdi.suzulmusAdet Ekranda çizilen (süzülmüş) ilan sayısı.
 * @param {boolean} girdi.daraltmaVar Listeyi daraltan bir seçim açık mı?
 * @returns {number} Başlıkta ve şeritte gösterilecek sayı.
 */
export function gosterilecekIlanSayisi({ catalogTotal, suzulmusAdet, daraltmaVar }) {
  const suzulmus = Number.isFinite(suzulmusAdet) && suzulmusAdet > 0 ? Math.trunc(suzulmusAdet) : 0;

  if (daraltmaVar) return suzulmus;

  /*
    0 geçerli bir toplam: "hiç ilan yok" da bir cevap. Bu yüzden doğruluk
    kontrolü değil, sayı kontrolü yapılıyor.
  */
  if (!Number.isFinite(catalogTotal) || catalogTotal < 0) return suzulmus;

  /*
    Toplam, çizilen karttan az çıkarsa (bayat ya da eksik sayım) ekrandaki
    kartlar sayıyı yalanlar — kullanıcı kartları sayabiliyor. Böyle bir
    durumda gösterilebilecek en dürüst sayı büyük olan.
  */
  return Math.max(Math.trunc(catalogTotal), suzulmus);
}
