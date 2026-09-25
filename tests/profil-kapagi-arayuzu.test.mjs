import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { katilmaMetni, yilBulunmaEki } from '../src/lib/tarih.mjs';

/*
  PROFİL KAPAĞI, BİYOGRAFİ VE KATILMA TARİHİ — ARAYÜZ (X kalıbı, 2/2)

  Veri katmanı ve göç `profil-kapagi.test.mjs`de ölçülüyor. Bu dosya
  arayüzün o katmanı DOĞRU kullandığını ölçüyor:

    1. Kapak avatarın indirme yolundan geçiyor (private kova, oturumla
       indirme); imzalı ya da herkese açık adres üretilmiyor.
    2. Yükleme ve kaldırma sonrası yerel satır ANCAK sunucu kabul ettikten
       sonra güncelleniyor.
    3. Katılma satırı Türkçe ekiyle doğru yazılıyor ve tarih yoksa hiç
       çizilmiyor.
    4. Sahibin `/cv` kartı biyografiyi ziyaretçi profiliyle aynı sınıflarla
       çiziyor.

  Kaynak-metin iddiaları `sosyal-profil-arayuzu` üslubunda; yokluk
  iddiaları yorumsuz kaynakta (yorumlar bir şeyin neden OLMADIĞINI
  anlatırken onun adını anmak zorunda).
*/

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
function yorumsuz(kaynak) {
  return kaynak.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*/gm, '$1');
}

const kapak = oku('src/components/sosyal/KapakFotografi.tsx');
const yukleme = oku('src/components/sosyal/KapakFotografiYukleme.tsx');
const avatarYukleme = oku('src/components/sosyal/ProfilFotografiYukleme.tsx');
const sayfa = oku('src/components/sosyal/SosyalProfilSayfasi.tsx');
const gorunum = oku('src/components/sosyal/SosyalProfilGorunumu.tsx');
const baslik = oku('src/components/ProfilBasligi.tsx');
const menu = oku('src/components/sosyal/ProfilAyarMenusu.tsx');
const goruntuleyici = oku('src/components/sosyal/ProfilFotografiGoruntuleyici.tsx');
const sirket = oku('src/sirket/SirketProfilGorunumu.tsx');
const oranlar = oku('src/lib/kapak-orani.ts');

/*
  `kapak-orani.ts` TypeScript; node --test onu doğrudan içe aktaramıyor.
  Sabitler kaynaktan okunup aynı formülle hesaplanıyor.
*/
const sabit = (ad) => Number(oranlar.match(new RegExp(`export const ${ad} = (\\d+);`))[1]);
const KAPAK_ORANI = sabit('KAPAK_ORANI');

/* ------------------------------------------------------------------ */
/*  KATILMA TARİHİ                                                     */
/* ------------------------------------------------------------------ */

test('katılma satırı Türkçe ay adı ve yıla uyan ekle yazılıyor', () => {
  /* Ayın ortası: hangi saat diliminde çalışırsa çalışsın ay değişmiyor. */
  assert.equal(katilmaMetni('2026-09-15T12:00:00Z'), "Eylül 2026'da katıldı");
  assert.equal(katilmaMetni('2026-08-15T12:00:00Z'), "Ağustos 2026'da katıldı");
  assert.equal(katilmaMetni('2025-01-15T12:00:00Z'), "Ocak 2025'te katıldı");
  assert.equal(katilmaMetni('2027-06-15T12:00:00Z'), "Haziran 2027'de katıldı");
});

test('yıl eki okunuşun son kelimesine uyuyor (ünlü uyumu + sertleşme)', () => {
  const beklenen = {
    2021: 'de', // bir
    2022: 'de', // iki
    2023: 'te', // üç
    2024: 'te', // dört
    2025: 'te', // beş
    2026: 'da', // altı
    2027: 'de', // yedi
    2028: 'de', // sekiz
    2029: 'da', // dokuz
    2010: 'da', // on
    2020: 'de', // yirmi
    2030: 'da', // otuz
    2040: 'ta', // kırk
    2050: 'de', // elli
    2060: 'ta', // altmış
    2070: 'te', // yetmiş
    2080: 'de', // seksen
    2090: 'da', // doksan
    2100: 'de', // yüz
    2000: 'de', // bin
  };
  for (const [yil, ek] of Object.entries(beklenen)) {
    assert.equal(yilBulunmaEki(Number(yil)), ek, `${yil}'${ek} olmalı`);
  }
});

test('tarih yoksa ya da okunamıyorsa satır için metin üretilmiyor', () => {
  for (const deger of [null, undefined, '', 'tarih-degil']) {
    assert.equal(katilmaMetni(deger), null);
  }
});

test('katılma anı okuyucunun saat diliminde: ay sınırı iki dilimde farklı okunabiliyor', () => {
  /*
    `created_at` bir AN. 31 Ağustos 22:30 UTC İstanbul'da 1 Eylül 01:30.
    Intl saat dilimini süreç başlarken okuduğu için ayrı süreçte
    ölçülüyor (`tarih-bicimi.test.mjs` ile aynı yöntem).
  */
  const betik =
    "import('./src/lib/tarih.mjs').then((m) => process.stdout.write(m.katilmaMetni('2026-08-31T22:30:00Z')))";
  const calistir = (tz) =>
    execFileSync(process.execPath, ['--input-type=module', '-e', betik], {
      cwd: KOK,
      env: { ...process.env, TZ: tz },
    }).toString();
  assert.equal(calistir('Europe/Istanbul'), "Eylül 2026'da katıldı");
  assert.equal(calistir('UTC'), "Ağustos 2026'da katıldı");
});

test('iki öğrenci ekranı da katılma satırını aynı kalıpla ve yalnız varken çiziyor', () => {
  for (const [ad, kaynak] of Object.entries({ baslik, gorunum })) {
    assert.match(kaynak, /import \{ katilmaMetni \} from '[./]+lib\/tarih\.mjs';/, `${ad}: yardımcı tarih.mjs'ten`);
    assert.match(kaynak, /\{katilma && \(?\s*<MetaOgesi/, `${ad}: satır yalnız metin varken`);
    /* 24 Eylül 2026 (X kalıbı): katılma meta satırının öğesi; ikonu `MetaOgesi` aria-hidden çiziyor. */
    assert.match(kaynak, /<MetaOgesi ikon=\{CalendarDays\} etiket="Katılma">/, `${ad}: katılma meta öğesi`);
    /* Elle tarih biçimlendirme yok: depo kuralı tek kaynak. */
    assert.doesNotMatch(yorumsuz(kaynak), /toLocaleDateString/);
  }
  assert.match(gorunum, /katilmaMetni\(profil\.katilmaAni\)/);
  assert.match(baslik, /katilmaMetni\(satir\?\.katilmaAni \?\? null\)/);
  /* Resmî hesapta da gösteriliyor: öğrenci kimliği kapısının arkasında DEĞİL. */
  assert.doesNotMatch(gorunum, /ogrenciKimligiGorunur && katilma/);
});

/* ------------------------------------------------------------------ */
/*  KAPAK GÖSTERİMİ                                                    */
/* ------------------------------------------------------------------ */

test('kapak private kovadan, oturumla indiriliyor — avatarın yolu', () => {
  assert.match(kapak, /import \{ SOSYAL_KAPAK_KOVASI \} from '\.\.\/\.\.\/lib\/queries\/sosyal';/);
  assert.match(kapak, /useGorselAdresleri\(SOSYAL_KAPAK_KOVASI, yollar\)/);
  /* İmzalı ya da herkese açık adres üretilmiyor. */
  assert.doesNotMatch(yorumsuz(kapak), /createSignedUrl|getPublicUrl/);
});

test('kapağın dört durumu: iskelet, nötr bant, iniyor, görsel — sahte görsel yok', () => {
  /* undefined (satır okunmadı) ve iniyor: aynı bant, nabız. */
  assert.match(kapak, /if \(yol === undefined \|\| \(yol && durum === 'yukleniyor'\)\) \{\n\s*return <div aria-hidden className=\{`\$\{bant\} animate-pulse/);
  /* Yok ya da inemedi: aynı nötr bant, dekoratif. */
  assert.match(kapak, /if \(!adres\) \{\n\s*return <div aria-hidden className=\{`\$\{bant\} \$\{className\}`\} \/>/);
  assert.match(kapak, /const TABAN = 'block overflow-hidden bg-gray-100';/);
  /* Degrade ya da yer tutucu görsel uydurulmuyor. */
  assert.doesNotMatch(yorumsuz(kapak), /gradient|placeholder|unsplash/i);
  /* alt metni gerçek içerik: kimin kapağı olduğu. */
  assert.match(kapak, /alt=\{`\$\{ad\} kapak fotoğrafı`\}/);
});

test('iki öğrenci ekranı kapak VARSA bandı çiziyor ve avatar ona biniyor; yoksa bant yok', () => {
  /*
    Mobil sadeleştirme (25 Eylül 2026): kapaksız profilde boş gri bant
    kalktı; kapak varsa telefonda 112 px (`h-28`), `sm:` üstünde eski oran.
    Avatar yalnız kapak varken binmiyor ve beyaz ayraç halkası da yalnız
    o zaman.
  */
  for (const [ad, kaynak] of Object.entries({ baslik, gorunum })) {
    const kapakYeri = kaynak.indexOf('<KapakFotografi');
    const bantYeri = kaynak.indexOf('className={KIMLIK_BANDI}');
    assert.ok(kapakYeri > 0 && kapakYeri < bantYeri, `${ad}: kapak kimlik bandının üstünde olmalı`);
    assert.match(kaynak, /'ring-4 ring-white'/, `${ad}: avatarı kapaktan ayıran beyaz halka`);
    assert.match(kaynak, /className="h-28 w-full sm:h-auto sm:rounded-t-\[1[59]px\]"/, `${ad}: kapak 112 px`);
  }
  assert.match(baslik, /\{kapakYolu && \(\s*<KapakFotografi/);
  assert.match(gorunum, /\{profil\.kapakFotografiYolu && \(\s*<KapakFotografi/);
  assert.match(baslik, /className=\{kapakYolu \? AVATAR_BINMESI : 'relative shrink-0 self-start'\}/);
  assert.match(gorunum, /className=\{profil\.kapakFotografiYolu \? AVATAR_BINMESI : 'relative shrink-0 self-start'\}/);
});

test('/cv kartında kapak yolunun üç hâli: okunmadı → iskelet, yok → nötr bant', () => {
  assert.match(
    baslik,
    /const kapakYolu: string \| null \| undefined = !portfolyo\n\s*\? null\n\s*: portfolyo\.satir === undefined\n\s*\? undefined\n\s*: \(portfolyo\.satir\?\.kapakFotografiYolu \?\? null\);/,
  );
});

test('ayarlar açıkça "Ayarlar" yazan tek düğmede; üst çubukta ☰ yok', () => {
  /*
    Mobil sadeleştirme (25 Eylül 2026): menü telefonda üst çubuktaki ☰'dan,
    geniş ekranda adsız bir dişliden açılıyordu. Artık her genişlikte
    avatar satırının sağında "Ayarlar" yazan hap; menünün satırları aynı.
  */
  assert.match(baslik, /onClick=\{\(\) => setMenuAcik\(true\)\}\s*aria-haspopup="dialog"\s*className=\{HAP\}\s*>\s*<Settings[^>]*\/>\s*Ayarlar/);
  assert.doesNotMatch(baslik, /hidden lg:block/);
  assert.doesNotMatch(yorumsuz(baslik), /absolute right-3 top-3/);
  const header = oku('src/components/Header.tsx');
  assert.doesNotMatch(yorumsuz(header), /stajimvar:profil-menusu/);
});

test('şirket profiline kapak girmedi (kapsam dışı)', () => {
  assert.doesNotMatch(sirket, /KapakFotografi|kapakFotografiYolu|katilmaMetni/);
});

/* ------------------------------------------------------------------ */
/*  BİYOGRAFİ                                                          */
/* ------------------------------------------------------------------ */

test('sahibin /cv kartı biyografiyi ziyaretçi profiliyle AYNI sınıflarla çiziyor', () => {
  /* 24 Eylül 2026: sınıflar ortak `BIYOGRAFI` sabitinde; sola yaslı `max-w-2xl` tek genişlik sınırı. */
  assert.match(
    oku('src/components/sosyal/ProfilKimlikKalibi.tsx'),
    /export const BIYOGRAFI =\n\s*'mt-3 max-w-2xl whitespace-pre-line break-words text-sm leading-relaxed text-gray-800 sm:text-base';/,
  );
  assert.ok(gorunum.includes('<p className={BIYOGRAFI}>{profil.biyografi}</p>'));
  assert.ok(baslik.includes('{satir?.biyografi && <p className={BIYOGRAFI}>{satir.biyografi}</p>}'));
  /* Kısaltma yok: tam metne giden başka bir yol yok. */
  assert.doesNotMatch(yorumsuz(baslik), /line-clamp/);
});

test('biyografi, kapak ve katılma portfolyo satırıyla taşınıyor — ikinci sorgu yok', () => {
  assert.match(sayfa, /biyografi: string \| null;/);
  assert.match(sayfa, /kapakFotografiYolu: string \| null;/);
  assert.match(sayfa, /katilmaAni: string \| null;/);
  assert.match(
    sayfa,
    /biyografi: profil\?\.biyografi \?\? null,\n\s*kapakFotografiYolu: profil\?\.kapakFotografiYolu \?\? null,\n\s*katilmaAni: profil\?\.katilmaAni \?\? null,/,
  );
  /* Bağımlılıkta da: satır değişince kart tazeleniyor. */
  assert.match(sayfa, /profil\?\.biyografi,\n\s*profil\?\.kapakFotografiYolu,\n\s*profil\?\.katilmaAni,/);
  /* Kart sosyal veri çekmiyor. */
  assert.doesNotMatch(yorumsuz(baslik), /kendiSosyalProfiliGetir|gorselIndir/);
});

/* ------------------------------------------------------------------ */
/*  YÜKLEME VE KALDIRMA                                                */
/* ------------------------------------------------------------------ */

test('kapak kırpması: 3:1, en çok 1500 genişlik, her zaman JPEG 0.85, beyaz zemin', () => {
  assert.match(yukleme, /const EN_GENIS = 1500;/);
  assert.match(yukleme, /const ORAN = KAPAK_ORANI;/);
  assert.equal(KAPAK_ORANI, 3);
  assert.match(yukleme, /const KALITE = 0\.85;/);
  assert.match(yukleme, /tuval\.toBlob\(\(sonuc\) => coz\(sonuc\), 'image\/jpeg', KALITE\)/);
  /* Beyaz dolgu çizimden ÖNCE. */
  const dolgu = yukleme.indexOf("kalem.fillRect(0, 0, genislik, yukseklik);");
  const cizim = yukleme.indexOf('kalem.drawImage(');
  assert.ok(yukleme.includes("kalem.fillStyle = '#ffffff';") && dolgu > 0 && dolgu < cizim);
  /* Küçük kaynak büyütülmüyor. */
  assert.match(yukleme, /Math\.min\(EN_GENIS, Math\.round\(pencereEn\)\)/);
  /* 2 MB kova sınırı istemcide de denetleniyor. */
  assert.match(yukleme, /const KOVA_SINIRI = 2 \* 1024 \* 1024;/);
  assert.match(yukleme, /if \(veri\.size > KOVA_SINIRI\) throw new Error\('cok-buyuk'\);/);
  /* Tür denetimi avatarla aynı liste. */
  assert.match(yukleme, /import \{ IZIN_VERILEN_TURLER, type Kirpma \} from '\.\/ProfilFotografiYukleme';/);
  assert.match(yukleme, /!IZIN_VERILEN_TURLER\.includes\(yeni\.type\)/);
});

test('kareyeCevir değişmedi: CV ve avatar hâlâ saydamlığı koruyan türü seçiyor', () => {
  assert.match(
    avatarYukleme,
    /const hedefTur = dosya\.type === 'image\/jpeg' \? 'image\/jpeg' : 'image\/webp';/,
  );
  assert.doesNotMatch(avatarYukleme, /kapagaCevir/);
});

test('kırpma klavyeyle yapılabiliyor: ok tuşları ve etiketli yakınlık kaydırıcısı', () => {
  assert.match(yukleme, /tabIndex=\{0\}/);
  for (const tus of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
    assert.ok(yukleme.includes(`${tus}: [`), `${tus} kadrajı taşımalı`);
  }
  assert.match(yukleme, /<label htmlFor="kapak-yakinlik"/);
  assert.match(yukleme, /id="kapak-yakinlik"\n\s*type="range"/);
  assert.match(yukleme, /className="mt-2 h-11 w-full accent-blue-600"/);
  /* Çerçeve dikdörtgen, daire değil. */
  assert.match(yukleme, /relative aspect-\[3\/1\] w-full touch-none select-none overflow-hidden rounded-xl/);
  assert.match(yukleme, /setPointerCapture/);
});

test('kaydet yalnız GÜNCEL kadrajla; başarı yalnız profilKapagiYukle döndükten sonra', () => {
  /* Gecikmeli üretimde eski kadraj yüklenmesin. */
  assert.match(yukleme, /const guncelKapak = kapak && kapak\.kirpma === kirpma \? kapak\.hazir : null;/);
  assert.match(yukleme, /disabled=\{kilitli \|\| !guncelKapak\} className=\{BIRINCIL_EYLEM\}/);
  const cagri = yukleme.indexOf('await profilKapagiYukle(');
  const basari = yukleme.indexOf('onKaydedildi(yeniYol);');
  assert.ok(cagri > 0 && basari > cagri);
  /* Vazgeç gönderim sırasında kilitli. */
  assert.match(yukleme, /onClick=\{onVazgec\} disabled=\{kilitli\}/);
  assert.match(yukleme, /'Kaydediliyor…' : 'Kapağı kaydet'/);
});

test('düzenleme ekranında "Kapak fotoğrafın" bölümü fotoğraf bölümünün hemen altında', () => {
  const fotograf = sayfa.indexOf('id="sosyal-fotograf-basligi"');
  const kapakBolumu = sayfa.indexOf('id="sosyal-kapak-basligi"');
  const form = sayfa.indexOf('<SosyalProfilDuzenleme', kapakBolumu);
  assert.ok(fotograf > 0 && kapakBolumu > fotograf && form > kapakBolumu);
  assert.match(sayfa, /\{profil!\.kapakFotografiYolu \? 'Kapağı değiştir' : 'Kapak ekle'\}/);
  /* Kaldır yalnız yol varken. */
  assert.match(sayfa, /\{profil!\.kapakFotografiYolu && \(\n\s*<button\n\s*type="button"\n\s*onClick=\{kapagiKaldir\}/);
  assert.match(sayfa, /Kapak fotoğrafın kaldırılamadı; kapağın duruyor\./);
});

test('kaldırma ve yükleme sonrası yerel satır ancak sunucu kabul edince değişiyor', () => {
  const kaldir = sayfa.slice(sayfa.indexOf('const kapagiKaldir = async'));
  const cagri = kaldir.indexOf('await profilKapagiKaldir(kullaniciId);');
  const yerel = kaldir.indexOf('setProfil((onceki) => (onceki ? { ...onceki, kapakFotografiYolu: null } : onceki));');
  const hataDali = kaldir.indexOf("setKapakKaldirmaDurumu('hata');");
  assert.ok(cagri > 0 && yerel > cagri && hataDali > yerel, 'setProfil ancak await sonrası, hata dalında değil');

  assert.match(sayfa, /if \(gorunum === 'kapak'\) \{\n\s*return kabuk\(\n\s*<KapakFotografiYukleme/);
  assert.match(sayfa, /setProfil\(\(onceki\) => \(onceki \? \{ \.\.\.onceki, kapakFotografiYolu: yeniYol \} : onceki\)\);/);
  assert.match(sayfa, /setKapakBildirimi\('Kapak fotoğrafın güncellendi\.'\);/);
});

test('kapak için dişli menüsünde ya da görüntüleyicide ikinci giriş yok', () => {
  for (const kaynak of [menu, goruntuleyici, gorunum]) {
    assert.doesNotMatch(yorumsuz(kaynak), /setGorunum\('kapak'\)|Kapağı değiştir|Kapak ekle|KapakFotografiYukleme/);
  }
  /* Tek giriş: düzenleme bloğundaki düğme. */
  assert.equal((yorumsuz(sayfa).match(/setGorunum\('kapak'\)/g) ?? []).length, 1);
});

/* ------------------------------------------------------------------ */
/*  KAPAK HER GENİŞLİKTE 3:1                                           */
/* ------------------------------------------------------------------ */

test('kapak her genişlikte 3:1; oran ve sınıfı tek yerde, 5:1 kuralı yok', () => {
  /*
    KULLANICI KARARI 24 EYLÜL 2026: X sayfa düzeni, sol menü yok. Profil
    sütunu en çok 600 piksel; kapak geniş ekranda 600×200, X'in birebir
    ölçüsü.

    ESKİ ŞART: "`lg:` ve üstünde 5:1, altında 3:1" ve `KapakFotografi`nin
    `kip` prop'u ("bant" / "dosya"). 5:1 kart 1343 piksele yayıldığı için
    vardı (3:1'de 1343×448). Sütun 600'e inince gerek kalmadı; iki kip aynı
    sınıfa düştüğü için prop da kalktı.
    YENİ ŞART: tek oran (`KAPAK_ORANI = 3`), tek literal sınıf
    (`aspect-[3/1]`), sayıyla sınıf aynı; hiçbir yerde `lg:aspect-`.
  */
  assert.equal(KAPAK_ORANI, 3);
  assert.ok(oranlar.includes(`export const KAPAK_SINIFI = 'aspect-[${KAPAK_ORANI}/1]';`));
  assert.doesNotMatch(yorumsuz(oranlar), /GENIS_EKRAN|lg:aspect/);
  assert.match(kapak, /import \{ KAPAK_SINIFI \} from '\.\.\/\.\.\/lib\/kapak-orani';/);
  assert.match(kapak, /const bant = `\$\{TABAN\} \$\{KAPAK_SINIFI\}`;/);
  assert.match(kapak, /object-cover object-center/);
  for (const [ad, kaynak] of Object.entries({ kapak, baslik, gorunum, yukleme, sayfa, sirket })) {
    assert.doesNotMatch(yorumsuz(kaynak), /lg:aspect-|kip="(bant|dosya)"/, `${ad}: eski oran kuralı`);
  }
  /* Şirketin logo bandı da aynı sınıfı okuyor. */
  assert.match(sirket, /\$\{KAPAK_SINIFI\}/);
});

test('kırpma ekranında geniş ekran kılavuzu ve cümlesi kalktı; sürükleme ve klavye aynı', () => {
  /*
    ESKİ ŞART: 3:1 çerçevenin üstünde ve altında %20'lik yarı saydam
    karartma (5:1 kesimi) ve "Geniş ekranlarda kapağın yalnız açık kalan
    orta şeridi görünür…" cümlesi.
    YENİ ŞART: ikisi de yok. Kırpmada görülen artık her yerde profilde
    görülenle aynı (her genişlikte 3:1). Çerçeve kendi kendini kapatıyor;
    sürükleme ve ok tuşları çerçevenin kendisinde.
  */
  const kod = yorumsuz(yukleme);
  assert.doesNotMatch(kod, /GENIS_EKRAN_KESIMI|bg-black\/35|border-dashed/);
  assert.doesNotMatch(kod, /Geniş ekranlarda kapağın/);
  const cerceve = yukleme.slice(yukleme.indexOf('ref={cerceveRef}'), yukleme.indexOf('<label htmlFor="kapak-yakinlik"'));
  assert.match(cerceve, /onPointerDown=/);
  assert.match(cerceve, /onKeyDown=/);
  assert.match(cerceve, /olay\.currentTarget\.setPointerCapture/);
  assert.match(yukleme, /import \{ KAPAK_ORANI \} from '\.\.\/\.\.\/lib\/kapak-orani';/);
});
