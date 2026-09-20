import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  YÖK PROGRAM KATALOĞU

  Bölüm kataloğu 42 kalemdi ve eşleştirme birebir metin karşılaştırması.
  Ölçüldü (canlı, 19 Eylül 2026): yayındaki 21 öğrenci profilinin 16'sında
  alan YOK; öğrencilerin yazdığı 6 benzersiz bölümün yalnız 1'i tutuyordu.
  Alan bölümden türetildiği için (20260926050000) alansız kalan kullanıcı
  bağlantı da kuramıyor (20261019010000) — yani katalogdaki eksik sosyal
  katmanın tamamını kilitliyordu.

  Bu testler kataloğun kendisini değil, KURALLARINI koruyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const goc = oku('supabase/migrations/20261021010000_yok_bolum_katalogu.sql');

test('eski satırlar silinmiyor', () => {
  /*
    `social_profiles.department_id` 42 eski satıra bakıyor. Katalogu
    "temizleyip baştan yazmak" o profillerin bölümünü düşürürdü.
  */
  assert.doesNotMatch(goc, /delete from public\.departments/i);
  assert.doesNotMatch(goc, /truncate .*departments/i);
});

test('adlara düzey eki konmuyor', () => {
  /*
    Ölçülen kusurun kendisi buydu: kullanıcı "Bilgisayar Programcılığı"
    yazmış, kayıttaki "(MYO)" eki yüzünden eşleşme tutmamıştı. Ayrım
    ayrı bir sütunda.
  */
  const degerler = goc.slice(goc.indexOf('insert into yok_katalog'), goc.indexOf('create or replace function sosyal_gizli.ad_sadelestir'));
  assert.doesNotMatch(degerler, /\(MYO\)/);
  assert.doesNotMatch(degerler, /\(Burslu\)/);
  assert.doesNotMatch(degerler, /\(İngilizce\)/);
  assert.match(goc, /add column if not exists duzey text/);
});

test('eşleştirme Türkçe harfleri katlıyor', () => {
  /*
    İki ayrı kusur: lower('İ') noktalı bir i üretiyor ve ASCII i ile
    tutmuyor; ı, ğ, ş de öyle. Katlama olmadan "İŞLETME" ya da
    "bilgisayar muhendisligi" eşleşmiyor.
  */
  assert.match(goc, /translate\(coalesce\(ham, ''\), 'İIıÇçĞğÖöŞşÜü', 'iiiccggoossuu'\)/);
  const esle = goc.slice(goc.indexOf('create or replace function sosyal_gizli.bolumu_esle'));
  assert.match(esle, /sosyal_gizli\.ad_sadelestir\(d\.ad\) = a\.ad/);
  /* Eski birebir karşılaştırma geri gelmemeli. */
  assert.doesNotMatch(esle, /lower\(btrim\(d\.ad\)\) = lower\(btrim\(/);
});

test('birden çok eşleşmede sıra belirleyici', () => {
  /* Aksi halde aynı ada sahip iki satırda dönen kayıt rastgele olurdu. */
  const esle = goc.slice(goc.indexOf('create or replace function sosyal_gizli.bolumu_esle'));
  assert.match(esle, /order by d\.sira/);
  assert.match(esle, /limit 1/);
});

test('elle yapılmış alan eşlemesi ezilmiyor', () => {
  /*
    `department_sectors` bir yönetici kararı taşıyabilir
    (20260923060000 talep kuyruğu). Göç yalnız BOŞ olanı dolduruyor.
  */
  assert.match(goc, /where not exists \(select 1 from public\.department_sectors ds where ds\.department_id = d\.id\)/);
  assert.match(goc, /on conflict \(department_id\) do nothing/);
  assert.doesNotMatch(goc, /do update set sector_id/);
});

test('Spor ve Rekreasyon alanı yalnız yoksa açılıyor', () => {
  assert.match(goc, /where not exists \(select 1 from public\.sectors where ad = 'Spor ve Rekreasyon'\)/);
});

test('grup NOT NULL kalkıyor ve dolu satırlara dokunulmuyor', () => {
  assert.match(goc, /alter table public\.departments alter column grup drop not null;/);
  assert.doesNotMatch(goc, /update public\.departments[\s\S]{0,200}set grup/);
});
