import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { TUR_KATEGORISI, firsatRozetleri } from '../src/lib/firsat-kategori.mjs';
import { firsatSirala } from '../src/lib/firsat-degerlendirme.mjs';
import { aktifFirsatSuzgecleri } from '../src/lib/opportunity-domain.mjs';

/*
  FIRSAT ENVANTERİ — ALTI İDDİA

  Göç 20260926110000 dört yeni tür ve on bir yeni alan açtı; arayüz de
  tür süzgecinden kategori şeridine geçti. Bu dosya değişimin altı
  taşıyıcı kararını bağlıyor. Hepsi ya saf fonksiyona ya da kaynak
  metnine bakıyor; tarayıcı ölçümü burada YOK.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

/* --------------------------------------------- 1) kategori tek yerde */

test('KATEGORİ HARİTASI GÖÇLE BİREBİR VE TEK YERDE', () => {
  /*
    Sunucu `public.firsat_kategori()` ile sayıyor, arayüz TUR_KATEGORISI
    ile çiziyor. İkisi ayrışırsa şeritteki sayı ile yönetim raporu
    ayrışır ve hangisinin doğru olduğu anlaşılmaz.
  */
  const sql = oku('supabase/migrations/20260926110000_firsat_envanteri.sql');
  const govde = sql.slice(sql.indexOf('create or replace function public.firsat_kategori'));
  const gocHaritasi = Object.fromEntries(
    [...govde.slice(0, govde.indexOf('$$;')).matchAll(/when '(\w+)'\s+then '([\w-]+)'/g)].map(
      (e) => [e[1], e[2]]
    )
  );
  assert.deepEqual(TUR_KATEGORISI, gocHaritasi, 'arayüz haritası göçten ayrışmış');

  /* Haritanın ikinci bir kopyası olmamalı: sayfa yalnız içe aktarıyor. */
  const sayfa = oku('src/components/OpportunitiesPage.tsx');
  assert.match(sayfa, /from '\.\.\/lib\/firsat-kategori\.mjs'/);
  assert.doesNotMatch(sayfa, /scholarship:\s*'burslar'/, 'kategori haritası sayfaya kopyalanmış');
});

/* ------------------------------------------------ 2) varsayılan sıra */

test('VARSAYILAN SIRA: UYGUN → YAKLAŞAN → YENİ → DİĞER', () => {
  const DAMGA = '2026-08-01T00:00:00Z';
  const ogrenci = { department: 'Hukuk', gradeLevel: 'Lisans', city: 'Ankara' };
  const dogrulanmis = {
    departmentsVerifiedAt: DAMGA,
    educationLevelsVerifiedAt: DAMGA,
    citiesVerifiedAt: DAMGA,
  };

  const uygun = {
    title: 'Uygun',
    ...dogrulanmis,
    educationLevels: [],
    eligibleDepartments: [],
    cities: [],
    /* Son tarihi EN UZAK olan: sıralamayı tarih değil uygunluk belirlemeli. */
    applicationDeadline: '2027-01-01',
  };
  const yaklasan = { title: 'Yaklaşan', applicationDeadline: '2026-09-15' };
  const yeni = { title: 'Yeni', publishedAt: '2026-09-10' };
  const diger = { title: 'Diğer' };

  const sira = firsatSirala([diger, yeni, yaklasan, uygun], { ogrenci });
  assert.deepEqual(
    sira.map((x) => x.title),
    ['Uygun', 'Yaklaşan', 'Yeni', 'Diğer']
  );

  /* Öğrenci yoksa uygunluk kovası hiç kurulmuyor; tarih öne geçiyor. */
  const misafir = firsatSirala([diger, yeni, uygun, yaklasan], { ogrenci: null });
  assert.deepEqual(
    misafir.map((x) => x.title),
    ['Yaklaşan', 'Uygun', 'Yeni', 'Diğer']
  );
});

/* ------------------------------------------------------- 3) rozetler */

test('ROZETLER GERÇEK VERİDEN; PROFİL YETERSİZKEN "Sana uygun" YOK', () => {
  const simdi = new Date('2026-09-11T09:00:00+03:00');

  const yeni = firsatRozetleri({ publishedAt: '2026-09-08' }, { simdi });
  assert.deepEqual(yeni.map((r) => r.id), ['yeni']);

  /* 8 gün önce yayımlanan artık "Yeni" değil: eşik ölçülü, esnek değil. */
  assert.deepEqual(firsatRozetleri({ publishedAt: '2026-09-03' }, { simdi }), []);

  const sonGunler = firsatRozetleri({ applicationDeadline: '2026-09-13' }, { simdi });
  assert.deepEqual(sonGunler.map((r) => r.id), ['son_gunler']);

  /*
    "Sana uygun" YALNIZCA `kesin` eşleşmede. Profil eksikse opportunityFit
    `kesin: false` dönüyor; rozet o zaman hiç çizilmiyor — uydurma bir
    oran yerine sessizlik.
  */
  const belirsiz = firsatRozetleri({}, { fit: { durum: 'bilinmiyor', not: null, kesin: false }, simdi });
  assert.deepEqual(belirsiz, []);
  const kesin = firsatRozetleri({}, { fit: { durum: 'uygun_olabilir', not: null, kesin: true }, simdi });
  assert.deepEqual(kesin.map((r) => r.id), ['uygun']);
});

/* --------------------------------------- 4) süresi dolan nerede duruyor */

test('SÜRESİ DOLAN ANA LİSTEDE YOK, ARŞİVDE VAR', () => {
  /*
    RLS artık `expired` satırları da okutuyor (arşiv görünümü için) ve
    durum sütunu gecikebiliyor. İki koşul birlikte olmadan ana liste
    kapanmış başvuru gösterirdi.
  */
  const kaynak = oku('src/lib/opportunities.ts');
  const ana = kaynak.slice(
    kaynak.indexOf('export async function fetchOpportunities'),
    kaynak.indexOf('export async function fetchExpiredOpportunities')
  );
  assert.match(ana, /\.eq\('status', 'published'\)/);
  assert.match(ana, /application_deadline\.is\.null,application_deadline\.gte\./);

  const arsiv = kaynak.slice(
    kaynak.indexOf('export async function fetchExpiredOpportunities'),
    kaynak.indexOf('export async function fetchOpportunityBySlug')
  );
  assert.match(arsiv, /\.eq\('status', 'expired'\)/);

  /* Arşiv görünümündeki kartta başvuru düğmesi kurulmuyor. */
  const sayfa = oku('src/components/OpportunitiesPage.tsx');
  assert.match(sayfa, /const cta = arsivde \? null : opportunityCta\(item\)/);
});

/* ------------------------------------------------- 5) haricî başvuru */

test('DETAYDA "Resmî sitede başvur" YENİ SEKMEDE VE GÜVENLİ', () => {
  const detay = oku('src/components/OpportunityDetailPage.tsx');
  assert.match(detay, /'Resmî sitede başvur'/);
  /* Süresi dolmuşsa düğme HİÇ kurulmuyor. */
  assert.match(detay, /const anaEylem = cta && !suresiDoldu &&/);

  /*
    target/rel tek yerde: DisBaglanti. `noopener` olmadan açılan sayfa
    `window.opener` üzerinden bu sekmeyi yönlendirebiliyor.
  */
  const disBaglanti = oku('src/ui/DisBaglanti.tsx');
  assert.match(disBaglanti, /target="_blank"/);
  assert.match(disBaglanti, /rel="noopener noreferrer nofollow"/);
  assert.match(detay, /<DisBaglanti/);
});

/* ------------------------------------------------------- 6) boş durum */

test('BOŞ DURUM AKTİF SÜZGEÇLERİ ADIYLA SAYIYOR', () => {
  const suzgecler = aktifFirsatSuzgecleri({
    query: 'erasmus',
    kategori: 'burslar',
    kaynak: 'kyk',
    sehir: 'Ankara',
    bolge: '',
    mod: '',
    sonGun: '7',
    banaUygun: false,
    kaydedilen: false,
    arsiv: false,
    siralama: 'yeni',
    takvim: false,
  });
  /* Sıralama ve görünüm listeyi DARALTMIYOR: sayılmıyorlar. */
  assert.deepEqual(
    suzgecler.map((s) => s.id),
    ['query', 'kategori', 'kaynak', 'sonGun', 'sehir']
  );
  assert.equal(suzgecler[0].etiket, 'Arama: “erasmus”');
  assert.equal(suzgecler[2].etiket, 'Kaynak: KYK');
  assert.deepEqual(aktifFirsatSuzgecleri({}), []);

  /* Boş sonuç ekranı bu listeyi sayıyor ve tek tek kaldırtıyor. */
  const sayfa = oku('src/components/OpportunitiesPage.tsx');
  assert.match(sayfa, /\{suzgecler\.length\} süzgeç onu boşaltıyor/);
  assert.match(sayfa, /onKaldir=\{\(id\) => set\(bosDeger\(id\)\)\}/);
});

/* -------------------------------------------------- 7) arşiv görünümü */

test('ARŞİV AÇIKKEN LİSTE ÇİZİLİYOR: İSTEK KENDİ ETKİSİNCE İPTAL EDİLMİYOR', () => {
  /*
    ÖLÇÜLEN KUSUR (390 px, yerel Supabase): "Süresi dolanlar" açıkken
    `GET .../opportunities?status=eq.expired` 200 dönüyordu ama ekranda
    yalnız arşiv şeridi kalıyordu. Sebep çizimde değil etkideydi: etki
    ilk iş olarak `arsivDurumu`'nu 'loading' yapıyor, o durum da KENDİ
    bağımlılık dizisindeydi. React etkiyi söküp yeniden kuruyor, temizlik
    `iptal = true` diyor, yeniden kurulumda koşul erken dönüyordu —
    cevap atılıyor, durum sonsuza kadar 'loading' kalıyordu.

    Bu yüzden burada bağlanan şey bağımlılık dizisi: `arsivDurumu` oraya
    geri girerse kilit de geri gelir.
  */
  const sayfa = oku('src/components/OpportunitiesPage.tsx');
  const etki = sayfa.slice(
    sayfa.indexOf('if (!filters.arsiv) return;'),
    sayfa.indexOf('}, [filters.arsiv, arsivDenemesi]);')
  );
  assert.ok(etki.length > 0, 'arşiv etkisi bağımlılığını arsivDenemesi ile kuruyor');
  assert.ok(!etki.includes('arsivDurumu'), 'etki kendi yazdığı duruma bağlanmamalı');

  /*
    Arşiv AYRI BİR KÜME, daraltılmış bir liste değil: şerit de ızgara da
    boş durum da açık listeyle aynı dalda çiziliyor. Tek koşulları
    görünüm ve yükleme durumu; `filters.arsiv` bunlara kapı tutmuyor.
  */
  assert.match(sayfa, /\{!takvimGorunumu && listeDurumu === 'ready' && \(\s*<KonuSeridi/);
  assert.match(sayfa, /arsivde=\{filters\.arsiv\}/);
  /* Cevap gelmeden yokluk iddia edilmiyor: 'kapali' ekranda 'loading'. */
  assert.match(sayfa, /arsivDurumu === 'kapali'\s*\?\s*'loading'/);
  /* Takvim arşivde HİÇ çizilmiyor: kesişimi boş bir sekme düğme olamaz. */
  assert.match(sayfa, /const takvimGorunumu = filters\.takvim && !filters\.arsiv;/);
});
