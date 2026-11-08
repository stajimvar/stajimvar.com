import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { govdeKur, kacir, konuKur } from '../scripts/sirket-talebi-epostasi.mjs';

/* YENİ ŞİRKET TALEBİ E-POSTASI (9 Kasım 2026, kullanıcı isteği). */
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');
const GOC = oku('supabase/migrations/20261229010000_sirket_talebi_epostasi.sql').replace(/\/\*[\s\S]*?\*\//g, '');

test('kuyruk: kilitli alım, üstel bekleme, geçmiş talepler gönderilmiş sayılıyor', () => {
  assert.match(GOC, /for update skip locked/);
  assert.match(GOC, /power\(2, least\(eposta_denemeleri \+ 1, 7\)\)/);
  assert.match(GOC, /set eposta_gonderildi_at = coalesce\(eposta_gonderildi_at, now\(\)\)\s*where eposta_gonderildi_at is null;/);
  assert.match(GOC, /public\.otomatik_karar_metni\(k\.karar_gerekcesi\)/);
});

test('yetkiler: kuyruk işlevleri yalnız service_role', () => {
  for (const ad of ['sirket_talebi_eposta_kuyruktan_al\\(integer, integer\\)', 'sirket_talebi_eposta_isaretle\\(uuid, boolean, text\\)']) {
    assert.match(GOC, new RegExp(`revoke all on function public\\.${ad} from public, anon, authenticated;`));
    assert.match(GOC, new RegExp(`grant execute on function public\\.${ad} to service_role;`));
  }
});

test('e-posta: talep metni kaçırılıyor, konu tek satır, inceleme bağlantısı var', () => {
  assert.equal(kacir('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
  const t = {
    sirket_adi: 'Acme\nBcc: x@y.com', karar: 'Onayını bekliyor — hesap e-postası kurumsal değil',
    web_sitesi: 'https://acme.com', hesap_eposta: 'a@gmail.com', kurumsal_eposta: 'a@gmail.com',
  };
  assert.doesNotMatch(konuKur(t), /[\r\n]/);
  assert.match(konuKur(t), /onay bekliyor/);
  assert.match(konuKur({ ...t, karar: 'Otomatik onaylandı' }), /otomatik onaylandı/);
  const g = govdeKur({ ...t, sirket_adi: '<b>x</b>' });
  assert.ok(g.includes('&lt;b&gt;x&lt;/b&gt;'));
  assert.ok(!g.includes('Formdaki e-posta'), 'aynı adres iki kez yazılmıyor');
  assert.match(g, /stajimvar\.com\/yonetim\/onay/);
});

test('iş akışı 10 dakikada bir, üretim ortamında, Idempotency-Key talep kimliği', () => {
  const yml = oku('.github/workflows/sirket-talebi-epostasi.yml');
  assert.match(yml, /cron: "\*\/10 \* \* \* \*"/);
  assert.match(yml, /environment: production/);
  assert.match(oku('scripts/sirket-talebi-epostasi.mjs'), /'Idempotency-Key': `sirket-talebi-\$\{t\.id\}`/);
});
