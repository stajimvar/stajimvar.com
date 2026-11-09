import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  E-POSTA OLAY ANINDA (9 Kasım 2026): GitHub zamanlayıcısı 10 dakikalık
  işi 6 saat çalıştırmamıştı. Veritabanı tetikleyicisi Edge işlevini
  olay anında çağırıyor; GitHub işi yedek.
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');
const GOC = oku('supabase/migrations/20270103010000_eposta_aninda.sql').replace(/\/\*[\s\S]*?\*\//g, '');
const ISLEV = oku('supabase/functions/eposta-tetik/index.ts');

test('tetikleyiciler: yeni başvuru, şirket talebi, ekip daveti; deyim düzeyinde', () => {
  assert.match(GOC, /create extension if not exists pg_net;/);
  assert.match(GOC, /after insert on public\.notifications\s*referencing new table as yeni_satirlar\s*for each statement/);
  assert.match(GOC, /y\.type = 'yeni_basvuru'/);
  assert.match(GOC, /after insert on public\.sirket_talepleri\s*for each statement/);
  assert.match(GOC, /after insert on public\.sirket_davetleri\s*for each statement/);
  assert.match(GOC, /exception when others then\s*raise warning 'eposta_tetik_cagir/);
});

test('yetki: Vault anahtarı; doğrulama yalnız service_role; işlev JWT yerine anahtar istiyor', () => {
  assert.match(GOC, /vault\.create_secret\(/);
  assert.match(GOC, /grant execute on function public\.eposta_tetik_dogrula\(text\) to service_role;/);
  assert.match(GOC, /revoke all on function public\.eposta_tetik_dogrula\(text\) from public, anon, authenticated;/);
  assert.match(ISLEV, /db\.rpc\('eposta_tetik_dogrula', \{\s*p_anahtar: request\.headers\.get\('x-eposta-tetik'\)/);
  assert.match(ISLEV, /if \(yetkili !== true\) return Response\.json\(\{ error: 'Yetkisiz\.' \}, \{ status: 403 \}\);/);
  assert.match(oku('supabase/config.toml'), /\[functions\.eposta-tetik\]\s*verify_jwt = false/);
});

test('aynı kuyruk ve aynı Idempotency-Key: GitHub yedeğiyle çift e-posta yok', () => {
  for (const [anahtar, betik] of [
    ['sirket-talebi-', 'scripts/sirket-talebi-epostasi.mjs'],
    ['ekip-daveti-', 'scripts/ekip-daveti-epostasi.mjs'],
    ['bildirim-', 'scripts/bildirim-epostasi.mjs'],
  ]) {
    assert.ok(ISLEV.includes(`\`${anahtar}\${`), anahtar);
    assert.ok(oku(betik).includes(`\`${anahtar}\${`), betik);
  }
  for (const rpc of ['sirket_talebi_eposta_kuyruktan_al', 'ekip_daveti_eposta_kuyruktan_al', 'bildirim_eposta_kuyruktan_al']) {
    assert.ok(ISLEV.includes(`'${rpc}'`), rpc);
  }
});

test('yayın: sırlar ayarlanıyor, işlev JWT doğrulamasız dağıtılıyor', () => {
  const y = oku('.github/workflows/supabase-production.yml');
  assert.match(y, /supabase secrets set --project-ref "\$SUPABASE_PROJECT_REF" RESEND_API_KEY="\$RESEND_API_KEY"/);
  assert.match(y, /supabase functions deploy eposta-tetik --no-verify-jwt --project-ref "\$SUPABASE_PROJECT_REF"/);
});
