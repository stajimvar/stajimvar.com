/**
 * STAJ TÜRÜ KABULÜ — GÖSTERİM KARARI
 *
 * `mandatoryStajAccepted` ve `voluntaryStajAccepted` BİRBİRİNİ
 * DIŞLAMIYOR: bir ilan hem zorunlu hem gönüllü staj kabul edebilir.
 * Ölçüldü (14 Eylül 2026, üretim): 175 ilanın 122'sinde ikisi de true.
 *
 * Bir ara gönüllü rozetini yalnız zorunlu YOKKEN çiziyordum; o kural
 * 122 ilanda gönüllü bilgisini gizliyordu — gönüllü staj arayan
 * öğrenciye uygun ilanı saklamak.
 *
 * ÜÇ DEĞER, DÖRT HÂL
 *   ikisi true       "Zorunlu ve gönüllü"  (tek kompakt rozet)
 *   yalnız biri true o rozet
 *   açık RET (false) "… kabul etmiyor"     (false GERÇEK bilgi)
 *   ikisi null       rozet YOK
 *
 * Ayrı dosya olmasının sebebi test: kart ve detay aynı kararı
 * kullanıyor ve kural React ağacı kurmadan sınanabilmeli.
 */

/**
 * Kart için tek satırlık rozet metni. Gösterilecek bir şey yoksa `null`.
 *
 * KOMPAKT: iki ayrı rozet yerine tek metin, çünkü kartın rozet şeridi
 * zaten uyum/ücret/sigorta/kaynak taşıyor ve dördüncü bir rozet 375
 * pikselde satırı ikiye katlıyor. Ayrıntı detay sayfasında.
 */
export function stajTuruRozeti(ilan) {
  const z = ilan?.mandatoryStajAccepted ?? null;
  const g = ilan?.voluntaryStajAccepted ?? null;

  if (z === true && g === true) return 'Zorunlu ve gönüllü staj';
  if (z === true) return 'Zorunlu Staj (SGK)';
  if (g === true) return 'Gönüllü staj';

  /*
    AÇIK RET DE BİLGİ — ama yalnız tek taraf biliniyorsa yazılıyor.
    İkisi de false ise "staj kabul etmiyor" demek gerekirdi ve öyle bir
    ilanın listede olmaması lazım; o hâli rozete çevirmek yanlış yerde
    bir iddia olurdu.
  */
  if (z === false && g === null) return 'Zorunlu staj kabul etmiyor';
  if (g === false && z === null) return 'Gönüllü staj kabul etmiyor';

  return null;
}

/**
 * Detay sayfası için: BİLİNEN İKİ BİLGİ DE AÇIKÇA.
 *
 * Kartta yer yok, detayda var. Her bilinen alan kendi satırında —
 * kompakt birleştirme burada bilgi kaybı olurdu.
 *
 * @returns {Array<{etiket: string, deger: string}>}
 */
export function stajTuruSatirlari(ilan) {
  const satirlar = [];
  const z = ilan?.mandatoryStajAccepted ?? null;
  const g = ilan?.voluntaryStajAccepted ?? null;

  if (z !== null) {
    satirlar.push({
      etiket: 'Zorunlu staj',
      deger: z ? 'Kabul ediliyor' : 'Kabul edilmiyor',
    });
  }
  if (g !== null) {
    satirlar.push({
      etiket: 'Gönüllü staj',
      deger: g ? 'Kabul ediliyor' : 'Kabul edilmiyor',
    });
  }
  return satirlar;
}

/**
 * SİGORTAYI SAĞLAYAN TARAF — okunabilir ad.
 *
 * `undefined`/`null` (kaynak söylemiyor) hiçbir şey döndürmüyor.
 * `'yok'` DÖNDÜRÜYOR: o kaynağın açık beyanı ve öğrenci için gerçek
 * bilgi — bilinmeyeni "sigortasız" göstermekle karıştırılmamalı.
 */
export function sigortaMetni(saglayici) {
  switch (saglayici) {
    case 'isveren':
      return 'İşveren sağlıyor';
    case 'universite':
      return 'Üniversite sağlıyor';
    case 'aday':
      return 'Adayın kendisi sağlıyor';
    case 'yok':
      return 'Sigorta yok';
    default:
      return null;
  }
}

/**
 * ÜCRET METNİ — ÜÇ DEĞER
 *
 *   true  tutar varsa tutar, yoksa "Ücretli"
 *   false "Ücretsiz" (kaynağın açık beyanı)
 *   null  gösterilmiyor
 */
export function ucretMetniHesapla(stipend) {
  const odenir = stipend?.isPaid ?? null;
  if (odenir === true) return stipend?.amountText?.trim() || 'Ücretli';
  if (odenir === false) return 'Ücretsiz';
  return null;
}
