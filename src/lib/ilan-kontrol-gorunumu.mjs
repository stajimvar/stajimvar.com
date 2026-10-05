/**
 * İlan otomatik kontrolünün ARAYÜZ tarafı — etiketler, alan eşlemesi,
 * gerekçe okuma.
 *
 * NEDEN AYRI DOSYA
 * ----------------
 * Aynı durum üç yerde görünüyor: ilan formunun sonuç ekranı, şirketin
 * ilan kartı ve yöneticinin onay kuyruğu. Etiket ya da alan eşlemesi
 * birinde değişip ötekinde unutulursa şirket formda "Düzeltme
 * gerekiyor", kartta başka bir cümle okur. Kural burada, saf ve test
 * altında (tests/ilan-otomatik-kontrol-arayuz.test.mjs).
 *
 * KARAR SUNUCUDA
 * --------------
 * Bu dosya hiçbir ilanın yayına çıkıp çıkmayacağına karar vermiyor;
 * yalnız sunucunun verdiği kararı (`ilan_yayina_gonder`,
 * 20261120010000) okunur hâle getiriyor. Durum adları sunucunun
 * `ilan_kontrol_sonucu` çıktısıyla birebir aynı.
 *
 * SÜRE VAADİ YOK
 * --------------
 * Hiçbir metin "birkaç dakika", "24 saat", "bir iş günü" demiyor:
 * kontrol hatasında sunucu sınırlı sayıda ve üstel beklemeyle yeniden
 * deniyor, inceleme bir insanın sırası. İkisinin de süresini bilmiyoruz;
 * bilmediğimiz bir süreyi yazmak verilmiş bir söz olur.
 */

import { CALISMA_SEKILLERI } from './ilan-formu.mjs';
import { donemEtiketi } from './staj-turu.mjs';

/** Şirketin gördüğü dört durum + hiç gönderilmemiş taslak. */
export const KONTROL_ETIKETI = {
  yayinda: 'Yayında',
  kontrol_ediliyor: 'Kontrol ediliyor',
  duzeltme_gerekiyor: 'Düzeltme gerekiyor',
  inceleme_gerekiyor: 'İnceleme gerekiyor',
  taslak: 'Taslak',
};

/*
  KARTTAKİ "YAYINA GÖNDER" / "YENİDEN YAYINLA" SONUCU

  Kartta düğmeye basıldıktan sonra okunan tek cümle (role="status").
  Ayrıntı (gerekçeler) kartın kendi kontrol notunda; burada yalnız ne
  olduğu. "Yayınlandı" sözü yalnız sunucu "yayinda" dediğinde.
*/
export const YAYIN_SONUCU_METNI = {
  yayinda: 'İlan kontrolden geçti ve yayında.',
  duzeltme_gerekiyor: 'İlan yayına çıkmadı: düzeltme gerekiyor. Neyin düzeltileceği aşağıda yazıyor.',
  inceleme_gerekiyor: 'İlan yayına çıkmadı: ekibimizin incelemesine gönderildi.',
  kontrol_ediliyor: 'Kontrol tamamlanamadı; sunucu kontrolü kendisi yeniden deneyecek.',
  taslak: 'İlan taslak olarak duruyor.',
};

/*
  SUNUCU ALANI → FORM ALANI

  Gerekçedeki `alan` veritabanı kolonunun adı (ilan_kontrol_kurallari).
  Ücret tek alan değil: "Ücretli seçtin, tutarı yaz" gerekçesi ücret
  seçimi ile tutar kutusunun ikisine de ait; ikisi formda aynı blokta
  durduğu için gerekçe o bloğun altına düşüyor (`ucret`).
*/
export const GEREKCE_FORM_ALANI = {
  title: 'unvan',
  city: 'sehir',
  duration: 'sure',
  stipend_text: 'ucret',
  description: 'aciklama',
  application_deadline: 'sonBasvuru',
};

/** Form alanının ekrandaki adı — sonuç özetindeki "Alan: mesaj" satırı için. */
export const FORM_ALANI_ADI = {
  unvan: 'Pozisyon',
  sehir: 'Şehir',
  sure: 'Süre',
  ucret: 'Ücret',
  aciklama: 'İş tanımı',
  sonBasvuru: 'Son başvuru',
};

/**
 * Sunucudan gelen gerekçe dizisini güvenli biçimde okur.
 *
 * `kontrol_gerekceleri` jsonb; sütun eklenmeden önceki satırlarda yok,
 * bozuk bir satırda dizi olmayabilir. Mesajı olmayan öğe atılıyor:
 * boş bir madde işareti şirkete bilgi değil.
 *
 * @param {unknown} ham
 * @returns {{alan: string|null, mesaj: string, kural: string, kanit: string|null}[]}
 */
export function gerekceleriOku(ham) {
  let dizi = ham;
  if (typeof dizi === 'string') {
    try {
      dizi = JSON.parse(dizi);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(dizi)) return [];
  return dizi
    .filter((g) => g && typeof g === 'object' && String(g.mesaj ?? '').trim())
    .map((g) => ({
      alan: g.alan ? String(g.alan) : null,
      mesaj: String(g.mesaj).trim(),
      kural: g.kural ? String(g.kural) : '',
      kanit: g.kanit ? String(g.kanit) : null,
    }));
}

/**
 * Gerekçeleri form alanlarına dağıtır.
 *
 * Alanı tanınmayan ya da alansız gerekçe GENEL listeye düşüyor —
 * kaybolmuyor. Sunucu yeni bir alan için kural eklerse şirket gerekçeyi
 * yine görür, yalnız alanın altında değil formun üstünde.
 *
 * @param {unknown} ham
 * @returns {{alanlar: Record<string, string[]>, genel: string[]}}
 */
export function gerekceleriDagit(ham) {
  /** @type {Record<string, string[]>} */
  const alanlar = {};
  /** @type {string[]} */
  const genel = [];
  for (const g of gerekceleriOku(ham)) {
    const formAlani = g.alan ? GEREKCE_FORM_ALANI[g.alan] : undefined;
    if (formAlani) (alanlar[formAlani] ??= []).push(g.mesaj);
    else genel.push(g.mesaj);
  }
  return { alanlar, genel };
}

/**
 * Gerekçenin şirkete okunacak satırı: alanı varsa "İş tanımı: …".
 *
 * Yönetici notu (`kural: 'yonetici'`) kendi adıyla yazılıyor; şirket
 * cümlenin bir kuraldan değil bir insandan geldiğini bilmeli.
 *
 * @param {{alan: string|null, mesaj: string, kural: string}} g
 */
export function gerekceSatiri(g) {
  if (g.kural === 'yonetici') return `Ekibimizin notu: ${g.mesaj}`;
  const formAlani = g.alan ? GEREKCE_FORM_ALANI[g.alan] : undefined;
  const ad = formAlani ? FORM_ALANI_ADI[formAlani] : null;
  return ad ? `${ad}: ${g.mesaj}` : g.mesaj;
}

/**
 * Şirket kartındaki durum.
 *
 * Sunucunun dört durumu (`ilanKontrolDurumu`) KAPALI ilanı tanımıyor:
 * kapalı ve kontrolü temiz bir ilan "taslak" değil, "Kapalı". Kapalı
 * ilan yeniden açılmak istenip kontrolden geçemediyse ise şirketin
 * görmesi gereken şey kontrolün sonucu — ilan hâlâ kapalı ama neden
 * açılamadığı yazmalı.
 *
 * @param {{status?: unknown, kontrol_durumu?: unknown}} ilan
 * @returns {'yayinda'|'kontrol_ediliyor'|'duzeltme_gerekiyor'|'inceleme_gerekiyor'|'taslak'|'kapali'}
 */
export function kartKontrolDurumu(ilan) {
  const durum = String(ilan?.status ?? '');
  const kontrol = String(ilan?.kontrol_durumu ?? '');
  if (durum === 'published') return 'yayinda';
  if (kontrol === 'bekliyor') return 'kontrol_ediliyor';
  if (kontrol === 'duzeltme') return 'duzeltme_gerekiyor';
  if (kontrol === 'inceleme') return 'inceleme_gerekiyor';
  if (durum === 'draft') return 'taslak';
  return 'kapali';
}

/*
  YÖNETİCİ DEFTERİ — karar etiketleri

  `ilan_kontrolleri.karar` değerleri. Etiket kararın KAYNAĞINI da
  söylüyor ("Otomatik yayınlandı" / "Yönetici onayladı"): yönetici
  listeye bakınca bir ilanı kimin yayına aldığını ayrıca aramasın.
*/
export const KARAR_ETIKETI = {
  yayinla: 'Otomatik yayınlandı',
  duzeltme: 'Düzeltmeye döndü',
  inceleme: 'İncelemeye düştü',
  hata: 'Kontrol hatası',
  yonetici_onay: 'Yönetici onayladı',
  yonetici_ret: 'Yönetici reddetti',
  yonetici_kaldirdi: 'Yönetici yayından kaldırdı',
  degisiklik_onay: 'Değişikliği yönetici onayladı',
  degisiklik_ret: 'Değişikliği yönetici reddetti',
};

/** Bilinmeyen karar ham adıyla yazılıyor; uydurma bir etiket yok. */
export function kararEtiketi(karar) {
  return KARAR_ETIKETI[karar] ?? String(karar ?? '');
}

/*
  YÖNETİCİ GEREKÇESİ — en az 10 karakter

  Sunucu da zorluyor (yonetim_gerekce_dogrula). Arayüz aynı sınırı
  düğmeye bağlıyor: "x" yazıp gönderen yönetici sunucu hatasıyla
  karşılaşmasın, şirket de anlamsız bir gerekçe okumasın.
*/
export const GEREKCE_EN_AZ = 10;
export function gerekceYeterli(metin) {
  return String(metin ?? '').trim().length >= GEREKCE_EN_AZ;
}

/** Gerekçe yöneticinin kararından mı geliyor (kaldırma ya da ret)? */
export function yoneticiKarariMi(gerekceler) {
  return gerekceleriOku(gerekceler).some(
    (g) => g.kural === 'yonetici.kaldirdi' || g.kural === 'yonetici.reddetti',
  );
}

/* ================================================================== */
/*  YAYINDAKİ İLANIN BEKLEYEN DEĞİŞİKLİĞİ                              */
/* ================================================================== */
/*
  Yayındaki ilan düzenlenip kontrolden geçemeyince SON ONAYLI SÜRÜM
  yayında kalıyor; yeni içerik `ilan_bekleyen_degisiklikleri`nde kendi
  durumuyla bekliyor. Şirket iki şeyi aynı anda bilmeli: ilan hâlâ
  yayında, ama değişikliği yayında değil.
*/

/** Sunucunun bekleyen-değişiklik durumu → şirketin gördüğü durum adı. */
const BEKLEYEN_DURUMU = {
  bekliyor: 'kontrol_ediliyor',
  duzeltme: 'duzeltme_gerekiyor',
  inceleme: 'inceleme_gerekiyor',
};

/**
 * `bekleyen` alanını okur. PostgREST bire-bir gömmeyi bazen nesne,
 * bazen tek öğeli dizi döndürüyor; ikisi de, boşluk da güvenle okunuyor.
 *
 * @param {unknown} ham
 * @returns {{durum: 'kontrol_ediliyor'|'duzeltme_gerekiyor'|'inceleme_gerekiyor', gerekceler: ReturnType<typeof gerekceleriOku>, kontrolAt: string|null, icerik: Record<string, unknown>|null}|null}
 */
export function bekleyenOku(ham) {
  const satir = Array.isArray(ham) ? ham[0] : ham;
  if (!satir || typeof satir !== 'object') return null;
  const durum = BEKLEYEN_DURUMU[String(satir.durum ?? '')];
  if (!durum) return null;
  return {
    durum,
    gerekceler: gerekceleriOku(satir.gerekceler),
    kontrolAt: satir.kontrol_at ? String(satir.kontrol_at) : null,
    icerik: satir.icerik && typeof satir.icerik === 'object' ? satir.icerik : null,
  };
}

/** Kartta "Yayında" rozetinin yanındaki ikinci rozet. */
export const DEGISIKLIK_ROZETI = {
  duzeltme_gerekiyor: 'Değişiklik: Düzeltme gerekiyor',
  inceleme_gerekiyor: 'Değişiklik: İncelemede',
  kontrol_ediliyor: 'Değişiklik: Kontrol ediliyor',
};

/*
  Değişikliğin durumu — formda ve kartta AYNI cümle. Her biri ilanın
  önceki hâlinin yayında olduğunu söylüyor: şirket "ilanım kalktı" ya
  da "değişikliğim yayında" sanmasın. Süre yok.
*/
export const DEGISIKLIK_METNI = {
  yayinda: 'Değişiklikler yayında.',
  duzeltme_gerekiyor:
    'Değişikliklerin yayına girmedi; ilanın önceki hâli yayında. Aşağıdakileri düzeltip yeniden kaydet.',
  inceleme_gerekiyor: 'Değişikliklerin ekibimizin incelemesinde; o sürece ilanın önceki hâli yayında.',
  kontrol_ediliyor:
    'Değişikliklerin kontrolü tamamlanamadı; sunucu yeniden deneyecek. O sürece ilanın önceki hâli yayında.',
};

/* ================================================================== */
/*  YÖNETİCİ: CANLI ↔ BEKLEYEN FARKI                                   */
/* ================================================================== */

/** İçerik kolonlarının yöneticiye görünen adı; sıra ekrandaki sıra. */
export const ICERIK_ALANI_ADI = {
  title: 'Pozisyon',
  city: 'Şehir',
  work_type: 'Çalışma şekli',
  term: 'Dönem',
  duration: 'Süre',
  is_paid: 'Ücretli mi',
  stipend_text: 'Ücret',
  application_deadline: 'Son başvuru',
  description: 'İş tanımı',
  department: 'Bölüm',
  responsibilities: 'Sorumluluklar',
  required_skills: 'Aranan beceriler',
  preferred_skills: 'Tercih sebebi',
  perks: 'Olanaklar',
  insurance_note: 'Sigorta notu',
  min_grade_level: 'En düşük sınıf',
  category: 'Kategori',
  mandatory_staj_accepted: 'Zorunlu staj kabulü',
  voluntary_staj_accepted: 'Gönüllü staj kabulü',
};

/*
  HAM DEĞER EKRANA SIZMASIN

  Sunucu alanları şema değeriyle tutuyor ("On-site", "All Year", true).
  Yönetici farkı formun ve ilan sayfasının kullandığı Türkçe etiketlerle
  okumalı: çalışma şekli formdaki seçeneklerden (CALISMA_SEKILLERI),
  dönem ilan sayfasındaki sözlükten (donemEtiketi). Tanınmayan değer
  olduğu gibi kalıyor — uydurma çeviri, yeni bir değeri sessizce yanlış
  gösterirdi.
*/
function calismaSekliEtiketi(deger) {
  return CALISMA_SEKILLERI.find((c) => c.id === deger)?.etiket ?? String(deger);
}

function tarihEtiketi(deger) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(deger));
  return m ? `${m[3]}.${m[2]}.${m[1]}` : String(deger);
}

function farkMetni(deger, alan) {
  if (alan === 'is_paid') {
    if (deger === true) return 'Ücretli';
    if (deger === false) return 'Ücretsiz';
    return 'Belirtilmedi';
  }
  if (alan === 'mandatory_staj_accepted' || alan === 'voluntary_staj_accepted') {
    if (deger === true) return 'Kabul ediliyor';
    if (deger === false) return 'Kabul edilmiyor';
    return 'Belirtilmedi';
  }
  /* Boş son başvuru = süresiz ilan (form ve sunucu kuralı). */
  if (alan === 'application_deadline' && (deger === null || deger === undefined || deger === '')) return 'Süresiz';
  if (deger === null || deger === undefined || deger === '') return '';
  if (alan === 'work_type') return calismaSekliEtiketi(deger);
  if (alan === 'term') return donemEtiketi(String(deger)) ?? String(deger);
  if (alan === 'application_deadline') return tarihEtiketi(deger);
  if (typeof deger === 'boolean') return deger ? 'evet' : 'hayır';
  if (Array.isArray(deger)) return deger.map((x) => String(x)).join(', ');
  if (typeof deger === 'object') return JSON.stringify(deger);
  return String(deger);
}

/**
 * Yalnız DEĞİŞEN alanlar: yönetici aynı metni iki kez okumasın.
 * Bilinen alanlar önce (ekran sırasıyla), bilinmeyenler ham adlarıyla
 * sonda — sunucuya yeni bir içerik alanı eklenirse fark kaybolmasın.
 *
 * @returns {{alan: string, ad: string, once: string, sonra: string, uzun: boolean}[]}
 */
export function icerikFarki(canli, bekleyen) {
  const a = canli && typeof canli === 'object' ? canli : {};
  const b = bekleyen && typeof bekleyen === 'object' ? bekleyen : {};
  const bilinen = Object.keys(ICERIK_ALANI_ADI);
  const diger = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !bilinen.includes(k)).sort();
  const sonuc = [];
  for (const alan of [...bilinen, ...diger]) {
    if (!(alan in a) && !(alan in b)) continue;
    const once = farkMetni(a[alan], alan);
    const sonra = farkMetni(b[alan], alan);
    if (once === sonra) continue;
    sonuc.push({
      alan,
      ad: ICERIK_ALANI_ADI[alan] ?? alan,
      once,
      sonra,
      uzun: once.length > 80 || sonra.length > 80,
    });
  }
  return sonuc;
}

/* ================================================================== */
/*  YENİDEN DENEME İŞİNİN SAĞLIĞI                                       */
/* ================================================================== */
/*
  Yeniden deneme GitHub Actions'taki zamanlanmış işte. GitHub
  zamanlaması gecikebiliyor ya da depo hareketsiz kalınca durabiliyor;
  o zaman "kontrol ediliyor" ilanlar sessizce askıda kalır. Yönetici
  bunu kuyruğun üstünde görmeli.

  Uyarı iki durumda: sunucu gecikmiş kontrol sayıyorsa, ya da bekleyen
  kontrol varken işin son çalışması 2 saatten eskiyse (ya da hiç
  çalışmadıysa). Bekleyen kontrol yokken eski bir son çalışma sorun
  değil: işin yapacak bir şeyi yok.
*/
export const IS_ESKI_SAYILIR_MS = 2 * 60 * 60 * 1000;

/**
 * @param {{sonCalisma?: string|null, gecikmisKontroller?: number}|null|undefined} is
 * @param {number} bekleyenSayisi kuyruktaki kontrolü tamamlanamamış kayıt sayısı
 * @param {Date} [simdi]
 * @returns {{uyari: boolean, sonCalisma: string|null}}
 */
export function yenidenDenemeSagligi(is, bekleyenSayisi, simdi = new Date()) {
  const sonCalisma = is?.sonCalisma ?? null;
  const gecikmis = Number(is?.gecikmisKontroller ?? 0);
  const t = sonCalisma ? new Date(sonCalisma).getTime() : NaN;
  const eski = Number.isNaN(t) || simdi.getTime() - t > IS_ESKI_SAYILIR_MS;
  return { uyari: gecikmis > 0 || (bekleyenSayisi > 0 && eski), sonCalisma };
}

export const IS_UYARISI =
  "Yeniden deneme işi gecikiyor ya da çalışmıyor; GitHub Actions'taki 'İlan kontrolü yeniden deneme' işini kontrol et.";

/**
 * Formun tek gönderim kimliği.
 *
 * `crypto.randomUUID` yalnız güvenli bağlamda (https, localhost) var;
 * yerel ağdan http ile açılan geliştirme sunucusunda yok. O durumda
 * aynı biçimde (sürüm 4) `getRandomValues` ile üretiliyor — anahtar
 * yine tahmin edilemez, `Math.random` yok.
 *
 * @returns {string}
 */
export function gonderimAnahtariUret() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
