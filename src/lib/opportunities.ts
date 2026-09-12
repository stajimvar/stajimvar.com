import { supabase } from './supabase';

export type OpportunityType =
  | 'scholarship'
  | 'kyk'
  | 'international'
  | 'competition'
  | 'education'
  | 'student_support'
  | 'youth_program'
  /* 20260926110000 göçüyle açılan dört tür; kategori haritası lib/firsat-kategori.mjs. */
  | 'hackathon'
  | 'teknofest'
  | 'career_day'
  | 'career_fair';
export type OpportunityEventMode = 'in_person' | 'online' | 'hybrid';
export type OpportunityStatus = 'draft' | 'published' | 'expired' | 'archived';

export interface Opportunity {
  id: string; slug: string; title: string; organizationName: string; organizationLogoUrl?: string;
  /* Kurumun kendi sayfasından doğrulanmış kapak görseli. Yoksa logo/baş harf kapağı üretiliyor. */
  coverImageUrl?: string;
  opportunityType: OpportunityType; shortDescription: string; description: string; eligibility: string;
  educationLevels: string[]; eligibleDepartments: string[]; eligibleClassYears: string[]; cities: string[]; countries: string[];
  minimumGpa?: number; languageRequirements: string[]; amountText?: string; supportType?: string;
  /*
    TUTAR — YAPISAL ALANLAR

    amount_text bir NİTELİK alanı ("Karşılıksız", "Programa göre
    değişiyor"); miktar taşımıyor. Miktar bu alanlarda ve yalnızca
    amountVerifiedAt doluysa ekrana çıkıyor.
  */
  amountMin?: number; amountMax?: number; currency?: string; paymentPeriod?: string;
  amountPeriodLabel?: string; amountNote?: string; repayable?: boolean; amountVerifiedAt?: string;
  applicationStartAt?: string; applicationDeadline?: string; applicationUrl?: string; sourceUrl: string;
  requiredDocuments: string[]; status: OpportunityStatus; verifiedAt?: string; lastCheckedAt?: string; publishedAt?: string; updatedAt?: string;
  /*
    KISIT DOĞRULAMA DAMGALARI

    Kişiselleştirmenin girdisi. Damga yoksa o boyut DOĞRULANMADI demek —
    dizinin dolu olması tek başına doğrulanmış uygunluk anlamına gelmiyor
    (bkz. lib/burs-uygunluk.mjs).

    Bu üç alan öğrenciye giden sorguda SEÇİLMİYORDU. Sonuç: istemcide her
    fırsat "doğrulanmamış" görünüyordu ama `opportunityFit` damgalara
    hiç bakmadığı için dolu diziyi kesin bilgi sayıyordu — yani sistem
    bir yandan kapalı, bir yandan açık davranıyordu.
  */
  departmentsVerifiedAt?: string;
  educationLevelsVerifiedAt?: string;
  citiesVerifiedAt?: string;
  /*
    ETKİNLİK VE ŞART ALANLARI (göç 20260926110000)

    Hepsi NULL olabilir ve NULL "bilinmiyor" demek — "yok" değil. Arayüz
    bu alanlara varsayılan uydurmuyor: değer yoksa o satır çizilmiyor.
    `eventMode` yalnız kariyer etkinliklerinde dolu; burs/program
    kayıtlarında NULL olduğu için "Yüz yüze / Çevrim içi" süzgeci ancak
    listede dolu kayıt varken çiziliyor.
  */
  eventMode?: OpportunityEventMode;
  startsAt?: string;
  endsAt?: string;
  venueName?: string;
  academicYear?: string;
  ageMin?: number;
  ageMax?: number;
  incomeRequirement?: string;
  sourceCheckedAt?: string;
  sourceStatus?: 'ok' | 'transient_error' | 'closed' | 'moved';
  sourceFailureCount?: number;
}

const COLUMNS = 'id,slug,title,organization_name,organization_logo_url,cover_image_url,opportunity_type,short_description,description,eligibility,education_levels,eligible_departments,eligible_class_years,cities,countries,minimum_gpa,language_requirements,amount_text,support_type,amount_min,amount_max,currency,payment_period,amount_period_label,amount_note,repayable,amount_verified_at,application_start_at,application_deadline,application_url,source_url,required_documents,status,verified_at,last_checked_at,published_at,departments_verified_at,education_levels_verified_at,cities_verified_at,event_mode,starts_at,ends_at,venue_name,academic_year,age_min,age_max,income_requirement,source_checked_at,source_status,source_failure_count';
const map = (row: any): Opportunity => ({
  id: row.id, slug: row.slug, title: row.title, organizationName: row.organization_name, organizationLogoUrl: row.organization_logo_url ?? undefined, coverImageUrl: row.cover_image_url ?? undefined,
  opportunityType: row.opportunity_type, shortDescription: row.short_description ?? '', description: row.description ?? '', eligibility: row.eligibility ?? '',
  educationLevels: row.education_levels ?? [], eligibleDepartments: row.eligible_departments ?? [], eligibleClassYears: row.eligible_class_years ?? [], cities: row.cities ?? [], countries: row.countries ?? [],
  minimumGpa: row.minimum_gpa == null ? undefined : Number(row.minimum_gpa), languageRequirements: row.language_requirements ?? [], amountText: row.amount_text ?? undefined, supportType: row.support_type ?? undefined,
  amountMin: row.amount_min == null ? undefined : Number(row.amount_min),
  amountMax: row.amount_max == null ? undefined : Number(row.amount_max),
  currency: row.currency ?? undefined, paymentPeriod: row.payment_period ?? undefined,
  amountPeriodLabel: row.amount_period_label ?? undefined, amountNote: row.amount_note ?? undefined,
  repayable: row.repayable == null ? undefined : Boolean(row.repayable),
  amountVerifiedAt: row.amount_verified_at ?? undefined,
  applicationStartAt: row.application_start_at ?? undefined, applicationDeadline: row.application_deadline ?? undefined, applicationUrl: row.application_url ?? undefined, sourceUrl: row.source_url,
  requiredDocuments: row.required_documents ?? [], status: row.status, verifiedAt: row.verified_at ?? undefined, lastCheckedAt: row.last_checked_at ?? undefined, publishedAt: row.published_at ?? undefined,
  departmentsVerifiedAt: row.departments_verified_at ?? undefined,
  educationLevelsVerifiedAt: row.education_levels_verified_at ?? undefined,
  citiesVerifiedAt: row.cities_verified_at ?? undefined,
  eventMode: row.event_mode ?? undefined,
  startsAt: row.starts_at ?? undefined,
  endsAt: row.ends_at ?? undefined,
  venueName: row.venue_name ?? undefined,
  academicYear: row.academic_year ?? undefined,
  ageMin: row.age_min == null ? undefined : Number(row.age_min),
  ageMax: row.age_max == null ? undefined : Number(row.age_max),
  incomeRequirement: row.income_requirement ?? undefined,
  sourceCheckedAt: row.source_checked_at ?? undefined,
  sourceStatus: row.source_status ?? undefined,
  sourceFailureCount: row.source_failure_count == null ? undefined : Number(row.source_failure_count),
});

/*
  HAM HATA METNİ KULLANICIYA GİTMİYOR

  Mesajlar `error.message` ile kuruluyordu; PostgREST metni tablo ve sütun
  adlarını, bazen politika adını taşıyor ("permission denied for table
  opportunities"). O cümle kullanıcıya hiçbir şey anlatmıyor, yapıyı ise
  anlatıyor. Ayrıntı konsola gidiyor, kullanıcıya sade cümle kalıyor.
*/
function hataAt(kullaniciMesaji: string, error: unknown): never {
  if (typeof console !== 'undefined') console.error(kullaniciMesaji, error);
  throw new Error(kullaniciMesaji);
}

/**
 * Bugünün Türkiye takvim günü (YYYY-MM-DD).
 *
 * `toISOString().slice(0,10)` UTC gününü verir; Türkiye UTC+3 olduğu için
 * gece yarısından sonraki üç saatte bir önceki günü döndürür ve o saatte
 * son günü bugün olan fırsatlar listeden düşerdi.
 */
function bugunTR(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Ana liste: yayında VE son başvurusu geçmemiş kayıtlar.
 *
 * İki koşul birlikte gerekiyor. RLS artık `expired` satırları da okutuyor
 * (arşiv görünümü için), ayrıca durum sütunu gecikebiliyor: gece işi
 * koşmadan önce son günü dün olan kayıt hâlâ `published` görünüyor.
 * Tek koşulla liste kapanmış başvuru gösterirdi.
 */
export async function fetchOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await (supabase.from('opportunities' as any) as any)
    .select(COLUMNS)
    .eq('status', 'published')
    .or(`application_deadline.is.null,application_deadline.gte.${bugunTR()}`)
    .order('application_deadline', { ascending: true, nullsFirst: false });
  if (error) hataAt('Fırsatlar yüklenemedi.', error);
  return (data ?? []).map(map);
}

/**
 * Arşiv görünümü: süresi dolanlar.
 *
 * Ayrı çağrı, çünkü ayrı görünüm: iki kümeyi tek listede karıştırmak "bu
 * hâlâ açık mı" sorusunu her kartta yeniden sordururdu. Ana liste
 * açılırken bu sorgu hiç atılmıyor; yalnız arşiv açıldığında.
 */
export async function fetchExpiredOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await (supabase.from('opportunities' as any) as any)
    .select(COLUMNS)
    .eq('status', 'expired')
    .order('application_deadline', { ascending: false, nullsFirst: false });
  if (error) hataAt('Süresi dolan fırsatlar yüklenemedi.', error);
  return (data ?? []).map(map);
}

export async function fetchOpportunityBySlug(slug: string): Promise<Opportunity | null> {
  const { data, error } = await (supabase.from('opportunities' as any) as any).select(COLUMNS).eq('slug', slug).maybeSingle();
  if (error) hataAt('Fırsat yüklenemedi.', error);
  return data ? map(data) : null;
}
export async function fetchSavedOpportunityIds(userId: string): Promise<string[]> {
  const { data, error } = await (supabase.from('saved_opportunities' as any) as any).select('opportunity_id').eq('user_id', userId);
  if (error) hataAt('Kaydedilen fırsatlar yüklenemedi.', error);
  return (data ?? []).map((row: any) => row.opportunity_id);
}
export async function toggleSavedOpportunity(userId: string, opportunityId: string, saved: boolean): Promise<void> {
  const table = supabase.from('saved_opportunities' as any) as any;
  const { error } = saved ? await table.delete().eq('user_id', userId).eq('opportunity_id', opportunityId) : await table.insert({ user_id: userId, opportunity_id: opportunityId });
  if (error && error.code !== '23505') hataAt('Fırsat kaydı güncellenemedi.', error);
}

/*
  İLAN KAYDETME

  Fırsat tarafındaki kaydetme ile aynı desen, ayrı tablo: saved_listings.
  "Kaydet" ve "Başvurdum" farklı niyetler — biri "ilgileniyorum, henüz
  başvurmadım", diğeri "resmî sayfada tamamladım". Tek düğmede toplamak,
  kullanıcıyı yapmadığı bir şeyi işaretlemeye zorluyordu.

  Tablo yoksa (SQL henüz çalıştırılmadıysa) arayüz çökmesin diye okuma
  sessizce boş dönüyor; yazma ise hata veriyor, çünkü kullanıcı bir eylem
  yaptığını sanıp kaybetmemeli.
*/
export async function fetchSavedListingIds(userId: string): Promise<string[]> {
  const { data, error } = await (supabase.from('saved_listings' as any) as any)
    .select('listing_id')
    .eq('user_id', userId);
  if (error) {
    /* 42P01: tablo yok. Özellik açılmadan önce arayüz çalışmaya devam etsin. */
    if ((error as any).code === '42P01') return [];
    hataAt('Kaydedilen ilanlar yüklenemedi.', error);
  }
  return (data ?? []).map((row: any) => row.listing_id);
}

export async function toggleSavedListing(userId: string, listingId: string, saved: boolean): Promise<void> {
  const table = supabase.from('saved_listings' as any) as any;
  const { error } = saved
    ? await table.delete().eq('user_id', userId).eq('listing_id', listingId)
    : await table.insert({ user_id: userId, listing_id: listingId });
  /* 23505: zaten kayıtlı — kullanıcı için sonuç aynı, hata sayılmıyor. */
  if (error && (error as any).code !== '23505') {
    hataAt('İlan kaydı güncellenemedi.', error);
  }
}

/*
  BAŞVURU KONTROL LİSTESİ

  Başvuru kurumun kendi sayfasında yapılıyor; StajımVar başvuruyu almıyor
  ve alıyormuş gibi de yapmıyor. Tutulan tek şey öğrencinin KENDİ hazırlık
  süreci: hangi belgeyi topladığını aklında tutmak zorunda kalmasın.

  Tablo yoksa okuma sessizce boş dönüyor (özellik açılmadan arayüz
  çalışsın), yazma ise hata veriyor — kullanıcı işaretlediğini sanıp
  kaybetmemeli.
*/
export async function fetchOpportunityProgress(userId: string, opportunityId: string): Promise<string[]> {
  const { data, error } = await (supabase.from('opportunity_application_progress' as any) as any)
    .select('completed_steps')
    .eq('user_id', userId)
    .eq('opportunity_id', opportunityId)
    .maybeSingle();
  if (error) {
    if ((error as any).code === '42P01') return [];
    hataAt('Kontrol listesi yüklenemedi.', error);
  }
  return data?.completed_steps ?? [];
}

export async function saveOpportunityProgress(userId: string, opportunityId: string, steps: string[]): Promise<void> {
  const { error } = await (supabase.from('opportunity_application_progress' as any) as any)
    .upsert(
      { user_id: userId, opportunity_id: opportunityId, completed_steps: steps, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,opportunity_id' }
    );
  if (error) hataAt('Kontrol listesi kaydedilemedi.', error);
}
