import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { aramaTeriminiOku, aramaAdresi } from '../src/lib/arama-url.mjs';

const kok = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));

test('paylaşılan ?q= bağlantısı okunuyor', () => {
  assert.equal(aramaTeriminiOku('?q=yazılım'), 'yazılım');
  assert.equal(aramaTeriminiOku('?sayfa=2&q=veri%20bilimi'), 'veri bilimi');
  assert.equal(aramaTeriminiOku('?q=%20%20boşluk%20%20'), 'boşluk');
  assert.equal(aramaTeriminiOku(''), '');
  assert.equal(aramaTeriminiOku('?sayfa=2'), '');
});

test('terim adrese yazılıyor, boşalınca parametre siliniyor', () => {
  assert.equal(aramaAdresi('/', '', 'yazılım'), '/?q=yaz%C4%B1l%C4%B1m');
  assert.equal(aramaAdresi('/', '?q=eski', 'yeni'), '/?q=yeni');
  assert.equal(aramaAdresi('/', '?q=eski', ''), '/');
  assert.equal(aramaAdresi('/', '?q=eski', '   '), '/');
});

test('diğer parametreler korunuyor', () => {
  assert.equal(aramaAdresi('/', '?utm_source=x', 'staj'), '/?utm_source=x&q=staj');
  assert.equal(aramaAdresi('/', '?utm_source=x&q=staj', ''), '/?utm_source=x');
});

test('/ilanlar sunucuda kalıcı olarak ana sayfaya yönleniyor', () => {
  const kurallar = fs.readFileSync(path.join(kok, 'public', '_redirects'), 'utf8');
  const satirlar = kurallar
    .split('\n')
    .map((satir) => satir.trim())
    .filter((satir) => satir && !satir.startsWith('#'));

  const ilanlar = satirlar.findIndex((satir) => /^\/ilanlar\s+\/\s+30[18]$/.test(satir));
  assert.ok(ilanlar >= 0, '/ilanlar için kalıcı yönlendirme kuralı yok');

  /*
    Eskiden burada kuralın SPA yedeğinden (`/*`) önce geldiği de
    sınanıyordu. O yedek kaldırıldı: her şeyi yakaladığı için sitedeki
    bütün hatalı adresler 200 ile ana sayfayı döndürüyordu. Kararı artık
    functions/_middleware.ts veriyor ve _redirects'te yakalayıcı kural
    kalmadığı tests/adres-kapsami.test.mjs içinde sınanıyor.
  */
  const yakalayan = satirlar.filter((satir) => /^\/\*\s/.test(satir));
  assert.deepEqual(yakalayan, [], 'her şeyi yakalayan SPA kuralı geri gelmiş');
});

test('sitemap eski /ilanlar adresini üretmiyor', () => {
  const harita = fs.readFileSync(path.join(kok, 'public', 'sitemap.xml'), 'utf8');
  assert.equal(/<loc>[^<]*\/ilanlar<\/loc>/.test(harita), false);
});
