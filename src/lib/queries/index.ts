/**
 * Supabase veri erişim katmanı.
 *
 * Bileşenler doğrudan `supabase` istemcisini çağırmaz; buradaki fonksiyonları kullanır.
 * Her fonksiyon hata durumunda throw eder — çağıran taraf try/catch ile karşılar.
 */

import { supabase } from '../supabase';
import type { TablesUpdate } from '../database.types';
import type {
  ApplicationRecord,
  CompanyAccount,
  InternshipListing,
  SkillQuiz,
  StudentProfile,
} from '../../types';
import {
  toApplicationRecord,
  toCompanyAccount,
  toInternshipListing,
  toListingInsert,
  toSkillQuiz,
  toStudentProfile,
  toCompanyUpdate,
  toDbSkillCategory,
  splitStudentUpdate,
  LISTING_COLUMNS,
  type CompanyRowWithMembers,
  type ListingRowWithCompany,
  type QuizRowWithQuestions,
  type StudentRowBundle,
} from './mappers';

/** PostgREST hatalarını tek biçimde yükseltir. */
function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? 'bilinmeyen hata'}`);
}

// ---------------------------------------------------------------- İlanlar

const LISTING_SELECT = `
  ${LISTING_COLUMNS},
  companies ( name, logo_url, industry, size, location, description, rating )
`;

/**
 * Yayındaki ilanlar. Giriş yapılmamış ziyaretçi de çağırabilir —
 * RLS zaten yalnızca status = 'published' olanları döndürüyor.
 */
export async function fetchPublishedListings(): Promise<InternshipListing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('status', 'published')
    .order('posted_at', { ascending: false, nullsFirst: false });

  if (error) fail('İlanlar yüklenemedi', error);
  return (data as unknown as ListingRowWithCompany[]).map(toInternshipListing);
}

/** Şirketin kendi ilanları — taslaklar dahil. RLS üyelik kontrolünü yapıyor. */
export async function fetchCompanyListings(companyId: string): Promise<InternshipListing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) fail('Şirket ilanları yüklenemedi', error);
  return (data as unknown as ListingRowWithCompany[]).map(toInternshipListing);
}

export async function createListing(
  listing: InternshipListing,
  companyId: string,
  status: 'draft' | 'published' = 'published'
): Promise<InternshipListing> {
  const { data, error } = await supabase
    .from('listings')
    .insert(toListingInsert(listing, companyId, status))
    .select(LISTING_SELECT)
    .single();

  if (error) fail('İlan oluşturulamadı', error);
  return toInternshipListing(data as unknown as ListingRowWithCompany);
}

export async function deleteListing(listingId: string): Promise<void> {
  const { error } = await supabase.from('listings').delete().eq('id', listingId);
  if (error) fail('İlan silinemedi', error);
}

// ---------------------------------------------------------------- Öğrenci

const STUDENT_SELECT = `
  *,
  profiles ( full_name, email, phone, avatar_url ),
  student_skills ( * ),
  student_languages ( * ),
  student_projects ( * )
`;

/** Tek öğrenci profili. Yoksa null döner (henüz profil oluşturmamış kullanıcı). */
export async function fetchStudentProfile(userId: string): Promise<StudentProfile | null> {
  const { data, error } = await supabase
    .from('student_profiles')
    .select(STUDENT_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (error) fail('Öğrenci profili yüklenemedi', error);
  if (!data) return null;
  return toStudentProfile(data as unknown as StudentRowBundle);
}

/**
 * Şirketlerin aday havuzu. RLS yalnızca `is_open_to_offers = true` olanları veriyor.
 * Öğrenci hesabıyla çağrılırsa yalnızca kendi kaydı döner.
 */
export async function fetchOpenStudentProfiles(): Promise<StudentProfile[]> {
  const { data, error } = await supabase
    .from('student_profiles')
    .select(STUDENT_SELECT)
    .eq('is_open_to_offers', true);

  if (error) fail('Aday havuzu yüklenemedi', error);
  return (data as unknown as StudentRowBundle[]).map(toStudentProfile);
}

/** Profil yaması. `profiles` ve `student_profiles` ayrı ayrı güncellenir. */
export async function updateStudentProfile(
  userId: string,
  patch: Partial<StudentProfile>
): Promise<void> {
  const { profilePatch, studentPatch } = splitStudentUpdate(patch);

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await supabase.from('profiles').update(profilePatch).eq('id', userId);
    if (error) fail('Profil güncellenemedi', error);
  }

  if (Object.keys(studentPatch).length > 0) {
    const { error } = await supabase
      .from('student_profiles')
      .update(studentPatch)
      .eq('id', userId);
    if (error) fail('Öğrenci bilgileri güncellenemedi', error);
  }
}

/**
 * Beceri listesini toptan değiştirir (sil-yeniden yaz).
 *
 * DİKKAT: `verified` bilerek gönderilmiyor. RLS öğrencinin kendi becerisini
 * doğrulanmış işaretlemesine izin vermiyor; rozet yalnızca quiz üzerinden gelir.
 * Bu yüzden yeniden yazma, quizle kazanılmış doğrulamaları sıfırlar —
 * beceri ekleme/çıkarma dışında bu fonksiyonu çağırma.
 */
export async function replaceStudentSkills(
  userId: string,
  skills: StudentProfile['skills']
): Promise<void> {
  const { error: delError } = await supabase
    .from('student_skills')
    .delete()
    .eq('student_id', userId);
  if (delError) fail('Beceriler temizlenemedi', delError);

  if (skills.length === 0) return;

  const { error } = await supabase.from('student_skills').insert(
    skills.map((s) => ({
      student_id: userId,
      name: s.name,
      level: s.level,
      category: toDbSkillCategory(s.category),
      domain: s.domain ?? null,
      years_of_exp: s.yearsOfExp ?? null,
    }))
  );
  if (error) fail('Beceriler kaydedilemedi', error);
}

// ---------------------------------------------------------------- Şirket

const COMPANY_SELECT = `
  *,
  company_members ( recruiter_role, is_owner, profiles ( full_name, email, avatar_url ) )
`;

/** Kullanıcının üye olduğu şirketler. Öğrenci hesabında boş döner. */
export async function fetchMyCompanies(userId: string): Promise<CompanyAccount[]> {
  const { data: memberships, error: memberError } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId);

  if (memberError) fail('Şirket üyelikleri yüklenemedi', memberError);
  const ids = (memberships ?? []).map((m) => m.company_id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase.from('companies').select(COMPANY_SELECT).in('id', ids);
  if (error) fail('Şirketler yüklenemedi', error);
  return (data as unknown as CompanyRowWithMembers[]).map(toCompanyAccount);
}

export async function updateCompany(
  companyId: string,
  patch: Partial<CompanyAccount>
): Promise<void> {
  const body = toCompanyUpdate(patch);
  if (Object.keys(body).length === 0) return;

  const { error } = await supabase.from('companies').update(body).eq('id', companyId);
  if (error) fail('Şirket profili güncellenemedi', error);
}

// ---------------------------------------------------------------- Başvurular

/** Öğrencinin kendi başvuruları. */
export async function fetchStudentApplications(userId: string): Promise<ApplicationRecord[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('student_id', userId)
    .order('applied_at', { ascending: false });

  if (error) fail('Başvurular yüklenemedi', error);
  return (data ?? []).map(toApplicationRecord);
}

/** Şirketin ilanlarına gelen başvurular. RLS üyelik kontrolünü yapıyor. */
export async function fetchCompanyApplications(companyId: string): Promise<ApplicationRecord[]> {
  const { data: listingRows, error: listingError } = await supabase
    .from('listings')
    .select('id')
    .eq('company_id', companyId);

  if (listingError) fail('Şirket ilanları yüklenemedi', listingError);
  const listingIds = (listingRows ?? []).map((l) => l.id);
  if (listingIds.length === 0) return [];

  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .in('listing_id', listingIds)
    .order('applied_at', { ascending: false });

  if (error) fail('Başvurular yüklenemedi', error);
  return (data ?? []).map(toApplicationRecord);
}

export async function createApplication(params: {
  listingId: string;
  studentId: string;
  matchScore: number;
  coverLetter?: string;
}): Promise<ApplicationRecord> {
  const { data, error } = await supabase
    .from('applications')
    .insert({
      listing_id: params.listingId,
      student_id: params.studentId,
      match_score: Math.round(params.matchScore),
      cover_letter: params.coverLetter ?? null,
    })
    .select('*')
    .single();

  // 23505 = unique_violation; şemada (listing_id, student_id) tekil.
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new Error('Bu ilana zaten başvurdunuz.');
    }
    fail('Başvuru gönderilemedi', error);
  }
  return toApplicationRecord(data);
}

/** Öğrencinin başvurusunu geri çekmesi. Şemada öğrenci yalnızca `withdrawn` yapabilir. */
export async function withdrawApplication(applicationId: string): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ status: 'withdrawn' })
    .eq('id', applicationId);
  if (error) fail('Başvuru geri çekilemedi', error);
}

/** Şirket tarafı durum güncellemesi. */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationRecord['status'],
  extras: { companyFeedback?: string; interviewDate?: string; interviewNotes?: string } = {}
): Promise<void> {
  const body: TablesUpdate<'applications'> = { status };
  if (extras.companyFeedback !== undefined) body.company_feedback = extras.companyFeedback;
  if (extras.interviewDate !== undefined) body.interview_date = extras.interviewDate || null;
  if (extras.interviewNotes !== undefined) body.interview_notes = extras.interviewNotes;

  const { error } = await supabase.from('applications').update(body).eq('id', applicationId);
  if (error) fail('Başvuru durumu güncellenemedi', error);
}

// ---------------------------------------------------------------- Quizler

/**
 * Aktif quizler ve cevapsız soruları.
 * `quiz_questions` tablosuna istemcinin SELECT hakkı yok; sorular cevapsız view'dan gelir.
 */
export async function fetchQuizzes(): Promise<SkillQuiz[]> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*, quiz_questions_public ( * )')
    .eq('is_active', true);

  if (error) fail('Quizler yüklenemedi', error);
  return (data as unknown as QuizRowWithQuestions[]).map(toSkillQuiz);
}
