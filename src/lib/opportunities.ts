import { supabase } from './supabase';

export type OpportunityType = 'scholarship' | 'kyk' | 'international' | 'competition' | 'education' | 'student_support' | 'youth_program';
export type OpportunityStatus = 'draft' | 'published' | 'expired' | 'archived';

export interface Opportunity {
  id: string; slug: string; title: string; organizationName: string; organizationLogoUrl?: string;
  opportunityType: OpportunityType; shortDescription: string; description: string; eligibility: string;
  educationLevels: string[]; eligibleDepartments: string[]; eligibleClassYears: string[]; cities: string[]; countries: string[];
  minimumGpa?: number; languageRequirements: string[]; amountText?: string; supportType?: string;
  applicationStartAt?: string; applicationDeadline?: string; applicationUrl?: string; sourceUrl: string;
  requiredDocuments: string[]; status: OpportunityStatus; verifiedAt?: string; lastCheckedAt?: string; publishedAt?: string; updatedAt?: string;
}

const COLUMNS = 'id,slug,title,organization_name,organization_logo_url,opportunity_type,short_description,description,eligibility,education_levels,eligible_departments,eligible_class_years,cities,countries,minimum_gpa,language_requirements,amount_text,support_type,application_start_at,application_deadline,application_url,source_url,required_documents,status,verified_at,last_checked_at,published_at';
const map = (row: any): Opportunity => ({
  id: row.id, slug: row.slug, title: row.title, organizationName: row.organization_name, organizationLogoUrl: row.organization_logo_url ?? undefined,
  opportunityType: row.opportunity_type, shortDescription: row.short_description ?? '', description: row.description ?? '', eligibility: row.eligibility ?? '',
  educationLevels: row.education_levels ?? [], eligibleDepartments: row.eligible_departments ?? [], eligibleClassYears: row.eligible_class_years ?? [], cities: row.cities ?? [], countries: row.countries ?? [],
  minimumGpa: row.minimum_gpa == null ? undefined : Number(row.minimum_gpa), languageRequirements: row.language_requirements ?? [], amountText: row.amount_text ?? undefined, supportType: row.support_type ?? undefined,
  applicationStartAt: row.application_start_at ?? undefined, applicationDeadline: row.application_deadline ?? undefined, applicationUrl: row.application_url ?? undefined, sourceUrl: row.source_url,
  requiredDocuments: row.required_documents ?? [], status: row.status, verifiedAt: row.verified_at ?? undefined, lastCheckedAt: row.last_checked_at ?? undefined, publishedAt: row.published_at ?? undefined,
});

export async function fetchOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await (supabase.from('opportunities' as any) as any).select(COLUMNS).order('application_deadline', { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Fırsatlar yüklenemedi: ${error.message}`);
  return (data ?? []).map(map);
}
export async function fetchOpportunityBySlug(slug: string): Promise<Opportunity | null> {
  const { data, error } = await (supabase.from('opportunities' as any) as any).select(COLUMNS).eq('slug', slug).maybeSingle();
  if (error) throw new Error(`Fırsat yüklenemedi: ${error.message}`);
  return data ? map(data) : null;
}
export async function fetchSavedOpportunityIds(userId: string): Promise<string[]> {
  const { data, error } = await (supabase.from('saved_opportunities' as any) as any).select('opportunity_id').eq('user_id', userId);
  if (error) throw new Error(`Kaydedilen fırsatlar yüklenemedi: ${error.message}`);
  return (data ?? []).map((row: any) => row.opportunity_id);
}
export async function toggleSavedOpportunity(userId: string, opportunityId: string, saved: boolean): Promise<void> {
  const table = supabase.from('saved_opportunities' as any) as any;
  const { error } = saved ? await table.delete().eq('user_id', userId).eq('opportunity_id', opportunityId) : await table.insert({ user_id: userId, opportunity_id: opportunityId });
  if (error && error.code !== '23505') throw new Error(`Fırsat kaydı güncellenemedi: ${error.message}`);
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
    throw new Error(`Kaydedilen ilanlar yüklenemedi: ${error.message}`);
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
    throw new Error(`İlan kaydı güncellenemedi: ${error.message}`);
  }
}
