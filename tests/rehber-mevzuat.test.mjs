import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const staj = readFileSync('src/data/rehber-yazilari/staj.tsx', 'utf8');
const arac = readFileSync('src/components/Araclar.tsx', 'utf8');

/*
  BU TEST NEYİ KORUYOR

  Rehberlerde mevzuata değen üç yanlış vardı ve üçü de okuyucuyu yanlış
  yönlendiriyordu:

  1. Sigorta rehberi "işyerine ek bir yükümlülük çıkmaz" diyordu. Primi
     okulun ödemesi MALİYETİ kaldırıyor, SORUMLULUĞU değil: 6331 sayılı
     Kanun m.2 "çırak ve stajyerler de dâhil olmak üzere tüm çalışanlara"
     uygulanıyor ve 3308 m.25 işyerinin kusuru hâlindeki iş kazasından
     işvereni sorumlu tutuyor. Bu cümle işvereni "benim sorumluluğum yok"
     diye rahatlatıyordu.

  2. Ücret rehberi "Hesabın tabanı: yürürlükteki brüt asgari ücret" diyordu.
     3308 m.25 açıkça "asgari ücretin NET tutarı" diyor. Brütten hesaplamak
     alt sınırı olduğundan yüksek gösteriyordu.

  3. "Büyük şirketlerin ödediği tutar çoğu zaman alt sınırın belirgin
     şekilde üstünde" ve araçtaki "çoğu zaman ödüyor" kaynaksız
     genellemelerdi.

  Kaynaklar da kurum ANA SAYFALARIYDI (sgk.gov.tr, meb.gov.tr): "resmî
  kaynaklı" iddiasını doğrulanamaz bırakıyordu.
*/

test('sigorta rehberi işverenin sorumluluğunu kaldırmıyor', () => {
  assert.doesNotMatch(
    staj,
    /işyerine ek bir yükümlülük çıkmaz/,
    'primi okulun ödemesi işverenin İSG sorumluluğunu kaldırmıyor',
  );
  assert.match(staj, /6331 sayılı/, 'İSG Kanunu anılmalı');
  assert.match(
    staj,
    /çırak ve stajyerler de dâhil/,
    'kanunun kapsam cümlesi doğrudan alıntılanmalı',
  );
  assert.match(staj, /işyerinin kusuru/, '3308 m.25 sorumluluk cümlesi geçmeli');
});

test('ücret rehberi net asgari ücret diyor, brüt demiyor', () => {
  assert.doesNotMatch(
    staj,
    /Hesabın tabanı: yürürlükteki brüt asgari ücret/,
    '3308 m.25 net tutarı esas alıyor',
  );
  assert.match(staj, /asgari ücretin NET tutarı/);
});

test('kaynaksız genellemeler kaldırıldı', () => {
  assert.doesNotMatch(staj, /çoğu zaman yasal alt sınırın belirgin şekilde üstünde/);
  assert.doesNotMatch(arac, /daha fazlasını ödeyebilir ve çoğu\s*\n?\s*zaman ödüyor/);
});

/** Tek bir rehberin gövdesini slug'ından kesip alır. */
function rehberBlogu(slug) {
  const bas = staj.indexOf(`slug: '${slug}'`);
  assert.ok(bas > 0, `${slug} bulunamadı`);
  const sonraki = staj.indexOf('slug: ', bas + 10);
  return staj.slice(bas, sonraki > 0 ? sonraki : undefined);
}

test('iki rehberin kaynakları kurum ana sayfası değil, doğrudan belge', () => {
  /*
    Kapsam bu sprintte adı geçen iki rehber. Aynı dosyadaki üç rehber daha
    kurum ana sayfasına bağlanıyor (staj-basvurusu-gerekli-belgeler,
    stajyerin-gorev-ve-sorumluluklari, kotu-gecen-stajda-ne-yapilir); onlar
    için doğru belge adresini ayrıca doğrulamak gerekiyor, uydurulmuş bir
    bağlantı ana sayfadan daha kötü olurdu.
  */
  const anaSayfalar = [
    "adres: 'https://www.sgk.gov.tr'",
    "adres: 'https://www.meb.gov.tr'",
    "adres: 'https://www.csgb.gov.tr'",
    "adres: 'https://www.turkiye.gov.tr'",
  ];
  for (const slug of ['staj-sigortasi-kim-yapar', 'staj-ucreti-nasil-hesaplanir']) {
    const blok = rehberBlogu(slug);
    for (const kok of anaSayfalar)
      assert.ok(!blok.includes(kok), `${slug}: ${kok} doğrudan belge adresiyle değiştirilmeli`);
  }

  assert.match(staj, /mevzuat\.gov\.tr\/mevzuatmetin\/1\.5\.6331\.pdf/);
  assert.match(staj, /mevzuat\.gov\.tr\/mevzuatmetin\/1\.5\.3308\.pdf/);
  assert.match(staj, /resmigazete\.gov\.tr\/eskiler\/2025\/12\/20251226-6\.pdf/);
});

test('mevzuata değen rehberlerde tarih ve gözden geçiren var', () => {
  for (const [ad, metin] of [
    ['sigorta', rehberBlogu('staj-sigortasi-kim-yapar')],
    ['ücret', rehberBlogu('staj-ucreti-nasil-hesaplanir')],
  ]) {
    assert.match(metin, /guncelleme: '2026-09-03'/, `${ad} rehberinde tarih olmalı`);
    assert.match(metin, /inceleyen:/, `${ad} rehberinde gözden geçiren olmalı`);
  }
});

test('araç ile rehber aynı oranı söylüyor', () => {
  /* İkisi de lib/asgari-ucret.mjs'ten besleniyor; rehber metni de aynı sayıyı yazmalı. */
  const konfig = readFileSync('src/lib/asgari-ucret.mjs', 'utf8');
  assert.match(konfig, /kucukIsyeri: 15/);
  assert.match(konfig, /buyukIsyeri: 30/);
  assert.match(staj, /yüzde 15’i, yirmi ve üzerinde yüzde 30’u/);
});
