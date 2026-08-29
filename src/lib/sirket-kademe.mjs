/**
 * Şirket yetki kademeleri ve ilan yayın kuralı.
 *
 * NEDEN AYRI DOSYA
 * ----------------
 * Aynı kural iki yerde yaşıyor: veritabanında (RLS ve politikalar) ve
 * arayüzde (hangi ekran gösterilecek). Veritabanı asıl kapı — arayüz
 * kandırılabilir, RLS kandırılamaz. Buradaki kod o kapıyı AÇMIYOR,
 * yalnızca kullanıcıya doğru ekranı gösteriyor.
 *
 * Kural burada saf işlev olarak duruyor ki sınanabilsin: yetki
 * hesabındaki bir hata, ekranda görünmeyen ama veriye dokunan bir hata.
 *
 * KADEMELER
 * ---------
 *   0  ziyaretçi     Rehber okur. Kart yok.
 *   1  ilan veren    İlan asar ve kapatır. ÖĞRENCİ KARTI YOK.
 *   2  doğrulanmış   İlan + başvuran kartları + platformdan başvuru.
 *   3  yönetici      Hepsi.
 *
 * "İlan vermek ≠ öğrenci görmek" kuralının tamamı 1 ile 2 arasındaki
 * farkta duruyor.
 */

export const KADEME = {
  ZIYARETCI: 0,
  ILAN_VEREN: 1,
  DOGRULANMIS: 2,
  YONETICI: 3,
};

/**
 * Kullanıcının bir şirketteki kademesi.
 *
 * @param {{uyeMi?: boolean, dogrulanmisMi?: boolean, yoneticiMi?: boolean}} durum
 */
export function kademeHesapla({ uyeMi = false, dogrulanmisMi = false, yoneticiMi = false } = {}) {
  if (yoneticiMi) return KADEME.YONETICI;
  if (uyeMi && dogrulanmisMi) return KADEME.DOGRULANMIS;
  if (uyeMi) return KADEME.ILAN_VEREN;
  return KADEME.ZIYARETCI;
}

/** Aday verisi (başvuran kartları) görülebilir mi? */
export function adayGorebilir(kademe) {
  return kademe >= KADEME.DOGRULANMIS;
}

/** İlan asabilir mi? */
export function ilanAsabilir(kademe) {
  return kademe >= KADEME.ILAN_VEREN;
}

/** "StajımVar ile başvur" açık mı? Yalnızca doğrulanmış şirkette. */
export function platformdanBasvuru(kademe) {
  return kademe >= KADEME.DOGRULANMIS;
}

/* ------------------------------------------------------------- e-posta */

/**
 * Serbest e-posta sağlayıcıları.
 *
 * ENGELLENMİYOR, yalnızca ilan taslakta bekliyor: küçük işletmelerin
 * çoğu Gmail kullanıyor ve kapıyı kapatmak onları dışarıda bırakır.
 */
const SERBEST_SAGLAYICILAR = new Set([
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
  'live.com',
  'msn.com',
  'yandex.com',
  'yandex.com.tr',
  'mail.ru',
  'proton.me',
]);

export function epostaAlanAdi(eposta) {
  const parca = String(eposta ?? '').trim().toLowerCase().split('@')[1];
  return parca || null;
}

export function serbestEpostaMi(eposta) {
  const alan = epostaAlanAdi(eposta);
  return alan ? SERBEST_SAGLAYICILAR.has(alan) : false;
}

/**
 * Site alan adı ile e-posta alan adı aynı kuruma mı ait?
 *
 * "www." ve alt alan adları atılıyor: kariyer.sirket.com ile
 * ik@sirket.com aynı kurumdur. Tam eşitlik aramak doğru kurumu haksız
 * yere taslakta bırakırdı.
 */
export function alanAdiEslesiyor(site, eposta) {
  const epostaAlan = epostaAlanAdi(eposta);
  if (!epostaAlan) return false;

  const siteAlan = String(site ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
  if (!siteAlan) return false;

  return (
    siteAlan === epostaAlan ||
    siteAlan.endsWith(`.${epostaAlan}`) ||
    epostaAlan.endsWith(`.${siteAlan}`)
  );
}

/* --------------------------------------------------------------- ilan */

/**
 * Yeni ilan yayında mı başlar, taslak mı?
 *
 *   Kademe 2                       → yayında
 *   Kademe 1 + alan adı eşleşiyor  → yayında
 *   Kademe 1 + serbest/eşleşmeyen  → taslak, yönetici kuyruğuna
 *   Kademe 0                       → hiç
 *
 * @returns {'published'|'draft'|null}
 */
export function ilanBaslangicDurumu({ kademe, siteUrl, eposta }) {
  if (!ilanAsabilir(kademe)) return null;
  if (kademe >= KADEME.DOGRULANMIS) return 'published';
  return alanAdiEslesiyor(siteUrl, eposta) ? 'published' : 'draft';
}

/**
 * Taslakta bekleyen ilanda yöneticinin bakacağı bayraklar.
 *
 * Uydurma bir puan değil, metinde GEÇEN şeyler: ücret isteme, teminat,
 * WhatsApp'tan başvuru ve zincir/MLM dili. Dördü de staj ilanı kılığında
 * en sık görülen tuzaklar.
 */
const BAYRAKLAR = [
  [/(ücret|para|bedel|katılım payı)\s*(talep|iste|yatır|öde)/i, 'Ücret isteniyor olabilir'],
  [/teminat|depozito|kapora/i, 'Teminat isteniyor olabilir'],
  [/whatsapp|wp'?den|telegram/i, 'Başvuru WhatsApp/Telegram üzerinden'],
  [/(network marketing|mlm|ikili sistem|referans sistemi|kendi işinin patronu)/i, 'Zincir/MLM dili'],
];

export function ilanBayraklari(metin) {
  const govde = String(metin ?? '');
  return BAYRAKLAR.filter(([desen]) => desen.test(govde)).map(([, etiket]) => etiket);
}

/* ---------------------------------------------------------------- VKN */

/**
 * VKN biçim ve checksum kontrolü.
 *
 * DİKKAT: VKN herkese açık bir bilgidir. Doğru olması, o numarayı yazan
 * kişinin şirketi TEMSİL ettiğini kanıtlamaz. Bu yüzden tek başına
 * onaylamaya yetmiyor; onay kademesinde insan bakıyor.
 *
 * Şahıs şirketinden TCKN İSTENMİYOR: kimlik numarası staj ilanı açmak
 * için gereken bir veri değil ve toplandığı anda korunması gereken bir
 * yük oluyor.
 */
export function vknGecerli(vkn) {
  const temiz = String(vkn ?? '').trim();
  if (!/^\d{10}$/.test(temiz)) return false;

  let toplam = 0;
  for (let i = 0; i < 9; i += 1) {
    const basamak = Number(temiz[i]);
    const gecici = (basamak + 10 - (i + 1)) % 10;
    toplam += gecici === 9 ? gecici : (gecici * 2 ** (9 - i)) % 9;
  }
  return (10 - (toplam % 10)) % 10 === Number(temiz[9]);
}
