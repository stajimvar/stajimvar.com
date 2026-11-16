import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { botZiyaretiMi, VERI_MERKEZI_SEHIRLERI } from '../src/lib/bot-ziyareti.mjs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

test('bot ziyareti: gerçek tarayıcı ev ağından sayılır', () => {
  assert.equal(botZiyaretiMi({ araci: CHROME, asn: 9121 }), false); // Türk Telekom
  assert.equal(botZiyaretiMi({ araci: IPHONE, asn: 15897 }), false); // Vodafone TR
});

test('bot ziyareti: kendini tanıtan otomasyon, boş araç, veri merkezi ve doğrulanmış bot sayılmaz', () => {
  for (const araci of [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.1)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/130.0 Safari/537.36',
    'Mozilla/5.0 (compatible; ClaudeBot/1.0)',
    'python-requests/2.31',
    'curl/8.4.0',
  ]) assert.equal(botZiyaretiMi({ araci }), true, araci);
  assert.equal(botZiyaretiMi({ araci: '' }), true);
  assert.equal(botZiyaretiMi({}), true);
  assert.equal(botZiyaretiMi({ araci: CHROME, asn: 16509 }), true); // Amazon (Ashburn)
  assert.equal(botZiyaretiMi({ araci: CHROME, asn: 8075 }), true); // Azure
  assert.equal(botZiyaretiMi({ araci: CHROME, dogrulanmisBot: true }), true);
});

test('olay uç noktası botu yazmadan döner', () => {
  const s = oku('functions/api/olay.ts');
  assert.match(s, /import \{ botZiyaretiMi \} from '\.\.\/\.\.\/src\/lib\/bot-ziyareti\.mjs';/);
  const kontrol = s.indexOf('botZiyaretiMi({');
  assert.ok(kontrol > 0 && kontrol < s.indexOf('site_olayi_yaz'), 'bot kontrolü yazmadan önce');
  assert.match(s, /user-agent/);
});

test('ölçüm göçü: geçmiş bot oturumları silinmiyor, arşive taşınıyor; ekip başvuruları ayrı', () => {
  const g = oku('supabase/migrations/20270116010000_olcum_duzeltmesi.sql');
  assert.match(g, /create table if not exists public\.site_olaylari_bot_arsivi/);
  assert.match(g, /revoke all on table public\.site_olaylari_bot_arsivi from public, anon, authenticated/);
  assert.match(g, /returning s\.\*\s+\)\s+insert into public\.site_olaylari_bot_arsivi/);
  assert.match(g, /bool_and\(kullanici_id is null\)/);
  for (const sehir of VERI_MERKEZI_SEHIRLERI) assert.ok(g.includes(`'${sehir}'`), sehir);
  assert.match(g, /'basvuruEkip'/);
  assert.match(g, /revoke all on function public\.yonetim_ozet\(\) from public, anon/);
  assert.match(oku('src/lib/queries/index.ts'), /basvuruEkip\?: number/);
  for (const p of ['src/components/yonetim/OzetSayfasi.tsx', 'src/components/AdminDashboard.tsx'])
    assert.match(oku(p), /ekip hesabının/, p);
});

test('haftalık özet e-postası: kuyrukta, tercihle kapanıyor, metin iki göndericide aynı', () => {
  const g = oku('supabase/migrations/20270115010000_haftalik_ozet_epostasi.sql');
  assert.match(g, /add column if not exists haftalik_ozet_eposta boolean not null default true/);
  assert.match(g, /n\.type = 'haftalik_ozet' and not t\.haftalik_ozet_eposta/);
  assert.match(g, /'sahiplenme_onaylandi', 'haftalik_ozet'\]\)/);
  assert.match(g, /eposta_son_hata = 'goc-oncesi'/);
  const not = 'Haftada bir, pazartesi günü gönderilir;';
  for (const p of ['scripts/bildirim-epostasi.mjs', 'supabase/functions/eposta-tetik/index.ts']) {
    const s = oku(p);
    assert.ok(s.includes(not), p);
    assert.ok(s.includes("'Yeni ilanları gör'"), p);
  }
  assert.match(oku('src/sirket/EpostaTercihleri.tsx'), /haftalik_ozet_eposta: \{\s+etiket: 'Haftalık özeti e-postayla gönder'/);
  assert.match(oku('src/App.tsx'), /<EpostaTercihAnahtari userId=\{session\.userId\} alan="haftalik_ozet_eposta" \/>/);
});

test('güvenlik göçü: arama yolu sabit, tetikleyici fonksiyonlar istemciden çağrılamaz', () => {
  const g = oku('supabase/migrations/20270117010000_guvenlik_uyarilari.sql');
  assert.match(g, /set search_path = public, extensions, pg_temp/);
  assert.match(g, /c like 'search_path=%'/);
  assert.match(g, /p\.prosecdef\s+and p\.prorettype = 'pg_catalog\.trigger'::regtype/);
  assert.match(g, /revoke all on function %s from public, anon, authenticated/);
  /* Kapı ve RPC fonksiyonlarının yetkisi bu göçte toptan kalkmıyor. */
  assert.doesNotMatch(g, /revoke[^;]*is_admin/);
});
