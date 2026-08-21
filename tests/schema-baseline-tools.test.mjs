import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeSchemaDump } from '../scripts/normalize-schema-dump.mjs';
import { compareSchemaObjects } from '../scripts/schema-semantic-diff.mjs';

test('normalizes dump noise and rejects public row data or secrets', () => {
  const result = normalizeSchemaDump(`-- PostgreSQL database dump\nSET statement_timeout = 0;\nCREATE TABLE public.example (id uuid);\nALTER TABLE public.example OWNER TO postgres;\nGRANT ALL ON TABLE public.example TO anon;\n`);
  assert.match(result.normalized, /CREATE TABLE public\.example/);
  assert.doesNotMatch(result.normalized, /OWNER TO|GRANT ALL|statement_timeout/);
  assert.throws(() => normalizeSchemaDump('COPY public.example (id) FROM stdin;\n'), /row data/i);
  assert.throws(() => normalizeSchemaDump("CREATE FUNCTION public.f() RETURNS text AS $$ select 'sb_secret_abc' $$ LANGUAGE sql;"), /secret-like/i);
});

test('groups schema differences by semantic object class', () => {
  const production = `CREATE TABLE public.a (id uuid);\nCREATE POLICY p ON public.a FOR SELECT USING (true);\nCREATE FUNCTION public.f() RETURNS void LANGUAGE sql AS $$ SELECT $$;`;
  const local = `CREATE TABLE public.a (id uuid);\nCREATE TABLE public.b (id uuid);\nCREATE FUNCTION public.f() RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;`;
  const diff = compareSchemaObjects(production, local);
  assert.deepEqual(diff.localOnly.tables, ['public.b']);
  assert.deepEqual(diff.productionOnly.policies, ['public.a.p']);
  assert.deepEqual(diff.changed.functions, ['public.f']);
});

test('extracts quoted pg_dump public objects after the dump preamble', async () => {
  const dump = `SET statement_timeout = 0;\nCREATE TYPE "public"."kind" AS ENUM ('a');\nCREATE OR REPLACE FUNCTION "public"."f"() RETURNS boolean\n LANGUAGE sql AS $$ SELECT true; $$;\nCREATE TABLE IF NOT EXISTS "public"."a" (id uuid);\nALTER TABLE ONLY "public"."a"\n ADD CONSTRAINT "a_pkey" PRIMARY KEY (id);\nCREATE POLICY "read_a" ON "public"."a" FOR SELECT USING (true);`;
  const objects = (await import('../scripts/schema-semantic-diff.mjs')).extractSchemaObjects(dump);
  assert.equal(objects.tables.size, 1);
  assert.equal(objects.types.size, 1);
  assert.equal(objects.functions.size, 1);
  assert.equal(objects.constraints.size, 1);
  assert.equal(objects.policies.size, 1);
});

test('runs both schema tools when invoked as CLI programs', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-tool-test-'));
  const source = path.join(directory, 'source.sql');
  const normalized = path.join(directory, 'normalized.sql');
  const report = path.join(directory, 'report.json');
  fs.writeFileSync(source, 'CREATE TABLE public.a (id uuid);\n');
  execFileSync(process.execPath, ['scripts/normalize-schema-dump.mjs', source, normalized]);
  execFileSync(process.execPath, ['scripts/schema-semantic-diff.mjs', normalized, normalized, report]);
  assert.match(fs.readFileSync(normalized, 'utf8'), /CREATE TABLE public\.a/);
  assert.equal(JSON.parse(fs.readFileSync(report, 'utf8')).changed.tables.length, 0);
});
