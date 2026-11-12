/**
 * SİSTEM BİLDİRİMİNDE STAJIMVAR LOGOSU (13 Kasım 2026, kullanıcı isteği)
 *
 * Şirkete StajımVar'ın KENDİSİNDEN giden bildirimler (onay, ret, ilan
 * kararı, süre, hatırlatma) tür simgesiyle çiziliyordu; kimden geldiği
 * görünmüyordu. Bu türlerde görsel StajımVar logosu, tür simgesi
 * köşedeki rozette kalıyor (başvuru bildirimindeki şirket logosu deseni).
 *
 * Kişiden ya da başvurudan gelen bildirimler (yeni başvuru, mesaj,
 * takip…) bu listede DEĞİL: onların görseli kişinin/şirketin kendisi.
 * Türler göçlerden: 20261224010000, 20261226010000, 20261227010000,
 * 20270110010000.
 */
export const SISTEM_TURLERI = new Set([
  'sirket_onaylandi',
  'sirket_reddedildi',
  'sahiplenme_onaylandi',
  'sahiplenme_reddedildi',
  'sirket_dogrulandi',
  'sirket_dogrulama_reddedildi',
  'ilan_yayinda',
  'ilan_inceleme',
  'ilan_yonetici_ret',
  'ilan_yonetici_kaldirdi',
  'ilan_degisiklik_ret',
  'ilan_suresi_doluyor',
  'ilan_kapandi',
  'basvuru_bekliyor',
]);

export const STAJIMVAR_LOGOSU = '/logo.png';

export function sistemBildirimiMi(tur) {
  return SISTEM_TURLERI.has(String(tur ?? ''));
}
