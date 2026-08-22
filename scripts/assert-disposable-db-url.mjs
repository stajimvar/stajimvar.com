import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const PRODUCTION_PROJECT_REF = 'gdumgdgwlfnohkaucfow';
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export function parseDisposableDbUrl(statusEnv) {
  const line = String(statusEnv).split(/\r?\n/).find((value) => value.startsWith('DB_URL='));
  if (!line) throw new Error('Local DB_URL status output is missing.');
  const raw = line.slice('DB_URL='.length).trim().replace(/^("|')|("|')$/g, '');
  if (!raw || raw.includes(PRODUCTION_PROJECT_REF)) throw new Error('Disposable DB URL is not local.');

  let url;
  try { url = new URL(raw); } catch { throw new Error('Disposable DB URL cannot be parsed.'); }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const database = decodeURIComponent(url.pathname).replace(/^\//, '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !LOOPBACK_HOSTS.has(host) || url.port !== '54322' || database !== 'postgres') throw new Error('Disposable DB URL does not target the local Supabase database.');
  return { scheme: url.protocol, host, port: url.port, database };
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const statusEnv = fs.readFileSync(0, 'utf8');
  parseDisposableDbUrl(statusEnv);
  const raw = statusEnv.split(/\r?\n/).find((value) => value.startsWith('DB_URL=')).slice('DB_URL='.length).trim().replace(/^("|')|("|')$/g, '');
  process.stdout.write(raw);
}
