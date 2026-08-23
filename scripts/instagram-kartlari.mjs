/**
 * "Nasıl çalışır" gönderi setini üretir — hesabın sabit tanıtım gönderisi.
 *
 * NEDEN BETİKLE
 * -------------
 * Instagram bir gönderiyi yayınlarken görseli kendi indiriyor: elimizde
 * herkese açık, kalıcı bir adres olmak zorunda. Kartlar burada üretiliyor,
 * public/paylasim/ altına yazılıyor ve siteyle birlikte dağıtılıyor.
 *
 * BU SET ZAMANSIZ
 * ---------------
 * Kartlarda ilan/burs sayısı gibi eskiyen veri yok. Sayı yazan bir kart,
 * sayı her değiştiğinde yeniden üretilip yeniden paylaşılmayı gerektirir;
 * gönderi bir hafta sonra kendi kendine yanlış hale gelir. Tarihe bağlı
 * içerik ayrı bir set: paylasim-burs-takvimi.mjs.
 *
 * Tasarımın kendisi scripts/paylasim-sablonu.mjs içinde.
 *
 * Kullanım: npm run instagram-kartlari
 */
import {
  CIZGI,
  GRI,
  KENAR,
  KENAR_MAVI,
  MAVI,
  SIYAH,
  altKutu,
  ayrac,
  baslik,
  kapanisKarti,
  sarmal,
  satir,
  setiYaz,
  siraliSatir,
  ustBant,
} from './paylasim-sablonu.mjs';

const SERI = 'Nasıl çalışır';

/*
  KAPAKTAKİ ÇİZİM

  Hazır görsel indirilmiyor: hem hakkı belirsiz görsellerle uğraşmamak hem
  de kartların aynı dilde durması için. Biçim düz — kalın dış çizgi, tek
  renk mavi daire, beyaz yüzey — küçültülünce dağılmıyor. Anlattığı şey
  kartın cümlesiyle aynı: ilan şirketin kendi sayfasında duruyor ve
  başvuru bağlantısı oraya gidiyor.
*/
const ilanCizimi = (y) => `
  <circle cx="806" cy="${y + 186}" r="196" fill="${MAVI}"/>

  <rect x="${KENAR}" y="${y}" width="700" height="372" rx="32" fill="#FFFFFF" stroke="${SIYAH}" stroke-width="7"/>
  <path d="M${KENAR} ${y + 86} h700" stroke="${SIYAH}" stroke-width="7"/>
  <circle cx="${KENAR + 48}" cy="${y + 44}" r="11" fill="${SIYAH}"/>
  <circle cx="${KENAR + 86}" cy="${y + 44}" r="11" fill="${SIYAH}"/>
  <circle cx="${KENAR + 124}" cy="${y + 44}" r="11" fill="${SIYAH}"/>

  <circle cx="${KENAR + 106}" cy="${y + 168}" r="38" fill="${MAVI}"/>
  <rect x="${KENAR + 168}" y="${y + 146}" width="318" height="22" rx="11" fill="${SIYAH}"/>
  <rect x="${KENAR + 168}" y="${y + 182}" width="204" height="16" rx="8" fill="${CIZGI}"/>

  <circle cx="${KENAR + 106}" cy="${y + 280}" r="38" fill="${KENAR_MAVI}"/>
  <rect x="${KENAR + 168}" y="${y + 258}" width="252" height="22" rx="11" fill="${SIYAH}"/>
  <rect x="${KENAR + 168}" y="${y + 294}" width="168" height="16" rx="8" fill="${CIZGI}"/>

  <rect x="${KENAR + 520}" y="${y + 236}" width="170" height="64" rx="32" fill="${MAVI}"/>
  ${satir(KENAR + 605, y + 278, 'Başvur', { boyut: 26, renk: '#FFFFFF', kalin: 800, hiza: 'middle' })}

  <circle cx="878" cy="${y + 24}" r="70" fill="${SIYAH}"/>
  <path d="M846 ${y + 24} l22 24 42 -46" stroke="#FFFFFF" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
`;

const kapak = () => sarmal(`
  ${ustBant(SERI, '01/04')}

  ${baslik(320, ['İlanları aracı', 'sitelerden değil,', 'şirketin kendi', 'sayfasından.'], { boyut: 88, vurguSatiri: 3 })}

  ${ayrac(690)}

  ${satir(KENAR, 766, 'Her ilanda şirketin kendi başvuru', { boyut: 34, renk: GRI })}
  ${satir(KENAR, 812, 'bağlantısı var; arada kimse yok.', { boyut: 34, renk: GRI })}

  ${ilanCizimi(860)}

  ${altKutu(1254, ['Kaynağı doğrulanmayan kayıt listeye girmiyor.'])}
`);

const nasil = () => sarmal(`
  ${ustBant(SERI, '02/04')}

  ${baslik(316, ['Bir ilan listeye', 'nasıl giriyor?'], { boyut: 88, vurguSatiri: 1 })}

  ${ayrac(482)}

  ${siraliSatir(570, '1', 'Şirketin kariyer sayfası taranır', 'Aracı ilan sitesi kullanılmıyor.', { ilk: true })}
  ${siraliSatir(724, '2', 'Başvuru bağlantısı şirkete gider', 'Başvurunu şirketin kendi sayfasında yaparsın.')}
  ${siraliSatir(878, '3', 'Takvim bilinmiyorsa öyle yazar', '"Takvim bekleniyor" görürsün, uydurma tarih görmezsin.')}
  ${siraliSatir(1032, '4', 'Süresi geçen ilan düşer', 'Eski ilan listede kalmaz.')}

  ${altKutu(1254, ['Her kaydın yanında resmî kaynağı yazılı.'])}
`);

const neVar = () => sarmal(`
  ${ustBant(SERI, '03/04')}

  ${baslik(316, ['Staj, burs ve', 'yurt dışı — hepsi', 'tek listede.'], { boyut: 84, vurguSatiri: 2 })}

  ${ayrac(600)}

  ${siraliSatir(688, '1', 'Staj ve iş ilanları', 'Şirketin kendi kariyer sayfasından.', { ilk: true })}
  ${siraliSatir(842, '2', 'Burslar ve öğrenci destekleri', 'Vakıf, dernek, belediye ve kurum bursları.')}
  ${siraliSatir(996, '3', 'Yurt dışı programları', 'Erasmus, staj ve araştırma programları.')}

  ${altKutu(1254, ['Hepsi tek listede, hepsi resmî kaynağıyla.'])}
`);

const kapanis = () =>
  kapanisKarti({
    seri: SERI,
    sayfa: '04/04',
    satirlar: ['Yeni ilan ve', 'burslar burada', 'duyurulacak.'],
    altSatirlar: ['Staj ilanları, burslar, KYK ve yurt dışı', 'programları — hepsi resmî kaynağıyla.'],
    kutu: ['Kaynağı doğrulanmayan kayıt listeye girmiyor.', 'Tarihi doğrulanmayan kayda tarih yazılmıyor.'],
  });

await setiYaz({
  kod: 'nasil-calisir',
  ad: 'Nasıl çalışır',
  surum: 'v6',
  metin: [
    'İlanları aracı sitelerden değil, şirketlerin kendi kariyer sayfalarından derliyoruz.',
    '',
    'Her ilanda şirketin kendi başvuru bağlantısı var; arada kimse yok. Burslarda da aynı kural geçerli: kaynağı doğrulanmayan kayıt listeye girmiyor, tarihi doğrulanmayan kayda tarih yazılmıyor — "Takvim bekleniyor" yazıyor.',
    '',
    'Staj ilanları, burslar, KYK ve yurt dışı programları tek listede. Bağlantı profilde.',
  ].join('\n'),
  kartlar: [kapak(), nasil(), neVar(), kapanis()],
});
