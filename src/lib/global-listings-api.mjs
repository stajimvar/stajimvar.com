/**
 * Katalog yanıtının sözleşmeye uyduğunu doğrular.
 *
 * Ayrı bir işlev, çünkü aynı yanıt iki yoldan geliyor: canlı RPC çağrısı
 * ve HTML'e gömülü açılış tohumu (`lib/ilk-katalog.ts`). Tohum sunucudan
 * geliyor ama yine de dışarıdan gelen bir veri; canlı yanıtla aynı
 * kapıdan geçmesi gerekiyor, yoksa eksik bir tohum ekranda sıfırlar
 * çizerdi.
 */
export function katalogYanitiniDogrula(data) {
  if (!data || !Array.isArray(data.listings) || !Array.isArray(data.facets?.countries)
      || !Number.isInteger(data.total) || data.total < 0
      /*
        Sayaçlar da sözleşmenin parçası. Eksik gelirse sessizce 0 çizmek
        yerine yanıt reddediliyor: sıfır, "hiç şirket yok" demek olurdu ve
        ekranda uydurma bir rakam duruyordu.
      */
      || !Number.isInteger(data.companyTotal) || data.companyTotal < 0
      || !Number.isInteger(data.cityTotal) || data.cityTotal < 0
      || !Number.isInteger(data.verifiedTotal) || data.verifiedTotal < 0
      || typeof data.hasMore !== 'boolean' || typeof data.snapshot !== 'string') {
    throw new Error('Global ilan kataloğu geçersiz yanıt verdi');
  }
  if (data.hasMore && (!data.nextCursor || typeof data.nextCursor.value !== 'string' || typeof data.nextCursor.id !== 'string')) {
    throw new Error('Global ilan kataloğu geçersiz imleç verdi');
  }
  return data;
}

/*
  KATALOG v3 — TEK SÖZLEŞME

  v2 son başvuru tarihine BAKMIYORDU; sitemap bakıyordu. Ölçüldü
  (20-21 Eylül 2026): /staj-ilanlari sayacı 107, sitemap 190,
  veritabanı published 191 — üç yüzey üç ayrı SQL yazıyordu.

  v2 ayrıca şehir sayısını HAM metinden hesaplıyordu: "İstanbul",
  "Istanbul", "Atasehir Istanbul" ve "Turkey - Istanbul" dört ayrı
  şehir sayılıyor, ekranda "10 şehirde" yazıyordu. Gerçek il sayısı 7.

  v3 normalize `il` kolonunu sayıyor ve normalize alanları satır
  yüküyle gönderiyor — kartın "kaynağı belirsiz" / "bağlantı kırık"
  etiketi gösterebilmesi buna bağlı.

  `tip` süzgeci varsayılan staj listesini kuruyor: MT, trainee ve
  erken kariyer ilanları oraya SIZMIYOR ama silinmiyor; kendi
  süzgeçlerinde erişilebilir kalıyorlar.
*/
export async function requestPublishedListingsCatalog(client, options = {}) {
  const { data, error } = await client.rpc('get_published_listings_catalog_v3', {
    p_country: options.country ?? 'all',
    p_cursor_posted_at: options.cursor?.value ?? null,
    p_cursor_id: options.cursor?.id ?? null,
    p_snapshot: options.snapshot ?? null,
    p_tip: options.tip ?? null,
  });
  if (error) throw new Error(error.message || 'İlan kataloğu yüklenemedi');
  return katalogYanitiniDogrula(data);
}
