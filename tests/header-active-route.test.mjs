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

/*
  Önce bu test `lg:grid-cols-4` arıyordu: koleksiyonlar masaüstünde dört
  sütunlu bir ızgaraydı. Izgara yatay şeride çevrildi — bu sayfa
  karşılaştırma değil göz gezdirme sayfası ve ızgarada her koleksiyon bir
  ekran dolusu dikey yer yiyip yalnızca biri görünüyordu.

  Test artık sütun sınıfını değil, iki gerçek garantiyi doğruluyor:
  koleksiyonlar PAYLAŞILAN şeridi kullanıyor (iki sayfada iki ayrı kart
  boyu çıkmasın diye) ve masaüstünde sabit sayıda kart yan yana duruyor.
*/
test("Keşfet koleksiyonları paylaşılan şeridi kullanır", () => {
  const page = readFileSync("src/components/KesfetPage.tsx", "utf8");
  assert.match(page, /<Serit/);
  assert.match(page, /from "\.\.\/ui"/);
});

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
