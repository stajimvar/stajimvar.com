import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  BAĞLANTI KABULÜ ALAN İSTEMİYOR

  20260926040000 profil görünürlüğünden alan şartını kasıtlı kaldırdı.
  İstek GÖNDERMEK o günden beri alan şartsız çalışıyordu (INSERT
  politikası `sosyal_gorunur`a dayanıyor) ama KABUL etmenin yolundaki
  geçiş tetikleyicisi güncellenmemişti: gönderilebilen ama kabul
  edilemeyen istek üretiyordu.

  Bu testler tek bir şeyi koruyor: kabul yolunda alan koşulu geri
  gelmesin, engel koşulu ise gitmesin.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const goc = oku('supabase/migrations/20261018010000_baglanti_alan_sarti_kalkti.sql');

test('geçiş kuralında alan koşulu yok', () => {
  const govde = goc.slice(goc.indexOf('create or replace function public.baglanti_gecis_kontrol'));
  assert.doesNotMatch(govde, /if not sosyal_gizli\.ayni_sektorde/);
  assert.doesNotMatch(govde, /Farklı sektör ya da engel/);
});

test('engel koşulu duruyor', () => {
  /*
    Alan koşuluyla birlikte engel koşulunu da düşürmek, engellediğin
    kişinin isteğini kabul edilebilir yapardı.
  */
  assert.match(goc, /if sosyal_gizli\.engelli_mi\(karsi_taraf\) then/);
  assert.match(goc, /raise exception 'Engel varken bağlantı değiştirilemez\.'/);
});

test('geçiş kuralının geri kalanı duruyor', () => {
  /* Kimlik değişmezliği, red bekleme süresi ve "yalnız alan yanıtlar". */
  assert.match(goc, /Bağlantının tarafları değiştirilemez\./);
  assert.match(goc, /baglanti_red_bekleme\(\)/);
  assert.match(goc, /Bir isteği yalnız isteği alan kullanıcı yanıtlayabilir\./);
  assert.match(goc, /Yalnız bekleyen bir istek kabul veya reddedilebilir\./);
});

test('oturumsuz çağrı dalı kimlik kontrolünden SONRA geliyor', () => {
  /*
    Sıra bozulursa service_role dışı bir yol tarafları değiştirebilirdi.
  */
  const kimlik = goc.indexOf('Bağlantının tarafları değiştirilemez.');
  const oturumsuz = goc.indexOf('if auth.uid() is null then');
  assert.ok(kimlik > 0 && oturumsuz > kimlik);
});

test('kullanılmayan yardımcı işaretlendi', () => {
  assert.match(goc, /comment on function sosyal_gizli\.ayni_sektorde\(uuid\) is/);
  assert.match(goc, /KULLANILMIYOR/);
});
