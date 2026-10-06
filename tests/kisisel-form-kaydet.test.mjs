import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  KİŞİSEL FORMUN "KAYDET"İ GERÇEKTEN `kisiselKaydet`E BAĞLI MI?

  Ölçülen kusur şuydu: adı boş olan hesapta (kayıt sırasında ad
  sorulmuyor) "Kaydet"e basınca hiçbir şey olmuyordu. Sebep React değildi
  — `#ad-soyad` alanı `required` olduğu için tarayıcı doğrulaması formu
  gönderilmeden durduruyordu. Tarayıcıda ölçüldü: submit olayı 0 kez
  tetiklendi, odak `#ad-soyad`a kaçtı, `student_profiles`a tek istek
  gitmedi. Handler'ın İÇİNDEKİ şehir kontrolü de bu yüzden hiç
  çalışamıyor, kullanıcı "Listeden bir il seç" uyarısını göremiyordu.

  Bu dosya o zinciri kaynaktan bağlıyor: düğme bu formun içinde, form
  `kisiselKaydet`e bağlı ve tarayıcı doğrulaması formu ele geçirmiyor
  (`noValidate`) — zorunluluk kararı tek yerde, handler'da.

  Ölçülen şey kaynağın yapısı: bileşen Supabase oturumu olmadan
  çizilemediği için burada gerçek render çalıştırılmıyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
/*
  6 Ekim 2026: form "Profilini düzenle" ekranının "Temel bilgiler" bölümünde
  (ProfilDuzenleme). Aynı güvence: düğme formun içinde, form işleyiciye
  bağlı, tarayıcı doğrulaması formu ele geçirmiyor.
*/
const kaynak = readFileSync(
  path.join(KOK, 'src/components/ProfilDuzenleme.tsx'),
  'utf8',
).replace(/\r\n/g, '\n');

const bolumBasi = kaynak.indexOf('id="temel"');
const formBasi = kaynak.indexOf('<form', bolumBasi);
const kisiselForm = kaynak.slice(formBasi, kaynak.indexOf('</form>', formBasi));

test('şehir alanı temel bilgiler formunun içinde ve form temelKaydet e bağlı', () => {
  assert.ok(bolumBasi > -1 && formBasi > bolumBasi, 'Temel bilgiler bölümünde bir form olmalı');
  assert.match(kisiselForm, /void temelKaydet\(\);/);
  assert.match(kisiselForm, /id="sehir"/);
  assert.match(kisiselForm, /id="ad-soyad"/);
});

test('gönderim düğmesi aynı formun içinde ve type="submit"', () => {
  const dugme = kisiselForm.slice(kisiselForm.indexOf('type="submit"'));
  assert.ok(kisiselForm.includes('type="submit"'), 'Kaydet düğmesi form dışında kalmamalı');
  assert.match(dugme, /Kaydet/);
});

test('tarayıcı doğrulaması formu ele geçirmiyor: karar temelKaydet te', () => {
  assert.match(kisiselForm, /^<form\s+noValidate/);
  assert.doesNotMatch(kisiselForm, /\srequired\b/);
  const handler = kaynak.slice(kaynak.indexOf('const temelKaydet'), kaynak.indexOf('/* ============================== EĞİTİM'));
  assert.match(handler, /if \(!temel\.fullName\.trim\(\)\) \{/);
  assert.match(handler, /Adını yaz: profilinde ve CV’nde bu ad görünüyor\./);
  assert.match(handler, /if \(sehir && !TR_CITIES\.includes\(sehir\)\) \{/);
  assert.match(handler, /Listeden bir il seç\./);
  /* Hata metni formun içinde, alanın altında çiziliyor. */
  assert.match(kisiselForm, /\{temelHata\.mesaj\}/);
});

test('iç içe form yok: submit olayı başka bir forma kaçamaz', () => {
  assert.equal(kisiselForm.slice('<form'.length).includes('<form'), false);
});
