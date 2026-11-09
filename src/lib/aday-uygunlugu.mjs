/**
 * İLANIMA UYGUN ADAYLAR (9 Kasım 2026, rakip analizi #9)
 *
 * İlanlarda bölüm alanı yok; uygunluk iki gerçek veriden çıkıyor:
 *   1. İlan başlığındaki anlamlı sözcükler adayın hedef rollerinde,
 *      becerilerinde ya da bölümünde geçiyor mu (Türkçe ekler için
 *      ortak kök: kısa olan uzunun başı, en az 4 harf).
 *   2. Şehir aynı mı (uzaktan ilanda şehir aranmıyor).
 * Sözcük eşleşmesi olmayan aday "uygun" sayılmıyor; yalnız şehir
 * tutması uygunluk değil.
 */

const DOLGU = new Set([
  'staj', 'stajı', 'stajyer', 'stajyeri', 'stajyerı', 'intern', 'internship', 'program', 'programı',
  've', 'ile', 'için', 'uzun', 'kısa', 'dönem', 'dönemi', 'yaz', 'kış', 'part', 'full', 'time',
  'tam', 'yarı', 'zamanlı', 'junior', 'genç', 'yetenek', 'talent', 'aday', 'pozisyon', 'zorunlu',
  'gönüllü', 'uzaktan', 'hibrit', 'remote', 'hybrid', 'the', 'and', 'for',
]);

const kucuk = (d) => String(d ?? '').toLocaleLowerCase('tr');

export function sozcukler(metin) {
  return kucuk(metin)
    .split(/[^\p{L}\p{N}+#]+/u)
    .filter((s) => s.length >= 3 && !DOLGU.has(s));
}

const ortakKok = (a, b) => {
  const [kisa, uzun] = a.length <= b.length ? [a, b] : [b, a];
  return kisa === uzun || (kisa.length >= 4 && uzun.startsWith(kisa));
};

/** { puan, sozcukler: eşleşen başlık sözcükleri, sehir: boolean } */
export function ilanaUygunluk(ilan, aday) {
  const baslik = [...new Set(sozcukler(ilan?.title))];
  const adayKelimeleri = sozcukler(
    [...(aday?.hedefRoller ?? []), ...(aday?.beceriler ?? []), aday?.bolum ?? ''].join(' '),
  );
  const eslesen = baslik.filter((b) => adayKelimeleri.some((a) => ortakKok(a, b)));
  const uzaktan = ilan?.work_type === 'Remote';
  const sehir =
    !uzaktan && !!kucuk(ilan?.city).trim() && kucuk(ilan?.city).trim() === kucuk(aday?.sehir).trim();
  if (!eslesen.length) return { puan: 0, sozcukler: [], sehir };
  return { puan: eslesen.length * 2 + (sehir ? 1 : 0), sozcukler: eslesen, sehir };
}

/** Uygun adaylar, puana göre (eşitte özgün sıra korunuyor). */
export function uygunAdaylar(ilan, adaylar) {
  return adaylar
    .map((a, i) => ({ a, i, u: ilanaUygunluk(ilan, a) }))
    .filter((x) => x.u.puan > 0)
    .sort((x, y) => y.u.puan - x.u.puan || x.i - y.i)
    .map((x) => ({ aday: x.a, uygunluk: x.u }));
}
