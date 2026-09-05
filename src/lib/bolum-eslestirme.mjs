/**
 * İlanı bir öğrenci alanına bağlar.
 *
 * NEDEN BAŞLIKTAN
 * ---------------
 * `listings.department` alanı var ama ÖLÇÜLDÜ: yayındaki 62 ilanın
 * 62'sinde boş. Yani veritabanında alan bilgisi fiilen yok. Başlıklar ise
 * fazlasıyla okunabilir ("Yazılım Mühendisliği Stajyeri", "Muhasebe
 * Stajyeri", "Tedarik Zinciri ve Lojistik Stajyeri").
 *
 * Bu yüzden eşleştirme başlık ve şirket adı üzerinden yapılıyor. Sonucun
 * bir TAHMİN olduğu gizlenmiyor: eşleşmeyen ilan hiçbir alana atanmıyor,
 * `null` dönüyor.
 *
 * EŞLEŞMEYEN İLAN GİZLENMEZ
 * -------------------------
 * Bu modülü kullanan yüzeyin kuralı şu olmalı: alan seçimi listeyi
 * DARALTIR ama eşleşmeyeni yok saymaz. 62 ilanlık bir listede yanlış bir
 * sınıflandırma yüzünden bir ilanı tamamen görünmez yapmak, öğrenciye
 * olmayan bir "sonuç yok" göstermek olur. Çağıran taraf eşleşmeyenleri
 * "diğer" olarak listenin sonuna koymalı.
 *
 * SIRA ÖNEMLİ
 * -----------
 * Kalıplar yukarıdan aşağı deneniyor ve ilk eşleşme kazanıyor. Daha dar
 * olan üstte: "Dijital Pazarlama Stajyeri" hem `pazarlama` hem `dijital`
 * içeriyor; pazarlama önce geldiği için doğru alana düşüyor. Genel
 * kalıplar (mühendislik gibi) en altta, yoksa "Yazılım Mühendisliği"ni
 * yutarlardı.
 */

/**
 * Öğrenciye gösterilen alan çipleri.
 *
 * NEDEN ON TANE
 * -------------
 * İlk ziyarette sorulan tek soru bu; ekranda tek bakışta görülmesi
 * gerekiyor. Otuz alanlı bir liste seçim değil, ikinci bir arama kutusu
 * olurdu. On çip, mevcut ilanların büyük çoğunluğunu kapsıyor ve hiçbiri
 * boş kalmıyor.
 *
 * `id` kalıcı: localStorage'a yazılıyor ve ileride /staj-ilanlari/<id>
 * adreslerinde de kullanılacak. Etiketi değiştirmek serbest, id'yi
 * değiştirmek eski seçimleri ve adresleri kırar.
 */
export const ALANLAR = [
  { id: 'yazilim', etiket: 'Yazılım & Veri' },
  { id: 'muhendislik', etiket: 'Mühendislik' },
  { id: 'pazarlama', etiket: 'Pazarlama' },
  { id: 'finans', etiket: 'Muhasebe & Finans' },
  { id: 'insan-kaynaklari', etiket: 'İnsan Kaynakları' },
  { id: 'lojistik', etiket: 'Lojistik & Tedarik Zinciri' },
  { id: 'satis', etiket: 'Satış' },
  { id: 'uretim-kalite', etiket: 'Üretim & Kalite' },
  { id: 'hukuk', etiket: 'Hukuk' },
  { id: 'tasarim', etiket: 'Tasarım' },
];

const ALAN_IDLERI = new Set(ALANLAR.map((a) => a.id));

/*
  KALIPLAR

  Türkçe ve İngilizce birlikte: ilanların bir kısmı ("Quality Intern",
  "Data Analysis Intern") kaynak dilinde giriliyor.
*/
const KALIPLAR = [
  ['yazilim', /yazılım|yazilim|software|full[\s-]?stack|frontend|front[\s-]?end|backend|back[\s-]?end|geliştirici|gelistirici|developer|\bqa\b|test uzman|veri anali|data anali|data scien|veri bilim|yapay zek|makine öğren|machine learning|\bai\b|\bml\b|bilgi teknolo|\bit\b stajyer|siber|cyber|devops|mobil uygulama|vibe coder|martech/i],
  ['tasarim', /tasarım|tasarim|design|grafik|graphic|motion|ux|ui\b|illüstra|illustra/i],
  ['pazarlama', /pazarlama|marketing|reklam|advertis|marka|brand|sosyal medya|social media|içerik üret|icerik uret|content|iletişim uzman|halkla ilişki|public relation|kampanya/i],
  ['insan-kaynaklari', /insan kaynak|human resource|\bik\b stajyer|\bhr\b|işe alım|ise alim|recruit|yetenek kazanım|talent acquisition|özlük|ozluk|bordro|payroll/i],
  ['finans', /muhasebe|accounting|finans|financ|denetim|audit|vergi|\btax\b|bütçe|butce|budget|risk yönet|risk manage|hazine|treasury|raporlama uzman|controlling/i],
  ['hukuk', /hukuk|legal|avukat|lawyer|mevzuat|compliance|uyum uzman|sözleşme uzman|sozlesme uzman/i],
  ['lojistik', /lojistik|logistic|tedarik zincir|supply chain|depo|warehouse|sevkiyat|shipping|nakliye|transport|ithalat|ihracat|import|export|gümrük|gumruk|dış ticaret|dis ticaret|planlama uzman|demand planning/i],
  ['satis', /satış|satis|\bsales\b|müşteri ilişki|musteri iliski|customer success|customer relation|iş geliştirme|is gelistirme|business development|satın alma|satin alma|procurement|purchasing|buying|bayi|perakende|retail/i],
  ['uretim-kalite', /üretim|uretim|production|kalite|quality|\bqhse\b|\bisg\b|iş güvenliği|is guvenligi|bakım|bakim|maintenance|ar-ge|\br&d\b|araştırma geliştirme|proses|process technolo|sürekli iyileştirme|surekli iyilestirme|gıda mühendis|gida muhendis/i],
  /*
    Mühendislik EN SONDA.

    "Yazılım Mühendisliği Stajyeri" de "Gıda Mühendisi" de bu kalıba
    uyuyor. Yukarıdaki dar alanlar önce denenmezse hepsi buraya düşerdi
    ve çip seçimi işe yaramazdı.
  */
  ['muhendislik', /mühendis|muhendis|engineer|makine|mechanic|elektrik|electric|elektronik|electronic|endüstri|endustri|industrial|inşaat|insaat|civil|kimya|chemical|otomasyon|automation/i],
];

/**
 * İlanı bir alana bağlar; eşleşme yoksa null.
 *
 * @param {...(string|null|undefined)} parcalar Başlık, şirket adı, açıklama…
 * @returns {string|null} ALANLAR içindeki bir id ya da null
 */
/*
  TÜRKÇE HARFLER KALIBI SESSİZCE KAÇIRIYORDU

  JavaScript'te /i bayrağı Türkçe büyük harfleri beklendiği gibi
  katlamıyor: `/insan/i.test('İnsan')` FALSE döner, çünkü U+0130 (İ) düz
  'i'ye eşitlenmiyor. Aynı sorun Ç/Ğ/Ö/Ş/Ü'de de var.

  Ölçüldü: bu yüzden "İnsan Kaynakları Stajyeri" başlıklı iki ilan hiçbir
  alana düşmüyordu ve İK çipi 0 gösteriyordu — kalıp doğruydu, eşleşme
  kuralı yanlıştı. Sessiz bir hata: çip boş görünüyor ama sebebi belli
  değil.

  Metin karşılaştırmadan önce sadeleştiriliyor; kalıplar da bu sade
  biçime göre yazılı (aksanlı ve aksansız iki yazım birlikte).
*/
const TR = { İ: 'i', I: 'i', ı: 'i', Ş: 's', ş: 's', Ğ: 'g', ğ: 'g', Ü: 'u', ü: 'u', Ö: 'o', ö: 'o', Ç: 'c', ç: 'c' };

function sadelestir(metin) {
  return metin.replace(/[İIıŞşĞğÜüÖöÇç]/g, (h) => TR[h]).toLowerCase();
}

export function alanEslestir(...parcalar) {
  const metin = parcalar.filter(Boolean).join(' ');
  if (!metin.trim()) return null;
  const sade = sadelestir(metin);
  const bulunan = KALIPLAR.find(([, kalip]) => kalip.test(sade));
  return bulunan ? bulunan[0] : null;
}

/** Bilinen bir alan id'si mi — kayıtlı seçimi okurken kullanılıyor. */
export function alanGecerli(id) {
  return typeof id === 'string' && ALAN_IDLERI.has(id);
}

/** Alanın görünen adı. */
export function alanEtiketi(id) {
  return ALANLAR.find((a) => a.id === id)?.etiket ?? null;
}

/**
 * Listeyi seçilen alana göre sıralar — FİLTRELEMEZ.
 *
 * Neden eleme değil sıralama: 62 ilanlık bir havuzda "Hukuk" seçen
 * öğrenciye iki sonuç gösterip gerisini saklamak, siteyi boş gibi
 * gösterir. Eşleşenler öne alınıyor, kalanlar altta duruyor; öğrenci
 * hem kendi alanını görüyor hem de listenin tamamının orada olduğunu
 * biliyor.
 *
 * Kararlı sıralama: eşit gruptakilerin kendi arasındaki sırası bozulmuyor,
 * yani sunucudan gelen tazelik sırası korunuyor.
 */
export function alanaGoreSirala(kayitlar, alanId, metinAl) {
  if (!alanGecerli(alanId) || !Array.isArray(kayitlar)) return kayitlar ?? [];
  const esles = kayitlar.map((k, i) => ({
    k,
    i,
    uyar: alanEslestir(...(metinAl ? metinAl(k) : [k?.title, k?.organizationName])) === alanId,
  }));
  esles.sort((a, b) => (a.uyar === b.uyar ? a.i - b.i : a.uyar ? -1 : 1));
  return esles.map((x) => x.k);
}

/** Seçilen alana kaç ilan uyuyor — çipin yanında sayı göstermek için. */
export function alanSayilari(kayitlar, metinAl) {
  const say = {};
  for (const id of ALAN_IDLERI) say[id] = 0;
  for (const k of kayitlar ?? []) {
    const id = alanEslestir(...(metinAl ? metinAl(k) : [k?.title, k?.organizationName]));
    if (id) say[id] += 1;
  }
  return say;
}
