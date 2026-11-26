import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  GÜVENLİK BAŞLIKLARI VE ANONİM İŞLEV KAPISI (26 Kasım 2026)

  frame-ancestors yalnız rapor kipindeki CSP'de duruyordu; tıklama tuzağı
  koruması fiilen yoktu. X-Frame-Options zorlayan başlık olarak ekli.
  Giriş gerektiren işlevlerin anonim yetkisi göçle alındı; veritabanı
  tarafı rls-regresyon-testleri.sql'de sınanıyor.
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

test('tüm sayfalarda HSTS, nosniff ve çerçeve koruması zorlanıyor', () => {
  const h = oku('public/_headers');
  const genel = h.slice(h.indexOf('\n/*\n'));
  assert.match(genel, /\n  Strict-Transport-Security: max-age=31536000; includeSubDomains\n/);
  assert.match(genel, /\n  X-Content-Type-Options: nosniff\n/);
  assert.match(genel, /\n  X-Frame-Options: SAMEORIGIN\n/);
});

test('anonim işlev kapısı göçü kapsamı ve testi var', () => {
  const goc = oku('supabase/migrations/20270125010000_anonim_rpc_kapisi.sql');
  assert.match(goc, /revoke execute on function %s from public, anon/);
  assert.match(goc, /grant execute on function %s to authenticated, service_role/);
  /* Politika yardımcıları kapsam dışı: yetkisi alınırsa herkese açık okuma kırılır. */
  for (const yardimci of ['is_admin()', 'is_company_member(', 'sirket_dogrulandi(']) {
    assert.ok(!goc.includes(`'public.${yardimci}`), yardimci);
  }
  assert.match(oku('scripts/sql/rls-regresyon-testleri.sql'), /giris gerektiren islevler anonime kapali/);
});
