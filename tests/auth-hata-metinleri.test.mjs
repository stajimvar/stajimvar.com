import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const kaynak = readFileSync(new URL('../src/lib/auth.ts', import.meta.url), 'utf8');
const blok = kaynak.slice(kaynak.indexOf('function translateError'), kaynak.indexOf('function fail('));

/* Çeviri tablosunu kaynaktan kurup gerçek Supabase mesajlarıyla sınıyoruz (auth.ts istemci içe aktarıyor). */
const kurallar = [...blok.matchAll(/\[\s*(\/[^\n]+?\/i),\s*'([^']+)'/g)].map((m) => [eval(m[1]), m[2]]);
const cevir = (metin) => (kurallar.find(([r]) => r.test(metin)) ?? [null, 'Bir sorun oluştu. Lütfen tekrar dene.'])[1];

test('süresi dolmuş e-posta bağlantısı "iptal edildi" sayılmıyor', () => {
  const t = cevir('access_denied Email link is invalid or has expired');
  assert.match(t, /süresi dolmuş/);
  assert.match(cevir('otp_expired'), /süresi dolmuş/);
  assert.match(cevir('access_denied User denied'), /iptal edildi/);
});

test('proje e-posta sınırı ve öteki Supabase mesajları Türkçe', () => {
  assert.match(cevir('email rate limit exceeded'), /çok fazla e-posta gönderiliyor/);
  assert.match(cevir('New password should be different from the old password.'), /eskisinden farklı/);
  assert.match(cevir('Password is known to be weak and easy to guess'), /yaygın/);
  assert.match(cevir('Signups not allowed for this instance'), /kayıt alınmıyor/);
  assert.match(cevir('Invalid login credentials'), /hatalı/);
});
