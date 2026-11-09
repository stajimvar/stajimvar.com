import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const goc = oku('supabase/migrations/20270106010000_eposta_tercihleri.sql');

test('tercih tablosu: kişi yalnız kendi satırını görür/yazar; anon kapalı', () => {
  assert.match(goc, /create table if not exists public\.bildirim_tercihleri/);
  assert.match(goc, /enable row level security/);
  assert.equal((goc.match(/user_id = auth\.uid\(\)/g) ?? []).length, 4);
  assert.match(goc, /revoke all on public\.bildirim_tercihleri from anon;/);
  assert.doesNotMatch(goc, /grant[^;]*delete[^;]*bildirim_tercihleri/);
});

test('kuyruk: tercihi kapalı alıcının e-postası düşüyor, zil bildirimi silinmiyor', () => {
  assert.match(goc, /eposta_son_hata = 'tercih-kapali'/);
  assert.match(goc, /not t\.yeni_basvuru_eposta/);
  assert.doesNotMatch(goc, /delete from public\.notifications/);
  assert.match(goc, /grant execute on function public\.bildirim_eposta_kuyruktan_al\(integer, integer\) to service_role;/);
  assert.match(goc, /from public, anon, authenticated;/);
});

test('arayüz: Ayarlar → E-posta tercihleri; satır yoksa açık', () => {
  const profil = oku('src/sirket/SirketProfili.tsx');
  assert.match(profil, /const EPOSTA_YOLU = '\/sirket\/profil\/eposta';/);
  assert.match(profil, /etiket: 'E-posta tercihleri'/);
  const ekran = oku('src/sirket/EpostaTercihleri.tsx');
  assert.match(ekran, /yeni_basvuru_eposta \?\? true/);
  assert.match(ekran, /onConflict: 'user_id'/);
  assert.match(ekran, /yine zil bildirimi olarak gelir/);
});
