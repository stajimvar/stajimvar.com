/**
 * TÜM AÇIK İLANLAR — TARANABİLİR SAYFALAMA (12 Ekim 2026)
 *
 * SORUN
 * -----
 * `/staj-ilanlari` ilk HTML'de yalnız en yeni 12 ilanı bağlıyordu; anasayfa
 * da ilk 12 kartı. Geri kalan ilanlara giden yol ya JavaScript'le çalışan
 * sonsuz kaydırma ya da site haritasıydı. Ölçüldü: yayındaki 178 ilanın
 * 166'sına sunucudan gelen HTML'de hiçbir iç bağlantı yoktu.
 *
 * ÇÖZÜM
 * -----
 * `/staj-ilanlari/sayfa/<n>`: açık ilanların tamamı, en yeniden eskiye,
 * sayfa başına 30. Her sayfa kendi canonical'ını taşıyor (Google'ın
 * sayfalama önerisi: sayfalar birbirine değil kendilerine canonical) ve
 * önceki/sonraki sayfaya gerçek <a href> bağlantısı veriyor. Şehir ya da
 * bölüm için ayrı sayfa ÜRETİLMİYOR: boş ya da birbirinin kopyası sayfa
 * çoğaltmamak için tek bir sıralı liste yeterli.
 *
 * Sıra ve süzgeç ön render ile istemcide AYNI (bu modül): ilk HTML ile
 * React'in çizdiği liste ayrışmasın.
 */
import { istanbulBugun } from './ilan-sayfasi.mjs';

export const ARSIV_SAYFA_BOYU = 30;

export const arsivYolu = (n) => `/staj-ilanlari/sayfa/${n}`;

/** Son başvurusu geçmemiş (tarihsizse açık sayılan) ilan. Son gün dahil. */
export function acikIlanMi(ilan, bugun = istanbulBugun()) {
  const ham = String(ilan.application_deadline ?? ilan.applicationDeadline ?? '').slice(0, 10);
  return !/^\d{4}-\d{2}-\d{2}$/.test(ham) || ham >= bugun;
}

/** En yeni önce; yayın tarihi yoksa oluşturma tarihi, ikisi de yoksa sona. Eşitlikte kimlik. */
export function arsivSirasi(a, b) {
  const t = (i) => String(i.posted_at ?? i.postedAt ?? i.created_at ?? i.createdAt ?? '');
  const fark = t(b).localeCompare(t(a));
  return fark !== 0 ? fark : String(a.id).localeCompare(String(b.id));
}

export function arsivSayfaBasligi(n, toplam) {
  return `Tüm staj ilanları — sayfa ${n}/${toplam} | StajımVar`;
}

/*
  SAYFA NUMARALARI — TARAMA DERİNLİĞİ (13 Ekim 2026)

  Her sayfa yalnız önceki ve sonraki sayfaya bağlıydı: 6 sayfalı listede son
  sayfanın ilanları `/staj-ilanlari`dan 7 tık derindeydi ve tarayıcı oraya
  ancak zinciri sırayla izleyerek varabiliyordu. Artık her sayfa numaralı
  sayfa bağlantılarını da taşıyor: ilk, son, bulunulan sayfanın iki yanı.
  10 sayfaya kadar hepsi gösteriliyor; daha uzun listede aradaki boşluk
  `null` (çizimde "…") ile işaretleniyor. Ön render ile React aynı listeyi
  kullanıyor.
*/
export function arsivSayfaNumaralari(n, toplam, { komsu = 2, tamEsik = 10 } = {}) {
  if (!Number.isInteger(toplam) || toplam < 1) return [];
  if (toplam <= tamEsik) return Array.from({ length: toplam }, (_, i) => i + 1);
  const kume = new Set([1, toplam]);
  for (let i = n - komsu; i <= n + komsu; i++) if (i >= 1 && i <= toplam) kume.add(i);
  const sirali = [...kume].sort((a, b) => a - b);
  const sonuc = [];
  for (const s of sirali) {
    if (sonuc.length && s - sonuc[sonuc.length - 1] > 1) sonuc.push(null);
    sonuc.push(s);
  }
  return sonuc;
}
