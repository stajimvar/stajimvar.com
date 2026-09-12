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
const kaynak = readFileSync(
  path.join(KOK, 'src/components/StudentProfileView.tsx'),
  'utf8',
).replace(/\r\n/g, '\n');

/* Şehir alanını taşıyan form: sayfadaki üç formdan yalnız bu ölçülüyor. */
const formBasi = kaynak.indexOf('<form onSubmit={kisiselKaydet}');
const kisiselForm = kaynak.slice(formBasi, kaynak.indexOf('</form>', formBasi));

test('şehir alanı kişisel formun içinde ve form kisiselKaydet e bağlı', () => {
  assert.ok(formBasi > -1, 'kişisel form `onSubmit={kisiselKaydet}` ile bağlanmalı');
  assert.match(kisiselForm, /id="sehir"/);
  assert.match(kisiselForm, /id="ad-soyad"/);
});

test('gönderim düğmesi aynı formun içinde ve type="submit"', () => {
  const dugme = kisiselForm.slice(kisiselForm.indexOf('type="submit"'));
  assert.ok(kisiselForm.includes('type="submit"'), 'Kaydet düğmesi form dışında kalmamalı');
  assert.match(dugme, /Kaydet/);
});

test('tarayıcı doğrulaması formu ele geçirmiyor: karar kisiselKaydet te', () => {
  /*
    `noValidate` olmadan boş `required` alan submit olayını doğmadan
    öldürüyor; handler'ın ilk satırı bile çalışmıyordu.
  */
  assert.match(kaynak, /<form onSubmit=\{kisiselKaydet\} noValidate/);

  /* Zorunluluk artık handler'da ve uyarısı sayfada yazılı. */
  const handler = kaynak.slice(
    kaynak.indexOf('const kisiselKaydet'),
    kaynak.indexOf('/* ---- teknik yetenekler ---- */'),
  );
  assert.match(handler, /if \(!taslak\.fullName\.trim\(\)\) \{\n\s*setAdHatasi\(true\);\n\s*return;/);
  assert.match(handler, /setSehirHatasi\(true\);/);
  assert.match(kisiselForm, /Ad Soyad boş olamaz/);
  assert.match(kisiselForm, /Listeden bir il seç/);
});

test('iç içe form yok: submit olayı başka bir forma kaçamaz', () => {
  /* Açılış etiketinin kendisi dilimin başında: ondan sonrası aranıyor. */
  assert.equal(kisiselForm.slice('<form'.length).includes('<form'), false);
});
