import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  TAKİP ARAYÜZÜ — ŞİRKET SAYFASINDA "TAKİP ET", SAYAÇLAR, İKİ AĞIM (18 Eylül 2026)

  Karar: öğrenci şirketi takip eder; öğrencide "takip" sayacı açılır;
  şirket Ağım'da takipçilerini görür. Takip TEK YÖNLÜ: hedef hep şirket
  sayfası (RLS `takip_edilebilir`); şirket→öğrenci düğmesi hiçbir yerde
  çizilmiyor.

  Bileşenler oturum ve Supabase istiyor, jsdom yok; iddialar kaynak
  üzerinden. Tarayıcı ölçümü gerçek yerel oturumla Playwright'ta yapıldı
  (390 / 1280): takip bırak → DB satırı 0, sayaç 1→0; yeniden takip →
  1; /cv takip=1; öğrenci /agim satırı → /profil/ogulsize; şirket /agim
  takipçi satırı; şirketin kendi sayfasında ve öğrenci profilinde
  düğme 0; konsol 0 hata; scrollWidth = innerWidth.
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const kod = (m) => m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const SOSYAL = oku('src/lib/queries/sosyal.ts');
const TIPLER = oku('src/lib/database.types.ts');
const GOC = oku('supabase/migrations/20261015010000_takip_sayaclari_ve_listeleri.sql');
const DUGME = oku('src/components/sosyal/TakipDugmesi.tsx');
const LISTE = oku('src/components/sosyal/TakipListesi.tsx');
const SIRKET_SAYFASI = oku('src/sirket/SirketSayfasi.tsx');
const SIRKET_GORUNUM = oku('src/sirket/SirketProfilGorunumu.tsx');
const SIRKET_AGIM = oku('src/sirket/SirketAgim.tsx');
const OGRENCI_AGIM = oku('src/components/sosyal/AgimSayfasi.tsx');
const OGRENCI_GORUNUM = oku('src/components/sosyal/SosyalProfilGorunumu.tsx');
const PROFIL_BASLIGI = oku('src/components/ProfilBasligi.tsx');
const BAGLANTI_DUGMESI = oku('src/components/sosyal/BaglantiDugmesi.tsx');
const APP = oku('src/App.tsx');

test('veri katmanı göçle birebir: sayaç satırı 4 sütun, iki liste RPC, insert/delete doğrudan tabloya', () => {
  /* Göçün dönüş satırı ile istemci tipi aynı dört ad. */
  assert.match(GOC, /returns table \(paylasim integer, baglanti integer, takipci integer, takip integer\)/);
  assert.match(SOSYAL, /export interface SosyalSayaclar \{\s*paylasim: number;\s*baglanti: number;[\s\S]*?takipci: number;[\s\S]*?takip: number;\s*\}/);
  assert.match(SOSYAL, /takipci: Number\(satir\.takipci \?\? 0\),\s*takip: Number\(satir\.takip \?\? 0\),/);
  assert.match(TIPLER, /sosyal_sayaclar: \{\s*Args: \{ hedef: string \};\s*Returns: \{ paylasim: number; baglanti: number; takipci: number; takip: number \}\[\];/);

  /* Liste RPC'leri: hedef parametresi YOK — yalnız çağıranın listesi. */
  for (const ad of ['takipcilerim', 'takip_ettiklerim']) {
    assert.match(GOC, new RegExp(`create or replace function public\\.${ad}\\(p_limit integer default 50, p_offset integer default 0\\)`));
    assert.match(TIPLER, new RegExp(`${ad}: \\{\\s*Args: \\{ p_limit\\?: number; p_offset\\?: number \\};`));
    assert.match(SOSYAL, new RegExp(`db\\.rpc\\('${ad}', \\{ p_limit: limit, p_offset: offset \\}\\)`));
  }
  assert.doesNotMatch(kod(SOSYAL), /takipcilerim'.*hedef|takip_ettiklerim'.*hedef/);
  assert.match(SOSYAL, /export const TAKIP_SAYFA_BOYU = 50;/);

  /* Eylemler: kendi kimliğiyle insert, kendi satırını delete; sıfır satır silme "bıraktın" demiyor. */
  assert.match(SOSYAL, /db\.from\('takipler'\)\.insert\(\{ takipci_id: kullaniciId, hedef_id: hedefId \}\)/);
  assert.match(SOSYAL, /\.from\('takipler'\)\s*\.delete\(\)\s*\.eq\('takipci_id', kullaniciId\)\s*\.eq\('hedef_id', hedefId\)\s*\.select\('hedef_id'\)/);
  assert.match(SOSYAL, /Takip bırakılamadı; kayıt değişmedi\./);
  assert.match(SOSYAL, /db\.rpc\('takip_ediyor_muyum', \{ hedef: hedefId \}\)/);
  /* `takipci_sayisi` istemciden artık çağrılmıyor: aynı sayı tek RPC satırında. */
  assert.doesNotMatch(kod(SOSYAL), /takipci_sayisi|takipciSayisiGetir/);
});

test('takip düğmesi: iki durum, iyimser güncelleme + geri alma, onay yok, "Bağlantı kur" ölçüsü', () => {
  assert.match(DUGME, /\{takipEdiyor \? 'Takip ediliyor' : 'Takip et'\}/);
  assert.match(DUGME, /aria-pressed=\{takipEdiyor === true\}/);
  /* İyimser: önce ekran ve sayaç, sonra sunucu; hata dalında ikisi de geri. */
  assert.match(DUGME, /setTakipEdiyor\(yeni\);\s*onTakipciFarki\(yeni \? 1 : -1\);\s*try \{/);
  assert.match(DUGME, /catch \(sorun\) \{\s*setTakipEdiyor\(onceki\);\s*onTakipciFarki\(yeni \? -1 : 1\);/);
  assert.match(DUGME, /role="alert"/);
  /* Onay penceresi yok: bırakma tek dokunuş. */
  assert.doesNotMatch(kod(DUGME), /confirm\(|BaglantiKaldirMenusu|Emin misin/);
  /*
    Ölçü "Bağlantı kur" ile aynı kalıp; iki durum aynı yükseklikte.

    24 EYLÜL 2026 — HAP BİÇİMİ (kullanıcı onayı): eski şart "iki düğme de
    `BIRINCIL_EYLEM` (min-h-12, rounded-xl), takip düğmesinin ikincili
    kendi `min-h-12` dizesi" idi. Düğmeler profil başlığının hap sırasına
    girince öteki haplarla ayrışıyordu. Yeni şart: biçim
    `ProfilKimlikKalibi`nin HAP / HAP_BIRINCIL dizelerinden (yerel kopya
    yok), eylem çağrısı dolu, durum çerçeveli. ÖLÇÜLEN ŞEY AYNI: iki düğme
    aynı kalıpta ve iki durum aynı yükseklikte (ikisi de `min-h-11`).
  */
  assert.match(BAGLANTI_DUGMESI, /className=\{DOLU\}\s*>\s*\{islemde \? 'Gönderiliyor…' : 'Bağlantı kur'\}/);
  assert.match(BAGLANTI_DUGMESI, /const DOLU = `\$\{HAP_BIRINCIL\} /);
  assert.match(DUGME, /className=\{takipEdiyor \? CERCEVELI : DOLU\}/);
  assert.match(DUGME, /const DOLU = `\$\{HAP_BIRINCIL\} /);
  assert.match(DUGME, /const CERCEVELI = `\$\{HAP\} /);
  for (const k of [DUGME, BAGLANTI_DUGMESI]) {
    /*
      24 Eylül 2026 (X mobil kalıbı): iki düğme ziyaretçi eylem satırının
      hücresi; hücre sınıfları da aynı modülden (YARIM_HUCRE / TAM_HUCRE).
      Şart aynı: biçim kalıptan, yerel kopya yok.
    */
    assert.match(k, /import \{ HAP, HAP_BIRINCIL, TAM_HUCRE, YARIM_HUCRE \} from '\.\/ProfilKimlikKalibi';/);
    assert.doesNotMatch(kod(k), /BIRINCIL_EYLEM|min-h-12|rounded-xl/);
  }
  /* Yükleniyor / hata / hazır üç ayrı dal. */
  assert.match(DUGME, /if \(durum === 'yukleniyor'\)/);
  assert.match(DUGME, /Takip durumu alınamadı\./);
});

test('şirket sayfası: düğme yalnız ziyaretçiye ve sahibe değil; sayaç dokunuşta değişiyor; sahip kabı yuvaya dokunmuyor', () => {
  assert.match(SIRKET_SAYFASI, /bakanId && bakanId !== profil\.profilId \? \(\s*<TakipDugmesi/);
  assert.match(SIRKET_SAYFASI, /onTakipciFarki=\{\(fark\) => setTakipciFarki\(\(f\) => f \+ fark\)\}/);
  assert.match(SIRKET_SAYFASI, /deger: Math\.max\(0, takipciSayaci\.deger \+ takipciFarki\)/);
  /* Sunucu değeri yenilenince fark sıfırlanıyor: iki kaynak üst üste sayılmıyor. */
  assert.match(SIRKET_SAYFASI, /React\.useEffect\(\(\) => setTakipciFarki\(0\), \[takipciSayaci\]\);/);
  assert.match(SIRKET_GORUNUM, /\{!sahip && ziyaretciEylemi && \(/);
  assert.doesNotMatch(kod(SIRKET_GORUNUM), /TakipDugmesi|takipEt\(/);
  assert.doesNotMatch(kod(oku('src/sirket/SirketProfili.tsx')), /ziyaretciEylemi|TakipDugmesi/);
});

test('öğrenci profili: "takip" sayacı sahipte ve ziyaretçide, üç eşit sütun, ayraç yok; düğme yok', () => {
  assert.match(PROFIL_BASLIGI, /deger=\{satir\.sayaclar\.takip\}\s*etiket="takip"/);
  /*
    19 Eylül 2026: şerit telefonda fotoğrafın yanına taşındı (1. satır,
    2. sütun) ve `border-y` kalktı — tam genişlikte kendi bandı değil
    artık. Ziyaretçi görünümündeki şerit (OGRENCI_GORUNUM) kendi
    ekranında tam genişlikte kaldığı için orada çizgiler duruyor.
  */
  /*
    20 EYLÜL 2026: o yerleşim kalktı. Kullanıcı bütün profil
    görüntülerinin şirket kalıbında olmasını istedi; `/cv` şeridi de tam
    genişliğe, kimlik bandının altına indi ve ayırıcısı şirketteki
    `border-t border-gray-100 pt-3` oldu. ÜÇ EŞİT SÜTUN VE AYRAÇSIZLIK
    DEĞİŞMEDİ — testin ölçtüğü şey buydu.
  */
  /*
    24 EYLÜL 2026 (X kalıbı, kullanıcı kararı): şerit tek satır, satır
    içi sayaç oldu — "6 paylaşım  3 bağlantı  1 takip", sayı kalın.
    Üç eşit sütunlu ızgara ve `border-t` X'te yok, kalktı. AYRAÇSIZLIK
    DEĞİŞMEDİ; sütun eşitliği artık bir şart değil (satır içi öğeler
    kendi genişliğinde).
  */
  assert.match(PROFIL_BASLIGI, /<div className=\{SAYAC_SATIRI\}/);
  assert.doesNotMatch(PROFIL_BASLIGI, /grid-cols-3 border-t/);
  /*
    Etiket küçük harf (kullanıcı kararı, 20 Eylül 2026): üç profil
    ekranı aynı yazımı paylaşıyor. `/cv` ve şirket zaten küçük harfle
    yazıyordu; ziyaretçi profili tek ayrık ekrandı.
  */
  assert.match(OGRENCI_GORUNUM, /<Sayac etiket="takip" deger=\{sayaclar\.takip\} \/>/);
  /*
    20 Eylül 2026: öğrenci profili şirket profilinin düzen kalıbına
    geçti (kullanıcı isteği). Sayaç sütunu ve dolayısıyla `lg:border-y-0
    lg:py-0` iptalleri kalktı; şerit şirkettekiyle aynı ayırıcıyı
    kullanıyor. ÜÇ EŞİT SÜTUN VE AYRAÇSIZLIK DEĞİŞMEDİ — testin ölçtüğü
    şey buydu.
  */
  /* 24 Eylül 2026: satır içi sayaç (X kalıbı); ızgara ve çizgi kalktı, ayraçsızlık duruyor. */
  assert.match(OGRENCI_GORUNUM, /<dl className=\{SAYAC_SATIRI\}>/);
  /*
    DÖRDÜNCÜ SAYAÇ HÂLÂ YOK: `sosyal_sayaclar` `takipci` de veriyor ama
    hedefi şirket olmayan bir profilde o sayı hep sıfır olurdu. Şirket
    kalıbı uyarlanırken "takipçi" hücresi kopyalanmadı.
  */
  assert.doesNotMatch(OGRENCI_GORUNUM, /etiket="Takipçi"|sayaclar\.takipci/);
  for (const k of [PROFIL_BASLIGI, OGRENCI_GORUNUM]) {
    assert.doesNotMatch(k, /divide-x/);
    assert.doesNotMatch(kod(k), /TakipDugmesi|Takip et\b/);
  }
  /*
    SAYAÇ ARTIK BİR BAĞLANTI (19 Eylül 2026)

    Eskiden düz bir `<span>`di ve o doğruydu: gidilecek liste ekranı
    yoktu. Kullanıcı sayıya basınca hiçbir şey olmadığını bildirdi;
    liste artık `/takip` adresinde ve sayaç "bağlantı" ile BİREBİR
    aynı `Sayac` yolundan geçiyor: gerçek `<a href>`, orta tuş ve
    yeni sekme çalışıyor. "paylaşım" düz `<span>` kalıyor — paylaşımlar
    aynı ekranın alt bölümünde, ayrı bir adresleri yok.
  */
  assert.match(PROFIL_BASLIGI, /etiket="takip"\s+href="\/takip"\s+onNavigate=\{satir\.onNavigate\}/);
  assert.doesNotMatch(PROFIL_BASLIGI, /etiket="paylaşım"[^/]*href/);
});

test('/takip: yalnız kendi listesi, gerçek adres, dört durum; ara katman 404 vermiyor', () => {
  const SAYFA = oku('src/components/sosyal/TakipEttiklerimSayfasi.tsx');
  const ARA_KATMAN = oku('functions/_middleware.ts');

  /* Rota `/baglantilar` ile aynı kalıpta ve aynı prop dörtlüsüyle. */
  assert.match(APP, /if \(temizYol === '\/takip'\) \{/);
  assert.match(
    APP,
    /<TakipEttiklerimSayfasi\s*kullaniciId=\{session\?\.userId \?\? null\}\s*oturumHazir=\{sessionReady\}\s*onNavigate=\{navigate\}\s*onGirisGerekli=\{AUTH_ENABLED \? handleOpenLogin : undefined\}/,
  );
  /*
    Yeni sekmede açılabilen gerçek adres: ön render edilmiyor, ara
    katman kabuğu vermezse orta tuşla açılan sekme 404 görürdü.
  */
  assert.match(ARA_KATMAN, /^\s*'\/takip',$/m);

  /* Tek okuma; hedef parametresi YOK — RPC `auth.uid()`i içeride okuyor. */
  assert.match(SAYFA, /useTakipListesi\(takipEttiklerimiGetir, Boolean\(oturumHazir && kullaniciId\)\)/);
  assert.doesNotMatch(kod(SAYFA), /takipcilerimiGetir|hedef|profilId/);

  /* Kanca yetki kapılarının ÜSTÜNDE: kancalar koşullu dala giremez. */
  const kancaYeri = SAYFA.indexOf('useTakipListesi(');
  const kapiYeri = SAYFA.indexOf('if (!oturumHazir)');
  assert.ok(kancaYeri > 0 && kancaYeri < kapiYeri, 'kanca yetki kapısının üstünde');

  /*
    Dört durum ayrı ve cümleleri farklı: yetkisiz ("giriş gerekiyor"),
    yükleniyor (iskelet), gerçek sıfır ve alınamadı (son ikisi
    `TakipListesi`nin kendi dalları, metni buradan geliyor).
  */
  assert.match(SAYFA, /Takip listesi için giriş gerekiyor/);
  assert.match(SAYFA, /aria-busy="true"/);
  /*
    Başlık ve boş cümle Ağım'daki bölümle BİREBİR: takip edilebilen tek
    şey şirket (`takip_edilebilir` yalnız `sirket_id`li yayındaki
    profilleri sayıyor). İki ekranda iki ad, iki ayrı şey gibi okunurdu.
  */
  assert.match(SAYFA, /Takip ettiğin şirketler/);
  assert.match(OGRENCI_AGIM, /Takip ettiğin şirketler/);
  assert.match(SAYFA, /bosMetin="Henüz şirket takip etmiyorsun\."/);
  assert.match(OGRENCI_AGIM, /bosMetin="Henüz şirket takip etmiyorsun\."/);
  assert.match(SAYFA, /hataMetni="Takip listesi alınamadı\. Bağlantı ya da sunucu kaynaklı olabilir\."/);

  /* Sahte satır ve uydurma sayı yok: başlıkta "N kişi" yazmıyor. */
  assert.doesNotMatch(kod(SAYFA), /ornek|örnek|placeholder/i);
  assert.doesNotMatch(kod(SAYFA), /sayaclar|sosyalSayaclariGetir/);
});

test('liste bileşeni: gerçek <a href>, 50\'lik sayfa, tekrar satır yok, dört durum; görünen ad yoksa @ad iki kez yazılmıyor', () => {
  assert.match(LISTE, /href=\{yol\}/);
  assert.match(LISTE, /const yol = profilYolu\(kisi\.kullaniciAdi\);/);
  assert.match(LISTE, /setDahaVar\(liste\.length >= TAKIP_SAYFA_BOYU\);/);
  assert.match(LISTE, /const bilinen = new Set\(eski\.map\(\(s\) => s\.profilId\)\);/);
  assert.match(LISTE, /Daha fazla göster/);
  assert.match(LISTE, /aria-busy="true"/);
  assert.match(LISTE, /role="alert"/);
  assert.match(LISTE, /if \(liste\.satirlar\.length === 0\) \{\s*return <p className="px-2 text-sm text-gray-600">\{bosMetin\}<\/p>;/);
  assert.match(LISTE, /const adAyri = Boolean\(kisi\.gorunenAd\);/);
  assert.match(LISTE, /\{adAyri && \(/);
  /* Sahte satır yok: liste yalnız RPC'den geliyor. */
  assert.doesNotMatch(kod(LISTE), /ornek|placeholder|örnek/i);
});

test('öğrenci Ağım: takip ettiğin şirketler tek okuma, iki yerleşim; kanca yetki kapısının üstünde', () => {
  assert.match(OGRENCI_AGIM, /const takipEttiklerim = useTakipListesi\(takipEttiklerimiGetir, Boolean\(oturumHazir && kullaniciId\)\);/);
  const kancaYeri = OGRENCI_AGIM.indexOf('useTakipListesi(takipEttiklerimiGetir');
  const kapiYeri = OGRENCI_AGIM.indexOf('if (!oturumHazir) {');
  assert.ok(kancaYeri > 0 && kapiYeri > kancaYeri, 'kanca yetki kapısından önce çağrılmalı (React #310)');
  assert.match(OGRENCI_AGIM, /bosMetin="Henüz şirket takip etmiyorsun\."/);
  /* Telefonda akışın altında (lg:hidden), geniş ekranda sağ sütun kartı. */
  assert.match(OGRENCI_AGIM, /<section aria-labelledby="agim-takip-mobil" className="space-y-3 border-t border-gray-200 px-4 py-5 lg:hidden">/);
  assert.match(OGRENCI_AGIM, /<section aria-labelledby="agim-takip" className="rounded-2xl border border-gray-200 bg-white p-4">/);
  assert.equal((OGRENCI_AGIM.match(/useTakipListesi\(/g) ?? []).length, 1, 'tek okuma');
  /* Mevcut bağlantı bölümleri yerinde. */
  assert.match(OGRENCI_AGIM, /<BaglantiSeridi/);
  assert.match(OGRENCI_AGIM, /onNavigate\('\/agim\/baglantilar'\)/);
});

test('şirket Ağım: seni takip edenler (kendi listesi), boşta dürüst kart, takip ettiklerin yalnız varsa; rota bağlı', () => {
  assert.match(SIRKET_AGIM, /const takipciler = useTakipListesi\(takipcilerimiGetir, etkin\);/);
  assert.match(SIRKET_AGIM, /const takipEttiklerim = useTakipListesi\(takipEttiklerimiGetir, etkin\);/);
  assert.match(SIRKET_AGIM, /Seni takip edenler/);
  assert.match(SIRKET_AGIM, /\{takipciBos \? \(\s*<SirketAgimBos \/>/);
  assert.match(SIRKET_AGIM, /\{takipEttiklerim\.durum === 'hazir' && takipEttiklerim\.satirlar\.length > 0 && \(/);
  assert.match(SIRKET_AGIM, /Takip ettiğin şirketler/);
  /* Takipçi SAYISI burada yazılmıyor; liste sayaçla birebir olmayabilir. */
  assert.doesNotMatch(kod(SIRKET_AGIM), /takipci_sayisi|sosyalSayaclariGetir|tabular-nums/);
  assert.match(APP, /<SirketAgim userId=\{session\?\.userId \?\? null\} onNavigate=\{navigate\} \/>/);
  assert.doesNotMatch(kod(APP), /<SirketAgimBos/);
  const bos = oku('src/sirket/SirketKimlikKarti.tsx');
  assert.match(bos, /Henüz seni takip eden yok/);
  assert.doesNotMatch(kod(bos), /henüz açık değil|yakında/i);
});

/*
  ŞİRKETİN LOGOSU TAKİP SATIRINDA GÖRÜNÜYOR (20261020010000)

  Kullanıcı bildirimi: Ağım'daki "Takip ettiğin şirketler" bölümünde
  şirket, logosu yerine baş harfleriyle çiziliyordu. Ölçüldü: şirket
  sosyal profillerinde `avatar_path` BOŞ, logo `companies.logo_url`de
  duruyor ve liste RPC'leri onu hiç döndürmüyordu.
*/
test('liste satırı şirketin logosunu yedek adres olarak geçiriyor', () => {
  assert.match(kod(SOSYAL), /logoAdresi: satir\.logo_url \?\? null/);
  assert.match(kod(LISTE), /yedekAdres=\{kisi\.logoAdresi\}/);
  /* İki RPC de döndürmeli; yalnız birini düzeltmek listelerden birini geride bırakırdı. */
  const goc = oku('supabase/migrations/20261020010000_takip_listesinde_sirket_logosu.sql');
  assert.equal((goc.match(/left join public\.companies c on c\.id = sp\.sirket_id/g) ?? []).length, 2);
  assert.equal((goc.match(/logo_url {4}text,/g) ?? []).length, 2);
});

test('sosyal profil fotoğrafı logodan önce geliyor', () => {
  /*
    Şirket kendi sosyal profiline fotoğraf yüklediğinde kurumsal logo
    onu EZMEMELİ. Sıra `ProfilFotografi`nin kendi dalında: `yol` doluysa
    depolama yolundan iniyor, yoksa `yedekAdres`e düşülüyor.
  */
    const secici = kod(oku('src/lib/profil-fotografi.ts'));
  const yol = secici.indexOf("{ tur: 'yol'");
  const adres = secici.indexOf("{ tur: 'adres'");
  assert.ok(yol > 0 && adres > yol, 'yol dalı adres dalından ÖNCE gelmeli');
});
