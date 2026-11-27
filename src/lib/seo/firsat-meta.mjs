/**
 * FIRSAT SAYFASININ ARAMA BAŞLIĞI VE AÇIKLAMASI (28 Kasım 2026)
 *
 * Search Console (29 Ağu – 26 Kas): burs sayfaları ilk sayfada
 * (ort. sıra 8–11) yüzlerce kez gösterilip neredeyse hiç tıklanmadı —
 * BTSO 467 gösterim / 2 tıklama, Erciyes 449 / 2, Mustafa Öncel 145 / 0.
 * Aramaların kendisi ne istendiğini söylüyor: "… burs başvurusu",
 * "… bursu ne kadar", "… başvuru ne zaman". Başlık yalnız bursun adıydı,
 * açıklama da kaydın kısa tanımı: aramadaki soruya cevap yoktu.
 *
 *   BAŞLIK  yer varsa "— Başvuru ve Şartlar", daha az yer varsa
 *           "— Başvuru" ekleniyor; arama sonucunda ~60 karakter
 *           görünüyor (" | StajımVar" dahil), sığmayana ek yok.
 *   AÇIKLAMA son başvuru tarihi KAYITTA varsa başa yazılıyor ("Son
 *           başvuru: 15 Ocak 2027." ya da "Başvuru dönemi kapandı (son
 *           başvuru …)."). "Başvurusu açık" denmiyor: açıklığı kaynağın
 *           kendi sayfasında görmeden iddia edemeyiz. Tarih yoksa
 *           açıklama değişmiyor. Tutar yazılmıyor (kayıtta doğrulanmış
 *           tutar alanı yok; tutar iddiası Eylül'de kaldırıldı).
 */
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const EK = ' | StajımVar';
const SINIR = 60;

/** YYYY-AA-GG → "15 Ocak 2027"; geçersizse null. */
export function turkceTarih(tarih) {
  const m = String(tarih || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const ay = AYLAR[Number(m[2]) - 1];
  return ay ? `${Number(m[3])} ${ay} ${m[1]}` : null;
}

/** Bursun adına sığıyorsa başvuru eki; " | StajımVar" ekini çağıran yapar. */
export function firsatAramaBasligi(temel) {
  const t = String(temel || '').trim();
  for (const ek of [' — Başvuru ve Şartlar', ' — Başvuru']) {
    if ((t + ek + EK).length <= SINIR) return t + ek;
  }
  return t;
}

/** Kayıtta tarih varsa durum cümlesi başa; yoksa kısa açıklama aynen. */
export function firsatAramaAciklamasi({ sonTarih, suresiGecti, kisa }) {
  const tarih = turkceTarih(sonTarih);
  const govde = String(kisa || '').trim();
  if (!tarih) return govde;
  const durum = suresiGecti ? `Başvuru dönemi kapandı (son başvuru ${tarih}).` : `Son başvuru: ${tarih}.`;
  return govde ? `${durum} ${govde}` : durum;
}
