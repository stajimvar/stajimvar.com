import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  DOĞRULANMIŞ RESMÎ HESAP TİKİ

  Doğrulama göstergesinin TEK işi inandırıcı olmak. Bu testler onu üç
  yönden koruyor: taklit edilememesi, her ekranda aynı görünmesi ve dar
  ekranda kaybolmaması.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const TIK = oku('src/components/sosyal/ResmiTik.tsx');

/* Tikin çizildiği bütün ekranlar; yenisi eklenirse buraya da eklenmeli. */
const YUZEYLER = [
  'src/components/sosyal/SosyalProfilGorunumu.tsx',
  'src/components/sosyal/AkisKarti.tsx',
  'src/components/sosyal/KullaniciArama.tsx',
  'src/components/sosyal/BaglantilarSayfasi.tsx',
];

test('tek bileşen, her yerde yeniden kullanılıyor', () => {
  /*
    Ayrı kopyalar olsaydı biri ötekinin kurallarını (etiket metni,
    ölçü, kırpılmama) zamanla unuturdu — ve bir ekranda doğrulanmış
    görünen hesap ötekinde doğrulanmamış görünürdü.
  */
  for (const dosya of YUZEYLER) {
    const kaynak = oku(dosya);
    assert.match(kaynak, /import \{ ResmiTik \} from '\.\/ResmiTik';/, `${dosya}: ortak bileşen yok`);
    assert.match(kaynak, /<ResmiTik resmiMi=/, `${dosya}: tik çizilmiyor`);
    /* Kendi kopyasını çizen ekran olmamalı. */
    assert.doesNotMatch(kaynak, /<BadgeCheck[^>]*text-blue/, `${dosya}: kendi tikini çiziyor`);
  }
});

test('tikin TEK kaynağı veritabanındaki bayrak', () => {
  /*
    Bileşen `resmiMi` dışında hiçbir şeye bakmıyor: ada, alana,
    paylaşım sayısına değil. Ad karşılaştırmasıyla çizilseydi
    "stajimvar1" diye kaydolan biri de tik alırdı.
  */
  assert.match(TIK, /if \(!resmiMi\) return null;/);
  assert.doesNotMatch(TIK, /stajimvar/i, 'tik ada göre çizilmemeli');

  /* Alan sunucudan geliyor ve sorgularda gerçekten seçiliyor. */
  const sorgu = oku('src/lib/queries/sosyal.ts');
  assert.match(sorgu, /resmiMi: satir\.resmi_mi === true,/);
  assert.match(sorgu, /resmiMi: \(p as any\)\.resmi_mi === true,/);
  assert.match(sorgu, /yayinda_mi, resmi_mi, avatar_path/);
});

test('EMOJİ DEĞİL: ad ve biyografi metnine hiçbir şey eklenmiyor', () => {
  /*
    Tiki ada ya da biyografiye ✔ diye yazmak üç şeyi bozardı: herkes
    yazabilirdi (serbest metin), ekran okuyucu "beyaz ağır onay
    işareti" derdi, ve ad kesilince tik de kesilirdi.
  */
  for (const dosya of [...YUZEYLER, 'src/lib/queries/sosyal.ts']) {
    const kaynak = oku(dosya);
    assert.doesNotMatch(kaynak, /[✔✓☑️✅]/u, `${dosya}: metne tik karakteri eklenmiş`);
  }
  /* Ad hâlâ yalnız addan oluşuyor; işaret ayrı bir düğüm. */
  assert.match(TIK, /<span\s+role="img"/);
});

test('erişilebilirlik: etiket ve açıklama ayrı ayrı yazılı', () => {
  assert.match(TIK, /export const RESMI_TIK_ETIKETI = 'Doğrulanmış StajımVar resmî hesabı';/);
  assert.match(TIK, /export const RESMI_TIK_ACIKLAMASI = 'StajımVar resmî hesabı';/);
  assert.match(TIK, /aria-label=\{RESMI_TIK_ETIKETI\}/);
  assert.match(TIK, /title=\{RESMI_TIK_ACIKLAMASI\}/);

  /*
    DOKUNMATİKTE DE AÇILIYOR: `title` yalnız fareyle çalışıyor,
    telefonda hiçbir karşılığı yok. Odak alabilen bir düğüm + balon,
    dokunarak da açılmasını sağlıyor.
  */
  assert.match(TIK, /tabIndex=\{0\}/);
  assert.match(TIK, /group-hover\/tik:block group-focus\/tik:block/);
  assert.match(TIK, /role="tooltip"/);

  /* Simge kendisi okunmuyor: etiketi taşıyan sarmalayıcı. */
  assert.match(TIK, /<BadgeCheck\s*\n\s*aria-hidden/);
});

test('mobilde adı taşırmıyor ve tıklama hedefini bozmuyor', () => {
  /*
    Ad satırları `truncate`: uzun bir ad dar ekranda kesiliyor. Tik
    metnin İÇİNDE olsaydı onunla birlikte kesilirdi — işaretin
    görünmesi adın uzunluğuna kalırdı.
  */
  assert.match(TIK, /shrink-0/);
  /* Balon satırın yüksekliğini büyütmüyor ve tıklamayı yutmuyor. */
  assert.match(TIK, /pointer-events-none absolute/);

  /*
    TİK TIKLANABİLİR ALANIN KARDEŞİ, İÇİNDE DEĞİL: iç içe tıklama
    hedefi kurmamak için. Ada basmak profili açıyor, tik yalnız
    gösterge.
  */
  const kart = oku('src/components/sosyal/AkisKarti.tsx');
  const satir = kart.slice(kart.indexOf('<span className="flex min-w-0 items-center gap-1">'));
  assert.ok(
    satir.indexOf('</button>') < satir.indexOf('<ResmiTik'),
    'tik düğmenin içinde kalmış',
  );

  const baglanti = oku('src/components/sosyal/BaglantilarSayfasi.tsx');
  const baglantiSatiri = baglanti.slice(baglanti.indexOf('<span className="flex min-w-0 items-center gap-1">'));
  assert.ok(
    baglantiSatiri.indexOf('</a>') < baglantiSatiri.indexOf('<ResmiTik'),
    'tik bağlantının içinde kalmış',
  );
});

test('PAYLAŞIM ROZETİ AYRI DURUYOR: tik onun yerine geçmiyor', () => {
  /*
    "StajımVar'dan · Resmî içerik" rozeti PAYLAŞIMIN kitlesini
    anlatıyor; tik HESABIN doğrulanmış olduğunu. Resmî hesap ileride
    sıradan bir paylaşım yaparsa o kartta tik olur, rozet olmaz.
  */
  const kart = oku('src/components/sosyal/AkisKarti.tsx');
  assert.match(kart, /StajımVar'dan · Resmî içerik/);
  assert.match(kart, /paylasim\.resmiMi \? \(/);
  /* İkisi farklı alandan besleniyor. */
  assert.match(kart, /<ResmiTik resmiMi=\{paylasim\.yazar\.resmiMi\}/);
});

test('veritabanı koruması duruyor: kullanıcı kendine tik veremiyor', () => {
  /*
    Arayüzdeki kapı İKİNCİ kapı. Bayrağı yalnız yönetici verebiliyor ve
    bu kural veritabanında: sütun izni yok, üstüne tetikleyici var.
  */
  const goc = oku('supabase/migrations/20260928010000_resmi_hesap.sql');
  assert.match(goc, /create or replace function sosyal_gizli\.resmi_bayragi_kilidi\(\)/);
  assert.match(goc, /not public\.is_admin\(\)/);

  const rpc = oku('supabase/migrations/20260928020000_resmi_hesap_isaretle.sql');
  assert.match(rpc, /if not public\.is_admin\(\) then/);
});

test('arama sonucu da tik taşıyor: gösterge her ekranda aynı', () => {
  /*
    Arama sonuçları sabit kolonlu bir RPC'den geliyordu; `resmi_mi`
    eklenmeden "stajimvar" diye arayan kullanıcı aradığı hesabı
    tiksiz görürdü. Göstergenin bir ekranda olup ötekinde olmaması,
    göstergenin kendisini şüpheli hâle getirir.
  */
  const goc = oku('supabase/migrations/20260928030000_arama_resmi_tik.sql');
  assert.match(goc, /drop function if exists public\.sosyal_kullanici_ara\(text\);/);
  assert.match(goc, /resmi_mi\s+boolean/);
  assert.match(goc, /sp\.sehir, sp\.resmi_mi/);
  assert.match(goc, /grant execute on function public\.sosyal_kullanici_ara\(text\) to authenticated;/);
  assert.doesNotMatch(goc, /to anon/);
});
