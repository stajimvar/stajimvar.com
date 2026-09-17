import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bildirimKisisi } from '../src/lib/bildirim-kisisi.mjs';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const P = '33333333-3333-4333-8333-333333333333';

test('olay anahtarından kişi: istekte isteyen, kabulde alıcı, beğenide beğenen', () => {
  assert.equal(bildirimKisisi(`baglanti_istegi:${A}:${B}`, B), A);
  assert.equal(bildirimKisisi(`baglanti_kabul:${A}:${B}`, A), B);
  assert.equal(bildirimKisisi(`begeni:${P}:${A}`, B), A);
});

test('kişi uydurulmuyor: bilinmeyen tür, bozuk kimlik, kendi kimliği, boş anahtar', () => {
  assert.equal(bildirimKisisi('basvuru:x:y', B), null);
  assert.equal(bildirimKisisi('baglanti_istegi:bozuk:' + B, B), null);
  assert.equal(bildirimKisisi(`begeni:${P}:${B}`, B), null);
  assert.equal(bildirimKisisi(null, B), null);
  assert.equal(bildirimKisisi(`baglanti_istegi:${A}:${B}:fazla`, B), null);
});

test('anahtar biçimi göçle aynı', () => {
  const goc = fs.readFileSync('supabase/migrations/20260927130000_sosyal_bildirimler.sql', 'utf8');
  assert.match(goc, /'baglanti_istegi:' \|\| NEW\.requester_id \|\| ':' \|\| NEW\.addressee_id/);
  assert.match(goc, /'baglanti_kabul:' \|\| NEW\.requester_id \|\| ':' \|\| NEW\.addressee_id/);
  assert.match(goc, /'begeni:' \|\| NEW\.post_id \|\| ':' \|\| NEW\.user_id/);
});

test('panel fotoğrafı yalnız bilinen kişide çiziyor', () => {
  const merkez = fs.readFileSync('src/components/BildirimMerkezi.tsx', 'utf8');
  assert.match(merkez, /if \(kisi\) \{/);
  assert.match(merkez, /<ProfilFotografi/);
  const sorgu = fs.readFileSync('src/lib/queries/sosyal.ts', 'utf8');
  assert.match(sorgu, /export async function bildirimKisileriniGetir/);
  assert.match(sorgu, /\.from\('social_profiles'\)\s*\.select\('profile_id, username, gorunen_ad, avatar_path'\)/);
});
