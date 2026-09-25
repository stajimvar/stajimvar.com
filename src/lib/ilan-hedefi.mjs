import { basvuruYolu } from './basvuru-yolu.mjs';

/**
 * İLAN KARTINDAKİ EYLEMİN HEDEFİ (mobil sadeleştirme, 25 Eylül 2026)
 *
 * Kartın sağ altındaki düğme gerçekte nereye gittiğini söylüyor. Veride
 * başvuru adresinin TÜRÜ (form mu, ilan sayfası mı) tutulmuyor; ölçüldü
 * (25 Eylül 2026): yayındaki 186 ilanın hepsi `external` ve 185'inde
 * `apply_url` ilanın kaynak sayfasıyla aynı. Bu yüzden:
 *
 *   platform-ici  → "Başvur" (StajımVar başvuru akışı)
 *   adres yok     → "İlanı incele" (StajımVar ilan detayı)
 *   dış adres     → yolu genel bir kariyer sayfasıysa "Kariyer sayfasına
 *                   git ↗", değilse "İlana git ↗"
 *
 * "Şirkette başvur ↗" KULLANILMIYOR: bir adresin doğrudan başvuru formu
 * olduğunu söyleyen doğrulanmış bir alan yok; formmuş gibi yazmak
 * kanıtsız bir vaat olurdu. Alan eklenirse tek değişecek yer burası.
 */

/** Kariyer sayfalarının bilinen genel yol adları (yalnız son parça). */
const GENEL_YOLLAR = new Set([
  'kariyer', 'careers', 'career', 'jobs', 'job', 'is-ilanlari', 'ilanlar', 'acik-pozisyonlar',
  'open-positions', 'positions', 'insan-kaynaklari', 'ik', 'hr', 'join-us', 'bize-katilin',
  'staj', 'internship', 'internships', 'tr', 'en',
]);

/**
 * Adres bir şirketin GENEL kariyer sayfası mı? Kök adres ya da en çok
 * iki parçalı ve son parçası genel bir ad olan yol ("/kariyer/",
 * "/en/careers"). Sorgu parametresi taşıyan adres ilana özeldir.
 *
 * @param {string} adres
 */
export function genelKariyerSayfasiMi(adres) {
  let url;
  try {
    url = new URL(adres);
  } catch {
    return false;
  }
  if (url.search) return false;
  const parcalar = url.pathname.split('/').filter(Boolean).map((p) => p.toLowerCase());
  if (parcalar.length === 0) return true;
  if (parcalar.length > 2) return false;
  return parcalar.every((p) => GENEL_YOLLAR.has(p));
}

/**
 * @typedef {object} IlanHedefi
 * @property {'basvur'|'ilan-detayi'|'dis-ilan'|'kariyer-sayfasi'} tur
 * @property {string} etiket düğme yazısı (ok işareti hariç)
 * @property {boolean} harici StajımVar dışına mı gidiyor
 * @property {string|null} adres harici hedefte güvenli mutlak adres
 */

/**
 * @param {{applicationMethod?: string, applyUrl?: string, applicationChannelId?: string}} ilan
 * @returns {IlanHedefi}
 */
export function ilanHedefi(ilan) {
  const yol = basvuruYolu(ilan);
  if (yol.anaEylem === 'platform-ici') {
    return { tur: 'basvur', etiket: 'Başvur', harici: false, adres: null };
  }
  if (yol.anaEylem === 'resmi-site' && yol.resmiAdres) {
    return genelKariyerSayfasiMi(yol.resmiAdres)
      ? { tur: 'kariyer-sayfasi', etiket: 'Kariyer sayfasına git', harici: true, adres: yol.resmiAdres }
      : { tur: 'dis-ilan', etiket: 'İlana git', harici: true, adres: yol.resmiAdres };
  }
  return { tur: 'ilan-detayi', etiket: 'İlanı incele', harici: false, adres: null };
}

/** İlan türünün kartta görünen adı; sınıflandırılmamış ilanda null. */
export const ILAN_TIPI_ETIKETI = {
  staj: 'Staj',
  uzun_donem: 'Uzun dönem staj',
  trainee: 'Trainee',
  mt: 'Yönetici adayı (MT)',
  erken_kariyer: 'Erken kariyer',
};
