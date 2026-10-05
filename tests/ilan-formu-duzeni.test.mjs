import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  İLAN FORMU — PROFİL DÜZENLEMESİ GİBİ SIKI (27 Eylül 2026)

  Kullanıcı isteği: /sirket/ilan/yeni "profil düzenlemesi gibi
  kolaylaşsın, büyük boşluklar olmasın". Tek kart, başlık satırı, kısa
  alanlar iki sütun, xl'de iki panel (solda kısa alanlar, sağda iş
  tanımı), metin kutusu yazdıkça uzuyor, başvuru bilgisi ayrı kutu değil
  düğmelerin yanında. Doğrulama, kayıt ve yayın kuralları aynı.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const FORM = oku('src/sirket/IlanFormu.tsx');

test('profil formuyla aynı parçalar: alan boyu, uzayan metin, şehir önerisi', () => {
  assert.match(FORM, /import \{ FORM_ALAN, UzayanMetin \} from '\.\/form-parcalari';/);
  assert.doesNotMatch(FORM, /\bALAN\b(?!_)/, 'eski büyük alan sınıfı kalmamalı');
  assert.doesNotMatch(FORM, /rows=\{9\}/, 'dokuz satırlık sabit kutu kalmamalı');
  assert.match(FORM, /<UzayanMetin\s+id=\{`\$\{k\}-aciklama`\}[\s\S]{0,200}satir=\{8\}/);
  assert.match(
    FORM,
    /<AutocompleteField\s+id=\{`\$\{k\}-sehir`\}\s+value=\{deger\.sehir\}\s+onChange=\{yaz\('sehir'\)\}\s+options=\{TR_CITIES\}/,
  );
  assert.match(FORM, /klavyeDuzeni/);
});

test('tek kart, iki sütun, xl iki panel; boşluklar sıkı', () => {
  assert.match(FORM, /<section className=\{KUTU\} style=\{kutuStil\} aria-labelledby=\{`\$\{k\}-baslik`\}>/);
  assert.match(FORM, /İlan bilgileri/);
  assert.match(FORM, /Son başvuru dışında tüm alanlar zorunlu/);
  assert.match(FORM, /xl:grid xl:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)\] xl:gap-x-8/);
  assert.match(FORM, /mt-4 grid gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3/);
  assert.doesNotMatch(FORM, /space-y-5/, 'eski geniş dikey boşluk kalmamalı');
  assert.doesNotMatch(FORM, /sm:p-6/);
});

test('etiketler alanlara bağlı; seçim şeritleri adlı grup', () => {
  for (const alan of ['unvan', 'sehir', 'sure', 'son', 'aciklama']) {
    assert.match(FORM, new RegExp(`htmlFor=\\{\`\\$\\{k\\}-${alan}\`\\}`));
    assert.match(FORM, new RegExp(`id=\\{\`\\$\\{k\\}-${alan}\`\\}`));
  }
  assert.match(FORM, /role="group" aria-labelledby=\{etiketId\}/);
  assert.equal((FORM.match(/etiketId=\{`\$\{k\}-/g) ?? []).length, 3);
  /* Yalnız son başvuru isteğe bağlı. */
  assert.equal((FORM.match(/ istegeBagli>/g) ?? []).length, 1);
});

test('başvuru bilgisi düğmelerin yanında; doğrulama notu ve kurallar korunuyor', () => {
  const alt = FORM.slice(FORM.indexOf('GÖNDER KARTIN SON SATIRI'));
  /* -1 < n her zaman doğru olurdu: önce ikisinin de VAR olduğu ölçülüyor. */
  assert.ok(alt.indexOf('Yayına gönder') > -1, 'gönder düğmesi kartın son satırında olmalı');
  assert.ok(alt.indexOf('Başvurular StajımVar üzerinden gelir.') > -1);
  assert.ok(alt.indexOf('Yayına gönder') < alt.indexOf('Başvurular StajımVar üzerinden gelir.'));
  assert.ok(alt.indexOf('Taslak olarak kaydet') > -1, 'taslak eylemi de aynı satırda');
  assert.match(FORM, /\{!adayKimligiAcik && \(/);
  assert.match(FORM, /ilanSatiri\(deger, \{ companyId: '', durum: baslangicDurumu \}\)/);
  assert.match(FORM, /\{ACIKLAMA_EN_AZ\}–\{ACIKLAMA_EN_FAZLA\} karakter/);
  assert.match(FORM, /bayraklar\.length > 0 &&/);
  assert.match(FORM, /role="alert"/);
});
