from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone
import json
import re
import unicodedata
from typing import Any

from supabase import Client

from .domain import EventOccurrence, EventSource, NormalizedEvent, merge_event


_DATETIME_FIELDS = {"starts_at", "ends_at", "application_deadline"}


def _identity_text(value: Any) -> str:
    return " ".join(str(value or "").split()).casefold()


def _values_equal(incoming: Any, stored: Any, field: str) -> bool:
    if field not in _DATETIME_FIELDS or not incoming or not stored:
        return incoming == stored
    try:
        left = datetime.fromisoformat(str(incoming).replace("Z", "+00:00")).astimezone(timezone.utc)
        right = datetime.fromisoformat(str(stored).replace("Z", "+00:00")).astimezone(timezone.utc)
        return left == right
    except ValueError:
        return incoming == stored


def slugify(value: str) -> str:
    folded = value.replace("ı", "i").replace("İ", "i")
    ascii_only = "".join(
        ch for ch in unicodedata.normalize("NFKD", folded) if not unicodedata.combining(ch)
    )
    return re.sub(r"[^a-zA-Z0-9]+", "-", ascii_only).strip("-").lower()


class SupabaseEventRepository:
    def __init__(self, client: Client):
        self.db = client
        self.source_ids: dict[str, str] = {}
        self.active_source_id: str | None = None

    def ensure_source(self, source: EventSource, config: dict[str, Any]) -> str:
        payload = {
            "slug": source.id,
            "name": source.name,
            "base_url": source.base_url,
            "adapter": config["adapter"],
            "official_domains": list(source.official_domains),
            "cities": list(config.get("cities") or []),
            "trust_score": source.trust_score,
            "is_enabled": bool(config.get("enabled", True)),
        }
        rows = self.db.table("discover_event_sources").select("id").eq("slug", source.id).limit(1).execute().data or []
        if rows:
            source_id = rows[0]["id"]
            self.db.table("discover_event_sources").update(payload).eq("id", source_id).execute()
        else:
            source_id = self.db.table("discover_event_sources").insert(payload).execute().data[0]["id"]
        self.source_ids[source.id] = source_id
        return source_id

    def start_run(self, source: EventSource) -> str:
        source_id = self.source_ids[source.id]
        self.active_source_id = source_id
        return self.db.table("discover_event_import_runs").insert({"source_id": source_id}).execute().data[0]["id"]

    def find(self, event: NormalizedEvent, fingerprint: str):
        rows = (
            self.db.table("discover_events")
            .select("*")
            .eq("canonical_source_url", event.canonical_source_url)
            .limit(1)
            .execute()
            .data
            or []
        )
        if rows:
            return rows[0]
        rows = self.db.table("discover_events").select("*").eq("title", event.title).eq("starts_at", event.starts_at).execute().data or []
        wanted_venue = _identity_text(event.venue_name)
        return next((row for row in rows if _identity_text(row.get("venue_name")) == wanted_venue), None)

    def unique_slug(self, event: NormalizedEvent, fingerprint: str) -> str:
        base = slugify(f"{event.title}-{event.starts_at[:10]}")
        rows = self.db.table("discover_events").select("id").eq("slug", base).limit(1).execute().data or []
        return f"{base}-{fingerprint[:8]}" if rows else base

    def upsert(self, event: NormalizedEvent, fingerprint: str, cover=None) -> tuple[str, str]:
        existing = self.find(event, fingerprint)
        if not self.active_source_id:
            raise RuntimeError("etkin import kaynağı başlatılmadı")
        source_id = self.active_source_id
        payload = asdict(event)
        payload.pop("occurrences", None)
        payload.update(
            {
                "slug": existing.get("slug") if existing else self.unique_slug(event, fingerprint),
                "import_source_id": source_id,
                "imported_at": datetime.now().astimezone().isoformat(),
                "image_url": cover.card_url if cover else None,
                "card_image_url": cover.card_url if cover else None,
                "detail_image_url": cover.detail_url if cover else None,
                "cover_kind": cover.cover_kind if cover else "category",
            }
        )
        payload.pop("review_reason", None) if payload.get("review_reason") is None else None
        if existing:
            merged = merge_event(existing, event)
            comparable = {k: payload.get(k) for k in payload if k not in {"last_verified_at", "last_seen_at", "imported_at"}}
            changed_fields = [k for k, value in comparable.items() if not _values_equal(value, existing.get(k), k)]
            unchanged = not changed_fields
            if changed_fields:
                print(json.dumps({"event_url": event.canonical_source_url, "changed_fields": changed_fields}, ensure_ascii=False))
            merged.update(payload)
            self.db.table("discover_events").update(merged).eq("id", existing["id"]).execute()
            return ("unchanged" if unchanged else "updated", existing["id"])
        inserted = self.db.table("discover_events").insert(payload).execute().data[0]
        return "inserted", inserted["id"]

    def upsert_occurrence(
        self,
        event_id: str,
        occurrence: EventOccurrence,
        checked_at: datetime,
    ) -> str:
        rows = (
            self.db.table("discover_event_occurrences")
            .select("*")
            .eq("event_id", event_id)
            .eq("source_occurrence_id", occurrence.source_occurrence_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        existing = rows[0] if rows else None
        status = occurrence.explicit_status or "scheduled"
        payload = {
            "event_id": event_id,
            "source_occurrence_id": occurrence.source_occurrence_id,
            "starts_at": occurrence.starts_at,
            "ends_at": occurrence.ends_at,
            "time_precision": occurrence.time_precision,
            "status": status,
            "last_seen_at": checked_at.isoformat(),
            "consecutive_missing_runs": 0,
            "cancelled_at": checked_at.isoformat() if status == "cancelled" else None,
            "postponed_at": checked_at.isoformat() if status == "postponed" else None,
            "archived_at": checked_at.isoformat() if status == "archived" else None,
        }
        comparable = {
            key: value
            for key, value in payload.items()
            if key not in {"last_seen_at", "consecutive_missing_runs"}
        }
        unchanged = bool(existing) and all(
            _values_equal(value, existing.get(key), key)
            for key, value in comparable.items()
        ) and int(existing.get("consecutive_missing_runs") or 0) == 0
        if existing:
            self.db.table("discover_event_occurrences").update(payload).eq("id", existing["id"]).execute()
            return "unchanged" if unchanged else "updated"
        self.db.table("discover_event_occurrences").insert(payload).execute()
        if not str(occurrence.source_occurrence_id).startswith(("legacy:", "admin:")):
            self.db.table("discover_event_occurrences").update(
                {"status": "archived", "archived_at": checked_at.isoformat()}
            ).eq("event_id", event_id).like("source_occurrence_id", "legacy:%").execute()
        return "inserted"

    def reconcile_missing_occurrences(
        self,
        source: EventSource,
        seen_ids: set[tuple[str, str]],
        run_complete: bool,
    ) -> dict[str, int]:
        if not run_complete:
            return {"missing": 0, "archived": 0}
        source_id = self.source_ids[source.id]
        events = (
            self.db.table("discover_events")
            .select("id")
            .eq("import_source_id", source_id)
            .execute()
            .data
            or []
        )
        event_ids = [row["id"] for row in events]
        if not event_ids:
            return {"missing": 0, "archived": 0}
        rows = (
            self.db.table("discover_event_occurrences")
            .select("id,event_id,source_occurrence_id,status,consecutive_missing_runs")
            .in_("event_id", event_ids)
            .execute()
            .data
            or []
        )
        missing = archived = 0
        for row in rows:
            identity = (row["event_id"], row["source_occurrence_id"])
            if identity in seen_ids or row["status"] != "scheduled":
                continue
            missing += 1
            count = int(row.get("consecutive_missing_runs") or 0) + 1
            payload: dict[str, Any] = {"consecutive_missing_runs": count}
            if count >= 3:
                payload.update({"status": "archived", "archived_at": datetime.now().astimezone().isoformat()})
                archived += 1
            self.db.table("discover_event_occurrences").update(payload).eq("id", row["id"]).execute()
        return {"missing": missing, "archived": archived}

    def finish_run(self, run_id: str, metrics, error: str | None = None) -> None:
        payload = {
            "finished_at": datetime.now().astimezone().isoformat(),
            "status": "failed" if error else "success",
            "found_count": metrics.found,
            "inserted_count": metrics.inserted,
            "updated_count": metrics.updated,
            "unchanged_count": metrics.unchanged,
            "review_count": metrics.review,
            "archived_count": metrics.archived,
            "image_count": metrics.images,
            "category_cover_count": metrics.category_covers,
            "error_count": metrics.errors,
            "missing_occurrence_count": metrics.missing_occurrences,
            "archived_occurrence_count": metrics.archived_occurrences,
            "error_summary": error,
        }
        if not error and metrics.errors:
            payload["status"] = "partial"
        self.db.table("discover_event_import_runs").update(payload).eq("id", run_id).execute()

    def archive_expired(self, source: EventSource, now: datetime) -> int:
        source_id = self.source_ids[source.id]
        event_rows = (
            self.db.table("discover_events")
            .select("id")
            .eq("import_source_id", source_id)
            .execute()
            .data
            or []
        )
        event_ids = [row["id"] for row in event_rows]
        if not event_ids:
            return 0
        rows = (
            self.db.table("discover_event_occurrences")
            .select("id")
            .in_("event_id", event_ids)
            .lt("ends_at", now.isoformat())
            .eq("status", "scheduled")
            .execute()
            .data
            or []
        )
        for row in rows:
            self.db.table("discover_event_occurrences").update(
                {"status": "archived", "archived_at": now.isoformat()}
            ).eq("id", row["id"]).execute()
        return len(rows)
