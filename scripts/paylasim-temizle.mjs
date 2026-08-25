/**
 * Yayımlanmış Instagram setlerini depodan temizler.
 *
 * NE YAPIYOR
 * ----------
 * Supabase'deki yayın kayıtlarını okuyor. Yayınlanalı 24 saatten fazla
 * olmuş ve henüz temizlenmemiş her set için:
 *
 *   1. public/paylasim/setler.json'dan kaydı çıkarıyor,
 *   2. o setin kart ve hikâye görsellerini siliyor,
 *   3. yayın kaydına `temizlendi_mi = true` yazıyor.
 *
 * Geriye küçük kayıt kalıyor: başlık, gönderi kimliği, yayın tarihi.
 *
 * NEDEN GEREKLİ
 * -------------
 * Kart üreten betikler setler.json'a ekliyor, hiçbir şey çıkarmıyordu.
 * Ölçüldü: public/paylasim 19 MB ve her hafta büyüyor; yönetici panelinde
 * dokuz set birikmiş durumda. Asıl risk yer değil — aylar önce
 * yayınlanmış bir set hâlâ tek tıklamayla yeniden yayınlanabiliyordu.
 *
 * NE SİLİNMİYOR
 * -------------
 * 1. Yayınlanmamış ya da yayını hata almış setler. Onların kaydı hiç
 *    oluşmuyor, bu betik onlara hiç bakmıyor.
 * 2. Instagram'daki gönderi. Bu betik Meta'ya HİÇBİR istek atmıyor.
 *    Yayınlanmış gönderi hesabın kamuya açık içeriği; kaldırmak geri
 *    alınamayan, dışarıya dönük bir karar ve bize ait değil.
 *
 * Dosyalar depoda duruyor, yani silme bir commit demek. Betik dosyaları
 * siliyor ve ne yaptığını yazıyor; commit'i insan atıyor.
 *
 * Kullanım:
 *   node scripts/paylasim-temizle.mjs            (siler)
 *   node scripts/paylasim-temizle.mjs --dene     (yalnızca raporlar)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { GORUNURLUK_SAATI, temizlenecekler } from '../src/lib/instagram-yayin.mjs';

const KOK = path.resolve(import.meta.dirname, '..');
const PAYLASIM = path.join(KOK, 'public', 'paylasim');
const SETLER = path.join(PAYLASIM, 'setler.json');

const deneme = process.argv.includes('--dene');

/*
  Ortam değişkenleri automation/.env'den de okunabiliyor: bakım betikleri
  orada duran servis anahtarıyla çalışıyor (ilan-baglanti-kontrol.mjs ile
  aynı kalıp).
*/
function ortamiOku() {
  const ortam = { ...process.env };
  const dosya = path.join(KOK, 'automation', '.env');
  if (!fs.existsSync(dosya)) return ortam;
  for (const satir of fs.readFileSync(dosya, 'utf8').split('\n')) {
    const esles = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(satir);
    if (esles && !ortam[esles[1]]) ortam[esles[1]] = esles[2].replace(/^["']|["']$/g, '');
  }
  return ortam;
}

const ortam = ortamiOku();
const adres = ortam.SUPABASE_URL || ortam.VITE_SUPABASE_URL;
const anahtar = ortam.SUPABASE_SERVICE_ROLE_KEY;
if (!adres || !anahtar) {
  console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (automation/.env).');
  process.exit(1);
}

const db = createClient(adres, anahtar, { auth: { persistSession: false } });

const { data: yayinlar, error } = await db
  .from('instagram_yayinlari')
  .select('set_kodu, baslik, gonderi_kimligi, yayin_zamani, temizlendi_mi');

if (error) {
  console.error('Yayın kayıtları okunamadı:', error.message);
  process.exit(1);
}

const hedefler = temizlenecekler(yayinlar ?? []);
if (!hedefler.length) {
  console.log(
    `temizlenecek set yok (${yayinlar?.length ?? 0} yayın kaydı, eşik ${GORUNURLUK_SAATI} saat).`
  );
  process.exit(0);
}

const setler = JSON.parse(fs.readFileSync(SETLER, 'utf8'));
const kalanlar = [];
const silinenDosyalar = [];
const temizlenenKodlar = [];

for (const set of setler) {
  const hedef = hedefler.find((h) => h.set_kodu === set.kod);
  if (!hedef) {
    kalanlar.push(set);
    continue;
  }

  /*
    Kart ve hikâye görselleri aynı sette; ikisi de siliniyor. Yol
    setler.json'dan geliyor ve site kökünden başlıyor ("/paylasim/...").
  */
  const yollar = [...(set.kartlar ?? []), ...(set.hikayeler ?? [])];
  for (const yol of yollar) {
    const dosya = path.join(KOK, 'public', yol.replace(/^\//, ''));
    if (!fs.existsSync(dosya)) continue;
    if (!deneme) fs.rmSync(dosya);
    silinenDosyalar.push(yol);
  }

  /* Boşalan klasör bırakılmıyor: depoda anlamsız boş dizinler kalmasın. */
  for (const klasor of new Set(yollar.map((y) => path.dirname(path.join(KOK, 'public', y.replace(/^\//, '')))))) {
    if (!deneme && fs.existsSync(klasor) && fs.readdirSync(klasor).length === 0) {
      fs.rmdirSync(klasor);
    }
  }

  temizlenenKodlar.push(set.kod);
  console.log(
    `${deneme ? '[dene] ' : ''}${set.ad} — ${yollar.length} görsel, gönderi ${hedef.gonderi_kimligi}`
  );
}

if (!temizlenenKodlar.length) {
  console.log('yayın kayıtları var ama setler.json içinde karşılıkları yok; dosya zaten temiz.');
  process.exit(0);
}

if (!deneme) {
  fs.writeFileSync(SETLER, `${JSON.stringify(kalanlar, null, 2)}\n`, 'utf8');

  /*
    İşaret en sonda konuyor. Dosyalar silinmeden işaretlenseydi ve betik
    ortada düşseydi, kayıt "temizlendi" derken görseller depoda kalırdı ve
    bir daha kimse onlara bakmazdı.
  */
  const { error: yazmaHatasi } = await db
    .from('instagram_yayinlari')
    .update({ temizlendi_mi: true })
    .in('set_kodu', temizlenenKodlar);
  if (yazmaHatasi) {
    console.error('UYARI: dosyalar silindi ama kayıt işaretlenemedi:', yazmaHatasi.message);
    process.exit(1);
  }
}

console.log(
  `\n${deneme ? '[dene] ' : ''}${temizlenenKodlar.length} set, ${silinenDosyalar.length} görsel` +
    `${deneme ? ' silinecekti' : ' silindi'}. Instagram'a hiçbir istek gönderilmedi.`
);
if (!deneme) console.log('Değişikliği commit etmeyi unutma: public/paylasim');
