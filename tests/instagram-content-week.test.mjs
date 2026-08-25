import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import ffmpegStatic from 'ffmpeg-static';

const root = path.resolve(import.meta.dirname, '..');
const packageRoot = path.join(root, 'content', 'instagram', '2026-08-26');
const dataPath = path.join(packageRoot, '01-calendar', 'week-content-data.json');
const importPath = path.join(packageRoot, '07-handoff', 'panel-draft-import.json');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

test('2026-08-26 Instagram content week has the requested complete editorial structure', () => {
  assert.ok(fs.existsSync(dataPath), 'week content data must exist');
  const data = readJson(dataPath);

  assert.equal(data.weekStart, '2026-08-26');
  assert.equal(data.weekEnd, '2026-09-01');
  assert.equal(data.days.length, 7);
  assert.equal(data.feed.length, 4);
  assert.equal(data.feed.filter((item) => item.format === 'carousel').length, 2);
  assert.equal(data.feed.filter((item) => item.format === 'reel').length, 2);
  assert.ok(data.days.reduce((sum, day) => sum + day.stories.length, 0) >= 24);

  for (const carousel of data.feed.filter((item) => item.format === 'carousel')) {
    assert.ok(carousel.slides.length >= 5 && carousel.slides.length <= 7, `${carousel.contentId} must have 5-7 slides`);
    assert.ok(carousel.caption.length > 0, `${carousel.contentId} needs a caption`);
    assert.ok(carousel.altTexts.length === carousel.slides.length, `${carousel.contentId} needs alt text per slide`);
  }

  for (const item of data.feed) {
    assert.match(item.utmUrl, /utm_source=instagram/);
    assert.match(item.utmUrl, /utm_medium=organic_social/);
    assert.match(item.utmUrl, /utm_campaign=ig_2026w35/);
    assert.ok(item.hashtags.length >= 3 && item.hashtags.length <= 5, `${item.contentId} needs 3-5 specific hashtags`);
  }

  assert.equal(data.emergencyTemplate.status, 'template');
  assert.equal(data.publicCollaborationAccounts.length, 3, 'three publicly verifiable collaboration accounts are required');
  assert.ok(data.publicCollaborationAccounts.every((account) => account.instagramHandle.startsWith('@')));
});

test('generated visual assets are mobile-sized and the two carousels are importable as unpublished panel drafts', async () => {
  assert.ok(fs.existsSync(importPath), 'panel import manifest must exist');
  const drafts = readJson(importPath);
  assert.equal(drafts.drafts.length, 2);
  assert.ok(drafts.drafts.every((draft) => draft.status === 'draft'));
  const panelManifest = readJson(path.join(root, 'public', 'paylasim', 'setler.json'));
  for (const draft of drafts.drafts) {
    const panelSet = panelManifest.find((entry) => entry.kod === draft.panelDraftCode);
    assert.ok(panelSet, `${draft.panelDraftCode} must be visible to the existing admin panel`);
    assert.deepEqual(panelSet.kartlar, draft.cards);
  }

  for (const draft of drafts.drafts) {
    assert.ok(draft.cards.length >= 5 && draft.cards.length <= 7);
    for (const card of draft.cards) {
      const fullPath = path.join(root, 'public', card.replace(/^\//, ''));
      assert.ok(fs.existsSync(fullPath), `missing panel card ${card}`);
      const metadata = await sharp(fullPath).metadata();
      assert.equal(metadata.width, 1080);
      assert.equal(metadata.height, 1350);
    }
  }

  const data = readJson(dataPath);
  for (const day of data.days) {
    for (const story of day.stories) {
      const fullPath = path.join(packageRoot, story.assetPath);
      assert.ok(fs.existsSync(fullPath), `missing story ${story.assetPath}`);
      const metadata = await sharp(fullPath).metadata();
      assert.equal(metadata.width, 1080);
      assert.equal(metadata.height, 1920);
    }
  }

  for (const reel of data.feed.filter((item) => item.format === 'reel')) {
    const fullPath = path.join(packageRoot, reel.videoPath);
    assert.ok(fs.existsSync(fullPath), `missing reel ${reel.videoPath}`);
    assert.ok(fs.statSync(fullPath).size > 50_000, `reel ${reel.contentId} is unexpectedly small`);
    assert.ok(fs.existsSync(path.join(packageRoot, reel.srtPath)), `missing subtitles for ${reel.contentId}`);
    assert.ok(!fs.existsSync(path.join(packageRoot, reel.frameFolder, 'concat.txt')), `temporary concat file must not be handed off for ${reel.contentId}`);
    const probe = spawnSync(ffmpegStatic, ['-hide_banner', '-i', fullPath], { encoding: 'utf8' });
    const report = probe.stderr;
    assert.match(report, /1080x1920/, reel.contentId + ' must be a 9:16 video');
    const duration = report.match(/Duration:\s+(\d\d):(\d\d):(\d\d(?:\.\d+)?)/);
    assert.ok(duration, reel.contentId + ' must expose a duration');
    const seconds = Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]);
    assert.ok(seconds >= 15 && seconds <= 30, reel.contentId + ' must be 15-30 seconds');
  }

  for (const name of ['qa-carousel-sheet.jpg', 'qa-story-sheet.jpg', 'qa-reel-sheet.jpg']) {
    const sheet = path.join(packageRoot, '07-handoff', name);
    assert.ok(fs.existsSync(sheet), `missing visual QA contact sheet ${name}`);
    const metadata = await sharp(sheet).metadata();
    assert.ok(metadata.width >= 900 && metadata.height >= 600, `${name} is too small to inspect`);
  }
});
