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
import { basvuruYolu } from '../basvuru-yolu.mjs';

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
             industry?: string; location?: string; size?: string; description?: string; verified: boolean };
  listings: InternshipListing[];
} | null> {
  const { data: company, error } = await supabase
    .from('companies')
    .select('id,name,slug,logo_url,website_url,industry,location,size,description,verified')
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
      /* Künye bloğu için: çalışan sayısı okunuyordu ama taşınmıyordu. */
      size: company.size ?? undefined,
      location: company.location ?? undefined,
      description: company.description ?? undefined,
      verified: company.verified,
    },
    listings: (rows as unknown as ListingRowWithCompany[]).map(toInternshipListing),
  };
}

/**
 * İşverenin kendi şirketini bulması için ada göre arama.
 *
 * NEDEN VAR
 * ---------
 * Şirket sahiplenme formu yalnızca /sirket/<slug> sayfasında duruyor. Ama o
 * sayfaya giden tek yol ilan listesinden tıklamaktı: yani şirketi zaten
 * ilanı derlenmiş olan işveren buraya gelebiliyordu, diğerleri hiç
 * gelemiyordu. Aramasız hâlde kapı vardı ama tokmağı yoktu.
 *
 * Herkese açık: companies tablosunun okuma kuralı zaten anonim erişime
 * izin veriyor (şirket sayfaları arama motoruna açık). Burada yalnızca
 * ada göre filtreleme yapılıyor, ek bir alan sızmıyor.
 */
export async function searchCompanies(
  term: string
): Promise<{ id: string; name: string; slug: string; logoUrl?: string; verified: boolean }[]> {
  const temiz = term.trim();
  // İki harften kısa aramada tablonun yarısı dönerdi; anlamlı değil.
  if (temiz.length < 2) return [];

  const { data, error } = await supabase
    .from('companies')
    .select('id,name,slug,logo_url,verified')
    // ilike: büyük-küçük harf duyarsız. Türkçe "İ/ı" eşleşmesi Postgres'in
    // harmanlamasına bırakılıyor; kendi normalleştirmemizi eklemiyoruz çünkü
    // yanlış eşleşme üretmesi doğru eşleşmeyi kaçırmasından daha kötü.
    .ilike('name', `%${temiz}%`)
    .order('name')
    .limit(10);

  if (error) fail('Şirket araması yapılamadı', error);

  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logoUrl: c.logo_url ?? undefined,
    verified: c.verified,
  }));
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

/**
 * Profil kopyası kaydedilecek mi?
 *
 * Üç şart da gerekiyor: veri gerçekten aktarılıyor, öğrenci rıza verdi
 * ve kopyanın içinde bir şey var. Boş nesne, verilmemiş bir paylaşımı
 * kaydetmek olur.
 */
function kopyaYazilacakMi(
  teslimEdiliyor: boolean,
  params: { contactShareConsent: boolean; profileSnapshot?: Record<string, unknown> | null }
): boolean {
  if (!teslimEdiliyor || !params.contactShareConsent) return false;
  const kopya = params.profileSnapshot;
  return Boolean(kopya) && Object.keys(kopya as Record<string, unknown>).length > 0;
}

export async function createApplication(params: {
  listingId: string;
  studentId: string;
  matchScore: number;
  coverLetter?: string;
  /** İlanın başvuru yöntemi; teslim davranışını bu belirliyor. */
  applicationMethod: 'external' | 'internal' | 'email_application';
  /** KVKK açık rızası. Veri aktarılan yöntemlerde zorunlu. */
  contactShareConsent: boolean;
  consentVersion: string;
  /** Doğrulanmış başvuru kanalı varsa kimliği; teslim kararında kullanılıyor. */
  applicationChannelId?: string;
  /**
   * Başvuru anındaki profil kopyası (`basvuruKopyasi`).
   *
   * Şirketin gördüğü ad/okul/bölüm YALNIZCA buradan geliyor: `profiles`
   * tablosunu şirket okuyamıyor. Rıza verilmediyse yazılmıyor.
   */
  profileSnapshot?: Record<string, unknown> | null;
  /**
   * Başvuru anındaki CV KOPYASININ depolama yolu.
   *
   * Profildeki `cv_path` DEĞİL: burada duran şey, başvuru anında
   * çıkarılmış ayrı bir dosya (lib/cv.ts · cvBasvuruKopyasiCikar).
   * Profilin yolunu kopyalasaydık öğrenci CV'sini değiştirdiğinde şirket
   * ekranındaki belge de sessizce değişirdi.
   *
   * Yol, veritabanındaki tetikleyiciyle öğrencinin kendi klasörüne
   * sınırlı (applications_guard_cv_path): başkasının dosyasını kendi
   * başvurusuna bağlayıp şirkete okutmak mümkün değil.
   */
  cvSnapshotPath?: string | null;
}): Promise<ApplicationRecord> {
  /*
    Açık rıza yalnızca veri gerçekten aktarılıyorsa zorunlu. Dış ilanlarda
    hiçbir şey aktarılmıyor — kayıt öğrencinin kendi takip listesi. Olmayan
    bir aktarım için rıza toplamak hem gereksiz hem yanıltıcı.
  */
  const yol = basvuruYolu({
    applicationMethod: params.applicationMethod,
    applicationChannelId: params.applicationChannelId,
  });
  if (yol.teslimEdiliyor && !params.contactShareConsent) {
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
  const deliveryStatus = yol.teslimEdiliyor
    ? (params.applicationMethod === 'email_application' ? 'pending' : 'not_required')
    : 'skipped_unverified';

  const { data, error } = await supabase
    .from('applications')
    .insert({
      listing_id: params.listingId,
      student_id: params.studentId,
      match_score: Math.round(params.matchScore),
      cover_letter: params.coverLetter ?? null,
      application_method: params.applicationMethod,
      // Rıza kaydı gerçeği yansıtsın: onay verilmediyse damga da atılmıyor.
      contact_share_consent_at: params.contactShareConsent ? new Date().toISOString() : null,
      contact_share_consent_version: params.contactShareConsent ? params.consentVersion : null,
      /*
        Kopya yalnızca veri gerçekten aktarılıyorsa VE rıza varsa
        yazılıyor. Dış ilanlarda hiçbir şey aktarılmıyor; oraya kopya
        koymak, verilmemiş bir paylaşımı kaydetmek olurdu.

        Boş nesne de yazılmıyor: içi boş bir kopya, şirkete "paylaşıldı
        ama hiçbir şey yok" diyen bir kart üretirdi.
      */
      profile_snapshot: (kopyaYazilacakMi(yol.teslimEdiliyor, params)
        ? params.profileSnapshot
        : null) as never,
      /*
        CV kopyası YALNIZCA teslim edilen başvuruda yazılıyor. Dış ilanda
        şirkete hiçbir şey gitmiyor; oraya bir belge bağlamak, yapılmamış
        bir paylaşımı kaydetmek olurdu.

        `cv_path` (eski alan) yeni kod tarafından HİÇ yazılmıyor; okuma
        tarafında yalnızca geriye uyumluluk için sonda duruyor.
      */
      cv_snapshot_path: yol.teslimEdiliyor ? (params.cvSnapshotPath ?? null) : null,
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

/**
 * GÖRÜŞME DAVETİNE YANIT
 *
 * Teklif yanıtıyla aynı biçim ve aynı gerekçe: karar yalnızca davetin
 * açık olduğu andan verilebilmeli ve iki paralel istek tutarsız sonuç
 * üretmemeli. `gorusmeye_yanit_ver` satırı kilitleyip o anki yanıtı
 * okuyor; zaten yanıtlanmışsa hata değil, mevcut yanıt dönüyor.
 *
 * Dönen değer sunucunun gördüğü nihai yanıt.
 */
export async function respondToInterview(
  applicationId: string,
  katilacak: boolean
): Promise<string> {
  const { data, error } = await supabase.rpc('gorusmeye_yanit_ver', {
    p_basvuru: applicationId,
    p_katilacak: katilacak,
  });
  if (error) fail('Görüşme yanıtın kaydedilemedi', error);
  return data as string;
}

/**
 * TEKLİFE YANIT — KABUL YA DA RET
 *
 * Doğrudan UPDATE ile yapılamıyor ve yapılmamalı: öğrencinin güncelleme
 * politikası sonucun `withdrawn` olmasını şart koşuyor. Kabul/ret tek
 * kapıdan geçiyor — `teklife_yanit_ver`. O işlev satırı kilitleyip O ANKİ
 * durumu okuyor, yani:
 *
 *   * yalnızca `offer_extended` durumundan karar verilebiliyor,
 *   * aynı anda gelen iki istek tutarsız bir sonuç üretmiyor,
 *   * zaten yanıtlanmış bir teklif ikinci kez yanıtlandığında HATA
 *     DEĞİL, mevcut sonuç dönüyor.
 *
 * Dönen değer sunucunun gördüğü nihai durum; ekran onu yazıyor, kendi
 * tahminini değil.
 */
export async function respondToOffer(
  applicationId: string,
  kabul: boolean
): Promise<ApplicationRecord['status']> {
  const { data, error } = await supabase.rpc('teklife_yanit_ver', {
    p_basvuru: applicationId,
    p_kabul: kabul,
  });
  if (error) fail(kabul ? 'Teklif kabul edilemedi' : 'Teklif reddedilemedi', error);
  return data as ApplicationRecord['status'];
}

/**
 * KABUL EDİLMİŞ TEKLİFTE ŞİRKET YETKİLİSİNİN İLETİŞİMİ
 *
 * `profiles` tablosunun okuma kuralı yalnızca kişinin kendisine açık ve
 * öyle kalıyor: öğrenci şirket yetkilisinin satırını okuyamıyor. Bu
 * işlev, teklif kabul edildiyse yalnızca o başvurunun karşı tarafını
 * döndüren tek kapı.
 *
 * Kapı kapalıysa satır yok — `null` dönüyor, hata değil.
 */
export async function fetchApplicationContact(applicationId: string): Promise<{
  ad: string | null;
  eposta: string | null;
  telefon: string | null;
  unvan: string | null;
} | null> {
  const { data, error } = await supabase.rpc('basvuru_iletisimi', { p_basvuru: applicationId });
  if (error) fail('İletişim bilgileri şu anda yüklenemedi', error);
  const satir = (data ?? [])[0];
  return satir
    ? { ad: satir.ad, eposta: satir.eposta, telefon: satir.telefon, unvan: satir.unvan }
    : null;
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
  /*
    TOPLU SAYI ARTIK SATIR OKUMUYOR

    Önce `student_profiles` satırları çekilip burada sayılıyordu. O erişim
    kapatıldı: doğrulanmış bir şirket, kendisine hiç başvurmamış
    öğrencilerin profilini okuyabiliyordu. Toplu sayı kimseyi
    tanımlanabilir kılmadığı için ayrı bir fonksiyona alındı.
  */
  const { data: ozet, error: ozetHatasi } = await (supabase as any).rpc(
    'staj_arayan_ogrenci_ozeti'
  );
  if (!ozetHatasi && Array.isArray(ozet) && ozet.length > 0) {
    const satir = ozet[0] as { toplam: number; en_cok_bolum: string | null; en_cok_sehir: string | null };
    return {
      toplam: Number(satir.toplam ?? 0),
      enCokBolum: satir.en_cok_bolum ? [{ ad: satir.en_cok_bolum, sayi: 0 }] : [],
      enCokSehir: satir.en_cok_sehir ? [{ ad: satir.en_cok_sehir, sayi: 0 }] : [],
    };
  }

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

// ---------------------------------------------------------------- Yönetim özeti

export interface AdminOzet {
  ogrenci: number;
  profilDolu: number;
  teklifeAcik: number;
  basvuru: number;
  ilan: number;
  taslakIlan: number;
  sirket: number;
  sahiplenmis: number;
  bekleyenTalep: number;
  rozet: number;
  sonTarama: { zaman: string; durum: string; bulunan: number } | null;
  sonKayitlar: Array<{ tarih: string; sayi: number }>;
}

/**
 * Yönetim panelindeki sayılar.
 *
 * Hepsi `count` ile alınıyor, satırlar çekilmiyor: panelin kaç öğrencinin
 * kayıtlı olduğunu bilmesi yeterli, kimlerin kayıtlı olduğunu tek tek
 * listelemesi gerekmiyor. Kişisel veriyi gereksiz yere dolaştırmıyoruz.
 *
 * Yalnızca yönetici çağırabiliyor: RLS bu tabloların çoğunu zaten
 * kısıtlıyor, admin politikaları sayımı mümkün kılıyor.
 */
export async function fetchAdminOzet(): Promise<AdminOzet> {
  const say = async (tablo: string, filtre?: (q: any) => any) => {
    let q = supabase.from(tablo as never).select('*', { count: 'exact', head: true });
    if (filtre) q = filtre(q);
    const { count, error } = await q;
    if (error) return 0;
    return count ?? 0;
  };

  const [
    ogrenci, profilDolu, teklifeAcik, basvuru, ilan, taslakIlan,
    sirket, sahiplenmis, bekleyenTalep,
  ] = await Promise.all([
    say('student_profiles'),
    say('student_profiles', (q) => q.not('university', 'is', null).neq('university', '')),
    say('student_profiles', (q) => q.eq('is_open_to_offers', true)),
    say('applications'),
    say('listings', (q) => q.eq('status', 'published')),
    say('listings', (q) => q.eq('status', 'draft').eq('origin', 'internal')),
    say('companies'),
    say('companies', (q) => q.not('claimed_at', 'is', null)),
    say('company_claims', (q) => q.eq('status', 'pending')),
  ]);

  const { data: rozetSatir } = await supabase
    .from('student_profiles')
    .select('earned_badges');
  const rozet = (rozetSatir ?? []).reduce(
    (t: number, r: { earned_badges: string[] | null }) => t + (r.earned_badges?.length ?? 0),
    0
  );

  const { data: tarama } = await supabase
    .from('import_runs')
    .select('started_at,status,fetched_count')
    .order('started_at', { ascending: false })
    .limit(1);

  /* Son 7 günün kayıt dağılımı — sadece gün ve sayı, kişi bilgisi yok. */
  const yediGunOnce = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: yeniler } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', yediGunOnce);

  const gunler = new Map<string, number>();
  for (const r of (yeniler ?? []) as Array<{ created_at: string }>) {
    const gun = r.created_at.slice(0, 10);
    gunler.set(gun, (gunler.get(gun) ?? 0) + 1);
  }

  const t = (tarama ?? [])[0] as
    | { started_at: string; status: string; fetched_count: number }
    | undefined;

  return {
    ogrenci, profilDolu, teklifeAcik, basvuru, ilan, taslakIlan,
    sirket, sahiplenmis, bekleyenTalep, rozet,
    sonTarama: t
      ? { zaman: t.started_at, durum: t.status, bulunan: t.fetched_count ?? 0 }
      : null,
    sonKayitlar: [...gunler.entries()]
      .map(([tarih, sayi]) => ({ tarih, sayi }))
      .sort((a, b) => a.tarih.localeCompare(b.tarih)),
  };
}
