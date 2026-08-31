"""KEŞİF RADARI — GÖLGE MODU ORKESTRATÖRÜ

Akış:

    keşif sinyali → şirket → resmî alan adı → kariyer kaynağı / ATS
                  → resmî ilan → kalite kapısı → duplicate → ADAY

İLK TURDA YAYIN YOK. Radar `would_publish` diyor, canonical `listings`
tablosuna hiçbir şey yazmıyor. Sayıları görmeden otomatik yayın
açılmıyor — bayrak `RADAR_AUTO_PUBLISH` ve varsayılanı kapalı.

İZOLASYON
---------
Radar ayrı bir iş akışında çalışıyor ve saatlik tarayıcıya
dokunmuyor. Radar patlarsa canonical toplama etkilenmiyor: bu modül
`scraper.py` tarafından hiç içeri alınmıyor.
"""

from __future__ import annotations

import json
import os
import sys
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field

from automation.radar_cozucu import (
    Kanit,
    ats_tani,
    dogrula_alan_adi,
    kariyer_kaynagi_bul,
    resmi_ilani_esle,
    sirket_adini_normalize_et,
    toplayici_mi,
)
from automation.radar_kaynaklar import KaynakKapali, Sinyal
from automation.radar_sirket import AramaYok, sirketi_coz
from automation.staj_kalitesi import VALID_INTERNSHIP, sinifla

#: Otomatik yayın bayrağı. Bu sprintte KAPALI.
AUTO_PUBLISH = os.getenv("RADAR_AUTO_PUBLISH", "false").lower() == "true"


@dataclass
class SinyalSonucu:
    """Bir sinyalin çözüm zincirindeki nihai durumu."""

    source: str
    source_url: str
    company_name_raw: str
    company_name_normalized: str
    title_raw: str
    location_raw: str | None

    resolution_status: str = "new"
    resolution_reason: str = ""
    resolution_confidence: str | None = None

    resolved_company_domain: str | None = None
    resolved_career_url: str | None = None
    resolved_ats: str | None = None
    resolved_official_job_url: str | None = None
    quality_class: str | None = None
    official_listing_id: str | None = None

    kanitlar: list[str] = field(default_factory=list)

    @property
    def would_publish(self) -> bool:
        """Yayına çıkabilirdi mi?

        Hepsi birden gerekiyor: şirket kimliği doğrulandı, resmî kaynak
        bulundu, resmî ilan YÜKSEK güvenle eşleşti, kalite kapısı
        VALID dedi, adres toplayıcı değil ve kayıt zaten yok.
        """
        return (
            self.resolution_status == "verified"
            and self.resolution_confidence == "HIGH"
            and self.quality_class == VALID_INTERNSHIP
            and bool(self.resolved_official_job_url)
            and not toplayici_mi(self.resolved_official_job_url)
        )


def _bitir(s: SinyalSonucu, durum: str, neden: str, guven: str | None = None) -> SinyalSonucu:
    s.resolution_status = durum
    s.resolution_reason = neden
    if guven:
        s.resolution_confidence = guven
    return s


def coz(
    sinyal: Sinyal,
    getir,
    resmi_ilanlari_getir,
    mevcut_ilanlar: dict[str, str] | None = None,
    bilgi_tabani: dict[str, str] | None = None,
    saglayici=None,
    sirket_onbellegi: dict | None = None,
) -> SinyalSonucu:
    """Tek bir sinyali zincirin sonuna kadar çözmeye çalışır.

    `resmi_ilanlari_getir(alan_adi, kariyer_url) -> list[dict]`
    `mevcut_ilanlar`: resmî adres → canonical listing id (duplicate için)
    """
    s = SinyalSonucu(
        source=sinyal.source,
        source_url=sinyal.source_url,
        company_name_raw=sinyal.company_name_raw,
        company_name_normalized=sirket_adini_normalize_et(sinyal.company_name_raw),
        title_raw=sinyal.title_raw,
        location_raw=sinyal.location_raw,
    )

    if not s.company_name_normalized:
        return _bitir(s, "unresolved", "company_unresolved: ad normalleştirilemedi", "LOW")

    # ------------------------------------------------ 1. resmî alan adı
    #
    # V2: üç katmanlı çözücü. Önce kendi verimiz, sonra arama, en sonda
    # tahmin — ve her aday kimlik doğrulamasından geçiyor.
    cozum, _sorgu = sirketi_coz(
        sinyal.company_name_raw, getir,
        bilgi_tabani or {}, saglayici or AramaYok(), sirket_onbellegi,
    )
    s.kanitlar.append(f"alan_adi[{cozum.katman}/{cozum.guven}]: " + "; ".join(cozum.kanitlar)[:160])
    if not cozum.otomatik_kullanilabilir:
        neden = ("company_unresolved: aday MEDIUM, insan bakışı bekliyor"
                 if cozum.var else "company_unresolved: resmî alan adı doğrulanamadı")
        s.resolved_company_domain = cozum.alan_adi
        return _bitir(s, "unresolved", neden, cozum.guven)
    alan = Kanit(cozum.alan_adi, cozum.guven, cozum.katman)
    s.resolved_company_domain = cozum.alan_adi
    s.resolution_confidence = cozum.guven
    _bitir(s, "company_resolved", "resmî alan adı doğrulandı")

    # -------------------------------------------- 2. kariyer kaynağı
    kariyer: Kanit = kariyer_kaynagi_bul(alan.deger, getir)
    s.kanitlar.append(f"kariyer: {kariyer.neden}")
    if not kariyer.var:
        return _bitir(s, "unresolved", "official_source_not_found: kariyer kaynağı yok", "LOW")
    s.resolved_career_url = kariyer.deger
    s.resolved_ats = kariyer.ekler.get("ats") or ats_tani(kariyer.deger)
    _bitir(s, "career_source_found", "kariyer kaynağı bulundu")

    # ------------------------------------------------ 3. resmî ilan
    try:
        resmi = resmi_ilanlari_getir(alan.deger, kariyer.deger)
    except Exception as hata:  # kaynak okunamadı — sinyal çözülmedi
        s.kanitlar.append(f"resmi_ilanlar: hata {type(hata).__name__}")
        return _bitir(s, "unresolved", "official_job_not_found: kaynak okunamadı", "LOW")

    eslesme: Kanit = resmi_ilani_esle(sinyal.title_raw, sinyal.location_raw, resmi)
    s.kanitlar.append(f"eslesme: {eslesme.neden}")
    if not eslesme.var:
        return _bitir(s, "unresolved", "official_job_not_found: aynı ilan bulunamadı", "LOW")
    s.resolved_official_job_url = eslesme.deger
    # Zincirin güveni EN ZAYIF halkaya eşit.
    s.resolution_confidence = "HIGH" if (alan.guven == "HIGH" and eslesme.guven == "HIGH") else "MEDIUM"
    _bitir(s, "official_job_found", "resmî ilan eşleşti")

    # ------------------------------------------------ 4. duplicate
    if mevcut_ilanlar and eslesme.deger in mevcut_ilanlar:
        s.official_listing_id = mevcut_ilanlar[eslesme.deger]
        return _bitir(s, "duplicate", "duplicate: canonical listede zaten var")

    # ------------------------------------------------ 5. kalite kapısı
    #
    # Sprint 1 kapısı AYNEN kullanılıyor: radar için ikinci bir staj
    # filtresi yazılmadı. Başlık tek başına hüküm vermiyor.
    ilan = next((i for i in resmi if i.get("url") == eslesme.deger), {})
    karar = sinifla(
        ilan.get("title") or sinyal.title_raw,
        ilan.get("description"),
        ilan.get("employment_type"),
    )
    s.quality_class = karar.sinif
    s.kanitlar.append("kalite: " + "; ".join(karar.nedenler))
    if karar.sinif != VALID_INTERNSHIP:
        return _bitir(s, "rejected", f"not_internship: {karar.sinif}")

    if s.resolution_confidence != "HIGH":
        return _bitir(s, "official_job_found", "manual_review: eşleşme HIGH değil", "MEDIUM")

    return _bitir(s, "verified", "resmî kaynakta doğrulandı, kalite geçti", "HIGH")


# ------------------------------------------------------------- rapor


def rapor(sonuclar: list[SinyalSonucu], kapali_kaynaklar: dict[str, str]) -> dict:
    """Kaynak başına huni + boşluk analizi."""
    kaynaklar = sorted({s.source for s in sonuclar} | set(kapali_kaynaklar))
    huni: dict[str, dict] = {}

    for k in kaynaklar:
        grup = [s for s in sonuclar if s.source == k]
        huni[k] = {
            "kapali": kapali_kaynaklar.get(k),
            "raw_signals": len(grup),
            "unique_signals": len({s.source_url for s in grup}),
            "unique_companies": len({s.company_name_normalized for s in grup if s.company_name_normalized}),
            "domain_resolved": sum(1 for s in grup if s.resolved_company_domain),
            "career_found": sum(1 for s in grup if s.resolved_career_url),
            "ats_detected": sum(1 for s in grup if s.resolved_ats),
            "official_job_match": sum(1 for s in grup if s.resolved_official_job_url),
            "valid_internship": sum(1 for s in grup if s.quality_class == VALID_INTERNSHIP),
            "duplicate": sum(1 for s in grup if s.resolution_status == "duplicate"),
            "would_publish": sum(1 for s in grup if s.would_publish),
            "unresolved": sum(1 for s in grup if s.resolution_status == "unresolved"),
        }

    # ÇAPRAZ KAYNAK: aynı resmî ilana çözülen iki sinyal TEK fırsat.
    resmi = {s.resolved_official_job_url for s in sonuclar if s.resolved_official_job_url}
    yayin_adaylari = {s.resolved_official_job_url for s in sonuclar if s.would_publish}

    # BOŞLUK: çözülemeyenler neden çözülemedi?
    nedenler = Counter(s.resolution_reason.split(":")[0] for s in sonuclar
                       if s.resolution_status == "unresolved")
    ats_bosluk: dict[str, dict] = defaultdict(lambda: {"sinyal": 0, "sirket": set()})
    for s in sonuclar:
        if s.resolution_status == "unresolved" and s.resolved_ats:
            ats_bosluk[s.resolved_ats]["sinyal"] += 1
            ats_bosluk[s.resolved_ats]["sirket"].add(s.company_name_normalized)

    return {
        "kaynaklar": huni,
        "capraz": {
            "toplam_raw": len(sonuclar),
            "unique_opportunity": len(resmi),
            "official_resolved": sum(1 for s in sonuclar if s.resolved_official_job_url),
            "would_publish": len(yayin_adaylari),
        },
        "unresolved_nedenleri": dict(nedenler.most_common()),
        "ats_bosluk": {
            k: {"sinyal": v["sinyal"], "distinct_sirket": len(v["sirket"])}
            for k, v in sorted(ats_bosluk.items(), key=lambda x: -x[1]["sinyal"])
        },
        "auto_publish": AUTO_PUBLISH,
    }


def main(argv: list[str]) -> int:
    """CLI: gölge koşusu. Canonical tabloya HİÇBİR ŞEY yazmıyor."""
    girdi = argv[1] if len(argv) > 1 else None
    if not girdi:
        print("kullanım: python -m automation.radar <sonuclar.json>", file=sys.stderr)
        return 2
    with open(girdi, encoding="utf-8") as f:
        ham = json.load(f)
    sonuclar = [SinyalSonucu(**s) for s in ham.get("sonuclar", [])]
    print(json.dumps(rapor(sonuclar, ham.get("kapali", {})), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main(sys.argv))
