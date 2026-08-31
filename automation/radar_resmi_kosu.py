"""RESMÎ WEB RADARI — GÖLGE KOŞUSU

Brave sorgularını atar, kiracıları çıkarır, MEVCUT adaptörlerle resmî
ilanları okur, kalite kapısından geçirir ve yayın adaylarını raporlar.

CANONICAL TABLOYA HİÇBİR ŞEY YAZMIYOR. `sources.json` de
DEĞİŞTİRİLMİYOR — yeni kiracılar yalnız raporlanıyor.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter, defaultdict

import requests

from automation.radar_brave import saglayici_kur
from automation.radar_resmi import (
    DESTEKLENEN,
    ResmiAday,
    kayitli_kiracilar,
    kiracilari_topla,
    sorgu_matrisi,
    turkiye_mi,
    yeni_kiraci_mi,
)
from automation.staj_kalitesi import VALID_INTERNSHIP, sinifla

RAPOR_DOSYASI = "radar-resmi-rapor.json"
ZAMAN_ASIMI = 15

#: Kiracı başına işlenecek ilan tavanı. Bir kiracının yüzlerce ilanı
#: olabilir; radar hepsini değil, staj adaylarını arıyor.
KIRACI_ILAN_TAVANI = 200


def _kaynaklari_oku() -> list[dict]:
    import pathlib

    yol = pathlib.Path(__file__).with_name("sources.json")
    ham = json.loads(yol.read_text(encoding="utf-8"))
    return ham if isinstance(ham, list) else ham.get("sources", [])


def _mevcut_ilan_adresleri() -> dict[str, str]:
    """Canonical listede zaten olan resmî adresler → listing id."""
    url = os.getenv("SUPABASE_URL")
    anahtar = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not anahtar:
        return {}
    try:
        y = requests.get(
            f"{url}/rest/v1/listings",
            params={"select": "id,canonical_url,apply_url,source_url", "status": "eq.published"},
            headers={"apikey": anahtar, "Authorization": f"Bearer {anahtar}"},
            timeout=ZAMAN_ASIMI,
        )
        y.raise_for_status()
    except requests.RequestException:
        return {}
    harita: dict[str, str] = {}
    for satir in y.json():
        for alan in ("canonical_url", "apply_url", "source_url"):
            if satir.get(alan):
                harita[satir[alan]] = satir["id"]
    return harita


def _scraper():
    """`scraper.py`'ı adaptörleri için yükler.

    Modül paket olarak değil, `automation/` dizini yol üstündeyken
    çalışacak biçimde yazılmış (`from translation import ...`). Onu
    yeniden yazmak yerine yol geçici olarak ekleniyor: radar mevcut
    adaptörleri OLDUĞU GİBİ kullanıyor, ikinci bir ayrıştırıcı
    yazılmıyor.
    """
    import pathlib

    kok = str(pathlib.Path(__file__).resolve().parent)
    if kok not in sys.path:
        sys.path.insert(0, kok)
    import scraper  # noqa: PLC0415

    return scraper


def kiracidan_ilanlar(platform: str, kiraci: str) -> list[dict]:
    """MEVCUT adaptörle kiracının resmî ilanlarını okur.

    Radar için ikinci bir Lever/Greenhouse ayrıştırıcısı YAZILMIYOR:
    `scraper.py` içindeki resmî API adaptörleri olduğu gibi çağrılıyor.
    Adaptör hata verirse kiracı atlanıyor, koşu düşmüyor.
    """
    anahtar = DESTEKLENEN[platform]["anahtar"]
    config = {"name": f"radar:{platform}:{kiraci}", anahtar: kiraci}
    adaptor = getattr(_scraper(), platform, None)
    if adaptor is None:
        return []
    try:
        isler = list(adaptor(config))[:KIRACI_ILAN_TAVANI]
    except Exception:
        return []
    return [
        {
            "title": getattr(i, "title", "") or "",
            "url": getattr(i, "url", "") or "",
            "company": getattr(i, "company", None),
            "location": getattr(i, "location", None),
            "description": getattr(i, "description", None),
        }
        for i in isler
    ]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Resmî web radarı gölge koşusu")
    ap.add_argument("--sorgu-siniri", type=int, default=120)
    args = ap.parse_args(argv)

    saglayici = saglayici_kur()
    if not getattr(saglayici, "kullanilabilir", False):
        print("arama katmanı yapılandırılmamış — resmî radar çalışamaz", file=sys.stderr)
        json.dump({"arama": "yapilandirilmamis"}, open(RAPOR_DOSYASI, "w", encoding="utf-8"))
        return 1

    sorgular = sorgu_matrisi(args.sorgu_siniri)
    print(f"sorgu sayısı: {len(sorgular)}", file=sys.stderr)

    ham_isabet = 0
    urller: list[str] = []
    sorgu_verimi: dict[str, int] = {}
    for s in sorgular:
        sonuclar = saglayici.ara(s)
        ham_isabet += len(sonuclar)
        yeni = [x.get("url", "") for x in sonuclar]
        urller += yeni
        sorgu_verimi[s] = len(yeni)

    kiracilar, bulgular = kiracilari_topla(urller)
    print(f"ham isabet: {ham_isabet} | destekli kiracı: {len(kiracilar)}", file=sys.stderr)

    kayitli = kayitli_kiracilar(_kaynaklari_oku())
    mevcut = _mevcut_ilan_adresleri()

    adaylar: list[ResmiAday] = []
    platform_huni: dict[str, Counter] = defaultdict(Counter)

    for (platform, kiraci), kaynak_urller in kiracilar.items():
        platform_huni[platform]["kiraci"] += 1
        if yeni_kiraci_mi(platform, kiraci, kayitli):
            platform_huni[platform]["yeni_kiraci"] += 1

        for ilan in kiracidan_ilanlar(platform, kiraci):
            platform_huni[platform]["ilan"] += 1
            if not turkiye_mi(ilan["location"], ilan["description"]):
                continue
            platform_huni[platform]["turkiye"] += 1

            karar = sinifla(ilan["title"], ilan["description"])
            aday = ResmiAday(
                platform=platform, kiraci=kiraci, sirket=ilan["company"],
                baslik=ilan["title"], konum=ilan["location"], url=ilan["url"],
                quality_class=karar.sinif,
                kanitlar=karar.nedenler[:2],
            )
            if karar.sinif != VALID_INTERNSHIP:
                aday.durum, aday.neden = "rejected", f"not_internship: {karar.sinif}"
                adaylar.append(aday)
                continue
            platform_huni[platform]["valid"] += 1

            if ilan["url"] in mevcut:
                aday.durum = "duplicate"
                aday.neden = "canonical listede zaten var"
                aday.mevcut_listing_id = mevcut[ilan["url"]]
                platform_huni[platform]["duplicate"] += 1
                adaylar.append(aday)
                continue

            aday.durum, aday.neden = "would_publish", "resmî kaynak + kalite + tekil"
            platform_huni[platform]["would_publish"] += 1
            adaylar.append(aday)

    yayin = [a for a in adaylar if a.would_publish]

    rapor = {
        "arama": {
            "saglayici": saglayici.ad,
            "sorgu": len(sorgular),
            **saglayici.olcum.ozet(),
            "ham_isabet": ham_isabet,
        },
        "sonuc_siniflari": dict(Counter(
            b.red_nedeni or (b.platform if b.destekli else "?") for b in bulgular
        ).most_common()),
        "platform_huni": {p: dict(c) for p, c in sorted(platform_huni.items())},
        "toplam": {
            "unique_kiraci": len(kiracilar),
            "yeni_kiraci": sum(c["yeni_kiraci"] for c in platform_huni.values()),
            "valid_internship": sum(c["valid"] for c in platform_huni.values()),
            "duplicate": sum(c["duplicate"] for c in platform_huni.values()),
            "would_publish": len(yayin),
        },
        # Adaptörü olmayan resmî platformlar: sonraki adaptör önceliği.
        "adaptor_boslugu": dict(Counter(
            b.platform for b in bulgular if b.red_nedeni == "adaptör yok"
        ).most_common()),
        "verimli_sorgular": dict(sorted(sorgu_verimi.items(), key=lambda x: -x[1])[:15]),
        "would_publish_ornekleri": [
            {"company": a.sirket, "title": a.baslik, "location": a.konum,
             "platform": a.platform, "tenant": a.kiraci, "url": a.url,
             "quality": a.quality_class, "evidence": a.kanitlar}
            for a in yayin[:25]
        ],
        "auto_publish": os.getenv("RADAR_AUTO_PUBLISH", "false"),
    }

    with open(RAPOR_DOSYASI, "w", encoding="utf-8") as f:
        json.dump(rapor, f, ensure_ascii=False, indent=2)
    print(json.dumps({k: rapor[k] for k in
                      ("arama", "toplam", "platform_huni", "adaptor_boslugu")},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
