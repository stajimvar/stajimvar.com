import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  ONAY BİLDİRİMLERİ (9 Kasım 2026, kullanıcı isteği): yönetici ilanı
  onayladığında şirkete "İlanın yayında"; şirket talebi onaylanınca
  "Şirket hesabın onaylandı". Modmere ilanı onaylandı, bildirim gitmedi.
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');
const GOC = oku('supabase/migrations/20261224010000_onay_bildirimleri.sql').replace(/\/\*[\s\S]*?\*\//g, '');

test('ilan yayına geçince şirketin her üyesine bildirim; şirketin kendi gönderimine değil', () => {
  assert.match(GOC, /after update of status on public\.listings/);
  assert.match(GOC, /when \(old\.status is distinct from 'published' and new\.status = 'published'\)/);
  assert.match(GOC, /new\.origin <> 'employer_posted'/);
  assert.match(GOC, /if auth\.uid\(\) is not null and not public\.is_admin\(\) then\s*return new;/);
  assert.match(GOC, /'ilan_yayinda',\s*'İlanın yayında'/);
  assert.match(GOC, /from public\.company_members m\s*where m\.company_id = new\.company_id/);
});

test('şirket talebi onaylanınca talep sahibine bir kez bildirim', () => {
  assert.match(GOC, /after update of durum on public\.sirket_talepleri/);
  assert.match(GOC, /new\.durum = 'onaylandi'/);
  assert.match(GOC, /'sirket-onaylandi:' \|\| new\.id::text/);
});

test('bildirim yazılamazsa onay durmuyor; tekrar yok; işlevler dışarıya kapalı', () => {
  assert.equal((GOC.match(/exception when others then\s*raise warning/g) ?? []).length, 2);
  assert.equal((GOC.match(/on conflict \(dedupe_key\) where dedupe_key is not null do nothing/g) ?? []).length, 3);
  assert.match(GOC, /revoke all on function public\.ilan_yayinda_bildir\(\) from public, anon, authenticated;/);
  assert.match(oku('src/components/BildirimMerkezi.tsx'), /tur === 'ilan_yayinda' \|\| tur === 'sirket_onaylandi' \? CheckCircle2/);
});

test('geriye dönük bildirim yalnız onaylanmış Modmere ilanına', () => {
  assert.match(GOC, /where l\.id = '993341d7-66eb-481b-a78e-492cd842395a'\s*and l\.status = 'published'/);
  assert.match(GOC, /':geriye-donuk'/);
});
