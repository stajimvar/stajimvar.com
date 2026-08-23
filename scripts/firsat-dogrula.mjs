/**
 * Fırsat adaylarının resmî kaynağını doğrular.
 *
 * NEDEN GEREKLİ
 * -------------
 * Aday listesi dışarıdan geliyor ve derlenmiş listelerde ölü bağlantı,
 * geçen yılın duyurusu ve yanlış kuruma ait sayfa olağan. Sitenin kuralı
 * net: kaynağı doğrulanmayan kayıt listeye girmez, tarihi doğrulanmayan
 * kayda tarih yazılmaz. Bu betik o iki kararı ölçerek veriyor.
 *
 * NE ÖLÇÜYOR
 * ----------
 *   erişim   — adres 200 dönüyor mu, başka bir alan adına mı düşüyor
 *   dönem    — sayfada 2026 (ya da 2026-2027) geçiyor mu
 *   konu     — sayfada burs/başvuru/staj gibi bir sözcük geçiyor mu
 *   tarih    — adaydaki başlangıç ve bitiş tarihleri sayfada yazıyor mu
 *
 * Tarih eşleşmesi Türkçe yazımın üç biçimini de deniyor: "15 Eylül",
 * "15 Eyl" ve "15.09". Hiçbiri bulunmazsa tarih DOĞRULANMADI sayılıyor ve
 * kayıt tarihsiz ekleniyor — kartta "Takvim bekleniyor" görünüyor.
 *
 * Çıktı: scripts/data/firsat-dogrulama.json (karar + gerekçe)
 * Kullanım: node scripts/firsat-dogrula.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const KOK = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const GIRDI = path.join(KOK, 'scripts', 'data', 'firsat-adaylari.json');
const CIKTI = path.join(KOK, 'scripts', 'data', 'firsat-dogrulama.json');

const BASLIK = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36 StajimVarBot/1.0 (+https://stajimvar.com/bot)',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'tr,en;q=0.8',
};

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** HTML'i kaba metne indirger; etiketler ve betikler ayıklanıyor. */
function metneCevir(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Bir tarihin sayfada geçip geçmediği: üç yaygın Türkçe yazım denenir. */
function tarihGeciyorMu(metin, isoTarih) {
  if (!isoTarih) return null;
  const [yil, ay, gun] = isoTarih.split('-').map(Number);
  const ayAdi = AYLAR[ay - 1];
  const kucuk = metin.toLocaleLowerCase('tr-TR');

  const bicimler = [
    `${gun} ${ayAdi}`,
    `${gun} ${ayAdi.slice(0, 3)}`,
    `${String(gun).padStart(2, '0')}.${String(ay).padStart(2, '0')}.${yil}`,
    `${String(gun).padStart(2, '0')}.${String(ay).padStart(2, '0')}`,
    `${String(gun).padStart(2, '0')}/${String(ay).padStart(2, '0')}/${yil}`,
  ];

  return bicimler.some((bicim) => kucuk.includes(bicim.toLocaleLowerCase('tr-TR')));
}

const adaylar = JSON.parse(fs.readFileSync(GIRDI, 'utf8'));
const sonuclar = [];

for (const aday of adaylar) {
  const kayit = { ...aday, erisim: null, sonAdres: null, donem: false, konu: false, basDogru: null, sonDogru: null, karar: 'ATLA', gerekce: '' };

  try {
    const cevap = await fetch(aday.kaynak, { headers: BASLIK, redirect: 'follow' });
    kayit.erisim = cevap.status;
    kayit.sonAdres = cevap.url;

    if (!cevap.ok) {
      kayit.gerekce = `Kaynak HTTP ${cevap.status}`;
    } else {
      const metin = metneCevir(await cevap.text());
      kayit.donem = /2026/.test(metin);
      kayit.konu = /burs|başvuru|basvuru|staj|scholarship|traineeship|programme/i.test(metin);
      kayit.basDogru = tarihGeciyorMu(metin, aday.bas);
      kayit.sonDogru = tarihGeciyorMu(metin, aday.son);

      const ayniAlan = new URL(cevap.url).hostname.replace(/^www\./, '') === new URL(aday.kaynak).hostname.replace(/^www\./, '');

      if (!ayniAlan) kayit.gerekce = `Başka alan adına yönlendi: ${new URL(cevap.url).hostname}`;
      else if (!kayit.konu) kayit.gerekce = 'Sayfada burs/başvuru ifadesi yok';
      else {
        kayit.karar = 'EKLE';
        kayit.gerekce = kayit.donem ? 'Kaynak doğrulandı' : 'Kaynak doğrulandı (sayfada 2026 geçmiyor)';
      }
    }
  } catch (hata) {
    kayit.gerekce = `Erişilemedi: ${String(hata.message).slice(0, 80)}`;
  }

  const tarihNotu =
    kayit.karar === 'EKLE'
      ? `${kayit.basDogru === true ? 'baş✓' : kayit.basDogru === false ? 'baş✗' : 'baş—'} ${kayit.sonDogru === true ? 'son✓' : kayit.sonDogru === false ? 'son✗' : 'son—'}`
      : '';

  console.log(`${kayit.karar.padEnd(5)} ${String(kayit.erisim ?? '---').padEnd(4)} ${tarihNotu.padEnd(10)} ${aday.ad.slice(0, 48).padEnd(50)} ${kayit.gerekce}`);
  sonuclar.push(kayit);
}

fs.writeFileSync(CIKTI, JSON.stringify(sonuclar, null, 2) + '\n');

const eklenecek = sonuclar.filter((s) => s.karar === 'EKLE');
const tarihli = eklenecek.filter((s) => s.sonDogru === true).length;
console.log(`\n${eklenecek.length}/${sonuclar.length} kaynak doğrulandı; ${tarihli} kayıtta son başvuru tarihi de sayfada teyit edildi.`);
