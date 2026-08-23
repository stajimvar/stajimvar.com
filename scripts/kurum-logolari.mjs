/**
 * Fırsat veren kurumların logolarını indirir ve public/kurum-logolari/ altına yazar.
 *
 * NEDEN İNDİRİYORUZ, BAĞLAMIYORUZ
 * -------------------------------
 * automation/logos.py ile aynı gerekçe: dış adrese bağlanmak hem o siteye
 * bağımlı kalmak hem de ziyaretçinin IP'sini oraya sızdırmak demek. Logo
 * kendi sunucumuzdan gidiyor.
 *
 * ADRESLER TAHMİN DEĞİL
 * ---------------------
 * Her biri kurumun KENDİ sitesinden, sayfasındaki logo/apple-touch-icon
 * bağlantısı okunarak bulundu ve tek tek çağrılıp içerik türü doğrulandı.
 * Dönüşen her görsele gözle de bakıldı: içerik türü "image" dönen ama boş
 * ya da görünmez çıkan dosyalar var. Yanlış logo koymak, hiç koymamaktan
 * kötü.
 *
 * Kullanım: node scripts/kurum-logolari.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { gorseliIndir, icoyuAc } from './logo-araclari.mjs';

const KOK = path.resolve(import.meta.dirname, '..');
const HEDEF = path.join(KOK, 'public', 'kurum-logolari');
const BOY = 128;
const BULUNAN_ADRESLER = path.join(KOK, 'scripts', 'data', 'kurum-logo-adresleri.json');

/*
  LOGOLAR AYNI BÜYÜKLÜKTE GÖRÜNSÜN

  Kaynaklar farklı boşluklarla geliyor: kimi kenara dayanıyor, kimi
  çevresinde geniş beyaz payla. Ham hâlleriyle ölçüldüğünde doluluk %30 ile
  %100 arasında değişiyordu; aynı listede yan yana duran iki kurumdan biri
  diğerinin üç katı görünüyordu.

  Boş kenar kırpılıyor, sonra logo ÇEVRESİNİ SARAN DAİREYE göre
  ölçekleniyor: arayüzde logolar yuvarlak çerçevede duruyor ve kare bir
  logoyu kenara kadar büyütmek köşelerini kırpıyor. Ölçü olarak logonun en
  uzak boyalı pikselinin merkeze uzaklığı alınıyor — yuvarlak amblemler
  çerçeveyi doldurabiliyor, köşeli olanlar kendiliğinden içeri çekiliyor.
  Sonuç: hepsi aynı görsel büyüklükte ve hiçbiri kırpılmıyor.

  Beyaz pikseller "boya" sayılmıyor; beyaz zeminli logolarda zemin
  zaten beyaz çerçevenin üstünde görünmüyor, ölçüye katılsa logo boşuna
  küçülürdü.
*/
const DOLULUK = 0.96;

const KURUMLAR = [
  // Bakanlığın kendi sitesinin (gsb.gov.tr) <link rel="shortcut icon">
  // adresi. Önceki adres (kygm.gsb.gov.tr/.../gsblogo-2019.svg) yatay
  // kilitti: 128'lik kareye oturunca 128x39 kalıyor, yuvarlak çerçevede
  // diğer kurumların üçte biri kadar görünüyordu. Bu dosya 881x881 kare
  // amblem — indirilip ölçüldü ve gözle bakıldı, kırmızı amblem görünür.
  { kod: 'kyk', adres: 'https://gsb.gov.tr/dist/images/logo-gsb.svg' },
  { kod: 'tev', adres: 'https://www.tev.org.tr/favicons/apple-touch-icon.png' },
  { kod: 'tubitak', adres: 'https://tubitak.gov.tr/sites/default/files/favicon.png' },
  { kod: 'ua', adres: 'https://www.ua.gov.tr/favicon/apple-icon-180x180.png' },
  { kod: 'teknofest', adres: 'https://cdn.teknofest.org/static/assets/favicons/apple-touch-icon-144x144.png' },
  { kod: 'turgev', adres: 'https://www.turgev.org/apple-icon.png' },
  { kod: 'anadoluvakfi', adres: 'https://anadoluvakfi.org/wp-content/uploads/2021/08/anadolu_vakfi_amblem-2-300x300.png' },
  { kod: 'ted', adres: 'https://ted.org.tr/wp-content/uploads/2024/02/cropped-favicon-180x180.png' },

  /*
    İBB'nin sayfasındaki <link rel="icon"> adresi bozuk: sunucu onu
    "https://uploads.ibb.istanbulundefined" diye basıyor — daha önce "logo
    yok" denmesinin sebebi buydu. Sitenin kökündeki favicon.ico ise
    duruyor ve içinde 256x256'lık PNG var: mavi kare zemine oturmuş beyaz
    İBB amblemi. Çıkarılıp gözle bakıldı.
  */
  { kod: 'ibb', adres: 'https://www.ibb.istanbul/favicon.ico' },

  /*
    Vehbi Koç Vakfı'nın sitesindeki tek renkli logo, başlıktaki 277x35'lik
    yatay kilit. Tamamı alınsaydı 72 piksellik yuvarlak çerçevede 7 piksel
    yüksekliğinde bir şeride dönerdi; soldaki kırmızı amblem kırpılıyor.
    Kırpma sınırı gözle değil, kırmızı piksellerin sınırı ölçülerek
    bulundu: x 0-51, y 4-29.

    Alt bilgideki yüksek çözünürlüklü dosya (vkvFooterLogo.jpg) BEYAZ:
    beyaz kartın üzerinde görünmüyor, o yüzden kullanılmadı.
  */
  { kod: 'vkv', adres: 'https://www.vkv.org.tr/assets/img/vehbikocvakfi.jpg', kirp: { left: 0, top: 0, width: 56, height: 35 } },

  /*
    AŞAĞIDAKİLER ELLE BULUNDU

    kurum-logo-bul.mjs bu beş kurumu bulamadı; sayfalarına tarayıcıyla
    bakıldı ve logo adresleri canlı DOM'dan okundu. Sebepleri farklı:
    Bulgurcu Vakfı'nın sayfası sunucu taraflı okunamıyor, BTSO ile
    Fulbright'ın favicon'u 16-24 piksel, İhsan Arslan Vakfı'nın
    apple-touch-icon'u tek renk, Memur-Sen ve Dokuz Eylül logolarını
    "logo" sözcüğü geçmeyen etiketlerle ya da tembel yüklemeyle veriyor.
  */
  { kod: 'bulgurcu-ailesi-vakfi', adres: 'https://www.bavak.org/wp-content/themes/bavak_theme/img/bavaklogo.png' },

  /*
    Bu üçünü otomatik seçim yanlış buldu, gözle bakılıp düzeltildi:
    turkiyeburslari.gov.tr'nin sayfasındaki ilk logo Kültür ve Turizm
    Bakanlığı'nınki, İÜ-Cerrahpaşa Geliştirme Vakfı'nın sayfasındaki ise
    temanın kendi konuşma balonu simgesi. Yağmur Damlası Derneği'nin logosu
    ayrı bir dosya olarak yok; sitedeki başlık afişinin sol üstünde duruyor
    ve oradan kırpılıyor (sınır afişin üstünde ölçüldü).
  */
  { kod: 'ytb', adres: 'https://www.turkiyeburslari.gov.tr/YTB/images/logo/tb-logo.png' },
  { kod: 'iu-cerrahpasa-gelistirme-vakfi', adres: 'https://iucerrahpasavakfi.org.tr/wp-content/uploads/2022/12/IUCGVLOGOSONTYPE.png' },
  {
    kod: 'yagmur-damlasi-dernegi',
    adres: 'https://www.yagmurdamlasi.org.tr/templates/beez5/images/fruits.jpg',
    kirp: { left: 25, top: 10, width: 190, height: 178 },
  },
  { kod: 'bursa-ticaret-ve-sanayi-odasi', adres: 'https://www.btso.org.tr/images/logo.png' },
  { kod: 'dokuz-eylul-universitesi', adres: 'https://www.deu.edu.tr/file/2019/01/logo.png' },
  { kod: 'ihsan-arslan-vakfi', adres: 'https://ihsanarslanvakfi.org/wp-content/uploads/2023/02/vakif-png-alt.png' },
  { kod: 'memur-sen', adres: 'https://www.memursen.org.tr/assets/Nsosyallogo-CgiXZ9j3.png' },
  { kod: 'fulbright', adres: 'https://fulbright.org.tr/app/images/logo-tr@2x.png?v=2' },

  /*
    LOGOSU OLMAYAN KURUMLAR

    Üçü bilerek listede yok: Bir İyilik Yap Derneği'nin kendi görselleri
    404 dönüyor, Hukuk Araştırma Vakfı'nın sitesindeki tek logo beyaz (beyaz
    kartta görünmez), Süreyya Ağaoğlu Derneği ile Yakın Doğu Üniversitesi
    ise sunucu taraflı indirmeyi Cloudflare doğrulamasıyla engelliyor.
    Bunlar kartta baş harfleriyle görünüyor — yanlış logo koymaktansa.
  */
];

/**
 * Logonun kendi zemini var mı? Kenar halkasının neredeyse tamamı opak ve
 * beyaz değilse evet.
 *
 * Bu ayrım gerekli: kendi zemini olan logoda (örneğin İBB'nin mavi karesi)
 * boş kenar kırpılırsa zemin de gider, amblem çıplak kalır. Öyle logolar
 * kırpılmadan çerçeveyi baştan başa dolduruyor — köşeleri yuvarlak kesim
 * alıyor, orada zaten yalnızca zemin var.
 */
async function zeminliMi(veri) {
  const { data, info } = await sharp(veri, { density: 300 })
    .resize(32, 32, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  let kenar = 0;
  let dolu = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x !== 0 && y !== 0 && x !== width - 1 && y !== height - 1) continue;
      const i = (y * width + x) * 4;
      kenar++;
      const beyaz = data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245;
      if (data[i + 3] > 200 && !beyaz) dolu++;
    }
  }
  return dolu / kenar >= 0.9;
}

/** Boyalı pikselin merkeze en uzak mesafesi (piksel). Beyaz ve saydam sayılmaz. */
async function boyaYaricapi(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const mx = (width - 1) / 2;
  const my = (height - 1) / 2;

  let enUzak = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] <= 20) continue;
      if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) continue;
      const uzaklik = Math.hypot(x - mx, y - my);
      if (uzaklik > enUzak) enUzak = uzaklik;
    }
  }
  return enUzak;
}

/**
 * Beyaz logoyu koyu tona çevirir.
 *
 * Bazı kurumlar logosunu yalnızca "koyu zemin için beyaz" olarak yayınlıyor:
 * dosyanın içinde renk yok, şekil saydamlık kanalında duruyor. Beyaz kartta
 * bu logo görünmüyor. Silüet kullanılabilir durumdaysa aynı şekil koyu
 * tonda basılıyor — kurumun işareti korunuyor, yalnız rengi değişiyor;
 * baş harf koymaktan iyi.
 *
 * Silüeti çok dolu olanlar (yüzde 55 üstü) çevrilmiyor: onlar işaret değil,
 * beyaz bir levha oluyor ve koyultunca kara bir leke çıkıyor.
 */
async function beyazLogoyuKoyult(veri) {
  const { data, info } = await sharp(veri, { density: 300 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const toplam = info.width * info.height;

  let opak = 0;
  let beyaz = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 20) continue;
    opak++;
    if (data[i] > 242 && data[i + 1] > 242 && data[i + 2] > 242) beyaz++;
  }

  if (!opak || beyaz / opak < 0.98) return null;
  const siluet = opak / toplam;
  if (siluet < 0.03 || siluet > 0.55) return null;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 0x3f;
    data[i + 1] = 0x3f;
    data[i + 2] = 0x46;
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/**
 * Yatay kilitten amblemi ayıklar.
 *
 * NEDEN
 * -----
 * Kurumların yarısı logosunu "amblem + yanında kurum adı" olarak veriyor.
 * Öyle bir şerit yuvarlak çerçeveye oturunca 128 pikselin 25'ini kaplıyor:
 * listede yanındaki kare logonun beşte biri kadar görünüyor ve 56 piksellik
 * kartta okunmuyor bile. KYK için elle yapılan kırpmanın (dosyanın başındaki
 * nota bakınız) otomatiği bu.
 *
 * NASIL
 * -----
 * Sütun sütun boya sayılıyor. Amblemle yazının arasında her zaman boş bir
 * şerit var; o boşluk bulunuyor ve soldaki blok alınıyor. Kırpma yalnızca
 * sonuç kareye yakınsa kabul ediliyor — yoksa logo düz bir kelime işaretidir
 * (SÜTAŞ, TEKİNDER gibi) ve ortasından bölmek onu bozar.
 */
async function amblemiAyikla(kirpik) {
  const { data, info } = await sharp(kirpik).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  if (width / height < 2) return kirpik;

  const sutunBoyasi = new Array(width).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] <= 20) continue;
      if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) continue;
      sutunBoyasi[x]++;
    }
  }

  // Amblemin bittiği yer: yeterince geniş ilk boş şerit.
  const bosluk = Math.max(3, Math.round(width * 0.02));
  let amblemSonu = 0;
  for (let x = Math.round(height * 0.4); x < width - bosluk; x++) {
    if (sutunBoyasi.slice(x, x + bosluk).every((s) => s === 0)) {
      amblemSonu = x;
      break;
    }
  }
  if (!amblemSonu) return kirpik;

  const oran = amblemSonu / height;
  if (oran < 0.55 || oran > 1.6) return kirpik;

  return sharp(kirpik).extract({ left: 0, top: 0, width: amblemSonu, height }).trim({ threshold: 10 }).toBuffer();
}

/** Beyaz zemin üzerinde görünen boyanın oranı. */
async function boyaOrani(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let gorunur = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 20) continue;
    if (data[i] > 242 && data[i + 1] > 242 && data[i + 2] > 242) continue;
    gorunur++;
  }
  return gorunur / (info.width * info.height);
}

/**
 * Logoyu BOY×BOY saydam kareye, çevreleyen dairesi çerçeveyi dolduracak
 * biçimde oturtur. Ayrı geçişler hâlinde: sharp tek zincirde önce
 * ölçekleyip sonra kenar eklediği için kırpma/ölçekleme/ortalama tek
 * zincire sığmıyor.
 */
async function daireyeSigdir(veri) {
  const saydam = { r: 255, g: 255, b: 255, alpha: 0 };

  if (await zeminliMi(veri)) {
    return sharp(veri, { density: 300 }).resize(BOY, BOY, { fit: 'cover' }).png().toBuffer();
  }

  const kirpik = await amblemiAyikla(await sharp(veri, { density: 300 }).trim({ threshold: 10 }).toBuffer());

  const kareye = async (girdi, ic) => {
    const olcekli = await sharp(girdi).resize(ic, ic, { fit: 'inside' }).toBuffer();
    const { width, height } = await sharp(olcekli).metadata();
    return sharp(olcekli)
      .extend({
        top: Math.round((BOY - height) / 2),
        bottom: BOY - height - Math.round((BOY - height) / 2),
        left: Math.round((BOY - width) / 2),
        right: BOY - width - Math.round((BOY - width) / 2),
        background: saydam,
      })
      .png()
      .toBuffer();
  };

  // Önce kenara kadar büyüt, çevreleyen yarıçapı ölç, sonra o yarıçap
  // çerçeveyi tam dolduracak orana çek.
  const tam = await kareye(kirpik, BOY);
  const yaricap = await boyaYaricapi(tam);
  const hedef = (BOY / 2) * DOLULUK;
  const ic = Math.max(1, Math.min(BOY, Math.round((BOY * hedef) / Math.max(yaricap, 1))));

  return ic >= BOY ? tam : kareye(kirpik, ic);
}

/*
  LOGOSU KULLANILAMAYAN KURUMLAR

  Baştüzel Eğitim ve Kültür Vakfı'nın sitesindeki logo dosyası 404 dönüyor;
  başlıktaki görsel ise temanın örnek logosu ("GRANT Foundation"), yani başka
  bir kurumun adı. Böyle bir görseli koymak yanlış bilgi vermek olurdu.
*/
const ATLANANLAR = new Set(['bastuzel-egitim-vakfi']);

/*
  BULUNAN ADRESLER LİSTEYE KATILIYOR

  Yukarıdaki liste elle doğrulanmış kurumlar; kurum-logo-bul.mjs'nin
  ürettiği dosya ise kurumların sayfasından okunmuş adresler. İkisi
  birleşiyor, çakışma olursa elle doğrulanan kazanıyor.
*/
const bulunanlar = fs.existsSync(BULUNAN_ADRESLER)
  ? JSON.parse(fs.readFileSync(BULUNAN_ADRESLER, 'utf8')).map(({ kod, adres }) => ({ kod, adres }))
  : [];

const elleGirilen = new Set(KURUMLAR.map((k) => k.kod));
const tumKurumlar = [...KURUMLAR, ...bulunanlar.filter((k) => !elleGirilen.has(k.kod))].filter((k) => !ATLANANLAR.has(k.kod));

fs.mkdirSync(HEDEF, { recursive: true });

let basarili = 0;
for (const { kod, adres, kirp } of tumKurumlar) {
  try {
    const { veri: ham } = await gorseliIndir(adres);
    let veri = await icoyuAc(ham);
    if (kirp) veri = await sharp(veri).extract(kirp).png().toBuffer();
    veri = (await beyazLogoyuKoyult(veri)) ?? veri;

    const cikti = await daireyeSigdir(veri);

    /*
      Beyaz logolar elenir: kimi kurum sitesinde logoyu koyu zemin için
      beyaz olarak veriyor. Beyaz kartın üstünde hiç görünmüyor; boş bir
      daire koymaktansa kurum baş harfleriyle görünsün.
    */
    const oran = await boyaOrani(cikti);
    if (oran < 0.03) throw new Error(`beyaz/boş logo (görünen boya %${(oran * 100).toFixed(1)})`);

    const yol = path.join(HEDEF, `${kod}.png`);
    fs.writeFileSync(yol, cikti);
    const olcu = await sharp(cikti).metadata();
    console.log(`${kod.padEnd(40)} OK    ${olcu.width}x${olcu.height}  ${(cikti.length / 1024).toFixed(1)} KB`);
    basarili++;
  } catch (hata) {
    console.log(`${kod.padEnd(40)} HATA  ${hata.message.slice(0, 70)}`);
  }
}
console.log(`
${basarili}/${tumKurumlar.length} logo yazıldı -> public/kurum-logolari/`);
