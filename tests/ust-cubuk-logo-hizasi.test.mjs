import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const kaynak = readFileSync("src/components/Header.tsx", "utf8");

/*
  ÜST ÇUBUKTA LOGO İLE MENÜ PİLLERİ AYNI DİKEY MERKEZDE

  Canlıda 17 piksel kayıktı: 1600 pikselde logo bağlantısının merkezi
  y=19, "Fırsatlar" pilininki y=36. İki ayrı sebep ölçüldü, ikisi de
  aynı satırda:

  1) Tailwind v4 tarayıcısı, şablon dizesinde ara değer işaretine YAPIŞIK
     yazılmış son sınıfı aday olarak çıkarmıyor. `lg:translate-y-0` bu
     yüzden hiç üretilmiyordu; üretilen CSS'te kural 0 kez geçiyordu.
     Tailwind v4 kaydırmayı `transform` yerine `translate` özelliğiyle
     yazdığı için hesaplanan `transform` "none" görünüyor ama kap
     `-translate-y-1/2`yi masaüstünde de taşıyordu.
  2) Kap öğrencide sıradan blok kutuydu; satır içi bağlantının altına
     satır kutusu boşluğu ekleniyor, kap 31 piksel olurken bağlantı 28
     pikselde tepeye yapışıyordu (kalan 1,5 piksel).

  Ölçüm (üretim derlemesi, /firsatlar, logo bağlantısı vs "Fırsatlar"
  pili merkez farkı): 1024/1280/1600 pikselde -17 → 0.
*/
test("logo kabı masaüstünde dikey kaydırmayı bırakıyor ve yüksekliğini bağlantıya eşitliyor", () => {
  const kap = kaynak.match(/className=\{`absolute left-1\/2 top-1\/2[^`]*`\}/);
  assert.ok(kap, "logo kabının sınıf listesi bulunamadı");
  const sinif = kap[0];

  /* Telefonda marka çubuğun ortasında: mutlak konum + iki eksende -%50. */
  for (const s of ["absolute", "left-1/2", "top-1/2", "-translate-x-1/2", "-translate-y-1/2"]) {
    assert.ok(sinif.includes(s), `telefon ortalaması için ${s} şart`);
  }

  /* Masaüstünde akışa dönüş: iki eksende de kaydırma sıfırlanıyor. */
  for (const s of ["lg:static", "lg:translate-x-0", "lg:translate-y-0"]) {
    assert.ok(sinif.includes(s), `masaüstü hizası için ${s} şart`);
  }

  /* Kap bağlantı kadar yüksek: satır kutusu boşluğu kalmıyor. */
  assert.ok(/\bflex\b/.test(sinif) && sinif.includes("items-center"), "kap flex items-center olmalı");
});

test("Header'da hiçbir sınıf ara değer işaretine yapışık yazılmıyor", () => {
  /*
    Yapışık yazım sessizce kayboluyor: derleme patlamıyor, sınıf gövdede
    duruyor, yalnız CSS kuralı üretilmiyor. Bu yüzden gözle değil testle
    yakalanıyor. Eşleşme sınıf adına benziyor mu diye bakılıyor: en az bir
    tire ya da iki nokta taşıyan, boşlukla ayrılmış son parça.
  */
  const sinifDizeleri = [...kaynak.matchAll(/className=\{`[\s\S]*?`\}/g)].map((e) => e[0]);
  const yapisiklar = sinifDizeleri.flatMap((d) =>
    [...d.matchAll(/[\s`]([A-Za-z][-A-Za-z0-9:/[\].%_]*[-:][-A-Za-z0-9:/[\].%_]*)\$\{/g)].map((e) => e[1]),
  );
  assert.deepEqual(yapisiklar, [], `şu sınıflar ara değere yapışık, CSS'leri üretilmez: ${yapisiklar.join(", ")}`);
});
