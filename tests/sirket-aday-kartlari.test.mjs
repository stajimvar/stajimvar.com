import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  ADAY KARTLARI BASVURANLAR SAYFASINDA

  Once tek bir "Ogrencileri kesfet" baglantisi vardi ve iki listeyi
  (is arayan / staj arayan) ancak actiktan sonra goruyordunuz. Iki arayis
  ayni sey degil; secim sayfaya girmeden yapilabilmeli.

  Ayrica aday ekrani yesil kalmisti ve panelin geri kalani maviyken tema
  disi duruyordu (kullanici bildirdi, 27 Eylul 2026).
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

const PANEL = oku('src/sirket/SirketPaneli.tsx');
const ADAYLAR = oku('src/sirket/SirketAdaylar.tsx');

test('kesif kutulari Basvuranlar ekranindan kalkti, kesif sayfasi duruyor', () => {
  /*
    6 Ekim 2026 (onayli sade tasarim): "Staj arayanlar / Is arayanlar"
    kutulari Basvuranlar ekranindan kaldirildi. Kesif sayfasi silinmedi:
    rota ve ekran yerinde.
  */
  const kod = yorumsuz(PANEL);
  assert.ok(!kod.includes('ogrencileriKesfet'), 'kutu blogu kalmamali');
  assert.ok(!kod.includes('Staj arayanlar') && !kod.includes('İş arayanlar'), 'kutular cizilmemeli');
  assert.ok(PANEL.includes("if (yol.startsWith('/sirket/adaylar')) return { tur: 'adaylar' };"), 'kesif rotasi durmali');
  assert.ok(PANEL.includes('<SirketAdaylar onNavigate={onNavigate} />'), 'kesif ekrani cizilmeli');
});

test('kesif ekrani baslangic sekmesini adresten okuyor', () => {
  assert.ok(ADAYLAR.includes("get('tur') === 'is' ? 'is' : 'staj'"),
            'ekran baslangic sekmesini adresten okumali');
});

/* Yorumlar cikarilmis kaynak: gecmisi anlatan yorum metni test etmiyoruz. */
const yorumsuz = (metin) =>
  metin.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

test('eski tek baglanti kalmadi', () => {
  assert.ok(
    !yorumsuz(PANEL).includes('Öğrencileri keşfet'),
    'tek baglanti kaldirilmali (yorumdaki gecmis anlatimi sayilmaz)',
  );
});

test('aday ekrani panelin mavi temasinda', () => {
  /* SIRKET_VURGU = #2563EB; panel mavi, ekran yesil kalmisti. */
  assert.ok(!ADAYLAR.includes('emerald'), 'yesil sinif kalmamali');
  assert.ok(ADAYLAR.includes('bg-blue-600'), 'birincil dugme mavi olmali');
});


test('basvuranlar gorunumunun her cikisi once basligi ciziyor', () => {
  /*
    Dal SAYISI degil, HER DAL tek tek geziliyor (5 Ekim 2026 gerekcesi):
    basligi cizmeyen yeni bir dal eklenirse test kirilmali.
  */
  const bas = PANEL.indexOf('const baslik = (');
  const son = PANEL.indexOf('export { KADEME }');
  assert.ok(bas > 0 && son > bas, 'basvuranlar gorunumu bulunmali');
  const cikislar = PANEL.slice(bas, son).split(/\n\s*return \(/).slice(1);
  assert.ok(cikislar.length >= 4, 'ilan yok / kart kapali / viewer / normal');
  cikislar.forEach((c, i) => {
    const ilk = c.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*<div className="space-y-4">\s*/, '');
    assert.ok(ilk.startsWith('{baslik}'), 'cikis ' + (i + 1) + ': ilk dugum {baslik} olmali');
  });
});

test('aday ekraninda iki sekme satiri dolduruyor', () => {
  /*
    Icerik genisligindeyken sagda genis bir bosluk kaliyordu ve iki esit
    kutu olmasi gereken sey iki kucuk dugme gibi duruyordu.
  */
  const ADAYLAR2 = oku('src/sirket/SirketAdaylar.tsx');
  /*
    Yalniz SEKME satirina bakiyoruz. Karttaki rol etiketleri (hedefRoller)
    sarmali akista kalmali; onlar etiket, sekme degil.
  */
  const i = ADAYLAR2.indexOf('aria-label="Arayış türü"');
  assert.ok(i > 0, 'sekme satiri bulunmali');
  const satir = ADAYLAR2.slice(i - 200, i + 60);
  assert.ok(satir.includes('grid grid-cols-2 gap-2'), 'sekmeler esit iki sutun olmali');
  assert.ok(!satir.includes('flex flex-wrap'), 'sekmeler icerik genisliginde kalmamali');
  assert.ok(ADAYLAR2.includes('w-full cursor-pointer items-center justify-center'),
            'sekme dugmesi hucreyi doldurmali');
});

test('sayfa basligi gorunur: Basvuranlar + gercek basvuru sayisi', () => {
  /*
    27 Eylul 2026'da baslik sr-only yapilmisti. 6 Ekim 2026 onayli
    tasarimda yeniden gorunur; yaninda gercek sayi, altinda kisa aciklama.
  */
  const bilesen = PANEL.slice(PANEL.indexOf('const baslik = ('));
  assert.ok(!PANEL.includes('<h1 className="sr-only">'), 'baslik gizli kalmamali');
  assert.ok(/<h1[^>]*>\s*Başvuranlar\s*<\/h1>/.test(bilesen), 'h1 Basvuranlar demeli');
  assert.ok(bilesen.includes('{kartlar.length} başvuru'), 'sayi basvuru olarak yazmali');
  assert.ok(bilesen.includes('İlanlarına gelen başvurular'), 'aciklama satiri olmali');
  /* Sayi yalniz kart gorebilen kademede ve sifirdan buyukse. */
  assert.ok(bilesen.includes('{kartAcik && kartlar.length > 0 && ('), 'sayi kosulu');
});

test('sayilan sey basvuru, aday degil', () => {
  /*
    Ayni kisinin iki ilana basvurusu iki satir; "aday" demek yanlis olurdu.
    Izgara toplam sayiyi tekrar yazmiyor (baslikta); yalniz suzulunce
    "x / y basvuru gosteriliyor".
  */
  const IZGARA = yorumsuz(oku('src/sirket/AdayIzgarasi.tsx'));
  assert.ok(IZGARA.includes('{suzulmus.length} / {kartlar.length} başvuru gösteriliyor'), 'suzulmus sayi');
  assert.ok(!/kartlar\.length\}? aday/.test(IZGARA), 'aday diye sayilmamali');
});

test('aday bolumunun basligi ekranda yok', () => {
  /*
    "Aday mi ariyorsunuz?" satiri kartlarin ustunde bosuna yer
    kapliyordu: kartlarin kendi basliklari ("Staj arayanlar",
    "Is arayanlar") ne olduklarini zaten soyluyor. Kullanici
    kaldirilmasini istedi (27 Eylul 2026).
  */
  assert.ok(
    !yorumsuz(PANEL).includes('Aday mı arıyorsunuz?'),
    'baslik kaldirilmali (yorumdaki gecmis anlatimi sayilmaz)',
  );
});


test('aday kesfinin girisi Sirketim sayfasinda: "Adaylari kesfet" -> /sirket/adaylar', () => {
  /*
    6 Ekim 2026: kesif kutulari Basvuranlar'dan kalkinca sayfaya giden
    bir gezinme kalmamisti. Giris Sirketim kartinin sahip eylemlerinde;
    gercek <a href> (yeni sekmede acilabiliyor), sol tik uygulama ici.
  */
  const PROFIL = oku('src/sirket/SirketProfili.tsx');
  const GORUNUM = oku('src/sirket/SirketProfilGorunumu.tsx');
  assert.ok(PROFIL.includes("const ADAYLAR_YOLU = '/sirket/adaylar';"), 'yol sabiti');
  assert.ok(PROFIL.includes('adaylarYolu: ADAYLAR_YOLU,'), 'sahip eylemlerine verilmeli');
  const blok = GORUNUM.slice(GORUNUM.indexOf('{sahip?.adaylarYolu && ('));
  const baglanti = blok.slice(0, blok.indexOf('</a>'));
  assert.ok(baglanti.includes('href={sahip.adaylarYolu}'), 'gercek baglanti olmali');
  assert.ok(baglanti.includes('onClick={icTiklama(onNavigate, sahip.adaylarYolu)}'), 'uygulama ici gezinme');
  assert.ok(baglanti.includes('Adayları keşfet'), 'etiket');
  /* Rol ayrimi YOK: erisim kapisi kesif sayfasinin sunucu okumasinda (degismedi). */
  assert.ok(!/recruiter_role|basvuruYazabilir|kademe/.test(baglanti), 'baglanti role gore gizlenmemeli');
});

test('Basvuranlar ekranina kesif, Pano, is yuku ve sorumlu atama geri gelmedi', () => {
  const bilesen = yorumsuz(PANEL.slice(PANEL.indexOf('const Basvuranlar'), PANEL.indexOf('export { KADEME }')));
  for (const yasak of ['/sirket/adaylar', '<BasvuruPanosu', 'isYuku.map', 'onSorumlu=', 'onDagit=', 'Açık başvuru yükü']) {
    assert.ok(!bilesen.includes(yasak), 'Basvuranlar ' + yasak + ' cizmemeli');
  }
  /* Veriler silinmedi: is yuku ve olcutler hala sunucudan okunuyor, Pano bileseni duruyor. */
  assert.ok(PANEL.includes('sirketIsYuku(b.companyId)'), 'is yuku okumasi durmali');
  assert.ok(fs.existsSync(path.join(KOK, 'src/sirket/BasvuruPanosu.tsx')), 'Pano bileseni silinmemeli');
});
