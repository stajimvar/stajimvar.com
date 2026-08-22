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

const KOK = path.resolve(import.meta.dirname, '..');
const HEDEF = path.join(KOK, 'public', 'kurum-logolari');
const BOY = 128;

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
];

/**
 * ICO kabını açar: içindeki en büyük PNG'yi döndürür.
 *
 * sharp .ico okumuyor ("unsupported image format"). Kap aslında basit:
 * başlıkta kaç görsel olduğu, ardından her biri için boyut ve konum yazıyor.
 * İçerik PNG değil de ham DIB ise bu iş burada bitmiyor — o durumda hata
 * veriyoruz, sessizce bozuk dosya yazmaktansa.
 */
function icoyuAc(veri) {
  const ico = veri.length > 6 && veri.readUInt32LE(0) === 0x00010000;
  if (!ico) return veri;

  const adet = veri.readUInt16LE(4);
  let enIyi = null;
  for (let i = 0; i < adet; i++) {
    const o = 6 + i * 16;
    const alan = (veri[o] || 256) * (veri[o + 1] || 256);
    const boyut = veri.readUInt32LE(o + 8);
    const konum = veri.readUInt32LE(o + 12);
    if (!enIyi || alan > enIyi.alan) enIyi = { alan, boyut, konum };
  }
  if (!enIyi) throw new Error('ICO içinde görsel yok');

  const ic = veri.subarray(enIyi.konum, enIyi.konum + enIyi.boyut);
  if (ic.subarray(0, 4).toString('hex') !== '89504e47') {
    throw new Error('ICO içinde PNG yok (ham DIB destelenmiyor)');
  }
  return ic;
}

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

  const kirpik = await sharp(veri, { density: 300 }).trim({ threshold: 10 }).toBuffer();

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

const BASLIK = { 'User-Agent': 'StajimVarBot/1.0 (+https://stajimvar.com/bot)' };

fs.mkdirSync(HEDEF, { recursive: true });

let basarili = 0;
for (const { kod, adres, kirp } of KURUMLAR) {
  try {
    const yanit = await fetch(adres, { headers: BASLIK });
    if (!yanit.ok) {
      console.log(`${kod.padEnd(14)} ATLANDI  HTTP ${yanit.status}`);
      continue;
    }
    const tur = yanit.headers.get('content-type') || '';
    if (!tur.startsWith('image/')) {
      console.log(`${kod.padEnd(14)} ATLANDI  içerik türü ${tur}`);
      continue;
    }
    let veri = icoyuAc(Buffer.from(await yanit.arrayBuffer()));
    if (kirp) veri = await sharp(veri).extract(kirp).png().toBuffer();

    const cikti = await daireyeSigdir(veri);

    const yol = path.join(HEDEF, `${kod}.png`);
    fs.writeFileSync(yol, cikti);
    const olcu = await sharp(cikti).metadata();
    console.log(`${kod.padEnd(14)} OK       ${olcu.width}x${olcu.height}  ${(cikti.length / 1024).toFixed(1)} KB`);
    basarili++;
  } catch (hata) {
    console.log(`${kod.padEnd(14)} HATA     ${hata.message.slice(0, 60)}`);
  }
}
console.log(`\n${basarili}/${KURUMLAR.length} logo yazıldı -> public/kurum-logolari/`);
