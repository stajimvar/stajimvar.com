"""Keşif koşucusu: kaynakları tarar, bulunanları `raw_listings`'e yazar.

    kaynakları tara → staj mı? → keşif havuzuna yaz → kaybolanları say

Bu koşucu ilan YAYINLAMAZ. `raw_listings` bir bekleme odasıdır; oradan
`listings`'e geçiş ayrı bir adımdır (şirket eşleştirme, başvuru kanalı kararı).
Bulunan hiçbir şeyin doğrudan yayına düşmemesi bilinçli.

Güvenlik kapıları:
    --dry-run                      hiçbir şey yazmaz (varsayılan davranış değil, açıkça istenir)
    ALLOW_INSERT_UPDATE=true       yazma için zorunlu
    ALLOW_DEACTIVATION=true        pasifleştirme sayaçları için ayrı şalter
    DEACTIVATION_ENABLED_SOURCES   kaynak bazında beyaz liste (fail-closed)

Kullanım:
    python discover.py --dry-run
    python discover.py --source trendyol-lever
"""
from __future__ import annotations

import argparse
import os
from datetime import UTC, datetime

import requests
from dotenv import load_dotenv

import repository
import scraper
from stale_safety import (
    MIN_SOURCE_SIZE_FOR_ABSENCE,
    CloseEvidence,
    Health,
    ListingState,
    SourceRun,
    health,
    mass_deactivation_blocked,
    reconcile,
    source_deactivation_allowed,
    strong_close_signal,
)


def as_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def previous_count(db, source_id: str) -> int:
    """Son tamamlanmış taramada kaç ilan bulunmuştu.

    Anomali tespiti buna dayanıyor: kaynak dün 40 ilan verip bugün 0 veriyorsa
    ilanlar kapanmış değil, kaynak bozulmuştur.
    """
    rows = (
        db.table("import_runs")
        .select("fetched_count")
        .eq("source_id", source_id)
        .not_.is_("finished_at", "null")
        .order("started_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    return int(rows[0]["fetched_count"]) if rows else 0


def ilan_adresini_dogrula(url: str) -> CloseEvidence | None:
    """Ilanin kendi adresine bakarak bagimsiz kapanma kaniti toplar.

    None doner: istek yapilamadi ya da cevap belirsiz. Belirsizlik
    kapatmaya IZIN VERMIYOR -- strong_close_signal(None) False.

    5xx/403/429 bilerek kanit sayilmiyor: onlar ilanin degil KAYNAGIN
    arizasi ve ayni ariza listeyi de dusurmus olabilir.
    """
    try:
        cevap = requests.get(
            url, timeout=15, allow_redirects=True,
            headers={"User-Agent": "StajimVarJobs/1.0"},
        )
    except Exception:  # noqa: BLE001 - baglanti hatasi kanit degil
        return None
    return CloseEvidence(http_status=cevap.status_code)


def process_source(db, config: dict, source_id: str, *, write: bool, allow_deactivation: bool) -> dict:
    """Tek kaynağı tarar ve sonucu döndürür. Hata durumunda yükseltmez."""
    slug = str(config.get("id") or config["name"])
    started = datetime.now(UTC)
    run_id = repository.start_run(db, source_id) if write else None
    stats = {"fetched": 0, "created": 0, "updated": 0, "skipped": 0, "deactivated": 0,
             "stale_aday": 0, "devre_kesici": False}

    adapter = scraper.ADAPTERS.get(config["type"])
    if adapter is None:
        message = f"bilinmeyen kaynak tipi: {config['type']}"
        if write:
            repository.log_event(db, run_id=run_id, source_id=source_id, event_type="error", message=message)
            repository.finish_run(db, run_id, status="failed", error_text=message)
        return {**stats, "slug": slug, "health": "FAILED", "error": message}

    try:
        jobs = [scraper.translate_job(job, config) for job in adapter(config)]
        # Adaptör çok parçalıysa (şehir × sorgu) kapsama sayaçlarını
        # config'e yazıyor. Tek istekli adaptörlerde sözlük hiç oluşmuyor
        # ve alanlar 0 kalıyor — o kaynakların davranışı değişmiyor.
        kapsama = config.get("_kapsama") or {}
        run = SourceRun(
            slug, started, datetime.now(UTC), 200, True, True,
            # Sayfalama bütünlüğü artık birim başına ölçülüyor.
            kapsama.get("sayfalama_tamamlanmadi", 0) == 0,
            previous_count(db, source_id), len(jobs), accepted_count=len(jobs),
            expected_units=int(kapsama.get("beklenen_birim", 0)),
            successful_units=int(kapsama.get("basarili_birim", 0)),
            broken_units=int(kapsama.get("bozuk_birim", 0)),
        )
    except Exception as error:  # noqa: BLE001 — kaynak hatası tüm taramayı düşürmemeli
        message = f"{type(error).__name__}: {error}"
        run = SourceRun(slug, started, datetime.now(UTC), None, False, False, False,
                        previous_count(db, source_id), 0, error=message, error_count=1)
        if write:
            repository.log_event(db, run_id=run_id, source_id=source_id, event_type="error", message=message)
            repository.finish_run(db, run_id, status="failed", error_text=message)
        return {**stats, "slug": slug, "health": "FAILED", "error": message}

    run_health, health_reason = health(run)
    stats["fetched"] = len(jobs)
    now = repository.now_iso()

    seen_ids: set[str] = set()
    for job in jobs:
        try:
            canonical_url = scraper.canonical(job.source_url)
        except ValueError:
            stats["skipped"] += 1
            continue

        payload = repository.raw_listing_payload(job, source_id, canonical_url, now)
        # Adaptörler zaten erken-kariyer filtresi uyguluyor; kararı kayda geçir
        # ki sonradan "bu neden alındı" sorusu cevaplanabilsin.
        payload["is_internship"] = True
        payload["internship_score"] = 0.9
        payload["classifier_notes"] = "adaptör erken-kariyer filtresi (başlık/açıklama)"

        if not write:
            stats["created"] += 1
            continue

        raw_id, is_new = repository.upsert_raw_listing(db, payload)
        seen_ids.add(raw_id)
        stats["created" if is_new else "updated"] += 1
        repository.log_event(
            db, run_id=run_id, source_id=source_id, raw_listing_id=raw_id,
            event_type="discovered" if is_new else "updated", message=job.title,
        )

    # --- Kaybolanlar --------------------------------------------------
    # Yalnızca SAĞLIKLI taramada sayaç ilerler. Kaynak çökmüşse ilanları
    # kaybolmuş saymak, kaynak düzelince hepsini yeniden açmak demek olurdu.
    if write and run_health is Health.HEALTHY:
        known = (
            db.table("raw_listings")
            .select("id,status,consecutive_missing_runs,last_seen_at,promoted_listing_id")
            .eq("source_id", source_id)
            .in_("status", ["discovered", "needs_verification", "promoted"])
            .execute()
            .data
            or []
        )
        missing = [row for row in known if row["id"] not in seen_ids]
        deactivation_allowed = allow_deactivation and source_deactivation_allowed(
            slug,
            os.getenv("ALLOW_DEACTIVATION", "false").lower() == "true",
            {item.strip() for item in os.getenv("DEACTIVATION_ENABLED_SOURCES", "").split(",") if item.strip()},
        )
        # Devre kesici: bir taramada aktif kayıtların dörtte birinden fazlası
        # kaybolduysa bu bir kaynak arızasıdır, toplu kapatma yapılmaz.
        stats["stale_aday"] = len(missing)
        stats["izlenen_kayit"] = len(known)
        if mass_deactivation_blocked(len(missing), len(known)):
            deactivation_allowed = False
            stats["devre_kesici"] = True
            repository.log_event(
                db, run_id=run_id, source_id=source_id, event_type="error",
                message=f"toplu pasifleştirme devre kesicisi: {len(missing)}/{len(known)}",
            )

        # KUCUK KAYNAKTA BAGIMSIZ KANIT
        #
        # Tek ilanli bir kaynakta "listede yok" kapanma sinyali degil:
        # olculdu, astrazeneca-workday'in tek ilani 122 turdur listede
        # gorunmuyordu ve ilan hala aciktir. Bu yuzden kaynak kucukse
        # ilanin KENDI adresine bakiliyor; 404/410 gormeden kapatilmiyor.
        #
        # Istek sayisi sinirli: kural yalnizca 4'ten az aktif kaydi olan
        # kaynaklarda ve yalnizca zaten esigi doldurmus adaylar icin
        # calisiyor.
        kucuk_kaynak = len(known) < MIN_SOURCE_SIZE_FOR_ABSENCE

        for row in missing:
            state = ListingState(
                type="external", importer_managed=True, company_id=None, author_id=None,
                application_method="external",
                consecutive_missing_runs=int(row.get("consecutive_missing_runs") or 0),
                last_seen_at=as_datetime(row.get("last_seen_at")),
            )
            kanit = None
            if kucuk_kaynak and deactivation_allowed and row.get("url"):
                kanit = ilan_adresini_dogrula(str(row["url"]))
                if kanit is not None and write:
                    repository.log_event(
                        db, run_id=run_id, source_id=source_id, raw_listing_id=row["id"],
                        event_type="close_evidence",
                        message=f"HTTP {kanit.http_status}",
                        payload={"http_status": kanit.http_status,
                                 "guclu": strong_close_signal(kanit)},
                    )
            decision = reconcile(
                run, state, False, datetime.now(UTC), deactivation_allowed,
                source_active_count=len(known), evidence=kanit,
            )
            update: dict = {
                "consecutive_missing_runs": decision.consecutive_missing_runs,
                "source_last_checked_at": now,
                "stale_eligible_at": now if decision.stale_eligible else None,
            }
            if decision.would_deactivate and deactivation_allowed:
                update["status"] = "stale"
                stats["deactivated"] += 1

                # Asıl iş burada: keşif kaydını bayat işaretlemek ilanı
                # SİTEDEN DÜŞÜRMÜYOR. Önce yalnızca yukarıdaki satır vardı,
                # yani şalter açılsa bile kapanan ilan yayında kalacaktı —
                # şalterin bütün amacı buydu ve halka eksikti.
                yayindan_kalkti = repository.close_promoted_listing(db, row, "stale")

                repository.log_event(
                    db, run_id=run_id, source_id=source_id, raw_listing_id=row["id"],
                    event_type="deactivated",
                    message=(
                        "kaynakta 3 taramadır görülmüyor"
                        + ("; yayından kaldırıldı" if yayindan_kalkti else "")
                    ),
                )
            db.table("raw_listings").update(update).eq("id", row["id"]).execute()

    if write:
        repository.finish_run(
            db, run_id,
            status="ok" if run_health is Health.HEALTHY else "partial",
            fetched_count=stats["fetched"], created_count=stats["created"],
            updated_count=stats["updated"], skipped_count=stats["skipped"],
            deactivated_count=stats["deactivated"],
            error_text=health_reason,
        )

        # TUR ÖZETİ — TEK YAPILANDIRILMIŞ KAYIT
        #
        # "Neden sağlıksız?" sorusunun cevabı log satırlarına dağılmıştı.
        # `import_events.payload` (jsonb) zaten vardı; kimse bağlamamış.
        # Yeni bir izleme ürünü kurulmuyor: her tur için tek bir olay.
        # OPERASYONEL UYARI — LOGDAN SANİYELER İÇİNDE ANLAŞILSIN
        #
        # Kapatması AÇIK bir kaynakta sağlık bozulduysa ya da kapsama
        # eksikse bu bir rollout sinyali: o tur zaten hiçbir şey
        # kapatmıyor ama sürekli tekrar ediyorsa kaynak izin listesinden
        # çıkarılmalı. GitHub Actions kaydında ::warning:: olarak görünüyor.
        if deactivation_allowed and (run_health is not Health.HEALTHY or run.broken_units):
            print(
                f"::warning::SOURCE DEACTIVATION SAFETY WARNING "
                f"source={slug} health={run_health} reason={health_reason or '-'} "
                f"broken_units={run.broken_units} "
                f"coverage={run.successful_units}/{run.expected_units} "
                f"results={stats['fetched']} prev={run.previous_job_count}",
                flush=True,
            )

        repository.log_event(
            db, run_id=run_id, source_id=source_id, event_type="run_summary",
            message=f"{run_health}" + (f" · {health_reason}" if health_reason else ""),
            payload={
                "saglik": str(run_health),
                "gerekce": health_reason,
                "sonuc_sayisi": stats["fetched"],
                "onceki_sonuc_sayisi": run.previous_job_count,
                "benzersiz_sonuc": len(seen_ids),
                "beklenen_birim": run.expected_units,
                "basarili_birim": run.successful_units,
                "bozuk_birim": run.broken_units,
                "bos_birim": int((config.get("_kapsama") or {}).get("bos_birim", 0)),
                "sayfalama_tamam": run.pagination_complete,
                "kapatma_adayi": stats.get("stale_aday", 0),
                "kapatilan": stats["deactivated"],
                "devre_kesici": stats.get("devre_kesici", False),
                "kapatma_izni": allow_deactivation,
                "kaynak_aktif_kayit": stats.get("izlenen_kayit", 0),
            },
        )
        db.table("sources").update(
            {"last_run_at": now, **({"last_success_at": now} if run_health is Health.HEALTHY else {})}
        ).eq("id", source_id).execute()

    return {**stats, "slug": slug, "health": str(run_health), "error": health_reason}


def main() -> None:
    parser = argparse.ArgumentParser(description="StajımVar ilan keşif koşucusu")
    parser.add_argument("--dry-run", action="store_true", help="Hiçbir şey yazma, sadece raporla")
    parser.add_argument("--source", help="Tek bir kaynak slug'ı veya adı")
    parser.add_argument("--sync-only", action="store_true", help="Yalnızca sources.json'u tabloya yansıt")
    args = parser.parse_args()

    load_dotenv()
    write = not args.dry_run
    if write and os.getenv("ALLOW_INSERT_UPDATE") != "true":
        raise SystemExit("Yazma modu ALLOW_INSERT_UPDATE=true gerektirir (veya --dry-run kullan)")

    db = repository.client()
    configs = scraper.source_configs()

    if write:
        mapping = repository.sync_sources(db, configs)
        print(f"{len(mapping)} kaynak senkronize edildi")
    else:
        # Kuru çalıştırma kaynak tablosuna da yazmaz; var olanları okur.
        mapping = repository.load_source_ids(db, configs)
        missing = len(configs) - len(mapping)
        print(f"{len(mapping)} kaynak okundu" + (f", {missing} kaynak henüz senkronize edilmemiş" if missing else ""))

    if args.sync_only:
        if not write:
            raise SystemExit("--sync-only yazma gerektirir, --dry-run ile birlikte kullanılamaz")
        return

    selected = [
        config for config in configs
        if config.get("enabled", True)
        and (not args.source or args.source in {config.get("id"), config.get("name")})
    ]
    if args.source and not selected:
        raise SystemExit("Böyle bir açık kaynak yok")

    allow_deactivation = os.getenv("ALLOW_DEACTIVATION", "false").lower() == "true"
    totals = {"fetched": 0, "created": 0, "updated": 0, "deactivated": 0}
    failures: list[str] = []

    for config in selected:
        slug = str(config.get("id") or config["name"])
        source_id = mapping.get(slug)
        if not source_id:
            failures.append(
                f"{slug}: kaynak kaydı yok — önce `python discover.py --sync-only` çalıştır"
            )
            continue

        result = process_source(db, config, source_id, write=write, allow_deactivation=allow_deactivation)
        for key in totals:
            totals[key] += result.get(key, 0)
        if result.get("error"):
            failures.append(f"{slug}: {result['error']}")
        print(
            f"{slug:<38} {result['health']:<9} bulunan={result['fetched']:<4} "
            f"yeni={result['created']:<4} güncel={result['updated']:<4} bayat={result['deactivated']}"
        )

    print("\nTOPLAM " + " ".join(f"{k}={v}" for k, v in totals.items()))
    if failures:
        print(f"\n{len(failures)} kaynak sorunlu:")
        for failure in failures:
            print(f"  {failure}")
    if selected and totals["fetched"] == 0 and len(failures) == len(selected):
        raise SystemExit("Hiçbir kaynak işlenemedi")


if __name__ == "__main__":
    main()
