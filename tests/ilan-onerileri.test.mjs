import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ALAN_POZISYONLARI, ilkSablonMetni, sehirOnerisi, sirketeGorePozisyonlar } from '../src/lib/ilan-onerileri.mjs';
import { POZISYONLAR, pozisyonAlani } from '../src/lib/pozisyonlar.mjs';

/*
  ŞİRKETE GÖRE İLAN ÖNERİLERİ (7 Kasım 2026, kullanıcı isteği):
  "şirketime göre neye ihtiyacım olacağını bilsin". Modmere'nin profili:
  sektör "Tekstil / E-ticaret / Moda", şehir İstanbul.
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

test('her önerilen pozisyon listede var ve kendi alanının şablonuna bağlı', () => {
  for (const [alan, liste] of Object.entries(ALAN_POZISYONLARI)) {
    for (const p of liste) {
      assert.ok(POZISYONLAR.includes(p), p);
      assert.equal(pozisyonAlani(p)?.id, alan, p);
      assert.ok(ilkSablonMetni(p).length >= 200, `${p}: şablon formun alt sınırını geçmeli`);
    }
  }
});

test('moda/e-ticaret şirketine önce tekstil, sonra pazarlama ve satış', () => {
  const o = sirketeGorePozisyonlar({
    sektor: 'Tekstil / E-ticaret / Moda',
    tanitim: 'Stajyerlerimiz; e-ticaret yönetimi, dijital pazarlama, ürün araştırması',
  });
  assert.equal(o[0], 'Tekstil Tasarım Stajyeri');
  assert.ok(o.includes('Dijital Pazarlama Stajyeri'));
  assert.ok(o.includes('Satış Stajyeri'));
  assert.ok(o.length <= 5);
});

test('profili boş ya da tanınmayan şirkete öneri uydurulmuyor', () => {
  assert.deepEqual(sirketeGorePozisyonlar({}), []);
  assert.deepEqual(sirketeGorePozisyonlar({ sektor: 'Diğer' }), []);
});

test('şehir yalnız Türkiye ilinden biriyse önceden doluyor', () => {
  const iller = ['İstanbul', 'İzmir', 'Ankara'];
  assert.equal(sehirOnerisi('İstanbul', iller), 'İstanbul');
  assert.equal(sehirOnerisi('istanbul, Türkiye', iller), 'İstanbul');
  assert.equal(sehirOnerisi('Berlin', iller), '');
  assert.equal(sehirOnerisi(null, iller), '');
});

test('form: öneriler yalnız yeni ilanda; seçim boş iş tanımına şablon yazıyor, doluya dokunmuyor', () => {
  const f = oku('src/sirket/IlanFormu.tsx');
  assert.match(f, /duzenlenenId \? \[\] : sirketeGorePozisyonlar\(/);
  assert.match(f, /duzenlenenId \? BOS : \{ \.\.\.BOS, sehir: sehirOnerisi\(sirketSehri, TR_CITIES\)/);
  assert.match(f, /aciklama: o\.aciklama\.trim\(\) \? o\.aciklama : ilkSablonMetni\(unvan\)/);
  const p = oku('src/sirket/SirketPaneli.tsx');
  assert.match(p, /sirketSektoru=\{baglam\.sektor\}/);
  assert.match(oku('src/lib/sirket-veri.ts'), /logo_url, industry, location, description'\)/);
});
