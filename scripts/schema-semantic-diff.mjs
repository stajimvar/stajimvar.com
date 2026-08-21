import fs from 'node:fs';
import process from 'node:process';

const classes = ['tables', 'types', 'constraints', 'indexes', 'policies', 'functions', 'triggers', 'rls'];

function cleanIdentifier(value) {
  return value.replaceAll('"', '').replace(/\s+/g, '');
}

function add(map, category, name, statement) {
  if (name) map[category].set(cleanIdentifier(name), statement.replace(/\s+/g, ' ').trim());
}

export function extractSchemaObjects(sql) {
  const map = Object.fromEntries(classes.map((category) => [category, new Map()]));
  const statements = sql.split(/;\s*(?=(?:CREATE|ALTER)\s)/i);

  for (const statement of statements) {
    const table = statement.match(/^CREATE TABLE(?: IF NOT EXISTS)?\s+(public\.[\w"]+)/im);
    if (table) add(map, 'tables', table[1], statement);

    const type = statement.match(/^CREATE TYPE\s+(public\.[\w"]+)/im);
    if (type) add(map, 'types', type[1], statement);

    const constraint = statement.match(/^ALTER TABLE(?: ONLY)?\s+(public\.[\w"]+).*?ADD CONSTRAINT\s+([\w"]+)/ims);
    if (constraint) add(map, 'constraints', `${constraint[1]}.${constraint[2]}`, statement);

    const index = statement.match(/^CREATE(?: UNIQUE)? INDEX\s+([\w"]+)/im);
    if (index) add(map, 'indexes', index[1], statement);

    const policy = statement.match(/^CREATE POLICY\s+([\w"]+)\s+ON\s+(public\.[\w"]+)/im);
    if (policy) add(map, 'policies', `${policy[2]}.${policy[1]}`, statement);

    const fn = statement.match(/^CREATE(?: OR REPLACE)? FUNCTION\s+(public\.[\w"]+)\s*\(/im);
    if (fn) add(map, 'functions', fn[1], statement);

    const trigger = statement.match(/^CREATE TRIGGER\s+([\w"]+)\s+.*?\sON\s+(public\.[\w"]+)/ims);
    if (trigger) add(map, 'triggers', `${trigger[2]}.${trigger[1]}`, statement);

    const rls = statement.match(/^ALTER TABLE(?: ONLY)?\s+(public\.[\w"]+)\s+ENABLE ROW LEVEL SECURITY/im);
    if (rls) add(map, 'rls', rls[1], statement);
  }
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

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) main();
