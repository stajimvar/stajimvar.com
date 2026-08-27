from __future__ import annotations

import json
from dataclasses import replace
from datetime import datetime
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .domain import EventCandidate


WP_CATEGORY_MAP = {
    "sergi": "exhibition",
    "müze": "museum",
    "festival": "festival",
    "fuar": "fair",
    "tiyatro": "theatre",
    "konser": "concert",
    "atölye": "workshop",
}


def _items(value: Any):
    if isinstance(value, list):
        for item in value:
            yield from _items(item)
    elif isinstance(value, dict) and isinstance(value.get("@graph"), list):
        yield from _items(value["@graph"])
    elif isinstance(value, dict):
        yield value


def _event_type(value: Any) -> bool:
    types = value if isinstance(value, list) else [value]
    return any(str(item).lower().endswith("event") for item in types)


def _image_url(value: Any) -> str | None:
    if isinstance(value, str):
        return value
    if isinstance(value, list) and value:
        return _image_url(value[0])
    if isinstance(value, dict):
        return value.get("url") or value.get("contentUrl")
    return None


def _text(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    if isinstance(value, dict):
        return _text(value.get("name"))
    return None


def parse_json_ld(html: str, page_url: str, default_category: str) -> list[EventCandidate]:
    soup = BeautifulSoup(html, "html.parser")
    og = soup.find("meta", attrs={"property": "og:image"})
    og_image = urljoin(page_url, og.get("content")) if og and og.get("content") else None
    results: list[EventCandidate] = []
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            payload = json.loads(script.string or script.get_text())
        except (TypeError, json.JSONDecodeError):
            continue
        for item in _items(payload):
            if not _event_type(item.get("@type")) or not item.get("name") or not item.get("startDate"):
                continue
            location = item.get("location") if isinstance(item.get("location"), dict) else {}
            address = location.get("address") if isinstance(location.get("address"), dict) else {}
            offers = item.get("offers")
            offer = offers[0] if isinstance(offers, list) and offers else offers if isinstance(offers, dict) else {}
            price = offer.get("price")
            try:
                regular_price = float(price) if price not in (None, "") else None
            except (TypeError, ValueError):
                regular_price = None
            image = _image_url(item.get("image")) or og_image
            results.append(
                EventCandidate(
                    source_event_id=_text(item.get("@id")) or _text(item.get("identifier")),
                    source_url=urljoin(page_url, item.get("url") or page_url),
                    title=_text(item.get("name")) or "",
                    short_description=_text(item.get("description")),
                    description=_text(item.get("description")) or "",
                    category=default_category,
                    image_url=urljoin(page_url, image) if image else None,
                    starts_at=str(item["startDate"]),
                    ends_at=str(item["endDate"]) if item.get("endDate") else None,
                    city=_text(address.get("addressRegion")) or "",
                    district=_text(address.get("addressLocality")),
                    venue_name=_text(location.get("name")) or "Çevrimiçi",
                    address=_text(address.get("streetAddress")),
                    organizer=_text(item.get("organizer")),
                    ticket_url=urljoin(page_url, offer.get("url")) if offer.get("url") else None,
                    regular_price=regular_price,
                    is_free=regular_price == 0 if regular_price is not None else False,
                    event_mode="online" if str(item.get("eventAttendanceMode", "")).endswith("OnlineEventAttendanceMode") else "physical",
                )
            )
    return results


def _wp_date(value: str, *, end: bool) -> str:
    parsed = datetime.strptime(value.strip().split()[0], "%d-%m-%Y")
    clock = "23:59:59" if end else "00:00:00"
    return f"{parsed:%Y-%m-%d}T{clock}+03:00"


def parse_wp_event_manager(html: str, page_url: str) -> EventCandidate:
    soup = BeautifulSoup(html, "html.parser")
    title = soup.find("h1")
    body = soup.select_one(".wpem-single-event-body-content")
    sidebar = soup.select_one(".wpem-single-event-sidebar-info")
    if not title or not body or not sidebar:
        raise ValueError("WP Event Manager etkinlik alanları bulunamadı")
    date_box = sidebar.select_one(".wpem-event-date-time")
    dates = [x.get_text(" ", strip=True) for x in date_box.find_all("span")] if date_box else []
    if not dates:
        raise ValueError("etkinlik başlangıç tarihi bulunamadı")
    types = [x.get_text(" ", strip=True) for x in sidebar.select(".wpem-event-type-text")]
    category = next(
        (mapped for label in types for key, mapped in WP_CATEGORY_MAP.items() if key in label.casefold()),
        "festival",
    )
    location_heading = next(
        (h for h in sidebar.find_all(["h2", "h3"]) if "konumu" in h.get_text(" ", strip=True).casefold()),
        None,
    )
    location_box = location_heading.find_next_sibling() if location_heading else None
    venue = location_box.get_text(" ", strip=True) if location_box else ""
    image_meta = soup.find("meta", attrs={"property": "og:image"}) or soup.find(
        "meta", attrs={"name": "twitter:image"}
    )
    image = image_meta.get("content") if image_meta else None
    return EventCandidate(
        source_event_id=None,
        source_url=page_url,
        title=title.get_text(" ", strip=True),
        short_description=body.get_text(" ", strip=True)[:240],
        description=body.get_text(" ", strip=True),
        category=category,
        image_url=urljoin(page_url, image) if image else None,
        starts_at=_wp_date(dates[0], end=False),
        ends_at=_wp_date(dates[-1], end=True) if len(dates) > 1 else None,
        city="",
        district=None,
        venue_name=venue,
        is_free=any("ücretsiz" in label.casefold() for label in types),
    )


def discover_detail_urls(html: str, listing_url: str, link_pattern: str, limit: int = 40) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    urls: list[str] = []
    for anchor in soup.find_all("a", href=True):
        url = urljoin(listing_url, anchor["href"])
        if link_pattern in url and url not in urls:
            urls.append(url)
        if len(urls) >= limit:
            break
    return urls


def fetch_source(config: dict[str, Any], client) -> list[EventCandidate]:
    listing_url = config["listing_url"]
    html = client.get_text(listing_url)
    urls = list(config.get("event_urls") or [])
    if config.get("api_url"):
        payload = client.get_json(config["api_url"])
        urls.extend(
            item["link"]
            for item in payload
            if isinstance(item, dict) and item.get("link")
        )
    if config.get("detail_link_pattern"):
        urls.extend(discover_detail_urls(html, listing_url, config["detail_link_pattern"]))
    if not urls:
        urls = [listing_url]
    results: list[EventCandidate] = []
    for url in dict.fromkeys(urls):
        detail = html if url == listing_url else client.get_text(url)
        parsed: list[EventCandidate] = []
        if config.get("adapter") == "wp_event_manager":
            try:
                parsed = [parse_wp_event_manager(detail, url)]
            except ValueError:
                parsed = []
        if not parsed:
            parsed = parse_json_ld(detail, url, config["default_category"])
        default_city = (config.get("cities") or [""])[0]
        results.extend(replace(event, city=event.city or default_city) for event in parsed)
    return results
