// A single same-tab return entry, not a persistent catalog or an all-record cache.
let returnEntry = null;
const RETURN_TTL_MS = 5 * 60 * 1000;

export function saveCatalogReturn(key, value, now = Date.now()) {
  returnEntry = { key, value, savedAt: now };
}

export function readCatalogReturn(key, now = Date.now()) {
  if (!returnEntry || !key || returnEntry.key !== key) return null;
  if (now - returnEntry.savedAt >= RETURN_TTL_MS) {
    returnEntry = null;
    return null;
  }
  return returnEntry.value;
}

export function mergeCatalogEvents(previous, incoming) {
  const seen = new Set();
  return [...previous, ...incoming].filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}
