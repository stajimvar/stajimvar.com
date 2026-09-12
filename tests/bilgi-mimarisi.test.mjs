import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { kaynakOzeti } from '../scripts/kaynak-ozeti.mjs';
import { KAYNAK_SISTEMLERI, KAYNAK_TOPLAM } from '../src/data/kaynak-sistemleri.ts';

/*
  BİLGİ MİMARİSİ VE GÜVEN İDDİALARI

  Bu dosya iki şeyi koruyor: gezinti adlarının içerikle uyumu ve
  Hakkımızda sayfasındaki sayıların gerçek veriden gelmesi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

const header = oku('src/components/Header.tsx');
const kurumsal = oku('src/components/CorporatePages.tsx');

/* ---------------------------------------------------- gezinti adları */

test('DÖRT ANA ALAN DURUYOR — hiçbiri diğerinin altına gömülmedi', () => {
  /*
    Dört alan: İlanlar, Fırsatlar, Ağım, Rehber. Üçü ayrı ve dolu bir
    kullanıcı görevi (üretim, 7 Eylül 2026): İlanlar 114 ilan, Fırsatlar
    121 kayıt, Rehber 71 rehber + 42 bölüm sayfası. Ağım sosyal ağın
    girişi; bugün bağlantılar sayfası.

    Etkinlik (Keşfet) 11 Eylül 2026'da kalktı: 163 kaydın hiçbiri kariyer
    etkinliği değildi, bölüm arşive alındı (göç 20260926120000).
  */
  /* İlan listesi ana sayfanın kendisi; diğer üçü kendi adresinde. */
  for (const yol of ['/', '/firsatlar', '/baglantilar', '/rehber']) {
    assert.ok(header.includes(`href="${yol}"`), `${yol} gezintide yok`);
  }
  for (const kimlik of ['nav-tab-opportunities', 'nav-tab-network', 'nav-tab-guides']) {
    assert.ok(header.includes(kimlik), kimlik);
  }
  assert.ok(!header.includes('href="/kesfet"'), 'Keşfet gezintiden kalktı');
});

test('AĞIM SEKMESİ: lucide Users, etiket "Ağım"', () => {
  assert.match(header, /id="nav-tab-network"[\s\S]{0,900}<Users[\s\S]{0,200}<span>Ağım<\/span>/);
});

test('İŞVEREN BAĞLANTISI ÖĞRENCİ SEKMELERİNDEN AYRI', () => {
  /*
    Öğrenci sekmeleri bir hap grubunda; işveren bağlantısı hesap
    kümesinde (Giriş Yap / Kayıt Ol yanında) ve hap değil düz düğme.
    Ayrım zaten vardı, bu test onu sabitliyor.
  */
  const i = header.indexOf('İşverenler için');
  assert.ok(i > 0, 'işveren bağlantısı bulunamadı');
  const cevre = header.slice(i - 700, i + 700);
  assert.match(cevre, /header-login-btn/, 'işveren bağlantısı hesap kümesinde durmalı');
  assert.doesNotMatch(header.slice(i - 400, i), /nav-tab-/, 'öğrenci sekme grubuna girmemeli');
});

/* --------------------------------------- Hakkımızda: sayılar gerçek mi */

test('KAYNAK ÖZETİ ÜRETİLMİŞ DOSYAYLA AYNI', () => {
  /*
    Üretilmiş dosya elle düzenlenirse sessizce eskir. Test kaynağı
    (automation/sources.json) yeniden okuyup karşılaştırıyor.
  */
  const ham = JSON.parse(oku('automation/sources.json'));
  const beklenen = kaynakOzeti(Array.isArray(ham) ? ham : Object.values(ham)[0]);
  assert.deepEqual(
    KAYNAK_SISTEMLERI.map((x) => ({ ad: x.ad, adet: x.adet })),
    beklenen,
    'src/data/kaynak-sistemleri.ts eski — `node scripts/kaynak-ozeti.mjs --yaz` çalıştır'
  );
  assert.equal(KAYNAK_TOPLAM, beklenen.reduce((a, x) => a + x.adet, 0));
});

test('HAKKIMIZDA SAYFASINDA ELLE YAZILMIŞ KAYNAK SAYISI YOK', () => {
  /*
    "Şu anda altı farklı sistemden ilan alıyoruz" cümlesi yazıldığı gün
    doğruydu ama elle yazılmıştı: yedinci sistem eklendiğinde sayfa
    sessizce yanlış konuşmaya başlardı. Sayı artık veriden geliyor.
  */
  /* Yorumlar atılıyor: eski cümleyi ANLATAN yorum, cümlenin kendisi değil. */
  const hakkimizda = kurumsal
    .slice(kurumsal.indexOf("slug === 'hakkimizda'"), kurumsal.indexOf("slug === 'iletisim'"))
    .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '');
  assert.doesNotMatch(hakkimizda, /altı farklı sistem/i);
  assert.match(hakkimizda, /\{KAYNAK_TOPLAM\}/);
  assert.match(hakkimizda, /KAYNAK_SISTEMLERI\.map/);
});

test('KAYNAK LİSTESİ ORTAKLIK İZLENİMİ ÜRETMİYOR', () => {
  assert.match(kurumsal, /Takip ettiğimiz resmî kaynaklardan bazıları/);
  assert.match(kurumsal, /Bu bir ortaklık değil/);
  /* Logo yok: marka logosu onay ya da sponsorluk gibi okunurdu. */
  const bolum = kurumsal.slice(kurumsal.indexOf('Takip ettiğimiz resmî'));
  const liste = bolum.slice(0, bolum.indexOf('</S>'));
  assert.doesNotMatch(liste, /<img|logo/i, 'kaynaklar metin olarak yazılmalı');
});

/* ------------------------------------------ Hakkımızda: taranabilirlik */

test('NE YAPIYORUZ / NE YAPMIYORUZ — İKİSİ DE BEŞ MADDE', () => {
  const say = (ad) => {
    const i = kurumsal.indexOf(`const ${ad} = [`);
    assert.ok(i > 0, `${ad} bulunamadı`);
    const govde = kurumsal.slice(i, kurumsal.indexOf('] as const;', i));
    return (govde.match(/^\s{4}ikon:/gm) || []).length;
  };
  assert.equal(say('YAPTIKLARIMIZ'), 5);
  assert.equal(say('YAPMADIKLARIMIZ'), 5);
  assert.match(kurumsal, /<S baslik="Ne yapıyoruz">/);
  assert.match(kurumsal, /<S baslik="Ne yapmıyoruz">/);
});

test('İKON AİLESİ DEĞİŞMEDİ — emoji yok', () => {
  const hakkimizda = kurumsal.slice(
    kurumsal.indexOf("slug === 'hakkimizda'"),
    kurumsal.indexOf("slug === 'iletisim'")
  );
  assert.doesNotMatch(
    hakkimizda + kurumsal.slice(0, kurumsal.indexOf('export const CorporateContent')),
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
    'emoji girmiş'
  );
  assert.match(kurumsal, /from 'lucide-react'/);
});

test('MOBİLDE TEK KOLON', () => {
  /* İki sütun yalnız sm ve üstünde; 390 pikselde her madde tam genişlik. */
  assert.match(kurumsal, /grid gap-2\.5 sm:grid-cols-2/);
});

test('UYDURMA REFERANS, YORUM VEYA METRİK YOK', () => {
  const hakkimizda = kurumsal
    .slice(kurumsal.indexOf("slug === 'hakkimizda'"), kurumsal.indexOf("slug === 'iletisim'"))
    .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '');
  for (const kalip of [/müşteri yorumu/i, /kullanıcımız diyor/i, /iş ?ortağımız/i, /güvendiği marka/i, /binlerce öğrenci/i]) {
    assert.doesNotMatch(hakkimizda, kalip, String(kalip));
  }
  /*
    "sponsor" kelimesi sayfada geçiyor ama bir sponsoru DUYURMAK için
    değil: "Bir gün sponsorlu içerik yayımlarsak bunu açıkça
    etiketleyeceğiz" cümlesi bir taahhüt. Var olan bir sponsor iddiası
    aranıyor, kelimenin kendisi değil.
  */
  assert.doesNotMatch(hakkimizda, /sponsorumuz|sponsorlarımız|desteğiyle sunulmaktadır/i);
  /* Rehber ve bölüm sayısı da veriden; sabit rakam yazılmıyor. */
  assert.match(kurumsal, /\$\{REHBERLER\.length\}/);
  assert.match(kurumsal, /\$\{BOLUMLER\.length\}/);
});
