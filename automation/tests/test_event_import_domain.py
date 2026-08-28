from datetime import datetime
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parents[1]))

from event_import.domain import (
    EventCandidate,
    EventOccurrence,
    EventSource,
    event_fingerprint,
    lifecycle_for,
    merge_event,
    normalize_event,
    occurrence_fingerprint,
)


NOW = datetime.fromisoformat("2026-08-27T12:00:00+03:00")


def source() -> EventSource:
    return EventSource(
        id="kultur-istanbul",
        name="KÜLTÜR.İSTANBUL",
        base_url="https://kultur.istanbul/",
        official_domains=("kultur.istanbul",),
        trust_score=95,
    )


def candidate(**changes) -> EventCandidate:
    values = {
        "source_event_id": "official-1",
        "source_url": "https://kultur.istanbul/etkinlik/kariyer-fuari/",
        "title": "İnovasyon Atölyesi",
        "description": "Öğrenciler için uygulamalı etkinlik.",
        "category": "workshop",
        "starts_at": "2026-09-01T18:00:00+03:00",
        "ends_at": None,
        "city": "İstanbul",
        "district": "Kadıköy",
        "venue_name": "Müze Gazhane",
    }
    values.update(changes)
    return EventCandidate(**values)


def test_same_title_venue_and_start_share_fingerprint():
    first = normalize_event(candidate(), source(), NOW)
    second = normalize_event(
        candidate(title="  inovasyon atölyesi  ", venue_name="müze   gazhane"),
        source(),
        NOW,
    )
    assert event_fingerprint(first) == event_fingerprint(second)


def test_unknown_values_remain_none_and_trigger_review():
    normalized = normalize_event(candidate(), source(), NOW)
    assert normalized.student_price is None
    assert normalized.ends_at is None
    assert normalized.review_required is True
    assert "Bitiş tarihi" in normalized.review_reason


def test_finished_event_archives_without_delete():
    finished = normalize_event(
        candidate(ends_at="2026-08-26T20:00:00+03:00"), source(), NOW
    )
    assert lifecycle_for(finished, NOW) == "archived"


def test_merge_preserves_known_value_when_source_omits_it():
    existing = {"student_price": 75, "status": "published"}
    incoming = normalize_event(candidate(), source(), NOW)
    merged = merge_event(existing, incoming)
    assert merged["student_price"] == 75
    assert merged["status"] == "draft"


def test_single_date_candidate_becomes_one_stable_occurrence():
    normalized = normalize_event(candidate(), source(), NOW)
    assert len(normalized.occurrences) == 1
    occurrence = normalized.occurrences[0]
    assert occurrence.starts_at == normalized.starts_at
    assert occurrence.source_occurrence_id.startswith("schedule:")
    assert occurrence_fingerprint(occurrence) == occurrence_fingerprint(occurrence)


def test_midnight_occurrence_is_date_only_and_multiple_sessions_are_preserved():
    sessions = (
        EventOccurrence(None, "2026-09-01T00:00:00+03:00", "2026-09-01T23:59:59+03:00"),
        EventOccurrence("session-2", "2026-09-02T18:00:00+03:00", "2026-09-02T20:00:00+03:00"),
    )
    normalized = normalize_event(candidate(occurrences=sessions), source(), NOW)
    assert len(normalized.occurrences) == 2
    assert normalized.occurrences[0].time_precision == "date_only"
    assert normalized.occurrences[1].source_occurrence_id == "session-2"
