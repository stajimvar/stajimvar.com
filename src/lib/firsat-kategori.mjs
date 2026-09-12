import { calendarDay } from './opportunity-domain.mjs';

/**
 * Fırsat türü → kategori ve türetilen durum. TEK YER.
 *
 * NEDEN TEK YER
 * -------------
 * Tür listesi arayüzde üç ayrı yerde elle yazılıydı: şeritteki daireler,
 * filtre panelindeki radyo satırları ve kategori adreslerinin haritası
 * (`categoryPath`). Üçü ayrı ayrı yazıldığı için yeni bir tür eklendiğinde
 * biri güncelleniyor, ötekiler sessizce eksik kalıyordu — göçte dört yeni
 * tür açıldı (hackathon, teknofest, career_day, career_fair) ve hiçbiri
 * şeritte görünmezdi.
 *
 * Harita göçteki `public.firsat_kategori()` fonksiyonunun birebir aynısı
 * (supabase/migrations/20260926110000_firsat_envanteri.sql · bölüm 3).
 * İkisi ayrışırsa sunucunun saydığı ile arayüzün gösterdiği ayrışır; o
 * yüzden burada da aynı sırayla ve aynı adlarla duruyor.
 *
 * KYK AYRI KATEGORİ DEĞİL
 * -----------------------
 * KYK bir kurum, bir fırsat türü değil: öğrenci "burs arıyorum" diye
 * geliyor, "KYK mı başka kurum mu" ikinci soru. Beşinci bir daire açmak
 * o ikinci soruyu birinciymiş gibi gösteriyordu. Kategori şeridinde dört
 * daire var; KYK, Burslar seçiliyken çıkan KAYNAK süzgecinde.
 */

/** Sıra şeritteki daire sırası: en çok kayıt taşıyan aile başta. */
export const FIRSAT_KATEGORILERI = ['burslar', 'programlar', 'yarismalar', 'kariyer-etkinlikleri'];

export const KATEGORI_ETIKETLERI = {
  '': 'Tümü',
  burslar: 'Burslar',
  programlar: 'Programlar',
  yarismalar: 'Yarışmalar',
  'kariyer-etkinlikleri': 'Kariyer Etkinlikleri',
};

/** Tür → kategori. Göçteki `firsat_kategori()` ile birebir aynı. */
export const TUR_KATEGORISI = {
  scholarship: 'burslar',
  kyk: 'burslar',
  student_support: 'burslar',
  education: 'programlar',
  youth_program: 'programlar',
  international: 'programlar',
  competition: 'yarismalar',
  hackathon: 'yarismalar',
  teknofest: 'yarismalar',
  career_day: 'kariyer-etkinlikleri',
  career_fair: 'kariyer-etkinlikleri',
};

/**
 * Bir türün kategorisi.
 *
 * Tanınmayan tür 'programlar'a düşüyor — göçteki `else` dalının aynısı.
 * Sunucu yeni bir enum değeri alıp arayüz henüz güncellenmediğinde kayıt
 * listeden DÜŞMÜYOR; yanlış daireye girmek, hiç görünmemekten iyi.
 */
export function firsatKategorisi(tur) {
  return TUR_KATEGORISI[tur] ?? 'programlar';
}

/** Bir kategorinin kapsadığı türler. Bilinmeyen kategori için boş dizi. */
export function kategoriTurleri(kategori) {
  return Object.keys(TUR_KATEGORISI).filter((tur) => TUR_KATEGORISI[tur] === kategori);
}

/**
 * "Son N gün" eşiği. Göçteki `firsat_durum()` ile aynı sayı; iki yerde
 * ayrı eşik olsaydı sunucu "closing_soon" derken kart susardı.
 */
export const KAPANISA_YAKIN_GUN = 3;

/**
 * Saklanan durum + son tarih → gösterilen durum.
 *
 *   draft / archived / expired  → olduğu gibi
 *   published, tarihi geçmiş    → 'expired'      (gece işi koşmamış olsa da)
 *   published, 3 gün ve altı    → 'closing_soon'
 *   published, aksi             → 'active'
 *
 * Gün hesabı `calendarDay` ile Türkiye gününe yuvarlanıyor: saatsiz bir
 * `application_deadline` değeri (`2026-09-14`) UTC gece yarısı olarak
 * okunduğunda UTC'nin batısındaki okuyucuya bir gün erken kapanmış
 * görünüyordu. Son başvuruda bu bir gün kaybettirir.
 *
 * @param {string} saklanan  'draft'|'published'|'expired'|'archived'
 * @param {string|Date|null} sonTarih
 * @returns {'active'|'closing_soon'|'expired'|'draft'|'archived'}
 */
export function firsatDurumu(saklanan, sonTarih, simdi = new Date()) {
  if (saklanan && saklanan !== 'published') return saklanan;

  /*
    `calendarDay(null)` epoch'a düşüyor (`new Date(null)` = 1 Ocak 1970) ve
    tarihi bilinmeyen her fırsat "expired" olurdu. Boş değer burada
    ayıklanıyor: tarihi açıklanmamış kayıt kapanmış değil, yalnızca
    takvimi belli değil.
  */
  if (sonTarih == null || sonTarih === '') return 'active';

  const gun = calendarDay(sonTarih);
  const bugun = calendarDay(simdi);
  if (gun == null || bugun == null) return 'active';

  const kalan = Math.round((gun - bugun) / 86400000);
  if (kalan < 0) return 'expired';
  if (kalan <= KAPANISA_YAKIN_GUN) return 'closing_soon';
  return 'active';
}

/*
  ROZETLER YALNIZ GERÇEK VERİDEN

  Kartta "Popüler", "Çok başvurulan" gibi etiketler yok: başvuruyu kurum
  alıyor, bu sitede sayılabilecek bir başvuru YOK. Üç rozet kaldı ve
  üçünün de arkasında tek bir alan duruyor:

    Yeni        published_at ≤ 7 gün
    Son 3 gün   firsatDurumu(...) === 'closing_soon'
    Sana uygun  opportunityFit → uygun_olabilir VE kesin

  "Sana uygun" en katı olanı: üç kısıt boyutunun da kurumun kendi
  sayfasından doğrulanmış olmasını istiyor (bkz. burs-uygunluk.mjs).
  Profil eksikse ya da kayıt doğrulanmamışsa rozet HİÇ çizilmiyor —
  uydurma bir oran yerine sessizlik.
*/
export const YENI_SAYILAN_GUN = 7;

export function firsatRozetleri(item, { fit = null, saklanan = 'published', simdi = new Date() } = {}) {
  if (!item) return [];
  const rozetler = [];

  /* Boş değer `calendarDay` içinde epoch'a düşüyor; önce ayıklanıyor. */
  const yayin = item.publishedAt ? calendarDay(item.publishedAt) : null;
  const bugun = calendarDay(simdi);
  if (yayin != null && bugun != null) {
    const yas = Math.round((bugun - yayin) / 86400000);
    if (yas >= 0 && yas <= YENI_SAYILAN_GUN) rozetler.push({ id: 'yeni', etiket: 'Yeni' });
  }

  if (firsatDurumu(item.status ?? saklanan, item.applicationDeadline, simdi) === 'closing_soon') {
    rozetler.push({ id: 'son_gunler', etiket: `Son ${KAPANISA_YAKIN_GUN} gün` });
  }

  if (fit && fit.durum === 'uygun_olabilir' && fit.kesin) {
    rozetler.push({ id: 'uygun', etiket: 'Sana uygun' });
  }

  return rozetler;
}
