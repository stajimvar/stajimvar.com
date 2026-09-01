"""GENEL HTML KARİYER SAYFASI → CANONICAL İLAN

Kapsam KİLİTLİ: kaynak sayımında ilanlarını doğrudan kendi HTML'inde
taşıdığı ÖLÇÜLEN şirketler ve onların cached LinkedIn sinyalleri.

Zincir:

    cached sinyal → şirketin resmî kariyer sayfası → resmî ilan
    → Türkiye kanıtı → kalite → duplicate → YAYIN

ARAMA İSTEĞİ YOK. LinkedIn'e istek yok. LinkedIn sinyali yalnız köprü:
başlık ve şirket, resmî sayfada aynı ilanı bulmak için kullanılıyor.
Yayınlanan içeriğin tamamı şirketin kendi sayfasından geliyor.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field

import requests

from automation import repository
from automation.kariyer_html import HamIlan, kariyer_sayfasini_oku
from automation.radar_cozucu import sadelestir
from automation.radar_cozum import eslesme_guveni
from automation.radar_kosu import KULLANICI_AJANI
from automation.radar_resmi import turkiye_mi
from automation.radar_sinyal_deposu import cozumu_yaz, sinyalleri_oku
from automation.staj_kalitesi import VALID_INTERNSHIP, sinifla

RAPOR_DOSYASI = "radar-kariyer-html-rapor.json"
ZAMAN_ASIMI = 12

#: Bu adaptörün kaynak türü. Şirketin KENDİ sayfası olduğu için resmî.
ADAPTOR = "generic_career"

_yerel = threading.local()


def _getir(url: str) -> tuple[int, str]:
    oturum = getattr(_yerel, "oturum", None)
    if oturum is None:
        oturum = requests.Session()
        oturum.headers.update({"User-Agent": KULLANICI_AJANI,
                               "Accept-Language": "tr,en;q=0.8"})
        _yerel.oturum = oturum
    y = oturum.get(url, timeout=ZAMAN_ASIMI, allow_redirects=True)
    return y.status_code, y.text[:600_000]


@dataclass
class SirketRaporu:
    """§3: her şirket ayrı ayrı raporlanıyor, sessiz boş dönüş yok."""

    sirket: str
    kariyer_url: str
    http_durum: int | None = None
    erisilebilir: bool = False
    ilan_baglantisi: int = 0
    detay_cekilen: int = 0
    yapisal_veri: bool = False
    sinyal_sayisi: int = 0
    eslesme: int = 0
    en_iyi_guven: str | None = None
    neden: str = ""


@dataclass
class Aday:
    """Yayın adayı ve her alanın NEREDEN geldiği."""

    sirket: str
    baslik: str
    konum: str | None
    aciklama: str
    basvuru_url: str
    kariyer_url: str
    kaynak_sinyal_id: str
    linkedin_baslik: str
    guven: str
    kanitlar: list[str] = field(default_factory=list)
    kalite: str | None = None
    durum: str = "aday"
    neden: str = ""
    listing_id: str | None = None


def sirketi_isle(sirket: str, kariyer_url: str, sinyaller: list) -> tuple[SirketRaporu, list[Aday]]:
    """Bir şirketin kariyer sayfasını okuyup sinyalleriyle eşleştirir."""
    rapor = SirketRaporu(sirket=sirket, kariyer_url=kariyer_url,
                         sinyal_sayisi=len(sinyaller))
    sonuc = kariyer_sayfasini_oku(kariyer_url, _getir)
    rapor.http_durum = sonuc.http_durum
    rapor.erisilebilir = sonuc.erisilebilir
    rapor.ilan_baglantisi = sonuc.ilan_baglantisi
    rapor.detay_cekilen = sonuc.detay_cekilen
    rapor.yapisal_veri = sonuc.yapisal_veri
    rapor.neden = sonuc.neden

    if not sonuc.ilanlar:
        return rapor, []

    adaylar: list[Aday] = []
    guvenler: list[str] = []
    for sinyal in sinyaller:
        en_iyi: tuple[HamIlan, str, list[str]] | None = None
        for ilan in sonuc.ilanlar:
            guven, kanitlar = eslesme_guveni(
                sinyal.sirket, sinyal.baslik, sinyal.konum,
                ilan.sirket or sirket, ilan.baslik, ilan.konum,
                ats_kimligi=False)
            guvenler.append(guven)
            if guven == "HIGH":
                en_iyi = (ilan, guven, kanitlar)
                break
            if guven == "MEDIUM" and en_iyi is None:
                en_iyi = (ilan, guven, kanitlar)
        if en_iyi is None:
            continue
        ilan, guven, kanitlar = en_iyi
        rapor.eslesme += 1
        adaylar.append(Aday(
            sirket=sirket, baslik=ilan.baslik, konum=ilan.konum,
            aciklama=ilan.aciklama, basvuru_url=ilan.basvuru_url or ilan.url,
            kariyer_url=kariyer_url, kaynak_sinyal_id=sinyal.id,
            linkedin_baslik=sinyal.baslik, guven=guven,
            kanitlar=[ilan.kanit] + kanitlar[:3],
            durum="aday" if not ilan.kapali else "rejected",
            neden="" if not ilan.kapali else "kaynak sayfada kapalı",
        ))
    if guvenler:
        rapor.en_iyi_guven = ("HIGH" if "HIGH" in guvenler
                              else "MEDIUM" if "MEDIUM" in guvenler else "LOW")
    return rapor, adaylar


def _degerlendir(aday: Aday) -> Aday:
    """Türkiye kanıtı → kalite → yayınlanabilirlik. FAIL CLOSED."""
    if aday.durum == "rejected":
        return aday

    if aday.guven != "HIGH":
        aday.durum, aday.neden = "rejected", f"eşleşme güveni {aday.guven}"
        return aday

    # §6 TÜRKİYE KANITI RESMÎ SAYFADAN. LinkedIn konumu tek başına yetmez.
    if not turkiye_mi(aday.konum, aday.aciklama):
        aday.durum, aday.neden = "rejected", "resmî sayfada Türkiye kanıtı yok"
        return aday

    # §12 FAIL CLOSED: alan resmî kaynaktan çıkmıyorsa yayın yok.
    if not aday.aciklama or len(aday.aciklama) < 200:
        aday.durum, aday.neden = "rejected", "resmî açıklama yok/yetersiz"
        return aday
    if not aday.basvuru_url:
        aday.durum, aday.neden = "rejected", "resmî başvuru adresi yok"
        return aday

    karar = sinifla(aday.baslik, aday.aciklama)
    aday.kalite = karar.sinif
    if karar.sinif != VALID_INTERNSHIP:
        aday.durum, aday.neden = "rejected", f"kalite: {karar.sinif}"
        return aday
    aday.kanitlar += karar.nedenler[:2]
    aday.durum = "yayina_hazir"
    return aday


def _yayinla(db, aday: Aday, kaynak_id: str, sayac: Counter) -> Aday:
    """Canonical listings tablosuna gerçek kayıt açar.

    Duplicate iki katmanda: canonical adres, sonra şirket + başlık +
    şehir imzası. Kapalı/arşivli aynı ilan da duplicate sayılıyor —
    durum süzgeci YOK.
    """
    company_id = repository.ensure_company(db, aday.sirket)
    if not company_id:
        aday.durum, aday.neden = "rejected", "şirket kaydı açılamadı"
        return aday

    mevcut = (db.table("listings").select("id,status")
              .eq("canonical_url", aday.basvuru_url).limit(1).execute().data)
    if not mevcut:
        ayni = (db.table("listings").select("id,status,title,city")
                .eq("company_id", company_id).execute().data or [])
        imza = (sadelestir(aday.baslik), sadelestir(aday.konum or ""))
        for satir in ayni:
            if (sadelestir(satir.get("title") or ""),
                    sadelestir(satir.get("city") or "")) == imza:
                mevcut = [satir]
                break
    if mevcut:
        durum = mevcut[0].get("status")
        aday.durum = "duplicate"
        aday.neden = f"canonical listede zaten var ({durum})"
        aday.listing_id = mevcut[0]["id"]
        sayac["duplicate_aktif" if durum == "published" else "duplicate_kapali"] += 1
        return aday

    payload = {
        "company_id": company_id,
        "title": aday.baslik,
        "work_type": "On-site",
        "city": aday.konum,
        "mandatory_staj_accepted": False,
        "voluntary_staj_accepted": True,
        "is_paid": False,
        "description": aday.aciklama[:12000],
        "status": "published",
        "origin": "scraped",
        "source_id": kaynak_id,
        # §10 KAYNAK LINKEDIN DEĞİL: şirketin kendi kariyer sayfası.
        "source_url": aday.kariyer_url,
        "canonical_url": aday.basvuru_url,
        "apply_url": aday.basvuru_url,
        "application_method": "external",
        "imported_at": repository.now_iso(),
        "first_seen_at": repository.now_iso(),
        "last_seen_at": repository.now_iso(),
    }
    olusan = db.table("listings").insert(payload).execute().data
    aday.listing_id = olusan[0]["id"]
    aday.durum = "published"
    sayac["published"] += 1
    return aday


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Genel HTML kariyer sayfası → ilan")
    ap.add_argument("--yayinla", action="store_true",
                    help="Geçen adayları canonical tabloya YAZ")
    ap.add_argument("--is-parcacigi", type=int, default=6)
    args = ap.parse_args(argv)

    sinyaller = [
        s for s in sinyalleri_oku(
            "linkedin",
            durumlar=("new", "company_resolved", "career_source_found",
                      "unresolved", "duplicate", "official_job_found",
                      "rejected", "verified"),
            sinir=5000)
        if s.resolved_career_url and s.sirket and s.baslik
    ]

    # KAPSAM KİLİDİ: yalnız sayımda "ilanlar HTML içinde" çıkan şirketler.
    kapsam = _kapsam_sirketleri()
    gruplar: dict[str, list] = {}
    for s in sinyaller:
        ad = s.sirket_normal or sadelestir(s.sirket)
        if ad in kapsam:
            gruplar.setdefault(ad, []).append(s)

    print(f"kapsam: {len(gruplar)} şirket / "
          f"{sum(len(v) for v in gruplar.values())} sinyal", file=sys.stderr)

    raporlar: list[SirketRaporu] = []
    adaylar: list[Aday] = []
    with ThreadPoolExecutor(max_workers=args.is_parcacigi) as havuz:
        isler = {
            havuz.submit(sirketi_isle, grup[0].sirket,
                         grup[0].resolved_career_url, grup): ad
            for ad, grup in gruplar.items()
        }
        for is_ in as_completed(isler):
            try:
                rapor, yeni = is_.result()
            except Exception as hata:
                ad = isler[is_]
                raporlar.append(SirketRaporu(
                    sirket=gruplar[ad][0].sirket,
                    kariyer_url=gruplar[ad][0].resolved_career_url or "",
                    neden=f"hata: {type(hata).__name__}"))
                continue
            raporlar.append(rapor)
            adaylar += yeni

    adaylar = [_degerlendir(a) for a in adaylar]
    sayac: Counter = Counter(a.durum for a in adaylar)

    baslangic = _yayindaki_ilan_sayisi()
    yayin_sayaci: Counter = Counter()
    yayinlananlar: list[Aday] = []

    hazir = [a for a in adaylar if a.durum == "yayina_hazir"]
    if args.yayinla and hazir:
        db = repository.client()
        kaynak_haritasi = repository.sync_sources(db, [
            {"id": f"generic-career-{repository.slugify(a.sirket)}",
             "name": f"{a.sirket} kariyer sayfası",
             "type": ADAPTOR, "careers_url": a.kariyer_url,
             "company_name": a.sirket, "enabled": False}
            for a in {a.sirket: a for a in hazir}.values()
        ])
        for aday in hazir:
            slug = f"generic-career-{repository.slugify(aday.sirket)}"
            try:
                _yayinla(db, aday, kaynak_haritasi[slug], yayin_sayaci)
            except Exception as hata:
                aday.durum, aday.neden = "rejected", f"yayın hatası: {type(hata).__name__}"
                yayin_sayaci[f"hata:{type(hata).__name__}"] += 1
            if aday.durum == "published":
                yayinlananlar.append(aday)
                try:
                    cozumu_yaz(aday.kaynak_sinyal_id, resolution_status="verified",
                               resolution_reason="resmî kariyer sayfasından yayınlandı",
                               resolved_official_job_url=aday.basvuru_url,
                               quality_class=aday.kalite, resolution_confidence="HIGH")
                except Exception:
                    pass

    bitis = _yayindaki_ilan_sayisi()

    rapor = {
        "arama_istegi": 0,
        "kapsam": {"sirket": len(gruplar),
                   "sinyal": sum(len(v) for v in gruplar.values())},
        "public_feed": {"baslangic": baslangic, "bitis": bitis,
                        "artis": (bitis - baslangic) if (baslangic and bitis) else None},
        "sirket_raporlari": sorted((asdict(r) for r in raporlar),
                                   key=lambda r: (-r["ilan_baglantisi"], r["sirket"])),
        "aday_durumlari": dict(sayac.most_common()),
        "red_nedenleri": dict(Counter(a.neden for a in adaylar
                                      if a.durum == "rejected").most_common()),
        "yayin": dict(yayin_sayaci),
        "yayinlananlar": [
            {"sirket": a.sirket, "baslik": a.baslik, "konum": a.konum,
             "listing_id": a.listing_id, "url": a.basvuru_url,
             "linkedin_baslik": a.linkedin_baslik, "kanitlar": a.kanitlar}
            for a in yayinlananlar
        ],
        "yayina_hazir_ornekleri": [
            {"sirket": a.sirket, "baslik": a.baslik, "konum": a.konum,
             "url": a.basvuru_url, "kanitlar": a.kanitlar}
            for a in hazir[:20]
        ],
        "auto_publish": os.getenv("RADAR_AUTO_PUBLISH", "false"),
        "yayin_modu": bool(args.yayinla),
    }
    with open(RAPOR_DOSYASI, "w", encoding="utf-8") as f:
        json.dump(rapor, f, ensure_ascii=False, indent=2)
    print(json.dumps({k: rapor[k] for k in
                      ("kapsam", "public_feed", "aday_durumlari",
                       "red_nedenleri", "yayin", "yayinlananlar")},
                     ensure_ascii=False, indent=2)[:5000])
    return 0


def _kapsam_sirketleri() -> set[str]:
    """Sayımda 'ilanlar HTML içinde' çıkan şirketler (kapsam kilidi)."""
    return {sadelestir(a) for a in (
        "GSK", "Akcansa", "Badi Company", "Anadolu Etap",
        "Emergent BioSolutions", "Ericsson", "Estetik International",
        "IBM", "İnomera", "Novartis", "Reckitt", "Sievo", "Sanofi",
        "Siemens Energy",
    )}


def _yayindaki_ilan_sayisi() -> int | None:
    url = os.getenv("SUPABASE_URL")
    anahtar = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not anahtar:
        return None
    try:
        y = requests.get(
            f"{url}/rest/v1/listings",
            params={"select": "id", "status": "eq.published"},
            headers={"apikey": anahtar, "Authorization": f"Bearer {anahtar}",
                     "Prefer": "count=exact", "Range": "0-0"},
            timeout=ZAMAN_ASIMI)
        y.raise_for_status()
        return int(y.headers.get("content-range", "0-0/0").split("/")[-1])
    except Exception:
        return None


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
