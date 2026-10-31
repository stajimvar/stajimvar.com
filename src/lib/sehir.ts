
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

import { ONEK, ilBul, katla } from './il-bul.mjs';

export { ilBul };

/**
 * Kartta gösterilecek konum etiketi.
 *
 * İl bilinmiyorsa ham metin olduğu gibi kalır; bildiğimizden fazlasını
 * yazmıyoruz. İl biliniyor ama metin daha ayrıntılıysa ikisi birlikte
 * gösteriliyor: "Şişli, İstanbul".
 */
/*
  ŞEHİR ALANINDA YALNIZ ÜLKE ADI (14 Ekim 2026)

  Ölçüldü: Insider One ilanının şehir alanında "Turkey" yazıyor ve
  normalize `il` alanı boş (ilçe de yok). Kart bunu olduğu gibi
  "Turkey · Ofisten" diye basıyordu: İngilizce ve şehir gibi duran bir
  ülke adı. Ülke adı şehir sayılmıyor; Türkçe ülke adı gösteriliyor
  ("Türkiye") — doğru ama kaba bir konum, uydurma şehir yok.
  Yapısal verideki karşılığı src/lib/seo/ilan-sayfasi.mjs SEHIR_OLMAYAN.
*/
const ULKE_ADLARI: Record<string, string> = {
  turkey: 'Türkiye',
  turkiye: 'Türkiye',
  germany: 'Almanya',
  deutschland: 'Almanya',
  almanya: 'Almanya',
  france: 'Fransa',
  fransa: 'Fransa',
  'united kingdom': 'Birleşik Krallık',
  uk: 'Birleşik Krallık',
  england: 'Birleşik Krallık',
  netherlands: 'Hollanda',
  hollanda: 'Hollanda',
  'united states': 'ABD',
  usa: 'ABD',
};

/*
  ÜLKE ADI ÇOK PARÇALI METNİN İÇİNDE (31 Ekim 2026)

  Yalnız ülke adı yazan alan yukarıda çözülmüştü; ama kariyer
  sistemleri ülkeyi şehrin yanına da yazıyor. Canlıdaki biçimler
  (ölçüldü, 50 farklı değer):

    "Istanbul, Turkey"            → kart "Turkey, İstanbul" basıyordu
    "FABRIKA, İSTANBUL, Turkey"   → "FABRIKA, Turkey, İstanbul"
    "Besiktas, Istanbul Turkey"   → "Besiktas, Istanbul Turkey, İstanbul"
    "TUR - Istanbul"              → "TUR - Istanbul, İstanbul"
    "TUR-34 Istanbul Umraniye"    → "TUR-34 Istanbul Umraniye, İstanbul"
    "Berlin, DE | Germany (REMOTE)" ve "SGP - Singapore - Singapore"
                                  → olduğu gibi

  Kural şehre değil biçime bakıyor, yani İstanbul'a özel değil: metin
  parçalara ayrılıyor (virgül, |, / ve boşluklu tire — "Neuilly-sur-Seine"
  bölünmüyor), her parçadan ülke adı, BÜYÜK harfle yazılmış ülke kodu,
  il plaka kodu ("TUR-34") ve çalışma biçimi notu ("(REMOTE)") atılıyor,
  tekrar eden parça bir kez kalıyor. Geriye yalnız ülke kalırsa Türkçe
  ülke adı yazılıyor ("Turkey" → "Türkiye"). Tanınmayan parça
  ("FABRIKA", "Golden, CO") uydurma bir şeyle değiştirilmiyor; kalıyor.
*/
const ULKE_KODLARI: Record<string, string> = {
  TR: 'Türkiye',
  TUR: 'Türkiye',
  DE: 'Almanya',
  DEU: 'Almanya',
  FR: 'Fransa',
  FRA: 'Fransa',
  GB: 'Birleşik Krallık',
  GBR: 'Birleşik Krallık',
  NL: 'Hollanda',
  NLD: 'Hollanda',
  SG: 'Singapur',
  SGP: 'Singapur',
  AE: 'Birleşik Arap Emirlikleri',
  ARE: 'Birleşik Arap Emirlikleri',
  MY: 'Malezya',
  MYS: 'Malezya',
  US: 'ABD',
  USA: 'ABD',
};

const PARCA_AYRACI = /\s*[,|/]\s*|\s+[-–]\s+/;
const CALISMA_NOTU = /\(\s*(remote|uzaktan|hybrid|hibrit|on-?site|ofisten)\s*\)/gi;
const PLAKA_ONEKI = /^[A-Z]{2,3}-\d{1,3}\s+/;

/** Parçayı ülke bilgisinden arındırır; parça yalnız ülkeyse boş döner, ülkeyi `ulkeler`e ekler. */
function ulkesizParca(parca: string, ulkeler: string[]): string {
  const p = parca.replace(CALISMA_NOTU, ' ').replace(PLAKA_ONEKI, '').replace(/\s+/g, ' ').trim();
  if (!p) return '';
  const kod = ULKE_KODLARI[p];
  if (kod) {
    ulkeler.push(kod);
    return '';
  }
  const ad = ULKE_ADLARI[katla(p)];
  if (ad) {
    ulkeler.push(ad);
    return '';
  }
  /* "Istanbul Turkey": baştaki ya da sondaki ülke kelimesi. */
  const kelimeler = p.split(' ');
  while (kelimeler.length > 1 && ULKE_ADLARI[katla(kelimeler[kelimeler.length - 1])]) {
    ulkeler.push(ULKE_ADLARI[katla(kelimeler.pop() as string)]);
  }
  while (kelimeler.length > 1 && ULKE_ADLARI[katla(kelimeler[0])]) {
    ulkeler.push(ULKE_ADLARI[katla(kelimeler.shift() as string)]);
  }
  return kelimeler.join(' ');
}

export function konumEtiketi(ham: string | null | undefined): string {
  if (!ham) return 'Konum belirtilmemiş';

  const temiz = String(ham).replace(ONEK, '').trim();
  const ulkeler: string[] = [];
  const parcalar: string[] = [];
  for (const parca of temiz.split(PARCA_AYRACI)) {
    const p = ulkesizParca(parca, ulkeler);
    if (p && !parcalar.some((x) => katla(x) === katla(p))) parcalar.push(p);
  }
  if (!parcalar.length) return ulkeler[0] ?? temiz;

  const il = ilBul(parcalar.join(', '));
  if (!il) return parcalar.join(', ');

  /* "Zincirlikuyu, Istanbul" → "Zincirlikuyu, İstanbul"; ilin adı parçanın içindeyse ("Istanbul Umraniye") ad atılıyor. */
  const ilceler = parcalar
    .map((p) =>
      p
        .split(' ')
        .filter((k) => katla(k) !== katla(il))
        .join(' ')
        .trim()
    )
    .filter(Boolean);

  return ilceler.length > 0 ? `${ilceler.join(', ')}, ${il}` : il;
}

/**
 * İlan kartının konum etiketi: önce doğrulanmış normalize alanlar.
 *
 * `il` ve `ilce` veritabanında ham şehir metninden türetiliyor, yalnız
 * Türkiye için ve tahminsiz (göç 20261023010000; il kısıtlı listeden).
 * Varsa onlar esas: "Turkey - Istanbul" → "İstanbul". Ham metin aynı ile
 * işaret ediyor ve daha ayrıntılıysa ("Zincirlikuyu, Istanbul") ayrıntı
 * korunuyor. `il` yoksa ham metin `konumEtiketi`nden geçiyor (yurt dışı
 * şehirler, ülke adı → Türkçe ülke adı).
 */
export function ilanKonumEtiketi(ilan: {
  il?: string | null;
  ilce?: string | null;
  city?: string | null;
}): string {
  const il = ilan.il?.trim();
  if (il) {
    const ilce = ilan.ilce?.trim();
    if (ilce) return `${ilce}, ${il}`;
    const ham = String(ilan.city ?? '').replace(ONEK, '').trim();
    return ham && ilBul(ham) === il ? konumEtiketi(ham) : il;
  }
  return konumEtiketi(ilan.city);
}

/*
  ÇALIŞMA BİÇİMİ TÜRKÇE GÖRÜNSÜN

  Veritabanındaki değerler İngilizce ('On-site', 'Remote', 'Hybrid'):
  şema öyle kurulmuş ve değiştirmek veri göçü gerektiriyor. Ama karta
  "İstanbul (On-site)" diye basmak, sitenin geri kalanı Türkçeyken tek
  başına yabancı duruyordu. Çeviri görüntüde yapılıyor, veride değil.

  Bilinmeyen bir değer gelirse olduğu gibi gösteriliyor — sessizce boş
  bırakmak, yanlış çevirmekten de kötü.
*/
const CALISMA_BICIMLERI: Record<string, string> = {
  'on-site': 'Ofisten',
  onsite: 'Ofisten',
  remote: 'Uzaktan',
  hybrid: 'Hibrit',
};

export function calismaEtiketi(ham: string | null | undefined): string | null {
  if (!ham) return null;
  const anahtar = String(ham).trim().toLowerCase();
  return CALISMA_BICIMLERI[anahtar] ?? String(ham).trim();
}
