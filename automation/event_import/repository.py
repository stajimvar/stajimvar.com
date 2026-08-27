from __future__ import annotations

from dataclasses import asdict
from datetime import datetime
import re
import unicodedata
from typing import Any

from supabase import Client

from .domain import EventSource, NormalizedEvent, merge_event


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
        rows = self.db.table("discover_events").select("*").eq("source_fingerprint", fingerprint).limit(1).execute().data or []
        return rows[0] if rows else None

    def upsert(self, event: NormalizedEvent, fingerprint: str, cover=None) -> str:
        existing = self.find(event, fingerprint)
        source_id = next(iter(self.source_ids.values()))
        payload = asdict(event)
        payload.update(
            {
                "slug": slugify(f"{event.title}-{event.starts_at[:10]}"),
                "import_source_id": source_id,
                "source_fingerprint": fingerprint,
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
            unchanged = all(existing.get(k) == value for k, value in comparable.items())
            merged.update(payload)
            self.db.table("discover_events").update(merged).eq("id", existing["id"]).execute()
            return "unchanged" if unchanged else "updated"
        self.db.table("discover_events").insert(payload).execute()
        return "inserted"

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
            "error_summary": error,
        }
        self.db.table("discover_event_import_runs").update(payload).eq("id", run_id).execute()

    def archive_expired(self, source: EventSource, now: datetime) -> int:
        source_id = self.source_ids[source.id]
        rows = (
            self.db.table("discover_events")
            .select("id")
            .eq("import_source_id", source_id)
            .lt("ends_at", now.isoformat())
            .neq("status", "archived")
            .execute()
            .data
            or []
        )
        for row in rows:
            self.db.table("discover_events").update({"status": "archived"}).eq("id", row["id"]).execute()
        return len(rows)
