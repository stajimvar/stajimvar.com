/**
 * Kurumların KENDİ sayfasından logo adresini bulur.
 *
 * NEDEN AYRI BİR BETİK
 * --------------------
 * kurum-logolari.mjs indirip ölçekliyor; adresi vermiyor. On kurum için o
 * adresleri elle bulmak makuldü, kırk kurum için değil. Bu betik aynı işi
 * elle yapılan yoldan yapıyor: kurumun ana sayfasını açıyor, HTML'indeki
 * ikon ve logo bağlantılarını okuyor, adayları tek tek indirip ölçüyor.
 *
 * ADRES YİNE TAHMİN DEĞİL
 * -----------------------
 * Hiçbir adres uydurulmuyor: ya sayfanın kendi <link rel="icon"> /
 * apple-touch-icon / og:image etiketinde yazıyor, ya sayfadaki logo
 * <img>'inin src'sinde, ya da sitenin kökündeki /favicon.ico deneniyor (bu
 * tek "tahmin" ve yalnızca gerçekten var olup görsel dönerse kabul
 * ediliyor). İndirilen her dosya açılıp ölçülüyor:
 *   - içerik türü image/* olacak
 *   - en kısa kenarı en az 32 piksel olacak (SVG hariç, o ölçeklenebilir)
 *   - tamamen saydam ya da tek renk olmayacak (boş favicon'lar var)
 *
 * EN İYİSİ SEÇİLİYOR, İLK BULUNAN DEĞİL
 * -------------------------------------
 * Adaylar sırayla denenip ilki alınsaydı 32 piksellik bulanık bir favicon,
 * aynı sayfadaki 500 piksellik amblemin önüne geçerdi. Onun yerine tüm
 * adaylar indirilip puanlanıyor: büyük olan, kareye yakın olan ve amblem
 * koyulması beklenen yerden gelen (apple-touch-icon, sayfa logosu) kazanır.
 * Yatay kilitler (277x35 gibi) ceza alıyor — yuvarlak çerçevede bir şeride
 * dönüştükleri için, kurum-logolari.mjs'nin başındaki KYK notuna bakınız.
 *
 * Çıktı: scripts/data/kurum-logo-adresleri.json — kurum-logolari.mjs bu
 * dosyayı okuyup indiriyor ve ölçekliyor. Ayrı durmaları bilinçli: bulma
 * işi ağdan geçiyor ve yavaş, ölçekleme işi yerelde tekrarlanabilir.
 *
 * Kullanım: node scripts/kurum-logo-bul.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { gorseliIndir, icoyuAc, sayfayiAl } from './logo-araclari.mjs';

const KOK = path.resolve(import.meta.dirname, '..');
const GIRDI = path.join(KOK, 'scripts', 'data', 'kurum-sayfalari.json');
const CIKTI = path.join(KOK, 'scripts', 'data', 'kurum-logo-adresleri.json');

/** Adayın geldiği yer ne kadar güvenilir: amblem konması beklenen yerler önde. */
const KAYNAK_PUANI = {
  'apple-touch-icon': 120,
  'sayfa-logosu': 100,
  icon: 80,
  'favicon.ico': 40,
  'og:image': 0,
};

/** <link>, <meta> ve logo <img> etiketlerinden aday adresleri çıkarır. */
function adaylariBul(html, sayfaAdresi) {
  const adaylar = [];

  const mutlak = (deger) => {
    try {
      const adres = new URL(String(deger).replace(/&amp;/g, '&').trim(), sayfaAdresi);
      return adres.protocol === 'http:' || adres.protocol === 'https:' ? adres.href : null;
    } catch {
      return null;
    }
  };

  for (const etiket of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = (etiket.match(/rel\s*=\s*["']([^"']+)["']/i)?.[1] ?? '').toLowerCase();
    const href = etiket.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href || !/icon/.test(rel)) continue;

    const adres = mutlak(href);
    if (adres) adaylar.push({ adres, tur: rel.includes('apple-touch') ? 'apple-touch-icon' : 'icon' });
  }

  for (const etiket of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const ad = (etiket.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1] ?? '').toLowerCase();
    if (ad !== 'og:image' && ad !== 'twitter:image') continue;
    const adres = mutlak(etiket.match(/content\s*=\s*["']([^"']+)["']/i)?.[1] ?? '');
    if (adres) adaylar.push({ adres, tur: 'og:image' });
  }

  // Sayfanın kendi logosu: adında/sınıfında "logo" geçen görseller. Favicon'u
  // olmayan ya da 16 piksellik favicon'u olan sitelerde tek düzgün kaynak bu.
  let logoSayisi = 0;
  for (const etiket of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (!/logo|amblem|brand/i.test(etiket) || logoSayisi >= 3) continue;
    const src = etiket.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    const adres = src && !src.startsWith('data:') ? mutlak(src) : null;
    if (adres) {
      adaylar.push({ adres, tur: 'sayfa-logosu' });
      logoSayisi++;
    }
  }

  adaylar.push({ adres: new URL('/favicon.ico', sayfaAdresi).href, tur: 'favicon.ico' });

  const gorulen = new Set();
  return adaylar.filter((a) => !gorulen.has(a.adres) && gorulen.add(a.adres));
}

/**
 * Adayı ölçer ve puanlar. Kabul edilmezse gerekçe döner.
 *
 * Puan: en kısa kenar (büyük iyi) + geldiği yerin puanı − yatay/dikey kilit
 * cezası. Yuvarlak çerçevede duracağı için kareye yakın olan kazanmalı.
 */
async function adayiOlc(veri, tur, svgMi) {
  const olcu = await sharp(veri, { density: 300 }).metadata();
  const en = olcu.width ?? 0;
  const boy = olcu.height ?? 0;
  if (!en || !boy) return { sorun: 'ölçüsü okunamadı' };
  if (!svgMi && Math.min(en, boy) < 32) return { sorun: `küçük (${en}x${boy})` };

  const { data, info } = await sharp(veri, { density: 300 })
    .resize(24, 24, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let gorunur = 0;
  const renkler = new Set();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 20) continue;
    gorunur++;
    renkler.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`);
  }
  if (gorunur < info.width * info.height * 0.05) return { sorun: 'neredeyse tamamen saydam' };
  if (renkler.size < 2) return { sorun: 'tek renk' };

  const oran = Math.max(en, boy) / Math.min(en, boy);
  const kilitCezasi = oran > 2.2 ? 140 : oran > 1.6 ? 50 : 0;
  const boyutPuani = svgMi ? 256 : Math.min(Math.min(en, boy), 256);

  return { puan: boyutPuani + (KAYNAK_PUANI[tur] ?? 0) - kilitCezasi, en, boy };
}

const kurumlar = JSON.parse(fs.readFileSync(GIRDI, 'utf8'));
const bulunan = [];
const bulunamayan = [];

for (const kurum of kurumlar) {
  let adaylar = [];
  try {
    const sayfa = await sayfayiAl(kurum.sayfa);
    adaylar = adaylariBul(sayfa.html, sayfa.adres);
  } catch (hata) {
    // Sayfa açılmasa bile kökteki favicon.ico denenmeye değer.
    adaylar = [{ adres: new URL('/favicon.ico', kurum.sayfa).href, tur: 'favicon.ico' }];
    console.log(`${kurum.kod.padEnd(40)} not   sayfa okunamadı (${String(hata.message).slice(0, 36)})`);
  }

  let secilen = null;
  const gerekceler = [];

  for (const aday of adaylar.slice(0, 8)) {
    try {
      const { veri: ham, tur } = await gorseliIndir(aday.adres, 15);
      const veri = await icoyuAc(ham);
      const olcum = await adayiOlc(veri, aday.tur, tur.includes('svg'));
      if (olcum.sorun) {
        gerekceler.push(`${aday.tur}: ${olcum.sorun}`);
        continue;
      }

      if (!secilen || olcum.puan > secilen.puan) {
        secilen = { ...kurum, adres: aday.adres, etiket: aday.tur, puan: olcum.puan, olcu: `${olcum.en}x${olcum.boy}` };
      }
    } catch (hata) {
      gerekceler.push(`${aday.tur}: ${String(hata.message).slice(0, 40)}`);
    }
  }

  if (secilen) {
    bulunan.push(secilen);
    console.log(`${kurum.kod.padEnd(40)} OK    ${secilen.etiket.padEnd(17)} ${secilen.olcu.padEnd(10)} ${secilen.adres.slice(0, 62)}`);
  } else {
    bulunamayan.push({ ...kurum, gerekceler });
    console.log(`${kurum.kod.padEnd(40)} YOK   ${gerekceler.slice(0, 3).join(' | ').slice(0, 96)}`);
  }
}

fs.writeFileSync(CIKTI, JSON.stringify(bulunan, null, 2) + '\n');
console.log(`\n${bulunan.length}/${kurumlar.length} kurum için logo adresi bulundu -> ${path.relative(KOK, CIKTI)}`);
if (bulunamayan.length) {
  console.log('Bulunamayanlar:');
  for (const k of bulunamayan) console.log(`  ${k.kod} — ${k.sayfa}`);
}
