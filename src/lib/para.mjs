/**
 * Para girdisini ayrıştırma ve kuruş aritmetiği.
 *
 * NEDEN AYRI BİR MODÜL
 * --------------------
 * Staj ücreti aracında tutar `Number(metin.replace(/[^\d]/g, ''))` ile
 * okunuyordu. Bu, ondalık ayırıcıyı da siliyor: "28075,50" önce "2807550"
 * oluyor, sonra yüzde 15'i 421.132,50 TL çıkıyordu — doğrusunun tam yüz katı.
 * Öğrenciye "işveren sana en az 421 bin lira ödemeli" diyen bir araç, hesap
 * makinesi değil yanlış bilgi kaynağıdır.
 *
 * Ayırıcı kararı ve kuruş aritmetiği burada tek yerde; araç, rehber ve
 * testler aynı işlevi çağırıyor.
 *
 * ONDALIK AYIRICI KARARI
 * ----------------------
 * Türkçe yazımda binlik nokta, ondalık virgüldür; ama kullanıcı klavyeden
 * "28075.50" da yazıyor. İkisi de kabul ediliyor. Kural:
 *
 *   İki ayırıcı da varsa  → SAĞDAKİ ondalıktır, soldaki binliktir
 *   Tek ayırıcı bir kez   → ardından 3 hane geliyorsa BİNLİK ("28.075"),
 *                           1-2 hane geliyorsa ONDALIK ("28075,50")
 *   Tek ayırıcı çok kez   → hepsi binlik, her grup tam 3 hane olmalı
 *
 * "28,075" bu kurala göre 28075 okunuyor. Para üç haneli kuruşla yazılmaz;
 * üç hane gördüğümüzde binlik saymak, kullanıcının 28 lira 75 kuruş demek
 * istediğini varsaymaktan daha güvenli.
 *
 * KURUŞ ARİTMETİĞİ
 * ----------------
 * Tutar tam sayı kuruş olarak tutuluyor. Ondalık kayan noktayla yüzde almak
 * kuruşta sapma üretiyor (0.1 + 0.2 problemi); tam sayıda üretmiyor.
 */

/** Para için üst sınır: 10 milyon TL. Üstü veri girişi hatasıdır. */
export const UST_SINIR_KURUS = 10_000_000_00;

/**
 * Metni kuruşa çevirir.
 *
 * @returns {{gecerli: boolean, kurus: number|null, hata: string|null}}
 * `gecerli` false ise ÇAĞIRAN SONUÇ GÖSTERMEMELİ — yarım bir sayı üretip
 * ekrana basmak, hatayı sessizce doğru gibi sunmak olur.
 */
export function paraCoz(girdi) {
  const ham = String(girdi ?? '').trim();
  if (!ham) return { gecerli: false, kurus: null, hata: 'Tutar gir.' };

  if (/^[+-]/.test(ham) && ham.startsWith('-'))
    return { gecerli: false, kurus: null, hata: 'Tutar negatif olamaz.' };

  /* Boşluk da binlik ayırıcı olarak kullanılıyor: "28 075,50". */
  const metin = ham.replace(/^\+/, '').replace(/[\s ]/g, '');

  if (!/^[\d.,]+$/.test(metin))
    return { gecerli: false, kurus: null, hata: 'Tutar yalnızca rakam içermeli.' };

  const nokta = (metin.match(/\./g) || []).length;
  const virgul = (metin.match(/,/g) || []).length;

  let tamKisim;
  let ondalikKisim = '';

  if (nokta > 0 && virgul > 0) {
    /* İkisi de var: sağdaki ondalık, soldaki binlik. */
    const sonNokta = metin.lastIndexOf('.');
    const sonVirgul = metin.lastIndexOf(',');
    const ondalikAyirici = sonNokta > sonVirgul ? '.' : ',';
    const binlikAyirici = ondalikAyirici === '.' ? ',' : '.';
    const bolum = metin.split(ondalikAyirici);
    if (bolum.length !== 2)
      return { gecerli: false, kurus: null, hata: 'Ondalık ayırıcı birden fazla.' };
    tamKisim = bolum[0].split(binlikAyirici).join('');
    ondalikKisim = bolum[1];
    if (!binlikGecerli(bolum[0], binlikAyirici))
      return { gecerli: false, kurus: null, hata: 'Binlik ayırıcılar hatalı.' };
  } else if (nokta > 0 || virgul > 0) {
    const ayirici = nokta > 0 ? '.' : ',';
    const adet = nokta > 0 ? nokta : virgul;
    const parcalar = metin.split(ayirici);
    const sonParca = parcalar[parcalar.length - 1];

    if (adet > 1 || sonParca.length === 3) {
      /*
        Binlik okuma: ilk grup 1-3, kalan gruplar tam 3 hane.

        Buraya "28075,505" gibi üç haneli kuruş denemeleri de düşüyor —
        binlik olarak da geçersiz. Mesaj ikisini birden anlatıyor; "binlik
        ayırıcılar hatalı" demek kullanıcıya yanlış yeri gösteriyordu.
      */
      if (!binlikGecerli(metin, ayirici))
        return {
          gecerli: false,
          kurus: null,
          hata: 'Tutar okunamadı. Binlik için nokta, kuruş için virgül kullan (28.075,50).',
        };
      tamKisim = parcalar.join('');
    } else if (sonParca.length === 1 || sonParca.length === 2) {
      tamKisim = parcalar[0];
      ondalikKisim = sonParca;
    } else {
      return { gecerli: false, kurus: null, hata: 'Kuruş en fazla iki hane olabilir.' };
    }
  } else {
    tamKisim = metin;
  }

  if (!/^\d+$/.test(tamKisim) || (ondalikKisim && !/^\d{1,2}$/.test(ondalikKisim)))
    return { gecerli: false, kurus: null, hata: 'Tutar okunamadı.' };

  const kurus =
    Number(tamKisim) * 100 + Number((ondalikKisim + '00').slice(0, 2));

  if (!Number.isSafeInteger(kurus))
    return { gecerli: false, kurus: null, hata: 'Tutar çok büyük.' };
  if (kurus === 0) return { gecerli: false, kurus: null, hata: 'Tutar sıfır olamaz.' };
  if (kurus > UST_SINIR_KURUS)
    return { gecerli: false, kurus: null, hata: 'Tutar gerçekçi görünmüyor.' };

  return { gecerli: true, kurus, hata: null };
}

/** İlk grup 1-3 hane, sonraki her grup tam 3 hane mi. */
function binlikGecerli(metin, ayirici) {
  const g = metin.split(ayirici);
  if (g[0].length < 1 || g[0].length > 3) return false;
  return g.slice(1).every((x) => x.length === 3);
}

/**
 * Kuruşun yüzdesini kuruş olarak verir.
 *
 * Çarpma önce yapılıyor: tam sayı × tam sayı tam sayıdır, bölme tek adımda
 * yuvarlanıyor. Önce bölüp sonra çarpmak kuruşta sapma bırakır.
 */
export function yuzdeKurus(kurus, yuzde) {
  return Math.round((kurus * yuzde) / 100);
}

/** Kuruşu "4.211,33" biçiminde yazar. */
export function kurusBicim(kurus) {
  return (kurus / 100).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
