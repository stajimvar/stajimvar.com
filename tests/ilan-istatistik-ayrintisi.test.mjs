import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { donusumOrani, gunlukOzet, oranMetni } from '../src/lib/ilan-istatistik.mjs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('dönüşüm: görüntülenme yoksa ya da başvuru aşıyorsa oran yok', () => {
  assert.equal(donusumOrani(3, 120), 2.5);
  assert.equal(oranMetni(2.5), '%2,5');
  assert.equal(donusumOrani(1, 0), null);
  assert.equal(donusumOrani(5, 3), null);
  assert.equal(oranMetni(null), '');
});

test('günlük özet: toplamlar ve en yoğun gün (eşitte en yeni)', () => {
  const o = gunlukOzet([
    { gun: '2026-11-07', goruntulenme: 4, basvuru: 1 },
    { gun: '2026-11-08', goruntulenme: 4, basvuru: 0 },
    { gun: '2026-11-09', goruntulenme: 0, basvuru: 0 },
  ]);
  assert.equal(o.goruntulenme, 8);
  assert.equal(o.basvuru, 1);
  assert.equal(o.enYogun.gun, '2026-11-08');
  assert.equal(gunlukOzet([{ gun: 'x', goruntulenme: 0, basvuru: 0 }]).enYogun, null);
});

test('göç: yalnız ilanın şirket üyesi/yönetici; ekip bakışı sayılmıyor; anon kapalı', () => {
  const g = oku('supabase/migrations/20270107010000_ilan_gunluk_istatistik.sql');
  assert.match(g, /public\.is_company_member\(l\.company_id\) or public\.is_admin\(\)/);
  assert.match(g, /not in \(select m\.user_id from public\.company_members m/);
  assert.match(g, /Europe\/Istanbul/);
  assert.match(g, /least\(p_gun, 90\)/);
  assert.match(g, /revoke all on function public\.sirket_ilan_gunluk\(uuid, integer\) from public, anon;/);
});

test('kart: dönüşüm ve "Günlük ayrıntı" düğmesi; bilgi hover\'a bağlı değil', () => {
  const k = oku('src/sirket/IlanKarti.tsx');
  assert.match(k, /Günlük ayrıntı/);
  assert.match(k, /aria-expanded=\{ayrintiAcik\}/);
  const a = oku('src/sirket/IlanIstatistikAyrintisi.tsx');
  assert.match(a, /<table className="sr-only">/);
  assert.match(a, /dönüşüm/);
});
