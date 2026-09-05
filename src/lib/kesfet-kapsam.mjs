/**
 * Etkinliğin StajımVar'ın işine mi ait olduğunu söyler.
 *
 * SORUN
 * -----
 * Keşfet bir etkinlik toplayıcısına dönüşmüştü: yayındaki 136 etkinliğin
 * dağılımı ölçüldü — konser 51, festival 42, sergi 21, tiyatro 18, atölye
 * 3, müze 1. Kariyerle ilgili TEK kayıt TEKNOFEST'ti; "atölye"lerin ikisi
 * çocuk etkinliğiydi. Bir staj sitesinin birincil menüsünde jazz konseri
 * olması "StajımVar = staj" cümlesini zayıflatıyor.
 *
 * NEDEN YENİ KOLON AÇILMADI
 * -------------------------
 * `discover_events.category` alanı zaten var ve toplama hattının
 * tamamından geçiyor (adapters → domain → repository). Kapsam bilgisini
 * ordan TÜRETMEK, yeni bir kolon açıp her adaptörü ona göre
 * güncellemekten hem ucuz hem kalıcı: yarın eklenen bir kaynak kariyer
 * kategorisi yazdığı anda doğru tarafa düşüyor, başka hiçbir yeri
 * değiştirmek gerekmiyor.
 *
 * BAŞLIK YEDEK SİNYAL
 * -------------------
 * Kategori tek başına yetmiyor: TEKNOFEST veritabanında "festival" olarak
 * duruyor ama kariyer etkinliği. Kültür kaynaklarından gelen kayıtlar
 * kendi kategorilerini kullandığı için, kariyer sinyali başlıkta da
 * aranıyor. Ters yön YOK: kategorisi kariyer olan bir kayıt başlığına
 * bakılmadan kariyer sayılıyor, çünkü onu kariyer kaynağı göndermiştir.
 */

/**
 * Kariyer kaynaklarının yazdığı kategoriler.
 *
 * Yeni bir kariyer kaynağı eklenirken kategorisi buraya da yazılmalı;
 * liste tek doğruluk kaynağı.
 */
export const KARIYER_KATEGORILERI = new Set([
  'career_fair',
  'hackathon',
  'tech_festival',
  'seminar',
  'conference',
  'campus',
  'competition',
]);

/**
 * Başlıkta kariyer sinyali.
 *
 * Dar tutuldu: "girişim" gibi geniş bir kelime kültür etkinliklerini de
 * yakalar. Buradakilerin hepsi kariyer bağlamı dışında nadiren geçiyor.
 */
const BASLIK_SINYALI =
  /teknofest|hackathon|kariyer gun|kariyer fuar|kariyer zirve|is fuar|staj fuar|cv atolye|mulakat atolye|sirket sunum|kampus programi|datathon|ideathon|case stud|zirvesi|girisimcilik yarismasi/i;

/* Türkçe büyük harf katlanmıyor (bkz. bolum-eslestirme.mjs). */
const TR = { İ: 'i', I: 'i', ı: 'i', Ş: 's', ş: 's', Ğ: 'g', ğ: 'g', Ü: 'u', ü: 'u', Ö: 'o', ö: 'o', Ç: 'c', ç: 'c' };
const sadelestir = (m) => String(m ?? '').replace(/[İIıŞşĞğÜüÖöÇç]/g, (h) => TR[h]).toLowerCase();

/**
 * Etkinlik kariyer/kampüs etkinliği mi.
 *
 * @param {{category?: string|null, title?: string|null}} etkinlik
 */
export function kariyerEtkinligiMi(etkinlik) {
  if (!etkinlik) return false;
  if (etkinlik.category && KARIYER_KATEGORILERI.has(etkinlik.category)) return true;
  return BASLIK_SINYALI.test(sadelestir(etkinlik.title));
}

/**
 * Listeyi kariyer önce gelecek şekilde sıralar — ELEMEZ.
 *
 * Eleme yapılmıyor çünkü bugün kariyer etkinliği sayısı bir elin
 * parmaklarını geçmiyor; elenmiş bir liste boş sayfa demek olurdu.
 * Kaynaklar birikince `yalnizKariyer` ile eleme açılabilir, ama o karar
 * veriye bakılarak verilmeli.
 *
 * Kararlı sıralama: aynı gruptakilerin kendi arasındaki sırası bozulmuyor.
 */
export function kariyerOnce(etkinlikler) {
  if (!Array.isArray(etkinlikler)) return [];
  return etkinlikler
    .map((e, i) => ({ e, i, k: kariyerEtkinligiMi(e) }))
    .sort((a, b) => (a.k === b.k ? a.i - b.i : a.k ? -1 : 1))
    .map((x) => x.e);
}

/** Listedeki kariyer etkinliği sayısı — yüzeyin ne göstereceğine karar verirken. */
export function kariyerSayisi(etkinlikler) {
  return (etkinlikler ?? []).filter(kariyerEtkinligiMi).length;
}
