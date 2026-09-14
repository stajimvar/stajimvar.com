import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  DIZIN_ULKESI,
  programOlculduMu,
  baglantiEtiketi,
  dizini,
  isvereniBirlestir,
  programDurumMetni,
  ulkeUygunMu,
  urlDurumMetni,
  uygunIsverenler,
} from '../src/lib/isveren-dizini.mjs';
import { programlariOku, urlKarari } from '../scripts/isveren-kariyer-kontrol.mjs';
import {
  kariyerSayfasiKarari,
  programSayfasiKarari,
  stajBaglantisi,
  yumusak404,
} from '../src/lib/isveren-kanit.mjs';

const oku = (y) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');
const yorumsuz = (m) => m.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

const GOC = oku('supabase/migrations/20261006010000_isveren_kariyer_kontrolleri.sql');
const ISCI = oku('scripts/isveren-kariyer-kontrol.mjs');
const AKIS = oku('.github/workflows/ilan-baglanti-kontrolu.yml');
const VERI = oku('src/data/stajProgramlari.ts');

/* ------------------------------------------------ İKİ AYRI DURUM */

test('HTTP 200 açık program üretmiyor', () => {
  /*
    Bağlantının çalışması ile staj programının açık olması İKİ AYRI
    iddia. 200 dönen bir kariyer sayfası, o an başvuru alındığını
    göstermiyor.
  */
  assert.equal(urlKarari(200), 'calisiyor');
  const karar = kariyerSayfasiKarari('<html><body><h1>Kariyer</h1><p>Bize katıl</p></body></html>');
  assert.equal(karar.durum, 'bilinmiyor');
  assert.equal(karar.kanit, 'kanit-yok');
});

test('GENEL KARİYER SAYFASI TEK BAŞINA "açık" ÜRETEMİYOR', () => {
  /*
    BU TEST SEKİZ ŞİRKETİN YANLIŞ İŞARETLENMESİNİ BAĞLIYOR

    Eski kural "sayfada staj programı ifadesi VAR ve başvuru ifadesi
    VAR" diyordu ve şu gerçek sayfalarda "açık" üretti:

      roketsan    "Tedarik Zinciri Portalı BAŞVURU Kılavuzu"  (tedarikçi)
      is-bankasi  "POS BAŞVURU"                               (banka menüsü)
      kordsa      "iş başvuru platformumuzdur"                 (tüm pozisyonlar)
      vodafone    sayfa başlığı "Kariyer & İş Başvurusu"       (sayfa kromu)
      bilim-ilac  "başvuru sürecinin ardından testler"         (süreç anlatımı)

    Aşağıdaki gövdeler o beş eşleşmenin sadeleştirilmiş hâli. Hiçbiri
    artık "açık" üretmiyor.
  */
  const yanlisEslesmeler = [
    '<p>Yaz staj programımız var.</p><p>Tedarik Zinciri Portalı Başvuru Kılavuzu</p>',
    '<p>MasterClass Staj Programı</p><nav><a href="/pos">POS Başvuru</a></nav>',
    '<p>Kısa Dönem Staj Programı</p><p>iş başvuru platformumuzdur</p>',
    '<title>Kariyer &amp; İş Başvurusu</title><p>Staj programlarımız</p>',
    '<p>Staj Programı</p><p>başvuru sürecinin ardından genel yetenek testleri</p>',
  ];
  for (const govde of yanlisEslesmeler) {
    const k = kariyerSayfasiKarari(govde);
    assert.notEqual(k.durum, 'acik', govde.slice(0, 55));
  }

  /* Birinci adım kararı `acik` DÖNDÜREMEZ — tür olarak bile. */
  const KANIT = oku('src/lib/isveren-kanit.mjs');
  const fnKariyer = KANIT.slice(KANIT.indexOf('export function kariyerSayfasiKarari'));
  assert.ok(!/'acik'/.test(fnKariyer.slice(0, fnKariyer.indexOf('\n}'))), 'birinci adım açık yazmamalı');
});

test('"açık" YALNIZ staj sayfasının kendisinden geliyor', () => {
  /* Genel kariyer sayfası en fazla "staj sayfası şurada" diyor. */
  const birinci = kariyerSayfasiKarari(
    '<p>Staj programımız</p><a href="/kariyer/staj-basvurusu">Staj Başvurusu</a>'
  );
  assert.equal(birinci.durum, 'bilinmiyor');
  assert.equal(birinci.kanit, 'staj-sayfasi-baglantisi');
  assert.equal(birinci.izlenecek, '/kariyer/staj-basvurusu');

  /* İkinci adım: aktif başvuru varsa açık. */
  const ikinci = programSayfasiKarari('<h1>Yaz Stajı</h1><p>Hemen başvur</p>');
  assert.equal(ikinci.durum, 'acik');
  assert.equal(ikinci.kanit, 'staj-sayfasinda-aktif-basvuru');
});

test('genel ilan havuzuna yönlendiren staj sayfası "açık" DEĞİL', () => {
  /*
    Ölçülen gerçek durum: vodafone'un staj sayfasında "Tüm açık
    ilanlarımıza başvurmak için tıklayın" yazıyor. Bu, belirli bir staj
    programının açık olduğunu söylemiyor.
  */
  const k = programSayfasiKarari(
    '<p>Staj programlarımız</p><p>Tüm açık ilanlarımıza başvurmak için tıklayın</p><p>Hemen başvur</p>'
  );
  assert.equal(k.durum, 'bilinmiyor');
  assert.equal(k.kanit, 'genel-ilan-havuzuna-yonlendiriyor');
});

test('HTML yorumundaki başvuru düğmesi aktif sayılmıyor', () => {
  /*
    Ölçüm: borusan'ın sayfasında "Şimdi Başvur" bir HTML yorumunun
    içinde duruyordu (`Detaylı Bilgi Şimdi Başvur -->`). Sayfada
    GÖRÜNMEYEN bir düğmeyi aktif başvuru saymak, tam da kaçınılan hata.
  */
  const k = programSayfasiKarari('<p>Alpha Staj Programı</p><!-- <a>Şimdi Başvur</a> -->');
  assert.equal(k.durum, 'bilinmiyor');
});

test('blog yazısı başvuru yolu sayılmıyor', () => {
  /*
    Ölçüm: vodafone'un tek staj bağlantısı
    "/insan-kaynaklari/blog/staj-basvurusunda-dikkat-edilmesi-gerekenler"
    çıktı — başvuru nasıl yapılır diye ANLATAN bir yazı.
  */
  const bag = stajBaglantisi(
    '<a href="/insan-kaynaklari/blog/staj-basvurusunda-dikkat-edilmesi-gerekenler">Staj Başvurusunda Dikkat Edilmesi Gerekenler</a>'
  );
  assert.equal(bag, null);
});

test('"intern" alt dizesi internet/international yakalamıyor', () => {
  /* `burs`/Bursa ve `maas`/Maastricht hataları burada tekrarlamıyor. */
  assert.equal(stajBaglantisi('<a href="/internet-basvuru">İnternet başvurusu</a>'), null);
  assert.equal(stajBaglantisi('<a href="/international-apply">International apply</a>'), null);
});

test('YUMUŞAK 404 bozuk sayılıyor', () => {
  /*
    Ölçüm: tupras, tusas ve yildiz-holding kariyer adreslerinden 404
    sayfasına yönlendi ve sunucu HTTP 200 döndü. Eski kural bunu
    "çalışıyor" yazıyordu — kartta çalışan bir adres gösterip öğrenciyi
    boş sayfaya göndermek bozuk bağlantıdan farksız.
  */
  assert.match(yumusak404('https://www.tupras.com.tr/tr/404', '<p>x</p>'), /404/);
  assert.match(yumusak404('https://x.example/kariyer', '<title>404 — Sayfa bulunamadı</title>'), /404/);
  assert.equal(yumusak404('https://x.example/kariyer', '<title>Kariyer</title>'), null);

  /* İşçi bunu bağlantı durumuna GERÇEKTEN uyguluyor. */
  const kod = yorumsuz(ISCI);
  assert.match(kod, /const gercekUrlDurumu = sahte404 \? 'bozuk' : urlDurumu/);
  assert.match(kod, /url_durumu: gercekUrlDurumu/);
});

test('açık kapanış kanıtı Kapalı üretiyor', () => {
  for (const govde of [
    '<p>Staj programı başvurularımız kapandı.</p>',
    '<p>Başvuru dönemi sona erdi</p>',
    '<p>Applications are closed for our internship program</p>',
    '<p>Son başvuru tarihi geçti</p>',
  ]) {
    const k = kariyerSayfasiKarari(govde);
    assert.equal(k.durum, 'kapali', govde);
    assert.equal(k.kanit, 'basvuru-kapandi-ifadesi');
  }
  /*
    KAPANIŞ ÖNCE BAKILIYOR: "başvurularımız kapandı" cümlesi içinde
    "başvuru" da geçiyor ve başvuru yolu kalıbı onu aktif bir yol
    sanardı.
  */
  const KANIT = oku('src/lib/isveren-kanit.mjs');
  const fn = KANIT.slice(KANIT.indexOf('export function kariyerSayfasiKarari'));
  assert.ok(
    fn.indexOf('KAPANIS_IZI.test') < fn.indexOf('stajBaglantisi('),
    'kapanış kontrolü önce olmalı'
  );
});

test('403/429/5xx ve zaman aşımı program durumunu bozmuyor', () => {
  assert.equal(urlKarari(403), 'gecici_hata');
  assert.equal(urlKarari(429), 'gecici_hata');
  assert.equal(urlKarari(503), 'gecici_hata');
  assert.equal(urlKarari(404), 'bozuk');
  assert.equal(urlKarari(410), 'bozuk');

  /*
    Program alanlarına yalnız `calisiyor` dalında dokunuluyor; geçici
    hatada mevcut karar ve kanıt aynen taşınıyor.
  */
  const kod = yorumsuz(ISCI);
  assert.match(kod, /if \(gercekUrlDurumu === 'calisiyor'\) \{/);
  const hazir = kod.slice(kod.indexOf('const eskiKararGuvenilir'), kod.indexOf('let sahte404'));
  /*
    Korunan karar GÜVENİLİRSE taşınıyor. Adressiz bir "acik" korunmuyor
    — o karar yalnız eski kuraldan gelebilir (ayrı testte ölçülüyor).
  */
  assert.match(hazir, /program_durumu: eskiKararGuvenilir \? \(eski\?\.program_durumu \?\? null\) : null/);
  /* Zaman aşımı 0 durum kodu üretiyor ve geçici sayılıyor. */
  assert.match(kod, /cevap\.durum === 0 \? 'gecici_hata' : urlKarari\(cevap\.durum\)/);
});

test('BELİRSİZ SONUÇ ESKİ "açık" KARARINI ARTIK KORUMUYOR', () => {
  /*
    Eskiden koruyordu: `if (karar.durum === 'bilinmiyor' && eski?.program_durumu)`
    dalı eski kararı aynen geri yazıyordu. Bu, bir kez YANLIŞ ölçülen
    sekiz şirketin "açık" kalmasını kalıcı hâle getiriyordu — yeni
    kanıt bulunamaması eski kararı silmiyordu. Kanıtın kaybolması da
    bir bulgudur.
  */
  const kod = yorumsuz(ISCI);
  assert.ok(
    !/karar\.durum === 'bilinmiyor' && eski\?\.program_durumu/.test(kod),
    'yapışkan açık kararı kaldırılmalı'
  );
  assert.match(kod, /program_durumu: karar\.durum/);
});

test('program adresi YALNIZ kanıtlı açık programda saklanıyor', () => {
  const kod = yorumsuz(ISCI);
  assert.match(kod, /if \(karar\.durum === 'acik'\) programAdresi = hedef/);
  /* Genel kariyer adresi buraya YAZILMIYOR. */
  assert.ok(!/programAdresi = guvenli/.test(kod));
});

test('URL durumu ile program durumu ayrı kolonlarda', () => {
  assert.match(GOC, /create type public\.isveren_url_durumu as enum \(\s*'calisiyor',\s*'gecici_hata',\s*'bozuk'\s*\)/);
  assert.match(GOC, /create type public\.isveren_program_durumu as enum \(\s*'acik',\s*'kapali',\s*'bilinmiyor'\s*\)/);
  for (const kolon of [
    'url_durumu',
    'url_denendi_at',
    'url_basarili_at',
    'url_hata',
    'program_durumu',
    'program_kaniti',
    'program_kontrol_at',
  ]) {
    assert.ok(GOC.includes(kolon), `${kolon} kolonu olmalı`);
  }
  /*
    Son deneme ile son BAŞARILI kontrol ayrı; başarısızda korunuyor.
    Karşılaştırma `gercekUrlDurumu` ile: yumuşak 404 alan bir adres
    HTTP 200 dönse bile başarılı sayılmamalı.
  */
  assert.match(
    ISCI,
    /gercekUrlDurumu === 'calisiyor' \? simdi : \(eski\?\.url_basarili_at \?\? null\)/
  );
  /* Program adresi kolonu da göçte olmalı. */
  const GOC_URL = oku('supabase/migrations/20261007010000_isveren_program_adresi.sql');
  assert.match(GOC_URL, /add column if not exists program_url text/);
});

/* --------------------------------------- EDİTORYAL / ÖLÇÜM AYRIMI */

test('işçi editoryal kaynak dosyayı YAZMIYOR', () => {
  /*
    Eski betik (`isveren-baglanti-kontrol.mjs`) çıktısını doğrudan
    `src/data/stajProgramlari.ts` içine yazıyordu: her günlük ölçüm
    editoryal kaynağı değiştiriyor ve insan yazısıyla makine çıktısı
    aynı diff'e giriyordu.
  */
  const kod = yorumsuz(ISCI);
  assert.ok(!/writeFileSync/.test(kod), 'işçi dosya yazmamalı');
  assert.match(kod, /from\('employer_career_checks'\)/);
  /* Liste kaynağı hâlâ editoryal dosya: ikinci dizin yok. */
  assert.match(kod, /readFileSync\(VERI/);
  assert.equal(programlariOku(VERI).length, 44, 'dizin 44 kayıt');
});

test('kontrol idempotent: upsert, anahtar slug', () => {
  assert.match(ISCI, /\.upsert\(/);
  assert.match(ISCI, /\{ onConflict: 'slug' \}/);
  assert.match(GOC, /slug text primary key/);
});

test('istemci ölçüm yazamıyor, okuyabiliyor', () => {
  assert.match(GOC, /alter table public\.employer_career_checks enable row level security/);
  const politikalar = [
    ...GOC.matchAll(/create policy "[^"]+" on public\.employer_career_checks\s+for (\w+)/g),
  ].map((m) => m[1]);
  assert.deepEqual([...new Set(politikalar)], ['select'], 'yalnız okuma politikası');
  const tipler = oku('src/lib/database.types.ts');
  const blok = tipler.slice(tipler.indexOf('employer_career_checks: {'));
  assert.match(blok.slice(0, 1600), /Insert: Record<string, never>/);
});

test('işçi mevcut altyapıda, ikinci zamanlama yok', () => {
  assert.match(AKIS, /run: node scripts\/isveren-kariyer-kontrol\.mjs/);
  /* Tek cron: ilan kontrolüyle aynı iş akışı. */
  assert.equal((AKIS.match(/cron:/g) || []).length, 1);
  /* Bir ölçümün düşmesi ötekini durdurmuyor. */
  assert.match(AKIS, /if: always\(\)/);
});

test('güvenli URL kuralları ve sınırlı eşzamanlılık', () => {
  assert.match(ISCI, /from '\.\.\/src\/lib\/guvenli-url\.mjs'/);
  assert.match(ISCI, /const guvenli = guvenliDisAdres\(kayit\.adres\)/);
  assert.match(ISCI, /const ESZAMANLI = 4/);
  assert.match(ISCI, /AbortSignal\.timeout\(ZAMAN_ASIMI_MS\)/);
  /* Engel aşılmıyor: tek User-Agent, başka yol denenmiyor. */
  assert.equal((ISCI.match(/'User-Agent'/g) || []).length, 1);
});

test('hata nedeni güvenli: sayfa içeriği ve kişisel veri yok', () => {
  const kod = yorumsuz(ISCI);
  /* Kaydedilen şey durum kodu ya da kısa ağ hatası. */
  assert.match(kod, /`HTTP \$\{cevap\.durum\}`/);
  assert.match(kod, /\.slice\(0, 120\)/);
  /* Gövde hiçbir yere yazılmıyor. */
  assert.ok(!/govde: cevap\.govde/.test(kod));
  assert.ok(!/program_kaniti: metin/.test(kod), 'kanıt türü saklanıyor, içerik değil');
  /*
    Kanıt türleri sabit etiketler ve artık `src/lib/isveren-kanit.mjs`
    içinde. Etiket kümesi değişti çünkü kural değişti: eski
    'staj-programi-ve-basvuru-yolu' etiketi sekiz şirketi yanlış yere
    "açık" yapan kuralın adıydı.
  */
  const KANIT = oku('src/lib/isveren-kanit.mjs');
  for (const etiket of [
    'staj-sayfasi-baglantisi',
    'staj-sayfasinda-aktif-basvuru',
    'staj-sayfasinda-aktif-basvuru-yok',
    'genel-ilan-havuzuna-yonlendiriyor',
    'genel-kariyer-sayfasi',
    'basvuru-kapandi-ifadesi',
    'kanit-yok',
  ]) {
    assert.ok(KANIT.includes(etiket), `${etiket} kanıt türü olmalı`);
  }
  /* Eski yanlış kuralın etiketi hiçbir yerde kalmadı. */
  assert.ok(!KANIT.includes('staj-programi-ve-basvuru-yolu'));
});

/* ------------------------------------------- TEK VERİ SÖZLEŞMESİ */

const PROGRAM = {
  slug: 'a',
  isveren: 'A Holding',
  sektor: 'Holding',
  kariyerUrl: 'https://a.example/kariyer',
  ozet: 'özet',
  bolumler: ['bilgisayar-muhendisligi'],
};

test('editoryal bilgi ile ölçüm tek sözleşmede birleşiyor', () => {
  const birlesik = isvereniBirlestir(
    PROGRAM,
    {
      slug: 'a',
      url_durumu: 'calisiyor',
      url_denendi_at: '2026-09-14T10:00:00Z',
      url_basarili_at: '2026-09-14T10:00:00Z',
      url_hata: null,
      program_durumu: 'acik',
      program_kaniti: 'staj-sayfasinda-aktif-basvuru',
      program_kontrol_at: '2026-09-14T10:00:00Z',
      /*
        `acik` kararı ARTIK ADRESİYLE BİRLİKTE anlam taşıyor: adressiz
        bir "acik" eski kuraldan kalmış sayılıyor ve `bilinmiyor`a
        indiriliyor. Fixture da gerçek kuralı yansıtıyor.
      */
      program_url: 'https://a.example/staj-basvuru',
    },
    { slug: 'a', logo_url: 'https://cdn.example/a.png' }
  );
  assert.equal(birlesik.isveren, 'A Holding');
  assert.equal(birlesik.urlDurumu, 'calisiyor');
  assert.equal(birlesik.programDurumu, 'acik');
  assert.equal(birlesik.programUrl, 'https://a.example/staj-basvuru');
  assert.equal(birlesik.logoUrl, 'https://cdn.example/a.png');
  assert.equal(birlesik.ulke, DIZIN_ULKESI);

  /*
    ÖLÇÜM YOKSA `null` — 'bilinmiyor' DEĞİL

    Eskiden `?? 'bilinmiyor'` yazıyordu: hiç kontrol edilmemiş şirketi
    "baktık, bulamadık" gibi gösteriyordu. İkisi ayrı durum ve arayüzde
    ayrı cümle.
  */
  const olcumsuz = isvereniBirlestir(PROGRAM, undefined, undefined);
  assert.equal(olcumsuz.programDurumu, null);
  assert.equal(olcumsuz.olculdu, false);
  assert.equal(programOlculduMu(olcumsuz.programDurumu), false);
  assert.equal(programOlculduMu('bilinmiyor'), true);
  assert.equal(olcumsuz.logoUrl, null);
  /* Program adresi de uydurulmuyor. */
  assert.equal(olcumsuz.programUrl, null);
  /* Belge / ücret / sigorta kaynakta yoksa boş — üretilmiyor. */
  assert.deepEqual(olcumsuz.gerekliBelgeler, []);
  assert.equal(olcumsuz.ucretSigortaNotu, null);
  assert.equal(olcumsuz.genelBasvuruDonemi, null);
});

test('tek toplu okuma: kart başına sorgu yok', () => {
  const d = dizini([PROGRAM], [{ slug: 'a', program_durumu: 'kapali' }], []);
  assert.equal(d.length, 1);
  assert.equal(d[0].programDurumu, 'kapali');
  /*
    TOPLU OKUMA ORTAK MODÜLDE VE TEK KOPYA

    Sorgu bir ara İKİ yerdeydi: `src/lib/queries/index.ts` ve bu modül.
    Oradaki hiç çağrılmıyordu, önbelleği yoktu ve `program_url`
    kolonunu seçmiyordu; yani "Açık programı incele" kararını
    veremezdi. Kaldırıldı.
  */
  const MODUL = oku('src/lib/isveren-dizini.mjs');
  assert.match(MODUL, /export async function fetchIsverenKontrolleri/);
  /*
    TEK TOPLU OKUMA — YEDEK DENEME DAHİL EN FAZLA İKİ

    İki `.from()` var ve ikincisi YALNIZ hata dalında: `program_url`
    kolonu göç uygulanmadan istenince PostgREST bütün sorguyu 42703 ile
    düşürüyordu ve 44 satırın hepsi kayboluyordu. Yedek, eski kolon
    kümesiyle bir kez daha deniyor.

    Değişmez olan şey "tek sorgu" değil, KART BAŞINA SORGU OLMAMASI:
    aşağıdaki denetim tek kayıt çeken kalıpları yasaklıyor.
  */
  const okumalar = (MODUL.match(/\.from\('employer_career_checks'\)/g) ?? []).length;
  assert.ok(okumalar >= 1 && okumalar <= 2, `en fazla iki okuma, bulunan: ${okumalar}`);
  assert.ok(!/\.eq\('slug'/.test(MODUL), 'tek kayıt çeken sorgu olmamalı');
  assert.ok(!/\.in\(/.test(MODUL), 'slug listesiyle sorgu olmamalı');
  /* Yedek gerçekten hata dalında: `if (!error) return` ondan ÖNCE. */
  assert.ok(
    MODUL.indexOf('if (!error) return') < MODUL.indexOf('const yedek ='),
    'yedek yalnız hata dalında olmalı'
  );
  /* Program adresi kolonu SEÇİLİYOR: yoksa kart etiketi hep genel kalır. */
  assert.match(MODUL, /program_url/);
  /* Önbellek var: her ziyaretçide ağır sorgu koşmuyor. */
  assert.match(MODUL, /KONTROL_ONBELLEK_MS/);

  const SORGU = oku('src/lib/queries/index.ts');
  assert.ok(
    !/export async function fetchIsverenKontrolleri/.test(SORGU),
    'ikinci kopya kaldırılmalı'
  );
});

test('metinler: açık ilan ya da başvur demiyor', () => {
  assert.equal(programDurumMetni('acik'), 'Staj programı açık');
  assert.equal(programDurumMetni('kapali'), 'Staj programı kapalı');
  assert.equal(programDurumMetni('bilinmiyor'), 'Güncel açık program doğrulanamadı');
  /*
    ÖLÇÜLMEDİ AYRI CÜMLE

    `null` = sayfasına hiç bakamadık (403, ağ hatası, yumuşak 404).
    Ölçülen durum: 44 şirketin 6'sı böyle. Bunu "doğrulanamadı" diye
    yazmak, bakmadığımız yerde bakmış gibi görünmek olurdu.
  */
  assert.equal(programDurumMetni(null), 'Henüz kontrol edilmedi');
  assert.equal(urlDurumMetni('calisiyor'), 'Bağlantı çalışıyor');
  assert.equal(urlDurumMetni('gecici_hata'), 'Geçici olarak erişilemedi');
  assert.equal(urlDurumMetni('bozuk'), 'Bağlantı bozuk');
  assert.equal(urlDurumMetni(null), null);
  /* Genel sayfa etiketi: "Başvur" ya da "Açık ilan" DEĞİL. */
  const genel = baglantiEtiketi({ kariyerUrl: 'https://a.example/kariyer' });
  assert.equal(genel.tur, 'kariyer');
  assert.equal(genel.etiket, 'Şirketin kariyer sayfası');
  assert.equal(genel.adres, 'https://a.example/kariyer');

  /*
    "Açık programı incele" YALNIZ İKİ KOŞUL BİRLİKTE

    Durum `acik` VE programın kendi adresi var. Biri eksikse etiket
    genel kariyer sayfasına düşüyor: "Programa başvur" yazıp öğrenciyi
    kurumsal bir sayfaya göndermek, tam olarak kaçınılan şey.
  */
  const kanitli = baglantiEtiketi({
    programDurumu: 'acik',
    programUrl: 'https://a.example/staj-basvuru',
    kariyerUrl: 'https://a.example/kariyer',
  });
  assert.equal(kanitli.tur, 'program');
  assert.equal(kanitli.etiket, 'Açık programı incele');
  assert.equal(kanitli.adres, 'https://a.example/staj-basvuru');

  const adressiz = baglantiEtiketi({
    programDurumu: 'acik',
    programUrl: null,
    kariyerUrl: 'https://a.example/kariyer',
  });
  assert.equal(adressiz.tur, 'kariyer');
  assert.equal(adressiz.etiket, 'Şirketin kariyer sayfası');

  /* BOZUK ADRESTE AKTİF BAĞLANTI YOK. */
  const bozuk = baglantiEtiketi({
    urlDurumu: 'bozuk',
    kariyerUrl: 'https://a.example/kariyer',
  });
  assert.equal(bozuk.tur, 'yok');
  assert.equal(bozuk.adres, null);

  const MODUL = oku('src/lib/isveren-dizini.mjs');
  const kod = yorumsuz(MODUL);
  /* Modül hiçbir yerde "Başvur" ya da "Açık ilan" demiyor. */
  assert.ok(!/Ba[şs]vur\b/.test(kod), 'modül "Başvur" demiyor');
  assert.ok(!kod.includes('Açık ilan'), 'modül "Açık ilan" demiyor');

  /* Kartta bozuk adreste düğme yerine açıklama var. */
  const KART = oku('src/components/StajProgramlari.tsx');
  assert.match(KART, /baglanti\.tur === 'yok'/);
  assert.match(KART, /Bağlantı bozuk/);
  /*
    YORUMSUZ KODA bakıyor: dosyada eski etiketin NEDEN kaldırıldığını
    anlatan bir yorum var ve düz `includes` onu da yakalıyordu (bu
    denetim bir kez o yüzden kırmızı döndü).
  */
  assert.ok(
    !yorumsuz(KART).includes('Resmî başvuru sayfası'),
    'sabit "başvuru sayfası" etiketi kalmamalı'
  );
});

test('ülke ve bölüm uygunluğu korunuyor', () => {
  const d = dizini([PROGRAM], [], []);
  assert.equal(ulkeUygunMu('all'), true);
  assert.equal(ulkeUygunMu('TR'), true);
  assert.equal(ulkeUygunMu('FR'), false);
  assert.equal(ulkeUygunMu('remote'), false);
  assert.deepEqual(uygunIsverenler(d, { country: 'FR' }), []);
  assert.equal(uygunIsverenler(d, { country: 'TR' }).length, 1);
  /* TAM slug eşleşmesi: alt dize değil. */
  assert.equal(
    uygunIsverenler(d, { country: 'all', departments: ['bilgisayar-muhendisligi'] }).length,
    1
  );
  assert.equal(uygunIsverenler(d, { country: 'all', departments: ['bilgisayar'] }).length, 0);
  assert.equal(uygunIsverenler(d, { country: 'all', departments: ['hukuk'] }).length, 0);
});

test('genel başvuru dönemi eski dönem tarihi gibi sunulmuyor', () => {
  const MODUL = oku('src/lib/isveren-dizini.mjs');
  /* Alan adı bilerek "genel": güncel dönemin tarihi değil. */
  assert.match(MODUL, /genelBasvuruDonemi/);
  assert.match(MODUL, /GENEL BAŞVURU DÖNEMİ — GEÇMİŞ DÖNEMLERDEN TÜRETİLMİŞ/);
  /* Editoryal dosyada uydurma dönem yok: hiçbir kayıtta alan dolu değil. */
  assert.ok(!/genelBasvuruDonemi/.test(VERI), 'kaynakta doğrulanmamış dönem yazılmamış');
});

test('ADRESSİZ "acik" GÜVENİLMEZ: eski kuraldan kalmış demek', () => {
  /*
    ÖLÇÜLDÜ VE GERÇEKTEN OLDU

    Sekiz yanlış kaydı düzeltmek için koşan işçi tupras'ın adresini
    `bozuk` (yumuşak 404) buldu. Program alanlarına yalnız `calisiyor`
    dalında dokunulduğu için satır ESKİ kuralın "acik" kararıyla kaldı —
    hem de eski kuralın kanıt etiketiyle.

    "Geçici hata kararı bozmuyor" kuralı doğru ama korunan değerin
    YANLIŞ olabileceği durumu kapsamıyordu. Yeni kuralda `acik` tanımı
    gereği programın kendi adresiyle yazılıyor; adressiz `acik` yalnız
    eski kuraldan gelebilir.
  */
  const p = { slug: 'a', isveren: 'A Holding', kariyerUrl: 'https://a.example/kariyer', bolumler: [] };

  const adressiz = isvereniBirlestir(
    p,
    { slug: 'a', program_durumu: 'acik', program_url: null, url_durumu: 'bozuk' },
    undefined
  );
  assert.equal(adressiz.programDurumu, 'bilinmiyor', 'adressiz acik kabul edilmemeli');
  /* Bozuk adreste aktif bağlantı da yok. */
  assert.equal(baglantiEtiketi(adressiz).tur, 'yok');

  const adresli = isvereniBirlestir(
    p,
    {
      slug: 'a',
      program_durumu: 'acik',
      program_url: 'https://a.example/staj',
      url_durumu: 'calisiyor',
    },
    undefined
  );
  assert.equal(adresli.programDurumu, 'acik');
  assert.equal(baglantiEtiketi(adresli).etiket, 'Açık programı incele');

  /* İşçi de aynı kararı veriyor: adressiz acik korunmuyor. */
  const kod = yorumsuz(ISCI);
  assert.match(kod, /const eskiKararGuvenilir = !\(eski\?\.program_durumu === 'acik' && !eski\?\.program_url\)/);
  assert.match(kod, /adressiz-acik-karari-dusuruldu/);
});
