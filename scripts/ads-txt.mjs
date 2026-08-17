/**
 * public/ads.txt dosyasını .env'deki yayıncı kimliğinden üretir.
 *
 * NEDEN BETİKLE ÜRETİLİYOR
 * ------------------------
 * ads.txt, sitenin kökünde durması gereken tek satırlık bir dosya. İçinde
 * yayıncı kimliği geçiyor; elle yazılırsa kimlik değiştiğinde iki yeri birden
 * güncellemek gerekiyor ve biri unutuluyor. Unutulduğunda AdSense "kazancınız
 * risk altında" uyarısı veriyor ve reklamlar kısılıyor — sessiz bir hata.
 *
 * Burada tek kaynak .env. Kimlik yoksa dosya HİÇ ÜRETİLMİYOR: yanlış kimlik
 * içeren bir ads.txt, hiç olmamasından daha kötü.
 *
 * `f08c47fec0942fa0` Google'ın sabit sertifika kimliği; ads.txt belirtiminde
 * bu alan yayıncıya göre değişmiyor.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const kok = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const hedef = path.join(kok, 'public', 'ads.txt');

/*
  Yayinci kimligi reklam.json'dan; .env'den DEGIL.

  .env yalnizca bu bilgisayarda var; dagitim CI'ya tasininca deger
  bosaldi ve bu betik ads.txt'i URETMEDIGI gibi var olani SILDI.
  Sonuc: canli sitede ads.txt kayboldu (olculdu, HTTP 200 donuyordu
  ama icerik SPA yedegiydi).

  Deger gizli degil - sayfa kaynaginda zaten aciktan goruluyor.
*/
const ayarYolu = path.join(kok, 'reklam.json');
const ayar = fs.existsSync(ayarYolu)
  ? JSON.parse(fs.readFileSync(ayarYolu, 'utf8'))
  : {};
const client = ayar.yayinciKimligi || process.env.VITE_ADSENSE_CLIENT;

if (!client) {
  // Kimlik yokken varsa eski dosyayı da kaldır: yanlış kimlikle yayında kalmasın.
  if (fs.existsSync(hedef)) {
    fs.unlinkSync(hedef);
    console.log('ads.txt silindi (VITE_ADSENSE_CLIENT tanımlı değil)');
  } else {
    console.log('ads.txt üretilmedi (VITE_ADSENSE_CLIENT tanımlı değil)');
  }
  process.exit(0);
}

// ads.txt "ca-" önekini istemiyor: ca-pub-123... → pub-123...
const yayinciKimligi = client.replace(/^ca-/, '');

if (!/^pub-\d{10,}$/.test(yayinciKimligi)) {
  console.error(
    `ads.txt ÜRETİLMEDİ: VITE_ADSENSE_CLIENT beklenen biçimde değil ("${client}").\n` +
      'Beklenen biçim: ca-pub-XXXXXXXXXXXXXXXX'
  );
  process.exit(1);
}

fs.writeFileSync(
  hedef,
  `# Bu dosya otomatik üretiliyor: scripts/ads-txt.mjs\n` +
    `# Elle düzenleme; .env içindeki VITE_ADSENSE_CLIENT değerini değiştir.\n` +
    `google.com, ${yayinciKimligi}, DIRECT, f08c47fec0942fa0\n`,
  'utf8'
);

console.log(`ads.txt yazıldı: google.com, ${yayinciKimligi}, DIRECT`);
