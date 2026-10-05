import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  DEGISIKLIK_METNI,
  DEGISIKLIK_ROZETI,
  FORM_ALANI_ADI,
  GEREKCE_EN_AZ,
  GEREKCE_FORM_ALANI,
  IS_UYARISI,
  KARAR_ETIKETI,
  KONTROL_ETIKETI,
  YAYIN_SONUCU_METNI,
  bekleyenOku,
  gerekceSatiri,
  gerekceYeterli,
  icerikFarki,
  yenidenDenemeSagligi,
  yoneticiKarariMi,
  gerekceleriDagit,
  gerekceleriOku,
  gonderimAnahtariUret,
  kararEtiketi,
  kartKontrolDurumu,
} from '../src/lib/ilan-kontrol-gorunumu.mjs';

/*
  İLAN OTOMATİK KONTROLÜNÜN ARAYÜZÜ (20261120010000)

  Sunucu tarafı tests/ilan-otomatik-kontrol.test.mjs'te (PGlite). Bu
  dosya arayüzün o kararı DOĞRU anlattığını ölçüyor:

    · taslak kaydetmek ile yayına göndermek iki ayrı eylem
    · form yayın durumunu kendisi yazmıyor; tek yol sunucu kontrolü
    · dört durumun etiketi her yerde aynı
    · hiçbir metin süre vaadi vermiyor
    · gönderim anahtarı form başına bir kez üretiliyor
    · yönetici kuyruğu gerekçeyi, kanıtı, kural sürümünü ve son
      kararları gösteriyor
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
/* Yorumlar ölçülmüyor: bir kuralı ANLATAN yorum, kuralı çiğneyen kod sayılmasın. */
const yorumsuz = (m) =>
  m
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');

const FORM = yorumsuz(oku('src/sirket/IlanFormu.tsx'));
const PANEL = yorumsuz(oku('src/sirket/SirketPaneli.tsx'));
const KART = yorumsuz(oku('src/sirket/IlanKarti.tsx'));
const GENEL = yorumsuz(oku('src/sirket/GenelBakis.tsx'));
const ONAY = yorumsuz(oku('src/components/yonetim/OnaySayfasi.tsx'));
const GORUNUM = yorumsuz(oku('src/lib/ilan-kontrol-gorunumu.mjs'));
const GEREKCELI = yorumsuz(oku('src/components/yonetim/GerekceliKarar.tsx'));
const YONETIM_ILANLAR = yorumsuz(oku('src/components/yonetim/IlanlarSayfasi.tsx'));

/** `const ad = async (...) => { ... };` gövdesi — süslü parantez sayarak. */
function govde(kaynak, bas) {
  const i = kaynak.indexOf(bas);
  assert.ok(i > -1, `bulunamadı: ${bas}`);
  const ac = kaynak.indexOf('{', kaynak.indexOf('=>', i));
  let derinlik = 0;
  for (let j = ac; j < kaynak.length; j += 1) {
    if (kaynak[j] === '{') derinlik += 1;
    else if (kaynak[j] === '}') {
      derinlik -= 1;
      if (derinlik === 0) return kaynak.slice(ac, j + 1);
    }
  }
  throw new Error(`kapanmayan gövde: ${bas}`);
}

/* ------------------------------------------------ 1. İKİ AYRI EYLEM */

test('yeni ilanda "Taslak olarak kaydet" ve "Yayına gönder" iki ayrı düğme, iki ayrı işlev', () => {
  assert.match(FORM, /'Taslak olarak kaydet'/);
  assert.match(FORM, /'Yayına gönder'/);
  assert.match(FORM, /onClick=\{\(\) => void yayinaGonder\(\)\}/);
  assert.match(FORM, /onClick=\{\(\) => void kaydet\(\)\}/);

  /* Taslak kaydı sunucu kontrolünü ÇAĞIRMIYOR. */
  const kaydet = govde(FORM, 'const kaydet = async');
  assert.doesNotMatch(kaydet, /onYayinaGonder/, 'taslak kaydı yayına göndermemeli');

  /* Yayına gönder önce kaydediyor, sonra kontrolü çağırıyor — aynı kimlikle. */
  const gonder = govde(FORM, 'const yayinaGonder = async');
  const kayitYeri = gonder.indexOf('kaydetVeKimlikAl()');
  const kontrolYeri = gonder.indexOf('onYayinaGonder(id)');
  assert.ok(kayitYeri > -1 && kontrolYeri > kayitYeri, 'önce kayıt, sonra kontrol');
});

test('düzeltip yeniden gönderme AYNI ilanı günceller, yeni ilan açmaz', () => {
  const ortak = govde(FORM, 'const kaydetVeKimlikAl = async');
  /* İlk kayıttan sonra kimlik tutuluyor ve sonraki kayıtta veriliyor. */
  assert.match(ortak, /onKaydet\(satir, \{ id: kayitliId, gonderimAnahtari: gonderimAnahtari\.current \}\)/);
  assert.match(ortak, /setKayitliId\(kayit\.id\)/);
  assert.match(FORM, /React\.useState<string \| null>\(duzenlenenId \?\? null\)/);

  /* Panel: kimlik varsa güncelle, yoksa taslak oluştur (gönderim anahtarıyla). */
  assert.match(PANEL, /onKaydet=\{async \(satir, \{ id, gonderimAnahtari \}\) => \{\s*if \(id\) \{\s*await ilanGuncelle\(id, satir\);/);
  assert.match(PANEL, /await ilanKaydet\(satir, baglam\.companyId!, gonderimAnahtari\)/);
  assert.match(PANEL, /onYayinaGonder=\{async \(id\) => \{\s*const sonuc = await ilanYayinaGonder\(id\);/);
});

test('yayındaki ilanda yalnız "Değişiklikleri kaydet"; "Yayına gönder" yalnız taslakta', () => {
  assert.match(FORM, /const gonderilebilir = !yayinda && !kapali;/);
  assert.match(FORM, /\{gonderilebilir && \(\s*<button/);
  assert.match(FORM, /'Değişiklikleri kaydet'/);
  /*
    Önceden söylenen not, kelimesi kelimesine. 20261120010000 son
    sürümü: yayındaki ilan düzenleme yüzünden yayından KALKMIYOR; son
    onaylı sürüm yayında kalıyor.
  */
  assert.match(
    FORM,
    /Yayındaki ilanda yaptığın değişiklik yayına girmeden önce kontrol edilir\.\s*<\/b>\{' '\}\s*Sorun yoksa hemen yayına girer; sorun bulunursa ilanın önceki hâli yayında kalır/,
  );
  assert.doesNotMatch(FORM, /yayından kalk/, 'yayındaki ilan düzenlemeyle yayından kalkmıyor');
  /* Kaydettikten sonra satır yeniden okunuyor; gerçek durum oradan. */
  const kaydet = govde(FORM, 'const kaydet = async');
  assert.match(kaydet, /satir = await oku\(id\)/);
  assert.match(kaydet, /ilanKontrolDurumu\(satir/);
  assert.match(kaydet, /oncekiDurum === 'published' && status === 'published'/);
  assert.match(kaydet, /const bekleyen = bekleyenOku\(satir\.bekleyen\);/);
});

/* ------------------------------- 1b. YAYINDAKİ İLANIN BEKLEYEN DEĞİŞİKLİĞİ */

test('bekleyen değişiklik: dizi ya da nesne güvenle okunuyor, durum adları şirketin gördüğü', () => {
  const satir = { durum: 'duzeltme', gerekceler: [{ alan: 'city', mesaj: 'Şehri yaz.', kural: 'zorunlu.sehir' }], kontrol_at: 'x', icerik: { title: 'A' } };
  assert.equal(bekleyenOku([satir]).durum, 'duzeltme_gerekiyor');
  assert.equal(bekleyenOku(satir).durum, 'duzeltme_gerekiyor');
  assert.deepEqual(bekleyenOku(satir).icerik, { title: 'A' });
  assert.equal(bekleyenOku({ durum: 'inceleme' }).durum, 'inceleme_gerekiyor');
  assert.equal(bekleyenOku({ durum: 'bekliyor' }).durum, 'kontrol_ediliyor');
  for (const bos of [null, undefined, [], {}, { durum: 'gecti' }, 'x']) assert.equal(bekleyenOku(bos), null);

  assert.deepEqual(DEGISIKLIK_ROZETI, {
    duzeltme_gerekiyor: 'Değişiklik: Düzeltme gerekiyor',
    inceleme_gerekiyor: 'Değişiklik: İncelemede',
    kontrol_ediliyor: 'Değişiklik: Kontrol ediliyor',
  });
  assert.deepEqual(DEGISIKLIK_METNI, {
    yayinda: 'Değişiklikler yayında.',
    duzeltme_gerekiyor:
      'Değişikliklerin yayına girmedi; ilanın önceki hâli yayında. Aşağıdakileri düzeltip yeniden kaydet.',
    inceleme_gerekiyor: 'Değişikliklerin ekibimizin incelemesinde; o sürece ilanın önceki hâli yayında.',
    kontrol_ediliyor:
      'Değişikliklerin kontrolü tamamlanamadı; sunucu yeniden deneyecek. O sürece ilanın önceki hâli yayında.',
  });
  /* Her "yayına girmedi" cümlesi önceki hâlin yayında olduğunu söylüyor. */
  for (const d of ['duzeltme_gerekiyor', 'inceleme_gerekiyor', 'kontrol_ediliyor']) {
    assert.match(DEGISIKLIK_METNI[d], /ilanın önceki hâli yayında/, d);
  }
});

test('düzenleme formu bekleyen değişikliği canlı satırın yerine gösteriyor', () => {
  assert.match(FORM, /const bekleyen = status === 'published' \? bekleyenOku\(satir\.bekleyen\) : null;/);
  assert.match(FORM, /setDeger\(ilanFormDegeri\(bekleyen\?\.icerik \? \{ \.\.\.satir, \.\.\.bekleyen\.icerik \} : satir\)\)/);
  assert.match(FORM, /'Yayındaki sürüm değişmedi'/);
  assert.match(FORM, /Formda kaydettiğin ama henüz yayına girmemiş değişiklik var\./);
  assert.match(FORM, /\{DEGISIKLIK_METNI\[degisiklik\.durum\]\}/);
  assert.match(FORM, /DEGISIKLIK_METNI\.yayinda/);
  /* Kontrolü tamamlanamamış değişiklik şimdi yeniden denenebiliyor — aynı kapıdan. */
  assert.match(FORM, /'Değişikliği yeniden kontrol et'/);
  const yeniden = govde(FORM, 'const degisikligiYenidenKontrolEt = async');
  assert.match(yeniden, /await onYayinaGonder\(kayitliId\)/);
  assert.match(yeniden, /sonuc\.degisiklik/);
});

test('kart: yayındaki ilan "Yayında" kalıyor, değişikliğin durumu ikinci rozette ve notta', () => {
  assert.match(KART, /const degisiklik = ilan\.status === 'published' \? bekleyenOku\(ilan\.bekleyen\) : null;/);
  assert.match(KART, /\{DEGISIKLIK_ROZETI\[degisiklik\.durum\]\}/);
  assert.match(KART, /Değişikliklerin yayına girmedi; ilanın önceki hâli yayında\. Düzeltilmesi gerekenler:/);
  assert.match(KART, /DEGISIKLIK_METNI\[degisiklik\.durum\]/);
  /* Ana rozet değişikliğe bakmıyor: yayındaki ilan "Yayında". */
  assert.equal(kartKontrolDurumu({ status: 'published', kontrol_durumu: 'gecti', bekleyen: [{ durum: 'duzeltme' }] }), 'yayinda');
});

test('yönetici kararıyla kaldırılan/reddedilen ilan şirkete karar olarak anlatılıyor', () => {
  const kaldirildi = [{ alan: null, kural: 'yonetici.kaldirdi', mesaj: 'İlan ekibimiz tarafından yayından kaldırıldı: Kayıt ücreti isteniyor.' }];
  assert.equal(yoneticiKarariMi(kaldirildi), true);
  assert.equal(yoneticiKarariMi([{ alan: null, kural: 'yonetici.reddetti', mesaj: 'x' }]), true);
  assert.equal(yoneticiKarariMi([{ alan: 'title', kural: 'zorunlu.unvan', mesaj: 'x' }]), false);
  /* Sunucunun mesajı ön ek almadan, olduğu gibi. */
  assert.equal(gerekceSatiri(kaldirildi[0]), kaldirildi[0].mesaj);
  assert.match(KART, /'Ekibimizin kararı:'/);
  assert.match(KART, /bu kez ekibimizin incelemesine gider\./);
  assert.match(FORM, /Ekibimiz bu ilanı yayından kaldırdı ya da yayına almadı\./);
});

test('uzaktan çalışmada şehir isteğe bağlı; geçmiş son başvuru alanın yanında hata', () => {
  assert.match(FORM, /const uzaktan = deger\.calismaSekli === 'Remote';/);
  assert.match(FORM, /sorun=\{goster\('sehir'\)\} istegeBagli=\{uzaktan\}/);
  assert.match(FORM, /'Son başvuru ve şehir dışında tüm alanlar zorunlu'/);
  assert.match(FORM, /sorun=\{goster\('sonBasvuru'\)\} istegeBagli>/);
});

/* --------------------------------- 2. YAYIN YETKİSİ TARAYICIDA DEĞİL */

test('formda yayına almak için doğrudan status: published yazan yol yok', () => {
  for (const [ad, kod] of [
    ['IlanFormu', FORM],
    ['GenelBakis', GENEL],
    ['IlanKarti', KART],
  ]) {
    assert.doesNotMatch(kod, /status:\s*'published'/, `${ad}: durum doğrudan yazılmamalı`);
    assert.doesNotMatch(kod, /\.update\(/, `${ad}: arayüz bileşeni tabloya yazmamalı`);
  }
  /* Form satırı yalnız başlangıç durumuyla (taslak) kuruyor. */
  assert.match(FORM, /ilanSatiri\(deger, \{ companyId: '', durum: baslangicDurumu \}\)/);
  /* Kartın "Yayına gönder"i sunucu kontrolüne gidiyor, sonucu döndürüyor. */
  const durum = govde(PANEL, 'const ilanDurumu = React.useCallback(\n    async');
  assert.match(durum, /if \(d === 'published'\) \{\s*const sonuc = await ilanYayinaGonder\(id\);/);
  assert.match(durum, /return sonuc;/);
});

test('gönderim sırasında "Kontrol ediliyor…", aria-busy ve ref kilidi', () => {
  assert.match(FORM, /islem === 'gonderiliyor' \? 'Kontrol ediliyor…' : 'Yayına gönder'/);
  assert.match(FORM, /aria-busy=\{islem === 'gonderiliyor'\}/);
  assert.match(FORM, /disabled=\{mesgul\}/);
  assert.match(FORM, /const kilit = React\.useRef\(false\);/);
  for (const ad of ['const kaydet = async', 'const yayinaGonder = async']) {
    const g = govde(FORM, ad);
    assert.match(g, /if \(kilit\.current \|\| !alanlarHazir\(\)\) return;\s*kilit\.current = true;/, ad);
    assert.match(g, /finally \{\s*kilit\.current = false;/, ad);
  }
  /* Karttaki eylem de kilitli ve meşgulken söylüyor. */
  assert.match(GENEL, /const durumKilidi = React\.useRef\(false\);/);
  assert.match(GENEL, /'Kontrol ediliyor…'/);
  /*
    KOŞUL GENİŞLEDİ, GUVENCE DEĞİL (5 Ekim 2026): ilan kapatılırken önce
    sonucu bekleyen adaylar okunuyor ve o okuma da düğmeyi meşgul
    gösteriyor. Eski kalıp `=== id}` ile bitiyordu, yani koşulun TAM
    metnine bağlıydı; korunması gereken şey ise "bu ilanın düğmesi,
    bu ilanın işlemi sürerken meşgul duyurulsun".
  */
  assert.match(GENEL, /aria-busy=\{[^}]*durumIslemi\?\.id === id[^}]*\}/);
  /* Bekleyen aday okuması da meşgul sayılıyor ve metinle söyleniyor. */
  assert.match(GENEL, /aria-busy=\{[^}]*kapanisOkunuyor === id[^}]*\}/);
  assert.match(GENEL, /'Bekleyen adaylar okunuyor…'/);
});

/* ------------------------------------------ 3. GÖNDERİM ANAHTARI */

test('gönderim anahtarı form başına BİR kez üretiliyor, ref içinde', () => {
  assert.match(FORM, /const gonderimAnahtari = React\.useRef<string>\(''\);/);
  assert.match(
    FORM,
    /if \(!gonderimAnahtari\.current\) gonderimAnahtari\.current = gonderimAnahtariUret\(\);/,
  );
  assert.equal((FORM.match(/gonderimAnahtariUret\(\)/g) ?? []).length, 1, 'tek üretim yeri');
  assert.doesNotMatch(FORM, /randomUUID/, 'tıklama başına UUID üretilmemeli');

  const a = gonderimAnahtariUret();
  const b = gonderimAnahtariUret();
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(a, b);
});

/* ---------------------------------------------- 4. DÖRT DURUM ETİKETİ */

test('dört durum etiketi (ve taslak) tek kaynakta, birebir', () => {
  assert.deepEqual(KONTROL_ETIKETI, {
    yayinda: 'Yayında',
    kontrol_ediliyor: 'Kontrol ediliyor',
    duzeltme_gerekiyor: 'Düzeltme gerekiyor',
    inceleme_gerekiyor: 'İnceleme gerekiyor',
    taslak: 'Taslak',
  });
  /* Form ve kart etiketi buradan alıyor; kendi kopyalarını yazmıyor. */
  assert.match(FORM, /KONTROL_ETIKETI\[kontrol\.durum\]/);
  assert.match(KART, /KONTROL_ETIKETI\.duzeltme_gerekiyor/);
  assert.match(KART, /KONTROL_ETIKETI\.inceleme_gerekiyor/);
  assert.match(KART, /KONTROL_ETIKETI\.kontrol_ediliyor/);
  assert.match(KART, /KONTROL_ETIKETI\.yayinda/);
  assert.match(KART, /const kontrol = kartKontrolDurumu\(ilan\);/);
});

test('kart durumu: kapalı ilan "taslak" sayılmıyor; yeniden açılamadıysa kontrol sonucu', () => {
  assert.equal(kartKontrolDurumu({ status: 'published', kontrol_durumu: 'gecti' }), 'yayinda');
  assert.equal(kartKontrolDurumu({ status: 'draft', kontrol_durumu: null }), 'taslak');
  assert.equal(kartKontrolDurumu({ status: 'draft', kontrol_durumu: 'bekliyor' }), 'kontrol_ediliyor');
  assert.equal(kartKontrolDurumu({ status: 'draft', kontrol_durumu: 'duzeltme' }), 'duzeltme_gerekiyor');
  assert.equal(kartKontrolDurumu({ status: 'draft', kontrol_durumu: 'inceleme' }), 'inceleme_gerekiyor');
  assert.equal(kartKontrolDurumu({ status: 'closed', kontrol_durumu: 'gecti' }), 'kapali');
  assert.equal(kartKontrolDurumu({ status: 'closed', kontrol_durumu: null }), 'kapali');
  assert.equal(kartKontrolDurumu({ status: 'closed', kontrol_durumu: 'duzeltme' }), 'duzeltme_gerekiyor');
  /* Eski (göç öncesi) satır: kolon yok → taslak. */
  assert.equal(kartKontrolDurumu({ status: 'draft' }), 'taslak');
});

/* ------------------------------------------- 5. GEREKÇE ALAN ALAN */

test('sunucu alanı form alanına eşleniyor; alansız ya da tanınmayan gerekçe kaybolmuyor', () => {
  assert.deepEqual(GEREKCE_FORM_ALANI, {
    title: 'unvan',
    city: 'sehir',
    duration: 'sure',
    stipend_text: 'ucret',
    description: 'aciklama',
    application_deadline: 'sonBasvuru',
  });
  for (const formAlani of Object.values(GEREKCE_FORM_ALANI)) {
    assert.ok(FORM_ALANI_ADI[formAlani], `${formAlani} için ekrandaki ad`);
    /* Formda o alanın altında gerekçe yeri var. */
    assert.match(FORM, new RegExp(`mesajlar=\\{sunucuGerekceleri\\.${formAlani}\\}`), formAlani);
  }

  const { alanlar, genel } = gerekceleriDagit([
    { alan: 'description', kural: 'zorunlu.aciklama', mesaj: 'İş tanımı kısa.' },
    { alan: 'description', kural: 'baglanti.https', mesaj: 'http bağlantı.' },
    { alan: 'stipend_text', kural: 'zorunlu.ucret', mesaj: 'Tutar yaz.' },
    { alan: null, kural: 'inceleme', mesaj: 'İncelemeye gönderildi.' },
    { alan: 'yeni_kolon', kural: 'x', mesaj: 'Bilinmeyen alan.' },
    { alan: 'title', kural: 'x' },
  ]);
  assert.deepEqual(alanlar, { aciklama: ['İş tanımı kısa.', 'http bağlantı.'], ucret: ['Tutar yaz.'] });
  assert.deepEqual(genel, ['İncelemeye gönderildi.', 'Bilinmeyen alan.']);
});

test('gerekçe okuma bozuk girdiye dayanıklı; yönetici notu kendi adıyla', () => {
  assert.deepEqual(gerekceleriOku(null), []);
  assert.deepEqual(gerekceleriOku('bozuk'), []);
  assert.deepEqual(gerekceleriOku({}), []);
  assert.equal(gerekceleriOku('[{"alan":"city","mesaj":"Şehri yaz.","kural":"zorunlu.sehir"}]')[0].alan, 'city');
  assert.equal(gerekceSatiri({ alan: 'city', mesaj: 'Şehri yaz.', kural: 'zorunlu.sehir' }), 'Şehir: Şehri yaz.');
  assert.equal(gerekceSatiri({ alan: null, mesaj: 'Ücret eksik.', kural: 'yonetici' }), 'Ekibimizin notu: Ücret eksik.');
  assert.equal(gerekceSatiri({ alan: null, mesaj: 'Genel.', kural: 'inceleme' }), 'Genel.');
});

test('inceleme gerekçesi sunucudan geldiği gibi; kural ayrıntısı uydurulmuyor', () => {
  /* Şirket ekranında `g.kural` ya da `g.kanit` yazılmıyor. */
  assert.doesNotMatch(FORM, /g\.kanit|\{g\.kural\}/);
  assert.doesNotMatch(KART, /g\.kanit|\{g\.kural\}/);
  assert.match(FORM, /\{g\.mesaj\}/);
});

/* ------------------------------------------------- 6. SÜRE VAADİ YOK */

test('arayüz metinlerinde süre vaadi yok', () => {
  const SURE = /dakika içinde|saat içinde|24 saat|iş günü içinde|birkaç dakika|kısa süre içinde|hemen inceliyoruz/i;
  for (const [ad, kod] of [
    ['IlanFormu', FORM],
    ['IlanKarti', KART],
    ['GenelBakis', GENEL],
    ['OnaySayfasi', ONAY],
    ['ilan-kontrol-gorunumu', GORUNUM],
  ]) {
    assert.doesNotMatch(kod, SURE, `${ad}: süre vaadi`);
  }
  for (const metin of Object.values(YAYIN_SONUCU_METNI)) assert.doesNotMatch(metin, SURE);
});

test('artık yanlış olan "her ilan incelenir" metinleri formdan kalktı', () => {
  for (const eski of [
    /Her ilan yayına alınmadan önce bizde inceleniyor/,
    /Gönderdiğinde incelemeye gider/,
    /onaylanınca yayına çıkar/,
    /Genellikle bir iş günü/,
    /İlan incelemeye gönderildi/,
  ]) {
    assert.doesNotMatch(FORM, eski);
  }
  /* Yerine gerçek akış: sorunsuz → yayın, eksik → düzeltme, şüpheli → inceleme. */
  assert.match(FORM, /Yayına gönderdiğinde ilan otomatik olarak kontrol edilir\./);
  assert.match(FORM, /Sorun yoksa hemen yayına çıkar; eksik ya da hatalı bilgi varsa taslakta kalır/);
  assert.match(FORM, /Şüpheli bulunan ilan ekibimizin incelemesine\s+gider\./);
});

test('"kontrol ediliyor" ekranı yeniden denemeyi söylüyor, süre söylemiyor', () => {
  assert.match(FORM, /otomatik kontrol bu sefer tamamlanamadı\. Sunucu kontrolü kendisi\s+yeniden deneyecek/);
  assert.match(KART, /sunucu kontrolü kendisi yeniden deneyecek/);
  assert.equal(
    YAYIN_SONUCU_METNI.kontrol_ediliyor,
    'Kontrol tamamlanamadı; sunucu kontrolü kendisi yeniden deneyecek.',
  );
  /* "Yayında" sözü yalnız sunucu yayinda dediğinde. */
  assert.match(YAYIN_SONUCU_METNI.yayinda, /yayında/);
  for (const d of ['duzeltme_gerekiyor', 'inceleme_gerekiyor', 'kontrol_ediliyor']) {
    assert.doesNotMatch(YAYIN_SONUCU_METNI[d], /yayında\./, d);
  }
});

/* ---------------------------------------- 7. KART: SONUÇ GÖRÜNÜYOR */

test('kartın durum eylemi hatayı yutmuyor ve sonucu yazıyor', () => {
  assert.doesNotMatch(GENEL, /void onDurum\(/, 'hata yutulmamalı');
  assert.match(GENEL, /YAYIN_SONUCU_METNI\[sonuc\.durum\]/);
  assert.match(GENEL, /role=\{durumSonucu\.hata \? 'alert' : 'status'\}/);
  assert.match(GENEL, /<KontrolNotu ilan=\{ilan\} \/>/);
  /* Sonuç ekranda kalsın: panel yayına göndermede bütün paneli iskelete çekmiyor. */
  const durum = govde(PANEL, 'const ilanDurumu = React.useCallback(\n    async');
  assert.doesNotMatch(durum, /yukle\(\)/);
  assert.match(durum, /ilanlariYenile\(\)/);
});

/* --------------------------------------------- 8. YÖNETİCİ KUYRUĞU */

test('yönetici kuyruğu gerekçe, kanıt, kural kimliği, kontrol zamanı ve kural sürümü gösteriyor', () => {
  assert.match(ONAY, /<GerekceListesi ham=\{ilan\.kontrolGerekceleri\} \/>/);
  assert.match(ONAY, /\{g\.kanit && \(/);
  assert.match(ONAY, /\{g\.kural && <p className="[^"]*font-mono[^"]*">\{g\.kural\}<\/p>\}/);
  assert.match(ONAY, /tarihSaatMetni\(ilan\.kontrolZamani\)/);
  assert.match(ONAY, /Kural sürümü:\{' '\}\s*\{ilan\.kuralSurumu \?\? 'bilinmiyor'\}/);
});

test('yönetici kuyruğunda "Kontrolü tamamlanamayanlar" ve "Son kararlar" bölümleri', () => {
  assert.match(ONAY, /Kontrolü tamamlanamayanlar/);
  assert.match(ONAY, /<KontrolBekleyenBolumu bekleyenler=\{kontrolBekleyenler\} \/>/);
  for (const alan of ['b.denemeler', 'b.sonrakiDeneme', 'b.sonHata']) assert.ok(ONAY.includes(alan), alan);

  assert.match(ONAY, /Son kararlar/);
  assert.match(ONAY, /<SonKararlarBolumu\s+kararlar=\{sonKararlar\}/);
  /* Kapsam: değişiklik kararları ve bekleyen değişiklik kontrolleri ayrı etiketli. */
  assert.match(ONAY, /k\.kapsam === 'degisiklik' && <Etiket renk="uyari">Değişiklik<\/Etiket>/);
  assert.match(ONAY, /b\.kapsam === 'degisiklik' \? 'yayındaki ilanın değişikliği' : 'ilan'/);
  assert.match(ONAY, /kararEtiketi\(k\.karar\)/);
  assert.match(ONAY, /<GerekceListesi ham=\{k\.gerekceler\} \/>/);
  assert.match(ONAY, /k\.kuralSurumu/);
  assert.match(ONAY, /tarihSaatMetni\(k\.zaman\)/);

  assert.deepEqual(KARAR_ETIKETI, {
    yayinla: 'Otomatik yayınlandı',
    duzeltme: 'Düzeltmeye döndü',
    inceleme: 'İncelemeye düştü',
    hata: 'Kontrol hatası',
    yonetici_onay: 'Yönetici onayladı',
    yonetici_ret: 'Yönetici reddetti',
    yonetici_kaldirdi: 'Yönetici yayından kaldırdı',
    degisiklik_onay: 'Değişikliği yönetici onayladı',
    degisiklik_ret: 'Değişikliği yönetici reddetti',
  });
  assert.equal(kararEtiketi('bilinmeyen'), 'bilinmeyen', 'uydurma etiket yok');
});

test('yönetici kararları sunucudaki gerekçeli işlemlerden; tabloya doğrudan yazım yok', () => {
  /* Onay eski yoldan; ŞİRKET ilanında ret artık gerekçeli işlem. */
  assert.match(ONAY, /await ilanKarariVer\(ilan\.id, karar, ilan\.guncellendi\)/);
  assert.match(ONAY, /onClick=\{\(\) => \(sirketIlani \? setRetAcik\(\(a\) => !a\) : karar\('reddet'\)\)\}/);
  assert.match(ONAY, /ilanGerekceyleReddet\(i\.id, g\)/);
  assert.match(ONAY, /ilanDegisikligiKarari\(d\.id, 'onayla'\)/);
  assert.match(ONAY, /ilanDegisikligiKarari\(d\.id, 'reddet', g\)/);
  assert.match(ONAY, /ilanYayindanKaldir\(id, g\)/);
  assert.match(YONETIM_ILANLAR, /await ilanYayindanKaldir\(ilan\.id, g\)/);
  for (const [ad, kod] of [
    ['OnaySayfasi', ONAY],
    ['IlanlarSayfasi', YONETIM_ILANLAR],
    ['GerekceliKarar', GEREKCELI],
  ]) {
    assert.doesNotMatch(kod, /ilanDurumuDegistir|archiveListing|publishListing|\.update\(|\.rpc\(/, ad);
  }
  /* Yayından kaldırma yalnız yayındaki ŞİRKET ilanında. */
  assert.match(YONETIM_ILANLAR, /ilan\.durum === 'published' && ilan\.kaynak === 'employer_posted'/);
  assert.match(ONAY, /İlanı sitede aç/);
});

test('gerekçe zorunlu (en az 10 karakter), şirkete gösterileceği söyleniyor; kaldırmada ikinci adım', () => {
  assert.equal(GEREKCE_EN_AZ, 10);
  assert.equal(gerekceYeterli('kısa'), false);
  assert.equal(gerekceYeterli('   123456789   '), false);
  assert.equal(gerekceYeterli('1234567890'), true);
  assert.match(GEREKCELI, /const hazir = gerekceYeterli\(gerekce\) && \(!onaySorusu \|\| onay\);/);
  assert.match(GEREKCELI, /disabled=\{!hazir \|\| gonderiliyor\}/);
  assert.match(GEREKCELI, /const kilit = React\.useRef\(false\);/);
  assert.match(ONAY, /Şirket bu metni kendi panelinde, ilanın altında aynen görecek\. En az 10 karakter\./);
  /* Yayından kaldırma iki adım: onay kutusu olmadan düğme açılmıyor. */
  assert.equal((ONAY.match(/onaySorusu="İlanın şimdi yayından kalkacağını ve gerekçenin şirkete gösterileceğini anladım\."/g) ?? []).length, 1);
  assert.match(YONETIM_ILANLAR, /onaySorusu="İlanın şimdi yayından kalkacağını ve gerekçenin şirkete gösterileceğini anladım\."/);
});

test('incelemedeki değişiklik: yalnız değişen alanlar, uzun metin önce/sonra', () => {
  const fark = icerikFarki(
    { title: 'A', city: 'İstanbul', description: 'x'.repeat(100), is_paid: true },
    { title: 'A', city: 'Ankara', description: 'y'.repeat(100), is_paid: true, yeni_alan: 'z' },
  );
  assert.deepEqual(fark.map((f) => f.alan), ['city', 'description', 'yeni_alan']);
  assert.deepEqual(fark[0], { alan: 'city', ad: 'Şehir', once: 'İstanbul', sonra: 'Ankara', uzun: false });
  assert.equal(fark[1].uzun, true);
  assert.equal(fark[2].ad, 'yeni_alan', 'bilinmeyen alan ham adıyla, kaybolmadan');
  assert.deepEqual(icerikFarki({ is_paid: true }, { is_paid: false })[0].sonra, 'Ücretsiz');
  assert.match(ONAY, /İncelemedeki değişiklikler/);
  assert.match(ONAY, /const fark = icerikFarki\(d\.canli, d\.bekleyen\);/);
  assert.match(ONAY, /'Değişikliği onayla'|>\s*Değişikliği onayla\s*</);
  assert.match(ONAY, /<GerekceListesi ham=\{d\.kontrolGerekceleri\} \/>/);
});

test('yeniden deneme işinin sağlığı: gecikme ya da eski son çalışma uyarı veriyor, süre sözü yok', () => {
  const simdi = new Date('2026-10-04T12:00:00Z');
  assert.equal(yenidenDenemeSagligi({ sonCalisma: '2026-10-04T11:30:00Z', gecikmisKontroller: 0 }, 2, simdi).uyari, false);
  assert.equal(yenidenDenemeSagligi({ sonCalisma: '2026-10-04T11:30:00Z', gecikmisKontroller: 1 }, 2, simdi).uyari, true);
  assert.equal(yenidenDenemeSagligi({ sonCalisma: '2026-10-04T09:00:00Z', gecikmisKontroller: 0 }, 1, simdi).uyari, true);
  assert.equal(yenidenDenemeSagligi({ sonCalisma: null, gecikmisKontroller: 0 }, 1, simdi).uyari, true, 'hiç çalışmadı');
  /* Bekleyen kontrol yoksa eski son çalışma sorun değil. */
  assert.equal(yenidenDenemeSagligi({ sonCalisma: null, gecikmisKontroller: 0 }, 0, simdi).uyari, false);
  assert.equal(
    IS_UYARISI,
    "Yeniden deneme işi gecikiyor ya da çalışmıyor; GitHub Actions'taki 'İlan kontrolü yeniden deneme' işini kontrol et.",
  );
  assert.match(ONAY, /<YenidenDenemeSatiri is=\{kuyruk\.yenidenDenemeIsi\} bekleyenSayisi=\{kontrolBekleyenler\.length\} \/>/);
  assert.match(ONAY, /'hiç çalışmadı'/);
});

test('site metinleri yeni akışı anlatıyor; eski "her ilan incelenir / doğrudan yayında / bir iş günü" kalmadı', () => {
  const SITE = {
    'IsverenLanding': yorumsuz(oku('src/components/IsverenLanding.tsx')),
    'IsverenGirisi': yorumsuz(oku('src/components/IsverenGirisi.tsx')),
    'CorporatePages': yorumsuz(oku('src/components/CorporatePages.tsx')),
    /* SSS metni parça parça dize birleştirmesi; parçalar birleştirilip okunuyor. */
    'isveren-sss': yorumsuz(oku('src/data/isveren-sss.ts')).replace(/'\s*\+\s*'/g, ''),
  };
  for (const [ad, kod] of Object.entries(SITE)) {
    for (const eski of [
      /hiçbir ilan onaysız/i,
      /doğrudan yayına çık/i,
      /biz inceliyoruz/i,
      /bir iş günü içinde/i,
      /önce bizde inceleniyor/i,
      /eşleşmiyorsa önce incelenir/i,
      /onaylanınca öğrenci listesinde/i,
    ]) {
      assert.doesNotMatch(kod, eski, `${ad}: ${eski}`);
    }
    assert.match(kod, /otomatik\s+(olarak\s+)?kontrol ediliyor|otomatik\s+olarak\s+kontrol\s+edilir/, `${ad}: yeni akış`);
    assert.match(kod, /incelemesine\s+(gider|gidiyor)/, `${ad}: şüpheli ilan incelemeye`);
  }
  assert.match(SITE.CorporatePages, /Ekibimiz gerektiğinde yayındaki bir ilanı yayından\s+kaldırabiliyor/);
  assert.match(SITE.CorporatePages, /Ekibimiz gerektiğinde yayındaki bir ilanı yayından kaldırabilir/);
});

test('değişiklik farkında ham şema değerleri yok: formdaki ve ilan sayfasındaki Türkçe etiketler', () => {
  const fark = icerikFarki(
    { work_type: 'On-site', term: 'All Year', is_paid: true, application_deadline: '2026-12-31',
      mandatory_staj_accepted: null },
    { work_type: 'Hybrid', term: 'Summer 2026', is_paid: null, application_deadline: null,
      mandatory_staj_accepted: true },
  );
  const satir = Object.fromEntries(fark.map((f) => [f.alan, `${f.once} → ${f.sonra}`]));
  assert.equal(satir.work_type, 'Ofis → Hibrit');
  assert.equal(satir.term, 'Yıl boyu → Yaz 2026');
  assert.equal(satir.is_paid, 'Ücretli → Belirtilmedi');
  assert.equal(satir.application_deadline, '31.12.2026 → Süresiz');
  assert.equal(satir.mandatory_staj_accepted, 'Belirtilmedi → Kabul ediliyor');
  assert.equal(icerikFarki({ work_type: 'Remote' }, { work_type: 'Hybrid' })[0].once, 'Uzaktan');
  /* Tanınmayan değer uydurulmuyor, olduğu gibi kalıyor. */
  assert.equal(icerikFarki({ term: 'Fall 2027' }, { term: 'All Year' })[0].once, 'Fall 2027');
  for (const f of fark) {
    assert.ok(!/On-site|Hybrid|Remote|All Year|Summer 2026|true|false/.test(`${f.once} ${f.sonra}`), f.alan);
  }
});
