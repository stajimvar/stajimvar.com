/**
 * İl bulucu — serbest konum metninden Türkiye ili.
 *
 * `src/lib/sehir.ts` içindeydi; coğrafi sınıflandırma (ilan-cografyasi.mjs),
 * kayıtlı arama eşleşmesi ve Node betikleri de aynı kuralı kullansın diye
 * saf JavaScript modülüne taşındı. `sehir.ts` buradan içe aktarıyor —
 * kural tek yerde.
 */

/** 81 il. `src/data/turkeyData.ts` de listeyi buradan alıyor. */
export const TR_ILLERI = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara',
  'Antalya', 'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman',
  'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa',
  'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne',
  'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun',
  'Gümüşhane', 'Hakkâri', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir',
  'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri',
  'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kilis', 'Kocaeli', 'Konya',
  'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş',
  'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun',
  'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat',
  'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak',
];

const TR_KATLAMA = {
  ı: 'i', İ: 'i', I: 'i', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u',
  ş: 's', Ş: 's', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c', â: 'a', î: 'i', û: 'u',
};

export function katla(s) {
  let out = '';
  for (const ch of s) out += TR_KATLAMA[ch] ?? ch;
  return out.toLowerCase().trim();
}


export const ILCE_IL = {
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
export const ONEK = /^(turkiye|turkey|tr|europe|emea)\s*[-–/,]\s*/i;


/**
 * Serbest konum metninden il çıkarır.
 * Bulamazsa null döner — asla tahmin uydurmaz.
 */
export function ilBul(ham) {
  if (!ham) return null;

  const temiz = katla(String(ham).replace(ONEK, ''));
  if (!temiz) return null;

  /*
    Önce il adı metnin herhangi bir yerinde geçiyor mu?
    "Zincirlikuyu, Istanbul" ve "Turkey - Istanbul" bu adımda çözülüyor.
    Kelime sınırı aranıyor: "Karsiyaka" içindeki "Kars" ile İl "Kars"
    eşleşmesin.
  */
  for (const il of TR_ILLERI) {
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
