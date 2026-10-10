import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  KİŞİSEL BİLGİLERİN KAYDI GERÇEKTEN İŞLEYİCİYE GİDİYOR MU?

  Ölçülen kusur şuydu: adı boş olan hesapta (kayıt sırasında ad
  sorulmuyor) "Kaydet"e basınca hiçbir şey olmuyordu. Sebep React değildi
  — ad alanı `required` olduğu için tarayıcı doğrulaması formu
  gönderilmeden durduruyordu; işleyicideki şehir kontrolü de hiç
  çalışamıyor, kullanıcı "Listeden bir il seç" uyarısını göremiyordu.

  11 Ekim 2026: kişisel bilgiler artık kendi formuyla değil, ekranın
  altındaki TEK "Tüm değişiklikleri kaydet" ile kaydediliyor. Aynı güvence
  yeni yapıda: alanlarda tarayıcı doğrulaması yok, karar tek yerde
  (`taslaktanYama`), hata metni alanın altında çiziliyor ve kayıt düğmesi
  bir form gönderimine bağlı değil (doğrudan işleyiciyi çağırıyor).

  Kuralın davranışı tests/profil-taslagi.test.mjs'de gerçek verilerle
  sınanıyor; burada kaynağın yapısı.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const KISISEL = oku('src/components/profil/KisiselBilgiler.tsx');
const DUZENLEME = oku('src/components/ProfilDuzenleme.tsx');
const TASLAK = oku('src/lib/profil-taslagi.mjs');

test('ad ve şehir alanları kişisel bilgilerde; hata metni alanın altında', () => {
  assert.match(KISISEL, /<Alan id="ad" etiket="Ad" hata=\{hata\('ad'\)\}>/);
  assert.match(KISISEL, /<Alan id="sehir" etiket="Şehir" hata=\{hata\('sehir'\)\}>/);
  assert.match(KISISEL, /<AutocompleteField\s+id="sehir"/);
});

test('tarayıcı doğrulaması kaydı ele geçirmiyor: alanlarda required yok, form yok', () => {
  assert.doesNotMatch(KISISEL, /\srequired\b/);
  assert.doesNotMatch(KISISEL, /<form\b/);
  /* Kaydet düğmesi form gönderimi değil, işleyicinin kendisi. */
  assert.match(DUZENLEME, /type="button"\s+onClick=\{\(\) => void kaydetHepsi\(\)\}/);
});

test('karar tek yerde: ad boşsa ve şehir listede değilse anlaşılır mesaj', () => {
  const kisisel = TASLAK.slice(TASLAK.indexOf("if (degisti('kisisel'))"), TASLAK.indexOf("if (degisti('baglanti'))"));
  assert.match(kisisel, /if \(!ad\) hata\('kisisel', 'ad', 'Adını yaz: profilinde ve CV’nde bu ad görünüyor\.'\);/);
  assert.match(kisisel, /if \(sehir && secenekler\.sehirler && !secenekler\.sehirler\.includes\(sehir\)\) \{/);
  assert.match(kisisel, /Listeden bir il seç\./);
  /* Ekran şehir listesini veriyor; hata varsa kayıt yapılmıyor ve alana gidiliyor. */
  assert.match(DUZENLEME, /sehirler: TR_CITIES/);
  assert.match(DUZENLEME, /if \(bulunan\.length > 0\) \{\s*setDurum\('bos'\);\s*yereGit\(bulunan\[0\]\.bolum, bulunan\[0\]\.alan\);\s*return false;/);
});
