import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  KURAL ARTIK ARAYÜZDE DE İZAH EDİLİYOR (kullanıcı kararı, 19 Eylül 2026)

  Veritabanı tarafı 20261019010000 ile canlıda: farklı alandaki iki kişi
  arasında bağlantı isteği oluşmuyor. Arayüz o kuralı HİÇ anlatmıyordu;
  kullanıcı "Bağlantı kur" düğmesine basıyor, istek 403 ile düşüyor ve
  ekranda sebebine dair bir şey olmuyordu.

  Bu testler üç şeyi koruyor: bağlantı ÖNEREN her dal önce sebebi
  soruyor, sebep karşı tarafın alanını SIZDIRMIYOR, ve 'engel' /
  'gorunmez' için hâlâ hiçbir şey çizilmiyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const dugme = oku('src/components/sosyal/BaglantiDugmesi.tsx');
const sorgu = oku('src/lib/queries/sosyal.ts');
const tipler = oku('src/lib/database.types.ts');

/*
  Yorumsuz gövde.

  "Bileşen alan adını okumuyor" iddiası KODA bakıyor; yorumlar da metin
  ve gerekçeyi anlatmak için kolon adını anmak zorundalar. Yorumu da
  tarayan bir arama, doğru yazılmış bir gerekçeyi hata sayardı.
*/
const kodu = (kaynak) =>
  kaynak.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ------------------------------------------------------------ Veri erişimi

test('sebep RPC ile soruluyor, istemcide hesaplanmıyor', () => {
  assert.match(sorgu, /db\.rpc\('baglanti_engeli', \{ hedef: hedefId \}\)/);
  /*
    İstemci iki alanı karşılaştırsaydı KENDİ alanını da karşı tarafın
    alanını da okuması gerekirdi; sunucu tek kelimeyle söylüyor ve
    bileşen alan adını hiç taşımıyor.
  */
  assert.match(sorgu, /export async function baglantiEngeli\(hedefId: string\)/);
});

test('altı sebebin hepsi tanınıyor', () => {
  const liste = sorgu.slice(sorgu.indexOf('const ENGEL_SEBEPLERI'));
  for (const sebep of ['yok', 'alanim-yok', 'alani-yok', 'farkli-alan', 'engel', 'gorunmez']) {
    assert.match(liste, new RegExp(`'${sebep}'`), `sebep eksik: ${sebep}`);
  }
});

test('tanınmayan değer sebep değil, null', () => {
  /* Uydurulmuş bir sebep, kullanıcıya yanlış işi yaptırırdı. */
  assert.match(sorgu, /Promise<BaglantiEngeli \| null>/);
  assert.match(sorgu, /ENGEL_SEBEPLERI as readonly string\[\]\)\.includes/);
});

test('RPC tanımı üretilmiş tiplerde var ve daraltılmamış', () => {
  assert.match(tipler, /baglanti_engeli: \{ Args: \{ hedef: string \}; Returns: string \};/);
});

// ------------------------------------------------------------- Üç dal, üç kapı

test('bağlantı öneren üç dal da önce sebebi soruyor', () => {
  /*
    Üç dal: yeni istek (`baglantiKur`), kendi reddini geri alma
    (`baglantiYenidenBaslat`), süresi dolmuş isteği yeniden gönderme
    (`baglantiYenidenGonder`). Üçü de `kuralCumlesi` dolu olduğunda
    düğme yerine sebep satırını çiziyor.
  */
  const koseliDallar = [...dugme.matchAll(/kuralCumlesi \? \(\s*\n\s*<EngelSatiri/g)];
  assert.equal(koseliDallar.length, 2, 'iki dal doğrudan üçlü işleçle geçiyor');
  /* Üçüncüsü (reddedilen taraf) kendi `else if` dalında. */
  assert.match(dugme, /\} else if \(kuralCumlesi\) \{[\s\S]{0,600}govde = <EngelSatiri/);
});

test('düğme dalları sebep dalının ALTINDA kaldı', () => {
  /* Sebep yoksa bugünkü davranış aynen duruyor: üç düğme de yerinde. */
  for (const eylem of ['baglantiKur', 'baglantiYenidenBaslat', 'baglantiYenidenGonder']) {
    assert.match(dugme, new RegExp(`eylemiCalistir\\(\\(\\) => ${eylem}\\(`), eylem);
  }
});

test('yanıt ve kaldırma dallarına karışmıyor', () => {
  /*
    Kabul, reddet, geri çek ve bağlantıyı kaldır YENİ bağlantı kurmuyor;
    alan kuralı onları durdurmuyor ve arayüz de durdurmuş gibi
    göstermiyor.
  */
  const yanitDali = dugme.slice(
    dugme.indexOf("bilgi.durum === 'bekliyor' && bilgi.benMiGonderdim"),
    dugme.indexOf("bilgi.durum === 'red' && !bilgi.benMiGonderdim"),
  );
  assert.doesNotMatch(yanitDali, /kuralCumlesi/);
});

// ------------------------------------------------------------------ Metinler

test('üç sebep cümlesi birebir', () => {
  assert.match(
    dugme,
    /'Bağlantı yalnız aynı alandaki kişiler arasında kurulabilir. Bu kişi senin alanında değil.'/,
  );
  assert.match(
    dugme,
    /'Bu kişinin alanı henüz belli değil. Profilinde bölümünü girdiğinde bağlantı kurabilirsin.'/,
  );
  assert.match(dugme, /'Bağlantı kurmak için önce profiline bölümünü gir.'/);
});

test('cümleler olmayan bir adımı tarif etmiyor', () => {
  /*
    "Alanını seç" diye bir ekran YOK: `sector_id` kolonuna istemci
    yazamıyor ve `bolum_girilince_tamamla` (20260926050000) alanı
    BÖLÜMDEN türetiyor. Kullanıcı aradığı seçiciyi bulamayınca elinde
    iş kalmazdı.
  */
  const govde = dugme.slice(
    dugme.indexOf('function engelCumlesi'),
    dugme.indexOf('BÖLÜMÜN GİRİLDİĞİ YERİN ADRESİ'),
  );
  assert.doesNotMatch(govde, /alanını seç/);
  /* Karşı taraf adına iddia yok: "seçmemiş" değil "belli değil". */
  assert.doesNotMatch(govde, /seçmemiş/);
  assert.match(govde, /bölümünü gir/);
});

test('karşı tarafın alan adı yazılmıyor', () => {
  /*
    Alan rozeti karşı tarafın kendi kartında zaten duruyor (ölçüldü,
    20 Eylül 2026), ama HER SATIRDA değil: `ogrenciKimligiGorunurMu`
    resmî hesapta öğrenci kimliğini kapatıyor. Adı bu cümleye koymak,
    rozetin çizilmediği satırda onu geri açmak olurdu. Bileşen alan
    adını hiçbir yerden okumuyor; elinde olmayanı basamaz.
  */
  assert.doesNotMatch(kodu(dugme), /sektorAdi|sector_id|sektorId/);
});

test("'engel' ve 'gorunmez' için cümle yok", () => {
  /*
    O iki durumda `baglanti_durumu` sıfır satır döndürüyor ve bileşen
    `null` dönüyor. Ayrı bir metin yazmak, "bu profil var" bilgisini
    sızdırırdı.
  */
  const cumleler = dugme.slice(
    dugme.indexOf('function engelCumlesi'),
    dugme.indexOf('const PROFIL_YOLU'),
  );
  assert.doesNotMatch(cumleler, /engel === 'engel'/);
  assert.doesNotMatch(cumleler, /engel === 'gorunmez'/);
  /* Sıfır satır dalı yerinde. */
  assert.match(dugme, /if \(!bilgi\) return null;/);
});

test('bekleme tarihi engelli dalda yazılmıyor', () => {
  /*
    "Yeniden gönderilebilir: 12 Ekim" demek, o tarihte gönderilebileceğini
    söylemek olurdu; alan kuralı o tarihte de aynı yerde duruyor.
  */
  const engelliDal = dugme.slice(
    dugme.indexOf('} else if (kuralCumlesi) {'),
    dugme.indexOf('} else {'),
  );
  assert.doesNotMatch(engelliDal, /yenidenDenemeMetni/);
});

// --------------------------------------------------------- Tek tur ve erişim

test('iki istek tek yükleme turunda', () => {
  /*
    Sırayla sorulsaydı "Bağlantı kur" bir an görünür, sonra sebep
    metnine dönüşürdü — kullanıcının basmaya yetişebileceği bir düğme.
  */
  assert.match(dugme, /Promise\.all\(\[\s*\n\s*baglantiDurumu\(hedefId\),/);
  /* Engel sorgusunun hatası asıl durumu düşürmüyor. */
  assert.match(dugme, /baglantiEngeli\(hedefId\)\.catch\(\(\) => null\)/);
});

test('yükleme iskeleti aynı kaldı', () => {
  /*
    24 Eylül 2026 (hap biçimi, kullanıcı onayı): düğme `rounded-full` ve 44
    piksellik bir hap oldu; iskelet de aynı biçime geçti. Eski şart
    `rounded-xl` idi — ölçülen şey aynı: iskelet gelecek düğmenin biçiminde
    ve yüksekliğinde, düğme gelince yer değişmiyor.
  */
  assert.match(dugme, /h-11 w-32 animate-pulse rounded-full bg-gray-100/);
});

test('alan seçimine giden gerçek bir bağlantı var', () => {
  assert.match(dugme, /const PROFIL_YOLU = '\/cv';/);
  assert.match(dugme, /<a\s*\n\s*href=\{PROFIL_YOLU\}/);
  /* Dokunma hedefi 44 piksel ve odak halkası tek kaynaktan. */
  const baglantiSatiri = dugme.slice(dugme.indexOf('href={PROFIL_YOLU}'));
  assert.match(baglantiSatiri.slice(0, 300), /min-h-11/);
  assert.match(baglantiSatiri.slice(0, 300), /\$\{ODAK_HALKASI\}/);
});
