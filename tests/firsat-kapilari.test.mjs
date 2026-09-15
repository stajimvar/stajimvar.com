import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/*
  FIRSAT KAPILARI İLK HTML'DE LİSTE TAŞIYOR

  ÖLÇÜLDÜ (canlı, 14 Eylül 2026):

    sayfa          ilk HTML metni   fırsat bağlantısı
    /burslar             69 karakter        0
    /firsatlar           88 karakter        0
    /yarismalar          90 karakter        0
    /kyk                 62 karakter        0

  Yani 113 fırsat sayfasının tarama kapıları bomboştu: tarayıcı oradan
  tek bir fırsata bile geçemiyordu. Aynı durum /rehber ve /bolumler için
  daha önce düzeltilmişti.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const govde = (ad) => {
  const dosya = path.join(KOK, 'dist', `${ad}.html`);
  if (!existsSync(dosya)) return null;
  const h = readFileSync(dosya, 'utf8');
  return h.slice(h.indexOf('<div id="root">'), h.indexOf('</body>'));
};

test('kategori kapıları gerçek kayıtlara bağlanıyor', () => {
  /* Derleme yapılmadan koşan testte dosyalar yok; sessizce geçiliyor. */
  if (!govde('burslar')) return;

  for (const [ad, enAz] of [
    ['firsatlar', 40],
    ['burslar', 20],
    ['yurtdisi-firsatlari', 20],
    ['kyk', 1],
    ['yarismalar', 1],
  ]) {
    const g = govde(ad);
    const bag = (g.match(/href="\/firsatlar\//g) || []).length;
    assert.ok(bag >= enAz, `/${ad}: ${bag} bağlantı, en az ${enAz} beklenir`);
    const metin = g.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    assert.ok(metin.length > 200, `/${ad}: ilk HTML metni kısa (${metin.length})`);
  }
});

test('detay <title> kurum adını iki kez yazmıyor', () => {
  /*
    ÖLÇÜLDÜ (canlı, 15 Eylül 2026): yayındaki 112 kaydın 47'sinde kurum
    adı başlığın İÇİNDE zaten geçiyor, yani `— {kurum}` eki tekrardı:

      "Erciyes Organ Nakli Vakfı Bursu — Erciyes Organ Nakli Vakfı | StajımVar"

    Aynı ölçümde 112 başlığın 71'i 60 karakteri aşıyordu (ortalama 65),
    yani arama sonucunda kırpılıyordu. Tekrar atıldı; kurum adı başlıkta
    GEÇMİYORSA ek duruyor (65 kayıt) çünkü orada yeni bilgi taşıyor.
  */
  const betik = oku('scripts/onrender.mjs');

  /* Şablon artık ekleme kararını veren yardımcıdan geçiyor. */
  assert.match(betik, /baslik: `\$\{firsatBasligi\(f\)\} \| StajımVar`/);
  assert.doesNotMatch(betik, /\$\{f\.title\} — \$\{f\.organization_name\}/);
  /* Karşılaştırma Türkçe küçük harfle: "İ/i" ayrımı olmadan tekrar kaçardı. */
  assert.match(betik, /toLocaleLowerCase\('tr-TR'\)/);

  /*
    DAVRANIŞ: derlenmiş sayfalarda tekrar kalmamalı. Derleme yapılmadan
    koşan testte dosyalar yok; sessizce geçiliyor.
  */
  const dizin = path.join(KOK, 'dist', 'firsatlar');
  if (!existsSync(dizin)) return;

  const kucuk = (s) => s.toLocaleLowerCase('tr-TR');
  let olculen = 0;
  for (const ad of readdirSync(dizin).filter((a) => a.endsWith('.html'))) {
    const html = readFileSync(path.join(dizin, ad), 'utf8');
    const eslesme = html.match(/<title>([^<]*)<\/title>/);
    if (!eslesme) continue;
    const baslik = eslesme[1].replace(/\s*\|\s*StajımVar\s*$/, '');
    const parcalar = baslik.split(' — ');
    if (parcalar.length !== 2) continue;
    const [ilk, kurum] = parcalar;
    assert.ok(
      !kucuk(ilk).includes(kucuk(kurum)),
      `${ad}: kurum adı başlıkta iki kez geçiyor — "${baslik}"`
    );
    olculen += 1;
  }
  console.log(`  (ölçülen iki parçalı fırsat başlığı: ${olculen})`);
});

test('TARİH VE TUTAR UYDURULMUYOR', () => {
  /*
    113 kaydın yalnız 30'unda son başvuru tarihi dolu; 90'ında tutar
    durumu "belirtilmemis". Tarih uydurmak öğrenciyi olmayan bir son
    güne göre plan yaptırmak, tutar uydurmak kararını yanlış bir sayıya
    dayandırmak olurdu.
  */
  const betik = oku('scripts/onrender.mjs');
  /*
    "TAKVİM AÇIKLANMADI" BİR ÇIKARIMDI

    Boş `applicationDeadline`, kurumun takvimi açıklamadığını
    KANITLAMIYOR: kayıt derlenmemiş, kaynak okunamamış ya da tarih
    başka bir alanda olabilir. Doğrulanmamış bir olumsuzlamayı kuruma
    atfetmek yerine okuyucu resmî kaynağa gönderiliyor.
  */
  assert.match(betik, /'Başvuru takvimi için resmî kaynağı kontrol edin'/);
  /*
    Eski ifade yalnız GEREKÇE YORUMLARINDA geçiyor (neden bırakıldığını
    anlatıyor); çizilen metinde geçmiyor. Aranan şey kod.
  */
  const kod = betik.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  assert.doesNotMatch(kod, /Takvim açıklanmadı/);
  assert.match(betik, /f\.amount_status === 'kesin' && \(f\.amount_text \|\| ''\)\.trim\(\)/);

  /* "Karşılıksız" ETİKETİ YOK: `repayable` 113 kaydın 104'ünde NULL. */
  const liste = betik.slice(betik.indexOf('const firsatListesi'), betik.indexOf('const sabitler'));
  assert.doesNotMatch(liste, /karşılıksız/i);
  assert.doesNotMatch(liste, /repayable/);
});

test('kategori kuralı PAYLAŞILAN modülden; ikinci tablo yok', () => {
  /*
    Arayüzün süzgeci de `firsatKategorisi` tablosundan besleniyor. Ön
    render ayrı bir tablo tutsaydı, arama motoruna sayfada olmayan bir
    kayıt gösterebilirdi.
  */
  const betik = oku('scripts/onrender.mjs');
  assert.match(betik, /const \{ firsatKategorisi, yurtDisiFirsatMi \} = await icerikDerle\(/);
  assert.match(betik, /'firsat-kategori'/);
  /* /kyk'nin tür süzgeci arayüzdekiyle aynı alanı karşılaştırıyor. */
  assert.match(betik, /f\.opportunity_type === tur/);

  /*
    SEÇİM `opportunity_type` TAŞIMAK ZORUNDA

    Taşımıyordu ve kategori kapıları bu yüzden boş çiziliyordu:
    `firsatKategorisi(undefined)` bilinmeyen türü 'programlar'a
    düşürüyor, yani hiçbir kayıt 'burslar' süzgecine uymuyordu.
  */
  assert.match(betik, /'opportunity_type,amount_status,amount_text,countries'/);
});

test('BÖLGE SÜZGECİ ARAYÜZLE AYNI FONKSİYONDAN', () => {
  /*
    Kural `OpportunitiesPage.tsx` içinde yaşıyordu ve ön render de
    /yurtdisi-firsatlari kapısını basmak için aynı ölçütü kullanmak
    zorunda. İki kopya olsaydı ekranda yurt dışı sayılan bir kayıt
    statik HTML'de sayılmayabilirdi.
  */
  const kural = oku('src/lib/firsat-kategori.mjs');
  assert.match(kural, /export function yurtDisiFirsatMi\(item\)/);

  const sayfa = oku('src/components/OpportunitiesPage.tsx');
  assert.match(sayfa, /const yurtDisiMi = \(item: Opportunity\) => yurtDisiFirsatMi\(item\);/);
  assert.match(sayfa, /yurtDisiFirsatMi,/);

  const betik = oku('scripts/onrender.mjs');
  assert.match(betik, /const \{ firsatKategorisi, yurtDisiFirsatMi \} = await icerikDerle\(/);
  assert.match(betik, /bolge === 'yurtdisi' \? yurtDisiFirsatMi\(f\) : true/);

  /*
    "ÜLKE ALANI BOŞ = TÜRKİYE" BİR VARSAYIM OLURDU: boş alanlı kayıt
    yurt dışı tarafına konmuyor, hakkında bir iddia da taşınmıyor.
  */
  assert.match(kural, /ad !== '' && ad !== 'türkiye' && ad !== 'turkey' && ad !== 'tr'/);

  /*
    SEÇİM `countries` TAŞIMAK ZORUNDA. Taşımadığında süzgeç hiçbir
    kaydı geçirmiyor ve sayfa boş çiziliyor — `opportunity_type` ile
    birebir aynı hata, iki kez yaşandı.
  */
  assert.match(betik, /amount_text,countries'/);
});
