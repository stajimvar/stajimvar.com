/**
 * Staj sınıflandırıcı.
 *
 * Amaç: keşfedilen ilanın gerçekten staj olup olmadığına karar vermek.
 * "Senior Developer" elenmeli; "Stajyer", "Software Intern", "Uzun Dönem
 * Stajyer", "Zorunlu Staj" geçmeli.
 *
 * Tasarım kararları:
 *
 * 1. Kıdem sinyali her şeyi ezer. "Internship Program Manager" başlığında
 *    "internship" geçiyor ama bu tam zamanlı bir yöneticilik pozisyonu.
 *    Bu yüzden kıdem/yöneticilik tokenları tek başına reddetmeye yeter.
 *
 * 2. Yapılandırılmış veri metinden üstündür. Kaynak `employmentType: INTERN`
 *    diyorsa tahmin yürütmeye gerek yok.
 *
 * 3. Her karar gerekçesiyle döner (`notes`). Yanlış elenen ilanlar
 *    `raw_listings` içinde `reject_reason = 'not_internship'` ile duruyor;
 *    gerekçe olmadan sınıflandırıcının nerede yanıldığı anlaşılamaz.
 *
 * 4. Emin olunamayan durumda ELEME yönünde değil, "belirsiz" yönünde karar
 *    verilir — eşiğin altındakiler yayınlanmaz ama kayıtta kalır.
 */

import { fold } from './text.ts';

export interface ClassificationInput {
  title: string;
  description?: string | null;
  /** Kaynağın kendi alanı: schema.org employmentType, Greenhouse metadata vb. */
  employmentType?: string | null;
  /** Kaynak ilanı zaten "staj" kategorisinde yayınladıysa. */
  sourceSaysInternship?: boolean;
}

export interface Classification {
  isInternship: boolean;
  /** 0–1. `raw_listings.internship_score` alanına yazılır. */
  score: number;
  notes: string;
}

/** Başlıkta geçtiğinde güçlü staj sinyali. */
const STRONG_INTERN_TITLE = [
  'stajyer',
  'staj ',
  'staji',
  'stajı',
  'intern',
  'internship',
  'trainee',
  'co-op',
  'coop',
  'bursiyer',
  'ogrenci', // "öğrenci" — fold() sonrası
];

/**
 * Kıdem/yöneticilik sinyalleri. Başlıkta biri varsa ilan staj DEĞİLDİR,
 * başlıkta "intern" geçse bile.
 */
const SENIORITY_TITLE = [
  'senior',
  'sr.',
  ' sr ',
  'lead ',
  ' lead',
  'principal',
  'staff ',
  'manager',
  'mudur',
  'direktor',
  'director',
  'head of',
  'chief',
  'kidemli',
  'uzman',
  'architect',
  'mimar',
  'supervisor',
  'sef',
  'koordinator',
  'coordinator',
  'danisman',
  'consultant',
  'partner',
  'vp ',
  'baskan',
];

/** Açıklamada geçtiğinde staj olasılığını artıran ifadeler. */
const INTERN_BODY = [
  'zorunlu staj',
  'yaz staji',
  'uzun donem staj',
  'donem staji',
  'universite ogrencisi',
  'ogrencilik durumu',
  'devam eden ogrenci',
  'staj sigortasi',
  'staj defteri',
  'sgk staj',
  'isletmede mesleki egitim',
  'part-time intern',
  'summer internship',
  'currently enrolled',
  'pursuing a degree',
];

/** Açıklamada geçtiğinde staj olasılığını düşüren ifadeler. */
const EXPERIENCE_BODY = [
  'en az 3 yil',
  'en az 5 yil',
  'minimum 3 years',
  'minimum 5 years',
  '3+ years',
  '5+ years',
  '7+ years',
  'yillik deneyim sahibi',
  'tam zamanli calisabilecek',
];

function containsAny(haystack: string, needles: string[]): string | null {
  for (const needle of needles) {
    if (haystack.includes(needle)) return needle;
  }
  return null;
}

/** "5+ yıl deneyim" gibi kalıplardan yıl sayısı çıkarır. */
function maxYearsRequired(text: string): number {
  let max = 0;
  const patterns = [
    /(\d+)\s*\+?\s*(?:yil|yillik)\s*(?:deneyim|tecrube)/g,
    /(?:en az|minimum|min\.?)\s*(\d+)\s*(?:yil|year)/g,
    /(\d+)\s*\+?\s*years?\s*(?:of\s*)?experience/g,
  ];
  for (const re of patterns) {
    for (const match of text.matchAll(re)) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return max;
}

export const INTERNSHIP_THRESHOLD = 0.5;

export function classifyInternship(input: ClassificationInput): Classification {
  const title = fold(input.title);
  const body = fold(input.description ?? '').slice(0, 4000);
  const reasons: string[] = [];

  // --- 1. Kıdem sinyali: tek başına reddeder ---------------------------
  const seniority = containsAny(title, SENIORITY_TITLE);
  if (seniority) {
    return {
      isInternship: false,
      score: 0.02,
      notes: `başlıkta kıdem/yöneticilik sinyali: "${seniority.trim()}"`,
    };
  }

  // --- 2. Yapılandırılmış veri: tahmine gerek yok ----------------------
  const employment = fold(input.employmentType ?? '');
  if (employment.includes('intern')) {
    return {
      isInternship: true,
      score: 0.97,
      notes: `kaynak employmentType = "${input.employmentType}"`,
    };
  }

  let score = 0;

  // --- 3. Başlık sinyali ----------------------------------------------
  const titleHit = containsAny(title, STRONG_INTERN_TITLE);
  if (titleHit) {
    score += 0.6;
    reasons.push(`başlıkta "${titleHit.trim()}"`);
  }

  if (input.sourceSaysInternship) {
    score += 0.25;
    reasons.push('kaynak staj kategorisinde yayınlamış');
  }

  // --- 4. Gövde sinyalleri --------------------------------------------
  const bodyHit = containsAny(body, INTERN_BODY);
  if (bodyHit) {
    score += 0.2;
    reasons.push(`açıklamada "${bodyHit}"`);
  }

  const expHit = containsAny(body, EXPERIENCE_BODY);
  if (expHit) {
    score -= 0.35;
    reasons.push(`deneyim şartı: "${expHit}"`);
  }

  const years = maxYearsRequired(body);
  if (years >= 2) {
    score -= 0.4;
    reasons.push(`${years} yıl deneyim isteniyor`);
  }

  score = Math.max(0, Math.min(1, score));

  const isInternship = score >= INTERNSHIP_THRESHOLD;
  const notes = reasons.length > 0 ? reasons.join('; ') : 'staj sinyali bulunamadı';

  return { isInternship, score: Number(score.toFixed(3)), notes };
}

/**
 * Zorunlu staj (SGK'lı) kabul edip etmediğini tahmin eder.
 * Emin değilse `null` döner — false demek, kabul eden ilanı yanlışlıkla
 * elemek anlamına gelirdi.
 */
export function detectMandatoryStaj(description?: string | null): boolean | null {
  const text = fold(description ?? '');
  if (!text) return null;
  if (/zorunlu staj|staj sigortasi|sgk.{0,20}(karsilan|odenir)|isletmede mesleki egitim/.test(text)) {
    return true;
  }
  if (/zorunlu staj kabul edilmemekte|gonullu staj/.test(text)) return false;
  return null;
}

/** Ücretli mi? Bilinmiyorsa `null`. */
export function detectPaid(description?: string | null): boolean | null {
  const text = fold(description ?? '');
  if (!text) return null;
  if (/ucretsiz staj|ucret odenmemekte|unpaid/.test(text)) return false;
  if (/ucretli staj|maas|burs|stipend|yemek ve yol|paid internship|net ucret/.test(text)) {
    return true;
  }
  return null;
}
