"""Deterministic, write-free decisions for external-listing reconciliation.

The caller must persist the returned state only after a healthy complete source run.
This module deliberately contains no database client and cannot delete anything.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import StrEnum

MISS_THRESHOLD = 3
MIN_STALE_AGE = timedelta(hours=48)
COUNT_DROP_RATIO = 0.20
MASS_DEACTIVATION_RATIO = 0.25


class Health(StrEnum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    FAILED = "FAILED"
    ANOMALY = "ANOMALY"


@dataclass(frozen=True)
class SourceRun:
    source_id: str
    started_at: datetime
    finished_at: datetime
    http_status: int | None
    fetch_success: bool
    parser_success: bool
    pagination_complete: bool
    previous_job_count: int
    current_job_count: int
    turkey_job_count: int = 0
    internship_candidate_count: int = 0
    accepted_count: int = 0
    error_count: int = 0
    retry_count: int = 0
    error: str | None = None

    @property
    def duration_ms(self) -> int:
        return max(0, int((self.finished_at - self.started_at).total_seconds() * 1000))


@dataclass(frozen=True)
class ListingState:
    type: str
    importer_managed: bool
    company_id: str | None
    author_id: str | None
    application_method: str | None
    consecutive_missing_runs: int
    last_seen_at: datetime | None
    deactivation_reason: str | None = None


@dataclass(frozen=True)
class ReconciliationDecision:
    """A write-free lifecycle decision; callers own persistence and authorization."""
    consecutive_missing_runs: int
    stale_eligible: bool
    would_deactivate: bool
    would_reactivate: bool


def health(run: SourceRun) -> tuple[Health, str | None]:
    if not run.fetch_success or not run.parser_success:
        return Health.FAILED, run.error or "FETCH_OR_PARSE_FAILURE"
    if run.http_status is not None and (run.http_status in {401, 403, 408, 429} or run.http_status >= 500):
        return Health.FAILED, f"HTTP_{run.http_status}"
    if not run.pagination_complete:
        return Health.DEGRADED, "PAGINATION_INCOMPLETE"
    if run.previous_job_count > 0 and run.current_job_count == 0:
        return Health.ANOMALY, "ANOMALY_ZERO_RESULT"
    if run.previous_job_count >= 10 and run.current_job_count / run.previous_job_count < COUNT_DROP_RATIO:
        return Health.ANOMALY, "ANOMALY_COUNT_DROP"
    return Health.HEALTHY, None


def protected(state: ListingState) -> bool:
    return (
        state.type != "external"
        or not state.importer_managed
        or state.company_id is not None
        or state.author_id is not None
        or state.application_method in {"internal", "email_application", "manual_test"}
    )


def next_missing_runs(run: SourceRun, state: ListingState, seen: bool) -> int:
    run_health, _ = health(run)
    if run_health is not Health.HEALTHY or protected(state):
        return state.consecutive_missing_runs
    return 0 if seen else state.consecutive_missing_runs + 1


def eligible_for_deactivation(run: SourceRun, state: ListingState, seen: bool, now: datetime) -> bool:
    misses = next_missing_runs(run, state, seen)
    return (
        not seen
        and not protected(state)
        and health(run)[0] is Health.HEALTHY
        and misses >= MISS_THRESHOLD
        and state.last_seen_at is not None
        and now - state.last_seen_at >= MIN_STALE_AGE
    )


def mass_deactivation_blocked(candidate_count: int, managed_active_count: int) -> bool:
    return managed_active_count > 0 and candidate_count / managed_active_count > MASS_DEACTIVATION_RATIO


def closed_signal(http_status: int | None, explicit_closed: bool = False) -> bool:
    return explicit_closed or http_status == 404


def may_reactivate(state: ListingState, seen: bool) -> bool:
    return seen and not protected(state) and state.deactivation_reason in {"stale", "explicit_closed"}


def reconcile(run: SourceRun, state: ListingState, seen: bool, now: datetime, allow_deactivation: bool) -> ReconciliationDecision:
    """Compute the controlled lifecycle without touching a database.

    Unhealthy runs and protected records are strict no-ops.  A seen record clears
    stale state, but only an importer stale/closed reason can be auto-reactivated.
    """
    if protected(state) or health(run)[0] is not Health.HEALTHY:
        return ReconciliationDecision(state.consecutive_missing_runs, False, False, False)
    if seen:
        return ReconciliationDecision(0, False, False, may_reactivate(state, True))
    missing_runs = next_missing_runs(run, state, False)
    stale = eligible_for_deactivation(run, state, False, now)
    return ReconciliationDecision(missing_runs, stale, stale, False)


def reconciliation_payload(decision: ReconciliationDecision, seen: bool, now: datetime, allow_deactivation: bool) -> dict[str, object]:
    """Return the only fields a controlled runner may persist for an owned row."""
    payload: dict[str, object] = {"source_last_checked_at": now.isoformat(), "consecutive_missing_runs": decision.consecutive_missing_runs}
    if seen:
        payload.update({"last_seen_at": now.isoformat(), "stale_eligible_at": None})
        if decision.would_reactivate:
            payload.update({"is_active": True, "deactivated_at": None, "deactivation_reason": None})
        return payload
    payload["stale_eligible_at"] = now.isoformat() if decision.stale_eligible else None
    if decision.would_deactivate and allow_deactivation:
        payload.update({"is_active": False, "deactivated_at": now.isoformat(), "deactivation_reason": "stale"})
    return payload


def source_deactivation_allowed(source_id: str, global_enabled: bool, enabled_sources: set[str]) -> bool:
    """Fail closed: the global gate and an explicit source allowlist are both required."""
    return global_enabled and source_id in enabled_sources
