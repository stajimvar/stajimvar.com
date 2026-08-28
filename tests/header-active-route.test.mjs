import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/Header.tsx", "utf8");

test("Keşfet rotasında İlanlar sekmesi aktif kalmaz", () => {
  assert.match(
    source,
    /const ilanlardaMi = !rehberdeMi && !firsatlardaMi && !kesfetteMi && !kurumsalSayfada/,
  );
});

test("Keşfet rotasında üst arama etkinlik içeriğini arar", () => {
  assert.match(source, /kesfetteMi[\s\S]{0,80}\? 'Etkinlik, şehir veya mekân ara'/);
  assert.match(source, /if \(rehberSayfasindaMi \|\| kesfetteMi\) return/);
});

test("Keşfet koleksiyonları masaüstünde dört sütun kullanır", () => {
  const page = readFileSync("src/components/KesfetPage.tsx", "utf8");
  assert.match(page, /lg:grid-cols-4/);
});
