import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const domain = await import("../src/lib/kesfet-domain.mjs");

test("date_only etkinlikte uydurma 00:00 saati gösterilmez", () => {
  const text = domain.formatDiscoverDate({
    startsAt: "2026-08-29T00:00:00+03:00",
    endsAt: "2026-08-29T23:59:59+03:00",
    timePrecision: "date_only",
  });
  assert.match(text, /29 Ağu 2026/);
  assert.doesNotMatch(text, /00:00/);
});

test("bu hafta devam eden uzun etkinlik eski başlangıç yerine bitişini gösterir", () => {
  const text = domain.formatDiscoverDate(
    {
      startsAt: "2026-03-20T00:00:00+03:00",
      endsAt: "2026-09-21T23:59:59+03:00",
      timePrecision: "date_only",
    },
    new Date("2026-08-28T12:00:00+03:00"),
  );
  assert.match(text, /Devam ediyor/);
  assert.match(text, /21 Eyl 2026/);
  assert.doesNotMatch(text, /^20 Mar 2026$/);
});

test("exact etkinlik gerçek başlangıç saatini gösterir", () => {
  const text = domain.formatDiscoverDate({
    startsAt: "2026-08-29T19:30:00+03:00",
    timePrecision: "exact",
  });
  assert.match(text, /19:30/);
});

test("exact zamanlı çok günlük etkinlik başladıysa eski başlangıç yerine bitişini gösterir", () => {
  const text = domain.formatDiscoverDate(
    {
      startsAt: "2026-08-17T10:00:00+03:00",
      endsAt: "2026-09-15T17:00:00+03:00",
      timePrecision: "exact",
    },
    new Date("2026-08-29T08:30:00+03:00"),
  );
  assert.match(text, /Devam ediyor/);
  assert.match(text, /15 Eyl 2026 17:00/);
  assert.doesNotMatch(text, /^17 Ağu 2026/);
});

test("ongoing etkinlik açıkça devam ediyor olarak etiketlenir", () => {
  const text = domain.formatDiscoverDate({
    startsAt: "2026-08-01T00:00:00+03:00",
    timePrecision: "ongoing",
  });
  assert.match(text, /Devam ediyor/);
  assert.doesNotMatch(text, /00:00/);
});

test("tek seanslı iptal ve erteleme detayda doğru yaşam döngüsü mesajını gösterir", async () => {
  const source = await readFile(
    new URL("../src/components/KesfetDetailPage.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /lifecycleStatus === "cancelled"[\s\S]+Etkinlik iptal edildi/);
  assert.match(source, /lifecycleStatus === "postponed"[\s\S]+Etkinlik ertelendi/);
});
