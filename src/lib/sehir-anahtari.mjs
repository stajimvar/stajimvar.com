/**
 * ŞEHİR ADI → SİMGE ANAHTARI
 *
 * Şehir adları katalogdan Türkçe yazımıyla geliyor ("İstanbul",
 * "Şanlıurfa"); simge tablosunun anahtarları ise düz ASCII. Dönüşüm
 * burada, çizimlerin yanında değil: mantık `.mjs` olduğu için test
 * doğrudan çağırabiliyor, JSX derlemeye gerek kalmıyor.
 *
 * TÜRKÇE BÜYÜK İ TUZAĞI
 * ---------------------
 * `'İstanbul'.toLowerCase()` → 'i̇stanbul': 'İ' bir 'i' ARTI birleşen
 * nokta üretiyor (U+0307). Anahtar 'istanbul' ile tutmuyor ve İstanbul
 * simgesiz kalıyordu. `toLocaleLowerCase('tr')` doğru sonucu veriyor;
 * yine de NFD ile ayrıştırıp birleşen işaretleri silmek, adın nereden
 * geldiğinden bağımsız olarak aynı anahtarı garanti ediyor.
 *
 * Dotsuz 'ı' ayrıca 'i'ye çevriliyor: "Şanlıurfa" → "sanliurfa".
 */
export function sehirAnahtari(ad) {
  return String(ad ?? '')
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z]/g, '');
}
