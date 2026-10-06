/**
 * DENEYİM — TEK KURAL KAYNAĞI
 *
 * Profil formu, başvuru kopyası, şirket incelemesi ve CV aynı deneyimi
 * okuyor. Doğrulama ve biçim burada; sunucu aynı tarih kurallarını
 * kendisi de uyguluyor (20261205010000), arayüz yalnız kullanıcıya
 * kaydetmeden önce söylüyor.
 *
 * Saf: ağ yok, React yok. tests/deneyim.test.mjs bağlıyor.
 */

/** Sunucudaki üst sınırla aynı (20261205010000). */
export const DENEYIM_SINIRI = 30;

/*
  KOPYA KESMİYOR (6 Ekim 2026): kullanıcı 30 deneyim kaydedebiliyorken
  kopyanın 10'unu alması, şirkete başvuru anındaki profilin bir kısmını
  sessizce göstermemek olurdu. Kopya izin verilen hepsini alıyor; sınır
  yalnız bozuk/fazla veriye karşı bir emniyet.
*/
export const KOPYA_DENEYIM_SINIRI = DENEYIM_SINIRI;

export const POZISYON_UZUNLUGU = 120;
export const KURUM_UZUNLUGU = 120;
export const ACIKLAMA_UZUNLUGU = 1000;

export const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const AY_DESENI = /^(\d{4})-(\d{2})$/;

function metin(deger) {
  if (typeof deger !== 'string') return null;
  const t = deger.trim();
  return t || null;
}

function tamsayi(deger) {
  const n = typeof deger === 'string' && deger.trim() !== '' ? Number(deger) : deger;
  return Number.isInteger(n) ? n : null;
}

/** Yıl ve ay → 'YYYY-MM'. Geçersizse null. */
export function ayAnahtari(yil, ay) {
  const y = tamsayi(yil);
  const a = tamsayi(ay);
  if (y === null || a === null || y < 1950 || y > 2100 || a < 1 || a > 12) return null;
  return `${String(y).padStart(4, '0')}-${String(a).padStart(2, '0')}`;
}

/** 'YYYY-MM' → { yil, ay } ya da null. */
export function ayAyir(anahtar) {
  const m = typeof anahtar === 'string' ? AY_DESENI.exec(anahtar.trim()) : null;
  if (!m) return null;
  const yil = Number(m[1]);
  const ay = Number(m[2]);
  return ayAnahtari(yil, ay) ? { yil, ay } : null;
}

/** 'YYYY-MM' → "Haz 2025". */
export function ayMetni(anahtar) {
  const p = ayAyir(anahtar);
  return p ? `${AY_KISA[p.ay - 1]} ${p.yil}` : '';
}

/** Kopya/RPC biçimindeki deneyimin tarih aralığı: "Haz 2025 – Eyl 2025", "Şub 2026 – Devam ediyor". */
export function tarihAraligi(d) {
  const bas = ayMetni(d?.baslangic);
  if (!bas) return '';
  if (d?.devam) return `${bas} – Devam ediyor`;
  const bit = ayMetni(d?.bitis);
  return bit ? (bit === bas ? bas : `${bas} – ${bit}`) : bas;
}

/**
 * Profildeki deneyim (StudentExperience) → kopya/RPC biçimi.
 * Pozisyonu ya da kurumu ya da başlangıcı okunamayan kayıt atlanıyor.
 */
export function deneyimKaydi(d) {
  const pozisyon = metin(d?.position);
  const kurum = metin(d?.organization);
  const baslangic = ayAnahtari(d?.startYear, d?.startMonth);
  if (!pozisyon || !kurum || !baslangic) return null;
  const devam = Boolean(d?.ongoing);
  return {
    pozisyon,
    kurum,
    baslangic,
    bitis: devam ? null : ayAnahtari(d?.endYear, d?.endMonth),
    devam,
    aciklama: metin(d?.description),
  };
}

/** Başvuru kopyasına giren deneyimler — izin verilen hepsi. */
export function deneyimKopyasi(liste) {
  return (Array.isArray(liste) ? liste : [])
    .map(deneyimKaydi)
    .filter(Boolean)
    .slice(0, KOPYA_DENEYIM_SINIRI);
}

/**
 * Kopyadan ya da RPC'den gelen ham listeyi doğrular. Bozuk alan yalnız
 * kendisini düşürüyor; pozisyonu ya da kurumu olmayan kayıt atlanıyor.
 * Dizi değilse `null` — "kopyada deneyim alanı yok" (eski başvuru) ile
 * "deneyim yok" ayrı tutuluyor.
 */
export function deneyimListesi(deger) {
  if (!Array.isArray(deger)) return null;
  return deger
    .filter((d) => d && typeof d === 'object' && !Array.isArray(d))
    .map((d) => {
      const baslangic = ayAyir(d.baslangic) ? d.baslangic.trim() : null;
      const devam = d.devam === true;
      return {
        pozisyon: metin(d.pozisyon),
        kurum: metin(d.kurum),
        baslangic,
        bitis: !devam && ayAyir(d.bitis) ? d.bitis.trim() : null,
        devam,
        aciklama: metin(d.aciklama),
      };
    })
    .filter((d) => d.pozisyon && d.kurum);
}

/**
 * Form taslağını doğrular. Taslak alanları metin (select değerleri).
 * Hata yoksa null; varsa { alan, mesaj } — alan odak için.
 */
export function deneyimHatasi(taslak) {
  const pozisyon = String(taslak?.position ?? '').trim();
  const kurum = String(taslak?.organization ?? '').trim();
  if (!pozisyon) return { alan: 'pozisyon', mesaj: 'Pozisyonu yaz.' };
  if (pozisyon.length > POZISYON_UZUNLUGU) return { alan: 'pozisyon', mesaj: `Pozisyon en çok ${POZISYON_UZUNLUGU} karakter olabilir.` };
  if (!kurum) return { alan: 'kurum', mesaj: 'Kurumu yaz.' };
  if (kurum.length > KURUM_UZUNLUGU) return { alan: 'kurum', mesaj: `Kurum en çok ${KURUM_UZUNLUGU} karakter olabilir.` };
  const bas = ayAnahtari(taslak?.startYear, taslak?.startMonth);
  if (!bas) return { alan: 'baslangic', mesaj: 'Başlangıç ayını ve yılını seç.' };
  if (!taslak?.ongoing) {
    const bit = ayAnahtari(taslak?.endYear, taslak?.endMonth);
    if (!bit) return { alan: 'bitis', mesaj: 'Bitiş ayını ve yılını seç ya da “Devam ediyorum”u işaretle.' };
    if (bit < bas) return { alan: 'bitis', mesaj: 'Bitiş, başlangıçtan önce olamaz.' };
  }
  if (String(taslak?.description ?? '').length > ACIKLAMA_UZUNLUGU) {
    return { alan: 'aciklama', mesaj: `Açıklama en çok ${ACIKLAMA_UZUNLUGU} karakter olabilir.` };
  }
  return null;
}

/**
 * Sıralama: devam edenler önce, sonra bitişi (yoksa başlangıcı) yeni olan.
 * Profilde ve CV'de aynı sıra.
 */
export function deneyimSirasi(a, b) {
  if (Boolean(a.ongoing) !== Boolean(b.ongoing)) return a.ongoing ? -1 : 1;
  const son = (d) => (d.ongoing ? 0 : (d.endYear ?? 0) * 12 + (d.endMonth ?? 0));
  const bas = (d) => (d.startYear ?? 0) * 12 + (d.startMonth ?? 0);
  return son(b) - son(a) || bas(b) - bas(a);
}
