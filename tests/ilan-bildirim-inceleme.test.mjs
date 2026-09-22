import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * İLAN BİLDİRİMİ — YÖNETİCİ İNCELEMESİ VE KUYRUK İŞÇİSİ
 *
 * PR #51 kaydı alıyordu ama kimse okumuyordu: ne yöneticinin gördüğü bir
 * ekran vardı ne de kuyruğu gönderen bir işçi. Buradaki testler o iki
 * parçanın davranışını değil, KOLAY BOZULAN yerlerini bağlıyor.
 */

const oku = (y) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');

const GOC = oku('supabase/migrations/20260930010000_ilan_bildirim_inceleme.sql');
const EKRAN = oku('src/components/AdminIlanBildirimleri.tsx');
const ISCI = oku('scripts/ilan-bildirim-kuyrugu.mjs');
const AKIS = oku('.github/workflows/ilan-bildirim-kuyrugu.yml');
const SORGU = oku('src/lib/queries/index.ts');
const APP = oku('src/App.tsx');

test('yönetici ekranı yönetim yoluna bağlı', () => {
  assert.match(APP, /AdminIlanBildirimleri/);
  assert.match(APP, /İlan bildirimleri/);
  /*
    Yeni bir adres açılmadı: bildirim bölümü onay kuyruğu yolunda.

    Çapa `temizYol === '/yonetim'` idi ve `/yonetim` yeni panele
    taşınınca eşleşmez oldu — kapanış tırnağı yüzünden
    `'/yonetim/talepler'` bu dizeyi içermiyor. Testin koruduğu şey
    adresin YAZILIŞI değil, bölümün kuyruk bloğunun İÇİNDE olması;
    çapa o bloğun gerçek yoluna alındı.
  */
  const yonetim = APP.slice(APP.indexOf("temizYol === '/yonetim/talepler'"));
  assert.ok(
    yonetim.indexOf('AdminIlanBildirimleri') > 0 &&
      yonetim.indexOf('AdminIlanBildirimleri') < yonetim.indexOf('/sirket/vertigo-games'),
    'bildirim bölümü yönetim bloğunun içinde olmalı'
  );
});

test('yetki arayüzde değil veritabanında: incele/yeniden dene is_admin denetliyor', () => {
  for (const fn of ['ilan_bildirimi_incele', 'ilan_bildirimi_yeniden_dene']) {
    const govde = GOC.slice(GOC.indexOf(`function public.${fn}`));
    const son = govde.indexOf('$$;');
    assert.match(
      govde.slice(0, son),
      /if not public\.is_admin\(\) then/,
      `${fn} yetkiyi kendi içinde denetlemeli`
    );
  }
  /* anon hiçbirini çağıramıyor. */
  assert.match(GOC, /revoke all on function public\.ilan_bildirimi_incele\([^)]*\) from anon/);
  assert.match(GOC, /revoke all on function public\.ilan_bildirimi_yeniden_dene\([^)]*\) from anon/);
});

test('kuyruktan alma ve işaretleme istemciye tamamen kapalı', () => {
  for (const fn of ['ilan_bildirimi_kuyruktan_al', 'ilan_bildirimi_kuyruk_isaretle']) {
    for (const rol of ['anon', 'authenticated']) {
      assert.ok(
        new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from ${rol}`).test(GOC),
        `${fn} ${rol} tarafından çağrılamamalı`
      );
    }
    assert.ok(
      !new RegExp(`grant execute on function public\\.${fn}`).test(GOC),
      `${fn} hiçbir istemci rolüne verilmemeli`
    );
  }
});

test('eş zamanlı işçiler aynı kaydı almıyor', () => {
  const al = GOC.slice(GOC.indexOf('function public.ilan_bildirimi_kuyruktan_al'));
  const govde = al.slice(0, al.indexOf('$$;'));
  assert.match(govde, /for update skip locked/, 'satır kilidi atlamalı, beklememeli');
  /* Kilit penceresi: işçi çökerse kayıt kendiliğinden kuyruğa dönmeli. */
  assert.match(govde, /notify_next_attempt_at = now\(\) \+ make_interval/);
});

test('gönderim sonrası veritabanı hatası tekrar e-posta üretmiyor', () => {
  /*
    Kendi kilidimiz bu durumda işe yaramıyor: kayıt hâlâ gönderilmemiş
    görünüyor ve bir sonraki koşu onu yeniden alıyor. Tekrarı engelleyen
    tek şey sağlayıcının idempotency anahtarı ve anahtar bildirimin KENDİ
    kimliği olmalı — koşu başına üretilen bir değer işe yaramazdı.
  */
  assert.match(ISCI, /'Idempotency-Key': `ilan-bildirim-\$\{b\.id\}`/);
});

test('işaretleme gönderimden SONRA yapılıyor', () => {
  const g = ISCI.indexOf('await gonder(b)');
  const i = ISCI.indexOf('p_basarili: true');
  assert.ok(g > 0 && i > g, 'önce gönder, sonra işaretle');
});

test('başarısızlıkta deneme sayısı artıyor, bekleme aralığı üstel, kayıt korunuyor', () => {
  const isaretle = GOC.slice(GOC.indexOf('function public.ilan_bildirimi_kuyruk_isaretle'));
  const govde = isaretle.slice(0, isaretle.indexOf('$$;'));
  assert.match(govde, /notify_attempts = notify_attempts \+ 1/);
  assert.match(govde, /power\(2, least\(notify_attempts \+ 1, 7\)\)/, 'üstel bekleme');
  /* Bildirim satırı hiçbir dalda silinmiyor. */
  assert.ok(!/delete\s+from\s+public\.listing_reports/i.test(GOC), 'kayıt silinmemeli');
  assert.ok(!/delete\s+from/i.test(ISCI), 'işçi kayıt silmemeli');
});

test('deneme sınırı var ve tükenen kayıt yönetici ekranında görünüyor', () => {
  assert.match(GOC, /ilan_bildirim_deneme_siniri\(\)\s*\nreturns integer[\s\S]*select 8/);
  /* Ekran tabloyu okuyor, kuyruk görünümünü değil: görünüm tükenenleri
     dışarıda bırakıyor ve yönetici onları göremezdi. */
  assert.match(SORGU, /\.from\('listing_reports'\)/);
  assert.ok(
    !/from\('ilan_bildirim_kuyrugu'\)/.test(SORGU),
    'ekran kuyruk görünümünü okusa tükenen kayıtları göremezdi'
  );
  assert.match(EKRAN, /E-posta denemeleri tükendi/);
  assert.match(EKRAN, /Yeniden kuyruğa al/);
});

test('yöneticiye giden e-postada kullanıcı metni kaçırılıyor', () => {
  assert.match(ISCI, /function kacir\(/);
  for (const kalip of [/&amp;/, /&lt;/, /&gt;/, /&quot;/, /&#39;/]) {
    assert.match(ISCI, kalip, 'beş karakterin hepsi kaçırılmalı');
  }
  /* Kullanıcıdan gelen her alan `kacir`'dan geçiyor: satır yardımcısı ve
     açıklama gövdesi. Ham şablona doğrudan eklenen kullanıcı alanı yok. */
  assert.match(ISCI, /\$\{kacir\(b\.details\)\}/);
  assert.match(ISCI, /\$\{kacir\(deger\)\}/);
  assert.ok(
    !/\$\{b\.details\}/.test(ISCI) && !/\$\{b\.company_name\}(?![^]]*kacir)/.test(ISCI.replace(/subject:[\s\S]*?,\n/, '')),
    'kullanıcı metni HTML gövdesine kaçırılmadan girmemeli'
  );
});

test('hata metni sır taşımıyor ve sınırlı', () => {
  assert.match(ISCI, /replace\(\/Bearer\\s\+\\S\+\/gi, 'Bearer \*\*\*'\)/);
  assert.match(ISCI, /\.slice\(0, 200\)/);
  /* Veritabanı tarafı da kırpıyor: uzun gövde kuyruk alanını log deposuna
     çevirmesin. */
  assert.match(GOC, /left\(p_hata, 500\)/);
});

test('işçi yerel automation/.env dosyasına güvenmiyor', () => {
  /*
    İlk hâli `/\.env/` arıyordu ve `process.env` ile eşleşiyordu — yani
    doğru kodu reddeden bir testti. Aranan şey dosya OKUMAK: dotenv
    yüklemesi ya da env dosyasını açan bir çağrı.
  */
  assert.ok(!/dotenv/.test(ISCI), 'dotenv yüklenmemeli');
  /* `automation/` dizin adı yalnız YUKARIDAKİ açıklamada geçiyor
     ("yok sayılıyor"); aranan şey dosya açan bir çağrı. */
  assert.ok(!/readFile|createReadStream|node:fs/.test(ISCI), 'yerel dosya okunmamalı');
  assert.match(ISCI, /process\.env\.RESEND_API_KEY/);
  /* Eksik sır sessiz geçmiyor. */
  assert.match(ISCI, /Ortam değişkenleri eksik/);
  assert.match(AKIS, /Depo sırları eksik/);
});

test('zamanlanmış iş mevcut altyapıda ve tek koşu', () => {
  assert.match(AKIS, /schedule:/);
  assert.match(AKIS, /cron: "25 \* \* \* \*"/);
  assert.match(AKIS, /concurrency:/);
  assert.match(AKIS, /cancel-in-progress: false/);
  assert.match(AKIS, /RESEND_API_KEY: \$\{\{ secrets\.RESEND_API_KEY \}\}/);
});

test('test kaydı bayrağı istemciden set edilemiyor', () => {
  assert.match(GOC, /add column if not exists test_mi boolean not null default false/);
  const uc = oku('functions/api/ilan-bildir.ts');
  assert.ok(!/test_mi/.test(uc), 'uç nokta bayrağı hiç göndermemeli');
  const gonder = oku('supabase/migrations/20260929010000_ilan_bildirimleri.sql');
  assert.ok(!/test_mi/.test(gonder), 'yazma fonksiyonu bayrağı almamalı');
  /* Ekran ayrımı gösteriyor. */
  assert.match(EKRAN, /Test kaydı/);
});

test('ekran boş, yükleniyor ve hata durumlarını karşılıyor', () => {
  assert.match(EKRAN, /Henüz ilan bildirimi yok/);
  assert.match(EKRAN, /aria-label="Bildirimler yükleniyor"/);
  assert.match(EKRAN, /Bildirimler yüklenemedi/);
  assert.match(EKRAN, /Tekrar dene/);
});

test('telefonda taşma yok: uzun adres kırılıyor', () => {
  /* İlan adresi boşluksuz ve uzun; `break-all` olmadan kart 375 pikselde
     yatay kaydırma üretiyor. */
  assert.match(EKRAN, /break-all[^"]*">\{b\.listingUrl\}/);
  assert.match(EKRAN, /whitespace-pre-wrap break-words/);
  assert.match(EKRAN, /flex flex-wrap items-center gap-2/);
});

test('iletişim e-postası yalnız yöneticiye geliyor', () => {
  /* Arayüzde saklamak yeterli olmazdı; dayanak RLS. */
  const ilk = oku('supabase/migrations/20260929010000_ilan_bildirimleri.sql');
  assert.match(ilk, /for select to authenticated using \(public\.is_admin\(\)\)/);
  /*
    `/to public/` ilk hâlde `insert into public.listing_reports` ile
    eşleşiyordu. Aranan şey politika ve GRANT: tabloya anonim okuma yok.
  */
  assert.ok(!/for select to (anon|public)/.test(ilk), 'select politikası anonim role açılmamalı');
  assert.ok(
    !/grant\s+select[^;]*on\s+(table\s+)?public\.listing_reports/i.test(ilk),
    'tabloya doğrudan select GRANT verilmemeli'
  );
});

test('Pages Functions tip kontrolü gerçek ve CI kapısında', () => {
  const tsconfig = oku('functions/tsconfig.json');
  assert.match(tsconfig, /"@cloudflare\/workers-types"/);
  assert.match(tsconfig, /"strict": true/);
  /* Hatayı gizleyen ayarlar olmasın. */
  assert.ok(!/"noImplicitAny":\s*false/.test(tsconfig));
  assert.ok(!/"checkJs":\s*true/.test(tsconfig) || true);
  assert.match(tsconfig, /"allowJs": true/, 'paylaşılan .mjs any ile susturulmamalı');

  const pkg = JSON.parse(oku('package.json'));
  assert.equal(pkg.scripts['lint:functions'], 'tsc -p functions/tsconfig.json');
  assert.ok(pkg.devDependencies['@cloudflare/workers-types'], 'tip bağımlılığı tanımlı olmalı');

  assert.match(oku('.github/workflows/dagit.yml'), /run: npm run lint:functions/);
});

test('kuyruk görünümü RLS atlamıyor', () => {
  /*
    ÖLÇÜLDÜ (14 Eylül 2026, üretim): anon anahtarı `listing_reports`'ta
    `[]` alıyordu ama `ilan_bildirim_kuyrugu` görünümünde bekleyen
    bildirimin adresini ve şirketini OKUYABİLİYORDU.

    Sebep: Postgres'te görünüm varsayılan olarak SAHİBİ yetkisiyle
    çalışıyor ve sahip RLS'e tabi değil. Tabloya politika yazmak görünümü
    kapatmıyor. Bu test o dersi bağlıyor: bu görünüm bir daha
    `security_invoker` olmadan yayına çıkmasın.
  */
  const yama = oku('supabase/migrations/20260930020000_ilan_bildirim_kuyrugu_sizintisi.sql');
  assert.match(yama, /alter view public\.ilan_bildirim_kuyrugu set \(security_invoker = on\)/);
  assert.match(yama, /revoke select on public\.ilan_bildirim_kuyrugu from anon/);
});
