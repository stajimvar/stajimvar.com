import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import {
  getBlockStatus,
  getNextBlock,
  storyStorageKey,
} from '../src/lib/instagram-story-schedule.mjs';

const root = path.resolve(import.meta.dirname, '..');
const packageRoot = path.join(root, 'content', 'instagram', 'stories', '2026-08-25_2026-08-26');
const schedulePath = path.join(packageRoot, 'schedule', 'story-schedule.json');

test('Story block status is local, deterministic, and never requires an Instagram API request', () => {
  const block = {
    id: 'ig-story-20260826-0945-pulse',
    startsAt: '2026-08-26T09:45:00+03:00',
    endsAt: '2026-08-26T09:54:00+03:00',
  };

  assert.equal(getBlockStatus(block, new Date('2026-08-26T09:20:00+03:00')), 'draft');
  assert.equal(getBlockStatus(block, new Date('2026-08-26T09:35:00+03:00')), 'due_soon');
  assert.equal(getBlockStatus(block, new Date('2026-08-26T09:46:00+03:00')), 'due');
  assert.equal(getBlockStatus(block, new Date('2026-08-26T10:00:00+03:00')), 'expired');
  assert.equal(getBlockStatus(block, new Date('2026-08-26T09:46:00+03:00'), true), 'published');
  assert.equal(storyStorageKey('ig-story-20260826-0945-pulse'), 'stajimvar:instagram-story:ig-story-20260826-0945-pulse');
});

test('next Story favors the current/due block, then the closest future unpublished block', () => {
  const blocks = [
    { id: 'expired', startsAt: '2026-08-26T09:45:00+03:00', endsAt: '2026-08-26T09:54:00+03:00' },
    { id: 'current', startsAt: '2026-08-26T13:00:00+03:00', endsAt: '2026-08-26T13:09:00+03:00' },
    { id: 'future', startsAt: '2026-08-26T16:45:00+03:00', endsAt: '2026-08-26T16:54:00+03:00' },
  ];
  const now = new Date('2026-08-26T13:04:00+03:00');

  assert.equal(getNextBlock(blocks, now, new Set())?.id, 'current');
  assert.equal(getNextBlock(blocks, now, new Set(['current']))?.id, 'future');
});

test('26 August Story package has four chronological, manual-only blocks and twelve mobile PNGs', async () => {
  assert.ok(fs.existsSync(schedulePath), 'story schedule must exist');
  const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));

  assert.equal(schedule.timezone, 'Europe/Istanbul');
  assert.equal(schedule.blocks.length, 4);
  assert.equal(schedule.blocks.reduce((sum, block) => sum + block.frames.length, 0), 12);
  assert.ok(schedule.blocks.every((block) => block.status === 'draft'));
  assert.ok(schedule.blocks.every((block) => block.manualOnly === true));
  assert.ok(schedule.blocks.every((block) => block.frames.length >= 2 && block.frames.length <= 3));

  /*
    SAAT İSTANBUL'A GÖRE OKUNUYOR

    `start.getHours()` ÇALIŞTIRAN MAKİNENİN saat dilimini kullanıyordu.
    Takvim Europe/Istanbul (`schedule.timezone` bunu söylüyor): geliştirici
    makinesinde 09:45 → 9 çıkıp geçiyor, UTC koşan CI'da 6 çıkıp
    düşüyordu. Test ortama göre farklı sonuç veriyordu; kural değil ortam
    sınanıyordu.
  */
  const istanbulSaati = (tarih) =>
    Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Istanbul',
        hour: '2-digit',
        hour12: false,
      }).format(tarih)
    );

  for (const [index, block] of schedule.blocks.entries()) {
    const start = new Date(block.startsAt);
    const end = new Date(block.endsAt);
    const saat = istanbulSaati(start);
    assert.ok(saat >= 9 && saat <= 21, `${block.id} is outside the permitted start window`);
    assert.ok(end <= new Date('2026-08-26T21:30:00+03:00'), `${block.id} ends too late`);
    if (index > 0) {
      const previous = new Date(schedule.blocks[index - 1].startsAt);
      assert.ok(start - previous >= 3 * 60 * 60 * 1000, `${block.id} must be at least three hours after the prior block`);
    }

    for (const frame of block.frames) {
      assert.match(frame.id, /^ig-story-20260826-/);
      assert.ok(frame.sticker?.type, `${frame.id} needs a sticker instruction`);
      assert.ok(frame.altText, `${frame.id} needs alt text`);
      assert.ok(frame.manualTask, `${frame.id} needs a manual task`);
      assert.ok(frame.source?.url, `${frame.id} needs a source`);
      const localFile = path.join(packageRoot, frame.localPath);
      assert.ok(fs.existsSync(localFile), `missing ${frame.localPath}`);
      const metadata = await sharp(localFile).metadata();
      assert.equal(metadata.format, 'png');
      assert.equal(metadata.width, 1080);
      assert.equal(metadata.height, 1920);
      if (frame.targetUrl?.includes('stajimvar.com')) {
        assert.match(frame.utmUrl, /utm_source=instagram/);
        assert.match(frame.utmUrl, /utm_medium=organic_social/);
        assert.match(frame.utmUrl, /utm_campaign=ig_2026w35_story/);
      }
    }
  }
});

test('Story panel stays outside the Instagram publish endpoint', () => {
  const component = fs.readFileSync(path.join(root, 'src', 'components', 'AdminInstagramStorySchedule.tsx'), 'utf8');
  assert.match(component, /hikaye-takvim-2026-08-26\.json/);
  assert.doesNotMatch(component, /\/api\/instagram\/paylas/);
  assert.doesNotMatch(component, /INSTAGRAM_ACCESS_TOKEN/);
});
