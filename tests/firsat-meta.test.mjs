import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { firsatAramaBasligi, firsatAramaAciklamasi, turkceTarih } from '../src/lib/seo/firsat-meta.mjs';

/* FIRSAT ARAMA BAŞLIĞI VE AÇIKLAMASI (28 Kasım 2026) */
const KOK = path.resolve(import.meta.dirname, '..');

test('başlık 60 karakteri (" | StajımVar" dahil) aşmıyor; sığan en uzun ek seçiliyor', () => {
  assert.equal(firsatAramaBasligi('BTSO Yükseköğrenim Bursu'), 'BTSO Yükseköğrenim Bursu — Başvuru ve Şartlar');
  assert.equal(firsatAramaBasligi('Erciyes Organ Nakli Vakfı Bursu'), 'Erciyes Organ Nakli Vakfı Bursu — Başvuru');
  const uzun = 'Mustafa Öncel Vakfı Öğrenci Destek Bursu Başvuru Programı';
  assert.equal(firsatAramaBasligi(uzun), uzun);
  for (const t of ['BTSO Yükseköğrenim Bursu', 'Erciyes Organ Nakli Vakfı Bursu', uzun]) {
    const b = firsatAramaBasligi(t);
    assert.ok((b + ' | StajımVar').length <= 60 || b === t, b);
  }
});

test('açıklama: tarih kayıtta varsa başa; yoksa değişmiyor; açık olduğu iddia edilmiyor', () => {
  assert.equal(turkceTarih('2027-01-15'), '15 Ocak 2027');
  assert.equal(firsatAramaAciklamasi({ sonTarih: '2027-01-15', suresiGecti: false, kisa: 'Lisans öğrencilerine.' }), 'Son başvuru: 15 Ocak 2027. Lisans öğrencilerine.');
  assert.equal(firsatAramaAciklamasi({ sonTarih: '2026-10-01T00:00:00Z', suresiGecti: true, kisa: 'X.' }), 'Başvuru dönemi kapandı (son başvuru 1 Ekim 2026). X.');
  assert.equal(firsatAramaAciklamasi({ sonTarih: null, suresiGecti: false, kisa: 'X.' }), 'X.');
  assert.doesNotMatch(firsatAramaAciklamasi({ sonTarih: '2027-01-15', suresiGecti: false, kisa: '' }), /açık/i);
});

test('ön render ve tarayıcı aynı kuralı kullanıyor', () => {
  const on = readFileSync(path.join(KOK, 'scripts/onrender.mjs'), 'utf8');
  assert.match(on, /baslik: `\$\{firsatAramaBasligi\(firsatBasligi\(f\)\)\} \| StajımVar`/);
  assert.match(on, /firsatAramaAciklamasi\(\{ sonTarih: f\.application_deadline, suresiGecti, kisa: f\.short_description \}\)/);
  const sayfa = readFileSync(path.join(KOK, 'src/components/OpportunityDetailPage.tsx'), 'utf8');
  assert.match(sayfa, /baslik: `\$\{firsatAramaBasligi\(temel\)\} \| StajımVar`/);
  assert.match(sayfa, /aciklama: firsatAramaAciklamasi\(\{/);
});
