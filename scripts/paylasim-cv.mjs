/**
 * "Deneyimin yokken staj CV'si" gönderi setini üretir.
 *
 * NEDEN BU KONU
 * -------------
 * Staj CV'sinin en zor kısmı "iş deneyimi" başlığı: hiç çalışmamış öğrenci
 * orayı boş bırakıyor ve CV eksik görünüyor. Konu evrensel — hangi bölümde
 * olursa olsun herkesin başına geliyor — ve çözümü somut, yani kartla
 * anlatılabiliyor.
 *
 * KARŞILAŞTIRMA KARTI İŞİN ÖZÜ
 * ----------------------------
 * Üçüncü kart aynı projenin iki yazılışını yan yana koyuyor. Tavsiye
 * cümlesi ("somut yaz") kimseye bir şey öğretmiyor; iki satırı yan yana
 * görmek öğretiyor. Zayıf olan gri, iyi olan mavi — renk de aynı şeyi
 * söylüyor.
 *
 * KAYNAK: SİTENİN KENDİ REHBERİ
 * -----------------------------
 * Örnekler src/data/rehberler.tsx içindeki "staj-cv-nasil-yazilir"
 * rehberinden; yeni örnek uydurulmuyor.
 *
 * Kullanım: npm run paylasim-cv
 */
import {
  ACIK_MAVI,
  CIZGI,
  GRI,
  KENAR,
  MAVI,
  SIYAH,
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

const SERI = 'Staj CV’si';

/**
 * Karşılaştırma bloğu: üstte küçük etiket, altında satırlar.
 * Zayıf örnek gri zeminde, iyi örnek mavi zeminde duruyor.
 */
const blok = (y, etiket, satirlar, { zemin, etiketRengi, yaziRengi }) => {
  const yukseklik = 92 + satirlar.length * 44;
  return `
    <rect x="${KENAR}" y="${y}" width="952" height="${yukseklik}" rx="30" fill="${zemin}"/>
    ${satir(KENAR + 40, y + 58, etiket, { boyut: 27, renk: etiketRengi, kalin: 800, aralik: 1.6 })}
    ${satirlar.map((s, i) => satir(KENAR + 40, y + 110 + i * 44, s, { boyut: 30, renk: yaziRengi })).join('')}
  `;
};

const kapak = () => sarmal(`
  ${ustBant(SERI, '01/05')}

  ${baslik(330, ['“İş deneyimi”', 'bölümü boşsa', 'ne yazarsın?'], { boyut: 88, vurguSatiri: 2 })}

  ${ayrac(700)}

  ${satir(KENAR, 782, 'Çözüm o başlığı zorlamak değil —', { boyut: 34, renk: GRI })}
  ${satir(KENAR, 828, 'yerine ne koyacağını bilmek.', { boyut: 34, renk: GRI })}

  ${altKutu(920, [
    'Aynı projenin iki yazılışı üçüncü kartta.',
    'Fark tek bir soruda: sen ne yaptın?',
  ])}

  ${cagriKutusu(1178, 'Rehberin tamamı', 've staj ilanları:')}
`);

const yerine = () => sarmal(`
  ${ustBant(SERI, '02/05')}

  ${baslik(320, ['Deneyim yerine', 'ne yazılır?'], { boyut: 84, vurguSatiri: 1 })}

  ${ayrac(482)}

  ${siraliSatir(570, '1', 'Okul projeleri', 'Ne yaptığını, hangi aracı kullandığını ve sonucu yaz.', { ilk: true })}
  ${siraliSatir(724, '2', 'Kişisel çalışmalar', 'İşverenin aradığı şey merak ve süreklilik.')}
  ${siraliSatir(878, '3', 'Gönüllü işler ve kulüpler', 'Etkinlik düzenlemek de organizasyon deneyimi.')}
  ${siraliSatir(1032, '4', 'Yarı zamanlı işler', 'Alanınla ilgisi olmasa bile sorumluluk gösteriyor.')}

  ${altKutu(1254, ['Hangi bölümde olursan ol yazacak bir şeyin var.'])}
`);

const karsilastirma = () => sarmal(`
  ${ustBant(SERI, '03/05')}

  ${baslik(320, ['Aynı proje,', 'iki yazılış.'], { boyut: 88, vurguSatiri: 1 })}

  ${ayrac(482)}

  ${blok(570, 'OKUNMAYAN', ['Bitirme projesi', 'Arduino ile çalıştım', 'Grup projesinde yer aldım'], {
    zemin: '#F1F5F9',
    etiketRengi: '#94A3B8',
    yaziRengi: GRI,
  })}

  ${blok(818, 'OKUNAN', [
    'Bitirme projesinde üç kişilik ekipte sensör',
    'verisini toplayan arayüzü yazdım',
    'Arduino ve sensörle sera nemini ölçen düzenek',
    'kurdum; veriyi SD karta kaydettim',
  ], { zemin: ACIK_MAVI, etiketRengi: MAVI, yaziRengi: SIYAH })}

  ${altKutu(1254, ['Fark tek bir soruda: sen ne yaptın?'])}
`);

const kural = () => sarmal(`
  ${ustBant(SERI, '04/05')}

  ${baslik(320, ['Yazarken', 'üç kural.'], { boyut: 88, vurguSatiri: 1 })}

  ${ayrac(482)}

  ${siraliSatir(570, '1', 'Ekip projesinde payını yaz', '“Yer aldım”, hiçbir şey yapmamış olmakla aynı görünüyor.', { ilk: true })}
  ${siraliSatir(724, '2', 'Aracı ve sonucu söyle', 'Hangi program, hangi yöntem, ortaya ne çıktı.')}
  ${siraliSatir(878, '3', 'Alan dışı işi de yaz', 'Devamlılık ve müşteriyle iletişim de deneyimdir.')}

  <rect x="${KENAR}" y="1060" width="952" height="120" rx="30" fill="#F8FAFC" stroke="${CIZGI}" stroke-width="2"/>
  ${satir(KENAR + 40, 1108, 'CV’yi PDF olarak gönder; dosya adı', { boyut: 29, renk: GRI })}
  ${satir(KENAR + 40, 1150, '“AdSoyad-CV.pdf” olsun.', { boyut: 29, renk: GRI })}

  ${altKutu(1254, ['Boş bir başlığı doldurmak yerine dolu olanı öne al.'])}
`);

const kapanis = () =>
  kapanisKarti({
    seri: SERI,
    sayfa: '05/05',
    satirlar: ['Deneyimin yok', 'değil — yazılmamış.'],
    altSatirlar: ['Rehberde bölüme göre neyin öne çıktığı', 've örnek satırların tamamı var.'],
    kutu: [
      'Rehber: stajimvar.com/rehber/staj-cv-nasil-yazilir',
      'Açık staj ilanları da listede — bağlantı profilde.',
    ],
  });

await setiYaz({
  kod: 'staj-cv',
  ad: 'Staj CV’si: deneyimin yokken',
  surum: 'v1',
  metin: [
    'Staj CV’sinin en zor kısmı “iş deneyimi” başlığı. Hiç çalışmamışsan orası boş kalıyor ve CV eksik görünüyor. Çözüm o başlığı zorlamak değil, yerine ne koyacağını bilmek.',
    '',
    'Deneyim yerine yazılabilecekler: okul projeleri, kendi merakınla yaptığın çalışmalar, gönüllü işler ve kulüpler, yarı zamanlı işler.',
    '',
    'Aynı projenin iki yazılışı:',
    '• “Bitirme projesi” — okuyan kişiye hiçbir şey söylemiyor.',
    '• “Bitirme projesinde üç kişilik ekipte sensör verisini toplayan arayüzü yazdım.”',
    '',
    'Fark tek bir soruda: sen ne yaptın? Ekip projesinde bile senin payını yaz — “yer aldım” cümlesi, hiçbir şey yapmamış olmakla aynı görünüyor.',
    '',
    'Bölüme göre neyin öne çıktığı ve örneklerin tamamı rehberde: stajimvar.com/rehber/staj-cv-nasil-yazilir',
  ].join('\n'),
  kartlar: [kapak(), yerine(), karsilastirma(), kural(), kapanis()],
});
