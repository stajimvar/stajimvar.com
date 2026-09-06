import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/*
  GÜNCELLEME TARİHİ UYDURULMUYOR

  `rehber-govde.tsx` kendi tarihi olmayan her rehbere sabit bir tarih
  yazıyordu (`t.guncelleme ?? '2026-08-25'`). Tarih üç yerde görünüyor:
  kartta, rehber sayfasında ve JSON-LD'nin `dateModified` alanında —
  yani sabit, arama motoruna bir gerçek gibi bildiriliyordu.

  Ölçüldü: yayındaki 71 sayfanın 15'inde sabit git geçmişiyle
  tutmuyordu. Kalan 56'sında doğru çıkması tesadüftü; her yeni
  düzenlemede biri daha sessizce yanlışlaşacaktı.

  Tarihler artık `scripts/rehber-tarihleri.mjs` ile git geçmişinden
  türetilip kaynağa yazılıyor. Bu testler sabitin geri gelmesini ve
  tarihsiz/absürt tarihli rehber kalmasını engelliyor.

  NEDEN GIT'E BAKMIYOR
  --------------------
  CI sığ klonla (depth 1) çalışıyor; `git log` orada boş dönüyor.
  Test bu yüzden KAYNAĞA bakıyor: tarihin var, biçimli ve makul
  olduğunu doğruluyor. Git ile eşleşmeyi betiğin kendisi kuruyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

function rehberKaynaklari() {
  const klasor = path.join(KOK, 'src/data/rehber-yazilari');
  return [
    'src/data/rehberler.tsx',
    ...readdirSync(klasor)
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => `src/data/rehber-yazilari/${f}`),
  ];
}

function rehberler() {
  const cikti = [];
  for (const yol of rehberKaynaklari()) {
    const s = oku(yol);
    const yerler = [...s.matchAll(/slug: '([^']+)'/g)];
    yerler.forEach((m, i) => {
      const son = i + 1 < yerler.length ? yerler[i + 1].index : s.length;
      cikti.push({ slug: m[1], yol, govde: s.slice(m.index, son) });
    });
  }
  return cikti;
}

test('sabit tarih varsayılanı geri gelmedi', () => {
  const govde = oku('src/data/rehber-govde.tsx');
  assert.doesNotMatch(
    govde,
    /guncelleme:\s*t\.guncelleme\s*\?\?/,
    'tarihi olmayan rehbere sabit yazılmamalı'
  );
  assert.match(govde, /guncelleme: t\.guncelleme,/);
});

test('her rehberin kendi güncelleme tarihi var', () => {
  const eksik = rehberler().filter((r) => !/guncelleme: '/.test(r.govde));
  assert.deepEqual(
    eksik.map((r) => r.slug),
    [],
    'tarihsiz rehber kaldı; scripts/rehber-tarihleri.mjs --yaz çalıştır'
  );
});

test('tarihler ISO biçiminde ve gelecekte değil', () => {
  const bugun = new Date();
  for (const r of rehberler()) {
    const m = /guncelleme: '([^']+)'/.exec(r.govde);
    assert.ok(m, `${r.slug}: tarih yok`);
    assert.match(m[1], /^\d{4}-\d{2}-\d{2}$/, `${r.slug}: ISO biçiminde değil`);
    const t = new Date(m[1]);
    assert.ok(!Number.isNaN(t.getTime()), `${r.slug}: geçersiz tarih`);
    /*
      Bir günlük pay: derleme makinesinin saat dilimi ile commit tarihi
      arasındaki fark yüzünden sınırda kalan bir tarih testi kırmasın.
    */
    assert.ok(
      t.getTime() <= bugun.getTime() + 24 * 3600 * 1000,
      `${r.slug}: tarih gelecekte (${m[1]})`
    );
  }
});

test('tek bir tarihte yığılma yok — sabit dönmüş olmaz', () => {
  /*
    Sabit geri gelirse bütün rehberler aynı güne düşer. Yazılar gerçekten
    aynı gün yazıldığı için tek bir tarihte yoğunlaşma normal; ama
    tamamının aynı olması sabit demektir.
  */
  const tarihler = rehberler().map((r) => /guncelleme: '([^']+)'/.exec(r.govde)[1]);
  const benzersiz = new Set(tarihler);
  assert.ok(benzersiz.size > 1, `bütün rehberler aynı tarihte: ${[...benzersiz][0]}`);
});

test('ön render tarihsiz rehbere dateModified yazmıyor', () => {
  const onrender = oku('scripts/onrender.mjs');
  /* Koşullu yayılım: alan yalnızca değer varken ekleniyor. */
  assert.match(onrender, /\.\.\.\(r\.guncelleme \? \{ dateModified: r\.guncelleme \} : \{\}\)/);
});

/* ------------------------------------------- kaynak ya da dayanak, sessizlik yok */

test('her rehberde ya resmî kaynak ya da dayanak açıklaması var', () => {
  /*
    Rehberlerin 20'sinde resmî kaynak yok ve olması da gerekmiyor: "ATS
    uyumlu CV nasıl hazırlanır" bir mevzuata dayanmıyor. Sorun kaynağın
    yokluğu değil, SESSİZ olmasıydı — bölüm hiç çizilmediği için okuyucu
    kaynağın unutulduğunu mu yoksa hiç olmadığını mı bilemiyordu.
  */
  const eksik = [];
  const ikisiBirden = [];
  for (const r of rehberler()) {
    const kaynak = /adres: 'https?:/.test(r.govde);
    const dayanak = /dayanak:/.test(r.govde);
    if (!kaynak && !dayanak) eksik.push(r.slug);
    /* Resmî kaynağı olan rehberde "dayanak yok" cümlesi çelişki olurdu. */
    if (kaynak && dayanak) ikisiBirden.push(r.slug);
  }
  assert.deepEqual(eksik, [], 'kaynağı da dayanağı da olmayan rehber');
  assert.deepEqual(ikisiBirden, [], 'hem kaynak hem dayanak taşıyan rehber');
});

test('dayanak cümlesi kural iddia etmiyor', () => {
  for (const r of rehberler()) {
    const m = /dayanak:\s*\n?\s*'((?:[^'\\]|\\.)*)'/.exec(r.govde);
    if (!m) continue;
    const cumle = m[1];
    assert.match(cumle, /mevzuat|resmî kaynak/i, `${r.slug}: dayanak neyin yokluğunu söylemiyor`);
    assert.doesNotMatch(cumle, /zorunludur|kesinlikle|her üniversitede/i, `${r.slug}: kural iddiası`);
  }
});
