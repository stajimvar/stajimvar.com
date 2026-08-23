/**
 * "Sık sorulanlar" gönderi setini üretir.
 *
 * NEDEN BU SET
 * ------------
 * Profildeki SSS öne çıkanı boştu ve gelen kişinin ilk soruları hep aynı:
 * başvuruyu nereye yapıyorum, ücretli mi, bu bursta neden tarih yazmıyor.
 * Cevapları bir kere kartlara yazınca hem öne çıkan doluyor hem de
 * mesaj kutusundaki aynı sorular azalıyor.
 *
 * CEVAPLAR SİTENİN GERÇEK DAVRANIŞI
 * ---------------------------------
 * Buradaki her cevap kodun yaptığı şeyle bire bir aynı olmalı; pazarlama
 * cümlesi değil. Örnek: ilan taslak olarak oluşturuluyor ve yayına
 * alınmadan listede görünmüyor (listings.status varsayılanı 'draft').
 * Site davranışı değişirse bu set de güncellenmeli.
 *
 * Kullanım: npm run paylasim-sss
 */
import {
  GRI,
  KENAR,
  altKutu,
  ayrac,
  baslik,
  cagriKutusu,
  maviCagriKarti,
  sarmal,
  satir,
  setiYaz,
  siraliSatir,
  ustBant,
} from './paylasim-sablonu.mjs';

const SERI = 'Sık sorulanlar';

const kapak = () => sarmal(`
  ${ustBant(SERI, '01/04')}

  ${baslik(340, ['En çok', 'sorulan sekiz', 'soru.'], { boyut: 96, vurguSatiri: 2 })}

  ${ayrac(720)}

  ${satir(KENAR, 800, 'Başvuru nereye gidiyor, ücretli mi,', { boyut: 34, renk: GRI })}
  ${satir(KENAR, 846, 'neden bazı burslarda tarih yok?', { boyut: 34, renk: GRI })}

  ${altKutu(940, [
    'Cevaplar sitenin gerçek davranışı.',
    'Değişirse bu kartlar da değişir.',
  ])}

  ${cagriKutusu(1178, 'Tüm liste ve', 'başvuru bağlantıları:')}
`);

const ilkIkisi = () => sarmal(`
  ${ustBant(SERI, '02/04')}

  ${baslik(320, ['Başvuru ve', 'ücret.'], { boyut: 88, vurguSatiri: 1 })}

  ${ayrac(482)}

  ${siraliSatir(570, '1', 'Başvuruyu StajımVar’a mı yapıyorum?', 'Hayır. Bağlantı kurumun kendi sayfasına gider.', { ilk: true })}
  ${siraliSatir(724, '2', 'Aracı var mı, ücret alıyor musunuz?', 'Hayır. Öğrenci tarafında hiçbir ücret yok.')}
  ${siraliSatir(878, '3', 'Üye olmadan bakabilir miyim?', 'Evet, ilanlar ve burslar herkese açık.')}
  ${siraliSatir(1032, '4', 'Başvurumu siz mi iletiyorsunuz?', 'Hayır, başvuruyu kurumun sayfasında sen yaparsın.')}

  ${altKutu(1254, ['Arada kimse yok: bağlantı doğrudan kaynağa gidiyor.'])}
`);

const digerIkisi = () => sarmal(`
  ${ustBant(SERI, '03/04')}

  ${baslik(320, ['Tarih ve', 'liste.'], { boyut: 88, vurguSatiri: 1 })}

  ${ayrac(482)}

  ${siraliSatir(570, '5', 'Neden bazı burslarda tarih yok?', 'Kaynağında yazmıyorsa tarih uydurmuyoruz.', { ilk: true })}
  ${siraliSatir(724, '6', '"Takvim bekleniyor" ne demek?', 'Program açık ama tarihi henüz duyurulmamış.')}
  ${siraliSatir(878, '7', 'Gördüğüm ilan neden kayboldu?', 'Son başvuru tarihi geçen kayıt listeden düşüyor.')}
  ${siraliSatir(1032, '8', 'Şirketim ilan verebilir mi?', 'Evet. İlan taslak açılıyor, yayına alınmadan görünmüyor.')}

  ${altKutu(1254, ['Kaynağı doğrulanmayan kayıt listeye hiç girmiyor.'])}
`);

const kapanis = () =>
  maviCagriKarti({
    seri: SERI,
    sayfa: '04/04',
    satirlar: ['Sorunun', 'cevabı yoksa', 'yaz bize.'],
    altSatirlar: ['Mesaj kutusu açık; eksik kalan soruyu', 'bu listeye ekliyoruz.'],
  });

/* Hikâyede mavi kart kullanılmıyor; dizi açık zeminli bir kapanışla bitiyor. */
const hikayeKapanisi = () => sarmal(`
  ${ustBant(SERI, '04/04')}

  ${baslik(330, ['Sorunun', 'cevabı yoksa', 'yaz bize.'], { boyut: 88, vurguSatiri: 2 })}

  ${ayrac(700)}

  ${satir(KENAR, 782, 'Mesaj kutusu açık; eksik kalan soruyu', { boyut: 34, renk: GRI })}
  ${satir(KENAR, 828, 'bu listeye ekliyoruz.', { boyut: 34, renk: GRI })}

  ${altKutu(920, [
    'Cevaplar sitenin gerçek davranışı.',
    'Site değişirse kartlar da değişiyor.',
  ])}

  ${cagriKutusu(1178, 'Tüm liste ve', 'başvuru bağlantıları:')}
`);

await setiYaz({
  kod: 'sik-sorulanlar',
  ad: 'Sık sorulanlar',
  surum: 'v1',
  metin: [
    'En çok sorulan sorular ve kısa cevapları:',
    '',
    '• Başvuruyu StajımVar’a yapmıyorsun; bağlantı kurumun kendi sayfasına gidiyor.',
    '• Öğrenci tarafında hiçbir ücret yok, üye olmadan da bakabilirsin.',
    '• Bir bursta tarih yazmıyorsa tarihi uydurmuyoruz: kartta "Takvim bekleniyor" yazıyor.',
    '• Son başvuru tarihi geçen kayıt listeden düşüyor.',
    '',
    'Cevabı burada olmayan bir sorun varsa yaz; listeye ekliyoruz.',
    '',
    'Tüm ilanlar ve burslar profildeki bağlantıda.',
  ].join('\n'),
  kartlar: [kapak(), ilkIkisi(), digerIkisi(), kapanis()],
  hikayeEk: [hikayeKapanisi()],
});
