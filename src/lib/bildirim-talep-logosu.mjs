/**
 * YÖNETİCİ TALEP BİLDİRİMİNDE ŞİRKET LOGOSU (12 Kasım 2026, kullanıcı isteği)
 *
 * "Yeni şirket talebi onayını bekliyor", "otomatik onaylandı" ve
 * "Sahiplenme talebi" satırları tür simgesiyle çiziliyordu. Olay kimliği
 * dedupe_key'de duruyor (20261228010000):
 *   yonetici-sirket-talebi:<talep>   yonetici-sirket-otomatik:<talep>
 *   yonetici-sahiplenme:<sahiplenme>
 * Logo: talebe yüklenen logo, yoksa (onaylandıysa) şirketin logosu;
 * hiçbiri yoksa satır simgeyle kalıyor — logo uydurulmuyor.
 */
const ONEKLER = {
  'yonetici-sirket-talebi': 'talep',
  'yonetici-sirket-otomatik': 'talep',
  'yonetici-sahiplenme': 'sahiplenme',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** { tur: 'talep'|'sahiplenme', id } ya da null. */
export function talepAnahtari(anahtar) {
  const [onek, id] = String(anahtar ?? '').split(':');
  const tur = ONEKLER[onek];
  return tur && UUID.test(id ?? '') ? { tur, id } : null;
}

const guvenliLogo = (adres) => {
  const s = String(adres ?? '').trim();
  return /^https:\/\//i.test(s) ? s : null;
};

/** Sorgu satırlarından talep kimliği → { sirketAdi, logo } haritası. */
export function talepGorselHaritasi(talepler = [], sahiplenmeler = []) {
  const harita = new Map();
  for (const t of talepler) {
    const logo = guvenliLogo(t?.logo_url) ?? guvenliLogo(t?.sirket?.logo_url);
    if (logo) harita.set(`talep:${t.id}`, { sirketAdi: t?.sirket_adi ?? null, logo });
  }
  for (const c of sahiplenmeler) {
    const logo = guvenliLogo(c?.sirket?.logo_url);
    if (logo) harita.set(`sahiplenme:${c.id}`, { sirketAdi: c?.sirket?.name ?? null, logo });
  }
  return harita;
}
