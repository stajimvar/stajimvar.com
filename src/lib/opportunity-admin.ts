import { supabase } from './supabase';
import { type Opportunity, type OpportunityStatus } from './opportunities';

export async function fetchAdminOpportunities(page = 0, query = ''): Promise<{ rows: Opportunity[]; count: number }> {
  let request = (supabase.from('opportunities' as any) as any).select('*', { count: 'exact' }).order('updated_at', { ascending: false }).range(page * 20, page * 20 + 19);
  if (query.trim()) request = request.or(`title.ilike.%${query.trim()}%,organization_name.ilike.%${query.trim()}%`);
  const { data, count, error } = await request;
  if (error) throw new Error(error.message);
  const rows = (data || []).map((x: any) => ({ id:x.id,slug:x.slug,title:x.title,organizationName:x.organization_name,opportunityType:x.opportunity_type,shortDescription:x.short_description||'',description:x.description||'',eligibility:x.eligibility||'',educationLevels:x.education_levels||[],eligibleDepartments:x.eligible_departments||[],eligibleClassYears:x.eligible_class_years||[],cities:x.cities||[],countries:x.countries||[],minimumGpa:x.minimum_gpa,languageRequirements:x.language_requirements||[],amountText:x.amount_text,supportType:x.support_type,applicationStartAt:x.application_start_at,applicationDeadline:x.application_deadline,applicationUrl:x.application_url,sourceUrl:x.source_url,requiredDocuments:x.required_documents||[],status:x.status,publishedAt:x.published_at, verifiedAt:x.verified_at,lastCheckedAt:x.last_checked_at, updatedAt:x.updated_at }));
  return { rows, count: count || 0 };
}
export async function fetchAdminOpportunity(id: string): Promise<any> { const { data,error }=await (supabase.from('opportunities' as any) as any).select('*').eq('id',id).maybeSingle(); if(error) throw new Error(error.message); return data; }
export async function adminCreateOpportunity(payload: Record<string, unknown>) { const { data,error }=await (supabase.rpc as any)('admin_create_opportunity',{p:payload}); if(error) throw new Error(error.message); return data as string; }
export async function adminUpdateOpportunity(id:string, expectedUpdatedAt:string, payload:Record<string,unknown>) { const {error}=await (supabase.rpc as any)('admin_update_opportunity',{p_id:id,p_expected_updated_at:expectedUpdatedAt,p:payload}); if(error) throw new Error(error.message); }
export async function adminSetOpportunityStatus(id:string, expectedUpdatedAt:string, status:OpportunityStatus) { const {error}=await (supabase.rpc as any)('admin_set_opportunity_status',{p_id:id,p_expected_updated_at:expectedUpdatedAt,p_status:status}); if(error) throw new Error(error.message); }

/*
  TUTAR GİRİŞİ

  Kaydın geri kalanına dokunmadan yalnızca tutar alanlarını yazıyor.
  Doğrulama damgasını (amount_verified_at) sunucu koyuyor: tarihi elle
  girilebilir bırakmak, doğrulanmamış bir tutarı doğrulanmış göstermenin
  en kolay yolu olurdu.
*/
export async function adminSetOpportunityAmount(
  id: string,
  expectedUpdatedAt: string,
  payload: Record<string, unknown>
) : Promise<string> {
  const { data, error } = await (supabase.rpc as any)('admin_set_opportunity_amount', {
    p_id: id,
    p_expected_updated_at: expectedUpdatedAt,
    p: payload,
  });
  if (error) throw new Error(error.message);
  /* Yeni updated_at geri veriliyor: aynı sayfadaki diğer form eşzamanlılık
     korumasını kaybetmesin, kullanıcı sayfayı yenilemek zorunda kalmasın. */
  return data as string;
}

/**
 * Tek bir uygunluk boyutunun doğrulama kararını kaydeder.
 *
 * ASIL KAPI SUNUCUDA
 * ------------------
 * `admin_set_opportunity_eligibility` security definer ve ilk satırında
 * `is_admin()` soruyor. Arayüzde düğmeyi gizlemek güvenlik değil;
 * yönetici olmayan biri bu çağrıyı yapsa da yetkisiz hatası alır.
 *
 * ALAN BAZLI: bir boyutu doğrulamak diğerlerini doğrulamıyor.
 */
export async function adminSetOpportunityEligibility(
  id: string,
  expectedUpdatedAt: string,
  boyut: 'departments' | 'education_levels' | 'cities',
  karar: 'unverified' | 'unrestricted' | 'restricted',
  degerler: string[] = []
): Promise<string> {
  const { data, error } = await (supabase.rpc as any)('admin_set_opportunity_eligibility', {
    p_id: id,
    p_expected_updated_at: expectedUpdatedAt,
    p_boyut: boyut,
    p_karar: karar,
    p_degerler: degerler,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
