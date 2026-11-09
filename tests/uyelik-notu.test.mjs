import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { UYELIK_NOTLARI } from '../src/lib/uyelik-notu.mjs';

/* ÜYE OLMAYANA DIŞ BAŞVURU YERİNE KAYIT (9 Kasım 2026, kullanıcı isteği). */
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

test('not ilan ve burs için var; vaatler sitenin bugün yaptıkları', () => {
  for (const tur of ['ilan', 'burs']) {
    const n = UYELIK_NOTLARI[tur];
    assert.ok(n.baslik && n.aciklama && n.maddeler.length >= 3, tur);
    assert.match(n.aciklama, /kendi sitesinde yapılıyor/);
  }
  /* Vaat edilmeyenler: tek tıkla başvuru, şirkete iletim. */
  const hepsi = JSON.stringify(UYELIK_NOTLARI);
  assert.doesNotMatch(hepsi, /tek tıkla|şirkete iletilir/);
});

test('kayıt penceresi notu gösteriyor; burs ve ilan kapıları notla açıyor', () => {
  const app = oku('src/App.tsx');
  assert.match(app, /const notTuru = not \?\? \(niyet\?\.tur === 'dis' \? 'ilan' : null\);/);
  assert.match(app, /onRequireLogin=\{\(\) => handleOpenLogin\(undefined, 'burs'\)\}/);
  assert.match(app, /uyelikNotu=\{authBaglam === 'ogrenci' \? uyelikNotu : null\}/);
  assert.match(app, /girisGerekli=\{!session\}\s*onGirisGerekli=\{AUTH_ENABLED \? handleOpenLogin : undefined\}/);
  assert.match(oku('src/components/AuthModal.tsx'), /\{uyelikNotu && mode !== 'sifirla' && \(/);
  assert.match(oku('src/ui/DisBaglanti.tsx'), /kapiEtiketi = 'Başvurmak için ücretsiz üye ol'/);
});
