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

test("exact etkinlik gerçek başlangıç saatini gösterir", () => {
  const text = domain.formatDiscoverDate({
    startsAt: "2026-08-29T19:30:00+03:00",
    timePrecision: "exact",
  });
  assert.match(text, /19:30/);
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
