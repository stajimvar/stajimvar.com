import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  EK_POZISYONLAR,
  HEDEF_POZISYONLAR,
  ILAN_BASLIKLARI,
  IS_TANIMI_ALANLARI,
  POZISYONLAR,
  katla,
  pozisyonAlani,
  pozisyonAra,
} from '../src/lib/pozisyonlar.mjs';
import { ACIKLAMA_EN_AZ, ACIKLAMA_EN_FAZLA } from '../src/lib/ilan-formu.mjs';

/*
  İLAN FORMU — POZİSYON ÖNERİSİ VE POZİSYONA BAĞLI İŞ TANIMI (27 Eylül 2026)

  Pozisyon alanı yazdıkça öneri veriyor (kelime başından, Türkçe
  karakterden bağımsız, serbest yazı serbest). İş tanımı başlangıç
  metinleri pozisyonun alanına göre; tanınmayan pozisyona alakasız metin
  önerilmiyor, yazılmış metin pozisyon değişince silinmiyor, dolu metnin
  üzerine şablon yazmadan önce soruluyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const FORM = oku('src/sirket/IlanFormu.tsx');
const OTO = oku('src/components/AutocompleteField.tsx');

/* ------------------------------------------------------------ arama */

test('"ta" tasarım pozisyonlarını getiriyor; "Stajyeri" içindeki "ta" sayılmıyor', () => {
  const s = pozisyonAra('ta');
  assert.ok(s.includes('Tasarım Stajyeri'));
  assert.ok(s.includes('Tekstil Tasarım Stajyeri'));
  assert.equal(s[0], 'Tasarım Stajyeri', 'baştan eşleşen üstte');
  for (const b of s) assert.match(katla(b), /(^|[^a-z])ta/, `${b} kelime başından eşleşmeli`);
  assert.ok(!s.includes('Satış Stajyeri'));
});

test('"yaz" yazılım pozisyonlarını buluyor; büyük harf ve Türkçe karakter aramayı bozmuyor', () => {
  assert.deepEqual(pozisyonAra('yaz'), ['Yazılım Geliştirme Stajyeri', 'Yazılım Mühendisliği Stajyeri']);
  assert.deepEqual(pozisyonAra('YAZI'), pozisyonAra('yazı'));
  assert.deepEqual(pozisyonAra('ınsan'), ['İnsan Kaynakları Stajyeri']);
  assert.deepEqual(pozisyonAra('İNSAN'), ['İnsan Kaynakları Stajyeri']);
  assert.ok(pozisyonAra('satis').includes('Satış Stajyeri'));
  assert.deepEqual(pozisyonAra('tek tas'), ['Tekstil Tasarım Stajyeri']);
  /* Tam başlık ya da yarım "stajy" yazmak öneriyi düşürmüyor. */
  assert.ok(pozisyonAra('Tekstil Tasarım Stajyeri').includes('Tekstil Tasarım Stajyeri'));
  assert.ok(pozisyonAra('grafik stajy').includes('Grafik Tasarım Stajyeri'));
});

test('boş ve genel aramada öneri yok; en fazla sekiz öneri', () => {
  assert.deepEqual(pozisyonAra(''), []);
  assert.deepEqual(pozisyonAra('   '), []);
  assert.deepEqual(pozisyonAra('staj'), [], '"Stajyeri" bütün listeyi getirmemeli');
  assert.ok(pozisyonAra('s').length <= 8);
});

test('liste kaynaklı: hedef pozisyonlar + yayındaki ilan başlıkları + iki genel başlık; tekrar yok', () => {
  assert.equal(HEDEF_POZISYONLAR.length, 30);
  assert.deepEqual(EK_POZISYONLAR, ['Tasarım Stajyeri', 'Tekstil Tasarım Stajyeri']);
  for (const p of [...HEDEF_POZISYONLAR, ...EK_POZISYONLAR, ...ILAN_BASLIKLARI]) assert.ok(POZISYONLAR.includes(p) || POZISYONLAR.some((x) => katla(x) === katla(p)));
  assert.equal(new Set(POZISYONLAR.map(katla)).size, POZISYONLAR.length);
  /* Öğrenci profili aynı listeyi kullanıyor; ikinci kopya yok. */
  /* 6 Ekim 2026: hedef pozisyonlar düzenleme ekranında (ProfilDuzenleme). */
  const PROFIL = oku('src/components/ProfilDuzenleme.tsx');
  assert.match(PROFIL, /import \{ HEDEF_POZISYONLAR \} from '\.\.\/lib\/pozisyonlar\.mjs';/);
  assert.doesNotMatch(PROFIL, /const HEDEF_POZISYONLAR = \[/);
});

/* ---------------------------------------------------------- alanlar */

test('pozisyon alanı: tekstil, yazılım, serbest yazı; tanınmayana şablon yok', () => {
  assert.equal(pozisyonAlani('Tekstil Tasarım Stajyeri')?.id, 'tekstil');
  assert.equal(pozisyonAlani('Moda Tasarım Asistanı')?.id, 'tekstil');
  assert.equal(pozisyonAlani('Yazılım Geliştirme Stajyeri')?.id, 'yazilim');
  assert.equal(pozisyonAlani('Frontend Developer Stajyeri')?.id, 'yazilim');
  assert.equal(pozisyonAlani('IT Stajyeri')?.id, 'yazilim');
  assert.equal(pozisyonAlani('Tasarım Stajyeri')?.id, 'tasarim');
  assert.equal(pozisyonAlani('İnsan Kaynakları Stajyeri')?.id, 'ik');
  for (const u of ['', 'Hukuk Stajyeri', 'Kurucu Asistanı Stajyeri', 'Mimarlık Stajyeri', 'İklimlendirme Stajyeri', 'Entegre Devre Tasarım Mühendisliği Stajyeri']) {
    assert.equal(pozisyonAlani(u), null, `${u || '(boş)'} tanınmamalı`);
  }
});

test('tekstil pozisyonuna yazılım şablonu önerilmiyor; tasarım, kumaş ve koleksiyon var', () => {
  const alan = pozisyonAlani('Tekstil Tasarım Stajyeri');
  const metin = alan.sablonlar.map((s) => katla(s.metin)).join('\n');
  assert.match(metin, /koleksiyon/);
  assert.match(metin, /kumas/);
  assert.match(metin, /tasarim/);
  assert.doesNotMatch(metin, /yazilim|programlama|kodlama/);
});

test('her alan 2–3 şablon; her şablon 200–2000 karakter, madde madde', () => {
  for (const alan of IS_TANIMI_ALANLARI) {
    assert.ok(alan.sablonlar.length >= 2 && alan.sablonlar.length <= 3, `${alan.id}: 2–3 şablon`);
    for (const s of alan.sablonlar) {
      assert.ok(s.metin.length >= ACIKLAMA_EN_AZ && s.metin.length <= ACIKLAMA_EN_FAZLA, `${s.id} uzunluk`);
      assert.match(s.metin, /\n- /, `${s.id} maddeli olmalı`);
      assert.match(s.metin, /Aradığımız nitelikler:/);
    }
  }
  const idler = IS_TANIMI_ALANLARI.flatMap((a) => a.sablonlar.map((s) => s.id));
  assert.equal(new Set(idler).size, idler.length);
});

test('şablonlarda doğrulanmamış vaat yok: ücret, sigorta, yan hak, çalışma düzeni, eğitim/mentor sözü', () => {
  const YASAK = /ücret|maaş|sigorta|yemek|servis|prim\b|yan hak|esnek|uzaktan|hibrit|mentor|garanti|teklif edilecek|iş teklifi|kadro|sertifika|burs|geri bildirim alacak|tarafımızdan|eşlik edecek|yönlendirecek|yoğun tempo/i;
  for (const alan of IS_TANIMI_ALANLARI) {
    for (const s of alan.sablonlar) assert.doesNotMatch(s.metin, YASAK, s.id);
  }
});

/* -------------------------------------------------------------- form */

test('Pozisyon alanı öneri listeli, klavye düzeninde; seçim yalnız unvanı yazıyor', () => {
  assert.match(
    FORM,
    /<AutocompleteField\s+id=\{`\$\{k\}-unvan`\}\s+value=\{deger\.unvan\}\s+onChange=\{yaz\('unvan'\)\}\s+options=\{POZISYONLAR\}\s+eslestir=\{pozisyonAra\}/,
  );
  /* Bileşen: özel eşleştirme ve klavye düzeninde dokunuşta seçim yok (kaydırma yanlış seçim yaptırmasın). */
  assert.match(OTO, /if \(eslestir\) return eslestir\(value, options, maxSuggestions\);/);
  assert.match(OTO, /\{\.\.\.\(klavyeDuzeni\s+\? \{\}\s+: \{\s+onTouchStart:/);
  assert.match(OTO, /e\.key === 'Escape'/);
});

test('eski genel şablonlar kalktı; şablonlar pozisyonun alanından', () => {
  assert.doesNotMatch(FORM, /SABLONLAR/);
  assert.doesNotMatch(oku('src/lib/ilan-formu.mjs'), /export const SABLONLAR/);
  assert.match(FORM, /const alan = pozisyonAlani\(deger\.unvan\);/);
  assert.match(FORM, /alan\.sablonlar\.map\(\(s\) =>/);
  assert.match(FORM, /Bu pozisyon için hazır başlangıç metni yok/);
});

test('yazılmış metin korunuyor: pozisyon değişince dokunulmuyor, dolu metin için önce soruluyor', () => {
  /* İş tanımına yazan yerler: kullanıcının kendisi, boş/aynı metinde şablon, onaydan sonra şablon. */
  const yazanlar = FORM.match(/yaz\('aciklama'\)\([^)]*\)/g) ?? [];
  assert.deepEqual(yazanlar.sort(), ["yaz('aciklama')(onayBekleyen.metin)", "yaz('aciklama')(s.metin)"].sort());
  assert.match(FORM, /if \(mevcut === '' \|\| mevcut === s\.metin\.trim\(\)\) \{/);
  assert.match(FORM, /setOnayBekleyen\(s\);/);
  assert.match(FORM, /metni, iş tanımındaki mevcut metnin yerine geçecek\. Yazdıklarınız\s+silinir\./);
  assert.match(FORM, /Mevcut metni koru/);
  /* Pozisyon değişince yalnız bekleyen soru düşüyor. */
  assert.match(FORM, /React\.useEffect\(\(\) => \{\s*setOnayBekleyen\(null\);\s*\}, \[alanId\]\);/);
});
