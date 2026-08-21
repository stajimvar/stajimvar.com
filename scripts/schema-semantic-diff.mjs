import fs from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const classes = ['tables', 'types', 'constraints', 'indexes', 'policies', 'functions', 'triggers', 'rls'];

function cleanIdentifier(value) {
  return value.replaceAll('"', '').replace(/\s+/g, '');
}

function add(map, category, name, statement) {
  if (name) map[category].set(cleanIdentifier(name), statement.replace(/\s+/g, ' ').trim());
}

function publicObjectName(match, firstIndex) {
  return `public.${match[firstIndex] || match[firstIndex + 1]}`;
}

export function extractSchemaObjects(sql) {
  const map = Object.fromEntries(classes.map((category) => [category, new Map()]));
  const object = '(?:"public"\\."([^"]+)"|public\\.([A-Za-z_][A-Za-z0-9_]*))';
  const objectMatches = (pattern, callback) => {
    for (const match of sql.matchAll(pattern)) callback(match);
  };

  objectMatches(new RegExp(`^CREATE TABLE(?: IF NOT EXISTS)?\\s+${object}[\\s\\S]*?\\);`, 'gmi'), (match) => add(map, 'tables', publicObjectName(match, 1), match[0]));
  objectMatches(new RegExp(`^CREATE TYPE\\s+${object}\\s+AS ENUM[\\s\\S]*?\\);`, 'gmi'), (match) => add(map, 'types', publicObjectName(match, 1), match[0]));
  objectMatches(new RegExp(`^CREATE(?: OR REPLACE)? FUNCTION\\s+${object}\\s*\\([\\s\\S]*?\\$\\$;`, 'gmi'), (match) => add(map, 'functions', publicObjectName(match, 1), match[0]));
  objectMatches(new RegExp(`^ALTER TABLE(?: ONLY)?\\s+${object}[\\s\\S]*?ADD CONSTRAINT\\s+"?([^"\\s]+)"?[\\s\\S]*?;\\s*$`, 'gmi'), (match) => add(map, 'constraints', `${publicObjectName(match, 1)}.${match[3]}`, match[0]));
  objectMatches(new RegExp(`^CREATE(?: UNIQUE)? INDEX\\s+"?([^"\\s]+)"?[\\s\\S]*?;\\s*$`, 'gmi'), (match) => add(map, 'indexes', match[1], match[0]));
  objectMatches(new RegExp(`^CREATE POLICY\\s+"?([^"\\s]+)"?\\s+ON\\s+${object}[\\s\\S]*?;\\s*$`, 'gmi'), (match) => add(map, 'policies', `${publicObjectName(match, 2)}.${match[1]}`, match[0]));
  objectMatches(new RegExp(`^CREATE TRIGGER\\s+"?([^"\\s]+)"?[\\s\\S]*?\\sON\\s+${object}[\\s\\S]*?;\\s*$`, 'gmi'), (match) => add(map, 'triggers', `${publicObjectName(match, 2)}.${match[1]}`, match[0]));
  objectMatches(new RegExp(`^ALTER TABLE(?: ONLY)?\\s+${object}\\s+ENABLE ROW LEVEL SECURITY\\s*;`, 'gmi'), (match) => add(map, 'rls', publicObjectName(match, 1), match[0]));

  return map;
}

export function compareSchemaObjects(productionSql, localSql) {
  const production = extractSchemaObjects(productionSql);
  const local = extractSchemaObjects(localSql);
  const result = {
    productionOnly: Object.fromEntries(classes.map((category) => [category, []])),
    localOnly: Object.fromEntries(classes.map((category) => [category, []])),
    changed: Object.fromEntries(classes.map((category) => [category, []])),
  };

  for (const category of classes) {
    for (const [name, definition] of production[category]) {
      if (!local[category].has(name)) result.productionOnly[category].push(name);
      else if (local[category].get(name) !== definition) result.changed[category].push(name);
    }
    for (const name of local[category].keys()) {
      if (!production[category].has(name)) result.localOnly[category].push(name);
    }
    for (const group of [result.productionOnly, result.localOnly, result.changed]) group[category].sort();
  }
  return result;
}

function main() {
  const [productionPath, localPath, reportPath] = process.argv.slice(2);
  if (!productionPath || !localPath || !reportPath) {
    console.error('Usage: node scripts/schema-semantic-diff.mjs <production.sql> <local.sql> <report.json>');
    process.exitCode = 2;
    return;
  }
  const report = compareSchemaObjects(fs.readFileSync(productionPath, 'utf8'), fs.readFileSync(localPath, 'utf8'));
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  const differenceCount = Object.values(report).flatMap(Object.values).reduce((sum, entries) => sum + entries.length, 0);
  console.log(JSON.stringify({ differenceCount }));
  if (differenceCount) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
