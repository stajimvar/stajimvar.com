"""Gölge çalıştırma: deactivation açık olsaydı hangi ilanlar kapanırdı?

Hiçbir şey YAZMIYOR. Mevcut `raw_listings` durumunu ve son turun sağlığını
okuyup `stale_safety.reconcile` kararını olduğu gibi hesaplıyor.

Bir kaynağı izin listesine almadan önce buradan geçirmek şart: "kaç ilan
yanlışlıkla kapanacaktı" sorusunun cevabı ancak gerçek durum üzerinde
alınabiliyor. Kararı bu dosya vermiyor — sayıyı veriyor, kararı insan
veriyor.

    python -m automation.shadow_deactivation workable-tr-arama
    python -m automation.shadow_deactivation
"""
from __future__ import annotations

import json
import sys
from datetime import UTC, datetime

from dotenv import load_dotenv

from automation import repository
from automation.stale_safety import (
    Health,
    ListingState,
    SourceRun,
    health,
    mass_deactivation_blocked,
    reconcile,
)

CANLI_DURUMLAR = ["discovered", "needs_verification", "promoted"]


def _tarih(deger) -> datetime | None:
    if not deger:
        return None
    return datetime.fromisoformat(str(deger).replace("Z", "+00:00"))


def kaynak_raporu(db, slug: str, now: datetime) -> dict:
    kaynaklar = db.table("sources").select("id,slug").eq("slug", slug).limit(1).execute().data
    if not kaynaklar:
        return {"kaynak": slug, "hata": "kaynak bulunamadi"}
    source_id = kaynaklar[0]["id"]

    turlar = (
        db.table("import_runs")
        .select("status,fetched_count,error_text,started_at")
        .eq("source_id", source_id)
        .order("started_at", desc=True)
        .limit(2)
        .execute()
        .data
        or []
    )
    if not turlar:
        return {"kaynak": slug, "hata": "tur gecmisi yok"}

    son = turlar[0]
    onceki_sayi = int(turlar[1]["fetched_count"] or 0) if len(turlar) > 1 else 0

    # Son turu SourceRun olarak yeniden kur. Kapsama alanları geçmiş
    # turlarda kaydedilmemiş olabilir; o durumda 0 kalıyorlar ve kural
    # devreye girmiyor (mevcut davranış).
    basarili = son["status"] == "ok"
    run = SourceRun(
        source_id=slug,
        started_at=_tarih(son["started_at"]) or now,
        finished_at=now,
        http_status=200 if basarili else None,
        fetch_success=basarili,
        parser_success=basarili,
        pagination_complete=basarili,
        previous_job_count=onceki_sayi,
        current_job_count=int(son["fetched_count"] or 0),
    )
    run_health, gerekce = health(run)

    kayitlar = (
        db.table("raw_listings")
        .select("id,title,url,status,consecutive_missing_runs,last_seen_at,promoted_listing_id")
        .eq("source_id", source_id)
        .in_("status", CANLI_DURUMLAR)
        .execute()
        .data
        or []
    )

    # Gölge çalıştırmada "görülmedi" varsayımı yapılmıyor: sayaç zaten
    # kaç turdur görülmediğini tutuyor. Sayacı >0 olan kayıt bu turda da
    # görülmemiş demektir.
    adaylar = []
    for kayit in kayitlar:
        gorulmedi = int(kayit.get("consecutive_missing_runs") or 0) > 0
        if not gorulmedi:
            continue
        durum = ListingState(
            type="external",
            importer_managed=True,
            company_id=None,
            author_id=None,
            application_method="external",
            consecutive_missing_runs=int(kayit.get("consecutive_missing_runs") or 0),
            last_seen_at=_tarih(kayit.get("last_seen_at")),
        )
        karar = reconcile(run, durum, seen=False, now=now, allow_deactivation=True)
        if karar.would_deactivate:
            adaylar.append(
                {
                    "baslik": (kayit.get("title") or "")[:60],
                    "url": kayit.get("url"),
                    "kacirma": durum.consecutive_missing_runs,
                    "son_gorulme": kayit.get("last_seen_at"),
                    "yayinda": kayit.get("promoted_listing_id") is not None,
                }
            )

    devre_kesici = mass_deactivation_blocked(len(adaylar), len(kayitlar))
    return {
        "kaynak": slug,
        "son_tur_sagligi": str(run_health),
        "gerekce": gerekce,
        "izlenen_kayit": len(kayitlar),
        "kapanma_adayi": len(adaylar),
        "devre_kesici_devrede": devre_kesici,
        "gercekten_kapanacak": 0 if (devre_kesici or run_health is not Health.HEALTHY) else len(adaylar),
        "adaylar": adaylar,
    }


def main() -> None:
    load_dotenv()
    db = repository.client()
    now = datetime.now(UTC)

    if len(sys.argv) > 1:
        sluglar = sys.argv[1:]
    else:
        sluglar = [
            satir["slug"]
            for satir in (db.table("sources").select("slug").execute().data or [])
        ]

    rapor = [kaynak_raporu(db, slug, now) for slug in sluglar]
    # Yalnızca bir şey söyleyen kaynaklar yazdırılıyor.
    rapor = [r for r in rapor if r.get("hata") or r.get("kapanma_adayi")]
    print(json.dumps(rapor, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
