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
export type DiscoverStatus = "draft" | "published";
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
  endsAt: string;
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
}
const COLUMNS =
  "id,slug,title,short_description,description,category,image_url,city,district,venue_name,address,starts_at,ends_at,regular_price,student_price,is_free,has_student_discount,organizer,source_url,ticket_url,directions_url,status,updated_at";
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
  endsAt: r.ends_at,
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
});
export async function fetchDiscoverEvents() {
  const { data, error } = await (supabase.from("discover_events" as any) as any)
    .select(COLUMNS)
    .order("starts_at");
  if (error) throw new Error(error.message);
  return (data || []).map(mapDiscoverEvent);
}
export async function fetchDiscoverEventBySlug(slug: string) {
  const { data, error } = await (supabase.rpc as any)("get_discover_event_by_slug", { p_slug: slug });
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
  const { error } = await (supabase.rpc as any)("admin_update_discover_event", {
    p_id: id,
    p_expected_updated_at: stamp,
    p,
  });
  if (error) throw new Error(error.message);
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
