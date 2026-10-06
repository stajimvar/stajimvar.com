import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
  BAŞVURANLAR — ADAY İNCELEME EKRANI VE PAYLAŞIM İZNİ (4 Ekim 2026)

  Kaynak metin kalıpları. Sunucu tarafı (izin kolonu, iki RPC, dar
  depolama izni) tests/basvuru-aday-incelemesi.test.mjs içinde; bu dosya
  arayüzün o kapılara dürüst bağlandığını bağlıyor:

    1. kart hangi ilana başvurulduğunu söylüyor; seçim başvuru kimliğiyle
    2. inceleme ekranı iki RPC'yi kullanıyor, geniş ve erişilebilir
    3. önyargısız kipte ad, fotoğraf ve paylaşımlar gizli
    4. paylaşım görselleri imzalı adresle değil, oturumdan indirmeyle
    5. öğrencinin izni AYRI, isteğe bağlı, varsayılanı kapalı
    6. Başvurularım'da geri alınabilir anahtar

  Yorum satırları düşürülerek okunuyor: yorumlar neyin NEDEN yapılmadığını
  da anlatıyor ("imzalı adres üretilmiyor") ve o cümleleri kod sanmak
  açıklamayı yasaklamak olurdu.
*/

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');
const YORUM_SATIRI = /^\s*(\*|\/\/|\{?\/\*)/;
const koddan = (metin) =>
  metin
    .split('\n')
    .filter((satir) => !YORUM_SATIRI.test(satir))
    .join('\n');

const kart = koddan(oku('src/sirket/AdayKarti.tsx'));
const izgara = koddan(oku('src/sirket/AdayIzgarasi.tsx'));
const cekmece = koddan(oku('src/sirket/AdayCekmecesi.tsx'));
const paylasim = koddan(oku('src/sirket/AdayPaylasimlari.tsx'));
const guncel = koddan(oku('src/sirket/AdayGuncelProfil.tsx'));
const panel = koddan(oku('src/sirket/SirketPaneli.tsx'));
const veri = koddan(oku('src/lib/sirket-veri.ts'));
const pencere = koddan(oku('src/components/ApplyDialog.tsx'));
const takip = koddan(oku('src/components/ApplicationsTrackerView.tsx'));
const app = koddan(oku('src/App.tsx'));

/** `bas` ile başlayan ilk bloğu, süslü parantezleri sayarak keser. */
function blok(metin, bas) {
  const i = metin.indexOf(bas);
  assert.ok(i >= 0, `bulunamadı: ${bas}`);
  const ac = metin.indexOf('{', i + bas.length - 1);
  let derinlik = 0;
  for (let j = ac; j < metin.length; j += 1) {
    if (metin[j] === '{') derinlik += 1;
    else if (metin[j] === '}') {
      derinlik -= 1;
      if (derinlik === 0) return metin.slice(i, j + 1);
    }
  }
  throw new Error(`kapanmayan blok: ${bas}`);
}

/* ------------------------------------------------------- 1. aday kartı */

test('satır ilan adını okunur bir metin satırı olarak yazıyor; kutu ve kesme yok', () => {
  assert.match(kart, /const ilanBasligi = kart\.ilanBasligi\?\.trim\(\) \|\| null;/);
  /* Onaylı tasarım: büyük "Başvurduğu ilan" kutusu yerine tek metin satırı. */
  assert.doesNotMatch(kart, />\s*Başvurduğu ilan\s*</);
  const ilan = kart.slice(kart.indexOf('{ilanBasligi && ('), kart.lastIndexOf('{ilanBasligi}') + 20);
  assert.match(ilan, /break-words text-sm font-bold leading-snug/);
  /* Uzun ad telefonda da tam okunuyor: kesme, genişletme düğmesi, hover yok. */
  assert.doesNotMatch(kart, /line-clamp|Devamını göster|title=\{ilanBasligi\}/);
  /* Satır bir düğme ve aria-label içeriği eziyor: ilan adı etikette olmalı. */
  assert.match(kart, /ilanBasligi \? `Başvurduğu ilan: \$\{ilanBasligi\}` : null/);
});

test('tüm satır tek düğme; iç içe düğme yok', () => {
  assert.match(kart, /data-aday-karti=\{kart\.id\}/);
  assert.equal((kart.match(/<button/g) ?? []).length, 1);
  assert.match(kart, /onClick=\{onAc\}/);
});

test('satırda yalnız onaylı alanlar: şehir, yetenek ve uyum listeden çıktı', () => {
  assert.doesNotMatch(kart, /kart\.sehir|kart\.yetenekler|UYUM_ETIKETI|uyumGoster|kart\.cvYolu/);
  assert.match(kart, /kart\.universite/);
  assert.match(kart, /\[kart\.bolum, kart\.sinif\]/);
  assert.match(kart, /durumRozeti\(kart\.durum\)/);
  assert.match(kart, /tarihYaz\(kart\.tarih\)/);
});

test('mavi çerçeve yalnız gerçekten seçili satırda', () => {
  assert.match(kart, /secili\s*\?\s*\{ boxShadow: `inset 0 0 0 2px \$\{SIRKET_VURGU\}`/);
  assert.doesNotMatch(kart, /odakli/);
  /* Seçim son açılan başvuru; liste hiçbir şey seçilmeden açılıyor. */
  assert.match(izgara, /const \[secili, setSecili\] = React\.useState<string \| null>\(null\);/);
  assert.match(izgara, /secili=\{k\.id === secili\}/);
  assert.match(izgara, /if \(acikId\) setSecili\(acikId\);/);
});

test('her başvuru ayrı satır; anahtar ve seçim başvuru kimliğiyle', () => {
  assert.match(izgara, /<li key=\{k\.id\}/);
  assert.match(izgara, /adayiAc\(k\.id\)/);
  /* Açık kart ham listeden kimlikle çözülüyor; öğrenci kimliğiyle değil. */
  assert.match(izgara, /kartlar\.find\(\(k\) => k\.id === acikId\)/);
  assert.doesNotMatch(izgara, /student_id|ogrenciId/);
});

test('ilan süzgeci ve durum süzgeci yerinde', () => {
  assert.match(izgara, /aria-label="İlana göre süz"/);
  assert.match(izgara, /aria-label="Duruma göre süz"/);
  assert.match(izgara, /adres\.searchParams\.set\('ilan', ilanSuzgeci\)/);
});

/* ------------------------------------------------ 2. inceleme ekranı */

test('inceleme ekranı iki RPC ile besleniyor', () => {
  assert.match(veri, /rpc\('basvuru_aday_guncel_profili'/);
  assert.match(veri, /rpc\('basvuru_aday_paylasimlari'/);
  assert.match(panel, /onGuncelProfil=\{basvuruAdayGuncelProfili\}/);
  assert.match(panel, /onPaylasimlar=\{basvuruAdayPaylasimlari\}/);
  assert.match(cekmece, /useAdayGuncelProfili\(kart\?\.id \?\? null, Boolean\(kart\?\.paylasildi\), onGuncelProfil\)/);
  assert.match(cekmece, /<AdayPaylasimlari/);
});

test('fikstürün yerel görsel kolu üretimde verilmiyor', () => {
  /* SirketPaneli yalnız aktarıyor; değer veren tek yer geliştirme fikstürü. */
  const atamalar = panel.match(/yerelGorselAdresi=\{[^}]*\}/g) ?? [];
  assert.ok(atamalar.length > 0);
  for (const a of atamalar) assert.equal(a, 'yerelGorselAdresi={yerelGorselAdresi}');
  assert.doesNotMatch(panel.slice(0, panel.indexOf('async function basvuruKartlari')), /fikst/i);
});

test('güncel profil yalnız rıza varsa; rıza yoksa bölüm yok', () => {
  assert.match(cekmece, /\{kart\.paylasildi && \(\s*<AdayGuncelProfil/);
  assert.match(guncel, /if \(!basvuruId \|\| !etkin \|\| !yukle\) \{/);
});

test('paylaşım bölümü yalnız StajımVar üzerinden yapılan başvuruda', () => {
  assert.match(cekmece, /const paylasimBolumu = kart\.yontem === 'internal' && Boolean\(onPaylasimlar\);/);
});

test('ekran geniş, erişilebilir bir diyalog', () => {
  assert.match(cekmece, /role="dialog"/);
  assert.match(cekmece, /aria-modal/);
  assert.match(cekmece, /aria-labelledby="aday-inceleme-basligi"/);
  assert.match(cekmece, /lg:max-w-\[1200px\]/);
  /* lg altında tam ekran: köşe yuvarlaması ve kenar boşluğu yalnız lg'de. */
  assert.match(cekmece, /className="absolute inset-0 flex flex-col overflow-hidden outline-none lg:inset-y-6/);
});

test('üst şerit: başvurduğu ilan, durum, başvuru tarihi', () => {
  const serit = cekmece.slice(cekmece.indexOf('id="aday-inceleme-basligi"'), cekmece.indexOf('aria-labelledby="aday-islemler-basligi"'));
  assert.match(serit, /Başvurduğu ilan:/);
  assert.match(serit, /\{durum\.etiket\}/);
  assert.match(serit, /Başvuru: \{basvuruTarihi\}/);
  /* Tarih ortak biçimleyiciden, elle toLocaleDateString değil. */
  assert.match(cekmece, /const basvuruTarihi = ortakTarihMetni\(kart\.tarih\);/);
});

test('mevcut eylemler korunuyor ve işlemler profilden önce', () => {
  for (const kalip of [
    /SIRKET_DURUMLARI\.map/,
    /Görüşmeye davet et/,
    /Teklif gönder/,
    /Öğrenciye not/,
    /Notu kaydet/,
    /olumsuzSoruldu/,
  ]) {
    assert.match(cekmece, kalip);
  }
  const islemler = cekmece.indexOf('aria-labelledby="aday-islemler-basligi"');
  const profil = cekmece.indexOf('data-aday-govde');
  assert.ok(islemler > -1 && profil > -1 && islemler < profil, 'DOM sırası görsel sırayla aynı değil');
});

test('Escape kapatıyor, Tab ekranda kalıyor, gövde kaydırması kilitli', () => {
  assert.match(cekmece, /e\.key === 'Escape'/);
  assert.match(cekmece, /e\.key !== 'Tab'/);
  assert.match(cekmece, /document\.body\.style\.overflow = 'hidden'/);
  /* Odak yalnız başka bir başvuru açılınca taşınıyor; her yeniden yüklemede değil. */
  assert.match(cekmece, /if \(acikId\) govde\.current\?\.focus\(\);\s*\}, \[acikId\]\);/);
});

test('açık başvuru adreste: geri kapatıyor, ileri açıyor, tek kaynak', () => {
  const kanca = koddan(oku('src/sirket/useAdayAdresi.ts'));
  /* Ekranın açık olup olmadığı adresten türüyor; yerel açık durumu yok. */
  assert.match(izgara, /const adresAday = useAdayAdresi\(\);/);
  assert.match(izgara, /const acikId = adresAday && kartlar\.some\(\(k\) => k\.id === adresAday\) \? adresAday : null;/);
  assert.doesNotMatch(izgara, /setAcikId/);
  /* Adres hem popstate'te hem kendi yazımımızda yeniden okunuyor. */
  assert.match(kanca, /window\.addEventListener\('popstate', yenile\)/);
  assert.match(kanca, /window\.addEventListener\(OLAY, yenile\)/);
  /* Açarken yeni kayıt, kapatırken (yalnız bu yüklemede itildiyse) geri. */
  assert.match(kanca, /window\.history\.pushState\(\{ stajimvarAday: id, oturum: OTURUM \}, '', adres\)/);
  assert.match(kanca, /durum\?\.oturum === OTURUM/);
  assert.match(kanca, /window\.history\.back\(\);/);
  assert.match(izgara, /adayAdresiniYaz\(id, \{ it: !mevcut \}\)/);
  assert.match(izgara, /const adayiKapat = React\.useCallback\(\(\) => adayEkraniniKapat\(\), \[\]\);/);
  /* Süzgeç adresi yazılırken açık ekranın geçmiş işareti silinmiyor. */
  assert.match(izgara, /window\.history\.replaceState\(window\.history\.state, '', adres\.pathname \+ adres\.search\)/);
  /* Odak hangi yoldan kapanırsa kapansın karta. */
  assert.match(izgara, /if \(onceki && !acikId\) odagiGeriVer\(onceki\);/);
  assert.match(izgara, /dataset\.adayKarti === id/);
  /* Kart listesi koşulsuz çiziliyor; ekran açıkken söküp yeniden kurulmuyor. */
  assert.doesNotMatch(izgara, /acikId \? null : \(\s*<ul/);
  /* Bildirimden açılma aynı yoldan: adres yazılıyor. */
  assert.match(izgara, /adayiAc\(acilacakAday\);\s*onAdayAcildi\?\.\(\);/);
});

test('listede olmayan kimlik: tarafsız tek cümle, adres temizleniyor', () => {
  assert.match(panel, /const adresAday = useAdayAdresi\(\);/);
  assert.match(panel, /derinBaglantiKarari\(\{\s*adresId: adresAday,\s*durum,\s*kimlikler: basvurular\.map\(\(k\) => String\(k\.id\)\),\s*\}\)/);
  assert.match(panel, /if \(karar !== 'bulunamadi'\) return;\s*setAdayUyarisi\(BULUNAMADI_CUMLESI\);\s*adayAdresiniYaz\(null\);/);
  /* Yalnız Başvuranlar ekranında. */
  assert.match(panel, /if \(sirketEkrani\(yol\)\.tur !== 'basvuranlar' \|\| !baglam\) return;/);
});

test('şirket yetenekleri başvuru üzerinden okuyor, öğrenci tablosundan değil', () => {
  assert.match(panel, /await basvuruAdayYetenekleri\(String\(s\.id\)\)/);
  assert.doesNotMatch(panel, /\badayYetenekleri\b/);
  assert.match(veri, /rpc\('basvuru_aday_yetenekleri'/);
  /* Şirket veri katmanı öğrenci tablolarına doğrudan gitmiyor. */
  assert.doesNotMatch(veri, /from\('student_(profiles|skills|projects|languages)'\)/);
  for (const yol of ['src/sirket/SirketPaneli.tsx', 'src/sirket/AdayCekmecesi.tsx', 'src/sirket/AdayIzgarasi.tsx', 'src/sirket/AdayGuncelProfil.tsx', 'src/sirket/AdayPaylasimlari.tsx']) {
    assert.doesNotMatch(oku(yol), /from\('student_/, `${yol} öğrenci tablosunu okuyor`);
  }
});

test('önyargısız kipte CV açılmadan önce soruluyor', () => {
  assert.match(cekmece, /const \[cvOnayi, setCvOnayi\] = React\.useState\(false\);/);
  assert.match(cekmece, /if \(kart\.gizli\) setCvOnayi\(true\);\s*else void cvAc\(\);/);
  assert.match(cekmece, /role="alertdialog"/);
  assert.match(
    cekmece,
    /CV dosyası adayın adını, fotoğrafını ve iletişim bilgilerini içerebilir; açarsan\s*önyargısız inceleme bu aday için geçerliliğini yitirir\./,
  );
  const panelUyari = cekmece.slice(cekmece.indexOf('role="alertdialog"'), cekmece.indexOf('{baglantiGizlendi && ('));
  assert.match(panelUyari, /setCvOnayi\(false\);\s*void cvAc\(\);/);
  assert.match(panelUyari, /CV'yi yine de aç/);
  assert.match(panelUyari, /autoFocus[\s\S]*Vazgeç/);
  /* Başka adaya geçince soru sıfırlanıyor. */
  assert.match(cekmece, /setCvAciliyor\(false\);\s*setCvOnayi\(false\);/);
});

test('arayüz tam gizlilik iddia etmiyor; bant belgelerin kimlik taşıyabileceğini söylüyor', () => {
  for (const kaynak of [izgara, cekmece, kart, guncel, paylasim]) {
    assert.doesNotMatch(kaynak, /tam(amen)? anonim|kimlik(i)? tamamen gizli|anonim incele/i);
  }
  assert.match(
    izgara,
    /Ad ve fotoğraf gizlenir; paylaşımlar ve dış bağlantılar gösterilmez\. Ancak CV ve ön\s*yazı gibi belgeler adayın adını ve kimliğini açığa çıkarabilir\./,
  );
});


test('ekran açıkken liste kısayolları kapalı', () => {
  const kisayol = blok(izgara, 'const tus = (e: KeyboardEvent) =>');
  assert.match(kisayol, /if \(acikId\) return;/);
});

test('dış bağlantılar güvenli adresle; ham href yok', () => {
  assert.match(cekmece, /adayBaglantilari\(kart\)/);
  assert.match(cekmece, /guvenliDisAdres\(p\?\.adres\)/);
  assert.doesNotMatch(cekmece, /href=\{p\.adres\}/);
  assert.doesNotMatch(cekmece, /href=\{kart\.portfolyo\}/);
  assert.doesNotMatch(cekmece, /github\.com\/\$\{kart\.github\}/);
});

test('deneyim başlığı yalnız deneyim varken açılıyor', () => {
  /*
    6 Ekim 2026: deneyim verisi geldi (20261205010000). Başlık artık var ama
    yalnız liste doluyken; boş bölüm başlığı çizilmiyor.
  */
  assert.match(cekmece, /\{deneyimler\.length > 0 && \(\s*<section>\s*<Baslik degisti=\{bolumDegisti\('deneyimler'\)\}>Deneyim<\/Baslik>/);
  assert.match(guncel, /\{\(deneyimler\.eklenen\.length > 0 \|\| deneyimler\.guncellenen\.length > 0 \|\| deneyimler\.cikan\.length > 0\) && \(/);
  /* Kaynak yalnız başvuru kopyası; ham kart alanı doğrulanmış listeden. */
  assert.match(cekmece, /const deneyimler = Array\.isArray\(kart\.deneyimler\) \? kart\.deneyimler : \[\];/);
});

test('başvuru anı ile güncel arasındaki fark işaretleniyor', () => {
  assert.match(cekmece, /adayProfilFarki\(kart, guncelProfil\.sonuc\.guncel, \{ kimlikGizli: Boolean\(kart\.gizli\) \}\)/);
  assert.match(guncel, /Başvurudan sonra değişti/);
  assert.match(guncel, /Başvurudan sonra değişenler/);
  assert.match(cekmece, /<Baslik degisti=\{bolumDegisti\('yetenekler'\)\}>Yetenekler<\/Baslik>/);
});

/* ------------------------------------------------- 3. önyargısız kip */

test('önyargısız kipte ad ve fotoğraf gizli — şerit ve güncel profil', () => {
  assert.match(cekmece, /\{kart\.fotoUrl && !kart\.gizli \? \(/);
  assert.match(cekmece, /\{kart\.gizli \? 'Aday' : \(kart\.ad \?\? 'Ad paylaşılmadı'\)\}/);
  /* Güncel profil bölümü fotoğrafı ve adı hiç çizmiyor. */
  assert.doesNotMatch(guncel, /fotoUrl|\bguncel\??\.ad\b/);
});

test('önyargısız kipte GitHub/LinkedIn/portfolyo ve proje bağlantıları gizli, CV kalıyor', () => {
  /* Adresler (LinkedIn yolu, GitHub kullanıcı adı) çoğunlukla adı taşıyor. */
  assert.match(cekmece, /const baglantilar = kart\.gizli \? \[\] : adayBaglantilari\(kart\);/);
  assert.match(cekmece, /const baglantiGizlendi = Boolean\(kart\.gizli\) && adayBaglantilari\(kart\)\.length > 0;/);
  assert.match(cekmece, /\{\(baglantilar\.length > 0 \|\| baglantiGizlendi \|\| kart\.cvYolu\) && \(/);
  assert.match(cekmece, /\{baglantiGizlendi && \(\s*<p[^>]*>\s*Önyargısız incelemede bağlantılar gösterilmiyor\.\s*<\/p>/);
  /* Düğmeler yalnız `baglantilar` listesinden çiziliyor; başka bir yoldan href yok. */
  assert.match(cekmece, /\{baglantilar\.map\(/);
  assert.equal((cekmece.match(/adayBaglantilari\(kart\)/g) ?? []).length, 2);
  /* CV düğmesi koşulsuz: yalnız `kart.cvYolu`na bağlı. */
  assert.match(cekmece, /\{kart\.cvYolu && \(\s*<button/);
  /* Projeyi aç: kopyada da farkta da önyargısız kipte adres yok; başlık ve açıklama duruyor. */
  assert.match(cekmece, /const adres = kart\.gizli \? null : guvenliDisAdres\(p\?\.adres\);/);
  assert.match(guncel, /const adres = kimlikGizli \? null : guvenliDisAdres\(p\.adres\);/);
  assert.match(cekmece, /kimlikGizli=\{Boolean\(kart\.gizli\)\}/);
  assert.match(cekmece, /\{p\?\.baslik\}/);
  assert.match(cekmece, /\{p\.aciklama\}/);
});

test('önyargısız kipte paylaşım görselleri ve açıklamaları gizli, inmiyor', () => {
  assert.match(cekmece, /gizli=\{Boolean\(kart\.gizli\)\}/);
  /* Liste sunucudan istenmiyor. */
  const etki = paylasim.slice(paylasim.indexOf('React.useEffect(() => {\n    setVeri(null);'));
  assert.ok(etki.indexOf('if (gizli) return undefined;') > -1);
  assert.ok(etki.indexOf('if (gizli) return undefined;') < etki.indexOf('yukle(basvuruId)'));
  /* Kapak indirmesi boş listeyle çağrılıyor. */
  assert.match(paylasim, /gizli \|\| yerelGorselAdresi \? \[\] : kapakYollari/);
  /* Görüntüleyici bu kipte çizilmiyor. */
  assert.match(paylasim, /\{acik && !gizli && \(/);
  assert.match(paylasim, /'Önyargısız incelemede paylaşımlar gizli\.'/);
  /* Gizli dal ızgaradan önce karar veriyor. */
  assert.ok(paylasim.indexOf('if (gizli) {') < paylasim.indexOf('<ul className="grid grid-cols-2'));
});

/* ---------------------------------------- 4. görsel indirme, imza yok */

test('paylaşım görselleri imzalı adresle değil, oturumdan indirmeyle', () => {
  assert.match(paylasim, /import \{ useGorselAdresleri \} from '\.\.\/components\/sosyal\/useGorselAdresleri';/);
  assert.match(paylasim, /useGorselAdresleri\(\s*SOSYAL_PAYLASIM_KOVASI,/);
  for (const kaynak of [paylasim, cekmece, guncel]) {
    assert.doesNotMatch(kaynak, /createSignedUrl|getPublicUrl|signedUrl/i);
  }
  /* Kancanın kendisi download ile iniyor. */
  assert.match(oku('src/components/sosyal/useGorselAdresleri.ts'), /await gorselIndir\(kova, yol\)/);
  assert.match(oku('src/lib/queries/sosyal.ts'), /\.storage\.from\(kova\)\.download\(yol\)/);
});

test('paylaşım bölümünün dört durumu ayrı cümle', () => {
  assert.match(paylasim, /'Aday bu başvuruda paylaşımlarını göstermeye izin vermedi\.'/);
  assert.match(paylasim, /'Adayın sosyal profili şu an gizli\.'/);
  assert.match(paylasim, /'Adayın profilinde henüz paylaşım yok\.'/);
  assert.match(paylasim, /Paylaşımlar alınamadı\./);
  assert.match(paylasim, /Paylaşımlar yükleniyor…/);
});

test('görüntüleyici: Escape, ok tuşları, odak tuzağı, odak geri dönüşü, alt metni', () => {
  assert.match(paylasim, /document\.addEventListener\('keydown', tus, true\)/);
  for (const tus of ['Escape', 'ArrowLeft', 'ArrowRight', 'Tab']) {
    assert.match(paylasim, new RegExp(`e\\.key === '${tus}'`));
  }
  assert.match(paylasim, /e\.stopPropagation\(\);/);
  assert.match(paylasim, /if \(tetikleyici\?\.isConnected\) tetikleyici\.focus\(\);/);
  assert.match(paylasim, /alt=\{gorsel\.alt \?\? ''\}/);
  assert.match(paylasim, /aria-live="polite"/);
  /* Önceki/Sonraki düğmeleri metinli; ikon tek başına değil. */
  assert.match(paylasim, /<ChevronLeft className="h-5 w-5" aria-hidden \/>\s*Önceki/);
  assert.match(paylasim, /Sonraki\s*<ChevronRight className="h-5 w-5" aria-hidden \/>/);
});

test('şirkete beğeni, kaydetme ya da yorum yüzeyi açılmıyor', () => {
  assert.doesNotMatch(paylasim, /PaylasimGovdesi|PaylasimDetayi|begen|kaydet\(/i);
});

/* ------------------------------------------ 5. başvuru penceresi izni */

test('paylaşım izni ayrı, isteğe bağlı ve varsayılanı kapalı', () => {
  assert.match(pencere, /const \[paylasimIzni, setPaylasimIzni\] = useState\(false\);/);
  assert.match(
    pencere,
    /Profilimdeki paylaşımlarımın ve görsellerimin bu başvuru kapsamında\{' '\}\s*\{listing\.companyName\} tarafından görülmesine izin veriyorum \(isteğe bağlı,\s*istediğin zaman geri alabilirsin\)\./,
  );
  /* KVKK kutusunun ALTINDA, ayrı bir label. */
  const kvkk = pencere.indexOf('checked={consent}');
  const izin = pencere.indexOf('checked={paylasimIzni}');
  assert.ok(kvkk > -1 && izin > kvkk, 'izin kutusu KVKK kutusunun altında değil');
  /* Gönderim yalnız KVKK rızasını bekliyor. */
  assert.match(pencere, /disabled=\{\(rizaGerekli && !consent\) \|\| busy\}/);
  assert.doesNotMatch(pencere, /disabled=\{[^}]*paylasimIzni/);
});

test('izin kutusu yalnız StajımVar üzerinden alınan başvuruda', () => {
  assert.match(pencere, /const paylasimKutusu = rizaGerekli && listing\.applicationMethod === 'internal';/);
  assert.match(pencere, /await onSubmit\(consent, paylasimKutusu && paylasimIzni\);/);
});

test('başvurudan sonra izin RPC ile yazılıyor; hata sessiz değil', () => {
  const gonder = blok(app, 'const submitApplication = async (');
  assert.match(gonder, /async \(consent: boolean, paylasimIzni = false\)/);
  const olustur = gonder.indexOf('await createApplication(');
  const izin = gonder.indexOf('await basvuruPaylasimIzni(created.id, true)');
  assert.ok(olustur > -1 && izin > olustur, 'izin başvurudan önce ya da hiç yazılmıyor');
  assert.match(gonder, /if \(!created\?\.id\) throw/);
  assert.match(gonder, /izinKaydedilemedi = true;/);
  assert.match(gonder, /Paylaşım iznin kaydedilemedi/);
  /* İzin hatası başvuruyu geri almıyor: başvuru listeye yine giriyor. */
  assert.ok(gonder.indexOf('setApplications((prev) => [created, ...prev]);') > izin);
});

/* ---------------------------------------------- 6. Başvurularım anahtarı */

test('Başvurularım: erişilebilir, kilitlenen, hatası görünen anahtar', () => {
  assert.match(takip, /role="switch"/);
  assert.match(takip, /aria-checked=\{Boolean\(app\.paylasimIzniAt\)\}/);
  assert.match(takip, /disabled=\{izinIslemde === app\.id\}/);
  assert.match(takip, /Paylaşımlarımı bu şirket görebilir/);
  assert.match(takip, /Paylaşım iznin kaydedilemedi\. Bağlantını kontrol edip tekrar dene\./);
  assert.match(takip, /min-h-11 min-w-11/);
  /* Durum metinle de söyleniyor: "Açık" / "Kapalı". */
  assert.match(takip, /`Açık: /);
  assert.match(takip, /`Kapalı: /);
});

test('anahtar yalnız StajımVar üzerinden yapılan başvuruda; eskiler kapalı', () => {
  assert.match(takip, /\{onPaylasimIzni && app\.applicationMethod === 'internal' && \(/);
  /* Kapalı başlangıç: değer yalnız sunucudaki damgadan. */
  assert.match(oku('src/lib/queries/mappers.ts'), /paylasimIzniAt: \(\(row as unknown as \{ paylasim_izni_at\?: string \| null \}\)\.paylasim_izni_at\) \?\? undefined/);
});

test('App anahtarı RPC\'ye bağlıyor ve sunucunun dönüşünü yazıyor', () => {
  assert.match(app, /onPaylasimIzni=\{async \(id, acik\) => \{\s*const izinAni = await basvuruPaylasimIzni\(id, acik\);/);
  assert.match(app, /paylasimIzniAt: izinAni \?\? undefined/);
});
