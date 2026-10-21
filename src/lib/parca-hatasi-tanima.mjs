/**
 * Gecikmeli parça (dinamik import) yükleme hatası mı?
 *
 * Tarayıcılar aynı hatayı farklı yazıyor; hepsi burada. Parça hatası
 * sınırı (lib/parca-hatasi.tsx) YALNIZ bunları yakalıyor, gerisini yukarı
 * geçiriyor — gerçek uygulama hataları gizlenmesin diye.
 *
 *   Chromium  "Failed to fetch dynamically imported module: …"
 *   Firefox   "error loading dynamically imported module"
 *   Safari    "Importing a module script failed."
 *   Vite      "Unable to preload CSS for …" (vite:preloadError)
 */
const PARCA_HATASI =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Loading chunk [\w-]+ failed/i;

export function parcaYuklemeHatasiMi(hata) {
  if (!hata) return false;
  const ad = typeof hata === 'object' && 'name' in hata ? String(hata.name) : '';
  const mesaj = typeof hata === 'object' && 'message' in hata ? String(hata.message) : String(hata);
  return ad === 'ChunkLoadError' || PARCA_HATASI.test(mesaj);
}
