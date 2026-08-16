/**
 * Veritabanı satırları (snake_case) ile arayüz tipleri (camelCase) arasındaki tek çeviri noktası.
 *
 * Kural: bileşenlerin hiçbiri ham satır görmez. Sorgu fonksiyonları buradan geçirir.
 * Böylece şema değişince tek dosya güncellenir.
 */

import type { Enums, Tables, TablesUpdate } from '../database.types';
import type {
  ApplicationRecord,
  CompanyAccount,
  InternshipListing,
  QuizQuestion,
  SkillCategory,
  SkillQuiz,
  StudentLanguage,
  StudentProfile,
  StudentProject,
  StudentSkill,
} from '../../types';

/**
 * `SkillCategory` arayüz tipi, tasarımdan kalan eski küçük harfli değerleri de taşıyor
 * ('hard_skills', 'soft_skills', 'languages'). DB enum'unda bunlar yok — burada eşleniyor.
 */
export function toDbSkillCategory(category: SkillCategory): Enums<'skill_category'> {
  switch (category) {
    case 'hard_skills':
      return 'General';
    case 'soft_skills':
      return 'Soft Skills';
    case 'languages':
      return 'Languages';
    default:
      return category;
  }
}

/** Postgres `numeric` PostgREST'ten string gelebilir; sayıya zorla. */
const num = (v: number | string | null | undefined, fallback = 0): number => {
  if (v === null || v === undefined) return fallback;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : fallback;
};

// ---------------------------------------------------------------- İlanlar

/**
 * İlan sorgularında okunan kolonlar. `*` KULLANMA — `raw` gibi kolonlarda
 * istemcinin SELECT yetkisi yok, `*` sorgusu 401 döner.
 * Yeni kolon eklendiğinde hem buraya hem 0005 migrasyonundaki GRANT listesine ekle.
 */
export const LISTING_COLUMNS = [
  'id',
  'company_id',
  'title',
  'department',
  'work_type',
  'city',
  'mandatory_staj_accepted',
  'voluntary_staj_accepted',
  'is_paid',
  'stipend_text',
  'duration',
  'term',
  'application_deadline',
  'min_grade_level',
  'required_skills',
  'preferred_skills',
  'description',
  'responsibilities',
  'perks',
  'category',
  'featured',
  'status',
  'applicants_count',
  'posted_at',
  'created_at',
  'updated_at',
  'origin',
  'source_id',
  'source_url',
  'canonical_url',
  'apply_url',
  'application_method',
  'application_channel_id',
  'insurance_note',
].join(', ');

/** Yalnızca yukarıdaki kolonlar okunduğu için satır tipi de daraltılmış. */
type ReadableListingRow = Omit<
  Tables<'listings'>,
  | 'raw'
  | 'raw_listing_id'
  | 'source_listing_id'
  | 'content_hash'
  | 'first_seen_at'
  | 'last_seen_at'
  | 'imported_at'
  | 'deactivated_at'
  | 'deactivation_reason'
>;

export type ListingRowWithCompany = ReadableListingRow & {
  companies: Pick<
    Tables<'companies'>,
    'name' | 'slug' | 'logo_url' | 'industry' | 'size' | 'location' | 'description' | 'rating'
  > | null;
};

export function toInternshipListing(row: ListingRowWithCompany): InternshipListing {
  const c = row.companies;
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: c?.name ?? 'Bilinmeyen Şirket',
    companySlug: c?.slug ?? undefined,
    companyLogo: c?.logo_url ?? '',
    companyIndustry: c?.industry ?? '',
    companySize: c?.size ?? '',
    companyLocation: c?.location ?? '',
    companyDescription: c?.description ?? '',
    companyRating: num(c?.rating),
    title: row.title,
    department: row.department ?? '',
    workType: row.work_type,
    city: row.city ?? '',
    mandatoryStajAccepted: row.mandatory_staj_accepted,
    voluntaryStajAccepted: row.voluntary_staj_accepted,
    stipend: {
      isPaid: row.is_paid,
      amountText: row.stipend_text ?? undefined,
    },
    duration: row.duration ?? '',
    term: row.term,
    applicationDeadline: row.application_deadline ?? '',
    minGradeLevel: row.min_grade_level ?? '',
    requiredSkills: row.required_skills,
    preferredSkills: row.preferred_skills,
    description: row.description ?? '',
    responsibilities: row.responsibilities,
    perks: row.perks,
    applicantsCount: row.applicants_count,
    // posted_at yalnızca yayına alındığında dolar; taslakta created_at'e düş.
    postedAt: row.posted_at ?? row.created_at,
    featured: row.featured,
    category: row.category,
    origin: row.origin,
    applicationMethod: row.application_method,
    applyUrl: row.apply_url ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    applicationChannelId: row.application_channel_id ?? undefined,
    insuranceNote: row.insurance_note ?? undefined,
  };
}

/** Arayüzden gelen ilanı INSERT gövdesine çevirir. id/sayaç/tarih alanları DB'ye bırakılır. */
export function toListingInsert(
  listing: InternshipListing,
  companyId: string,
  status: Tables<'listings'>['status'] = 'published'
) {
  return {
    company_id: companyId,
    title: listing.title,
    department: listing.department || null,
    work_type: listing.workType,
    city: listing.city || null,
    mandatory_staj_accepted: listing.mandatoryStajAccepted,
    voluntary_staj_accepted: listing.voluntaryStajAccepted,
    is_paid: listing.stipend.isPaid,
    stipend_text: listing.stipend.amountText || null,
    duration: listing.duration || null,
    term: listing.term,
    application_deadline: listing.applicationDeadline || null,
    min_grade_level: listing.minGradeLevel || null,
    required_skills: listing.requiredSkills,
    preferred_skills: listing.preferredSkills,
    description: listing.description || null,
    responsibilities: listing.responsibilities,
    perks: listing.perks,
    category: listing.category ?? 'general',
    featured: listing.featured ?? false,
    status,
    // Şirket portalından girilen ilan tanımı gereği platform içi başvuru alır.
    origin: 'internal' as const,
    application_method: 'internal' as const,
  };
}

// ---------------------------------------------------------------- Öğrenci

export type StudentRowBundle = Tables<'student_profiles'> & {
  profiles: Pick<Tables<'profiles'>, 'full_name' | 'email' | 'phone' | 'avatar_url'> | null;
  student_skills: Tables<'student_skills'>[];
  student_languages: Tables<'student_languages'>[];
  student_projects: Tables<'student_projects'>[];
};

export function toStudentProfile(row: StudentRowBundle): StudentProfile {
  const p = row.profiles;
  return {
    id: row.id,
    fullName: p?.full_name ?? '',
    email: p?.email ?? '',
    phone: p?.phone ?? '',
    university: row.university ?? '',
    faculty: row.faculty ?? '',
    department: row.department ?? '',
    // grade_level nullable; arayüz tipi zorunlu, en yaygın değere düş.
    gradeLevel: row.grade_level ?? '3. Sınıf',
    graduationYear: row.graduation_year ?? new Date().getFullYear() + 1,
    gpa: num(row.gpa),
    avatarUrl: p?.avatar_url ?? '',
    bio: row.bio ?? '',
    githubUsername: row.github_username ?? undefined,
    linkedinUrl: row.linkedin_url ?? undefined,
    portfolioUrl: row.portfolio_url ?? undefined,
    skills: (row.student_skills ?? []).map(toStudentSkill),
    softSkills: row.soft_skills,
    languages: (row.student_languages ?? []).map(toStudentLanguage),
    targetRoles: row.target_roles,
    preferences: {
      workType: row.pref_work_type,
      cities: row.pref_cities,
      type: row.pref_type,
      mandatoryInsuranceProvidedByUni: row.pref_uni_provides_insurance,
      earliestStartDate: row.pref_earliest_start ?? '',
      weeklyDaysAvailable: row.pref_weekly_days ?? 5,
      minMonthlyStipend: row.pref_min_stipend ?? undefined,
    },
    projects: (row.student_projects ?? []).map(toStudentProject),
    earnedBadges: row.earned_badges,
  };
}

export function toStudentSkill(row: Tables<'student_skills'>): StudentSkill {
  return {
    name: row.name,
    level: row.level,
    category: row.category,
    domain: row.domain ?? undefined,
    verified: row.verified,
    yearsOfExp: row.years_of_exp ?? undefined,
  };
}

export function toStudentLanguage(row: Tables<'student_languages'>): StudentLanguage {
  return {
    id: row.id,
    language: row.language,
    level: row.level,
    proficiencyText: row.proficiency_text ?? row.level,
    verified: row.verified,
  };
}

export function toStudentProject(row: Tables<'student_projects'>): StudentProject {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    techStack: row.tech_stack,
    githubUrl: row.github_url ?? undefined,
    liveUrl: row.live_url ?? undefined,
  };
}

/**
 * StudentProfile yamasını iki ayrı UPDATE gövdesine böler:
 * kimlik alanları `profiles`'a, akademik/tercih alanları `student_profiles`'a gider.
 *
 * `role` bilerek dışarıda: RLS politikası zaten değişmesine izin vermiyor.
 */
export function splitStudentUpdate(patch: Partial<StudentProfile>) {
  const profilePatch: Partial<Tables<'profiles'>> = {};
  if (patch.fullName !== undefined) profilePatch.full_name = patch.fullName;
  if (patch.phone !== undefined) profilePatch.phone = patch.phone;
  if (patch.avatarUrl !== undefined) profilePatch.avatar_url = patch.avatarUrl;

  const studentPatch: Partial<Tables<'student_profiles'>> = {};
  if (patch.university !== undefined) studentPatch.university = patch.university;
  if (patch.faculty !== undefined) studentPatch.faculty = patch.faculty;
  if (patch.department !== undefined) studentPatch.department = patch.department;
  if (patch.gradeLevel !== undefined) studentPatch.grade_level = patch.gradeLevel;
  if (patch.graduationYear !== undefined) studentPatch.graduation_year = patch.graduationYear;
  if (patch.gpa !== undefined) studentPatch.gpa = patch.gpa;
  if (patch.bio !== undefined) studentPatch.bio = patch.bio;
  if (patch.githubUsername !== undefined)
    studentPatch.github_username = patch.githubUsername || null;
  if (patch.linkedinUrl !== undefined) studentPatch.linkedin_url = patch.linkedinUrl || null;
  if (patch.portfolioUrl !== undefined) studentPatch.portfolio_url = patch.portfolioUrl || null;
  if (patch.targetRoles !== undefined) studentPatch.target_roles = patch.targetRoles;
  if (patch.softSkills !== undefined) studentPatch.soft_skills = patch.softSkills;

  if (patch.preferences) {
    const pref = patch.preferences;
    if (pref.workType !== undefined) studentPatch.pref_work_type = pref.workType;
    if (pref.cities !== undefined) studentPatch.pref_cities = pref.cities;
    if (pref.type !== undefined) studentPatch.pref_type = pref.type;
    if (pref.mandatoryInsuranceProvidedByUni !== undefined)
      studentPatch.pref_uni_provides_insurance = pref.mandatoryInsuranceProvidedByUni;
    if (pref.earliestStartDate !== undefined)
      studentPatch.pref_earliest_start = pref.earliestStartDate || null;
    if (pref.weeklyDaysAvailable !== undefined)
      studentPatch.pref_weekly_days = pref.weeklyDaysAvailable;
    if (pref.minMonthlyStipend !== undefined)
      studentPatch.pref_min_stipend = pref.minMonthlyStipend ?? null;
  }

  return { profilePatch, studentPatch };
}

// ---------------------------------------------------------------- Şirket

export type CompanyRowWithMembers = Tables<'companies'> & {
  company_members: Array<
    Pick<Tables<'company_members'>, 'recruiter_role' | 'is_owner'> & {
      profiles: Pick<Tables<'profiles'>, 'full_name' | 'email' | 'avatar_url'> | null;
    }
  >;
};

export function toCompanyAccount(row: CompanyRowWithMembers): CompanyAccount {
  const members = row.company_members ?? [];
  const owner = members.find((m) => m.is_owner) ?? members[0];
  return {
    id: row.id,
    name: row.name,
    logo: row.logo_url ?? '',
    industry: row.industry ?? '',
    size: row.size ?? '',
    location: row.location ?? '',
    description: row.description ?? '',
    websiteUrl: row.website_url ?? undefined,
    rating: num(row.rating),
    verified: row.verified,
    recruiterName: owner?.profiles?.full_name ?? '',
    recruiterEmail: owner?.profiles?.email ?? '',
    recruiterRole: owner?.recruiter_role ?? 'Recruiter',
    recruiterAvatar: owner?.profiles?.avatar_url ?? '',
    plan: row.plan,
    createdAt: row.created_at,
  };
}

/**
 * Şirket profili yaması. `verified` ve `rating` bilerek yok —
 * RLS politikası şirketin kendi doğrulama durumunu değiştirmesine izin vermiyor.
 */
export function toCompanyUpdate(patch: Partial<CompanyAccount>) {
  const out: TablesUpdate<'companies'> = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.logo !== undefined) out.logo_url = patch.logo || null;
  if (patch.industry !== undefined) out.industry = patch.industry || null;
  if (patch.size !== undefined) out.size = patch.size || null;
  if (patch.location !== undefined) out.location = patch.location || null;
  if (patch.description !== undefined) out.description = patch.description || null;
  if (patch.websiteUrl !== undefined) out.website_url = patch.websiteUrl || null;
  return out;
}

// ---------------------------------------------------------------- Başvurular

export function toApplicationRecord(row: Tables<'applications'>): ApplicationRecord {
  return {
    id: row.id,
    listingId: row.listing_id,
    studentId: row.student_id,
    appliedAt: row.applied_at,
    updatedAt: row.updated_at,
    status: row.status,
    matchScore: row.match_score ?? 0,
    coverLetter: row.cover_letter ?? undefined,
    interviewDate: row.interview_date ?? undefined,
    interviewNotes: row.interview_notes ?? undefined,
    companyFeedback: row.company_feedback ?? undefined,
  };
}

// ---------------------------------------------------------------- Quizler

export type QuizRowWithQuestions = Tables<'quizzes'> & {
  quiz_questions_public: Array<Tables<'quiz_questions_public'>>;
};

/**
 * DİKKAT: `correctIndex` istemciye hiç gelmiyor — `quiz_questions_public` view'ında o kolon yok.
 * Arayüz tipi alanı zorunlu tuttuğu için -1 konuyor; puanlama sunucuda yapılmalı.
 */
export function toSkillQuiz(row: QuizRowWithQuestions): SkillQuiz {
  const questions: QuizQuestion[] = (row.quiz_questions_public ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((q) => ({
      id: q.id ?? '',
      question: q.question ?? '',
      codeSnippet: q.code_snippet ?? undefined,
      options: q.options ?? [],
      correctIndex: -1,
      explanation: '',
    }));

  return {
    id: row.id,
    skillName: row.skill_name,
    badgeName: row.badge_name,
    badgeIcon: row.badge_icon ?? '🏅',
    category: row.category,
    questions,
  };
}
