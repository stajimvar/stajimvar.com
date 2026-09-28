import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { bildirimIcerigi } from '../src/lib/bildirim-icerigi.mjs';
import { bildirimKisisi } from '../src/lib/bildirim-kisisi.mjs';

/*
  BILDIRIMDE BEGENILEN ICERIK GORUNSUN

  Bildirim listesinde ayni kisinin alti begenisi alti ozdes satir
  oluyordu ("Selin Dikme paylasimini begendi") ve hangi paylasimin
  begenildigi hicbir satirda yazmiyordu. Kimlik zaten olay anahtarinda
  duruyordu, yalniz okunmuyordu.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

/*
  YOKLUK IDDIALARI YORUMLARA TAKILMASIN

  "Su metin GECMIYOR" diyen bir iddia, gerekcesini anlatan yorumda o
  metin gectigi icin kiriliyordu -- dosyanin kendisi dogruyken. Iddiayi
  gevsetmek yanlis olurdu; onun yerine yorumlar cikarilip KOD'a bakiliyor.
  (Ayni yardimci tests/paylasim-sayfasi.test.mjs icinde de var.)
*/
const kodu = (metin) =>
  metin
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');

const PAYLASIM = '0c28129b-0d1c-43c1-8355-614a90963560';
const KISI = 'f9de6f3d-521d-44a8-8a16-0c1111111111';

test('begeni anahtarindan paylasim kimligi okunuyor', () => {
  assert.equal(bildirimIcerigi('begeni:' + PAYLASIM + ':' + KISI), PAYLASIM);
});

test('icerik ile kisi ayni anahtarin FARKLI parcalari', () => {
  /*
    Canlida olculdu: begeni:<paylasim>:<begenen>. Birinci UUID 22/22
    paylasim, ikinci 22/22 profil. Ikisini karistirmak, bildirimde
    paylasim yerine kullanici kimligi aramak demek olurdu.
  */
  const anahtar = 'begeni:' + PAYLASIM + ':' + KISI;
  assert.equal(bildirimIcerigi(anahtar), PAYLASIM);
  assert.equal(bildirimKisisi(anahtar), KISI);
  assert.notEqual(bildirimIcerigi(anahtar), bildirimKisisi(anahtar));
});

test('begeni disindaki turlerde icerik yok', () => {
  assert.equal(bildirimIcerigi('baglanti_istegi:' + PAYLASIM + ':' + KISI), null);
  assert.equal(bildirimIcerigi('baglanti_kabul:' + PAYLASIM + ':' + KISI), null);
});

test('bozuk anahtar icerik uretmiyor', () => {
  for (const kotu of [null, undefined, 42, '', 'begeni', 'begeni:' + PAYLASIM,
                      'begeni:olmayan-uuid:' + KISI,
                      'begeni:' + PAYLASIM + ':' + KISI + ':fazla']) {
    assert.equal(bildirimIcerigi(kotu), null, String(kotu) + ' icin null olmali');
  }
});

test('sorgu kapak gorselini ve aciklamayi cekiyor', () => {
  const q = oku('src/lib/queries/sosyal.ts');
  const govde = q.slice(q.indexOf('export async function bildirimIcerikleriniGetir'));
  const fn = govde.slice(0, govde.indexOf('export async function bildirimKisileriniGetir'));
  assert.ok(fn.includes('post_media ( sira, storage_path )'), 'kapak icin medya secilmeli');
  assert.ok(fn.includes('aciklama'), 'ozet icin aciklama secilmeli');
  assert.ok(fn.includes('Number(a.sira) - Number(b.sira)'), 'kapak en kucuk sira olmali');
});

test('gorunmeyen paylasim icin yer tutucu cizilmiyor', () => {
  /*
    RLS'in satiri vermemesi ile paylasimin silinmis olmasi ayni sey degil
    ve ikisini ayirt edemiyoruz; "silinmis paylasim" yazmak iddia olurdu.

    KORUMA AYNI, KAPI DEGISTI (28 Eylul 2026)
    Onizleme artik yalniz KAPAK GORSELI: eski kapi `!ozet && !kapakYolu`
    idi, cunku aciklama tek basina da cizilebiliyordu. Simdi gorsel yoksa
    gosterilecek bir sey de yok, kapi tek kosula indi -- ve ikinci bir
    kapi eklendi: adres inmediyse de hicbir sey cizilmiyor. Kalici bos
    bir gri kare, bozuk ya da var olmayan bir paylasim izlenimi verirdi.
  */
  const b = oku('src/components/BildirimMerkezi.tsx');
  assert.ok(b.includes('if (!kapakYolu) return null;'),
            'kapak yoksa onizleme hic cizilmemeli');
  assert.ok(b.includes('if (!adres) {'), 'adres inmediyse yer tutucu kalmamali');
  assert.ok(!b.includes('Silinmiş paylaşım'), 'yer tutucu metin olmamali');
});

test('ETIKET UYDURULMUYOR: "Gorsel paylasimi" gibi bir metin yok', () => {
  /*
    Aciklamasi olmayan paylasimlarda satirda "Gorsel paylasimi" yaziyordu:
    hicbir sey soylemeyen, veriden gelmeyen bir doldurma cumlesi.
    Uretimde olculdu (28 Eylul 2026): begenilen 21 paylasimin 4'unde
    aciklama yok, yani etiket gercekten goruluyordu (kullanici bildirdi).

    `alt` de uydurulmuyor: aciklama varsa o, yoksa bos dize.
  */
  const b = kodu(oku('src/components/BildirimMerkezi.tsx'));
  assert.ok(!b.includes('Görsel paylaşımı'), 'doldurma etiketi olmamali');
  assert.ok(b.includes("alt={ozet?.trim() || ''}"), 'alt ya aciklama ya bos olmali');
});

test('kucuk resim satirin sagindaki kare, cerceveli kutu degil', () => {
  /*
    Kullanici istegi (28 Eylul 2026): begenilen sey Instagram'daki gibi
    satirin saginda kucuk bir gorsel olarak gozuksun. Onceki sunum
    metnin ALTINDA cerceveli bir kutuydu ve satiri iki kata cikariyordu.
  */
  const b = oku('src/components/BildirimMerkezi.tsx');
  const onizleme = b.slice(b.indexOf('const IcerikOnizleme'), b.indexOf('const satirCiz'));
  assert.ok(/h-11 w-11 shrink-0/.test(onizleme), 'kare kucuk resim olmali');
  assert.ok(!/border border-gray-200/.test(onizleme), 'cerceveli kutu kalmamali');
  assert.ok(/object-cover/.test(onizleme), 'gorsel kareyi doldurmali');

  /* Cagri metnin icinde degil, okunmamis noktasindan SONRA. */
  const satir = b.slice(b.indexOf('const satirCiz'));
  assert.ok(satir.indexOf('<span className="sr-only">Yeni</span>') <
            satir.indexOf('<IcerikOnizleme'),
            'kucuk resim satirin en saginda olmali');
});

test('GORSEL ADRESI DOGRU OKUNUYOR (olculen hata)', () => {
  /*
    `useGorselAdresleri` `{ durum, adresler }` donduruyor ve `adresler`
    bir `Map`. Kod ikisini de atliyordu: nesneyi cozmeden kullaniyor,
    sonra `Map`'e koseli parantezle erisiyordu. Sonuc her zaman
    `undefined` -- `<img>` hic cizilmiyordu ve ekranda kalici bos bir gri
    kare duruyordu (kullanicinin ekran goruntusu, 28 Eylul 2026).
  */
  const b = oku('src/components/BildirimMerkezi.tsx');
  const onizleme = b.slice(b.indexOf('const IcerikOnizleme'), b.indexOf('const satirCiz'));
  assert.ok(/const \{ durum, adresler \} = useGorselAdresleri/.test(onizleme),
            'kanca nesne donduruyor, cozulmeli');
  assert.ok(/adresler\.get\(kapakYolu\)/.test(onizleme),
            'Map get ile okunmali, koseli parantezle degil');
  assert.ok(!/adresler\[/.test(onizleme), 'Map koseli parantezle okunamaz');

  /* Kancanin donus bicimi gercekten boyle mi -- iddia dosyadan dogrulaniyor. */
  const kanca = oku('src/components/sosyal/useGorselAdresleri.ts');
  assert.ok(/return \{ durum, adresler \};/.test(kanca), 'kanca nesne donduruyor');
  assert.ok(/Map<string, string>/.test(kanca), 'adresler bir Map');
});

test('onizleme imzali adres uretmiyor', () => {
  /* Gorsel kullanicinin kendi oturumundan iniyor; paylasilabilir adres yok. */
  const b = oku('src/components/BildirimMerkezi.tsx');
  assert.ok(b.includes('useGorselAdresleri'), 'yetkili indirme yolu kullanilmali');
  assert.ok(!b.includes('createSignedUrl'), 'imzali adres uretilmemeli');
});

test('icerik App tarafinda kisi ile ayni desende bagli', () => {
  const app = oku('src/App.tsx');
  assert.ok(app.includes('icerik={bildirimIcerikBilgisi}'), 'bilesene gecirilmeli');
  assert.ok(app.includes('bildirimIcerikleriniGetir'), 'panel acilinca tek sorgu');
  assert.ok(app.includes("bildirimIcerigi(b.anahtar)"), 'kimlik anahtardan okunmali');
});
