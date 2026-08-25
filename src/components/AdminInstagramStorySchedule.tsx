import React from 'react';
import {
  countdownText,
  getBlockStatus,
  getNextBlock,
  storyStorageKey,
} from '../lib/instagram-story-schedule.mjs';

type Sticker = {
  type: 'poll' | 'question' | 'link' | 'countdown' | 'quiz' | 'none';
  displayLabel: string;
  label?: string;
  prompt?: string;
  options?: string[];
  correctOption?: number;
  endsAt?: string;
  note?: string;
};

type Source = {
  name: string;
  url: string;
  checkedAt: string;
  verifiedFacts: string;
};

type StoryFrame = {
  id: string;
  sequence: number;
  plannedAt: string;
  text: { eyebrow: string; headline: string; body: string; footer: string };
  media: string;
  sticker: Sticker;
  cta: string;
  targetUrl: string;
  utmUrl: string | null;
  trackingNote?: string;
  source: Source;
  publicPath: string;
  altText: string;
  manualTask: string;
};

type StoryBlock = {
  id: string;
  sequence: number;
  series: string;
  startsAt: string;
  endsAt: string;
  recommendedWindow: string;
  goal: string;
  targetAudience: string;
  status: 'draft';
  manualOnly: true;
  manualChecklist: string[];
  frames: StoryFrame[];
};

type StorySchedule = {
  title: string;
  timezone: string;
  sourceCheckedAt: string;
  coverage: { from: string; to: string; note: string };
  blocks: StoryBlock[];
};

const trDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul', dateStyle: 'long', timeStyle: 'short',
  }).format(new Date(value));

const statusMeta = {
  draft: { label: 'Taslak', className: 'border-gray-200 bg-gray-100 text-gray-700' },
  due_soon: { label: '15 dk içinde', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  due: { label: 'Paylaşım zamanı', className: 'border-blue-200 bg-blue-50 text-blue-800' },
  expired: { label: 'Süresi geçti', className: 'border-red-200 bg-red-50 text-red-700' },
  published: { label: 'Paylaşıldı (yerel)', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
} as const;

function stickerDetail(sticker: Sticker) {
  if (sticker.type === 'none') return sticker.note ?? 'Etiket gerekmiyor.';
  if (sticker.type === 'link') return `Bağlantı etiketi: ${sticker.label ?? 'etiket metni girilmeli'}`;
  if (sticker.type === 'countdown') return `Geri sayım: ${sticker.label ?? 'etiket adı'} · ${sticker.endsAt ? trDateTime(sticker.endsAt) : 'zaman girilmeli'}`;
  if (sticker.type === 'poll') return `Anket: ${sticker.prompt ?? ''}${sticker.options?.length ? ` · ${sticker.options.join(' / ')}` : ''}`;
  if (sticker.type === 'question') return `Soru kutusu: ${sticker.prompt ?? ''}`;
  if (sticker.type === 'quiz') {
    const correct = sticker.correctOption === undefined ? '' : ` · doğru: ${sticker.options?.[sticker.correctOption] ?? '—'}`;
    return `Test: ${sticker.prompt ?? ''}${sticker.options?.length ? ` · ${sticker.options.join(' / ')}` : ''}${correct}`;
  }
  return '';
}

export const AdminInstagramStorySchedule: React.FC = () => {
  const [schedule, setSchedule] = React.useState<StorySchedule | null>(null);
  const [error, setError] = React.useState('');
  const [now, setNow] = React.useState(() => new Date());
  const [publishedIds, setPublishedIds] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/paylasim/hikaye-takvim-2026-08-26.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Takvim okunamadı (HTTP ${response.status}).`);
        const loaded = (await response.json()) as StorySchedule;
        setSchedule(loaded);
        const saved = new Set(loaded.blocks.filter((block) => window.localStorage.getItem(storyStorageKey(block.id)) === 'published').map((block) => block.id));
        setPublishedIds(saved);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Story takvimi okunamadı.');
      }
    })();
  }, []);

  const togglePublished = (blockId: string) => {
    setPublishedIds((before) => {
      const after = new Set(before);
      if (after.has(blockId)) {
        after.delete(blockId);
        window.localStorage.removeItem(storyStorageKey(blockId));
      } else {
        after.add(blockId);
        window.localStorage.setItem(storyStorageKey(blockId), 'published');
      }
      return after;
    });
  };

  const downloadBlock = (block: StoryBlock) => {
    for (const frame of block.frames) {
      const anchor = document.createElement('a');
      anchor.href = frame.publicPath;
      anchor.download = frame.publicPath.split('/').at(-1) ?? `${frame.id}.png`;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
  };

  const next = schedule ? getNextBlock(schedule.blocks, now, publishedIds) : undefined;

  return (
    <section aria-labelledby="story-takvimi" className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="story-takvimi" className="text-lg font-extrabold text-gray-950">Story takvimi</h2>
          <p className="mt-1 text-sm text-gray-600">
            Görseller ve etiket talimatları hazırdır. Bu bölüm Instagram'a gönderi yapmaz; paylaşım tamamen Instagram uygulamasında elle yapılır.
          </p>
        </div>
        <div className="rounded-xl bg-blue-50 px-3 py-2 text-right text-xs text-blue-900">
          <p className="font-bold">Şu an · Türkiye saati</p>
          <p aria-live="polite">{trDateTime(now)}</p>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {schedule && (
        <>
          <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-800">Sıradaki Story</p>
              <p className="mt-1 font-extrabold text-gray-950">{next ? `${next.series} · ${trDateTime(next.startsAt)}` : 'Planlanan Story kalmadı'}</p>
              {next && <p className="mt-1 text-sm text-gray-700">{countdownText(next.startsAt, now)}</p>}
            </div>
            <div className="text-sm text-gray-700">
              <p><span className="font-bold">Kaynak son kontrolü:</span> {trDateTime(schedule.sourceCheckedAt)}</p>
              <p className="mt-1"><span className="font-bold">Durum kaydı:</span> “Paylaşıldı” işareti bu tarayıcıda saklanır; Meta'ya gönderilmez.</p>
            </div>
          </div>

          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{schedule.coverage.note}</p>

          <div className="space-y-4">
            {schedule.blocks.map((block) => {
              const published = publishedIds.has(block.id);
              const status = getBlockStatus(block, now, published);
              const meta = statusMeta[status];
              const isNext = next?.id === block.id;
              return (
                <article key={block.id} className={`rounded-2xl border p-4 ${isNext ? 'border-2 border-blue-500 bg-blue-50/30' : 'border-gray-200 bg-white'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-gray-950">{block.sequence}. blok · {block.series}</h3>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span>
                        {isNext && <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">Sıradaki</span>}
                      </div>
                      <p className="mt-2 text-sm text-gray-700"><strong>Zaman:</strong> {trDateTime(block.startsAt)} · {block.recommendedWindow}</p>
                      <p className="mt-1 text-sm text-gray-700"><strong>Hedef:</strong> {block.goal}</p>
                      <p className="mt-1 text-sm text-gray-700"><strong>Hedef kitle:</strong> {block.targetAudience}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => downloadBlock(block)} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700">
                        {block.frames.length} PNG'yi indir
                      </button>
                      <button type="button" onClick={() => togglePublished(block.id)} className={`rounded-xl px-3 py-2 text-xs font-bold ${published ? 'bg-gray-200 text-gray-800' : 'bg-emerald-600 text-white'}`}>
                        {published ? 'Paylaşıldı işaretini kaldır' : 'Paylaşıldı olarak işaretle'}
                      </button>
                    </div>
                  </div>

                  <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {block.manualChecklist.map((item) => <li key={item}>{item}</li>)}
                  </ul>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {block.frames.map((frame) => (
                      <div key={frame.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                        <img src={frame.publicPath} alt={frame.altText} className="aspect-[9/16] w-full object-cover" loading="lazy" />
                        <div className="space-y-2 p-3 text-xs text-gray-700">
                          <p className="font-bold text-gray-950">{frame.sequence}. kare · {trDateTime(frame.plannedAt)}</p>
                          <p><strong>Etiket:</strong> {stickerDetail(frame.sticker)}</p>
                          <p><strong>CTA:</strong> {frame.cta}</p>
                          <p><strong>Bağlantı:</strong> <a className="break-all text-blue-700 underline" href={frame.targetUrl} target="_blank" rel="noreferrer">{frame.targetUrl}</a></p>
                          {frame.utmUrl ? <p><strong>UTM:</strong> <a className="break-all text-blue-700 underline" href={frame.utmUrl} target="_blank" rel="noreferrer">{frame.utmUrl}</a></p> : <p><strong>UTM:</strong> {frame.trackingNote}</p>}
                          <p><strong>Kaynak:</strong> <a className="text-blue-700 underline" href={frame.source.url} target="_blank" rel="noreferrer">{frame.source.name}</a></p>
                          <p><strong>Son kontrol:</strong> {trDateTime(frame.source.checkedAt)}</p>
                          <p><strong>Manuel işlem:</strong> {frame.manualTask}</p>
                          <a className="inline-flex rounded-lg border border-blue-200 px-2 py-1 font-bold text-blue-700" href={frame.publicPath} download>PNG'yi indir</a>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};
