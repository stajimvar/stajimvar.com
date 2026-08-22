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
 * İKİ KURUM LİSTEDE YOK:
 *   - İstanbul Büyükşehir Belediyesi: sitesinde makine tarafından bulunabilen
 *     logo yok, og:image adresi 404 dönüyor.
 *   - Vehbi Koç Vakfı: bulunan tek dosya (vkvFooterLogo.jpg) BEYAZ bir logo.
 *     İndirilip ölçüldü, dönüştürülen görsel tamamen boş çıktı — beyaz kartın
 *     üzerinde görünmezdi. Gözle bakılmasaydı "logo var" sanılacaktı.
 *
 * İkisinde de arayüz baş harfleri gösteriyor. Yanlış ya da görünmez logo
 * koymak, hiç koymamaktan kötü.
 *
 * Kullanım: node scripts/kurum-logolari.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const KOK = path.resolve(import.meta.dirname, '..');
const HEDEF = path.join(KOK, 'public', 'kurum-logolari');
const BOY = 128;

const KURUMLAR = [
  ['kyk', 'https://kygm.gsb.gov.tr/assets/img/gsblogo-2019.svg'],
  ['tev', 'https://www.tev.org.tr/favicons/apple-touch-icon.png'],
  ['tubitak', 'https://tubitak.gov.tr/sites/default/files/favicon.png'],
  ['ua', 'https://www.ua.gov.tr/favicon/apple-icon-180x180.png'],
  ['teknofest', 'https://cdn.teknofest.org/static/assets/favicons/apple-touch-icon-144x144.png'],
  ['turgev', 'https://www.turgev.org/apple-icon.png'],
  ['anadoluvakfi', 'https://anadoluvakfi.org/wp-content/uploads/2021/08/anadolu_vakfi_amblem-2-300x300.png'],
  ['ted', 'https://ted.org.tr/wp-content/uploads/2024/02/cropped-favicon-180x180.png'],
];

const BASLIK = { 'User-Agent': 'StajimVarBot/1.0 (+https://stajimvar.com/bot)' };

fs.mkdirSync(HEDEF, { recursive: true });

let basarili = 0;
for (const [kod, adres] of KURUMLAR) {
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
    const veri = Buffer.from(await yanit.arrayBuffer());

    /*
      `contain` + şeffaf zemin: logolar farklı en-boy oranlarında geliyor.
      `cover` kullanılsaydı geniş logoların kenarları kırpılırdı ve kurum
      adı okunmaz hale gelirdi.
    */
    const cikti = await sharp(veri, { density: 300 })
      .resize(BOY, BOY, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();

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
