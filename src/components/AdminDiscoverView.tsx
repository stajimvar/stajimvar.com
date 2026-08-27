import React, { useEffect, useState } from "react";
import {
  adminCreateDiscoverEvent,
  adminDeleteDiscoverEvent,
  adminSetDiscoverEventStatus,
  adminSetDiscoverEventCuration,
  adminUpdateDiscoverEvent,
  DISCOVER_CATEGORIES,
  fetchAdminDiscoverEvent,
  fetchAdminDiscoverEvents,
  type DiscoverEvent,
  type DiscoverStatus,
} from "../lib/kesfet";

export const AdminDiscoverView: React.FC<{
  onNavigate: (p: string) => void;
}> = ({ onNavigate }) => {
  const [rows, setRows] = useState<DiscoverEvent[]>([]),
    [error, setError] = useState("");
  const load = () =>
    fetchAdminDiscoverEvents()
      .then(setRows)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  const status = async (e: DiscoverEvent, s: DiscoverStatus) => {
    try {
      await adminSetDiscoverEventStatus(e.id, e.updatedAt!, s);
      load();
    } catch (x: any) {
      setError(x.message);
    }
  };
  const remove = async (e: DiscoverEvent) => {
    if (!confirm(`“${e.title}” silinsin mi?`)) return;
    try {
      await adminDeleteDiscoverEvent(e.id);
      load();
    } catch (x: any) {
      setError(x.message);
    }
  };
  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-blue-600">Yönetim</p>
          <h1 className="text-2xl font-black">Keşfet etkinlikleri</h1>
        </div>
        <button
          onClick={() => onNavigate("/yonetim/kesfet/yeni")}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
        >
          Yeni etkinlik
        </button>
      </div>
      {error && (
        <p role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-800">
          {error}
        </p>
      )}
      <div className="bg-white border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-gray-50">
              <th className="p-3">Etkinlik</th>
              <th className="p-3">Tarih</th>
              <th className="p-3">Durum</th>
              <th className="p-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3">
                  <b>{e.title}</b>
                  <br />
                  <span className="text-gray-500">
                    {e.city} · {DISCOVER_CATEGORIES[e.category]}
                  </span>
                </td>
                <td className="p-3">
                  {new Date(e.startsAt).toLocaleDateString("tr-TR")}
                </td>
                <td className="p-3">
                  {e.status === "published" ? "Yayında" : "Taslak"}
                  <br />
                  <span className="text-xs text-gray-500">
                    Puan: {e.studentFitScore} ·{" "}
                    {e.verificationStatus === "verified"
                      ? "Doğrulandı"
                      : "İncelenecek"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        onNavigate(`/yonetim/kesfet/${e.id}/duzenle`)
                      }
                      className="font-bold text-blue-700"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() =>
                        status(
                          e,
                          e.status === "published" ? "draft" : "published",
                        )
                      }
                      className="font-bold text-gray-700"
                    >
                      {e.status === "published" ? "Yayından kaldır" : "Yayınla"}
                    </button>
                    <button
                      onClick={() => remove(e)}
                      className="font-bold text-rose-700"
                    >
                      Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  Henüz etkinlik yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
};

const empty = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  category: "exhibition",
  image_url: "",
  city: "",
  district: "",
  venue_name: "",
  address: "",
  starts_at: "",
  ends_at: "",
  regular_price: "",
  student_price: "",
  is_free: false,
  has_student_discount: false,
  organizer: "",
  source_url: "",
  ticket_url: "",
  directions_url: "",
  status: "draft",
  application_deadline: "",
  discount_terms: "",
  age_limit: "",
  registration_required: false,
  target_audiences: "student",
  interest_tags: "",
  source_kind: "official",
  source_trust_score: "90",
  last_verified_at: "",
  verification_status: "unverified",
  latitude: "",
  longitude: "",
  proximity_score: "",
  popularity_score: "",
  diversity_score: "",
  review_reason: "",
};
export const AdminDiscoverForm: React.FC<{
  onDone: (p: string) => void;
  editId?: string;
}> = ({ onDone, editId }) => {
  const [form, setForm] = useState<any>(empty),
    [stamp, setStamp] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!editId) return;
    fetchAdminDiscoverEvent(editId)
      .then((e) => {
        if (!e) return;
        setStamp(e.updatedAt || "");
        setForm({
          title: e.title,
          slug: e.slug,
          short_description: e.shortDescription,
          description: e.description,
          category: e.category,
          image_url: e.imageUrl || "",
          city: e.city,
          district: e.district,
          venue_name: e.venueName,
          address: e.address,
          starts_at: e.startsAt.slice(0, 16),
          ends_at: e.endsAt.slice(0, 16),
          regular_price: e.regularPrice ?? "",
          student_price: e.studentPrice ?? "",
          is_free: e.isFree,
          has_student_discount: e.hasStudentDiscount,
          organizer: e.organizer,
          source_url: e.sourceUrl,
          ticket_url: e.ticketUrl || "",
          directions_url: e.directionsUrl || "",
          status: e.status,
          application_deadline: e.applicationDeadline?.slice(0, 16) || "",
          discount_terms: e.discountTerms || "",
          age_limit: e.ageLimit || "",
          registration_required: e.registrationRequired,
          target_audiences: e.targetAudiences.join(", "),
          interest_tags: e.interestTags.join(", "),
          source_kind: e.sourceKind,
          source_trust_score: e.sourceTrustScore ?? "",
          last_verified_at: e.lastVerifiedAt?.slice(0, 16) || "",
          verification_status: e.verificationStatus,
          latitude: e.latitude ?? "",
          longitude: e.longitude ?? "",
          proximity_score: e.proximityScore ?? "",
          popularity_score: e.popularityScore ?? "",
          diversity_score: e.diversityScore ?? "",
          review_reason: "",
        });
      })
      .catch((e) => setError(e.message));
  }, [editId]);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    setError("");
    const p = {
      ...form,
      regular_price:
        form.regular_price === "" ? null : Number(form.regular_price),
      student_price:
        form.student_price === "" ? null : Number(form.student_price),
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
    };
    const curation = {
      application_deadline: form.application_deadline
        ? new Date(form.application_deadline).toISOString()
        : "",
      discount_terms: form.discount_terms,
      age_limit: form.age_limit,
      registration_required: form.registration_required,
      target_audiences: form.target_audiences
        .split(",")
        .map((x: string) => x.trim())
        .filter(Boolean),
      interest_tags: form.interest_tags
        .split(",")
        .map((x: string) => x.trim())
        .filter(Boolean),
      source_kind: form.source_kind,
      source_trust_score: form.source_trust_score,
      last_verified_at: form.last_verified_at
        ? new Date(form.last_verified_at).toISOString()
        : "",
      verification_status: form.verification_status,
      latitude: form.latitude,
      longitude: form.longitude,
      proximity_score: form.proximity_score,
      popularity_score: form.popularity_score,
      diversity_score: form.diversity_score,
      review_reason: form.review_reason,
    };
    try {
      if (editId) {
        const nextStamp = await adminUpdateDiscoverEvent(editId, stamp, p);
        await adminSetDiscoverEventCuration(editId, nextStamp, curation);
      } else {
        const id = await adminCreateDiscoverEvent(p);
        const created = await fetchAdminDiscoverEvent(id);
        if (!created?.updatedAt)
          throw new Error("Yeni etkinlik doğrulama alanları kaydedilemedi.");
        await adminSetDiscoverEventCuration(id, created.updatedAt, curation);
      }
      onDone("/yonetim/kesfet");
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };
  const field = (
    label: string,
    key: string,
    type = "text",
    required = true,
  ) => (
    <label className="space-y-1 text-sm font-bold">
      {label}
      <input
        type={type}
        required={required}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        className="w-full rounded-xl border border-gray-300 px-3 py-2 font-normal"
      />
    </label>
  );
  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-black mb-5">
        {editId ? "Etkinliği düzenle" : "Yeni etkinlik"}
      </h1>
      {error && (
        <p
          role="alert"
          className="mb-4 p-3 bg-rose-50 text-rose-800 rounded-xl"
        >
          {error}
        </p>
      )}
      <form
        onSubmit={save}
        className="bg-white border rounded-2xl p-5 grid sm:grid-cols-2 gap-4"
      >
        {field("Başlık", "title")}
        {field("Slug", "slug")}
        {field("Kısa açıklama", "short_description")}
        <label className="space-y-1 text-sm font-bold">
          Kategori
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className="w-full rounded-xl border px-3 py-2 font-normal"
          >
            {Object.entries(DISCOVER_CATEGORIES).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2 space-y-1 text-sm font-bold">
          Detaylı açıklama
          <textarea
            required
            rows={6}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="w-full rounded-xl border px-3 py-2 font-normal"
          />
        </label>
        {field("Görsel URL", "image_url", "url", false)}
        {field("Şehir", "city")}
        {field("İlçe", "district")}
        {field("Mekân", "venue_name")}
        {field("Adres", "address")}
        {field("Başlangıç", "starts_at", "datetime-local")}
        {field("Bitiş", "ends_at", "datetime-local")}
        {field("Normal fiyat", "regular_price", "number", false)}
        {field("Öğrenci fiyatı", "student_price", "number", false)}
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={form.is_free}
            onChange={(e) => set("is_free", e.target.checked)}
          />{" "}
          Ücretsiz
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={form.has_student_discount}
            onChange={(e) => set("has_student_discount", e.target.checked)}
          />{" "}
          Öğrenci indirimi
        </label>
        {field("Organizatör", "organizer")}
        {field("Resmî kaynak URL", "source_url", "url")}
        {field("Bilet / başvuru URL", "ticket_url", "url", false)}
        {field("Yol tarifi URL", "directions_url", "url", false)}
        <h2 className="sm:col-span-2 pt-3 border-t text-lg font-black">
          Öğrenci uygunluğu ve doğrulama
        </h2>
        {field(
          "Son başvuru / kayıt",
          "application_deadline",
          "datetime-local",
          false,
        )}
        {field("İndirim koşulu", "discount_terms", "text", false)}
        {field("Yaş sınırı", "age_limit", "text", false)}
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={form.registration_required}
            onChange={(e) => set("registration_required", e.target.checked)}
          />{" "}
          Kayıt gerekiyor
        </label>
        {field("Hedef kitle (virgülle)", "target_audiences", "text", false)}
        {field("İlgi etiketleri (virgülle)", "interest_tags", "text", false)}
        <label className="space-y-1 text-sm font-bold">
          Kaynak türü
          <select
            value={form.source_kind}
            onChange={(e) => set("source_kind", e.target.value)}
            className="w-full rounded-xl border px-3 py-2 font-normal"
          >
            <option value="official">Resmî</option>
            <option value="institution">Kültür kurumu</option>
            <option value="ticketing">Bilet platformu</option>
            <option value="unknown">Bilinmeyen</option>
          </select>
        </label>
        {field(
          "Kaynak güven puanı (0-100)",
          "source_trust_score",
          "number",
          false,
        )}
        {field("Son kontrol", "last_verified_at", "datetime-local", false)}
        <label className="space-y-1 text-sm font-bold">
          Doğrulama
          <select
            value={form.verification_status}
            onChange={(e) => set("verification_status", e.target.value)}
            className="w-full rounded-xl border px-3 py-2 font-normal"
          >
            <option value="unverified">Doğrulanmadı</option>
            <option value="pending_review">İnceleme bekliyor</option>
            <option value="verified">Doğrulandı</option>
            <option value="needs_review">Yeniden incelenecek</option>
          </select>
        </label>
        {field("Enlem", "latitude", "number", false)}
        {field("Boylam", "longitude", "number", false)}
        {field("Yakınlık puanı", "proximity_score", "number", false)}
        {field("Popülerlik puanı", "popularity_score", "number", false)}
        {field("Çeşitlilik puanı", "diversity_score", "number", false)}
        {field("İnceleme notu", "review_reason", "text", false)}
        <label className="space-y-1 text-sm font-bold">
          Yayın durumu
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className="w-full rounded-xl border px-3 py-2 font-normal"
          >
            <option value="draft">Taslak</option>
            <option value="published">Yayında</option>
          </select>
        </label>
        <div className="sm:col-span-2 flex gap-2">
          <button
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <button
            type="button"
            onClick={() => onDone("/yonetim/kesfet")}
            className="px-5 py-2.5 border rounded-xl font-bold"
          >
            Vazgeç
          </button>
        </div>
      </form>
    </main>
  );
};
