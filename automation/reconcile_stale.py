"""Read-only production stale-reconciliation readiness audit.

This command never writes to Supabase.  It fetches the public configured sources,
then evaluates only explicitly importer-managed, unclaimed external rows.
"""
from __future__ import annotations

import argparse
import os
from datetime import UTC, datetime

from dotenv import load_dotenv
from supabase import create_client

import scraper
from stale_safety import Health, ListingState, SourceRun, health, reconcile, source_deactivation_allowed


def as_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Required safety acknowledgement; runner is always read-only.")
    args = parser.parse_args()
    if not args.dry_run:
        raise SystemExit("Audit runner is read-only; pass --dry-run")
    load_dotenv()
    db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    managed = db.table("listings").select(
        "id,type,is_active,company_id,author_id,application_method,source_name,source_url,importer_managed,consecutive_missing_runs,last_seen_at,source_last_checked_at,deactivation_reason"
    ).eq("type", "external").eq("importer_managed", True).is_("company_id", "null").execute().data or []
    adapters = {"rss": scraper.rss, "json": scraper.json_api, "greenhouse": scraper.greenhouse, "ashby": scraper.ashby, "lever": scraper.lever, "workable": scraper.workable, "workday": scraper.workday, "smartrecruiters": scraper.smartrecruiters}
    configured = [item for item in scraper.source_configs() if item.get("enabled", True)]
    global_enabled = os.getenv("ALLOW_DEACTIVATION", "false").lower() == "true"
    enabled_sources = {item.strip() for item in os.getenv("DEACTIVATION_ENABLED_SOURCES", "").split(",") if item.strip()}
    total = {"managed_active": 0, "seen": 0, "missing": 0, "miss1": 0, "miss2": 0, "miss3": 0, "stale": 0, "would_deactivate": 0, "would_reactivate": 0, "circuit_breaker": 0, "ready": 0, "no_managed": 0, "not_enough_history": 0, "anomaly": 0}
    for config in configured:
        started = datetime.now(UTC); source_id = str(config.get("id") or config.get("name")); source_name = str(config.get("name"))
        jobs = []
        try:
            jobs = list(adapters[config["type"]](config))
            run = SourceRun(source_id, started, datetime.now(UTC), 200, True, True, True, 0, len(jobs), accepted_count=len(jobs))
        except Exception as error:
            run = SourceRun(source_id, started, datetime.now(UTC), None, False, False, False, 0, 0, error=str(error), error_count=1)
        source_health, reason = health(run)
        rows = [row for row in managed if row.get("source_name") == source_name]
        seen_urls = {scraper.canonical(job.source_url) for job in jobs}
        seen = missing = stale = would_deactivate = would_reactivate = 0
        for row in rows:
            state = ListingState(row["type"], bool(row.get("importer_managed")), row.get("company_id"), row.get("author_id"), row.get("application_method"), int(row.get("consecutive_missing_runs") or 0), as_datetime(row.get("last_seen_at")), row.get("deactivation_reason"))
            is_seen = row.get("source_url") in seen_urls
            decision = reconcile(run, state, is_seen, datetime.now(UTC), False)
            seen += int(is_seen); missing += int(not is_seen); stale += int(decision.stale_eligible); would_deactivate += int(decision.would_deactivate); would_reactivate += int(decision.would_reactivate)
            total["miss1"] += int(decision.consecutive_missing_runs == 1); total["miss2"] += int(decision.consecutive_missing_runs == 2); total["miss3"] += int(decision.consecutive_missing_runs >= 3)
        if not rows:
            readiness = "NO_MANAGED_LISTINGS"; total["no_managed"] += 1
        elif source_health is not Health.HEALTHY:
            readiness = "ANOMALY"; total["anomaly"] += 1
        elif any(not row.get("last_seen_at") or not row.get("source_last_checked_at") for row in rows):
            readiness = "NOT_ENOUGH_HISTORY"; total["not_enough_history"] += 1
        else:
            readiness = "NOT_ENOUGH_HISTORY"; total["not_enough_history"] += 1
        allowed = source_deactivation_allowed(source_id, global_enabled, enabled_sources)
        total["managed_active"] += sum(bool(row.get("is_active")) for row in rows)
        total["seen"] += seen; total["missing"] += missing; total["stale"] += stale; total["would_deactivate"] += would_deactivate; total["would_reactivate"] += would_reactivate
        print(f"SOURCE={source_id} HEALTH={source_health} FETCHED={len(jobs)} MANAGED_ACTIVE={sum(bool(row.get('is_active')) for row in rows)} SEEN={seen} MISSING={missing} STALE={stale} WOULD_DEACTIVATE={would_deactivate} WOULD_REACTIVATE={would_reactivate} READINESS={readiness} SOURCE_DEACTIVATION={allowed} BLOCK_REASON={reason or 'GLOBAL_OR_SOURCE_GATE'}")
    print("STALE AUDIT SUMMARY " + " ".join(f"{key.upper()}={value}" for key, value in total.items()))


if __name__ == "__main__":
    main()
