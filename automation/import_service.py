"""Açık Greenhouse/Lever panolarını güvenli Supabase inceleme kuyruğuna aktarır."""
from __future__ import annotations
import hashlib, json, os, re
from dataclasses import dataclass
from datetime import UTC, datetime
from html import unescape
from typing import Any, Iterable
from urllib.parse import urlsplit, urlunsplit
import requests
from dotenv import load_dotenv
from supabase import create_client

SKILLS = ("python", "javascript", "typescript", "react", "node.js", "sql", "figma", "excel", "power bi", "java", "c++", "aws", "docker")
INTERNSHIP_PATTERN = re.compile(r"\b(?:internship|intern|staj|stajyer|trainee|development\s+camp|bootcamp|co-op)\b", re.IGNORECASE)
def clean(value: str) -> str: return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", unescape(value or ""))).strip()
def canonical(url: str) -> str:
    part = urlsplit(url); return urlunsplit((part.scheme.lower(), part.netloc.lower(), part.path.rstrip("/"), "", ""))
def fingerprint(source: str, external_id: str | None, url: str, title: str, company: str | None) -> str:
    return hashlib.sha256(f"{source}|{external_id or canonical(url)}|{title.casefold()}|{(company or '').casefold()}".encode()).hexdigest()
def normalize_datetime(value: Any) -> str | None:
    if value is None or isinstance(value, bool): return None
    if isinstance(value, (int, float)):
        try: return datetime.fromtimestamp(value / 1000 if abs(value) >= 100_000_000_000 else value, tz=UTC).isoformat()
        except (OverflowError, OSError, ValueError): return None
    if isinstance(value, str):
        text = value.strip()
        if not text: return None
        try: datetime.fromisoformat(text.replace("Z", "+00:00")); return text
        except ValueError: return None
    return None
def is_internship_listing(title: str, description: str) -> bool:
    return bool(INTERNSHIP_PATTERN.search(f"{title or ''}\n{description or ''}"))
def classify(text: str, location: str | None) -> dict[str, Any]:
    value = f"{text} {location or ''}".casefold(); skills = [skill for skill in SKILLS if skill in value]
    mode = "remote" if any(word in value for word in ("remote", "uzaktan")) else "hybrid" if any(word in value for word in ("hybrid", "hibrit")) else "onsite" if any(word in value for word in ("on-site", "onsite", "ofis")) else None
    city = next((city for city in ("İstanbul", "Ankara", "İzmir", "Bursa", "Kocaeli", "Antalya") if city.casefold() in value), None)
    duration = re.search(r"(?:\d{1,2}\s*(?:iş\s*)?gün|\d{1,2}\s*week|\d{1,2}\s*ay)", value, re.I)
    return {"city": city, "work_model": mode, "mandatory_internship": True if "zorunlu staj" in value or "mandatory internship" in value else None, "paid": True if any(word in value for word in ("ücretli", "paid internship", "salary")) else False if any(word in value for word in ("ücretsiz", "unpaid")) else None, "skills": skills, "internship_duration": duration.group(0) if duration else None}
@dataclass(frozen=True)
class Candidate:
    source: str; external_id: str | None; source_url: str; company_name: str | None; title: str; description: str; location: str | None; published_at: str | None = None
def source_label(config: dict[str, Any], provider: str) -> str: return str(config.get("name") or config.get("company_name") or provider)
def greenhouse(config: dict[str, Any]) -> Iterable[Candidate]:
    response = requests.get(f"https://boards-api.greenhouse.io/v1/boards/{config['board_token']}/jobs?content=true", timeout=25, headers={"User-Agent": "StajimVarImporter/1.0"}); response.raise_for_status()
    for item in response.json().get("jobs", []):
        yield Candidate(source_label(config, "greenhouse"), str(item.get("id")) if item.get("id") else None, item["absolute_url"], config.get("company_name"), clean(item.get("title", "")), clean(item.get("content", "")), (item.get("location") or {}).get("name"), normalize_datetime(item.get("updated_at") or item.get("published_at")))
def lever(config: dict[str, Any]) -> Iterable[Candidate]:
    response = requests.get(f"https://api.lever.co/v0/postings/{config['site']}?mode=json", timeout=25, headers={"User-Agent": "StajimVarImporter/1.0"}); response.raise_for_status()
    for item in response.json():
        categories = item.get("categories") or {}
        yield Candidate(source_label(config, "lever"), item.get("id"), item.get("hostedUrl") or item["applyUrl"], config.get("company_name"), clean(item.get("text", "")), clean(item.get("descriptionPlain") or item.get("description")), categories.get("location"), normalize_datetime(item.get("createdAt")))
def safe_event(db: Any, candidate: Candidate, key: str, action: str, listing_id: str | None = None, details: dict[str, Any] | None = None) -> None:
    try: db.table("listing_import_events").insert({"listing_id": listing_id, "source": candidate.source, "external_id": candidate.external_id, "fingerprint": key, "company_name": candidate.company_name, "title": candidate.title, "action": action, "details": details or {}}).execute()
    except Exception: pass
def deactivate(db: Any, listing: dict[str, Any], reason: str, source: str) -> bool:
    # This legacy importer has no complete-source health or miss-state evidence.
    # It must never deactivate a listing; the dedicated reconciliation runner owns
    # that lifecycle after its health/circuit-breaker gates have passed.
    return False
def import_source(db: Any, config: dict[str, Any]) -> dict[str, int]:
    adapters = {"greenhouse": greenhouse, "lever": lever}; adapter = adapters.get(config.get("type"))
    if not adapter: raise ValueError("Yalnızca greenhouse veya lever kaynak tipi desteklenir")
    label = source_label(config, config["type"]); existing_rows = db.table("listings").select("id,title,description,external_key,external_id,source_url,company_name,organization_name,is_active").eq("type", "external").eq("source_name", label).execute().data or []
    existing_by_key = {row.get("external_key"): row for row in existing_rows if row.get("external_key")}; stats = {"new": 0, "updated": 0, "skipped": 0, "stale_deactivated": 0, "filtered_deactivated": 0}; seen: set[str] = set(); now = datetime.now(UTC).isoformat()
    # Önce geçmiş kayıtları tekrar değerlendir; sadece bu harici kaynak kapsamındadır.
    for old in existing_rows:
        if not is_internship_listing(old.get("title") or "", old.get("description") or ""):
            if deactivate(db, old, "filtered_non_internship", label): stats["filtered_deactivated"] += 1
    for candidate in adapter(config):
        if not candidate.title or not candidate.source_url: continue
        key = fingerprint(candidate.source, candidate.external_id, candidate.source_url, candidate.title, candidate.company_name); seen.add(key)
        if not is_internship_listing(candidate.title, candidate.description): safe_event(db, candidate, key, "skipped_non_internship"); stats["skipped"] += 1; continue
        info = classify(f"{candidate.title} {candidate.description}", candidate.location)
        # Kaynakta hâlâ bulunan ve staj filtresini geçen ilan aktiftir; inceleme durumu ayrıdır.
        row = {"type": "external", "application_method": "external", "application_url": canonical(candidate.source_url), "title": candidate.title, "description": candidate.description or "Belirtilmemiş", "organization_name": candidate.company_name, "company_name": candidate.company_name, "city": info["city"], "location": candidate.location, "work_mode": info["work_model"], "work_model": info["work_model"], "tags": info["skills"], "mandatory_internship": info["mandatory_internship"], "required_internship": bool(info["mandatory_internship"]), "paid": info["paid"], "internship_duration": info["internship_duration"], "source": candidate.source, "source_name": label, "source_url": canonical(candidate.source_url), "apply_url": canonical(candidate.source_url), "external_id": candidate.external_id, "external_key": key, "external_application_supported": False, "imported_at": now, "last_seen_at": now, "published_at": candidate.published_at or now, "is_active": True}
        old = existing_by_key.get(key)
        if old:
            try: db.table("listings").update({**row, "import_status": "pending_review"}).eq("id", old["id"]).execute()
            except Exception: db.table("listings").update(row).eq("id", old["id"]).execute()
            safe_event(db, candidate, key, "updated", old["id"]); stats["updated"] += 1
        else:
            try: result = db.table("listings").insert({**row, "import_status": "pending_review"}).execute()
            except Exception: result = db.table("listings").insert(row).execute()
            safe_event(db, candidate, key, "created", result.data[0]["id"] if result.data else None); stats["new"] += 1
    for old in existing_rows:
        if old.get("external_key") not in seen and is_internship_listing(old.get("title") or "", old.get("description") or ""):
            if deactivate(db, old, "deactivated", label): stats["stale_deactivated"] += 1
    return stats
def main() -> None:
    load_dotenv(); db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]); totals = {"new": 0, "updated": 0, "skipped": 0, "stale_deactivated": 0, "filtered_deactivated": 0}
    for config in json.loads(os.getenv("SOURCES_JSON", "[]")):
        try:
            stats = import_source(db, config)
            for key in totals: totals[key] += stats[key]
            active = db.table("listings").select("id", count="exact").eq("type", "external").eq("source_name", source_label(config, config["type"])).eq("is_active", True).execute().count or 0
            print(f"{source_label(config, config['type'])}: {stats['new']} yeni, {stats['updated']} güncellenen, {stats['skipped']} staj dışı atlandı, {stats['stale_deactivated']} eski pasife alındı, {stats['filtered_deactivated']} filtreyle pasife alındı, {active} aktif staj ilanı")
        except Exception as error: print(f"{config.get('name', 'Kaynak')}: başarısız ({error})")
    print(f"Toplam: {totals}")
if __name__ == "__main__": main()
