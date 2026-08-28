import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/KesfetPage.tsx", "utf8");

test("mobil Keşfet filtreleri kapatılabilir ve etkinlikleri öne çıkarır", () => {
  assert.match(source, /const \[filtersOpen, setFiltersOpen\] = useState\(false\)/);
  assert.match(source, /aria-expanded=\{filtersOpen\}/);
  assert.match(source, />\s*Filtrele/);
  assert.match(source, /filtersOpen \? "grid" : "hidden"\} sm:grid/);
});
