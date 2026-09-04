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

// Keşfet now has a paginated catalog. Reachability, responsive layout and
// header search are exercised against the real page in kesfet-catalog.spec.ts.

test("şeritte masaüstünde dört kart yan yana durur", () => {
  const serit = readFileSync("src/ui/Serit.tsx", "utf8");
  /*
    Genişlik oranla veriliyor: (100% - 3 boşluk) / 4. Beşliydi; şerit o
    zaman sayfanın tamamını kaplıyordu. Süzgeç paneli sola alınınca şerit
    9 sütuna indi ve beş kart 200 pikselin altına düşüyordu — afiş okunmaz
    oluyordu. Sabit piksel yerine oran, çünkü kabın genişliği sayfaya göre
    değişiyor.
  */
  assert.match(serit, /lg:w-\[calc\(\(100%-3rem\)\/4\)\]/);
});
