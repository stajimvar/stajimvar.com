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
from .geocoding import build_query, default_provider, geocode_event
from .http import OfficialHttpClient
from .images import CoverResult, render_variants, upload_variants, validate_image
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
    missing_occurrences: int = 0
    archived_occurrences: int = 0
    scan_complete: bool = False


class ConfigAdapter:
    def __init__(self, config: dict[str, Any], client: OfficialHttpClient):
        self.config = config
        self.client = client
        self.scan_complete = False

    def fetch(self, source: EventSource):
        events = fetch_source(self.config, self.client)
        self.scan_complete = bool(self.config.get("complete_scan", False)) and bool(events)
        return events


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


class GeocodeService:
    """Etkinliği koordinata çevirir; aynı sorguyu iki kez sormaz.

    TOKEN YOKSA HİÇ KURULMUYOR

    main() bu servisi yalnızca sağlayıcı etkinse yaratıyor. Yani anahtar
    yokken ne nesne var ne çağrı; içe aktarma tamamen eskisi gibi akıyor.

    AYNI ADRES TEKRAR SORULMUYOR

    Geocoding ücretli ve kalıcı uç nokta kullanıyoruz. Kayıtta zaten aynı
    `geocode_query` ile alınmış bir koordinat varsa servise gidilmiyor.
    Sorgu değiştiyse (mekân adı ya da ilçe güncellendiyse) yeniden
    soruluyor — çünkü artık başka bir yeri gösteriyor olabilir.
    """

    def __init__(self, provider, country_names: dict[str, str] | None = None):
        self.provider = provider
        self.country_names = country_names or {"TR": "Türkiye"}
        self.calls = 0

    def process(self, event, existing):
        country_code = getattr(event, "country_code", None) or "TR"
        hazir = build_query(
            address=getattr(event, "address", None),
            venue_name=getattr(event, "venue_name", None),
            district=getattr(event, "district", None),
            city=getattr(event, "city", None),
            country_name=self.country_names.get(country_code),
        )
        if hazir is None:
            return None
        query, _ = hazir

        if existing and existing.get("geocode_query") == query and existing.get("latitude") is not None:
            return None

        sonuc = geocode_event(
            provider=self.provider,
            address=getattr(event, "address", None),
            venue_name=getattr(event, "venue_name", None),
            district=getattr(event, "district", None),
            city=getattr(event, "city", None),
            country_name=self.country_names.get(country_code),
            country_code=country_code,
        )
        if sonuc is not None:
            self.calls += 1
        return sonuc


def reusable_cover(existing, event):
    if not existing or existing.get("cover_kind") != "official":
        return None
    if not existing.get("card_image_url") or not existing.get("detail_image_url"):
        return None
    return CoverResult(existing["card_image_url"], existing["detail_image_url"], existing.get("cover_kind") or "official")


def run_source(source, adapter, repository, now: datetime, *, dry_run=False, cover_service=None, geocode_service=None) -> RunMetrics:
    metrics = RunMetrics()
    candidates = adapter.fetch(source)
    metrics.found = len(candidates)
    metrics.scan_complete = bool(getattr(adapter, "scan_complete", False)) and metrics.found > 0
    if dry_run:
        for candidate in candidates:
            normalized = normalize_event(candidate, source, now)
            metrics.review += int(normalized.review_required)
        return metrics
    run_id = repository.start_run(source)
    seen_occurrence_ids: set[tuple[str, str]] = set()
    try:
        for candidate in candidates:
            try:
                event = normalize_event(candidate, source, now)
                fingerprint = event_fingerprint(event)
                existing = repository.find(event, fingerprint)
                cover = reusable_cover(existing, event)
                if cover is None and cover_service:
                    cover = cover_service.process(event, fingerprint)
                metrics.images += int(cover is not None)
                metrics.category_covers += int(cover is None)
                result, event_id = repository.upsert(event, fingerprint, cover)
                setattr(metrics, result, getattr(metrics, result) + 1)
                # Geocoding upsert'ten SONRA: event_id gerekiyor ve
                # başarısızlığı kaydın yazılmasını engellememeli.
                if geocode_service:
                    repository.save_geocode(event_id, geocode_service.process(event, existing))
                for occurrence in event.occurrences:
                    repository.upsert_occurrence(event_id, occurrence, now)
                    seen_occurrence_ids.add((event_id, occurrence.source_occurrence_id))
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
        reconciliation = repository.reconcile_missing_occurrences(
            source,
            seen_occurrence_ids,
            run_complete=metrics.errors == 0 and metrics.scan_complete,
        )
        metrics.missing_occurrences = reconciliation["missing"]
        metrics.archived_occurrences = reconciliation["archived"]
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
    geocode_service = None
    if not args.dry_run:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise SystemExit("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY zorunludur")
        db = create_client(url, key)
        repository = SupabaseEventRepository(db)
        cover_service = StorageCoverService(db.storage)
        # Sağlayıcı yalnızca anahtar varsa etkin; yoksa servis hiç
        # kurulmuyor ve tek bir ağ çağrısı bile yapılmıyor.
        saglayici = default_provider()
        if saglayici.enabled():
            geocode_service = GeocodeService(saglayici)
        else:
            print(json.dumps({"geocoding": "atlandi", "sebep": "GEOAPIFY_API_KEY yok"}, ensure_ascii=False))
    for config in configs:
        source = EventSource(
            config["id"], config["name"], config["base_url"],
            tuple(config["official_domains"]), int(config.get("trust_score", 90)),
        )
        if repository:
            repository.ensure_source(source, config)
        adapter = ConfigAdapter(config, OfficialHttpClient())
        metrics = run_source(source, adapter, repository, datetime.now().astimezone(), dry_run=args.dry_run, cover_service=cover_service, geocode_service=geocode_service)
        print(json.dumps({"source": source.id, **metrics.__dict__}, ensure_ascii=False))

    """
    GEOCODING ÖZETİ

    Üç sayı ayrı ayrı raporlanıyor çünkü üç farklı sorunu anlatıyorlar:

      istek     — servise kaç kez gidildi (kota takibi)
      reddedilen— servis yanıt verdi ama sonuç bölge merkeziydi; yani
                  kaynaktaki mekân adı tanınmıyor. Veri kalitesi sorunu.
      yazilan   — gerçekten nokta koordinatı alınıp saklanan kayıt

    Anahtarın kendisi ASLA basılmıyor; yalnızca etkin olup olmadığı.
    """
    if geocode_service is not None:
        saglayici = geocode_service.provider
        print(json.dumps({
            "geocoding": "ozet",
            "istek": getattr(saglayici, "used", 0),
            "reddedilen_bolge_sonucu": getattr(saglayici, "rejected", 0),
            "yazilan_koordinat": geocode_service.calls,
        }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
