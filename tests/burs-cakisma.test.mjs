import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KURUMLAR,
  CIFTLER,
  DURUMLAR,
  ERISIM_TARIHI,
  ciftBul,
  kurumBul,
  kurumunCiftleri,
  tarihYazisi,
} from '../src/lib/burs-cakisma.mjs';

/*
  BU TESTİN KORUDUĞU ŞEY

  Matrisin tek değeri, her hücrenin arkasında resmî bir belge olması. Bir
  hücre kaynaksız kalırsa ya da kaynak bir foruma giderse sayfa "bilgi veren
  sayfa" olmaktan çıkıp "iddia eden sayfa" oluyor. Aşağıdaki kontroller
  ürünün göründüğü hâlini değil, o sözü koruyor.
*/

const RESMI_ALANLAR = [
  'gsb.gov.tr',
  'resmigazete.gov.tr',
  'mevzuat.gov.tr',
  'vgm.gov.tr',
  'tev.org.tr',
  'mev.org.tr',
  'tubitak.gov.tr',
];

const alanAdi = (url) => new URL(url).hostname.replace(/^www\./, '');

test('her kurum çifti için bir hücre var — boş hücre yok', () => {
  const eksik = [];
  for (let i = 0; i < KURUMLAR.length; i += 1) {
    for (let j = i + 1; j < KURUMLAR.length; j += 1) {
      if (!ciftBul(KURUMLAR[i].id, KURUMLAR[j].id)) {
        eksik.push(`${KURUMLAR[i].id} × ${KURUMLAR[j].id}`);
      }
    }
  }
  assert.deepEqual(eksik, [], 'Bu çiftler matriste boş kalıyor:\n  ' + eksik.join('\n  '));

  const n = KURUMLAR.length;
  assert.equal(CIFTLER.length, (n * (n - 1)) / 2, 'Çift sayısı kurum sayısıyla uyuşmuyor');
});

test('aynı çift iki kez yazılmamış ve köşegen boş', () => {
  const gorulen = new Set();
  for (const k of CIFTLER) {
    assert.notEqual(k.a, k.b, `Köşegen kaydı var: ${k.a}`);
    const anahtar = [k.a, k.b].sort().join('|');
    assert.ok(!gorulen.has(anahtar), `Çift iki kez yazılmış: ${anahtar}`);
    gorulen.add(anahtar);
  }
});

test('matris simetrik: sıra sonucu değiştirmiyor', () => {
  for (const k of CIFTLER) {
    assert.deepEqual(ciftBul(k.a, k.b), ciftBul(k.b, k.a));
  }
  assert.equal(ciftBul('kyk-burs', 'kyk-burs'), null, 'Kurumun kendisiyle çifti olmamalı');
  assert.equal(ciftBul('kyk-burs', 'olmayan-kurum'), null);
});

test('her hücrenin gerekçesi, resmî kaynağı ve erişim tarihi var', () => {
  for (const k of CIFTLER) {
    const ad = `${k.a} × ${k.b}`;
    assert.ok(DURUMLAR[k.durum], `${ad}: tanımsız durum "${k.durum}"`);
    assert.ok(k.gerekce && k.gerekce.length > 20, `${ad}: gerekçe yok ya da çok kısa`);
    assert.ok(k.kaynakBaslik && k.kaynakBaslik.length > 5, `${ad}: kaynak başlığı yok`);
    assert.match(k.kaynakUrl ?? '', /^https:\/\//, `${ad}: kaynak adresi https değil`);
    assert.match(k.erisimTarihi ?? '', /^\d{4}-\d{2}-\d{2}$/, `${ad}: erişim tarihi biçimsiz`);
  }
});

/*
  KAYNAK RESMÎ OLMAK ZORUNDA

  Bu konuda en çok dolaşan bilgi forum ve Instagram gönderilerinden geliyor
  ve çoğu eski. TEV örneği tam olarak bu: yıllarca "TEV alan KYK alamaz"
  diye bilinen kural 01.09.2026'da kalktı. Kaynağı kurumun kendi adresine
  bağlamayan bir hücre, ertesi yıl sessizce yanlış olur.
*/
test('bütün kaynaklar kurumların kendi resmî alan adlarında', () => {
  for (const k of CIFTLER) {
    const alan = alanAdi(k.kaynakUrl);
    assert.ok(
      RESMI_ALANLAR.some((r) => alan === r || alan.endsWith(`.${r}`)),
      `${k.a} × ${k.b}: kaynak resmî değil (${alan})`,
    );
  }
});

test('kurum kayıtları eksiksiz; resmî adresi olmayan kurum bunu açıklıyor', () => {
  const idler = new Set();
  for (const k of KURUMLAR) {
    assert.ok(!idler.has(k.id), `Yinelenen kurum id: ${k.id}`);
    idler.add(k.id);
    assert.ok(k.ad && k.kisaAd, `${k.id}: ad eksik`);
    assert.ok(
      ['kamu', 'vakif', 'belediye', 'universite'].includes(k.tur),
      `${k.id}: bilinmeyen tür "${k.tur}"`,
    );
    /*
      "Belediye bursu" diye tek bir kurum yok. Oraya rastgele bir belediyenin
      adresini koymak, olmayan merkezî bir kural varmış gibi gösterir; bu
      yüzden adres yoksa yerine açıklama isteniyor.
    */
    if (k.resmiUrl === null) {
      assert.ok(k.adresNotu && k.adresNotu.length > 30, `${k.id}: adres de not da yok`);
    } else {
      assert.match(k.resmiUrl, /^https:\/\//, `${k.id}: resmî adres https değil`);
    }
  }
});

test('çiftlerdeki kurum kimlikleri KURUMLAR listesinde var', () => {
  const idler = new Set(KURUMLAR.map((k) => k.id));
  for (const k of CIFTLER) {
    assert.ok(idler.has(k.a), `Bilinmeyen kurum: ${k.a}`);
    assert.ok(idler.has(k.b), `Bilinmeyen kurum: ${k.b}`);
  }
});

/*
  "OLUR" EN PAHALI İDDİA

  Öğrenci "olur" gördüğünde ikinci bursa başvuruyor; yanlışsa bedelini o
  ödüyor. Bu yüzden "olur" yazılan her hücrenin kaynağı, o iki kurumdan
  BİRİNİN kendi metni olmak zorunda — üçüncü bir kurumun belgesinden
  çıkarım yapılmış bir "olur" kabul edilmiyor.
*/
test('"olur" hücrelerinin kaynağı çiftin taraflarından birine ait', () => {
  const kurumAlani = {
    'kyk-burs': 'gsb.gov.tr',
    'kyk-kredi': 'gsb.gov.tr',
    tev: 'tev.org.tr',
    vgm: 'vgm.gov.tr',
    mev: 'mev.org.tr',
    'tubitak-2205': 'tubitak.gov.tr',
  };
  for (const k of CIFTLER.filter((x) => x.durum === 'olur')) {
    const alan = alanAdi(k.kaynakUrl);
    const taraflar = [kurumAlani[k.a], kurumAlani[k.b]].filter(Boolean);
    assert.ok(
      taraflar.some((t) => alan === t || alan.endsWith(`.${t}`)),
      `${k.a} × ${k.b}: "olur" diyor ama kaynak taraflardan birine ait değil (${alan})`,
    );
  }
});

test('kurumunCiftleri bir kurumun diğer hepsini döndürüyor', () => {
  const satirlar = kurumunCiftleri('tev');
  assert.equal(satirlar.length, KURUMLAR.length - 1);
  assert.ok(satirlar.every((s) => s.cift && s.diger.id !== 'tev'));
  assert.deepEqual(kurumunCiftleri('olmayan-kurum').length, 0);
});

test('kurumBul ve tarihYazisi', () => {
  assert.equal(kurumBul('tev').tur, 'vakif');
  assert.equal(kurumBul('yok'), null);
  assert.equal(tarihYazisi('2026-09-04'), 'Eylül 2026');
  assert.equal(tarihYazisi('2026-01-31'), 'Ocak 2026');
  assert.equal(tarihYazisi('bozuk'), '');
  assert.equal(tarihYazisi(), tarihYazisi(ERISIM_TARIHI));
});

/*
  RENK TEK BAŞINA ANLAM TAŞIMASIN

  Hücreyi yalnızca yeşil/kırmızı ile anlatmak, renk körü okuyucu için boş
  bir tablo demek. Her durumun yazılı etiketi ve bir simgesi olmak zorunda.
*/
test('her durumun yazılı etiketi ve simgesi var', () => {
  for (const [id, d] of Object.entries(DURUMLAR)) {
    assert.ok(d.etiket && d.etiket.length > 2, `${id}: etiket yok`);
    assert.ok(d.isaret && d.isaret.length >= 1, `${id}: simge yok`);
    assert.ok(d.aciklama && d.aciklama.length > 20, `${id}: açıklama yok`);
  }
});
