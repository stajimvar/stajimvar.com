import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  ŞİRKET MESAJLAŞMASI (9 Kasım 2026, Modmere ile canlı denetim):
  Adaylar'daki "Mesaj gönder" çıkmazdı; başvurana mesaj yolu yoktu.
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');
const GOC = oku('supabase/migrations/20270104010000_basvurana_mesaj.sql').replace(/\/\*[\s\S]*?\*\//g, '');

test('mesajlar sayfası şirket hesabını geri çevirmiyor; karar sunucuda', () => {
  const s = oku('src/components/mesaj/MesajlarSayfasi.tsx');
  assert.match(s, /setUygunluk\(satir \? 'ogrenci' : 'degil'\);/);
});

test('başvurana yazma: iletişim rızası ve geri çekilmemiş başvuru; istek akışı korunuyor', () => {
  const f = GOC.slice(GOC.indexOf('function sosyal_gizli.yazilabilir_aday'));
  assert.match(f, /select sosyal_gizli\.aday_mi\(kim\)\s*or exists/);
  assert.match(f, /a\.status <> 'withdrawn'/);
  assert.match(f, /public\.basvuru_iletisimi_acik\(a\.id\)/);
  assert.match(f, /sb\.sirket_id = l\.company_id/);
  /* mesaj_gonder'in yalnız o çağrısı değişiyor. */
  assert.match(GOC, /execute replace\(tanim, 'sosyal_gizli\.aday_mi\(p_alici\)', 'sosyal_gizli\.yazilabilir_aday\(ben, p_alici\)'\);/);
  assert.match(GOC, /raise exception 'mesaj_gonder beklenen tek aday_mi çağrısını içermiyor'/);
});

test('kullanıcı adı yalnız yazabilen üyeye ve rıza açıkken; çekmecede Mesaj gönder', () => {
  const f = GOC.slice(GOC.indexOf('function public.basvuru_aday_kullanici_adi'));
  assert.match(f, /public\.sirket_basvuru_yazabilir\(l\.company_id\)/);
  assert.match(f, /public\.basvuru_iletisimi_acik\(a\.id\)/);
  assert.match(GOC, /revoke all on function public\.basvuru_aday_kullanici_adi\(uuid\) from public, anon;/);
  const c = oku('src/sirket/AdayCekmecesi.tsx');
  assert.match(c, /href=\{`\/mesajlar\/\$\{encodeURIComponent\(iletisim\.kullaniciAdi\)\}`\}/);
  assert.match(oku('src/lib/sirket-veri.ts'), /db\.rpc\('basvuru_aday_kullanici_adi'/);
});
