/**
 * BAŞVURU PANOSUNUN SAF MANTIĞI
 *
 * Aşama eşlemesi ve ilan kırılımı React ağacı kurulmadan sınanabilsin
 * diye ayrı dosyada. Ekran yalnız çiziyor; hangi başvurunun hangi
 * aşamaya düştüğü ve hangi ilana ait olduğu burada.
 */

/**
 * PANO AŞAMALARI — dokuz durum, altı sütun.
 *
 * `application_status` dokuz değer taşıyor. Dokuz sütun telefonda da
 * masaüstünde de okunmuyordu ve ikisi ("teklif verildi" / "teklif
 * kabul") aynı işin iki ucu. Aşamalar İŞİN AKIŞINA göre toplandı:
 *
 *   Yeni          submitted                 → kimse bakmadı
 *   İnceleniyor   under_review              → bakılıyor
 *   Değerlendirme technical_assessment      → ödev/test aşamasında
 *   Görüşme       interview_scheduled       → takvimde
 *   Teklif        offer_extended            → karar şirkette değil, adayda
 *   Sonuçlandı    offer_accepted, offer_declined, rejected, withdrawn
 *
 * "Sonuçlandı" dört durumu birleştiriyor çünkü hepsinde YAPILACAK İŞ
 * YOK; ayrımları çipin kendi rozetinde duruyor ve kaybolmuyor.
 *
 * Tanınmayan bir durum 'yeni'ye düşüyor: yeni bir değer eklenirse
 * başvuru panodan KAYBOLMAK yerine en başta, en görünür yerde duruyor.
 */
export const PANO_ASAMALARI = [
  { anahtar: 'yeni', etiket: 'Yeni' },
  { anahtar: 'inceleniyor', etiket: 'İnceleniyor' },
  { anahtar: 'degerlendirme', etiket: 'Değerlendirme' },
  { anahtar: 'gorusme', etiket: 'Görüşme' },
  { anahtar: 'teklif', etiket: 'Teklif' },
  { anahtar: 'sonuclandi', etiket: 'Sonuçlandı' },
];

const ESLEME = {
  submitted: 'yeni',
  under_review: 'inceleniyor',
  technical_assessment: 'degerlendirme',
  interview_scheduled: 'gorusme',
  offer_extended: 'teklif',
  offer_accepted: 'sonuclandi',
  offer_declined: 'sonuclandi',
  rejected: 'sonuclandi',
  withdrawn: 'sonuclandi',
};

/** Başvuru durumu → pano aşaması. Tanınmayan değer 'yeni'de kalıyor. */
export function asamayaGore(durum) {
  return ESLEME[String(durum ?? '').trim()] ?? 'yeni';
}

/** Bir ilanın adını okunur hâle getiriyor; yoksa uydurulmuyor. */
function ilanAdi(ilan) {
  const t = String(ilan?.title ?? '').trim();
  return t || 'Adsız ilan';
}

/**
 * Başvuruları ilana göre öbekliyor.
 *
 * SIRA: en çok başvurusu olan ilan üstte. İK'nın ilk bakacağı yer
 * yığılmanın olduğu ilan; alfabetik sıra o bilgiyi gizliyordu.
 * Eşitlikte ilan adı — sıra koşudan koşuya değişmesin.
 *
 * İLANI BULUNAMAYAN BAŞVURU DÜŞÜRÜLMÜYOR: ilan listesi süzülmüş ya da
 * eksik gelmiş olabilir ve başvuruyu panodan silmek, var olan bir işi
 * yok göstermek olurdu. Böyle satırlar kendi öbeğinde toplanıyor.
 */
export function panoyaDiz(kartlar, ilanlar) {
  const adlar = new Map();
  for (const i of ilanlar ?? []) {
    const id = String(i?.id ?? '');
    if (id) adlar.set(id, ilanAdi(i));
  }

  const obekler = new Map();
  for (const k of kartlar ?? []) {
    /* Çevrilmiş kartta alan `ilanId`; ham satırda `listing_id`. İkisi de kabul. */
    const id = String(k?.ilanId ?? k?.listing_id ?? '');
    const anahtar = id || '(ilansiz)';
    if (!obekler.has(anahtar)) {
      /*
        BAŞLIK ÖNCE KARTIN KENDİSİNDEN

        Çevrilmiş başvuru kartı `ilanBasligi` taşıyor (aday-kart.mjs) ve
        bu, başvurunun ait olduğu ilanın adıdır — ilan listesi süzülmüş,
        sayfalanmış ya da eksik gelmiş olsa bile doğru. Kimlik
        eşlemesine mecbur kalmak, listede olmayan her ilanı adsız
        bırakıyordu. Liste yalnızca YEDEK.
      */
      obekler.set(anahtar, {
        ilanId: anahtar,
        ilanAdi:
          String(k?.ilanBasligi ?? '').trim() ||
          adlar.get(id) ||
          (id ? 'Bu listede olmayan ilan' : 'İlanı belirsiz'),
        kartlar: [],
      });
    }
    obekler.get(anahtar).kartlar.push(k);
  }

  return [...obekler.values()]
    .map((o) => ({ ...o, toplam: o.kartlar.length }))
    .sort((a, b) => b.toplam - a.toplam || a.ilanAdi.localeCompare(b.ilanAdi, 'tr'));
}

/**
 * Bir ilandaki aşama sayıları — iş yükü ve "nerede takıldı" için.
 * Boş aşama 0 ile duruyor; anahtar düşürülmüyor ki ekran her ilanda
 * aynı altı sütunu çizebilsin.
 */
export function asamaSayilari(kartlar) {
  const sayac = Object.fromEntries(PANO_ASAMALARI.map((a) => [a.anahtar, 0]));
  for (const k of kartlar ?? []) {
    sayac[asamayaGore(String(k?.durum ?? k?.status ?? ''))] += 1;
  }
  return sayac;
}
