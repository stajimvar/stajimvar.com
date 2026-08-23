/**
 * Logo betiklerinin ortak araçları: ICO açma ve ağdan indirme.
 *
 * İki betik de aynı işi yapıyor — kurum-logo-bul.mjs adayları ölçerken,
 * kurum-logolari.mjs seçileni indirirken. Aynı kodun iki kopyası olsaydı
 * biri düzeltilip diğeri unutulurdu; ortak yer burası.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

// Kurum siteleri bot kokusu alan güvenlik duvarlarının arkasında; sıradan
// bir tarayıcı kimliği olmadan çoğu 403 dönüyor.
export const TARAYICI_KIMLIGI =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export const BASLIK = {
  'User-Agent': TARAYICI_KIMLIGI,
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
};

/**
 * Görseli indirir. Node'un fetch'i başarısız olursa curl deneniyor.
 *
 * Gerekçe ölçüldü: bavak.org ve geleceginmadencileri.com Node'a "fetch
 * failed" diyor (TLS/ALPN el sıkışması), aynı adres curl ile 200 dönüyor.
 * Bir kurumu bu yüzden logosuz bırakmak yerine ikinci yol deneniyor.
 */
export async function gorseliIndir(adres, saniye = 20) {
  try {
    const yanit = await fetch(adres, { headers: BASLIK, redirect: 'follow', signal: AbortSignal.timeout(saniye * 1000) });
    if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
    const tur = yanit.headers.get('content-type') ?? '';
    if (!tur.startsWith('image/')) throw new Error(`içerik türü ${tur.slice(0, 30)}`);
    return { veri: Buffer.from(await yanit.arrayBuffer()), tur };
  } catch (hata) {
    return curlIle(adres, saniye, hata);
  }
}

function curlIle(adres, saniye, ilkHata) {
  const gecici = path.join(os.tmpdir(), `logo-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try {
    const bicim = execFileSync(
      'curl',
      ['-sSL', '-A', TARAYICI_KIMLIGI, '--max-time', String(saniye), '-w', '%{content_type}', '-o', gecici, adres],
      { encoding: 'utf8', timeout: (saniye + 5) * 1000 },
    );
    if (!bicim.startsWith('image/')) throw new Error(`içerik türü ${bicim.slice(0, 30)}`);
    return { veri: fs.readFileSync(gecici), tur: bicim };
  } catch (curlHatasi) {
    throw new Error(`${ilkHata.message} / curl: ${String(curlHatasi.message).slice(0, 40)}`);
  } finally {
    fs.rmSync(gecici, { force: true });
  }
}

/**
 * Sayfanın HTML'ini alır; Node'un fetch'i takılırsa curl'a düşer.
 *
 * gorseliIndir ile aynı gerekçe: bazı sunucularla Node el sıkışamıyor ve
 * o kurumun logosu hiç aranamadan eleniyordu.
 */
export async function sayfayiAl(adres, saniye = 20) {
  try {
    const yanit = await fetch(adres, {
      headers: { ...BASLIK, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
      redirect: 'follow',
      signal: AbortSignal.timeout(saniye * 1000),
    });
    if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
    return { html: await yanit.text(), adres: yanit.url };
  } catch (hata) {
    const html = execFileSync(
      'curl',
      ['-sSL', '-A', TARAYICI_KIMLIGI, '--max-time', String(saniye), '--fail', adres],
      { encoding: 'utf8', timeout: (saniye + 5) * 1000, maxBuffer: 20 * 1024 * 1024 },
    );
    if (!html) throw hata;
    return { html, adres };
  }
}

/**
 * ICO kabını açar: içindeki en büyük görseli PNG olarak döndürür.
 *
 * sharp .ico okumuyor. Kap aslında basit: başlıkta kaç görsel olduğu,
 * ardından her biri için boyut ve konum yazıyor. İçerik ya doğrudan PNG'dir
 * ya da ham DIB — ikincisi de çözülüyor, çünkü kurumların yarısının
 * favicon'u eski araçlarla üretilmiş ve içinde PNG yok.
 */
export async function icoyuAc(veri) {
  if (!(veri.length > 6 && veri.readUInt32LE(0) === 0x00010000)) return veri;

  const adet = veri.readUInt16LE(4);
  let enIyi = null;
  for (let i = 0; i < adet; i++) {
    const o = 6 + i * 16;
    const alan = (veri[o] || 256) * (veri[o + 1] || 256);
    if (!enIyi || alan > enIyi.alan) {
      enIyi = { alan, boyut: veri.readUInt32LE(o + 8), konum: veri.readUInt32LE(o + 12) };
    }
  }
  if (!enIyi) throw new Error('ICO içinde görsel yok');

  const ic = veri.subarray(enIyi.konum, enIyi.konum + enIyi.boyut);
  if (ic.subarray(0, 4).toString('hex') === '89504e47') return ic;
  return dibiPngYap(ic);
}

/**
 * ICO içindeki ham DIB'i PNG'ye çevirir.
 *
 * Kap şöyle: 40 baytlık başlık, varsa palet, alttan üste doğru yazılmış
 * renk satırları ve en sonda 1 bitlik saydamlık maskesi. Başlıkta yükseklik
 * iki katı yazar (renk + maske), o yüzden ikiye bölünüyor.
 */
export async function dibiPngYap(ic) {
  const basBoy = ic.readUInt32LE(0);
  const en = ic.readInt32LE(4);
  const boy = Math.floor(ic.readInt32LE(8) / 2);
  const bit = ic.readUInt16LE(14);
  if (![32, 24, 8, 4].includes(bit)) throw new Error(`DIB ${bit} bit desteklenmiyor`);
  if (en <= 0 || boy <= 0) throw new Error('DIB ölçüsü okunamadı');

  const renkAdedi = ic.readUInt32LE(32) || (bit <= 8 ? 1 << bit : 0);
  const palet = ic.subarray(basBoy, basBoy + renkAdedi * 4);
  const veriBas = basBoy + renkAdedi * 4;
  const satirBayt = Math.ceil((en * bit) / 32) * 4;
  const maskeBas = veriBas + satirBayt * boy;
  const maskeSatir = Math.ceil(en / 32) * 4;

  const piksel = Buffer.alloc(en * boy * 4);
  let alfaVar = false;

  for (let y = 0; y < boy; y++) {
    const kaynakSatir = boy - 1 - y; // DIB alttan üste yazılıyor
    for (let x = 0; x < en; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 255;

      if (bit === 32) {
        const o = veriBas + kaynakSatir * satirBayt + x * 4;
        b = ic[o];
        g = ic[o + 1];
        r = ic[o + 2];
        a = ic[o + 3];
        if (a > 0) alfaVar = true;
      } else if (bit === 24) {
        const o = veriBas + kaynakSatir * satirBayt + x * 3;
        b = ic[o];
        g = ic[o + 1];
        r = ic[o + 2];
      } else {
        const o = veriBas + kaynakSatir * satirBayt + (bit === 8 ? x : x >> 1);
        const sira = bit === 8 ? ic[o] : x % 2 ? ic[o] & 0x0f : ic[o] >> 4;
        b = palet[sira * 4] ?? 0;
        g = palet[sira * 4 + 1] ?? 0;
        r = palet[sira * 4 + 2] ?? 0;
      }

      const c = (y * en + x) * 4;
      piksel[c] = r;
      piksel[c + 1] = g;
      piksel[c + 2] = b;
      piksel[c + 3] = a;
    }
  }

  // 32 bitlik ikonların bir kısmı alfa kanalını sıfır bırakıyor: o zaman
  // görsel tamamen saydam görünür. Öyle dosyalarda da maskeye düşülüyor.
  if ((bit !== 32 || !alfaVar) && maskeBas + maskeSatir * boy <= ic.length) {
    for (let y = 0; y < boy; y++) {
      const kaynakSatir = boy - 1 - y;
      for (let x = 0; x < en; x++) {
        const o = maskeBas + kaynakSatir * maskeSatir + (x >> 3);
        piksel[(y * en + x) * 4 + 3] = (ic[o] >> (7 - (x & 7))) & 1 ? 0 : 255;
      }
    }
  }

  return sharp(piksel, { raw: { width: en, height: boy, channels: 4 } }).png().toBuffer();
}
