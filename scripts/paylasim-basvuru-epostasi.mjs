/**
 * "Staj başvuru e-postası" gönderi setini üretir.
 *
 * NEDEN BU KONU
 * -------------
 * İlan olmayan şirkete doğrudan yazmak staj bulmanın en çok işe yarayan
 * yolu, ama çoğu e-posta okunmadan kapanıyor. Bu gönderi kaydedilmek için
 * yazıldı: içinde kopyalanabilir bir şablon var, yani insan gönderiyi
 * başvuru yaparken geri açıyor.
 *
 * KAYNAK: SİTENİN KENDİ REHBERİ
 * -----------------------------
 * Şablon ve hatalar src/data/rehberler.tsx içindeki "staj-basvuru-epostasi"
 * rehberinden geliyor. Kartlarda yeni tavsiye uydurulmuyor; rehber
 * taşınabilir hale getiriliyor ve ayrıntı için oraya gönderiliyor.
 *
 * ŞABLON KARTI NEDEN DAKTİLO YAZISIYLA
 * ------------------------------------
 * Şablon eşit aralıklı yazıyla diziliyor: köşeli parantezli boşlukların
 * doldurulacak yer olduğu ilk bakışta anlaşılsın ve kart "kopyala" diye
 * okunsun. Kart ayrıca metnin tamamını taşımıyor — uzun hâli rehberde,
 * kartta okunur kalması daha önemli.
 *
 * Kullanım: npm run paylasim-basvuru-epostasi
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

const SERI = 'Staj başvurusu';
const DAKTILO = 'Consolas, Menlo, monospace';

/** Şablon satırı: eşit aralıklı yazı, kartın kendi satır fonksiyonundan ayrı. */
const kod = (x, y, metin, { renk = SIYAH, kalin = 400 } = {}) =>
  `<text x="${x}" y="${y}" font-family="${DAKTILO}" font-size="27" font-weight="${kalin}" fill="${renk}">${String(metin)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')}</text>`;

const SABLON = [
  'Merhaba,',
  '',
  '[Üniversite] [Bölüm] 3. sınıf öğrencisiyim.',
  'Zorunlu stajım kapsamında [tarih] - [tarih]',
  'arasında 20 iş günü staj yapmam gerekiyor.',
  '',
  '[Şirket] için [somut konu] tarafıyla',
  'ilgileniyorum çünkü [tek cümle sebep].',
  '',
  'Şu ana kadar [proje / program] üzerinde',
  'çalıştım. CV\'mi ekte gönderiyorum.',
  '',
  'Sigortam okulum tarafından yapılacak;',
  'sizden ek bir yükümlülük gerekmiyor.',
  '',
  'Uygun olursanız kısa bir görüşme',
  'yapabilir miyiz?',
];

const kapak = () => sarmal(`
  ${ustBant(SERI, '01/05')}

  ${baslik(330, ['İlan olmayan', 'şirkete yazmak', 'işe yarıyor.'], { boyut: 92, vurguSatiri: 2 })}

  ${ayrac(700)}

  ${satir(KENAR, 782, 'Staj bulmanın en çok sonuç veren yolu bu —', { boyut: 34, renk: GRI })}
  ${satir(KENAR, 828, 'ama çoğu e-posta okunmadan kapanıyor.', { boyut: 34, renk: GRI })}

  ${altKutu(920, [
    'Kopyalanabilir şablon üçüncü kartta.',
    'En sık yapılan dört hata dördüncü kartta.',
  ])}

  ${cagriKutusu(1178, 'Rehberin tamamı', 've staj ilanları:')}
`);

const konu = () => sarmal(`
  ${ustBant(SERI, '02/05')}

  ${baslik(320, ['E-postayı', 'konu satırı', 'açtırıyor.'], { boyut: 84, vurguSatiri: 1 })}

  ${ayrac(600)}

  <rect x="${KENAR}" y="660" width="952" height="112" rx="28" fill="${ACIK_MAVI}"/>
  ${kod(KENAR + 36, 728, 'Staj Başvurusu — [Bölüm] — [Tarih aralığı]', { renk: MAVI, kalin: 700 })}

  ${satir(KENAR, 826, 'Örnek: Staj Başvurusu — Makine Mühendisliği — Temmuz/Ağustos', { boyut: 26, renk: GRI })}

  ${siraliSatir(890, '1', '“Merhaba”, “Staj” ya da boş konu', 'Üçü de doğrudan çöpe gidiyor.', { ilk: true })}
  ${siraliSatir(1044, '2', 'Küçük firmada genel adres yeter', 'Orta ve büyük şirkette insan kaynakları adresini ara.')}

  ${altKutu(1254, ['Bulamazsan LinkedIn’de İK’dan birine kısa mesaj daha hızlı sonuç veriyor.'])}
`);

const sablon = () => sarmal(`
  ${ustBant(SERI, '03/05')}

  ${baslik(300, ['Şablon.'], { boyut: 92, vurguSatiri: 0 })}

  ${ayrac(346)}

  <rect x="${KENAR}" y="420" width="952" height="740" rx="32" fill="#F8FAFC" stroke="${CIZGI}" stroke-width="2"/>
  ${SABLON.map((s, i) => kod(KENAR + 40, 478 + i * 41, s)).join('')}

  ${altKutu(1210, ['Köşeli parantezli yerleri doldur; gerisi olduğu gibi kalabilir.'])}
`);

const hatalar = () => sarmal(`
  ${ustBant(SERI, '04/05')}

  ${baslik(320, ['En sık', 'yapılan hatalar.'], { boyut: 84, vurguSatiri: 1 })}

  ${ayrac(482)}

  ${siraliSatir(570, '1', 'Toplu gönderim', 'Otuz adresi “Kime” satırına yazmak; kimse cevap vermiyor.', { ilk: true })}
  ${siraliSatir(724, '2', 'CV’yi Word olarak eklemek', 'PDF gönder; dosya adı “cv.pdf” değil “AdSoyad-CV.pdf” olsun.')}
  ${siraliSatir(878, '3', 'Sigortadan hiç söz etmemek', 'Sigortayı genelde okul yapıyor; tek cümle işvereni rahatlatıyor.')}
  ${siraliSatir(1032, '4', 'Şirket adını yanlış yazmak', 'Kopyala-yapıştır olduğu ilk satırdan belli oluyor.')}

  ${altKutu(1254, ['Küçük işletmelerin çekincesi çoğu zaman maliyet korkusu.'])}
`);

const kapanis = () =>
  kapanisKarti({
    seri: SERI,
    sayfa: '05/05',
    satirlar: ['Şablonu kaydet,', 'başvururken', 'geri aç.'],
    altSatirlar: ['Rehberde şablonun tam hâli, hataların', 'tamamı ve sık sorulanlar var.'],
    kutu: [
      'Rehber: stajimvar.com/rehber/staj-basvuru-epostasi',
      'Açık staj ilanları da listede — bağlantı profilde.',
    ],
  });

await setiYaz({
  kod: 'basvuru-epostasi',
  ad: 'Staj başvuru e-postası',
  surum: 'v1',
  metin: [
    'İlan olmayan şirkete doğrudan yazmak, staj bulmanın en çok sonuç veren yolu. Ama çoğu e-posta okunmadan kapanıyor — genelde aynı birkaç sebepten.',
    '',
    'Konu satırı: Staj Başvurusu — [Bölüm] — [Tarih aralığı]',
    '“Merhaba”, tek başına “Staj” ya da boş konu satırı doğrudan çöpe gidiyor.',
    '',
    'Sık yapılan hatalar:',
    '• Otuz adresi “Kime” satırına yazmak — herkes birbirini görüyor, kimse cevap vermiyor.',
    '• CV’yi Word olarak eklemek. PDF gönder, adı “AdSoyad-CV.pdf” olsun.',
    '• Sigortadan hiç söz etmemek. Zorunlu stajda sigortayı genelde okul yapıyor; tek cümleyle söylemek tereddüt eden işvereni rahatlatıyor.',
    '• Şirket adını yanlış yazmak.',
    '',
    'Kopyalanabilir şablon üçüncü kartta; tam hâli rehberde: stajimvar.com/rehber/staj-basvuru-epostasi',
  ].join('\n'),
  kartlar: [kapak(), konu(), sablon(), hatalar(), kapanis()],
});
