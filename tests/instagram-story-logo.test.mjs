import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const firstStory = path.join(
  root,
  'content',
  'instagram',
  'stories',
  '2026-08-25_2026-08-26',
  'story-block-01',
  '2026-08-26-0945-story-gunun-pusulasi-frame-01.png'
);

test('Story masthead renders the real StajımVar logo instead of a flat blue placeholder', async () => {
  assert.ok(fs.existsSync(path.join(root, 'assets', 'logo-kaynak.png')), 'canonical logo asset must exist');
  const { data: raw, info } = await sharp(firstStory)
    .extract({ left: 64, top: 64, width: 54, height: 54 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let lightPixelCount = 0;
  for (let index = 0; index < raw.length; index += info.channels) {
    if (raw[index] > 210 && raw[index + 1] > 210 && raw[index + 2] > 210) lightPixelCount += 1;
  }

  assert.ok(lightPixelCount > 100, `logo crop has only ${lightPixelCount} light pixels; it still looks like a flat placeholder`);
});
