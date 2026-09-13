import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  AÇILIŞTA ATILAN İSTEKLER

  Ölçüldü (13 Eylül 2026, üretim paketi, oturumsuz ziyaretçi,
  /bolum/bilgisayar-muhendisligi):

    rpc/get_published_listings_catalog_v2   ekranda çizilen liste
    listings?select=…  (42 kolon + şirket)  363 KB  — App
    listings?select=…  (42 kolon + şirket)  363 KB  — rehber bloğu
    quizzes?select=*                        3,3 KB  — hiç çizilmiyor

  Üç istek de giriş yapmamış ziyaretçinin GÖREMEYECEĞİ ekranlar için
  atılıyordu. Bu testler o üçünü geri gelmekten koruyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

test('bütün ilanların listesi ve testler yalnız oturum varken isteniyor', () => {
  const app = oku('src/App.tsx');

  /*
    `allListings` ekrandaki ilan listesi DEĞİL — onu `globalListings`
    ülkeye göre getiriyor. Bu liste üç yerde kullanılıyor ve üçü de
    oturum istiyor: "Başvurularım", şirket paneli ve girişten sonra
    kaldığı yerden devam eden başvuru niyeti.
  */
  const ilanEtkisi = app.slice(app.indexOf('const [allListings'), app.indexOf('const [applications'));
  assert.match(ilanEtkisi, /if \(!session\?\.userId\) return;/);
  assert.match(ilanEtkisi, /\}, \[session\?\.userId\]\);/);

  /*
    Testleri çizen iki ekran da `activeStudent` istiyor; oturumsuz
    kullanıcıda ikisi de DOM'a hiç girmiyor.
  */
  const quizEtkisi = app.slice(app.indexOf('const [quizzes'), app.indexOf('const [quizzes') + 1400);
  assert.match(quizEtkisi, /if \(!session\?\.userId\) return;/);
  assert.match(quizEtkisi, /\}, \[session\?\.userId\]\);/);

  /*
    OKUNMAYAN DURUM TAŞINMIYOR

    `listingsStatus` ile `listingsError` yazılıyor ama hiçbir yerde
    okunmuyordu; "hatayı yutma" diyen yorum da bu yüzden doğru değildi.
    Okunmayan bir durumu taşımak, ileride birinin ona güvenmesini
    kolaylaştırır.
  */
  /* Yalnız kod aranıyor; gerekçeyi anlatan yorum yerinde duruyor. */
  assert.doesNotMatch(app, /setListingsStatus\(|setListingsError\(|useState<'loading' \| 'ready' \| 'error'>/);
});

test('rehber/bölüm ilan bloğu altı kart için bütün ilanları indirmiyor', () => {
  const blok = oku('src/components/RehberdeIlanlar.tsx');
  const sorgular = oku('src/lib/queries/index.ts');

  /* Blok altı kart çiziyor; karttaki her şey bu beş alanda. */
  assert.match(blok, /const \{ fetchRehberIlanKartlari \} = await import\('\.\.\/lib\/queries'\);/);
  assert.doesNotMatch(blok, /fetchPublishedListings/);
  assert.match(sorgular, /\.select\('id, title, city, companies \( name, logo_url \)'\)/);

  /*
    Alan eşleştirmesi hâlâ istemcide (`alanEslestir` başlığa bakan bir
    eşleyici, SQL'e çevrilebilir değil): küçülen satır SAYISI değil,
    satırın GENİŞLİĞİ. Eşleşenler önce, kalanlar arkadan dolduruyor —
    davranış aynı.
  */
  assert.match(blok, /alanEslestir\(i\.title\) === alan/);
  assert.match(blok, /\[\.\.\.uyan, \.\.\.hepsi\.filter\(\(i\) => !uyan\.includes\(i\)\)\]/);

  /*
    TİP İÇE AKTARIMI ÇALIŞTIRMIYOR

    `lib/queries` modülünün gövdesi Supabase istemcisini kuruyor ve
    `import.meta.env` okuyor; ön render Node'da çalıştığı için gerçek
    bir import rehber sayfalarının TAMAMINI düşürürdü (ölçülmüştü:
    dist/rehber bomboş kalmıştı). `import type` derlemede siliniyor.
  */
  assert.match(blok, /import type \{ RehberIlanKarti \} from '\.\.\/lib\/queries';/);
  assert.doesNotMatch(blok, /^import \{[^}]*\} from '\.\.\/lib\/queries';/m);
});

test('aynı kullanıcı için oturum olayı tekrar tekrar işlenmiyor', () => {
  const auth = oku('src/lib/auth.ts');
  const app = oku('src/App.tsx');

  /*
    ÖLÇÜLDÜ (canlı, 13 Eylül 2026, giriş yapmış kullanıcı, TEK sayfa
    açılışı): auth/v1/user, rpc/is_admin, student_profiles,
    applications ve iki profiles sorgusundan oluşan küme ALTI KEZ
    tekrarlandı — otuz civarı gereksiz istek.

    Sebep: Supabase `SIGNED_IN` olayını yalnız girişte yollamıyor;
    sekme öne gelince, pencere odaklanınca ve oturum yerelden geri
    kurulunca da yolluyor. Her seferinde yeni bir `session` NESNESİ
    yazılıyor, nesneye bağlı etkiler de baştan koşuyordu.
  */
  assert.match(auth, /let sonKimlik: string \| null = null;/);
  assert.match(auth, /if \(kimlik !== null && kimlik === sonKimlik\) return;/);
  /* Çıkışta hafıza sıfırlanıyor: aynı kişi yeniden girerse haber veriliyor. */
  assert.match(auth, /sonKimlik = null;\s*\n\s*callback\(null\);/);

  /*
    İKİNCİ KAPI: dinleyicideki eleme kaçırsa bile aynı kullanıcı için
    yeni bir nesne yazılmıyor, yani etkiler tetiklenmiyor.
  */
  assert.match(app, /const oturumuYaz = React\.useCallback\(/);
  assert.match(app, /return ayni \? eski : yeni;/);
  assert.doesNotMatch(app, /\n      setSession\(user\);/);
});
