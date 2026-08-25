/**
 * Rehberlerin kişiye göre sıralanması.
 *
 * NE YAPIYOR, NE YAPMIYOR
 * -----------------------
 * Yapıyor: profildeki eğitim bilgisine göre bazı konuları öne alıyor.
 * Yapmıyor: "bu yazı tam sana göre" iddiası. Elimizdeki veri sınıf, bölüm
 * ve ilgi alanları; bu bir tavsiye motoru değil, makul bir sıralama.
 *
 * HİÇBİR KİŞİ BİLGİSİ KODA YAZILMIYOR
 * -----------------------------------
 * Buradaki eşleşmeler profil ALANLARI üzerinden çalışıyor — bölüm adı,
 * sınıf, hedef roller. Belirli bir okulun, bölümün ya da kişinin adı
 * hiçbir yerde geçmiyor; öyle olsaydı sıralama o kişi için doğru, geri
 * kalan herkes için yanlış olurdu.
 *
 * VERİ YETERSİZSE KİŞİSELLEŞTİRME YOK
 * -----------------------------------
 * `kisisellestirilebilir` false dönerse arayüz "Sana özel" demiyor ve
 * açıklama satırını hiç göstermiyor. Yanlış bir kişiselleştirme iddiası,
 * hiç kişiselleştirmemekten kötü: kullanıcı listeye bakıp "beni yanlış
 * tanımışlar" diyor.
 */

/** Sınıfa göre öne alınan konular. Sıra önemli: ilk sıradaki en ağır. */
const ASAMA_KONULARI = {
  '1. Sınıf': ['universite', 'burs', 'yurt'],
  '2. Sınıf': ['staj', 'burs', 'cv'],
  '3. Sınıf': ['staj', 'cv', 'yurtdisi'],
  '4. Sınıf': ['kariyer', 'cv', 'staj'],
  'Yüksek Lisans / Mezun': ['kariyer', 'cv', 'yurtdisi'],
};

/*
  Serbest metinden konuya köprü.

  Bölüm adı ve hedef roller serbest metin: "Bilgisayar Mühendisliği",
  "Erasmus ile yurt dışında okumak". Bunları konu kimliğine bağlamak için
  anahtar kelime taranıyor. Kaba ama şeffaf: eşleşme yoksa hiçbir şey
  olmuyor, uydurma bir bağ kurulmuyor.
*/
const ILGI_ANAHTARLARI = [
  ['yurtdisi', ['erasmus', 'yurt disi', 'yurtdisi', 'abroad', 'exchange', 'yabanci']],
  ['burs', ['burs', 'kyk', 'kredi', 'destek']],
  ['kariyer', ['kariyer', 'is bulma', 'ilk is', 'mulakat', 'terfi', 'yeni mezun']],
  ['cv', ['cv', 'ozgecmis', 'basvuru', 'on yazi', 'portfolyo', 'linkedin']],
  ['staj', ['staj', 'intern']],
  /*
    "yurt" tek başına aranmıyor: "yurt dışında okumak" yazan öğrenci
    barınma rehberlerine değil yurtdışı rehberlerine gitmeli. Ölçüldü —
    tek kelimeyle eşleştirince "Erasmus ile yurt dışında okumak" hem
    yurtdışı hem barınma sayılıyordu.
  */
  ['yurt', ['barinma', 'kira kontrat', 'ev arkadasi', 'yurtta', 'yurda', 'yurt basvuru']],
  /*
    "universite" de tek başına aranmıyor: fakülte adı neredeyse her
    profilde bu kelimeyi taşıyor ve herkes "üniversite hayatı" ile
    ilgileniyor sayılıyordu.
  */
  ['universite', ['ders secimi', 'not ortalamasi', 'transkript', 'kayit yenileme', 'akademik']],
];

/** Türkçe karakter duyarsız sadeleştirme; arama tarafıyla aynı kural. */
export function sadelestir(metin) {
  return String(metin ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a');
}

/**
 * Profilden ilgi duyulan konuları çıkarır.
 *
 * @param {object|null} ogrenci
 * @returns {string[]} konu kimlikleri, tekrarsız
 */
export function ilgiKonulari(ogrenci) {
  if (!ogrenci) return [];

  const havuz = sadelestir(
    [
      ogrenci.department,
      ogrenci.faculty,
      ogrenci.bio,
      ...(ogrenci.targetRoles ?? []),
      ...(ogrenci.skills ?? []).map((b) => (typeof b === 'string' ? b : b?.name)),
    ]
      .filter(Boolean)
      .join(' ')
  );

  const bulunan = [];
  for (const [konu, anahtarlar] of ILGI_ANAHTARLARI) {
    if (anahtarlar.some((a) => havuz.includes(a))) bulunan.push(konu);
  }
  return bulunan;
}

/**
 * Kişiselleştirme için yeterli veri var mı?
 *
 * Sınıf bilgisi tek başına yeterli sayılıyor: sıralamayı taşıyan asıl alan
 * o. Yoksa bölüm ya da hedef rollerden konu çıkarılabiliyorsa yine olur.
 *
 * @param {object|null} ogrenci
 */
export function kisisellestirilebilir(ogrenci) {
  if (!ogrenci) return false;
  if (ogrenci.gradeLevel && ASAMA_KONULARI[ogrenci.gradeLevel]) return true;
  return ilgiKonulari(ogrenci).length > 0;
}

/**
 * Profile göre öne alınacak konular — ağırlıklı ve tekrarsız.
 *
 * @param {object|null} ogrenci
 * @returns {string[]}
 */
export function oncelikliKonular(ogrenci) {
  if (!ogrenci) return [];
  const asama = ASAMA_KONULARI[ogrenci.gradeLevel] ?? [];
  const ilgi = ilgiKonulari(ogrenci);

  const sirali = [];
  for (const konu of [...asama, ...ilgi]) {
    if (!sirali.includes(konu)) sirali.push(konu);
  }
  return sirali;
}

/**
 * Rehberleri profile göre sıralar.
 *
 * Sıralama KARARLI: aynı puanı alan yazılar giriş sırasını koruyor. Aksi
 * hâlde sayfa her açılışta farklı diziliyor ve kullanıcı dün gördüğü yazıyı
 * bulamıyor.
 *
 * @param {{slug: string, konu: string, oneCikan?: boolean}[]} rehberler
 * @param {object|null} ogrenci
 */
export function kisiyeGoreSirala(rehberler, ogrenci) {
  const oncelik = oncelikliKonular(ogrenci);
  if (!oncelik.length) return [...(rehberler ?? [])];

  const puan = (r) => {
    const yer = oncelik.indexOf(r.konu);
    /* Listede olmayan konu en sona; öne çıkan yazı kendi grubunda önde. */
    const temel = yer === -1 ? oncelik.length : yer;
    return temel * 10 - (r.oneCikan ? 1 : 0);
  };

  return (rehberler ?? [])
    .map((r, i) => ({ r, i, p: puan(r) }))
    .sort((a, b) => a.p - b.p || a.i - b.i)
    .map((x) => x.r);
}

/**
 * "En çok okunanlar" için yeterli veri var mı?
 *
 * Tek bir yazının bir kez okunmuş olması bir sıralama değil. Bölüm ancak
 * anlamlı bir dağılım varsa gösteriliyor; yoksa hiç çizilmiyor.
 *
 * @param {Record<string, number>} sayilar
 * @param {number} [enAz] kaç farklı yazının okunmuş olması gerektiği
 */
export function okunmaVerisiYeterli(sayilar, enAz = 3) {
  return Object.values(sayilar ?? {}).filter((n) => Number(n) > 0).length >= enAz;
}

/**
 * Okunma sayısına göre sıralanmış rehberler.
 *
 * @param {{slug: string}[]} rehberler
 * @param {Record<string, number>} sayilar
 * @param {number} [adet]
 */
export function enCokOkunanlar(rehberler, sayilar, adet = 6) {
  return (rehberler ?? [])
    .map((r, i) => ({ r, i, n: Number(sayilar?.[r.slug] ?? 0) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .slice(0, adet)
    .map((x) => x.r);
}

/**
 * Güncelleme tarihine göre en yeniler.
 *
 * Tarihi olmayan yazı listeye girmiyor: "yeni eklendi" diyebilmek için
 * ne zaman eklendiğini bilmek gerekiyor.
 *
 * @param {{slug: string, guncelleme?: string}[]} rehberler
 * @param {number} [adet]
 */
export function yeniEklenenler(rehberler, adet = 6) {
  return (rehberler ?? [])
    .filter((r) => r.guncelleme)
    .slice()
    .sort((a, b) => String(b.guncelleme).localeCompare(String(a.guncelleme)))
    .slice(0, adet);
}
