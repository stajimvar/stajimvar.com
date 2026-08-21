import crypto from 'node:crypto';
import fs from 'node:fs';
import process from 'node:process';

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

  return {
    normalized: `${normalized}\n`,
    sha256: crypto.createHash('sha256').update(`${normalized}\n`).digest('hex'),
  };
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

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) main();
