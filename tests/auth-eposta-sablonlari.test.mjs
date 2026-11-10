import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KONULAR, yuk } from '../scripts/auth-eposta-sablonlari.mjs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('altı kimlik e-postası Türkçe; bağlantı akışı değişmiyor', () => {
  const g = yuk();
  assert.equal(Object.keys(g).length, 12);
  for (const ad of Object.keys(KONULAR)) {
    const html = g[`mailer_templates_${ad}_content`];
    assert.doesNotMatch(html, /Confirm your|Follow the link|Reset Password|Magic Link/i, ad);
    if (ad === 'reauthentication') assert.match(html, /\{\{ \.Token \}\}/);
    else assert.match(html, /href="\{\{ \.ConfirmationURL \}\}"/, ad);
    /* Dış bağlantı yalnız sitenin kendisi. */
    for (const [, h] of html.matchAll(/href="([^"]+)"/g)) {
      assert.ok(h === '{{ .ConfirmationURL }}' || h === 'https://stajimvar.com', `${ad}: ${h}`);
    }
    /* Görsel yalnız sitenin kendi logosu; süre vaadi yok (geçerlilik Supabase ayarında). */
    for (const [, src] of html.matchAll(/src="([^"]+)"/g)) assert.equal(src, 'https://stajimvar.com/logo.png', ad);
    /*
      Süre yazılırsa panelle aynı olmalı: Email OTP expiration = 3600 sn
      (okundu, 10 Kasım 2026). Panelde değişirse burası da değişmeli.
    */
    for (const [, n] of html.matchAll(/(\d+) saat geçerli/g)) assert.equal(n, '1', ad);
  }
});

test('onay e-postası işveren kaydında şirkete göre; eksik alan güvenli (if, eq değil)', () => {
  const c = oku('supabase/templates/confirmation.html');
  assert.match(c, /\{\{ if \.Data\.kayit_niyeti \}\}Şirket hesabını onayla\{\{ else \}\}E-posta adresini onayla\{\{ end \}\}/);
  assert.doesNotMatch(c, /\{\{ if eq /);
});

test('yayın hattı: yalnız mailer_* alanları, geri okuma, site yayınını durdurmuyor', () => {
  const s = oku('scripts/auth-eposta-sablonlari.mjs');
  assert.match(s, /method: 'PATCH'/);
  assert.match(s, /const farkli = Object\.keys\(govde\)\.filter/);
  for (const k of Object.keys(yuk())) assert.match(k, /^mailer_(subjects|templates)_/);
  const w = oku('.github/workflows/supabase-production.yml');
  assert.match(w, /- name: Kimlik e-postası şablonlarını uygula\s+continue-on-error: true\s+run: node scripts\/auth-eposta-sablonlari\.mjs/);
  assert.match(oku('scripts/detect-deploy-changes.mjs'), /'supabase\/templates\/'/);
});

test('hitap kişinin adıyla; ad yoksa yalnız "Merhaba,"', () => {
  const c = oku('supabase/templates/confirmation.html');
  assert.equal((c.match(/Merhaba\{\{ with \.Data\.full_name \}\} \{\{ \. \}\}\{\{ end \}\},/g) ?? []).length, 2);
  assert.doesNotMatch(c, /COMPANY_NAME/);
});
