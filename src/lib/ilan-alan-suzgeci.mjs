/**
 * İLAN LİSTESİNDE ALAN SÜZGECİ
 *
 * Kullanıcı isteği (25 Eylül 2026): "İlanları sektörlere göre filtrelemek
 * lazım", "Bir ilan 2 ayrı sektörde olabilir, bu durum sorun değil."
 *
 * İlanın alanları sunucuda türetiliyor (`listings.alan_idleri`, göç
 * 20261109010000): sitenin 24 alanından en çok ikisi. Bu modül listede
 * iki soruyu cevaplıyor: ilan seçime uyuyor mu (istemcide, ilanın
 * `alanIdleri`si ile) ve seçeneklerin yanına hangi sayı yazılacak
 * (sunucunun alan dağılımından). İkisi aynı kuralı paylaşıyor: iki
 * alanlı ilan her iki alana da giriyor.
 */

/*
  KESİŞİM, BİRLEŞİM DEĞİL — "HERHANGİ BİRİ"

  Seçim boşsa süzgeç yok: alanı olmayan ilan da dahil hepsi geçiyor.
  Alanı boş ilan ("Genel Staj Başvurusu" gibi) bir seçim yapıldığında
  düşüyor; onun için "Diğer" diye ayrı bir seçenek açılmıyor, çünkü
  "alanını söylemiyor" bir alan değil — uydurulmuş bir kova olurdu.
*/
export function alanaUyuyorMu(alanIdleri, seciliIdler) {
  if (!seciliIdler || seciliIdler.length === 0) return true;
  if (!Array.isArray(alanIdleri) || alanIdleri.length === 0) return false;
  return alanIdleri.some((id) => seciliIdler.includes(id));
}

/*
  SEÇENEKLER VE SAYILARI — SUNUCUNUN ALAN × TÜR DAĞILIMINDAN

  `dagilim` = katalog RPC'sinin `facets.alanlar`ı: `[{ alan, tip, count }]`,
  `alan` bir `sectors.id`, `tip` tür dağılımıyla (`facets.tipler`) aynı
  anahtar (sınıfı olmayan ilan 'siniflandirilmadi'). Sayılar sunucuda,
  ülke seçiminden sonra ve kataloğun TÜM sayfaları üzerinden hesaplanıyor.
  İstemcide saymak mümkün değil: elde yalnız yüklenmiş sayfalar (24'erli)
  var ve ikinci sayfadaki alanlar hiç görünmezdi — il dağılımının sunucuya
  taşınma gerekçesiyle aynı.

  TÜR NEDEN AYRI SATIR: tür süzgeci istemcide ve uygulama RPC'ye tür
  göndermiyor. Alan başına tek sayı gelseydi varsayılan listede (Staj +
  Uzun dönem) görünmeyen MT/trainee ilanları da sayılır, "Lojistik 2"
  yazan seçenek 1 ilan getirirdi. Burada yalnız `tipler`de SEÇİLİ türlerin
  satırları toplanıyor. `tipler` boşsa tür süzgeci yok demek (listedeki
  kuralla aynı: `ilanTipleri.length > 0` değilse süzme yapılmıyor) ve
  bütün satırlar toplanıyor.

  Bedeli: sayılar ÜLKE ve TÜR seçimiyle daralıyor, başka hiçbir şeyle
  değil. Arama, şehir, çalışma tercihi, tarih, şirket ya da kategori
  sekmesi seçildiğinde yanında yazan sayı değişmiyor; o seçimlerin
  gizlediği ilanlar da sayının içinde. İki alanlı ilan iki alanda da
  sayılıyor, toplam ilan sayısını aşabilir.

  Dağılım yoksa (eski açılış tohumu) ya da alan adları gelmediyse `[]`:
  blok çizilmiyor, uydurma sayı yazılmıyor.

  SIRA SİTENİN ALAN SIRASI (`sectors.sira`), sayıya göre değil: sabit bir
  sınıflandırmada kutunun yeri değişmemeli.

  Sayısı 0 olan alan çizilmiyor — seçince boş liste veren bir seçenek
  yanıltıyor. Seçili olan kalıyor ve "0" yazıyor; yoksa ülke ya da tür
  değiştikten sonra işaret kaldırılamadan kutu kaybolurdu.
*/
export function alanSecenekleri(sektorler, dagilim, seciliIdler = [], tipler = []) {
  if (!Array.isArray(sektorler) || sektorler.length === 0) return [];
  if (!Array.isArray(dagilim)) return [];
  const turSuzgeciVar = Array.isArray(tipler) && tipler.length > 0;
  const sayim = new Map();
  for (const satir of dagilim) {
    if (!satir || typeof satir.alan !== 'string' || !Number.isFinite(satir.count)) continue;
    if (turSuzgeciVar && !tipler.includes(satir.tip)) continue;
    sayim.set(satir.alan, (sayim.get(satir.alan) ?? 0) + satir.count);
  }
  return sektorler
    .map((s) => ({ id: s.id, slug: s.slug, ad: s.ad, adet: sayim.get(s.id) ?? 0 }))
    .filter((s) => s.adet > 0 || seciliIdler.includes(s.id));
}
