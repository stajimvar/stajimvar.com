import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
  "ŞİRKETLER İÇİN REHBER" KARTI SAYFADAN ÇIKMIYOR (kusur, 20 Eylül 2026)

  Kart `/isveren`e gidiyordu: "Doğru stajyeri daha kolay bulun" PAZARLAMA
  sayfası. Şirket hesabıyla tıklayan kullanıcı "sanki hesaptan çıkılmış
  gibi" diye bildirdi — o sayfa oturumsuz bir karşılama ekranı gibi
  duruyor. Kartın vaat ettiği içerik zaten /rehber'de: "Şirketler için"
  konusu seçilince işveren yazıları listeleniyor.

  Aynı düzeltmede konu öğrenciye de açıldı — ama ÖNE ÇIKMADAN: şeridin ve
  menünün sonunda, arama sonuçlarının sonunda. Öne çıkan rehber ve "sana
  uygun" sıralaması hâlâ yalnız öğrenci yazılarını görüyor.

  Testler kaynak üzerinden okuyor: bileşen oturum ve Supabase istemcisi
  istiyor, depoda jsdom yok. Ölçülen şey davranışın doğru koşula bağlı
  olması; tarayıcı ölçümü ayrıca yapıldı.
*/

const REHBER = readFileSync('src/components/RehberMerkezi.tsx', 'utf8');
const KONULAR_KAYDI = readFileSync('src/data/rehberler.tsx', 'utf8');

/* Yorumlar iddia değil: kod dalları ölçülürken yorum metni sayılmasın. */
const kod = REHBER.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('kart pazarlama sayfasına değil, sayfa içi konuya gidiyor', () => {
  /* Kusurun kendisi: bu karttan /isveren'e giden bir hedef kalmadı. */
  assert.doesNotMatch(kod, /'\/isveren'/, 'kart yine pazarlama sayfasına gidiyor');

  const kart = kod.slice(kod.indexOf('const sirketRehberKarti'));
  const govde = kart.slice(0, kart.indexOf('return ('));
  /* Hedef gerçek bir adres: orta tuş ve "yeni sekmede aç" aynı listeyi açmalı. */
  assert.match(govde, /`\/rehber\?\$\{KONU_PARAMETRESI\}=isveren`/);
  assert.match(govde, /data-testid="rehber-sirketler-icin"|'rehber-sirketler-icin'/);
  /* Sol tık sayfada kalıyor: konu seçiliyor ve göz şeride dönüyor. */
  assert.match(govde, /\(\) => tumunuGor\('isveren'\)/);

  /* Bağlantı hâlâ <a href>; onClick yalnız sade sol tıkta araya giriyor. */
  const gecis = kod.slice(kod.indexOf('const isverenGecisKarti'));
  assert.match(gecis, /<a\s+href=\{adres\}/);
  assert.match(gecis, /if \(e\.metaKey \|\| e\.ctrlKey \|\| e\.shiftKey \|\| e\.altKey \|\| e\.button !== 0\) return;/);
  assert.match(gecis, /if \(sayfaIcindeAc\) sayfaIcindeAc\(\);\s*else onNavigate\(adres\);/);
  /* Dokunma hedefi 44 piksel. */
  assert.match(gecis, /<a[\s\S]{0,600}className="flex min-h-11/);

  /* Yazı kalmazsa kart da çizilmiyor: boş listeye götüren vaat olurdu. */
  assert.match(kod, /const sirketRehberKarti = isverenKonusuAcik\s*\?\s*isverenGecisKarti\(/);

  /* Kartın iki konumu değişmedi: şirkette listenin başı, öğrencide sonu. */
  assert.match(REHBER, /<section aria-label="Rehberler"[^>]*>\s*\{sirketHesabi && sirketRehberKarti\}/);
  assert.match(REHBER, /\{!sirketHesabi && sirketRehberKarti\}\s*<\/section>/);
});

test('seçili konu adreste duruyor: yenileme ve yeni sekme aynı listeyi açıyor', () => {
  /* Okuma: geçersiz değer sekme kaydırmıyor, ön render'da window yok. */
  assert.match(kod, /const adrestenKonu = \(\): KonuId \| null =>/);
  assert.match(kod, /if \(typeof window === 'undefined'\) return null;/);
  assert.match(kod, /KONULAR\.some\(\(k\) => k\.id === deger\) \? \(deger as KonuId\) : null/);

  /* Başlangıç sekmesi adresten; adresten gelen konu elle seçim sayılıyor
     ki profil çözülünce "sana uygun" üstüne yazmasın. */
  assert.match(kod, /const \[baslangicKonusu\] = React\.useState\(adrestenKonu\);/);
  assert.match(
    kod,
    /React\.useState<Sekme>\(baslangicKonusu \?\? \(kisisel \? 'uygun' : 'tumu'\)\)/,
  );
  assert.match(kod, /React\.useState\(Boolean\(baslangicKonusu\)\)/);

  /* Yazma: her konu seçiminde, "tümü"de parametre siliniyor. */
  assert.match(kod, /const sekmeSec = \(id: Sekme\) => \{[\s\S]*?konuyuAdreseYaz\(id\);/);
  assert.match(kod, /if \(secilen === 'tumu' \|\| secilen === 'uygun'\) parametreler\.delete\(KONU_PARAMETRESI\);/);
  /* Süzgeç temizleyen iki düğme de parametreyi düşürüyor. */
  assert.equal((kod.match(/konuyuAdreseYaz\('tumu'\)/g) ?? []).length, 2);
  /*
    `replaceState`: şeritteki dairelere dokunmak sık; her dokunuş geçmişe
    kayıt düşseydi geri tuşu sayfadan çıkamazdı (?q= ile aynı gerekçe).
  */
  assert.match(kod, /window\.history\.replaceState\(\{\}, '', `\$\{window\.location\.pathname\}/);
  assert.doesNotMatch(kod, /pushState/);
});

test('işveren konusu her hesapta seçilebilir, öğrencide en sonda', () => {
  /* Konu kaynağı artık hesaba bakmıyor — kart seçilemeyen konuya işaret etmesin. */
  assert.match(
    kod,
    /const konuKaynagi = React\.useMemo\(\s*\(\) => \[\.\.\.ogrenciRehberleri, \.\.\.isverenRehberleri\],/,
  );
  assert.doesNotMatch(kod, /sirketHesabi \? \[\.\.\.ogrenciRehberleri/);

  /* Şerit: öğrencide sıralamaya girmeden sona sabit, şirkette sayıya göre. */
  assert.match(kod, /const sonaSabit = \(id: string\) => \(!sirketHesabi && id === 'isveren' \? 1 : 0\);/);
  assert.match(kod, /sonaSabit\(a\.id\) - sonaSabit\(b\.id\) \|\|\s*b\.adet - a\.adet/);

  /* Açılır menü KONULAR sırasını izliyor; "Şirketler için" o dizinin sonunda. */
  assert.match(kod, /\{doluKonular\.map\(\(k\) => \(/);
  const idler = [...KONULAR_KAYDI.matchAll(/\{ id: '([a-z]+)', etiket:/g)].map((e) => e[1]);
  assert.equal(idler.at(-1), 'isveren', 'işveren konusu KONULAR dizisinin sonunda değil');

  /* Küre altındaki ad kırpılmasın diye kısa etiket var. */
  assert.match(kod, /isveren: 'Şirket',/);
});

test('arama işveren yazılarını buluyor ama öğrenci sonuçlarından SONRA', () => {
  const alan = kod.slice(kod.indexOf('const aramaSonuclari'), kod.indexOf('const sonuclar'));
  /* İki ayrı arama: tek havuzda aranan liste sırayı eşleşmeye bırakırdı. */
  assert.match(alan, /const ogrenciSonucu = birlesikArama\(/);
  assert.match(alan, /const isverenSonucu = birlesikArama\(/);
  assert.match(
    alan,
    /rehberler: \[\.\.\.ogrenciSonucu\.rehberler, \.\.\.isverenSonucu\.rehberler\]/,
  );
  /* Sonuç sayısı gerçeği söylüyor: eklenen yazılar toplama da giriyor. */
  assert.match(alan, /toplam: ogrenciSonucu\.toplam \+ isverenSonucu\.rehberler\.length/);
});

test('öne çıkan rehber ve "sana uygun" hâlâ yalnız öğrenci yazılarını görüyor', () => {
  /*
    Ayrımın gerekçesi değişmedi: bir şirket yazısı öğrencinin öne çıkan
    kartına ya da kişiselleştirilmiş sıralamasına girerse yanlış
    kişiselleştirme olur — hiç kişiselleştirmemekten kötü.
  */
  const oneCikan = kod.slice(kod.indexOf('const seciliOlanlar'), kod.indexOf('const devamEdilecekler'));
  assert.doesNotMatch(oneCikan, /isverenRehberleri/);
  assert.match(oneCikan, /kisiyeGoreSirala\(ogrenciRehberleri, ogrenci\)/);

  /* Konu bölümleri de öğrenci yolculuğuna göre; işveren bölümü boş kalıp düşüyor. */
  const bolumler = kod.slice(kod.indexOf('const konuBolumleri'), kod.indexOf('const sekmelerRef'));
  assert.match(bolumler, /ogrenciRehberleri\.filter\(\(r\) => r\.konu === k\.id/);
  assert.doesNotMatch(bolumler, /isverenRehberleri/);
});
