"""Keşif havuzundaki ilanları yayına alır.

    staj mı? → şirket kim? → kaynak güvenilir mi? → duplicate mi?
             → hâlâ aktif mi? → başvuru kanalı ne? → yayınla

Her eleme sebebiyle birlikte `raw_listings.reject_reason` alanına yazılır.
Sessizce kaybolan kayıt olmaz; sınıflandırıcının yanlış elediği ilanlar
sonradan görülebilsin diye.

Kullanım:
    python promote.py --dry-run
    python promote.py
"""
from __future__ import annotations

import argparse
import json
import os
import re
import unicodedata
from pathlib import Path

from dotenv import load_dotenv

import repository

# --- Beceri çıkarımı ---------------------------------------------------------
# İlan açıklamasından beceri etiketi çıkarılmazsa kartlar boş görünür ve
# eşleşme puanı anlamsızlaşır. Sözlük src/data/skillsDictionary.ts'den
# üretiliyor (bkz. `npm run skills:export`), tek doğruluk kaynağı orası.

_SKILLS_PATH = Path(__file__).parent / "skills.json"


def _fold(text: str) -> str:
    """Türkçe karakterleri katlar, karşılaştırma için normalize eder."""
    table = str.maketrans("İIıĞğÜüŞşÖöÇç", "iiiGgUuSsOoCc")
    folded = text.translate(table)
    folded = "".join(
        ch for ch in unicodedata.normalize("NFKD", folded) if not unicodedata.combining(ch)
    )
    return folded.lower()


def _load_skill_patterns() -> list[tuple[str, re.Pattern[str]]]:
    """(görünen ad, arama kalıbı) çiftleri.

    "JavaScript (ES6+)" gibi adlarda parantezli kısım atılıp "javascript"
    aranır; ilan metni sürüm bilgisini nadiren aynı yazar.
    """
    names = json.loads(_SKILLS_PATH.read_text(encoding="utf-8"))["skills"]
    patterns: list[tuple[str, re.Pattern[str]]] = []
    for name in names:
        needle = _fold(re.sub(r"\s*\([^)]*\)", "", name)).strip()
        if len(needle) < 2:
            continue
        # Kelime sınırı: "R" dili gibi kısa adlar her yerde eşleşmesin,
        # "Go" da "google" içinde yakalanmasın.
        patterns.append((name, re.compile(rf"(?<![a-z0-9+#.]){re.escape(needle)}(?![a-z0-9+#])")))
    return patterns


SKILL_PATTERNS = _load_skill_patterns()


def extract_skills(*texts: str | None) -> list[str]:
    haystack = _fold(" ".join(t for t in texts if t))
    return [name for name, pattern in SKILL_PATTERNS if pattern.search(haystack)]


# --- Sigorta / ücret sinyalleri ---------------------------------------------


def detect_mandatory_staj(description: str | None) -> tuple[bool, str | None]:
    """(kabul_ediyor_mu, not).

    Emin olunamadığında `False` dönülüyor ama sebebi nota yazılıyor.
    Bilinmeyeni `True` saymak, arayüzde "SGK'lı" rozetini uydurmak olurdu;
    `False` saymak yalnızca ilanı zorunlu staj filtresinde göstermez.
    """
    text = _fold(description or "")
    if not text:
        return False, "Kaynakta belirtilmemiş"
    if re.search(r"zorunlu staj|staj sigortasi|isletmede mesleki egitim|sgk", text):
        return True, None
    return False, "Kaynakta belirtilmemiş"


def detect_paid(description: str | None) -> bool:
    text = _fold(description or "")
    if re.search(r"ucretsiz staj|unpaid", text):
        return False
    return bool(re.search(r"ucretli staj|maas|burs|stipend|yemek ve yol|paid internship", text))


WORK_TYPE = {"remote": "Remote", "hybrid": "Hybrid", "onsite": "On-site"}


# --- Pipeline ----------------------------------------------------------------


def reject(db, row_id: str, reason: str, *, run_source: str, dry: bool) -> None:
    if dry:
        return
    db.table("raw_listings").update(
        {"status": "rejected", "reject_reason": reason, "processed_at": repository.now_iso()}
    ).eq("id", row_id).execute()
    repository.log_event(
        db, run_id=None, source_id=run_source, raw_listing_id=row_id,
        event_type="rejected", message=reason,
    )


def promote_one(db, raw: dict, source: dict, *, dry: bool) -> str:
    """Tek keşif kaydını değerlendirir. Sonuç etiketini döndürür."""
    raw_id = raw["id"]
    source_id = raw["source_id"]

    # 1. Staj mı?
    if raw.get("is_internship") is not True:
        reject(db, raw_id, "not_internship", run_source=source_id, dry=dry)
        return "not_internship"

    # 2. Hâlâ aktif mi?
    if raw["status"] == "stale":
        reject(db, raw_id, "inactive", run_source=source_id, dry=dry)
        return "inactive"

    # 3. Kaynak güvenilir mi?
    if source["trust"] == "discovery_signal":
        # Şirketin resmî kaynağında doğrulanmadan yayınlanamaz.
        if not dry:
            db.table("raw_listings").update({"status": "needs_verification"}).eq("id", raw_id).execute()
        return "needs_verification"

    # 4. Şirket kim?
    company_id = source.get("company_id")
    if not company_id and raw.get("company_name_raw"):
        # Çok şirketli kaynaklarda şirket her ilandan çözülür. Kaynak site ve
        # logo verdiyse yeni şirket kaydı bunlarla açılır — logos.py'nin ayrıca
        # tahmin yürütmesine gerek kalmaz.
        ham = raw.get("raw") or {}
        company_id = (
            repository.ensure_company(
                db,
                raw["company_name_raw"],
                website=ham.get("company_website"),
                logo=ham.get("company_logo"),
            )
            if not dry
            else "dry"
        )
    if not company_id:
        reject(db, raw_id, "company_unresolved", run_source=source_id, dry=dry)
        return "company_unresolved"

    # 5. Başvuru kanalı ne?
    # Toplanan ilanlarda başvuru şirketin kendi sisteminden yapılır: external.
    apply_url = raw.get("apply_url") or raw.get("url")
    if not apply_url:
        reject(db, raw_id, "no_application_channel", run_source=source_id, dry=dry)
        return "no_application_channel"

    # 6. Duplicate mi?
    #
    # İki katman gerekiyor. Kanonik URL yalnızca aynı adresten gelen tekrarları
    # yakalar; aynı ilan iki farklı kaynaktan gelirse (Workable araması
    # jobs.workable.com/view/..., doğrudan pano apply.workable.com/j/...)
    # adresler farklı olur ve ilan sitede iki kez görünür. İkinci katman
    # şirket + başlık + şehir imzasına bakıyor.
    canonical = raw.get("canonical_url") or apply_url
    if not dry:
        existing = (
            db.table("listings").select("id").eq("canonical_url", canonical).limit(1).execute().data
        )
        if not existing:
            ayni_sirket = (
                db.table("listings").select("id,title,city")
                .eq("company_id", company_id).execute().data
                or []
            )
            imza = (_fold(raw["title"] or ""), _fold(raw.get("city") or ""))
            for aday in ayni_sirket:
                if (_fold(aday.get("title") or ""), _fold(aday.get("city") or "")) == imza:
                    existing = [aday]
                    break

        if existing:
            db.table("raw_listings").update(
                {"status": "promoted", "promoted_listing_id": existing[0]["id"],
                 "processed_at": repository.now_iso()}
            ).eq("id", raw_id).execute()
            return "duplicate"

    # 7. Yayınla
    description = raw.get("description") or ""
    mandatory, insurance_note = detect_mandatory_staj(description)
    skills = extract_skills(raw.get("title"), description)

    payload = {
        "company_id": company_id,
        "title": raw["title"],
        # Şirketin resmî kaynağındaki ad. Çeviri `title`'ı değiştirebilir;
        # bu alan değişmiyor ve ilan detayında şeffaflık için kullanılıyor.
        "source_title": (raw.get("raw") or {}).get("source_title"),
        "work_type": WORK_TYPE.get(raw.get("work_type_guess") or "", "On-site"),
        "city": raw.get("city"),
        "mandatory_staj_accepted": mandatory,
        "voluntary_staj_accepted": True,
        "is_paid": detect_paid(description),
        "insurance_note": insurance_note,
        # Bazı kaynaklar (ör. Workday) listede açıklama vermiyor. Boş bir kart
        # göstermek yerine kullanıcıyı kaynağa yönlendiren bir not bırakılıyor.
        "description": description or "Bu ilanın ayrıntıları şirketin kendi kariyer sayfasında. Başvurmak için ilana git.",
        # Beceri çıkarımı tahminî; ilkler zorunlu, kalanlar tercih edilen sayılıyor.
        "required_skills": skills[:4],
        "preferred_skills": skills[4:10],
        "status": "published",
        "origin": "scraped",
        "source_id": source_id,
        "source_url": raw.get("url"),
        "canonical_url": canonical,
        "apply_url": apply_url,
        "application_method": "external",
        "raw_listing_id": raw_id,
        "posted_at": raw.get("posted_at"),
        "application_deadline": raw.get("deadline"),
        "imported_at": repository.now_iso(),
        "first_seen_at": raw.get("first_seen_at"),
        "last_seen_at": raw.get("last_seen_at"),
    }

    if dry:
        return "would_publish"

    created = db.table("listings").insert(payload).execute().data
    listing_id = created[0]["id"]
    db.table("raw_listings").update(
        {"status": "promoted", "promoted_listing_id": listing_id,
         "processed_at": repository.now_iso()}
    ).eq("id", raw_id).execute()
    repository.log_event(
        db, run_id=None, source_id=source_id, raw_listing_id=raw_id,
        event_type="promoted", message=raw["title"],
    )
    return "published"


def main() -> None:
    parser = argparse.ArgumentParser(description="Keşif havuzundan yayına geçiş")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    load_dotenv()
    if not args.dry_run and os.getenv("ALLOW_INSERT_UPDATE") != "true":
        raise SystemExit("Yazma modu ALLOW_INSERT_UPDATE=true gerektirir")

    db = repository.client()
    rows = (
        db.table("raw_listings")
        .select("*")
        .in_("status", ["discovered", "needs_verification"])
        .execute()
        .data
        or []
    )
    sources = {
        s["id"]: s
        for s in (db.table("sources").select("id,trust,company_id,name").execute().data or [])
    }

    counts: dict[str, int] = {}
    for raw in rows:
        source = sources.get(raw["source_id"])
        if not source:
            continue
        result = promote_one(db, raw, source, dry=args.dry_run)
        counts[result] = counts.get(result, 0) + 1
        if result in {"published", "would_publish"}:
            print(f"  + {raw['title'][:64]}")

    print(f"\n{len(rows)} keşif kaydı işlendi")
    for key, value in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"  {key:<22} {value}")


if __name__ == "__main__":
    main()
