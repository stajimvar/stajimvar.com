import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schedulePath = path.join(root, 'content', 'instagram', 'stories', '2026-08-25_2026-08-26', 'schedule', 'story-schedule.json');

test('Story plan positions StajımVar through its concrete student benefits and vision', () => {
  const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
  const series = schedule.blocks.map((block) => block.series);
  const allText = schedule.blocks.flatMap((block) => block.frames)
    .map((frame) => `${frame.text.eyebrow} ${frame.text.headline} ${frame.text.body} ${frame.text.footer}`)
    .join('\n');

  assert.deepEqual(series, [
    'Neden StajımVar?',
    'Resmî kaynağa doğrudan git',
    'Fırsatı kaydet, süreci takip et',
    'StajımVar’ın vizyonu',
  ]);
  assert.match(allText, /aracı başvuru sayfası değil/i);
  assert.match(allText, /resmî kaynak/i);
  assert.match(allText, /fırsatı kaydet/i);
  assert.match(allText, /öğrenci/i);
  assert.equal(schedule.blocks.every((block) => block.manualOnly === true), true);
});
