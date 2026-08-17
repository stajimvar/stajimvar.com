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
  companies ( name, slug, logo_url, industry, size, location, description, rating )
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

/**
 * Tek ilan, adresteki kimlik önekiyle.
 *
 * `LIKE` kullanılamıyor: Postgres'te uuid tipiyle metin karşılaştırma operatörü
 * yok (`operator does not exist: uuid ~~ unknown`). Bunun yerine aralık
 * karşılaştırması yapılıyor — UUID sıralı olduğu için 8 haneli önek bitişik bir
 * aralık tanımlar ve bu birincil anahtar indeksini de kullanır.
 *
 * Birden çok eşleşirse ilki değil `null` dönüyor: yanlış ilanı göstermektense
 * bulunamadı demek doğru.
 */
export async function fetchListingByIdPrefix(
  prefix: string
): Promise<InternshipListing | null> {
  const alt = `${prefix}-0000-0000-0000-000000000000`;
  const ust = `${prefix}-ffff-ffff-ffff-ffffffffffff`;

  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('status', 'published')
    .gte('id', alt)
    .lte('id', ust)
    .limit(2);

  if (error) fail('İlan yüklenemedi', error);
  const rows = (data as unknown as ListingRowWithCompany[]) ?? [];
  if (rows.length !== 1) return null;
  return toInternshipListing(rows[0]);
}

/** Şirket sayfası için: şirket bilgisi ve yayındaki ilanları. */
export async function fetchCompanyPage(slug: string): Promise<{
  company: { id: string; name: string; slug: string; logoUrl?: string; websiteUrl?: string;
             industry?: string; location?: string; description?: string; verified: boolean };
  listings: InternshipListing[];
} | null> {
  const { data: company, error } = await supabase
    .from('companies')
    .select('id,name,slug,logo_url,website_url,industry,location,description,verified')
    .eq('slug', slug)
    .maybeSingle();

  if (error) fail('Şirket yüklenemedi', error);
  if (!company) return null;

  const { data: rows, error: listErr } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('company_id', company.id)
    .eq('status', 'published')
    .order('posted_at', { ascending: false, nullsFirst: false });

  if (listErr) fail('Şirket ilanları yüklenemedi', listErr);

  return {
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      logoUrl: company.logo_url ?? undefined,
      websiteUrl: company.website_url ?? undefined,
      industry: company.industry ?? undefined,
      location: company.location ?? undefined,
      description: company.description ?? undefined,
      verified: company.verified,
    },
    listings: (rows as unknown as ListingRowWithCompany[]).map(toInternshipListing),
  };
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

/**
 * Profil fotoğrafını `avatars` kovasına yükler ve herkese açık adresi döndürür.
 *
 * Eskiden fotoğraf `FileReader.readAsDataURL` ile base64'e çevrilip doğrudan
 * `profiles.avatar_url` alanına yazılıyordu: 2 MB'lık bir fotoğraf ~2.7 MB
 * metne dönüşüp her profil okumasında geri geliyordu. Artık dosya depolamada,
 * veritabanında yalnızca adresi duruyor.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const allowed = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(file.type)) {
    throw new Error('Yalnızca PNG, JPEG veya WEBP yükleyebilirsin.');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Fotoğraf en fazla 2 MB olabilir.');
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  // Klasör adı kullanıcı kimliği olmak zorunda: storage politikası bunu şart koşuyor.
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Fotoğraf yüklenemedi: ${error.message}`);

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Tarayıcı eski fotoğrafı önbellekten göstermesin.
  return `${data.publicUrl}?v=${Date.now()}`;
}

/**
 * Dilleri toptan değiştirir. `verified` gönderilmiyor: doğrulama yalnızca
 * sınav üzerinden gelir, öğrenci kendi dilini onaylayamaz.
 */
export async function replaceStudentLanguages(
  userId: string,
  languages: NonNullable<StudentProfile['languages']>
): Promise<void> {
  const { error: delError } = await supabase
    .from('student_languages')
    .delete()
    .eq('student_id', userId);
  if (delError) fail('Diller temizlenemedi', delError);

  if (languages.length === 0) return;

  const { error } = await supabase.from('student_languages').insert(
    languages.map((l) => ({
      student_id: userId,
      language: l.language,
      level: l.level,
      proficiency_text: l.proficiencyText || null,
    }))
  );
  if (error) fail('Diller kaydedilemedi', error);
}

/** Projeleri toptan değiştirir; sıra korunur. */
export async function replaceStudentProjects(
  userId: string,
  projects: StudentProfile['projects']
): Promise<void> {
  const { error: delError } = await supabase
    .from('student_projects')
    .delete()
    .eq('student_id', userId);
  if (delError) fail('Projeler temizlenemedi', delError);

  if (projects.length === 0) return;

  const { error } = await supabase.from('student_projects').insert(
    projects.map((project, index) => ({
      student_id: userId,
      title: project.title,
      description: project.description || null,
      tech_stack: project.techStack ?? [],
      github_url: project.githubUrl || null,
      live_url: project.liveUrl || null,
      sort_order: index,
    }))
  );
  if (error) fail('Projeler kaydedilemedi', error);
}

/**
 * Profil yamasını ilgili tablolara dağıtır.
 *
 * Arayüz tek bir `Partial<StudentProfile>` gönderiyor ama veri dört tabloya
 * yayılmış durumda. Bu dağıtımı bileşenlere bırakmak, her düzenleme ekranının
 * şemayı bilmesini gerektirirdi.
 */
export async function saveStudentProfile(
  userId: string,
  patch: Partial<StudentProfile>
): Promise<void> {
  await updateStudentProfile(userId, patch);
  if (patch.skills) await replaceStudentSkills(userId, patch.skills);
  if (patch.languages) await replaceStudentLanguages(userId, patch.languages);
  if (patch.projects) await replaceStudentProjects(userId, patch.projects);
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
  /** İlanın başvuru yöntemi; teslim davranışını bu belirliyor. */
  applicationMethod: 'external' | 'internal' | 'email_application';
  /** KVKK açık rızası. Olmadan başvuru kaydedilmez. */
  contactShareConsent: boolean;
  consentVersion: string;
}): Promise<ApplicationRecord> {
  if (!params.contactShareConsent) {
    throw new Error('Bilgilerinin şirketle paylaşılmasına izin vermeden başvuru gönderilemez.');
  }

  /*
    Teslim durumu bilinçli olarak burada belirleniyor:
    - internal      → başvuru platformda kalıyor, e-posta yok
    - external      → şirketin kendi sistemi asıl kanal; bizdeki kayıt talep
                      sinyali. Doğrulanmış bir adres olmadığı için gönderilmedi
                      olarak işaretleniyor, "bekliyor" demek yanıltıcı olurdu.
    - email_application → doğrulanmış kanala gönderilmek üzere kuyruğa girer
  */
  const deliveryStatus =
    params.applicationMethod === 'email_application' ? 'pending' :
    params.applicationMethod === 'external' ? 'skipped_unverified' : 'not_required';

  const { data, error } = await supabase
    .from('applications')
    .insert({
      listing_id: params.listingId,
      student_id: params.studentId,
      match_score: Math.round(params.matchScore),
      cover_letter: params.coverLetter ?? null,
      application_method: params.applicationMethod,
      contact_share_consent_at: new Date().toISOString(),
      contact_share_consent_version: params.consentVersion,
      email_delivery_status: deliveryStatus,
      created_via: 'web',
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
  /*
    `interviewNotes` buradan cikarildi: dahili not artik ayri bir tabloda.
    Not yazmak icin addApplicationNote kullanilmali.

    `companyFeedback` OGRENCIYE GORUNUR. Adi bunu soyluyor ama cagiran taraf
    yanlislikla dahili not gecirebiliyordu -- sirket portali tam olarak bunu
    yapiyordu.
  */
  extras: { companyFeedback?: string; interviewDate?: string } = {}
): Promise<void> {
  const body: TablesUpdate<'applications'> = { status };
  if (extras.companyFeedback !== undefined) body.company_feedback = extras.companyFeedback;
  if (extras.interviewDate !== undefined) body.interview_date = extras.interviewDate || null;

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

// ---------------------------------------------------------------- Şirket sahiplenme

export interface CompanyClaim {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  companyWebsite?: string;
  contactName: string;
  contactTitle?: string;
  workEmail: string;
  phone?: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
  createdAt: string;
}

/**
 * Sahiplenme talebi oluşturur.
 *
 * `user_id` istemciden gelmiyor gibi görünse de RLS politikası
 * `user_id = auth.uid()` şartını koyuyor; başkasının adına talep açılamıyor.
 * E-posta küçük harfe çevriliyor çünkü veritabanında citext yok.
 */
export async function createCompanyClaim(params: {
  companyId: string;
  userId: string;
  contactName: string;
  contactTitle?: string;
  workEmail: string;
  phone?: string;
  note?: string;
}): Promise<void> {
  const { error } = await supabase.from('company_claims').insert({
    company_id: params.companyId,
    user_id: params.userId,
    contact_name: params.contactName.trim(),
    contact_title: params.contactTitle?.trim() || null,
    work_email: params.workEmail.trim().toLowerCase(),
    phone: params.phone?.trim() || null,
    note: params.note?.trim() || null,
  } as never);

  if (error) {
    // Kısmi tekil index: aynı şirket için bekleyen ikinci talep açılamıyor.
    if (error.code === '23505') {
      throw new Error('Bu şirket için zaten bekleyen bir talebiniz var.');
    }
    fail('Talep gönderilemedi', error);
  }
}

/** Kullanıcının bu şirket için mevcut talebi (varsa). */
export async function fetchMyClaim(
  companyId: string,
  userId: string
): Promise<CompanyClaim | null> {
  const { data, error } = await supabase
    .from('company_claims')
    .select('id,company_id,contact_name,contact_title,work_email,phone,note,status,reject_reason,created_at')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) fail('Talep durumu okunamadı', error);
  if (!data) return null;

  const row = data as Record<string, string | null>;
  return {
    id: row.id!,
    companyId: row.company_id!,
    companyName: '',
    companySlug: '',
    contactName: row.contact_name!,
    contactTitle: row.contact_title ?? undefined,
    workEmail: row.work_email!,
    phone: row.phone ?? undefined,
    note: row.note ?? undefined,
    status: row.status as CompanyClaim['status'],
    rejectReason: row.reject_reason ?? undefined,
    createdAt: row.created_at!,
  };
}

/** Yönetici kuyruğu. RLS yalnızca admin'e tüm satırları veriyor. */
export async function fetchPendingClaims(): Promise<CompanyClaim[]> {
  const { data, error } = await supabase
    .from('company_claims')
    .select(
      'id,company_id,contact_name,contact_title,work_email,phone,note,status,created_at,' +
        'companies(name,slug,website_url)'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) fail('Talepler yüklenemedi', error);

  return (data ?? []).map((r) => {
    const row = r as Record<string, any>;
    const sirket = row.companies ?? {};
    return {
      id: row.id,
      companyId: row.company_id,
      companyName: sirket.name ?? '(şirket silinmiş)',
      companySlug: sirket.slug ?? '',
      companyWebsite: sirket.website_url ?? undefined,
      contactName: row.contact_name,
      contactTitle: row.contact_title ?? undefined,
      workEmail: row.work_email,
      phone: row.phone ?? undefined,
      note: row.note ?? undefined,
      status: row.status,
      createdAt: row.created_at,
    };
  });
}

/**
 * Onay ve ret sunucudaki fonksiyonlar üzerinden yapılıyor.
 *
 * Doğrudan UPDATE yolu bilerek kapalı: onay üç tabloya birden yazıyor
 * (talep, üyelik, şirket) ve bunların yarısı yazılıp yarısı yazılmasa
 * yetki yarım kalırdı. Ayrıca yetki kontrolü fonksiyonun içinde.
 */
export async function approveCompanyClaim(claimId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_company_claim', { claim_id: claimId } as never);
  if (error) fail('Talep onaylanamadı', error);
}

export async function rejectCompanyClaim(claimId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('reject_company_claim', {
    claim_id: claimId,
    reason,
  } as never);
  if (error) fail('Talep reddedilemedi', error);
}

/** Giriş yapan kişi yönetici mi? RLS politikalarının kullandığı fonksiyon. */
export async function fetchIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return Boolean(data);
}

// ---------------------------------------------------------------- İlan onay kuyruğu

export interface PendingListing {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  city?: string;
  workType: string;
  description?: string;
  requiredSkills: string[];
  isPaid: boolean;
  stipendText?: string;
  applicationDeadline?: string;
  createdAt: string;
}

/**
 * Onay bekleyen ilanlar.
 *
 * Yalnızca `origin = 'internal'` olanlar: şirketin kendi girdiği ilanlar.
 * Otomasyonun derlediği ilanlar (`scraped`) bu kuyruğa girmiyor — onlar
 * zaten şirketin kendi sayfasında yayınlanmış, ayrıca onaylamak anlamsız
 * ve kuyruğu boğardı.
 */
export async function fetchPendingListings(): Promise<PendingListing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(
      'id,title,company_id,city,work_type,description,required_skills,is_paid,' +
        'stipend_text,application_deadline,created_at,companies(name)'
    )
    .eq('status', 'draft')
    .eq('origin', 'internal')
    .order('created_at', { ascending: true });

  if (error) fail('Bekleyen ilanlar yüklenemedi', error);

  return (data ?? []).map((r) => {
    const row = r as Record<string, any>;
    return {
      id: row.id,
      title: row.title,
      companyId: row.company_id,
      companyName: row.companies?.name ?? '(şirket yok)',
      city: row.city ?? undefined,
      workType: row.work_type,
      description: row.description ?? undefined,
      requiredSkills: row.required_skills ?? [],
      isPaid: row.is_paid,
      stipendText: row.stipend_text ?? undefined,
      applicationDeadline: row.application_deadline ?? undefined,
      createdAt: row.created_at,
    };
  });
}

/**
 * İlanı yayına alır.
 *
 * Yetki kontrolü burada değil veritabanında: `listings_publish_guard`
 * tetikleyicisi yönetici olmayan hiç kimsenin bir ilanı 'published'
 * durumuna geçirmesine izin vermiyor. Buradaki çağrı yalnızca isteği
 * iletiyor; reddedilirse hata yükseliyor.
 */
export async function publishListing(listingId: string): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .update({ status: 'published', posted_at: new Date().toISOString() })
    .eq('id', listingId);
  if (error) fail('İlan yayına alınamadı', error);
}

/** Reddedilen ilan silinmiyor, arşivleniyor: şirket ne olduğunu görebilmeli. */
export async function archiveListing(listingId: string): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .update({ status: 'archived' })
    .eq('id', listingId);
  if (error) fail('İlan arşivlenemedi', error);
}


// ---------------------------------------------------------------- Dahili notlar

export interface ApplicationNote {
  id: string;
  note: string;
  createdAt: string;
}

/**
 * Şirketin başvuru hakkındaki dahili notları.
 *
 * Öğrenci bu tabloyu HİÇBİR koşulda göremiyor: `application_notes` üzerinde
 * öğrenciye açık tek bir politika yok, dolayısıyla RLS onu tamamen dışarıda
 * bırakıyor. Adaya gösterilecek metin `applications.company_feedback`.
 */
export async function fetchApplicationNotes(applicationId: string): Promise<ApplicationNote[]> {
  const { data, error } = await supabase
    .from('application_notes')
    .select('id,note,created_at')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });

  if (error) fail('Notlar yüklenemedi', error);
  return (data ?? []).map((r) => {
    const row = r as Record<string, string>;
    return { id: row.id, note: row.note, createdAt: row.created_at };
  });
}

export async function addApplicationNote(
  applicationId: string,
  authorId: string,
  note: string
): Promise<void> {
  const { error } = await supabase.from('application_notes').insert({
    application_id: applicationId,
    author_id: authorId,
    note: note.trim(),
  } as never);
  if (error) fail('Not eklenemedi', error);
}

// ---------------------------------------------------------------- Yetenek havuzu

export interface TalentPoolStat {
  toplam: number;
  enCokBolum: Array<{ ad: string; sayi: number }>;
  enCokSehir: Array<{ ad: string; sayi: number }>;
}

/**
 * İşveren rehberindeki "şu anda staj arayan öğrenciler" sayısı.
 *
 * TOPLU sayı döndürüyor, kişi listesi değil. Sebep KVKK: bir işverene tek tek
 * öğrenci profili göstermek, öğrencinin açık rızası ve şirketin doğrulanmış
 * olması şartlarına bağlı. Toplu sayı ise kimseyi tanımlanabilir kılmıyor ve
 * ilk günden çalışıyor — 5 öğrenci varsa "5" yazar, dürüst ve yine ikna edici.
 *
 * Sayım yalnızca teklife açık öğrencileri kapsıyor; profilini kapalı tutan
 * öğrenci bu sayıya girmiyor.
 */
export async function fetchTalentPoolStats(): Promise<TalentPoolStat> {
  const { data, error } = await supabase
    .from('student_profiles')
    .select('department, pref_cities')
    .eq('is_open_to_offers', true);

  if (error) fail('Öğrenci sayısı okunamadı', error);

  const rows = (data ?? []) as Array<{ department: string | null; pref_cities: string[] | null }>;

  const say = (degerler: string[]) => {
    const harita = new Map<string, number>();
    for (const d of degerler) {
      const temiz = (d ?? '').trim();
      if (temiz) harita.set(temiz, (harita.get(temiz) ?? 0) + 1);
    }
    return [...harita.entries()]
      .map(([ad, sayi]) => ({ ad, sayi }))
      .sort((a, b) => b.sayi - a.sayi || a.ad.localeCompare(b.ad, 'tr'))
      .slice(0, 4);
  };

  return {
    toplam: rows.length,
    enCokBolum: say(rows.map((r) => r.department ?? '')),
    enCokSehir: say(rows.flatMap((r) => r.pref_cities ?? [])),
  };
}


// ---------------------------------------------------------------- Test sonucu

export interface QuizResult {
  toplam: number;
  dogru: number;
  gecmeNotu: number;
  gecti: boolean;
  rozet: string | null;
  yetenek: string;
}

/**
 * Test cevaplarını sunucuya gönderir ve puanı SUNUCUDAN alır.
 *
 * Puan istemcide hesaplanmıyor. Doğru cevaplar veritabanından hiç çıkmıyor:
 * `quiz_questions.correct_index` sütununda hiçbir API rolünün SELECT hakkı
 * yok. `quiz_attempts` tablosuna doğrudan INSERT de kapalı — tek yazma yolu
 * bu fonksiyon. Olmasaydı öğrenci kendine 5/5 yazıp rozet alabilirdi.
 *
 * Rozeti de sunucu veriyor: geçildiyse `student_profiles.earned_badges`
 * dizisine ekleniyor.
 */
export async function submitQuizAttempt(
  quizId: string,
  answers: Record<string, number>
): Promise<QuizResult> {
  const { data, error } = await supabase.rpc('submit_quiz_attempt', {
    p_quiz_id: quizId,
    p_answers: answers,
  } as never);

  if (error) fail('Test sonucu kaydedilemedi', error);
  return data as unknown as QuizResult;
}
