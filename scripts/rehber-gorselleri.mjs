/**
 * Rehber karolarının arka plan fotoğraflarını indirir.
 *
 * NEDEN İNDİRİYORUZ, BAĞLAMIYORUZ
 * -------------------------------
 * kurum-logolari.mjs ile aynı gerekçe: dış adrese bağlanmak hem o siteye
 * bağımlı kalmak hem de ziyaretçinin IP'sini oraya sızdırmak demek. Görsel
 * kendi sunucumuzdan gidiyor.
 *
 * LİSANS
 * ------
 * Openverse (WordPress'in açık lisanslı görsel arama servisi) anahtarsız
 * çalışıyor ve lisansa göre süzülebiliyor. Üç lisans alınıyor: `cc0`, `pdm`
 * (kamu malı) ve `by` (atıf yeterli).
 *
 * Önce yalnızca cc0/pdm denendi; havuz devlet arşivi ve uydu görüntüsü
 * ağırlıklı olduğu için 11 rehberin yalnızca 3'üne görsel bulundu ve
 * bulunanlar konuyla ilgisizdi (ağaç sayım haritası, inşaat sahası).
 * CC BY havuzu hem geniş hem konuya uygun; karşılığında atıf gerekiyor ve
 * bu, rehber sayfasının altındaki kaynak listesiyle veriliyor.
 *
 * CC BY-SA bilerek dışarıda: kırpılmış görsel türev sayılıyor ve aynı
 * lisansla paylaşma yükümlülüğü getiriyor.
 *
 * Kaynak bilgisi kaynak.json'a yazılıyor; arayüz atıf listesini oradan
 * okuyor.
 *
 * SORGULAR TAHMİN DEĞİL
 * ---------------------
 * Her rehberin konusuna göre elle yazıldı ve indirilen görsele tek tek
 * bakıldı. Uygun düşmeyen sonuçta sorgu değiştirildi.
 *
 * Kullanım: node scripts/rehber-gorselleri.mjs [slug ...]
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const KOK = path.resolve(import.meta.dirname, '..');
const HEDEF = path.join(KOK, 'public', 'rehber-gorselleri');
const BOY = 720; // karo kare; 2x görüntüleme için yeterli
const BASLIK = { 'User-Agent': 'StajimVarBot/1.0 (+https://stajimvar.com/bot)' };

/**
 * slug -> arama sorguları. Rehberin konusuna göre elle yazıldı; ilki
 * tutmazsa sıradaki deneniyor, çünkü açık lisanslı havuz her sorguda
 * uygun boyutta sonuç vermiyor.
 */
const SORGULAR = {
  'zorunlu-staj-rehberi': ['office paperwork documents', 'signing document desk', 'office desk folder'],
  'staj-cv-nasil-yazilir': ['resume writing desk', 'curriculum vitae paper', 'writing paper desk'],
  'staj-mulakati': ['job interview candidate', 'interview desk two people', 'recruitment interview office'],
  'staj-basvuru-epostasi': ['macbook laptop desk', 'hands typing keyboard', 'laptop coffee desk'],
  'staj-defteri-nasil-doldurulur': ['notebook writing pen', 'handwriting notebook', 'notepad pen desk'],
  'kyk-burs-ve-kredi': ['university students studying', 'student library studying', 'campus students'],
  'staj-nasil-bulunur': ['student using laptop', 'searching computer screen', 'young person laptop'],
  'gonullu-staj-rehberi': ['volunteering community service', 'people helping together outdoors', 'charity volunteers working'],
  'universite-staj-birimi': ['university campus building', 'college building', 'campus architecture'],
  'stajdan-ise-gecis': ['modern office coworkers', 'startup office desk people', 'colleagues working computer'],
  'yurtdisinda-staj': ['airport terminal travel', 'passport travel', 'airplane window travel'],
};

async function ara(sorgu) {
  const adres =
    'https://api.openverse.org/v1/images/?' +
    new URLSearchParams({
      q: sorgu,
      license: 'cc0,pdm,by',
      page_size: '8',
      mature: 'false',
    });

  const yanit = await fetch(adres, { headers: BASLIK });
  if (!yanit.ok) throw new Error(`Openverse HTTP ${yanit.status}`);
  const veri = await yanit.json();
  return veri.results ?? [];
}

/** Kareye kırpılmış, sıkıştırılmış görsel. Küçük ya da bozuk dosya atlanıyor. */
async function gorselHazirla(adres) {
  const yanit = await fetch(adres, { headers: BASLIK });
  if (!yanit.ok) return null;
  const tur = yanit.headers.get('content-type') || '';
  if (!tur.startsWith('image/')) return null;

  const ham = Buffer.from(await yanit.arrayBuffer());
  const olcu = await sharp(ham).metadata();
  if (!olcu.width || olcu.width < BOY || !olcu.height || olcu.height < BOY) return null;

  return sharp(ham)
    .resize(BOY, BOY, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 76, mozjpeg: true })
    .toBuffer();
}

fs.mkdirSync(HEDEF, { recursive: true });
const kaynakYolu = path.join(HEDEF, 'kaynak.json');
const kaynaklar = fs.existsSync(kaynakYolu) ? JSON.parse(fs.readFileSync(kaynakYolu, 'utf8')) : {};

const istenen = process.argv.slice(2);
const isliyor = istenen.length ? istenen : Object.keys(SORGULAR);

let basarili = 0;
for (const slug of isliyor) {
  const sorgular = SORGULAR[slug];
  if (!sorgular) {
    console.log(`${slug.padEnd(32)} ATLANDI  sorgu tanımlı değil`);
    continue;
  }

  let yazildi = false;
  for (const sorgu of sorgular) {
    if (yazildi) break;
    try {
      const sonuclar = await ara(sorgu);
      for (const sonuc of sonuclar) {
        const veri = await gorselHazirla(sonuc.url);
        if (!veri) continue;

        fs.writeFileSync(path.join(HEDEF, `${slug}.jpg`), veri);
        kaynaklar[slug] = {
          baslik: sonuc.title,
          yapan: sonuc.creator ?? null,
          lisans: `${sonuc.license} ${sonuc.license_version ?? ''}`.trim(),
          lisansAdresi: sonuc.license_url ?? null,
          kaynak: sonuc.foreign_landing_url,
          gorsel: sonuc.url,
        };
        console.log(`${slug.padEnd(32)} OK       ${(veri.length / 1024).toFixed(0)} KB  ${sonuc.license}  "${sorgu}"`);
        yazildi = true;
        basarili++;
        break;
      }
    } catch (hata) {
      console.log(`${slug.padEnd(32)} HATA     ${String(hata.message).slice(0, 60)}`);
    }
  }

  if (!yazildi) console.log(`${slug.padEnd(32)} BULUNAMADI  uygun boyutta açık lisanslı görsel yok`);
}

fs.writeFileSync(kaynakYolu, JSON.stringify(kaynaklar, null, 2) + '\n');
console.log(`\n${basarili}/${isliyor.length} görsel yazıldı -> public/rehber-gorselleri/`);
