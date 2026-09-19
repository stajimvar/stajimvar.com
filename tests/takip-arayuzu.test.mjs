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
  /* Ölçü "Bağlantı kur" ile aynı kalıp (BIRINCIL_EYLEM, min-h-12); iki durum aynı yükseklikte. */
  assert.match(BAGLANTI_DUGMESI, /className=\{BIRINCIL_EYLEM\}\s*>\s*\{islemde \? 'Gönderiliyor…' : 'Bağlantı kur'\}/);
  assert.match(DUGME, /takipEdiyor \? IKINCIL : BIRINCIL_EYLEM/);
  assert.match(DUGME, /const IKINCIL = `inline-flex min-h-12 /);
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
  assert.match(PROFIL_BASLIGI, /className="col-start-2 row-start-1 grid min-w-0 grid-cols-3"/);
  assert.match(OGRENCI_GORUNUM, /<Sayac etiket="Takip" deger=\{sayaclar\.takip\} \/>/);
  assert.match(OGRENCI_GORUNUM, /<dl className="grid grid-cols-3 border-y border-gray-100 py-2 lg:border-y-0 lg:py-0">/);
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
