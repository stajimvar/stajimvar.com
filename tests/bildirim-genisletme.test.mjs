import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  BİLDİRİMLERİN GENİŞLETİLMESİ (9 Kasım 2026, kullanıcı: "ilk 5'i yap").
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');
const GOC = oku('supabase/migrations/20261226010000_bildirim_genisletme.sql').replace(/\/\*[\s\S]*?\*\//g, '');

test('1) yöneticiye: yeni şirket talebi, sahiplenme, incelemeye düşen ilan', () => {
  assert.match(GOC, /after insert on public\.sirket_talepleri/);
  assert.match(GOC, /after insert on public\.company_claims\s*for each row\s*when \(new\.status = 'pending'\)/);
  assert.match(GOC, /when \(new\.karar in \('inceleme', 'yonetici_ret', 'yonetici_kaldirdi', 'degisiklik_ret'\)\)/);
  assert.match(GOC, /from public\.profiles p\s*where p\.role = 'admin'/);
});

test('2) şirkete: yönetici reddi/kaldırma gerekçesiyle, yalnız şirket ilanında', () => {
  assert.match(GOC, /new\.kaynak = 'yonetici' and new\.karar in \('yonetici_ret', 'yonetici_kaldirdi', 'degisiklik_ret'\)\s*and l\.origin = 'employer_posted'/);
  assert.match(GOC, /new\.gerekceler -> 0 ->> 'mesaj'/);
  assert.match(GOC, /from public\.company_members m\s*where m\.company_id = p_sirket/);
});

test('3) talep sahibine: sahiplenme onay/ret, şirket talebi reddi', () => {
  assert.match(GOC, /after update of status on public\.company_claims/);
  assert.match(GOC, /new\.status in \('approved', 'rejected'\)/);
  assert.match(GOC, /new\.durum = 'reddedildi'/);
});

test('4) son başvuru: kaydedilen yayındaki ilan, 3 ve 1 gün kala, başvurduysa yok', () => {
  const f = GOC.slice(GOC.indexOf('function public.ogrenci_ilan_bildirimleri'));
  assert.match(f, /from public\.saved_listings s/);
  assert.match(f, /l\.application_deadline - bugun in \(1, 3\)/);
  assert.match(f, /'son-basvuru:' \|\| id::text \|\| ':' \|\| user_id::text \|\| ':' \|\| kalan::text/);
  assert.match(f, /now\(\) at time zone 'Europe\/Istanbul'/);
});

test('5) uygun yeni ilan: bölüm → alan → BİRİNCİL alan, günde tek bildirim', () => {
  const f = GOC.slice(GOC.indexOf('function public.ogrenci_ilan_bildirimleri'));
  assert.match(f, /join public\.department_sectors ds on ds\.department_id = ob\.bolum/);
  assert.match(f, /l\.alan_idleri\[1\] as alan/);
  assert.match(f, /'uygun-ilan:' \|\| ogrenci::text \|\| ':' \|\| bugun::text/);
});

test('yetkiler: yardımcılar kapalı; günlük iş yalnız service_role; hatada asıl işlem durmuyor', () => {
  assert.match(GOC, /revoke all on function public\.ogrenci_ilan_bildirimleri\(\) from public, anon, authenticated;/);
  assert.match(GOC, /grant execute on function public\.ogrenci_ilan_bildirimleri\(\) to service_role;/);
  assert.doesNotMatch(GOC, /grant execute on function public\.(yoneticilere_bildir|sirket_uyelerine_bildir)/);
  assert.ok((GOC.match(/exception when others then\s*raise warning/g) ?? []).length >= 4);
});

test('günlük iş: GitHub Actions ve betik aynı RPC; arayüzde simgeler', () => {
  const yml = oku('.github/workflows/ogrenci-ilan-bildirimleri.yml');
  assert.match(yml, /cron: "0 6 \* \* \*"/);
  assert.match(yml, /environment: production/);
  /* Betik artık ogrenci_ilan_bildirimleri'ni de çağıran gunluk_bildirimler'i çağırıyor (20261227010000). */
  assert.match(oku('scripts/ogrenci-ilan-bildirimleri.mjs'), /rpc\/gunluk_bildirimler/);
  const b = oku('src/components/BildirimMerkezi.tsx');
  assert.match(b, /tur === 'son_basvuru_yaklasiyor'[^?]*\? CalendarClock/);
  assert.match(b, /tur === 'uygun_yeni_ilan' \? Briefcase/);
});
