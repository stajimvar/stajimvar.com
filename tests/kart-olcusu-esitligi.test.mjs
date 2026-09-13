import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  KEŞFET KAPANDI (11 Eylül 2026) — bu dosyadaki etkinlik kartı iddiaları
  sayfayla birlikte gitti; ölçüm notu tarihçe olarak duruyor. Kalan
  iddialar rehber ve fırsat kartını sabitliyor.

  ETKİNLİK KARTI REHBER KARTIYLA AYNI ÖLÇÜDE (tarihçe)

  Aynı ürünün iki listesi farklı ölçüdeydi. Ölçüldü (1440px, iki sayfada
  da orta sütun 661 piksel):

              ızgara            kart       kapak      başlık
    Rehber    3 x 209.5px       210x357    208x144    16px
    Keşfet    2 x 322.25px      322x395    320x180    18px   <- poster

  Keşfet ilk ekrana 4 kart alıyordu, Rehber 6. Kapak farkı asıl sebepti:
  Keşfet kapağı ORANLI (`aspect-video`) olduğu için sütun genişledikçe
  büyüyor ve kartı aşağı itiyordu; Rehber kapağı SABİT YÜKSEKLİKTE.

  Düzeltildikten sonra ikisi de: 3 x 209.5px, kapak 208x144, başlık 16px.
  Telefonda (390px) ikisi de 2 x 174px, kapak 172x96, başlık 13px.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

const rehber = oku('src/components/RehberKartlari.tsx');

test('REHBER IZGARASI: telefonda 1 piksel ayırıcı, sm üstünde eski ölçü', () => {
  /*
    Sütun arası 10 piksellik BOŞLUKTU ve ızgara sayfanın 16 piksellik
    yan boşluğunun içindeydi; 375 piksellik ekranda hücreye 172 piksel
    kalıyordu. Izgara telefonda ekranın iki kenarına yaslandı ve
    hücreleri ayıran şey 1 piksele indi.

    O 1 piksel bir kenarlık DEĞİL: ızgaranın zemini gri, araları
    `gap-px`, hücreler beyaz — çizgi zeminin göründüğü yer. Kenarlıkla
    yapılsaydı komşu hücrelerin kenarlıkları üst üste binip 2 piksel
    olur, son sütunun sağında da tek başına bir çizgi kalırdı.

    `sm:` ve üstünde ölçü DEĞİŞMEDİ: 16 piksel boşluk, üç sütun.
  */
  assert.match(rehber, /grid-cols-2 gap-px bg-gray-200 sm:gap-4 sm:bg-transparent lg:grid-cols-3/);
  assert.match(rehber, /\$\{YUZEY\.kap\}/, 'ızgara kenara yaslanmıyor');
});

test('KAPAK TELEFONDA ORANLI, sm ÜSTÜNDE SABİT YÜKSEKLİKTE', () => {
  /*
    Telefonda 96 piksel sabitti ve hücre 187 piksel genişliğindeydi:
    kapak 2:1 bir şeride dönüşüyor, fotoğrafın konusu kırpılıp
    gidiyordu. Oran (4:3) kapağı hücre genişliğine bağlıyor ve kapak
    hücrenin tam genişliğini kaplıyor.

    `sm:` üstünde SABİT YÜKSEKLİK KALIYOR — oranlı kapak orada sütun
    genişledikçe büyüyor ve üç sütuna çıkılamamasının sebebi buydu.
  */
  assert.match(rehber, /aspect-\[4\/3\] w-full shrink-0 overflow-hidden/);
  assert.match(rehber, /sm:aspect-auto sm:h-36/);
  /* İskelet de aynı ölçüde: içerik gelince ızgara zıplamamalı. */
  assert.match(rehber, /aspect-\[4\/3\] w-full animate-pulse bg-gray-100 sm:aspect-auto sm:h-36/);
});

test('TİPOGRAFİ VE İÇ BOŞLUK AYNI', () => {
  assert.match(rehber, /text-\[13px\] font-bold leading-snug text-gray-900 line-clamp-2 sm:text-base/);
  assert.match(rehber, /gap-1\.5 p-2\.5 sm:gap-2 sm:p-3\.5/);
});

test('KARTIN ALTINDA İKİNCİ BİR "AYNI YERE GİT" SATIRI YOK', () => {
  /*
    Kartın tamamı zaten rehbere giden bir bağlantı; altındaki "Rehberi
    aç →" ikinci bir aynı-hedef satırıydı ve kendi ayıracıyla birlikte
    kartın altına 32 piksel ekliyordu. Telefonda iki sütunlu ızgarada bu,
    ekrana sığan kart sayısını düşüren en büyük tek kalemdi.
  */
  assert.doesNotMatch(rehber, />\s*Rehberi aç/, '"Rehberi aç" satırı geri gelmiş');
  assert.doesNotMatch(rehber, /border-t border-gray-100 pt-2\.5/, 'ayıraç ve alt boşluk geri gelmiş');
  /* Okuma süresi ve kaydet kaldı: ikisi aynı satırda, karşı karşıya. */
  assert.match(rehber, /rehberOkumaDakika\(rehber\)\} dk/);
  assert.match(rehber, /mt-auto flex items-center justify-between gap-2 pt-1/);
});

/* ------------------------------------------------- fırsat kartı */

const firsat = oku('src/components/OpportunitiesPage.tsx');
const tup = oku('src/components/ZamanTupu.tsx');

test('FIRSAT IZGARASI: TELEFONDA TEK SÜTUN, sm ÜSTÜNDE REHBERLE AYNI', () => {
  /*
    Telefonda iki sütundu ve 375 piksellik ekranda karta 174 piksel
    kalıyordu. Kartın yarısı oraya sığmadığı için `hidden sm:block` ile
    gizleniyordu — kime uygun olduğu, tutarın dönemi, şart notu. Yani
    telefon kullanıcısı EN AZ bilgiyi gören kullanıcıydı.

    Tek sütunda aynı kart bütün alanlarını gösteriyor. Rehber iki sütunda
    kalıyor: orada hücrenin taşıdığı şey bir KAPAK ve iki satır başlık,
    metin alanı yok — ikisi bilerek ayrıldı.

    `sm:` ve üstünde ikisi yine aynı ızgarada: 16 piksel boşluk, `lg:`
    üstünde üç sütun.
  */
  assert.match(firsat, /grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3/);
  assert.match(firsat, /\$\{YUZEY\.kap\} sm:mx-0/, 'liste kenara yaslanmıyor');
  /* İskelet listenin oturacağı yere oturuyor: gelince sayfa zıplamamalı. */
  const iskelet = firsat.slice(firsat.indexOf('const ListeIskeleti'));
  assert.match(iskelet, /grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3/);
});

test('FIRSAT KARTI TELEFONDA KABUKSUZ, BAŞLIK TAM GENİŞLİKTE', () => {
  const kart = firsat.slice(firsat.indexOf('<article'));
  /* Kabuk ortak belirteçten: liste ekranlarındaki kartlarla aynı. */
  assert.match(kart.slice(0, 400), /\$\{YUZEY\.kabuk\} \$\{YUZEY\.ic\}/);
  /*
    Logo ve künye sol sütunda, başlık sağ sütundaydı: başlık kartın sol
    kenarından 44 piksel içeriden başlıyor ve altındaki hiçbir şey o
    boşluğu doldurmuyordu. İlk satır artık yalnız künye.
  */
  assert.match(kart, /<h2 className="line-clamp-2 min-w-0 text-\[15px\] font-bold leading-snug text-gray-900 sm:text-base">/);
  /* Kime ve nerede satırı telefonda da görünüyor. */
  assert.doesNotMatch(kart, /hidden text-xs text-gray-500 sm:block/);
});

test('TUTAR VE SON BAŞVURU İKİ HİZALI ALANDA, İLERLEME ÇUBUĞU YOK', () => {
  /*
    Tutar yeşil bir kutunun içindeydi, son başvuru ise dolmakta olan bir
    ZAMAN TÜPÜYDÜ: aynı soruyu ("değeri ne, ne zamana kadar") iki ayrı
    görsel dilde yanıtlıyorlardı ve tüp kalan günü çubuğun doluluğuyla
    anlatıyordu — okunmak için yorumlanması gerekiyordu.

    İkisi artık aynı ölçüde iki alan. Kalan gün kaybolmadı: gerçekten
    yaklaşan tarihte "Son 3 gün" rozeti yukarıda yanıyor ve o rozet
    doğrudan son başvuru tarihinden hesaplanıyor (firsatRozetleri).
  */
  assert.doesNotMatch(firsat, /ZamanTupu/, 'ilerleme çubuğu karta geri gelmiş');
  assert.match(firsat, /<dl className="grid grid-cols-2 items-start gap-x-3 gap-y-1 border-t border-gray-100 pt-2">/);
  assert.match(firsat, /<dt className="text-\[11px\] text-gray-500">Tutar<\/dt>/);
  assert.match(firsat, /\{arsivde \? 'Kapanış' : 'Son başvuru'\}/);
  /* Bilinmeyen değerde boş çizgi değil, ne olduğu yazıyor. */
  assert.match(firsat, /Tutar açıklanmadı/);
  assert.match(firsat, /Takvim açıklanmadı/);
});

test('LOGO İLAN KARTIYLA AYNI AİLEDE', () => {
  /* 56 piksellik logo dar kartın üçte birini yiyordu; ölçü bir kademe küçük. */
  assert.match(firsat, /!h-9 !w-9[^"]*sm:!h-10 sm:!w-10/);
});

test('ZAMAN TÜPÜ KIRPMIYOR, SARIYOR', () => {
  /*
    Üst satır tek satıra zorlanıyor ve vurgu `truncate` ile kırpılıyordu.
    Ölçüldü (210 piksellik kartta): ekranda "Son 3 gün" yerine "Son…",
    "4 gün kaldı" yerine "4 gü…" yazıyordu — kalan süre okunamıyordu.
  */
  assert.match(tup, /flex flex-wrap items-baseline gap-x-2 gap-y-0\.5/);
  const vurguSatiri = tup.slice(tup.indexOf('{(vurgu || sikisik) && ('), tup.indexOf('{tarih && !sikisik'));
  assert.doesNotMatch(vurguSatiri, /truncate/, 'vurgu kırpılmamalı');
});

/* --------------------------------------- liste başlığı üç sayfada da */

test('ŞERİDİN ÜSTÜNDE LİSTE BAŞLIĞI VAR', () => {
  /*
    Rehberde "TÜM REHBERLER (71)", ilanlarda "AÇIK STAJ İLANLARI (62)"
    varken fırsatlarda şerit başlıksız duruyordu: göz doğrudan dairelere
    düşüyor, neyin listelendiği yazmıyordu.

    Hepsi aynı tipografi: 12px, büyük harf, seyrek harf aralığı; solda
    "ne ve kaç tane", sağda listenin nereden geldiğini söyleyen ikincil
    satır (telefonda gizli).
  */
  /* Biçim artık ortak belirteçte (ui/tokens · LISTE_BASLIGI_*). */
  assert.match(firsat, /className=\{LISTE_BASLIGI_YAZISI\}/, 'fırsat listesinde başlık yok');
  assert.match(firsat, /Kurumların resmî sayfalarından derlendi/);
  assert.match(firsat, /className=\{LISTE_BASLIGI_NOTU\}/);
});

test('BAŞLIKTAKİ SAYI DARALTMAYA GÖRE DEĞİŞİYOR', () => {
  /*
    Ölçüldü (canlı): daraltma yokken "Güncel fırsatlar (32)", tür
    seçilince "Filtrelenen fırsatlar (27)", Tümü'ye dönünce yine 32.
  */
  /* Arşiv üçüncü bir başlık: "Süresi dolan fırsatlar". Üçü de aynı ifadede. */
  assert.match(firsat, /'Süresi dolan fırsatlar'/);
  assert.match(firsat, /'Filtrelenen fırsatlar'\s*:\s*'Güncel fırsatlar'/);
  assert.match(firsat, /listeDaraldi \? filtered\.length : sayimTabani\.length/);
  /*
    Daraltma ölçüsü tek yerde: açık süzgeç listesi (aktifFirsatSuzgecleri).
    Arama da o listenin bir üyesi, ayrıca sayılmıyor.
  */
  assert.match(firsat, /const listeDaraldi = aktifSuzgecSayisi > 0/);
});

test('BAŞLIK ŞERİDİN ÜSTÜNDE, LİSTENİN DEĞİL', () => {
  /* Başlık şeridi tanıtıyor; şeritten sonra gelseydi hangi bloğa ait olduğu belirsiz kalırdı. */
  const baslikYeri = firsat.indexOf("'Filtrelenen fırsatlar'");
  const seritYeri = firsat.indexOf('<KonuSeridi');
  assert.ok(baslikYeri > 0 && seritYeri > baslikYeri, 'başlık şeritten sonra geliyor');
});
