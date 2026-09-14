import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'public', 'paylasim', 'setler.json');

test('staj sigortası seti doğrulanabilir kaynakla dört kart üretir', (t) => {
  /*
    BU TEST PAYLAŞILAN BİR DOSYAYI YAZIYOR

    Çağırdığı betik `public/paylasim/setler.json`a `staj-sigortasi`
    setini ekliyor. Manifest başka testlerin de okuduğu TRACKED bir
    dosya: `instagram-takvim-2026-09-22` orada tam 28 set bekliyor.

    Yan etki temizlenmediği için iki test birbirini bozuyordu — hangisi
    önce koşarsa öteki kırmızı olabiliyor ve koşudan sonra çalışma
    ağacında 29 setli bir dosya kalıyordu. (Ölçüldü: aynı iki test tek
    tek yeşil, birlikte kırmızı.)

    Yedek ÖNCE alınıyor ve `t.after` ile her durumda geri yazılıyor:
    test başarısız olsa bile dosya eski hâline dönüyor.
  */
  const yedek = fs.readFileSync(manifestPath, 'utf8');
  t.after(() => fs.writeFileSync(manifestPath, yedek));

  execFileSync(process.execPath, ['scripts/paylasim-staj-sigortasi.mjs'], {
    cwd: root,
    stdio: 'pipe',
  });

  const set = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).find((item) => item.kod === 'staj-sigortasi');
  assert.ok(set, 'staj-sigortasi seti manifestte yer almalı');
  assert.equal(set.ad, 'Staj sigortasını kim yapar?');
  assert.equal(set.kartlar.length, 4);
  assert.deepEqual(set.etiketler, [
    '#stajsigortasi',
    '#zorunlustaj',
    '#gonullustaj',
    '#stajbasvurusu',
    '#stajrehberi',
    '#universiteogrencisi',
    '#sgk',
    '#stajyer',
  ]);
  assert.match(set.metin, /zorunlu stajda.*okul/i);
  assert.match(set.metin, /gönüllü stajda.*yazılı/i);
  assert.match(set.metin, /stajimvar\.com\/rehber\/staj-sigortasi-kim-yapar/);

  for (const asset of set.kartlar) {
    assert.ok(fs.existsSync(path.join(root, 'public', asset)), `${asset} oluşturulmalı`);
  }
});
