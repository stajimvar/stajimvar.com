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
  /* İlanlar gibi tek sütun (17 Eylül 2026). */
  assert.match(firsat, /flex flex-col gap-1\.5 sm:gap-3 \$\{YUZEY\.kap\} sm:mx-0/);
  assert.match(firsat, /\$\{YUZEY\.kap\} sm:mx-0/, 'liste kenara yaslanmıyor');
  /* İskelet listenin oturacağı yere oturuyor: gelince sayfa zıplamamalı. */
  const iskelet = firsat.slice(firsat.indexOf('const ListeIskeleti'));
  assert.match(iskelet, /flex flex-col gap-1\.5 sm:gap-3/);
});

test('FIRSAT KARTI TELEFONDA İLAN KARTIYLA TEK TİP, GENİŞ EKRANDA DİKEY AKIŞ', () => {
  /*
    Kullanıcı isteği (16 Eylül 2026): Fırsatlar telefonda İlanlar'la aynı
    görünmeli. Kart İlan kartının üç bölümünü alıyor — solda büyük logo,
    ortada künye, sağda kaydet ve "İncele". Geniş ekrandaki dar ızgara
    kartı olduğu gibi duruyor.
  */
  const kart = firsat.slice(firsat.indexOf('<article'));
  assert.match(kart.slice(0, 500), /rounded-xl border border-gray-200 bg-white px-3 py-3/);
  assert.match(kart, /flex min-w-0 items-stretch gap-3 min-\[390px\]:gap-3\.5 min-\[430px\]:gap-4">/);
  assert.doesNotMatch(kart, /hidden sm:flex sm:flex-col/, 'masaüstü ızgara kartı geri gelmiş');

  /* Punto ve renkler ilan kartıyla aynı. */
  const ilan = oku('src/components/InternshipCard.tsx');
  for (const sinif of [
    'break-words text-[15px] font-bold leading-snug text-slate-900 min-[430px]:text-base',
    'mt-0.5 break-words text-[15px] font-semibold leading-snug text-slate-800 min-[430px]:text-base',
    'mb-1 inline-flex items-center gap-1 whitespace-nowrap text-[15px] font-bold text-blue-600 hover:text-blue-700',
  ]) {
    assert.ok(ilan.includes(sinif), `ilan kartında yok: ${sinif}`);
    assert.ok(kart.includes(sinif), `fırsat kartında yok: ${sinif}`);
  }

  /* Uzun başlık telefonda kırpılmıyor; dar masaüstü kartında iki satır. */
  assert.doesNotMatch(kart, /<h2 className="line-clamp-2/, 'telefonda başlık hâlâ kırpılıyor');

  /* Tür ve destek: `kartSatiri` null ise yalnız tür (tests/firsat-tutar-durumu). */
  assert.match(kart, /\{opportunityTypeLabel\(item\.opportunityType\)\}/);
  assert.match(kart, /\{tutar\.kartSatiri \? ` · \$\{tutar\.kartSatiri\}` : ''\}/);

  /* Doğrulama ve kalan süre ikonlu — kaynak aynı rozet listesi. */
  assert.match(firsat, /const sonGunlerRozeti = rozetler\.find\(\(r\) => r\.id === 'son_gunler'\) \?\? null;/);
  assert.match(kart, /<Clock className="h-4 w-4 shrink-0" aria-hidden \/>/);

  /* Son başvuru künyenin altında, "İncele" sağ altta gerçek bağlantı. */
  assert.match(kart, /\{arsivde \? 'Kapandı' : 'Son başvuru'\}/);
  assert.match(kart, /opportunityReviewLabel\(item\.opportunityType\)/);
});

test('MASAÜSTÜNDE DE İLAN KARTI DÜZENİ', () => {
  /*
    Kullanıcı isteği (17 Eylül 2026): Fırsatlar kartları masaüstünde de
    İlanlar kartları gibi. Üç sütunlu dar ızgara kartı ve onun çip şeridi,
    kime/nerede satırı, iki alanlı künyesi kalktı; bilgiler detay sayfasında.
  */
  const kart = firsat.slice(firsat.indexOf('<article'));
  assert.doesNotMatch(kart, /<dl className=/);
  assert.doesNotMatch(kart, /sm:inline-flex/);
  assert.match(kart, /sm:p-4/);
});

test('İLERLEME ÇUBUĞU YOK; TUTAR VE TARİH GERÇEK KAYITTAN', () => {
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
  assert.match(firsat, /\{arsivde \? 'Kapandı' : 'Son başvuru'\}/);
  /*
    Metin telefondakiyle AYNI kaynaktan geliyor (`opportunityAmount.satir`)
    ve ızgara iki sütun kalıyor. Kaynak tutar açısından henüz kontrol
    edilmediyse alan HİÇ çizilmiyor: bakmadığımız bir sayfa hakkında
    "Belirtilmemiş" demek bir iddia olurdu.
  */
  assert.match(firsat, /\{tutar\.kartSatiri \? ` · \$\{tutar\.kartSatiri\}` : ''\}/);
  /*
    "TAKVİM AÇIKLANMADI" BİR ÇIKARIMDI

    Boş `applicationDeadline`, kurumun takvimi açıklamadığını
    KANITLAMIYOR: kayıt derlenmemiş, kaynak okunamamış ya da tarih
    başka bir alanda olabilir. Doğrulanmamış bir olumsuzlamayı kuruma
    atfetmek yerine okuyucu resmî kaynağa gönderiliyor.
  */
  assert.match(firsat, /Başvuru takvimi için resmî kaynağı kontrol edin/);
});

test('LOGO İLAN KARTIYLA AYNI ÖLÇÜDE', () => {
  /*
    Telefonda logo ilan kartıyla aynı: 72–92 piksel, yuvarlak köşeli kare.
    Geniş ekrandaki dar kartta 40 piksel kaldı. `object-contain`
    CompanyLogo içinde: kare olmayan kurum logoları kırpılmıyor.
  */
  const olcu = '!h-[clamp(72px,21vw,92px)] !w-[clamp(72px,21vw,92px)] !rounded-xl !p-2 !text-2xl';
  assert.ok(firsat.includes(olcu), 'fırsat kartı logo ölçüsü');
  assert.ok(oku('src/components/InternshipCard.tsx').includes(olcu), 'ilan kartı logo ölçüsü');
  assert.match(oku('src/components/CompanyLogo.tsx'), /object-contain/);
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
