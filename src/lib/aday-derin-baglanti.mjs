/**
 * /sirket/basvuranlar?aday=<başvuruId> — ADRES ↔ AÇIK BAŞVURU
 *
 * NEDEN ADRESTE
 * -------------
 * Bildirim hedefi (`target_url`) zaten `/sirket/basvuranlar?aday=<id>`
 * biçiminde yazılıyor (20260913010000, 20261117010000) ama adresi
 * okuyan bir kod yoktu: bağlantı yeni sekmede ya da yenilemeyle
 * açıldığında yalnız liste geliyordu. Açık başvuru artık adreste
 * duruyor; ekranın açık olup olmadığının TEK kaynağı adres. Geri tuşu
 * adresi geri alınca ekran kapanıyor, ileri tuşu yeniden açıyor.
 *
 * YETKİ BURADA DEĞİL
 * ------------------
 * Şirketin göremediği başvuru `sirketBasvurulari` listesine hiç
 * gelmiyor (RLS). Bu modül yalnız "kimlik listede mi" diye bakıyor.
 * Listede yoksa geçersiz kimlik, başka şirketin başvurusu ve
 * doğrulanmamış şirket AYNI sonuca iniyor: ayrı cümle kurmak, başka
 * bir şirkete ait bir başvurunun VAR olduğunu sızdırırdı.
 *
 * Saf: tarayıcı nesnesi yok; tests/aday-derin-baglanti.test.mjs bağlıyor.
 */

export const ADAY_PARAMETRESI = 'aday';

/** Listede olmayan kimlik için tek, tarafsız cümle. */
export const BULUNAMADI_CUMLESI = 'Bu başvuru bulunamadı ya da görüntüleme yetkin yok.';

/*
  Kimlik uuid; yine de biçim burada dayatılmıyor. Biçimi bozuk kimlik
  de "listede yok" kolundan geçiyor ve aynı cümleyi alıyor — ayrı bir
  "geçersiz bağlantı" cümlesi, geçerli biçimli bir kimliğin başka bir
  şirkette var olabileceğini ima ederdi. Uzunluk sınırı yalnız adres
  çubuğuna yapıştırılmış rastgele uzun metnin durumu şişirmemesi için.
*/
const EN_UZUN = 100;

/** Arama dizesindeki açık başvuru kimliği; yoksa null. */
export function adrestekiAday(arama) {
  const deger = new URLSearchParams(String(arama ?? '')).get(ADAY_PARAMETRESI);
  const t = (deger ?? '').trim();
  return t && t.length <= EN_UZUN ? t : null;
}

/**
 * `aday` parametresi yazılmış (ya da silinmiş) adres. Öteki parametreler
 * (`ilan` süzgeci) ve sıraları korunuyor.
 */
export function adayliAdres(yol, arama, id) {
  const parametreler = new URLSearchParams(String(arama ?? ''));
  if (id) parametreler.set(ADAY_PARAMETRESI, String(id));
  else parametreler.delete(ADAY_PARAMETRESI);
  const dizi = parametreler.toString();
  return `${yol}${dizi ? `?${dizi}` : ''}`;
}

/**
 * Adresteki kimlik için karar.
 *
 *   'yok'         adreste kimlik yok
 *   'bekle'       liste henüz yüklenmedi ya da okunamadı — karar yok;
 *                 okuma hatası "bulunamadı" sayılmıyor (bilinmiyor)
 *   'ac'          kimlik listede
 *   'bulunamadi'  liste yüklü, kimlik yok
 *
 * @param {{ adresId: string|null, durum: 'yukleniyor'|'hazir'|'hata', kimlikler: Iterable<string> }} girdi
 */
export function derinBaglantiKarari({ adresId, durum, kimlikler }) {
  if (!adresId) return 'yok';
  if (durum !== 'hazir') return 'bekle';
  for (const k of kimlikler ?? []) if (String(k) === adresId) return 'ac';
  return 'bulunamadi';
}
