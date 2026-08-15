/**
 * Kural tabanlı boşluk analizi — Gemini'nin match-analysis ucunun yerini alır.
 *
 * Tamamı mevcut matchingEngine çıktısından türetilir. Yeni bir puanlama
 * mantığı icat etmiyoruz; zaten hesaplanan MatchBreakdown'ı öğrenciye
 * anlamlı bir eylem planına çeviriyoruz.
 */

import { calculateInternshipMatch } from '../utils/matchingEngine';
import type { StudentProfile, InternshipListing, MatchBreakdown } from '../types';

export interface SkillGap {
  skill: string;
  importance: 'High' | 'Medium' | 'Low';
  howToBridge: string;
  estimatedDays: number;
}

export interface GapAnalysis {
  readinessScore: number;
  overallSummary: string;
  strengths: string[];
  gaps: SkillGap[];
  studyPlan7Days: string[];
  interviewAdvice: string;
  highlightProjectsIdea: string;
  breakdown: MatchBreakdown;
}

// ---------------------------------------------------------------------------
// Beceri → öğrenme yolu haritası
// Elle yazıldı; genel bir modelden daha isabetli çünkü Türkiye'deki staj
// ilanlarında gerçekten geçen beceriler için özelleştirilmiş.
// ---------------------------------------------------------------------------

interface LearningPath {
  days: number;
  bridge: string;
  projectIdea: string;
}

const LEARNING_PATHS: Array<{ match: RegExp; path: LearningPath }> = [
  {
    match: /react native|flutter/i,
    path: { days: 10, bridge: 'Resmî "ilk uygulama" rehberini bitir, ardından tek ekranlı bir liste + detay uygulaması yaz.', projectIdea: 'Ders programı takip uygulaması' },
  },
  {
    match: /react|vue|angular/i,
    path: { days: 7, bridge: 'Bileşen, state ve props kavramlarını öğrenip bir API\'den veri çeken tek sayfalık arayüz yap.', projectIdea: 'Staj ilanı listeleyen filtreli arayüz' },
  },
  {
    match: /typescript/i,
    path: { days: 4, bridge: 'Mevcut bir JavaScript projeni TypeScript\'e çevir — sıfırdan öğrenmekten hızlı sonuç verir.', projectIdea: 'Var olan projeni tip güvenli hale getirme' },
  },
  {
    match: /docker|kubernetes/i,
    path: { days: 5, bridge: 'Kendi projenin Dockerfile\'ını yaz ve docker compose ile veritabanıyla birlikte ayağa kaldır.', projectIdea: 'Uygulamanı tek komutla çalışan konteynere alma' },
  },
  {
    match: /sql|postgres|mysql/i,
    path: { days: 5, bridge: 'JOIN, GROUP BY ve indeks konularına odaklan; gerçek bir veri setiyle 20 sorgu yaz.', projectIdea: 'Açık veri seti üzerinde analiz sorguları' },
  },
  {
    match: /git ?& ?github|git\b/i,
    path: { days: 2, bridge: 'Branch, merge, rebase ve pull request akışını bir arkadaşınla pratik et.', projectIdea: 'Açık kaynak bir projeye küçük bir katkı' },
  },
  {
    match: /aws|azure|google cloud|gcp/i,
    path: { days: 7, bridge: 'Ücretsiz katmanda tek bir servisi öğren (örn. depolama), üzerine küçük bir uygulama koy.', projectIdea: 'Statik siteyi bulutta yayına alma' },
  },
  {
    match: /pandas|numpy|scikit|makine öğren|machine learning/i,
    path: { days: 10, bridge: 'Bir Kaggle veri setiyle uçtan uca çalış: temizleme, görselleştirme, basit model, sonuç yorumu.', projectIdea: 'Türkiye verisiyle bir tahmin modeli' },
  },
  {
    match: /figma|adobe xd|ui\/ux/i,
    path: { days: 5, bridge: 'Beğendiğin bir uygulamanın üç ekranını yeniden tasarla ve kararlarını yazıyla açıkla.', projectIdea: 'Bir kamu hizmeti arayüzünün yeniden tasarımı' },
  },
  {
    match: /excel/i,
    path: { days: 3, bridge: 'Pivot tablo, VLOOKUP/XLOOKUP ve koşullu biçimlendirme üçlüsünü gerçek bir veriyle çalış.', projectIdea: 'Kişisel bütçe takip tablosu' },
  },
  {
    match: /node|express|django|fastapi|flask|spring/i,
    path: { days: 7, bridge: 'Dört uçlu (CRUD) bir REST API yaz ve veritabanına bağla.', projectIdea: 'Basit bir not/görev API\'si' },
  },
];

const DEFAULT_PATH: LearningPath = {
  days: 5,
  bridge: 'Resmî dokümantasyondan başla, öğrendiğini küçük bir örnekle pekiştir ve GitHub\'a koy.',
  projectIdea: 'Öğrendiğini gösteren küçük bir demo',
};

function pathFor(skill: string): LearningPath {
  return LEARNING_PATHS.find((p) => p.match.test(skill))?.path ?? DEFAULT_PATH;
}

// ---------------------------------------------------------------------------
// Analiz
// ---------------------------------------------------------------------------

export function analyzeGap(
  student: StudentProfile,
  listing: InternshipListing,
): GapAnalysis {
  const breakdown = calculateInternshipMatch(student, listing);

  // --- Güçlü yanlar ---
  const strengths: string[] = [];

  const verifiedMatches = breakdown.matchedRequiredSkills.filter((skill) =>
    student.skills?.some(
      (s) => s.name.toLowerCase().includes(skill.toLowerCase()) && s.verified,
    ),
  );

  if (verifiedMatches.length > 0) {
    strengths.push(
      `${verifiedMatches.join(', ')} becerilerin sınavla doğrulanmış — başvurunda rozetli görünecek.`,
    );
  }

  if (breakdown.matchedRequiredSkills.length > 0) {
    strengths.push(
      `İlandaki ${breakdown.matchedRequiredSkills.length}/${listing.requiredSkills.length} zorunlu beceriyi karşılıyorsun: ${breakdown.matchedRequiredSkills.slice(0, 4).join(', ')}.`,
    );
  }

  if (breakdown.matchedPreferredSkills.length > 0) {
    strengths.push(
      `Tercih edilen becerilerden ${breakdown.matchedPreferredSkills.slice(0, 3).join(', ')} sende var — bu seni diğer adaylardan ayırır.`,
    );
  }

  const relatedProjects = (student.projects || []).filter((p) =>
    p.techStack?.some((t) =>
      listing.requiredSkills.some((r) => r.toLowerCase().includes(t.toLowerCase())),
    ),
  );
  if (relatedProjects.length > 0) {
    strengths.push(
      `"${relatedProjects[0].title}" projen ilanın teknolojileriyle doğrudan örtüşüyor — başvuruda öne çıkar.`,
    );
  }

  if (breakdown.isWorkTypeCompatible && listing.workType === 'Remote') {
    strengths.push('İlan uzaktan çalışmaya açık, konum kısıtın devreye girmiyor.');
  }

  if (strengths.length === 0) {
    strengths.push('Profilin gelişmeye açık; aşağıdaki eksikleri kapattığında bu ilan erişilebilir hale gelir.');
  }

  // --- Eksikler ---
  // Zorunlu beceriler yüksek, tercih edilenler orta öncelikli.
  const gaps: SkillGap[] = [
    ...breakdown.missingRequiredSkills.map((skill, i) => {
      const path = pathFor(skill);
      return {
        skill,
        importance: (i < 2 ? 'High' : 'Medium') as SkillGap['importance'],
        howToBridge: path.bridge,
        estimatedDays: path.days,
      };
    }),
    ...breakdown.missingPreferredSkills.slice(0, 2).map((skill) => {
      const path = pathFor(skill);
      return {
        skill,
        importance: 'Low' as const,
        howToBridge: path.bridge,
        estimatedDays: path.days,
      };
    }),
  ];

  // --- 7 günlük plan ---
  const studyPlan7Days = buildStudyPlan(gaps);

  // --- Mülakat tavsiyesi ---
  const interviewAdvice = buildInterviewAdvice(breakdown, listing, relatedProjects.length > 0);

  // --- Proje fikri ---
  const topGap = gaps.find((g) => g.importance === 'High') ?? gaps[0];
  const highlightProjectsIdea = topGap
    ? `${pathFor(topGap.skill).projectIdea} — ${topGap.skill} becerini somut olarak gösterir ve ilandaki en kritik eksiği kapatır.`
    : `${listing.department || listing.title} alanında küçük ama bitmiş bir proje ekle; mevcut becerilerini pekiştirir.`;

  // --- Özet ---
  const overallSummary = buildSummary(breakdown, listing, gaps);

  return {
    readinessScore: breakdown.overallScore,
    overallSummary,
    strengths: strengths.slice(0, 4),
    gaps: gaps.slice(0, 5),
    studyPlan7Days,
    interviewAdvice,
    highlightProjectsIdea,
    breakdown,
  };
}

function buildStudyPlan(gaps: SkillGap[]): string[] {
  if (gaps.length === 0) {
    return [
      '1-2. Gün: İlanın şirketini araştır — ürünleri, son duyuruları, teknoloji yığını.',
      '3-4. Gün: En güçlü projeni README\'siyle birlikte cilala.',
      '5-6. Gün: Kendine ait sorularla mülakat provası yap.',
      '7. Gün: Motivasyon mektubunu yaz ve başvur.',
    ];
  }

  const plan: string[] = [];
  const priority = [...gaps].sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return order[a.importance] - order[b.importance] || a.estimatedDays - b.estimatedDays;
  });

  const first = priority[0];
  plan.push(`1-3. Gün: ${first.skill} — ${first.howToBridge}`);

  if (priority[1]) {
    plan.push(`4-5. Gün: ${priority[1].skill} — ${priority[1].howToBridge}`);
  } else {
    plan.push(`4-5. Gün: ${first.skill} bilgini küçük bir projeye dönüştür ve GitHub'a yükle.`);
  }

  plan.push('6. Gün: Yaptığın işi README ile belgele — ne yaptığın kadar nasıl anlattığın da önemli.');
  plan.push('7. Gün: Profilini güncelle, beceri sınavını çöz ve başvurunu gönder.');

  const totalDays = priority.slice(0, 2).reduce((sum, g) => sum + g.estimatedDays, 0);
  if (totalDays > 12) {
    plan.push(
      `Not: Bu eksikler gerçekçi olarak ~${totalDays} gün istiyor. 7 güne sığdırmak yerine başvuruyu şimdi yapıp öğrenmeye devam etmek daha iyi bir strateji olabilir.`,
    );
  }

  return plan;
}

function buildInterviewAdvice(
  breakdown: MatchBreakdown,
  listing: InternshipListing,
  hasRelatedProject: boolean,
): string {
  const parts: string[] = [];

  if (breakdown.missingRequiredSkills.length > 0) {
    parts.push(
      `${breakdown.missingRequiredSkills[0]} bilmediğini saklama; bunun yerine yeni bir teknolojiyi daha önce nasıl hızlıca öğrendiğini anlat.`,
    );
  }

  if (hasRelatedProject) {
    parts.push('Projendeki teknik bir kararı ve neden o kararı verdiğini anlatmaya hazırlan — stajyer mülakatlarında en ayırt edici kısım budur.');
  } else {
    parts.push('Somut bir proje anlatamıyorsan, derslerdeki bir ödevi bile problem-çözüm-sonuç yapısında anlatabilirsin.');
  }

  if (!breakdown.isEligibleForMandatory) {
    parts.push('Zorunlu staj SGK durumunu görüşmenin başında netleştir; ilan bu konuda esnek görünmüyor.');
  }

  parts.push(`${listing.companyName} hakkında bir soru hazırla — ilgisizlik en sık verilen olumsuz geri bildirim.`);

  return parts.slice(0, 3).join(' ');
}

function buildSummary(
  breakdown: MatchBreakdown,
  listing: InternshipListing,
  gaps: SkillGap[],
): string {
  const highGaps = gaps.filter((g) => g.importance === 'High');

  if (breakdown.overallScore >= 88) {
    return `${listing.companyName} ilanı için güçlü bir adaysın — zorunlu becerilerin %${breakdown.coreSkillsMatchScore}'ini karşılıyorsun. Başvurunu ertelemene gerek yok.`;
  }
  if (breakdown.overallScore >= 75) {
    return `Bu ilana uyumun yüksek. ${highGaps.length > 0 ? `${highGaps[0].skill} eksiği var ama bu bir engel değil; başvururken öğrenmeye açık olduğunu belirt.` : 'Eksiğin kritik değil.'}`;
  }
  if (breakdown.overallScore >= 55) {
    return `Potansiyelin var ama ${highGaps.map((g) => g.skill).slice(0, 2).join(' ve ')} eksiği başvurunu zayıflatıyor. Aşağıdaki plan bu farkı kapatmaya yönelik.`;
  }
  return `Bu ilan şu an profilinden uzak: ${breakdown.missingRequiredSkills.slice(0, 3).join(', ')} bekleniyor. Yine de başvurabilirsin, ama benzer ilanlara paralel bakmanı öneririm.`;
}
