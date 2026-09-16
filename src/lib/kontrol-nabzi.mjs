/**
 * KONTROL NABZI — "Bugün N ilan kaynağından yeniden kontrol edildi"
 *
 * Gün sınırı Europe/Istanbul. Sayılan alan `source_verified_at`: bağlantı
 * kontrolü (scripts/ilan-baglanti-kontrol.mjs) bu alanı YALNIZ başarılı
 * sonuçta (`source_status = 'acik'`) yazıyor. `updated_at` ya da
 * `source_checked_at` kullanılmıyor: ilki kontrolle ilgisiz güncellemelerde
 * de değişiyor, ikincisi erişilemeyen denemelerde de ilerliyor.
 */

/** Verilen anın Europe/Istanbul gününün başlangıcı, ISO 8601 (ofsetli). */
export function istanbulGunBaslangici(zaman = Date.now()) {
  const tarih = new Date(zaman);
  const gun = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tarih);
  const ofsetParcasi = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    timeZoneName: 'longOffset',
  })
    .formatToParts(tarih)
    .find((p) => p.type === 'timeZoneName')?.value;
  const m = /GMT([+-]\d{2}):?(\d{2})?/.exec(ofsetParcasi || '');
  const ofset = m ? `${m[1]}:${m[2] || '00'}` : '+03:00';
  return `${gun}T00:00:00${ofset}`;
}

/** Sayı yalnız gerçekten pozitif bir tam sayıysa gösterilir; yoksa null. */
export function nabizAdedi(deger) {
  return Number.isInteger(deger) && deger > 0 ? deger : null;
}
