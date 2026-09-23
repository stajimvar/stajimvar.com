import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  ARAMA SONUCUNDA MARKA (23 Eylül 2026)

  Ölçüldü (Google, "stajımvar"): sorgu "stajım var" diye düzeltiliyor,
  sonuç başlığı sayfanın kendi başlığı yerine "Staj İlanları" çıkıyor ve
  site simgesi bulanık. Marka, arama motoru için henüz tek bir varlık
  değil.

  Burada tutulan üç şey: markanın yazım varyantları yapısal veride
  bağlanıyor, arama kutusu iddiası GERÇEK bir adrese dayanıyor ve simge
  Google'ın istediği ölçüde.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

const ONRENDER = oku('scripts/onrender.mjs');
const HTML = oku('index.html');
const APP = oku('src/App.tsx');

test('marka yazim varyantlari tek varliga bagli', () => {
  /* "stajimvar" ve "Stajım Var" aynı kurum; Google bunu kendi çıkaramıyor. */
  assert.match(ONRENDER, /alternateName: \['Stajım Var', 'stajimvar', 'StajimVar'\]/);
  assert.match(ONRENDER, /'@id': `\$\{SITE\}\/#kurum`/);
  assert.match(ONRENDER, /publisher: \{ '@id': `\$\{SITE\}\/#kurum` \}/);
});

test('logo olcusuyle veriliyor', () => {
  /* Google logo için en az 112 piksel istiyor; asıl ikon 512. */
  assert.match(ONRENDER, /logo: \{\s*'@type': 'ImageObject',\s*url: `\$\{SITE\}\/icon-512\.png`,\s*width: 512/);
  assert.ok(fs.existsSync(path.join(KOK, 'public', 'icon-512.png')));
});

test('arama kutusu iddiasi gercek adrese dayaniyor', () => {
  /*
    Yapısal veride ilan edilen arama adresi çalışmıyorsa Google'a
    tutulmayacak bir söz verilmiş olur. `?q=` gerçekten okunuyor.
  */
  assert.match(ONRENDER, /urlTemplate: `\$\{SITE\}\/\?q=\{search_term_string\}`/);
  assert.match(APP, /aramaTeriminiOku\(window\.location\.search\)/);
});

test('uydurma sosyal hesap eklenmemis', () => {
  /*
    `sameAs` markayı bir hesaba bağlar; yanlış hesap yanlış markaya
    bağlamak demek. Depoda yayımlanmış hesap adresi yok, o yüzden alan da
    yok — hesaplar verilince eklenecek.
  */
  const anaSayfa = ONRENDER.slice(ONRENDER.indexOf("sayfaYaz('/', {"));
  /* Alan olarak aranıyor; gerekçe yorumu kelimeyi zaten anıyor. */
  assert.ok(!/sameAs:/.test(anaSayfa.slice(0, 4000)));
});

test('simge 48in kati olcularde', () => {
  assert.match(HTML, /<link rel="icon" type="image\/png" sizes="48x48" href="\/favicon-48\.png" \/>/);
  assert.match(HTML, /<link rel="icon" type="image\/png" sizes="96x96" href="\/favicon-96\.png" \/>/);
  for (const [dosya, olcu] of [['favicon-48.png', 48], ['favicon-96.png', 96]]) {
    const yol = path.join(KOK, 'public', dosya);
    assert.ok(fs.existsSync(yol), `${dosya} yok`);
    /* PNG başlığından genişlik/yükseklik: 16-24. baytlar. */
    const bas = fs.readFileSync(yol).subarray(16, 24);
    assert.equal(bas.readUInt32BE(0), olcu, `${dosya} genişlik`);
    assert.equal(bas.readUInt32BE(4), olcu, `${dosya} yükseklik`);
  }
});

test('ana sayfa basligi markayla basliyor', () => {
  /* Google başlığı yine de yazabilir ama verdiğimiz sinyal marka olmalı. */
  assert.match(ONRENDER, /baslik: 'StajımVar — Şirketlerin staj ilanları, tek listede'/);
});
