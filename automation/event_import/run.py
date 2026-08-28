from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime
import json
import os
from pathlib import Path
import sys
from typing import Any

from dotenv import load_dotenv
import requests
from supabase import create_client

from .adapters import fetch_source
from .domain import EventSource, event_fingerprint, normalize_event
from .http import OfficialHttpClient
from .images import render_variants, upload_variants, validate_image
from .repository import SupabaseEventRepository


@dataclass
class RunMetrics:
    found: int = 0
    inserted: int = 0
    updated: int = 0
    unchanged: int = 0
    review: int = 0
    archived: int = 0
    images: int = 0
    category_covers: int = 0
    errors: int = 0


class ConfigAdapter:
    def __init__(self, config: dict[str, Any], client: OfficialHttpClient):
        self.config = config
        self.client = client

    def fetch(self, source: EventSource):
        return fetch_source(self.config, self.client)


class StorageCoverService:
    def __init__(self, storage):
        self.storage = storage

    def process(self, event, fingerprint):
        if not event.original_image_url:
            return None
        response = requests.get(event.original_image_url, timeout=15)
        response.raise_for_status()
        info = validate_image(response.content, response.headers.get("content-type", ""))
        if not info.accepted:
            return None
        return upload_variants(self.storage, fingerprint, render_variants(response.content))


def run_source(source, adapter, repository, now: datetime, *, dry_run=False, cover_service=None) -> RunMetrics:
    metrics = RunMetrics()
    candidates = adapter.fetch(source)
    metrics.found = len(candidates)
    if dry_run:
        for candidate in candidates:
            normalized = normalize_event(candidate, source, now)
            metrics.review += int(normalized.review_required)
        return metrics
    run_id = repository.start_run(source)
    try:
        for candidate in candidates:
            try:
                event = normalize_event(candidate, source, now)
                fingerprint = event_fingerprint(event)
                cover = cover_service.process(event, fingerprint) if cover_service else None
                metrics.images += int(cover is not None)
                metrics.category_covers += int(cover is None)
                result = repository.upsert(event, fingerprint, cover)
                setattr(metrics, result, getattr(metrics, result) + 1)
                metrics.review += int(event.review_required)
            except Exception as exc:
                metrics.errors += 1
                print(json.dumps({
                    "source": source.id,
                    "event_url": getattr(candidate, "source_url", None),
                    "error_type": type(exc).__name__,
                    "error": str(exc)[:300],
                }, ensure_ascii=False), file=sys.stderr)
        metrics.archived = repository.archive_expired(source, now)
        repository.finish_run(run_id, metrics)
    except Exception as exc:
        repository.finish_run(run_id, metrics, str(exc)[:500])
        raise
    return metrics


def load_configs() -> list[dict[str, Any]]:
    return json.loads((Path(__file__).with_name("sources.json")).read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--source")
    args = parser.parse_args()
    configs = [x for x in load_configs() if x.get("enabled", True)]
    if args.source:
        configs = [x for x in configs if x["id"] == args.source]
    if not configs:
        raise SystemExit("etkin kaynak bulunamadı")
    load_dotenv(Path(__file__).parents[1] / ".env")
    repository = None
    cover_service = None
    if not args.dry_run:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise SystemExit("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY zorunludur")
        db = create_client(url, key)
        repository = SupabaseEventRepository(db)
        cover_service = StorageCoverService(db.storage)
    for config in configs:
        source = EventSource(
            config["id"], config["name"], config["base_url"],
            tuple(config["official_domains"]), int(config.get("trust_score", 90)),
        )
        if repository:
            repository.ensure_source(source, config)
        adapter = ConfigAdapter(config, OfficialHttpClient())
        metrics = run_source(source, adapter, repository, datetime.now().astimezone(), dry_run=args.dry_run, cover_service=cover_service)
        print(json.dumps({"source": source.id, **metrics.__dict__}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
