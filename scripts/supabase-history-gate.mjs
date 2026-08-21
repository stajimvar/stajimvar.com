import fs from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

function valueFromCell(cell) {
  const match = cell.match(/`([^`]*)`/);
  return match ? match[1].trim() : '';
}

export function parseMigrationList(output) {
  const remoteOnly = [];
  const localOnly = [];
  const divergent = [];

  for (const line of output.split(/\r?\n/)) {
    if (!line.includes('|') || !line.includes('`')) continue;

    const cells = line.split('|').map(valueFromCell);
    if (cells.length < 2) continue;

    const [local, remote] = cells;
    if (local && !remote) localOnly.push(local);
    if (remote && !local) remoteOnly.push(remote);
    if (local && remote && local !== remote) divergent.push({ local, remote });
  }

  return {
    remoteOnly: [...new Set(remoteOnly)].sort(),
    localOnly: [...new Set(localOnly)].sort(),
    divergent,
  };
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node scripts/supabase-history-gate.mjs <migration-list-output>');
    process.exitCode = 2;
    return;
  }

  const report = parseMigrationList(fs.readFileSync(inputPath, 'utf8'));
  console.log(JSON.stringify(report, null, 2));

  if (report.remoteOnly.length || report.localOnly.length || report.divergent.length) {
    console.error('::error::Supabase migration history divergence detected. db push is blocked; reconcile verified migration files before retrying.');
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
