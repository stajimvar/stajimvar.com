/**
 * Instagram Story takviminin saf istemci mantığı.
 *
 * Bu modül bilinçli olarak Instagram API'si, erişim jetonu veya ağ çağrısı
 * içermez. "Paylaşıldı" işareti yalnızca yöneticinin bu tarayıcısındaki
 * localStorage'a yazılır; Meta'da paylaşım yapmaz ve sunucu durumunu değiştirmez.
 */

export const STORY_DUE_SOON_MS = 15 * 60 * 1000;

export function storyStorageKey(blockId) {
  return `stajimvar:instagram-story:${blockId}`;
}

export function getBlockStatus(block, now = new Date(), isPublished = false) {
  if (isPublished) return 'published';
  const nowMs = new Date(now).getTime();
  const startsAt = new Date(block.startsAt).getTime();
  const endsAt = new Date(block.endsAt).getTime();

  if (nowMs > endsAt) return 'expired';
  if (nowMs >= startsAt) return 'due';
  if (startsAt - nowMs <= STORY_DUE_SOON_MS) return 'due_soon';
  return 'draft';
}

export function getNextBlock(blocks, now = new Date(), publishedIds = new Set()) {
  return [...blocks]
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .find((block) => !publishedIds.has(block.id) && getBlockStatus(block, now) !== 'expired');
}

export function countdownText(target, now = new Date()) {
  const remaining = new Date(target).getTime() - new Date(now).getTime();
  if (remaining <= 0) return 'Paylaşım zamanı geldi';
  const totalMinutes = Math.ceil(remaining / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} sa ${minutes} dk kaldı` : `${minutes} dk kaldı`;
}
