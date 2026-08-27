import { supabase } from "./supabase";

export const DISCOVER_CATEGORIES = {
  exhibition: "Sergi",
  museum: "Müze",
  festival: "Festival",
  fair: "Fuar",
  theatre: "Tiyatro",
  concert: "Konser",
  workshop: "Atölye",
  university: "Üniversite etkinliği",
  city_route: "Şehir rotası",
  day_trip: "Günübirlik gezi",
} as const;
export type DiscoverCategory = keyof typeof DISCOVER_CATEGORIES;
export type DiscoverStatus =
  | "draft"
  | "published"
  | "cancelled"
  | "postponed"
  | "archived";
export type DiscoverCoverKind = "official" | "category" | "manual";
export type DiscoverVerificationStatus =
  "unverified" | "pending_review" | "verified" | "needs_review";
export interface DiscoverEvent {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  category: DiscoverCategory;
  imageUrl?: string;
  city: string;
  district: string;
  venueName: string;
  address: string;
  startsAt: string;
  endsAt?: string;
  regularPrice?: number;
  studentPrice?: number;
  isFree: boolean;
  hasStudentDiscount: boolean;
  organizer: string;
  sourceUrl: string;
  ticketUrl?: string;
  directionsUrl?: string;
  status: DiscoverStatus;
  updatedAt?: string;
  applicationDeadline?: string;
  discountTerms?: string;
  ageLimit?: string;
  registrationRequired: boolean;
  targetAudiences: string[];
  interestTags: string[];
  sourceKind: "official" | "institution" | "ticketing" | "unknown";
  sourceTrustScore?: number;
  lastVerifiedAt?: string;
  verificationStatus: DiscoverVerificationStatus;
  latitude?: number;
  longitude?: number;
  proximityScore?: number;
  popularityScore?: number;
  diversityScore?: number;
  studentFitScore: number;
  originalImageUrl?: string;
  cardImageUrl?: string;
  detailImageUrl?: string;
  coverKind: DiscoverCoverKind;
  eventMode: "physical" | "online" | "hybrid";
  onlineUrl?: string;
  canonicalSourceUrl?: string;
  reviewRequired: boolean;
  reviewReason?: string;
}
const COLUMNS =
  "id,slug,title,short_description,description,category,image_url,city,district,venue_name,address,starts_at,ends_at,regular_price,student_price,is_free,has_student_discount,organizer,source_url,ticket_url,directions_url,status,updated_at,application_deadline,discount_terms,age_limit,registration_required,target_audiences,interest_tags,source_kind,source_trust_score,last_verified_at,verification_status,latitude,longitude,proximity_score,popularity_score,diversity_score,student_fit_score,original_image_url,card_image_url,detail_image_url,cover_kind,event_mode,online_url,canonical_source_url,review_required,review_reason";
export const mapDiscoverEvent = (r: any): DiscoverEvent => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  shortDescription: r.short_description || "",
  description: r.description || "",
  category: r.category,
  imageUrl: r.image_url || undefined,
  city: r.city,
  district: r.district,
  venueName: r.venue_name,
  address: r.address,
  startsAt: r.starts_at,
  endsAt: r.ends_at || undefined,
  regularPrice: r.regular_price == null ? undefined : Number(r.regular_price),
  studentPrice: r.student_price == null ? undefined : Number(r.student_price),
  isFree: Boolean(r.is_free),
  hasStudentDiscount: Boolean(r.has_student_discount),
  organizer: r.organizer,
  sourceUrl: r.source_url,
  ticketUrl: r.ticket_url || undefined,
  directionsUrl: r.directions_url || undefined,
  status: r.status,
  updatedAt: r.updated_at,
  applicationDeadline: r.application_deadline || undefined,
  discountTerms: r.discount_terms || undefined,
  ageLimit: r.age_limit || undefined,
  registrationRequired: Boolean(r.registration_required),
  targetAudiences: r.target_audiences || [],
  interestTags: r.interest_tags || [],
  sourceKind: r.source_kind || "official",
  sourceTrustScore:
    r.source_trust_score == null ? undefined : Number(r.source_trust_score),
  lastVerifiedAt: r.last_verified_at || undefined,
  verificationStatus: r.verification_status || "unverified",
  latitude: r.latitude == null ? undefined : Number(r.latitude),
  longitude: r.longitude == null ? undefined : Number(r.longitude),
  proximityScore:
    r.proximity_score == null ? undefined : Number(r.proximity_score),
  popularityScore:
    r.popularity_score == null ? undefined : Number(r.popularity_score),
  diversityScore:
    r.diversity_score == null ? undefined : Number(r.diversity_score),
  studentFitScore: Number(r.student_fit_score || 0),
  originalImageUrl: r.original_image_url || undefined,
  cardImageUrl: r.card_image_url || r.image_url || undefined,
  detailImageUrl: r.detail_image_url || r.card_image_url || r.image_url || undefined,
  coverKind: r.cover_kind || (r.image_url ? "manual" : "category"),
  eventMode: r.event_mode || "physical",
  onlineUrl: r.online_url || undefined,
  canonicalSourceUrl: r.canonical_source_url || undefined,
  reviewRequired: Boolean(r.review_required),
  reviewReason: r.review_reason || undefined,
});
export async function fetchDiscoverEvents() {
  const { data, error } = await (supabase.from("discover_events" as any) as any)
    .select(COLUMNS)
    .order("student_fit_score", { ascending: false })
    .order("starts_at");
  if (error) throw new Error(error.message);
  return (data || []).map(mapDiscoverEvent);
}
export async function fetchDiscoverEventBySlug(slug: string) {
  const { data, error } = await (supabase.rpc as any)(
    "get_discover_event_by_slug",
    { p_slug: slug },
  );
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return row ? mapDiscoverEvent(row) : null;
}
export async function fetchAdminDiscoverEvents() {
  const { data, error } = await (supabase.from("discover_events" as any) as any)
    .select(COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapDiscoverEvent);
}
export async function fetchAdminDiscoverEvent(id: string) {
  const { data, error } = await (supabase.from("discover_events" as any) as any)
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapDiscoverEvent(data) : null;
}
export async function adminCreateDiscoverEvent(p: Record<string, unknown>) {
  const { data, error } = await (supabase.rpc as any)(
    "admin_create_discover_event",
    { p },
  );
  if (error) throw new Error(error.message);
  return data as string;
}
export async function adminUpdateDiscoverEvent(
  id: string,
  stamp: string,
  p: Record<string, unknown>,
) {
  const { data, error } = await (supabase.rpc as any)(
    "admin_update_discover_event",
    {
      p_id: id,
      p_expected_updated_at: stamp,
      p,
    },
  );
  if (error) throw new Error(error.message);
  return data as string;
}
export async function adminSetDiscoverEventCuration(
  id: string,
  stamp: string,
  p: Record<string, unknown>,
) {
  const { data, error } = await (supabase.rpc as any)(
    "admin_set_discover_event_curation",
    { p_id: id, p_expected_updated_at: stamp, p },
  );
  if (error) throw new Error(error.message);
  return data as string;
}
export async function adminSetDiscoverEventStatus(
  id: string,
  stamp: string,
  status: DiscoverStatus,
) {
  const { error } = await (supabase.rpc as any)(
    "admin_set_discover_event_status",
    { p_id: id, p_expected_updated_at: stamp, p_status: status },
  );
  if (error) throw new Error(error.message);
}
export async function adminDeleteDiscoverEvent(id: string) {
  const { error } = await (supabase.rpc as any)("admin_delete_discover_event", {
    p_id: id,
  });
  if (error) throw new Error(error.message);
}
