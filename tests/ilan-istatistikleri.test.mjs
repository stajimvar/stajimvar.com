import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/* İLAN İSTATİSTİKLERİ (9 Kasım 2026, kullanıcı: "önerilerini yap"). */
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');
const GOC = oku('supabase/migrations/20270101010000_ilan_istatistikleri.sql').replace(/\/\*[\s\S]*?\*\//g, '');

test('istatistik yalnız şirket üyesine; şirketin kendi bakışları sayılmıyor; öğrenci kimliği dönmüyor', () => {
  assert.match(GOC, /public\.is_company_member\(p_sirket\) or public\.is_admin\(\)/);
  assert.match(GOC, /s\.kullanici_id not in \(select u\.user_id from uyeler u\)/);
  assert.match(GOC, /right\(s\.yol, 8\) = i\.onek/);
  assert.match(GOC, /returns table \(ilan_id uuid, goruntulenme integer, son_yedi_gun integer, kaydeden integer, basvuru integer\)/);
  assert.match(GOC, /revoke all on function public\.sirket_ilan_istatistikleri\(uuid\) from public, anon;/);
});

test('kart: okunamazsa ve taslakta satır yok; sayı uydurulmuyor', () => {
  const k = oku('src/sirket/IlanKarti.tsx');
  assert.match(k, /\{istatistik && !taslak && \(/);
  assert.match(k, /\{istatistik\.goruntulenme\} görüntülenme/);
  const v = oku('src/lib/sirket-veri.ts');
  assert.match(v, /if \(error \|\| !data\) return \{\};/);
  assert.match(oku('src/sirket/GenelBakis.tsx'), /istatistik=\{istatistik\[id\]\}/);
});
