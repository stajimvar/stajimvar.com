/**
 * Rehber kapakları için ADAY görsel toplar.
 *
 * NEDEN İKİ AŞAMALI
 * -----------------
 * rehber-gorselleri.mjs'in başındaki not şunu söylüyor: "ara ve ilk uygun
 * sonucu al" denendi ve tutmadı — açık lisanslı havuz sonuçları konuya göre
 * değil etikete göre veriyor. O yüzden orada adresler sabit ve gözle seçilmiş.
 *
 * Elli dokuz yeni rehber için aynı işi elle yapmak gerekiyordu. Bu betik
 * seçimin ZAHMETLİ kısmını otomatikleştiriyor ama KARARI otomatikleştirmiyor:
 * her rehber için birkaç aday indiriyor, hepsini tek bir kontak baskısına
 * diziyor. Seçim gözle yapılıyor, seçilen adres rehber-gorselleri.mjs'e
 * yazılıyor. Üretim betiği hâlâ deterministik.
 *
 * LİSANS
 * ------
 * Yalnızca CC0 (kamu malı) aranıyor — mevcut on bir görselle aynı koşul.
 *
 * Kullanım:
 *   node scripts/rehber-kapak-adaylari.mjs            # hepsi
 *   node scripts/rehber-kapak-adaylari.mjs 0 15       # dilim
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const KOK = path.resolve(import.meta.dirname, '..');
const ADAY_DIZIN = path.join(KOK, '.rehber-adaylari');
const BASLIK = { 'User-Agent': 'StajimVarBot/1.0 (+https://stajimvar.com/bot)' };
const ADAY_SAYISI = 4;
const KARE = 240;

/*
  SORGULAR KISA VE TEK KAVRAM

  Ölçüldü: Openverse çok kelimeli sorguları VE ile birleştiriyor —
  "insurance document signing desk" sıfır sonuç veriyor, "paperwork" 38.
  Ayrıca CC0 havuzunda modern ofis/öğrenci fotoğrafı ağırlıklı olarak
  StockSnap'ten geliyor; Rawpixel'in CC0 kısmı çoğunlukla arşiv ve klip art.
  O yüzden önce StockSnap deneniyor, boş dönerse Rawpixel'in fotoğraf
  kategorisine düşülüyor.

  Her slug için birden fazla sorgu var: ilki en yakın, sonrakiler daha genel.
  Amaç birebir illüstrasyon değil, konuya uyan bir sahne — mevcut on bir kapak
  da böyle çalışıyor (KYK rehberinin kapağı kitap fotoğrafı).
*/
export const SORGULAR = {
  // staj
  'staj-sigortasi-kim-yapar': ['signature', 'paperwork', 'documents'],
  'staj-ucreti-nasil-hesaplanir': ['calculator', 'finance', 'money'],
  'staj-basvurusu-gerekli-belgeler': ['documents', 'paperwork', 'folder'],
  'ilan-acmayan-sirkete-nasil-yazilir': ['email', 'typing', 'laptop writing'],
  'stajda-izin-ve-devamsizlik': ['calendar', 'planner', 'schedule'],
  'uzaktan-staj-kabul-edilir-mi': ['home office', 'remote work', 'laptop desk'],
  'stajyerin-gorev-ve-sorumluluklari': ['teamwork', 'coworkers', 'office team'],
  'kotu-gecen-stajda-ne-yapilir': ['stressed', 'tired work', 'thinking desk'],

  // cv ve başvuru
  'ats-uyumlu-cv': ['resume', 'curriculum vitae', 'printer paper'],
  'cvde-proje-nasil-anlatilir': ['sketchbook', 'notebook plan', 'brainstorming'],
  'on-yazi-nasil-yazilir': ['writing letter', 'fountain pen', 'handwriting'],
  'portfolyo-nasil-hazirlanir': ['designer desk', 'creative workspace', 'portfolio'],
  'linkedin-profili-nasil-duzenlenir': ['social media phone', 'smartphone app', 'phone screen'],
  'online-mulakat': ['video call', 'laptop meeting', 'webcam'],
  'basvuruya-cevap-gelmezse': ['waiting', 'inbox', 'laptop screen'],

  // burs ve kyk
  'burslar-hangi-aylarda-acilir': ['calendar desk', 'campus autumn', 'university building'],
  'ayni-anda-birden-fazla-burs': ['student studying', 'books study', 'library desk'],
  'burs-basvurusu-gerekli-belgeler': ['application form', 'form pen', 'paperwork desk'],
  'burs-mulakati': ['meeting table', 'conversation office', 'two people talking'],
  'burs-hangi-durumlarda-kesilir': ['thinking student', 'reading document', 'desk papers'],
  'kyk-kredisi-geri-odeme': ['coins savings', 'piggy bank', 'money calculator'],
  'karsiliksiz-ve-geri-odemeli-burs-farki': ['graduation', 'diploma', 'graduation cap'],
  'burs-dolandiriciligi': ['cyber security', 'padlock laptop', 'phishing'],
  'burs-basvuru-takvimi-takibi': ['wall calendar', 'agenda', 'planning desk'],

  // yurt ve barınma
  'kyk-yurt-basvurusu': ['dorm room', 'student room', 'bedroom desk'],
  'kyk-yurt-tipleri': ['bunk bed', 'bedroom interior', 'dormitory'],
  'yurt-yedek-sirasi': ['waiting line', 'queue', 'waiting room'],
  'kyk-yurt-nakli': ['moving box', 'cardboard boxes', 'relocation'],
  'yurt-izin-ve-giris-cikis': ['entrance door', 'building entrance', 'key card'],
  'yurttan-kayit-silme': ['packing suitcase', 'empty room', 'suitcase'],
  'ozel-yurt-secerken': ['apartment building', 'residential building', 'facade'],
  'ogrenci-evi-kiralarken': ['shared apartment', 'living room', 'roommates'],
  'depozito-ve-kira-sozlesmesi': ['house keys', 'contract', 'lease agreement'],
  'baska-sehirde-staj-barinma': ['suitcase travel', 'city street', 'train station'],

  // üniversite hayatı
  'universite-kariyer-merkezi': ['conference booth', 'job fair', 'networking event'],
  'ogrenci-isleri-hangi-islemler': ['reception desk', 'office counter', 'administration'],
  'yaz-okulu-ve-staj': ['campus summer', 'students outdoor', 'university lawn'],
  'ogrenci-kulupleri-cvye-nasil-yazilir': ['group meeting', 'students group', 'volunteers'],
  'cift-anadal-ve-yan-dal': ['lecture hall', 'classroom', 'auditorium'],
  'yatay-gecis': ['university campus', 'college building', 'campus walk'],
  'ogrenciyken-yari-zamanli-calisma': ['barista', 'cafe worker', 'retail work'],
  'mezun-olmadan-once-yapilacaklar': ['graduation ceremony', 'graduate', 'cap and gown'],

  // yurtdışı
  'erasmus-ogrenim-hareketliligi': ['europe city', 'student travel', 'old town street'],
  'erasmus-staj-hareketliligi': ['international office', 'coworking', 'office window'],
  'hibesiz-erasmus': ['budget money', 'wallet', 'saving coins'],
  'iaeste-ile-yurtdisinda-staj': ['laboratory', 'engineering workshop', 'science lab'],
  'yurtdisi-staj-vizesi': ['passport', 'passport stamp', 'travel documents'],
  'europass-cv': ['european flag', 'europe map', 'documents desk'],
  'ingilizce-basvuru-epostasi': ['typing keyboard', 'keyboard', 'laptop typing'],
  'yurtdisi-burslari': ['world map', 'globe', 'airport departure'],
  'yurtdisinda-staj-sigortasi': ['insurance', 'health documents', 'first aid'],
  'yurtdisinda-barinma': ['apartment window', 'city apartment', 'balcony'],

  // ilk iş ve kariyer
  'stajdan-sonra-is-teklifi': ['handshake', 'business meeting', 'agreement'],
  'yeni-mezun-cvsi': ['laptop desk', 'workspace', 'writing laptop'],
  'ilk-is-mulakati': ['interview', 'office meeting', 'business talk'],
  'maas-beklentisi-nasil-soylenir': ['negotiation', 'business discussion', 'money talk'],
  'referans-nasil-istenir': ['letter writing', 'envelope', 'signature pen'],
  'is-teklifini-degerlendirme': ['contract pen', 'signing document', 'paperwork signing'],
  'yeni-mezun-programlari': ['training session', 'workshop group', 'presentation office'],
};

const KAYNAK_SIRASI = [
  /* Modern CC0 fotoğraf havuzu; ofis ve öğrenci sahneleri burada. */
  { source: 'stocksnap,nappy' },
  /* Rawpixel'in CC0 kısmı geniş ama arşiv ve klip art ağırlıklı:
     fotoğraf kategorisine kısıtlıyoruz. */
  { source: 'rawpixel', category: 'photograph' },
];

async function ara(sorgular) {
  const bulunan = [];
  const gorulen = new Set();
  for (const kaynak of KAYNAK_SIRASI) {
    for (const sorgu of sorgular) {
      if (bulunan.length >= ADAY_SAYISI) return bulunan;
      const adres =
        'https://api.openverse.org/v1/images/?' +
        new URLSearchParams({
          q: sorgu,
          license: 'cc0',
          page_size: '8',
          mature: 'false',
          ...kaynak,
        });
      try {
        const yanit = await fetch(adres, { headers: BASLIK });
        if (!yanit.ok) continue;
        const veri = await yanit.json();
        for (const item of veri.results || []) {
          if (bulunan.length >= ADAY_SAYISI) break;
          if (!item.url || gorulen.has(item.url)) continue;
          gorulen.add(item.url);
          bulunan.push(item);
        }
      } catch {
        /* Tek bir sorgunun düşmesi bütün slug'ı düşürmesin. */
      }
    }
  }
  return bulunan;
}

async function indir(adres) {
  const yanit = await fetch(adres, { headers: BASLIK });
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  const tur = yanit.headers.get('content-type') || '';
  if (!tur.startsWith('image/')) throw new Error(`tür ${tur}`);
  return Buffer.from(await yanit.arrayBuffer());
}

const tumSluglar = Object.keys(SORGULAR);
const bas = Number(process.argv[2] ?? 0);
const son = Number(process.argv[3] ?? tumSluglar.length);
const sluglar = tumSluglar.slice(bas, son);

fs.mkdirSync(ADAY_DIZIN, { recursive: true });
const kayitYolu = path.join(ADAY_DIZIN, 'adaylar.json');
const kayit = fs.existsSync(kayitYolu) ? JSON.parse(fs.readFileSync(kayitYolu, 'utf8')) : {};

for (const slug of sluglar) {
  const sonuclar = await ara(SORGULAR[slug]);
  const bulunan = [];
  for (const item of sonuclar) {
    if (bulunan.length >= ADAY_SAYISI) break;
    try {
      const ham = await indir(item.url);
      const kare = await sharp(ham)
        .resize(KARE, KARE, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: 72 })
        .toBuffer();
      fs.writeFileSync(path.join(ADAY_DIZIN, `${slug}--${bulunan.length}.jpg`), kare);
      bulunan.push({ adres: item.url, sayfa: item.foreign_landing_url, baslik: item.title || '' });
    } catch {
      /* Bozuk ya da erişilemeyen aday atlanıyor. */
    }
  }
  kayit[slug] = bulunan;
  console.log(`${slug.padEnd(38)} ${bulunan.length} aday`);
}

fs.writeFileSync(kayitYolu, JSON.stringify(kayit, null, 2));
console.log(`\nkayıt -> ${kayitYolu}`);
