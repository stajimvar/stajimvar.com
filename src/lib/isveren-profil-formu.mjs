/**
 * İŞVEREN BAŞLANGICI — ŞİRKET PROFİLİ FORMU KURALLARI (7 Kasım 2026)
 *
 * "İşverenim" diye kaydolan kişi e-posta doğrulamasından sonra şirket
 * profilini dolduruyor (/isveren/baslangic). İki yol:
 *   · şirket sitede var  → sahiplenme talebi (company_claims)
 *   · şirket sitede yok  → yeni şirket talebi (sirket_talepleri)
 * Kurallar burada, saf: bileşen ve test aynı işlevi çağırıyor.
 *
 * Zorunlu: yeni şirkette şirket adı + web sitesi + görev/unvan; sahiplenmede
 * görev/unvan. Geri kalanı (sektör, çalışan sayısı, şehir, VKN, tanıtım,
 * logo, telefon) isteğe bağlı ama doluysa biçimi denetleniyor.
 *
 * VKN: 10 haneli vergi kimlik numarası ya da şahıs şirketi için 11 haneli
 * T.C. kimlik numarası. Asıl kural veritabanında (vkn_gecerli); burada
 * yalnız biçim, kişi hatayı göndermeden görsün diye.
 */

/** Şirket panelindeki listeyle aynı (src/sirket/SirketProfilFormu.tsx · BOYUTLAR). */
export const CALISAN_SAYILARI = Object.freeze(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']);

export const TANITIM_UST_SINIR = 1200;

/** "ornek.com" → "https://ornek.com"; boş → "". Yalnız http(s) kabul. */
export function webAdresi(ham) {
  const t = String(ham ?? '').trim();
  if (!t) return '';
  const aday = /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(aday);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (!u.hostname.includes('.')) return null;
    return u.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function vknBicimi(ham) {
  const t = String(ham ?? '').replace(/\s+/g, '');
  if (!t) return '';
  return /^\d{10,11}$/.test(t) ? t : null;
}

export function telefonBicimi(ham) {
  const t = String(ham ?? '').trim();
  if (!t) return '';
  const rakam = t.replace(/\D/g, '');
  return rakam.length >= 10 && rakam.length <= 13 ? t : null;
}

/**
 * Formu doğrular ve gönderilecek temiz değeri üretir.
 *
 * @param {'yeni' | 'sahiplenme'} tur
 * @param {Record<string, string>} d
 * @returns {{ hatalar: Record<string, string>, deger: Record<string, string | null> }}
 */
export function profilFormunuDogrula(tur, d) {
  const hatalar = {};
  const t = (k) => String(d?.[k] ?? '').trim();

  if (!t('gorev')) hatalar.gorev = 'Şirketteki görevini ya da unvanını yaz.';

  const vkn = vknBicimi(d?.vkn);
  if (vkn === null) hatalar.vkn = 'VKN 10, şahıs şirketinde T.C. kimlik no 11 haneli olmalı.';
  const telefon = telefonBicimi(d?.telefon);
  if (telefon === null) hatalar.telefon = 'Telefon numarasını alan koduyla yaz.';

  const deger = {
    gorev: t('gorev') || null,
    telefon: telefon || null,
    vkn: vkn || null,
  };

  if (tur === 'yeni') {
    if (!t('sirketAdi')) hatalar.sirketAdi = 'Şirketin adını yaz.';
    const web = webAdresi(d?.webSitesi);
    if (!web) hatalar.webSitesi = web === null ? 'Geçerli bir web adresi yaz (ör. ornek.com).' : 'Şirketin web sitesini yaz.';
    const boyut = t('calisanSayisi');
    if (boyut && !CALISAN_SAYILARI.includes(boyut)) hatalar.calisanSayisi = 'Listeden seç.';
    if (t('tanitim').length > TANITIM_UST_SINIR) hatalar.tanitim = `Tanıtım en fazla ${TANITIM_UST_SINIR} karakter olabilir.`;
    Object.assign(deger, {
      sirketAdi: t('sirketAdi') || null,
      webSitesi: web || null,
      sektor: t('sektor') || null,
      calisanSayisi: boyut || null,
      sehir: t('sehir') || null,
      tanitim: t('tanitim') || null,
    });
  }

  return { hatalar, deger };
}

/**
 * Hesabın işveren durumu — üst çubuk ve yönlendirme bunu okuyor.
 *
 *   'uye'        şirket üyeliği var (company_members) → işveren paneli
 *   'bekliyor'   bekleyen talep var → "onay bekleniyor"
 *   'baslamadi'  işveren niyeti var ama talep yok → şirket profilini doldur
 *   null         işveren değil (öğrenci)
 *
 * @param {{ niyet?: string | null, uye?: boolean, talepDurumu?: string | null }} g
 */
export function isverenDurumu({ niyet, uye, talepDurumu }) {
  if (uye) return 'uye';
  if (talepDurumu === 'bekliyor') return 'bekliyor';
  if (niyet === 'isveren') return 'baslamadi';
  return null;
}
