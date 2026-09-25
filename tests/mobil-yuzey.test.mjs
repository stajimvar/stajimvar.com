import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  BEŞ EKRAN, TEK YÜZEY

  İlanlar, Fırsatlar, Rehber, Ağım ve Profil telefonda beş ayrı ritimde
  çiziliyordu: kimi listede kartlar gri zeminde yüzen kutulardı (iki
  yanında 16 pikselik şerit, köşelerde yuvarlatma), kimi ızgarada
  hücreler 10 piksel boşlukla ayrılıyordu, akışta ayırıcı 1 pikseldi,
  profil ızgarasında 2. Aynı ürünün beş farklı yüzeyi vardı.

  Telefonda kart KUTU değil YÜZEY: ekranın iki kenarına yaslı, köşesiz,
  gölgesiz; komşusundan 1 pikselik açık gri bir çizgiyle ayrılıyor.
  `sm:` ve üstünde hepsi eski kart düzenine dönüyor — masaüstü
  değişmedi.

  Bu testler o tek yüzeyin yeniden dağılmasını engelliyor. Sınanan şey
  GÖRÜNÜM DEĞİL KAYNAK: değer ortak belirteçte mi duruyor, beş ekran da
  oradan mı okuyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const tokens = oku('src/ui/tokens.ts');

test('yüzey belirteci tek yerde: kenara yaslanma, kabuk ve iç boşluk', () => {
  /*
    Kenar boşluğu KABIN İŞİ. Sayfanın `main` alanı `px-4` taşımaya devam
    ediyor — formlar ve hesap eylemleri ekranın kenarına yapışmamalı;
    yüzey olması gereken liste onu `-mx-4` ile geri alıyor.
  */
  assert.match(tokens, /kap: '-mx-4 sm:mx-0'/);
  /*
    Kabuk telefonda TEK BİR ALT ÇİZGİ: hem kartın nerede bittiğini
    söylüyor hem komşudan ayırıyor. İkisi ayrı ayrı çizilseydi (kart
    kenarlığı + ızgara ayıracı) komşu çizgiler üst üste binip 2 piksel
    olurdu.

    Sıra önemli: Tailwind `sm:` kurallarını taban kuralların ARDINA
    yazıyor, `sm:border` böylece `border-b`yi eziyor.
  */
  assert.match(tokens, /kabuk: 'border-b border-gray-200 sm:rounded-2xl sm:border'/);
  /* Metinde 12–16 piksel, ızgara hücresinde 10–12. */
  assert.match(tokens, /ic: 'px-4 py-3\.5 sm:p-4\.5'/);
  assert.match(tokens, /icDar: 'px-3 py-2\.5'/);
});

test('beş ekran da ortak kabuğu kullanıyor, kendi kutusunu çizmiyor', () => {
  /*
    İLAN KARTI BU LİSTEDEN ÇIKTI (onaylanan tasarım, 15 Eylül 2026)

    Ortak kabuk telefonda tam genişlik + köşesiz + 1 px ayırıcı veriyor.
    Onaylanan ilan tasarımında kartlar her ekranda beyaz, yuvarlak
    köşeli ve kenarlıklı. Token DEĞİŞMEDİ: fırsat ve akış kartları onu
    kullanmaya devam ediyor, kural yalnız ilan kartı için ayrıldı.
    Kartın iç dolgusu hâlâ ortak (`YUZEY.ic`) — ölçüler ayrışmıyor.
  */
  /*
    FIRSAT KARTI DA ÇIKTI (16 Eylül 2026): Fırsatlar telefonda İlanlar'la
    tek tip; kart ilan kartı gibi kendi çerçevesini çiziyor.
  */
  assert.match(
    oku('src/components/OpportunitiesPage.tsx'),
    /rounded-2xl border border-gray-200 bg-white p-4/,
    'fırsat kartı ilan kartıyla aynı çerçeveyi çizmiyor',
  );
  const kaynaklar = [['akış kartı', oku('src/components/sosyal/AkisKarti.tsx')]];
  for (const [ad, kaynak] of kaynaklar) {
    assert.match(kaynak, /YUZEY\.kabuk/, `${ad}: ortak kabuk kullanılmıyor`);
    assert.match(kaynak, /from '(\.\.\/)+ui\/tokens'/, `${ad}: belirteç alınmamış`);
  }

  /*
    Rehber ızgarası kabuğu kartta değil IZGARADA taşıyor: hücreler
    arasındaki çizgi ızgaranın gri zemininin `gap-px` aralıklarından
    görünüyor. Kartın kendi kenarlığı olsaydı iki hücrenin kenarlıkları
    yan yana gelip 2 piksel olurdu.
  */
  const ilanKarti = oku('src/components/InternshipCard.tsx');
  /*
    ÜÇ BÖLÜMLÜ KART (onaylanan tasarım): ince açık gri çerçeve, hafif
    yuvarlak köşe, gölge yok. İç dolgu dar ekranda kademeli daralıyor
    (360 → 390 → 430), bu yüzden ortak `YUZEY.ic` yerine kartın kendisinde.
  */
  /* 25 Eylül 2026: 16 px iç boşluk ve 16 px köşe her genişlikte. */
  assert.match(ilanKarti, /rounded-2xl border border-gray-200 bg-white p-4/, 'ilan kartı kendi çerçevesini çiziyor');
  assert.doesNotMatch(ilanKarti, /shadow-(md|lg|xl)/, 'ağır gölge yok');

  const rehber = oku('src/components/RehberKartlari.tsx');
  assert.match(rehber, /grid-cols-2 gap-px bg-gray-200 sm:gap-4 sm:bg-transparent/);
  assert.match(rehber, /YUZEY\.kap/);

  /* Profil ızgarası da aynı 1 piksel. */
  assert.match(
    oku('src/components/sosyal/PaylasimIzgarasi.tsx'),
    /PAYLASIM_IZGARASI = 'grid grid-cols-3 gap-px'/,
  );
});

test('liste kapları kenara yaslı, kutular değil', () => {
  const ilanlar = oku('src/components/MatchedInternshipsView.tsx');
  const firsatlar = oku('src/components/OpportunitiesPage.tsx');
  /*
    Yalnız KARTLARIN kabı yaslanıyor. "Daha fazla ilan göster" düğmesi ve
    yönlendirme bloğu bu kabın DIŞINDA: onlar liste öğesi değil,
    listeden sonra gelen kontroller — kenara yaslanınca listenin devamı
    gibi okunurlardı.
  */
  /* Kartlar hâlâ kenara yaslı; aralarında 1 px çizgi değil küçük boşluk var. */
  assert.ok(ilanlar.includes('<div className={`flex flex-col gap-1.5 sm:gap-3 ${YUZEY.kap}`}>'));
  assert.match(ilanlar, /hasMoreCountriesPage && <button/);
  /* Fırsatlar da İlanlar gibi: kenara yaslı, kartlar arasında küçük boşluk. */
  assert.match(firsatlar, /flex flex-col gap-1\.5 sm:gap-3 \$\{YUZEY\.kap\} sm:mx-0/);
});

test('akışta ayırıcı kartta duruyor, listede ikinci kez çizilmiyor', () => {
  /*
    Liste `divide-y` taşıyordu; kart ortak kabuğa geçince aynı yere ikinci
    bir çizgi daha düşüyordu. Ayırıcının kartta durması doğrusu: liste
    ekranlarında da öyle.
  */
  const agim = oku('src/components/sosyal/AgimSayfasi.tsx');
  assert.doesNotMatch(agim, /divide-y divide-gray-200/, 'akış listesinde ikinci ayırıcı');
  assert.match(agim, /<div className="sm:space-y-4">/);
});

test('alt bar beş ekranda aynı: tam genişlik, ince üst çizgi, güvenli alan', () => {
  const header = oku('src/components/Header.tsx');
  /*
    Kenarlardan 12 piksel boşluklu, yuvarlak ve gölgeli YÜZEN bir haptı.
    Beş sekmeye 351 piksel kalıyordu; yazı sığmadığı için yalnız seçili
    öğede yazı vardı ve o öğe genişleyip komşularını itiyordu.
  */
  assert.match(header, /lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/);
  assert.doesNotMatch(header, /rounded-full bg-white border border-gray-200 shadow-\[0_10px_30px/);
  /* iPhone'un ana ekran çubuğu: hesaba katılmazsa son sekmenin yazısı altında kalıyor. */
  assert.match(header, /pb-\[max\(0\.25rem,env\(safe-area-inset-bottom\)\)\]/);
  /* Seçiliyi ayıran şey genişlik değil renk: öğeler sekme değişince yer değiştirmiyor. */
  assert.match(header, /const altMenuOgesi = \(secili: boolean\) =>/);
  assert.match(header, /flex min-w-0 flex-1 cursor-pointer flex-col items-center/);
  assert.doesNotMatch(header, /\? 'shrink-0' : 'flex-1'/, 'seçili öğe hâlâ genişliyor');
});

test('her an tek sekme yanıyor: /agim İlanlar sekmesini de yakmıyor', () => {
  /*
    Akışa girildiğinde `activeTab` 'internships' kalıyor ve `ilanlardaMi`
    yalnız sosyal kümeyi dışlıyordu; küme /agim'i saymadığı için alt
    çubukta hem Ağım hem İlanlar yanıyordu.
  */
  const header = oku('src/components/Header.tsx');
  assert.ok(
    header.includes("const sosyaldeMi = /^\\/(agim|cv|profil|topluluklar|baglantilar|takip)(\\/|$)/.test(bulunulanYol);"),
  );
  /*
    /staj-ilanlari da "İlanlar" sekmesini yakıyor (sekme artık oraya
    götürüyor), ama sosyal sayfalar hâlâ SÖNDÜRÜYOR: koşulun ikinci
    yarısı olduğu gibi duruyor.
  */
  assert.match(header, /!sosyaldeMi && !kampustaMi && activeTab === 'internships'/);
  assert.match(header, /const ilanlardaMi =\s+stajIlanlarindaMi \|\|/);
});

test('masaüstü düzeni korunuyor: her yüzey değeri sm ile geri dönüyor', () => {
  /*
    Değişikliklerin TAMAMI telefona bağlı olmalı. `sm:` ve üstünde
    kartlar gri zeminde yüzen kutular ve kartın nerede bittiğini söyleyen
    şey zeminin rengi.
  */
  for (const parca of ["kap: '-mx-4 sm:mx-0'", 'sm:rounded-2xl sm:border', 'sm:p-4.5']) {
    assert.ok(tokens.includes(parca), `belirteçte sm: dalı eksik: ${parca}`);
  }
  const ilan = oku('src/components/InternshipCard.tsx');
  /*
    Kart her genişlikte üç bölüm yan yana: logo (`shrink-0`), bilgiler
    (`min-w-0 flex-1`, uzun ad burada sarıyor), eylemler (`shrink-0`,
    örtünün üstünde). Bilgi logonun altına, "İncele" ayrı satıra inmiyor.
  */
  assert.match(ilan, /<div className="shrink-0" title=\{listing\.companyName\}>/);
  assert.match(ilan, /<div className="min-w-0 flex-1">/);
  /* Kaydet sağ üstte, eylem alt satırda sağda; ikisi de örtünün üstünde. */
  assert.match(ilan, /<div className="relative z-10 -mr-2 -mt-2 shrink-0">/);
  assert.match(ilan, /<div className="relative z-10 shrink-0">/);
});

test('marka telefonda 28 piksel (önce 23)', () => {
  /*
    Telefonda 20, `sm:` üstünde 24 pikseldi. Üst çubuktaki simgeler her
    boyutta 24 piksel; marka onlardan küçük kalınca sayfanın adı,
    yanındaki ikinci derece denetimlerden daha sessiz görünüyordu.

    23 piksel = telefondaki 20'nin %15 üstü. Tailwind'in basamaklarında
    20 ile 24 arasında bir değer yok; bu yüzden açıkça yazılıyor.

    `sm:` DALI DEĞİŞMEDİ. Masaüstünde (`lg:`) 28 piksel: amblem ve nokta
    kaldırılınca marka yalnız kelime oldu ve büyütüldü. Telefonda da
    23'ten 28 piksele çıktı (kullanıcı isteği).

    Akışın kendi başlığı AYNI değeri taşımak zorunda: iki üst çubuk
    birbirinden ayrışmasın diye.
  */
  const logo = oku('src/components/Logo.tsx');
  assert.match(logo, /'text-\[28px\] sm:text-2xl lg:text-\[28px\] tracking-\[-0\.03em\]'/, 'md marka ölçüsü değişmiş');
  assert.doesNotMatch(logo, /text-xl sm:text-2xl/, 'telefondaki eski 20 piksel geri gelmiş');
  /* Yazı karakteri, ağırlık ve renkler aynı kaldı: değişen yalnız punto. */
  assert.match(logo, /font-black/);

  const agim = oku('src/components/sosyal/AgimSayfasi.tsx');
  assert.match(agim, /text-\[28px\] font-black leading-none tracking-\[-0\.03em\][^"]*sm:text-2xl/);
  assert.doesNotMatch(agim, /text-xl font-black[^"]*sm:text-2xl/, 'akış başlığı markadan ayrışmış');
});
