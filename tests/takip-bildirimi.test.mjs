import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  TAKİP BİLDİRİMİ

  `takipler` tablosu 20261014010000 ile geldi, bildirim tarafı
  bağlanmadı: biri seni takip edince zilde hiçbir şey olmuyordu.
  Bağlantı isteğinin ve beğeninin tetikleyicisi vardı, takibin yoktu.

  Bu testler üç şeyi koruyor: tetikleyicinin gerçekten `takipler`a
  bağlı olması, aynı takibin iki kez bildirim üretmemesi ve
  bildirimin takip EDENİN profiline götürmesi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const goc = oku('supabase/migrations/20261017010000_takip_bildirimi.sql');

test('tetikleyici takipler tablosuna bağlı', () => {
  assert.match(goc, /create trigger takip_bildirimi_tg\s*\n\s*after insert on public\.takipler/);
  /* Yalnız INSERT: takipten çıkmak bildirim üretmemeli. */
  assert.doesNotMatch(goc, /after insert or (update|delete) on public\.takipler/);
});

test('bildirim hedefi takip EDİLEN kişi', () => {
  /*
    Alıcı `hedef_id`: takip edilen. `takipci_id` yazsaydı bildirim
    takip eden kişiye giderdi — yani kendi yaptığı işin bildirimi.
  */
  assert.match(goc, /bildirim_yaz\(\s*\n\s*NEW\.hedef_id,/);
  assert.match(goc, /'takip',/);
});

test('aynı takip iki kez bildirim üretmiyor', () => {
  /*
    Takipten çıkıp yeniden takip etmek zili ikinci kez doldurmamalı;
    anahtar takipçi+hedef çiftine bağlı ve `bildirim_yaz` yinelenen
    anahtarı sessizce düşürüyor.
  */
  assert.match(goc, /'takip:' \|\| NEW\.takipci_id \|\| ':' \|\| NEW\.hedef_id/);
});

test('bildirim takip edenin profiline götürüyor', () => {
  /*
    Kullanıcı adı yoksa (sosyal profil açılmamışsa) olmayan bir adrese
    götürmek yerine /agim'e düşüyor: takipçi listesi orada.
  */
  assert.match(goc, /'\/profil\/' \|\| kullanici_adi/);
  assert.match(goc, /when kullanici_adi is null then '\/agim'/);
});

test('tetikleyici asıl işlemi geri almıyor', () => {
  assert.doesNotMatch(goc, /raise exception/i);
});

test('search_path sabit ve security definer', () => {
  assert.match(goc, /language plpgsql security definer set search_path = public/);
});
