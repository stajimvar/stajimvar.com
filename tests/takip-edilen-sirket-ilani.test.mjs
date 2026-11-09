import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { govdeKur } from '../scripts/bildirim-epostasi.mjs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const goc = oku('supabase/migrations/20270109010000_takip_edilen_sirket_ilani.sql');

test('yayına çıkan ilan takipçilere bildirim; ilan başına kişi başına bir kez', () => {
  assert.match(goc, /after insert or update of status on public\.listings/);
  assert.match(goc, /when \(new\.status = 'published'\)/);
  assert.match(goc, /if tg_op = 'UPDATE' and old\.status = 'published' then\s+return new;/);
  assert.match(goc, /'takip-ilan:' \|\| new\.id::text \|\| ':' \|\| t\.takipci_id::text/);
  assert.match(goc, /join public\.social_profiles sp on sp\.profile_id = t\.hedef_id and sp\.sirket_id = new\.company_id/);
  assert.match(goc, /not exists \(select 1 from public\.company_members m/);
  assert.match(goc, /exception when others then\s+raise warning 'takipcilere_yeni_ilan_bildir/);
  assert.match(goc, /revoke all on function public\.takipcilere_yeni_ilan_bildir\(\) from public, anon, authenticated;/);
});

test('e-posta: kuyruk ve anında tetik takip_ilan alıyor; tercih kapalıysa düşüyor', () => {
  assert.match(goc, /add column if not exists takip_ilan_eposta boolean not null default true/);
  assert.match(goc, /y\.type in \('yeni_basvuru', 'takip_ilan'\)/);
  assert.match(goc, /array\['yeni_basvuru', 'takip_ilan'\]/);
  assert.match(goc, /n\.type = 'takip_ilan' and not t\.takip_ilan_eposta/);
  assert.match(goc, /grant execute on function public\.bildirim_eposta_kuyruktan_al\(integer, integer\) to service_role;/);
});

test('e-posta gövdesi: takip ilanında "İlanı gör" ve ayarlar bağlantısı; başvuruda eskisi', () => {
  const t = govdeKur({ tur: 'takip_ilan', baslik: 'Modmere yeni bir ilan yayımladı', govde: 'Grafik <b>', hedef: '/ilan/grafik-1234abcd' });
  assert.match(t, />İlanı gör</);
  assert.match(t, /https:\/\/stajimvar\.com\/ayarlar\/bildirimler/);
  assert.match(t, /Grafik &lt;b&gt;/);
  const b = govdeKur({ tur: 'yeni_basvuru', baslik: 'x', hedef: '/sirket/basvuranlar' });
  assert.match(b, /Başvuruyu panelde aç/);
  assert.match(oku('supabase/functions/eposta-tetik/index.ts'), /const takipIlani = b\.tur === 'takip_ilan';/);
});

test('öğrenci ayarı: /ayarlar/bildirimler yalnız öğrencide; zil simgesi tanımlı', () => {
  const app = oku('src/App.tsx');
  assert.match(app, /activeStudent && session\.userId && \(/);
  assert.match(app, /alan="takip_ilan_eposta"/);
  assert.match(oku('src/components/BildirimMerkezi.tsx'), /tur === 'takip_ilan' \? Briefcase/);
});
