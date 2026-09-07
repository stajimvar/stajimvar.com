/**
 * HAKKIMIZDA SAYFASININ KAYNAK ÖZETİ — ÜRETİLMİŞ DOSYA
 *
 * `node scripts/kaynak-ozeti.mjs --yaz` üretiyor; elle düzenlenmiyor.
 *
 * NEDEN ÜRETİLİYOR
 * ----------------
 * Hakkımızda sayfası "altı farklı sistemden ilan alıyoruz" diyordu ve
 * ölçüldüğünde DOĞRUYDU (Lever, Greenhouse, Workable, Ashby, Workday,
 * SmartRecruiters). Ama elle yazılmış bir sayı: yedinci sistem eklendiği
 * gün sayfa sessizce yanlış konuşmaya başlar ve bunu kimse fark etmez.
 *
 * Eksik olan başka bir şey daha vardı: kaç ŞİRKET kaynağı takip
 * edildiği hiç yazmıyordu. Ölçüldü (7 Eylül 2026): 41 kaynak, 7 sistem.
 *
 * Artık ikisi de elle yazılmıyor: `automation/sources.json` tek kaynak,
 * bu dosya ondan üretiliyor.
 *
 * NEDEN TÜM DOSYA PAKETE KONMUYOR
 * -------------------------------
 * `sources.json` her kaynağın adresini ve sorgu ayarlarını taşıyor;
 * tarayıcıya göndermenin bir faydası yok. Buraya yalnız sistem adı ve
 * kaç şirket kaynağının o sistemden okunduğu yazılıyor.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const KOK = path.dirname(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
);

/**
 * Sistem kimliği → sahibinin yazdığı ad.
 *
 * Adlar kaynağın kendi yazımı; marka olarak doğru görünmeleri için
 * elle eşleniyor. Listede olmayan bir kimlik gelirse olduğu gibi
 * yazılıyor — uydurma ad üretilmiyor.
 */
const SISTEM_ADI = {
  lever: 'Lever',
  greenhouse: 'Greenhouse',
  workable: 'Workable',
  workable_search: 'Workable',
  ashby: 'Ashby',
  workday: 'Workday',
  smartrecruiters: 'SmartRecruiters',
  official_jsonld: 'Şirketin kendi kariyer sayfası',
};

export function kaynakOzeti(kayitlar) {
  const say = new Map();
  for (const kayit of kayitlar) {
    if (kayit?.enabled === false) continue;
    const kimlik = String(kayit?.type ?? '').trim();
    if (!kimlik) continue;
    const ad = SISTEM_ADI[kimlik] ?? kimlik;
    say.set(ad, (say.get(ad) ?? 0) + 1);
  }
  return [...say.entries()]
    .map(([ad, adet]) => ({ ad, adet }))
    /* Çoktan aza; eşitlikte alfabetik, yani çıktı her koşuda aynı. */
    .sort((a, b) => b.adet - a.adet || a.ad.localeCompare(b.ad, 'tr'));
}

function yaz() {
  const ham = JSON.parse(
    fs.readFileSync(path.join(KOK, 'automation/sources.json'), 'utf8')
  );
  const kayitlar = Array.isArray(ham) ? ham : Object.values(ham)[0];
  const ozet = kaynakOzeti(kayitlar);
  const toplam = ozet.reduce((a, x) => a + x.adet, 0);

  const govde = [
    '/*',
    ' * TAKİP EDİLEN KAYNAK ÖZETİ — ÜRETİLMİŞ DOSYA',
    ' *',
    ' * `node scripts/kaynak-ozeti.mjs --yaz` üretiyor; elle düzenlenmiyor.',
    ' * Tek kaynak: automation/sources.json.',
    ' *',
    ' * Hakkımızda sayfasındaki liste bu diziden çiziliyor. Sayı elle',
    ' * yazılsaydı yeni kaynak eklendiği gün eskir ve güven sayfası',
    ' * sessizce yanlış konuşmaya başlardı.',
    ' */',
    'export interface KaynakSistemi {',
    '  /** Sistemin kendi yazdığı ad. */',
    '  ad: string;',
    '  /** O sistemden okunan şirket kaynağı sayısı. */',
    '  adet: number;',
    '}',
    '',
    `/** Takip edilen toplam şirket kaynağı. */`,
    `export const KAYNAK_TOPLAM = ${toplam};`,
    '',
    'export const KAYNAK_SISTEMLERI: readonly KaynakSistemi[] = [',
    ...ozet.map((x) => `  { ad: '${x.ad.replace(/'/g, "\\'")}', adet: ${x.adet} },`),
    '];',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(KOK, 'src/data/kaynak-sistemleri.ts'), govde, 'utf8');
  console.error(`kaynak özeti yazıldı: ${ozet.length} sistem, ${toplam} kaynak`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--yaz')) yaz();
  else {
    const ham = JSON.parse(fs.readFileSync(path.join(KOK, 'automation/sources.json'), 'utf8'));
    console.log(JSON.stringify(kaynakOzeti(Array.isArray(ham) ? ham : Object.values(ham)[0]), null, 2));
  }
}
