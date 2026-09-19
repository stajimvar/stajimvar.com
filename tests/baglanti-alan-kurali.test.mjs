import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  BAĞLANTI YALNIZ AYNI ALANDA (kullanıcı kararı, 19 Eylül 2026)

  Kural iki uçta birden duruyor: istek kuralı çiğneyerek hiç
  oluşmuyor (INSERT politikası) ve araya sonradan giren alan
  değişikliği kabul anında yakalanıyor (geçiş tetikleyicisi). Aynı
  günün 20261018010000 göçü kuralı yalnız kabul ucundan kaldırmıştı;
  teşhis doğruydu ama çözüm kullanıcının istediği yön değildi.

  Bu testler üç şeyi koruyor: kural iki uçta da var, profil
  görünürlüğü kurala BAĞLANMADI, ve sebep adıyla söylenebiliyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const goc = oku('supabase/migrations/20261019010000_baglanti_ayni_alan_kurali.sql');

test('gönderme ucunda alan koşulu var', () => {
  assert.match(
    goc,
    /create policy "ayni sektore istek gonderir" on public\.connections[\s\S]{0,400}sosyal_gizli\.ayni_sektorde\(addressee_id\)/,
  );
});

test('kabul ucunda alan koşulu var', () => {
  const govde = goc.slice(goc.indexOf('create or replace function public.baglanti_gecis_kontrol'));
  assert.match(govde, /if not sosyal_gizli\.ayni_sektorde\(karsi_taraf\)\s*\n\s*or sosyal_gizli\.engelli_mi\(karsi_taraf\) then/);
});

test('profil görünürlüğü kurala bağlanmadı', () => {
  /*
    Kullanıcı "profillerini aratıp bulsalar bile" dedi: arama ve profil
    açma alan şartsız kalıyor. Kural `sosyal_gorunur`a girseydi farklı
    alandaki profil hiç açılamazdı.
  */
  assert.doesNotMatch(goc, /create or replace function sosyal_gizli\.sosyal_gorunur/);
});

test('sebep adıyla söyleniyor ve engel en üstte', () => {
  for (const sebep of ['gorunmez', 'engel', 'alanim-yok', 'alani-yok', 'farkli-alan']) {
    assert.match(goc, new RegExp(`'${sebep}'`), `sebep eksik: ${sebep}`);
  }
  /*
    SIRA: engel, alan sebeplerinden ÖNCE. Tersi olsaydı engellediğin
    kişiye onun alanı hakkında bilgi sızardı.
  */
  const engel = goc.indexOf("then 'engel'");
  const alan = goc.indexOf("then 'alanim-yok'");
  assert.ok(engel > 0 && alan > engel);
});

test('sebep RPC yetkisi daraltılmış', () => {
  assert.match(goc, /revoke all on function public\.baglanti_engeli\(uuid\) from public;/);
  assert.match(goc, /grant execute on function public\.baglanti_engeli\(uuid\) to authenticated;/);
  assert.match(goc, /security definer\s*\nset search_path = public/);
});

test('kullanılmıyor notu kalktı', () => {
  /* 20261018010000 onu "KULLANILMIYOR" diye işaretlemişti; yeniden yürürlükte. */
  assert.match(goc, /comment on function sosyal_gizli\.ayni_sektorde\(uuid\) is/);
  assert.doesNotMatch(goc, /'KULLANILMIYOR/);
});
