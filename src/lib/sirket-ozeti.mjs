/**
 * İLANLARIM ÖZETİ (10 Kasım 2026, dış değerlendirme: "kaç başvuru geldi,
 * kaç ilan aktif, hangi ilana daha çok başvuru oldu" özeti yok)
 *
 * Sayılar kartlardakiyle aynı kaynaktan: sirket_ilan_istatistikleri
 * (20270101010000); okunamayan ilanda başvuru `applicants_count`tan.
 * Ziyaret son 7 gün; dönüşüm toplam başvuru / toplam görüntülenme ve
 * başvuru görüntülenmeyi aşıyorsa yazılmıyor (ilan-istatistik.mjs).
 */
import { donusumOrani } from './ilan-istatistik.mjs';

export function sirketOzeti(ilanlar, istatistik = {}) {
  let yayinda = 0;
  let basvuru = 0;
  let goruntulenme = 0;
  let sonYediGun = 0;
  let istatistikVar = false;
  let enCok = null;
  for (const ilan of ilanlar ?? []) {
    const id = String(ilan?.id ?? '');
    if (ilan?.status === 'published') yayinda += 1;
    const s = istatistik?.[id];
    const b = s ? s.basvuru : Number(ilan?.applicants_count ?? 0) || 0;
    basvuru += b;
    if (s) {
      istatistikVar = true;
      goruntulenme += s.goruntulenme;
      sonYediGun += s.sonYediGun;
    }
    if (b > 0 && (!enCok || b > enCok.basvuru)) enCok = { id, baslik: String(ilan?.title ?? 'İlan'), basvuru: b };
  }
  return {
    yayinda,
    basvuru,
    sonYediGun: istatistikVar ? sonYediGun : null,
    donusum: istatistikVar ? donusumOrani(basvuru, goruntulenme) : null,
    enCok,
  };
}
