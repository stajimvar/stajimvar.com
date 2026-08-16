import { StudentProfile, InternshipListing, MatchBreakdown } from '../types';

// Normalize skill name for case-insensitive and alias matching
export function normalizeSkill(name: string): string {
  const clean = name.toLowerCase().trim();
  const aliases: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'react.js': 'react',
    'reactjs': 'react',
    'vue.js': 'vue',
    'vuejs': 'vue',
    'node.js': 'node.js',
    'nodejs': 'node.js',
    'py': 'python',
    'golang': 'go',
    'postgres': 'postgresql',
    'tailwind': 'tailwind css',
    'next': 'next.js',
    'nextjs': 'next.js',
    'rest': 'rest api',
    'restful': 'rest api',
    'rest apis': 'rest api',
  };
  return aliases[clean] || clean;
}

/**
 * Profili olmayan ziyaretçi için nötr sonuç.
 *
 * Giriş yapmamış birine "%16 uyumlusun" demek anlamsız: karşılaştırılacak bir
 * "sen" yok. Bu durumda puan üretmek yerine hesaplanamaz işaretleniyor.
 */
function unscorableMatch(listing: InternshipListing, insight: string): MatchBreakdown {
  return {
    coreSkillsMatchScore: 0,
    bonusSkillsScore: 0,
    locationScore: 0,
    availabilityScore: 0,
    overallScore: 0,
    matchedRequiredSkills: [],
    missingRequiredSkills: listing?.requiredSkills || [],
    matchedPreferredSkills: [],
    missingPreferredSkills: listing?.preferredSkills || [],
    isEligibleForMandatory: true,
    isWorkTypeCompatible: true,
    isScorable: false,
    verdict: 'Insufficient Data',
    summaryInsight: insight,
  };
}

export function calculateInternshipMatch(
  student: StudentProfile | null | undefined,
  listing: InternshipListing
): MatchBreakdown {
  if (!student) {
    return unscorableMatch(
      listing,
      'Uyum puanı için profilinde yeteneklerini listelemen gerekiyor.'
    );
  }

  const studentSkillMap = new Map<string, { level: string; verified?: boolean }>();
  const studentSkills = student?.skills || [];
  for (const s of studentSkills) {
    studentSkillMap.set(normalizeSkill(s.name), { level: s.level, verified: s.verified });
  }

  // 1. Required Skills Match
  const reqSkills = listing?.requiredSkills || [];
  const matchedReq: string[] = [];
  const missingReq: string[] = [];

  let reqScoreSum = 0;
  for (const r of reqSkills) {
    const normR = normalizeSkill(r);
    // Check if student has exact or fuzzy match
    let found = false;
    for (const [sNorm, val] of studentSkillMap.entries()) {
      if (sNorm === normR || sNorm.includes(normR) || normR.includes(sNorm)) {
        found = true;
        matchedReq.push(r);
        // Level weight: Expert: 1.0, Advanced: 1.0, Intermediate: 0.9, Beginner: 0.75
        let levelWeight = 0.85;
        if (val.level === 'Expert' || val.level === 'Advanced') levelWeight = 1.0;
        if (val.level === 'Intermediate') levelWeight = 0.9;
        if (val.level === 'Beginner') levelWeight = 0.75;
        if (val.verified) levelWeight = Math.min(1.0, levelWeight + 0.05); // badge bonus
        reqScoreSum += levelWeight;
        break;
      }
    }
    if (!found) {
      missingReq.push(r);
    }
  }

  // DİKKAT: şart yoksa 100 vermek, "hiçbir şey istemiyor" ilanını "her şeyi
  // karşılıyorsun" diye ödüllendirir ve listeyi tersine çevirir. Şartsız
  // ilanlar aşağıda `isScorable = false` ile ayrı ele alınıyor.
  const coreSkillsMatchScore =
    reqSkills.length > 0 ? Math.round((reqScoreSum / reqSkills.length) * 100) : 0;

  // 2. Bonus / Preferred Skills Match
  const prefSkills = listing?.preferredSkills || [];
  const matchedPref: string[] = [];
  const missingPref: string[] = [];

  let prefScoreSum = 0;
  for (const p of prefSkills) {
    const normP = normalizeSkill(p);
    let found = false;
    for (const [sNorm] of studentSkillMap.entries()) {
      if (sNorm === normP || sNorm.includes(normP) || normP.includes(sNorm)) {
        found = true;
        matchedPref.push(p);
        prefScoreSum += 1;
        break;
      }
    }
    if (!found) {
      missingPref.push(p);
    }
  }

  const bonusSkillsScore =
    prefSkills.length > 0 ? Math.round((prefScoreSum / prefSkills.length) * 100) : 0;

  /**
   * İlanda hiç beceri bilgisi yoksa uyum ölçülemez. Bu, toplanan ilanlarda
   * sık görülüyor: kaynak metninde araç/teknoloji adı geçmiyorsa çıkarım
   * boş dönüyor. Böyle ilanlar için yüzde uydurmak yerine "hesaplanamıyor"
   * denecek.
   */
  const isScorable = reqSkills.length > 0 || prefSkills.length > 0;

  // 3. Location / WorkType compatibility
  let locationScore = 100;
  let isWorkTypeCompatible = true;
  const prefCities = student?.preferences?.cities || [];
  const prefWorkType = student?.preferences?.workType || 'Any';

  if (listing?.workType === 'Remote') {
    locationScore = 100;
  } else if (prefWorkType === 'Remote' && listing?.workType === 'On-site') {
    locationScore = 40;
    isWorkTypeCompatible = false;
  } else if (
    prefCities.length > 0 &&
    !prefCities.some((c) =>
      (listing?.city || '').toLowerCase().includes(c.toLowerCase())
    )
  ) {
    locationScore = 60;
  }

  // 4. Mandatory internship compatibility
  let isEligibleForMandatory = true;
  let availabilityScore = 100;

  if (student?.preferences?.type === 'Summer Mandatory' && !listing?.mandatoryStajAccepted) {
    availabilityScore -= 30;
    isEligibleForMandatory = false;
  }

  // 5. Total Weighted Overall Score
  // Core skills 55%, Bonus skills 20%, Location 15%, Availability/Staj type 10%
  const overallScore = !isScorable
    ? 0
    : Math.min(
        100,
        Math.max(
          15,
          Math.round(
            coreSkillsMatchScore * 0.55 +
              bonusSkillsScore * 0.2 +
              locationScore * 0.15 +
              availabilityScore * 0.1
          )
        )
      );

  let verdict: MatchBreakdown['verdict'] = 'Good Potential';
  let summaryInsight = '';

  if (!isScorable) {
    verdict = 'Insufficient Data';
    summaryInsight =
      'İlanda beceri şartı belirtilmemiş, uyum hesaplanamıyor. Ayrıntılar için ilana göz at.';
  } else if (overallScore >= 88) {
    verdict = 'Excellent Match';
    summaryInsight = `Mükemmel uyum! İlandaki zorunlu yetkinliklerin %${coreSkillsMatchScore}'ine sahipsiniz.`;
  } else if (overallScore >= 75) {
    verdict = 'Great Match';
    summaryInsight = `Yüksek eşleşme! ${matchedReq.length}/${reqSkills.length} temel yetenek örtüşüyor.`;
  } else if (overallScore >= 55) {
    verdict = 'Good Potential';
    summaryInsight = `Güçlü potansiyel. ${missingReq.slice(0, 2).join(', ')} becerilerini geliştirerek şansınızı katlayabilirsiniz.`;
  } else {
    verdict = 'Skill Gap Exists';
    summaryInsight = `Beceri farkı mevcut. İlan için ${missingReq.slice(0, 3).join(', ')} gereklidir.`;
  }

  return {
    coreSkillsMatchScore,
    bonusSkillsScore,
    locationScore,
    availabilityScore,
    overallScore,
    matchedRequiredSkills: matchedReq,
    missingRequiredSkills: missingReq,
    matchedPreferredSkills: matchedPref,
    missingPreferredSkills: missingPref,
    isEligibleForMandatory,
    isWorkTypeCompatible,
    isScorable,
    verdict,
    summaryInsight,
  };
}
