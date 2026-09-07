import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
  KOPYA İLAN KAPISI

  NEDEN BU TEST VAR
  -----------------
  Yayındaki tablonun tek veritabanı seviyesi kopya kapısı
  `listings_canonical_url_key` — UNIQUE (canonical_url) WHERE canonical_url
  IS NOT NULL. KISMİ indeks olduğu için NULL satırlar kapının dışında
  kalıyor.

  Ölçüldü (üretim, 7 Eylül 2026): 114 yayındaki ilanın 48'inde
  canonical_url boştu ve hepsi aynı FR partisindendi. O parti yeniden içe
  aktarılsa hiçbir kısıt ikinci kaydı durdurmuyordu.

  `automation/promote.py` (taranan yol) kuralı zaten uyguluyordu —
  `canonical = raw.canonical_url or apply_url` — ve o yoldan gelen 10
  ilanın 10'unda da alan doluydu. Delik, kaydı doğrudan yazan yollardaydı.

  Kural artık veritabanında: bir tetikleyici alanı boşsa dolduruyor.
  Bu testler o kuralın kaynağını gerçek göç dosyasından okuyor, yani
  dosya değişirse test de onunla birlikte değişiyor.
*/

const GOC = new URL(
  '../supabase/migrations/20260920010000_ilan_canonical_url_bosluk.sql',
  import.meta.url
);

let db;

before(async () => {
  db = new PGlite();
  await db.exec(`
    create type listing_status as enum ('draft','published','closed');
    create table public.listings(
      id uuid primary key default gen_random_uuid(),
      title text not null,
      company_id uuid,
      city text,
      country_code text,
      status listing_status not null default 'draft',
      source_url text,
      apply_url text,
      canonical_url text,
      deactivated_at timestamptz,
      deactivation_reason text,
      created_at timestamptz not null default now()
    );
    create unique index listings_canonical_url_key
      on public.listings (canonical_url) where canonical_url is not null;
  `);

  /*
    Göçün tetikleyici kısmı aynen çalıştırılıyor; sondaki geriye dönük
    UPDATE burada anlamsız (tablo boş) ama zararsız.
  */
  await db.exec(await readFile(GOC, 'utf8'));
});

after(async () => {
  await db?.close();
});

const say = async (sql, ...p) => (await db.query(sql, p)).rows;

test('BOŞ canonical_url kaynak adresinden dolduruluyor', async () => {
  await say(
    `insert into listings (title, source_url, apply_url, status)
     values ('Stajyer', 'https://ornek.com/ilan/1', 'https://basvuru.ornek.com/1', 'published')`
  );
  const [row] = await say(`select canonical_url from listings where title='Stajyer'`);
  assert.equal(row.canonical_url, 'https://ornek.com/ilan/1');
});

test('kaynak adresi yoksa başvuru adresine düşüyor — promote.py ile aynı sıra', async () => {
  await say(
    `insert into listings (title, apply_url, status)
     values ('Yalnız başvuru', 'https://basvuru.ornek.com/2', 'published')`
  );
  const [row] = await say(`select canonical_url from listings where title='Yalnız başvuru'`);
  assert.equal(row.canonical_url, 'https://basvuru.ornek.com/2');
});

test('AYNI İLANIN İKİNCİ KEZ YAZILMASI ENGELLENİYOR', async () => {
  /* İçe aktarma iki kez koşarsa ikinci satır açılmamalı. */
  await assert.rejects(
    () =>
      say(
        `insert into listings (title, source_url, status)
         values ('Stajyer (tekrar)', 'https://ornek.com/ilan/1', 'published')`
      ),
    /duplicate key|unique/i,
    'aynı adres ikinci kez kabul edildi — kapı çalışmıyor'
  );
});

test('canonical_url ELLE VERİLDİYSE tetikleyici dokunmuyor', async () => {
  await say(
    `insert into listings (title, source_url, canonical_url, status)
     values ('Elle kanonik', 'https://ornek.com/ilan/9', 'https://ornek.com/kanonik/9', 'published')`
  );
  const [row] = await say(`select canonical_url from listings where title='Elle kanonik'`);
  assert.equal(row.canonical_url, 'https://ornek.com/kanonik/9');
});

test('HİÇBİR ADRES YOKSA uydurma anahtar üretilmiyor', async () => {
  /*
    Boş dizeyi anahtar yapmak, adresi olmayan İKİ ayrı ilanı çakıştırırdı.
    Alan boş kalıyor; kayıt yazılabiliyor ama kapının dışında duruyor.
  */
  await say(`insert into listings (title, status) values ('Adressiz A', 'draft')`);
  await say(`insert into listings (title, source_url, status) values ('Adressiz B', '   ', 'draft')`);
  const rows = await say(
    `select title, canonical_url from listings where title like 'Adressiz%' order by title`
  );
  assert.equal(rows.length, 2, 'adressiz iki kayıt da yazılabilmeli');
  assert.equal(rows[0].canonical_url, null);
  assert.equal(rows[1].canonical_url, null);
});

test('FARKLI ŞEHİRDEKİ AYNI BAŞLIK KOPYA DEĞİL', async () => {
  /*
    Ölçüldü (üretim): Alumil NextGen Staj Programı üç kez kayıtlı —
    İstanbul, İzmir, Tekirdağ — ve her birinin Workable üzerinde AYRI bir
    ilan kimliği var. Bunları birleştirmek üç gerçek açık pozisyondan
    ikisini siteden silmek olurdu.
  */
  const sehirler = [
    ['İstanbul', 'https://jobs.workable.com/view/venxzDrKhh7HjYFYBFb13C/alumil-istanbul'],
    ['İzmir', 'https://jobs.workable.com/view/pz2pmd7D8eT4q5atvUEkqd/alumil-izmir'],
    ['Tekirdağ', 'https://jobs.workable.com/view/n2YYX3nqXj7Loet9txk3s7/alumil-corlu'],
  ];
  for (const [sehir, adres] of sehirler) {
    await say(
      `insert into listings (title, city, source_url, status)
       values ('Alumil NextGen Staj Programı', $1, $2, 'published')`,
      sehir,
      adres
    );
  }
  const [{ adet }] = await say(
    `select count(*)::int adet from listings where title='Alumil NextGen Staj Programı'`
  );
  assert.equal(adet, 3, 'ayrı şehirlerdeki üç ilan da durmalı');
});

test('geriye dönük doldurma ÇAKIŞMA VARSA satırı atlıyor', async () => {
  /*
    İki BOŞ kayıt aynı adresi gösteriyorsa ikisini birden doldurmak UNIQUE
    kısıtını düşürürdü — ilk yazımda tam olarak bu oluyordu. row_number()
    her adres için yalnız bir satır seçiyor; diğeri boş kalıyor ama
    SİLİNMİYOR ve göç patlamıyor.

    Göçten ÖNCEKİ durumu kuruyoruz: tetikleyici yalnızca INSERT'te
    çalıştığı için alanı sonradan boşaltmak onu atlatıyor.
  */
  await say(
    `insert into listings (title, source_url, status)
     values ('Çakışan 1', 'https://ornek.com/cakisma', 'published'),
            ('Çakışan 2', 'https://ornek.com/cakisma-2', 'published')`
  );
  await say(
    `update listings set canonical_url = null, source_url = 'https://ornek.com/cakisma'
     where title like 'Çakışan%'`
  );

  const goc = await readFile(GOC, 'utf8');
  const dolduran = goc.slice(goc.indexOf('with aday as ('));
  await db.exec(dolduran);

  const rows = await say(
    `select title, canonical_url from listings where title like 'Çakışan%' order by title`
  );
  const dolu = rows.filter((r) => r.canonical_url !== null);
  assert.equal(dolu.length, 1, 'çakışan çiftten yalnız biri doldurulmalı');
  assert.equal(rows.length, 2, 'iki satır da yerinde durmalı; hiçbiri silinmemeli');
});

test('denetim alanlarına dokunulmuyor', async () => {
  /* Göç yalnızca boş bir alanı dolduruyor: kimseyi kapatmıyor, birleştirmiyor. */
  const goc = await readFile(GOC, 'utf8');
  const sql = goc.replace(/--[^\n]*/g, '');
  assert.doesNotMatch(sql, /\bdelete\b/i, 'göç hiçbir kaydı silmemeli');
  assert.doesNotMatch(sql, /deactivated_at|deactivation_reason/i, 'denetim alanları değişmemeli');
  assert.match(sql, /where l\.canonical_url is null/, 'yalnızca boş alan doldurulmalı');
});
