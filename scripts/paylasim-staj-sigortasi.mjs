/**
 * "Staj sigortasını kim yapar?" gönderi setini üretir.
 *
 * Kaynak: src/data/rehber-yazilari/staj.tsx içindeki aynı adlı rehber.
 * Bu seri tutar veya her okul için kesin kural uydurmaz: zorunlu ve gönüllü
 * staj ayrımını anlatır, kesin cevabı okul yönergesi ve yazılı teyide bırakır.
 *
 * Kullanım: npm run paylasim-staj-sigortasi
 */
import {
  GRI,
  KENAR,
  altKutu,
  ayrac,
  baslik,
  cagriKutusu,
  kapanisKarti,
  sarmal,
  satir,
  setiYaz,
  siraliSatir,
  ustBant,
} from './paylasim-sablonu.mjs';

const SERI = 'Staj rehberi';
const ETIKETLER = [
  '#stajsigortasi',
  '#zorunlustaj',
  '#gonullustaj',
  '#stajbasvurusu',
  '#stajrehberi',
  '#universiteogrencisi',
  '#sgk',
  '#stajyer',
];

const kapak = () => sarmal(`
  ${ustBant(SERI, '01/04')}
  ${baslik(330, ['Staj sigortasını', 'kim yapar?'], { boyut: 88, vurguSatiri: 1 })}
  ${ayrac(590)}
  ${satir(KENAR, 680, 'Cevap stajın türüne göre değişiyor.', { boyut: 36, renk: GRI })}
  ${satir(KENAR, 728, 'En önemli ayrım: zorunlu mu, gönüllü mü?', { boyut: 36, renk: GRI })}
  ${altKutu(900, [
    'Zorunlu stajda sigortayı genellikle okul yapar.',
    'Gönüllü stajda otomatik olarak devreye girmez.',
  ])}
  ${cagriKutusu(1178, 'Başlamadan önce', 'yazılı teyit al:')}
`);

const zorunlu = () => sarmal(`
  ${ustBant(SERI, '02/04')}
  ${baslik(320, ['Zorunlu stajda', 'ilk durak okul.'], { boyut: 88, vurguSatiri: 1 })}
  ${ayrac(570)}
  ${siraliSatir(660, '1', 'Staj formunu okuldan al', 'Yönergedeki tarih ve iş günü şartlarını kontrol et.', { ilk: true })}
  ${siraliSatir(814, '2', 'İşyerine imzalat', 'İmza ve tarihler okulun istediği biçimde olmalı.')}
  ${siraliSatir(968, '3', 'Okula zamanında teslim et', 'Sigorta girişini okul genellikle bu belgeyle başlatır.')}
  ${altKutu(1254, ['Kendi okulunun staj yönergesi kesin kaynaktır.'])}
`);

const gonullu = () => sarmal(`
  ${ustBant(SERI, '03/04')}
  ${baslik(320, ['Gönüllü stajda', 'varsayım yapma.'], { boyut: 88, vurguSatiri: 1 })}
  ${ayrac(570)}
  ${satir(KENAR, 650, 'Gönüllü staj, müfredatın zorunlu parçası değil.', { boyut: 34, renk: GRI })}
  ${satir(KENAR, 696, 'Bu yüzden okulun sigortası otomatik başlamayabilir.', { boyut: 34, renk: GRI })}
  ${siraliSatir(790, '1', 'Okuluna yazılı sor', 'Bu staj için form ve sigorta işlemi var mı?', { ilk: true })}
  ${siraliSatir(944, '2', 'İşyerine yazılı sor', 'Sigorta sorumluluğunu başlamadan netleştir.')}
  ${altKutu(1180, ['Sözlü "hallederiz" cevabı yerine yazılı teyit iste.'])}
`);

const kapanis = () => kapanisKarti({
  seri: SERI,
  sayfa: '04/04',
  satirlar: ['Staja sigortasız', 'başlama.'],
  vurguSatiri: 1,
  altSatirlar: ['Giriş, stajın ilk gününden önce yapılmış olmalı.', 'Tarih ve evrakı okulunla yazılı teyit et.'],
  kutu: [
    'Rehberin tamamı: stajimvar.com/rehber/staj-sigortasi-kim-yapar',
    'Zorunlu ve gönüllü stajdaki farkları ayrıntılı oku.',
  ],
});

await setiYaz({
  kod: 'staj-sigortasi',
  ad: 'Staj sigortasını kim yapar?',
  surum: 'v1',
  metin: [
    'Staj sigortasında tek bir cevap yok: zorunlu ve gönüllü stajda süreç farklı işliyor.',
    '',
    '• Zorunlu stajda sigorta girişini genellikle okul yapar; kesin cevap okulunun staj yönergesindedir.',
    '• Gönüllü stajda okulun sigortası otomatik devreye girmez. Okuluna ve işyerine yazılı sor.',
    '• Formu ve tarihleri zamanında teslim et; sigorta girişi yapılmadan staja başlama.',
    '',
    'Rehberin tamamı: stajimvar.com/rehber/staj-sigortasi-kim-yapar',
  ].join('\n'),
  etiketler: ETIKETLER,
  kartlar: [kapak(), zorunlu(), gonullu(), kapanis()],
});
