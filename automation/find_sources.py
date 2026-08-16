"""Yeni ATS kaynağı keşfeder.

Şirket adından slug türetip Lever / Greenhouse / Ashby / Workable'ın **herkese
açık** pano uç noktalarını dener. Cevap veren pano gerçekten vardır — tahmin
değil, doğrulama. Bulunanlar `sources.json`'a eklenmeye hazır JSON olarak
yazdırılır.

Bu bir kazıma değil: hepsi sağlayıcıların ilanların dışarıdan okunması için
belgelediği uç noktalar. Yine de her host'a istekler arasında bekleme koyuluyor.

Kullanım:
    python find_sources.py                 # tüm adayları dene
    python find_sources.py --only lever
    python find_sources.py --write         # bulunanları sources.json'a ekle
"""
from __future__ import annotations

import argparse
import json
import re
import time
import unicodedata
from pathlib import Path

import requests

from scraper import is_early_career, is_turkey_location

HEADERS = {"User-Agent": "StajimVarBot/1.0 (+https://stajimvar.com/bot)"}
TIMEOUT = 15
# Aynı host'a ardışık istekler arasında bekleme. Tek tek ucuz istekler ama
# yüzlercesini peş peşe atmak kaynağı rahatsız eder.
HOST_DELAY = 0.4

CANDIDATES_PATH = Path(__file__).parent / "candidates.json"
SOURCES_PATH = Path(__file__).parent / "sources.json"

_last_call: dict[str, float] = {}


def polite_get(url: str, host: str) -> requests.Response | None:
    wait = _last_call.get(host, 0) + HOST_DELAY - time.time()
    if wait > 0:
        time.sleep(wait)
    _last_call[host] = time.time()
    try:
        return requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    except Exception:
        return None


def slugs_for(name: str) -> list[str]:
    """Şirket adından olası pano kimlikleri üretir."""
    table = str.maketrans("İIıĞğÜüŞşÖöÇç", "iiiGgUuSsOoCc")
    base = name.translate(table)
    base = "".join(c for c in unicodedata.normalize("NFKD", base) if not unicodedata.combining(c))
    base = base.lower()

    # Tüzel kişilik ve genel ekleri at
    base = re.sub(r"\b(a\.?s\.?|ltd|sti|inc|holding|teknoloji|technologies|group|grubu)\b", " ", base)
    words = [w for w in re.split(r"[^a-z0-9]+", base) if w]
    if not words:
        return []

    joined = "".join(words)
    dashed = "-".join(words)
    out = [joined, dashed]
    if len(words) > 1:
        out.append(words[0])
    # Tekrarları koru ama sırayı bozma
    seen: set[str] = set()
    return [s for s in out if s and not (s in seen or seen.add(s))]


def probe_lever(slug: str) -> list | None:
    r = polite_get(f"https://api.lever.co/v0/postings/{slug}?mode=json", "lever")
    if r is None or r.status_code != 200:
        return None
    try:
        data = r.json()
    except Exception:
        return None
    return data if isinstance(data, list) and data else None


def probe_greenhouse(slug: str) -> list | None:
    r = polite_get(f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs", "greenhouse")
    if r is None or r.status_code != 200:
        return None
    try:
        jobs = r.json().get("jobs", [])
    except Exception:
        return None
    return jobs or None


def probe_ashby(slug: str) -> list | None:
    r = polite_get(f"https://api.ashbyhq.com/posting-api/job-board/{slug}", "ashby")
    if r is None or r.status_code != 200:
        return None
    try:
        jobs = r.json().get("jobs", [])
    except Exception:
        return None
    return jobs or None


def probe_workable(slug: str) -> list | None:
    r = polite_get(f"https://www.workable.com/api/accounts/{slug}?details=true", "workable")
    if r is None or r.status_code != 200:
        return None
    try:
        jobs = r.json().get("jobs", [])
    except Exception:
        return None
    return jobs or None


def probe_smartrecruiters(slug: str) -> list | None:
    """SmartRecruiters herkese açık postings API'si — anahtar gerekmiyor."""
    r = polite_get(
        f"https://api.smartrecruiters.com/v1/companies/{slug}/postings?limit=100",
        "smartrecruiters",
    )
    if r is None or r.status_code != 200:
        return None
    try:
        return r.json().get("content", []) or None
    except Exception:
        return None


PROBES = {
    "lever": probe_lever,
    "smartrecruiters": probe_smartrecruiters,
    "greenhouse": probe_greenhouse,
    "ashby": probe_ashby,
    "workable": probe_workable,
}

# Panodaki ilanların konum ve başlık alanları sağlayıcıya göre değişiyor.
def summarize(kind: str, jobs: list) -> tuple[int, int]:
    """(türkiye_ilan_sayısı, staj_ilanı_sayısı)"""
    tr = intern = 0
    for job in jobs:
        if kind == "lever":
            cats = job.get("categories") or {}
            loc = " ".join([cats.get("location") or ""] + (cats.get("allLocations") or []))
            title = job.get("text", "")
            desc = job.get("descriptionPlain", "") or ""
        elif kind == "greenhouse":
            loc = (job.get("location") or {}).get("name", "")
            title = job.get("title", "")
            desc = ""
        elif kind == "ashby":
            loc = " ".join(
                [job.get("location") or ""]
                + [e.get("location", "") for e in (job.get("secondaryLocations") or [])]
            )
            title = job.get("title", "")
            desc = job.get("descriptionPlain", "") or ""
        elif kind == "smartrecruiters":
            loc = " ".join(
                filter(None, [(job.get("location") or {}).get("city"),
                              (job.get("location") or {}).get("country")])
            )
            title = job.get("name", "")
            desc = ""
        else:  # workable
            loc = " ".join(str(v) for v in (job.get("locations") or []) if v)
            title = job.get("title", "")
            desc = job.get("description", "") or ""

        if is_turkey_location(loc):
            tr += 1
            if is_early_career(title, desc[:1500]):
                intern += 1
    return tr, intern


def source_entry(name: str, kind: str, slug: str) -> dict:
    base = {
        "id": f"{slug}-{kind}",
        "name": name,
        "type": kind,
        "enabled": True,
        "country": "TR",
        "company_name": name,
    }
    if kind == "lever":
        base["site"] = slug
        base["careers_url"] = f"https://jobs.lever.co/{slug}"
    elif kind == "greenhouse":
        base["board_token"] = slug
        base["careers_url"] = f"https://job-boards.greenhouse.io/{slug}"
    elif kind == "ashby":
        base["job_board"] = slug
        base["careers_url"] = f"https://jobs.ashbyhq.com/{slug}"
    elif kind == "smartrecruiters":
        base["company_identifier"] = slug
        base["careers_url"] = f"https://jobs.smartrecruiters.com/{slug}"
    elif kind == "workable":
        base["account"] = slug
        base["careers_url"] = f"https://apply.workable.com/{slug}"
    return base


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", choices=list(PROBES), help="Yalnızca bu sağlayıcıyı dene")
    parser.add_argument("--write", action="store_true", help="Bulunanları sources.json'a ekle")
    parser.add_argument(
        "--require-internship",
        action="store_true",
        help="Yalnızca şu an açık staj ilanı olanları ekle",
    )
    args = parser.parse_args()

    candidates: list[str] = json.loads(CANDIDATES_PATH.read_text(encoding="utf-8"))["companies"]
    existing = json.loads(SOURCES_PATH.read_text(encoding="utf-8"))
    known_ids = {s["id"] for s in existing["sources"]}
    known_names = {s.get("company_name", "").lower() for s in existing["sources"]}

    kinds = [args.only] if args.only else list(PROBES)
    found: list[dict] = []

    for name in candidates:
        if name.lower() in known_names:
            continue
        for slug in slugs_for(name)[:2]:
            for kind in kinds:
                jobs = PROBES[kind](slug)
                if not jobs:
                    continue
                tr, intern = summarize(kind, jobs)
                entry_id = f"{slug}-{kind}"
                if entry_id in known_ids:
                    continue
                flag = "STAJ VAR" if intern else ("TR ilanı" if tr else "TR ilanı yok")
                print(f"  {name:<26} {kind:<11} {slug:<22} ilan={len(jobs):<4} TR={tr:<3} staj={intern}  {flag}")
                if tr and (intern or not args.require_internship):
                    found.append(source_entry(name, kind, slug))
                break  # bu şirket için pano bulundu, diğer slug'ı deneme

    print(f"\n{len(found)} yeni kaynak bulundu")

    if args.write and found:
        existing["sources"].extend(found)
        SOURCES_PATH.write_text(
            json.dumps(existing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"sources.json güncellendi — toplam {len(existing['sources'])} kaynak")
    elif found:
        print("(--write ile sources.json'a eklenir)")


if __name__ == "__main__":
    main()
