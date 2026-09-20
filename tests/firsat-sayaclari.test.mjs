import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
  FIRSAT SAYAÇ ŞERİDİ

  İlanlar sayfasının sağ sütununda üç hücreli bir sayaç kartı var; aynı
  soru Fırsatlar'da da soruluyordu ("kaç tane var, kaç kurumdan"). Şerit
  bu yüzden aynı kalıpla, aynı sınıflarla Fırsatlar'a da kondu — ikinci
  bir görünüm türetmek iki sayfayı zamanla ayrıştırırdı.

  Buradaki iddialar görünümden çok DÜRÜSTLÜĞÜ koruyor: sayının nereden
  geldiği (ekrandaki süzülmüş liste) ve veri yokken ne YAZILMADIĞI
  (sıfır). İkisi de gözden kaçtığında ekran yanlış bir şey söylüyor,
  bozulmuyor — testin yakalaması gereken şey bu.
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

const firsatlar = oku('src/components/OpportunitiesPage.tsx');
const ilanlar = oku('src/components/MatchedInternshipsView.tsx');

test('şerit İlanlar\'daki kartın sınıflarını birebir kullanıyor', () => {
  const kap = 'grid grid-cols-3 gap-2 bg-white rounded-2xl border border-gray-200 px-4 py-3.5';
  const sayi = 'text-2xl font-black text-gray-900 tabular-nums leading-none';
  const etiket = 'text-[11px] font-semibold text-gray-500 mt-1 truncate';
  for (const sinif of [kap, sayi, etiket]) {
    assert.ok(ilanlar.includes(sinif), `İlanlar kalıbı değişmiş: ${sinif}`);
    assert.ok(firsatlar.includes(sinif), `Fırsatlar aynı sınıfı kullanmalı: ${sinif}`);
  }
});

test('etiketler üç tane ve birebir', () => {
  for (const etiket of ['Açık fırsat', 'Kurum', 'Ülke']) {
    assert.ok(firsatlar.includes(`etiket: '${etiket}'`), `${etiket} hücresi yok`);
  }
});

test('sayılar ekrandaki süzülmüş listeden türüyor, ham listeden değil', () => {
  /*
    `filtered` ekranda çizilen dizi; `items`/`taban` ise süzgeç
    uygulanmamış hâli. Sayaç ikincisinden beslenirse kullanıcı bir
    süzgeç açtığında liste daralıyor ama sayı sabit kalıyor — İlanlar'da
    bir kez yaşanmış hata bu.
  */
  const blok = firsatlar.slice(
    firsatlar.indexOf('const sayaclar = React.useMemo('),
    firsatlar.indexOf('const aktifSuzgecler = React.useMemo(')
  );
  assert.ok(blok.length > 0, 'sayaç hesabı bulunamadı');
  assert.match(blok, /of filtered\b/);
  assert.match(blok, /firsat: filtered\.length/);
  assert.doesNotMatch(blok, /\btaban\b|\bitems\b|arsivKayitlari/);
  assert.match(blok, /\}, \[filtered\]\)/);
});

test('ülke ve kurum sayısı boş alanları saymıyor', () => {
  const blok = firsatlar.slice(
    firsatlar.indexOf('const sayaclar = React.useMemo('),
    firsatlar.indexOf('const aktifSuzgecler = React.useMemo(')
  );
  /* `countries` kayıtların bir kısmında boş: boş dizi ülke üretmemeli. */
  assert.match(blok, /if \(ulke\) ulkeler\.add\(ulke\)/);
  assert.match(blok, /if \(kurum\) kurumlar\.add\(kurum\)/);
  /* Aynı ülkenin iki yazımı tek ülke: küçültülerek ayrıştırılıyor. */
  assert.match(blok, /kucult\(ham\)/);
  assert.match(blok, /kucult\(item\.organizationName\)/);
});

test('sayaç için ikinci bir sorgu açılmadı', () => {
  /*
    Sayı ekranda zaten yüklü olan diziden çıkıyor. Ayrı bir count
    sorgusu, liste ile sayacın ayrışabileceği ikinci bir gerçek
    üretirdi.
  */
  const cagrilar = firsatlar.match(/fetch[A-Za-z]+\(/g) ?? [];
  assert.deepEqual(
    [...new Set(cagrilar)].sort(),
    ['fetchExpiredOpportunities(', 'fetchOpportunities(', 'fetchSavedOpportunityIds('].sort()
  );
});

test('veri gelmeden sıfır yazılmıyor', () => {
  const sag = firsatlar.slice(
    firsatlar.indexOf('sağ: yardımcı sütun'),
    firsatlar.indexOf('mobil filtre paneli')
  );
  assert.ok(sag.length > 0, 'sağ sütun bulunamadı');
  /* Yüklenirken sayı yerine iskelet; hata/boş/arşivde şerit hiç yok. */
  assert.match(sag, /listeDurumu === 'loading' \? \(/);
  assert.match(sag, /aria-label="Fırsat sayıları yükleniyor"/);
  assert.match(sag, /listeDurumu === 'ready' && sayaclar\.firsat > 0/);
  assert.match(sag, /!filters\.arsiv/);
  /* Dördüncü yol `null`: hata ve boş durumda kutu çizilmiyor. */
  assert.match(sag, /\) : null\}/);
});

test('şerit yalnızca geniş ekranda, telefonda kopyası yok', () => {
  const sayaclar = firsatlar.split('etiket: \'Açık fırsat\'').length - 1;
  assert.equal(sayaclar, 1, 'şeridin tek kopyası olmalı');
  const sag = firsatlar.slice(
    firsatlar.indexOf('sağ: yardımcı sütun'),
    firsatlar.indexOf('mobil filtre paneli')
  );
  assert.match(sag, /hidden lg:block lg:col-span-3/);
  assert.ok(
    sag.indexOf('hidden lg:block lg:col-span-3') < sag.indexOf("etiket: 'Açık fırsat'"),
    'şerit geniş ekran sütununun içinde olmalı'
  );
  /* Bilgi kutusunun ÜZERİNDE: ilk bakılan yer sayı, gerekçe altında. */
  assert.ok(
    sag.indexOf("etiket: 'Açık fırsat'") < sag.indexOf('Fırsatları nasıl seçiyoruz'),
    'şerit bilgi kutusunun üstünde olmalı'
  );
});
