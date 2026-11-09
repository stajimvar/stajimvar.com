import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ilanaUygunluk, uygunAdaylar, sozcukler } from '../src/lib/aday-uygunlugu.mjs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('başlıktaki dolgu sözcükleri (staj, stajyer, uzun dönem) eşleşme sayılmıyor', () => {
  assert.deepEqual(sozcukler('Uzun Dönem Yazılım Stajyeri'), ['yazılım']);
});

test('Türkçe ek: ortak kök eşleşiyor; kısa kök (3 harf) tek başına eşleşmiyor', () => {
  const u = ilanaUygunluk({ title: 'Dijital Pazarlama Stajyeri', city: 'İstanbul' }, { hedefRoller: ['Pazarlamacı'], sehir: 'istanbul' });
  assert.deepEqual(u.sozcukler, ['pazarlama']);
  assert.equal(u.sehir, true);
  assert.equal(u.puan, 3);
  assert.equal(ilanaUygunluk({ title: 'Art Direktör' }, { beceriler: ['Artificial'] }).puan, 0);
});

test('yalnız şehir tutması uygunluk değil; uzaktan ilanda şehir aranmıyor', () => {
  assert.equal(ilanaUygunluk({ title: 'Yazılım', city: 'Ankara' }, { bolum: 'Tarih', sehir: 'Ankara' }).puan, 0);
  const u = ilanaUygunluk({ title: 'Yazılım', city: 'Ankara', work_type: 'Remote' }, { beceriler: ['Yazılım'], sehir: 'Ankara' });
  assert.equal(u.sehir, false);
  assert.equal(u.puan, 2);
});

test('sıralama puana göre, eşitte özgün sıra; uygunsuz aday listede yok', () => {
  const ilan = { title: 'Veri Analizi', city: 'İzmir' };
  const r = uygunAdaylar(ilan, [
    { id: 'a', beceriler: ['Veri'] },
    { id: 'b', beceriler: ['Çizim'] },
    { id: 'c', beceriler: ['Veri', 'Analiz'], sehir: 'İzmir' },
    { id: 'd', bolum: 'Veri Bilimi' },
  ]);
  assert.deepEqual(r.map((x) => x.aday.id), ['c', 'a', 'd']);
});

test('Adaylar ekranı: ilan + bölüm/sınıf/şehir select; çip satırı yok; yalnız yayındaki ilanlar', () => {
  const ekran = oku('src/sirket/SirketAdaylar.tsx');
  assert.match(ekran, /İlanıma uygun adaylar/);
  assert.match(ekran, /\['bolum', 'Bölüm', 'Tüm bölümler'\]/);
  assert.match(ekran, /İlanla eşleşen:/);
  assert.match(ekran, /Bu seçime uyan aday yok/);
  const panel = oku('src/sirket/SirketPaneli.tsx');
  assert.match(panel, /<SirketAdaylar\s+onNavigate=\{onNavigate\}\s+ilanlar=\{ilanlar\s+\.filter\(\(i\) => i\.status === 'published'\)/);
});
