from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
import hashlib
import re
import unicodedata
from typing import Any
from urllib.parse import urlsplit, urlunsplit


@dataclass(frozen=True)
class EventSource:
    id: str
    name: str
    base_url: str
    official_domains: tuple[str, ...]
    trust_score: int = 90


@dataclass(frozen=True)
class EventCandidate:
    source_event_id: str | None
    source_url: str
    title: str
    description: str
    category: str
    starts_at: str
    ends_at: str | None
    city: str
    district: str | None
    venue_name: str
    short_description: str | None = None
    address: str | None = None
    organizer: str | None = None
    image_url: str | None = None
    ticket_url: str | None = None
    regular_price: float | None = None
    student_price: float | None = None
    is_free: bool = False
    has_student_discount: bool = False
    application_deadline: str | None = None
    event_mode: str = "physical"
    online_url: str | None = None
    explicit_status: str | None = None


@dataclass(frozen=True)
class NormalizedEvent:
    source_event_id: str | None
    source_url: str
    canonical_source_url: str
    title: str
    description: str
    category: str
    starts_at: str
    ends_at: str | None
    city: str
    district: str | None
    venue_name: str
    short_description: str | None
    address: str | None
    organizer: str | None
    original_image_url: str | None
    ticket_url: str | None
    regular_price: float | None
    student_price: float | None
    is_free: bool
    has_student_discount: bool
    application_deadline: str | None
    event_mode: str
    online_url: str | None
    status: str
    source_kind: str
    source_trust_score: int
    last_verified_at: str
    last_seen_at: str
    verification_status: str
    review_required: bool
    review_reason: str | None


def _space(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def _fingerprint_text(value: str | None) -> str:
    folded = _space(value).replace("ı", "i").replace("İ", "i").casefold()
    return "".join(
        ch
        for ch in unicodedata.normalize("NFKD", folded)
        if not unicodedata.combining(ch)
    )


def canonical_url(value: str) -> str:
    parts = urlsplit(value.strip())
    if parts.scheme != "https" or not parts.hostname:
        raise ValueError("resmî kaynak HTTPS olmalıdır")
    path = re.sub(r"/{2,}", "/", parts.path or "/")
    return urlunsplit(("https", parts.netloc.lower(), path.rstrip("/") or "/", "", ""))


def normalize_event(candidate: EventCandidate, source: EventSource, checked_at: datetime) -> NormalizedEvent:
    source_url = canonical_url(candidate.source_url)
    host = urlsplit(source_url).hostname or ""
    if host not in source.official_domains and not any(host.endswith(f".{x}") for x in source.official_domains):
        raise ValueError("kaynak alan adı resmî izin listesinde değil")

    reasons: list[str] = []
    if not candidate.ends_at:
        reasons.append("Bitiş tarihi bilinmiyor")
    if not candidate.image_url:
        reasons.append("Etkinliğe ait gerçek görsel bulunamadı")
    status = candidate.explicit_status or "published"
    if reasons or status in {"cancelled", "postponed"}:
        status = status if status in {"cancelled", "postponed"} else "draft"
    stamp = checked_at.isoformat()
    return NormalizedEvent(
        source_event_id=_space(candidate.source_event_id) or None,
        source_url=source_url,
        canonical_source_url=source_url,
        title=_space(candidate.title),
        description=_space(candidate.description),
        category=candidate.category,
        starts_at=candidate.starts_at,
        ends_at=candidate.ends_at,
        city=_space(candidate.city),
        district=_space(candidate.district) or None,
        venue_name=_space(candidate.venue_name),
        short_description=_space(candidate.short_description) or None,
        address=_space(candidate.address) or None,
        organizer=_space(candidate.organizer) or None,
        original_image_url=candidate.image_url,
        ticket_url=candidate.ticket_url,
        regular_price=candidate.regular_price,
        student_price=candidate.student_price,
        is_free=candidate.is_free,
        has_student_discount=candidate.has_student_discount,
        application_deadline=candidate.application_deadline,
        event_mode=candidate.event_mode,
        online_url=candidate.online_url,
        status=status,
        source_kind="official",
        source_trust_score=source.trust_score,
        last_verified_at=stamp,
        last_seen_at=stamp,
        verification_status="pending_review" if reasons else "verified",
        review_required=bool(reasons),
        review_reason="; ".join(reasons) or None,
    )


def event_fingerprint(event: NormalizedEvent) -> str:
    raw = "|".join(
        (_fingerprint_text(event.title), _fingerprint_text(event.venue_name), event.starts_at)
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def lifecycle_for(event: NormalizedEvent, now: datetime) -> str:
    if event.status in {"cancelled", "postponed"}:
        return event.status
    if event.ends_at and datetime.fromisoformat(event.ends_at) < now:
        return "archived"
    return event.status


def merge_event(existing: dict[str, Any], incoming: NormalizedEvent) -> dict[str, Any]:
    merged = dict(existing)
    for key, value in asdict(incoming).items():
        if value is not None:
            merged[key] = value
    return merged
