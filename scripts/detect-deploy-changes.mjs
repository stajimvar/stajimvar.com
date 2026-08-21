import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const SUPABASE_PATHS = ['supabase/migrations/', 'supabase/functions/', 'supabase/config.toml', '.github/workflows/supabase-production.yml'];

export function classifyChangedPaths(paths) {
  const changedPaths = Array.isArray(paths) ? paths.filter((path) => typeof path === 'string') : [];
  return {
    supabaseChanged: changedPaths.some((path) => SUPABASE_PATHS.some((prefix) => path === prefix || path.startsWith(prefix))),
    appChanged: changedPaths.some((path) => !path.startsWith('supabase/')),
  };
}

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value) && !/^0{40}$/i.test(value);
}

function gitOutput(args) {
  return execFileSync('git', args, { encoding: 'buffer', stdio: ['ignore', 'pipe', 'ignore'] });
}

function commitExists(sha) {
  try {
    execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function changedPathsFromGit(before, head) {
  if (!isSha(head) || !commitExists(head)) throw new Error('GitHub SHA doğrulanamadı; güvenli değişiklik sınıflandırması yapılamadı.');
  const base = isSha(before) && commitExists(before) ? before : null;
  const output = base ? gitOutput(['diff', '--name-only', '-z', base, head]) : gitOutput(['ls-tree', '-r', '--name-only', '-z', head]);
  return output.toString('utf8').split('\0').filter(Boolean);
}

function writeOutputs(result) {
  const lines = `supabase_changed=${result.supabaseChanged}\napp_changed=${result.appChanged}\n`;
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, lines, 'utf8');
  else process.stdout.write(lines);
}

if (import.meta.url === `file:///${process.argv[1]?.replaceAll('\\', '/')}`) {
  writeOutputs(classifyChangedPaths(changedPathsFromGit(process.env.GITHUB_EVENT_BEFORE, process.env.GITHUB_SHA)));
}
