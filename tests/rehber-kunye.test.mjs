import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { BILDIRIM_YOLU, YAZAR, kunye, tarihYaz } from '../src/lib/rehber-kunye.mjs';

/**
 * KÜNYE: EKRAN, ÖN RENDER VE JSON-LD AYNI ŞEYİ SÖYLEMELİ
 *
 * ÖLÇÜLEN HATA (21 Eylül 2026, canlı rehber/ats-uyumlu-cv):
 * sayfanın "Bu rehber neye dayanıyor" bölümü ön render edilmiş HTML'de
 * YOKTU; yalnız React hidrasyonundan sonra çiziliyordu. Sebebi
 * `scripts/onrender.mjs` içindeki alan çıkarımının `dayanak`ı hiç
 * almamasıydı — yani JavaScript çalışmadan, resmî kaynağı olmayan 19
 * rehber neye dayandığını hiç söylemiyordu.
 *
 * Testler kaynağın TEK olmasını ve üç yüzeyin ayrışmamasını bağlıyor.
 */

const KOK = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const oku = (y) => readFileSync(path.join(KOK, y), 'utf8');
const ONRENDER = oku('scripts/onrender.mjs');
const SAYFA = oku('src/components/GuidePages.tsx');

/* ------------------------------------------------ 1. TEK KAYNAK */

test('künye tek modülden geliyor, iki yerde yazılmıyor', () => {
  assert.match(ONRENDER, /from '\.\.\/src\/lib\/rehber-kunye\.mjs'/);
  assert.match(SAYFA, /from '\.\.\/lib\/rehber-kunye\.mjs'/);
  assert.match(ONRENDER, /kunye\(r\)/, 'ön render künyeyi çağırmalı');
  assert.match(SAYFA, /kunye\(rehber \?\? \{\}\)/, 'sayfa künyeyi çağırmalı');
});

test('ön render `dayanak` alanını çıkarıyor', () => {
  /*
    Asıl kusur buydu: alan çıkarım listesinde yoktu, bu yüzden gövde
    onu yazamıyordu. Satır silinirse test kırmızı dönsün.
  */
  const blok = ONRENDER.slice(ONRENDER.indexOf('async function rehberleriCiz'));
  const govde = blok.slice(0, blok.indexOf('return sonuc'));
  assert.match(govde, /dayanak: r\.dayanak/);
});

/* --------------------------------------------- 2. YAZAR KURUM */

test('yazar kurum, uydurma kişi değil', () => {
  assert.equal(YAZAR, 'StajımVar Editör Ekibi');
  assert.ok(!/[A-ZİŞĞÜÖÇ][a-zışğüöç]+ [A-ZİŞĞÜÖÇ][a-zışğüöç]+oğlu/.test(YAZAR), 'kişi adı olmamalı');
});

test('JSON-LD yazarı görünür künyeyle AYNI', () => {
  /*
    Yapısal veride olup ekranda başka türlü görünen bilgi Google'ın
    kurallarına aykırı. Önce JSON-LD 'StajımVar', ekran 'StajımVar
    Editör Ekibi' diyordu.
  */
  assert.match(ONRENDER, /author: \{ '@type': 'Organization', name: YAZAR/);
  /* Yayıncı ayrı kalmalı: marka ile editör ekibi farklı şeyler. */
  assert.match(ONRENDER, /publisher: \{[\s\S]{0,80}name: 'StajımVar'/);
});

/* ------------------------------------------- 3. KÜNYE MANTIĞI */

test('kaynak varken dayanak gösterilmiyor', () => {
  const k = kunye({ kaynaklar: [{ adres: 'https://x', etiket: 'y' }], dayanak: 'pratik' });
  assert.equal(k.kaynakVar, true);
  assert.equal(k.dayanak, null, 'ikisi bir arada olmamalı');
});

test('kaynak yokken dayanak gösteriliyor', () => {
  const k = kunye({ kaynaklar: [], dayanak: 'Başvuru pratiğine dayanıyor.' });
  assert.equal(k.kaynakVar, false);
  assert.equal(k.dayanak, 'Başvuru pratiğine dayanıyor.');
});

test('ikisi de yoksa uydurulmuyor', () => {
  const k = kunye({});
  assert.equal(k.dayanak, null);
  assert.equal(k.tarih, null);
  assert.equal(k.yazar, YAZAR);
});

test('tarih biçimi ve geçersiz girdi', () => {
  assert.equal(tarihYaz('2026-09-01'), '1 Eylül 2026');
  assert.equal(tarihYaz('2026-12-31'), '31 Aralık 2026');
  assert.equal(tarihYaz(''), null);
  assert.equal(tarihYaz('bozuk'), null);
  assert.equal(tarihYaz(undefined), null);
  /* Ay numarası aralık dışıysa uydurma ay adı üretilmiyor. */
  assert.equal(tarihYaz('2026-13-01'), null);
});

test('bildirim yolu var olan bir sayfa', () => {
  assert.equal(BILDIRIM_YOLU, '/iletisim');
});

/* ------------------------------------- 4. ÖN RENDER ÇIKTISI */

test('üretilmişse künye statik HTML içinde', () => {
  /*
    `dist` yoksa atlanıyor: derleme her koşuda çalıştırılmıyor.
    Varsa asıl kanıt burada — kaynak doğru olsa bile çıktı eksikse
    canlıya o gidiyor.
  */
  const dizin = path.join(KOK, 'dist', 'rehber');
  if (!existsSync(dizin)) return;
  const dosyalar = readdirSync(dizin).filter((d) => d.endsWith('.html'));
  assert.ok(dosyalar.length > 0, 'rehber sayfası üretilmeli');

  let dayanakli = 0;
  for (const d of dosyalar) {
    const h = readFileSync(path.join(dizin, d), 'utf8');
    assert.ok(h.includes('Künye'), `${d}: künye bölümü yok`);
    assert.ok(h.includes(YAZAR), `${d}: hazırlayan yok`);
    assert.ok(h.includes('Hatalı bilgi bildir'), `${d}: bildirim bağlantısı yok`);
    if (h.includes('Bu rehber neye dayanıyor')) dayanakli += 1;
  }
  /* Ölçüldü: 19 rehberin resmî kaynağı yok, dayanak cümlesi var. */
  assert.ok(dayanakli > 0, 'hiçbir sayfada dayanak bölümü yok — çıkarım yine kırılmış olabilir');
});

test('üretilmişse JSON-LD tarihi ekrandaki tarihle aynı günü gösteriyor', () => {
  const dizin = path.join(KOK, 'dist', 'rehber');
  if (!existsSync(dizin)) return;
  const dosyalar = readdirSync(dizin).filter((d) => d.endsWith('.html')).slice(0, 12);
  for (const d of dosyalar) {
    const h = readFileSync(path.join(dizin, d), 'utf8');
    const iso = (h.match(/"dateModified":"([^"]+)"/) || [])[1];
    if (!iso) continue;
    const gorunur = tarihYaz(iso);
    assert.ok(gorunur, `${d}: dateModified ayrıştırılamadı`);
    assert.ok(h.includes(gorunur), `${d}: JSON-LD ${iso} ama ekranda "${gorunur}" yok`);
    const yazar = (h.match(/"author":\{[^}]*"name":"([^"]+)"/) || [])[1];
    assert.equal(yazar, YAZAR, `${d}: JSON-LD yazarı ekrandakinden farklı`);
  }
});
