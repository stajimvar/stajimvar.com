import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  FOTOĞRAF VE SAYI AÇIK, PAYLAŞIMLAR KAPALI

  Ürün kararı:
    profil fotoğrafı      herkese açık (giriş yapmamış ziyaretçiye de)
    paylaşım sayısı       herkese açık
    paylaşımların içeriği yalnız bağlantı/alan kapısından geçene

  Bu testlerin koruduğu şey sınırın yeri: açılan tek şey SAYI ve
  FOTOĞRAF. `posts` politikası ve `paylasim_gorunur` bundan
  etkilenmemeli — bir gün biri "sayacı açtık, listeyi de açalım" derse
  burada durmalı.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const goc = oku('supabase/migrations/20260927110000_acik_avatar_ve_sayac.sql');

test('avatar: yayımlanmış profilin fotoğrafı oturum istemiyor', () => {
  /*
    `sosyal_gorunur` tanımı gereği oturum yokken `false` dönüyor
    (`auth.uid() is null` dalı). Yeni dal ondan ÖNCE ve oturuma hiç
    bakmıyor; `anon` buradan geçiyor.
  */
  assert.match(goc, /if exists \(\s*select 1 from public\.social_profiles o\s*where o\.profile_id = sahip and o\.yayinda_mi\s*\) then\s*return true;/);
  /* Sahibi ve eski görünürlük kapısı duruyor. */
  assert.match(goc, /if sahip = auth\.uid\(\) then\s*return true;/);
  assert.match(goc, /return sosyal_gizli\.sosyal_gorunur\(sahip\);/);
});

test('avatar: okuma anona açık, yazma yalnız hesap sahibinde', () => {
  assert.match(goc, /create policy "sosyal avatar yayimda ise herkese acik"\s*on storage\.objects for select to anon/);
  /* Göç yalnız SELECT politikası ekliyor: insert/update/delete'e dokunmuyor. */
  assert.doesNotMatch(goc, /for (insert|update|delete) to anon/);
});

test('açık sayaç: sayıyı verir, içeriği vermez', () => {
  /*
    `sosyal_sayaclar`tan farkı tek satır: paylaşım sayımında
    `paylasim_gorunur` süzgeci yok. Dönen şey iki tam sayı; hiçbir
    paylaşımın kimliği, başlığı ya da görseli dönmüyor.
  */
  assert.match(goc, /create or replace function public\.sosyal_acik_sayaclar\(hedef uuid\)/);
  assert.match(goc, /returns table \(paylasim integer, baglanti integer\)/);
  const govde = goc.slice(goc.indexOf('sosyal_acik_sayaclar'));
  assert.doesNotMatch(govde.slice(0, 900), /paylasim_gorunur/, 'açık sayaç görünürlük süzgeci taşımamalı');
  /* Yayımlanmamış profil için satır dönmüyor: arayüz 0 uydurmuyor. */
  assert.match(govde, /where exists \(\s*select 1 from public\.social_profiles o\s*where o\.profile_id = hedef and o\.yayinda_mi\s*\)/);
});

test('açık sayaç yalnız çalıştırma yetkisi alıyor', () => {
  assert.match(goc, /revoke all on function public\.sosyal_acik_sayaclar\(uuid\) from public;/);
  assert.match(goc, /grant execute on function public\.sosyal_acik_sayaclar\(uuid\) to anon, authenticated;/);
});

test('PAYLAŞIM RLS\'İNE DOKUNULMADI', () => {
  /*
    Açılan tek şey sayı ve fotoğraf. Göç `posts` tablosunun
    politikalarına ya da `paylasim_gorunur` fonksiyonuna dokunmuyor.
  */
  assert.doesNotMatch(goc, /create or replace function sosyal_gizli\.paylasim_gorunur/);
  assert.doesNotMatch(goc, /policy[^\n]*on public\.posts/);
  assert.doesNotMatch(goc, /alter table public\.posts/);
});

test('arayüz önce dar kapıyı deniyor', () => {
  /*
    SIRA ÖNEMLİ: bağlantısı olan kişi `sosyal_sayaclar`tan geçiyor ve
    gördüğü liste ile sayacı birbirini tutuyor. Ters sırada toplam sayı
    gelirdi ve altındaki liste daha az paylaşım gösterince sayı ile
    liste çelişirdi.
  */
  const lib = oku('src/lib/queries/sosyal.ts');
  const i = lib.indexOf("db.rpc('sosyal_sayaclar'");
  const j = lib.indexOf("db.rpc('sosyal_acik_sayaclar'");
  assert.ok(i > 0 && j > i, 'açık sayaç dar kapıdan sonra denenmeli');
  /* Satır gelmediğinde 0 uydurulmuyor. */
  assert.match(lib, /if \(!acikSatir\) return null;/);
});
