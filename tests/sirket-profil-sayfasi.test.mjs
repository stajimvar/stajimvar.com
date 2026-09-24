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
const OGRENCI_GORUNUM = oku('src/components/sosyal/SosyalProfilGorunumu.tsx');
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
  /*
    "İlan paylaş" (20 Eylül 2026, kullanıcı kararı): düğme "Fotoğraf
    paylaş"ın yanına taşınınca aynı fiili kullanması istendi. Eski metin
    "İlan oluştur"du; iddia GEVŞETİLMEDİ, yeni etikete göre yazıldı. Rota
    ve tıklama değişmedi — onların iddiası aşağıdaki sahip testinde.
  */
  for (const iz of ['İlan paylaş', 'Profili düzenle', 'İlk fotoğrafınızı paylaşın']) {
    assert.ok(GORUNUM.includes(iz), `${iz} görünümde yok`);
  }
  /*
    "Öğrencinin gördüğü sayfa" KALDIRILDI (20 Eylül 2026, kullanıcı isteği:
    ekran görüntüsünde üstünü çizdi). Eskiden "sahibe özel izler" listesinde
    aranıyordu; iddia GEVŞETİLMEDİ, yönü çevrildi — artık kodda HİÇ
    olmadığını doğruluyor. Bağlantıyla birlikte `SAKIN_BAGLANTI` sabiti,
    `ExternalLink` ikonu ve `ogrenciSayfasiYolu` prop'u da kalktı; üçünün
    de kodda kalmadığı burada kontrol ediliyor (yorumlar metni anabilir,
    bu yüzden `kod()` süzgeci).
  */
  assert.doesNotMatch(kod(GORUNUM), /Öğrencinin gördüğü sayfa|SAKIN_BAGLANTI|ExternalLink|ogrenciSayfasiYolu/);
  assert.doesNotMatch(kod(SAHIP), /ogrenciSayfasiYolu|profilYolu/);
  assert.match(GORUNUM, /\{sahip && \(/);
  assert.match(GORUNUM, /sahibiMi=\{Boolean\(sahip\)\}/);
  assert.match(GORUNUM, /onArsivlendi=\{sahip\?\.onPaylasimArsivlendi\}/);
  /* Ziyaretçi kabı `sahip` prop'unu tanımıyor bile. */
  assert.doesNotMatch(ZIYARETCI, /sahip=/);
  /* Etiketin eski hâli de yasak listesinde: ziyaretçi dalına iki metinden hiçbiri girmemeli. */
  assert.doesNotMatch(kod(ZIYARETCI), /İlan paylaş|İlan oluştur|Profili düzenle|Fotoğraf paylaş|Çıkış yap/);
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
  /*
    ETİKET "ŞİRKETTEN KARELER" (20 Eylül 2026, kullanıcı bildirimi)

    Sekme "Paylaşımlar" yazarken panelin ilk satırında ikinci kez
    "Şirketten kareler" yazan bir `h2` duruyordu: aynı bölüm iki kez
    adlandırılıyordu. Bölümün adı sekmeye taşındı, `h2` ve onu taşıyan
    şerit silindi. İddia GEVŞETİLMEDİ, yeni etikete göre yazıldı —
    ayrıca artık "kodda hiç `h2` yok" diye daha sıkı bir iddia var.
  */
  for (const s of ["etiket: 'Şirketten kareler'", "etiket: 'İlanlar'", "etiket: 'Hakkımızda'"]) assert.ok(GORUNUM.includes(s), s);
  assert.doesNotMatch(kod(GORUNUM), /<h2/);
  /*
    İÇ KİMLİKLER DEĞİŞMEDİ: paylaşılmış bağlantılar, `SirketSekmesi`
    tipi ve ekran okuyucu ilişkisi bu adlara bakıyor; yalnız görünen
    etiket değişti.
  */
  assert.ok(GORUNUM.includes("{ id: 'paylasimlar', etiket: 'Şirketten kareler' },"));
  assert.match(GORUNUM, /export type SirketSekmesi = 'paylasimlar' \| 'ilanlar' \| 'hakkimizda';/);
  assert.match(GORUNUM, /id=\{`sirket-sekme-\$\{s\.id\}`\}/);
  assert.match(GORUNUM, /id="sirket-panel-paylasimlar"\s+aria-labelledby="sirket-sekme-paylasimlar"/);
  /*
    Fotoğraf paylaş düğmesi sahibin eylem satırında, "Profili düzenle"nin
    hemen ardında; koşulu (`sahip && paylasabilirMi`) değişmediği için
    ziyaretçi dalında hâlâ hiç kurulmuyor.
  */
  /*
    24 Eylül 2026 (X kalıbı, kullanıcı kararı): üç eylem logonun
    sağındaki hap sırasında. SIRA DEĞİŞMEDİ (İlan paylaş → Fotoğraf
    paylaş → Profili düzenle). "İlan paylaş" metni telefonda `sr-only`
    (hap yalnız ikon, `sm:` üstünde metinli) — bu yüzden etiket bir
    `<span>`in içinde.

    ESKİ ŞART KALKTI: "telefonda son düğme `col-span-2` ile tam satır".
    O şart üç hücrelik ızgaranın sorunuydu (sonuncusu yarım hücrede yalnız
    kalıyordu); hap sırası ızgara değil `flex-wrap`, yalnız kalan hücre
    diye bir şey yok.
  */
  assert.match(
    GORUNUM,
    /<span className="sr-only sm:not-sr-only">İlan paylaş<\/span>\s*<\/a>\s*\{paylasGirisi\}\s*<a[\s\S]{0,400}?Profili düzenle\s*<\/a>\s*<\/>/,
  );
  assert.doesNotMatch(kod(GORUNUM), /col-span-2/);
  /* Rota ve tıklama etiketten bağımsız: iç kimlik değişmedi. */
  assert.match(GORUNUM, /href=\{sahip\.ilanOlusturYolu\}/);
  assert.match(GORUNUM, /onClick=\{icTiklama\(onNavigate, sahip\.ilanOlusturYolu\)\}/);
  assert.match(GORUNUM, /const paylasGirisi = sahip && sahip\.paylasabilirMi && \(/);
  /* Boş durumdaki düğme hâlâ aynı seçiciyi kolla açıyor, ikinci besteci yok. */
  assert.match(GORUNUM, /onClick=\{\(\) => paylasKolu\.current\?\.sec\(\)\}/);
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
  /*
    Kap kırpıyor; bulanıklık bandın dışına taşmıyor. 24 Eylül 2026 (X
    kalıbı): zemin kimlik metinlerinin arkasından kendi BANDINA taşındı —
    öğrenci kapağıyla aynı oranlı sınıf (`KAPAK_BANDI_SINIFI`, 3:1 / lg
    5:1). Kimlik metinleri bandın altında, beyaz zeminde.
  */
  assert.match(GORUNUM, /<div className=\{`relative w-full overflow-hidden bg-gray-100 \$\{KAPAK_BANDI_SINIFI\}`\}>/);
  /*
    DAİRE ÖLÇÜSÜ ÖĞRENCİYLE AYNI (20 Eylül 2026, kullanıcı isteği): şirket
    dairesi 80 → 96 (sm) idi, `lg` basamağı yoktu; öğrenci avatarı 80 →
    112 → 144. Basamaklar eşitlendi. Halka ve zemin ŞİRKETİN KENDİSİ
    kaldı — iddia bunu da koruyor, yoksa bir dahaki düzenlemede sessizce
    öğrencininkine çevrilebilirdi.
  */
  assert.match(GORUNUM, /h-20 w-20 [^']*sm:h-28 sm:w-28 lg:h-36 lg:w-36/);
  /*
    HALKA DEĞİŞTİ (24 Eylül 2026, X kalıbı — kullanıcı kararı): logo artık
    bandın alt kenarına biniyor ve üç ekran X'teki beyaz ayracı taşıyor.
    Eski şart ("şirketin kendi mavi halkası `ring-2 ring-blue-600
    ring-offset-2` öğrencininkine çevrilmesin") kalktı: o şart, ölçü
    eşitlenirken halkanın sessizce kaymasını önlüyordu; halkanın
    değişmesi bu kez bilerek verilmiş bir karar. Zemin (`bg-white`)
    şirketin kendisi kalıyor: saydam logo banda karışmıyor.
  */
  assert.match(GORUNUM, /rounded-full bg-white ring-4 ring-white/);
  assert.doesNotMatch(kod(GORUNUM), /ring-blue-600/);
  assert.doesNotMatch(kod(GORUNUM), /sm:h-24 sm:w-24/);
  /* Baş harf daireyle birlikte üç basamak. */
  assert.match(GORUNUM, /text-3xl font-black text-blue-900 sm:text-4xl lg:text-5xl/);
  /* Öğrenci avatarının hedef ölçüsü değişmedi; eşitleme tek yönlü. */
  assert.match(OGRENCI_GORUNUM, /h-20 w-20 shrink-0 rounded-full text-2xl[\s\S]{0,80}sm:h-28 sm:w-28[\s\S]{0,40}lg:h-36 lg:w-36/);
});

test('sahip: düzenleme ve ilan yolları mevcut akışlara; ilan yönetimi paneldeki geri çağrılarla', () => {
  assert.match(SAHIP, /const DUZENLE_YOLU = '\/sirket\/profil\/duzenle';/);
  assert.match(SAHIP, /const ILAN_OLUSTUR_YOLU = '\/sirket\/ilan\/yeni';/);
  assert.match(SAHIP, /<SirketProfilFormu[\s\S]{0,200}ozetsiz/);
  assert.match(SAHIP, /Henüz ilanınız yok/);
  assert.match(SAHIP, /<GenelBakis[\s\S]{0,300}onDurum=\{onDurum\}\s*onKaldir=\{onKaldir\}/);
  assert.match(PANEL, /<SirketProfili\s+yol=\{yol\}/);
  /*
    Sahip nesnesi iki yol veriyor; üçüncüsü (`ogrenciSayfasiYolu`) 20 Eylül
    2026'da bağlantıyla birlikte kalktığı için burada da aranmıyor.
    Kalan ikisinin sabitleri yukarıda birebir doğrulanıyor.
  */
  assert.match(SAHIP, /ilanOlusturYolu: ILAN_OLUSTUR_YOLU,\s*duzenleYolu: DUZENLE_YOLU,\s*paylasabilirMi,/);
});

test('database.types: takipler ve iki RPC göçle birebir', () => {
  assert.match(TIPLER, /takipler: \{\s*Row: \{\s*takipci_id: string;\s*hedef_id: string;\s*created_at: string;/);
  assert.match(TIPLER, /takipci_sayisi: \{ Args: \{ hedef: string \}; Returns: number \};/);
  assert.match(TIPLER, /takip_ediyor_muyum: \{ Args: \{ hedef: string \}; Returns: boolean \};/);
});
