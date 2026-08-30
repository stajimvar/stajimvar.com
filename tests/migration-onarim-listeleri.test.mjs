import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

/*
  Onarım listeleri elle yazılıyor ve yanlışları SESSİZ.

  30 Ağustos'ta tam bu oldu: düşülecek sürümler listesine, aynı numarayı
  taşıyan bir depo dosyası olan beş sürüm de girmişti. Sonuç, "uygulandı"
  diye eklenen satırın hemen ardından silinmesi ve kapının "eksik
  migration" diyerek durması oldu — hata, üretimde bir tur harcadıktan
  sonra görüldü.

  Bu testler o turu ucuzlatıyor.
*/

const oku = (yol) =>
  readFileSync(yol, 'utf8')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#'))
    .map((s) => s.split(/\s+/)[0]);

const yerelSurumler = readdirSync('supabase/migrations')
  .filter((f) => f.endsWith('.sql'))
  .map((f) => f.split('_')[0]);

const uygulanan = oku('scripts/sql/elle-uygulananlar.txt');
const dusulen = oku('scripts/sql/gecmisten-dusulenler.txt');

test('AYNI SÜRÜM HEM UYGULANAN HEM DÜŞÜLEN OLAMAZ', () => {
  const kesisim = uygulanan.filter((s) => dusulen.includes(s));
  assert.deepEqual(kesisim, [], `çelişen sürüm: ${kesisim.join(', ')}`);
});

test('DÜŞÜLEN SÜRÜMÜN DEPODA DOSYASI OLMAMALI', () => {
  /*
    Bir depo dosyasının sürümünü defterden düşmek, izlenen kümenin
    kendi üyesini silmek demek: kapı onu bir sonraki turda "eksik"
    görür ve db push kilitlenir.
  */
  const hatali = dusulen.filter((s) => yerelSurumler.includes(s));
  assert.deepEqual(hatali, [], `depoda dosyası olan sürüm düşülüyor: ${hatali.join(', ')}`);
});

test('uygulandı listesindeki her sürümün deposunda dosyası var', () => {
  const hayalet = uygulanan.filter((s) => !yerelSurumler.includes(s));
  assert.deepEqual(hayalet, [], `karşılığı olmayan sürüm: ${hayalet.join(', ')}`);
});

test('listelerde tekrar yok', () => {
  for (const [ad, liste] of [['uygulanan', uygulanan], ['düşülen', dusulen]]) {
    assert.equal(new Set(liste).size, liste.length, `${ad} listesinde tekrar var`);
  }
});

test('YENİ GÖÇLER UYGULANDI LİSTESİNE YAZILMAZ', () => {
  /*
    Yeni bir göç `db push` ile uygulanmalı. "Uygulandı" işaretlemek onu
    hiç çalıştırmadan uygulanmış saymak, yani değişikliği sessizce
    kaybetmek olur. Listedeki en yeni sürüm, depodaki en yeni sürümden
    eski olmalı.
  */
  const enYeniListe = [...uygulanan].sort().at(-1);
  const enYeniDepo = [...yerelSurumler].sort().at(-1);
  assert.ok(
    enYeniListe < enYeniDepo,
    `uygulandı listesi depodaki en yeni göçe kadar gelmiş (${enYeniListe} / ${enYeniDepo}); yeni göçler db push ile uygulanmalı`
  );
});
