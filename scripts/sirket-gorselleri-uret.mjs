/**
 * ŞİRKET KART GÖRSELİ EŞLEMESİ — ÜRETİLMİŞ DOSYA
 *
 * `node scripts/sirket-gorselleri-uret.mjs --yaz` üretiyor; elle
 * düzenlenmiyor. Tek kaynak: public/ilan-gorselleri/manifest.json.
 *
 * NEDEN ÜRETİLİYOR
 * ----------------
 * Eşlemeyi elle yazmak, manifest her tazelendiğinde sessizce eskiyen
 * ikinci bir liste demekti. Üstelik buradaki asıl iş bir KARAR:
 * hangi dosya yayımlanabilir? O kararın kodu tek yerde durmalı.
 *
 * KARAR KURALI (üçü de ölçülmüş gerekçeyle)
 * -----------------------------------------
 * · `generated_by_openai`  → ALINIYOR, "temsili" olarak. Kart bunu
 *   yazıyor; gerçek ofis fotoğrafı gibi sunulmuyor.
 * · `unknown_do_not_publish_without_review` → ALINMIYOR. Kullanım
 *   hakkı doğrulanmadı; ayrıca incelendiğinde çoğu fotoğraf bile
 *   değil (FedEx: mor zeminli logo kartı, JTI: 9600×1040 afiş).
 * · fotoğrafı logoyla AYNI dosya olanlar → ALINMIYOR. Logo kartta
 *   zaten solda; aynı görseli sağa koymak bilgi taşımaz.
 *
 * Kullanım hakkı sonradan netleşen bir şirket için manifestteki
 * `rights` alanı güncellenir ve bu betik yeniden çalıştırılır.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const KOK = path.dirname(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')));

/** Yayımlanabilir kabul edilen haklar ve karşılık gelen tür. */
const IZINLI_HAKLAR = new Map([['generated_by_openai', 'temsili']]);

export function esleme(manifest) {
  const cikti = {};
  for (const sirket of manifest.companies ?? []) {
    const foto = sirket.photo;
    if (!foto?.filename || !sirket.slug) continue;

    const tur = IZINLI_HAKLAR.get(foto.rights);
    if (!tur) continue;
    /* Fotoğraf logonun kendisiyse şirket görseli sayılmıyor. */
    if (sirket.logo && foto.sha256 && foto.sha256 === sirket.logo.sha256) continue;

    /* Yayına giren dosya kart türevi: 480 piksel WebP (bkz.
       scripts/sirket-gorsellerini-kart-boyutuna-indir.mjs). Ham üretim
       dosyası tanesi ~1,9 MB ve depoya girmiyor. */
    cikti[sirket.slug] = { yol: `/ilan-gorselleri/kart/${sirket.slug}.webp`, tur };
  }
  return cikti;
}

function yaz() {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(KOK, 'public/ilan-gorselleri/manifest.json'), 'utf8')
  );
  const harita = esleme(manifest);
  const slugler = Object.keys(harita).sort();

  const govde = [
    '/*',
    ' * ŞİRKET KART GÖRSELLERİ — ÜRETİLMİŞ DOSYA',
    ' *',
    ' * `node scripts/sirket-gorselleri-uret.mjs --yaz` üretiyor; elle',
    ' * düzenlenmiyor. Tek kaynak: public/ilan-gorselleri/manifest.json.',
    ' *',
    ' * Kullanım hakkı doğrulanmamış dosyalar BURAYA GİRMİYOR (bkz. betik).',
    ' * Türü "temsili" olan görsel gerçek ofis fotoğrafı değildir ve kart',
    ' * bunu okuyucuya söyler.',
    ' */',
    '',
    'export interface SirketGorseli {',
    '  /** public/ altındaki adres. */',
    '  yol: string;',
    '  /** "temsili" = üretilmiş görsel; kartta öyle etiketleniyor. */',
    "  tur: 'temsili';",
    '}',
    '',
    'export const SIRKET_GORSELLERI: Readonly<Record<string, SirketGorseli>> = {',
    ...slugler.map((s) => `  '${s}': { yol: '${harita[s].yol}', tur: '${harita[s].tur}' },`),
    '};',
    '',
    '/**',
    ' * Şirketin kart görseli — yoksa null.',
    ' *',
    ' * Eşleme ŞİRKETE bağlı: aynı şirketin bütün ilanları aynı görseli',
    ' * alıyor. Bilinmeyen slug uydurma bir dosyaya düşmüyor.',
    ' */',
    'export function sirketGorseli(slug: string | null | undefined): SirketGorseli | null {',
    '  if (!slug) return null;',
    '  return SIRKET_GORSELLERI[slug] ?? null;',
    '}',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(KOK, 'src/data/sirket-gorselleri.ts'), govde, 'utf8');
  console.log(`şirket görseli eşlemesi yazıldı: ${slugler.length} şirket`);
}

if (process.argv.includes('--yaz')) yaz();
