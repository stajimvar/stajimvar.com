import React, { useEffect, useState } from "react";
import {
  adminCreateDiscoverEvent,
  adminDeleteDiscoverEvent,
  adminSetDiscoverEventStatus,
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
    try {
      editId
        ? await adminUpdateDiscoverEvent(editId, stamp, p)
        : await adminCreateDiscoverEvent(p);
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
