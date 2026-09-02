import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/KesfetPage.tsx", "utf8");

/*
  BU TEST NEYİ KORUYOR

  Keşfet'in süzgeçleri üç biçim değiştirdi: önce mobilde bir "Filtrele"
  düğmesinin arkasındaydı, sonra başlık kartının içinde yatay kayan bir
  hap şeridi oldu, şimdi kardeş sayfalardaki (ilanlar, fırsatlar) gibi
  sol sütunda bölümlü bir panel.

  Şerit sadeydi ama seçenekleri ve sayıları gizliyordu: "kaç ücretsiz
  etkinlik var" sorusunun cevabı ancak tek tek deneyerek öğreniliyordu.
  Panel bunları açıkta gösteriyor — bedeli, telefonda ekran dolusu yer
  kaplaması. Bu yüzden dar ekranda yeniden bir düğmenin arkasında.

  Test biçimi değil, biçimin korumak istediği şeyleri doğruluyor.
*/
test("süzgeç paneli dar ekranda erişilebilir bir düğmeye bağlı", () => {
  /*
    Panel telefonda kapalı başlıyor; kapıyı açan düğme klavye ve ekran
    okuyucu için de bir kapı olmalı. `aria-expanded` durumu, `aria-controls`
    neyi açtığını söylüyor — ikisi olmadan düğme görene çalışır, ötekine
    çalışmaz.
  */
  assert.match(source, /aria-expanded=\{filtersOpen\}/);
  assert.match(source, /aria-controls="kesfet-filters"/);
  assert.match(source, /id="kesfet-filters"/);

  /*
    Kapı YALNIZCA dar ekranda. Geniş ekranda panel `lg:block` ile her
    zaman açık: orada gizlemenin gerekçesi yok, sol sütun zaten boş
    duruyor.
  */
  assert.match(source, /id="kesfet-filters"[\s\S]{0,120}lg:block/);
});

test("süzgeç bölümleri paylaşılan bileşenlerden gelir", () => {
  /*
    Aynı panel üç sayfada var. Her birinde ayrı yazıldığında bölüm
    başlığının puntosu ve sağdaki sayının hizası sessizce ayrılıyor.
    Ölçüler tek dosyada: src/ui/Filtre.tsx.
  */
  assert.match(source, /import \{ FiltreBlogu, SecenekSatiri, Serit \} from "\.\.\/ui"/);
  assert.match(source, /<FiltreBlogu baslik="Kategori">/);

  const filtre = readFileSync("src/ui/Filtre.tsx", "utf8");
  assert.match(filtre, /export const FiltreBlogu/);
  assert.match(filtre, /export const SecenekSatiri/);
});

test("panel sayıları ekrandaki kartı sayar, ham kaydı değil", () => {
  /*
    EN KOLAY HATA BU

    Sayımı `rows` üzerinden yapmak kolay ve yanlış: koleksiyon üreticisi
    her bölüme en fazla 10 kayıt koyuyor, bölümleri tekilleştiriyor ve beş
    tanımın hiçbirine girmeyen etkinliği hiç çizmiyor. Panelde "12" yazıp
    tıklayınca 9 kart çıkıyordu.

    Her sayı, o seçenek açıkken listenin izleyeceği yolun aynısından
    geçmeli: aynı süzgeçler, sonra `buildDiscoverCollections`.
  */
  const memo = source.match(/const sayimlar = useMemo\([\s\S]*?\n  \}, \[/);
  assert.ok(memo, "sayimlar memo'su bulunamadı");
  assert.match(memo[0], /buildDiscoverCollections/);
  assert.match(memo[0], /matchesDiscoverSearch/);
  assert.match(memo[0], /matchesDiscoverDateFilter/);
});
