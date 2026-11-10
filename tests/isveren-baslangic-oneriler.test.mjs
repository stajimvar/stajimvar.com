import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { alanAdindanSirketAdi, epostadanSirketTahmini } from '../src/lib/isveren-eposta-tahmini.mjs';

test('kurumsal e-postadan şirket adı ve kayıtlı alan adı', () => {
  assert.deepEqual(epostadanSirketTahmini('ik@modmere.com'), { alan: 'modmere.com', sirketAdi: 'Modmere' });
  assert.deepEqual(epostadanSirketTahmini('a@ik.kariyer.net.tr'), { alan: 'kariyer.net.tr', sirketAdi: 'Kariyer' });
  assert.equal(alanAdindanSirketAdi('yami-studios.com'), 'Yami Studios');
});

test('serbest ve tek kullanımlık sağlayıcıda tahmin yok (otomatik onayla aynı liste)', () => {
  for (const e of ['x@gmail.com', 'x@hotmail.com.tr', 'x@outlook.com', 'x@mailinator.com', 'bozuk', '']) {
    assert.equal(epostadanSirketTahmini(e), null, e);
  }
  assert.match(readFileSync(new URL('../src/lib/isveren-eposta-tahmini.mjs', import.meta.url), 'utf8'), /from '\.\/sirket-dogrulama\.mjs'/);
});

test('sayfa: kendiliğinden arama, web sitesi önerisi, sektör/şehir önerisi, kişisel e-posta notu', () => {
  const s = readFileSync(new URL('../src/components/IsverenBaslangic.tsx', import.meta.url), 'utf8');
  assert.match(s, /setTerim\(tahmin\.sirketAdi\);\s+void aramaYap\(tahmin\.sirketAdi\);/);
  assert.match(s, /webSitesi: tahmin\.alan/);
  assert.match(s, /options=\{sektorler\}/);
  assert.match(s, /options=\{TR_CITIES\}/);
  assert.match(s, /Şirket hesabı bu yüzden otomatik açılmaz/);
});
