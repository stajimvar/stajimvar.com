/**
 * İLAN İSTATİSTİK AYRINTISI (9 Kasım 2026, rakip analizi #11)
 *
 * Dönüşüm = başvuru / görüntülenme. Ölçüm 10 Ekim 2026'da başladı;
 * öncesinden gelen başvurular görüntülenmeyi aşabiliyor. O durumda oran
 * YAZILMIYOR (%100'ü aşan bir oran uydurma olurdu).
 */
export function donusumOrani(basvuru, goruntulenme) {
  const b = Number(basvuru);
  const g = Number(goruntulenme);
  if (!Number.isFinite(b) || !Number.isFinite(g) || g <= 0 || b < 0 || b > g) return null;
  return Math.round((b / g) * 1000) / 10;
}

export function oranMetni(oran) {
  return oran === null ? '' : `%${String(oran).replace('.', ',')}`;
}

/** Günlük dizinin özeti: toplamlar ve en yoğun gün (eşitte en yenisi). */
export function gunlukOzet(gunler) {
  let goruntulenme = 0;
  let basvuru = 0;
  let enYogun = null;
  for (const g of gunler) {
    goruntulenme += g.goruntulenme;
    basvuru += g.basvuru;
    if (g.goruntulenme > 0 && (!enYogun || g.goruntulenme >= enYogun.goruntulenme)) enYogun = g;
  }
  return { goruntulenme, basvuru, enYogun };
}
