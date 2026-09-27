import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  ŞİRKET PROFİLİ DÜZENLEME FORMU — KOMPAKT VE HIZLI (27 Eylül 2026)

  /sirket/profil/duzenle: tek form kartı, isteğe bağlı alanlar açıkça
  işaretli, Sektör ve Konum öneri listeli (Türkçe karakterden bağımsız),
  logo adresi katlı, "hakkında" yazdıkça uzuyor. Kaydetme, önizleme ve
  doğrulama davranışı aynı. Tarayıcı ölçümü yerel Supabase'de şirket
  hesabıyla yapıldı; burada kaynak kararları bağlanıyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const FORM = oku('src/sirket/SirketProfilFormu.tsx');
const OTO = oku('src/components/AutocompleteField.tsx');

test('sektör gerçek listeden (sectors), konum 81 ilden; ikisi de öneri listeli ve serbest', () => {
  assert.match(FORM, /import \{ sektorleriGetir \} from '\.\.\/lib\/queries\/sosyal';/);
  assert.match(FORM, /import \{ TR_CITIES \} from '\.\.\/data\/turkeyData';/);
  assert.match(FORM, /setSektorler\(liste\.map\(\(x\) => x\.ad\)\)/);
  assert.match(FORM, /<AutocompleteField\s+id=\{`\$\{kimlik\}-sektor`\}\s+value=\{deger\.industry\}\s+onChange=\{yaz\('industry'\)\}\s+options=\{sektorler\}/);
  assert.match(FORM, /<AutocompleteField\s+id=\{`\$\{kimlik\}-konum`\}\s+value=\{deger\.location\}\s+onChange=\{yaz\('location'\)\}\s+options=\{TR_CITIES\}/);
  /* Liste kapalı değil: bileşen yazılan değeri olduğu gibi iletiyor. */
  assert.match(OTO, /onChange=\{\(e\) => \{\s*onChange\(e\.target\.value\);/);
  /* Türkçe katlama: ist → İstanbul, yaz → Yazılım. */
  assert.match(OTO, /ı: 'i', İ: 'i', I: 'i', ğ: 'g'/);
});

test('öneri listesinin klavye düzeni yalnız şirket formunda açık; CV kullanımı aynı', () => {
  assert.equal((FORM.match(/klavyeDuzeni/g) ?? []).length, 2);
  assert.match(OTO, /klavyeDuzeni = false,/);
  assert.match(OTO, /klavyeDuzeni \? \{ id: `\$\{listeKimligi\}-\$\{i\}`, tabIndex: -1 \} : \{\}/);
  assert.match(OTO, /onBlur: \(\) => setAcik\(false\),/);
  for (const dosya of ['src/components/CvOlusturucu.tsx', 'src/components/StudentProfileView.tsx']) {
    assert.doesNotMatch(oku(dosya), /klavyeDuzeni/, `${dosya} değişmemeli`);
  }
});

test('logo yükleme görünür; adres alanı katlı ve kayıtlı değeri koruyor', () => {
  assert.match(FORM, /\{yukleniyor \? 'Yükleniyor…' : deger \? 'Değiştir' : 'Logo yükle'\}/);
  assert.match(FORM, /const \[adresAcik, setAdresAcik\] = React\.useState\(false\);/);
  assert.match(FORM, /aria-expanded=\{adresAcik\}[\s\S]{0,500}Logo bağlantısı kullan/);
  /* Alan yalnız açıkken çiziliyor; değer formun durumunda (deger.logoUrl) kalıyor. */
  assert.match(FORM, /\{adresAcik && \(\s*<div id=\{`\$\{kimlik\}-adres`\}>[\s\S]{0,400}value=\{deger\}/);
  assert.match(FORM, /onDegis=\{yaz\('logoUrl'\)\}/);
});

test('isteğe bağlı alanlar açık, hakkında kısa başlıyor ve uzuyor, kayıtlı çalışan sayısı kaybolmuyor', () => {
  assert.match(FORM, /Tüm alanlar isteğe bağlı ·/);
  assert.match(FORM, /isteğe bağlı\n\s*<\/span>/);
  assert.match(FORM, /rows=\{3\}/);
  assert.match(FORM, /el\.style\.height = `\$\{el\.scrollHeight \+ 2\}px`;/);
  assert.doesNotMatch(FORM, /rows=\{5\}/);
  assert.match(FORM, /\{deger\.size && !BOYUTLAR\.includes\(deger\.size\) && <option value=\{deger\.size\}>/);
  /* Telefonda 16 px (iOS odakta yakınlaştırmasın), sm üstünde 14 px. */
  assert.match(FORM, /text-base text-gray-900 outline-none ' \+\s*'placeholder:text-gray-500 focus:outline-2 focus:outline-blue-600 sm:text-sm'/);
});

test('kaydetme, eksik sayacı, önizleme ve doğrulama korunuyor', () => {
  assert.match(FORM, /await sirketProfiliKaydet\(baglam\.companyId, deger\);/);
  assert.match(FORM, /const eksikler = PROFIL_ALANLARI\.filter/);
  assert.match(FORM, /\$\{eksikler\.length\} alan boş/);
  assert.match(FORM, /<OgrenciOnizleme baglam=\{baglam\} deger=\{deger\} eksikler=\{eksikler\} \/>/);
  assert.match(FORM, /<Dogrulama baglam=\{baglam\} onKaydedildi=\{onKaydedildi\} \/>/);
  /* Masaüstünde kaydet formun dibinde, telefonda değişiklik varken sabit çubuk. */
  assert.match(FORM, /onKaydet=\{\(\) => void kaydet\(\)\}\s*kartsiz/);
  assert.match(FORM, /\{degisti && \(\s*<div/);
  /* Geniş ekranda form yataya yayılıyor: kalan genişlik + 340 px önizleme, xl'de iki panel. */
  assert.match(FORM, /lg:grid-cols-\[minmax\(0,1fr\)_340px\]/);
  assert.match(FORM, /xl:grid xl:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1\.4fr\)\]/);
});
