"""StajımVar şemasına yazan kalıcılık katmanı.

`scraper.py` içindeki adaptörler kaynakların ham çıktısını üretir; bu modül onu
veritabanına bağlar. Ayrım bilinçli: adaptörler kırılgan ve dış API'lere bağlı,
şema ise bizim kontrolümüzde. İkisini karıştırmak, şema değişince adaptörleri
bozmak demek olurdu.

Yazma akışı:
    kaynak taraması → raw_listings (staging)  → [promote] → listings (yayın)

Bulunan hiçbir ilan doğrudan `listings`'e yazılmaz. Elenen kayıtlar
`raw_listings` içinde `reject_reason` ile kalır; böylece hangi kaynağın kaç
ilan getirdiği ve nerede kaybettiği ölçülebilir.
"""
from __future__ import annotations

import hashlib
import os
import re
import unicodedata
from datetime import UTC, datetime
from typing import Any, Iterable

from supabase import Client, create_client

# sources.json'daki `type` değerinin şemadaki `source_kind` enum karşılığı.
# Şema kaba bir sınıflandırma tutuyor; hangi adaptörün çalışacağını
# `sources.adapter` alanı söylüyor.
KIND_BY_ADAPTER = {
    "lever": "api",
    "greenhouse": "api",
    "ashby": "api",
    "workable": "api",
    "workday": "api",
    "smartrecruiters": "api",
    "json": "api",
    "rss": "rss",
    "workable_search": "api",
}

# Resmî ATS iş panosu API'leri: sağlayıcıların ilanların dışarıdan okunması
# için yayımladığı, belgelenmiş herkese açık uç noktalar. Bunlar "kazıma"
# değil, amacına uygun kullanım.
OFFICIAL_ADAPTERS = {
    "lever", "greenhouse", "ashby", "workable", "workday",
    "smartrecruiters", "workable_search",
}

TOS_NOTE = (
    "Resmî ATS iş panosu API'si. Sağlayıcı bu uç noktayı ilanların dışarıdan "
    "okunması için belgeliyor; HTML kazıma veya erişim engeli aşma yok. "
    "Kaynak kaydı eski StajımVar reposundan devralındı."
)


def client() -> Client:
    """service_role ile Supabase istemcisi. Yalnızca sunucu tarafında çalışır."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit(
            "SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlı değil. "
            "automation/.env dosyasına ekle (bkz. automation/.env.example)."
        )
    return create_client(url, key)


def slugify(value: str) -> str:
    """Türkçe adlardan ASCII slug üretir: 'Vertigo Games' -> 'vertigo-games'."""
    folded = value.replace("ı", "i").replace("İ", "i").replace("ğ", "g").replace("Ğ", "g")
    folded = folded.replace("ş", "s").replace("Ş", "s").replace("ö", "o").replace("Ö", "o")
    folded = folded.replace("ü", "u").replace("Ü", "u").replace("ç", "c").replace("Ç", "c")
    ascii_only = "".join(
        ch for ch in unicodedata.normalize("NFKD", folded) if not unicodedata.combining(ch)
    )
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_only).strip("-").lower()
    return slug or hashlib.sha256(value.encode()).hexdigest()[:12]


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


# ---------------------------------------------------------------- şirketler


def domain_of(url: str | None) -> str | None:
    """Adresten karşılaştırılabilir alan adı çıkarır: www ve şema atılır."""
    if not url:
        return None
    temiz = re.sub(r"^https?://", "", url.strip().lower())
    temiz = temiz.split("/")[0].split("?")[0]
    temiz = re.sub(r"^www\.", "", temiz)
    return temiz or None


def ensure_company(db: Client, name: str, website: str | None = None,
                   logo: str | None = None) -> str:
    """Şirket kaydını bulur, yoksa oluşturur ve id'sini döndürür.

    Eşleştirme sırası bilinçli:

    1. **Alan adı.** En güvenilir sinyal. Workable araması şirketi "Vertigo",
       doğrudan panosu "Vertigo Games" diye veriyordu; ikisi ayrı kayda düşünce
       aynı ilan sitede iki kez göründü. İkisinin de sitesi vertigogames.com
       olduğu için alan adı üzerinden birleşiyorlar.
    2. **Slug.** Alan adı bilinmiyorsa ada göre.

    `companies.name_normalized` benzersiz indeksi yalnızca yazım farklarını
    (büyük/küçük harf, noktalama) yakalar; kelime farkını yakalayamaz.
    """
    site = domain_of(website)
    if site:
        eslesen = (
            db.table("companies").select("id,logo_url,website_url")
            .ilike("website_url", f"%{site}%").limit(1).execute().data
        )
        if eslesen:
            kayit = eslesen[0]
            # Eksik logo varsa bu fırsatta tamamla.
            if logo and not kayit.get("logo_url"):
                db.table("companies").update({"logo_url": logo}).eq("id", kayit["id"]).execute()
            return kayit["id"]

    slug = slugify(name)
    found = db.table("companies").select("id,website_url").eq("slug", slug).limit(1).execute().data
    if found:
        kayit = found[0]
        # Adres sonradan öğrenildiyse kaydet: bir dahaki eşleştirme kolaylaşır.
        if site and not kayit.get("website_url"):
            db.table("companies").update({"website_url": website}).eq("id", kayit["id"]).execute()
        return kayit["id"]

    try:
        payload: dict[str, Any] = {
            "name": name, "slug": slug, "origin": "scraped", "verified": False,
        }
        if website:
            payload["website_url"] = website
        if logo:
            payload["logo_url"] = logo
        created = db.table("companies").insert(payload).execute().data
        return created[0]["id"]
    except Exception:
        # name_normalized benzersizliği devreye girdiyse aynı şirket başka bir
        # yazımla zaten var demektir; onu bul.
        existing = db.table("companies").select("id,name").execute().data or []
        target = re.sub(r"[^a-z0-9]", "", slugify(name).replace("-", ""))
        for row in existing:
            if re.sub(r"[^a-z0-9]", "", slugify(row["name"]).replace("-", "")) == target:
                return row["id"]
        raise


# ---------------------------------------------------------------- kaynaklar


def sync_sources(db: Client, configs: Iterable[dict[str, Any]]) -> dict[str, str]:
    """sources.json içeriğini `sources` tablosuna yansıtır, slug -> id döndürür.

    JSON tek doğruluk kaynağı: kaynak eklemek için tabloya değil dosyaya satır
    eklenir. Bu fonksiyon var olanı günceller, olmayanı ekler; hiçbir kaydı
    silmez — silinen bir kaynağın geçmişi `import_events` içinde kalmalı.
    """
    mapping: dict[str, str] = {}

    for config in configs:
        adapter = config["type"]
        slug = str(config.get("id") or slugify(config["name"]))
        company_name = config.get("company_name") or config.get("organization_name")
        company_id = (
            ensure_company(db, company_name, website=config.get("website"))
            if company_name
            else None
        )
        official = adapter in OFFICIAL_ADAPTERS

        payload: dict[str, Any] = {
            "slug": slug,
            "name": config["name"],
            "base_url": config.get("careers_url") or config.get("url") or "",
            "kind": KIND_BY_ADAPTER.get(adapter, "api"),
            "adapter": adapter,
            "trust": "official" if official else "discovery_signal",
            "company_id": company_id,
            # Şemadaki sources_enable_requires_review kısıtı, uyum kontrolü
            # yapılmadan bir kaynağın açılmasına izin vermiyor.
            "robots_allowed": official,
            "tos_reviewed_at": now_iso() if official else None,
            "tos_notes": TOS_NOTE if official else None,
            "is_enabled": bool(config.get("enabled", True)) and official,
        }

        existing = db.table("sources").select("id").eq("slug", slug).limit(1).execute().data
        if existing:
            source_id = existing[0]["id"]
            # tos_reviewed_at'i her çalıştırmada tazelemeyelim; inceleme tarihi
            # gerçek bir olay, senkronizasyonun yan etkisi değil.
            payload.pop("tos_reviewed_at", None)
            db.table("sources").update(payload).eq("id", source_id).execute()
        else:
            source_id = db.table("sources").insert(payload).execute().data[0]["id"]

        mapping[slug] = source_id

    return mapping


def load_source_ids(db: Client, configs: Iterable[dict[str, Any]]) -> dict[str, str]:
    """Var olan kaynakların slug -> id eşlemesini okur. Hiçbir şey yazmaz.

    `--dry-run` için: kuru çalıştırma kaynak tablosuna da dokunmamalı, yoksa
    "hiçbir şey yazmıyorum" sözü yalan olur.
    """
    slugs = [str(config.get("id") or slugify(config["name"])) for config in configs]
    rows = db.table("sources").select("id,slug").in_("slug", slugs).execute().data or []
    return {row["slug"]: row["id"] for row in rows}


def start_run(db: Client, source_id: str) -> str:
    return db.table("import_runs").insert({"source_id": source_id}).execute().data[0]["id"]


def finish_run(db: Client, run_id: str, **counts: Any) -> None:
    payload = {"finished_at": now_iso(), **counts}
    db.table("import_runs").update(payload).eq("id", run_id).execute()


def log_event(
    db: Client,
    *,
    run_id: str | None,
    source_id: str,
    event_type: str,
    message: str | None = None,
    raw_listing_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    db.table("import_events").insert(
        {
            "run_id": run_id,
            "source_id": source_id,
            "raw_listing_id": raw_listing_id,
            "event_type": event_type,
            "message": message,
            "payload": payload,
        }
    ).execute()


# ---------------------------------------------------------------- keşif kayıtları


def raw_listing_payload(job: Any, source_id: str, canonical_url: str, now: str) -> dict[str, Any]:
    """Adaptör çıktısını `raw_listings` satırına çevirir.

    `content_hash` yalnızca anlamlı içerikten üretilir. Kaynağın kendi
    kendine değiştirdiği alanlar (görüntülenme sayısı vb.) girseydi her
    taramada ilan değişmiş görünürdü.
    """
    fingerprint = hashlib.sha256(
        f"{job.title}|{job.description}|{canonical_url}".encode()
    ).hexdigest()

    return {
        "source_id": source_id,
        "external_id": None,
        "url": job.source_url,
        "canonical_url": canonical_url,
        "content_hash": fingerprint,
        "raw": {
            "title": job.title,
            "organization_name": job.organization_name,
            "city": job.city,
            "work_mode": job.work_mode,
            "source_name": job.source_name,
            # Bazı kaynaklar şirket sitesini ve logosunu ilanla veriyor;
            # promote adımı yeni şirket açarken bunları kullanıyor.
            "company_website": getattr(job, "company_website", None),
            "company_logo": getattr(job, "company_logo", None),
            # DİKKAT: job.hr_email bilerek `raw` içine yazılmıyor.
            # İK adresi ancak application_channels üzerinden, kanıtıyla
            # doğrulanarak kaydedilir.
        },
        "title": job.title,
        "company_name_raw": job.organization_name,
        "description": job.description,
        "city": job.city,
        "work_type_guess": job.work_mode,
        "apply_url": job.source_url,
        "last_seen_at": now,
        "source_last_checked_at": now,
        "consecutive_missing_runs": 0,
        "stale_eligible_at": None,
    }


def upsert_raw_listing(db: Client, payload: dict[str, Any]) -> tuple[str, bool]:
    """Keşif kaydını yazar. (raw_listing_id, yeni_mi) döndürür.

    Aynı kaynakta aynı içerik hash'i varsa yalnızca "görüldü" bilgisi tazelenir;
    içerik değişmediği için gereksiz yazma yapılmaz.
    """
    existing = (
        db.table("raw_listings")
        .select("id,status")
        .eq("source_id", payload["source_id"])
        .eq("content_hash", payload["content_hash"])
        .limit(1)
        .execute()
        .data
    )

    if existing:
        row_id = existing[0]["id"]
        refresh = {
            "last_seen_at": payload["last_seen_at"],
            "source_last_checked_at": payload["source_last_checked_at"],
            "consecutive_missing_runs": 0,
            "stale_eligible_at": None,
        }
        # Kaynakta yeniden görülen bir kayıt artık bayat değildir.
        if existing[0]["status"] == "stale":
            refresh["status"] = "discovered"
        db.table("raw_listings").update(refresh).eq("id", row_id).execute()
        return row_id, False

    created = db.table("raw_listings").insert(payload).execute().data
    return created[0]["id"], True
