import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  SIRALAMA_SECENEKLERI,
  VARSAYILAN_SIRALAMA,
  ilanKarsilastirici,
  siralamaDegeri,
  tamKatalogGerekir,
} from '../src/lib/ilan-siralama.mjs';

/*
  İLAN SIRALAMASI (1 Kasım 2026) — kurallar lib/ilan-siralama.mjs,
  bağlantı MatchedInternshipsView.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const GORUNUM = fs.readFileSync(path.join(KOK, 'src', 'components', 'MatchedInternshipsView.tsx'), 'utf8');

const ilan = (id, postedAt, applicationDeadline, companyName) => ({ id, postedAt, applicationDeadline, companyName });
const KUME = [
  ilan('a', '2026-10-20T10:00:00Z', '2026-12-01', 'Zeta'),
  ilan('b', '2026-10-30T10:00:00Z', '', 'alfa'),
  ilan('c', '2026-10-25T10:00:00Z', '2026-11-10', 'Çiçek'),
  ilan('d', '2026-10-28T10:00:00Z', null, 'Beta'),
  ilan('e', '2026-10-10T10:00:00Z', '2027-03-01', 'İnci'),
  ilan('f', null, '2026-11-10', 'Ilık'),
];
const sirala = (sira) => [...KUME].sort(ilanKarsilastirici(sira)).map((x) => x.id);

test('dört seçenek, sıra ve etiketler; varsayılan en yeni', () => {
  assert.deepEqual(
    SIRALAMA_SECENEKLERI.map((s) => s.etiket),
    ['En yeni', 'Son başvuru tarihi yaklaşan', 'Son başvuru tarihi en uzak', 'Şirket adına göre A–Z'],
  );
  assert.equal(VARSAYILAN_SIRALAMA, 'newest');
  assert.equal(SIRALAMA_SECENEKLERI[0].deger, VARSAYILAN_SIRALAMA);
  /* Bozuk değer varsayılana düşüyor. */
  assert.equal(siralamaDegeri('match'), 'newest');
  assert.equal(siralamaDegeri(undefined), 'newest');
  assert.equal(siralamaDegeri('company_asc'), 'company_asc');
});

test('en yeni: postedAt azalan, tarihsiz sonda', () => {
  assert.deepEqual(sirala('newest'), ['b', 'd', 'c', 'a', 'e', 'f']);
});

test('son başvuru yaklaşan: artan, eşitlikte en yeni, tarihsizler EN ALTTA', () => {
  /* c ve f aynı gün; c daha yeni yayımlandı (f'nin yayın tarihi yok). */
  assert.deepEqual(sirala('deadline_asc'), ['c', 'f', 'a', 'e', 'b', 'd']);
});

test('son başvuru en uzak: azalan, tarihsizler yine EN ALTTA', () => {
  assert.deepEqual(sirala('deadline_desc'), ['e', 'a', 'c', 'f', 'b', 'd']);
});

test('şirket A–Z: Türkçe sıra, büyük/küçük harf duyarsız', () => {
  /* alfa < Beta < Çiçek < Ilık < İnci < Zeta (Türkçe alfabe: I, İ ayrı harf). */
  assert.deepEqual(sirala('company_asc'), ['b', 'd', 'c', 'f', 'e', 'a']);
  const bos = [ilan('x', '2026-10-01', '', ''), ilan('y', '2026-10-01', '', 'Acme')];
  assert.deepEqual(bos.sort(ilanKarsilastirici('company_asc')).map((x) => x.id), ['y', 'x'], 'adı boş kayıt sona');
});

test('karşılaştırıcı kararlı: aynı girdi her seferinde aynı sıra', () => {
  for (const s of SIRALAMA_SECENEKLERI) {
    const ters = [...KUME].reverse().sort(ilanKarsilastirici(s.deger)).map((x) => x.id);
    assert.deepEqual(ters, sirala(s.deger), s.deger);
  }
});

test('yalnız en yeni sunucu sırası; ötekiler kataloğun tamamını istiyor', () => {
  assert.equal(tamKatalogGerekir('newest'), false);
  for (const s of ['deadline_asc', 'deadline_desc', 'company_asc']) assert.equal(tamKatalogGerekir(s), true, s);
});

/* ------------------------------------------------------------- görünüm */

test('sıralama süzgeçle aynı bellekte, süzgeçten sonra ve sayfalamadan önce', () => {
  assert.match(GORUNUM, /const karsilastir = ilanKarsilastirici\(sortBy\);/);
  assert.match(GORUNUM, /\.filter\(\(\{ listing, match \}\) => gecer\(listing, match\)\)\s*\.sort\(\(a, b\) => karsilastir\(a\.listing, b\.listing\)\);/);
  /* En yeni dışındaki sıralama kalan sayfaları yükletiyor (süzgeçlerle aynı efekt). */
  assert.match(GORUNUM, /const siralamaTumu = tamKatalogGerekir\(sortBy\);/);
  assert.match(GORUNUM, /!daraltmaVar && !siralamaTumu &&/);
});

test('çubuk ilk kartın üstünde: solda sayı, sağda etiketli seçici', () => {
  const cubuk = GORUNUM.indexOf('ref={siralamaCubuguRef}');
  const ilkKart = GORUNUM.indexOf('{filteredListings.map(({ listing, match, hasApplied }, index) => (');
  assert.ok(cubuk > 0 && ilkKart > cubuk, 'çubuk kart listesinden önce');
  const parca = GORUNUM.slice(cubuk, ilkKart);
  assert.match(parca, /\{gosterilecekToplam\} ilan/);
  assert.match(parca, /<label htmlFor="ilan-siralama" className="sr-only">/);
  assert.match(parca, /id="ilan-siralama"/);
  assert.match(parca, /min-h-11/, 'dokunma alanı 44 px');
  assert.match(parca, /SIRALAMA_SECENEKLERI\.map/);
});

test('değişimde istek yok, adres yok; görünür değilse listenin başına', () => {
  const tanim = GORUNUM.slice(GORUNUM.indexOf('const siralamaDegistir = '), GORUNUM.indexOf('const siralamaDegistir = ') + 400);
  assert.match(tanim, /setSortBy\(siralamaDegeri\(deger\)\)/);
  assert.match(tanim, /getBoundingClientRect\(\)\.top < 0\) cubuk\.scrollIntoView\(\{ block: 'start' \}\)/);
  assert.doesNotMatch(tanim, /fetch|navigate|history|location|searchParams/);
  /* SEO: sıralama adrese yazılmıyor, dizinlenebilir kopya sayfa yok (yorumlar hariç kod). */
  const kod = GORUNUM.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  assert.doesNotMatch(kod, /[?&]siralama=|searchParams\.set\(\s*['"]sira|sortBy[^;\n]*(?:history|location|navigate)/);
});
