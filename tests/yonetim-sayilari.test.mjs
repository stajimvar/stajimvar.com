import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { trafikOzeti } from '../src/lib/yonetim-demo.mjs';

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
/*  DEMO VERİ GERÇEK VERİYLE ÇELİŞMİYOR                                */
/* ------------------------------------------------------------------ */

test('demo huni, gerçekten ölçtüğümüz bir adımı tekrar etmiyor', () => {
  for (const donem of ['bugun', 'yedi', 'otuz']) {
    const ozet = trafikOzeti(donem);
    const adlar = ozet.huni.map((a) => a.ad);
    assert.ok(
      !adlar.some((ad) => /hesap|kay[ıi]t|üye/i.test(ad)),
      `huni "${adlar.join(' → ')}" — kayıt sayısı gerçek veriden geliyor, demo huni onu uydurmamalı`,
    );
  }
});

test('huni adımları azalarak iniyor', () => {
  for (const donem of ['bugun', 'yedi', 'otuz']) {
    const { huni } = trafikOzeti(donem);
    for (let i = 1; i < huni.length; i += 1) {
      assert.ok(
        huni[i].adet <= huni[i - 1].adet,
        `${huni[i].ad} (${huni[i].adet}) bir önceki adımdan büyük olamaz`,
      );
    }
  }
});

test('sayfa dağılımı görüntülemeye, kişi dağılımları tekile bölünüyor', () => {
  for (const donem of ['bugun', 'yedi', 'otuz']) {
    const o = trafikOzeti(donem);
    const topla = (liste) => liste.reduce((a, b) => a + b.adet, 0);

    assert.equal(
      topla(o.sayfalar),
      o.goruntuleme,
      'sayfa BAKIŞI sayıyor; tekile bölünürse yüzdeler yanlış tabana oturur',
    );
    assert.equal(topla(o.kaynaklar), o.tekil, 'kaynak KİŞİ sayıyor');
    assert.equal(topla(o.sehirler), o.tekil, 'şehir KİŞİ sayıyor');
    assert.equal(topla(o.cihazlar), o.tekil, 'cihaz KİŞİ sayıyor');
  }
});

test('görüntüleme tekil ziyaretçiden küçük olamıyor', () => {
  for (const donem of ['bugun', 'yedi', 'otuz']) {
    const o = trafikOzeti(donem);
    assert.ok(o.goruntuleme >= o.tekil, `${donem}: görüntüleme tekilden küçük`);
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
