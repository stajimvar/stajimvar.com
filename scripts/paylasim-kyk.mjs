/**
 * "KYK: burs mu, kredi mi?" gönderi setini üretir.
 *
 * NEDEN BU KONU
 * -------------
 * Mevsimi: YKS yerleştirme sonuçlarının ardından KYK başvuruları açılıyor
 * ve süre kısa. En yaygın karışıklık da burada — "KYK aldım" diyen çoğu
 * öğrenci aslında KREDİ alıyor ve mezun olunca geri ödeyeceğini geç fark
 * ediyor. Bu ayrımı bilmek doğrudan para meselesi, o yüzden kaydedilen
 * türden bir içerik.
 *
 * KAYNAK: SİTENİN KENDİ REHBERİ
 * -----------------------------
 * Kartlardaki her madde src/data/rehberler.tsx içindeki
 * "kyk-burs-ve-kredi" rehberinden geliyor. Gönderi yeni bilgi uydurmuyor,
 * var olan içeriği taşınabilir hale getiriyor; ayrıntı için rehbere
 * gönderiyor.
 *
 * TUTAR YAZMIYORUZ
 * ----------------
 * Rehberin kendi kuralı: burs ve kredi tutarları her yıl yeniden
 * belirleniyor, sabit bir rakam bir süre sonra yanlış bilgi oluyor. Aynı
 * kural kartlar için de geçerli — üstelik gönderi düzeltilemiyor, sadece
 * silinebiliyor.
 *
 * Kullanım: npm run paylasim-kyk
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

const SERI = 'KYK rehberi';

const kapak = () => sarmal(`
  ${ustBant(SERI, '01/04')}

  ${baslik(330, ['KYK’da burs', 've kredi aynı', 'şey değil.'], { boyut: 92, vurguSatiri: 2 })}

  ${ayrac(700)}

  ${satir(KENAR, 782, '“KYK aldım” diyen çoğu öğrenci aslında', { boyut: 34, renk: GRI })}
  ${satir(KENAR, 828, 'kredi alıyor — geri ödemeli olanı.', { boyut: 34, renk: GRI })}

  ${altKutu(920, [
    'Burs: geri ödemesi yok, kontenjanı sınırlı.',
    'Öğrenim kredisi: mezuniyetten sonra geri ödeniyor.',
  ])}

  ${cagriKutusu(1178, 'Ayrıntılı rehber', 've tüm burslar:')}
`);

const fark = () => sarmal(`
  ${ustBant(SERI, '02/04')}

  ${baslik(320, ['Aradaki fark', 'tam olarak ne?'], { boyut: 84, vurguSatiri: 1 })}

  ${ayrac(482)}

  ${siraliSatir(570, '1', 'Burs geri ödenmiyor', 'Kontenjan sınırlı, belirli önceliklere göre veriliyor.', { ilk: true })}
  ${siraliSatir(724, '2', 'Öğrenim kredisi geri ödemeli', 'Mezuniyetten sonra, kanundaki süre dolunca taksitle.')}
  ${siraliSatir(878, '3', 'Başvuru genelde tek form', 'Bursa hak kazanamayan öğrenci kredi için değerlendirilebiliyor.')}
  ${siraliSatir(1032, '4', 'Barınma kredisi ayrı', 'Yurtta kalmayanlar için; yurt başvurusu da ayrı süreç.')}

  ${altKutu(1254, ['Tutar yazmıyoruz: her yıl değişiyor, sabit rakam yanlış bilgi olur.'])}
`);

const takvim = () => sarmal(`
  ${ustBant(SERI, '03/04')}

  ${baslik(320, ['Ne zaman', 'başvurulur,', 'ne zaman kesilir?'], { boyut: 76, vurguSatiri: 2 })}

  ${ayrac(560)}

  ${satir(KENAR, 640, 'Başvurular genelde yerleştirme sonuçlarından', { boyut: 32, renk: GRI })}
  ${satir(KENAR, 684, 'sonra, güz dönemi başlamadan alınıyor ve süre kısa.', { boyut: 32, renk: GRI })}

  ${siraliSatir(750, '1', 'Kayıt dondurmak veya ilişik kesmek', 'Öğrencilik durumu bitince destek de bitiyor.', { ilk: true })}
  ${siraliSatir(904, '2', 'Öğrenim süresini aşmak', 'Normal süre dolduğunda kesiliyor.')}
  ${siraliSatir(1058, '3', 'Aynı nitelikte başka kamu desteği', 'İki kamu desteği birlikte alınamıyor.')}

  ${altKutu(1254, ['Beyan edilen bilgi gerçeğe aykırı çıkarsa da kesiliyor.'])}
`);

const kapanis = () =>
  kapanisKarti({
    seri: SERI,
    sayfa: '04/04',
    satirlar: ['Güncel takvim', 've tutar için', 'resmî kaynak.'],
    altSatirlar: ['Rakamlar her yıl değişiyor; kartta yazmıyoruz.', 'Duyuruları GSB ve e-Devlet üzerinden takip et.'],
    kutu: [
      'Rehberin tamamı: stajimvar.com/rehber/kyk-burs-ve-kredi',
      'Burs ve kredi dışındaki destekler de listede.',
    ],
  });

await setiYaz({
  kod: 'kyk-burs-kredi',
  ad: 'KYK: burs mu, kredi mi?',
  surum: 'v1',
  metin: [
    'KYK’da burs ile öğrenim kredisi aynı şey değil — “KYK aldım” diyen çoğu öğrenci aslında krediyi alıyor.',
    '',
    '• Burs: geri ödemesi yok, kontenjanı sınırlı.',
    '• Öğrenim kredisi: mezuniyetten sonra, kanundaki süre dolunca taksitle geri ödeniyor.',
    '• Başvuru genelde tek form; bursa hak kazanamayan öğrenci kredi için değerlendirilebiliyor.',
    '• Barınma kredisi ayrı bir destek ve yurt başvurusu da ayrı bir süreç.',
    '',
    'Tutar yazmıyoruz: rakamlar her yıl yeniden belirleniyor, sabit bir sayı bir süre sonra yanlış bilgi oluyor. Güncel takvim ve tutar için Gençlik ve Spor Bakanlığı ile e-Devlet duyurularına bak.',
    '',
    'Rehberin tamamı: stajimvar.com/rehber/kyk-burs-ve-kredi',
  ].join('\n'),
  kartlar: [kapak(), fark(), takvim(), kapanis()],
});
