import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AYARLAR, KONULAR, yuk } from '../scripts/auth-eposta-sablonlari.mjs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('altı kimlik e-postası Türkçe; bağlantı akışı değişmiyor', () => {
  const g = yuk();
  assert.equal(Object.keys(g).length, 12 + Object.keys(AYARLAR).length);
  for (const ad of Object.keys(KONULAR)) {
    const html = g[`mailer_templates_${ad}_content`];
    assert.doesNotMatch(html, /Confirm your|Follow the link|Reset Password|Magic Link/i, ad);
    /* Bağlantı Supabase alan adına değil siteye: token_hash ile (src/lib/auth.ts adrestekiEpostaBaglantisi). */
    if (ad === 'reauthentication') assert.match(html, /\{\{ \.Token \}\}/);
    else assert.match(html, /href="\{\{ \.SiteURL \}\}\/[a-z-]*\?token_hash=\{\{ \.TokenHash \}\}&amp;type=(email|recovery|invite|email_change)"/, ad);
    assert.doesNotMatch(html, /ConfirmationURL/, ad);
    /* Dış bağlantı yalnız sitenin kendisi. */
    for (const [, h] of html.matchAll(/href="([^"]+)"/g)) {
      assert.ok(h.startsWith('{{ .SiteURL }}/') || h === 'https://stajimvar.com', `${ad}: ${h}`);
    }
    /* Görsel yalnız sitenin kendi logosu; süre vaadi yok (geçerlilik Supabase ayarında). */
    for (const [, src] of html.matchAll(/src="([^"]+)"/g)) assert.equal(src, 'https://stajimvar.com/logo.png', ad);
    /*
      Yazılan süre yayın hattının uyguladığı mailer_otp_exp ile aynı olmalı.
    */
    for (const [, n] of html.matchAll(/(\d+) saat geçerli/g)) assert.equal(Number(n) * 3600, AYARLAR.mailer_otp_exp, ad);
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
  for (const k of Object.keys(yuk())) assert.match(k, /^(mailer_(subjects|templates)_|rate_limit_email_sent$|smtp_sender_name$|mailer_otp_exp$)/);
  assert.deepEqual(AYARLAR, { rate_limit_email_sent: 200, smtp_sender_name: 'StajımVar', mailer_otp_exp: 86400 });
  const w = oku('.github/workflows/supabase-production.yml');
  assert.match(w, /- name: Kimlik e-postası şablonlarını uygula\s+continue-on-error: true\s+run: node scripts\/auth-eposta-sablonlari\.mjs/);
  assert.match(oku('scripts/detect-deploy-changes.mjs'), /'supabase\/templates\/'/);
});

test('hitap kişinin adıyla; ad yoksa yalnız "Merhaba,"', () => {
  const c = oku('supabase/templates/confirmation.html');
  assert.equal((c.match(/Merhaba\{\{ with \.Data\.full_name \}\} \{\{ \. \}\}\{\{ end \}\},/g) ?? []).length, 2);
  assert.doesNotMatch(c, /COMPANY_NAME/);
});

test('e-posta bağlantısı sitede doğrulanıyor; parametreler adresten siliniyor; tür listesi dar', () => {
  const a = oku('src/lib/auth.ts');
  assert.match(a, /export async function adrestekiEpostaBaglantisi\(\)/);
  assert.match(a, /const EPOSTA_BAGLANTI_TURLERI = \['email', 'signup', 'recovery', 'invite', 'magiclink', 'email_change'\] as const;/);
  const g = a.slice(a.indexOf('export async function adrestekiEpostaBaglantisi'));
  assert.ok(g.indexOf("window.history.replaceState") < g.indexOf('verifyOtp'), 'adres doğrulamadan ÖNCE temizlenmeli');
  assert.match(oku('src/App.tsx'), /void adrestekiEpostaBaglantisi\(\)\.then/);
});
