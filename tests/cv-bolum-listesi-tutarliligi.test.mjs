import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { blok, liste, sadelestir, katalogAdlari, rehberAdlari } from '../scripts/cv-bolum-listesi.mjs';

/*
  CV'DEKİ LİSTE İLE EŞLEŞTİRMENİN KATALOĞU AYNI OLMALI

  Ölçüldü (19 Eylül 2026): sitede İKİ AYRI bölüm kataloğu vardı —
  CV'deki tamamlayıcı 323 kalemlik statik liste, alan türetmesi ise
  42 kalemlik `departments` tablosu. Öğrenci birinden seçiyor, sunucu
  ötekinde arıyordu. Canlıdaki sonucu: yayındaki 21 profilin 16'sında
  alan yok, alansız kullanıcı bağlantı da kuramıyor.

  Bu test ayrışmayı sessiz bırakmıyor: katalog büyür de liste
  güncellenmezse düşüyor ve `node scripts/cv-bolum-listesi.mjs --yaz`
  çalıştırılması gerektiğini söylüyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const ts = readFileSync(path.join(KOK, 'src/data/turkeyData.ts'), 'utf8');

test('dosyadaki liste üreteçle birebir aynı', () => {
  const bas = ts.indexOf('export const TR_DEPARTMENTS');
  const son = ts.indexOf('];', bas) + 2;
  assert.ok(bas > 0, 'TR_DEPARTMENTS bulunamadı');
  assert.equal(
    ts.slice(bas, son),
    blok(),
    'liste güncel değil — `node scripts/cv-bolum-listesi.mjs --yaz` çalıştır',
  );
});

test('listedeki her bölüm bir kaynakta karşılığı olan bir ad', () => {
  /*
    Asıl güvence bu: CV'den seçilen ad `bolumu_esle` tarafından
    bulunamıyorsa kullanıcı yine alansız kalır ve hiçbir şey düzelmiş
    olmaz. İki meşru kaynak var — YÖK kataloğu ve rehber sayfası olan
    bölümler; ikisi de `departments` tablosunda satır taşıyor.
  */
  const bilinen = new Set([...katalogAdlari(), ...rehberAdlari()].map(sadelestir));
  const kayip = liste().filter((ad) => !bilinen.has(sadelestir(ad)));
  assert.deepEqual(kayip, [], 'listede olup hiçbir kaynakta olmayan bölüm var');
});

test('liste tekrarsız', () => {
  /* Aynı ad iki kez çıkarsa tamamlayıcıda çift satır görünür. */
  const normal = liste().map(sadelestir);
  assert.equal(new Set(normal).size, normal.length);
});

test('düzey eki yalnız katalogda karşılığı olmayan adda kalıyor', () => {
  /*
    "(MYO)" eki ölçülen eşleşme kusurunun kendisiydi: kullanıcı
    "Bilgisayar Programcılığı" yazmış, kayıttaki ek yüzünden tutmamıştı.
    Kataloğun eksiz karşılığı varsa ekli ad listeye GİRMEMELİ.

    Rehber sayfası olup katalogda hiç karşılığı olmayan ad ise ekiyle
    kalıyor: onu listeden atmak, sayfası olan bir bölümü seçilemez
    yapardı. Bugün bu durumda olan tek ad var; sayısı artarsa test
    düşer ve kararın gözden geçirilmesi gerekir.
  */
  const katalog = new Set(katalogAdlari().map(sadelestir));
  const eksiz = (ad) => sadelestir(String(ad).replace(/\s*\([^)]*\)\s*$/, ''));
  const ekli = liste().filter((ad) => sadelestir(ad) !== eksiz(ad));
  const gereksiz = ekli.filter((ad) => katalog.has(eksiz(ad)));
  assert.deepEqual(gereksiz, [], 'katalogda eksiz karşılığı olan ekli ad listede');
  assert.equal(ekli.length, 1, `beklenmeyen sayıda ekli ad: ${ekli.join(', ')}`);
});
