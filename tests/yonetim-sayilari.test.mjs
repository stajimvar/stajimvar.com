import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  YÖNETİM PANELİNDEKİ SAYILAR YALAN SÖYLEMESİN

  Panel canlıya çıktığında "0 yayındaki ilan" yazıyordu; oysa sitede 189
  ilan yayındaydı. Sebebi tek bir satırdı: sayaç `select('*')` yapıyor,
  `listings` SELECT iznini sütun sütun verdiği için sorgu 42501 ile
  düşüyor ve çağıran taraf `if (error) return 0` ile hatayı SIFIRA
  çeviriyordu. Sıfır, "ölçtüm ve yok" demektir; hata ise "ölçemedim".
  İkisini birbirine karıştırmak, panelin en temel işini bozuyor.

  Buradaki testler o sınıfın tekrar açılmasını engelliyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

/* ------------------------------------------------------------------ */
/*  SAYAÇ HATAYI YUTMUYOR                                              */
/* ------------------------------------------------------------------ */

test('yönetim özeti sunucudaki RPC ile alınıyor', () => {
  const kaynak = oku('src/lib/queries/index.ts');
  const govde = kaynak.slice(kaynak.indexOf('export async function fetchAdminOzet'));
  const fonksiyon = govde.slice(0, govde.indexOf('\n}\n') + 3);

  assert.match(
    fonksiyon,
    /supabase\.rpc\(\s*'yonetim_ozet'/,
    'özet sayıları `yonetim_ozet` RPC\'sinden gelmeli',
  );
  assert.doesNotMatch(
    fonksiyon,
    /select\(\s*'\*'/,
    "`select('*')` sütun izni olmayan tabloda 42501 veriyor; RPC kullanılmalı",
  );
});

test('özet sayaçları hatayı sıfıra çevirmiyor', () => {
  const kaynak = oku('src/lib/queries/index.ts');
  const govde = kaynak.slice(kaynak.indexOf('export async function fetchAdminOzet'));
  const fonksiyon = govde.slice(0, govde.indexOf('\n}\n') + 3);

  assert.doesNotMatch(
    fonksiyon,
    /if\s*\(\s*error\s*\)\s*return\s+0/,
    'hata yutulup 0 döndürülemez: yanlış sıfır, hiç göstermemekten kötüdür',
  );
  assert.match(fonksiyon, /if\s*\(\s*error\s*\)\s*fail\(/, 'hata yükseltilmeli');
});

/* ------------------------------------------------------------------ */
/*  İLAN KIRILIMI                                                      */
/* ------------------------------------------------------------------ */

test('onay kuyruğu yalnız hiç kullanılmayan origin değerine bakmıyor', () => {
  const sql = oku('supabase/migrations/20261027010000_yonetim_ozet_sayaclari.sql');
  const taslak = sql.slice(sql.indexOf("'taslakToplam'"), sql.indexOf("'taslakNative'"));

  assert.match(taslak, /status\s*=\s*'draft'/);
  assert.doesNotMatch(
    taslak,
    /origin\s*=\s*'internal'/,
    "`origin = 'internal'` hiçbir satırda yok; kuyruk her zaman boş görünürdü",
  );
});

test('yayındaki ilan toplam ve kaynak kırılımı olarak ayrı dönüyor', () => {
  const sql = oku('supabase/migrations/20261027010000_yonetim_ozet_sayaclari.sql');
  for (const alan of ['ilanYayinToplam', 'ilanNative', 'ilanElle', 'ilanTaranan']) {
    assert.ok(sql.includes(`'${alan}'`), `${alan} alanı dönmeli`);
  }
});

test('panel native ilanı toplamla aynı kutuda göstermiyor', () => {
  const kaynak = oku('src/components/yonetim/OzetSayfasi.tsx');
  assert.match(kaynak, /ozet\.ilanYayinToplam/);
  assert.match(kaynak, /ozet\.ilanNative/);
  assert.doesNotMatch(
    kaynak,
    /ozet\.taslakIlan|ozet\.ilan\b/,
    'kaldırılan alan adları kalmamalı',
  );
});

/* ------------------------------------------------------------------ */
/*  SON 7 GÜN GERÇEKTEN 7 GÜN                                          */
/* ------------------------------------------------------------------ */

test('son kayıtlar boş günleri de sıfırla döndürüyor', () => {
  const sql = oku('supabase/migrations/20261027010000_yonetim_ozet_sayaclari.sql');
  const blok = sql.slice(sql.indexOf("'sonKayitlar'"));

  assert.match(
    blok,
    /generate_series\(/,
    'yalnız dolu günler döndürülürse "son 7 gün" grafiği iki çubukla çizilir',
  );
});


/* ------------------------------------------------------------------ */
/*  DEMO VERİ TAMAMEN KALKTI                                           */
/* ------------------------------------------------------------------ */

test('demo trafik üreteci depoda kalmadı', () => {
  assert.ok(
    !fs.existsSync(path.join(KOK, 'src/lib/yonetim-demo.mjs')),
    'üreteç silinmeli: panelde uydurma sayı gösterilmiyor',
  );
});

test('panel hiçbir yerde demo üretecinden veri okumuyor', () => {
  const dosyalar = fs
    .readdirSync(path.join(KOK, 'src/components/yonetim'))
    .filter((d) => /\.(tsx?|mjs)$/.test(d));

  for (const d of dosyalar) {
    const kaynak = oku(`src/components/yonetim/${d}`);
    assert.doesNotMatch(
      kaynak,
      /from '.*yonetim-demo/,
      `${d} hâlâ demo üretecinden okuyor`,
    );
    assert.doesNotMatch(
      kaynak,
      /trafikOzeti|ilkOturumlar|oturumlariIlerlet/,
      `${d} demo üreteç işlevi çağırıyor`,
    );
  }
});

test('canlı akış gerçek RPC ile besleniyor', () => {
  const kaynak = oku('src/components/yonetim/useCanliOturumlar.ts');
  assert.match(kaynak, /fetchYonetimCanli/);
  assert.doesNotMatch(
    kaynak,
    /useState\((?:23|412|389|1042)\)/,
    'sayaçlar sabit bir sayıyla başlatılmamalı',
  );
});

test('trafik sayfası gerçek RPC ile besleniyor', () => {
  const kaynak = oku('src/components/yonetim/TrafikSayfasi.tsx');
  assert.match(kaynak, /fetchYonetimTrafik/);
});

/* ------------------------------------------------------------------ */
/*  ÖLÇÜM: ÇEREZ YOK, IP YOK                                           */
/* ------------------------------------------------------------------ */

test('oturum kimliği çerezde değil, sekme belleğinde', () => {
  const kaynak = oku('src/lib/izleme.mjs');
  assert.match(kaynak, /sessionStorage/);
  assert.doesNotMatch(kaynak, /document\.cookie/, 'çerez kullanılmamalı');
});

test('toplama ucu IP saklamıyor', () => {
  const kaynak = oku('functions/api/olay.ts');
  assert.doesNotMatch(
    kaynak,
    /CF-Connecting-IP|p_ip|ipOzeti/,
    'ziyaret sayısı için IP gerekmiyor; saklanmamalı',
  );
  assert.match(kaynak, /cf\.city/, 'şehir istekten okunmalı, istemciden değil');
});

test('istemci şehir ve cihaz göndermiyor', () => {
  const kaynak = oku('src/lib/izleme.mjs');
  const govde = kaynak.slice(kaynak.indexOf('const govde = JSON.stringify'));
  const alanlar = govde.slice(0, govde.indexOf('});'));
  for (const alan of ['sehir', 'cihaz', 'ulke']) {
    assert.ok(!alanlar.includes(alan), `${alan} istemciden gönderilmemeli`);
  }
});

test('yönetim paneli ziyareti trafiğe sayılmıyor', () => {
  const istemci = oku('src/lib/izleme.mjs');
  assert.match(istemci, /\/yonetim/, 'istemci panel yollarını elemeli');

  const sql = oku('supabase/migrations/20261029020000_site_olayi_yaz.sql');
  assert.match(
    sql,
    /p_yol like '\/yonetim%'/,
    'sunucu da elemeli: istemci filtresi atlatılabilir',
  );
});

test('olay tablosu istemci rollerine kapalı', () => {
  const sql = oku('supabase/migrations/20261029010000_site_olaylari.sql');
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.site_olaylari from anon, authenticated/i);
});

test('trafik RPC uclari yonetici kapisinin arkasinda', () => {
  for (const [dosya, ad] of [
    ['20261029030000_yonetim_canli.sql', 'yonetim_canli'],
    ['20261029040000_yonetim_trafik.sql', 'yonetim_trafik'],
  ]) {
    const sql = oku(`supabase/migrations/${dosya}`);
    assert.match(sql, /security definer/i, `${ad} security definer olmalı`);
    assert.match(sql, /if not public\.is_admin\(\)/, `${ad} yönetici kapısı olmalı`);
    assert.match(sql, /from public, anon/i, `${ad} anon'a kapalı olmalı`);
  }
});

/* ------------------------------------------------------------------ */
/*  RPC YÖNETİCİ KAPISININ ARKASINDA                                   */
/* ------------------------------------------------------------------ */

test('yonetim_ozet yalnız yöneticiye açık', () => {
  const sql = oku('supabase/migrations/20261027010000_yonetim_ozet_sayaclari.sql');

  assert.match(sql, /security definer/i, 'sütun izni ve RLS sunucuda çözülüyor');
  assert.match(sql, /if not public\.is_admin\(\)/, 'yönetici kapısı olmalı');
  assert.match(sql, /revoke all on function public\.yonetim_ozet\(\) from public/i);
  assert.match(sql, /grant execute on function public\.yonetim_ozet\(\) to authenticated/i);
});

test('yonetim_ozet anon rolune kapali', () => {
  const sql = oku('supabase/migrations/20261028010000_yonetim_ozet_anon_izni.sql');
  assert.match(
    sql,
    /revoke execute on function public\.yonetim_ozet\(\) from anon/i,
    "Supabase yeni fonksiyonlara anon EXECUTE veriyor; `revoke ... from public` bunu kaldırmıyor",
  );
});
