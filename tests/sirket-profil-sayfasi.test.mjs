import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  ŞİRKET PROFİLİ — SAHİP VE ÖĞRENCİ GÖRÜNÜMÜ (18 Eylül 2026)

  Bileşenler oturum ve Supabase istiyor, jsdom kurulu değil; buradaki
  iddialar kaynak üzerinden. Tarayıcı ölçümü gerçek yerel oturumla
  Playwright'ta yapıldı (390 / 430 / 1280): sahip ve öğrenci sayfaları,
  13 paylaşımlı ızgara, boş profil, uzun ad, düzenleme kaydı.

  Ölçülen sınır: öğrencinin gördüğü sayfa İK e-postasını, VKN'yi ve
  sahibe özel düğmeleri DOM'a HİÇ almıyor — bir bayrakla gizlenmiyor.
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
/* "Şu metin geçmiyor" iddiaları yorumsuz koda bakıyor; gerekçe yorumları kelimeyi anabilir. */
const kod = (m) => m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const GORUNUM = oku('src/sirket/SirketProfilGorunumu.tsx');
const SAHIP = oku('src/sirket/SirketProfili.tsx');
const ZIYARETCI = oku('src/sirket/SirketSayfasi.tsx');
const VERI = oku('src/lib/sirket-veri.ts');
const SOSYAL = oku('src/lib/queries/sosyal.ts');
const SAYFA = oku('src/components/sosyal/SosyalProfilSayfasi.tsx');
const OLUSTUR = oku('src/components/sosyal/PaylasimOlustur.tsx');
const IZGARA = oku('src/components/sosyal/PaylasimIzgarasi.tsx');
const PANEL = oku('src/sirket/SirketPaneli.tsx');
const TIPLER = oku('src/lib/database.types.ts');

test('herkese açık kimlik tipi İK e-postasını tanımıyor; öğrenci sorgusu o sütunu istemiyor', () => {
  const tip = VERI.slice(VERI.indexOf('export interface SirketAcikKimlik'), VERI.indexOf('const bosNull'));
  assert.doesNotMatch(tip, /hrEmail|hr_email|vkn|mersis/i);
  const sorgu = VERI.slice(VERI.indexOf('export async function sirketAcikKimliginiOku'));
  assert.match(sorgu, /\.select\('id, name, slug, logo_url, industry, size, location, website_url, description'\)/);
  assert.doesNotMatch(sorgu, /hr_email/);
  /* Görünüm bileşeni de bu alanları hiç anmıyor. */
  assert.doesNotMatch(kod(GORUNUM), /hrEmail|hr_email|vkn/i);
});

test('sahibe özel eylemler yalnız `sahip` nesnesinin içinde; ziyaretçi kabı o nesneyi hiç vermiyor', () => {
  for (const iz of ['İlan oluştur', 'Profili düzenle', 'Öğrencinin gördüğü sayfa', 'İlk fotoğrafınızı paylaşın']) {
    assert.ok(GORUNUM.includes(iz), `${iz} görünümde yok`);
  }
  assert.match(GORUNUM, /\{sahip && \(/);
  assert.match(GORUNUM, /sahibiMi=\{Boolean\(sahip\)\}/);
  assert.match(GORUNUM, /onArsivlendi=\{sahip\?\.onPaylasimArsivlendi\}/);
  /* Ziyaretçi kabı `sahip` prop'unu tanımıyor bile. */
  assert.doesNotMatch(ZIYARETCI, /sahip=/);
  assert.doesNotMatch(kod(ZIYARETCI), /İlan oluştur|Profili düzenle|Fotoğraf paylaş|Çıkış yap/);
  /*
    Takip et (18 Eylül 2026): görünüm düğmeyi kendisi çizmiyor,
    `ziyaretciEylemi` yuvasını YALNIZ sahip yokken açıyor; düğmeyi
    ziyaretçi kabı veriyor ve bakan sayfanın sahibiyse (aynı kimlik) hiç
    vermiyor. Sahip kabı yuvaya dokunmuyor.
  */
  assert.match(GORUNUM, /\{!sahip && ziyaretciEylemi && \(/);
  assert.doesNotMatch(kod(GORUNUM), /Takip et|TakipDugmesi/);
  assert.match(ZIYARETCI, /bakanId && bakanId !== profil\.profilId \? \(\s*<TakipDugmesi/);
  assert.match(ZIYARETCI, /ziyaretciEylemi=\{takipDugmesi\}/);
  assert.doesNotMatch(SAHIP, /ziyaretciEylemi|TakipDugmesi/);
});

test('üç sayaç üç ayrı durum; takipçi gerçek RPC; sıfır uydurulmuyor', () => {
  assert.match(GORUNUM, /\| \{ durum: 'yukleniyor' \}\s*\| \{ durum: 'hazir'; deger: number \}\s*\| \{ durum: 'hata' \}/);
  assert.match(GORUNUM, /etiket="paylaşım"/);
  assert.match(GORUNUM, /etiket="aktif ilan"/);
  assert.match(GORUNUM, /etiket="takipçi"/);
  assert.match(GORUNUM, /alınamadı/);
  /*
    Takipçi `sosyal_sayaclar`ın aynı satırından (20261015010000);
    `takipci_sayisi` RPC'si istemciden hiç çağrılmıyor — aynı sayı iki
    kez sorulmuyor. Ziyaretçi kabı sayacı sayfadan alıyor, kendi okumuyor.
  */
  assert.match(SOSYAL, /takipci: Number\(satir\.takipci \?\? 0\),\s*takip: Number\(satir\.takip \?\? 0\),/);
  assert.doesNotMatch(kod(SOSYAL), /takipci_sayisi/);
  assert.match(SAHIP, /setTakipciSayaci\(s \? \{ durum: 'hazir', deger: s\.takipci \} : \{ durum: 'hata' \}\)/);
  assert.doesNotMatch(kod(SAHIP), /takipciSayisiGetir/);
  assert.match(ZIYARETCI, /takipciSayaci: SayacDurumu;/);
  assert.doesNotMatch(ZIYARETCI, /takipciSayisiGetir|sosyalSayaclariGetir/);
  assert.match(SAYFA, /takipciSayaci=\{\s*sayacDurumu === 'hazir' && sayaclar\s*\? \{ durum: 'hazir', deger: sayaclar\.takipci \}/);
  /* Aktif ilan sahipte yayındaki satırlardan, ziyaretçide yayındaki ilan sorgusundan. */
  assert.match(SAHIP, /ilanlar\.filter\(\(i\) => i\.status === 'published'\)\.length/);
  assert.match(ZIYARETCI, /fetchPublishedCompanyListings\(sirketId\)/);
  /* Sayaçlar arasında dikey çizgi yok. */
  assert.doesNotMatch(GORUNUM, /divide-x/);
});

test('şirket paylaşımı sabit kitleyle; seçici çizilmiyor; okuma 3 kitleyi tanıyor', () => {
  assert.match(SOSYAL, /export type SirketKitlesi = 'sirket';/);
  assert.match(SOSYAL, /export type OkunanKitle = PaylasimKitlesi \| 'resmi' \| SirketKitlesi;/);
  /* Öğrencinin seçtiği iki kitle değişmedi. */
  assert.match(SOSYAL, /export type PaylasimKitlesi = 'baglantilarim' \| 'alan-toplulugum';/);
  assert.match(OLUSTUR, /sabitKitle\?: SirketKitlesi;/);
  assert.match(OLUSTUR, /kitle: sabitKitle \?\? kitle,/);
  assert.match(OLUSTUR, /\{!sabitKitle && \(\s*<fieldset/);
  assert.match(OLUSTUR, /if \(sabitKitle\) return;/);
  assert.match(GORUNUM, /sabitKitle="sirket"/);
  /* Sunucu önkoşulu: kullanıcı adı + sirket_id; sağlanmıyorsa düğme yok, sebep var. */
  assert.match(SAHIP, /const paylasabilirMi = Boolean\(sosyal\?\.kullaniciAdi && sosyal\?\.sirketId\);/);
});

test('sosyal satır sirket_id okuyor; ziyaretçi dalı şirket satırını şirket sayfasına yönlendiriyor', () => {
  assert.match(SOSYAL, /sirketId: string \| null;/);
  assert.match(SOSYAL, /yayinda_mi, resmi_mi, sirket_id, avatar_path/);
  assert.match(SOSYAL, /sirketId: satir\.sirket_id \?\? null,/);
  assert.match(SAYFA, /ziyaretciDurumu === 'hazir' && ziyaretciProfili && ziyaretciProfili\.sirketId/);
  assert.match(SAYFA, /<SirketSayfasi/);
  /* Öğrenci profili görünümü DEĞİŞMEDİ: kendi dalı hâlâ SosyalProfilGorunumu. */
  assert.match(SAYFA, /<SosyalProfilGorunumu\s+profil=\{ziyaretciProfili\}/);
  /* Şirket görünümü öğrenci kimliği alanlarını hiç anmıyor. */
  assert.doesNotMatch(GORUNUM, /bolumAdi|sinifEtiketi|bolumEtiketi|sektorAdi/);
});

test('sekmeler ve kare ızgara; boş durumda stok görsel yok', () => {
  assert.match(GORUNUM, /role="tablist"/);
  for (const s of ["etiket: 'Paylaşımlar'", "etiket: 'İlanlar'", "etiket: 'Hakkımızda'"]) assert.ok(GORUNUM.includes(s), s);
  assert.match(GORUNUM, /Şirketten kareler/);
  assert.match(GORUNUM, /gorunum="kare"/);
  assert.match(IZGARA, /export const KARE_IZGARASI = 'grid grid-cols-3 gap-px sm:gap-0\.5';/);
  assert.match(IZGARA, /const KARE_KAPAK_KABI = 'relative aspect-square w-full overflow-hidden bg-gray-100';/);
  /* Öğrenci galerisi değişmedi. */
  assert.match(IZGARA, /export const GALERI_IZGARASI = 'grid grid-cols-3 gap-px sm:gap-0\.5 lg:grid-cols-4';/);
  assert.match(GORUNUM, /Henüz paylaşım yok/);
  assert.doesNotMatch(kod(GORUNUM), /unsplash|placeholder|stok/i);
  /* Doğrulanmış rozeti şirket sayfasında yok. */
  assert.doesNotMatch(kod(GORUNUM), /BadgeCheck|Doğrulanmış/);
});

test('bulanık kimlik bandı: zemin logonun kendisi ve logo yoksa zemin de yok', () => {
  /*
    BANDIN ZEMİNİ UYDURULMUYOR (19 Eylül 2026). Şirket profilinin üst
    bandı logonun bulanıklaştırılmış hâliyle doluyor. Tek koşul:
    bulanıklaştırılacak GÖRSEL olması. Logo girilmemişse ya da adres
    kırılmışsa (`logoBozuk`) zemin hiç çizilmiyor — yerine stok görsel,
    doku ya da gradyan KONMUYOR; bant beyaz kalıyor ve ortada baş harf
    dairesi duruyor.

    İkinci koşul: zemin ile ön plandaki logo AYNI adresi paylaşıyor.
    Ayrı bir alan/istek olsaydı tarayıcı aynı görseli iki kez indirir
    ve ikisi ayrışabilirdi.
  */
  assert.match(GORUNUM, /const bulanikZemin = kimlik\.logoUrl && !logoBozuk \? kimlik\.logoUrl : null;/);
  assert.match(GORUNUM, /\{bulanikZemin && \(/);
  assert.match(GORUNUM, /src=\{bulanikZemin\}/);
  /* Kalıbın kendisi tam ekran görüntüleyiciden; aynı sınıf dizisi. */
  assert.match(
    GORUNUM,
    /className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"/,
  );
  /* Dekoratif: ad okunmuyor, işaretçi almıyor. */
  assert.match(GORUNUM, /src=\{bulanikZemin\}\s*alt=""\s*aria-hidden/);
  /* Kırıklık kararı tek yerde: logo baş harfe düşerse zemin de düşüyor. */
  assert.match(GORUNUM, /onBozuk=\{\(\) => setLogoBozuk\(true\)\}/);
  assert.doesNotMatch(kod(GORUNUM), /unsplash|placeholder|gradient|bg-gradient/i);
  /* Kap kırpıyor; bulanıklık bandın dışına taşmıyor. */
  assert.match(GORUNUM, /<div className="relative overflow-hidden px-4 pb-4 pt-5/);
});

test('sahip: düzenleme ve ilan yolları mevcut akışlara; ilan yönetimi paneldeki geri çağrılarla', () => {
  assert.match(SAHIP, /const DUZENLE_YOLU = '\/sirket\/profil\/duzenle';/);
  assert.match(SAHIP, /const ILAN_OLUSTUR_YOLU = '\/sirket\/ilan\/yeni';/);
  assert.match(SAHIP, /<SirketProfilFormu[\s\S]{0,200}ozetsiz/);
  assert.match(SAHIP, /Henüz ilanınız yok/);
  assert.match(SAHIP, /<GenelBakis[\s\S]{0,300}onDurum=\{onDurum\}\s*onKaldir=\{onKaldir\}/);
  assert.match(PANEL, /<SirketProfili\s+yol=\{yol\}/);
  assert.match(PANEL, /ogrenciSayfasiYolu|SirketProfili/);
  assert.match(SAHIP, /ogrenciSayfasiYolu: sosyal\?\.kullaniciAdi \? profilYolu\(sosyal\.kullaniciAdi\) : null,/);
});

test('database.types: takipler ve iki RPC göçle birebir', () => {
  assert.match(TIPLER, /takipler: \{\s*Row: \{\s*takipci_id: string;\s*hedef_id: string;\s*created_at: string;/);
  assert.match(TIPLER, /takipci_sayisi: \{ Args: \{ hedef: string \}; Returns: number \};/);
  assert.match(TIPLER, /takip_ediyor_muyum: \{ Args: \{ hedef: string \}; Returns: boolean \};/);
});
