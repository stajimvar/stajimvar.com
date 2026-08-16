export type SkillCategory =
  | 'hard_skills'
  | 'soft_skills'
  | 'languages'
  | 'Languages'
  | 'Frontend'
  | 'Backend'
  | 'Mobile'
  | 'Data/AI'
  | 'DevOps/Cloud'
  | 'UI/UX Design'
  | 'Cybersecurity'
  | 'Product & Agile'
  | 'Soft Skills'
  | 'General';

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export type HardSkillDomain =
  | 'Yazılım & Bilişim'
  | 'Tasarım & Görsel'
  | 'Mühendislik & Üretim'
  | 'İşletme, Pazarlama & Finans';

export interface StudentLanguage {
  id: string;
  language: string;
  level: string; // e.g. "B2"
  proficiencyText: string; // e.g. "B2 - Profesyonel Çalışma Yetkinliği / İleri"
  verified?: boolean;
}

export interface StudentSkill {
  name: string;
  level: SkillLevel;
  category: SkillCategory;
  domain?: HardSkillDomain;
  verified?: boolean; // verified through skill quiz/badge
  yearsOfExp?: number;
}

export interface StudentProject {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  liveUrl?: string;
}

export interface StudentPreferences {
  workType: 'Remote' | 'Hybrid' | 'On-site' | 'Any';
  cities: string[];
  type: 'Summer Mandatory' | 'Long-term' | 'Voluntary' | 'Part-time' | 'Any';
  mandatoryInsuranceProvidedByUni: boolean; // Üniversite SGK karşılıyor mu
  earliestStartDate: string;
  weeklyDaysAvailable: number; // e.g. 3, 4, 5
  minMonthlyStipend?: number; // TL
}

export interface StudentProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  university: string;
  faculty: string;
  department: string;
  gradeLevel: '1. Sınıf' | '2. Sınıf' | '3. Sınıf' | '4. Sınıf' | 'Yüksek Lisans / Mezun';
  graduationYear: number;
  gpa: number;
  avatarUrl: string;
  bio: string;
  githubUsername?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  skills: StudentSkill[];
  softSkills?: string[];
  languages?: StudentLanguage[];
  targetRoles: string[];
  preferences: StudentPreferences;
  projects: StudentProject[];
  earnedBadges: string[];
}

export interface CompanyAccount {
  id: string;
  name: string;
  logo: string;
  industry: string;
  size: string;
  location: string;
  description: string;
  websiteUrl?: string;
  rating: number;
  verified: boolean;
  recruiterName: string;
  recruiterEmail: string;
  recruiterRole: string;
  recruiterAvatar: string;
  plan?: 'Enterprise' | 'Startup' | 'Corporate' | 'Free';
  createdAt?: string;
}

export interface InternshipListing {
  id: string;
  companyId?: string;
  companyName: string;
  companyLogo: string;
  companyIndustry: string;
  companySize: string;
  companyLocation: string;
  companyDescription: string;
  companyRating: number;
  title: string;
  department: string;
  workType: 'Remote' | 'Hybrid' | 'On-site';
  city: string;
  mandatoryStajAccepted: boolean; // Zorunlu staj kabul ediliyor mu
  voluntaryStajAccepted: boolean;
  stipend: {
    isPaid: boolean;
    amountText?: string; // e.g. "Asgari Ücret / Aylık Yemek & Yol"
  };
  duration: string; // e.g. "20 İş Günü (Yaz Stajı)", "3-6 Ay Uzun Dönem"
  term: 'Summer 2026' | 'Fall 2026' | 'Long-term 2026' | 'All Year';
  applicationDeadline: string;
  minGradeLevel: string; // e.g. "2. Sınıf ve üzeri"
  requiredSkills: string[];
  preferredSkills: string[];
  description: string;
  responsibilities: string[];
  perks: string[];
  applicantsCount: number;
  postedAt: string;
  featured?: boolean;
  category?: 'general' | 'public_sector' | 'global';

  // --- Kaynak ve başvuru kanalı (0004 migrasyonu) ---

  /** İlan nereden geldi: dış kaynaktan toplandı / şirket girdi / editör ekledi. */
  origin: 'scraped' | 'internal' | 'manual';
  /**
   * Başvuru nasıl yapılır:
   * - `email_application`: StajımVar'da toplanır, doğrulanmış İK adresine iletilir
   * - `external`: kullanıcı resmî siteye yönlendirilir (Kariyer Kapısı vb.)
   * - `internal`: şirket üye, başvuru tamamen platform içinde
   */
  applicationMethod: 'email_application' | 'external' | 'internal';
  /** `external` yönteminde başvurunun yapılacağı resmî adres. */
  applyUrl?: string;
  /** İlanın kaynaktaki adresi — "kaynağı gör" bağlantısı için. */
  sourceUrl?: string;
  /**
   * Doğrulanmış başvuru kanalının kimliği. Kanalın kendisi (e-posta adresi)
   * istemciye hiç inmiyor — gönderim server-side yapılıyor.
   * Doluysa kanal doğrulanmıştır; veritabanı tetikleyicisi bunu garanti ediyor.
   */
  applicationChannelId?: string;
  insuranceNote?: string;
}

export interface MatchBreakdown {
  coreSkillsMatchScore: number; // 0-100
  bonusSkillsScore: number; // 0-100
  locationScore: number; // 0-100
  availabilityScore: number; // 0-100
  overallScore: number; // 0-100
  matchedRequiredSkills: string[];
  missingRequiredSkills: string[];
  matchedPreferredSkills: string[];
  missingPreferredSkills: string[];
  isEligibleForMandatory: boolean;
  isWorkTypeCompatible: boolean;
  /**
   * İlanda hiç beceri şartı yoksa uyum hesaplanamaz.
   * "Şart yok" ile "bütün şartları karşılıyor" aynı şey değildir —
   * bu ayrım yapılmazsa şartsız ilanlar listenin başına çıkar.
   * `false` olduğunda arayüz yüzde göstermemeli.
   */
  isScorable: boolean;
  verdict:
    | 'Excellent Match'
    | 'Great Match'
    | 'Good Potential'
    | 'Skill Gap Exists'
    | 'Insufficient Data';
  summaryInsight: string;
}

export interface ApplicationRecord {
  id: string;
  listingId: string;
  studentId: string;
  appliedAt: string;
  updatedAt?: string; // applications.updated_at — durum değiştikçe tetikleyici günceller
  status:
    | 'submitted'
    | 'under_review'
    | 'technical_assessment'
    | 'interview_scheduled'
    | 'offer_extended'
    | 'rejected'
    | 'withdrawn';
  matchScore: number;
  coverLetter?: string;
  interviewDate?: string;
  interviewNotes?: string;
  companyFeedback?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SkillQuiz {
  id: string;
  skillName: string;
  badgeName: string;
  badgeIcon: string;
  category: SkillCategory;
  questions: QuizQuestion[];
}
