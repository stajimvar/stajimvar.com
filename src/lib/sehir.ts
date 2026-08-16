import { TR_CITIES } from '../data/turkeyData';

/**
 * İlan konum metnini ile çevirir.
 *
 * NEDEN GEREKLİ: ilanları şirketlerin kendi kariyer sistemlerinden topluyoruz
 * ve oradaki konum alanı serbest metin. Canlıdaki 11 ilan şu değerleri
 * üretiyor:
 *
 *   Istanbul · Turkey - Istanbul · Zincirlikuyu, Istanbul · Üsküdar · Şişli
 *   · Çorlu · İzmir
 *
 * Bunları olduğu gibi bir şehir menüsüne koyarsak kullanıcı 3 il yerine 7
 * ayrı seçenek görür ve "İstanbul" seçtiğinde Şişli'deki ilanı kaçırır.
 * Burası o metni ile indirger; bulamazsa uydurmaz, null döner.
 *
 * Kapsam bilinçli olarak dar: 970 ilçenin tamamı değil, staj ilanlarında
 * gerçekten geçen büyük şehir ilçeleri ve sanayi bölgeleri. Tanınmayan bir
 * değer geldiğinde ilan kaybolmaz, "Diğer" altında listelenir.
 */

const TR_KATLAMA: Record<string, string> = {
  ı: 'i', İ: 'i', I: 'i', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u',
  ş: 's', Ş: 's', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c', â: 'a', î: 'i', û: 'u',
};

function katla(s: string): string {
  let out = '';
  for (const ch of s) out += TR_KATLAMA[ch] ?? ch;
  return out.toLowerCase().trim();
}

/** İlçe / semt → il. Anahtarlar katlanmış biçimde aranır. */
const ILCE_IL: Record<string, string> = {
  // --- İstanbul: 39 ilçe ---
  adalar: 'İstanbul', arnavutkoy: 'İstanbul', atasehir: 'İstanbul',
  avcilar: 'İstanbul', bagcilar: 'İstanbul', bahcelievler: 'İstanbul',
  bakirkoy: 'İstanbul', basaksehir: 'İstanbul', bayrampasa: 'İstanbul',
  besiktas: 'İstanbul', beykoz: 'İstanbul', beylikduzu: 'İstanbul',
  beyoglu: 'İstanbul', buyukcekmece: 'İstanbul', catalca: 'İstanbul',
  cekmekoy: 'İstanbul', esenler: 'İstanbul', esenyurt: 'İstanbul',
  eyupsultan: 'İstanbul', eyup: 'İstanbul', fatih: 'İstanbul',
  gaziosmanpasa: 'İstanbul', gungoren: 'İstanbul', kadikoy: 'İstanbul',
  kagithane: 'İstanbul', kartal: 'İstanbul', kucukcekmece: 'İstanbul',
  maltepe: 'İstanbul', pendik: 'İstanbul', sancaktepe: 'İstanbul',
  sariyer: 'İstanbul', silivri: 'İstanbul', sultanbeyli: 'İstanbul',
  sultangazi: 'İstanbul', sile: 'İstanbul', sisli: 'İstanbul',
  tuzla: 'İstanbul', umraniye: 'İstanbul', uskudar: 'İstanbul',
  zeytinburnu: 'İstanbul',

  // --- İstanbul: ilan metinlerinde sık geçen iş semtleri ---
  maslak: 'İstanbul', levent: 'İstanbul', zincirlikuyu: 'İstanbul',
  etiler: 'İstanbul', mecidiyekoy: 'İstanbul', kozyatagi: 'İstanbul',
  altunizade: 'İstanbul', bomonti: 'İstanbul', karakoy: 'İstanbul',
  kavacik: 'İstanbul', gayrettepe: 'İstanbul', kurtkoy: 'İstanbul',
  atakoy: 'İstanbul', yenibosna: 'İstanbul', ikitelli: 'İstanbul',
  gunesli: 'İstanbul', taksim: 'İstanbul', nisantasi: 'İstanbul',
  vadistanbul: 'İstanbul', 'atasehir finans merkezi': 'İstanbul',

  // --- Ankara ---
  cankaya: 'Ankara', kecioren: 'Ankara', yenimahalle: 'Ankara',
  mamak: 'Ankara', etimesgut: 'Ankara', sincan: 'Ankara',
  altindag: 'Ankara', pursaklar: 'Ankara', golbasi: 'Ankara',
  polatli: 'Ankara', kizilay: 'Ankara', sogutozu: 'Ankara',
  cukurambar: 'Ankara', ostim: 'Ankara', 'teknokent ankara': 'Ankara',

  // --- İzmir ---
  konak: 'İzmir', karsiyaka: 'İzmir', bornova: 'İzmir', buca: 'İzmir',
  bayrakli: 'İzmir', gaziemir: 'İzmir', cigli: 'İzmir', balcova: 'İzmir',
  narlidere: 'İzmir', torbali: 'İzmir', menemen: 'İzmir', urla: 'İzmir',
  cesme: 'İzmir', aliaga: 'İzmir', kemalpasa: 'İzmir', karabaglar: 'İzmir',

  // --- Kocaeli ve çevresi (sanayi) ---
  gebze: 'Kocaeli', cayirova: 'Kocaeli', darica: 'Kocaeli',
  izmit: 'Kocaeli', korfez: 'Kocaeli', golcuk: 'Kocaeli',
  dilovasi: 'Kocaeli', kartepe: 'Kocaeli',

  // --- Bursa ---
  nilufer: 'Bursa', osmangazi: 'Bursa', yildirim: 'Bursa',
  gemlik: 'Bursa', inegol: 'Bursa', mudanya: 'Bursa',

  // --- Tekirdağ ---
  corlu: 'Tekirdağ', cerkezkoy: 'Tekirdağ', kapakli: 'Tekirdağ',
  suleymanpasa: 'Tekirdağ', ergene: 'Tekirdağ', muratli: 'Tekirdağ',

  // --- Diğer sık geçen sanayi ilçeleri ---
  'organize sanayi': '', // anlamsız eşleşmeyi engellemek için boş
  manisa: 'Manisa', turgutlu: 'Manisa', salihli: 'Manisa',
  akhisar: 'Manisa', sehitkamil: 'Gaziantep', sahinbey: 'Gaziantep',
  seyhan: 'Adana', cukurova: 'Adana', tarsus: 'Mersin',
  yenisehir: 'Mersin', selcuklu: 'Konya', meram: 'Konya',
  melikgazi: 'Kayseri', kocasinan: 'Kayseri', odunpazari: 'Eskişehir',
  tepebasi: 'Eskişehir', kepez: 'Antalya', muratpasa: 'Antalya',
  konyaalti: 'Antalya', 'serbest bolge': '',
};

/** Ülke/bölge önekleri: "Turkey - Istanbul", "Türkiye / İzmir" gibi. */
const ONEK = /^(turkiye|turkey|tr|europe|emea)\s*[-–/,]\s*/i;

/**
 * Serbest konum metninden il çıkarır.
 * Bulamazsa null döner — asla tahmin uydurmaz.
 */
export function ilBul(ham: string | null | undefined): string | null {
  if (!ham) return null;

  const temiz = katla(String(ham).replace(ONEK, ''));
  if (!temiz) return null;

  /*
    Önce il adı metnin herhangi bir yerinde geçiyor mu?
    "Zincirlikuyu, Istanbul" ve "Turkey - Istanbul" bu adımda çözülüyor.
    Kelime sınırı aranıyor: "Karsiyaka" içindeki "Kars" ile İl "Kars"
    eşleşmesin.
  */
  for (const il of TR_CITIES) {
    const k = katla(il);
    if (new RegExp(`(^|[^a-z0-9])${k}([^a-z0-9]|$)`).test(temiz)) return il;
  }

  /* Sonra ilçe/semt tablosu — metni parçalayıp her parçayı dene. */
  const parcalar = temiz.split(/[,/|()\-–]+/).map((p) => p.trim()).filter(Boolean);
  for (const parca of [...parcalar, temiz]) {
    const il = ILCE_IL[parca];
    if (il) return il;
  }

  /* Son çare: semt adı uzun bir cümlenin içinde geçiyor olabilir. */
  for (const [ilce, il] of Object.entries(ILCE_IL)) {
    if (!il) continue;
    if (new RegExp(`(^|[^a-z0-9])${ilce}([^a-z0-9]|$)`).test(temiz)) return il;
  }

  return null;
}

/**
 * Kartta gösterilecek konum etiketi.
 *
 * İl bilinmiyorsa ham metin olduğu gibi kalır; bildiğimizden fazlasını
 * yazmıyoruz. İl biliniyor ama metin daha ayrıntılıysa ikisi birlikte
 * gösteriliyor: "Şişli, İstanbul".
 */
export function konumEtiketi(ham: string | null | undefined): string {
  if (!ham) return 'Konum belirtilmemiş';

  const temiz = String(ham).replace(ONEK, '').trim();
  const il = ilBul(temiz);
  if (!il) return temiz;

  /* Metin zaten ilin kendisiyse tekrar etme. */
  if (katla(temiz) === katla(il)) return il;

  /* "Zincirlikuyu, Istanbul" → "Zincirlikuyu, İstanbul" */
  const ilceler = temiz
    .split(/[,/|]+/)
    .map((p) => p.trim())
    .filter((p) => p && katla(p) !== katla(il));

  return ilceler.length > 0 ? `${ilceler.join(', ')}, ${il}` : il;
}
