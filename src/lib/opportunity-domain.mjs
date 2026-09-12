import { yerelKonakMi } from './guvenli-url.mjs';

/*
  TÜR LİSTESİ GÖÇLE BİRLİKTE BÜYÜDÜ

  20260926110000 göçü dört tür açtı (hackathon, teknofest, career_day,
  career_fair). Liste burada eksik kalsaydı yönetim formu ve adres
  süzgeçleri o türleri geçersiz sayardı.
*/
export const OPPORTUNITY_TYPES = [
  'scholarship',
  'kyk',
  'international',
  'competition',
  'education',
  'student_support',
  'youth_program',
  'hackathon',
  'teknofest',
  'career_day',
  'career_fair',
];

export function isSafeHttpsUrl(value) {
  try {
    const url = new URL(value);
    // Yerel ve özel ağ adresleri: bağlantı ziyaretçiye bir işe yaramaz,
    // sunucu tarafında çağrılırsa iç ağ taranabilir hale gelir.
    return url.protocol === 'https:' && !yerelKonakMi(url.hostname);
  } catch {
    return false;
  }
}

/*
  DIŞ BAĞLANTININ ETİKETİ GERÇEĞE UYSUN

  Kartlarda mavi "Başvur" düğmesi vardı ve adres olarak applicationUrl yoksa
  KURUMUN ANA SAYFASI kullanılıyordu. "Başvur" deyip ziyaretçiyi kurumun ana
  sayfasına bırakmak, olmayan bir başvuru sayfası vaat etmek demek.

  Kural: "Başvur" yalnızca doğrudan başvuru adresi VARSA ve dönem açıkken.
  Adres var ama dönem açık değilse sayfaya götürüyoruz, ama "başvur"
  demiyoruz. Yalnızca kaynak adresi varsa etiket "Resmî kaynak".
*/
export function opportunityCta(item, now = new Date()) {
  const basvuru = isSafeHttpsUrl(item?.applicationUrl || '') ? item.applicationUrl : null;
  const kaynak = isSafeHttpsUrl(item?.sourceUrl || '') ? item.sourceUrl : null;

  if (basvuru && opportunityStatus(item, now) === 'acik') {
    return { adres: basvuru, etiket: 'Başvur', kisaEtiket: 'Başvur', birincil: true };
  }
  if (basvuru) {
    /*
      KISA ETİKET KARTLAR İÇİN

      Kartta iki düğme yan yana duruyor ve 390 pikselde her birine ~175
      piksel düşüyor. "Resmî başvuru sayfası" oraya sığmıyor, düğmeyi iki
      satıra bölüyordu. Kısa hâli "başvuru" sözcüğünü koruyor: kaynağa mı
      yoksa başvuru sayfasına mı gidildiği kartta da anlaşılıyor.
      Uzun hâli detay sayfasında olduğu gibi duruyor.
    */
    return {
      adres: basvuru,
      etiket: 'Resmî başvuru sayfası',
      kisaEtiket: 'Resmî başvuru',
      birincil: false,
    };
  }
  if (kaynak) {
    return { adres: kaynak, etiket: 'Resmî kaynak', kisaEtiket: 'Resmî kaynak', birincil: false };
  }
  return null;
}

export function isExpiredOpportunity(opportunity, now = new Date()) {
  if (!opportunity.applicationDeadline) return false;
  if (isDateOnly(opportunity.applicationDeadline)) {
    const deadlineDay = calendarDay(opportunity.applicationDeadline);
    const currentDay = calendarDay(now);
    return deadlineDay != null && currentDay != null && deadlineDay < currentDay;
  }
  const deadline = new Date(opportunity.applicationDeadline);
  return Number.isFinite(deadline.getTime()) && deadline.getTime() < now.getTime();
}

/*
  DURUM MODELİ

  Kartlarda "Son başvuru: Dönemsel" gibi ifadeler vardı ve tarihi bilinmeyen
  her fırsat "açık" sayılıyordu: sayaçta "Başvurusu devam eden" yazan sayı,
  takvimi hiç açıklanmamış kurumları da içeriyordu. Öğrenci başvurabileceğini
  sanıp resmî sayfaya gidince kapalı buluyordu.

  Dört durum var ve "Açık" yalnızca DOĞRULANMIŞ aktif dönem bilgisi varken
  kullanılıyor: son başvuru tarihi biliniyor ve geçmemiş. Tarih yoksa ya da
  yalnızca geçmiş döneme ait bilgi varsa "Takvim bekleniyor" deniyor —
  bilmediğimizi söylemek, yanlış söylemekten iyi.
*/
export const OPPORTUNITY_STATUS_LABELS = {
  acik: 'Açık',
  yakinda: 'Yakında',
  takvim_bekleniyor: 'Takvim bekleniyor',
  kapali: 'Kapalı',
};

export function opportunityStatus(item, now = new Date()) {
  if (!item) return 'takvim_bekleniyor';

  if (item.applicationDeadline && isExpiredOpportunity(item, now)) return 'kapali';

  const baslangic = calendarDay(item.applicationStartAt);
  const bugun = calendarDay(now);
  if (baslangic != null && bugun != null && baslangic > bugun) return 'yakinda';

  if (item.applicationDeadline) return 'acik';

  return 'takvim_bekleniyor';
}

export function opportunityStatusLabel(item, now = new Date()) {
  return OPPORTUNITY_STATUS_LABELS[opportunityStatus(item, now)];
}

/* Kullanıcıya ham enum ("scholarship") gösterilmesin diye Türkçe karşılıklar. */
export const OPPORTUNITY_TYPE_LABELS = {
  scholarship: 'Burs',
  kyk: 'KYK',
  international: 'Yurtdışı',
  competition: 'Yarışma',
  education: 'Eğitim',
  student_support: 'Öğrenci desteği',
  youth_program: 'Gençlik programı',
  hackathon: 'Hackathon',
  teknofest: 'Teknofest',
  career_day: 'Kariyer günü',
  career_fair: 'Kariyer fuarı',
};

export function opportunityTypeLabel(type) {
  return OPPORTUNITY_TYPE_LABELS[type] ?? 'Fırsat';
}

export function getOpportunityOverview(items, now = new Date()) {
  const openItems = Array.isArray(items) ? items.filter((item) => item && !isExpiredOpportunity(item, now)) : [];
  const timedItems = openItems
    .filter((item) => deadlineSortValue(item.applicationDeadline) != null)
    .sort((left, right) => deadlineSortValue(left.applicationDeadline) - deadlineSortValue(right.applicationDeadline));
  const nearest = timedItems[0] ?? null;

  return {
    /*
      "Başvurusu devam eden" sayacı yalnızca durumu Açık olanları sayıyor.
      Önce süresi dolmamış her kayıt sayılıyordu; takvimi açıklanmamış
      kurumlar da bu sayıya giriyor, sayaç olduğundan büyük görünüyordu.
    */
    openCount: openItems.filter((item) => opportunityStatus(item, now) === 'acik').length,
    scholarshipAndCreditCount: openItems.filter((item) => item.opportunityType === 'scholarship' || item.opportunityType === 'kyk').length,
    nearest,
    daysLeft: nearest ? daysUntilDeadline(nearest.applicationDeadline, now) : null,
  };
}

function isDateOnly(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function calendarDay(value) {
  if (isDateOnly(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const normalized = new Date(Date.UTC(year, month - 1, day));
    return normalized.getUTCFullYear() === year && normalized.getUTCMonth() === month - 1 && normalized.getUTCDate() === day ? normalized.getTime() : null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  return Date.UTC(values.year, values.month - 1, values.day);
}

function deadlineSortValue(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (isDateOnly(value)) return calendarDay(value);
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.getTime() : null;
}

export function daysUntilDeadline(value, now) {
  const deadlineDay = calendarDay(value);
  const currentDay = calendarDay(now);
  return deadlineDay == null || currentDay == null ? null : Math.max(0, Math.round((deadlineDay - currentDay) / 86400000));
}

/*
  SÜZGEÇLERİN TEK GERÇEK KAYNAĞI ADRES

  Arama ve süzgeçler bir zamanlar bellekte tutuluyordu: sayfa
  yenilendiğinde kayboluyor, süzülmüş bir liste paylaşılamıyordu. Durumun
  tamamı adreste.

  MODEL TÜRDEN KATEGORİYE GEÇTİ
  -----------------------------
  Eski model tek tek TÜR süzüyordu (`type=scholarship`). Göç dört yeni
  tür açınca on bir türlük bir radyo listesi çıktı; kimse "student_support
  mu youth_program mu" diye düşünmüyor. Süzgeç artık dört KATEGORİ
  (lib/firsat-kategori.mjs) ve Burslar içinde bir KAYNAK ayrımı.

  Eski `type=` bağlantıları okunmaya devam ediyor: değeri kategorisine
  çevriliyor, `type=kyk` ayrıca kaynak süzgecini açıyor. Eski `place=`
  de `sehir` olarak okunuyor. Paylaşılmış bağlantılar kırılmıyor.

  `durum`, `takvimsiz` ve `level` kaldırıldı: ana liste artık sunucuda
  `status=published` + son tarihi geçmemiş olarak süzülüyor, yani
  "yalnızca açık" bir seçenek değil varsayılan. Yerine "Son başvuru
  tarihi" (7/30 gün) geldi — öğrencinin sorduğu soru buydu.
*/
const BOLGELER = ['turkiye', 'yurtdisi'];
const MODLAR = ['yuz-yuze', 'cevrim-ici'];
const SIRALAMALAR = ['son-tarih', 'yeni'];
const SON_GUNLER = ['7', '30'];
const KATEGORILER = ['burslar', 'programlar', 'yarismalar', 'kariyer-etkinlikleri'];
const KAYNAKLAR = ['kyk', 'diger'];

/* Eski tür adresleri: değeri kategoriye çeviren tek tablo. */
const ESKI_TUR_KATEGORISI = {
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

export const BOS_FIRSAT_SUZGECI = {
  query: '',
  kategori: '',
  kaynak: '',
  sehir: '',
  bolge: '',
  mod: '',
  sonGun: '',
  banaUygun: false,
  kaydedilen: false,
  arsiv: false,
  siralama: '',
  takvim: false,
};

const secilen = (deger, izinli) => (izinli.includes(deger) ? deger : '');

export function readOpportunityFilters(search) {
  const params = new URLSearchParams(search);
  const eskiTur = ESKI_TUR_KATEGORISI[params.get('type')] || '';
  return {
    query: params.get('q') || '',
    kategori: secilen(params.get('kategori'), KATEGORILER) || eskiTur,
    kaynak: secilen(params.get('kaynak'), KAYNAKLAR) || (params.get('type') === 'kyk' ? 'kyk' : ''),
    /* `place` eski addı; iki ad da aynı alana yazıyor. */
    sehir: params.get('sehir') || params.get('place') || '',
    bolge: secilen(params.get('bolge'), BOLGELER),
    mod: secilen(params.get('mod'), MODLAR),
    sonGun: secilen(params.get('son'), SON_GUNLER),
    banaUygun: params.get('uygun') === '1',
    kaydedilen: params.get('kayit') === '1',
    arsiv: params.get('arsiv') === '1',
    siralama: secilen(params.get('sirala'), SIRALAMALAR),
    takvim: params.get('gorunum') === 'takvim',
  };
}

export function serializeOpportunityFilters(filters = {}) {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.kategori) params.set('kategori', filters.kategori);
  if (filters.kaynak) params.set('kaynak', filters.kaynak);
  if (filters.sehir) params.set('sehir', filters.sehir);
  if (filters.bolge) params.set('bolge', filters.bolge);
  if (filters.mod) params.set('mod', filters.mod);
  if (filters.sonGun) params.set('son', filters.sonGun);
  if (filters.banaUygun) params.set('uygun', '1');
  if (filters.kaydedilen) params.set('kayit', '1');
  if (filters.arsiv) params.set('arsiv', '1');
  if (filters.siralama) params.set('sirala', filters.siralama);
  if (filters.takvim) params.set('gorunum', 'takvim');
  const query = params.toString();
  return query ? `?${query}` : '';
}

/*
  BOŞ SONUÇ HANGİ SÜZGECİN DARALTTIĞINI SÖYLÜYOR

  "Bu filtrelere uyan fırsat yok" cümlesi hangi filtrenin daralttığını
  söylemiyordu; kullanıcı paneli açıp tek tek aramak zorundaydı. Boş
  durum artık açık süzgeçleri ADIYLA sayıyor ve her biri tek tek
  kaldırılabiliyor.

  Sıra kullanıcının onları açtığı sırayla değil, panelde gördüğü sırayla:
  önce arama ve kategori, sonra daraltıcılar.
*/
const KATEGORI_ADI = {
  burslar: 'Burslar',
  programlar: 'Programlar',
  yarismalar: 'Yarışmalar',
  'kariyer-etkinlikleri': 'Kariyer Etkinlikleri',
};

export function aktifFirsatSuzgecleri(filters = {}) {
  const liste = [];
  if (filters.query) liste.push({ id: 'query', etiket: `Arama: “${filters.query}”` });
  if (filters.kategori)
    liste.push({ id: 'kategori', etiket: `Kategori: ${KATEGORI_ADI[filters.kategori] ?? filters.kategori}` });
  if (filters.kaynak)
    liste.push({ id: 'kaynak', etiket: filters.kaynak === 'kyk' ? 'Kaynak: KYK' : 'Kaynak: Diğer kurumlar' });
  if (filters.sonGun) liste.push({ id: 'sonGun', etiket: `Son başvuru: ${filters.sonGun} gün içinde` });
  if (filters.sehir) liste.push({ id: 'sehir', etiket: `Şehir: ${filters.sehir}` });
  if (filters.bolge)
    liste.push({ id: 'bolge', etiket: filters.bolge === 'turkiye' ? 'Türkiye' : 'Yurt dışı' });
  if (filters.mod)
    liste.push({ id: 'mod', etiket: filters.mod === 'yuz-yuze' ? 'Yüz yüze' : 'Çevrim içi' });
  if (filters.banaUygun) liste.push({ id: 'banaUygun', etiket: 'Bana uygun' });
  if (filters.kaydedilen) liste.push({ id: 'kaydedilen', etiket: 'Kaydedilenler' });
  if (filters.arsiv) liste.push({ id: 'arsiv', etiket: 'Süresi dolanlar' });
  return liste;
}

export function matchOpportunity(opportunity, profile) {
  const missingProfileFields = [];
  const requirements = [
    ['educationLevel', opportunity.educationLevels?.length, profile.educationLevel],
    ['department', opportunity.eligibleDepartments?.length, profile.department],
    ['gradeLevel', opportunity.eligibleClassYears?.length, profile.gradeLevel],
    ['city', opportunity.cities?.length, profile.city],
    ['gpa', opportunity.minimumGpa != null, profile.gpa],
    ['languages', opportunity.languageRequirements?.length, profile.languages?.length],
  ];
  for (const [field, needed, value] of requirements) if (needed && (value == null || value === '' || value === 0)) missingProfileFields.push(field);
  if (missingProfileFields.length) return { isScorable: false, score: null, missingProfileFields };

  const checks = [];
  if (opportunity.educationLevels?.length) checks.push(opportunity.educationLevels.includes(profile.educationLevel));
  if (opportunity.eligibleDepartments?.length) checks.push(opportunity.eligibleDepartments.some((d) => d.localeCompare(profile.department, 'tr', { sensitivity: 'base' }) === 0));
  if (opportunity.eligibleClassYears?.length) checks.push(opportunity.eligibleClassYears.includes(profile.gradeLevel));
  if (opportunity.cities?.length) checks.push(opportunity.cities.some((city) => city.localeCompare(profile.city, 'tr', { sensitivity: 'base' }) === 0));
  if (opportunity.minimumGpa != null) checks.push(Number(profile.gpa) >= Number(opportunity.minimumGpa));
  if (opportunity.languageRequirements?.length) checks.push(opportunity.languageRequirements.every((r) => profile.languages.some((l) => l.toLocaleLowerCase('tr-TR') === r.toLocaleLowerCase('tr-TR'))));
  return { isScorable: checks.length > 0, score: checks.length ? Math.round((checks.filter(Boolean).length / checks.length) * 100) : null, missingProfileFields: [] };
}
