from dataclasses import asdict
from datetime import datetime
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parents[1]))

from event_import.domain import EventCandidate, EventOccurrence, EventSource
from event_import.repository import _identity_text, _values_equal
from event_import.run import reusable_cover, run_source


NOW = datetime.fromisoformat("2026-08-27T12:00:00+03:00")


class MemoryRepository:
    def __init__(self):
        self.events = {}
        self.runs = []
        self.occurrences = {}

    def start_run(self, source):
        self.runs.append({"source": source.id})
        return str(len(self.runs))

    def find(self, event, fingerprint):
        return self.events.get(event.canonical_source_url) or self.events.get(fingerprint)

    def upsert(self, event, fingerprint, cover=None):
        existing = self.find(event, fingerprint)
        payload = asdict(event)
        payload["fingerprint"] = fingerprint
        payload["cover"] = cover
        self.events[event.canonical_source_url] = payload
        status = "unchanged" if existing == payload else "updated" if existing else "inserted"
        return status, event.canonical_source_url

    def upsert_occurrence(self, event_id, occurrence, checked_at):
        key = (event_id, occurrence.source_occurrence_id)
        existing = self.occurrences.get(key)
        self.occurrences[key] = {
            **asdict(occurrence),
            "event_id": event_id,
            "status": occurrence.explicit_status or "scheduled",
            "last_seen_at": checked_at.isoformat(),
            "consecutive_missing_runs": 0,
        }
        return "unchanged" if existing == self.occurrences[key] else "updated" if existing else "inserted"

    def reconcile_missing_occurrences(self, source, seen_ids, run_complete):
        if not run_complete:
            return {"missing": 0, "archived": 0}
        missing = archived = 0
        for value in self.occurrences.values():
            if (value["event_id"], value["source_occurrence_id"]) in seen_ids:
                continue
            missing += 1
            value["consecutive_missing_runs"] += 1
            if value["consecutive_missing_runs"] >= 3:
                value["status"] = "archived"
                archived += 1
        return {"missing": missing, "archived": archived}

    def finish_run(self, run_id, metrics, error=None):
        self.runs[-1].update(asdict(metrics))
        self.runs[-1]["error"] = error

    def archive_expired(self, source, now):
        return 0


class FakeAdapter:
    scan_complete = True

    def fetch(self, source):
        return [
            EventCandidate(
                source_event_id="42",
                source_url="https://official.example/events/42",
                title="Kariyer Fuarı",
                description="Öğrenci kariyer buluşması.",
                category="fair",
                starts_at="2026-09-05T10:00:00+03:00",
                ends_at="2026-09-05T18:00:00+03:00",
                city="İstanbul",
                district="Şişli",
                venue_name="Kongre Merkezi",
                image_url="https://official.example/cover.jpg",
            )
        ]


def official_source():
    return EventSource(
        id="official",
        name="Official",
        base_url="https://official.example/",
        official_domains=("official.example",),
        trust_score=95,
    )


def test_second_run_updates_without_duplicate():
    repository = MemoryRepository()
    first = run_source(official_source(), FakeAdapter(), repository, NOW)
    second = run_source(official_source(), FakeAdapter(), repository, NOW)
    assert first.inserted == 1
    assert second.inserted == 0
    assert second.unchanged == 1
    assert len(repository.events) == 1
    assert len(repository.occurrences) == 1


def test_dry_run_performs_zero_writes():
    repository = MemoryRepository()
    metrics = run_source(official_source(), FakeAdapter(), repository, NOW, dry_run=True)
    assert metrics.found == 1
    assert repository.events == {}
    assert repository.runs == []


def test_repository_treats_equivalent_timezone_values_as_unchanged():
    assert _values_equal("2026-08-28T12:00:00+03:00", "2026-08-28T09:00:00+00:00", "starts_at")
    assert not _values_equal("2026-08-28T12:00:00+03:00", "2026-08-28T10:00:00+00:00", "starts_at")


def test_reuses_existing_processed_cover():
    event = type("Event", (), {"original_image_url": "https://official.example/cover.jpg"})()
    existing = {
        "original_image_url": event.original_image_url,
        "card_image_url": "https://cdn.example/card.webp",
        "detail_image_url": "https://cdn.example/detail.webp",
        "cover_kind": "official",
    }
    cover = reusable_cover(existing, event)
    assert cover.card_url.endswith("card.webp")
    assert cover.detail_url.endswith("detail.webp")


def test_identity_text_normalizes_venue_spacing_and_case():
    assert _identity_text(" Müze   Gazhane ") == _identity_text("müze gazhane")


def test_one_event_can_import_multiple_sessions_without_second_run_duplicates():
    class MultiSessionAdapter:
        def fetch(self, source):
            base = FakeAdapter().fetch(source)[0]
            return [EventCandidate(**{
                **asdict(base),
                "occurrences": (
                    EventOccurrence("morning", base.starts_at, base.ends_at),
                    EventOccurrence("evening", "2026-09-05T19:00:00+03:00", "2026-09-05T21:00:00+03:00"),
                ),
            })]

    repository = MemoryRepository()
    first = run_source(official_source(), MultiSessionAdapter(), repository, NOW)
    second = run_source(official_source(), MultiSessionAdapter(), repository, NOW)
    assert first.inserted == 1
    assert second.unchanged == 1
    assert len(repository.events) == 1
    assert len(repository.occurrences) == 2


def test_missing_occurrence_archives_only_after_three_complete_runs():
    repository = MemoryRepository()
    run_source(official_source(), FakeAdapter(), repository, NOW)

    class ReplacementAdapter:
        scan_complete = True

        def fetch(self, source):
            base = FakeAdapter().fetch(source)[0]
            return [EventCandidate(**{
                **asdict(base),
                "source_event_id": "84",
                "source_url": "https://official.example/events/84",
                "title": "Başka Etkinlik",
                "starts_at": "2026-09-06T10:00:00+03:00",
                "ends_at": "2026-09-06T18:00:00+03:00",
            })]

    for expected in (1, 2):
        metrics = run_source(official_source(), ReplacementAdapter(), repository, NOW)
        occurrence = next(value for value in repository.occurrences.values() if value["event_id"].endswith("/42"))
        assert occurrence["consecutive_missing_runs"] == expected
        assert occurrence["status"] == "scheduled"
        assert metrics.missing_occurrences == 1
    metrics = run_source(official_source(), ReplacementAdapter(), repository, NOW)
    occurrence = next(value for value in repository.occurrences.values() if value["event_id"].endswith("/42"))
    assert occurrence["status"] == "archived"
    assert metrics.archived_occurrences == 1


def test_partial_run_does_not_increment_missing_occurrences():
    repository = MemoryRepository()
    run_source(official_source(), FakeAdapter(), repository, NOW)

    class BrokenAdapter:
        def fetch(self, source):
            return [EventCandidate(**{**asdict(FakeAdapter().fetch(source)[0]), "source_url": "http://invalid.example/event"})]

    run_source(official_source(), BrokenAdapter(), repository, NOW)
    occurrence = next(iter(repository.occurrences.values()))
    assert occurrence["consecutive_missing_runs"] == 0


def test_empty_scan_is_not_treated_as_complete_for_reconciliation():
    repository = MemoryRepository()
    run_source(official_source(), FakeAdapter(), repository, NOW)

    class EmptyAdapter:
        def fetch(self, source):
            return []

    run_source(official_source(), EmptyAdapter(), repository, NOW)
    occurrence = next(iter(repository.occurrences.values()))
    assert occurrence["consecutive_missing_runs"] == 0


def test_nonempty_scan_without_positive_completeness_does_not_reconcile():
    repository = MemoryRepository()
    run_source(official_source(), FakeAdapter(), repository, NOW)

    class TruncatedAdapter:
        scan_complete = False

        def fetch(self, source):
            base = FakeAdapter().fetch(source)[0]
            return [EventCandidate(**{
                **asdict(base),
                "source_url": "https://official.example/events/84",
                "title": "Eksik taramadaki başka etkinlik",
            })]

    metrics = run_source(official_source(), TruncatedAdapter(), repository, NOW)
    original = next(value for value in repository.occurrences.values() if value["event_id"].endswith("/42"))
    assert original["consecutive_missing_runs"] == 0
    assert metrics.scan_complete is False


def test_explicit_cancellation_is_immediate():
    repository = MemoryRepository()

    class CancelledAdapter:
        def fetch(self, source):
            base = FakeAdapter().fetch(source)[0]
            return [EventCandidate(**{**asdict(base), "explicit_status": "cancelled"})]

    run_source(official_source(), CancelledAdapter(), repository, NOW)
    occurrence = next(iter(repository.occurrences.values()))
    assert occurrence["status"] == "cancelled"


def test_seen_occurrence_identity_is_scoped_to_its_event():
    repository = MemoryRepository()
    repository.occurrences = {
        ("event-a", "morning"): {"event_id": "event-a", "source_occurrence_id": "morning", "status": "scheduled", "consecutive_missing_runs": 0},
        ("event-b", "morning"): {"event_id": "event-b", "source_occurrence_id": "morning", "status": "scheduled", "consecutive_missing_runs": 0},
    }
    repository.reconcile_missing_occurrences(official_source(), {("event-a", "morning")}, True)
    assert repository.occurrences[("event-a", "morning")]["consecutive_missing_runs"] == 0
    assert repository.occurrences[("event-b", "morning")]["consecutive_missing_runs"] == 1
