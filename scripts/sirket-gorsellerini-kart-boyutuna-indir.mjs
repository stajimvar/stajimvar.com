/**
 * KART GÖRSELLERİNİ YAYINA UYGUN BOYUTA İNDİRİR.
 *
 * Kaynak dosyalar üretim çıktısı: 29 görsel toplam 54,9 MB, tanesi
 * ~1,9 MB. Kartta en fazla 168 piksel genişlikte görünüyorlar; ham
 * hâlleriyle yayımlamak her ilan listesinde megabaytlarca gereksiz
 * indirme demekti.
 *
 * Çıktı: public/ilan-gorselleri/kart/<slug>.webp — 480 piksel genişlik
 * (168'in ~3 katı, retina için fazlasıyla yeterli), 16:10 kırpma,
 * WebP q72.
 *
 * Kaynak dosyalar depoya GİRMİYOR; yalnız bu küçük türevler giriyor.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const KOK = path.dirname(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')));
const KAYNAK = path.join(KOK, 'public/ilan-gorselleri/kaynak');
const HEDEF = path.join(KOK, 'public/ilan-gorselleri/kart');

const GENISLIK = 480;
const YUKSEKLIK = 300; // 16:10

export async function uret() {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(KOK, 'public/ilan-gorselleri/manifest.json'), 'utf8')
  );
  fs.mkdirSync(HEDEF, { recursive: true });

  let toplam = 0;
  const yazilan = [];
  for (const sirket of manifest.companies ?? []) {
    /* Yalnız kullanım hakkı açık olanlar; karar `sirket-gorselleri-uret` ile aynı. */
    if (sirket.photo?.rights !== 'generated_by_openai') continue;
    const girdi = path.join(KAYNAK, sirket.photo.filename);
    if (!fs.existsSync(girdi)) continue;

    const cikti = path.join(HEDEF, `${sirket.slug}.webp`);
    await sharp(girdi)
      .resize(GENISLIK, YUKSEKLIK, { fit: 'cover', position: 'centre' })
      .webp({ quality: 72 })
      .toFile(cikti);
    const boyut = fs.statSync(cikti).size;
    toplam += boyut;
    yazilan.push(`${sirket.slug} ${Math.round(boyut / 1024)}KB`);
  }
  console.log(`${yazilan.length} kart görseli yazıldı, toplam ${Math.round(toplam / 1024)}KB`);
  return yazilan;
}

if (process.argv.includes('--yaz')) await uret();
