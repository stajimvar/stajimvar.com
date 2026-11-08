import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/* KALAN BİLDİRİMLER (9 Kasım 2026, kullanıcı: "kalan bildirimleri de yap"). */
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');
const HAM = oku('supabase/migrations/20261227010000_bildirim_kalanlar.sql');
const GOC = HAM.replace(/\/\*[\s\S]*?\*\//g, '');
const GUNLUK = GOC.slice(GOC.indexOf('function public.gunluk_bildirimler'));

test('ilan yayından çıkınca kaydeden öğrenciye; şirkete yalnız sistem/yönetici kapatınca', () => {
  assert.match(GOC, /when \(old\.status = 'published' and new\.status <> 'published'\)/);
  assert.match(GOC, /from public\.saved_listings s\s*where s\.listing_id = new\.id/);
  assert.match(GOC, /sistem boolean := auth\.uid\(\) is null or public\.is_admin\(\)/);
  assert.match(GOC, /if sistem and new\.origin = 'employer_posted' and new\.status in \('closed', 'archived'\) then/);
});

test('şirket doğrulandı / reddedildi: VKN damgası ve ret damgası değişince', () => {
  assert.match(GOC, /after update of vkn_dogrulandi_at, dogrulama_reddi_at on public\.companies/);
  assert.match(GOC, /'sirket_dogrulama_reddedildi'/);
  assert.match(GOC, /new\.dogrulama_notu/);
});

test('yöneticiye ilan bildirimi; deneme kayıtları hariç', () => {
  assert.match(GOC, /after insert on public\.listing_reports/);
  assert.match(GOC, /if coalesce\(new\.test_mi, false\) then return new; end if;/);
});

test('günlük iş: fırsat son başvurusu, yanıt bekleyen başvuru, profil, haftalık özet, şirket süresi', () => {
  assert.match(GUNLUK, /ogrenci := public\.ogrenci_ilan_bildirimleri\(\);/);
  assert.match(GUNLUK, /from public\.saved_opportunities s/);
  assert.match(GUNLUK, /'basvuru-yanit-bekliyor:' \|\| id::text/);
  assert.match(GUNLUK, /to_char\(bugun, 'YYYY-MM'\)/);
  assert.match(GUNLUK, /if extract\(isodow from bugun\) = 1 then/);
  assert.match(GUNLUK, /where uygun > 0 or dolan > 0/);
  assert.match(GUNLUK, /l\.application_deadline - bugun = 3/);
});

test('uydurma eşleşme yok: uygun burs bildirimi bilerek yapılmadı', () => {
  assert.match(HAM, /Sana uygun burs açıldı/);
  assert.doesNotMatch(GOC, /eligible_departments/);
});

test('yetkiler ve günlük betik', () => {
  assert.match(GOC, /revoke all on function public\.gunluk_bildirimler\(\) from public, anon, authenticated;/);
  assert.match(GOC, /grant execute on function public\.gunluk_bildirimler\(\) to service_role;/);
  assert.match(oku('scripts/ogrenci-ilan-bildirimleri.mjs'), /rpc\/gunluk_bildirimler/);
});
