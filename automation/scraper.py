"""Kaynak adaptörleri: resmî ATS/RSS uç noktalarından staj ilanı çeker.

Bu dosya SAF bir kütüphanedir — veritabanına yazmaz, ağ dışında yan etkisi yoktur.
Kalıcılık `repository.py`'de, koşucu `discover.py`'de.

Ayrım bilinçli: adaptörler dış API'lerin şekline bağlı ve kırılgan; şema ise bizim
kontrolümüzde. İkisi aynı dosyada olsaydı şema her değiştiğinde çalışan
adaptörleri riske atardık.
"""
from __future__ import annotations
import hashlib, json, os, re, unicodedata
from dataclasses import dataclass, replace
from html import unescape
from typing import Any, Iterable
from urllib.parse import urlsplit, urlunsplit
import feedparser, requests
from translation import translate_text, translate_title

@dataclass(frozen=True)
class Job:
    source_name: str; source_url: str; title: str
    organization_name: str | None = None; city: str | None = None; work_mode: str | None = None
    description: str = ""; hr_email: str | None = None

def clean(text: str) -> str: return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", unescape(text))).strip()
def canonical(url: str) -> str:
    p = urlsplit(url)
    if p.scheme.lower() not in {"http", "https"} or not p.netloc: raise ValueError("unsafe or malformed URL")
    return urlunsplit((p.scheme.lower(), p.netloc.lower(), p.path.rstrip("/"), "", ""))
def key(job: Job) -> str: return hashlib.sha256(f"{job.source_name}|{canonical(job.source_url)}".encode()).hexdigest()
def mode(text: str) -> str | None:
    text = text.casefold()
    if "uzaktan" in text or "remote" in text: return "remote"
    if "hibrit" in text or "hybrid" in text: return "hybrid"
    if "ofis" in text or "onsite" in text or "on-site" in text: return "onsite"
    return None
def email(text: str) -> str | None:
    found = re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", text, re.I); return found.group(0).lower() if found else None

EARLY_CAREER = re.compile(r"\b(staj(?:yer)?|intern(?:ship)?|summer\s+intern|winter\s+intern|trainee|co-op)\b", re.I)
TURKEY_LOCATION = re.compile(r"(?:turkey|turkiye|istanbul|ankara|izmir|bursa|kocaeli|remote\s*\(\s*turkey\s*\))", re.I)
def normalized(text: str) -> str:
    return "".join(char for char in unicodedata.normalize("NFKD", text).casefold() if not unicodedata.combining(char))
def is_turkey_location(location: str | None) -> bool: return bool(TURKEY_LOCATION.search(normalized(location or "")))
def is_early_career(title: str, description: str) -> bool:
    return bool(EARLY_CAREER.search(f"{title} {description}"))

def translate_job(job: Job, config: dict[str, Any]) -> Job:
    """Yabanci kaynak ilanlarini Supabase'e daima Turkce kaydeder."""
    if config.get("translate_to_turkish", True) is False:
        return job
    return replace(
        job,
        title=translate_title(job.title),
        description=translate_text(job.description) if job.description else job.description,
    )

def rss(config: dict[str, Any]) -> Iterable[Job]:
    feed = feedparser.parse(config["url"])
    if getattr(feed, "bozo", False): raise RuntimeError(f"{config['name']}: RSS okunamadı")
    for item in feed.entries:
        description = clean(item.get("summary", item.get("description", ""))); url = item.get("link"); title = clean(item.get("title", ""))
        if url and title: yield Job(config["name"], url, title, item.get("author") or None, description=description, work_mode=mode(title + " " + description), hr_email=email(description))

def json_api(config: dict[str, Any]) -> Iterable[Job]:
    response = requests.get(config["url"], timeout=20, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
    data = response.json(); rows = data.get("jobs", data) if isinstance(data, dict) else data
    for item in rows:
        if not item.get("title") or not item.get("url"): continue
        description = clean(item.get("description", ""))
        yield Job(config["name"], item["url"], clean(item["title"]), item.get("company"), item.get("city"), item.get("work_mode") or mode(description), description, item.get("hr_email") or email(description))

def greenhouse(config: dict[str, Any]) -> Iterable[Job]:
    """Greenhouse resmî Job Board API: yalnızca yayımlanmış iş panoları."""
    url = f"https://boards-api.greenhouse.io/v1/boards/{config['board_token']}/jobs?content=true"
    response = requests.get(url, timeout=25, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
    for item in response.json().get("jobs", []):
        description = clean(item.get("content", "")); title = clean(item.get("title", ""))
        location = (item.get("location") or {}).get("name")
        if not is_turkey_location(location) or not is_early_career(title, description): continue
        yield Job(config["name"], item["absolute_url"], title, config.get("organization_name") or item.get("company_name"), location, mode(title + " " + description), description, email(description))

def ashby(config: dict[str, Any]) -> Iterable[Job]:
    """Ashby resmî Public Job Postings API: yalnızca yayımlanmış ilanlar."""
    url = f"https://api.ashbyhq.com/posting-api/job-board/{config['job_board']}"
    response = requests.get(url, timeout=25, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
    for item in response.json().get("jobs", []):
        if not item.get("isListed", True): continue
        description = clean(item.get("descriptionPlain", item.get("descriptionHtml", ""))); title = clean(item.get("title", ""))
        locations = " ".join([item.get("location") or ""] + [entry.get("location", "") for entry in item.get("secondaryLocations") or []])
        if not is_turkey_location(locations) or not is_early_career(title, description): continue
        workplace = (item.get("workplaceType") or "").lower()
        work_mode = "remote" if item.get("isRemote") or workplace == "remote" else ("hybrid" if workplace == "hybrid" else mode(title + " " + description))
        yield Job(config["name"], item.get("jobUrl") or item["applyUrl"], title, config.get("organization_name"), item.get("location"), work_mode, description, email(description))

def lever(config: dict[str, Any]) -> Iterable[Job]:
    """Lever'in herkese açık Postings API'si; yalnızca Türkiye konumlu erken kariyer ilanları."""
    url = f"https://api.lever.co/v0/postings/{config['site']}?mode=json"
    response = requests.get(url, timeout=25, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
    for item in response.json():
        categories = item.get("categories") or {}; location = " ".join([categories.get("location") or ""] + (categories.get("allLocations") or []))
        title = clean(item.get("text", "")); description = clean(item.get("descriptionPlain", item.get("description", "")))
        if not is_turkey_location(location) or not is_early_career(title, description): continue
        workplace = (item.get("workplaceType") or "").lower()
        work_mode = "remote" if workplace == "remote" else ("hybrid" if workplace == "hybrid" else "onsite")
        yield Job(config["name"], item.get("hostedUrl") or item["applyUrl"], title, config.get("organization_name"), categories.get("location"), work_mode, description, email(description))

def location_text(locations: Any) -> str:
    """Konum listesini arama metnine çevirir. Workable sözlük, diğerleri düz metin döndürür."""
    parts: list[str] = []
    for entry in locations or []:
        if isinstance(entry, dict):
            parts.extend(str(value) for value in entry.values() if isinstance(value, str))
        elif entry:
            parts.append(str(entry))
    return " ".join(parts)

def city_of(locations: Any) -> str | None:
    """Konum listesinden şehir adını çıkarır.

    Workable `locations` alanı {'country','city','region',...} sözlükleri döndürür;
    listeyi olduğu gibi şehir alanına yazmak veritabanına stringe çevrilmiş sözlük
    kaydeder. Sözlükten yalnızca `city` alınır.
    """
    for entry in locations or []:
        if isinstance(entry, dict):
            city = entry.get("city") or entry.get("region")
            if city: return str(city)
        elif entry:
            return str(entry)
    return None

def workable(config: dict[str, Any]) -> Iterable[Job]:
    """Workable'ın yayımlanmış ilanlar için önerdiği açık account endpoint'i."""
    url = f"https://www.workable.com/api/accounts/{config['account']}?details=true"
    response = requests.get(url, timeout=25, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
    for item in response.json().get("jobs", []):
        locations = item.get("locations", [])
        location = location_text(locations)
        title = clean(item.get("title", "")); description = clean(item.get("description", ""))
        if not is_turkey_location(location) or not is_early_career(title, description): continue
        yield Job(config["name"], item["url"], title, config.get("organization_name") or config.get("company_name"), city_of(locations), mode(str(item.get("workplace_type", ""))), description, email(description))

def workday(config: dict[str, Any]) -> Iterable[Job]:
    """Public Workday CXS search; bounded pagination and no company-specific DOM parsing."""
    host, tenant, site = config["host"], config["tenant"], config["site"]
    endpoint = f"https://{host}/wday/cxs/{tenant}/{site}/jobs"
    for offset in range(0, 200, 20):
        response = requests.post(endpoint, json={"limit":20,"offset":offset,"searchText":"intern"}, timeout=25, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
        postings = response.json().get("jobPostings", [])
        if not postings: break
        for item in postings:
            title=clean(item.get("title", "")); location=item.get("locationsText") or ""; path=item.get("externalPath")
            if not path or not is_turkey_location(location) or not is_early_career(title, ""): continue
            yield Job(config["name"], f"https://{host}{path}", title, config.get("company_name"), location, mode(item.get("timeType", "")), "")
        if len(postings) < 20: break

def smartrecruiters(config: dict[str, Any]) -> Iterable[Job]:
    """SmartRecruiters Posting API. Bu sağlayıcı için işletmenin verdiği API anahtarı gerekir."""
    token = os.getenv("SMARTRECRUITERS_API_KEY")
    if not token: raise RuntimeError("SMARTRECRUITERS_API_KEY ayarlı değil")
    url = f"https://api.smartrecruiters.com/v1/companies/{config['company_identifier']}/postings?country=TR&limit=100"
    response = requests.get(url, timeout=25, headers={"X-SmartToken":token,"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
    for item in response.json().get("content", []):
        location = " ".join(filter(None, [item.get("location", {}).get("city"), item.get("location", {}).get("country")])); title = clean(item.get("name", ""))
        if not is_turkey_location(location) or not is_early_career(title, ""): continue
        yield Job(config["name"], item["ref"], title, config.get("organization_name"), location, None, "Detay için kaynak ilana gidin.")

def source_configs() -> list[dict[str, Any]]:
    with open(os.path.join(os.path.dirname(__file__), "sources.json"), encoding="utf-8") as handle:
        registry = json.load(handle).get("sources", [])
    # A checked-in verified registry is preferred; legacy SOURCES_JSON remains a fallback.
    return registry or json.loads(os.getenv("SOURCES_JSON", "[]"))

ADAPTERS = {
    "rss": rss,
    "json": json_api,
    "greenhouse": greenhouse,
    "ashby": ashby,
    "lever": lever,
    "workable": workable,
    "workday": workday,
    "smartrecruiters": smartrecruiters,
}
