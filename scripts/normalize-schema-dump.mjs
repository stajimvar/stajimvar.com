import crypto from 'node:crypto';
import fs from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const rowDataPatterns = [
  /^COPY\s+public\./im,
  /^INSERT\s+INTO\s+public\./im,
];
const secretPatterns = [
  /\bsb_secret_[A-Za-z0-9_-]+/i,
  /\bservice_role\s*=\s*['"][^'"]+/i,
  /postgres(?:ql)?:\/\/[^\s'"`]+:[^\s'"`]+@/i,
];

export function normalizeSchemaDump(source) {
  if (rowDataPatterns.some((pattern) => pattern.test(source))) {
    throw new Error('Schema dump contains public row data.');
  }
  if (secretPatterns.some((pattern) => pattern.test(source))) {
    throw new Error('Schema dump contains secret-like material.');
  }

  const normalized = source
    .replace(/^--.*$/gm, '')
    .replace(/^SET\s+.*;\s*$/gmi, '')
    .replace(/^SELECT pg_catalog\.set_config\(.*;\s*$/gmi, '')
    .replace(/^\\connect\s+.*$/gmi, '')
    .replace(/^ALTER\s+(?:TABLE|SEQUENCE|FUNCTION|SCHEMA)\s+.*\s+OWNER\s+TO\s+.*;\s*$/gmi, '')
    .replace(/^(?:GRANT|REVOKE)\s+.*;\s*$/gmi, '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  const siralanmis = kolonlariSirala(normalized);

  return {
    normalized: `${siralanmis}\n`,
    sha256: crypto.createHash('sha256').update(`${siralanmis}\n`).digest('hex'),
  };
}

/*
  CREATE TABLE İÇİNDEKİ KOLONLARI SIRALA

  PostgreSQL'de kolonun fiziksel sırası anlam taşımıyor: sorgular ada
  göre çalışıyor, kısıtlar ve politikalar etkilenmiyor. Ama sıra, hangi
  migration'ın ne zaman uygulandığına göre değişiyor.

  ÖLÇÜLDÜ: `source_title` üretime bugün eklendiği için tablonun SONUNA
  düştü; depodan sıfırdan kurulan şemada ise migration'ın versiyon
  numarası mevcut zaman çizgisinden eski olduğu için ORTAYA girdi. İki
  şema mantıken aynıydı, denetim yine de kırmızı yandı.

  Bu, kapıyı zayıflatmıyor: eksik ya da fazla kolon, tip değişikliği ve
  kısıt farkı hâlâ yakalanıyor — yalnızca fiziksel sıra gürültüsü
  eleniyor.
*/
function kolonlariSirala(sql) {
  return sql.replace(
    /(CREATE TABLE [^(]+\()([\s\S]*?)(\n\);)/g,
    (tam, bas, govde, son) => {
      const satirlar = govde.split('\n').filter((s) => s.trim());
      // Kısıtlar sırayı korur: CHECK/PRIMARY KEY sonda kalıyor.
      const kisitBaslangici = satirlar.findIndex((s) =>
        /^\s*(CONSTRAINT|PRIMARY KEY|UNIQUE|CHECK|FOREIGN KEY)\b/i.test(s)
      );
      const bolme = kisitBaslangici === -1 ? satirlar.length : kisitBaslangici;
      const kolonlar = satirlar.slice(0, bolme);
      const kisitlar = satirlar.slice(bolme);
      if (kolonlar.length < 2) return tam;

      // Son kolonun virgülü kısıt varlığına göre değişiyor: virgül
      // ayrılıp sıralanıyor, sonra yeniden yazılıyor.
      const govdeler = kolonlar.map((s) => s.trim().replace(/,$/, ''));
      govdeler.sort((a, b) => a.localeCompare(b, 'en'));
      const yeniden = govdeler.map(
        (s, i) => ` ${s}${i < govdeler.length - 1 || kisitlar.length ? ',' : ''}`
      );
      return bas + [...yeniden, ...kisitlar].join('\n') + son;
    }
  );
}

function main() {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    console.error('Usage: node scripts/normalize-schema-dump.mjs <input.sql> <output.sql>');
    process.exitCode = 2;
    return;
  }
  const result = normalizeSchemaDump(fs.readFileSync(inputPath, 'utf8'));
  fs.writeFileSync(outputPath, result.normalized);
  console.log(JSON.stringify({ sha256: result.sha256, bytes: Buffer.byteLength(result.normalized) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
