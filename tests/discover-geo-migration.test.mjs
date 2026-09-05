import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/*
  COĞRAFİ MİGRATION'IN SÖZLEŞMESİ

  Bu migration production'a UYGULANMADI ve uygulanana kadar tek denetim
  yolu metnin kendisi. Buradaki kontroller, dosyanın sonradan
  düzenlenirken sessizce tehlikeli hale gelmesini engelliyor.
*/

const sql = await readFile(
  new URL('../supabase/migrations/20260918010000_discover_geo.sql', import.meta.url),
  'utf8',
);

test('coğrafi ağaç ülke bağımsız: kendine referans veren tek tablo', () => {
  assert.match(sql, /create table if not exists public\.geo_nodes/i);
  assert.match(sql, /parent_id uuid references public\.geo_nodes\(id\)/i);
  assert.match(sql, /level text not null check \(level in \(/i);
  /* Seviye sayısı kolonlara gömülmemeli; yeni ülke migration istememeli. */
  for (const seviye of ['country', 'admin1', 'admin2', 'locality', 'venue']) {
    assert.ok(sql.includes(`'${seviye}'`), `${seviye} seviyesi tanımlı değil`);
  }
});

/*
  EN KRİTİK KURAL

  Bölge koordinatı (ilçe/şehir merkezi) gerçek adres gibi kaydedilirse
  kullanıcı yanlış yere gider. Hassasiyet kolonu ve kısıtı bunu önlüyor.
*/
test('geocode hassasiyeti kısıtla zorunlu tutuluyor', () => {
  assert.match(sql, /geocode_precision/);
  assert.match(sql, /check \(geocode_precision is null or geocode_precision in \('address','locality','admin2','admin1'\)\)/i);
});

test('sorgu metni denetim için saklanıyor', () => {
  assert.match(sql, /geocode_query/);
});

/*
  TR ATAMASI KÖKENE BAĞLI

  Toptan "hepsi Türkiye" güncellemesi, kökeni doğrulanamayan kaydı da
  doğrulanmış gibi işaretlerdi. Güncelleme kaynak listesine bağlı olmalı.
*/
test('TR backfill yalnızca doğrulanmış kaynaklarla sınırlı', () => {
  const guncelleme = sql.slice(sql.indexOf('update public.discover_events'));
  assert.match(guncelleme, /from public\.discover_event_sources s/i);
  assert.match(guncelleme, /s\.id = e\.import_source_id/i);
  assert.match(guncelleme, /s\.slug in \(/i);

  for (const slug of [
    'izmir-kultursanat-api',
    'bursa-buyuksehir-etkinlik',
    'kultur-istanbul',
    'konya-kultur-sanat',
    'eskisehir-buyuksehir',
  ]) {
    assert.ok(guncelleme.includes(`'${slug}'`), `${slug} listede yok`);
  }

  /* Koşulsuz toptan güncelleme geri gelmemeli. */
  assert.ok(
    !/update public\.discover_events\s+set country_code = 'TR'\s+where country_code is null;/i.test(sql),
    'kökene bakmayan toptan TR güncellemesi geri gelmiş',
  );
});

test('mevcut ülke değeri ezilmiyor', () => {
  assert.match(sql, /e\.country_code is null/i);
});

/*
  RPC'LER VIEW ÜZERİNDEN BESLENİYOR

  list_active_discover_events `setof discover_event_occurrence_rows`
  döndürüyor, get_discover_catalog da baştan sona `select *` zinciri.
  Bu yüzden view'i genişletmek ikisini birden genişletiyor.
*/
test('view yeni coğrafi kolonları taşıyor', () => {
  const view = sql.slice(sql.indexOf('create or replace view public.discover_event_occurrence_rows'));
  for (const kolon of ['e.country_code', 'e.geo_node_id', 'e.geocode_precision', 'e.geocoded_at']) {
    assert.ok(view.includes(kolon), `${kolon} view'de yok`);
  }
});

/*
  KULLANICININ KATALOG DOSYASI EZİLMESİN

  get_discover_catalog 20260917010000_discover_catalog.sql'de tanımlı.
  Burada yeniden tanımlansaydı iki dosya arasında sessiz bir sürüm
  çatışması doğardı; view üzerinden genişletmek bunu gereksiz kılıyor.
*/
test('katalog ve liste fonksiyonları yeniden tanımlanmıyor', () => {
  assert.ok(
    !/create or replace function public\.get_discover_catalog/i.test(sql),
    'get_discover_catalog burada yeniden tanımlanmış',
  );
  assert.ok(
    !/create or replace function public\.list_active_discover_events/i.test(sql),
    'list_active_discover_events burada yeniden tanımlanmış',
  );
});

test('geo_nodes herkese açık okunuyor, yazma açılmıyor', () => {
  assert.match(sql, /alter table public\.geo_nodes enable row level security/i);
  assert.match(sql, /create policy geo_nodes_read on public\.geo_nodes\s+for select using \(true\)/i);
  assert.ok(
    !/for (insert|update|delete)/i.test(sql.slice(sql.indexOf('geo_nodes_read'))),
    'geo_nodes için yazma politikası açılmış',
  );
});

/*
  BÖLGE KOORDİNATI PİN DEĞİL

  geo_nodes.latitude haritayı ortalamak için var. Yorum kaybolursa
  sonradan okuyan onu etkinlik konumu sanabilir.
*/
test('düğüm koordinatının pin olmadığı yazılı', () => {
  assert.match(sql, /comment on column public\.geo_nodes\.latitude/i);
  assert.match(sql, /pin olarak KULLANILMAZ|pini olarak KULLANILMAZ|KULLANILMAZ/i);
});
